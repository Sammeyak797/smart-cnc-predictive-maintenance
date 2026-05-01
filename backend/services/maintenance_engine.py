"""
maintenance_engine.py

Real RUL calculation using all sensor inputs that contribute to machine
degradation, derived from the dataset's actual operating ranges:

    Tool wear [min]:          0  – 253   (primary wear indicator)
    Torque [Nm]:             20  –  80   (mechanical stress)
    RPM:                   1000 – 3000   (speed factor)
    Process temperature [K]: 303 – 332   (thermal stress)
"""

# ── Dataset-derived operating limits ─────────────────────────────────────────
MAX_TOOL_WEAR    = 253     # dataset max — tool must be replaced at this point
MAX_TORQUE       = 80.0    # dataset max Nm
MAX_RPM          = 3000.0  # dataset max RPM
MAX_PROCESS_TEMP = 332.0   # dataset max K
BASE_TEMP        = 295.0   # dataset min air temp K (baseline / ambient)

# ── RUL output range ──────────────────────────────────────────────────────────
MAX_RUL = 100   # percentage-style scale (0 = replace now, 100 = brand new)

# ── Confidence thresholds ─────────────────────────────────────────────────────
HIGH_CONFIDENCE   = 70   # % — treat failure prediction as reliable
MEDIUM_CONFIDENCE = 40   # % — treat as a warning, not an emergency

# ── Factor weights (must sum to 1.0) ─────────────────────────────────────────
# Tool wear is the primary degradation driver in the dataset.
# Torque causes mechanical fatigue, temperature causes thermal stress,
# and RPM contributes to bearing/spindle wear.
WEIGHTS = {
    "tool_wear":    0.55,
    "torque":       0.20,
    "process_temp": 0.15,
    "rpm":          0.10,
}


def calculate_rul(
    tool_wear:    float,
    torque:       float = 0.0,
    rpm:          float = 0.0,
    process_temp: float = 0.0,
) -> int:
    """
    Calculate Remaining Useful Life (0–100) using a weighted multi-factor
    degradation model.

    Each factor is normalised to [0, 1] (0 = brand new, 1 = at limit),
    then combined using WEIGHTS. The result is inverted so that:
        100 = fully healthy / just replaced
          0 = end of life / replace immediately

    Args:
        tool_wear:    current tool wear in minutes
        torque:       current torque in Nm
        rpm:          current rotational speed in RPM
        process_temp: current process temperature in Kelvin

    Returns:
        RUL as an integer in [0, 100]
    """
    # ── Clamp inputs to valid ranges ──────────────────────────────────────
    tool_wear    = max(0.0, float(tool_wear    or 0))
    torque       = max(0.0, float(torque       or 0))
    rpm          = max(0.0, float(rpm          or 0))
    process_temp = max(0.0, float(process_temp or 0))

    # ── Normalise each factor: 0.0 (new) → 1.0 (at limit) ────────────────
    wear_ratio = min(tool_wear    / MAX_TOOL_WEAR,    1.0)
    torq_ratio = min(torque       / MAX_TORQUE,       1.0)
    rpm_ratio  = min(rpm          / MAX_RPM,          1.0)

    # Temperature: only excess above baseline contributes to degradation
    temp_excess = max(0.0, process_temp - BASE_TEMP)
    temp_range  = MAX_PROCESS_TEMP - BASE_TEMP          # 37 K of headroom
    temp_ratio  = min(temp_excess / temp_range,  1.0)

    # ── Weighted degradation score (0 = healthy, 1 = end-of-life) ────────
    degradation = (
        WEIGHTS["tool_wear"]    * wear_ratio +
        WEIGHTS["torque"]       * torq_ratio +
        WEIGHTS["process_temp"] * temp_ratio +
        WEIGHTS["rpm"]          * rpm_ratio
    )

    # ── Convert to RUL: invert, scale, clamp ─────────────────────────────
    rul = int(round((1.0 - degradation) * MAX_RUL))
    return max(0, min(MAX_RUL, rul))


def get_rul_status(rul: int) -> dict:
    """
    Translate a numeric RUL into a human-readable status label and colour
    hint used by the frontend KPI card.

    Returns:
        { "label": str, "color": "red" | "amber" | "green" }
    """
    if rul <= 15:
        return {"label": "Critical — Replace Now",  "color": "red"}
    if rul <= 35:
        return {"label": "Low — Schedule Soon",     "color": "amber"}
    if rul <= 60:
        return {"label": "Moderate — Monitor",      "color": "amber"}
    return    {"label": "Healthy",                  "color": "green"}


def determine_maintenance(
    failure_type: str,
    confidence:   float,
    rul:          int,
) -> dict:
    """
    Generate a structured maintenance recommendation.

    Priority values (consistent across the full codebase):
        URGENT        — immediate corrective action required
        SCHEDULE_SOON — plan maintenance within days
        OK            — routine monitoring, no action needed
    """

    # ── Active failure detected ───────────────────────────────────────────
    if failure_type != "No Failure":

        if confidence >= HIGH_CONFIDENCE:
            return {
                "priority":                 "URGENT",
                "maintenance_type":         "Corrective Maintenance",
                "deadline_days":            0,
                "action":                   "Inspect machine immediately and repair faulty component",
                "estimated_downtime_hours": 4,
            }

        if confidence >= MEDIUM_CONFIDENCE:
            return {
                "priority":                 "SCHEDULE_SOON",
                "maintenance_type":         "Preventive Maintenance",
                "deadline_days":            1,
                "action":                   (
                    f"Investigate possible {failure_type} — "
                    f"confidence {confidence:.1f}%. Monitor closely."
                ),
                "estimated_downtime_hours": 2,
            }

        return {
            "priority":                 "OK",
            "maintenance_type":         "Monitoring",
            "deadline_days":            7,
            "action":                   (
                f"Low-confidence {failure_type} signal "
                f"({confidence:.1f}%). Continue monitoring."
            ),
            "estimated_downtime_hours": 0,
        }

    # ── No failure — use RUL to drive maintenance scheduling ─────────────
    if rul <= 15:
        return {
            "priority":                 "URGENT",
            "maintenance_type":         "Preventive Replacement",
            "deadline_days":            0,
            "action":                   "Replace worn tool immediately — RUL critically low",
            "estimated_downtime_hours": 2,
        }

    if rul <= 35:
        return {
            "priority":                 "SCHEDULE_SOON",
            "maintenance_type":         "Preventive Maintenance",
            "deadline_days":            2,
            "action":                   "Replace worn tool and inspect mechanical alignment",
            "estimated_downtime_hours": 2,
        }

    if rul <= 60:
        return {
            "priority":                 "SCHEDULE_SOON",
            "maintenance_type":         "Routine Preventive Check",
            "deadline_days":            5,
            "action":                   "Inspect cooling and lubrication systems",
            "estimated_downtime_hours": 1,
        }

    return {
        "priority":                 "OK",
        "maintenance_type":         "Routine Monitoring",
        "deadline_days":            14,
        "action":                   "Continue normal monitoring",
        "estimated_downtime_hours": 0,
    }