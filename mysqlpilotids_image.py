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

# Path to your pilots folder
BASE_DIR = r"C:\Users\gregk\Documents\GitHub\xwing-data2\data\pilots"

# Where to write the "what's missing" report
MISSING_LOG = "missing_fields.txt"

# How many digits to pad the ID with (0001, 0002, ...)
ID_WIDTH = 4


def create_ids_table(cursor):
    """
    Create the IDs table if it doesn't exist.
    Columns:
      id    - char(4) like '0001'
      name  - pilot name
      xws   - pilot xws
      image - pilot image URL
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

    # Optional: clear the table every time you run this script.
    # Comment this out if you DON'T want to wipe existing data.
    cursor.execute("TRUNCATE TABLE IDs")


def iter_json_files(base_dir):
    """Yield full paths to all .json files under base_dir (recursively)."""
    for dirpath, _, filenames in os.walk(base_dir):
        for fname in filenames:
            if fname.lower().endswith(".json"):
                yield os.path.join(dirpath, fname)


def main():
    # Connect to DB
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # Create (and optionally truncate) table
    create_ids_table(cursor)

    # For logging missing fields
    missing_lines = []

    rows_to_insert = []
    counter = 1

    for json_path in iter_json_files(BASE_DIR):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            missing_lines.append(
                f"FILE ERROR in {json_path}: could not load JSON ({e})"
            )
            continue

        pilots = data.get("pilots")
        if not isinstance(pilots, list):
            missing_lines.append(
                f"NO PILOTS KEY or not a list in file: {json_path}"
            )
            continue

        for pilot in pilots:
            # Generate ID like 0001, 0002, ...
            card_id = str(counter).zfill(ID_WIDTH)
            counter += 1

            name = pilot.get("name") or ""
            xws = pilot.get("xws") or ""
            image = pilot.get("image") or ""

            # Check missing fields
            missing = []
            if not name:
                missing.append("name")
            if not xws:
                missing.append("xws")
            if not image:
                missing.append("image")

            if missing:
                # Use xws or name or fallback to card_id for identification
                ident = xws or name or f"id={card_id}"
                missing_lines.append(
                    f"Missing {', '.join(missing)} for pilot '{ident}' in file {json_path}"
                )

            rows_to_insert.append((card_id, name, xws, image))

    # Insert into DB
    if rows_to_insert:
        cursor.executemany(
            "INSERT INTO IDs (id, name, xws, image) VALUES (%s, %s, %s, %s)",
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

    print(f"Inserted {len(rows_to_insert)} pilots into table 'IDs'.")
    print(f"Missing field report written to: {os.path.abspath(MISSING_LOG)}")


if __name__ == "__main__":
    main()
