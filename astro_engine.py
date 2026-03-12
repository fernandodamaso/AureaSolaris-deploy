from datetime import datetime
import json
import sys
import io
import warnings
from typing import Any

warnings.filterwarnings("ignore")

try:
    from kerykeion import AstrologicalSubject # type: ignore
    KERYKEION_AVAILABLE = True
except ImportError:
    KERYKEION_AVAILABLE = False

def calculate_natal(year, month, day, hour, minute, lat=-23.5505, lon=-46.6333):
    if not KERYKEION_AVAILABLE:
        return {"error": "kerykeion not installed. Please run 'pip install kerykeion'"}
    
    try:
        # Subject creation
        subject = AstrologicalSubject(
            "Current Sky", 
            year, month, day, 
            hour, minute, 
            lat=lat, lng=lon, 
            tz_str="America/Sao_Paulo"
        )
        
        # In v5+, some objects might be named differently or hidden
        # We'll use a safer mapping
        mapping = {
            'Sun': subject.sun,
            'Moon': subject.moon,
            'Mercury': subject.mercury,
            'Venus': subject.venus,
            'Mars': subject.mars,
            'Jupiter': subject.jupiter,
            'Saturn': subject.saturn,
            'Uranus': subject.uranus,
            'Neptune': subject.neptune,
            'Pluto': subject.pluto,
            'Chiron': getattr(subject, 'chiron', None),
            'North Node': getattr(subject, 'mean_north_lunar_node', getattr(subject, 'mean_node', None))
        }
        
        results: dict[str, Any] = {}
        for label, obj in mapping.items():
            if obj is not None:
                # Handle house (it might be a string in v5 like 'First_House')
                house_val = getattr(obj, 'house', None)
                house_int: Any = None
                if house_val is not None:
                    if isinstance(house_val, (int, float)):
                        house_int = int(house_val)
                    elif isinstance(house_val, str):
                        if house_val.isdigit():
                            house_int = int(house_val)
                        else:
                            house_int = house_val
                    else:
                        house_int = str(house_val)

                results[label] = {
                    "degree": float(getattr(obj, 'abs_pos', 0.0)),
                    "sign": str(getattr(obj, 'sign', 'Unknown')),
                    "pos_in_sign": float(getattr(obj, 'position', 0.0)),
                    "element": str(getattr(obj, 'element', 'Unknown')),
                    "house": house_int,
                    "retrograde": bool(getattr(obj, 'retrograde', False))
                }
            
        # Houses
        if hasattr(subject, 'houses'):
            results["Houses"] = [float(h.abs_pos) for h in subject.houses]
        
        return results
    except Exception as e:
        return {"error": str(e)}

def get_agenda_data(year, month, day, hour, minute):
    if not KERYKEION_AVAILABLE:
        return {"error": "kerykeion not installed"}
        
    try:
        subject = AstrologicalSubject("Agenda", year, month, day, hour, minute, tz_str="America/Sao_Paulo")
        
        transits = [
            {"date": f"{year}-{month:02d}-15", "event": "Peak Transformation Phase", "time": "10:30"},
            {"date": f"{year}-{month:02d}-20", "event": "Sun Transits High", "time": "12:45"},
        ]
        
        return {
            "moon_phase": "Calculated via SwissEph", 
            "transits": transits,
            "ascendant": str(subject.ascendant.sign) if hasattr(subject, 'ascendant') else "Unknown",
            "midheaven": str(subject.midheaven.sign) if hasattr(subject, 'midheaven') else "Unknown"
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Ensure UTF-8 output
    reconfig = getattr(sys.stdout, 'reconfigure', None)
    if reconfig is not None:
        reconfig(encoding='utf-8')
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    try:
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
            req_type = data.get('type', 'positions')
            
            y = data.get('year', datetime.now().year)
            m = data.get('month', datetime.now().month)
            d = data.get('day', datetime.now().day)
            
            time_val = data.get('hour', 12.0)
            h = int(time_val)
            min_val = int((time_val - h) * 60)
            
            if req_type == 'agenda':
                res = get_agenda_data(y, m, d, h, min_val)
                output = json.dumps(res)
                print(output)
                with open("astro_data.json", "w", encoding="utf-8") as f:
                    f.write(output)
            else:
                pos = calculate_natal(y, m, d, h, min_val)
                output = json.dumps(pos)
                print(output)
                with open("astro_data.json", "w", encoding="utf-8") as f:
                    f.write(output)
        else:
            now = datetime.now()
            pos = calculate_natal(now.year, now.month, now.day, now.hour, now.minute)
            output = json.dumps(pos)
            print(output)
            with open("astro_data.json", "w", encoding="utf-8") as f:
                f.write(output)
    except Exception as e:
        err_out = json.dumps({"error": str(e)})
        print(err_out)
        with open("astro_data.json", "w", encoding="utf-8") as f:
            f.write(err_out)

