from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_uses_standard_envelope() -> None:
    client = TestClient(app)

    response = client.get("/health", headers={"x-trace-id": "test-trace"})

    assert response.status_code == 200
    assert response.headers["x-trace-id"] == "test-trace"
    assert response.json() == {
        "success": True,
        "data": {"status": "ok", "service": "Travel Service API"},
        "meta": {"trace_id": "test-trace"},
    }


def test_missing_route_uses_standard_error_envelope() -> None:
    client = TestClient(app)

    response = client.get("/__missing__", headers={"x-trace-id": "missing-trace"})

    assert response.status_code == 404
    assert response.headers["x-trace-id"] == "missing-trace"
    assert response.json() == {
        "success": False,
        "error": {
            "error_code": "HTTP_ERROR",
            "message": "Not Found",
            "field_errors": {},
            "trace_id": "missing-trace",
        },
    }


def test_cors_preflight_allows_frontend_origin() -> None:
    client = TestClient(app)

    response = client.options(
        "/api/v1/auth/register",
        headers={
            "origin": "http://127.0.0.1:5173",
            "access-control-request-method": "POST",
            "access-control-request-headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
    assert "POST" in response.headers["access-control-allow-methods"]
