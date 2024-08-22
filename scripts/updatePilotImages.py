import json
from pathlib import Path


def process_json_files_in_directory(
    directory: str, card_type: str, card_object: str
) -> None:
    """
    Processes JSON files in the specified directory, updates the 'image' field
    for each card in card_object, and writes the updated data back to the file.

    Args:
        directory (str): The directory to search for JSON files.
        card_type (str): The card type to include in the image URL.
        card_object (str): The key in the JSON file with list of cards.
    """
    directory_path = Path(directory)

    # Iterate over all JSON files in the directory and its subdirectories
    for file_path in directory_path.rglob("*.json"):
        try:
            # Open and load the JSON file
            with file_path.open("r", encoding="utf-8") as json_file:
                data = json.load(json_file)

            if isinstance(data, list):
                # Handle JSON data as a list of dictionaries
                for item in data:
                    if (
                        isinstance(item, dict)
                        and isinstance(item.get(card_object), list)
                        and len(item[card_object]) == 1
                    ):
                        for card in item[card_object]:
                            if isinstance(card, dict):

                                # Update the 'image' field
                                if (
                                    "image" not in card
                                    and "artwork" not in card
                                ):
                                    card_xws = item["xws"]
                                    print(
                                        f"{card_xws} is a SL upgrade "
                                        f":{file_path}"
                                    )

                                else:
                                    card["image"] = build_image_url(
                                        card_type, item["xws"]
                                    )
                                    card["artwork"] = build_artwork_url(
                                        card_type, item["xws"]
                                    )
                    elif (
                        isinstance(item, dict)
                        and isinstance(item.get(card_object), list)
                        and len(item[card_object]) == 2
                    ):
                        card_xws = item["xws"]
                        print(f"{card_xws} has two sides " f":{file_path}")
                        # image_xws = item["xws"]
                        # sideb_xws = item["xws"] + "-sideb"
                        # item[card_object][0]["image"] = build_image_url(
                        #     card_type, image_xws
                        # )
                        # item[card_object][0]["artwork"] = build_artwork_url(
                        #     card_type, image_xws
                        # )
                        # item[card_object][1]["image"] = build_image_url(
                        #     card_type, sideb_xws
                        # )
                        # item[card_object][1]["artwork"] = build_artwork_url(
                        #     card_type, sideb_xws
                        # )

            elif isinstance(data, dict):
                # Handle JSON data as a dictionary
                if card_object in data and isinstance(data[card_object], list):
                    for card in data[card_object]:
                        if isinstance(card, dict):
                            # Update the 'image' field
                            card["image"] = build_image_url(
                                card_type, card["xws"]
                            )

                            card["artwork"] = build_artwork_url(
                                card_type, card["xws"]
                            )

            else:
                # Skip files with unsupported JSON structures
                print(f"Skipped {file_path} - Unsupported JSON structure")

            # Write the updated data back to the file
            with file_path.open("w", encoding="utf-8") as json_file:
                json.dump(data, json_file, indent=4)
            print(f"Updated {file_path}")

        except (IOError, json.JSONDecodeError) as e:
            # Handle file I/O and JSON decoding errors
            print(f"Failed to process {file_path}: {e}")


def build_image_url(card_type: str, xws: str) -> str:
    """
    Constructs the URL for the image based on card type and xws value.

    Args:
        card_type (str): The type of card (e.g., "pilots", "upgrades").
        xws (str): The xws identifier for the card.

    Returns:
        str: The constructed image URL.
    """
    base_url = (
        "https://raw.githubusercontent.com/SogeMoge/"
        "x-wing2.0-project-goldenrod/2.0-legacy/src/images/En"
    )
    return f"{base_url}/{card_type}/{xws}.png"


def build_artwork_url(card_type: str, xws: str) -> str:
    """
    Constructs the URL for the artwork based on card type and xws value.

    Args:
        card_type (str): The type of card (e.g., "pilots", "upgrades").
        xws (str): The xws identifier for the card.

    Returns:
        str: The constructed image URL.
    """
    base_url = (
        "https://raw.githubusercontent.com/SogeMoge/"
        "x-wing2.0-project-goldenrod/2.0-legacy/src/images/Art"
    )
    return f"{base_url}/{card_type}/{xws}.png"


# Example usage
process_json_files_in_directory(r".\data\upgrades", "upgrades", "sides")
process_json_files_in_directory(r".\data\pilots", "pilots", "pilots")
