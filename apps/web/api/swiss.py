from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
from pathlib import Path

import fastapi
import swisseph as swe

EPHE_DIR = Path(__file__).resolve().parent / "ephe"


def _calc(body: int) -> dict[str, object]:
    jd = swe.julday(2000, 1, 1, 12.0)
    values, flags = swe.calc_ut(jd, body, swe.FLG_SWIEPH | swe.FLG_SPEED)
    return {
        "longitude": values[0],
        "flags": flags,
        "uses_swiss_ephemeris": bool(flags & swe.FLG_SWIEPH),
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        swe.set_ephe_path(str(EPHE_DIR))
        payload = {
            "ok": True,
            "python_runtime_probe": "vercel",
            "fastapi_version": fastapi.__version__,
            "swisseph_version": swe.version,
            "ephe_dir": str(EPHE_DIR),
            "ephe_files": {
                name: (EPHE_DIR / name).stat().st_size
                for name in ("seas_18.se1", "semo_18.se1", "sepl_18.se1")
            },
            "sun": _calc(swe.SUN),
            "moon": _calc(swe.MOON),
            "chiron": _calc(swe.CHIRON),
        }
        body = json.dumps(payload, sort_keys=True).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
