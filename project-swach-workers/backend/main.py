import os
import uuid
import math
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
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

# Serve uploaded photos
os.makedirs("uploads", exist_ok=True)
app.mount("/photos", StaticFiles(directory="uploads"), name="photos")

# Citizen endpoints removed for worker microservice separation

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c * 1000 # returns in meters

@app.get("/worker/tasks", response_model=List[Complaint])
async def get_worker_tasks():
    return await Complaint.find({"status": {"$in": ["Reported", "Assigned"]}}).sort("-upvotes").to_list()

@app.post("/worker/accept/{complaint_id}")
async def worker_accept(complaint_id: str, user_hash: str = Form(...)):
    complaint = await Complaint.get(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    complaint.worker_id = user_hash
    complaint.worker_status = "Assigned"
    complaint.status = "Assigned"
    await complaint.save()
    return {"status": "SUCCESS"}

@app.post("/worker/status/{complaint_id}")
async def worker_update_status(complaint_id: str, status: str = Form(...)):
    complaint = await Complaint.get(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    complaint.worker_status = status
    await complaint.save()
    return {"status": "SUCCESS"}

@app.post("/worker/complete/{complaint_id}")
async def worker_complete(
    complaint_id: str,
    lat: float = Form(...),
    lon: float = Form(...),
    photo: UploadFile = File(...)
):
    complaint = await Complaint.get(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    c_lon, c_lat = complaint.location.coordinates
    dist = haversine(lat, lon, c_lat, c_lon)
    if dist > 200: # 200 meters tolerance
        raise HTTPException(status_code=400, detail=f"Location mismatch. You are {dist:.0f}m away from the site.")
        
    file_ext = photo.filename.split(".")[-1]
    filename = f"after_{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join("uploads", filename)
    with open(file_path, "wb") as f:
        f.write(await photo.read())
        
    try:
        cloudinary_url = await upload_image(file_path)
        os.remove(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to upload proof photo")
        
    complaint.after_photo_url = cloudinary_url
    complaint.status = "Cleared"
    complaint.worker_status = "Completed"
    complaint.cleared_timestamp = datetime.utcnow()
    await complaint.save()
    
    return {"status": "SUCCESS", "distance_m": dist}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
