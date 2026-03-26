import { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import { useAstrologyData } from '../hooks/useAstrologyData';
import { useAgendaTasks } from '../hooks/useAgendaTasks';
import { Card, SectionTitle, Advice, StarRow, FamilyItem } from './common/UIComponents';
import { BirthForm } from './common/BirthForm';

const PLANET_ICONS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇'
};

import { MandalaPage } from './MandalaPage';
import { RafikiEscola } from './RafikiEscola';

export const AstrologiaPage = () => {
  const { liveData } = useAstrologyData();
  const { profiles, activeProfileId, addConnection } = useAgendaTasks();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'mandala' | 'escola'>('list');

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];
  const connections = activeProfile?.connections || [];

  const planets = liveData?.planets || {};
  const aspects = liveData?.aspects || [];

  return (
    <div className="space-y-8 pb-24 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-gold/10 pb-4 mb-4 gap-4">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('list')}
            className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all pb-2 border-b-2 ${activeTab === 'list' ? 'text-gold border-gold' : 'text-gray-400 border-transparent'}`}
          >
            Efemérides Técnicas
          </button>
          <button 
            onClick={() => setActiveTab('mandala')}
            className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all pb-2 border-b-2 ${activeTab === 'mandala' ? 'text-gold border-gold' : 'text-gray-400 border-transparent'}`}
          >
            Mandala Visual
          </button>
          <button 
            onClick={() => setActiveTab('escola')}
            className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all pb-2 border-b-2 ${activeTab === 'escola' ? 'text-gold border-gold' : 'text-gray-400 border-transparent'}`}
          >
            Escola de Astrologia
          </button>
        </div>
      </div>

      <Advice 
        agent="Rafiki" 
        content={planets.Sun ? `O céu diz: ${planets.Sun.sign} iluminando seu caminho. Foco em ${planets.Mercury?.sign} para comunicação.` : "Rafiki sintonizando as esferas..."} 
      />
      
      {activeTab === 'mandala' ? (
         <div className="animate-in slide-in-from-right-10 duration-500">
           <MandalaPage />
         </div>
      ) : activeTab === 'escola' ? (
         <div className="animate-in slide-in-from-right-10 duration-500">
           <RafikiEscola />
         </div>
      ) : (
        <>
          {/* Visualização da Mandala removida desta aba (agora exclusiva na sub-aba Mandala) */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="As Estrelas Cantam (Efemérides)">
           <div className="grid grid-cols-2 gap-x-8 mt-4">
              {Object.entries(PLANET_ICONS).map(([name, icon]) => (
                 <StarRow 
                   key={name} 
                   icon={icon} 
                   name={name} 
                   sign={planets[name]?.sign || '---'} 
                   deg={`${Math.floor(planets[name]?.pos_in_sign || 0)}°`} 
                 />
              ))}
           </div>
        </Card>

        <Card title="Dança das Esferas (Aspectos)">
          <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {aspects.length > 0 ? aspects.map((asp, i) => {
              const isMinor = ['Inconjunto', 'Quintil', 'Bi-Quintil', 'Semi-Sextil', 'Semi-Quadratura', 'Sesqui-Quadratura'].includes(asp.type);
              const applyingIndicator = asp.applying !== undefined ? (asp.applying ? '→' : '←') : null;
              return (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg transition-all ${isMinor ? 'bg-white/30 border border-gray-100/50 hover:border-gray-300/50' : 'bg-white/50 border border-gold/5 hover:border-gold/20'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`${isMinor ? 'text-gray-400' : 'text-gold'} text-lg`}>{asp.symbol}</span>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">{asp.type}</span>
                      <span className="text-[11px] text-gray-500">{asp.p1} e {asp.p2}{applyingIndicator && <span className="ml-1 text-gold/60">{applyingIndicator}</span>}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isMinor ? 'bg-gray-100 text-gray-500' : 'bg-gold/10 text-gold'}`}>Orb {asp.orb.toFixed(1)}°</span>
                  </div>
                </div>
              );
            }) : <p className="text-center py-10 text-gray-300 text-[11px] italic">Nenhum aspecto sintonizado...</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card title="Pílulas de Sabedoria Astral">
            <div className="space-y-4 pt-2">
               <div className="p-5 bg-[#FCF9F1]/60 border border-gold/10 rounded-xl shadow-xs transition-all hover:bg-[#FCF9F1]/80 group">
                  <h5 className="flex items-center justify-between text-[9px] font-black uppercase text-[#c5a059] mb-2 tracking-[0.2em] opacity-80">
                    Dignidades Essenciais <Info size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                  </h5>
                  <p className="text-[12px] text-gray-700 leading-relaxed font-bold">
                    {planets.Venus?.sign === 'Touro' || planets.Venus?.sign === 'Libra' ? "Vênus está em domicílio, favorecendo as artes e o equilíbrio hoje." : "A posição de Vênus pede atenção às relações e valores materiais."}
                  </p>
               </div>
               <div className="p-5 bg-white border border-gray-50 rounded-xl shadow-xs transition-all hover:border-gold/20 group">
                  <h5 className="flex items-center justify-between text-[9px] font-black uppercase text-gray-400 mb-2 tracking-[0.2em] opacity-80">
                    Ciclo Lunar <Info size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                  </h5>
                  <p className="text-[12px] text-gray-600 leading-relaxed font-bold">
                    {planets.Moon?.sign === 'Câncer' || planets.Moon?.sign === 'Touro' ? "Lua em posição forte: as emoções fluem com proteção." : `Lua em ${planets.Moon?.sign || 'sincronizando'}... foco na introspecção.`}
                  </p>
               </div>
            </div>
         </Card>
      </div>

      <div className="space-y-6">
          <SectionTitle rightAction={<button onClick={() => setShowForm(true)} className="p-2 bg-white rounded-lg border border-gold/20 hover:bg-gold/5 transition-all outline-none"><Plus size={14} className="text-gold"/></button>}>Círculo Familiar</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
             {connections.map((p: any) => (
               <FamilyItem 
                 key={p.id} 
                 name={p.name} 
                 data={p.birthData ? `${p.birthData.date} • ${p.birthData.time}` : (p.natal ? `☉ ${Math.floor(p.natal.Sun)}° • ☾ ${Math.floor(p.natal.Moon)}°` : "Sintonizando...")} 
               />
             ))}
             {connections.length === 0 && <p className="col-span-full text-center py-10 text-gray-300 text-[11px] font-bold uppercase tracking-widest italic">Nenhum ente registrado ainda...</p>}
          </div>
        </div>
      </>
    )}

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
