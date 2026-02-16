import joblib
import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

model_path = os.path.join(BASE_DIR, "model", "model.pkl")
type_encoder_path = os.path.join(BASE_DIR, "model", "le_type.pkl")
failure_encoder_path = os.path.join(BASE_DIR, "model", "le_failure.pkl")

model = joblib.load(model_path)
le_type = joblib.load(type_encoder_path)
le_failure = joblib.load(failure_encoder_path)


def predict_failure(data):
    """
    data = {
        "type": "L",
        "air_temp": 300,
        "process_temp": 310,
        "rpm": 1500,
        "torque": 40,
        "tool_wear": 120
    }
    """

    encoded_type = le_type.transform([data["type"]])[0]

    input_df = pd.DataFrame([{
        "Type": encoded_type,
        "Air temperature [K]": data["air_temp"],
        "Process temperature [K]": data["process_temp"],
        "Rotational speed [rpm]": data["rpm"],
        "Torque [Nm]": data["torque"],
        "Tool wear [min]": data["tool_wear"]
    }])

    prediction = model.predict(input_df)[0]
    probabilities = model.predict_proba(input_df)[0]

    failure_label = le_failure.inverse_transform([prediction])[0]
    confidence = max(probabilities)

    return {
        "failure_type": failure_label,
        "confidence": round(float(confidence) * 100, 2)
    }
