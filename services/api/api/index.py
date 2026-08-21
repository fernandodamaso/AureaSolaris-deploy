from __future__ import annotations

import os
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = SERVICE_ROOT / "src"
if str(SOURCE_ROOT) not in sys.path:
    sys.path.insert(0, str(SOURCE_ROOT))

from aurea_api.config import Settings  # noqa: E402
from aurea_api.main import create_app  # noqa: E402

_SAFE_DEFAULTS = {
    "AUREA_ENVIRONMENT": "vercel-import",
    "AUREA_SUPABASE_URL": "https://vercel-import.invalid",
    "AUREA_JWT_AUDIENCE": "authenticated",
    "AUREA_DATABASE_URL": "postgresql://vercel:import@localhost:5432/vercel",
    "AUREA_ALLOWED_ORIGINS": "https://vercel-import.invalid",
    "AUREA_EPHEMERIS_PATH": str(SERVICE_ROOT / "ephe"),
}


def _settings_for_import() -> Settings:
    """Allow build-time module inspection without inventing production secrets."""

    source = {**_SAFE_DEFAULTS, **os.environ}
    ephemeris_path = Path(source["AUREA_EPHEMERIS_PATH"])
    if not ephemeris_path.is_absolute():
        source["AUREA_EPHEMERIS_PATH"] = str(SERVICE_ROOT / ephemeris_path)
    return Settings.from_env(source)


app = create_app(_settings_for_import())

if os.environ.get("AUREA_EPHEMERIS_DIAGNOSTICS") == "1":
    candidates = (
        SERVICE_ROOT / "ephe",
        Path.cwd() / "ephe",
        Path("/var/task/ephe"),
        Path("/var/task/services/api/ephe"),
        Path("/var/task/api/ephe"),
        Path("/var/task/knowledge/engenharia_astrologica/knowledge/build/editorial_current.sqlite"),
        Path("/var/task/knowledge/editorial_current.sqlite"),
    )
    print(
        {
            "event": "ephemeris_path_probe",
            "service_root": str(SERVICE_ROOT),
            "cwd": str(Path.cwd()),
            "candidates": {str(path): path.is_dir() for path in candidates},
        },
        flush=True,
    )
