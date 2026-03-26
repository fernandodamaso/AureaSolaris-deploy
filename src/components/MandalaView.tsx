import { useMemo, useState, useRef } from 'react';
import { Download, Mail, Cloud } from 'lucide-react';
import { sendEmail, saveToGoogleDrive } from '../utils/exportUtils';

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
      default: return '#c5a059';
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
    // data vem de astro_engine.py: { planets: { Sun: { degree, sign, ... }, ... }, aspects: [...], ... }
    const planets = data.planets || data;
    return Object.entries(planets)
      .filter(([key]) => !['Houses', 'aspects', 'houses', 'regence', 'meta', 'error'].includes(key))
      .filter(([_, pos]: [string, any]) => pos && typeof pos.degree === 'number')
      .map(([name, pos]: [string, any]) => {
        // 0 graus abs_pos -> 180 no SVG (esquerda, ASC tradicional)
        const angle = (pos.degree + 180) * (Math.PI / 180);
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

  // Funções de exportação
  const [showExportMenu, setShowExportMenu] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mandala_${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleDownloadPNG = () => {
    if (!svgRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = size * 2;
    canvas.height = size * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `mandala_${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    };
    const bytes = new TextEncoder().encode(svgData);
    const binString = String.fromCodePoint(...bytes);
    img.src = 'data:image/svg+xml;base64,' + btoa(binString);
    setShowExportMenu(false);
  };

  const handleSendEmail = () => {
    const planetInfo = planetNodes.map(n => `${n.name}: ${n.degree.toFixed(2)}° ${n.sign}`).join('\n');
    const subject = 'Mandala Astrológica - Aurea Solaris';
    const body = `Aqui está a configuração astrológica atual:\n\n${planetInfo}\n\nExportado em ${new Date().toLocaleDateString('pt-BR')}`;
    sendEmail(subject, body);
    setShowExportMenu(false);
  };

  const handleSaveToDrive = () => {
    const planetInfo = planetNodes.map(n => `${n.name}: ${n.degree.toFixed(2)}° ${n.sign}`).join('\n');
    const content = `# Mandala Astrológica\n\n${planetInfo}\n\n---\nExportado do Aurea Solaris em ${new Date().toLocaleDateString('pt-BR')}`;
    saveToGoogleDrive(content, 'mandala.md');
    setShowExportMenu(false);
  };

  return (
    <div className="relative flex items-center justify-center bg-white/40 p-8 rounded-[3rem] border border-gold/10 backdrop-blur-sm shadow-inner group">
      {/* Botão de Exportação */}
      <div className="absolute top-4 left-4 z-10">
        <div className="relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 bg-white border border-gray-100 rounded-lg shadow-sm text-gray-500 hover:text-gold transition-all"
            title="Exportar"
          >
            <Download size={18} />
          </button>
          
          {showExportMenu && (
            <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
              <button 
                onClick={handleDownloadSVG}
                className="w-full px-4 py-3 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <Download size={14} className="text-gold" /> Download SVG
              </button>
              <button 
                onClick={handleDownloadPNG}
                className="w-full px-4 py-3 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <Download size={14} className="text-gold" /> Download PNG
              </button>
              <div className="border-t border-gray-100" />
              <button 
                onClick={handleSendEmail}
                className="w-full px-4 py-3 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <Mail size={14} className="text-blue-500" /> Enviar por Email
              </button>
              <button 
                onClick={handleSaveToDrive}
                className="w-full px-4 py-3 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <Cloud size={14} className="text-green-500" /> Salvar no Google Drive
              </button>
            </div>
          )}
        </div>
      </div>
      
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
        {/* Background Grids */}
        <circle cx={center} cy={center} r={radius} fill="white" stroke="#c5a059" strokeWidth="1" opacity="0.1" />
        <circle cx={center} cy={center} r={innerRadius} fill="none" stroke="#c5a059" strokeWidth="0.5" opacity="0.2" strokeDasharray="4 4" />
        
        {/* Zodiac Border */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#c5a059" strokeWidth="1" opacity="0.3" />

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
                stroke="#c5a059" strokeWidth="0.5" opacity="0.1" 
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
        <circle cx={center} cy={center} r={4} fill="#c5a059" opacity="0.4" />
      </svg>
      
      {/* Legend Overlay */}
      <div className="absolute top-8 right-8 text-right space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gold">Mapa Ativo</p>
        <p className="text-[10px] font-bold text-gray-400 italic">Vibração Stark Ref. 0.92</p>
      </div>
    </div>
  );
};
