from datetime import datetime
import json
import sys
import io
import warnings
from typing import Any, Dict, List, Optional, cast

warnings.filterwarnings("ignore")

try:
    from kerykeion import AstrologicalSubject  # type: ignore
    KERYKEION_AVAILABLE = True
except ImportError:
    KERYKEION_AVAILABLE = False

# Ordem caldéia e regentes diários
CHALDEAN_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]
DAY_REGENTS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]  # 0=Sunday

def get_planetary_hour(dt: datetime) -> str:
    """Calculate the planet that rules the current hour (Chaldean order)."""
    day_of_week = (dt.weekday() + 1) % 7  # 0=Sunday
    day_regent = DAY_REGENTS[day_of_week]
    start_idx = CHALDEAN_ORDER.index(day_regent)
    hour_idx = (start_idx + dt.hour) % len(CHALDEAN_ORDER)
    return str(CHALDEAN_ORDER[hour_idx])

def get_aspect(d1: float, d2: float) -> Optional[Dict[str, Any]]:
    """Return an aspect dict if two degrees are within an orb, otherwise None."""
    diff = abs(d1 - d2) % 360
    dist = 360 - diff if diff > 180 else diff
    aspects = [
        {"type": "Conjunction", "angle": 0, "orb": 8, "symbol": "☌"},
        {"type": "Opposition", "angle": 180, "orb": 8, "symbol": "☍"},
        {"type": "Trine", "angle": 120, "orb": 8, "symbol": "△"},
        {"type": "Square", "angle": 90, "orb": 6, "symbol": "□"},
        {"type": "Sextile", "angle": 60, "orb": 4, "symbol": "＊"},
    ]
    for a in aspects:
        angle_val = float(a.get("angle", 0))
        orb_limit = float(a.get("orb", 0))
        dist_from_angle = abs(dist - angle_val)
        if dist_from_angle < orb_limit:
            # Manual rounding to satisfy Pyre's dislike for round() with 2 args
            orb_rounded = float(int(dist_from_angle * 100) / 100.0)
            return {
                "type": str(a.get("type", "")),
                "symbol": str(a.get("symbol", "")),
                "orb": orb_rounded
            }
    return None

def calculate_astrology(
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    lat: float = -23.5505,
    lon: float = -46.6333,
) -> Dict[str, Any]:
    """Calculate planetary positions, aspects and regencies.
    Returns a JSON‑serialisable dict with keys:
    `planets`, `aspects`, `houses`, `regence`, `meta`.
    """
    if not KERYKEION_AVAILABLE:
        return {"error": "kerykeion not installed. Please run 'pip install kerykeion'"}

    try:
        dt = datetime(year, month, day, hour, minute)
        subject = AstrologicalSubject(
            "Aurea Solaris Sky",
            year,
            month,
            day,
            hour,
            minute,
            lat=lat,
            lng=lon,
            tz_str="America/Sao_Paulo",
        )

        mapping: Dict[str, Any] = {
            "Sun": subject.sun,
            "Moon": subject.moon,
            "Mercury": subject.mercury,
            "Venus": subject.venus,
            "Mars": subject.mars,
            "Jupiter": subject.jupiter,
            "Saturn": subject.saturn,
            "Uranus": subject.uranus,
            "Neptune": subject.neptune,
            "Pluto": subject.pluto,
            "Chiron": getattr(subject, "chiron", None),
        }

        planets_data: Dict[str, Dict[str, Any]] = {}
        for label, obj in mapping.items():
            if obj is not None:
                planets_data[label] = {
                    "degree": float(getattr(obj, "abs_pos", 0.0)),
                    "sign": str(getattr(obj, "sign", "Unknown")),
                    "pos_in_sign": float(getattr(obj, "position", 0.0)),
                    "element": str(getattr(obj, "element", "Unknown")),
                    "house": getattr(obj, "house", "Unknown"),
                    "retrograde": bool(getattr(obj, "retrograde", False)),
                }

        # Calculate aspects between every pair of planets
        _keys = list(planets_data.keys())
        aspects_list = []
        n_p = len(_keys)
        for i in range(n_p):
            for j in range(i + 1, n_p):
                p1 = _keys[i]
                p2 = _keys[j]
                v1 = float(planets_data.get(p1, {}).get("degree", 0.0))
                v2 = float(planets_data.get(p2, {}).get("degree", 0.0))
                asp = get_aspect(v1, v2)
                if asp:
                    aspects_list.append({
                        "p1": p1,
                        "p2": p2,
                        "type": asp["type"],
                        "symbol": asp["symbol"],
                        "orb": asp["orb"],
                    })

        return {
            "planets": planets_data,
            "aspects": aspects_list,
            "houses": [float(h.abs_pos) for h in getattr(subject, "houses", [])],
            "regence": {
                "day_regent": str(DAY_REGENTS[(dt.weekday() + 1) % 7]),
                "hour_regent": get_planetary_hour(dt),
            },
            "meta": {
                "timestamp": dt.isoformat(),
                "location": {"lat": lat, "lon": lon},
            },
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    reconfig = getattr(sys.stdout, "reconfigure", None)
    if reconfig is not None:
        reconfig(encoding="utf-8")
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

    try:
        if len(sys.argv) > 1:
            raw_data = sys.argv[1]
            try:
                # Tenta JSON padrão
                data = json.loads(raw_data)
            except Exception:
                try:
                    # Tenta como literal de Python (mais flexível com aspas)
                    import ast
                    data = ast.literal_eval(raw_data)
                except Exception:
                    try:
                        # Tenta limpar aspas internas escapadas pelo Windows/Tauri
                        cleaned = raw_data.strip('"').replace('\\"', '"').replace("'", '"')
                        data = json.loads(cleaned)
                    except Exception as final_err:
                        # Se falhar feio, cospe o que recebeu para debug no stderr
                        print(f"Falha Crítica no Payload: {raw_data}", file=sys.stderr)
                        raise final_err
                    
            y = int(data.get("year", datetime.now().year))
            m = int(data.get("month", datetime.now().month))
            d = int(data.get("day", datetime.now().day))
            time_val = float(data.get("hour", 12.0))
            h = int(time_val)
            min_val = int((time_val - h) * 60)
            lat = float(data.get("lat", -23.5505))
            lon = float(data.get("lon", -46.6333))
        else:
            now = datetime.now()
            y, m, d, h, min_val = now.year, now.month, now.day, now.hour, now.minute
            lat, lon = -23.5505, -46.6333

        result = calculate_astrology(y, m, d, h, min_val, lat, lon)
        output = json.dumps(result, ensure_ascii=False)
        
        # Envia de volta para o Rust (Tauri) via stdout
        print(output, flush=True)
        
        # Cache for both Tauri (root) and Browser Sync (public)
        with open("astro_data.json", "w", encoding="utf-8") as f:
            f.write(output)
            
        import os
        if os.path.exists("public"):
            with open("public/astro_data.json", "w", encoding="utf-8") as f:
                f.write(output)
            
        history_path = "astro_history.json"
        history_cache = []
        try:
            with open(history_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, list):
                    history_cache = loaded
        except (FileNotFoundError, json.JSONDecodeError):
            pass
            
        history_cache.append(result)
        # Pop oldest to satisfy linter skipping slice indexing on lists
        while len(history_cache) > 100:
            history_cache.pop(0)
            
        with open(history_path, "w", encoding="utf-8") as f:
            json.dump(history_cache, f, ensure_ascii=False, indent=2)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
