"""
Astro Engine - Swiss Ephemeris + Kerykeion Hybrid
High-precision astrology calculations for Aurea Solaris.

Uses Swiss Ephemeris (swe) for planetary positions and house cusps.
Uses kerykeion for Chiron (if ephemeris unavailable) and as fallback.
"""
from datetime import datetime, timezone, timedelta
import json
import sys
import io
import warnings
from typing import Any, Dict, List, Optional

warnings.filterwarnings("ignore")

# Try to import Swiss Ephemeris
try:
    import swisseph as swe
    SWE_AVAILABLE = True
    # Set ephemeris path to ephe subdirectory (Swiss Ephemeris compressed files)
    import os
    project_root = os.path.dirname(os.path.abspath(__file__))
    ephe_dir = os.path.join(project_root, "ephe")
    if os.path.isdir(ephe_dir):
        swe.set_ephe_path(ephe_dir)
    else:
        swe.set_ephe_path(project_root)  # fallback
except ImportError:
    SWE_AVAILABLE = False

# Try to import kerykeion
try:
    from kerykeion import AstrologicalSubject
    KERYKEION_AVAILABLE = True
except ImportError:
    KERYKEION_AVAILABLE = False

# Chaldean order for planetary hours
CHALDEAN_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]
DAY_REGENTS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

# Zodiac signs (tropical)
SIGN_ORDER = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
              "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

# Planet IDs for Swiss Ephemeris
SWE_PLANETS = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mercury": swe.MERCURY,
    "Venus": swe.VENUS,
    "Mars": swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN,
    "Uranus": swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO,
}

# House system codes for Swiss Ephemeris
HOUSE_SYSTEMS = {
    "Regiomontanus": "R",
    "Placidus": "P",
    "Koch": "K",
    "Porphyrius": "O",
    "Campanus": "C",
    "Morinus": "M",
    "Whole_Sign": "W",
    "Equal": "E",
    "Whole Sign": "W",
}

# Aspects configuration
ASPECTS = [
    {"type": "Conjunction",     "angle": 0,   "orb": 8.0, "symbol": "☌"},
    {"type": "Opposition",     "angle": 180, "orb": 8.0, "symbol": "☍"},
    {"type": "Trine",          "angle": 120, "orb": 8.0, "symbol": "△"},
    {"type": "Square",         "angle": 90,  "orb": 6.0, "symbol": "□"},
    {"type": "Sextile",        "angle": 60,  "orb": 4.0, "symbol": "＊"},
    {"type": "Quincunx",       "angle": 150, "orb": 3.0, "symbol": "⚻"},
    {"type": "Quintile",       "angle": 72,  "orb": 3.0, "symbol": "Q"},
    {"type": "Bi-Quintile",    "angle": 144, "orb": 3.0, "symbol": "bQ"},
    {"type": "Semi-Sextile",   "angle": 30,  "orb": 2.0, "symbol": "⧬"},
    {"type": "Semi-Square",    "angle": 45,  "orb": 2.0, "symbol": "∠"},
    {"type": "Sesqui-Quadrature", "angle": 135, "orb": 3.0, "symbol": "⚼"},
]

# Bodies that get increased orbs: luminaries and angles
LUMINAR_ANGLES = {"Sun", "Moon", "ASC", "MC"}

# Increased orbs for aspects involving luminaries/angles
LUMINAR_ORBS = {
    "Conjunction": 10.0,
    "Opposition": 10.0,
    "Trine": 10.0,
    "Square": 8.0,
    "Sextile": 6.0,
    "Quincunx": 3.0,
}


def get_orb_limit(asp_type: str, p1: str, p2: str) -> float:
    """Return the applicable orb limit based on involved bodies.
    Luminaries (Sun, Moon) and angles (ASC, MC) get larger orbs."""
    base_orb = next((a["orb"] for a in ASPECTS if a["type"] == asp_type), 3.0)
    if p1 in LUMINAR_ANGLES or p2 in LUMINAR_ANGLES:
        return LUMINAR_ORBS.get(asp_type, base_orb)
    return base_orb


