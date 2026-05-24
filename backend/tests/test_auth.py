from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token, decode_token, hash_password, verify_password
from app.main import app


def test_password_hash_verifies() -> None:
    hashed_password = hash_password("correct-password")

    assert verify_password("correct-password", hashed_password)
    assert not verify_password("wrong-password", hashed_password)


def test_access_token_cannot_be_used_as_refresh_token() -> None:
    token = create_access_token("00000000-0000-0000-0000-000000000001")

    assert decode_token(token, expected_type="refresh") is None


def test_auth_me_requires_bearer_token() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/auth/me", headers={"x-trace-id": "auth-missing"})

    assert response.status_code == 401
    assert response.json() == {
        "success": False,
        "error": {
            "error_code": "HTTP_ERROR",
            "message": "Missing bearer token",
            "field_errors": {},
            "trace_id": "auth-missing",
        },
    }


def test_oauth_login_reports_missing_provider_ids() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/auth/oauth/login",
        json={"provider": "google", "id_token": "provider-token"},
        headers={"x-trace-id": "oauth-contract"},
    )

    assert response.status_code == 500
    assert response.json()["error"]["message"] == (
        "未填写Google/Apple Id, bundle id，到 /Users/gecko/trip/.env 内填写完整id"
    )


def test_oauth_login_requires_provider_verification_when_ids_are_configured(monkeypatch) -> None:
    monkeypatch.setattr(settings, "google_oauth_client_id", "test-google-client-id")
    client = TestClient(app)

    response = client.post(
        "/api/v1/auth/oauth/login",
        json={"provider": "google", "id_token": "provider-token"},
        headers={"x-trace-id": "oauth-configured"},
    )

    assert response.status_code == 501
    assert response.json()["error"]["message"] == (
        "google login requires provider token verification configuration"
    )


def test_admin_invitation_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/admin/invitations",
        json={"email": "reviewer@example.com", "role_code": "support_agent"},
        headers={"x-trace-id": "invite-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_role_switch_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/me/role-switch",
        json={"role": "guide"},
        headers={"x-trace-id": "switch-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_user_role_assignment_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/users/00000000-0000-0000-0000-000000000001/roles",
        json={"role_code": "viewer"},
        headers={"x-trace-id": "assign-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_market_config_write_requires_authentication() -> None:
    client = TestClient(app)

    response = client.patch(
        "/api/v1/markets/00000000-0000-0000-0000-000000000100/config",
        json={"config_json": {"smoke": "blocked"}},
        headers={"x-trace-id": "market-write-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_user_update_requires_authentication() -> None:
    client = TestClient(app)

    response = client.patch(
        "/api/v1/users/00000000-0000-0000-0000-000000000001",
        json={"display_name": "Blocked"},
        headers={"x-trace-id": "user-update-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_region_create_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/markets/00000000-0000-0000-0000-000000000100/regions",
        json={"type": "city", "country_code": "CN", "code": "TST", "name": "Test City"},
        headers={"x-trace-id": "region-create-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_me_profiles_requires_authentication() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/me/profiles", headers={"x-trace-id": "profiles-no-auth"})

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_traveler_profile_create_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/me/traveler-profile",
        json={"market_id": "00000000-0000-0000-0000-000000000100"},
        headers={"x-trace-id": "traveler-create-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_guide_profile_create_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/me/guide-profile",
        json={
            "market_id": "00000000-0000-0000-0000-000000000100",
            "country_code": "CN",
            "home_region_id": "00000000-0000-0000-0000-000000000201",
            "daily_price_amount": "1000",
            "quote_currency": "CNY",
        },
        headers={"x-trace-id": "guide-create-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_guide_verification_review_requires_authentication() -> None:
    client = TestClient(app)

    response = client.patch(
        "/api/v1/guides/00000000-0000-0000-0000-000000000001/verification/"
        "00000000-0000-0000-0000-000000000002",
        json={"status": "approved"},
        headers={"x-trace-id": "verification-review-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_travel_plan_create_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/markets/00000000-0000-0000-0000-000000000100/travel-plans",
        json={
            "country_code": "CN",
            "arrival_date": "2026-06-01",
            "traveler_count": 2,
        },
        headers={"x-trace-id": "plan-create-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_route_node_create_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/travel-plans/00000000-0000-0000-0000-000000000001/route-nodes",
        json={"sequence": 1},
        headers={"x-trace-id": "route-node-create-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_message_thread_create_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/markets/00000000-0000-0000-0000-000000000100/message-threads",
        json={"recipient_user_id": "00000000-0000-0000-0000-000000000001"},
        headers={"x-trace-id": "thread-create-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_message_send_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/message-threads/00000000-0000-0000-0000-000000000001/messages",
        json={"body": "hello"},
        headers={"x-trace-id": "message-send-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_follow_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/users/00000000-0000-0000-0000-000000000001/follow",
        headers={"x-trace-id": "follow-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_block_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/users/00000000-0000-0000-0000-000000000001/block",
        json={},
        headers={"x-trace-id": "block-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_order_create_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/markets/00000000-0000-0000-0000-000000000100/orders",
        json={
            "guide_user_id": "00000000-0000-0000-0000-000000000002",
            "guide_price_amount": "1000.00",
            "guide_price_currency": "CNY",
            "service_start_date": "2026-06-01",
            "cancellation_policy": "Cancel before service start.",
            "breach_responsibility": "Each party is responsible for confirmed obligations.",
        },
        headers={"x-trace-id": "order-create-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_order_agreement_sign_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/orders/00000000-0000-0000-0000-000000000001/agreement/sign",
        headers={"x-trace-id": "agreement-sign-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_order_review_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/orders/00000000-0000-0000-0000-000000000001/reviews",
        json={"rating": "5", "body": "Great service."},
        headers={"x-trace-id": "order-review-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_notifications_require_authentication() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/me/notifications", headers={"x-trace-id": "notifications-no-auth"})

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_commission_policy_create_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/markets/00000000-0000-0000-0000-000000000100/commission-policies/percentage",
        json={"commission_rate": "0.10"},
        headers={"x-trace-id": "commission-policy-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_payment_placeholder_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/orders/00000000-0000-0000-0000-000000000001/payment-records/placeholder",
        json={},
        headers={"x-trace-id": "payment-placeholder-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_payout_account_create_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/markets/00000000-0000-0000-0000-000000000100/me/payout-accounts",
        json={"account_type": "manual", "country_code": "CN", "currency_code": "CNY"},
        headers={"x-trace-id": "payout-account-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_dispute_create_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/orders/00000000-0000-0000-0000-000000000001/disputes",
        json={"dispute_type": "service_issue"},
        headers={"x-trace-id": "dispute-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"


def test_admin_order_list_requires_authentication() -> None:
    client = TestClient(app)

    response = client.get(
        "/api/v1/admin/markets/00000000-0000-0000-0000-000000000100/orders",
        headers={"x-trace-id": "admin-orders-no-auth"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Missing bearer token"
