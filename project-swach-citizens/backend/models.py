from datetime import datetime, timezone
from typing import List, Optional
from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel, GEOSPHERE


class GeoJSONPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]


class Vehicle(Document):
    plate_number: str
    vehicle_type: str
    status: str = "Available" # Available, In Use, Maintenance

    class Settings:
        name = "vehicles"


class Worker(Document):
    name: str
    worker_id: str
    phone: str
    assigned_vehicle_id: Optional[str] = None
    status: str = "Active"
    
    class Settings:
        name = "workers"


class Complaint(Document):
    status: str = "Reported"
    upvotes: int = 1
    photo_url: str
    location: GeoJSONPoint
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ward: Optional[str] = None
    constituency: Optional[str] = None
    mla: Optional[str] = None
    reporter_hash: str
    category: str = "General"
    points_awarded: bool = False
    
    # Worker Section
    worker_id: Optional[str] = None
    worker_name: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    worker_status: Optional[str] = None # Assigned, On the way, Work in progress, Completed
    worker_location: Optional[GeoJSONPoint] = None
    after_photo_url: Optional[str] = None
    cleared_timestamp: Optional[datetime] = None

    class Settings:
        name = "complaints"
        indexes = [
            IndexModel([("location", GEOSPHERE)]),
        ]

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "Reported",
                "upvotes": 1,
                "photo_url": "https://example.com/photo.jpg",
                "location": {"type": "Point", "coordinates": [77.5946, 12.9716]},
                "reporter_hash": "abc123hash",
                "ward": "HSR Layout",
                "worker_status": "Completed"
            }
        }
    }
