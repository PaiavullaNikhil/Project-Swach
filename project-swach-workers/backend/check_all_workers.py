import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_all_workers():
    uri = "mongodb+srv://nikhil20th65_db_user:JEg9h6u8stT4HBzK@project-swach.xcmgdpw.mongodb.net/"
    client = AsyncIOMotorClient(uri)
    db = client.swach_db
    
    workers = await db.workers.find({}).to_list(None)
    for w in workers:
        print(f"Worker ID: {w['worker_id']}, Name: {w['name']}, Ward: '{w.get('ward')}'")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_all_workers())
