import os
import uuid
import math
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional

import socketio
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from database import init_db
from models import Complaint, GeoJSONPoint, Worker, Vehicle
from utils.geocoding import reverse_geocode
from utils.ai_vision import check_waste_report
from utils.cloudinary_utils import upload_image

# Socket.io setup with path configuration
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Database
    await init_db()
    yield

app = FastAPI(title="Project Swach - API", lifespan=lifespan)
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

# --- Citizen Endpoints ---

@app.post("/report")
async def report_waste(
    lat: float = Form(...),
    lon: float = Form(...),
    photo: UploadFile = File(...),
    user_hash: Optional[str] = Form(None)
):
    # 1. Use client-provided hash or generate new one
    reporter_hash = user_hash or hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()

    # 2. Save File Temporarily
    file_ext = photo.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join("uploads", filename)
    with open(file_path, "wb") as f:
        f.write(await photo.read())

    # 3. AI Verification
    ai_result = await check_waste_report(file_path)
    if not ai_result["valid"]:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Report rejected: {ai_result['reason']}")

    # 4. Upload to Cloudinary
    try:
        cloudinary_url = await upload_image(file_path)
        os.remove(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to upload photo to cloud storage")

    # 5. Reverse Geocoding
    geo_details = reverse_geocode(lat, lon)

    # 6. Save Complaint
    new_complaint = Complaint(
        photo_url=cloudinary_url,
        location=GeoJSONPoint(coordinates=[lon, lat]),
        reporter_hash=reporter_hash,
        ward=geo_details["ward"],
        constituency=geo_details["constituency"],
        mla=geo_details["mla"]
    )
    await new_complaint.insert()

    # 7. Broadcast to Heads Portal & Workers
    await sio.emit("new_complaint", {
        "complaint_id": str(new_complaint.id),
        "ward": new_complaint.ward,
        "location": [lon, lat]
    })

    return {
        "status": "SUCCESS",
        "message": "Complaint filed successfully!",
        "complaint_id": str(new_complaint.id),
        "photo_url": cloudinary_url,
        "reporter_hash": reporter_hash
    }

@app.get("/feed", response_model=List[Complaint])
async def get_feed(limit: int = 20, offset: int = 0):
    return await Complaint.find_all().sort("-timestamp").skip(offset).limit(limit).to_list()

@app.post("/upvote/{complaint_id}")
async def upvote(complaint_id: str, user_hash: Optional[str] = Form(None)):
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
    # Priority Score = Upvotes + (Age in Hours * 2) - same logic as dashboard
    return await Complaint.find({"status": {"$ne": "Cleared"}}).sort("-upvotes").limit(5).to_list()

@app.get("/complaint/{complaint_id}")
async def get_complaint(complaint_id: str):
    try:
        complaint = await Complaint.get(complaint_id)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
        return complaint
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid complaint ID")

# --- Worker Endpoints ---
def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c * 1000 # returns in meters

# Socket.io events
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@app.get("/worker/login/{worker_id}")
async def worker_login(worker_id: str):
    # Case-insensitive lookup using regex
    worker = await Worker.find_one({
        "worker_id": {"$regex": f"^{worker_id}$", "$options": "i"}
    })
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker

@app.get("/worker/vehicles")
async def get_vehicles(ward: Optional[str] = None):
    query = {"status": "Available"}
    if ward:
        query["ward"] = ward
    return await Vehicle.find(query).to_list()

@app.post("/worker/location/{worker_id}")
async def update_location(worker_id: str, lat: float = Form(...), lon: float = Form(...)):
    # Update all active tasks for this worker with their current location
    await Complaint.find({
        "worker_id": worker_id, 
        "worker_status": "On the way"
    }).update({"$set": {"worker_location": GeoJSONPoint(coordinates=[lon, lat])}})
    
    # Broadcast location to all clients
    await sio.emit("location_update", {"worker_id": worker_id, "lat": lat, "lon": lon})
    
    return {"status": "SUCCESS"}

@app.get("/worker/tasks/{worker_id}", response_model=List[Complaint])
async def get_worker_tasks(worker_id: str):
    # Only return tasks explicitly assigned to THIS worker.
    return await Complaint.find({
        "worker_id": worker_id,
        "status": {"$in": ["Assigned", "On the way", "Work in progress", "Cleared"]} # Show all recent assigned stuff
    }).sort("-timestamp").to_list()

@app.post("/worker/accept/{complaint_id}")
async def worker_accept(
    complaint_id: str, 
    user_hash: str = Form(...), 
    vehicle_number: Optional[str] = Form(None)
):
    complaint = await Complaint.get(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Fetch real worker info
    worker = await Worker.find_one({"worker_id": user_hash})
    if worker:
        complaint.worker_name = worker.name
        # If vehicle was selected at login and passed here
        if vehicle_number:
            complaint.vehicle_number = vehicle_number
            vehicle = await Vehicle.find_one({"plate_number": vehicle_number})
            if vehicle:
                complaint.vehicle_type = vehicle.vehicle_type

    complaint.worker_id = user_hash
    complaint.worker_status = "Assigned"
    complaint.status = "Assigned"
    await complaint.save()

    # Broadcast status change
    await sio.emit("status_update", {
        "complaint_id": str(complaint.id),
        "status": "Assigned",
        "worker_name": complaint.worker_name,
        "worker_id": user_hash
    })

    return {"status": "SUCCESS"}

@app.post("/worker/status/{complaint_id}")
async def worker_update_status(complaint_id: str, status: str = Form(...)):
    complaint = await Complaint.get(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    complaint.worker_status = status
    await complaint.save()

    # Broadcast status change
    await sio.emit("status_update", {
        "complaint_id": complaint_id,
        "status": status,
        "worker_id": complaint.worker_id
    })

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
    
    # Broadcast completion
    await sio.emit("status_update", {
        "complaint_id": complaint_id,
        "status": "Cleared",
        "worker_status": "Completed"
    })
    
    return {"status": "SUCCESS", "distance_m": dist}

if __name__ == "__main__":
    import uvicorn
    # Use the combined app for local runs too
    uvicorn.run("main:combined_app", host="0.0.0.0", port=8001, reload=True)

# Combined ASGI app wrapper for stable Socket.io + FastAPI routing
combined_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="/ws/socket.io")
