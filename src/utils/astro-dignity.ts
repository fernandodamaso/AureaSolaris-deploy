/**
 * astro-dignity.ts
 * Pure TypeScript utility for classical (Ptolemaic/Hellenistic) and modern
 * astrological dignity calculations.
 *
 * No React, no side-effects — all functions are pure and deterministic.
 */

// ─── Sign Index Helpers ──────────────────────────────────────────────────────

export const SIGN_NAMES_PT = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
  'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes',
];

export const SIGN_SYMBOLS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

export const ELEMENTS: ('fire' | 'earth' | 'air' | 'water')[] = [
  'fire','earth','air','water',
  'fire','earth','air','water',
  'fire','earth','air','water',
];

export const QUALITIES: ('cardinal' | 'fixed' | 'mutable')[] = [
  'cardinal','fixed','mutable',
  'cardinal','fixed','mutable',
  'cardinal','fixed','mutable',
  'cardinal','fixed','mutable',
];

export const ELEMENT_LABELS: Record<string, string> = {
  fire: 'Fogo', earth: 'Terra', air: 'Ar', water: 'Água',
};

export const QUALITY_LABELS: Record<string, string> = {
  cardinal: 'Cardinal', fixed: 'Fixo', mutable: 'Mutável',
};

export const ELEMENT_COLORS: Record<string, string> = {
  fire: '#D94F3D', earth: '#5B8C5A', air: '#C4A84D', water: '#3D6FA0',
};

export const QUALITY_COLORS: Record<string, string> = {
  cardinal: '#8B5CF6', fixed: '#EC4899', mutable: '#14B8A6',
};

export const ELEMENT_EMOJIS: Record<string, string> = {
  fire: '🔥', earth: '🌿', air: '🌬️', water: '💧',
};

export const normDeg = (d: number) => ((d % 360) + 360) % 360;
export const getSignIdx = (deg: number) => Math.floor(normDeg(deg) / 30);

