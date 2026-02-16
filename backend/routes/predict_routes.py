from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from model.predict import predict_failure
from database.db import predictions_collection, maintenance_collection
from services.maintenance_engine import calculate_rul, determine_maintenance
from datetime import datetime

predict_bp = Blueprint("predict", __name__)


@predict_bp.route("/", methods=["POST"])
@token_required
def predict():
    data = request.json

    machine_id = data.get("machine_id")

    sensor_data = {
        "type": data.get("type"),
        "air_temp": data.get("air_temp"),
        "process_temp": data.get("process_temp"),
        "rpm": data.get("rpm"),
        "torque": data.get("torque"),
        "tool_wear": data.get("tool_wear"),
    }

    # ML Prediction
    result = predict_failure(sensor_data)

    # RUL Calculation
    rul = calculate_rul(sensor_data["tool_wear"])

    # Maintenance Decision
    maintenance_info = determine_maintenance(
        result["failure_type"],
        result["confidence"],
        rul
    )

    # Store prediction
    prediction_record = {
        "machine_id": machine_id,
        "sensor_data": sensor_data,
        "failure_type": result["failure_type"],
        "confidence": result["confidence"],
        "rul": rul,
        "timestamp": datetime.utcnow()
    }

    predictions_collection.insert_one(prediction_record)

    # Store maintenance record
    maintenance_record = {
        "machine_id": machine_id,
        "failure_type": result["failure_type"],
        "confidence": result["confidence"],
        "rul": rul,
        "priority": maintenance_info["priority"],
        "scheduled_date": maintenance_info["scheduled_date"],
        "created_at": datetime.utcnow()
    }

    maintenance_collection.insert_one(maintenance_record)

    return jsonify({
        "prediction": result,
        "rul": rul,
        "maintenance": maintenance_info
    })
