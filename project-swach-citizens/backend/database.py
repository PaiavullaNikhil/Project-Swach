from beanie import init_beanie
from models import Complaint
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
    # Let Beanie create its own client internally via connection_string.
    # The database name must be in the URI path for get_default_database() to work.
    uri = settings.mongodb_uri.rstrip("/") + "/" + settings.database_name
    await init_beanie(
        connection_string=uri,
        document_models=[Complaint],
    )
