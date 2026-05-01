from model.predict import predict_failure
import sys
import os
import pytest

if os.getenv("CI") == "true":
    pytest.skip("Skipping ML model test in CI", allow_module_level=True)


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

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
