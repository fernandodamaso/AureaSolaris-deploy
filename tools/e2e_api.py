"""Run the real private API against the disposable local Supabase stack."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import uvicorn

REPO_ROOT = Path(__file__).resolve().parents[1]
SERVICE_SRC = REPO_ROOT / "services" / "api" / "src"
if str(SERVICE_SRC) not in sys.path:
    sys.path.insert(0, str(SERVICE_SRC))

from aurea_api.main import create_app  # noqa: E402


def build_app():
    return create_app()


app = build_app()


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ["ASTRO_API_PORT"]))
