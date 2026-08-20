from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT / "src"))

from aurea_api.config import Settings  # noqa: E402
from aurea_api.main import create_app  # noqa: E402

OUTPUT_PATH = SERVICE_ROOT / "openapi.json"
_SAFE_DEFAULTS = {
    "AUREA_ENVIRONMENT": "openapi-export",
    "AUREA_SUPABASE_URL": "https://openapi.invalid",
    "AUREA_JWT_AUDIENCE": "authenticated",
    "AUREA_DATABASE_URL": "postgresql://openapi:openapi@localhost:5432/openapi",
    "AUREA_ALLOWED_ORIGINS": "https://openapi.invalid",
    "AUREA_EPHEMERIS_PATH": str(SERVICE_ROOT / "ephe"),
}


def _settings() -> Settings:
    values = {**_SAFE_DEFAULTS, **os.environ}
    return Settings.from_env(values)


def canonical_document(document: dict[str, Any]) -> str:
    return json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def export_document() -> str:
    return canonical_document(create_app(_settings()).openapi())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Export the locked Aurea Solaris OpenAPI document."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail when the checked document is stale",
    )
    args = parser.parse_args(argv)

    rendered = export_document()
    if args.check:
        current = OUTPUT_PATH.read_text(encoding="utf-8") if OUTPUT_PATH.exists() else ""
        if current != rendered:
            print(f"{OUTPUT_PATH} is out of date; run export_openapi.py.", file=sys.stderr)
            return 1
        return 0

    OUTPUT_PATH.write_text(rendered, encoding="utf-8", newline="\n")
    print(OUTPUT_PATH)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
