import os
import sys
from database import settings

# Ensure backend root is in import path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

def get_content_text(res) -> str:
    """
    Safely extracts plain string text from LangChain LLM response (handling string or list of dicts/strings).
    """
    if res is None:
        return ""
    content = getattr(res, "content", res)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, str):
                text_parts.append(item)
            elif isinstance(item, dict):
                text_parts.append(item.get("text", str(item)))
            else:
                text_parts.append(str(item))
        return "".join(text_parts)
    return str(content)

# Core LLM instance (Gemini 3.1 Flash Lite for high performance and low latency)
llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    google_api_key=settings.gemini_api_key,
    temperature=0.2
)

# LLM instance for complex reasoning / code execution/aggregations (Gemini 3.1 Flash Lite as robust fallback)
llm_pro = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    google_api_key=settings.gemini_api_key,
    temperature=0.1
)

# Embeddings model (Google Gemini Embedding 001)
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=settings.gemini_api_key
)
