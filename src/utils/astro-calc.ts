const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓'
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', Chiron: '⚷'
};

const PLANET_NAMES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'];

function getSign(degree: number) {
  const d = ((degree % 360) + 360) % 360;
  const idx = Math.floor(d / 30);
  return { sign: SIGNS[idx], pos_in_sign: d % 30 };
}

function getElement(sign: string): string {
  const fire = ['Aries', 'Leo', 'Sagittarius'];
  const earth = ['Taurus', 'Virgo', 'Capricorn'];
  const air = ['Gemini', 'Libra', 'Aquarius'];
  const water = ['Cancer', 'Scorpio', 'Pisces'];
  if (fire.includes(sign)) return 'Fire';
  if (earth.includes(sign)) return 'Earth';
  if (air.includes(sign)) return 'Air';
  if (water.includes(sign)) return 'Water';
  return 'Unknown';
}

function toJulianDay(year: number, month: number, day: number, hour: number): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hour / 24 + B - 1524.5;
}

function getSunLongitude(jd: number): number {
  const n = jd - 2451545.0;
  const L0 = 280.46646 + 0.9856474 * n;
  const m = (357.52911 + 0.98560028 * n) % 360;
  const c = 1.91466 * Math.sin(m * Math.PI / 180) + 0.02 * Math.sin(2 * m * Math.PI / 180);
  return (L0 + c + 360) % 360;
}

function getMoonLongitude(jd: number): number {
  const n = jd - 2451545.0;
  const L = 218.3165 + 481267.8812 * n / 100000;
  const l = (13.176396 * n / 100000) % 360;
  const d = L - getSunLongitude(jd);
  const mm = l - 0.111404 * n / 100000;
  const corr = 6.289 * Math.sin(mm * Math.PI / 180)
    + 1.274 * Math.sin((2 * d - mm) * Math.PI / 180)
    + 0.658 * Math.sin(2 * d * Math.PI / 180);
  return (L + corr + 360) % 360;
}

/**
 * Planetary position using mean longitude + Kepler equation.
 * Constants from JPL/Meeus: mean longitude at J2000, mean motion (°/century),
 * longitude of perihelion, semi-major axis (AU), and eccentricity.
 * Solves Kepler's equation for the equation of center.
 * Returns [heliocentric longitude (°), distance (AU)].
 */
function getPlanetPosition(name: string, T: number): [number, number] {
  // [L0, rate °/century, omega, a (AU), e]
  const data: Record<string, [number, number, number, number, number]> = {
    Mercury: [252.2509, 149472.6746, 77.4561, 0.387, 0.2056],
    Venus:   [181.9798, 58517.8157,  131.5330, 0.723, 0.0068],
    Mars:    [355.4533, 19140.3027,  336.0602, 1.524, 0.0934],
    Jupiter: [34.3515,  3034.9057,   14.7285,  5.203, 0.0485],
    Saturn:  [49.9449,  1222.1138,   92.4319,  9.537, 0.0556],
    Uranus:  [313.2321, 428.4669,    170.9642, 19.19, 0.0463],
    Neptune: [304.8800, 218.4862,    44.9713,  30.07, 0.0095],
    Pluto:   [238.9288, 145.2060,    224.0689, 39.48, 0.2488],
    Chiron:  [190.0,    727.0,       208.0,    13.7,  0.073],
  };
  const d = data[name];
  if (!d) return [0, 0];
  const [L0, rate, omega, a, e] = d;
  const meanLon = (L0 + rate * T) % 360;
  // Mean anomaly
  let M = ((meanLon - omega) % 360 + 360) % 360;
  const Mrad = M * Math.PI / 180;
  // Solve Kepler's equation iteratively: M = E - e*sin(E)
  let E = Mrad;
  for (let i = 0; i < 10; i++) {
    E = Mrad + e * Math.sin(E);
  }
  // True anomaly from eccentric anomaly
  const sinV = Math.sqrt(1 - e * e) * Math.sin(E) / (1 - e * Math.cos(E));
  const cosV = (Math.cos(E) - e) / (1 - e * Math.cos(E));
  const v = Math.atan2(sinV, cosV) * 180 / Math.PI;
  // Heliocentric longitude and distance
  const lon = ((v + omega + 360) % 360);
  const r = a * (1 - e * Math.cos(E));
  return [lon, r];
}

