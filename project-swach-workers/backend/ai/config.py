import os
import sys
from database import settings

# Ensure backend root is in import path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

# Core LLM instance (Gemini 2.5 Flash for high performance and low latency)
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.gemini_api_key,
    temperature=0.2
)

# LLM instance for complex reasoning / code execution/aggregations (Gemini 2.5 Flash as robust fallback)
llm_pro = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.gemini_api_key,
    temperature=0.1
)

# Embeddings model (Google text-embedding-004)
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=settings.gemini_api_key
)
