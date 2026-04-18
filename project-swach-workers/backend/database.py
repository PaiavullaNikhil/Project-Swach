from beanie import init_beanie
from models import Complaint, Worker, Vehicle
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017/swach_db"
    database_name: str = "swach_db"

    # Cloudinary
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # AI
    gemini_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


async def init_db():
    # Construct URI robustly. 
    # For Atlas (mongodb+srv), the database name should be after the slash.
    base_uri = settings.mongodb_uri.split("?")[0].rstrip("/")
    if not base_uri.endswith(settings.database_name):
        uri = f"{base_uri}/{settings.database_name}"
        # Re-append parameters if they existed
        if "?" in settings.mongodb_uri:
            uri += "?" + settings.mongodb_uri.split("?")[1]
    else:
        uri = settings.mongodb_uri
        
    await init_beanie(
        connection_string=uri,
        document_models=[Complaint, Worker, Vehicle],
    )
