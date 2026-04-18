import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models import Complaint, Worker, Vehicle
from database import settings

async def seed():
    # Construct URI
    uri = settings.mongodb_uri.rstrip("/") + "/" + settings.database_name
    
    # Initialize Beanie
    await init_beanie(
        connection_string=uri,
        document_models=[Complaint, Worker, Vehicle],
    )

    print("Seeding database...")

    # Clear existing vehicles (optional, but good for testing)
    await Vehicle.find_all().delete()
    
    # Add dummy vehicles
    vehicles = [
        Vehicle(plate_number="KA-01-MJ-1234", vehicle_type="Compactor Truck", status="Available"),
        Vehicle(plate_number="KA-05-AB-5678", vehicle_type="Dump Truck", status="Available"),
        Vehicle(plate_number="KA-03-XY-9012", vehicle_type="Street Sweeper", status="Available"),
        Vehicle(plate_number="KA-02-HL-4321", vehicle_type="Small Tipper", status="Available"),
    ]
    
    for v in vehicles:
        await v.insert()
        print(f"Added vehicle: {v.plate_number}")

    # Add dummy workers if needed
    existing_workers = await Worker.find_all().count()
    if existing_workers == 0:
        workers = [
            Worker(name="Ramesh Kumar", worker_id="W001", phone="+91 9876543210", ward="HSR Layout"),
            Worker(name="Suresh Raina", worker_id="W002", phone="+91 8765432109", ward="Koramangala"),
        ]
        for w in workers:
            await w.insert()
            print(f"Added worker: {w.worker_id}")

    print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed())
