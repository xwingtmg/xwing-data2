import os
import json
import mysql.connector

# --- DB CONFIG YOU GAVE ---
DB_CONFIG = {
    "host": "metro.proxy.rlwy.net",
    "user": "root",
    "password": "mChKvvEQzxWOKOBhPcYHltMyADqwhpWz",
    "database": "railway",
    "port": 47124,
}

# Path to your upgrades folder
BASE_DIR = r"C:\Users\gregk\Documents\GitHub\xwing-data2\data\upgrades"

# Where to write the "what's missing" report
MISSING_LOG = "missing_fields_upgrades.txt"

# ID formatting
ID_WIDTH = 4
START_ID = 727  # first ID will be "0727"


def create_ids_table(cursor):
    """
    Create the IDs table if it doesn't exist.
    Columns:
      id    - char(4) like '0001'
      name  - upgrade name
      xws   - upgrade xws
      image - upgrade image URL
    This version DOES NOT truncate the table.
    """
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS IDs (
            id    CHAR(%s) NOT NULL,
            name  VARCHAR(255),
            xws   VARCHAR(255),
            image TEXT,
            PRIMARY KEY (id)
        )
        """
        % ID_WIDTH
    )
    # IMPORTANT: no TRUNCATE here, we want to keep pilot rows


def iter_json_files(base_dir):
    """Yield full paths to all .json files directly in base_dir."""
    for fname in os.listdir(base_dir):
        if fname.lower().endswith(".json"):
            yield os.path.join(base_dir, fname)


def extract_image(upgrade):
    """
    Get an image URL for the upgrade.

    Priority:
      1. Top-level "image" key, if present and non-empty.
      2. First non-empty sides[*]["image"] we can find.
    """
    image = upgrade.get("image") or ""

    if image:
        return image

    sides = upgrade.get("sides")
    if isinstance(sides, list):
        for side in sides:
            candidate = side.get("image")
            if candidate:
                return candidate

    return ""


def main():
    # Connect to DB
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # Ensure table exists (but don't clear it)
    create_ids_table(cursor)

    missing_lines = []
    rows_to_insert = []
    counter = START_ID

    for json_path in iter_json_files(BASE_DIR):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            missing_lines.append(
                f"FILE ERROR in {json_path}: could not load JSON ({e})"
            )
            continue

        # Each file should be a list of upgrades
        if not isinstance(data, list):
            missing_lines.append(
                f"ROOT IS NOT A LIST in file: {json_path}"
            )
            continue

        for upgrade in data:
            card_id = str(counter).zfill(ID_WIDTH)
            counter += 1

            name = upgrade.get("name") or ""
            xws = upgrade.get("xws") or ""
            image = extract_image(upgrade)

            # Check missing fields
            missing = []
            if not name:
                missing.append("name")
            if not xws:
                missing.append("xws")
            if not image:
                missing.append("image")

            if missing:
                ident = xws or name or f"id={card_id}"
                missing_lines.append(
                    f"Missing {', '.join(missing)} for upgrade '{ident}' in file {json_path}"
                )

            rows_to_insert.append((card_id, name, xws, image))

    # Insert into DB (update existing IDs if they already exist)
    if rows_to_insert:
        cursor.executemany(
            """
            INSERT INTO IDs (id, name, xws, image)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                xws  = VALUES(xws),
                image = VALUES(image)
            """,
            rows_to_insert,
        )
        conn.commit()

    # Write missing-fields log
    with open(MISSING_LOG, "w", encoding="utf-8") as log_f:
        if missing_lines:
            log_f.write("\n".join(missing_lines))
        else:
            log_f.write("No missing fields detected.\n")

    cursor.close()
    conn.close()

    print(f"Inserted/updated {len(rows_to_insert)} upgrades into table 'IDs'.")
    print(f"Missing field report written to: {os.path.abspath(MISSING_LOG)}")


if __name__ == "__main__":
    main()
