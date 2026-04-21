import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

from database import settings

async def debug_isolation():
    uri = settings.mongodb_uri
    client = AsyncIOMotorClient(uri)
    db = client[settings.database_name]
    
    print("--- DEBUGGING ISOLATION LOGIC ---")
    
    # 1. Check Ramesh
    worker = await db.workers.find_one({"worker_id": "W001"})
    print(f"Worker W001: {worker.get('name')} in Ward: '{worker.get('ward')}'")
    
    # 2. Check Vehicles for Ramesh's Ward
    v_query = {"status": "Available", "ward": worker.get('ward')}
    matching_vehicles = await db.vehicles.find(v_query).to_list(None)
    all_available = await db.vehicles.find({"status": "Available"}).to_list(None)
    print(f"Total Available Vehicles: {len(all_available)}")
    print(f"Vehicles matching ward '{worker.get('ward')}': {len(matching_vehicles)}")
    
    # 3. Check Complaints for Ramesh's Ward
    # A Reported task has worker_id as None or ""
    c_query = {
        "status": "Reported",
        "ward": worker.get('ward'),
        "worker_id": {"$in": [None, ""]}
    }
    matching_complaints = await db.complaints.find(c_query).to_list(None)
    all_reported = await db.complaints.find({"status": "Reported"}).to_list(None)
    print(f"Total Reported Complaints: {len(all_reported)}")
    print(f"Complaints matching ward '{worker.get('ward')}': {len(matching_complaints)}")

    client.close()

if __name__ == "__main__":
    asyncio.run(debug_isolation())
