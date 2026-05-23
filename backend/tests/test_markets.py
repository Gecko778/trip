from uuid import UUID

from fastapi.testclient import TestClient

from app.api import markets as markets_api
from app.main import app

MARKET_ID = UUID("00000000-0000-0000-0000-000000000100")


def test_list_markets_uses_standard_envelope(monkeypatch) -> None:
    def fake_list_markets(_session):
        return [{"id": MARKET_ID, "code": "china_inbound", "name": "China Inbound Travel"}]

    monkeypatch.setattr(markets_api.market_repository, "list_markets", fake_list_markets)

    client = TestClient(app)
    response = client.get("/api/v1/markets", headers={"x-trace-id": "markets-trace"})

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": [
            {
                "id": str(MARKET_ID),
                "code": "china_inbound",
                "name": "China Inbound Travel",
            }
        ],
        "meta": {"trace_id": "markets-trace"},
    }


def test_get_missing_market_uses_standard_error(monkeypatch) -> None:
    def fake_get_market(_session, _market_id):
        return None

    monkeypatch.setattr(markets_api.market_repository, "get_market", fake_get_market)

    client = TestClient(app)
    response = client.get(f"/api/v1/markets/{MARKET_ID}", headers={"x-trace-id": "missing-market"})

    assert response.status_code == 404
    assert response.json() == {
        "success": False,
        "error": {
            "error_code": "HTTP_ERROR",
            "message": "Market not found",
            "field_errors": {},
            "trace_id": "missing-market",
        },
    }
