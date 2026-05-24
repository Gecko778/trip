#!/usr/bin/env python3
import os
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://trip:trip@127.0.0.1:5432/trip")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.seed import CHINA_INBOUND_MARKET_ID, DEMO_PASSWORD, SHANGHAI_REGION_ID, seed_demo  # noqa: E402


def expect(response, status_code: int = 200) -> dict:
    if response.status_code != status_code:
        raise AssertionError(f"{response.request.method} {response.request.url} -> {response.status_code}: {response.text}")
    payload = response.json()
    if not payload.get("success"):
        raise AssertionError(f"Unexpected envelope: {payload}")
    return payload["data"]


def login(client: TestClient, identifier: str) -> tuple[dict, dict[str, str]]:
    auth = expect(
        client.post(
            "/api/v1/auth/login",
            json={"provider": "email", "identifier": identifier, "password": DEMO_PASSWORD},
        )
    )
    headers = {"Authorization": f"Bearer {auth['tokens']['access_token']}"}
    return auth["user"], headers


def main() -> None:
    seed_demo()
    client = TestClient(app)
    traveler, traveler_headers = login(client, "traveler1@trip.local")
    guide, guide_headers = login(client, "guide1@trip.local")

    markets = expect(client.get("/api/v1/markets", headers=traveler_headers))
    assert markets[0]["id"] == CHINA_INBOUND_MARKET_ID

    start_date = date.today() + timedelta(days=45)
    end_date = start_date + timedelta(days=2)
    plan = expect(
        client.post(
            f"/api/v1/markets/{CHINA_INBOUND_MARKET_ID}/travel-plans",
            headers=traveler_headers,
            json={
                "country_code": "CN",
                "arrival_date": start_date.isoformat(),
                "arrival_region_id": SHANGHAI_REGION_ID,
                "needs_pickup": True,
                "traveler_count": 2,
                "budget_min_amount": "3000",
                "budget_max_amount": "5000",
                "budget_currency": "CNY",
                "visibility": "guides_only",
                "title": "E2E Shanghai -> Hangzhou demo",
                "notes": "Created by scripts/e2e_smoke.py",
            },
        )
    )
    expect(client.post(f"/api/v1/travel-plans/{plan['id']}/publish", headers=traveler_headers))

    guides = expect(client.get(f"/api/v1/markets/{CHINA_INBOUND_MARKET_ID}/guides", headers=traveler_headers))
    assert guides, "expected seeded guides"
    guide_user_id = guide["id"]
    assert guide_user_id == guides[0]["user_id"] or any(item["user_id"] == guide_user_id for item in guides)

    thread = expect(
        client.post(
            f"/api/v1/markets/{CHINA_INBOUND_MARKET_ID}/message-threads",
            headers=traveler_headers,
            json={"recipient_user_id": guide_user_id, "travel_plan_id": plan["id"]},
        )
    )
    expect(
        client.post(
            f"/api/v1/message-threads/{thread['id']}/messages",
            headers=traveler_headers,
            json={"body": "Hello, can you support this route?"},
        )
    )

    order = expect(
        client.post(
            f"/api/v1/markets/{CHINA_INBOUND_MARKET_ID}/orders",
            headers=traveler_headers,
            json={
                "guide_user_id": guide_user_id,
                "travel_plan_id": plan["id"],
                "message_thread_id": thread["id"],
                "guide_price_amount": "1200",
                "guide_price_currency": "CNY",
                "service_start_date": start_date.isoformat(),
                "service_end_date": end_date.isoformat(),
                "service_region_id": SHANGHAI_REGION_ID,
                "needs_pickup": True,
                "traveler_count": 2,
                "itinerary_json": {"route": "E2E Shanghai -> Hangzhou demo"},
                "cancellation_policy": "Free cancellation until 24 hours before service.",
                "breach_responsibility": "No-show or breach will be recorded in reputation history.",
            },
        )
    )
    order = expect(client.post(f"/api/v1/orders/{order['id']}/traveler-confirm", headers=traveler_headers))
    assert order["traveler_price_confirmed_at"]
    order = expect(client.post(f"/api/v1/orders/{order['id']}/guide-confirm", headers=guide_headers))
    assert order["status"] == "pending_agreement"

    agreement = expect(client.post(f"/api/v1/orders/{order['id']}/agreement/sign", headers=traveler_headers))
    assert agreement["traveler_signed_at"]
    agreement = expect(client.post(f"/api/v1/orders/{order['id']}/agreement/sign", headers=guide_headers))
    assert agreement["status"] == "signed"
    final_order = expect(client.get(f"/api/v1/orders/{order['id']}", headers=traveler_headers))
    assert final_order["status"] == "confirmed"

    print("E2E smoke passed: login -> plan -> guide -> chat -> order -> agreement")


if __name__ == "__main__":
    main()
