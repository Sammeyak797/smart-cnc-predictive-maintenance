from flask import Blueprint, request, jsonify
from middleware.auth_middleware import token_required
from database.db import predictions_collection, maintenance_collection

analytics_bp = Blueprint("analytics", __name__)


# 📜 Get prediction history
@analytics_bp.route("/predictions", methods=["GET"])
@token_required
def get_predictions():
    machine_id = request.args.get("machine_id")

    query = {}
    if machine_id:
        query["machine_id"] = machine_id

    predictions = list(
        predictions_collection.find(query, {"_id": 0}).sort("timestamp", -1).limit(50)
    )

    return jsonify(predictions)


# 🛠 Get maintenance records
@analytics_bp.route("/maintenance", methods=["GET"])
@token_required
def get_maintenance():
    machine_id = request.args.get("machine_id")

    query = {}
    if machine_id:
        query["machine_id"] = machine_id

    maintenance = list(
        maintenance_collection.find(query, {"_id": 0}).sort("created_at", -1).limit(50)
    )

    return jsonify(maintenance)


# 📊 Failure Summary
@analytics_bp.route("/summary", methods=["GET"])
@token_required
def get_summary():
    machine_id = request.args.get("machine_id")

    match_stage = {}
    if machine_id:
        match_stage = {"machine_id": machine_id}

    pipeline = [
        {"$match": match_stage},
        {
            "$group": {
                "_id": "$failure_type",
                "count": {"$sum": 1}
            }
        }
    ]

    summary = list(predictions_collection.aggregate(pipeline))

    return jsonify(summary)
