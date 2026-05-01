from flask import Blueprint, jsonify, request
from database.db import alerts_collection
from middleware.auth_middleware import token_required
from datetime import datetime, timezone

alert_bp = Blueprint("alerts", __name__)


# ── Helper: serialize datetime fields in a MongoDB document ───────────────────
# BUG FIX #2: MongoDB returns created_at / acknowledged_at as Python datetime
# objects. jsonify has no built-in datetime encoder so any alert document with
# a timestamp field causes TypeError: Object of type datetime is not JSON serializable.
def serialize_alert(alert: dict) -> dict:
    result = {}
    for key, value in alert.items():
        if isinstance(value, datetime):
            result[key] = value.strftime("%Y-%m-%dT%H:%M:%SZ")
        else:
            result[key] = value
    return result


# ── GET /alerts/ — active alerts ──────────────────────────────────────────────
@alert_bp.route("/", methods=["GET"])
@token_required
def get_alerts():
    try:
        alerts = list(
            alerts_collection
            .find({"status": "ACTIVE"}, {"_id": 0})
            .sort("created_at", -1)   # newest first
        )

        # BUG FIX #2: serialize all datetime fields before jsonify
        return jsonify([serialize_alert(a) for a in alerts]), 200

    except Exception as e:
        # BUG FIX #1: return clean JSON error instead of HTML traceback
        return jsonify({"error": "Failed to fetch alerts", "detail": str(e)}), 500


# ── POST /alerts/acknowledge ───────────────────────────────────────────────────
@alert_bp.route("/acknowledge", methods=["POST"])
@token_required
def acknowledge_alert():
    data = request.get_json(silent=True)

    # BUG FIX #3: validate input before touching the database
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    machine_id = data.get("machine_id", "").strip()
    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400

    try:
        result = alerts_collection.update_many(
            {"machine_id": machine_id, "status": "ACTIVE"},
            {
                "$set": {
                    "status":           "RESOLVED",
                    "acknowledged_at":  datetime.now(timezone.utc),
                }
            }
        )

        # BUG FIX #3: check whether any alerts were actually updated —
        # previously returned 200 "acknowledged" even when nothing matched
        if result.matched_count == 0:
            return jsonify({
                "message": f"No active alerts found for machine '{machine_id}'"
            }), 404

        return jsonify({
            "message":  "Alert acknowledged",
            "resolved": result.modified_count,
        }), 200

    except Exception as e:
        # BUG FIX #1: clean JSON 500 instead of HTML traceback
        return jsonify({"error": "Failed to acknowledge alert", "detail": str(e)}), 500