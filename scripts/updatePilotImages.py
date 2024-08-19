import json
import os


# Function to update the image URL for pilots
def update_pilot_images(json_data):
    for pilot in json_data["pilots"]:
        pilot["image"] = (
            f"https://raw.githubusercontent.com/SogeMoge/x-wing2.0-project-goldenrod/2.0-legacy/src/images/En/pilots/{pilot['xws']}.png"
        )
    return json_data


# List of JSON file paths
json_files = ["tie-reaper.json"]  # Add the paths of your JSON files

# Iterate over each JSON file
for file_path in json_files:
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)

    # Update the pilot images
    updated_data = update_pilot_images(data)

    # Write the updated JSON data back to the file
    with open(file_path, "w") as file:
        json.dump(updated_data, file, indent=4)

    print(f"Updated {file_path}")
