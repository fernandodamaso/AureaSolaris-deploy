import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Settings, X } from 'lucide-react';
import {
  calcElements, calcQualities, calcMidpoints,
  calcDominance, calcRegentAsc, calcSenhorGenitura,
  calcAlcocoden, calcAstroSignature, calcHyleg, getDignityState,
  SIGN_SYMBOLS as DIGNITY_SIGNS,
  ELEMENT_COLORS as EL_COLORS, ELEMENT_LABELS, ELEMENT_EMOJIS,
  QUALITY_COLORS, QUALITY_LABELS, PLANET_NAMES_PT, PLANET_SYMBOLS as DIGNITY_PSYMBOLS,
  formatDeg as dignityFormatDeg,
} from '../utils/astro-dignity';



/* ─── Interfaces ──────────────────────────────────────────────── */

export interface Planet {
  name: string;
  degree: number;
  sign?: string;
  color?: string;
  symbol?: string;
  retrograde?: boolean;
  isAngle?: boolean;
  stationary?: boolean;
  applying?: boolean;
  speed?: number;
  house?: number;
}

interface House {
  house: number;
  degree: number;
  sign?: string;
}

export interface Aspect {
  p1: string;
  p2: string;
  type: string;
  symbol: string;
  orb: number;
}

interface MandalaChartProps {
  size?: number;
  planets: Planet[];
  houses: House[];
  aspects: Aspect[];
}

/* ─── Constants ────────────────────────────────────────────────── */

