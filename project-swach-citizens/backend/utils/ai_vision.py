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
        You are a highly sensitive trash detection and classification AI.
        Look closely at the image. Is there ANY form of garbage, waste, litter, plastic, debris, swept piles, or overflowing trash bins?
        
        If trash is visible, classify it into ONE of these categories:
        1. Plastic (Plastic bags, bottles, wrappers)
        2. Organic (Food waste, leaves, natural debris)
        3. Debris (Construction waste, stones, cement, large metal)
        4. Hazardous (Chemicals, sharp objects, medical waste)
        5. Carcass (Dead animals - extremely urgent)
        6. General (Anything else or a mix of above)

        Format your response EXACTLY like this:
        RESULT: [YES/NO]
        CATEGORY: [Category Name]
        REASON: [Brief explanation]
        """

        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=[
                prompt, 
                types.Part.from_bytes(data=image_data, mime_type="image/jpeg")
            ]
        )
        
        raw_text = response.text.strip().upper()
        print(f"AI Pipeline Response:\n{raw_text}")
        
        # Robust Parsing
        is_valid = "RESULT: YES" in raw_text
        category = "General"
        
        categories = ["PLASTIC", "ORGANIC", "DEBRIS", "HAZARDOUS", "CARCASS"]
        for cat in categories:
            if f"CATEGORY: {cat}" in raw_text:
                category = cat.capitalize()
                break

        return {
            "valid": is_valid,
            "category": category,
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