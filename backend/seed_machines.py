"""
seed_machines.py — Seed the machines collection with initial CNC machine data.

Usage:
    python seed_machines.py           # interactive confirmation prompt
    python seed_machines.py --force   # skip prompt (for CI/CD pipelines)
    python seed_machines.py --dry-run # preview what would be inserted, no writes
"""

import sys
from database.db import machines_collection

# ── Machine definitions ───────────────────────────────────────────────────────
# tool_wear initialised to 0 — simulation_engine.py will increment this
# progressively and persist updates back to this field.
MACHINES = [
    {
        "machine_id":   "CNC-01",
        "duty_type":    "L",
        "description":  "Light Duty CNC Machine",
        "tool_wear":    0,
    },
    {
        "machine_id":   "CNC-02",
        "duty_type":    "M",
        "description":  "Medium Duty CNC Machine",
        "tool_wear":    0,
    },
    {
        "machine_id":   "CNC-03",
        "duty_type":    "H",
        "description":  "Heavy Duty CNC Machine",
        "tool_wear":    0,
    },
]


def seed(force: bool = False, dry_run: bool = False) -> None:
    # ── Dry run — preview only, no writes ────────────────────────────────
    if dry_run:
        print("\n[DRY RUN] The following machines would be seeded:\n")
        for m in MACHINES:
            print(f"  • {m['machine_id']} — {m['description']} (duty: {m['duty_type']})")
        existing = machines_collection.count_documents({})
        print(f"\n[DRY RUN] {existing} existing document(s) would be deleted.")
        print("[DRY RUN] No changes were made.\n")
        return

    # ── BUG FIX #1: confirmation prompt before wiping the collection ─────
    # Previously delete_many({}) ran silently with no warning, destroying
    # all persisted tool_wear state on every accidental run.
    existing_count = machines_collection.count_documents({})

    if existing_count > 0 and not force:
        print(f"\n⚠️  WARNING: This will delete {existing_count} existing machine record(s).")
        print("   This includes all persisted tool_wear state from running simulations.")
        answer = input("   Type 'yes' to continue, anything else to abort: ").strip().lower()
        if answer != "yes":
            print("Seeding aborted. No changes were made.")
            sys.exit(0)

    # ── BUG FIX #2: wrap in try/except to catch partial insert failures ──
    try:
        # Delete existing records
        delete_result = machines_collection.delete_many({})
        print(f"Deleted {delete_result.deleted_count} existing machine record(s).")

        # Insert new records
        insert_result = machines_collection.insert_many(MACHINES)
        inserted = len(insert_result.inserted_ids)

        if inserted != len(MACHINES):
            # Partial insert — surface clearly rather than silently continuing
            print(f"⚠️  WARNING: Expected {len(MACHINES)} inserts, got {inserted}.")
        else:
            print(f"✅ {inserted} machine(s) seeded successfully!")
            for m in MACHINES:
                print(f"   • {m['machine_id']} — {m['description']}")

    except Exception as e:
        # BUG FIX #2: report the error and exit with a non-zero code so
        # CI/CD pipelines and scripts know the seed step failed
        print(f"❌ Seeding failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    force   = "--force"   in sys.argv
    dry_run = "--dry-run" in sys.argv
    seed(force=force, dry_run=dry_run)