/** Convert heliocentric to geocentric longitude given Earth's ecliptic longitude. */
function toGeocentric(helioLon: number, helioR: number, earthLon: number): number {
  const helioRad = helioLon * Math.PI / 180;
  const earthRad = earthLon * Math.PI / 180;
  const px = helioR * Math.cos(helioRad) - Math.cos(earthRad);
  const py = helioR * Math.sin(helioRad) - Math.sin(earthRad);
  return ((Math.atan2(py, px) * 180 / Math.PI) + 360) % 360;
}

function calculateHouses(ascDeg: number): number[] {
  const houses: number[] = [];
  for (let i = 0; i < 12; i++) {
    houses.push((ascDeg + i * 30) % 360);
  }
  return houses;
}

function calculateAscendant(lat: number, lon: number, jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const obliquity = 23.4393 - 0.013 * T;
  const GMST = (280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T) % 360;
  const LST = (GMST + lon + 360) % 360;
  const tanLat = Math.tan(lat * Math.PI / 180);
  const cosObl = Math.cos(obliquity * Math.PI / 180);
  const sinObl = Math.sin(obliquity * Math.PI / 180);
  const sinLST = Math.sin(LST * Math.PI / 180);
  const cosLST = Math.cos(LST * Math.PI / 180);
  const asc = Math.atan2(sinLST * cosObl - tanLat * sinObl, cosLST) * 180 / Math.PI;
  return (asc + 360) % 360;
}

import { getAspectOrbs } from './astro-settings';

function calculateAspects(planets: Record<string, any>): any[] {
  const aspects: any[] = [];
  const aspectDefs = Object.values(getAspectOrbs());

  const planetKeys = Object.keys(planets);
  for (let i = 0; i < planetKeys.length; i++) {
    for (let j = i + 1; j < planetKeys.length; j++) {
      const d1 = planets[planetKeys[i]]?.degree || 0;
      const d2 = planets[planetKeys[j]]?.degree || 0;
      const diff = Math.abs(d1 - d2) % 360;
      const dist = diff > 180 ? 360 - diff : diff;

      for (const a of aspectDefs) {
        if (Math.abs(dist - a.angle) < a.orb) {
          aspects.push({ p1: planetKeys[i], p2: planetKeys[j], type: a.type, symbol: a.symbol, orb: Math.round(dist * 100) / 100, applying: true });
        }
      }
    }
  }
  return aspects;
}

function calculateMoonPhase(moonDeg: number, sunDeg: number): { phase: string; icon: string; illumination: number } {
  const diff = ((moonDeg - sunDeg) % 360 + 360) % 360;
  if (diff >= 337.5 || diff < 22.5) return { phase: 'Nova', icon: '🌑', illumination: 0 };
  if (diff < 67.5) return { phase: 'Crescente', icon: '🌒', illumination: Math.round(diff / 360 * 100 * 100) / 100 };
  if (diff < 112.5) return { phase: 'Quarto Crescente', icon: '🌓', illumination: Math.round(diff / 360 * 100 * 100) / 100 };
  if (diff < 157.5) return { phase: 'Gibosa Crescente', icon: '🌔', illumination: Math.round(diff / 360 * 100 * 100) / 100 };
  if (diff < 202.5) return { phase: 'Cheia', icon: '🌕', illumination: 100 };
  if (diff < 247.5) return { phase: 'Gibosa Minguante', icon: '🌖', illumination: Math.round((360 - diff) / 360 * 100 * 100) / 100 };
  if (diff < 292.5) return { phase: 'Quarto Minguante', icon: '🌗', illumination: Math.round((360 - diff) / 360 * 100 * 100) / 100 };
  return { phase: 'Minguante', icon: '🌘', illumination: Math.round((360 - diff) / 360 * 100 * 100) / 100 };
}

export interface AstroCalcResult {
  planets: Record<string, any>;
  secondary: Record<string, any>;
  angles: Record<string, number>;
  houses: number[];
  aspects: any[];
  moon_phase: { phase: string; icon: string; illumination: number };
  regence: { day_regent: string; hour_regent: string };
  meta: { timestamp: string; location: { lat: number; lon: number }; house_system: string };
}

