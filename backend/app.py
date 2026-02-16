from flask import Flask
from flask_cors import CORS
from config import Config
from database.db import client

app = Flask(__name__)
app.config.from_object(Config)

CORS(app)

@app.route("/")
def home():
    return {"message": "Smart CNC Predictive Maintenance API Running"}

if __name__ == "__main__":
    app.run(debug=True)
