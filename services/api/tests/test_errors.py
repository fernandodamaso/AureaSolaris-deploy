from __future__ import annotations

import json
import logging
from typing import Annotated
from uuid import UUID

import pytest
from fastapi import Query
from fastapi.testclient import TestClient

from aurea_api.config import Settings
from aurea_api.main import create_app


def test_request_id_is_generated_when_missing(api_settings: Settings) -> None:
    with TestClient(create_app(api_settings)) as client:
        response = client.get("/health")

    request_id = response.headers["X-Request-ID"]
    assert str(UUID(request_id)) == request_id


def test_valid_request_id_is_preserved(api_settings: Settings) -> None:
    request_id = "client-request-123"

    with TestClient(create_app(api_settings)) as client:
        response = client.get("/health", headers={"X-Request-ID": request_id})

    assert response.headers["X-Request-ID"] == request_id


def test_cors_allows_only_configured_origins(api_settings: Settings) -> None:
    app = create_app(api_settings)
    preflight_headers = {
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type,x-request-id",
    }

    with TestClient(app) as client:
        allowed = client.options(
            "/health",
            headers={"Origin": "https://web.example.test", **preflight_headers},
        )
        denied = client.options(
            "/health",
            headers={"Origin": "https://attacker.example.test", **preflight_headers},
        )

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "https://web.example.test"
    assert "*" not in allowed.headers["access-control-allow-origin"]
    assert "access-control-allow-credentials" not in allowed.headers
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers


def test_validation_errors_use_safe_problem_shape(api_settings: Settings) -> None:
    app = create_app(api_settings)

    @app.get("/_test/validation")
    async def validation_endpoint(limit: Annotated[int, Query(gt=0)]) -> dict[str, int]:
        return {"limit": limit}

    secret_input = "sensitive-validation-input"
    with TestClient(app) as client:
        response = client.get(f"/_test/validation?limit={secret_input}")

    payload = response.json()
    assert response.status_code == 422
    assert payload["code"] == "validation_error"
    assert payload["message"] == "Request validation failed."
    assert payload["request_id"] == response.headers["X-Request-ID"]
    assert payload["fields"][0]["location"] == ["query", "limit"]
    assert payload["fields"][0]["type"] == "int_parsing"
    assert secret_input not in response.text


def test_unhandled_errors_are_sanitized(api_settings: Settings) -> None:
    app = create_app(api_settings)
    secret_marker = "sensitive-unhandled-marker"

    @app.get("/_test/error")
    async def error_endpoint() -> None:
        raise RuntimeError(secret_marker)

    with TestClient(app) as client:
        response = client.get("/_test/error")

    payload = response.json()
    assert response.status_code == 500
    assert payload["code"] == "internal_error"
    assert payload["message"] == "Internal server error."
    assert payload["request_id"] == response.headers["X-Request-ID"]
    assert "fields" not in payload
    assert secret_marker not in response.text


def test_structured_request_log_excludes_authorization_and_body(
    api_settings: Settings,
    caplog: pytest.LogCaptureFixture,
) -> None:
    app = create_app(api_settings)

    @app.post("/_test/logging")
    async def logging_endpoint(payload: dict[str, str]) -> dict[str, str]:
        return {"status": "ok"}

    authorization_marker = "Bearer sensitive-authorization-marker"
    body_marker = "sensitive-request-body-marker"
    caplog.set_level(logging.INFO, logger="aurea_api.request")

    with TestClient(app) as client:
        response = client.post(
            "/_test/logging",
            headers={"Authorization": authorization_marker},
            json={"private": body_marker},
        )

    request_records = [record for record in caplog.records if record.name == "aurea_api.request"]
    assert response.status_code == 200
    assert len(request_records) == 1

    raw_log = request_records[0].getMessage()
    event = json.loads(raw_log)
    assert event["route"] == "/_test/logging"
    assert event["status"] == 200
    assert event["method"] == "POST"
    assert event["request_id"] == response.headers["X-Request-ID"]
    assert isinstance(event["duration_ms"], float)
    assert event["duration_ms"] >= 0
    assert authorization_marker not in raw_log
    assert body_marker not in raw_log
    assert "authorization" not in raw_log.lower()
