import socket
import os
import re
from pathlib import Path

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        print(f"Error detecting IP: {e}")
        return "127.0.0.1"

def update_theme_ip(ip):
    # Find the root project directory relative to this script
    script_dir = Path(__file__).parent.absolute()
    theme_path = script_dir / "mobile" / "constants" / "theme.ts"
    
    if not theme_path.exists():
        # Try checking if we are already inside the mobile folder
        theme_path = script_dir / "constants" / "theme.ts"

    if not theme_path.exists():
        print(f"❌ Error: Theme file not found at {theme_path}")
        return

    with open(theme_path, "r") as f:
        content = f.read()

    pattern = r"(export const API_URL = ['\"`]).*?(:8000['\"`];)"
    replacement = rf"\1http://{ip}\2"
    
    new_content = re.sub(pattern, replacement, content)

    with open(theme_path, "w") as f:
        f.write(new_content)
    
    print(f"🚀 [AUTO-IP] Updated API_URL to http://{ip}:8000 in {theme_path.name}")

if __name__ == "__main__":
    ip = get_local_ip()
    update_theme_ip(ip)
