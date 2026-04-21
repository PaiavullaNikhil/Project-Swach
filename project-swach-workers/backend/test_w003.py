import requests

BASE_URL = "http://localhost:8001"

def test_w003():
    print("--- Testing W003 (Tilak - Basavanagudi) ---")
    try:
        t_res = requests.get(f"{BASE_URL}/worker/tasks/W003")
        tasks = t_res.json()
        print(f"Tasks found: {len(tasks)}")
        for t in tasks:
            print(f" - {t['_id']} ({t['status']}) in {t['ward']}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_w003()
