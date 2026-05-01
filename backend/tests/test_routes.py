# backend/tests/test_routes.py
#
# Smoke tests — quick checks that all registered routes exist and respond.
# The app and client fixtures come from conftest.py automatically.

import pytest


class TestHealthAndRoutes:

    def test_home_route_returns_200(self, client):
        """The root endpoint should return 200 and confirm the API is running."""
        res = client.get("/")
        assert res.status_code == 200
        body = res.get_json()
        assert "message" in body
        assert "status" in body
        assert body["status"] == "running"

    def test_unknown_route_returns_404_json(self, client):
        """Unknown routes should return JSON, not an HTML error page."""
        res = client.get("/api/this-does-not-exist")
        assert res.status_code == 404
        body = res.get_json()
        assert body is not None, "Response should be JSON, not HTML"
        assert "error" in body

    def test_machines_route_requires_auth(self, client):
        """Protected routes should reject requests without a token."""
        res = client.get("/api/machines/")
        assert res.status_code in (401, 403)

    def test_simulate_route_requires_auth(self, client):
        """Simulate endpoint should reject unauthenticated requests."""
        res = client.post("/api/simulate/", json={"machine_id": "CNC-01"})
        assert res.status_code in (401, 403)

    def test_analytics_route_requires_auth(self, client):
        res = client.get("/api/analytics/summary")
        assert res.status_code in (401, 403)

    def test_alerts_route_requires_auth(self, client):
        res = client.get("/api/alerts/")
        assert res.status_code in (401, 403)

    def test_workorders_route_requires_auth(self, client):
        res = client.get("/api/workorders/")
        assert res.status_code in (401, 403)