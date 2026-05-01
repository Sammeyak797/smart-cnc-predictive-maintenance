"""
failure_analysis_engine.py

Thresholds are derived from the actual dataset sensor ranges:
    Process temp:  305.7 – 313.8 K  (mean 310.0)
    Air temp:      295.3 – 304.5 K  (mean 300.0)
    Temp diff:       7.6 – 12.1 K   (mean 10.0)
    RPM:            1168 – 2886     (mean 1538)
    Torque:          3.8 – 76.6 Nm  (mean 40.0)
    Tool wear:         0 – 253 min

CRITICAL FIX: The previous version used thresholds like process_temp > 315
and process_temp > 325 which are IMPOSSIBLE — the dataset max is 313.8 K.
Those conditions could never trigger, causing every analysis to return
"Normal operation" regardless of what the ML model predicted.

All thresholds below are percentile-based on the real data.
"""


def analyze_failure(sensor_data: dict, failure_type: str) -> dict:
    """
    Determine possible cause and recommendation based on sensor readings
    and the ML model's predicted failure type.

    Returns:
        dict with keys: possible_cause, recommendation, severity_note
    """
    air_temp     = float(sensor_data.get("air_temp",     0) or 0)
    process_temp = float(sensor_data.get("process_temp", 0) or 0)
    rpm          = float(sensor_data.get("rpm",          0) or 0)
    torque       = float(sensor_data.get("torque",       0) or 0)
    tool_wear    = float(sensor_data.get("tool_wear",    0) or 0)

    # Temp diff — key discriminator for Heat Dissipation Failure
    # Dataset: mean 10.0 K, Heat Dissipation mean 8.23 K (distinctively low)
    temp_diff = process_temp - air_temp

    cause          = "Normal operation"
    recommendation = "Continue routine monitoring"
    severity_note  = ""

    if failure_type == "Heat Dissipation Failure":
        # Dataset: Heat Dissipation temp_diff range 7.6–8.6 K (mean 8.23)
        # Normal range: 7.6–12.1 K (mean 10.0)
        # LOW temp_diff = poor heat dissipation = coolant/airflow problem
        # FIX: previous thresholds (> 315 K, > 325 K) were impossible —
        # dataset max process_temp is 313.8 K so those never triggered.
        if temp_diff <= 8.0:
            cause          = "Critically low temperature differential — severe cooling failure"
            recommendation = "Stop machine. Inspect coolant system, heat exchangers, and fans."
            severity_note  = "Critical"
        elif temp_diff <= 8.6:
            cause          = "Low temperature differential — inadequate heat dissipation"
            recommendation = "Inspect cooling system, check coolant flow rate and airflow paths"
            severity_note  = "High"
        else:
            # Failure predicted but temp_diff looks normal — trust the model
            cause          = "Thermal anomaly detected by model — sensor readings near boundary"
            recommendation = "Inspect heat dissipation system and verify coolant levels"
            severity_note  = "Moderate"

    elif failure_type == "Overstrain Failure":
        # Dataset: Overstrain RPM 1181–1515 (low), Torque 46.3–68.2 Nm (high)
        # Tool wear 177–251 (high) — almost always L type
        if torque >= 60.0 and rpm <= 1400:
            cause          = "High torque at low RPM causing mechanical overload"
            recommendation = "Reduce load immediately. Inspect bearings, couplings, and drive components."
            severity_note  = "Critical"
        elif torque >= 50.0:
            cause          = "Torque in overstrain range with elevated tool wear"
            recommendation = "Reduce workload, inspect mechanical alignment and fasteners"
            severity_note  = "High"
        elif tool_wear >= 177:
            cause          = "High tool wear contributing to mechanical strain"
            recommendation = "Schedule tool replacement and inspect drive train"
            severity_note  = "Moderate"
        else:
            cause          = "Mechanical stress anomaly detected"
            recommendation = "Inspect drive train, couplings, and mechanical fasteners"
            severity_note  = "Moderate"

    elif failure_type == "Tool Wear Failure":
        # Dataset: Tool Wear Failure tool_wear 198–253 min (mean 217)
        if tool_wear >= 230:
            cause          = "Tool wear at critical level — end of usable life"
            recommendation = "Replace cutting tool immediately before next operation"
            severity_note  = "Critical"
        elif tool_wear >= 198:
            cause          = "Tool wear in failure threshold range"
            recommendation = "Schedule tool replacement within the next shift"
            severity_note  = "High"
        elif tool_wear >= 150:
            cause          = "Accelerated tool wear approaching failure threshold"
            recommendation = "Inspect cutting parameters, coolant application, and tool geometry"
            severity_note  = "Moderate"
        else:
            # Model predicted failure but wear looks low — early-onset failure
            cause          = "Premature tool wear anomaly detected"
            recommendation = "Inspect tool material compatibility and cutting conditions"
            severity_note  = "Moderate"

    elif failure_type == "Power Failure":
        # Dataset: Power Failure RPM 1200–2886 (wide range — electrical issue)
        # No strong thermal or wear signature — electrical/motor problem
        if rpm < 1300:
            cause          = "RPM drop below normal range — power supply or motor instability"
            recommendation = "Halt operations. Inspect motor, drive inverter, and power supply."
            severity_note  = "Critical"
        elif torque < 10.0:
            cause          = "Very low torque detected — possible power delivery failure"
            recommendation = "Check electrical connections, fuses, and drive controller"
            severity_note  = "High"
        else:
            # Power failure at normal RPM/torque — electrical anomaly
            cause          = "Electrical anomaly detected — RPM and torque appear nominal"
            recommendation = "Inspect power supply stability, fuses, and control board"
            severity_note  = "Moderate"

    elif failure_type == "Random Failures":
        # Dataset: No distinctive sensor signature — truly random
        cause          = "Intermittent fault — no single dominant sensor anomaly"
        recommendation = "Run full diagnostic cycle. Inspect all subsystems for intermittent faults."
        severity_note  = "High"

    elif failure_type != "No Failure":
        # Catch-all for any future failure types
        cause          = f"Anomalous conditions detected consistent with {failure_type}"
        recommendation = "Consult maintenance manual and run full system diagnostic"
        severity_note  = "Unknown"

    return {
        "possible_cause":  cause,
        "recommendation":  recommendation,
        "severity_note":   severity_note,
    }