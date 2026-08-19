from __future__ import annotations

from importlib.metadata import version
from pathlib import Path

import swisseph as swe
from fastapi import FastAPI

EPHE_DIR = Path(__file__).resolve().parent / "ephe"
app = FastAPI(title="Aurea Vercel compatibility spike")


def _calc(body: int) -> dict[str, object]:
    jd = swe.julday(2000, 1, 1, 12.0)
    values, flags = swe.calc_ut(jd, body, swe.FLG_SWIEPH | swe.FLG_SPEED)
    return {
        "longitude": values[0],
        "flags": flags,
        "uses_swiss_ephemeris": bool(flags & swe.FLG_SWIEPH),
    }


@app.get("/api/swiss")
def probe() -> dict[str, object]:
    swe.set_ephe_path(str(EPHE_DIR))
    packages = {
        name: version(name)
        for name in (
            "asyncpg",
            "fastapi",
            "kerykeion",
            "pydantic",
            "PyJWT",
            "pyswisseph",
            "tzdata",
        )
    }
    return {
        "ok": True,
        "packages": packages,
        "swisseph_version": swe.version,
        "ephe_files": {
            name: (EPHE_DIR / name).stat().st_size
            for name in ("seas_18.se1", "semo_18.se1", "sepl_18.se1")
        },
        "sun": _calc(swe.SUN),
        "moon": _calc(swe.MOON),
        "chiron": _calc(swe.CHIRON),
    }
