from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.simulation_engine import generate_sensor_data
from model.predict import predict_failure
from services.maintenance_engine import calculate_rul, determine_maintenance
from database.db import predictions_collection, maintenance_collection
from datetime import datetime

simulate_bp = Blueprint("simulate", __name__)


@simulate_bp.route("/", methods=["POST"])
@token_required
def simulate():
    data = request.json
    machine_id = data.get("machine_id")

    sensor_data = generate_sensor_data(machine_id)

    if not sensor_data:
        return jsonify({"error": "Machine not found"}), 404

    # ML Prediction
    result = predict_failure(sensor_data)

    # RUL
    rul = calculate_rul(sensor_data["tool_wear"])

    # Maintenance
    maintenance_info = determine_maintenance(
        result["failure_type"],
        result["confidence"],
        rul
    )

    # Store prediction
    predictions_collection.insert_one({
        "machine_id": machine_id,
        "sensor_data": sensor_data,
        "failure_type": result["failure_type"],
        "confidence": result["confidence"],
        "rul": rul,
        "timestamp": datetime.utcnow()
    })

    # Store maintenance
    maintenance_collection.insert_one({
        "machine_id": machine_id,
        "failure_type": result["failure_type"],
        "confidence": result["confidence"],
        "rul": rul,
        "priority": maintenance_info["priority"],
        "scheduled_date": maintenance_info["scheduled_date"],
        "created_at": datetime.utcnow()
    })

    return jsonify({
        "sensor_data": sensor_data,
        "prediction": result,
        "rul": rul,
        "maintenance": maintenance_info
    })