export const formatDeg = (absDeg: number) => {
  const sd = normDeg(absDeg) % 30;
  const d = Math.floor(sd);
  const m = Math.floor((sd - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}'`;
};

// ─── Domicile Tables ─────────────────────────────────────────────────────────

/** Traditional (7 classical planets) domicile rulers per sign index */
export const TRAD_DOMICILE: Record<number, string> = {
  0: 'Mars',    // Aries
  1: 'Venus',   // Taurus
  2: 'Mercury', // Gemini
  3: 'Moon',    // Cancer
  4: 'Sun',     // Leo
  5: 'Mercury', // Virgo
  6: 'Venus',   // Libra
  7: 'Mars',    // Scorpio
  8: 'Jupiter', // Sagittarius
  9: 'Saturn',  // Capricorn
  10: 'Saturn', // Aquarius
  11: 'Jupiter',// Pisces
};

/** Modern co-rulers added on top of traditional */
export const MODERN_DOMICILE: Record<number, string> = {
  7: 'Pluto',   // Scorpio
  10: 'Uranus', // Aquarius
  11: 'Neptune',// Pisces
};

/** Detriment = opposite sign of domicile */
export const TRAD_DETRIMENT: Record<number, string> = {
  6: 'Mars',    // Libra (Mars rules Aries)
  7: 'Venus',   // Scorpio (Venus rules Taurus)
  8: 'Mercury', // Sagittarius (Merc rules Gemini)
  9: 'Moon',    // Capricorn (Moon rules Cancer)
  10: 'Sun',    // Aquarius (Sun rules Leo)
  11: 'Mercury',// Pisces (Merc rules Virgo)
  0: 'Venus',   // Aries (Venus rules Libra)
  1: 'Mars',    // Taurus (Mars rules Scorpio)
  2: 'Jupiter', // Gemini (Jup rules Sag)
  3: 'Saturn',  // Cancer (Sat rules Cap)
  4: 'Saturn',  // Leo (Sat rules Aqua)
  5: 'Jupiter', // Virgo (Jup rules Pisces)
};

export const MODERN_DETRIMENT: Record<number, string> = {
  1: 'Pluto',   // Taurus (Pluto rules Scorpio)
  4: 'Uranus',  // Leo (Uranus rules Aquarius)
  5: 'Neptune', // Virgo (Neptune rules Pisces)
};

// ─── Exaltation / Fall ──────────────────────────────────────────────────────

/** Exaltation: planet → sign index where it's exalted */
export const EXALTATION_SIGN: Record<string, number> = {
  Sun: 0,     // Aries
  Moon: 1,    // Taurus
  Mercury: 5, // Virgo
  Venus: 11,  // Pisces
  Mars: 9,    // Capricorn
  Jupiter: 3, // Cancer
  Saturn: 6,  // Libra
};

// Modern: Neptune in Pisces feels most at home, but exaltation debates exist.
// Using Pisces for Neptune exaltation (most modern consensus)
export const MODERN_EXALTATION_SIGN: Record<string, number> = {
  Uranus: 10,  // Aquarius
  Neptune: 11, // Pisces
  Pluto: 0,    // Aries
};

/** Fall = opposite sign of exaltation */
export const FALL_SIGN: Record<string, number> = {
  Sun: 6,     // Libra
  Moon: 7,    // Scorpio
  Mercury: 11,// Pisces
  Venus: 5,   // Virgo
  Mars: 3,    // Cancer
  Jupiter: 9, // Capricorn
  Saturn: 0,  // Aries
};

// ─── Triplicity Rulers (Dorothean System) ───────────────────────────────────
// Each element has Day ruler, Night ruler, and Cooperating (Participating) ruler

interface TriplicityRulers {
  day: string;
  night: string;
  cooperating: string;
}

export const TRIPLICITY: Record<string, TriplicityRulers> = {
  fire:  { day: 'Sun',    night: 'Jupiter', cooperating: 'Saturn' },
  earth: { day: 'Venus',  night: 'Moon',    cooperating: 'Mars'   },
  air:   { day: 'Saturn', night: 'Mercury', cooperating: 'Jupiter'},
  water: { day: 'Venus',  night: 'Mars',    cooperating: 'Moon'   },
};

// ─── Egyptian Terms ──────────────────────────────────────────────────────────

interface TermBound {
  planet: string;
  start: number; // position within sign (0–30)
  end: number;
}

const TERMS: TermBound[][] = [
  // Aries
  [{p:'Jupiter',s:0,e:6},{p:'Venus',s:6,e:12},{p:'Mercury',s:12,e:20},{p:'Mars',s:20,e:25},{p:'Saturn',s:25,e:30}],
  // Taurus
  [{p:'Venus',s:0,e:8},{p:'Mercury',s:8,e:14},{p:'Jupiter',s:14,e:22},{p:'Saturn',s:22,e:27},{p:'Mars',s:27,e:30}],
  // Gemini
  [{p:'Mercury',s:0,e:6},{p:'Jupiter',s:6,e:12},{p:'Venus',s:12,e:17},{p:'Mars',s:17,e:24},{p:'Saturn',s:24,e:30}],
  // Cancer
  [{p:'Mars',s:0,e:7},{p:'Venus',s:7,e:13},{p:'Mercury',s:13,e:19},{p:'Jupiter',s:19,e:26},{p:'Saturn',s:26,e:30}],
  // Leo
  [{p:'Jupiter',s:0,e:6},{p:'Venus',s:6,e:11},{p:'Saturn',s:11,e:18},{p:'Mercury',s:18,e:24},{p:'Mars',s:24,e:30}],
  // Virgo
  [{p:'Mercury',s:0,e:7},{p:'Venus',s:7,e:17},{p:'Jupiter',s:17,e:21},{p:'Mars',s:21,e:28},{p:'Saturn',s:28,e:30}],
  // Libra
  [{p:'Saturn',s:0,e:6},{p:'Mercury',s:6,e:14},{p:'Jupiter',s:14,e:21},{p:'Venus',s:21,e:28},{p:'Mars',s:28,e:30}],
  // Scorpio
  [{p:'Mars',s:0,e:7},{p:'Venus',s:7,e:11},{p:'Jupiter',s:11,e:19},{p:'Mercury',s:19,e:24},{p:'Saturn',s:24,e:30}],
  // Sagittarius
  [{p:'Jupiter',s:0,e:12},{p:'Venus',s:12,e:17},{p:'Mercury',s:17,e:21},{p:'Saturn',s:21,e:26},{p:'Mars',s:26,e:30}],
  // Capricorn
  [{p:'Venus',s:0,e:6},{p:'Mercury',s:6,e:12},{p:'Jupiter',s:12,e:19},{p:'Saturn',s:19,e:25},{p:'Mars',s:25,e:30}],
  // Aquarius
  [{p:'Mercury',s:0,e:7},{p:'Venus',s:7,e:13},{p:'Jupiter',s:13,e:20},{p:'Mars',s:20,e:25},{p:'Saturn',s:25,e:30}],
  // Pisces
  [{p:'Venus',s:0,e:12},{p:'Jupiter',s:12,e:16},{p:'Mercury',s:16,e:19},{p:'Mars',s:19,e:28},{p:'Saturn',s:28,e:30}],
].map(terms =>
  terms.map((t: any) => ({ planet: t.p, start: t.s, end: t.e }))
);

// Ugly hack just to satisfy TS strict mode on the inline type above
// (no actual runtime impact):
const _TERMS_TYPED: TermBound[][] = TERMS;

/** Get the Egyptian Term ruler for a planet at a given absolute degree */
export function getTermRuler(deg: number): string {
  const si = getSignIdx(deg);
  const pos = normDeg(deg) % 30;
  const terms = _TERMS_TYPED[si];
  const term = terms.find(t => pos >= t.start && pos < t.end);
  return term?.planet ?? '';
}

// ─── Decanates ───────────────────────────────────────────────────────────────

/** Chaldean decanate rulers (face rulers): each sign has 3 decanates of 10° each */
const DECANATE_RULERS: string[] = [
  'Mars','Sun','Venus',         // Aries
  'Mercury','Moon','Saturn',    // Taurus
  'Jupiter','Mars','Sun',       // Gemini
  'Venus','Mercury','Moon',     // Cancer
  'Saturn','Jupiter','Mars',    // Leo
  'Sun','Venus','Mercury',      // Virgo
  'Moon','Saturn','Jupiter',    // Libra
  'Mars','Sun','Venus',         // Scorpio
  'Mercury','Moon','Saturn',    // Sagittarius
  'Jupiter','Mars','Sun',       // Capricorn
  'Venus','Mercury','Moon',     // Aquarius
  'Saturn','Jupiter','Mars',    // Pisces
];

export function getDecanateRuler(deg: number): string {
  const si = getSignIdx(deg);
  const pos = normDeg(deg) % 30;
  const decIdx = Math.floor(pos / 10);
  return DECANATE_RULERS[si * 3 + decIdx] ?? '';
}

// ─── Fixed Stars (2026 approximate positions) ──────────────────────────────
export const FIXED_STARS = [
  { name: 'Alpheratz', deg: 14.31 }, // 14° Aries 18'
  { name: 'Hamal', deg: 37.53 },     // 7° Taurus 32'
  { name: 'Alcyone', deg: 60.16 },   // 0° Gemini 10'
  { name: 'Aldebaran', deg: 70.12 }, // 10° Gemini 07'
  { name: 'Rigel', deg: 77.17 },     // 17° Gemini 10'
  { name: 'Sirius', deg: 104.42 },   // 14° Cancer 25'
  { name: 'Castor', deg: 110.57 },   // 20° Cancer 34'
  { name: 'Pollux', deg: 113.55 },   // 23° Cancer 33'
  { name: 'Regulus', deg: 150.17 },  // 0° Virgo 10'
  { name: 'Spica', deg: 204.17 },    // 24° Libra 10'
  { name: 'Arcturus', deg: 204.57 }, // 24° Libra 34'
  { name: 'Antares', deg: 250.10 },  // 10° Sagittarius 06'
  { name: 'Vega', deg: 285.65 },     // 15° Capricorn 39'
  { name: 'Fomalhaut', deg: 334.18 },// 4° Pisces 11'
];

export function getFixedStar(deg: number): string | null {
  for (const star of FIXED_STARS) {
    const diff = Math.abs(normDeg(deg) - star.deg);
    const orb = diff > 180 ? 360 - diff : diff;
    if (orb <= 1.0) return star.name;
  }
  return null;
}

// ─── Solar/Lunar Mansions (28 Manazil) ───────────────────────────────────────
export const MANSIONS = [
  'Al-Sharatain','Al-Butain','Al-Thurayya','Al-Dabaran','Al-Haqa','Al-Hana','Al-Dhira',
  'Al-Nathra','Al-Tarf','Al-Jabha','Al-Zubra','Al-Sarra','Al-Awwa','Al-Simak',
  'Al-Ghafr','Al-Zubana','Al-Iklil','Al-Qalb','Al-Shaula','Al-Naam','Al-Balda',
  'Saad al-Dhabih','Saad al-Bula','Saad al-Suud','Saad al-Akhbiya','Al-Fargh al-Awwal','Al-Fargh al-Thani','Al-Risha'
];

export function getMansion(deg: number): { name: string, deg: number, min: number } {
  const step = 360 / 28; // 12.857...
  const pos = normDeg(deg);
  const idx = Math.floor(pos / step);
  const mansionDeg = pos % step;
  const d = Math.floor(mansionDeg);
  const m = Math.floor((mansionDeg - d) * 60);
  return { name: MANSIONS[idx] || 'Desconhecida', deg: d, min: m };
}

// ─── Motion Status (Fast/Slow) ───────────────────────────────────────────────
export const RETROGRADE_ALLOWED = [
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 
  'Uranus', 'Neptune', 'Pluto', 
  'Chiron', 'NorthNode', 'SouthNode', 'Lilith'
];

export const LENTO_ALLOWED = [
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 
  'Uranus', 'Neptune', 'Pluto', 
  'Chiron', 'NorthNode', 'SouthNode', 'Lilith'
];

export const COMBUST_ALLOWED = ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

const MEAN_SPEEDS: Record<string, number> = {
  Sun: 0.98, Moon: 13.17, Mercury: 1.38, Venus: 1.2, Mars: 0.52,
  Jupiter: 0.08, Saturn: 0.03, Uranus: 0.01, Neptune: 0.006, Pluto: 0.004
};

export function getMotionStatus(planet: string, speed: number): string {
  if (!LENTO_ALLOWED.includes(planet)) return 'Direto';

  const mSpeed = MEAN_SPEEDS[planet];
  if (!mSpeed) return 'Direto';
  
  const ratio = Math.abs(speed) / mSpeed;
  if (ratio > 1.1) return 'Rápido';
  if (ratio < 0.9) return 'Lento';
  return 'Direto';
}

// ─── Oriental / Occidental ──────────────────────────────────────────────────
export function getVisibilityState(planet: string, deg: number, sunDeg: number): string {
  if (planet === 'Sun') return '—';
  // Simplified: Oriental rises before Sun (lower degree), Occidental after (higher degree)
  // We use the 180 degree arc.
  const diff = normDeg(deg - sunDeg);
  return (diff > 180) ? 'Oriental' : 'Ocidental';
}

// ─── Cazimi / Combust ────────────────────────────────────────────────────────
export function getProximityToSun(planet: string, deg: number, sunDeg: number): string | null {
  if (!COMBUST_ALLOWED.includes(planet)) return null;

  const diff = Math.abs(normDeg(deg) - sunDeg);
  const orb = diff > 180 ? 360 - diff : diff;
  if (orb <= 0.28) return 'Cazimi'; // 17 minutes ~ 0.28 degrees
  if (orb <= 8.5) return 'Combusto';
  return null;
}

// ─── Feral (Wild) ──────────────────────────────────────────────────────────── 
const MAIN_PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

export function isFeral(planet: string, planets: Record<string, { degree: number }>): boolean {
  if (!MAIN_PLANETS.includes(planet)) return false;
  
  // Feral = no major aspect (0, 60, 90, 120, 180) to any OTHER main planet
  const p1_deg = planets[planet]?.degree;
  if (p1_deg === undefined) return false;
  
  const MAJOR_ANGLES = [0, 60, 90, 120, 180];
  const ORB = 5; // Standard orb for feral check

  for (const other of MAIN_PLANETS) {
    if (other === planet) continue;
    const p2_data = planets[other];
    if (!p2_data) continue;
    
    const p2_deg = p2_data.degree;
    const diff = Math.abs(p1_deg - p2_deg) % 360;
    const dist = diff > 180 ? 360 - diff : diff;
    
    for (const target of MAJOR_ANGLES) {
      if (Math.abs(dist - target) <= ORB) return false;
    }
  }
  return true;
}

// ─── Planet Name Mapping (EN → display) ─────────────────────────────────────

export const PLANET_NAMES_PT: Record<string, string> = {
  Sun: 'Sol', Moon: 'Lua', Mercury: 'Mercúrio', Venus: 'Vênus',
  Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno',
  Uranus: 'Urano', Neptune: 'Netuno', Pluto: 'Plutão', Chiron: 'Quíron',
};

export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Chiron: '⚷', ASC: 'Asc', MC: 'MC',
};

