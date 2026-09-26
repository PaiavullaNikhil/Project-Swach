import math
from typing import TypedDict, List, Optional, Annotated
from langgraph.graph import StateGraph, START, END

from ai.config import llm, get_content_text
from ai.rag_engine import retrieve_sop_for_complaint
from ai.database_tools import (
    get_available_workers_in_ward,
    get_available_vehicles_in_ward,
    update_complaint_assignment
)
from models import Worker

# 1. State Definition
class DispatchState(TypedDict):
    complaint_id: str
    lat: float
    lon: float
    category: str
    ward: str
    priority: str
    sop_guidelines: str
    shortlisted_workers: List[dict]
    shortlisted_vehicles: List[dict]
    selected_worker: Optional[dict]
    selected_vehicle: Optional[dict]
    logs: List[str]
    status: str

# Helper: Haversine distance
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c * 1000  # meters

# 2. Graph Nodes
async def assess_priority_node(state: DispatchState) -> dict:
    """
    Node 1: Evaluates priority based on complaint category.
    """
    category = state["category"]
    logs = list(state.get("logs", []))
    logs.append("[Graph Node 1] Starting priority assessment.")
    
    prompt = f"""
    You are an expert municipal waste prioritizer. 
    Classify the priority of a trash complaint under the category: '{category}'.
    Select one of: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'.
    
    Guidelines:
    - Carcass (dead animals), Hazardous (medical/chemical) = CRITICAL
    - Debris blocking streets, Organic hotel overflow = HIGH
    - Plastics, General dry trash = MEDIUM
    - Swept piles, Leaf piles = LOW
    
    Format your response EXACTLY like this:
    PRIORITY: [Priority Value]
    """
    try:
        res = await llm.ainvoke(prompt)
        text = get_content_text(res).upper()
        priority = "MEDIUM"
        for val in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
            if val in text:
                priority = val
                break
        logs.append(f"[Graph Node 1] Categorized category '{category}' as priority: {priority}")
        return {"priority": priority, "logs": logs}
    except Exception as e:
        logs.append(f"[Graph Node 1 ERROR] Fallback priority set due to error: {e}")
        return {"priority": "MEDIUM", "logs": logs}

async def consult_sop_node(state: DispatchState) -> dict:
    """
    Node 2: Consults the RAG vector store for safety guidelines.
    """
    category = state["category"]
    logs = list(state.get("logs", []))
    logs.append("[Graph Node 2] Consulting RAG database for safety SOPs.")
    
    try:
        sop_text = retrieve_sop_for_complaint(category)
        logs.append("[Graph Node 2] RAG document lookup complete.")
        return {"sop_guidelines": sop_text, "logs": logs}
    except Exception as e:
        logs.append(f"[Graph Node 2 ERROR] SOP lookup failed: {e}")
        return {"sop_guidelines": "Proceed with general waste clearance rules.", "logs": logs}

async def shortlist_resources_node(state: DispatchState) -> dict:
    """
    Node 3: Retrieves available workers and vehicles in the ward.
    FALLBACK: If no workers are in the ward, searches for nearest active workers in ALL wards.
    """
    ward = state["ward"]
    lat = state["lat"]
    lon = state["lon"]
    logs = list(state.get("logs", []))
    logs.append(f"[Graph Node 3] Querying resources in ward '{ward}'.")
    
    workers = await get_available_workers_in_ward(ward)
    vehicles = await get_available_vehicles_in_ward(ward)
    
    # AGENTIC FALLBACK: If no active worker in the ward, find adjacent/closest worker globally!
    if not workers:
        logs.append("[Graph Node 3 FALLBACK] No available workers inside ward. Performing global lookup.")
        all_workers = await Worker.find({"status": "Active"}).to_list()
        
        global_workers = []
        for w in all_workers:
            if w.current_location:
                w_lon, w_lat = w.current_location.coordinates
                dist = calculate_distance(lat, lon, w_lat, w_lon)
                global_workers.append({
                    "worker_id": w.worker_id,
                    "name": w.name,
                    "phone": w.phone,
                    "ward": w.ward,
                    "rating": w.rating,
                    "tasks_completed": w.tasks_completed,
                    "current_location": w.current_location.coordinates,
                    "distance_m": dist
                })
        
        # Sort by distance
        global_workers.sort(key=lambda x: x.get("distance_m", 999999))
        workers = global_workers[:3]  # Take top 3 closest workers
        logs.append(f"[Graph Node 3 FALLBACK] Found {len(workers)} closest workers from adjacent wards.")
    else:
        # Calculate distances for in-ward workers
        for w in workers:
            if w["current_location"]:
                w_lon, w_lat = w["current_location"]
                w["distance_m"] = calculate_distance(lat, lon, w_lat, w_lon)
            else:
                w["distance_m"] = 5000.0  # Default long distance fallback
        logs.append(f"[Graph Node 3] Found {len(workers)} active workers and {len(vehicles)} vehicles in ward '{ward}'.")

    return {"shortlisted_workers": workers, "shortlisted_vehicles": vehicles, "logs": logs}

