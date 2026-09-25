import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    uri = "mongodb+srv://nikhil20th65_db_user:hROQq2yETcL4ZFpG@cluster0.jit9e9e.mongodb.net/"
    print(f"Testing connection to: cluster0.jit9e9e.mongodb.net")
    try:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=10000)
        result = await client["swach_db"].command("ping")
        print(f"SUCCESS: {result}")
    except Exception as e:
        print(f"FAILED: {e}")
    finally:
        client.close()

asyncio.run(test())
