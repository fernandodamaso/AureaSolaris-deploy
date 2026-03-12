

export const Mandala = ({ planets = [] }: { planets?: any[] }) => (
  <div className={`relative w-full max-w-[500px] aspect-square flex items-center justify-center opacity-90 group mx-auto`}>
    <svg viewBox="0 0 100 100" className="w-full h-full transition-transform duration-[12s] group-hover:rotate-[20deg]">
      <circle cx="50" cy="50" r="48" stroke="#B8860B" strokeWidth="0.3" fill="none" opacity="0.4" />
      <circle cx="50" cy="50" r="35" stroke="#B8860B" strokeWidth="0.1" fill="none" />
      {[...Array(12)].map((_, i) => (
        <g key={i} transform={`rotate(${i * 30} 50 50)`}>
          <line x1="50" y1="2" x2="50" y2="12" stroke="#B8860B" strokeWidth="0.2" opacity="0.5" />
          <text x="50" y="8" fontSize="3.5" fill="#B8860B" textAnchor="middle" transform={`rotate(${i * -30} 50 8)`} className="font-bold opacity-60">
            {['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'][i]}
          </text>
        </g>
      ))}
      {planets.map((p, i) => {
          const angle = p.degree ? (p.degree - 90) : (i * 40 - 90);
          const r = p.isNode ? 42 : 38;
          const x = 50 + r * Math.cos(angle * Math.PI / 180);
          const y = 50 + r * Math.sin(angle * Math.PI / 180);
          return (
            <g key={i}>
               <text x={x} y={y} fontSize="4" fill="#B8860B" textAnchor="middle" fontWeight="bold">{p.icon}</text>
            </g>
          );
      })}
    </svg>
    <div className="absolute w-2 h-2 bg-[#B8860B] rounded-full animate-pulse shadow-[0_0_20px_#B8860B]" />
  </div>
);