// ─── Dignity State per Planet ─────────────────────────────────────────────── 

export type DignityState =
  | 'domicile'
  | 'exaltation'
  | 'detriment'
  | 'fall'
  | 'peregrine'; // no essential dignity

export interface DignityInfo {
  state: DignityState;
  label: string;
  color: string;
  bg: string;
}

const DIGNITY_META: Record<DignityState, { label: string; color: string; bg: string }> = {
  domicile:   { label: 'Domicílio',  color: '#16a34a', bg: 'bg-green-50 text-green-700' },
  exaltation: { label: 'Exaltação',  color: '#2563eb', bg: 'bg-blue-50 text-blue-700'  },
  detriment:  { label: 'Exílio',     color: '#dc2626', bg: 'bg-red-50 text-red-600'    },
  fall:       { label: 'Queda',      color: '#d97706', bg: 'bg-amber-50 text-amber-700'},
  peregrine:  { label: '',           color: '#9ca3af', bg: 'bg-gray-50 text-gray-400'  },
};

/**
 * Determine the dignity state for a single planet.
 * Uses both traditional and modern rulerships.
 */
export function getDignityState(planetName: string, degree: number): DignityInfo {
  const si = getSignIdx(degree);

  // Domicile (traditional + modern)
  if (TRAD_DOMICILE[si] === planetName || MODERN_DOMICILE[si] === planetName) {
    const s = 'domicile';
    return { state: s, ...DIGNITY_META[s] };
  }
  // Exaltation (traditional)
  if (EXALTATION_SIGN[planetName] !== undefined && EXALTATION_SIGN[planetName] === si) {
    const s = 'exaltation';
    return { state: s, ...DIGNITY_META[s] };
  }
  // Detriment (traditional + modern)
  if (TRAD_DETRIMENT[si] === planetName || MODERN_DETRIMENT[si] === planetName) {
    const s = 'detriment';
    return { state: s, ...DIGNITY_META[s] };
  }
  // Fall
  if (FALL_SIGN[planetName] !== undefined && FALL_SIGN[planetName] === si) {
    const s = 'fall';
    return { state: s, ...DIGNITY_META[s] };
  }
  return { state: 'peregrine', ...DIGNITY_META['peregrine'] };
}

