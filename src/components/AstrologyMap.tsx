import React from 'react';
import { LiveAstroData } from '../hooks/useAstrologyData';

interface AstrologyMapProps {
  data: LiveAstroData | null;
  size?: number; // diameter in px
}

const polarToCartesian = (center: number, radius: number, angleDeg: number) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: center + radius * Math.cos(angleRad),
    y: center + radius * Math.sin(angleRad),
  };
};

export const AstrologyMap: React.FC<AstrologyMapProps> = ({ data, size = 500 }) => {
  const radius = size / 2 - 20;
  const center = size / 2;

  if (!data || !data.planets) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="flex items-center justify-center text-gold/20 font-black uppercase tracking-[0.3em] italic"
      >
        Sintonizando Esferas...
      </div>
    );
  }

  const planets = Object.keys(data.planets);

  return (
    <svg width={size} height={size} className="bg-white/10 backdrop-blur-sm rounded-full shadow-lg border border-gold/20" style={{ borderRadius: '50%' }}>
      <circle cx={center} cy={center} r={radius} stroke="gold" strokeWidth={2} fill="transparent" />

      {/* Houses */}
      {[...Array(12)].map((_, i) => {
        const angle = i * 30;
        const end = polarToCartesian(center, radius, angle);
        return (
          <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="gold" strokeWidth={1} opacity={0.4} />
        );
      })}

      {/* Aspects lines (Optional: draw them if data exists) */}
      {data.aspects && data.aspects.map((asp, idx) => {
        const p1 = data.planets[asp.p1];
        const p2 = data.planets[asp.p2];
        if (!p1 || !p2) return null;
        
        const pos1 = polarToCartesian(center, radius - 60, p1.pos_in_sign ?? p1.degree);
        const pos2 = polarToCartesian(center, radius - 60, p2.pos_in_sign ?? p2.degree);
        
        return (
          <line 
            key={idx} 
            x1={pos1.x} y1={pos1.y} 
            x2={pos2.x} y2={pos2.y} 
            stroke={asp.type === 'Square' || asp.type === 'Opposition' ? 'rgba(255,100,100,0.6)' : 'rgba(100,255,100,0.6)'} 
            strokeWidth={1.5} 
          >
            <title>{`${asp.type} entre ${asp.p1} e ${asp.p2} (${asp.orb}° de orbe)`}</title>
          </line>
        );
      })}

      {/* Planet icons */}
      {planets.map((planet) => {
        const planetData = data.planets[planet];
        if (!planetData) return null;
        const angle = planetData.pos_in_sign ?? planetData.degree ?? 0;
        const pos = polarToCartesian(center, radius - 30, angle);
        const iconConfigs: Record<string, string> = {
          Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
          Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
        };
        const icon = iconConfigs[planet] || planet.charAt(0);
        return (
          <g key={planet} transform={`translate(${pos.x},${pos.y})`}> 
            <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={18} fill="gold">
              {icon}
            </text>
            <title>{`${planet}: ${planetData.sign} ${Math.floor(planetData.pos_in_sign)}°`}</title>
          </g>
        );
      })}
    </svg>
  );
};
