"""Tests for API Bearer Token authentication."""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


@pytest.fixture(autouse=True)
def _reset_token(monkeypatch):
    """Ensure token is reset between tests."""
    monkeypatch.setattr(settings, "api_bearer_token", "")


class TestOpenMode:
    """When api_bearer_token is empty, all requests pass."""

    def test_health_accessible(self):
        with TestClient(app) as client:
            resp = client.get("/api/v1/health")
            assert resp.status_code == 200
            assert resp.json() == {"status": "ok"}

    def test_auth_config_shows_no_auth(self):
        with TestClient(app) as client:
            resp = client.get("/api/v1/auth/config")
            assert resp.status_code == 200
            assert resp.json() == {"auth_required": False}

    def test_auth_verify_passes(self):
        with TestClient(app) as client:
            resp = client.get("/api/v1/auth/verify")
            assert resp.status_code == 200
            assert resp.json() == {"status": "ok"}

    def test_dashboard_accessible(self):
        with TestClient(app) as client:
            resp = client.get("/api/v1/dashboard")
            # Should not be 401; may be 200 or 500 depending on state
            assert resp.status_code != 401

    def test_sessions_accessible(self):
        with TestClient(app) as client:
            resp = client.get("/api/v1/sessions")
            assert resp.status_code != 401


class TestTokenRequired:
    """When api_bearer_token is set, requests without valid token get 401."""

    @pytest.fixture(autouse=True)
    def _set_token(self, monkeypatch):
        monkeypatch.setattr(settings, "api_bearer_token", "test-secret-token")

    def test_health_always_accessible(self):
        """Health endpoint should not require auth."""
        with TestClient(app) as client:
            resp = client.get("/api/v1/health")
            assert resp.status_code == 200
            assert resp.json() == {"status": "ok"}

    def test_auth_config_always_accessible(self):
        """Auth config endpoint should not require auth."""
        with TestClient(app) as client:
            resp = client.get("/api/v1/auth/config")
            assert resp.status_code == 200
            assert resp.json() == {"auth_required": True}

    def test_auth_verify_needs_token(self):
        """Auth verify endpoint uses verify_token which checks the bearer."""
        with TestClient(app) as client:
            resp = client.get("/api/v1/auth/verify")
            assert resp.status_code == 401
            assert resp.json()["detail"] == "Missing auth token"

    def test_auth_verify_with_valid_token(self):
        with TestClient(app) as client:
            resp = client.get(
                "/api/v1/auth/verify",
                headers={"Authorization": "Bearer test-secret-token"},
            )
            assert resp.status_code == 200
            assert resp.json() == {"status": "ok"}

    def test_auth_verify_with_invalid_token(self):
        with TestClient(app) as client:
            resp = client.get(
                "/api/v1/auth/verify",
                headers={"Authorization": "Bearer wrong-token"},
            )
            assert resp.status_code == 401
            assert resp.json()["detail"] == "Invalid auth token"

    def test_protected_endpoint_no_token_401(self):
        with TestClient(app) as client:
            resp = client.get("/api/v1/dashboard")
            assert resp.status_code == 401
            assert resp.json()["detail"] == "Missing auth token"

    def test_protected_endpoint_wrong_token_401(self):
        with TestClient(app) as client:
            resp = client.get(
                "/api/v1/dashboard",
                headers={"Authorization": "Bearer wrong-token"},
            )
            assert resp.status_code == 401
            assert resp.json()["detail"] == "Invalid auth token"

    def test_protected_endpoint_valid_token_passes(self):
        with TestClient(app) as client:
            resp = client.get(
                "/api/v1/dashboard",
                headers={"Authorization": "Bearer test-secret-token"},
            )
            # Should not be 401
            assert resp.status_code != 401

    def test_sessions_no_token_401(self):
        with TestClient(app) as client:
            resp = client.get("/api/v1/sessions")
            assert resp.status_code == 401

    def test_sessions_valid_token_passes(self):
        with TestClient(app) as client:
            resp = client.get(
                "/api/v1/sessions",
                headers={"Authorization": "Bearer test-secret-token"},
            )
            assert resp.status_code != 401

    def test_agents_no_token_401(self):
        with TestClient(app) as client:
            resp = client.get("/api/v2/agents")
            assert resp.status_code == 401

    def test_agents_valid_token_passes(self):
        with TestClient(app) as client:
            resp = client.get(
                "/api/v2/agents",
                headers={"Authorization": "Bearer test-secret-token"},
            )
            assert resp.status_code != 401
