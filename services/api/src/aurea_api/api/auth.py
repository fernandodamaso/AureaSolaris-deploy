from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from threading import Lock
from time import monotonic
from typing import Annotated, Protocol, cast
from uuid import UUID

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWK, PyJWKClient
from jwt.exceptions import PyJWKClientError, PyJWTError

from ..config import Settings
from ..errors import ApiProblem

_ALLOWED_ALGORITHMS = ("ES256", "RS256")
_JWKS_CACHE_LIFESPAN_SECONDS = 600
_JWKS_FORCED_REFRESH_COOLDOWN_SECONDS = 60
_JWKS_TIMEOUT_SECONDS = 5
_WWW_AUTHENTICATE = {"WWW-Authenticate": "Bearer"}
_BEARER_SCHEME = HTTPBearer(auto_error=False)


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    """Verified private API identity derived only from the Supabase JWT."""

    subject: UUID
    email: str | None = None


class SigningKeyProvider(Protocol):
    """Minimal signing-key lookup seam used by TokenVerifier and tests."""

    def get_signing_key(self, kid: str) -> PyJWK: ...


class InvalidTokenError(Exception):
    """Internal authentication failure that never exposes token details."""


class _RefreshLimitedJwkClient:
    """Use cached JWKS while rate-limiting attacker-triggered refresh attempts."""

    def __init__(
        self,
        client: PyJWKClient,
        *,
        cooldown_seconds: float,
        clock: Callable[[], float],
    ) -> None:
        self._client = client
        self._cooldown_seconds = cooldown_seconds
        self._clock = clock
        self._refresh_lock = Lock()
        self._last_refresh_attempt_at: float | None = None

    def _match_cached_key(self, kid: str) -> PyJWK | None:
        return PyJWKClient.match_kid(self._client.get_signing_keys(), kid)

    def _refresh_cooldown_active(self, now: float) -> bool:
        last_refresh = self._last_refresh_attempt_at
        return last_refresh is not None and now - last_refresh < self._cooldown_seconds

    def _jwks_cache_needs_fetch(self) -> bool:
        cache = self._client.jwk_set_cache
        return cache is None or cache.get() is None

    def get_signing_key(self, kid: str) -> PyJWK:
        with self._refresh_lock:
            # The cache lookup can fetch when the JWKS set is cold or expired. If a prior
            # attempt failed, do not let serialized requests immediately retry the outage.
            now = self._clock()
            if self._jwks_cache_needs_fetch() and self._refresh_cooldown_active(now):
                raise PyJWKClientError("JWKS fetch unavailable during refresh cooldown.")

            try:
                signing_key = self._match_cached_key(kid)
            except (PyJWKClientError, PyJWTError, TypeError, ValueError):
                # Record any expected cold/expired-cache retrieval failure that leaves the
                # cache unavailable, including connection and malformed-JSON failures.
                if self._jwks_cache_needs_fetch():
                    self._last_refresh_attempt_at = now
                raise

            if signing_key is not None:
                return signing_key

            now = self._clock()
            if self._refresh_cooldown_active(now):
                raise PyJWKClientError("Signing key unavailable during JWKS refresh cooldown.")

            # Record the forced refresh before network I/O so failures are rate-limited too.
            self._last_refresh_attempt_at = now
            signing_keys = self._client.get_signing_keys(refresh=True)
            signing_key = PyJWKClient.match_kid(signing_keys, kid)
            if signing_key is None:
                raise PyJWKClientError("Unable to find a matching signing key.")
            return signing_key


class TokenVerifier:
    """Verify asymmetric Supabase access tokens against the project JWKS."""

    def __init__(
        self,
        settings: Settings,
        *,
        jwk_client: SigningKeyProvider | None = None,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        supabase_base_url = str(settings.supabase_url).rstrip("/")
        self.issuer = f"{supabase_base_url}/auth/v1"
        self.jwks_url = f"{self.issuer}/.well-known/jwks.json"
        self._audience = settings.jwt_audience
        if jwk_client is not None:
            self._jwk_client = jwk_client
        else:
            base_client = PyJWKClient(
                self.jwks_url,
                cache_keys=False,
                cache_jwk_set=True,
                lifespan=_JWKS_CACHE_LIFESPAN_SECONDS,
                timeout=_JWKS_TIMEOUT_SECONDS,
            )
            self._jwk_client = _RefreshLimitedJwkClient(
                base_client,
                cooldown_seconds=_JWKS_FORCED_REFRESH_COOLDOWN_SECONDS,
                clock=clock,
            )

    def verify(self, token: str) -> AuthenticatedUser:
        """Return a trusted identity or raise a token-safe authentication failure."""

        try:
            header = jwt.get_unverified_header(token)
            algorithm = header.get("alg")
            kid = header.get("kid")
            if not isinstance(algorithm, str) or algorithm not in _ALLOWED_ALGORITHMS:
                raise InvalidTokenError
            if not isinstance(kid, str) or not kid:
                raise InvalidTokenError

            signing_key = self._jwk_client.get_signing_key(kid)
            if signing_key.algorithm_name != algorithm:
                raise InvalidTokenError

            claims = jwt.decode(
                token,
                key=signing_key,
                algorithms=[algorithm],
                audience=self._audience,
                issuer=self.issuer,
                options={"require": ["aud", "exp", "iss", "sub"]},
            )
            subject_claim = claims.get("sub")
            if not isinstance(subject_claim, str):
                raise InvalidTokenError
            subject = UUID(subject_claim)

            email = claims.get("email")
            if email is not None and not isinstance(email, str):
                raise InvalidTokenError
        except InvalidTokenError:
            raise
        except (PyJWKClientError, PyJWTError, TypeError, ValueError):
            raise InvalidTokenError from None

        return AuthenticatedUser(subject=subject, email=email)


def _bearer_token(authorization: str | None) -> str | None:
    if authorization is None:
        return None
    parts = authorization.split()
    if len(parts) != 2 or parts[0].casefold() != "bearer":
        return None
    return parts[1]


def _unauthorized_problem() -> ApiProblem:
    return ApiProblem(
        status_code=401,
        code="unauthorized",
        message="Authentication required.",
        headers=_WWW_AUTHENTICATE,
    )


def get_authenticated_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_BEARER_SCHEME)] = None,
) -> AuthenticatedUser:
    """FastAPI dependency that exposes only verified server-derived identity."""

    token = credentials.credentials if credentials is not None else _bearer_token(
        request.headers.get("Authorization")
    )
    if token is None:
        raise _unauthorized_problem()

    verifier = cast(TokenVerifier, request.app.state.token_verifier)
    try:
        return verifier.verify(token)
    except InvalidTokenError:
        raise _unauthorized_problem() from None
