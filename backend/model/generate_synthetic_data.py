"""
generate_synthetic_data.py

Generates physics-based synthetic failure samples to fix the severe class
imbalance in predictive_maintenance.csv.

The original dataset has:
    No Failure              9652  (96.5%)
    Heat Dissipation Failure 112
    Power Failure             95
    Overstrain Failure        78
    Tool Wear Failure         45
    Random Failures           18   ← model has almost never seen this

Strategy: for each failure type, synthesize samples whose sensor values
match the physical boundaries measured from real data (not random noise).
Target: 600 samples per minority class → balanced enough for a good model.

Usage:
    python generate_synthetic_data.py
    → writes data/predictive_maintenance_augmented.csv
"""

import os
import numpy as np
import pandas as pd

BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR  = os.path.join(BASE_DIR, "data")
INPUT_CSV = os.path.join(DATA_DIR, "predictive_maintenance.csv")
OUTPUT_CSV = os.path.join(DATA_DIR, "predictive_maintenance_augmented.csv")

TARGET_PER_CLASS = 600   # how many total samples we want per minority class
RANDOM_SEED      = 42
rng = np.random.default_rng(RANDOM_SEED)

# ── Physics-based parameter ranges derived from the real dataset ──────────────
# Each dict describes the sensor envelope that produces that failure type.
# These are NOT guesses — they come from analyzing the real data above.
FAILURE_PROFILES = {

    "Heat Dissipation Failure": {
        # Distinctive: low temp_diff (8.2 K avg vs 10.0 for No Failure)
        # Low RPM (1338 avg), high torque (52.8 Nm avg)
        # Air temp slightly elevated (302.6 K avg)
        "air_temp":     (300.8, 303.7),
        "process_temp_above_air": (7.6, 8.6),   # process = air + this delta
        "rpm":          (1212, 1379),
        "torque":       (41.6, 67.8),
        "tool_wear":    (2,    229),
        "type_weights": {"L": 0.66, "M": 0.27, "H": 0.07},
    },

    "Power Failure": {
        # Distinctive: wide RPM range (1200–2886), no specific temp signature
        # Can happen at any tool wear, any torque
        "air_temp":     (295.7, 304.0),
        "process_temp_above_air": (7.6, 11.9),
        "rpm":          (1200, 2886),
        "torque":       (3.8,  76.6),
        "tool_wear":    (0,    234),
        "type_weights": {"L": 0.62, "M": 0.33, "H": 0.05},
    },

    "Overstrain Failure": {
        # Distinctive: LOW RPM (1181–1515), HIGH torque (46.3–68.2 Nm)
        # HIGH tool wear (177–251 min) — almost exclusively L type
        "air_temp":     (295.6, 304.0),
        "process_temp_above_air": (8.4, 12.0),
        "rpm":          (1181, 1515),
        "torque":       (46.3, 68.2),
        "tool_wear":    (177,  251),
        "type_weights": {"L": 0.94, "M": 0.05, "H": 0.01},
    },

    "Tool Wear Failure": {
        # Distinctive: very HIGH tool wear (198–253 min) — the clearest signal
        # Mid RPM range, moderate torque
        "air_temp":     (296.9, 304.4),
        "process_temp_above_air": (7.8, 11.5),
        "rpm":          (1323, 2271),
        "torque":       (16.2, 62.4),
        "tool_wear":    (198,  253),
        "type_weights": {"L": 0.56, "M": 0.31, "H": 0.13},
    },

    "Random Failures": {
        # No strong sensor signature — truly random
        # Keep within overall dataset ranges but add small perturbations
        "air_temp":     (297.0, 302.9),
        "process_temp_above_air": (8.9, 11.5),
        "rpm":          (1306, 1687),
        "torque":       (27.7, 61.2),
        "tool_wear":    (2,    215),
        "type_weights": {"L": 0.67, "M": 0.11, "H": 0.22},
    },
}

# UDI counter — start after the real dataset's 10,000 rows
UDI_START = 10001

# Product ID prefixes per type (mirrors the real dataset convention)
PRODUCT_PREFIXES = {"L": "L", "M": "M", "H": "H"}


def sample_type(weights: dict, n: int) -> list:
    types = list(weights.keys())
    probs = list(weights.values())
    return rng.choice(types, size=n, p=probs).tolist()


def generate_samples(failure_type: str, profile: dict, n: int, udi_start: int) -> pd.DataFrame:
    """Generate n synthetic rows for one failure type."""

    types = sample_type(profile["type_weights"], n)

    air_temps = rng.uniform(*profile["air_temp"], size=n)
    deltas    = rng.uniform(*profile["process_temp_above_air"], size=n)
    proc_temps = air_temps + deltas

    rpms      = rng.uniform(*profile["rpm"],      size=n).astype(int)
    torques   = rng.uniform(*profile["torque"],   size=n).round(1)
    tool_wear = rng.uniform(*profile["tool_wear"], size=n).astype(int)

    udis       = list(range(udi_start, udi_start + n))
    product_ids = [f"{PRODUCT_PREFIXES[t]}{str(udi_start + i).zfill(5)}"
                   for i, t in enumerate(types)]

    df = pd.DataFrame({
        "UDI":                          udis,
        "Product ID":                   product_ids,
        "Type":                         types,
        "Air temperature [K]":          air_temps.round(1),
        "Process temperature [K]":      proc_temps.round(1),
        "Rotational speed [rpm]":       rpms,
        "Torque [Nm]":                  torques,
        "Tool wear [min]":              tool_wear,
        "Target":                       1,           # all synthetic rows are failures
        "Failure Type":                 failure_type,
    })

    return df


def main():
    print("Loading real dataset…")
    real_df = pd.read_csv(INPUT_CSV)
    print(f"  Real rows: {len(real_df)}")
    print(f"  Class distribution:\n{real_df['Failure Type'].value_counts().to_string()}")

    synthetic_frames = []
    udi_counter = UDI_START

    for failure_type, profile in FAILURE_PROFILES.items():
        existing_count = len(real_df[real_df["Failure Type"] == failure_type])
        needed         = max(0, TARGET_PER_CLASS - existing_count)

        if needed == 0:
            print(f"  {failure_type}: already has {existing_count} samples — skipping")
            continue

        print(f"  Generating {needed} synthetic samples for '{failure_type}' "
              f"(existing: {existing_count} → target: {TARGET_PER_CLASS})…")

        chunk = generate_samples(failure_type, profile, needed, udi_counter)
        synthetic_frames.append(chunk)
        udi_counter += needed

    if not synthetic_frames:
        print("No synthetic samples needed.")
        return

    synthetic_df = pd.concat(synthetic_frames, ignore_index=True)
    print(f"\nGenerated {len(synthetic_df)} synthetic rows total.")

    augmented_df = pd.concat([real_df, synthetic_df], ignore_index=True)

    print(f"\nAugmented dataset ({len(augmented_df)} rows) class distribution:")
    print(augmented_df["Failure Type"].value_counts().to_string())

    os.makedirs(DATA_DIR, exist_ok=True)
    augmented_df.to_csv(OUTPUT_CSV, index=False)
    print(f"\nSaved → {OUTPUT_CSV}")


if __name__ == "__main__":
    main()