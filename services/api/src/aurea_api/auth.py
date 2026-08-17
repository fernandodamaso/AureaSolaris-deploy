from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, cast
from uuid import UUID

import jwt
from fastapi import Request
from jwt import PyJWK, PyJWKClient
from jwt.exceptions import PyJWKClientError, PyJWTError

from .config import Settings
from .errors import ApiProblem

_ALLOWED_ALGORITHMS = ("ES256", "RS256")
_JWKS_CACHE_LIFESPAN_SECONDS = 600
_JWKS_TIMEOUT_SECONDS = 5
_WWW_AUTHENTICATE = {"WWW-Authenticate": "Bearer"}


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    """Verified private API identity derived only from the Supabase JWT."""

    subject: UUID
    email: str | None = None


class SigningKeyProvider(Protocol):
    """Minimal JWKS key lookup seam used by TokenVerifier and tests."""

    def get_signing_key(self, kid: str) -> PyJWK: ...


class InvalidTokenError(Exception):
    """Internal authentication failure that never exposes token details."""


class TokenVerifier:
    """Verify asymmetric Supabase access tokens against the project JWKS."""

    def __init__(
        self,
        settings: Settings,
        *,
        jwk_client: SigningKeyProvider | None = None,
    ) -> None:
        supabase_base_url = str(settings.supabase_url).rstrip("/")
        self.issuer = f"{supabase_base_url}/auth/v1"
        self.jwks_url = f"{self.issuer}/.well-known/jwks.json"
        self._audience = settings.jwt_audience
        self._jwk_client: SigningKeyProvider = jwk_client or PyJWKClient(
            self.jwks_url,
            cache_keys=False,
            cache_jwk_set=True,
            lifespan=_JWKS_CACHE_LIFESPAN_SECONDS,
            timeout=_JWKS_TIMEOUT_SECONDS,
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


def get_authenticated_user(request: Request) -> AuthenticatedUser:
    """FastAPI dependency that exposes only verified server-derived identity."""

    token = _bearer_token(request.headers.get("Authorization"))
    if token is None:
        raise _unauthorized_problem()

    verifier = cast(TokenVerifier, request.app.state.token_verifier)
    try:
        return verifier.verify(token)
    except InvalidTokenError:
        raise _unauthorized_problem() from None
