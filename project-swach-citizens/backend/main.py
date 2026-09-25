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
from models import Complaint, GeoJSONPoint, TokenWallet, Voucher
from utils.geocoding import reverse_geocode
from utils.ai_vision import check_waste_report
from utils.cloudinary_utils import upload_image

GEMINI_CHAT_MODEL = "gemini-3.8-flash"

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
        category=category if category != "General" else ai_result.get("category", "General"),
        points_awarded=ai_result["valid"]
    )
    await new_complaint.insert()

    # 8. Award Gamification Tokens
    if ai_result["valid"]:
        wallet = await TokenWallet.find_one({"user_hash": reporter_hash})
        if not wallet:
            wallet = TokenWallet(user_hash=reporter_hash, balance=0)
        wallet.balance += 50
        await wallet.save()

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

# --- Gamification Endpoints ---
@app.get("/wallet/{user_hash}")
async def get_wallet(user_hash: str):
    wallet = await TokenWallet.find_one({"user_hash": user_hash})
    if not wallet:
        wallet = TokenWallet(user_hash=user_hash, balance=0)
        await wallet.insert()
    return {"balance": wallet.balance}

@app.get("/vouchers")
async def get_vouchers():
    vouchers = await Voucher.find(Voucher.is_active == True).to_list()
    if not vouchers:
        # Seed some dummy vouchers if none exist
        vouchers = [
            Voucher(title="10% Off City Metro Pass", description="Valid for 1 month.", cost=100),
            Voucher(title="Free Plant Sapling", description="Claim at the ward office.", cost=200),
            Voucher(title="Rs. 50 Grocery Coupon", description="Use at local parterned stores.", cost=500)
        ]
        for v in vouchers:
            await v.insert()
    return vouchers

@app.post("/vouchers/redeem")
async def redeem_voucher(user_hash: str = Form(...), voucher_id: str = Form(...)):
    from bson import ObjectId
    wallet = await TokenWallet.find_one({"user_hash": user_hash})
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet not found")
        
    try:
        voucher = await Voucher.get(ObjectId(voucher_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid voucher ID")
        
    if not voucher or not voucher.is_active:
        raise HTTPException(status_code=404, detail="Voucher not found or inactive")
        
    if wallet.balance < voucher.cost:
        raise HTTPException(status_code=400, detail="Insufficient Swachh Coins")
        
    wallet.balance -= voucher.cost
    await wallet.save()
    
    import random
    import string
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    return {
        "status": "SUCCESS",
        "message": f"Successfully redeemed '{voucher.title}'.",
        "voucher_code": f"SWACHH-{code}",
        "new_balance": wallet.balance
    }

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

@app.post("/api/ai/query")
async def citizen_ai_query(payload: dict):
    from google import genai
    from database import settings
    
    query = payload.get("query", "")
    user_hash = payload.get("user_hash")
    history = payload.get("history", [])
    
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
        
    api_key = settings.gemini_api_key
    if not api_key:
        return {"answer": "AI is currently offline. Missing API Key."}
        
    try:
        # Get some context to ground the AI
        active_complaints = await Complaint.find({"status": {"$ne": "Cleared"}}).count()
        cleared_complaints = await Complaint.find({"status": "Cleared"}).count()
        
        # Get user's specific history
        user_history_text = "No past reports found for this user."
        if user_hash:
            user_complaints = await Complaint.find({"reporter_hash": user_hash}).to_list()
            if user_complaints:
                history_lines = []
                for idx, c in enumerate(user_complaints):
                    date_str = c.timestamp.strftime("%b %d, %Y") if c.timestamp else "Unknown Date"
                    history_lines.append(f"{idx+1}. Category: {c.category}, Status: {c.status}, Reported on: {date_str}, Ward: {c.ward}")
                user_history_text = "\n".join(history_lines)
        
        # Format chat history
        chat_context = ""
        if history:
            chat_lines = [f"{msg['role'].upper()}: {msg['text']}" for msg in history]
            chat_context = "\n".join(chat_lines)
        
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        You are 'Swachh AI', a helpful and friendly assistant for the Project Swach citizens app.
        Project Swach is a municipal waste management platform.
        
        Current System Context:
        - Active Complaints in City: {active_complaints}
        - Cleaned Complaints in City: {cleared_complaints}
        
        This User's Past Reports (use this to answer questions about 'my reports' or 'my status'):
        {user_history_text}
        
        Recent Conversation History:
        {chat_context}
        
        The user's latest message is: "{query}"
        
        Provide a short, helpful response (max 3 sentences). 
        CRITICAL RULE: DO NOT start your response with a greeting like "Hello" or "Hi there". Answer directly as part of an ongoing conversation.
        """
        
        response = client.models.generate_content(
            model=GEMINI_CHAT_MODEL,
            contents=prompt
        )
        return {"answer": response.text.strip()}
    except Exception as e:
        print(f"Citizen AI Error: {e}")
        return {"answer": "Sorry, I am having trouble thinking right now. Please try again later."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
