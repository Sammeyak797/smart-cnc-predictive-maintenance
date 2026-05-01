"""
simulation_engine.py

Generates sensor readings that match the actual training data distribution.

CRITICAL FIX: The previous version had per-duty-type ranges that were
completely wrong compared to the real dataset. The UCI Predictive Maintenance
dataset shows L/M/H types share almost identical sensor ranges — the type
is a machine grade label, not a physical operating differentiator.

Using out-of-distribution values (e.g. rpm 2000-3000 for H type when the
dataset max for H is 2636 and mean is only 1538) caused the model to receive
inputs it had never seen in training, producing unreliable predictions.

All ranges below are derived directly from the dataset analysis:
    Air temp:     295.3 – 304.5 K  (mean 300.0)
    Process temp: 305.7 – 313.8 K  (mean 310.0)
    Temp rise:      7.6 – 12.1 K   (mean 10.0)
    RPM:           1168 – 2886     (mean 1538)
    Torque:         3.8 – 76.6 Nm  (mean 40.0)
    Tool wear:        0 – 253 min
"""

import random
from database.db import machines_collection

# ── Dataset-accurate sensor ranges ───────────────────────────────────────────
# All three types share the same overall sensor envelope in the real data.
# Type-specific sub-ranges are used only for wear increment speed and
# a slight RPM/torque bias to reflect duty intensity — NOT hard boundaries.

# Shared ranges (all types) — derived from dataset min/max
SENSOR_RANGES = {
    "air_temp":   (295.3, 304.5),   # K — dataset: 295.3–304.5
    "temp_rise":  (7.6,   12.1),    # K — process = air + rise; dataset: 7.6–12.1
    "rpm":        (1168,  2886),    # RPM — dataset: 1168–2886
    "torque":     (3.8,   76.6),    # Nm  — dataset: 3.8–76.6
}

# Per-duty wear increment — heavier duty = faster wear progression
# These are intentionally small to create a gradual, realistic wear curve
DUTY_CONFIG = {
    "L": {
        "wear_increment": (1, 3),
        # Light duty: biased toward lower RPM and torque
        "rpm_bias":    (1168, 2000),
        "torque_bias": (3.8,  50.0),
    },
    "M": {
        "wear_increment": (2, 5),
        # Medium duty: mid-range RPM and torque
        "rpm_bias":    (1300, 2400),
        "torque_bias": (15.0, 65.0),
    },
    "H": {
        "wear_increment": (3, 7),
        # Heavy duty: biased toward higher RPM and torque
        "rpm_bias":    (1500, 2886),
        "torque_bias": (30.0, 76.6),
    },
}

DEFAULT_DUTY  = "M"
MAX_TOOL_WEAR = 253   # dataset max


def generate_sensor_data(machine_id: str) -> dict | None:
    """
    Generate sensor readings within the real training data distribution.
    Persists tool wear in MongoDB so state survives restarts.
    """
    machine = machines_collection.find_one({"machine_id": machine_id})
    if not machine:
        return None

    duty = machine.get("duty_type", DEFAULT_DUTY)
    if duty not in DUTY_CONFIG:
        duty = DEFAULT_DUTY

    cfg = DUTY_CONFIG[duty]

    # ── Tool wear — persisted in MongoDB ─────────────────────────────────
    current_wear   = machine.get("tool_wear", random.randint(0, 50))
    wear_increment = random.randint(*cfg["wear_increment"])
    new_wear       = min(current_wear + wear_increment, MAX_TOOL_WEAR)

    machines_collection.update_one(
        {"machine_id": machine_id},
        {"$set": {"tool_wear": new_wear}}
    )

    # ── Sensor readings — within dataset distribution ─────────────────────
    # Use duty-biased RPM/torque ranges so heavier machines show higher stress,
    # but stay within the global sensor envelope the model was trained on.
    rpm    = round(random.uniform(*cfg["rpm_bias"]))
    torque = round(random.uniform(*cfg["torque_bias"]), 1)

    # Temperature: process_temp = air_temp + temp_rise (always positive delta)
    air_temp     = round(random.uniform(*SENSOR_RANGES["air_temp"]), 1)
    temp_rise    = round(random.uniform(*SENSOR_RANGES["temp_rise"]), 1)
    process_temp = round(air_temp + temp_rise, 1)

    return {
        "type":         duty,
        "air_temp":     air_temp,
        "process_temp": process_temp,
        "rpm":          rpm,
        "torque":       torque,
        "tool_wear":    new_wear,
    }