// ─── Elements & Qualities ───────────────────────────────────────────────────

const COUNTED_PLANETS = [
  'Sun','Moon','Mercury','Venus','Mars',
  'Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron',
];

interface ElementResult {
  fire: number; earth: number; air: number; water: number;
  total: number;
  pct: { fire: number; earth: number; air: number; water: number };
}

export function calcElements(planets: Record<string, { degree: number }>): ElementResult {
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  let total = 0;
  for (const name of COUNTED_PLANETS) {
    const p = planets[name];
    if (!p) continue;
    const el = ELEMENTS[getSignIdx(p.degree)];
    counts[el]++;
    total++;
  }
  const pct = {
    fire:  total ? Math.round((counts.fire  / total) * 100) : 0,
    earth: total ? Math.round((counts.earth / total) * 100) : 0,
    air:   total ? Math.round((counts.air   / total) * 100) : 0,
    water: total ? Math.round((counts.water / total) * 100) : 0,
  };
  return { ...counts, total, pct };
}

interface QualityResult {
  cardinal: number; fixed: number; mutable: number;
  total: number;
  pct: { cardinal: number; fixed: number; mutable: number };
}

export function calcQualities(planets: Record<string, { degree: number }>): QualityResult {
  const counts = { cardinal: 0, fixed: 0, mutable: 0 };
  let total = 0;
  for (const name of COUNTED_PLANETS) {
    const p = planets[name];
    if (!p) continue;
    const q = QUALITIES[getSignIdx(p.degree)];
    counts[q]++;
    total++;
  }
  const pct = {
    cardinal: total ? Math.round((counts.cardinal / total) * 100) : 0,
    fixed:    total ? Math.round((counts.fixed    / total) * 100) : 0,
    mutable:  total ? Math.round((counts.mutable  / total) * 100) : 0,
  };
  return { ...counts, total, pct };
}

