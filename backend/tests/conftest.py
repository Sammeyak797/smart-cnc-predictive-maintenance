# backend/tests/conftest.py
#
# conftest.py is a special pytest file — it runs BEFORE any test file.
# Everything here is automatically available to all tests in this folder.
#
# THE KEY FIX:
# Your app imports database.db at module load time, which immediately
# tries to connect to MongoDB. In CI there is no MongoDB, so it crashes
# before a single test runs.
#
# The solution: patch MongoClient BEFORE importing anything from your app.
# We use pytest's monkeypatch via a session-scoped autouse fixture so it
# applies to every test automatically without each test having to do it.

import pytest
import sys
import os
from unittest.mock import MagicMock, patch

# ── Make sure the backend root is on the Python path ──────────────────────────
# This lets tests do  "from services.maintenance_engine import ..."
# instead of needing relative imports.
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)


# ── Patch MongoDB at the very start of the test session ───────────────────────
# We create a fake MongoClient that returns MagicMock objects for every
# attribute access (db["collection"].find(), etc.) so nothing actually
# tries to open a network connection.

@pytest.fixture(scope="session", autouse=True)
def mock_mongo():
    """
    Patches pymongo.MongoClient for the entire test session.

    autouse=True  → applies to ALL tests without them needing to ask for it.
    scope="session" → created once and shared across all tests (fast).
    """
    mock_client   = MagicMock()
    mock_db       = MagicMock()
    mock_client.__getitem__ = lambda self, name: mock_db
    mock_db.__getitem__     = lambda self, name: MagicMock()

    with patch("pymongo.MongoClient", return_value=mock_client):
        yield mock_client


# ── Shared Flask app fixture ───────────────────────────────────────────────────

@pytest.fixture(scope="session")
def app(mock_mongo):
    """
    Creates the Flask test app once for the whole session.
    Depends on mock_mongo so MongoDB is patched before app is imported.
    """
    # Set environment variables that app.py / config.py read
    os.environ.setdefault("FLASK_ENV",        "testing")
    os.environ.setdefault("MONGO_URI",        "mongodb://localhost:27017/test_db")
    os.environ.setdefault("JWT_SECRET_KEY",   "test-secret-key-for-ci-at-least-32-chars!")
    os.environ.setdefault("FRONTEND_ORIGIN",  "http://localhost:5173")
    os.environ.setdefault("FLASK_DEBUG",      "false")

    from app import create_app
    application = create_app()
    application.config["TESTING"] = True
    # Disable CSRF / cookie protection in tests
    application.config["WTF_CSRF_ENABLED"] = False
    return application


@pytest.fixture(scope="session")
def client(app):
    """A test client shared across the session."""
    return app.test_client()


@pytest.fixture
def auth_headers():
    """Valid-looking auth headers for every test that needs them."""
    return {
        "Authorization": "Bearer fake-test-token-for-ci",
        "Content-Type":  "application/json",
    }