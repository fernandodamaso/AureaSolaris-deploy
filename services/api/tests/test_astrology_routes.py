from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from jwt import PyJWK
from jwt.algorithms import RSAAlgorithm

from aurea_api.api.auth import TokenVerifier
from aurea_api.config import Settings
from aurea_api.domain.astrology.service import (
    BirthProfileRequiredError,
    CalculationUnavailableError,
    ReceiptNotFoundError,
)
from aurea_api.infrastructure.db import CalculationReceiptRecord
from aurea_api.main import create_app

_KEY_ID = "astrology-route-test-key"
_ISSUER = "https://example.supabase.co/auth/v1"
_NOW = datetime(2026, 8, 20, tzinfo=UTC)
_USER_A = UUID("00000000-0000-0000-0000-000000000001")
_USER_B = UUID("00000000-0000-0000-0000-000000000002")


class StaticJwkClient:
    def __init__(self, signing_key: PyJWK) -> None:
        self._signing_key = signing_key

    def get_signing_key(self, kid: str) -> PyJWK:
        assert kid == _KEY_ID
        return self._signing_key


class FakeAstrologyService:
    def __init__(self, record: CalculationReceiptRecord) -> None:
        self.record = record
        self.calls: list[tuple[str, UUID, bool]] = []

    async def natal(self, user_id: UUID, *, force: bool = False) -> CalculationReceiptRecord:
        self.calls.append(("natal", user_id, force))
        return self.record

    async def transits(
        self, user_id: UUID, as_of: datetime, *, force: bool = False
    ) -> CalculationReceiptRecord:
        self.calls.append(("transit", user_id, force))
        return self.record

    async def get_receipt(self, user_id: UUID, receipt_id: UUID) -> CalculationReceiptRecord:
        if user_id != _USER_A:
            raise ReceiptNotFoundError
        return self.record


def _record() -> CalculationReceiptRecord:
    receipt_id = UUID("00000000-0000-0000-0000-000000000100")
    return CalculationReceiptRecord(
        id=receipt_id,
        birth_profile_id=UUID("00000000-0000-0000-0000-000000000010"),
        kind="natal",
        input_hash="a" * 64,
        schema_version="calculation-receipt.v1",
        input_payload={"kind": "natal"},
        result_payload={"planets": {}},
        engine_name="test-engine",
        engine_version="test-version",
        ephemeris_version="test-ephemeris",
        resolved_at=_NOW,
        resolved_timezone="UTC",
        created_at=_NOW,
    )


def _public_jwk(private_key: rsa.RSAPrivateKey) -> PyJWK:
    jwk_data = RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    assert isinstance(jwk_data, dict)
    jwk_data.update({"alg": "RS256", "kid": _KEY_ID, "use": "sig"})
    return PyJWK.from_dict(jwk_data)


def _token(private_key: rsa.RSAPrivateKey, subject: UUID) -> str:
    return jwt.encode(
        {
            "iss": _ISSUER,
            "aud": "authenticated",
            "exp": int(datetime.now(UTC).timestamp()) + 300,
            "sub": str(subject),
        },
        private_key,
        algorithm="RS256",
        headers={"alg": "RS256", "kid": _KEY_ID, "typ": "JWT"},
    )


@pytest.fixture
def route_client(
    api_settings: Settings,
) -> tuple[TestClient, dict[str, str], dict[str, str], FakeAstrologyService]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    app = create_app(api_settings)
    app.state.token_verifier = TokenVerifier(
        api_settings,
        jwk_client=StaticJwkClient(_public_jwk(private_key)),
    )
    service = FakeAstrologyService(_record())
    app.state.astrology_service = service
    client = TestClient(app)
    return (
        client,
        {"Authorization": f"Bearer {_token(private_key, _USER_A)}"},
        {"Authorization": f"Bearer {_token(private_key, _USER_B)}"},
        service,
    )


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("POST", "/v1/astrology/natal", None),
        ("POST", "/v1/astrology/transits", {"as_of": "2026-08-20T15:00:00Z"}),
        ("GET", "/v1/astrology/receipts/00000000-0000-0000-0000-000000000100", None),
    ],
)
def test_astrology_routes_require_authentication(
    route_client: tuple[TestClient, dict[str, str], dict[str, str], FakeAstrologyService],
    method: str,
    path: str,
    payload: dict[str, object] | None,
) -> None:
    client, _, _, _ = route_client
    kwargs = {} if payload is None else {"json": payload}
    response = client.request(method, path, **kwargs)
    assert response.status_code == 401


def test_natal_route_supports_force_and_returns_receipt(route_client: tuple[object, ...]) -> None:
    client, headers_a, _, service = route_client
    response = client.post("/v1/astrology/natal", headers=headers_a, json={"force": True})

    assert response.status_code == 200
    assert response.json()["input_hash"] == "a" * 64
    assert service.calls == [("natal", _USER_A, True)]


def test_transit_route_rejects_naive_datetime(route_client: tuple[object, ...]) -> None:
    client, headers_a, _, service = route_client
    response = client.post(
        "/v1/astrology/transits",
        headers=headers_a,
        json={"as_of": "2026-08-20T15:00:00"},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert service.calls == []


def test_stable_problems_cover_missing_profile_and_engine_unavailable(
    route_client: tuple[object, ...],
) -> None:
    client, headers_a, _, service = route_client

    async def missing_profile(user_id: UUID, *, force: bool = False) -> CalculationReceiptRecord:
        raise BirthProfileRequiredError

    service.natal = missing_profile  # type: ignore[method-assign]
    missing = client.post("/v1/astrology/natal", headers=headers_a, json={})
    assert missing.status_code == 404
    assert missing.json()["code"] == "birth_profile_required"

    async def unavailable(user_id: UUID, *, force: bool = False) -> CalculationReceiptRecord:
        raise CalculationUnavailableError

    service.natal = unavailable  # type: ignore[method-assign]
    unavailable_response = client.post("/v1/astrology/natal", headers=headers_a, json={})
    assert unavailable_response.status_code == 503
    assert unavailable_response.json()["code"] == "calculation_unavailable"


def test_receipt_lookup_is_owner_scoped(route_client: tuple[object, ...]) -> None:
    client, _, headers_b, _ = route_client
    response = client.get(
        "/v1/astrology/receipts/00000000-0000-0000-0000-000000000100",
        headers=headers_b,
    )

    assert response.status_code == 404
    assert response.json()["code"] == "receipt_not_found"
