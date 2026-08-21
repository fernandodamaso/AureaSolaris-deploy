from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
ENTRYPOINT = SERVICE_ROOT / "api" / "index.py"
VERCEL_CONFIG = SERVICE_ROOT / "vercel.json"
VERCEL_IGNORE = SERVICE_ROOT / ".vercelignore"
EPHEMERIS = SERVICE_ROOT / "ephe"


def test_deployment_metadata_selects_python_312_and_bundles_exact_approved_files() -> None:
    config = json.loads(VERCEL_CONFIG.read_text(encoding="utf-8"))
    build = config["builds"][0]

    assert build["src"] == "api/index.py"
    assert build["use"] == "@vercel/python"
    assert build["config"]["runtime"] == "python3.12"
    assert build["config"]["includeFiles"] == ["ephe/*.se1", "knowledge/editorial_current.sqlite"]
    assert config["routes"] == [{"src": "/(.*)", "dest": "api/index.py"}]

    ignored = VERCEL_IGNORE.read_text(encoding="utf-8").splitlines()
    assert "tests/" in ignored
    assert ".env.*" in ignored
    assert ".git/" in ignored
    assert "Dockerfile" not in "\n".join(ignored)
    assert not (SERVICE_ROOT / "Dockerfile").exists()
    assert not (SERVICE_ROOT / "railway.json").exists()


def test_pinned_python_and_runtime_dependency_contract() -> None:
    pyproject = (SERVICE_ROOT / "pyproject.toml").read_text(encoding="utf-8")
    assert 'requires-python = ">=3.12,<3.13"' in pyproject
    assert '"pyswisseph==2.10.3.2"' in pyproject


def test_entrypoint_imports_without_production_secrets_and_health_works() -> None:
    original = {
        key: os.environ.pop(key, None)
        for key in tuple(os.environ)
        if key.startswith("AUREA_")
    }
    try:
        sys.path.insert(0, str(SERVICE_ROOT))
        from api.index import app

        with TestClient(app) as client:
            response = client.get("/health")
            ready = client.get("/ready")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        assert ready.status_code == 503
        assert ready.json()["code"] == "service_not_ready"
        assert "/v1/astrology/natal" in app.openapi()["paths"]
    finally:
        sys.path.remove(str(SERVICE_ROOT))
        os.environ.update({key: value for key, value in original.items() if value is not None})


def test_certified_ephemeris_assets_are_unchanged() -> None:
    expected = {
        "seas_18.se1": (223021, "4f4236d96ade96be0d4886fa7e39166cd807c57392b1d283d015f5324e6f1e77"),
        "semo_18.se1": (
            1304788,
            "054f2bb7b52fca894a2bf1f657f3b22b321a2296da16aa1fe87799333f7e38e8",
        ),
        "sepl_18.se1": (484078, "6753841e68035dac666104f204decb2b66983904a1a719d101609b88f949120d"),
    }
    for name, (size, digest) in expected.items():
        path = EPHEMERIS / name
        assert path.stat().st_size == size
        assert hashlib.sha256(path.read_bytes()).hexdigest() == digest
