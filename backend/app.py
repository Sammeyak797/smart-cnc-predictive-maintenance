import os
import re
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
    if app.config.get("TESTING"):
        # Tests: allow everything — no real browser making requests
        CORS(app)
    else:
        # Production: allow localhost + any URL that belongs to your
        # Vercel project (covers production URL, branch previews, and
        # PR preview deployments which all have different subdomains).
        #
        # FRONTEND_ORIGIN on Render should be set to your PRIMARY
        # production Vercel URL, e.g.:
        #   https://smart-cnc-predictive-maintenance.vercel.app
        #
        # The regex below additionally allows ANY subdomain of vercel.app
        # that contains your project name so branch previews also work.
        primary_origin = os.environ.get(
            "FRONTEND_ORIGIN",
            "http://localhost:5173"
        )

        # Extract the vercel project slug from the primary origin
        # e.g. "smart-cnc-predictive-maintenance" from the full URL
        vercel_pattern = re.compile(
            r"https://smart-cnc-predictive-maintenance[a-zA-Z0-9\-]*\.vercel\.app"
        )

        def is_allowed_origin(origin):
            if not origin:
                return False
            # Always allow localhost for local development
            if origin.startswith("http://localhost"):
                return True
            # Allow the exact primary production URL
            if origin == primary_origin:
                return True
            # Allow all Vercel preview/branch deployment URLs
            if vercel_pattern.match(origin):
                return True
            return False

        CORS(
            app,
            resources={r"/api/*": {"origins": is_allowed_origin}},
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