// ─── Midpoints ───────────────────────────────────────────────────────────────

export interface MidpointEntry {
  p1: string; p2: string;
  degree: number;  // near midpoint (0–360)
  signIdx: number;
  posInSign: number;
  priority: number; // lower = more important
}

const MIDPOINT_PRIORITY: Record<string, number> = {
  'ASC/MC': 0, 'MC/ASC': 0,
  'Sun/Moon': 1, 'Moon/Sun': 1,
  'ASC/Sun': 2, 'Sun/ASC': 2,
  'ASC/Moon': 3, 'Moon/ASC': 3,
  'Sun/Mars': 4, 'Mars/Sun': 4,
  'Moon/Venus': 5, 'Venus/Moon': 5,
  'Jupiter/Saturn': 6, 'Saturn/Jupiter': 6,
};

export function calcMidpoints(
  planets: Record<string, { degree: number }>,
  maxResults = 10,
): MidpointEntry[] {
  const MP_PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn',
                      'Uranus','Neptune','Pluto','ASC','MC'];
  const available = MP_PLANETS.filter(n => planets[n]);

  const results: MidpointEntry[] = [];

  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const p1 = available[i];
      const p2 = available[j];
      const d1 = normDeg(planets[p1].degree);
      const d2 = normDeg(planets[p2].degree);

      // Near midpoint (shorter arc)
      let mid = (d1 + d2) / 2;
      if (Math.abs(d1 - d2) > 180) mid = normDeg(mid + 180);
      mid = normDeg(mid);

      const key = `${p1}/${p2}`;
      const priority = MIDPOINT_PRIORITY[key] ?? 99;

      results.push({
        p1, p2,
        degree: Math.round(mid * 100) / 100,
        signIdx: getSignIdx(mid),
        posInSign: mid % 30,
        priority,
      });
    }
  }

  // Sort: priority first, then by absolute degree
  results.sort((a, b) => a.priority - b.priority || a.degree - b.degree);
  return results.slice(0, maxResults);
}