const SIGN_SYMBOLS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const SIGN_NAMES = ['Áries','Touro','Gêmeos','Câncer','Leão','Virgem','Libra','Escorpião','Sagitário','Capricórnio','Aquário','Peixes'];
const SIGN_SHORT = ['Ar','To','Gê','Cn','Le','Vi','Li','Es','Sg','Cp','Aq','Pe'];
const SIGN_ELEMENTS: ('fire'|'earth'|'air'|'water')[] = ['fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];

const ELEMENT_COLORS: Record<string, string> = {
  fire: '#D94F3D', earth: '#5B8C5A', air: '#C4A84D', water: '#3D6FA0'
};

const PLANET_COLORS: Record<string, string> = {
  Sun: '#FFD700', Moon: '#C0C0C0', Mercury: '#87CEEB', Venus: '#FF69B4',
  Mars: '#FF4500', Jupiter: '#DAA520', Saturn: '#708090', Uranus: '#00CED1',
  Neptune: '#4169E1', Pluto: '#8B0000', Chiron: '#9370DB',
  NorthNode: '#F97316', SouthNode: '#F97316',
  Lilith: '#A855F7', PartOfFortune: '#FF8C00', Vertex: '#DB2777',
  ASC: '#B8860B', MC: '#B8860B', DSC: '#B8860B', IC: '#B8860B',
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Chiron: '⚷', NorthNode: '☊', SouthNode: '☋', Lilith: '⚸',
  PartOfFortune: '⊗', Vertex: 'Vx',
  ASC: 'Asc', MC: 'MC', DSC: 'Dsc', IC: 'IC',
};

const ASPECT_COLORS: Record<string, string> = {
  'Conjunção': '#FFD700', 'Oposição': '#E74C3C', 'Trígono': '#27AE60',
  'Quadratura': '#E74C3C', 'Sextil': '#3498DB', 'Quincúncio': '#9B59B6',
  'Semi-Sextil': '#95A5A6', 'Quintil': '#1ABC9C', 'Bi-Quintil': '#1ABC9C',
  'Semi-Quadratura': '#E67E22', 'Sesqui-Quadratura': '#E67E22',
};

const ASPECT_OPACITY: Record<string, number> = {
  'Conjunção': 0.7, 'Oposição': 0.55, 'Trígono': 0.45,
  'Quadratura': 0.55, 'Sextil': 0.4,
};

/* ─── Termos (Egyptian Terms) por signo ─────────────────────────── */

interface TermDef { planet: string; start: number; end: number; }

const TERMS: TermDef[][] = [
  [ {planet:'Jupiter',start:0,end:6},{planet:'Venus',start:6,end:12},{planet:'Mercúrio',start:12,end:20},{planet:'Marte',start:20,end:25},{planet:'Saturno',start:25,end:30} ],
  [ {planet:'Vênus',start:0,end:8},{planet:'Mercúrio',start:8,end:14},{planet:'Júpiter',start:14,end:22},{planet:'Saturno',start:22,end:27},{planet:'Marte',start:27,end:30} ],
  [ {planet:'Mercúrio',start:0,end:6},{planet:'Júpiter',start:6,end:12},{planet:'Vênus',start:12,end:17},{planet:'Marte',start:17,end:24},{planet:'Saturno',start:24,end:30} ],
  [ {planet:'Marte',start:0,end:7},{planet:'Vênus',start:7,end:13},{planet:'Mercúrio',start:13,end:19},{planet:'Júpiter',start:19,end:26},{planet:'Saturno',start:26,end:30} ],
  [ {planet:'Júpiter',start:0,end:6},{planet:'Vênus',start:6,end:11},{planet:'Saturno',start:11,end:18},{planet:'Mercúrio',start:18,end:24},{planet:'Marte',start:24,end:30} ],
  [ {planet:'Mercúrio',start:0,end:7},{planet:'Vênus',start:7,end:17},{planet:'Júpiter',start:17,end:21},{planet:'Marte',start:21,end:28},{planet:'Saturno',start:28,end:30} ],
  [ {planet:'Saturno',start:0,end:6},{planet:'Mercúrio',start:6,end:14},{planet:'Júpiter',start:14,end:21},{planet:'Vênus',start:21,end:28},{planet:'Marte',start:28,end:30} ],
  [ {planet:'Marte',start:0,end:7},{planet:'Vênus',start:7,end:11},{planet:'Júpiter',start:11,end:19},{planet:'Mercúrio',start:19,end:24},{planet:'Saturno',start:24,end:30} ],
  [ {planet:'Júpiter',start:0,end:12},{planet:'Vênus',start:12,end:17},{planet:'Mercúrio',start:17,end:21},{planet:'Saturno',start:21,end:26},{planet:'Marte',start:26,end:30} ],
  [ {planet:'Vênus',start:0,end:6},{planet:'Mercúrio',start:6,end:12},{planet:'Júpiter',start:12,end:19},{planet:'Saturno',start:19,end:25},{planet:'Marte',start:25,end:30} ],
  [ {planet:'Mercúrio',start:0,end:7},{planet:'Vênus',start:7,end:13},{planet:'Júpiter',start:13,end:20},{planet:'Marte',start:20,end:25},{planet:'Saturno',start:25,end:30} ],
  [ {planet:'Vênus',start:0,end:12},{planet:'Júpiter',start:12,end:16},{planet:'Mercúrio',start:16,end:19},{planet:'Marte',start:19,end:28},{planet:'Saturno',start:28,end:30} ],
];

/* ─── Decanatos ────────────────────────────────────────────────── */

const DECANATE_RULERS = [
  'Marte','Sol','Vênus',        // Áries
  'Sol','Vênus','Mercúrio',     // Touro
  'Vênus','Mercúrio','Lua',     // Gêmeos
  'Mercúrio','Lua','Saturno',   // Câncer
  'Lua','Saturno','Júpiter',    // Leão
  'Saturno','Júpiter','Marte',  // Virgem
  'Júpiter','Marte','Sol',      // Libra
  'Marte','Sol','Vênus',        // Escorpião
  'Sol','Vênus','Mercúrio',     // Sagitário
  'Vênus','Mercúrio','Lua',     // Capricórnio
  'Mercúrio','Lua','Saturno',   // Aquário
  'Lua','Saturno','Júpiter',    // Peixes
];

/* ─── Helpers ──────────────────────────────────────────────────── */

const normDeg = (d: number) => ((d % 360) + 360) % 360;

const formatDeg = (absDeg: number) => {
  const sd = absDeg % 30;
  const d = Math.floor(sd);
  const m = Math.floor((sd - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}'`;
};

const getSignIdx = (deg: number) => Math.floor(normDeg(deg) / 30);

/* ─── Component ────────────────────────────────────────────────── */

export const MandalaChart = ({ size = 620, planets, houses, aspects }: MandalaChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showDecanates, setShowDecanates] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showAsteroids, setShowAsteroids] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [tooltip, setTooltip] = useState<{
    name: string; sign: string; degree: string;
    retrograde: boolean; stationary: boolean;
    motion: string; color: string; x: number; y: number;
  } | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 30;

  /* radii dos anéis */
  const degreeR   = R;
  const signR     = R * 0.90;
  const decR      = R * 0.83;
  const termR     = R * 0.76;
  const houseR    = R * 0.68;
  const planetR   = R * 0.52;
  const aspectR   = R * 0.18;

  /* rotação: ASC fixo em 180° SVG (esquerda/9h), MC fica onde o cálculo colocar */
  const ascDeg = useMemo(() => {
    const a = planets.find(p => p.name.toUpperCase().startsWith('ASC'));
    return a ? normDeg(a.degree) : 0;
  }, [planets]);

  const rotOffset = useMemo(() => (360 - ascDeg) % 360, [ascDeg]);

  const rotDeg = (d: number) => normDeg(d + rotOffset);
  const toRad = (svgDeg: number) => (svgDeg * Math.PI) / 180;

  /* planetas filtrados */
  const filteredPlanets = useMemo(() => {
    if (showAsteroids) return planets;
    return planets.filter(p => !['NorthNode','SouthNode','Lilith','PartOfFortune','Vertex'].includes(p.name));
  }, [planets, showAsteroids]);

  /* ─── D3 Render ──────────────────────────────────────────────── */
  useEffect(() => {
    console.log('--- RENDERING D3 WIDGET ---');
    console.log('ascDeg:', ascDeg);
    console.log('rotOffset:', rotOffset);
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    /* helpers locais — corrected for counterclockwise progression */
    // toRad: converts degrees to radians (used for text rotation)
    // eclRad: converts ecliptic degree to SVG coordinate angle (counterclockwise)
    const eclRad = (deg: number) => toRad(180 - rotDeg(deg));
    const polarX = (r: number, deg: number) => cx + r * Math.cos(eclRad(deg));
    const polarY = (r: number, deg: number) => cy + r * Math.sin(eclRad(deg));
    // For pure SVG degrees (degree ring tick marks)
    const svgX = (r: number, svgDeg: number) => cx + r * Math.cos(toRad(180 - svgDeg));
    const svgY = (r: number, svgDeg: number) => cy + r * Math.sin(toRad(180 - svgDeg));
    // D3 arc angle: SVG→D3 subtract 90°, plus counterclockwise negation
    const arcRad = (deg: number) => toRad(180 - rotDeg(deg) - 90);

    /* ─── 1. Background ─────────────────────────────────────── */
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R + 12)
      .attr('fill', '#FDFAF3').attr('stroke', '#c5a059').attr('stroke-width', 1).attr('opacity', 0.95);
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R + 2)
      .attr('fill', 'none').attr('stroke', '#c5a059').attr('stroke-width', 2).attr('opacity', 0.6);
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', aspectR)
      .attr('fill', 'none').attr('stroke', '#c5a059').attr('stroke-width', 0.5).attr('opacity', 0.15);

    /* ─── 2. Degree ring ────────────────────────────────────── */
    for (let i = 0; i < 360; i++) {
      const isSignB = i % 30 === 0;
      const is10 = i % 10 === 0;
      const is5 = i % 5 === 0;
      if (!isSignB && !is10 && !is5) continue;
      const len = isSignB ? 14 : is10 ? 8 : 4;
      const sw = isSignB ? 1.8 : is10 ? 0.8 : 0.4;
      const op = isSignB ? 0.7 : is10 ? 0.4 : 0.2;
      g.append('line')
        .attr('x1', svgX(degreeR, i)).attr('y1', svgY(degreeR, i))
        .attr('x2', svgX(degreeR - len, i)).attr('y2', svgY(degreeR - len, i))
        .attr('stroke', '#c5a059').attr('stroke-width', sw).attr('opacity', op);
    }

    /* graus numéricos a cada 10° */
    for (let i = 0; i < 360; i += 10) {
      if (i % 30 === 0) continue; /* pular limites de signo */
      const sd = i % 30;
      g.append('text')
        .attr('x', svgX(degreeR - 12, i)).attr('y', svgY(degreeR - 12, i))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', 6).attr('fill', '#b09860').attr('opacity', 0.5)
        .attr('transform', `rotate(${180 - i}, ${svgX(degreeR - 12, i)}, ${svgY(degreeR - 12, i)})`)
        .text(`${sd}`);
    }

    /* ─── 3. Sign ring ──────────────────────────────────────── */
    for (let i = 0; i < 12; i++) {
      const startD = i * 30;
      const midD = startD + 15;
      const elem = SIGN_ELEMENTS[i];
      const eColor = ELEMENT_COLORS[elem];

      /* arco do signo */
      const arcPath = d3.arc()({
        innerRadius: houseR, outerRadius: signR,
        startAngle: arcRad(startD),
        endAngle: arcRad(startD + 30),
      })!;
      g.append('path').attr('d', arcPath)
        .attr('transform', `translate(${cx},${cy})`)
        .attr('fill', eColor).attr('opacity', 0.08);

      /* linha divisória */
      g.append('line')
        .attr('x1', polarX(signR, startD)).attr('y1', polarY(signR, startD))
        .attr('x2', polarX(houseR, startD)).attr('y2', polarY(houseR, startD))
        .attr('stroke', '#c5a059').attr('stroke-width', 0.6).attr('opacity', 0.3);

      /* símbolo do signo */
      g.append('text')
        .attr('x', polarX((signR + degreeR) / 2, midD))
        .attr('y', polarY((signR + degreeR) / 2, midD))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', 14).attr('fill', eColor).attr('opacity', 0.85).attr('font-weight', 'bold')
        .text(SIGN_SYMBOLS[i]);

      /* nome curto */
      g.append('text')
        .attr('x', polarX((signR + houseR) / 2, midD))
        .attr('y', polarY((signR + houseR) / 2, midD))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', 7).attr('fill', eColor).attr('opacity', 0.5).attr('font-weight', '600')
        .text(SIGN_SHORT[i]);
    }

    /* ─── 4. Decanate ring (toggle) ─────────────────────────── */
    if (showDecanates) {
      for (let i = 0; i < 36; i++) {
        const signI = Math.floor(i / 3);
        const decI = i % 3;
        const startD = i * 10;
        const midD = startD + 5;
        const colors = ['#E8D5B7', '#D4C4A0', '#C0B389'];

        const decPath = d3.arc()({
          innerRadius: termR, outerRadius: decR,
          startAngle: arcRad(startD),
          endAngle: arcRad(startD + 10),
        })!;
        g.append('path').attr('d', decPath)
          .attr('transform', `translate(${cx},${cy})`)
          .attr('fill', colors[decI]).attr('opacity', 0.35);

        /* linha divisória */
        g.append('line')
          .attr('x1', polarX(decR, startD)).attr('y1', polarY(decR, startD))
          .attr('x2', polarX(termR, startD)).attr('y2', polarY(termR, startD))
          .attr('stroke', '#c5a059').attr('stroke-width', 0.3).attr('opacity', 0.2);

        /* ruler label */
        const ruler = DECANATE_RULERS[signI * 3 + decI];
        g.append('text')
          .attr('x', polarX((decR + termR) / 2, midD))
          .attr('y', polarY((decR + termR) / 2, midD))
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('font-size', 5).attr('fill', '#8a7a5a').attr('opacity', 0.6)
          .text(ruler.substring(0, 3));
      }
    }

    /* ─── 5. Terms ring (toggle) ────────────────────────────── */
    if (showTerms) {
      for (let si = 0; si < 12; si++) {
        const signTerms = TERMS[si];
        for (let ti = 0; ti < signTerms.length; ti++) {
          const t = signTerms[ti];
          const absStart = si * 30 + t.start;
          const absEnd = si * 30 + t.end;
          const absMid = (absStart + absEnd) / 2;

          const termPath = d3.arc()({
            innerRadius: houseR, outerRadius: termR,
            startAngle: arcRad(absStart),
            endAngle: arcRad(absEnd),
          })!;
           g.append('path').attr('d', termPath)
             .attr('transform', `translate(${cx},${cy})`)
             .attr('fill', PLANET_COLORS[t.planet] || '#ccc').attr('opacity', 0.30);

           g.append('line')
             .attr('x1', polarX(termR, absStart)).attr('y1', polarY(termR, absStart))
             .attr('x2', polarX(houseR, absStart)).attr('y2', polarY(houseR, absStart))
             .attr('stroke', '#c5a059').attr('stroke-width', 0.3).attr('opacity', 0.25);

           if (t.end - t.start >= 4) {
             g.append('text')
               .attr('x', polarX((houseR + termR) / 2, absMid))
               .attr('y', polarY((houseR + termR) / 2, absMid))
               .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
               .attr('font-size', 6).attr('fill', '#999').attr('opacity', 0.75)
               .text(t.planet.substring(0, 2));
           }
        }
      }
    }

    /* ─── 6. House cusps ────────────────────────────────────── */
    houses.forEach((h) => {
      const d = h.degree;
      const isMain = [1, 4, 7, 10].includes(h.house);
      const sw = isMain ? 2.2 : 0.9;
      const op = isMain ? 0.75 : 0.3;
      const dash = isMain ? 'none' : '4 3';
      const color = isMain ? '#1a1a2e' : '#c5a059';

      g.append('line')
        .attr('x1', polarX(degreeR - 2, d)).attr('y1', polarY(degreeR - 2, d))
        .attr('x2', polarX(aspectR + 5, d)).attr('y2', polarY(aspectR + 5, d))
        .attr('stroke', color).attr('stroke-width', sw).attr('opacity', op)
        .attr('stroke-dasharray', dash);

      if (h.house === 1) {
         console.log('House 1 (ASC) line drawn at degree', d, 'Mapped x,y =', polarX(degreeR, d), polarY(degreeR, d));
      }
      if (h.house === 10) {
         console.log('House 10 (MC) line drawn at degree', d, 'Mapped x,y =', polarX(degreeR, d), polarY(degreeR, d));
      }

      /* número da casa */
      const nextH = houses[(h.house) % 12];
      const midAngle = (() => {
        let diff = normDeg(nextH.degree - d);
        if (diff > 180) diff -= 360;
        return normDeg(d + diff / 2);
      })();
      const labelR = (houseR + aspectR) / 2;
      g.append('text')
        .attr('x', polarX(labelR, midAngle)).attr('y', polarY(labelR, midAngle))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', 7).attr('fill', isMain ? '#1a1a2e' : '#c5a059')
        .attr('opacity', isMain ? 0.6 : 0.35).attr('font-weight', 'bold')
        .text(h.house);
    });

    /* labels dos ângulos principais no outer ring */
    const angleLabels: { name: string; house: number; label: string }[] = [
      { name: 'ASC', house: 1, label: 'Asc' },
      { name: 'MC', house: 10, label: 'MC' },
      { name: 'DSC', house: 7, label: 'Dsc' },
      { name: 'IC', house: 4, label: 'IC' },
    ];
    angleLabels.forEach(({ house: hn, label }) => {
      const h = houses.find(hh => hh.house === hn);
      if (!h) return;
      const d = h.degree;
      const lx = polarX(degreeR + 14, d);
      const ly = polarY(degreeR + 14, d);
      g.append('text')
        .attr('x', lx).attr('y', ly)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', 8).attr('fill', '#1a1a2e').attr('font-weight', '900')
        .attr('opacity', 0.85)
        .text(label);
    });

    /* ─── 7. Aspect lines ───────────────────────────────────── */
    aspects.forEach((asp) => {
      const p1 = filteredPlanets.find(p => p.name === asp.p1);
      const p2 = filteredPlanets.find(p => p.name === asp.p2);
      if (!p1 || !p2) return;
      const col = ASPECT_COLORS[asp.type] || '#ccc';
      const op = ASPECT_OPACITY[asp.type] || 0.3;
      g.append('line')
        .attr('x1', polarX(planetR, p1.degree)).attr('y1', polarY(planetR, p1.degree))
        .attr('x2', polarX(planetR, p2.degree)).attr('y2', polarY(planetR, p2.degree))
        .attr('stroke', col).attr('stroke-width', 0.8).attr('opacity', op);
    });

    /* ─── 8. Planets ────────────────────────────────────────── */
    /* anti-overlap: sort by degree and nudge close planets */
    const sorted = [...filteredPlanets].sort((a, b) => normDeg(a.degree) - normDeg(b.degree));
    const placed: { x: number; y: number; r: number }[] = [];
    const MIN_DIST = 22;

    sorted.forEach((p) => {
      const d = p.degree;
      const isAngle = p.isAngle || ['ASC','MC','DSC','IC'].includes(p.name);
      const color = p.color || PLANET_COLORS[p.name] || (isAngle ? '#B8860B' : '#888');
      const symbol = p.symbol || PLANET_SYMBOLS[p.name] || '●';

      /* base position */
      let px = polarX(planetR, d);
      let py = polarY(planetR, d);

      /* nudge if overlapping */
      for (let attempt = 0; attempt < 8; attempt++) {
        const tooClose = placed.some(pl =>
          Math.hypot(pl.x - px, pl.y - py) < MIN_DIST
        );
        if (!tooClose) break;
        const nudge = (attempt + 1) * 4;
        px = polarX(planetR + nudge, d);
        py = polarY(planetR + nudge, d);
      }
      placed.push({ x: px, y: py, r: 12 });

      /* line from center to planet */
      g.append('line')
        .attr('x1', polarX(aspectR + 5, d)).attr('y1', polarY(aspectR + 5, d))
        .attr('x2', px).attr('y2', py)
        .attr('stroke', color).attr('stroke-width', 0.3).attr('opacity', 0.15);

      /* planet group for hover */
      const pg = g.append('g')
        .attr('class', 'planet-node')
        .style('cursor', 'pointer');

      /* hit area (invisible larger circle for easier hover) */
      pg.append('circle')
        .attr('cx', px).attr('cy', py).attr('r', 14)
        .attr('fill', 'transparent');

      /* shape: diamond for angles, circle for planets */
      if (isAngle) {
        const s = 10;
        pg.append('polygon')
          .attr('points', `${px},${py - s} ${px + s},${py} ${px},${py + s} ${px - s},${py}`)
          .attr('fill', 'white').attr('stroke', color).attr('stroke-width', 1.5);
      } else {
        pg.append('circle')
          .attr('cx', px).attr('cy', py).attr('r', 10)
          .attr('fill', 'white').attr('stroke', color).attr('stroke-width', 1.5);
      }

      /* symbol */
      pg.append('text')
        .attr('x', px).attr('y', py + 1)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', isAngle ? 8 : 10).attr('fill', color)
        .attr('font-weight', 'bold')
        .text(symbol);

      /* degree */
      pg.append('text')
        .attr('x', px).attr('y', py - 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', 6).attr('fill', '#666').attr('font-weight', '600')
        .text(formatDeg(normDeg(d)));

      /* retrograde ℞ */
      if (p.retrograde) {
        pg.append('text')
          .attr('x', px + 13).attr('y', py - 8)
          .attr('font-size', 7).attr('fill', '#E74C3C').attr('font-weight', 'bold')
          .text('℞');
      }

      /* hover events */
      pg.on('mouseenter', (event: MouseEvent) => {
        const signIdx = getSignIdx(d);
        const motion = p.stationary
          ? 'Estacionário'
          : p.applying !== undefined
            ? (p.applying ? 'Aplicativo' : 'Separativo')
            : (p.speed !== undefined ? (p.speed > 0 ? 'Direto' : 'Retrógrado') : '—');

        setTooltip({
          name: p.name,
          sign: `${SIGN_NAMES[signIdx]} ${formatDeg(normDeg(d))}`,
          degree: `${normDeg(d).toFixed(2)}°`,
          retrograde: !!p.retrograde,
          stationary: !!p.stationary,
          motion,
          color,
          x: event.clientX,
          y: event.clientY,
        });
      }).on('mouseleave', () => setTooltip(null));
    });

  }, [size, filteredPlanets, houses, aspects, showDecanates, showTerms, rotOffset]);

  /* ─── Tabelas abaixo ─────────────────────────────────────────── */

  const planetTable = useMemo(() => {
    return filteredPlanets
      .filter(p => !['ASC','DSC','IC'].includes(p.name))
      .sort((a, b) => normDeg(a.degree) - normDeg(b.degree))
      .map(p => {
        const si = getSignIdx(p.degree);
        const namePt = PLANET_NAMES_PT[p.name] || p.name;
        const motion = p.stationary ? 'Est' : p.retrograde ? 'Rx' : '';
        const dignity = getDignityState(p.name, p.degree);
        return {
          ...p,
          signSymbol: SIGN_SYMBOLS[si],
          signName: SIGN_NAMES[si],
          signDeg: formatDeg(normDeg(p.degree)),
          absDeg: normDeg(p.degree).toFixed(2),
          color: p.color || PLANET_COLORS[p.name] || '#888',
          motion,
          dignity,
          namePt,
          house: p.house || 1,
        };
      });
  }, [filteredPlanets]);

  /* ─── Planet map for astro-dignity functions ─────────────────── */
  const planetsMap = useMemo(() => {
    const map: Record<string, { degree: number; house?: number }> = {};
    for (const p of planets) {
      const key = p.name === 'Asc' ? 'ASC' : p.name;
      map[key] = { degree: p.degree, house: p.house };
    }
    return map;
  }, [planets]);

  /* ─── Astro Stats computations ───────────────────────────────── */
  const elResult  = useMemo(() => calcElements(planetsMap),      [planetsMap]);
  const qResult   = useMemo(() => calcQualities(planetsMap),     [planetsMap]);
  const midpoints = useMemo(() => calcMidpoints(planetsMap, 10), [planetsMap]);
  const dominance = useMemo(() => calcDominance(planetsMap),     [planetsMap]);
  const regentAsc = useMemo(() => {
    // If planetsMap['ASC'] is undefined, maybe it's passed as 'Ascendant' or 'Asc' but missed by map.
    // Try to find any angle that looks like ASC directly from points list.
    let asc = planetsMap['ASC'];
    if (!asc) {
      const fallbackAsc = planets.find(p => p.name.toUpperCase().startsWith('ASC'));
      if (fallbackAsc) {
        asc = { degree: fallbackAsc.degree, house: 1 };
      }
    }
    return asc ? calcRegentAsc(asc.degree) : null;
  }, [planetsMap, planets]);
  const senhor    = useMemo(() => calcSenhorGenitura(dominance), [dominance]);
  const alcocoden = useMemo(() => calcAlcocoden(planetsMap),     [planetsMap]);
  const signature = useMemo(() => calcAstroSignature(elResult, qResult), [elResult, qResult]);
  const hyleg     = useMemo(() => calcHyleg(planetsMap),         [planetsMap]);
  const maxDom    = useMemo(() =>
    Math.max(1, ...dominance.map(d => Math.max(Math.abs(d.scoreTrad), Math.abs(d.scoreModern)))),
  [dominance]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* ─── Wheel Container ──────────────────────────────────── */}
      <div className="relative">
        {/* Settings */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-2 right-2 z-20 p-2 bg-white/90 border border-gray-100 rounded-lg shadow-sm text-gray-400 hover:text-[#c5a059] transition-all"
          title="Configurações"
        >
          <Settings size={15} />
        </button>

        {showSettings && (
          <div className="absolute top-10 right-2 z-30 bg-white border border-gray-100 rounded-xl shadow-xl p-4 w-56 space-y-3 animate-in fade-in">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Camadas</span>
              <X size={12} className="text-gray-300 cursor-pointer hover:text-red-400" onClick={() => setShowSettings(false)} />
            </div>
            {[
              { label: 'Corpos Secundários', state: showAsteroids, setter: setShowAsteroids },
              { label: 'Decanatos', state: showDecanates, setter: setShowDecanates },
              { label: 'Termos (Egípcios)', state: showTerms, setter: setShowTerms },
            ].map(item => (
              <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={item.state}
                  onChange={() => item.setter(!item.state)}
                  className="w-3.5 h-3.5 accent-[#c5a059]" />
                <span className="text-[11px] font-medium text-gray-600 group-hover:text-[#c5a059] transition-colors">{item.label}</span>
              </label>
            ))}
          </div>
        )}

        <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm" />
      </div>

      {/* ─── Tooltip (React overlay) ──────────────────────────── */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-[#c5a059]/30 rounded-xl shadow-xl px-4 py-3 pointer-events-none min-w-[180px]"
          style={{ left: tooltip.x + 16, top: tooltip.y - 20 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold" style={{ color: tooltip.color }}>
              {PLANET_SYMBOLS[tooltip.name] || '●'}
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: tooltip.color }}>
              {tooltip.name}
            </span>
          </div>
          <p className="text-[11px] text-gray-700 font-medium">{tooltip.sign}</p>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {tooltip.retrograde && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-50 text-red-500 rounded">℞ Retrógrado</span>
            )}
            {tooltip.stationary && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">Estacionário</span>
            )}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              tooltip.motion === 'Aplicativo' ? 'bg-blue-50 text-blue-600' :
              tooltip.motion === 'Separativo' ? 'bg-purple-50 text-purple-600' :
              'bg-gray-50 text-gray-500'
            }`}>
              {tooltip.motion}
            </span>
          </div>
        </div>
      )}

      {/* ─── Tables Below ─────────────────────────────────────── */}
      <div className="w-full max-w-[620px] grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Planet Table */}
        <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
          <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-3">Planetas</h3>
          <div className="space-y-1.5">
            {planetTable.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold w-5" style={{ color: p.color }}>{p.symbol}</span>
                  <span className="font-semibold text-gray-700 w-16">{p.namePt}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-semibold w-6 text-center" title={`Casa ${p.house}`}>C{p.house}</span>
                  {p.dignity.state !== 'peregrine' && (
                    <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${p.dignity.bg}`}>
                      {p.dignity.label}
                    </span>
                  )}
                  <span className="text-gray-400">{p.signSymbol}</span>
                  <span className="text-gray-600 font-medium tabular-nums w-14 text-right">{p.signDeg}</span>
                  {p.motion && (
                    <span className={`text-[8px] font-bold px-1 rounded ${
                      p.motion === 'Rx' ? 'bg-red-50 text-red-500' :
                      p.motion === 'Est' ? 'bg-amber-50 text-amber-600' :
                      'text-gray-400'
                    }`}>{p.motion}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aspect Table */}
        <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
          <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-3">Aspectos</h3>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {aspects.length > 0 ? aspects.map((asp, i) => {
              const col = ASPECT_COLORS[asp.type] || '#999';
              return (
                <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col, opacity: 0.7 }} />
                    <span className="font-semibold text-gray-700 w-20">{asp.type}</span>
                  </div>
                  <span className="text-gray-500 flex-1 text-center">{asp.p1} – {asp.p2}</span>
                  <span className="text-gray-400 tabular-nums text-right w-10">{asp.orb.toFixed(1)}°</span>
                </div>
              );
            }) : (
              <p className="text-center py-6 text-gray-300 text-[10px] italic">Nenhum aspecto calculado</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           ASTROLOGICAL STATS PANEL
          ═══════════════════════════════════════════════════════════ */}
      {Object.keys(planetsMap).length > 0 && (
        <div className="w-full max-w-[620px] flex flex-col gap-4">

          {/* ─── ROW 1: Elementos + Qualidades ─────────────────── */}
          <div className="grid grid-cols-2 gap-4">

            {/* Elementos */}
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-3">Elementos</h3>
              <div className="space-y-2">
                {(['fire','earth','air','water'] as const).map(el => {
                  const count = elResult[el];
                  const pct = elResult.pct[el];
                  const color = EL_COLORS[el];
                  return (
                    <div key={el}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-gray-600">
                          {ELEMENT_EMOJIS[el]} {ELEMENT_LABELS[el]}
                        </span>
                        <span className="text-[9px] font-bold tabular-nums" style={{ color }}>
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Qualidades */}
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-3">Qualidades</h3>
              <div className="space-y-2">
                {(['cardinal','fixed','mutable'] as const).map(q => {
                  const count = qResult[q];
                  const pct = qResult.pct[q];
                  const color = QUALITY_COLORS[q];
                  return (
                    <div key={q}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-gray-600">
                          {QUALITY_LABELS[q]}
                        </span>
                        <span className="text-[9px] font-bold tabular-nums" style={{ color }}>
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── ROW 2: Midpoints + Dominância ─────────────────── */}
          <div className="grid grid-cols-2 gap-4">

            {/* Midpoints */}
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-3">Pontos Médios</h3>
              <div className="space-y-1.5">
                {midpoints.map((mp, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] py-0.5 border-b border-gray-50 last:border-0">
                    <span className="font-semibold text-gray-600 w-20 truncate">
                      {mp.p1}/{mp.p2}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <span className="text-[12px]">{DIGNITY_SIGNS[mp.signIdx]}</span>
                      <span className="tabular-nums font-medium">{dignityFormatDeg(mp.degree)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dominância dos Planetas */}
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c5a059] mb-1">Dominância</h3>
              <div className="flex gap-2 mb-2">
                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Trad</span>
                <span className="text-[7px] font-bold text-indigo-400 uppercase tracking-wider">Mod</span>
              </div>
              <div className="space-y-1.5">
                {dominance.map((d) => {
                  const tradBarW = Math.max(0, (d.scoreTrad / maxDom) * 100);
                  const modBarW  = Math.max(0, (d.scoreModern / maxDom) * 100);
                  const tradNeg  = d.scoreTrad < 0;
                  const modNeg   = d.scoreModern < 0;
                  return (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="text-[11px] w-5 text-center" style={{ color: d.dignity.color }}>
                        {d.symbol}
                      </span>
                      <span className="text-[8px] text-gray-500 w-12 truncate">{d.namePt}</span>
                      <div className="flex-1 flex flex-col gap-0.5">
                        {/* Tradicional */}
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                tradNeg ? 'bg-red-400' : 'bg-amber-400'
                              }`}
                              style={{ width: `${tradBarW}%` }}
                            />
                          </div>
                          <span className={`text-[7px] tabular-nums w-5 text-right font-bold ${
                            tradNeg ? 'text-red-400' : 'text-amber-600'
                          }`}>
                            {d.scoreTrad > 0 ? '+' : ''}{d.scoreTrad}
                          </span>
                        </div>
                        {/* Moderno */}
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                modNeg ? 'bg-red-300' : 'bg-indigo-400'
                              }`}
                              style={{ width: `${modBarW}%` }}
                            />
                          </div>
                          <span className={`text-[7px] tabular-nums w-5 text-right font-bold ${
                            modNeg ? 'text-red-300' : 'text-indigo-500'
                          }`}>
                            {d.scoreModern > 0 ? '+' : ''}{d.scoreModern}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── ROW 3: Mini-cards ──────────────────────────────── */}
          <div className="grid grid-cols-5 gap-2">

            {/* Hyleg */}
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <span className="text-[7px] font-black uppercase tracking-wider text-[#c5a059]">Hyleg</span>
              <span className="text-[20px]">{DIGNITY_PSYMBOLS[hyleg.planet] ?? '☉'}</span>
              <span className="text-[9px] font-bold text-gray-700">{hyleg.planetPt}</span>
              <span className="text-[8px] text-gray-400">{hyleg.signSymbol} {hyleg.posInSign}</span>
              <span className={`text-[6px] font-bold px-1 py-0.5 rounded mt-0.5 ${
                hyleg.aphetical ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
              }`}>
                {hyleg.aphetical ? 'Afético' : 'Fallback'} · {hyleg.method}
              </span>
            </div>

            {/* Regente ASC */}
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <span className="text-[7px] font-black uppercase tracking-wider text-[#c5a059]">Regente ASC</span>
              {regentAsc ? (
                <>
                  <span className="text-[20px]">{DIGNITY_PSYMBOLS[regentAsc.planet] ?? '?'}</span>
                  <span className="text-[9px] font-bold text-gray-700">{regentAsc.planetPt}</span>
                  <span className="text-[8px] text-gray-400">{regentAsc.signSymbol} {regentAsc.signPt}</span>
                  {regentAsc.modernCo && (
                    <span className="text-[6px] text-indigo-400 font-semibold">
                      co: {regentAsc.modernCoPt}
                    </span>
                  )}
                </>
              ) : <span className="text-gray-300 text-[8px]">—</span>}
            </div>

            {/* Alcocoden */}
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <span className="text-[7px] font-black uppercase tracking-wider text-[#c5a059]">Alcocoden</span>
              <span className="text-[20px]">{DIGNITY_PSYMBOLS[alcocoden.planet] ?? '?'}</span>
              <span className="text-[9px] font-bold text-gray-700">{alcocoden.planetPt}</span>
              <span className="text-[8px] text-gray-400">Hyleg: {PLANET_NAMES_PT[alcocoden.hyleg] ?? alcocoden.hyleg}</span>
              <span className="text-[6px] text-gray-400 font-medium mt-0.5">{alcocoden.method}</span>
            </div>

            {/* Senhor da Genitura */}
            <div className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-3 flex flex-col items-center text-center gap-1">
              <span className="text-[7px] font-black uppercase tracking-wider text-[#c5a059]">Sr. Genitura</span>
              <span className="text-[20px]">{DIGNITY_PSYMBOLS[senhor.planet] ?? '?'}</span>
              <span className="text-[9px] font-bold text-gray-700">{senhor.planetPt}</span>
              <span className="text-[6px] font-bold text-amber-600 mt-0.5">
                Trad: {senhor.scoreTrad > 0 ? '+' : ''}{senhor.scoreTrad}
              </span>
              <span className="text-[6px] font-bold text-indigo-500">
                Mod: {senhor.scoreModern > 0 ? '+' : ''}{senhor.scoreModern}
              </span>
            </div>

            {/* Assinatura Astrológica */}
            <div
              className="bg-white/60 backdrop-blur-sm border border-[#c5a059]/10 rounded-xl p-3 flex flex-col items-center text-center gap-1"
              style={{ borderColor: `${signature.color}25` }}
            >
              <span className="text-[7px] font-black uppercase tracking-wider text-[#c5a059]">Assinatura</span>
              <span className="text-[20px]">{ELEMENT_EMOJIS[signature.element]}</span>
              <span className="text-[9px] font-bold" style={{ color: signature.color }}>
                {signature.label}
              </span>
              <span className="text-[7px] text-gray-400 leading-tight text-center">
                {signature.desc}
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
