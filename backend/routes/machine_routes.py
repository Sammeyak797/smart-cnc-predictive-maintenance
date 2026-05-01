from flask import Blueprint, jsonify
from database.db import machines_collection, predictions_collection
from middleware.auth_middleware import token_required
from datetime import datetime

machine_bp = Blueprint("machines", __name__)


# ── GET /machines/ ────────────────────────────────────────────────────────────
@machine_bp.route("/", methods=["GET"])
@token_required
def get_machines():
    try:
        machines = list(machines_collection.find({}, {"_id": 0}))

        if not machines:
            return jsonify({
                "error": "No machines found. Please seed the database."
            }), 404

        return jsonify(machines), 200

    except Exception as e:
        return jsonify({
            "error": "Failed to fetch machines",
            "detail": str(e)
        }), 500


# ── GET /machines/compare ─────────────────────────────────────────────────────
# Returns one snapshot per machine combining:
#   - machine document (machine_id, duty_type, tool_wear)
#   - latest prediction (failure_type, confidence, rul, timestamp)
# Designed for the fleet comparison view — single request for all machines.
@machine_bp.route("/compare", methods=["GET"])
@token_required
def compare_machines():
    try:
        machines = list(machines_collection.find({}, {"_id": 0}))

        if not machines:
            return jsonify([]), 200

        snapshots = []

        for machine in machines:
            machine_id = machine.get("machine_id")

            # Latest prediction for this machine
            latest = predictions_collection.find_one(
                {"machine_id": machine_id},
                {"_id": 0},
                sort=[("timestamp", -1)],
            )

            # Serialize datetime fields
            timestamp = None
            if latest and isinstance(latest.get("timestamp"), datetime):
                timestamp = latest["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ")
            elif latest:
                timestamp = latest.get("timestamp")

            # Sensor data from the latest prediction
            sensor = (latest or {}).get("sensor_data", {})

            snapshots.append({
                "machine_id":   machine_id,
                "duty_type":    machine.get("duty_type", "—"),
                "tool_wear":    machine.get("tool_wear", 0),

                # Latest prediction — None if machine has never been simulated
                "failure_type": (latest or {}).get("failure_type"),
                "confidence":   (latest or {}).get("confidence"),
                "rul":          (latest or {}).get("rul"),
                "last_seen":    timestamp,

                # Key sensor readings for the comparison cards
                "rpm":          sensor.get("rpm"),
                "torque":       sensor.get("torque"),
                "process_temp": sensor.get("process_temp"),
            })

        # Sort: machines with recent failures first, then by RUL ascending
        # (most at-risk machines appear at the top)
        def sort_key(s):
            has_failure = 0 if (s["failure_type"] and s["failure_type"] != "No Failure") else 1
            rul = s["rul"] if s["rul"] is not None else 999
            return (has_failure, rul)

        snapshots.sort(key=sort_key)

        return jsonify(snapshots), 200

    except Exception as e:
        return jsonify({
            "error": "Failed to fetch machine comparison data",
            "detail": str(e)
        }), 500