import os
from database import settings
from ai.rag_engine import retrieve_sop_for_complaint

async def process_voice_command(audio_path: str, category: str) -> str:
    """
    Processes a worker's audio query using Gemini 1.5.
    Fetches the SOP for the specific trash category and asks Gemini to act as a 
    waste-management expert, replying in Kannada with guidance or acknowledgment.
    """
    api_key = settings.gemini_api_key
    if not api_key:
        return "ಕ್ಷಮಿಸಿ, AI ಸರ್ವರ್ ಸದ್ಯಕ್ಕೆ ಲಭ್ಯವಿಲ್ಲ." # Sorry, AI server currently unavailable in Kannada.

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        with open(audio_path, "rb") as f:
            audio_data = f.read()

        # Fetch SOP to ground the AI's response
        sop_guidance = retrieve_sop_for_complaint(category)

        prompt = f"""
        You are a helpful and intelligent municipal waste management AI assistant.
        You are assisting a sanitation worker on the ground who is dealing with trash categorized as '{category}'.
        
        Here are the standard operating procedures (SOP) and safety guidelines for this category:
        {sop_guidance}
        
        The worker has sent an audio message. Listen to the message and provide a helpful, guiding response.
        If they ask what to do, guide them using the SOP above.
        If they say they are done, acknowledge their work and remind them of any final safety steps.
        
        CRITICAL RULE: You MUST reply entirely in Kannada (ಕನ್ನಡ) script. Do not use English. Keep your response conversational, respectful, and relatively short (2-3 sentences max).
        """

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[
                prompt, 
                types.Part.from_bytes(data=audio_data, mime_type="audio/mp4") # Expo usually records in m4a/mp4
            ]
        )
        
        reply = response.text.strip()
        print(f"Voice Agent Reply (Kannada): {reply}")
        return reply

    except Exception as e:
        print(f"Voice Agent Error: {e}")
        return "ಕ್ಷಮಿಸಿ, ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ." # Sorry, please try again.
