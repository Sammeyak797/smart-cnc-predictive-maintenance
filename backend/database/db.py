from pymongo import MongoClient
from config import Config

client = MongoClient(Config.MONGO_URI)

db = client["predictive_maintenance_db"]

# Collections
users_collection = db["users"]
machines_collection = db["machines"]
predictions_collection = db["predictions"]
maintenance_collection = db["maintenance_records"]
