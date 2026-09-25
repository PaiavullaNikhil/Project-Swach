import asyncio
from utils.ai_vision import check_waste_report

async def test():
    try:
        result = await check_waste_report(r"c:\Projects\Project-Swach\project-swach-citizens\mobile\assets\trash.png")
        print("RESULT:", result)
    except Exception as e:
        print("ERROR:", e)

asyncio.run(test())
