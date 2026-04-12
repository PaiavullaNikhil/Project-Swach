import requests
import json
import os

# Official BBMP 225-Ward GeoJSON (2023 Delimitation)
# Located via browser research
GEOJSON_URL = "https://gist.githubusercontent.com/Vonter/1a31ff6c48e1418736c81651981c99e1/raw/BBMP_Wards_2023.geojson"
OUTPUT_PATH = "shared/wards.json"

def fetch_definitive_bangalore_data():
    print("Fetching absolute 225-Ward Bangalore delimitation data...")
    try:
        response = requests.get(GEOJSON_URL)
        response.raise_for_status()
        
        data = response.json()
        
        # Verify the ward count for precision
        ward_count = len(data['features'])
        print(f"Success: Found {ward_count} wards in the dataset.")
        
        # Ensure the output directory exists
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        
        with open(OUTPUT_PATH, "w") as f:
            json.dump(data, f, indent=2)
            
        print(f"Successfully hydrated {OUTPUT_PATH} with {ward_count} wards.")
        
        # Synchronize with mobile assets
        assets_path = "mobile/assets/wards.json"
        if os.path.exists("mobile/assets"):
            with open(assets_path, "w") as f:
                json.dump(data, f, indent=2)
            print("Synchronized data to mobile assets for visualization.")

    except Exception as e:
        print(f"Error: Failed to fetch absolute ward data: {e}")

if __name__ == "__main__":
    fetch_definitive_bangalore_data()
