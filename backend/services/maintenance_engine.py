from datetime import datetime, timedelta


def calculate_rul(tool_wear):
    # Max tool wear assumed 250
    return max(0, 250 - tool_wear)


def determine_maintenance(failure_type, confidence, rul):
    """
    Determine maintenance priority correctly
    """

    # If actual failure detected
    if failure_type != "No Failure":
        priority = "URGENT"
        days = 1

    # If no failure but RUL very low
    elif rul < 20:
        priority = "SCHEDULE_SOON"
        days = 3

    elif rul < 50:
        priority = "PREVENTIVE"
        days = 7

    else:
        priority = "ROUTINE"
        days = 14

    scheduled_date = datetime.utcnow() + timedelta(days=days)

    return {
        "priority": priority,
        "scheduled_date": scheduled_date
    }

