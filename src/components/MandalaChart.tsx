import { useMemo, useState } from 'react';
import { Settings, X } from 'lucide-react';

interface Planet {
  name: string;
  degree: number;
  sign?: string;
  color?: string;
  symbol?: string;
  retrograde?: boolean;
}

interface House {
  house: number;
  degree: number;
  sign?: string;
}

interface Aspect {
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

const SIGNS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const SIGN_NAMES = ['Áries','Touro','Gêmeos','Câncer','Leão','Virgem','Libra','Escorpião','Sagitário','Capricórnio','Aquário','Peixes'];

const PLANET_COLORS: Record<string, string> = {
  Sun: '#FFD700', Moon: '#C0C0C0', Mercury: '#87CEEB', Venus: '#FF69B4',
  Mars: '#FF4500', Jupiter: '#DAA520', Saturn: '#708090', Uranus: '#00CED1',
  Neptune: '#4169E1', Pluto: '#8B0000', Chiron: '#9370DB',
  'Norte': '#228B22', 'Sul': '#8B0000', Fortuna: '#FF8C00'
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Chiron: '⚷', Norte: '☊', Sul: '☋', Fortuna: '⊗'
};

const ASPECT_COLORS: Record<string, string> = {
  Conjunção: '#FFD700',
  Oposição: '#FF4500',
  Trígono: '#228B22',
  Quadratura: '#FF4500',
  Sextil: '#4169E1',
};

const DECANATE_COLORS = ['#E8D5B7', '#D4C4A0', '#C0B389'];

// Convert absolute degree (0-360) to SVG angle (0° = top/12 o'clock)
const degToAngle = (deg: number) => ((deg - 90) * Math.PI) / 180;

const polarToXY = (cx: number, cy: number, r: number, angleRad: number) => ({
  x: cx + r * Math.cos(angleRad),
  y: cy + r * Math.sin(angleRad),
});

const formatDeg = (absDeg: number) => {
  const signDeg = absDeg % 30;
  const d = Math.floor(signDeg);
  const m = Math.floor((signDeg - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}'`;
};

const getSignFromDeg = (absDeg: number) => SIGN_NAMES[Math.floor((absDeg % 360) / 30) % 12];

export const MandalaChart = ({ size = 580, planets, houses, aspects }: MandalaChartProps) => {
  const [showAsteroids, setShowAsteroids] = useState(false);
  const [showDecanates, setShowDecanates] = useState(false);
  const [showTransits, setShowTransits] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const signR = size * 0.42;
  const houseR = size * 0.36;
  const planetR = size * 0.30;
  const innerR = size * 0.22;

  // Compute planet positions
  const planetNodes = useMemo(() => {
    return planets.map(p => {
      const deg = ((p.degree % 360) + 360) % 360;
      const angle = degToAngle(deg);
      const pos = polarToXY(cx, cy, planetR, angle);
      return {
        ...p,
        deg,
        angle,
        x: pos.x,
        y: pos.y,
        sign: p.sign || getSignFromDeg(deg),
        color: p.color || PLANET_COLORS[p.name] || '#888',
        symbol: p.symbol || PLANET_SYMBOLS[p.name] || '●',
      };
    });
  }, [planets, cx, cy, planetR]);

  // Compute house cusps
  const houseCusps = useMemo(() => {
    return houses.map(h => {
      const deg = ((h.degree % 360) + 360) % 360;
      const angle = degToAngle(deg);
      const outer = polarToXY(cx, cy, outerR, angle);
      const inner = polarToXY(cx, cy, innerR, angle);
      const label = polarToXY(cx, cy, houseR - 12, angle);
      return { ...h, deg, angle, outer, inner, labelPos: label };
    });
  }, [houses, cx, cy, outerR, innerR, houseR]);

  // Aspect lines
  const aspectLines = useMemo(() => {
    return aspects.map(a => {
      const p1Node = planetNodes.find(p => p.name === a.p1);
      const p2Node = planetNodes.find(p => p.name === a.p2);
      if (!p1Node || !p2Node) return null;
      return {
        ...a,
        x1: p1Node.x, y1: p1Node.y,
        x2: p2Node.x, y2: p2Node.y,
        color: ASPECT_COLORS[a.type] || '#ccc',
      };
    }).filter(Boolean);
  }, [aspects, planetNodes]);

  return (
    <div className="relative flex items-center justify-center">
      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-3 right-3 z-20 p-2 bg-white/80 border border-gray-100 rounded-lg shadow-sm text-gray-400 hover:text-gold transition-all"
        title="Configurações da Mandala"
      >
        <Settings size={16} />
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-12 right-3 z-30 bg-white border border-gray-100 rounded-xl shadow-xl p-4 w-56 space-y-3 animate-in fade-in">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Elementos</span>
            <X size={12} className="text-gray-300 cursor-pointer hover:text-red-400" onClick={() => setShowSettings(false)} />
          </div>
          {[
            { label: 'Asteroides/Nodos/Fortuna', state: showAsteroids, setter: setShowAsteroids },
            { label: 'Decanatos', state: showDecanates, setter: setShowDecanates },
            { label: 'Trânsitos', state: showTransits, setter: setShowTransits },
          ].map(item => (
            <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={item.state}
                onChange={() => item.setter(!item.state)}
                className="w-3.5 h-3.5 accent-gold"
              />
              <span className="text-[11px] font-medium text-gray-600 group-hover:text-gold transition-colors">{item.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {hoveredPlanet && (() => {
        const p = planetNodes.find(n => n.name === hoveredPlanet);
        if (!p) return null;
        return (
          <div
            className="absolute z-30 bg-white border border-gold/20 rounded-xl shadow-lg px-4 py-3 pointer-events-none"
            style={{ left: p.x + 20, top: p.y - 20 }}
          >
            <p className="text-[10px] font-black uppercase text-gold tracking-wider">{p.name}</p>
            <p className="text-[11px] text-gray-700 font-medium">{p.sign} {formatDeg(p.degree)}</p>
            {p.retrograde && <p className="text-[9px] text-red-400 font-bold">Retrógrado</p>}
          </div>
        );
      })()}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        {/* Background */}
        <circle cx={cx} cy={cy} r={outerR + 8} fill="white" stroke="#B8860B" strokeWidth="0.5" opacity="0.1" />

        {/* Outer circle */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#B8860B" strokeWidth="1.5" opacity="0.3" />
        <circle cx={cx} cy={cy} r={signR} fill="none" stroke="#B8860B" strokeWidth="0.5" opacity="0.15" />
        <circle cx={cx} cy={cy} r={houseR} fill="none" stroke="#B8860B" strokeWidth="0.5" opacity="0.1" />
        <circle cx={cx} cy={cy} r={planetR} fill="none" stroke="#B8860B" strokeWidth="0.3" opacity="0.08" />
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#B8860B" strokeWidth="0.5" opacity="0.1" />

        {/* Zodiac sign segments (every 30°) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const absDeg = i * 30;
          const angle = degToAngle(absDeg);
          const outerPt = polarToXY(cx, cy, outerR, angle);
          const innerPt = polarToXY(cx, cy, innerR, angle);
          const labelAngle = degToAngle(absDeg + 15);
          const labelPt = polarToXY(cx, cy, outerR - 20, labelAngle);
          return (
            <g key={`sign-${i}`}>
              <line x1={innerPt.x} y1={innerPt.y} x2={outerPt.x} y2={outerPt.y} stroke="#B8860B" strokeWidth="0.5" opacity="0.15" />
              <text x={labelPt.x} y={labelPt.y} textAnchor="middle" dominantBaseline="central" fontSize="14" fill="#B8860B" opacity="0.7" fontWeight="bold" className="select-none">{SIGNS[i]}</text>
            </g>
          );
        })}

        {/* Degree marks every 5° */}
        {Array.from({ length: 72 }).map((_, i) => {
          const absDeg = i * 5;
          const angle = degToAngle(absDeg);
          const isSignBoundary = absDeg % 30 === 0;
          const isTenDeg = absDeg % 10 === 0;
          const outerPt = polarToXY(cx, cy, isSignBoundary ? outerR : isTenDeg ? outerR - 6 : outerR - 3, angle);
          const innerPt = polarToXY(cx, cy, outerR, angle);
          return (
            <line key={`tick-${i}`} x1={innerPt.x} y1={innerPt.y} x2={outerPt.x} y2={outerPt.y}
              stroke="#B8860B" strokeWidth={isSignBoundary ? 1.5 : isTenDeg ? 0.8 : 0.3}
              opacity={isSignBoundary ? 0.4 : isTenDeg ? 0.25 : 0.12}
            />
          );
        })}

        {/* Decanates (optional) */}
        {showDecanates && Array.from({ length: 36 }).map((_, i) => {
          const absDeg = i * 10;
          const angle = degToAngle(absDeg);
          const outerPt = polarToXY(cx, cy, signR, angle);
          const innerPt = polarToXY(cx, cy, signR - 14, angle);
          const decIdx = Math.floor((absDeg % 30) / 10);
          return (
            <line key={`dec-${i}`} x1={innerPt.x} y1={innerPt.y} x2={outerPt.x} y2={outerPt.y}
              stroke={DECANATE_COLORS[decIdx]} strokeWidth="8" opacity="0.25" strokeLinecap="round"
            />
          );
        })}

        {/* House cusps */}
        {houseCusps.map((h, i) => (
          <g key={`house-${i}`}>
            <line x1={h.inner.x} y1={h.inner.y} x2={h.outer.x} y2={h.outer.y}
              stroke="#B8860B" strokeWidth={h.house === 1 || h.house === 10 ? 1.5 : 0.7}
              opacity={h.house === 1 || h.house === 10 ? 0.4 : 0.2}
              strokeDasharray={h.house === 1 || h.house === 10 ? 'none' : '3 2'}
            />
            <text x={h.labelPos.x} y={h.labelPos.y} textAnchor="middle" dominantBaseline="central"
              fontSize="8" fill="#B8860B" opacity="0.5" fontWeight="bold" className="select-none">
              {h.house}
            </text>
          </g>
        ))}

        {/* Aspect lines */}
        {aspectLines.map((line: any, i) => (
          <line key={`aspect-${i}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke={line.color} strokeWidth="0.8" opacity="0.25"
          />
        ))}

        {/* Center */}
        <circle cx={cx} cy={cy} r={3} fill="#B8860B" opacity="0.3" />

        {/* Planets */}
        {planetNodes.map((p, i) => (
          <g key={`planet-${i}`}
            onMouseEnter={() => setHoveredPlanet(p.name)}
            onMouseLeave={() => setHoveredPlanet(null)}
            className="cursor-pointer"
          >
            {/* Planet line to outer ring */}
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={p.color} strokeWidth="0.4" opacity="0.1" />
            {/* Planet circle */}
            <circle cx={p.x} cy={p.y} r={11} fill="white" stroke={p.color} strokeWidth="1.5" />
            {/* Planet symbol */}
            <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="central"
              fontSize="11" fill={p.color} fontWeight="bold" className="select-none">
              {p.symbol}
            </text>
            {/* Degree label */}
            <text x={p.x} y={p.y - 16} textAnchor="middle" fontSize="6.5" fill="#666" fontWeight="600" className="select-none">
              {formatDeg(p.degree)}
            </text>
            {/* Retrograde marker */}
            {p.retrograde && (
              <text x={p.x + 12} y={p.y - 8} fontSize="7" fill="#FF4500" fontWeight="bold">℞</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};
