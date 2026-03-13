import { useMemo } from 'react';

interface MandalaViewProps {
  data: any;
  size?: number;
}

export const MandalaView = ({ data, size = 600 }: MandalaViewProps) => {
  const center = size / 2;
  const radius = size * 0.45;
  const innerRadius = radius * 0.7;
  const planetsRadius = radius * 0.85;

  const signs = [
    { name: 'Áries', symbol: '♈', element: 'Fire' },
    { name: 'Touro', symbol: '♉', element: 'Earth' },
    { name: 'Gêmeos', symbol: '♊', element: 'Air' },
    { name: 'Câncer', symbol: '♋', element: 'Water' },
    { name: 'Leão', symbol: '♌', element: 'Fire' },
    { name: 'Virgem', symbol: '♍', element: 'Earth' },
    { name: 'Libra', symbol: '♎', element: 'Air' },
    { name: 'Escorpião', symbol: '♏', element: 'Water' },
    { name: 'Sagitário', symbol: '♐', element: 'Fire' },
    { name: 'Capricórnio', symbol: '♑', element: 'Earth' },
    { name: 'Aquário', symbol: '♒', element: 'Air' },
    { name: 'Peixes', symbol: '♓', element: 'Water' }
  ];

  const getPlanetColor = (planet: string) => {
    switch (planet) {
      case 'Sun': return '#FFD700';
      case 'Moon': return '#B0C4DE';
      case 'Mars': return '#FF4500';
      case 'Venus': return '#FF69B4';
      case 'Jupiter': return '#DAA520';
      case 'Saturn': return '#708090';
      default: return '#B8860B';
    }
  };

  const getPlanetSymbol = (planet: string) => {
    switch (planet) {
      case 'Sun': return '☉';
      case 'Moon': return '☽';
      case 'Mercury': return '☿';
      case 'Venus': return '♀';
      case 'Mars': return '♂';
      case 'Jupiter': return '♃';
      case 'Saturn': return '♄';
      case 'Uranus': return '♅';
      case 'Neptune': return '♆';
      case 'Pluto': return '♇';
      case 'Chiron': return '⚷';
      default: return '●';
    }
  };

  const planetNodes = useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .filter(([key]) => key !== 'Houses')
      .map(([name, pos]: [string, any]) => {
        // As posições abs_pos são graus 0-360
        // No SVG, 0 graus costuma ser o topo (ou direita). 
        // Na astrologia tradicional, 0 Áries é à esquerda (ASC).
        // Vamos ajustar: 0 graus abs_pos -> 180 no SVG (Esquerda)
        const angle = (pos.degree - 180) * (Math.PI / 180);
        return {
          name,
          symbol: getPlanetSymbol(name),
          x: center + planetsRadius * Math.cos(angle),
          y: center + planetsRadius * Math.sin(angle),
          color: getPlanetColor(name),
          degree: pos.degree,
          sign: pos.sign
        };
      });
  }, [data, center, planetsRadius]);

  return (
    <div className="relative flex items-center justify-center bg-white/40 p-8 rounded-[3rem] border border-gold/10 backdrop-blur-sm shadow-inner group">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
        {/* Background Grids */}
        <circle cx={center} cy={center} r={radius} fill="white" stroke="#B8860B" strokeWidth="1" opacity="0.1" />
        <circle cx={center} cy={center} r={innerRadius} fill="none" stroke="#B8860B" strokeWidth="0.5" opacity="0.2" strokeDasharray="4 4" />
        
        {/* Zodiac Border */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#B8860B" strokeWidth="1" opacity="0.3" />

        {/* Zodiac Signs Segments */}
        {signs.map((sign, i) => {
          const startAngle = (i * 30 - 180) * (Math.PI / 180);
          
          const x1 = center + radius * Math.cos(startAngle);
          const y1 = center + radius * Math.sin(startAngle);
          
          const textAngle = (i * 30 + 15 - 180) * (Math.PI / 180);
          const tx = center + (radius + 20) * Math.cos(textAngle);
          const ty = center + (radius + 20) * Math.sin(textAngle);

          return (
            <g key={sign.name}>
              <line 
                x1={center} y1={center} x2={x1} y2={y1} 
                stroke="#B8860B" strokeWidth="0.5" opacity="0.1" 
              />
              <text 
                x={tx} y={ty} 
                textAnchor="middle" 
                alignmentBaseline="middle" 
                className="text-[10px] font-black fill-gold/60 pointer-events-none select-none"
              >
                {sign.symbol}
              </text>
            </g>
          );
        })}

        {/* Planet Positions */}
        {planetNodes.map(node => (
          <g key={node.name} className="cursor-help group/planet">
            <line 
              x1={center} y1={center} x2={node.x} y2={node.y} 
              stroke={node.color} strokeWidth="0.5" opacity="0.1" 
              className="group-hover/planet:opacity-40 transition-opacity"
            />
            <circle 
              cx={node.x} cy={node.y} r={14} 
              fill="white" stroke={node.color} strokeWidth="1" 
              className="group-hover/planet:scale-125 transition-all shadow-lg"
            />
            <text 
              x={node.x} y={node.y} 
              textAnchor="middle" 
              alignmentBaseline="middle" 
              fontSize="12"
              fill={node.color}
              className="font-bold pointer-events-none select-none"
            >
              {node.symbol}
            </text>
          </g>
        ))}

        {/* Center Point */}
        <circle cx={center} cy={center} r={4} fill="#B8860B" opacity="0.4" />
      </svg>
      
      {/* Legend Overlay */}
      <div className="absolute top-8 right-8 text-right space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gold">Mapa Ativo</p>
        <p className="text-[10px] font-bold text-gray-400 italic">Vibração Stark Ref. 0.92</p>
      </div>
    </div>
  );
};
