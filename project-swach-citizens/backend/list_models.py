from google import genai
from database import settings
client = genai.Client(api_key=settings.gemini_api_key)
for m in client.models.list():
    print(m.name)
