from model.predict import predict_failure

sample_data = {
    "type": "L",
    "air_temp": 300,
    "process_temp": 310,
    "rpm": 1500,
    "torque": 40,
    "tool_wear": 120
}

result = predict_failure(sample_data)
print(result)
