from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from model.predict import predict_failure
from database.db import predictions_collection, maintenance_collection
from services.maintenance_engine import calculate_rul, determine_maintenance
from datetime import datetime, timezone, timedelta

predict_bp = Blueprint("predict", __name__)

# ── Required sensor fields with expected numeric types ────────────────────────
SENSOR_FIELDS = ["type", "air_temp", "process_temp", "rpm", "torque", "tool_wear"]

# Numeric fields that must be castable to float for the ML model
NUMERIC_SENSOR_FIELDS = ["air_temp", "process_temp", "rpm", "torque", "tool_wear"]


# ── Helper ────────────────────────────────────────────────────────────────────
def to_iso(dt: datetime) -> str:
    """Serialize datetime to ISO 8601 string — prevents JSON TypeError."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


# ── Route ─────────────────────────────────────────────────────────────────────
@predict_bp.route("/", methods=["POST"])
@token_required
def predict():
    data = request.get_json(silent=True)

    # ── BUG FIX #1: validate all inputs before touching the ML model ──────
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    machine_id = data.get("machine_id", "").strip()
    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400

    # Check all sensor fields are present
    missing = [f for f in SENSOR_FIELDS if data.get(f) is None]
    if missing:
        return jsonify({
            "error": f"Missing sensor fields: {', '.join(missing)}"
        }), 400

    # BUG FIX #2: validate numeric fields are actually numeric before
    # passing to calculate_rul / predict_failure — None or a string would
    # cause a TypeError deep inside the ML model with no useful error message
    type_errors = []
    for field in NUMERIC_SENSOR_FIELDS:
        try:
            float(data[field])
        except (TypeError, ValueError):
            type_errors.append(field)

    if type_errors:
        return jsonify({
            "error": f"Sensor fields must be numeric: {', '.join(type_errors)}"
        }), 400

    try:
        sensor_data = {
            "type":         data["type"],
            "air_temp":     float(data["air_temp"]),
            "process_temp": float(data["process_temp"]),
            "rpm":          float(data["rpm"]),
            "torque":       float(data["torque"]),
            "tool_wear":    float(data["tool_wear"]),
        }

        # ── ML prediction ─────────────────────────────────────────────────
        result = predict_failure(sensor_data)

        # ── RUL calculation ───────────────────────────────────────────────
        # BUG FIX #2: tool_wear is now guaranteed to be a float, not None
        rul = calculate_rul(sensor_data["tool_wear"])

        # ── Maintenance decision ──────────────────────────────────────────
        maintenance_info = determine_maintenance(
            result["failure_type"],
            result["confidence"],
            rul
        )

        now = datetime.now(timezone.utc)

        # BUG FIX #3: determine_maintenance returns deadline_days not
        # scheduled_date — compute it here the same way simulate_routes does
        scheduled_date = now + timedelta(days=maintenance_info["deadline_days"])

        # ── Store prediction ──────────────────────────────────────────────
        predictions_collection.insert_one({
            "machine_id":   machine_id,
            "sensor_data":  sensor_data,
            "failure_type": result["failure_type"],
            "confidence":   result["confidence"],
            "rul":          rul,
            "timestamp":    now,   # stored as datetime in Mongo (fine)
        })

        # ── Store maintenance record ──────────────────────────────────────
        maintenance_collection.insert_one({
            "machine_id":     machine_id,
            "failure_type":   result["failure_type"],
            "confidence":     result["confidence"],
            "rul":            rul,
            "priority":       maintenance_info["priority"],
            "scheduled_date": scheduled_date,  # datetime is fine in Mongo
            "created_at":     now,
        })

        # BUG FIX #4: serialize datetime to ISO string before jsonify —
        # raw datetime objects cause TypeError: not JSON serializable
        return jsonify({
            "prediction":     result,
            "rul":            rul,
            "maintenance":    maintenance_info,
            "scheduled_date": to_iso(scheduled_date),
            "timestamp":      to_iso(now),
        }), 200

    except Exception as e:
        return jsonify({"error": "Prediction failed", "detail": str(e)}), 500