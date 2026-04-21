import json
from shapely.geometry import shape, Point
from typing import Dict, Optional
import os

# Path to the shared ward data
WARDS_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "shared", "wards.json")

# Cache the ward data in memory so we don't re-read the file on every request
_wards_cache = None


def _load_wards():
    global _wards_cache
    if _wards_cache is not None:
        return _wards_cache
    try:
        with open(WARDS_DATA_PATH, "r", encoding="utf-8") as f:
            _wards_cache = json.load(f)
        return _wards_cache
    except Exception as e:
        print(f"Failed to load ward data: {e}")
        return None


def get_ward_from_coords(lat: float, lon: float) -> Dict[str, Optional[str]]:
    """
    Checks which Bangalore ward a GPS coordinate falls into
    using Shapely Point-in-Polygon against the 225-ward GeoJSON.
    """
    wards_geojson = _load_wards()
    if wards_geojson is None:
        return {"ward": "Unknown", "constituency": "Unknown", "mla": "Unknown"}

    try:
        point = Point(lon, lat)  # GeoJSON order: longitude, latitude

        for feature in wards_geojson["features"]:
            polygon = shape(feature["geometry"])
            if polygon.contains(point):
                props = feature["properties"]
                # The official 225-ward GeoJSON uses these keys:
                #   name_en, id, assembly_constituency_name_en
                ward_name = props.get("name_en") or props.get("ward_name", "Unknown")
                ward_no = props.get("id") or props.get("ward_no", "?")
                constituency = props.get("assembly_constituency_name_en", "Bangalore")
                return {
                    "ward": f"{ward_name} (Ward {ward_no})",
                    "constituency": constituency,
                    "mla": f"{constituency} Area",
                }

        return {"ward": "Outside Bangalore Coverage", "constituency": "Unknown", "mla": "Unknown"}

    except Exception as e:
        print(f"Spatial lookup error: {e}")
        return {"ward": "Unknown", "constituency": "Unknown", "mla": "Unknown"}


def reverse_geocode(lat: float, lon: float) -> Dict[str, Optional[str]]:
    """Public API — wraps the spatial lookup."""
    return get_ward_from_coords(lat, lon)
