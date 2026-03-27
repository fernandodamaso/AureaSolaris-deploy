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

function getPlanetLongitude(name: string, n: number): number {
  const formulas: Record<string, (n: number) => number> = {
    Mercury: (n) => (48.3313 + 4.0932377 * n / 36525) % 360,
    Venus: (n) => (118.6770 + 1.602130 * n / 36525) % 360,
    Mars: (n) => (355.4330 + 0.9856474 * n / 36525) % 360,
    Jupiter: (n) => (34.3515 + 0.083091 * n / 36525) % 360,
    Saturn: (n) => (50.0774 + 0.033444 * n / 36525) % 360,
    Uranus: (n) => (314.0550 + 0.051834 * n / 36525) % 360,
    Neptune: (n) => (304.3487 + 0.021028 * n / 36525) % 360,
    Pluto: (n) => (220.0 + 0.00397 * n / 36525) % 360,
    Chiron: (n) => (190.0 + 0.008 * n / 36525) % 360,
  };
  return formulas[name] ? formulas[name](n) : 0;
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

export async function calculateFallback(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  lat: number = -15.7833,
  lon: number = -47.9333,
  houseSystem: string = 'Regiomontanus'
): Promise<AstroCalcResult> {
  const jd = toJulianDay(year, month, day, hour + minute / 60);
  const n = jd - 2451545.0;

  const sunLon = getSunLongitude(jd);
  const moonLon = getMoonLongitude(jd);

  const planets: Record<string, any> = {
    Sun: { ...getSign(sunLon), degree: sunLon, element: getElement(getSign(sunLon).sign), retrograde: false },
    Moon: { ...getSign(moonLon), degree: moonLon, element: getElement(getSign(moonLon).sign), retrograde: false },
  };

  const retrogradePlanets = ['Saturn', 'Uranus', 'Neptune', 'Pluto'];
  for (const name of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron']) {
    const deg = getPlanetLongitude(name, n);
    const sign = getSign(deg);
    planets[name] = {
      sign: sign.sign,
      pos_in_sign: sign.pos_in_sign,
      degree: deg,
      element: getElement(sign.sign),
      retrograde: retrogradePlanets.includes(name)
    };
  }

  const ascDeg = calculateAscendant(lat, lon, jd);
  const mcDeg = (ascDeg + 90) % 360;

  const angles = { ASC: ascDeg, MC: mcDeg, DSC: (ascDeg + 180) % 360, IC: (mcDeg + 180) % 360 };

  const houses = calculateHouses(ascDeg);

  const secondary = {
    NorthNode: { ...getSign((moonLon + 180) % 360), degree: (moonLon + 180) % 360, element: getElement(getSign((moonLon + 180) % 360).sign) },
    SouthNode: { ...getSign(moonLon), degree: moonLon, element: getElement(getSign(moonLon).sign) },
    Lilith: { ...getSign((moonLon - 180 + 360) % 360), degree: (moonLon - 180 + 360) % 360, element: getElement(getSign((moonLon - 180 + 360) % 360).sign) },
    PartOfFortune: { ...getSign((ascDeg + moonLon - sunLon + 360) % 360), degree: (ascDeg + moonLon - sunLon + 360) % 360, element: getElement(getSign((ascDeg + moonLon - sunLon + 360) % 360).sign) },
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
