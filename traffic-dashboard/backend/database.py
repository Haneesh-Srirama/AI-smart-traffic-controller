import motor.motor_asyncio
from datetime import datetime
import os

# MongoDB Connection String (Default to localhost if not provided)
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "traffic_simulation"

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

# Collections
logs_collection = db["simulation_logs"]
agent_collection = db["agent_history"]

async def save_simulation_snapshot(state):
    """Saves a summary of the current simulation state to MongoDB."""
    try:
        snapshot = {
            "timestamp": datetime.utcnow(),
            "phase": state["phase"],
            "metrics": state["metrics"],
            "queues": state["queues"],
            # We don't save individual vehicle positions to avoid massive DB growth,
            # but we save the count which is in the metrics/queues.
            "vehicle_count": len(state["vehicles"])
        }
        await logs_collection.insert_one(snapshot)
    except Exception as e:
        print(f"Failed to save simulation snapshot to MongoDB: {e}")

async def save_agent_metrics(metrics):
    """Saves DQN agent training metrics to MongoDB."""
    try:
        metrics_doc = {
            "timestamp": datetime.utcnow(),
            "epsilon": metrics.get("epsilon"),
            "reward": metrics.get("reward"),
            "loss": metrics.get("loss"),
            "action": metrics.get("action"),
            "trained": metrics.get("trained")
        }
        await agent_collection.insert_one(metrics_doc)
    except Exception as e:
        print(f"Failed to save agent metrics to MongoDB: {e}")

async def get_recent_history(limit=50):
    """Retrieves recent simulation logs."""
    cursor = logs_collection.find().sort("timestamp", -1).limit(limit)
    res = await cursor.to_list(length=limit)
    # Convert ObjectId to string for JSON serialization
    for doc in res:
        doc["_id"] = str(doc["_id"])
    return res

async def get_agent_history(limit=50):
    """Retrieves recent agent training logs."""
    cursor = agent_collection.find().sort("timestamp", -1).limit(limit)
    res = await cursor.to_list(length=limit)
    for doc in res:
        doc["_id"] = str(doc["_id"])
    return res
