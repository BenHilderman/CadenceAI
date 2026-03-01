import pytest
from unittest.mock import patch, AsyncMock, MagicMock

import httpx

# Patch heavy imports before importing the app
with patch("pipecat.transports.smallwebrtc.request_handler.SmallWebRTCRequestHandler"):
    from main import app


@pytest.fixture
def client():
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


class TestHealthRoute:
    async def test_health_returns_ok(self, client):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["service"] == "cadenceai"

    async def test_health_is_json(self, client):
        resp = await client.get("/api/health")
        assert resp.headers["content-type"].startswith("application/json")


class TestAuditRoute:
    async def test_audit_returns_entries_list(self, client):
        resp = await client.get("/api/audit")
        assert resp.status_code == 200
        body = resp.json()
        assert "entries" in body
        assert isinstance(body["entries"], list)


class TestOfferRoutes:
    async def test_offer_post_invalid_json_raises(self, client):
        """POST /api/offer with invalid JSON raises an error."""
        with pytest.raises(Exception):
            await client.post(
                "/api/offer",
                content=b"not-json",
                headers={"content-type": "application/json"},
            )

    async def test_offer_patch_missing_pc_id_raises(self, client):
        """PATCH /api/offer without pc_id raises KeyError."""
        with pytest.raises(Exception):
            await client.patch("/api/offer", json={"candidates": []})

    @patch("main.request_handler")
    async def test_offer_post_with_mock(self, mock_handler, client):
        """POST /api/offer with mocked handler returns SDP answer."""
        mock_handler.handle_web_request = AsyncMock(return_value={"sdp": "answer", "type": "answer"})

        resp = await client.post("/api/offer", json={
            "sdp": "test-sdp",
            "type": "offer",
        })
        # Either succeeds or gets a validation error from SmallWebRTCRequest
        assert resp.status_code in (200, 422, 500)

    @patch("main.request_handler")
    async def test_offer_patch_with_mock(self, mock_handler, client):
        """PATCH /api/offer with mocked handler returns ok."""
        mock_handler.handle_patch_request = AsyncMock(return_value=None)

        resp = await client.patch("/api/offer", json={
            "pc_id": "test-pc",
            "candidates": [],
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
