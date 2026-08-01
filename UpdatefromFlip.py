import json
import zipfile
from pathlib import Path
from datetime import datetime

# ===================== CONFIG =====================
SCRIPT_DIR = Path(__file__).parent  # where this .py lives

# Where your source 50P2 JSONs live (we'll also try SCRIPT_DIR as fallback):
REV_DIR = Path(r"C:\Users\gregk\Documents\GitHub\xwa-points\revisions\50P10")

# XWD2 repo locations to modify:
PILOTS_DIR = Path(r"C:\Users\gregk\Documents\GitHub\xwing-data2\data\pilots")
UPGRADES_DIR = Path(r"C:\Users\gregk\Documents\GitHub\xwing-data2\data\upgrades")

# 7 faction file basenames -> pilot folders (case-insensitive match on filenames)
FACTION_SOURCES = {
    "firstorder.json": "first-order",
    "galacticempire.json": "galactic-empire",
    "galacticrepublic.json": "galactic-republic",
    "rebelalliance.json": "rebel-alliance",
    "resistance.json": "resistance",
    "scumandvillainy.json": "scum-and-villainy",
    "separatistalliance.json": "separatist-alliance",
}

# 8th source file for upgrades (flat dict: xws -> { "cost": int|{value:int}, "restricted": int?, ... })
UPGRADES_SOURCE_NAME = "upgrades.json"

# Pilot fields we copy from sources into ship files
PILOT_FIELDS_TO_COPY = ["cost", "loadout", "slots", "restricted"]  # NEW (restricted)
# ==================================================


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data):
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def create_backup_zip(pilots_dir: Path, upgrades_dir: Path, out_dir: Path) -> Path:
    """
    Zip all current pilot & upgrade JSONs to one archive placed in out_dir (SCRIPT_DIR).
    """
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / f"backup_pilots_{ts}.zip"
    print(f"[INFO] Creating backup archive in {out_dir} ...")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # pilots (preserve folder structure under 'data')
        for json_path in pilots_dir.rglob("*.json"):
            arcname = json_path.relative_to(pilots_dir.parent)
            zf.write(json_path, arcname)
        # upgrades
        for json_path in upgrades_dir.glob("*.json"):
            arcname = json_path.relative_to(upgrades_dir.parent)
            zf.write(json_path, arcname)
    print(f"[INFO] Backup completed: {zip_path}")
    return zip_path


def find_source_file(basename: str, primary_root: Path, fallback_root: Path | None = None) -> Path | None:
    """
    Case-insensitive recursive search for a file named `basename`.
    Searches primary_root first, then fallback_root (if provided).
    """
    target = basename.lower()
    if primary_root and primary_root.exists():
        for p in primary_root.rglob("*"):
            if p.is_file() and p.name.lower() == target:
                return p
    if fallback_root and fallback_root.exists():
        for p in fallback_root.rglob("*"):
            if p.is_file() and p.name.lower() == target:
                return p
    return None


def parse_pilot_source_any_shape(source_data: dict, allowed_fields=None) -> dict:
    """
    Returns dict: xws -> payload
    Supports:
      1) GROUPED: { "Ship Name": { "pilotxws": { cost, loadout, slots, restricted?, ... }, ... }, ... }
      2) FLAT:    { "pilotxws": { cost, loadout, slots, restricted?, ... }, ... }
    """
    out = {}

    def maybe_take(key, obj):
        if not isinstance(obj, dict):
            return
        if allowed_fields is None:
            out[key] = obj
        else:
            payload = {k: obj.get(k) for k in allowed_fields if k in obj}
            if payload:
                out[key] = payload

    keys_of_interest = allowed_fields or ["cost", "loadout", "slots", "restricted"]  # NEW (restricted in interest)

    # Detect if flat: any top-level value contains any keys of interest
    is_flat = any(
        isinstance(v, dict) and any(k in v for k in keys_of_interest)
        for v in source_data.values()
    )

    if is_flat:
        for k, v in source_data.items():
            maybe_take(k, v)
    else:
        for _group, items in source_data.items():
            if isinstance(items, dict):
                for k, v in items.items():
                    maybe_take(k, v)

    return out

