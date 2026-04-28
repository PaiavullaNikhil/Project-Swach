import os
import uuid
import math
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from database import init_db
from models import Complaint, GeoJSONPoint
from utils.geocoding import reverse_geocode
from utils.ai_vision import check_waste_report
from utils.cloudinary_utils import upload_image

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Database
    await init_db()
    yield

app = FastAPI(title="Project Swach - Citizen API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded photos
os.makedirs("uploads", exist_ok=True)
app.mount("/photos", StaticFiles(directory="uploads"), name="photos")

@app.post("/report")
async def report_waste(
    lat: float = Form(...),
    lon: float = Form(...),
    photo: UploadFile = File(...),
    user_hash: Optional[str] = Form(None),
    category: str = Form("General")
):
    """
    Step 1: Report Waste
    Captures GPS, Timestamp, and Image. Performs duplicate detection and AI verification.
    """
    # 1. Use client-provided hash or generate new one
    reporter_hash = user_hash or hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()

    # 2. Save File Temporarily
    file_ext = photo.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join("uploads", filename)
    with open(file_path, "wb") as f:
        f.write(await photo.read())

    # 3. Duplicate Detection (Bypassed for testing)
    # Check within 100 meters in the last 24 hours
    # one_day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    # duplicate = await Complaint.find({
    #     ...
    # }).to_list(1)
    duplicate = []  # Bypass duplicate check completely for testing

    if duplicate:
        os.remove(file_path) # Cleanup
        return {
            "status": "DUPLICATE",
            "message": "This issue already exists — support it instead",
            "duplicate_id": str(duplicate[0].id)
        }

    # 4. AI Verification
    ai_result = await check_waste_report(file_path)
    if not ai_result["valid"]:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Report rejected: {ai_result['reason']}")

    # 5. Upload to Cloudinary
    try:
        cloudinary_url = await upload_image(file_path)
        os.remove(file_path) # Cleanup local file after upload
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to upload photo to cloud storage")

    # 6. Reverse Geocoding
    geo_details = reverse_geocode(lat, lon)

    # 7. Save Complaint
    new_complaint = Complaint(
        photo_url=cloudinary_url,
        location=GeoJSONPoint(coordinates=[lon, lat]),
        reporter_hash=reporter_hash,
        ward=geo_details["ward"],
        constituency=geo_details["constituency"],
        mla=geo_details["mla"],
        category=category if category != "General" else ai_result.get("category", "General")
    )
    await new_complaint.insert()

    return {
        "status": "SUCCESS",
        "message": "Complaint filed successfully!",
        "complaint_id": str(new_complaint.id),
        "photo_url": cloudinary_url,
        "reporter_hash": reporter_hash,
        "data": geo_details
    }

@app.get("/feed", response_model=List[Complaint])
async def get_feed(limit: int = 20, offset: int = 0):
    """
    Step 3: Feed View
    Only shows active tasks OR tasks cleared within the last 24 hours.
    """
    one_day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    return await Complaint.find({
        "$or": [
            {"status": {"$ne": "Cleared"}},
            {"status": "Cleared", "cleared_timestamp": {"$gte": one_day_ago}}
        ]
    }).sort("-timestamp").skip(offset).limit(limit).to_list()

@app.post("/upvote/{complaint_id}")
async def upvote(complaint_id: str, user_hash: Optional[str] = Form(None)):
    """
    Step 4: Community Interaction
    Prevents self-upvoting if user_hash matches.
    """
    complaint = await Complaint.get(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    if user_hash and complaint.reporter_hash == user_hash:
        raise HTTPException(status_code=403, detail="You cannot upvote your own report")

    complaint.upvotes += 1
    await complaint.save()
    return {"status": "SUCCESS", "upvotes": complaint.upvotes}

@app.get("/trending")
async def get_trending():
    """
    Step 5: Trending Issues
    Logic: (Upvotes) / (Age in Hours + 2)
    """
    # For now, just sorting by upvotes for simplicity
    return await Complaint.find({"status": {"$ne": "Cleared"}}).sort("-upvotes").limit(5).to_list()

# Worker endpoints removed and delegated to the worker microservice.

@app.get("/complaint/{complaint_id}")
async def get_complaint(complaint_id: str):
    """
    Get a single complaint by ID for tracking
    """
    try:
        from bson import ObjectId
        complaint = await Complaint.get(complaint_id)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        return complaint
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid complaint ID")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
