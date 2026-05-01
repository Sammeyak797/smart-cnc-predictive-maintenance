from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from database.db import (
    predictions_collection,
    maintenance_history_collection,
)
from datetime import datetime

analytics_bp = Blueprint("analytics", __name__)


# ── Helper ────────────────────────────────────────────────────────────────────
def serialize_doc(doc: dict) -> dict:
    """Recursively convert datetime values to ISO 8601 strings."""
    result = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            result[key] = value.strftime("%Y-%m-%dT%H:%M:%SZ")
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [
                serialize_doc(v) if isinstance(v, dict) else v
                for v in value
            ]
        else:
            result[key] = value
    return result


# ── GET /analytics/predictions ────────────────────────────────────────────────
@analytics_bp.route("/predictions", methods=["GET"])
@token_required
def get_predictions():
    machine_id = request.args.get("machine_id", "").strip()
    query = {"machine_id": machine_id} if machine_id else {}
    try:
        predictions = list(
            predictions_collection
            .find(query, {"_id": 0})
            .sort("timestamp", -1)
            .limit(50)
        )
        return jsonify([serialize_doc(p) for p in predictions]), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch predictions", "detail": str(e)}), 500


# ── GET /analytics/maintenance ────────────────────────────────────────────────
# Reads from maintenance_history_collection — one doc per machine per minute
# (bucketed upsert in simulate_routes.py) — not the work orders collection.
@analytics_bp.route("/maintenance", methods=["GET"])
@token_required
def get_maintenance():
    machine_id = request.args.get("machine_id", "").strip()
    query = {"machine_id": machine_id} if machine_id else {}

    try:
        limit = min(int(request.args.get("limit", 50)), 200)
    except ValueError:
        limit = 50

    try:
        history = list(
            maintenance_history_collection
            .find(
                query,
                {
                    "_id":        0,
                    # FIX: only return the fields Analytics.jsx actually
                    # uses — previously extra fields (sensor_data, confidence)
                    # were shipped in every row, bloating the payload for no
                    # benefit since the frontend never read them
                    "machine_id":       1,
                    "failure_type":     1,
                    "priority":         1,
                    "maintenance_type": 1,
                    "rul":              1,
                    "bucket":           1,
                    "created_at":       1,
                    "updated_at":       1,
                }
            )
            .sort("bucket", -1)   # sort by bucket (minute string) — consistent with insert order
            .limit(limit)
        )
        return jsonify([serialize_doc(h) for h in history]), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch maintenance history", "detail": str(e)}), 500


# ── GET /analytics/summary ────────────────────────────────────────────────────
@analytics_bp.route("/summary", methods=["GET"])
@token_required
def get_summary():
    machine_id = request.args.get("machine_id", "").strip()
    match_stage = {"machine_id": machine_id} if machine_id else {}

    pipeline = [
        {"$match": match_stage},
        {"$group": {"_id": "$failure_type", "count": {"$sum": 1}}},
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"count": -1}},
    ]

    try:
        summary = list(predictions_collection.aggregate(pipeline))
        return jsonify([
            {"_id": s["_id"], "count": s["count"]}
            for s in summary
        ]), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch summary", "detail": str(e)}), 500


# ── GET /analytics/trends ─────────────────────────────────────────────────────
@analytics_bp.route("/trends", methods=["GET"])
@token_required
def get_trends():
    machine_id = request.args.get("machine_id", "").strip()
    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400

    try:
        limit = min(int(request.args.get("limit", 20)), 100)
    except ValueError:
        limit = 20

    try:
        raw = list(
            predictions_collection
            .find(
                {"machine_id": machine_id},
                {
                    "_id":                   0,
                    "timestamp":             1,
                    "sensor_data.rpm":       1,
                    "sensor_data.tool_wear": 1,
                    "rul":                   1,
                }
            )
            .sort("timestamp", -1)
            .limit(limit)
        )
        raw.reverse()  # oldest → newest for chart left → right

        rpm_history       = []
        wear_history      = []
        rul_history       = []
        timestamp_history = []

        for record in raw:
            sensor = record.get("sensor_data", {})
            rpm    = sensor.get("rpm")
            wear   = sensor.get("tool_wear")
            if rpm is None or wear is None:
                continue
            rpm_history.append(rpm)
            wear_history.append(wear)
            rul_history.append(record.get("rul"))
            ts = record.get("timestamp")
            timestamp_history.append(
                ts.strftime("%Y-%m-%dT%H:%M:%SZ") if isinstance(ts, datetime) else ts
            )

        return jsonify({
            "machine_id": machine_id,
            "rpm":        rpm_history,
            "tool_wear":  wear_history,
            "rul":        rul_history,
            "timestamps": timestamp_history,
            # FIX: return actual array length — was returning raw.length
            # before filtering out None rpm/wear, causing count to be
            # higher than the actual data arrays, misleading the frontend
            "count":      len(rpm_history),
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch trends", "detail": str(e)}), 500