function getPlanetLongitude(name: string, n: number): number {
  const T = n / 36525.0;
  const [helioLon, helioR] = getPlanetPosition(name, T);
  const jd = n + 2451545.0;
  const sunLon = getSunLongitude(jd);
  const earthLon = (sunLon + 180) % 360;
  return toGeocentric(helioLon, helioR, earthLon);
}

export async function calculateFallback(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  lat: number,
  lon: number,
  houseSystem: string = 'Equal'
): Promise<AstroCalcResult> {
  const jd = toJulianDay(year, month, day, hour + minute / 60);
  const n = jd - 2451545.0;

  const sunLon = getSunLongitude(jd);
  const moonLon = getMoonLongitude(jd);

  const planets: Record<string, any> = {
    Sun: { ...getSign(sunLon), degree: sunLon, element: getElement(getSign(sunLon).sign), retrograde: false },
    Moon: { ...getSign(moonLon), degree: moonLon, element: getElement(getSign(moonLon).sign), retrograde: false },
  };

   // List of bodies that can potentially be retrograde (excluding Sun and Moon)
   const potentiallyRetrograde = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'];
   for (const name of potentiallyRetrograde) {
     const deg = getPlanetLongitude(name, n);
     const sign = getSign(deg);
     // In fallback without speed data, we cannot accurately determine retrograde status
     // The Python engine handles this correctly using actual planetary speeds
     planets[name] = {
       sign: sign.sign,
       pos_in_sign: sign.pos_in_sign,
       degree: deg,
       element: getElement(sign.sign),
       retrograde: false // Placeholder - actual calculation done in Python engine
     };
   }

  const ascDeg = calculateAscendant(lat, lon, jd);
  const mcDeg = (ascDeg + 90) % 360;

  const angles = { ASC: ascDeg, MC: mcDeg, DSC: (ascDeg + 180) % 360, IC: (mcDeg + 180) % 360 };

  const houses = calculateHouses(ascDeg);

  const sunAscDiff = (sunLon - ascDeg + 360) % 360;
  const diurnal = sunAscDiff > 180;
  const pofDeg = diurnal ? (ascDeg + moonLon - sunLon + 360) % 360 : (ascDeg + sunLon - moonLon + 360) % 360;
  const posDeg = diurnal ? (ascDeg + sunLon - moonLon + 360) % 360 : (ascDeg + moonLon - sunLon + 360) % 360;

  const secondary = {
    NorthNode: { ...getSign((moonLon + 180) % 360), degree: (moonLon + 180) % 360, element: getElement(getSign((moonLon + 180) % 360).sign) },
    SouthNode: { ...getSign(moonLon), degree: moonLon, element: getElement(getSign(moonLon).sign) },
    Lilith: { ...getSign((moonLon - 180 + 360) % 360), degree: (moonLon - 180 + 360) % 360, element: getElement(getSign((moonLon - 180 + 360) % 360).sign) },
    PartOfFortune: { ...getSign(pofDeg), degree: pofDeg, element: getElement(getSign(pofDeg).sign) },
    ParsSpiritus: { ...getSign(posDeg), degree: posDeg, element: getElement(getSign(posDeg).sign) },
    Vertex: { ...getSign((ascDeg + 60) % 360), degree: (ascDeg + 60) % 360, element: getElement(getSign((ascDeg + 60) % 360).sign) },
  };

  const aspects = calculateAspects(planets);
  const moon_phase = calculateMoonPhase(moonLon, sunLon);

  const dayOfWeek = (new Date(year, month - 1, day).getDay() + 1) % 7;
  const dayRegent = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'][dayOfWeek];
  const chaldeanOrder = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
  const startIdx = chaldeanOrder.indexOf(dayRegent);
  const hourIdx = (startIdx + Math.floor(hour)) % 7;
  const hourRegent = chaldeanOrder[hourIdx];

  return {
    planets,
    secondary,
    angles,
    houses,
    aspects,
    moon_phase,
    regence: { day_regent: dayRegent, hour_regent: hourRegent },
    meta: { timestamp: new Date().toISOString(), location: { lat, lon }, house_system: houseSystem }
  };
}

export { SIGN_SYMBOLS, PLANET_SYMBOLS, PLANET_NAMES };
