import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.auth_routes import auth_bp
from routes.machine_routes import machine_bp
from routes.predict_routes import predict_bp
from routes.simulate_routes import simulate_bp
from routes.analytics_routes import analytics_bp
from routes.report_routes import report_bp
from routes.alert_routes import alert_bp
from routes.workorder_routes import workorder_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config.setdefault("TESTING", False)

    # ── CORS ──────────────────────────────────────────────────────────────
    # flask-cors only accepts a list of strings for origins — NOT a callable.
    # Passing a function caused: TypeError: argument of type 'function' is not iterable
    # Fix: build a plain list of allowed origin strings.
    if app.config.get("TESTING"):
        # In tests there is no real browser so just allow everything.
        CORS(app)
    else:
        # Build the list of allowed origins from the environment variable.
        # FRONTEND_ORIGIN on Render should be set to your Vercel production URL.
        # We also always include localhost so local dev keeps working.
        primary_origin = os.environ.get(
            "FRONTEND_ORIGIN",
            "http://localhost:5173"
        )

        allowed_origins = list({
            "http://localhost:5173",
            "http://localhost:3000",
            primary_origin,
        })

        CORS(
            app,
            resources={r"/api/*": {"origins": allowed_origins}},
            supports_credentials=True,
        )

    # ── Blueprints ────────────────────────────────────────────────────────
    app.register_blueprint(auth_bp,       url_prefix="/api/auth")
    app.register_blueprint(machine_bp,    url_prefix="/api/machines")
    app.register_blueprint(predict_bp,    url_prefix="/api/predict")
    app.register_blueprint(simulate_bp,   url_prefix="/api/simulate")
    app.register_blueprint(analytics_bp,  url_prefix="/api/analytics")
    app.register_blueprint(report_bp,     url_prefix="/api/report")
    app.register_blueprint(alert_bp,      url_prefix="/api/alerts")
    app.register_blueprint(workorder_bp,  url_prefix="/api/workorders")

    # ── Global JSON error handlers ────────────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "detail": str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"error": "Unauthorized", "detail": str(e)}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Forbidden", "detail": str(e)}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found", "detail": str(e)}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed", "detail": str(e)}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500

    # ── Health check ──────────────────────────────────────────────────────
    @app.route("/")
    def home():
        return jsonify({
            "message": "Smart CNC Predictive Maintenance API",
            "status":  "running",
            "version": "1.0.0",
        }), 200

    return app


# ── Entry point ───────────────────────────────────────────────────────────────
app = create_app()

if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    port       = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=debug_mode)