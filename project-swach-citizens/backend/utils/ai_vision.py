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
        from google.genai import types

        client = genai.Client(api_key=api_key)

        with open(image_path, "rb") as f:
            image_data = f.read()

        prompt = """
        You are a highly sensitive trash detection AI.
        Look closely at the image. Is there ANY form of garbage, waste, litter, plastic, debris, swept piles, or overflowing trash bins?
        Even a small amount of visible litter should be counted as waste!
        
        Format your response exactly like this:
        YES - [Brief reason what trash is visible]
        or
        NO - [Brief reason why it looks completely clean]
        """

        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=[
                prompt, 
                types.Part.from_bytes(data=image_data, mime_type="image/jpeg")
            ]
        )
        
        raw_text = response.text.strip()
        print(f"AI Pipeline Response: {raw_text}") # For backend debugging
        
        # Look for YES in the first few characters to handle any markdown like **YES**
        is_valid = "YES" in raw_text[:15].upper()

        return {
            "valid": is_valid,
            "confidence": 1.0 if is_valid else 0.0,
            "reason": raw_text
        }

    except Exception as e:
        error_msg = str(e)
        print(f"Gemini AI Error: {error_msg}")
        
        # If we hit the free-tier rate limit, returning True causes confusion. 
        # Better to return False with a clear message so the user knows they are being throttled.
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            return {
                "valid": False, 
                "confidence": 0.0, 
                "reason": "Google API Rate Limit Reached. Please wait 60 seconds before submitting another photo."
            }

        # Default to False (Reject) for other errors (bad photo, network down)
        return {
            "valid": False, 
            "confidence": 0.0, 
            "reason": f"AI check unavailable. Ensure photo is clear."
        }
