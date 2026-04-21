import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def migrate():
    # Connection URL (Corrected from .env)
    uri = "mongodb+srv://nikhil20th65_db_user:JEg9h6u8stT4HBzK@project-swach.xcmgdpw.mongodb.net/"
    client = AsyncIOMotorClient(uri)
    db = client.swach_db
    
    print("Starting migration of worker statistics...")
    
    # 1. Get all cleared complaints
    cleared_complaints = await db.complaints.find({"status": "Cleared"}).to_list(None)
    print(f"Found {len(cleared_complaints)} cleared complaints.")
    
    # 2. Aggregate counts
    worker_counts = {}
    for c in cleared_complaints:
        w_id = c.get("worker_id")
        if w_id:
            # Normalize to uppercase for consistent matching (e.g. w001 -> W001)
            w_id = w_id.upper()
            worker_counts[w_id] = worker_counts.get(w_id, 0) + 1
            
    print(f"Aggregated counts: {worker_counts}")
    
    # 3. Update workers
    for w_id, count in worker_counts.items():
        # First, try to find the worker (case insensitive)
        worker = await db.workers.find_one({"worker_id": {"$regex": f"^{w_id}$", "$options": "i"}})
        if worker:
            await db.workers.update_one(
                {"_id": worker["_id"]},
                {"$set": {"tasks_completed": count}}
            )
            print(f"Updated worker {w_id} with {count} tasks.")
        else:
            print(f"Worker {w_id} not found in roster.")
            
    print("Migration complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())
