import joblib
import os
import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

model_path           = os.path.join(BASE_DIR, "model", "model.pkl")
type_encoder_path    = os.path.join(BASE_DIR, "model", "le_type.pkl")
failure_encoder_path = os.path.join(BASE_DIR, "model", "le_failure.pkl")

model = None
le_type = None
le_failure = None

if os.path.exists(model_path):
    try:
        model      = joblib.load(model_path)
        le_type    = joblib.load(type_encoder_path)
        le_failure = joblib.load(failure_encoder_path)
        logger.info("ML models loaded successfully.")
    except Exception as e:
        logger.warning(f"Model load failed: {e}")
else:
    logger.warning("Model files not found → running without ML model")

# Must match train.py FEATURE_COLUMNS exactly — including engineered features
FEATURE_COLUMNS = [
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
    "temp_diff",    # engineered: process_temp - air_temp
    "power",        # engineered: rpm × torque
    "wear_torque",  # engineered: tool_wear × torque
]

VALID_TYPES = {"L", "M", "H"}


def predict_failure(data: dict) -> dict:
    if model is None or le_type is None or le_failure is None:
        return {
            "failure_type": "Unknown",
            "confidence": 0.0
        }
    """
    Predict machine failure type and confidence from sensor readings.

    Args:
        data: {
            "type":         str   — machine type "L", "M", or "H"
            "air_temp":     float — air temperature in Kelvin
            "process_temp": float — process temperature in Kelvin
            "rpm":          float — rotational speed in RPM
            "torque":       float — torque in Nm
            "tool_wear":    float — tool wear in minutes
        }

    Returns:
        {"failure_type": str, "confidence": float (0–100)}
    """
    # Validate required keys
    required = {"type", "air_temp", "process_temp", "rpm", "torque", "tool_wear"}
    missing  = required - data.keys()
    if missing:
        raise ValueError(f"Missing required fields: {missing}")

    machine_type = str(data["type"]).strip().upper()
    if machine_type not in VALID_TYPES:
        raise ValueError(f"Invalid machine type '{data['type']}'. Must be one of {VALID_TYPES}.")

    numeric_fields = ["air_temp", "process_temp", "rpm", "torque", "tool_wear"]
    for field in numeric_fields:
        try:
            float(data[field])
        except (TypeError, ValueError):
            raise ValueError(f"Field '{field}' must be numeric, got: {data[field]!r}")

    air_temp     = float(data["air_temp"])
    process_temp = float(data["process_temp"])
    rpm          = float(data["rpm"])
    torque       = float(data["torque"])
    tool_wear    = float(data["tool_wear"])

    if air_temp <= 0:
        raise ValueError(f"'air_temp' must be positive Kelvin, got {air_temp}")
    if process_temp <= air_temp:
        raise ValueError(f"'process_temp' ({process_temp}) must be greater than 'air_temp' ({air_temp})")
    if rpm < 0:
        raise ValueError(f"'rpm' must be non-negative, got {rpm}")
    if torque < 0:
        raise ValueError(f"'torque' must be non-negative, got {torque}")
    if tool_wear < 0:
        raise ValueError(f"'tool_wear' must be non-negative, got {tool_wear}")

    try:
        encoded_type = le_type.transform([machine_type])[0]
    except ValueError:
        raise ValueError(
            f"Machine type '{machine_type}' not recognised by encoder. "
            f"Encoder knows: {list(le_type.classes_)}"
        )

    # Compute engineered features — must match train.py exactly
    temp_diff   = process_temp - air_temp
    power       = rpm * torque
    wear_torque = tool_wear * torque

    row = {
        "Type":                        encoded_type,
        "Air temperature [K]":         air_temp,
        "Process temperature [K]":     process_temp,
        "Rotational speed [rpm]":      rpm,
        "Torque [Nm]":                 torque,
        "Tool wear [min]":             tool_wear,
        "temp_diff":                   temp_diff,
        "power":                       power,
        "wear_torque":                 wear_torque,
    }
    input_df = pd.DataFrame([row], columns=FEATURE_COLUMNS)

    try:
        prediction    = model.predict(input_df)[0]
        probabilities = model.predict_proba(input_df)[0]
    except Exception as e:
        logger.exception("Model inference failed.")
        raise RuntimeError(f"Prediction failed: {e}") from e

    try:
        failure_label = le_failure.inverse_transform([prediction])[0]
    except ValueError:
        logger.error("Predicted class %s not in failure encoder.", prediction)
        failure_label = "Unknown"

    confidence = float(np.max(probabilities))

    logger.debug(
        "Prediction: %s (%.2f%%) | type=%s rpm=%.0f torque=%.1f wear=%.0f temp_diff=%.2f",
        failure_label, confidence * 100, machine_type, rpm, torque, tool_wear, temp_diff,
    )

    return {
        "failure_type": failure_label,
        "confidence":   round(confidence * 100, 2),
    }