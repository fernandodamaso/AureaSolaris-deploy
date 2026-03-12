import { useState } from 'react';
import { 
  Clock, ListTodo, Trash2, ChevronLeft, ChevronRight, 
  X, ArrowUpRight, Plus 
} from 'lucide-react';
import { useAgendaTasks } from '../../hooks/useAgendaTasks';
import { useAstrologyData } from '../../hooks/useAstrologyData';
import { Card, Advice, TodoRow } from '../common/UIComponents';

export const AgendaView = () => {
  const {
    profiles,
    activeProfileId,
    setActiveProfileId,
    addProfile,
    tasks,
    selectedDay,
    setSelectedDay,
    weekDays,
    nextWeek,
    prevWeek,
    addTask,
    deleteTask,
    toggleTask,
    postponeTask,
    addEvent,
    getMetrics,
    getPlanetRegency
  } = useAgendaTasks();

  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const { transits, forecast } = useAstrologyData(activeProfile?.natal);

  const [activeTab, setActiveTab] = useState('resumo');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalText, setModalText] = useState('');

  const metrics = getMetrics();

  const handleAddEvent = async () => {
    if (modalText.trim()) {
      addEvent(modalText, selectedDay.toISOString());
      setModalText('');
      setShowEventModal(false);
    }
  };

  const handleTaskSubmit = () => {
    if (modalText.trim()) {
      addTask(modalText);
      setModalText('');
      setShowTaskModal(false);
    }
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in max-w-6xl mx-auto px-4 font-sans text-gray-800">
      
      {/* 1. HEADER - AGENDA + INFO ASTRO (MOVIDO PARA GLOBAL) */}

      {/* 2. ADVICE (ALFRED) */}
      <div className="animate-in slide-in-from-top-4 duration-700">
        <Advice agent="Alfred" content="Viviane, seu ciclo de produtividade atinge o ápice às 16h. Recomendação: finalize as tarefas prioritárias em fluxo." />
      </div>

      {/* 3. CALENDÁRIO SEMANAL + PERFIS */}
      <div className="bg-white/40 p-6 rounded-xl border border-gold/10 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-50 pb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gold">Ritmos do Ciclo</h2>
            {/* Perfis de Família mais discretos */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
               {profiles.map(p => (
                 <button 
                   key={p.id} 
                   onClick={() => setActiveProfileId(p.id)}
                   className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeProfileId === p.id ? 'bg-[#333333] text-white' : 'text-gray-400 hover:text-gold'}`}
                 >
                   {p.name}
                 </button>
               ))}
               <button onClick={() => { const n = prompt('Nome:'); if(n) addProfile(n); }} className="px-2 text-gold hover:bg-white rounded-md transition-all text-[12px]"><Plus size={12}/></button>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={prevWeek} className="p-2 hover:bg-white rounded-lg text-gold border border-gold/5 transition-all shadow-sm"><ChevronLeft size={16}/></button>
            <button onClick={nextWeek} className="p-2 hover:bg-white rounded-lg text-gold border border-gold/5 transition-all shadow-sm"><ChevronRight size={16}/></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {weekDays.map(d => {
            const isToday = d.toDateString() === new Date().toDateString();
            const isSelected = d.toDateString() === selectedDay.toDateString();
            const regency = getPlanetRegency(d);
            
            return (
               <div 
                 key={d.getTime()} 
                 onClick={() => setSelectedDay(d)} 
                 className={`relative flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-[#333333] text-white border-[#333333] shadow-lg scale-[1.02]' : 'bg-white text-gray-800 border-gray-100 hover:border-gold/20'}`}
               >
                  <span className={`text-[9px] font-black uppercase mb-1 tracking-widest ${isSelected ? 'text-gold' : 'text-gray-400'}`}>{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                  <span className="text-xl font-black leading-none">{d.getDate()}</span>
                  <div className="mt-2 flex gap-1.5 items-center">
                    <span className={`text-[12px] ${isSelected ? 'opacity-100' : 'opacity-30'}`} title={`Regente: ${regency.icon}`}>{regency.icon}</span>
                  </div>
                  {isToday && !isSelected && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-gold rounded-full shadow-[0_0_8px_rgba(184,134,11,0.6)]" />}
               </div>
            );
          })}
        </div>
      </div>

      {/* 4. GRID DE TRABALHO - REORDENADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: EVENTOS -> PREVISÕES */}
        <div className="space-y-8">
           <Card title={`Compromissos - ${selectedDay.toLocaleDateString('pt-BR')}`} icon={<Clock size={14}/>}>
              <div className="space-y-3 mt-4">
                 {selectedDay.toDateString() === new Date().toDateString() ? (
                   <div className="p-4 bg-[#FCF9F1]/40 border border-gold/5 rounded-xl flex justify-between items-center group transition-all hover:bg-[#FCF9F1]/60 shadow-xs">
                      <div className="flex gap-4 items-center">
                         <div className="p-2 bg-white rounded-lg text-gold shadow-xs border border-gold/5"><Clock size={12}/></div>
                         <div><p className="text-[12px] font-black text-gray-800 tracking-tight">Sessão UDV</p><p className="text-[10px] text-gold/60 font-bold">Hoje, 20:00</p></div>
                      </div>
                      <X size={14} className="text-gray-200 group-hover:text-red-400 cursor-pointer transition-all opacity-0 group-hover:opacity-100"/>
                   </div>
                 ) : <p className="text-[11px] text-gray-400 italic text-center py-6 opacity-50 font-medium">Silêncio profundo na agenda...</p>}
                 <button onClick={() => setShowEventModal(true)} className="w-full py-3 border border-dashed border-gold/20 text-gold text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-gold/5 transition-all shadow-xs">+ Agendar no Fluxo</button>
              </div>
           </Card>

           {/* FORECAST TABS ABAIXO DOS EVENTOS */}
           <div className="bg-white rounded-xl border border-gold/10 p-2 shadow-sm">
              <div className="flex p-1 bg-gray-50 rounded-lg mb-4">
                {['resumo', 'transitos', 'futuro'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === t ? 'bg-gold text-white shadow-md' : 'text-gray-400 hover:text-gold'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="px-4 py-2">
                {activeTab === 'resumo' && (
                  <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase text-emerald-600 mb-3 bg-emerald-50 w-fit px-2 py-1 rounded-md tracking-widest">Influências ↑</p>
                      <ul className="space-y-2">
                         <li className="text-[12px] font-bold text-gray-700 flex gap-2 items-center"><span className="text-gold">✨</span> Reflexão financeira</li>
                         <li className="text-[12px] font-bold text-gray-700 flex gap-2 items-center"><span className="text-gold">✨</span> Conexões amorosas</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase text-red-500 mb-3 bg-red-50 w-fit px-2 py-1 rounded-md tracking-widest">Atenção !</p>
                      <ul className="space-y-2">
                         <li className="text-[12px] font-bold text-gray-700 flex gap-2 items-center"><span>⚠️</span> Decisões impulsivas</li>
                         <li className="text-[12px] font-bold text-gray-700 flex gap-2 items-center"><span>⚠️</span> Conflitos pessoais</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === 'transitos' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                     {transits.length > 0 ? transits.map((t: any, i: number) => (
                       <div key={i} className="flex justify-between items-center py-4 px-4 hover:bg-gold/5 rounded-xl transition-all border border-transparent hover:border-gold/10 group">
                          <div className="flex items-center gap-4">
                             <div className="text-center border-r border-gold/10 pr-4">
                               <p className="text-[11px] font-black text-gold tracking-widest leading-none mb-1">HOJE</p>
                               <p className="text-[8px] font-bold text-gray-300 uppercase leading-none">AGORA</p>
                             </div>
                             <div>
                               <p className="text-[12px] font-black text-gray-800 leading-tight">{t.p} em {t.type} ao seu {t.n}</p>
                               <p className="text-[9px] text-gray-400 font-medium italic">{t.desc}</p>
                             </div>
                          </div>
                          <span className="text-gold text-lg opacity-40 group-hover:opacity-100 transition-all font-black">{t.icon}</span>
                       </div>
                     )) : <p className="text-[11px] text-gray-400 italic text-center py-6 opacity-50 font-medium">Sincronizando trânsitos...</p>}
                  </div>
                )}

                {activeTab === 'futuro' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                     {forecast.map((ev: any, i: number) => (
                       <div key={i} className="flex justify-between items-center py-4 px-4 hover:bg-gold/5 rounded-xl transition-all border border-transparent hover:border-gold/10 group">
                          <div className="flex items-center gap-4">
                             <div className="text-center border-r border-gold/10 pr-4">
                               <p className="text-[11px] font-black text-gold tracking-widest leading-none mb-1">{ev.date}</p>
                               <p className="text-[8px] font-bold text-gray-300 uppercase leading-none">{ev.hour}</p>
                             </div>
                             <div>
                               <p className="text-[12px] font-black text-gray-800 leading-tight">{ev.event}</p>
                               <p className="text-[9px] text-gray-400 font-medium italic">{ev.desc}</p>
                             </div>
                          </div>
                          <span className="text-gold text-lg opacity-40 group-hover:opacity-100 transition-all font-black">{ev.aspect || ev.icon}</span>
                       </div>
                     ))}
                  </div>
                )}
              </div>
           </div>
        </div>

        {/* COLUNA DIREITA: TAREFAS -> PROGRESSO */}
        <div className="space-y-8">
           <Card title="Células de Tarefas" icon={<ListTodo size={14}/>}>
              <div className="space-y-2 mt-4">
                 {tasks.length > 0 ? tasks.slice(0, 5).map((t: any) => (
                   <div key={t.id} className="flex items-center gap-3 group p-2 hover:bg-[#FCF9F1]/40 rounded-xl transition-all border border-transparent hover:border-gold/5">
                      <div className="flex-1" onClick={() => toggleTask(t.id, !(t.completed || t.is_completed))}>
                         <TodoRow label={t.content} checked={t.completed || t.is_completed} />
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                         <button onClick={() => postponeTask(t.id)} title="Adiar" className="p-1.5 text-gold hover:bg-gold/10 rounded-lg"><ArrowUpRight size={12}/></button>
                         <button onClick={() => deleteTask(t.id)} title="Excluir" className="p-1.5 text-red-300 hover:bg-red-50 rounded-lg"><Trash2 size={12}/></button>
                      </div>
                   </div>
                 )) : <p className="text-[11px] text-gray-400 italic text-center py-6 opacity-50 font-medium">Sincronizando trilhas...</p>}
                 <button onClick={() => setShowTaskModal(true)} className="w-full py-3 border border-dashed border-gray-200 text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:border-gold hover:text-gold transition-all shadow-xs">+ Novo Todoist</button>
              </div>
           </Card>

           {/* PROGRESSO ÉTICO ABAIXO DAS TAREFAS */}
           <Card title="Progresso Ético" icon={<TrendingUp size={12}/>}>
              <div className="mt-4 space-y-6">
                <div className="flex justify-between items-baseline">
                   <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-[#333333] tracking-tighter">{(metrics.done || 0)}%</span>
                      <span className="text-[10px] font-black text-gold uppercase tracking-[0.2em] animate-pulse">Ativo</span>
                   </div>
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Integridade do Fluxo</span>
                </div>
                
                <div className="relative pt-1">
                   <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-gray-50 border border-gray-100 shadow-inner">
                      <div 
                        style={{ width: `${metrics.done}%` }} 
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gold transition-all duration-1000 relative"
                      >
                         <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                   </div>
                   <div className="absolute -top-4 w-full flex justify-between px-1">
                      <div className="w-[1px] h-2 bg-gray-100" />
                      <div className="w-[1px] h-2 bg-gray-100" />
                      <div className="w-[1px] h-2 bg-gray-100" />
                      <div className="w-[1px] h-2 bg-gray-100" />
                   </div>
                </div>

                <div className="flex justify-between text-[8px] font-black uppercase text-gray-400 tracking-[0.2em] pt-2">
                  <div className="flex items-center gap-2 group cursor-help"><div className="w-2 h-2 bg-gold rounded-sm group-hover:scale-125 transition-all shadow-xs"/> Feitos</div>
                  <div className="flex items-center gap-2 group cursor-help"><div className="w-2 h-2 bg-emerald-100 rounded-sm group-hover:scale-125 transition-all shadow-xs"/> Em Fluxo</div>
                  <div className="flex items-center gap-2 group cursor-help"><div className="w-2 h-2 bg-red-100 rounded-sm group-hover:scale-125 transition-all shadow-xs"/> Pausados</div>
                </div>
              </div>
           </Card>
        </div>
      </div>

      {/* MODALS */}
      {(showTaskModal || showEventModal) && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
           <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-2xl border border-gold/10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold mb-6 border-b border-gray-50 pb-4">{showEventModal ? 'Gravar no Google' : 'Novo Todoist'}</h4>
              <input 
                autoFocus 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none text-[13px] font-bold text-gray-800 mb-8 focus:border-gold/30 transition-all placeholder:text-gray-300 shadow-inner" 
                placeholder="Insira o conteúdo do fluxo..." value={modalText} 
                onChange={e => setModalText(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && (showEventModal ? handleAddEvent() : handleTaskSubmit())} 
              />
              <div className="flex gap-4">
                 <button onClick={() => { setShowTaskModal(false); setShowEventModal(false); setModalText(''); }} className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-gray-600 transition-all">Recuar</button>
                 <button onClick={showEventModal ? handleAddEvent : handleTaskSubmit} className="flex-1 py-4 bg-[#333333] text-white rounded-xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-gold transition-all shadow-lg">Confirmar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const TrendingUp = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);