// ─── Dignity Scoring ─────────────────────────────────────────────────────────

export interface DignityScore {
  name: string;
  domicile: number;
  exaltation: number;
  triplicity: number;
  terms: number;
  decanate: number;
  detriment: number;
  fall: number;
  totalTrad: number;  // classical only, for traditional score
  totalModern: number; // includes modern rulerships
}

function isDiurnal(planets: Record<string, { degree: number }>): boolean {
  // Chart is diurnal if Sun is above horizon (houses 7–12 approximately)
  // Simplified: Sun degree > ASC degree means above horizon
  const sun = planets['Sun']?.degree ?? 0;
  const asc = planets['ASC']?.degree ?? 0;
  const diff = normDeg(sun - asc);
  return diff < 180; // Sun in eastern hemisphere = diurnal
}

/** Score a single planet across all five essential dignities */
function scorePlanet(
  name: string,
  degree: number,
  planets: Record<string, { degree: number }>,
  useModern: boolean,
): DignityScore {
  const si = getSignIdx(degree);
  const el = ELEMENTS[si];
  const diurnal = isDiurnal(planets);

  let domicile = 0, exaltation = 0, triplicity = 0, terms = 0, decanate = 0;
  let detriment = 0, fall = 0;

  // Domicile (+5) or Detriment (−5)
  const tradDom  = TRAD_DOMICILE[si]   === name;
  const modDom   = MODERN_DOMICILE[si] === name;
  const tradDet  = TRAD_DETRIMENT[si]  === name;
  const modDet   = MODERN_DETRIMENT[si]=== name;

  if (tradDom || (useModern && modDom)) domicile = 5;
  else if (tradDet || (useModern && modDet)) detriment = -5;

  // Exaltation (+4) or Fall (−4)
  const exSign = useModern
    ? (MODERN_EXALTATION_SIGN[name] ?? EXALTATION_SIGN[name])
    : EXALTATION_SIGN[name];
  if (exSign !== undefined && exSign === si) exaltation = 4;
  else if (FALL_SIGN[name] !== undefined && FALL_SIGN[name] === si) fall = -4;

  // Triplicity (+3)
  const tri = TRIPLICITY[el];
  if (tri) {
    const triRuler = diurnal ? tri.day : tri.night;
    if (triRuler === name) triplicity = 3;
    else if (tri.cooperating === name) triplicity = 1; // participating triplicity ruler = +1
  }

  // Terms (+2)
  if (getTermRuler(degree) === name) terms = 2;

  // Decanate (+1)
  if (getDecanateRuler(degree) === name) decanate = 1;

  const totalTrad = domicile + exaltation + triplicity + terms + decanate + detriment + fall;
  const totalModern = totalTrad; // same formula; modern is resolved by useModern flag

  return { name, domicile, exaltation, triplicity, terms, decanate, detriment, fall, totalTrad, totalModern };
}

const TRAD_7 = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
const MODERN_10 = [...TRAD_7, 'Uranus', 'Neptune', 'Pluto'];

export interface DominanceEntry {
  name: string;
  symbol: string;
  namePt: string;
  scoreTrad: number;
  scoreModern: number;
  breakdown: { d: number; e: number; tri: number; ter: number; dec: number; det: number; fall: number };
  dignity: DignityInfo;
}

