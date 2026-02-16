from flask import Blueprint, jsonify
from database.db import machines_collection
from middleware.auth_middleware import token_required

machine_bp = Blueprint("machines", __name__)


@machine_bp.route("/", methods=["GET"])
@token_required
def get_machines():
    machines = list(machines_collection.find({}, {"_id": 0}))
    return jsonify(machines)
