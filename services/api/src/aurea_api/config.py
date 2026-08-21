from __future__ import annotations

import os
import re
from collections.abc import Mapping
from functools import lru_cache
from pathlib import Path
from typing import Self
from urllib.parse import parse_qs, urlsplit

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    PostgresDsn,
    SecretStr,
    TypeAdapter,
    ValidationError,
    field_validator,
    model_validator,
)

from .ephemeris_integrity import validate_packaged_ephemeris

_ENVIRONMENT_FIELDS = (
    ("environment", "AUREA_ENVIRONMENT"),
    ("supabase_url", "AUREA_SUPABASE_URL"),
    ("jwt_audience", "AUREA_JWT_AUDIENCE"),
    ("database_url", "AUREA_DATABASE_URL"),
    ("allowed_origins", "AUREA_ALLOWED_ORIGINS"),
    ("ephemeris_path", "AUREA_EPHEMERIS_PATH"),
)
_HTTP_URL = TypeAdapter(AnyHttpUrl)
_POSTGRES_DSN = TypeAdapter(PostgresDsn)
_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}
_VERCEL_WEB_PREVIEW = re.compile(r"^aurea-solaris-[a-z0-9][a-z0-9-]*\.vercel\.app$")


class Settings(BaseModel):
    """Validated server-side configuration for the web API."""

    model_config = ConfigDict(frozen=True, hide_input_in_errors=True)

    environment: str = Field(min_length=1)
    supabase_url: AnyHttpUrl
    jwt_audience: str = Field(min_length=1)
    database_url: SecretStr = Field(min_length=1)
    allowed_origins: tuple[str, ...] = Field(min_length=1)
    ephemeris_path: Path

    @field_validator("database_url")
    @classmethod
    def _validate_database_url(cls, value: SecretStr) -> SecretStr:
        try:
            _POSTGRES_DSN.validate_python(value.get_secret_value())
        except ValidationError:
            raise ValueError("database URL must be a valid PostgreSQL DSN") from None
        return value

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _parse_allowed_origins(cls, value: object) -> object:
        if not isinstance(value, str):
            return value

        origins = tuple(origin.strip() for origin in value.split(",") if origin.strip())
        for origin in origins:
            if "*" in origin:
                raise ValueError("allowed origins cannot contain wildcards")
            _HTTP_URL.validate_python(origin)
        return origins

    @field_validator("allowed_origins")
    @classmethod
    def _reject_wildcard_origins(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if any("*" in origin for origin in value):
            raise ValueError("allowed origins cannot contain wildcards")
        return value

    @model_validator(mode="after")
    def _validate_deploy_boundaries(self) -> Self:
        environment = self.environment.strip().lower()
        if environment not in {"production", "preview"}:
            return self

        self._validate_remote_url(self.supabase_url, "Supabase URL")
        self._validate_database_boundary()
        for origin in self.allowed_origins:
            self._validate_origin(origin, environment)

        if environment == "production":
            trusted_root = Path(__file__).resolve().parents[2] / "ephe"
            validate_packaged_ephemeris(
                self.ephemeris_path,
                production=True,
                trusted_root=trusted_root,
            )
        return self

    @staticmethod
    def _validate_remote_url(value: AnyHttpUrl, label: str) -> None:
        parsed = urlsplit(str(value))
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.hostname.lower() in _LOOPBACK_HOSTS
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
            or parsed.path not in {"", "/"}
        ):
            raise ValueError(f"{label} must be a remote HTTPS URL")

    def _validate_database_boundary(self) -> None:
        parsed = urlsplit(self.database_url.get_secret_value())
        query = parse_qs(parsed.query)
        sslmode = query.get("sslmode", [""])[-1].lower()
        if (
            parsed.scheme not in {"postgres", "postgresql"}
            or not parsed.hostname
            or parsed.hostname.lower() in _LOOPBACK_HOSTS
            or sslmode not in {"require", "verify-ca", "verify-full"}
        ):
            raise ValueError("database URL must use a remote TLS PostgreSQL connection")

    @staticmethod
    def _validate_origin(origin: str, environment: str) -> None:
        parsed = urlsplit(origin)
        hostname = parsed.hostname.lower() if parsed.hostname else ""
        if (
            parsed.scheme != "https"
            or not hostname
            or hostname in _LOOPBACK_HOSTS
            or any(char in hostname for char in r"\[]()*+?{}|^$")
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
            or parsed.path not in {"", "/"}
            or "*" in origin
        ):
            raise ValueError("browser origins must be exact HTTPS origins")
        if environment == "production" and _VERCEL_WEB_PREVIEW.fullmatch(hostname):
            raise ValueError("preview Vercel origins are not allowed in production")

    @classmethod
    def from_env(cls, environment: Mapping[str, str] | None = None) -> Self:
        source = os.environ if environment is None else environment
        values: dict[str, object] = {}

        for field_name, variable_name in _ENVIRONMENT_FIELDS:
            raw_value = source.get(variable_name)
            if not raw_value or not raw_value.strip():
                values[field_name] = None
            elif field_name == "database_url":
                values[field_name] = SecretStr(raw_value)
            else:
                values[field_name] = raw_value

        return cls.model_validate(values)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load and cache validated process configuration."""

    return Settings.from_env()
