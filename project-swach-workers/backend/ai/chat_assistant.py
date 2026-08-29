import json
from typing import Optional
from ai.config import llm
from ai.rag_engine import retrieve_sop_for_complaint
from ai.database_tools import get_available_vehicles_in_ward
from models import Complaint, Worker, Vehicle

async def get_complaint_details(complaint_id: str) -> dict:
    """Helper to query the complaint in MongoDB."""
    try:
        complaint = await Complaint.get(complaint_id)
        if complaint:
            return {
                "id": str(complaint.id),
                "ward": complaint.ward,
                "status": complaint.status,
                "category": complaint.category,
                "worker_name": complaint.worker_name,
                "vehicle_number": complaint.vehicle_number
            }
    except Exception:
        pass
    return {}

async def run_copilot_tool_call(tool_name: str, arg: str) -> str:
    """Executes co-pilot helper tool calls based on LLM routing decisions."""
    try:
        if tool_name == "get_available_vehicles":
            vehicles = await get_available_vehicles_in_ward(arg)
            if not vehicles:
                return f"No available vehicles found in ward '{arg}'."
            return f"Available vehicles in '{arg}': " + ", ".join([f"{v['vehicle_type']} (Plate: {v['plate_number']})" for v in vehicles])
            
        elif tool_name == "get_sop_safety_tips":
            return retrieve_sop_for_complaint(arg)
            
        elif tool_name == "check_current_worker":
            worker = await Worker.find_one({"worker_id": arg})
            if not worker:
                return f"Worker with ID '{arg}' not found."
            return f"Worker: {worker.name}, Ward: {worker.ward}, Status: {worker.status}, Completed: {worker.tasks_completed}"
    except Exception as e:
        return f"Tool execution failed: {e}"
    return "Unknown tool."

async def analyze_chat_message(
    complaint_id: str,
    sender_name: str,
    sender_role: str,
    message: str
) -> Optional[str]:
    """
    Analyzes chat messages in real-time. If assistance or actions are needed,
    it automatically triggers database tools/RAG and drafts a chat response.
    """
    # 1. Clean message checking
    cleaned = message.strip()
    is_direct_ask = "@assistant" in cleaned.lower()
    
    # 2. Get Complaint Context
    context = await get_complaint_details(complaint_id)
    if not context:
        return None
        
    # 3. Prompt the agent
    prompt = f"""
    You are 'Swachh AI Co-Pilot', an active, helpful member of the coordination team.
    You are listening to a conversation about Complaint ID: '{complaint_id}' (Category: '{context.get('category')}', Ward: '{context.get('ward')}', Current Worker: '{context.get('worker_name')}').
    
    Message from {sender_name} ({sender_role}):
    "{message}"
    
    Determine if you need to take action or help.
    You should respond IF:
    1. They explicitly tag '@assistant'
    2. They ask for available vehicles or utility trucks.
    3. They ask about safety, guidelines, composting targets, or standard operating procedures.
    
    If NO response or help is required, write EXACTLY 'NO_ACTION'.
    
    If response IS required:
    1. Select a tool if needed:
       - 'get_available_vehicles' (Arg: ward name, e.g., '{context.get('ward')}')
       - 'get_sop_safety_tips' (Arg: category name, e.g., '{context.get('category')}')
       - 'check_current_worker' (Arg: worker ID if mentioned)
       - 'none' (if you can answer directly without database lookups)
    
    Format your response in valid JSON like this:
    {{
        "requires_response": true,
        "tool_call": "tool_name_here",
        "tool_arg": "argument_here",
        "preliminary_thought": "Brief explanation of what you are doing"
    }}
    """
    try:
        res = await llm.ainvoke(prompt)
        raw_output = res.content.strip()
        
        # Guard for no action
        if "NO_ACTION" in raw_output.upper():
            return None
            
        # Parse JSON
        # Robust parsing in case of markdown wrapping
        if "```json" in raw_output:
            raw_output = raw_output.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_output:
            raw_output = raw_output.split("```")[1].split("```")[0].strip()
            
        data = json.loads(raw_output)
        if not data.get("requires_response"):
            return None
            
        tool = data.get("tool_call", "none")
        arg = data.get("tool_arg", "")
        
        # Execute tool if needed
        tool_results = ""
        if tool != "none":
            tool_results = await run_copilot_tool_call(tool, arg)
            
        # Generate final assistant response
        response_prompt = f"""
        You are 'Swachh AI Co-Pilot'. 
        Based on the team's discussion and your tool execution, draft a helpful, professional, and friendly response.
        Keep it concise, supportive, and formatted in clean markdown.
        
        Original Message: "{message}"
        Tool Executed: {tool}({arg})
        Tool Results:
        {tool_results}
        
        Draft the response. Do NOT include json formatting. Write only the plain markdown message to send to the chat room.
        """
        final_res = await llm.ainvoke(response_prompt)
        return final_res.content.strip()
        
    except Exception as e:
        print(f"[CO-PILOT ERROR] Failed to parse or execute chat co-pilot analysis: {e}")
        # fallback direct message if tagged explicitly to prevent silence
        if is_direct_ask:
            return "Hello! I encountered an error checking our database tools, but I am standing by to assist with ward clearance coordinates."
        return None
