from datetime import datetime
from typing import List, Optional
from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel, GEOSPHERE


class GeoJSONPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]


class Complaint(Document):
    status: str = "Reported"
    upvotes: int = 1
    photo_url: str
    location: GeoJSONPoint
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ward: Optional[str] = None
    constituency: Optional[str] = None
    mla: Optional[str] = None
    reporter_hash: str
    points_awarded: bool = False

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
            }
        }
    }
