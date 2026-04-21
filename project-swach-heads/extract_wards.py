import json
import os

path = r'c:\Projects\Project-Swach\project-swach-citizens\mobile\assets\wards.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

wards = []
for f in data['features']:
    props = f['properties']
    if 'name_en' in props and 'id' in props:
        wards.append(f"{props['name_en']} (Ward {props['id']})")

wards.sort()

# Output as a Typescript constant directly to the target file
target_path = r'src/constants/wards.ts'
ts_content = "export const BANGALORE_WARDS = " + json.dumps(wards, indent=2) + ";"

with open(target_path, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Successfully wrote {len(wards)} wards to {target_path}")
