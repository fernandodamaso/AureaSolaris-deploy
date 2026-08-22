from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from aurea_api.config import Settings
from aurea_api.main import create_app

SERVICE_ROOT = Path(__file__).resolve().parents[1]
OPENAPI_PATH = SERVICE_ROOT / "openapi.json"
EXPORT_SCRIPT = SERVICE_ROOT / "scripts" / "export_openapi.py"


def _api() -> dict[str, Any]:
    settings = Settings.from_env(
        {
            "AUREA_ENVIRONMENT": "test",
            "AUREA_SUPABASE_URL": "https://example.supabase.co",
            "AUREA_JWT_AUDIENCE": "authenticated",
            "AUREA_DATABASE_URL": "postgresql://aurea:test-only@db.example.test:5432/aurea",
            "AUREA_ALLOWED_ORIGINS": "https://web.example.test",
            "AUREA_EPHEMERIS_PATH": str(SERVICE_ROOT / "ephe"),
        }
    )
    return create_app(settings).openapi()


def test_checked_openapi_matches_create_app() -> None:
    expected = json.dumps(_api(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    assert OPENAPI_PATH.read_text(encoding="utf-8") == expected


def test_every_v1_operation_is_secure_explicit_and_problem_aware() -> None:
    document = _api()
    operations = [
        operation
        for path, methods in document["paths"].items()
        if path.startswith("/v1")
        for operation in methods.values()
    ]

    assert operations
    assert len({operation["operationId"] for operation in operations}) == len(operations)
    for operation in operations:
        assert operation["security"] == [{"HTTPBearer": []}]
        assert "200" in operation["responses"]
        assert operation["responses"]["200"].get("content")
        for status in ("401", "404", "422", "503"):
            assert status in operation["responses"]
            assert operation["responses"][status]["content"]["application/json"]["schema"][
                "$ref"
            ].endswith("/ProblemResponse")


def test_only_health_and_ready_are_unversioned_and_request_contract_has_no_user_id() -> None:
    document = _api()
    assert set(document["paths"]) - {"/health", "/ready"} <= {
        path for path in document["paths"] if path.startswith("/v1")
    }

    encoded = json.dumps(document["paths"], sort_keys=True)
    assert "user_id" not in encoded


def test_export_check_is_deterministic() -> None:
    completed = subprocess.run(
        [sys.executable, str(EXPORT_SCRIPT), "--check"],
        cwd=SERVICE_ROOT.parent,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