def update_pilots_in_faction(faction_folder: Path, updates_by_xws: dict):
    """
    For each ship JSON in faction_folder, match pilot 'xws' and update cost/loadout/slots/restricted.
    Returns (updated_count, touched_files_set, missing_xws_set)
    """
    updated = 0
    touched_files = set()
    found_xws = set()

    for ship_json in faction_folder.glob("*.json"):
        try:
            data = load_json(ship_json)
        except Exception as e:
            print(f"[WARN] Failed to read {ship_json}: {e}")
            continue

        pilots = data.get("pilots")
        if not isinstance(pilots, list):
            continue

        file_changed = False
        for p in pilots:
            xws = p.get("xws")
            if not xws:
                continue
            src = updates_by_xws.get(xws)
            if not src:
                continue

            changed_local = False

            # cost, loadout, slots (overwrite if present in source)
            for key in ("cost", "loadout", "slots"):
                if key in src and src[key] is not None and p.get(key) != src[key]:
                    p[key] = src[key]
                    changed_local = True

            # restricted (coerce to int when possible)
            if "restricted" in src and src["restricted"] is not None:
                try:
                    new_res = int(src["restricted"])
                except (TypeError, ValueError):
                    new_res = src["restricted"]
                if p.get("restricted") != new_res:
                    p["restricted"] = new_res
                    changed_local = True

            if changed_local:
                updated += 1
                file_changed = True

            # mark seen even if nothing changed (so it won’t be flagged “missing”)
            found_xws.add(xws)

        if file_changed:
            save_json(ship_json, data)
            touched_files.add(ship_json.name)

    missing = set(updates_by_xws.keys()) - found_xws
    return updated, touched_files, missing

def update_upgrades_folder(upgrades_dir: Path, upgrades_by_xws_changes: dict):
    """
    Update upgrades using provided changes by matching 'xws'.
    upgrades_by_xws_changes: xws -> {"value": int?, "restricted": int?}
    Counts a match as FOUND even if no change was needed (prevents false 'missing').
    Returns (updated_file_count, touched_files_set, missing_xws_set)
    """
    updated_files = 0
    touched_files = set()
    seen_xws = set()   # track matches regardless of change

    if not upgrades_by_xws_changes:
        return 0, set(), set()

    # flat folder is fine; use glob here if you want
    for upg_json in upgrades_dir.glob("*.json"):
        try:
            data = load_json(upg_json)
        except Exception as e:
            print(f"[WARN] Failed to read {upg_json}: {e}")
            continue

        file_changed = False

        def apply_changes(obj: dict) -> bool:
            """
            Apply cost.value and/or restricted to a single upgrade object if its xws is in the map.
            Returns True if changed.
            """
            xws = obj.get("xws")
            if not xws:
                return False
            src = upgrades_by_xws_changes.get(xws)
            if not src:
                return False

            # mark seen even if nothing changes
            seen_xws.add(xws)

            changed_local = False

            # cost.value
            if "value" in src and src["value"] is not None:
                new_val = int(src["value"])
                if "cost" not in obj or not isinstance(obj["cost"], dict):
                    obj["cost"] = {"value": new_val}
                    changed_local = True
                elif obj["cost"].get("value") != new_val:
                    obj["cost"]["value"] = new_val
                    changed_local = True

            # restricted
            if "restricted" in src and src["restricted"] is not None:
                try:
                    new_res = int(src["restricted"])
                except (TypeError, ValueError):
                    new_res = src["restricted"]
                if obj.get("restricted") != new_res:
                    obj["restricted"] = new_res
                    changed_local = True

            return changed_local

        if isinstance(data, dict):
            if apply_changes(data):
                file_changed = True
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and apply_changes(item):
                    file_changed = True

        if file_changed:
            save_json(upg_json, data)
            updated_files += 1
            touched_files.add(upg_json.name)

    missing = set(upgrades_by_xws_changes.keys()) - seen_xws
    return updated_files, touched_files, missing


def write_missing_log(missing_report: dict, out_dir: Path):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = out_dir / f"not_found_{ts}.txt"
    lines = ["=== NOT FOUND REPORT ===\n"]

    any_pilot_missing = False
    for faction, miss in missing_report.get("pilots", {}).items():
        miss = sorted(set(miss))
        if miss:
            any_pilot_missing = True
            lines.append(f"[PILOTS] {faction} (count={len(miss)})")
            lines.extend(f"  - {m}" for m in miss)
            lines.append("")
    if not any_pilot_missing:
        lines.append("[PILOTS] No missing pilot xws.\n")

    miss_upg = sorted(set(missing_report.get("upgrades", [])))
    if miss_upg:
        lines.append(f"[UPGRADES] (count={len(miss_upg)})")
        lines.extend(f"  - {m}" for m in miss_upg)
    else:
        lines.append("[UPGRADES] No missing upgrade xws.")
    with out_path.open("w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[INFO] Wrote Not-Founds log: {out_path}")


