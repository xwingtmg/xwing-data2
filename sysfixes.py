import os
import json

def format_faction_name(folder_name):
    always_lower = {"and", "of", "the"}
    words = folder_name.replace("-", " ").split()
    return " ".join(
        word.capitalize() if i == 0 or word not in always_lower else word
        for i, word in enumerate(words)
    )

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

            # Get faction from folder
            folder_name = os.path.basename(root)
            formatted_faction = format_faction_name(folder_name)

            if data.get("faction") != formatted_faction:
                data["faction"] = formatted_faction
                changed = True

            # Only modify pilots
            if "pilots" in data:
                for pilot in data["pilots"]:
                    # Replace Payload → Device
                    if "slots" in pilot:
                        updated_slots = ["Device" if slot.lower() == "payload" else slot for slot in pilot["slots"]]
                        if updated_slots != pilot["slots"]:
                            pilot["slots"] = updated_slots
                            changed = True

                    # Normalize Yes/No to true/false
                    for tag in ["standard", "extended", "epic"]:
                        if tag in pilot and isinstance(pilot[tag], str):
                            val = pilot[tag].strip().lower()
                            if val == "yes":
                                pilot[tag] = True
                                changed = True
                            elif val == "no":
                                pilot[tag] = False
                                changed = True

                    # Move pilot["actions"] → pilot["shipActions"]
                    if "actions" in pilot and pilot["actions"]:
                        pilot["shipActions"] = pilot["actions"]
                        pilot["actions"] = []
                        changed = True

            if changed:
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                print(f"✅ Updated: {file_path}")
