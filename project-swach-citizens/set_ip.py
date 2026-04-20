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

    # Match API_URL with any port number
    api_pattern = r"(export const API_URL = ['\"`])http://[^:]+:\d+(['\"`];)"
    content = re.sub(api_pattern, rf"\1http://{ip}:8000\2", content)
    
    # Match SOCKET_URL with any port number
    sock_pattern = r"(export const SOCKET_URL = ['\"`])http://[^:]+:\d+(['\"`];)"
    content = re.sub(sock_pattern, rf"\1http://{ip}:8001\2", content)

    with open(theme_path, "w") as f:
        f.write(content)
    
    print(f"🚀 [AUTO-IP] Updated theme.ts:")
    print(f"   API_URL    → http://{ip}:8000 (Citizen Backend)")
    print(f"   SOCKET_URL → http://{ip}:8001 (Worker Backend / Socket.IO)")

if __name__ == "__main__":
    ip = get_local_ip()
    update_theme_ip(ip)
