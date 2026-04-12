import cloudinary
import cloudinary.uploader
from database import settings

cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True
)

async def upload_image(file_path: str) -> str:
    """
    Uploads a local image to Cloudinary and returns the secure URL.
    """
    try:
        # We use a synchronous call wrapped in a way that works for FastAPI (or just block briefly)
        # For a professional app, run this in a threadpool
        response = cloudinary.uploader.upload(file_path, folder="project_swach/reports")
        return response.get("secure_url")
    except Exception as e:
        print(f"Cloudinary Upload Error: {e}")
        raise e
