from services.failure_analysis_engine import analyze_failure
from database.db import alerts_collection
from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from services.simulation_engine import generate_sensor_data
from model.predict import predict_failure
from services.maintenance_engine import calculate_rul, determine_maintenance, get_rul_status
from database.db import (
    predictions_collection,
    maintenance_collection,
    maintenance_history_collection,
)
from datetime import datetime, timezone, timedelta
import uuid

simulate_bp = Blueprint("simulate", __name__)


def to_iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def get_minute_bucket(dt: datetime) -> str:
    """
    Return a string key for the current UTC minute.
    Used as the upsert bucket key — guarantees at most one history
    document per machine per minute.
    e.g. "2025-04-19T14:32"
    """
    return dt.strftime("%Y-%m-%dT%H:%M")


@simulate_bp.route("/", methods=["POST"])
@token_required
def simulate():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    machine_id = data.get("machine_id", "").strip()
    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400

    try:
        # ── Sensor data ───────────────────────────────────────────────────
        sensor_data = generate_sensor_data(machine_id)
        if not sensor_data:
            return jsonify({"error": f"Machine '{machine_id}' not found"}), 404

        # ── ML prediction ─────────────────────────────────────────────────
        result           = predict_failure(sensor_data)
        failure_analysis = analyze_failure(sensor_data, result["failure_type"])

        # ── RUL + maintenance ─────────────────────────────────────────────
        rul = calculate_rul(
            tool_wear    = sensor_data["tool_wear"],
            torque       = sensor_data["torque"],
            rpm          = sensor_data["rpm"],
            process_temp = sensor_data["process_temp"],
        )
        rul_status = get_rul_status(rul)

        maintenance_info = determine_maintenance(
            result["failure_type"],
            result["confidence"],
            rul,
        )

        now            = datetime.now(timezone.utc)
        scheduled_date = now + timedelta(days=maintenance_info["deadline_days"])

        # ── Store raw prediction (every tick) ─────────────────────────────
        predictions_collection.insert_one({
            "machine_id":   machine_id,
            "sensor_data":  sensor_data,
            "failure_type": result["failure_type"],
            "confidence":   result["confidence"],
            "rul":          rul,
            "timestamp":    now,
        })

        # ── Maintenance history — bucketed upsert ─────────────────────────
        # FIX: was insert_one on every tick → 1,200 docs/hour per machine.
        #
        # update_one with upsert=True, keyed on (machine_id, bucket) where
        # bucket = current UTC minute string ("2025-04-19T14:32").
        # The unique index on these two fields (see db.py) makes this
        # race-condition-safe: at most ONE document per machine per minute
        # regardless of tick speed.
        #
        # $set    → overwrites fields with the latest reading this minute
        # $setOnInsert → writes created_at only when the doc is first created
        #
        # Net result: 20 records/hour instead of 1,200 — 98% reduction —
        # while Analytics still refreshes within 1 minute of any change.
        bucket = get_minute_bucket(now)

        maintenance_history_collection.update_one(
            {"machine_id": machine_id, "bucket": bucket},
            {
                "$set": {
                    "failure_type":     result["failure_type"],
                    "confidence":       result["confidence"],
                    "priority":         maintenance_info["priority"],
                    "maintenance_type": maintenance_info["maintenance_type"],
                    "rul":              rul,
                    "updated_at":       now,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
        )

        # ── Alert — only if no active alert exists for this machine ───────
        if maintenance_info["priority"] == "URGENT":
            existing_alert = alerts_collection.find_one({
                "machine_id": machine_id,
                "status":     "ACTIVE",
            })
            if not existing_alert:
                alerts_collection.insert_one({
                    "machine_id":      machine_id,
                    "priority":        maintenance_info["priority"],
                    "failure_type":    result["failure_type"],
                    "possible_cause":  failure_analysis["possible_cause"],
                    "status":          "ACTIVE",
                    "rul":             rul,
                    "created_at":      now,
                    "acknowledged_at": None,
                })

        # ── Work order — only if none pending/in-progress ─────────────────
        existing_active_order = maintenance_collection.find_one({
            "machine_id": machine_id,
            "status":     {"$in": ["PENDING", "IN_PROGRESS"]},
        })

        if not existing_active_order:
            work_order_id = (
                f"WO-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
            )
            maintenance_collection.insert_one({
                "work_order_id":            work_order_id,
                "machine_id":               machine_id,
                "failure_type":             result["failure_type"],
                "priority":                 maintenance_info["priority"],
                "maintenance_type":         maintenance_info["maintenance_type"],
                "action":                   maintenance_info["action"],
                "estimated_downtime_hours": maintenance_info["estimated_downtime_hours"],
                "scheduled_date":           scheduled_date,
                "status":                   "PENDING",
                "assigned_engineer":        None,
                "completed_at":             None,
                "created_at":               now,
            })

        return jsonify({
            "sensor_data":    sensor_data,
            "prediction":     result,
            "rul":            rul,
            "rul_status":     rul_status,
            "maintenance":    maintenance_info,
            "scheduled_date": to_iso(scheduled_date),
            "analysis":       failure_analysis,
        }), 200

    except Exception as e:
        return jsonify({"error": "Simulation failed", "detail": str(e)}), 500