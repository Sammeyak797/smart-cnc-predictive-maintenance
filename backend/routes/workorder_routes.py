from flask import Blueprint, jsonify, request
from database.db import maintenance_collection
from middleware.auth_middleware import token_required
from datetime import datetime

workorder_bp = Blueprint("workorders", __name__)


# ── GET all work orders ───────────────────────────────────────────────────────
@workorder_bp.route("/", methods=["GET"])
@token_required
def get_workorders():
    try:
        workorders = list(
            maintenance_collection.find({}, {"_id": 0}).sort("created_at", -1)
        )
        return jsonify(workorders), 200
    except Exception as e:
        return jsonify({"message": "Failed to fetch work orders", "error": str(e)}), 500


# ── Assign engineer ───────────────────────────────────────────────────────────
@workorder_bp.route("/assign", methods=["POST"])
@token_required
def assign_engineer():
    data = request.get_json(silent=True)

    # BUG FIX #1: validate required fields before touching the database
    if not data:
        return jsonify({"message": "Request body is required"}), 400

    work_order_id = data.get("work_order_id")
    engineer      = data.get("engineer", "").strip()

    if not work_order_id:
        return jsonify({"message": "work_order_id is required"}), 400
    if not engineer:
        return jsonify({"message": "engineer name is required"}), 400

    try:
        result = maintenance_collection.update_one(
            {"work_order_id": work_order_id},
            {
                "$set": {
                    "assigned_engineer": engineer,
                    "status":            "IN_PROGRESS",
                    "assigned_at":       datetime.utcnow(),   # useful audit field
                }
            }
        )

        # BUG FIX #2: check matched_count — 0 means the ID doesn't exist
        # Previously this returned 200 "Engineer assigned" even for ghost IDs
        if result.matched_count == 0:
            return jsonify({"message": f"Work order '{work_order_id}' not found"}), 404

        return jsonify({"message": "Engineer assigned successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Failed to assign engineer", "error": str(e)}), 500


# ── Complete work order ───────────────────────────────────────────────────────
@workorder_bp.route("/complete", methods=["POST"])
@token_required
def complete_workorder():
    data = request.get_json(silent=True)

    # BUG FIX #1: validate before querying
    if not data:
        return jsonify({"message": "Request body is required"}), 400

    work_order_id = data.get("work_order_id")

    if not work_order_id:
        return jsonify({"message": "work_order_id is required"}), 400

    try:
        # Guard: don't re-complete an already completed order
        existing = maintenance_collection.find_one(
            {"work_order_id": work_order_id},
            {"_id": 0, "status": 1}
        )

        if not existing:
            return jsonify({"message": f"Work order '{work_order_id}' not found"}), 404

        if existing.get("status") == "COMPLETED":
            return jsonify({"message": "Work order is already completed"}), 409

        result = maintenance_collection.update_one(
            {"work_order_id": work_order_id},
            {
                "$set": {
                    "status":       "COMPLETED",
                    "completed_at": datetime.utcnow(),
                }
            }
        )

        # BUG FIX #2: verify the update actually landed
        if result.matched_count == 0:
            return jsonify({"message": f"Work order '{work_order_id}' not found"}), 404

        return jsonify({"message": "Work order completed successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Failed to complete work order", "error": str(e)}), 500