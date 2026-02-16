from database.db import machines_collection

machines = [
    {
        "machine_id": "CNC-01",
        "duty_type": "L",
        "description": "Light Duty CNC Machine"
    },
    {
        "machine_id": "CNC-02",
        "duty_type": "M",
        "description": "Medium Duty CNC Machine"
    },
    {
        "machine_id": "CNC-03",
        "duty_type": "H",
        "description": "Heavy Duty CNC Machine"
    }
]

machines_collection.delete_many({})
machines_collection.insert_many(machines)

print("Machines seeded successfully!")
