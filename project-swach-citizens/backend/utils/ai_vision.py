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
        Analyze this image for a municipal waste management system. 
        Does this image contain garbage, waste, litter, or overflowing trash?
        
        Respond with 'YES' if it contains waste, or 'NO' if it is a clean area.
        Follow your answer with a very short reason.
        
        Example: YES - Piles of plastic waste on street.
        Example: NO - Clean sidewalk.
        """

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                prompt, 
                types.Part.from_bytes(data=image_data, mime_type="image/jpeg")
            ]
        )
        
        import re
        raw_text = response.text.strip()
        print(f"AI Pipeline Response: {raw_text}") # For backend debugging
        
        # Clean text of leading non-alphanumeric chars (like "**", "-", ">")
        clean_text = re.sub(r'^[^a-zA-Z]+', '', raw_text.upper())
        
        # Check if it starts with YES (case-insensitive)
        is_valid = clean_text.startswith("YES")

        return {
            "valid": is_valid,
            "confidence": 1.0 if is_valid else 0.0,
            "reason": raw_text
        }

    except Exception as e:
        error_msg = str(e)
        print(f"Gemini AI Error: {error_msg}")
        
        # If we hit the free-tier rate limit (15 requests/min), fail-open so testing isn't blocked
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            return {
                "valid": True, 
                "confidence": 0.5, 
                "reason": "API rate limit reached. Auto-accepting for manual review."
            }

        # Default to False (Reject) for other errors (bad photo, network down)
        return {
            "valid": False, 
            "confidence": 0.0, 
            "reason": f"AI check unavailable. Ensure photo is clear."
        }
