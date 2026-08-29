import re
from typing import List, Optional
from models import Worker, Vehicle, Complaint

async def get_available_workers_in_ward(ward: str) -> List[dict]:
    """
    Asynchronously retrieves all active workers located within the target ward.
    """
    if not ward:
        return []
    
    # Case-insensitive ward matching using regex
    query = {
        "status": "Active",
        "ward": {"$regex": f"^{re.escape(ward)}$", "$options": "i"}
    }
    
    workers = await Worker.find(query).to_list()
    return [
        {
            "worker_id": w.worker_id,
            "name": w.name,
            "phone": w.phone,
            "ward": w.ward,
            "rating": w.rating,
            "tasks_completed": w.tasks_completed,
            "current_location": w.current_location.coordinates if w.current_location else None
        }
        for w in workers
    ]

async def get_available_vehicles_in_ward(ward: str) -> List[dict]:
    """
    Asynchronously retrieves all vehicles marked 'Available' in the target ward.
    """
    if not ward:
        return []
        
    query = {
        "status": "Available",
        "ward": {"$regex": f"^{re.escape(ward)}$", "$options": "i"}
    }
    
    vehicles = await Vehicle.find(query).to_list()
    return [
        {
            "plate_number": v.plate_number,
            "vehicle_type": v.vehicle_type,
            "ward": v.ward,
            "status": v.status
        }
        for v in vehicles
    ]

async def update_complaint_assignment(
    complaint_id: str,
    worker_id: str,
    worker_name: str,
    vehicle_number: Optional[str] = None,
    vehicle_type: Optional[str] = None
) -> bool:
    """
    Saves the final AI dispatcher recommendation to the complaints collection.
    """
    try:
        complaint = await Complaint.get(complaint_id)
        if not complaint:
            print(f"[DB TOOLS ERROR] Complaint {complaint_id} not found.")
            return False
            
        complaint.worker_id = worker_id
        complaint.worker_name = worker_name
        complaint.vehicle_number = vehicle_number
        complaint.vehicle_type = vehicle_type
        complaint.worker_status = "Assigned"
        complaint.status = "Assigned"
        
        await complaint.save()
        print(f"[DB TOOLS] Successfully assigned complaint {complaint_id} to worker {worker_name} ({worker_id}).")
        return True
    except Exception as e:
        print(f"[DB TOOLS ERROR] Failed to update database assignment: {e}")
        return False
