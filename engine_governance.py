"""Compatibility import for the Web V1 astrology package boundary."""

from pathlib import Path
import sys

_API_SRC = Path(__file__).resolve().parent / "services" / "api" / "src"
if str(_API_SRC) not in sys.path:
    sys.path.insert(0, str(_API_SRC))

from aurea_api.domain.astrology.governance import *  # noqa: F401,F403,E402
