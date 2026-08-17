from __future__ import annotations

import json
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from threading import Barrier, Lock
from time import sleep
from typing import Annotated
from uuid import UUID, uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jwt import PyJWK, PyJWKClient
from jwt.algorithms import RSAAlgorithm
from jwt.utils import base64url_encode

from aurea_api.api.auth import (
    AuthenticatedUser,
    InvalidTokenError,
    TokenVerifier,
    get_authenticated_user,
)
from aurea_api.config import Settings
from aurea_api.main import create_app

_KEY_ID = "test-signing-key"
_ISSUER = "https://example.supabase.co/auth/v1"


class StaticJwkClient:
    def __init__(self, signing_key: PyJWK) -> None:
        self.signing_key = signing_key
        self.requested_kids: list[str] = []

    def get_signing_key(self, kid: str) -> PyJWK:
        self.requested_kids.append(kid)
        return self.signing_key


def _claims(*, subject: UUID | str | None = None, **overrides: object) -> dict[str, object]:
    claims: dict[str, object] = {
        "iss": _ISSUER,
        "aud": "authenticated",
        "exp": int(datetime.now(UTC).timestamp()) + 300,
        "sub": str(subject if subject is not None else uuid4()),
        "email": "person@example.test",
    }
    claims.update(overrides)
    return claims


def _sign(
    private_key: rsa.RSAPrivateKey,
    claims: dict[str, object],
    *,
    kid: str = _KEY_ID,
) -> str:
    return jwt.encode(
        claims,
        private_key,
        algorithm="RS256",
        headers={"alg": "RS256", "kid": kid, "typ": "JWT"},
    )


def _none_token(claims: dict[str, object]) -> str:
    header = base64url_encode(
        json.dumps({"alg": "none", "kid": _KEY_ID, "typ": "JWT"}).encode()
    ).decode()
    payload = base64url_encode(json.dumps(claims).encode()).decode()
    return f"{header}.{payload}."


def _public_jwk(private_key: rsa.RSAPrivateKey, *, kid: str = _KEY_ID) -> dict[str, object]:
    jwk_data = RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    assert isinstance(jwk_data, dict)
    jwk_data.update({"alg": "RS256", "kid": kid, "use": "sig"})
    return jwk_data


def _install_jwks_fetch_stub(
    monkeypatch: pytest.MonkeyPatch,
    jwks: list[dict[str, object]],
) -> list[str]:
    fetches: list[str] = []

    def fetch_data(client: PyJWKClient) -> dict[str, object]:
        fetches.append(client.uri)
        payload: dict[str, object] = {"keys": list(jwks)}
        if client.jwk_set_cache is not None:
            client.jwk_set_cache.put(payload)
        return payload

    monkeypatch.setattr(PyJWKClient, "fetch_data", fetch_data)
    return fetches


@pytest.fixture
def signing_material() -> tuple[rsa.RSAPrivateKey, PyJWK]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, PyJWK.from_dict(_public_jwk(private_key))


def _private_app(settings: Settings, verifier: TokenVerifier) -> FastAPI:
    app = create_app(settings)
    app.state.token_verifier = verifier

    @app.get("/_test/private")
    def private_endpoint(
        user: Annotated[AuthenticatedUser, Depends(get_authenticated_user)],
    ) -> dict[str, str | None]:
        return {"subject": str(user.subject), "email": user.email}

    return app


def _assert_unauthorized(response: object, *, secret: str | None = None) -> None:
    assert hasattr(response, "status_code")
    assert hasattr(response, "headers")
    assert hasattr(response, "json")
    assert hasattr(response, "text")
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
    payload = response.json()
    assert payload["code"] == "unauthorized"
    assert payload["message"] == "Authentication required."
    assert payload["request_id"] == response.headers["X-Request-ID"]
    assert "fields" not in payload
    if secret is not None:
        assert secret not in response.text


def test_auth_module_contract_uses_api_package_boundary() -> None:
    api_package = Path(__file__).resolve().parents[1] / "src" / "aurea_api" / "api"

    assert (api_package / "__init__.py").is_file()
    assert (api_package / "auth.py").is_file()


