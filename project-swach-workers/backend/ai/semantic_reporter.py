import json
import re
from typing import Dict, Any, List
from ai.config import llm_pro
from beanie import Document
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import Complaint, Worker, Vehicle

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
"""

async def run_semantic_query(user_query: str) -> Dict[str, Any]:
    """
    Translates a plain English query into a secure MongoDB aggregation pipeline,
    executes it via the motor/beanie database driver, and formats the output into markdown.
    """
    # 1. Ask Gemini to generate the aggregation pipeline
    prompt = f"""
    You are 'Swachh Semantic BI Reporter', a specialized data analyst agent for Project Swach.
    You have direct secure access to the MongoDB collections for our municipal waste system.
    
    Database Schemas:
    {COLLECTION_SCHEMAS}
    
    User Request:
    "{user_query}"
    
    Based on the schemas, decide:
    1. Which collection to query ('complaints', 'workers', or 'vehicles').
    2. Write a valid MongoDB aggregation pipeline (as a JSON array of pipeline steps). 
       Ensure to use correct fields. Use standard operators like $match, $group, $sort, $limit, $project.
       Note: If date calculations are requested, assume the current time is 2026-05-23T18:00:00+05:30.
    
    Format your response EXACTLY as a JSON object inside a single markdown block:
    {{
        "collection": "collection_name_here",
        "pipeline": [
            {{ "$match": ... }},
            {{ "$group": ... }}
        ],
        "thought": "Brief explanation of aggregation choice"
    }}
    """
    
    try:
        res = await llm_pro.ainvoke(prompt)
        raw_text = res.content.strip()
        
        # Robust parsing
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        spec = json.loads(raw_text)
        collection_name = spec.get("collection")
        pipeline = spec.get("pipeline", [])
        
        print(f"[SEMANTIC BI] Compiling semantic query: '{user_query}' -> Collection: {collection_name}, Pipeline steps: {len(pipeline)}")
        
        # Get Beanie DB client (which is standard Motor under Beanie)
        # We can run standard aggregate on Beanie documents
        db_results = []
        if collection_name == "complaints":
            db_results = await Complaint.aggregate(pipeline).to_list(100)
        elif collection_name == "workers":
            db_results = await Worker.aggregate(pipeline).to_list(100)
        elif collection_name == "vehicles":
            db_results = await Vehicle.aggregate(pipeline).to_list(100)
        else:
            return {"error": f"Unsupported or unknown collection targeted: {collection_name}"}
            
        print(f"[SEMANTIC BI] Query executed successfully. Returned {len(db_results)} documents.")
        
        # Convert DB ObjectIds to string for clean formatting
        for doc in db_results:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
                
        # 2. Present results back to LLM to draft a beautiful markdown report (with tables if appropriate)
        report_prompt = f"""
        You are the 'Swachh Semantic BI Reporter'.
        You successfully executed a secure database aggregation.
        
        User's Original Question: "{user_query}"
        Target Collection: '{collection_name}'
        Raw Results (JSON):
        {json.dumps(db_results, default=str)}
        
        Draft a high-quality, professional analytical response. 
        Formatting Guidelines:
        - If there is tabular data (multiple rows of stats), format it as a beautiful, clean Markdown Table.
        - If no records match, explain clearly why.
        - Keep the tone professional, using micro-insights (e.g. identify top categories or highest values).
        - Ground all facts strictly in the raw database output. Do not make up stats.
        """
        
        report_res = await llm_pro.ainvoke(report_prompt)
        return {
            "query": user_query,
            "collection": collection_name,
            "pipeline": pipeline,
            "raw_data": db_results,
            "markdown": report_res.content.strip()
        }
        
    except Exception as e:
        print(f"[SEMANTIC BI ERROR] Aggregate pipeline failed: {e}")
        return {
            "error": f"Failed to execute semantic query. Ensure your request is clear. Technical error: {str(e)}"
        }
