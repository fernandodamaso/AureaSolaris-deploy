from __future__ import annotations

import shutil
from pathlib import Path

import pytest
from pydantic import SecretStr, ValidationError

from aurea_api.config import Settings, get_settings

REPO_ROOT = Path(__file__).resolve().parents[3]


def valid_environment() -> dict[str, str]:
    return {
        "AUREA_ENVIRONMENT": "development",
        "AUREA_SUPABASE_URL": "https://example.supabase.co",
        "AUREA_JWT_AUDIENCE": "authenticated",
        "AUREA_DATABASE_URL": "postgresql://aurea:super-secret@db.example.test:5432/aurea",
        "AUREA_ALLOWED_ORIGINS": "http://localhost:5173, https://preview.example.test",
        "AUREA_EPHEMERIS_PATH": "./data/ephemeris",
    }


def production_environment() -> dict[str, str]:
    return {
        "AUREA_ENVIRONMENT": "production",
        "AUREA_SUPABASE_URL": "https://example.supabase.co",
        "AUREA_JWT_AUDIENCE": "authenticated",
        "AUREA_DATABASE_URL": (
            "postgresql://aurea:super-secret@db.example.test:5432/aurea?sslmode=require"
        ),
        "AUREA_ALLOWED_ORIGINS": "https://aurea-solaris.vercel.app",
        "AUREA_EPHEMERIS_PATH": str(REPO_ROOT / "services" / "api" / "ephe"),
    }


@pytest.mark.parametrize(
    ("missing_key", "field_name"),
    [
        ("AUREA_ENVIRONMENT", "environment"),
        ("AUREA_SUPABASE_URL", "supabase_url"),
        ("AUREA_JWT_AUDIENCE", "jwt_audience"),
        ("AUREA_DATABASE_URL", "database_url"),
        ("AUREA_ALLOWED_ORIGINS", "allowed_origins"),
        ("AUREA_EPHEMERIS_PATH", "ephemeris_path"),
    ],
)
def test_settings_require_each_environment_variable(missing_key: str, field_name: str) -> None:
    environment = valid_environment()
    environment.pop(missing_key)

    with pytest.raises(ValidationError) as exc_info:
        Settings.from_env(environment)

    assert field_name in str(exc_info.value)


def test_settings_reject_blank_database_secret() -> None:
    environment = valid_environment()
    environment["AUREA_DATABASE_URL"] = "  "

    with pytest.raises(ValidationError):
        Settings.from_env(environment)


@pytest.mark.parametrize(
    "database_url",
    [
        "https://db.example.test/aurea",
        "postgresql://",
    ],
)
def test_settings_reject_invalid_database_urls(database_url: str) -> None:
    environment = valid_environment()
    environment["AUREA_DATABASE_URL"] = database_url

    with pytest.raises(ValidationError):
        Settings.from_env(environment)


def test_invalid_database_url_error_does_not_expose_secret() -> None:
    environment = valid_environment()
    secret_marker = "review-secret-marker"
    database_url = f"https://aurea:{secret_marker}@db.example.test/aurea"
    environment["AUREA_DATABASE_URL"] = database_url

    with pytest.raises(ValidationError) as exc_info:
        Settings.from_env(environment)

    error = str(exc_info.value)
    structured_errors = repr(exc_info.value.errors())
    json_errors = exc_info.value.json()
    assert database_url not in error
    assert secret_marker not in error
    assert database_url not in structured_errors
    assert secret_marker not in structured_errors
    assert database_url not in json_errors
    assert secret_marker not in json_errors


def test_settings_parse_allowed_origins_without_changing_values() -> None:
    settings = Settings.from_env(valid_environment())

    assert settings.allowed_origins == (
        "http://localhost:5173",
        "https://preview.example.test",
    )


@pytest.mark.parametrize(
    ("key", "value"),
    [
        ("AUREA_SUPABASE_URL", "http://supabase.example.test"),
        ("AUREA_SUPABASE_URL", "https://localhost"),
        ("AUREA_DATABASE_URL", "postgresql://aurea:secret@localhost/aurea?sslmode=require"),
        ("AUREA_DATABASE_URL", "postgresql://aurea:secret@db.example.test/aurea"),
        ("AUREA_ALLOWED_ORIGINS", "http://web.example.test"),
        ("AUREA_ALLOWED_ORIGINS", "https://127.0.0.1"),
    ],
)
def test_production_rejects_insecure_remote_boundaries(key: str, value: str) -> None:
    environment = production_environment()
    environment[key] = value

    with pytest.raises(ValidationError):
        Settings.from_env(environment)