export function calcDominance(
  planets: Record<string, { degree: number }>,
): DominanceEntry[] {
  const results: DominanceEntry[] = [];

  for (const name of MODERN_10) {
    const p = planets[name];
    if (!p) continue;

    const trad   = scorePlanet(name, p.degree, planets, false);
    const modern = scorePlanet(name, p.degree, planets, true);
    const dignity = getDignityState(name, p.degree);

    results.push({
      name,
      symbol: PLANET_SYMBOLS[name] ?? name[0],
      namePt: PLANET_NAMES_PT[name] ?? name,
      scoreTrad:   trad.totalTrad,
      scoreModern: modern.totalModern,
      breakdown: {
        d:   trad.domicile,
        e:   trad.exaltation,
        tri: trad.triplicity,
        ter: trad.terms,
        dec: trad.decanate,
        det: trad.detriment,
        fall: trad.fall,
      },
      dignity,
    });
  }

  // Sort by modern score descending for display
  results.sort((a, b) => b.scoreModern - a.scoreModern);
  return results;
}

// ─── Regente do Ascendente ──────────────────────────────────────────────────

export interface RegentInfo {
  planet: string;
  planetPt: string;
  symbol: string;
  signPt: string;
  signSymbol: string;
  modernCo?: string;  // modern co-ruler if applicable
  modernCoPt?: string;
  modernCoSymbol?: string;
}

export function calcRegentAsc(ascDeg: number): RegentInfo {
  const si = getSignIdx(ascDeg);
  const trad = TRAD_DOMICILE[si];
  const mod  = MODERN_DOMICILE[si];
  return {
    planet:    trad,
    planetPt:  PLANET_NAMES_PT[trad]   ?? trad,
    symbol:    PLANET_SYMBOLS[trad]    ?? '?',
    signPt:    SIGN_NAMES_PT[si],
    signSymbol: SIGN_SYMBOLS[si],
    ...(mod && mod !== trad ? {
      modernCo:       mod,
      modernCoPt:     PLANET_NAMES_PT[mod] ?? mod,
      modernCoSymbol: PLANET_SYMBOLS[mod]  ?? '?',
    } : {}),
  };
}

// ─── Senhor da Genitura ──────────────────────────────────────────────────────

export interface SenhorInfo {
  planet: string;
  planetPt: string;
  symbol: string;
  scoreTrad: number;
  scoreModern: number;
}

export function calcSenhorGenitura(
  dominance: DominanceEntry[],
): SenhorInfo {
  // Senhor da Genitura = highest traditional dignity score among 7 classical planets
  const trad7 = dominance.filter(d => TRAD_7.includes(d.name));
  const best = trad7.reduce((acc, cur) =>
    cur.scoreTrad > acc.scoreTrad ? cur : acc, trad7[0] ?? dominance[0]);

  return {
    planet:      best?.name     ?? '—',
    planetPt:    best?.namePt   ?? '—',
    symbol:      best?.symbol   ?? '?',
    scoreTrad:   best?.scoreTrad   ?? 0,
    scoreModern: best?.scoreModern ?? 0,
  };
}

// ─── Alcocoden (Giver of Years) ──────────────────────────────────────────────
// Classical: the planet with most dignities over the Hyleg point.
// Simplified modern approach used here:
//   Hyleg = prominence point (Sun in day charts / Moon in night charts).
//   Alcocoden = classical planet with highest dignity score IN the Hyleg's sign.

export interface AlcododenInfo {
  planet: string;
  planetPt: string;
  symbol: string;
  hyleg: string;
  hylegPt: string;
  method: string;
}

export function calcAlcocoden(
  planets: Record<string, { degree: number }>,
): AlcododenInfo {
  const diurnal = isDiurnal(planets);
  const hylegName = diurnal ? 'Sun' : 'Moon';
  const hylegDeg = planets[hylegName]?.degree ?? 0;
  const hylegSign = getSignIdx(hylegDeg);

  // Score each classical planet's dignity IN the Hyleg's sign
  // (evaluate as if the planet were there — i.e. count domicile/exaltation/terms there)
  // Standard approach: which classical planet has most dignities over that sign?
  const scores = TRAD_7.map(name => {
    let sc = 0;
    if (TRAD_DOMICILE[hylegSign] === name) sc += 5;
    if (EXALTATION_SIGN[name] === hylegSign) sc += 4;
    const el = ELEMENTS[hylegSign];
    const tri = TRIPLICITY[el];
    if (tri) {
      const ruler = diurnal ? tri.day : tri.night;
      if (ruler === name) sc += 3;
      if (tri.cooperating === name) sc += 1;
    }
    // Terms in hyleg's position within sign
    if (getTermRuler(hylegDeg) === name) sc += 2;
    if (getDecanateRuler(hylegDeg) === name) sc += 1;
    return { name, sc };
  });

  scores.sort((a, b) => b.sc - a.sc);
  const best = scores[0];

  return {
    planet:    best?.name          ?? '—',
    planetPt:  PLANET_NAMES_PT[best?.name ?? ''] ?? '—',
    symbol:    PLANET_SYMBOLS[best?.name ?? '']  ?? '?',
    hyleg:     hylegName,
    hylegPt:   PLANET_NAMES_PT[hylegName] ?? hylegName,
    method:    diurnal ? 'Carta Diurna' : 'Carta Noturna',
  };
}

