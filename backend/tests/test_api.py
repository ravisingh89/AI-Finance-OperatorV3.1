"""
FastAPI route tests using TestClient.
Run: pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Patch settings before app import so missing env vars don't crash
import sys, os
os.environ.setdefault("GROQ_API_KEY",          "test-key")
os.environ.setdefault("SUPABASE_URL",          "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY",     "test-anon")
os.environ.setdefault("SUPABASE_SERVICE_KEY",  "test-service")
os.environ.setdefault("DATABASE_URL",          "postgresql+asyncpg://user:pw@localhost/db")
os.environ.setdefault("CLERK_SECRET_KEY",      "test-clerk-secret")
os.environ.setdefault("CLERK_PUBLISHABLE_KEY", "test-clerk-pub")

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_upload_no_auth():
    """Upload without auth should return 401 or 422."""
    res = client.post("/api/v1/statements/upload")
    assert res.status_code in (401, 422)


def test_upload_wrong_type():
    """Unsupported file type should return 400."""
    fake_user = {"id": "user_test", "email": "test@test.com"}
    with patch("app.api.routes.upload.get_current_user", return_value=fake_user), \
         patch("app.api.routes.upload.get_db"):
        res = client.post(
            "/api/v1/statements/upload",
            files={"file": ("bad.txt", b"hello", "text/html")},
            data={"currency": "AED", "region": "UAE"},
        )
    assert res.status_code == 400


def test_analysis_status_authenticated():
    fake_user = {"id": "user_test", "email": "test@test.com"}
    with patch("app.api.routes.analysis.get_current_user", return_value=fake_user):
        res = client.get("/api/v1/analysis/status")
    assert res.status_code == 200