def test_preview_accepts_concrete_expected_vercel_hostname() -> None:
    environment = production_environment()
    environment.update(
        {
            "AUREA_ENVIRONMENT": "preview",
            "AUREA_ALLOWED_ORIGINS": "https://aurea-solaris-preview-abc.vercel.app",
        }
    )

    settings = Settings.from_env(environment)

    assert settings.allowed_origins == ("https://aurea-solaris-preview-abc.vercel.app",)


def test_wildcard_origin_is_rejected_and_errors_are_redacted() -> None:
    environment = production_environment()
    environment["AUREA_ALLOWED_ORIGINS"] = "https://*.vercel.app"
    secret_marker = "production-secret-marker"
    environment["AUREA_DATABASE_URL"] = (
        f"postgresql://aurea:{secret_marker}@db.example.test/aurea?sslmode=require"
    )

    with pytest.raises(ValidationError) as exc_info:
        Settings.from_env(environment)

    assert secret_marker not in str(exc_info.value)


def test_regex_origin_is_rejected_even_without_a_wildcard() -> None:
    environment = production_environment()
    environment["AUREA_ALLOWED_ORIGINS"] = "https://aurea-solaris-(?:preview).vercel.app"

    with pytest.raises(ValidationError):
        Settings.from_env(environment)


def test_production_accepts_repository_certified_ephemeris_path() -> None:
    settings = Settings.from_env(production_environment())

    assert settings.ephemeris_path == (REPO_ROOT / "services" / "api" / "ephe").resolve()


@pytest.mark.parametrize("path_kind", ["missing", "remote"])
def test_production_rejects_missing_or_remote_ephemeris_path(
    tmp_path: Path,
    path_kind: str,
) -> None:
    environment = production_environment()
    environment["AUREA_EPHEMERIS_PATH"] = (
        "https://example.invalid/ephe"
        if path_kind == "remote"
        else str(tmp_path / "missing")
    )

    with pytest.raises(ValidationError):
        Settings.from_env(environment)


def test_production_rejects_tampered_ephemeris_assets(tmp_path: Path) -> None:
    copied = tmp_path / "ephe"
    shutil.copytree(REPO_ROOT / "services" / "api" / "ephe", copied)
    with (copied / "seas_18.se1").open("ab") as asset:
        asset.write(b"tampered")

    environment = production_environment()
    environment["AUREA_EPHEMERIS_PATH"] = str(copied)

    with pytest.raises(ValidationError):
        Settings.from_env(environment)


def test_production_rejects_certified_assets_in_untrusted_writable_directory(
    tmp_path: Path,
) -> None:
    copied = tmp_path / "ephe"
    shutil.copytree(REPO_ROOT / "services" / "api" / "ephe", copied)
    environment = production_environment()
    environment["AUREA_EPHEMERIS_PATH"] = str(copied)

    with pytest.raises(ValidationError):
        Settings.from_env(environment)


def test_database_url_uses_secretstr_and_stays_redacted() -> None:
    environment = valid_environment()
    secret = environment["AUREA_DATABASE_URL"]

    settings = Settings.from_env(environment)

    assert isinstance(settings.database_url, SecretStr)
    assert secret not in repr(settings)
    assert "**********" in repr(settings)
    assert settings.database_url.get_secret_value() == secret


def test_get_settings_is_cached(monkeypatch: pytest.MonkeyPatch) -> None:
    get_settings.cache_clear()
    for key, value in valid_environment().items():
        monkeypatch.setenv(key, value)

    first = get_settings()
    monkeypatch.setenv("AUREA_ENVIRONMENT", "production")
    second = get_settings()

    assert first is second
    assert second.environment == "development"
    get_settings.cache_clear()


def test_env_example_lists_safe_configuration_contract() -> None:
    contents = (REPO_ROOT / ".env.example").read_text(encoding="utf-8")

    expected_keys = {
        "AUREA_ENVIRONMENT",
        "AUREA_SUPABASE_URL",
        "AUREA_JWT_AUDIENCE",
        "AUREA_DATABASE_URL",
        "AUREA_ALLOWED_ORIGINS",
        "AUREA_EPHEMERIS_PATH",
    }
    for key in expected_keys:
        assert f"{key}=" in contents

    assert "AUREA_DATABASE_URL=\n" in contents
    assert "super-secret" not in contents


def test_gitignore_keeps_real_env_files_out_but_preserves_example() -> None:
    lines = set((REPO_ROOT / ".gitignore").read_text(encoding="utf-8").splitlines())

    assert ".env" in lines
    assert ".env.*" in lines
    assert "!.env.example" in lines
