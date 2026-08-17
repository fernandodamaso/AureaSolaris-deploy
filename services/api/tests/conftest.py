from __future__ import annotations

import pytest

from aurea_api.config import Settings


@pytest.fixture
def api_settings() -> Settings:
    return Settings.from_env(
        {
            "AUREA_ENVIRONMENT": "test",
            "AUREA_SUPABASE_URL": "https://example.supabase.co",
            "AUREA_JWT_AUDIENCE": "authenticated",
            "AUREA_DATABASE_URL": "postgresql://aurea:test-only@db.example.test:5432/aurea",
            "AUREA_ALLOWED_ORIGINS": "https://web.example.test",
            "AUREA_EPHEMERIS_PATH": "./data/ephemeris",
        }
    )
