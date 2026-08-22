from __future__ import annotations

import os
import re
from collections.abc import Mapping
from functools import lru_cache
from pathlib import Path
from typing import Self
from urllib.parse import parse_qs, unquote, urlsplit

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
_DEPLOYED_SUPABASE_REFS = {
    "preview": "rosklqnnbmhowohoyboj",
    "production": "tgpcpxqqusehssaihvcp",
}
_PRODUCTION_WEB_ORIGIN = "https://aurea-solaris.vercel.app"
_DEPLOYED_DATABASE_HOST = "aws-0-sa-east-1.pooler.supabase.com"
_VERCEL_WEB_PREVIEW = re.compile(
    r"^aurea-solaris-[a-z0-9][a-z0-9-]*-fernando-damasos-projects\.vercel\.app$"
)


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

        expected_ref = _DEPLOYED_SUPABASE_REFS[environment]
        self._validate_remote_url(self.supabase_url, "Supabase URL")
        self._validate_supabase_boundary(expected_ref)
        self._validate_database_boundary(expected_ref)
        if len(self.allowed_origins) != 1:
            raise ValueError("deployed environments require one browser origin")
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
            or parsed.port is not None
            or parsed.query
            or parsed.fragment
            or parsed.path not in {"", "/"}
        ):
            raise ValueError(f"{label} must be a remote HTTPS URL")

    def _validate_supabase_boundary(self, expected_ref: str) -> None:
        hostname = urlsplit(str(self.supabase_url)).hostname
        if not hostname or hostname.lower() != f"{expected_ref}.supabase.co":
            raise ValueError("Supabase URL does not match the deployed environment")

    def _validate_database_boundary(self, expected_ref: str) -> None:
        parsed = urlsplit(self.database_url.get_secret_value())
        query = parse_qs(parsed.query)
        sslmode = query.get("sslmode", [""])[-1].lower()
        hostname = parsed.hostname.lower() if parsed.hostname else ""
        username = unquote(parsed.username or "")
        pooler = (
            hostname == _DEPLOYED_DATABASE_HOST
            and parsed.port == 5432
            and parsed.path == "/postgres"
            and username == f"aurea_api.{expected_ref}"
        )
        if (
            parsed.scheme not in {"postgres", "postgresql"}
            or not hostname
            or hostname in _LOOPBACK_HOSTS
            or sslmode not in {"require", "verify-ca", "verify-full"}
            or not pooler
        ):
            raise ValueError(
                "database URL must use the deployed environment's dedicated TLS role"
            )

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
            or parsed.port is not None
            or parsed.query
            or parsed.fragment
            or parsed.path not in {"", "/"}
            or "*" in origin
        ):
            raise ValueError("browser origins must be exact HTTPS origins")
        normalized = f"https://{hostname}"
        if environment == "production" and normalized != _PRODUCTION_WEB_ORIGIN:
            raise ValueError("production browser origin is not canonical")
        if environment == "preview" and not _VERCEL_WEB_PREVIEW.fullmatch(hostname):
            raise ValueError("preview browser origin is not an approved Vercel web origin")

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
