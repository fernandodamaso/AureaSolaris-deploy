import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAstrologyData } from '../hooks/useAstrologyData';
import { useAgendaTasks } from '../hooks/useAgendaTasks';
import { Card, SectionTitle, Advice, StarRow, FamilyItem } from './common/UIComponents';
import { MandalaView } from './MandalaView';
import { BirthForm } from './common/BirthForm';

const PLANET_ICONS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇'
};

export const AstrologiaPage = () => {
  const { liveData } = useAstrologyData();
  const { profiles, activeProfileId, addConnection } = useAgendaTasks();
  const [showForm, setShowForm] = useState(false);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];
  const connections = activeProfile?.connections || [];

  return (
    <div className="space-y-12 pb-32 animate-in fade-in">
      <Advice agent="Rafiki" content={liveData ? `O céu diz: ${liveData.Sun?.sign} iluminando seu caminho. Foco em ${liveData.Mercury?.sign} para comunicação.` : "Rafiki sintonizando as esferas..."} />
      
      <div className="panel-light p-16 text-center relative flex flex-col items-center shadow-sm">
        <SectionTitle>A Roda do Tempo (Eixo Central)</SectionTitle>
        <div className="mt-8 scale-90 lg:scale-100 transition-transform">
           {liveData ? <MandalaView data={liveData} size={500} /> : <div className="w-[500px] h-[500px] flex items-center justify-center text-gold/20 font-black uppercase tracking-[0.3em] italic">Sintonizando Esferas...</div>}
        </div>
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
          <SectionTitle rightAction={<button onClick={() => setShowForm(true)} className="p-2 bg-white rounded-lg border border-gold/20 hover:bg-gold/5 transition-all outline-none"><Plus size={14} className="text-gold"/></button>}>Círculo Familiar</SectionTitle>
          <div className="grid grid-cols-3 gap-5">
             {connections.map((p: any) => (
               <FamilyItem 
                 key={p.id} 
                 name={p.name} 
                 data={p.birthData ? `${p.birthData.date} • ${p.birthData.time}` : (p.natal ? `☉ ${Math.floor(p.natal.Sun)}° • ☾ ${Math.floor(p.natal.Moon)}°` : "Sintonizando...")} 
               />
             ))}
             {connections.length === 0 && <p className="col-span-3 text-center py-10 text-gray-300 text-[11px] font-bold uppercase tracking-widest italic">Nenhum ente registrado ainda...</p>}
          </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
           <BirthForm 
             onSave={(data) => { 
                addConnection(data.name, data);
                setShowForm(false); 
             }} 
             onClose={() => setShowForm(false)} 
           />
        </div>
      )}
    </div>
  );
};
