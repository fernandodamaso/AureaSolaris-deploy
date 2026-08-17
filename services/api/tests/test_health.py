from __future__ import annotations

from fastapi.testclient import TestClient

from aurea_api.config import Settings
from aurea_api.dependencies import (
    ReadinessProbe,
    get_database_readiness,
    get_engine_readiness,
)
from aurea_api.main import create_app


class StubReadinessProbe:
    def __init__(self, ready: bool) -> None:
        self.ready = ready
        self.calls = 0

    async def __call__(self) -> bool:
        self.calls += 1
        return self.ready


def inject_readiness(
    app_settings: Settings,
    database_probe: ReadinessProbe,
    engine_probe: ReadinessProbe,
) -> TestClient:
    app = create_app(app_settings)
    app.dependency_overrides[get_database_readiness] = lambda: database_probe
    app.dependency_overrides[get_engine_readiness] = lambda: engine_probe
    return TestClient(app)


def test_health_returns_exact_ok_payload(api_settings: Settings) -> None:
    with TestClient(create_app(api_settings)) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_succeeds_when_both_injected_probes_are_ready(api_settings: Settings) -> None:
    database_probe = StubReadinessProbe(True)
    engine_probe = StubReadinessProbe(True)

    with inject_readiness(api_settings, database_probe, engine_probe) as client:
        response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert database_probe.calls == 1
    assert engine_probe.calls == 1


def test_ready_returns_safe_problem_when_an_injected_probe_is_not_ready(
    api_settings: Settings,
) -> None:
    database_probe = StubReadinessProbe(False)
    engine_probe = StubReadinessProbe(True)

    with inject_readiness(api_settings, database_probe, engine_probe) as client:
        response = client.get("/ready")

    payload = response.json()
    assert response.status_code == 503
    assert payload["code"] == "service_not_ready"
    assert payload["message"] == "Service is not ready."
    assert payload["request_id"] == response.headers["X-Request-ID"]
    assert "fields" not in payload
    assert database_probe.calls == 1
    assert engine_probe.calls == 1


def test_ready_fails_closed_until_readiness_probes_are_injected(api_settings: Settings) -> None:
    with TestClient(create_app(api_settings)) as client:
        response = client.get("/ready")

    assert response.status_code == 503
    assert response.json()["code"] == "service_not_ready"
