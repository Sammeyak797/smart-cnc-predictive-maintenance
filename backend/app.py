from flask import Flask
from flask_cors import CORS
from config import Config
from routes.auth_routes import auth_bp
from routes.machine_routes import machine_bp
from routes.predict_routes import predict_bp
from routes.simulate_routes import simulate_bp
from routes.analytics_routes import analytics_bp

app = Flask(__name__)
app.config.from_object(Config)

CORS(app)

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(machine_bp, url_prefix="/api/machines")
app.register_blueprint(predict_bp, url_prefix="/api/predict")
app.register_blueprint(simulate_bp, url_prefix="/api/simulate")
app.register_blueprint(analytics_bp, url_prefix="/api/analytics")


@app.route("/")
def home():
    return {"message": "Smart CNC Predictive Maintenance API Running"}

if __name__ == "__main__":
    app.run(debug=True)