def test_token_verifier_derives_jwks_url_and_uses_ttl_jwks_cache_without_key_cache(
    api_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    class CapturingPyJWKClient:
        def __init__(self, uri: str, **kwargs: object) -> None:
            captured["uri"] = uri
            captured.update(kwargs)

    monkeypatch.setattr("aurea_api.api.auth.PyJWKClient", CapturingPyJWKClient)

    verifier = TokenVerifier(api_settings)

    assert verifier.issuer == _ISSUER
    assert verifier.jwks_url == f"{_ISSUER}/.well-known/jwks.json"
    assert captured == {
        "uri": f"{_ISSUER}/.well-known/jwks.json",
        "cache_keys": False,
        "cache_jwk_set": True,
        "lifespan": 600,
        "timeout": 5,
    }


def test_unknown_kids_do_not_force_repeated_jwks_fetches_inside_refresh_cooldown(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    private_key, _ = signing_material
    jwks = [_public_jwk(private_key)]
    fetches = _install_jwks_fetch_stub(monkeypatch, jwks)
    verifier = TokenVerifier(api_settings)

    verifier.verify(_sign(private_key, _claims()))
    for kid in ("unknown-key-1", "unknown-key-2", "unknown-key-3"):
        with pytest.raises(InvalidTokenError):
            verifier.verify(_sign(private_key, _claims(), kid=kid))

    assert fetches == [verifier.jwks_url, verifier.jwks_url]


def test_cold_cache_unknown_kid_burst_has_bounded_jwks_fetches(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    private_key, _ = signing_material
    jwks = [_public_jwk(private_key)]
    worker_count = 8
    start = Barrier(worker_count)
    fetches: list[str] = []
    fetch_lock = Lock()

    def fetch_data(client: PyJWKClient) -> dict[str, object]:
        with fetch_lock:
            fetches.append(client.uri)
        sleep(0.05)
        payload: dict[str, object] = {"keys": list(jwks)}
        if client.jwk_set_cache is not None:
            client.jwk_set_cache.put(payload)
        return payload

    monkeypatch.setattr(PyJWKClient, "fetch_data", fetch_data)
    verifier = TokenVerifier(api_settings)
    tokens = [
        _sign(private_key, _claims(), kid=f"cold-unknown-key-{index}")
        for index in range(worker_count)
    ]

    def verify_unknown(token: str) -> None:
        start.wait(timeout=5)
        with pytest.raises(InvalidTokenError):
            verifier.verify(token)

    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        futures = [executor.submit(verify_unknown, token) for token in tokens]
        for future in futures:
            future.result(timeout=5)

    assert len(fetches) <= 2
    assert all(uri == verifier.jwks_url for uri in fetches)


def test_key_rotation_can_refresh_after_unknown_kid_cooldown(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    private_key, _ = signing_material
    rotated_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    rotated_kid = "rotated-signing-key"
    rotated_subject = uuid4()
    jwks = [_public_jwk(private_key)]
    fetches = _install_jwks_fetch_stub(monkeypatch, jwks)
    now = [1_000.0]
    verifier = TokenVerifier(api_settings, clock=lambda: now[0])
    rotated_token = _sign(
        rotated_private_key,
        _claims(subject=rotated_subject),
        kid=rotated_kid,
    )

    verifier.verify(_sign(private_key, _claims()))
    with pytest.raises(InvalidTokenError):
        verifier.verify(rotated_token)

    jwks.append(_public_jwk(rotated_private_key, kid=rotated_kid))
    with pytest.raises(InvalidTokenError):
        verifier.verify(rotated_token)
    assert len(fetches) == 2

    now[0] += 61
    identity = verifier.verify(rotated_token)

    assert identity.subject == rotated_subject
    assert len(fetches) == 3


@pytest.mark.parametrize(
    "authorization",
    [None, "", "Bearer", "Basic credentials", "Bearer first second"],
)
def test_missing_or_malformed_bearer_is_safe_401(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
    authorization: str | None,
) -> None:
    _, public_jwk = signing_material
    verifier = TokenVerifier(api_settings, jwk_client=StaticJwkClient(public_jwk))
    headers = {} if authorization is None else {"Authorization": authorization}

    with TestClient(_private_app(api_settings, verifier)) as client:
        response = client.get("/_test/private", headers=headers)

    _assert_unauthorized(response)


def test_invalid_signature_is_safe_401(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
) -> None:
    _, trusted_jwk = signing_material
    attacker_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = _sign(attacker_key, _claims())
    verifier = TokenVerifier(api_settings, jwk_client=StaticJwkClient(trusted_jwk))

    with TestClient(_private_app(api_settings, verifier)) as client:
        response = client.get("/_test/private", headers={"Authorization": f"Bearer {token}"})

    _assert_unauthorized(response, secret=token)


def test_expired_token_is_safe_401(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
) -> None:
    private_key, public_jwk = signing_material
    token = _sign(private_key, _claims(exp=int(datetime.now(UTC).timestamp()) - 1))
    verifier = TokenVerifier(api_settings, jwk_client=StaticJwkClient(public_jwk))

    with TestClient(_private_app(api_settings, verifier)) as client:
        response = client.get("/_test/private", headers={"Authorization": f"Bearer {token}"})

    _assert_unauthorized(response, secret=token)


@pytest.mark.parametrize(
    ("claim_name", "claim_value"),
    [
        ("iss", "https://attacker.example.test/auth/v1"),
        ("aud", "another-audience"),
        ("sub", "not-a-uuid"),
    ],
)
def test_wrong_issuer_audience_or_subject_is_safe_401(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
    claim_name: str,
    claim_value: str,
) -> None:
    private_key, public_jwk = signing_material
    token = _sign(private_key, _claims(**{claim_name: claim_value}))
    verifier = TokenVerifier(api_settings, jwk_client=StaticJwkClient(public_jwk))

    with TestClient(_private_app(api_settings, verifier)) as client:
        response = client.get("/_test/private", headers={"Authorization": f"Bearer {token}"})

    _assert_unauthorized(response, secret=token)


def test_alg_none_is_rejected_before_key_lookup(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
) -> None:
    _, public_jwk = signing_material
    jwk_client = StaticJwkClient(public_jwk)
    token = _none_token(_claims())
    verifier = TokenVerifier(api_settings, jwk_client=jwk_client)

    with TestClient(_private_app(api_settings, verifier)) as client:
        response = client.get("/_test/private", headers={"Authorization": f"Bearer {token}"})

    _assert_unauthorized(response, secret=token)
    assert jwk_client.requested_kids == []


def test_valid_token_exposes_authenticated_identity(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
) -> None:
    private_key, public_jwk = signing_material
    subject = uuid4()
    token = _sign(private_key, _claims(subject=subject))
    verifier = TokenVerifier(api_settings, jwk_client=StaticJwkClient(public_jwk))

    with TestClient(_private_app(api_settings, verifier)) as client:
        response = client.get("/_test/private", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json() == {"subject": str(subject), "email": "person@example.test"}


def test_email_claim_is_optional(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
) -> None:
    private_key, public_jwk = signing_material
    claims = _claims()
    claims.pop("email")
    token = _sign(private_key, claims)
    verifier = TokenVerifier(api_settings, jwk_client=StaticJwkClient(public_jwk))

    with TestClient(_private_app(api_settings, verifier)) as client:
        response = client.get("/_test/private", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["email"] is None


def test_authorization_token_is_not_logged(
    api_settings: Settings,
    signing_material: tuple[rsa.RSAPrivateKey, PyJWK],
    capfd: pytest.CaptureFixture[str],
) -> None:
    request_logger = logging.getLogger("aurea_api.request")
    for handler in list(request_logger.handlers):
        request_logger.removeHandler(handler)
        handler.close()

    private_key, public_jwk = signing_material
    token = _sign(private_key, _claims())
    verifier = TokenVerifier(api_settings, jwk_client=StaticJwkClient(public_jwk))

    with TestClient(_private_app(api_settings, verifier)) as client:
        response = client.get("/_test/private", headers={"Authorization": f"Bearer {token}"})

    stderr = capfd.readouterr().err
    assert response.status_code == 200
    assert token not in stderr
    assert "authorization" not in stderr.lower()
