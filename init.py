import json
import csv
from pathlib import Path

# Base "pilots" directory
BASE_DIR = Path(r"C:\Users\gregk\Documents\GitHub\xwing-data2\data\pilots")

def main():
    rows = []

    # Go through each immediate subfolder (7 factions)
    for subdir in sorted(p for p in BASE_DIR.iterdir() if p.is_dir()):
        # counts[0] = initiative 1, ..., counts[5] = initiative 6
        counts = [0] * 6

        # Track unique (name, initiative) pairs per folder
        seen_name_init = set()

        # Look at every JSON file in this folder
        for json_file in subdir.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception as e:
                print(f"Error reading {json_file}: {e}")
                continue

            # Walk through pilots and count initiatives 1–6, deduped by (name, initiative)
            for pilot in data.get("pilots", []):
                name = pilot.get("name")
                init = pilot.get("initiative")

                if not name:
                    continue
                if not isinstance(init, int) or not (1 <= init <= 6):
                    continue

                key = (name, init)
                if key in seen_name_init:
                    # Already counted this name+initiative combo in this folder
                    continue

                seen_name_init.add(key)
                counts[init - 1] += 1

        # Add row: folder name, then counts for initiatives 1..6
        rows.append([subdir.name, *counts])

    # Output CSV in the same pilots folder
    out_path = BASE_DIR / "pilot_initiatives_by_folder_deduped.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Folder", "Init 1", "Init 2", "Init 3", "Init 4", "Init 5", "Init 6"])
        writer.writerows(rows)

    print(f"Wrote CSV to: {out_path}")

if __name__ == "__main__":
    main()