# Horário de verão no Brasil — anos em que DST esteve ativo.
# True = teve horário de verão (Lei 7.778/1985; extinto em abril/2019).
# Fonte: https://en.wikipedia.org/wiki/Daylight_saving_time_in_Brazil
# Períodos históricos: 1931-1933, 1949-1953, 1963-1968, 1985-2018.
# O último DST vigente foi 2018/2019 (4 nov 2018 – 17 fev 2019). Em 2019 o DST foi abolido.
BRAZIL_DST_YEARS: Dict[int, bool] = {
    # Período 1931-1933
    1931: True,  1932: True,  1933: True,
    # Sem DST 1934-1948
    # Período 1949-1953
    1949: True,  1950: True,  1951: True,  1952: True,  1953: True,
    # Sem DST 1954-1962
    # Período 1963-1968
    1963: True,  1964: True,  1965: True,  1966: True,  1967: True,  1968: True,
    # Sem DST 1969-1984
    # Período 1985-2018 (DST ininterrupto todo ano)
    1985: True,  1986: True,  1987: True,  1988: True,  1989: True,
    1990: True,  1991: True,  1992: True,  1993: True,  1994: True,
    1995: True,  1996: True,  1997: True,  1998: True,  1999: True,
    2000: True,  2001: True,  2002: True,  2003: True,  2004: True,
    2005: True,  2006: True,  2007: True,  2008: True,  2009: True,
    2010: True,  2011: True,  2012: True,  2013: True,  2014: True,
    2015: True,  2016: True,  2017: True,  2018: True,
    # 2019: último DST (2018/2019) vigente até 17/fev/2019, depois abolido
    2019: True,
    # DST extinto — sem horário de verão a partir de 2020
}


def is_brazil_dst(local_dt: datetime) -> bool:
    """Retorna True se o horário de verão (DST) estava vigente no momento dado.

    Brasil teve DST nos períodos: 1931-1933, 1949-1953, 1963-1968, 1985-2018.
    O último DST foi o de 2018/2019 (4/nov/2018 a 17/fev/2019). Abolido em abril/2019.

    Regras para o período 1985-2018:
    - Início: primeiro domingo de outubro às 00:00 local
    - Fim: terceiro domingo de fevereiro às 00:00 (ano SEGUINTE se mês >= 10)
    """
    year = local_dt.year
    if year not in BRAZIL_DST_YEARS or not BRAZIL_DST_YEARS[year]:
        return False

    # DST start: first Sunday of October
    oct1 = datetime(year, 10, 1)
    dst_start = oct1 + timedelta(days=(6 - oct1.weekday()) % 7)

    # DST end: third Sunday of February (ano SEGUINTE se we're in Oct-Dec)
    end_year = year if local_dt.month < 10 else year + 1
    feb1 = datetime(end_year, 2, 1)
    days_to_first_sun = (6 - feb1.weekday()) % 7
    third_sun = feb1 + timedelta(days=days_to_first_sun + 14)

    # Se mês >= 10: DST = dt >= dst_start (fim está no próximo ano)
    # Se mês < 10:  DST = dt < third_sun (início foi no ano anterior)
    if local_dt.month >= 10:
        return local_dt >= dst_start
    else:
        return local_dt < third_sun


def to_julian_day(year: int, month: int, day: int, hour: float) -> float:
    """Calculate Julian Day from civil date and time."""
    return swe.julday(year, month, day, hour)


