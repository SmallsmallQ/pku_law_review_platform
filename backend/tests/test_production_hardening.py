import asyncio

import httpx
from pydantic import ValidationError

from app.config import Settings
from app.main import app


def _request(method: str, path: str) -> httpx.Response:
    async def _run() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.request(method, path)

    return asyncio.run(_run())


def test_production_requires_postgres():
    try:
        Settings(
            _env_file=None,
            environment="production",
            debug=False,
            database_url="sqlite:///./law_review.db",
            secret_key="not-default",
        )
        assert False, "production with sqlite should fail"
    except ValidationError as exc:
        assert "PostgreSQL" in str(exc)


def test_production_rejects_default_secret():
    try:
        Settings(
            _env_file=None,
            environment="production",
            debug=False,
            database_url="postgresql://user:pass@localhost:5432/law_review",
        )
        assert False, "production with default secret should fail"
    except ValidationError as exc:
        assert "SECRET_KEY" in str(exc)


def test_http_errors_are_normalized():
    response = _request("GET", "/api/v1/manuscripts/my")
    payload = response.json()

    assert response.status_code == 401
    assert payload["success"] is False
    assert payload["error"]["code"] == "http_401"
    assert payload["detail"] == "未登录或登录已过期"
    assert payload["path"] == "/api/v1/manuscripts/my"
    assert payload["request_id"]


def test_not_found_errors_are_normalized():
    response = _request("GET", "/not-found")
    payload = response.json()

    assert response.status_code == 404
    assert payload["success"] is False
    assert payload["error"]["code"] == "http_404"
    assert payload["detail"] == "资源不存在"
    assert payload["path"] == "/not-found"


def test_readiness_endpoint_exposes_checks():
    response = _request("GET", "/health/ready")
    payload = response.json()

    assert response.status_code in {200, 503}
    assert "checks" in payload
    assert "database" in payload["checks"]
    assert "storage" in payload["checks"]