// ─── Assinatura Astrológica ──────────────────────────────────────────────────

export interface AstroSignature {
  element: string;
  elementPt: string;
  quality: string;
  qualityPt: string;
  label: string;
  desc: string;
  color: string;
}

// ─── Hyleg (Apheta — Giver of Life) ─────────────────────────────────────────
// Classical rule (simplified):
//   Day chart  → Sun if in aphetical house (1,7,9,10,11), else Moon, else ASC
//   Night chart → Moon if in aphetical house, else Sun, else ASC
// Aphetical houses: 1, 7, 9, 10, 11 (above-horizon angular + succeedent)

export interface HylegInfo {
  planet: string;
  planetPt: string;
  symbol: string;
  degree: number;
  signIdx: number;
  signPt: string;
  signSymbol: string;
  posInSign: string;
  method: string; // 'Diurna' | 'Noturna'
  aphetical: boolean;
}

const APHETICAL_HOUSES = new Set([1, 7, 9, 10, 11]);

export function calcHyleg(
  planets: Record<string, { degree: number; house?: number }>,
): HylegInfo {
  const diurnal = isDiurnal(planets);
  const primary   = diurnal ? 'Sun' : 'Moon';
  const secondary = diurnal ? 'Moon' : 'Sun';

  const tryPlanet = (name: string): HylegInfo | null => {
    const p = planets[name];
    if (!p) return null;
    const house = p.house ?? 1;
    const si  = getSignIdx(p.degree);
    return {
      planet:    name,
      planetPt:  PLANET_NAMES_PT[name] ?? name,
      symbol:    PLANET_SYMBOLS[name] ?? '?',
      degree:    p.degree,
      signIdx:   si,
      signPt:    SIGN_NAMES_PT[si],
      signSymbol: SIGN_SYMBOLS[si],
      posInSign: formatDeg(p.degree),
      method:    diurnal ? 'Diurna' : 'Noturna',
      aphetical: APHETICAL_HOUSES.has(house),
    };
  };

  // Prefer primary if in aphetical house, else try secondary, else fallback to ASC
  const pri = tryPlanet(primary);
  if (pri && pri.aphetical) return pri;
  const sec = tryPlanet(secondary);
  if (sec && sec.aphetical) return sec;
  // Fallback: use primary regardless
  if (pri) return { ...pri, aphetical: false };
  // Last resort: ASC
  const asc = planets['ASC'];
  const si  = asc ? getSignIdx(asc.degree) : 0;
  return {
    planet: 'ASC', planetPt: 'Ascendente', symbol: 'Asc',
    degree: asc?.degree ?? 0, signIdx: si,
    signPt: SIGN_NAMES_PT[si], signSymbol: SIGN_SYMBOLS[si],
    posInSign: formatDeg(asc?.degree ?? 0),
    method: diurnal ? 'Diurna' : 'Noturna', aphetical: true,
  };
}

export function calcAstroSignature(
  elResult: ElementResult,
  qResult: QualityResult,
): AstroSignature {
  const elKey = (['fire','earth','air','water'] as const)
    .reduce((a, b) => elResult[a] >= elResult[b] ? a : b);
  const qKey = (['cardinal','fixed','mutable'] as const)
    .reduce((a, b) => qResult[a] >= qResult[b] ? a : b);

  const elPt = ELEMENT_LABELS[elKey];
  const qPt  = QUALITY_LABELS[qKey];

  const SIGN_MAP: Record<string, Record<string, string>> = {
    fire: { cardinal: 'Áries', fixed: 'Leão', mutable: 'Sagitário' },
    earth: { cardinal: 'Capricórnio', fixed: 'Touro', mutable: 'Virgem' },
    air: { cardinal: 'Libra', fixed: 'Aquário', mutable: 'Gêmeos' },
    water: { cardinal: 'Câncer', fixed: 'Escorpião', mutable: 'Peixes' },
  };

  const dominantSign = SIGN_MAP[elKey][qKey] || 'Desconhecido';

  return {
    element:   elKey,
    elementPt: elPt,
    quality:   qKey,
    qualityPt: qPt,
    label:     dominantSign,
    desc:      `energia de ${elPt.toLowerCase()} ${qPt.toLowerCase()}`,
    color:     ELEMENT_COLORS[elKey],
  };
}
