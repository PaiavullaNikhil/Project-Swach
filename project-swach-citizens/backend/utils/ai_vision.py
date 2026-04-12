from database import settings
from typing import Dict, Any


async def check_waste_report(image_path: str) -> Dict[str, Any]:
    """
    Uses Gemini Vision to verify if the uploaded image contains waste/garbage.
    Returns a dictionary with 'valid', 'confidence', and 'reason'.
    """
    api_key = settings.gemini_api_key
    if not api_key:
        # Fallback for development without API key
        return {"valid": True, "confidence": 1.0, "reason": "AI check skipped (no API key)"}

    try:
        from google import genai

        client = genai.Client(api_key=api_key)

        with open(image_path, "rb") as f:
            image_data = f.read()

        prompt = """
        Analyze this image for a waste management system. 
        1. Does it contain garbage, waste, or litter in a public or private area?
        2. Specifically, look for piles of trash, overflowing bins, or illegal dumping.
        3. If it is waste, return 'VALID'. Otherwise, return 'INVALID' with a short reason.
        
        Format:
        VALID: [Confidence 0-1]
        OR
        INVALID: [Reason]
        """

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[prompt, {"mime_type": "image/jpeg", "data": image_data}],
        )
        text = response.text.upper()

        if "VALID" in text and "INVALID" not in text:
            return {"valid": True, "confidence": 0.9, "reason": "Waste detected by AI"}
        else:
            reason = text.split("INVALID:")[-1].strip() if "INVALID:" in text else "Not recognized as waste"
            return {"valid": False, "confidence": 0.0, "reason": reason}

    except Exception as e:
        print(f"Gemini AI Error: {e}")
        return {"valid": True, "confidence": 0.5, "reason": "AI check failed, defaulting to manual verification"}