def main():
    # 0) Backup everything first (zip saved next to this script)
    create_backup_zip(PILOTS_DIR, UPGRADES_DIR, SCRIPT_DIR)

    total_pilot_updates = 0
    total_upgrade_files_updated = 0
    total_touched_files = set()
    missing_report = {"pilots": {}, "upgrades": set()}

    # 1) Resolve and process the 7 faction pilot sources
    resolved_sources: dict[str, Path] = {}
    for base, _faction in FACTION_SOURCES.items():
        p = find_source_file(base, REV_DIR, SCRIPT_DIR)
        if p:
            resolved_sources[base] = p
        else:
            print(f"[WARN] Could not find source file: {base} under {REV_DIR} (or {SCRIPT_DIR})")

    for base, faction_folder in FACTION_SOURCES.items():
        src_path = resolved_sources.get(base)
        if not src_path:
            continue

        try:
            source_data = load_json(src_path)
        except Exception as e:
            print(f"[WARN] Couldn't parse {src_path}: {e}")
            continue

        updates_by_xws = parse_pilot_source_any_shape(source_data, allowed_fields=PILOT_FIELDS_TO_COPY)
        print(f"[INFO] Updating {faction_folder} ({len(updates_by_xws)} pilots)...")

        faction_dir = PILOTS_DIR / faction_folder
        if not faction_dir.exists():
            print(f"[WARN] Missing faction folder: {faction_dir}")
            continue

        updated, touched, missing = update_pilots_in_faction(faction_dir, updates_by_xws)
        print(f"  Updated: {updated}, Missing: {len(missing)}")
        total_pilot_updates += updated
        total_touched_files |= touched
        missing_report["pilots"][faction_folder] = missing

    # 2) Upgrades: parse flat source (xws -> {cost:int|{value:int}, restricted:int?, ...})
    upgrades_by_xws_changes = {}
    upg_path = find_source_file(UPGRADES_SOURCE_NAME, REV_DIR, SCRIPT_DIR)
    if upg_path:
        try:
            upg_src = load_json(upg_path)
        except Exception as e:
            print(f"[WARN] Couldn't parse {upg_path}: {e}")
            upg_src = None

        if isinstance(upg_src, dict):
            for xws_key, obj in upg_src.items():
                if not isinstance(obj, dict):
                    continue
                # cost may be int, float, or dict {"value": n}
                cost_val = obj.get("cost")
                if isinstance(cost_val, dict):
                    cost_val = cost_val.get("value")
                # NEW (restricted)
                restricted_val = obj.get("restricted")
                entry = {}
                if isinstance(cost_val, (int, float)):
                    entry["value"] = int(cost_val)
                if isinstance(restricted_val, (int, float)):
                    entry["restricted"] = int(restricted_val)
                elif restricted_val is not None:
                    # tolerate but don't coerce non-numeric
                    entry["restricted"] = restricted_val
                if entry:
                    upgrades_by_xws_changes[xws_key] = entry
        else:
            print(f"[WARN] {UPGRADES_SOURCE_NAME} is not a dict at {upg_path}; skipping upgrades.")
    else:
        print(f"[WARN] Could not find {UPGRADES_SOURCE_NAME} under {REV_DIR} (or {SCRIPT_DIR})")

    print(f"[INFO] Updating upgrades ({len(upgrades_by_xws_changes)} entries)...")
    if upgrades_by_xws_changes:
        upg_files_updated, upg_touched, upg_missing = update_upgrades_folder(UPGRADES_DIR, upgrades_by_xws_changes)
        print(f"  Updated upgrade files: {upg_files_updated}, Missing: {len(upg_missing)}")
        total_upgrade_files_updated += upg_files_updated
        total_touched_files |= upg_touched
        missing_report["upgrades"] = upg_missing
    else:
        print("  No upgrades entries to apply. Skipping upgrades pass.")

    # 3) Summary + not-found log next to the script
    print("\n==== SUMMARY ====")
    print(f"Total pilot entries updated: {total_pilot_updates}")
    print(f"Upgrade files updated: {total_upgrade_files_updated}")
    print(f"Files touched: {len(total_touched_files)}")
    write_missing_log(missing_report, SCRIPT_DIR)
    print("[DONE]")


if __name__ == "__main__":
    main()