async def rank_and_recommend_node(state: DispatchState) -> dict:
    """
    Node 4: Agent reads workers, vehicles, and SOPs and picks the absolute best candidate.
    """
    workers = state["shortlisted_workers"]
    vehicles = state["shortlisted_vehicles"]
    category = state["category"]
    priority = state["priority"]
    sop = state["sop_guidelines"]
    logs = list(state.get("logs", []))
    logs.append("[Graph Node 4] Executing AI ranking agent node.")
    
    if not workers:
        logs.append("[Graph Node 4] CRITICAL: No active workers found in system. Assignment pending.")
        return {"selected_worker": None, "selected_vehicle": None, "logs": logs}
        
    # Build prompt for matching
    prompt = f"""
    You are an intelligent municipal dispatch AI co-pilot.
    Task Details:
    - Category: {category}
    - Priority: {priority}
    
    Safety & Vehicle SOP Checklist:
    {sop}
    
    Candidate Workers:
    {[{'id': w['worker_id'], 'name': w['name'], 'rating': w['rating'], 'tasks_done': w['tasks_completed'], 'distance_m': w.get('distance_m', 'unknown')} for w in workers]}
    
    Available Vehicles:
    {[{'plate': v['plate_number'], 'type': v['vehicle_type']} for v in vehicles]}
    
    Select the absolute BEST worker and compatible vehicle. 
    Selection logic:
    1. Vehicle matching: Heavy Debris requires trucks. Organic/Plastics can use carts or bikes.
    2. Proximity: Prioritize closer candidates.
    3. Rating/Performance: High rating is a plus.
    
    Provide your decision in EXACTLY this format:
    CHOSEN_WORKER_ID: [Worker ID string]
    CHOSEN_PLATE_NUMBER: [Vehicle Plate number, or 'None' if none matches or needed]
    EXPLANATION: [Short paragraph explaining the dispatch match]
    """
    try:
        res = await llm.ainvoke(prompt)
        text = get_content_text(res)
        
        # Extract fields robustly
        chosen_worker_id = None
        chosen_plate = None
        
        worker_match = re.search(r"CHOSEN_WORKER_ID:\s*([^\n]+)", text, re.IGNORECASE)
        plate_match = re.search(r"CHOSEN_PLATE_NUMBER:\s*([^\n]+)", text, re.IGNORECASE)
        
        if worker_match:
            chosen_worker_id = worker_match.group(1).strip()
        if plate_match:
            chosen_plate = plate_match.group(1).strip()
            if chosen_plate.upper() == "NONE":
                chosen_plate = None
                
        # Find matching dictionary objects
        selected_worker = next((w for w in workers if w["worker_id"] == chosen_worker_id), workers[0])
        selected_vehicle = next((v for v in vehicles if v["plate_number"] == chosen_plate), None)
        if not selected_vehicle and vehicles:
            selected_vehicle = vehicles[0]
            
        logs.append(f"[Graph Node 4] AI matched worker: {selected_worker['name']} ({selected_worker['worker_id']})")
        return {"selected_worker": selected_worker, "selected_vehicle": selected_vehicle, "logs": logs}
    except Exception as e:
        # Robust fallback
        selected_worker = workers[0]
        selected_vehicle = vehicles[0] if vehicles else None
        logs.append(f"[Graph Node 4 ERROR] AI ranking encountered error, falling back to top candidate: {e}")
        return {"selected_worker": selected_worker, "selected_vehicle": selected_vehicle, "logs": logs}

async def dispatch_node(state: DispatchState) -> dict:
    """
    Node 5: Updates MongoDB and commits the dispatch.
    """
    complaint_id = state["complaint_id"]
    worker = state["selected_worker"]
    vehicle = state["selected_vehicle"]
    logs = list(state.get("logs", []))
    logs.append("[Graph Node 5] Committing dispatch choice to MongoDB.")
    
    if not worker:
        logs.append("[Graph Node 5 WARNING] No worker selected. Task remains unassigned.")
        return {"status": "UNASSIGNED", "logs": logs}
        
    success = await update_complaint_assignment(
        complaint_id=complaint_id,
        worker_id=worker["worker_id"],
        worker_name=worker["name"],
        vehicle_number=vehicle["plate_number"] if vehicle else None,
        vehicle_type=vehicle["vehicle_type"] if vehicle else None
    )
    
    if success:
        logs.append(f"[Graph Node 5 SUCCESS] Dispatched complaint {complaint_id} to worker {worker['name']}.")
        return {"status": "SUCCESS", "logs": logs}
    else:
        logs.append("[Graph Node 5 ERROR] Database update failed.")
        return {"status": "FAILED", "logs": logs}

# 3. Create the LangGraph Workflow
workflow = StateGraph(DispatchState)

# Add Nodes
workflow.add_node("assess_priority", assess_priority_node)
workflow.add_node("consult_sop", consult_sop_node)
workflow.add_node("shortlist_resources", shortlist_resources_node)
workflow.add_node("rank_and_recommend", rank_and_recommend_node)
workflow.add_node("dispatch", dispatch_node)

# Add Edges
workflow.add_edge(START, "assess_priority")
workflow.add_edge("assess_priority", "consult_sop")
workflow.add_edge("consult_sop", "shortlist_resources")
workflow.add_edge("shortlist_resources", "rank_and_recommend")
workflow.add_edge("rank_and_recommend", "dispatch")
workflow.add_edge("dispatch", END)

# Compile
dispatcher_graph = workflow.compile()

async def run_ai_dispatcher(complaint_id: str, lat: float, lon: float, category: str, ward: str) -> dict:
    """
    Invokes the stateful LangGraph dispatcher.
    """
    import re # Needed inside for re matching
    initial_state = {
        "complaint_id": complaint_id,
        "lat": lat,
        "lon": lon,
        "category": category,
        "ward": ward,
        "priority": "MEDIUM",
        "sop_guidelines": "",
        "shortlisted_workers": [],
        "shortlisted_vehicles": [],
        "selected_worker": None,
        "selected_vehicle": None,
        "logs": [],
        "status": "INIT"
    }
    
    print(f"[LANGGRAPH] Starting stateful dispatch execution for complaint: {complaint_id}")
    final_output = await dispatcher_graph.ainvoke(initial_state)
    
    print(f"[LANGGRAPH] Dispatch execution finished with status: {final_output['status']}")
    return final_output
import re # Make sure regex is in global scope
