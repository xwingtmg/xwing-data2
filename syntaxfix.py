import os
import json

base_path = r"C:\Users\gregk\Documents\GitHub\xwa-points\xwing-data2\data\pilots"

for root, _, files in os.walk(base_path):
    for file in files:
        if file.endswith(".json"):
            file_path = os.path.join(root, file)

            with open(file_path, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError as e:
                    print(f"❌ JSON error in {file_path}: {e}")
                    continue

            changed = False

            if "pilots" in data:
                for pilot in data["pilots"]:
                    # Replace in 'ability'
                    if "ability" in pilot and isinstance(pilot["ability"], str):
                        updated = pilot["ability"].replace("[Missiles]", "[Missile]")
                        if updated != pilot["ability"]:
                            pilot["ability"] = updated
                            changed = True

                    # Replace in 'shipAbility.text'
                    if "shipAbility" in pilot and isinstance(pilot["shipAbility"], dict):
                        if "text" in pilot["shipAbility"] and isinstance(pilot["shipAbility"]["text"], str):
                            updated = pilot["shipAbility"]["text"].replace("[Missiles]", "[Missile]")
                            if updated != pilot["shipAbility"]["text"]:
                                pilot["shipAbility"]["text"] = updated
                                changed = True

            if changed:
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                print(f"✅ Updated: {file_path}")
