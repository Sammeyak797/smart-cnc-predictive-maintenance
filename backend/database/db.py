from pymongo import MongoClient, ASCENDING, DESCENDING
from config import Config

client = MongoClient(Config.MONGO_URI)

db = client["predictive_maintenance_db"]

# ── Collections ───────────────────────────────────────────────────────────────
users_collection               = db["users"]
machines_collection            = db["machines"]
predictions_collection         = db["predictions"]
maintenance_collection         = db["maintenance_records"]   # work orders only
maintenance_history_collection = db["maintenance_history"]   # one doc per minute per machine
alerts_collection              = db["alerts"]

# ── Indexes ───────────────────────────────────────────────────────────────────
# predictions: filter by machine_id, sort by timestamp
predictions_collection.create_index(
    [("machine_id", ASCENDING), ("timestamp", DESCENDING)]
)

# maintenance_history: filter by machine_id + minute bucket, sort by bucket
maintenance_history_collection.create_index(
    [("machine_id", ASCENDING), ("bucket", DESCENDING)]
)
# Unique constraint: one document per machine per minute bucket
# This is what makes the upsert approach safe — duplicate inserts are impossible
maintenance_history_collection.create_index(
    [("machine_id", ASCENDING), ("bucket", ASCENDING)],
    unique=True,
    name="unique_machine_bucket"
)

# maintenance_records (work orders): filter by machine_id + status
maintenance_collection.create_index(
    [("machine_id", ASCENDING), ("status", ASCENDING)]
)

# alerts: filter by machine_id + status
alerts_collection.create_index(
    [("machine_id", ASCENDING), ("status", ASCENDING)]
)