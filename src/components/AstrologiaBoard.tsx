import { Plus } from 'lucide-react';
import { useAstrologyData } from '../hooks/useAstrologyData';
import { Card, SectionTitle, Advice, StarRow, FamilyItem } from './common/UIComponents';
import { Mandala } from './common/Mandala';

const PLANET_ICONS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇'
};

export const AstrologiaPage = () => {
  const { liveData } = useAstrologyData();

  const planets = liveData ? Object.entries(liveData).filter(([n]) => PLANET_ICONS[n]).map(([n, d]: [string, any]) => ({ icon: PLANET_ICONS[n], degree: d.degree })) : [];

  return (
    <div className="space-y-12 pb-32 animate-in fade-in">
      <Advice agent="Rafiki" content={liveData ? `O céu diz: ${liveData.Sun?.sign} iluminando seu caminho. Foco em ${liveData.Mercury?.sign} para comunicação.` : "Rafiki sintonizando as esferas..."} />
      
      <div className="panel-light p-16 text-center relative flex flex-col items-center shadow-sm">
        <SectionTitle>A Roda do Tempo (Eixo Central)</SectionTitle>
        <Mandala planets={planets} />
      </div>

      <Card title="As Estrelas Cantam (Efemérides)">
         <div className="grid grid-cols-2 gap-x-12 mt-4">
            {Object.entries(PLANET_ICONS).map(([name, icon]) => (
               <StarRow key={name} icon={icon} name={name} sign={liveData?.[name]?.sign || '---'} deg={`${Math.floor(liveData?.[name]?.pos_in_sign || 0)}°`} />
            ))}
         </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <Card title="Pílulas de Sabedoria Astral">
            <div className="space-y-4 pt-2">
               <div className="p-5 bg-[#FCF9F1]/60 border border-gold/10 rounded-xl shadow-xs transition-all hover:bg-[#FCF9F1]/80">
                  <h5 className="text-[9px] font-black uppercase text-[#B8860B] mb-2 tracking-[0.2em] opacity-80">Dignidades Essenciais</h5>
                  <p className="text-[12px] text-gray-700 leading-relaxed font-bold">
                    {liveData?.Venus?.sign === 'Touro' || liveData?.Venus?.sign === 'Libra' ? "Vênus está em domicílio, favorecendo as artes e o equilíbrio hoje." : "A posição de Vênus pede atenção às relações e valores materiais."}
                  </p>
               </div>
               <div className="p-5 bg-white border border-gray-50 rounded-xl shadow-xs transition-all hover:border-gold/20">
                  <h5 className="text-[9px] font-black uppercase text-gray-400 mb-2 tracking-[0.2em] opacity-80">Ciclo Lunar</h5>
                  <p className="text-[12px] text-gray-600 leading-relaxed font-bold">
                    {liveData?.Moon?.sign === 'Câncer' || liveData?.Moon?.sign === 'Touro' ? "Lua em posição forte: as emoções fluem com proteção." : `Lua em ${liveData?.Moon?.sign || 'sincronizando'}... foco na introspecção.`}
                  </p>
               </div>
            </div>
         </Card>
      </div>
      <div className="space-y-6">
          <SectionTitle rightAction={<button className="p-2 bg-white rounded-lg border border-gold/20 hover:bg-gold/5 transition-all outline-none"><Plus size={14} className="text-gold"/></button>}>Círculo Familiar</SectionTitle>
          <div className="grid grid-cols-3 gap-5">
             <FamilyItem name="Fernando" data="☉ Sag • ☾ Cân" />
             <FamilyItem name="Aurora" data="☉ Cap • ☾ Tou" />
             <FamilyItem name="Benício" data="☉ Leão • ☾ Pei" />
          </div>
      </div>
    </div>
  );
};
