import random
from database.db import machines_collection

# In-memory wear tracker (temporary for demo)
machine_wear_tracker = {}


def generate_sensor_data(machine_id):
    machine = machines_collection.find_one({"machine_id": machine_id})

    if not machine:
        return None

    duty = machine["duty_type"]

    # Initialize wear if not present
    if machine_id not in machine_wear_tracker:
        machine_wear_tracker[machine_id] = random.randint(0, 50)

    current_wear = machine_wear_tracker[machine_id]

    # Define ranges based on duty
    if duty == "L":
        rpm = random.randint(1000, 1600)
        torque = random.randint(20, 40)
        wear_increment = random.randint(1, 3)

    elif duty == "M":
        rpm = random.randint(1500, 2200)
        torque = random.randint(30, 60)
        wear_increment = random.randint(2, 5)

    else:  # Heavy Duty
        rpm = random.randint(2000, 3000)
        torque = random.randint(50, 80)
        wear_increment = random.randint(4, 8)

    # Increase wear
    current_wear += wear_increment
    current_wear = min(current_wear, 250)

    machine_wear_tracker[machine_id] = current_wear

    sensor_data = {
        "type": duty,
        "air_temp": random.randint(295, 310),
        "process_temp": random.randint(305, 320),
        "rpm": rpm,
        "torque": torque,
        "tool_wear": current_wear
    }

    return sensor_data
