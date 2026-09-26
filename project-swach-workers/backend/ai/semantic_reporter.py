import json
import re
from typing import Dict, Any, List
from ai.config import llm_pro, get_content_text
from beanie import Document
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import Complaint, Worker, Vehicle
from ai.rag_engine import vector_store, seed_rag_knowledge_base

COLLECTION_SCHEMAS = """
1. Collection: 'complaints'
   Fields:
   - status: str (e.g., 'Reported', 'Assigned', 'Cleared')
   - upvotes: int
   - category: str (e.g., 'Plastics', 'Organic', 'Debris', 'Hazardous', 'Carcass', 'General')
   - ward: str
   - reporter_hash: str
   - timestamp: DateTime
   - worker_id: str (ID of assigned worker, matches worker_id in workers)
   - worker_name: str
   - vehicle_number: str
   - vehicle_type: str
   - cleared_timestamp: DateTime

2. Collection: 'workers'
   Fields:
   - name: str
   - worker_id: str
   - phone: str
   - ward: str
   - status: str (e.g., 'Active', 'Inactive')
   - tasks_completed: int
   - rating: float

3. Collection: 'vehicles'
   Fields:
   - plate_number: str
   - vehicle_type: str
   - ward: str
   - status: str (e.g., 'Available', 'In Use', 'Maintenance')

4. Collection: 'knowledge_base' (or 'sop')
   Use this if the request asks about standard operating procedures, safety guidelines, hazardous waste handling, protective equipment, or municipal compliance rules.
"""

async def run_semantic_query(user_query: str) -> Dict[str, Any]:
    """
    Translates a plain English query into either a secure MongoDB aggregation pipeline
    or a RAG knowledge base lookup, executes it, and formats the output into markdown.
    """
    # 1. Ask Gemini to analyze intent and generate aggregation pipeline or RAG retrieval
    prompt = f"""
    You are 'Swachh Semantic BI Reporter', a specialized data analyst and municipal assistant agent for Project Swach.
    You have direct secure access to the MongoDB collections and municipal safety knowledge base.
    
    Available Sources:
    {COLLECTION_SCHEMAS}
    
    User Request:
    "{user_query}"
    
    Decide:
    1. Which collection or source to query ('complaints', 'workers', 'vehicles', or 'knowledge_base').
    2. If querying a MongoDB collection ('complaints', 'workers', 'vehicles'):
       Write a valid MongoDB aggregation pipeline (as a JSON array of pipeline steps).
       Use standard operators like $match, $group, $sort, $limit, $project.
       Note: If date calculations are requested, assume current time is 2026-05-23T18:00:00+05:30.
    3. If querying 'knowledge_base':
       Leave pipeline as [].
    
    Format your response EXACTLY as a JSON object inside a single markdown block:
    {{
        "collection": "complaints | workers | vehicles | knowledge_base",
        "pipeline": [
            {{ "$match": ... }},
            {{ "$group": ... }}
        ],
        "thought": "Brief explanation of choice"
    }}
    """
    
    try:
        res = await llm_pro.ainvoke(prompt)
        raw_text = get_content_text(res).strip()
        
        # Robust parsing
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        spec = json.loads(raw_text)
        collection_name = spec.get("collection", "complaints").lower()
        pipeline = spec.get("pipeline", [])
        
        print(f"[SEMANTIC BI] Compiling semantic query: '{user_query}' -> Collection: {collection_name}, Pipeline steps: {len(pipeline)}")
        
        db_results = []
        sop_context = ""
        
        if collection_name in ["knowledge_base", "sop", "guidelines", "safety"]:
            # RAG flow for SOP and safety inquiries
            if not vector_store.documents:
                seed_rag_knowledge_base()
            matches = vector_store.similarity_search(user_query, k=3)
            db_results = [
                {"source": m["metadata"].get("source", "SOP"), "section": m["metadata"].get("section", ""), "content": m["text"]}
                for m in matches
            ]
            sop_context = "\n\n".join([f"[{d['source']} - {d['section']}]\n{d['content']}" for d in db_results])
            
        elif collection_name == "complaints":
            db_results = await Complaint.aggregate(pipeline).to_list(100)
        elif collection_name == "workers":
            db_results = await Worker.aggregate(pipeline).to_list(100)
        elif collection_name == "vehicles":
            db_results = await Vehicle.aggregate(pipeline).to_list(100)
        else:
            # Fallback to complaints if unknown
            collection_name = "complaints"
            db_results = await Complaint.aggregate(pipeline).to_list(100)
            
        print(f"[SEMANTIC BI] Query executed successfully. Returned {len(db_results)} documents.")
        
        # Convert DB ObjectIds to string for clean formatting
        for doc in db_results:
            if isinstance(doc, dict) and "_id" in doc:
                doc["_id"] = str(doc["_id"])
                
        # 2. Present results back to LLM to draft a beautiful markdown report (with tables if appropriate)
        report_prompt = f"""
        You are the 'Swachh Semantic BI Reporter'.
        You successfully executed a query for the user.
        
        User's Original Question: "{user_query}"
        Target Source: '{collection_name}'
        Raw Results (JSON):
        {json.dumps(db_results, default=str)}
        
        Draft a high-quality, professional analytical response. 
        Formatting Guidelines:
        - If there is tabular data (multiple rows of stats), format it as a beautiful, clean Markdown Table.
        - If no records match, explain clearly why.
        - Keep the tone professional, using micro-insights (e.g. identify top categories or highest values).
        - Ground all facts strictly in the raw database/knowledge base output. Do not make up stats.
        """
        
        report_res = await llm_pro.ainvoke(report_prompt)
        markdown_text = get_content_text(report_res).strip()
        
        return {
            "query": user_query,
            "collection": collection_name,
            "pipeline": pipeline,
            "raw_data": db_results,
            "markdown": markdown_text
        }
        
    except Exception as e:
        print(f"[SEMANTIC BI ERROR] Pipeline failed: {e}")
        return {
            "error": f"Failed to execute semantic query. Ensure your request is clear. Technical error: {str(e)}"
        }