def degree_to_sign(degree: float) -> tuple:
    """Convert absolute degree (0-360) to (sign_name, position_in_sign)."""
    normalized = degree % 360
    sign_index = int(normalized // 30)
    pos_in_sign = normalized % 30
    return SIGN_ORDER[sign_index], pos_in_sign


def get_planetary_hour(dt: datetime) -> str:
    """Calculate the planet ruling the current hour (Chaldean order)."""
    day_of_week = (dt.weekday() + 1) % 7
    day_regent = DAY_REGENTS[day_of_week]
    start_idx = CHALDEAN_ORDER.index(day_regent)
    hour_idx = (start_idx + dt.hour) % len(CHALDEAN_ORDER)
    return str(CHALDEAN_ORDER[hour_idx])


def get_moon_phase_name(diff: float) -> dict:
    """Calculate moon phase from Sun-Moon longitude difference."""
    if diff < 22.5 or diff >= 337.5:
        return {"phase": "Nova", "icon": "🌑", "illumination": 0.0}
    elif diff < 67.5:
        return {"phase": "Crescente", "icon": "🌒", "illumination": round(diff / 90 * 50, 1)}
    elif diff < 112.5:
        return {"phase": "Quarto Crescente", "icon": "🌓", "illumination": round(50 + (diff - 67.5) / 45 * 50, 1)}
    elif diff < 157.5:
        return {"phase": "Gibosa Crescente", "icon": "🌔", "illumination": round(50 + (diff - 112.5) / 45 * 50, 1)}
    elif diff < 202.5:
        return {"phase": "Cheia", "icon": "🌕", "illumination": 100.0}
    elif diff < 247.5:
        return {"phase": "Gibosa Minguante", "icon": "🌖", "illumination": round(100 - (diff - 202.5) / 45 * 50, 1)}
    elif diff < 292.5:
        return {"phase": "Quarto Minguante", "icon": "🌗", "illumination": round(50 - (diff - 247.5) / 45 * 50, 1)}
    else:
        return {"phase": "Minguante", "icon": "🌘", "illumination": round((360 - diff) / 45 * 50, 1)}


def calculate_whole_sign_houses(asc_degree: float) -> List[float]:
    """Calculate Whole Sign house cusps. House 1 starts at 0 of the sign containing ASC."""
    asc_sign_start = (asc_degree // 30) * 30
    return [(asc_sign_start + i * 30) % 360 for i in range(12)]


def calculate_aspects(planets: Dict, speeds: Dict) -> List[Dict]:
    """Calculate all aspects between planets with correct applying/separating logic.
    
    Applying = the angular distance to the exact aspect angle is DECREASING.
    Separating = the angular distance is INCREASING.
    
    The rate of change of angular distance depends on:
    - Whether the aspect is on the short arc (dist < 180) or long arc
    - The relative speeds of the two planets
    - The direction of approach to the aspect angle
    """
    keys = list(planets.keys())
    aspects_list = []
    
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            p1 = keys[i]
            p2 = keys[j]
            d1 = planets[p1].get("degree", 0)
            d2 = planets[p2].get("degree", 0)
            
            diff = abs(d1 - d2) % 360
            dist = 360 - diff if diff > 180 else diff
            
            for asp in ASPECTS:
                angle_val = asp["angle"]
                orb_limit = get_orb_limit(asp["type"], p1, p2)
                dist_from_angle = abs(dist - angle_val)
                
                if dist_from_angle < orb_limit:
                    s1 = speeds.get(p1, 0)
                    s2 = speeds.get(p2, 0)
                    
                    # Correct applying/separating logic:
                    # Compute the signed angular difference (d1 - d2) normalized to [-180, 180]
                    signed_diff = (d1 - d2) % 360
                    if signed_diff > 180:
                        signed_diff -= 360
                    
                    # Rate of change of signed angular difference
                    rate = s1 - s2
                    
                    # For the aspect at angle_val:
                    # If signed_diff is positive and rate is negative → approaching (applying)
                    # If signed_diff is negative and rate is positive → approaching (applying)
                    # General rule: signed_diff * rate < 0 means approaching
                    if rate != 0:
                        applying = (signed_diff * rate) < 0
                    else:
                        applying = True  # stationary, assume applying
                    
                    aspects_list.append({
                        "p1": p1,
                        "p2": p2,
                        "type": asp["type"],
                        "symbol": asp["symbol"],
                        "orb": round(dist_from_angle, 2),
                        "applying": applying
                    })
                    break
    
    return aspects_list


def calculate_astrology(
    year: int,
    month: int,
    day: int,
    hour: float,
    lat: float = -15.7833,
    lon: float = -47.9333,
    house_system: str = "Regiomontanus",
) -> Dict[str, Any]:
    """Main calculation: Swiss Ephemeris for planets + houses."""
    
    if not SWE_AVAILABLE and not KERYKEION_AVAILABLE:
        return {"error": "Neither swisseph nor kerykeion available."}
    
    try:
        # Convert local time to UTC for Julian Day
        # Brazil standard time: UTC-3 → UTC = local + 3 hours
        # Brazil DST time: UTC-2 → UTC = local + 2 hours
        # offset_hours is negative (-2 or -3), so subtraction adds the hours
        local_dt = datetime(year, month, day, int(hour), int((hour % 1) * 60))
        offset_hours = -2 if is_brazil_dst(local_dt) else -3
        utc_hour = hour - offset_hours
        
        # House system: respect user selection from control panel
        if house_system == "Whole Sign":
            house_system = "Whole_Sign"
        if not house_system:
            house_system = "Regiomontanus"
        
        jd = to_julian_day(year, month, day, utc_hour)
        flags = swe.FLG_SWIEPH | swe.FLG_SPEED
        
        # ─── PLANETS via Swiss Ephemeris ───
        planets_data: Dict[str, Dict[str, Any]] = {}
        speeds: Dict[str, float] = {}
        ephemeris_mode = "unknown"
        
        for name, pid in SWE_PLANETS.items():
            r = swe.calc(jd, pid, flags)
            if r and r[0]:
                # Detect ephemeris fallback on first planet
                if ephemeris_mode == "unknown":
                    returned_flags = r[1]
                    if returned_flags & swe.FLG_SWIEPH:
                        ephemeris_mode = "swiss"
                    elif returned_flags & swe.FLG_MOSEPH:
                        ephemeris_mode = "moshier"
                    elif returned_flags & swe.FLG_JPLEPH:
                        ephemeris_mode = "jpl"
                    else:
                        ephemeris_mode = f"unknown({returned_flags})"
                ecl_lon = r[0][0] % 360
                ecl_lat = r[0][1]
                speed = r[0][3] if len(r[0]) > 3 else 0
                sign, pos = degree_to_sign(ecl_lon)
                
                planets_data[name] = {
                    "degree": round(ecl_lon, 2),
                    "sign": sign[:3],  # Abbreviated: Sag, Cap, Aqu, etc.
                    "sign_full": sign,
                    "pos_in_sign": round(pos, 2),
                    "retrograde": speed < 0,
                    "speed": round(speed, 4),
                    "stationary": abs(speed) < 0.001,
                }
                speeds[name] = speed
        
        # ─── HOUSES via Swiss Ephemeris ───
        hsys = HOUSE_SYSTEMS.get(house_system, "R")
        swe_vertex: Optional[float] = None
        if house_system == "Whole_Sign" or house_system == "Whole Sign":
            # Whole Sign: get ASC from SWE houses, then calculate cusps at 0° of each sign
            _, ascmc = swe.houses(jd, lat, lon, hsys.encode() if hsys != 'W' else b'P')
            asc_degree = ascmc[0]  # ASC
            mc_degree = ascmc[1]   # MC
            swe_vertex = ascmc[3] if len(ascmc) > 3 else None  # Vertex from SWE
            cusps_raw = calculate_whole_sign_houses(asc_degree)
            house_system_used = "Whole_Sign"
        else:
            cusps_raw, ascmc = swe.houses(jd, lat, lon, hsys.encode())
            asc_degree = ascmc[0]
            mc_degree = ascmc[1]
            swe_vertex = ascmc[3] if len(ascmc) > 3 else None  # Vertex from SWE
            house_system_used = house_system
        
        # Angles
        angles = {
            "ASC": round(asc_degree, 2),
            "MC": round(mc_degree, 2),
            "DSC": round((asc_degree + 180) % 360, 2),
            "IC": round((mc_degree + 180) % 360, 2),
        }
        
        # Add ASC and MC to planets for aspect calculation
        asc_sign, asc_pos = degree_to_sign(asc_degree)
        planets_data["ASC"] = {
            "degree": round(asc_degree, 2),
            "sign": asc_sign[:3],
            "sign_full": asc_sign,
            "pos_in_sign": round(asc_pos, 2),
            "retrograde": False,
            "speed": 0,
        }
        speeds["ASC"] = 0
        
        mc_sign, mc_pos = degree_to_sign(mc_degree)
        planets_data["MC"] = {
            "degree": round(mc_degree, 2),
            "sign": mc_sign[:3],
            "sign_full": mc_sign,
            "pos_in_sign": round(mc_pos, 2),
            "retrograde": False,
            "speed": 0,
        }
        speeds["MC"] = 0
        
        # Houses list
        houses_list = []
        for i, deg in enumerate(cusps_raw, 1):
            sign, pos = degree_to_sign(deg)
            houses_list.append({
                "house": i,
                "degree": round(deg, 2),
                "sign": sign,
                "pos_in_sign": round(pos, 2),
            })
        
        # Assign planets to houses
        def assign_to_house(deg: float) -> int:
            """Find which house a degree belongs to (handles wrap-around)."""
            for i in range(12):
                cusp_start = cusps_raw[i]
                cusp_end = cusps_raw[(i + 1) % 12]
                if cusp_start < cusp_end:
                    in_house = cusp_start <= deg < cusp_end
                else:  # wraps around 0°
                    in_house = deg >= cusp_start or deg < cusp_end
                if in_house:
                    return i + 1
            return 12

        for name in planets_data:
            if name in ("ASC", "MC", "DSC", "IC"):
                continue
            planets_data[name]["house"] = assign_to_house(planets_data[name]["degree"])
        
        # ─── CHIRON ───
        chiron_deg = None
        if SWE_AVAILABLE:
            try:
                r = swe.calc(jd, swe.CHIRON, flags)
                if r and r[0]:
                    chiron_deg = r[0][0] % 360
                    speed = r[0][3] if len(r[0]) > 3 else 0
                    sign, pos = degree_to_sign(chiron_deg)
                    planets_data["Chiron"] = {
                        "degree": round(chiron_deg, 2),
                        "sign": sign[:3],
                        "sign_full": sign,
                        "pos_in_sign": round(pos, 2),
                        "retrograde": speed < 0,
                        "speed": round(speed, 4),
                    }
                    speeds["Chiron"] = speed
            except Exception:
                chiron_deg = None
        
        # Fallback to kerykeion for Chiron
        if "Chiron" not in planets_data and KERYKEION_AVAILABLE:
            try:
                ksubject = AstrologicalSubject(
                    "tmp", year, month, day, int(hour), int((hour % 1) * 60),
                    lat=lat, lng=lon, tz_str="America/Sao_Paulo",
                    is_dst=is_brazil_dst(local_dt),
                )
                kmodel = ksubject.model()
                kchiron = getattr(kmodel, "chiron", None)
                if kchiron is not None:
                    chiron_deg = float(kchiron.abs_pos)
                    speed = float(kchiron.speed)
                    sign, pos = degree_to_sign(chiron_deg)
                    planets_data["Chiron"] = {
                        "degree": round(chiron_deg, 2),
                        "sign": sign[:3],
                        "sign_full": sign,
                        "pos_in_sign": round(pos, 2),
                        "retrograde": bool(kchiron.retrograde) if hasattr(kchiron, 'retrograde') else False,
                        "speed": round(speed, 4),
                    }
                    speeds["Chiron"] = speed
            except Exception:
                pass
        
        # Assign Chiron to house (using same logic as main planets)
        if chiron_deg and "Chiron" in planets_data:
            planets_data["Chiron"]["house"] = assign_to_house(chiron_deg)
        
        # ─── SECONDARY BODIES ───
        moon_deg = planets_data.get("Moon", {}).get("degree", 0)
        sun_deg = planets_data.get("Sun", {}).get("degree", 0)
        asc_d = angles["ASC"]
        
        secondary: Dict[str, Dict[str, Any]] = {}
        
        # North Node (True Lunar Node) via Swiss Ephemeris
        if SWE_AVAILABLE:
            try:
                r = swe.calc(jd, swe.TRUE_NODE, flags)
                if r and r[0]:
                    nn_deg = r[0][0] % 360
                    sign, pos = degree_to_sign(nn_deg)
                    secondary["NorthNode"] = {"degree": round(nn_deg, 2), "sign": sign, "pos_in_sign": round(pos, 2)}
                    sn_deg = (nn_deg + 180) % 360
                    sign, pos = degree_to_sign(sn_deg)
                    secondary["SouthNode"] = {"degree": round(sn_deg, 2), "sign": sign, "pos_in_sign": round(pos, 2)}
            except Exception:
                nn_deg = (moon_deg + 180) % 360
                secondary["NorthNode"] = {"degree": round(nn_deg, 2), **dict(zip(["sign", "pos_in_sign"], degree_to_sign(nn_deg)))}
                sn_deg = moon_deg
                secondary["SouthNode"] = {"degree": round(sn_deg, 2), **dict(zip(["sign", "pos_in_sign"], degree_to_sign(sn_deg)))}
        else:
            nn_deg = (moon_deg + 180) % 360
            secondary["NorthNode"] = {"degree": round(nn_deg, 2), **dict(zip(["sign", "pos_in_sign"], degree_to_sign(nn_deg)))}
            sn_deg = moon_deg
            secondary["SouthNode"] = {"degree": round(sn_deg, 2), **dict(zip(["sign", "pos_in_sign"], degree_to_sign(sn_deg)))}
        
        # Lilith (Mean Lunar Apogee)
        if SWE_AVAILABLE:
            try:
                r = swe.calc(jd, swe.MEAN_APOG, flags)
                if r and r[0]:
                    lil_deg = r[0][0] % 360
                    sign, pos = degree_to_sign(lil_deg)
                    secondary["Lilith"] = {"degree": round(lil_deg, 2), "sign": sign, "pos_in_sign": round(pos, 2)}
                else:
                    lil_deg = (moon_deg - 180) % 360
                    secondary["Lilith"] = {"degree": round(lil_deg, 2), **dict(zip(["sign", "pos_in_sign"], degree_to_sign(lil_deg)))}
            except Exception:
                lil_deg = (moon_deg - 180) % 360
                secondary["Lilith"] = {"degree": round(lil_deg, 2), **dict(zip(["sign", "pos_in_sign"], degree_to_sign(lil_deg)))}
        else:
            lil_deg = (moon_deg - 180) % 360
            secondary["Lilith"] = {"degree": round(lil_deg, 2), **dict(zip(["sign", "pos_in_sign"], degree_to_sign(lil_deg)))}
        
        # Part of Fortune
        fo_deg = (asc_d + moon_deg - sun_deg) % 360
        sign, pos = degree_to_sign(fo_deg)
        secondary["PartOfFortune"] = {"degree": round(fo_deg, 2), "sign": sign, "pos_in_sign": round(pos, 2)}
        
        # Vertex - use SWE value if available, fallback to approximation
        if swe_vertex is not None:
            v_deg = swe_vertex % 360
        else:
            v_deg = (asc_d + 90) % 360  # approximation
        sign, pos = degree_to_sign(v_deg)
        secondary["Vertex"] = {"degree": round(v_deg, 2), "sign": sign, "pos_in_sign": round(pos, 2)}
        
        # Assign secondary bodies to houses (using same helper function)
        for name in secondary:
            secondary[name]["house"] = assign_to_house(secondary[name]["degree"])
        
        # ─── ASPECTS ───
        aspects_list = calculate_aspects(planets_data, speeds)
        
        # ─── MOON PHASE ───
        lunar_diff = (moon_deg - sun_deg) % 360
        moon_phase = get_moon_phase_name(lunar_diff)
        
        # ─── REGENCE ───
        regence = {
            "day_regent": str(DAY_REGENTS[(local_dt.weekday() + 1) % 7]),
            "hour_regent": get_planetary_hour(local_dt),
        }
        
        return {
            "planets": planets_data,
            "secondary": secondary,
            "angles": angles,
            "aspects": aspects_list,
            "houses": houses_list,
            "regence": regence,
            "moon_phase": moon_phase,
            "meta": {
                "timestamp": local_dt.isoformat(),
                "location": {"lat": lat, "lon": lon},
                "house_system": house_system_used,
                "ephemeris": ephemeris_mode,
                "jd": round(jd, 6),
            },
        }
        
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


def calculate_transit_positions(
    year: int,
    month: int,
    day: int,
    hour: float,
    lat: float = -15.7833,
    lon: float = -47.9333,
    include_asteroids: bool = False,
) -> Dict[str, Any]:
    """Calcula posições planetárias atuais (trânsitos) para data/hora fornecida.
    
    Retorna apenas planetas e corpos secundários (sem casas, aspectos, ângulos).
    """
    # Chama a função principal mas filtra a saída
    full_result = calculate_astrology(year, month, day, hour, lat, lon)
    if "error" in full_result:
        return full_result
    
    transit_data = {
        "planets": full_result.get("planets", {}),
        "secondary": full_result.get("secondary", {}),
        "moon_phase": full_result.get("moon_phase", {}),
        "meta": full_result.get("meta", {}),
    }
    
    # Filtrar corpos secundários: manter apenas NorthNode (se não quiser asteroides)
    if not include_asteroids:
        allowed = {"NorthNode"}
        transit_data["secondary"] = {
            k: v for k, v in transit_data["secondary"].items() if k in allowed
        }
    
    return transit_data


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    
    try:
        data = None
        if len(sys.argv) > 1:
            raw_data = sys.argv[1]
            try:
                data = json.loads(raw_data)
            except Exception:
                import ast
                try:
                    data = ast.literal_eval(raw_data)
                except Exception:
                    cleaned = raw_data.strip('"').replace('\\"', '"').replace("'", '"')
                    data = json.loads(cleaned)
        
        if data:
            y = int(data.get("year", datetime.now().year))
            m = int(data.get("month", datetime.now().month))
            d = int(data.get("day", datetime.now().day))
            time_val = float(data.get("hour", 12.0))
            lat = float(data.get("lat", -15.7833))
            lon = float(data.get("lon", -47.9333))
            house_system = str(data.get("house_system", "Regiomontanus"))
            transit = data.get("transit", False)
            include_asteroids = data.get("include_asteroids", False)
        else:
            now = datetime.now()
            y, m, d = now.year, now.month, now.day
            time_val = now.hour + now.minute / 60
            lat, lon = -15.7833, -47.9333
            house_system = "Regiomontanus"
            transit = False
            include_asteroids = False
        
        if transit:
            result = calculate_transit_positions(
                y, m, d, time_val, lat, lon,
                include_asteroids=include_asteroids
            )
        else:
            result = calculate_astrology(y, m, d, time_val, lat, lon, house_system)
        output = json.dumps(result, ensure_ascii=False, indent=2)
        
        print(output, flush=True)
        
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
        while len(history_cache) > 100:
            history_cache.pop(0)
        
        with open(history_path, "w", encoding="utf-8") as f:
            json.dump(history_cache, f, ensure_ascii=False, indent=2)
    
    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
