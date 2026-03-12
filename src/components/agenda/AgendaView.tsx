import { useState } from 'react';
import { 
  Clock, Sparkles, ListTodo, Trash2, ChevronLeft, ChevronRight, 
  X, ArrowUpRight, Calendar, Plus 
} from 'lucide-react';
import { useAgendaTasks } from '../../hooks/useAgendaTasks';
import { Card, SectionTitle, Advice, TodoRow } from '../common/UIComponents';

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

  const [activeTab, setActiveTab] = useState('resumo');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalText, setModalText] = useState('');

  const metrics = getMetrics();

  const ASTRO_EVENTS: Record<string, string> = {
    "2026-03-14": "Lua Cheia em Virgem",
    "2026-03-20": "Equinócio de Outono",
    "2026-03-29": "Lua Nova em Áries"
  };

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
  };  return (
    <div className="space-y-10 pb-32 animate-in fade-in max-w-6xl mx-auto px-4 font-sans">
      {/* PROFILE SELECTOR */}
      <div className="flex items-center gap-4 bg-white/50 p-2 rounded-full border border-gold/10 w-fit">
        {profiles.map(p => (
          <button 
            key={p.id} 
            onClick={() => setActiveProfileId(p.id)}
            className={`px-6 py-2.5 rounded-full text-[13px] font-bold transition-all ${activeProfileId === p.id ? 'bg-[#333333] text-white shadow-lg' : 'text-gray-400 hover:text-gold'}`}
          >
            {p.name}
          </button>
        ))}
        <button 
          onClick={() => { const n = prompt('Nome do Perfil:'); if(n) addProfile(n); }}
          className="p-2.5 bg-gray-50 text-gold rounded-full hover:bg-gold/10 transition-all border border-gold/5"
        >
          <Plus size={16}/>
        </button>
      </div>

      <Advice agent="Alfred" content="Agenda sincronizada. Metas do ciclo em 68% de conclusão. Recomendo priorizar a sessão UDV hoje." />
      
      <div className="flex justify-between items-end px-2">
         <div>
            <SectionTitle>Calendário de Ciclos (Semanal)</SectionTitle>
            <p className="text-[11px] text-gray-400 font-medium -mt-4 mb-4">Sincronize sua energia com a regência planetária do dia.</p>
         </div>
         <div className="flex gap-2 mb-4">
            <button onClick={prevWeek} className="p-2.5 hover:bg-white rounded-xl text-gold border border-gold/10 transition-all shadow-sm"><ChevronLeft size={16}/></button>
            <button onClick={nextWeek} className="p-2.5 hover:bg-white rounded-xl text-gold border border-gold/10 transition-all shadow-sm"><ChevronRight size={16}/></button>
         </div>
      </div>

      {/* WEEKLY CALENDAR */}
      <div className="grid grid-cols-7 gap-4 mt-2 text-center">
         {weekDays.map(d => {
            const isToday = d.toDateString() === new Date().toDateString();
            const isSelected = d.toDateString() === selectedDay.toDateString();
            const regency = getPlanetRegency(d);
            const dateStr = d.toISOString().split('T')[0];
            const astro = ASTRO_EVENTS[dateStr];
            
            return (
               <div 
                 key={d.getTime()} 
                 onClick={() => setSelectedDay(d)} 
                 className={`relative flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-[#333333] text-white border-[#333333] shadow-xl -translate-y-1' : 'bg-white text-gray-800 border-gray-100 hover:border-gold/30 hover:shadow-md'}`}
               >
                  <span className={`text-[10px] font-bold uppercase mb-2 ${isSelected ? 'text-gold' : 'text-gray-400'}`}>{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                  <span className="text-xl font-bold leading-none mb-1">{d.getDate()}</span>
                  <span className={`text-[9px] font-medium uppercase mb-3 ${isSelected ? 'opacity-60' : 'text-gray-300'}`}>{d.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                  
                  <div className="pt-2 border-t border-gray-50 w-full flex justify-center gap-2">
                    <span className="text-[12px] opacity-80" title={`Regente: ${regency.name}`}>{regency.icon}</span>
                    {astro && <span className="text-[10px] text-emerald-500 font-bold" title={astro}>✦</span>}
                    {d.getDate() % 7 === 0 && <span className="text-[10px] text-gold" title="Fase Lunar">☽</span>}
                  </div>
                  
                  {isToday && !isSelected && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gold rounded-full" />}
               </div>
            );
         })}
      </div>

      {/* INTERNAL NAVIGATION TABS */}
      <div className="flex justify-center -mb-4 mt-8">
        <div className="bg-white rounded-full p-1.5 border border-gold/10 flex shadow-sm">
          {['resumo', 'transitos', 'futuro'].map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-10 py-3 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === t ? 'bg-gold text-white shadow-md' : 'text-gray-400 hover:text-gold'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* CONDITIONAL RENDER BASED ON TAB */}
      {activeTab === 'resumo' && (
        <div className="animate-in slide-in-from-bottom-2 duration-500 space-y-12">
           <div className="text-center py-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-gold mb-4 line-row">Resumo de Hoje <span className="p-1 px-3 bg-gold/10 rounded-full text-[8px] ml-2">BETA</span></h3>
              <p className="text-gray-400 text-lg font-medium">{selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
           </div>
           
           <div className="bg-white rounded-[3rem] p-16 border border-gold/10 shadow-xl max-w-2xl mx-auto flex flex-col gap-10">
              <div className="space-y-4">
                 <div className="flex items-start gap-6 group">
                    <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 transition-transform group-hover:scale-110 shadow-sm">👍</div>
                    <div className="space-y-1">
                       <p className="text-[15px] font-bold text-gray-800">Reflexão financeira</p>
                       <p className="text-[15px] font-bold text-gray-800">Conexões amorosas</p>
                       <p className="text-[15px] font-bold text-gray-800">Atividades físicas</p>
                    </div>
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="flex items-start gap-6 group">
                    <div className="p-4 bg-red-50 rounded-2xl text-red-600 transition-transform group-hover:scale-110 shadow-sm">⚠️</div>
                    <div className="space-y-1">
                       <p className="text-[15px] font-bold text-gray-800">Decisões impulsivas</p>
                       <p className="text-[15px] font-bold text-gray-800">Conflitos pessoais</p>
                       <p className="text-[15px] font-bold text-gray-800">Desorganização financeira</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'transitos' && (
        <div className="animate-in slide-in-from-bottom-2 duration-500 space-y-8">
           <div className="bg-[#333333] text-white p-3 px-8 rounded-full w-fit mx-auto text-[13px] font-bold">Você tem 14 influências ativas</div>
           <div className="max-w-3xl mx-auto space-y-12 py-10">
              {[
                { title: 'Reconhecimento e respeito em alta', date: 'De 10/03/2026 a 15/03/2026', desc: 'Sol está aos 22° de Peixes (passando pela sua Casa 2), em Trígono a seu MC (Meio do Céu)', icon: '△', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { title: 'A sorte está no ar! Cuide bem dos seus desejos', date: 'De 10/03/2026 a 17/03/2026', desc: 'Mercúrio está aos 11° de Peixes (passando pela sua Casa 1), em Sextil a seu Netuno natal aos 11° de Capricórnio', icon: '＊', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { title: 'Não arrisque demais', date: 'De 09/03/2026 a 13/03/2026', desc: 'Vênus está aos 07° de Áries (passando pela sua Casa 2), em Quadratura com seu Júpiter natal aos 06° de Câncer', icon: '□', color: 'text-red-500', bg: 'bg-red-50' },
              ].map((t, i) => (
                <div key={i} className="flex gap-8 items-start relative pl-10 border-l border-gray-100">
                  <div className={`absolute -left-5 top-0 w-10 h-10 rounded-full ${t.bg} border-2 border-white flex items-center justify-center font-bold text-lg ${t.color} shadow-sm z-10`}>{t.icon}</div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-[#333333] tracking-tight">{t.title}</h4>
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{t.date}</p>
                    <p className="text-[13px] font-medium text-gray-400">{t.desc}</p>
                    <p className="text-[14px] leading-relaxed text-gray-600 max-w-2xl font-medium pt-2">Seu caminho e objetivos na vida tendem a estar mais claros no momento, pois a energia do Sol está em boa fluência com o ponto mais alto do seu mapa... <span className="text-gold border-b border-gold/20 cursor-pointer">Ler mais</span></p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'futuro' && (
        <div className="animate-in slide-in-from-bottom-2 duration-500 max-w-4xl mx-auto py-10">
           <SectionTitle>Calendário de Previsões (Março)</SectionTitle>
           <div className="bg-white rounded-[3rem] p-12 mt-8 border border-gold/10 shadow-sm space-y-6">
              {[
                { date: '02.03', event: 'Marte ingressa em Peixes', time: '11h15' },
                { date: '03.03', event: 'Eclipse Lunar Total – Lua Cheia em Virgem', time: '08h37' },
                { date: '06.03', event: 'Vênus ingressa em Áries', time: '7h45' },
                { date: '11.03', event: 'Fim de Júpiter Retrógrado', time: '0h29' },
                { date: '11.03', event: 'Lua Minguante em Sagitário', time: '6h38' },
                { date: '18.03', event: 'Lua Nova em Peixes', time: '22h23' },
                { date: '20.03', event: 'Sol ingressa em Áries – Ano Novo Astrológico', time: '11h45' },
              ].map((ev, i) => (
                <div key={i} className="flex items-center gap-6 py-4 border-b border-gray-50 last:border-none group">
                  <span className="text-[13px] font-bold text-gold shrink-0">{ev.date}</span>
                  <div className="flex-1 flex justify-between items-center pr-10">
                    <span className="text-[16px] font-bold text-gray-800 leading-tight">{ev.event}</span>
                    <span className="text-[12px] text-gray-400 font-medium italic">({ev.time} – Brasília)</span>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* CORE GRID RESTRUCTURED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* COLUMN 1 */}
         <div className="space-y-10">
            <Card title={`Compromissos - ${selectedDay.toLocaleDateString('pt-BR')}`} icon={<Clock size={18}/>}>
               <div className="space-y-4 mt-4">
                  {ASTRO_EVENTS[selectedDay.toISOString().split('T')[0]] && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 items-center">
                       <Sparkles size={16} className="text-emerald-500"/>
                       <p className="text-[13px] font-bold text-emerald-800">{ASTRO_EVENTS[selectedDay.toISOString().split('T')[0]]}</p>
                    </div>
                  )}
                  {selectedDay.toDateString() === new Date().toDateString() ? (
                    <div className="p-4 bg-[#FCF9F1]/50 border border-gold/10 rounded-xl flex justify-between items-center group hover:bg-[#FCF9F1] transition-all">
                       <div className="flex gap-4 items-center">
                          <div className="p-2 bg-white rounded-lg text-gold shadow-sm"><Clock size={14}/></div>
                          <div><p className="text-[13px] font-bold text-gray-800">Sessão UDV</p><p className="text-[11px] text-[#B8860B] font-medium opacity-60">Hoje, 20:00</p></div>
                       </div>
                       <X size={14} className="text-gray-300 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-all"/>
                    </div>
                  ) : (
                    <p className="text-[12px] text-gray-400 italic text-center py-8">Nenhum evento mapeado para este ciclo.</p>
                  )}
                  <button onClick={() => setShowEventModal(true)} className="w-full py-4 mt-2 border border-dashed border-gold/20 text-gold text-[10px] font-bold uppercase rounded-xl hover:bg-[#FCF9F1] transition-all">+ Agendar no Google Calendar</button>
               </div>
            </Card>

            <Card title="Agenda Previsional (30 dias)" icon={<Calendar size={18}/>}>
               <div className="mt-4 space-y-1 max-h-[350px] overflow-y-auto no-scrollbar">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-none hover:bg-gray-50 rounded-xl transition-all text-[13px]">
                       <div className="flex gap-4 items-center">
                          <span className="font-bold text-gray-300">{(15+i)} Mar</span>
                          <span className="font-bold text-gray-700">Mercúrio em Peixes</span>
                       </div>
                       <span className="text-[9px] font-black text-gold uppercase tracking-[0.2em] bg-gold/5 px-2 py-1 rounded-md">Ingresso</span>
                    </div>
                  ))}
               </div>
            </Card>
         </div>

         {/* COLUMN 2 */}
         <div className="space-y-10">
            <Card title="Células de Tarefas (Todoist)" icon={<ListTodo size={18}/>}>
               <div className="space-y-3 mt-4">
                  {tasks.length > 0 ? tasks.slice(0, 8).map(t => (
                    <div key={t.id} className="flex items-center gap-2 group">
                       <div className="flex-1" onClick={() => toggleTask(t.id, !(t.completed || t.is_completed))}>
                          <TodoRow label={t.content} checked={t.completed || t.is_completed} />
                       </div>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => postponeTask(t.id)} title="Adiar" className="p-2 hover:bg-gold/10 text-gold rounded-lg"><ArrowUpRight size={14}/></button>
                          <button onClick={() => deleteTask(t.id)} title="Excluir" className="p-2 hover:bg-red-50 text-red-400 rounded-lg"><Trash2 size={14}/></button>
                       </div>
                    </div>
                  )) : (
                    <p className="text-[12px] text-gray-400 italic text-center py-6">Nenhuma tarefa pendente.</p>
                  )}
                  <button onClick={() => setShowTaskModal(true)} className="w-full py-4 mt-4 border border-dashed border-gray-200 text-gray-400 text-[10px] font-bold uppercase rounded-xl hover:text-gold hover:border-gold transition-all">+ Criar Nova Tarefa</button>
               </div>
            </Card>

            <Card title="Progresso do Ciclo Mensal" icon={<TrendingUp size={16}/>}>
               <div className="mt-4 space-y-6">
                  <div className="flex justify-between items-end">
                     <div>
                        <p className="text-3xl font-bold text-gray-800">{metrics.done}%</p>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Concluído</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xl font-bold text-gray-400">{metrics.pending}%</p>
                        <p className="text-[10px] uppercase font-bold text-gray-300 tracking-widest">Pendente</p>
                     </div>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                     <div className="h-full bg-[#B8860B] transition-all duration-1000 shadow-[0_0_10px_rgba(184,134,11,0.3)]" style={{ width: `${metrics.done}%` }} />
                     <div className="h-full bg-emerald-100 transition-all duration-1000" style={{ width: `${metrics.pending}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold uppercase text-gray-400 tracking-widest">
                     <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gold" /> Realizado</div>
                     <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-200" /> Em Fluxo</div>
                     <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-100" /> Atrasado</div>
                  </div>
               </div>
            </Card>
         </div>
      </div>

      {/* MODALS */}
      {(showTaskModal || showEventModal) && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl border border-gold/10">
              <div className="flex justify-between items-center mb-8">
                 <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{showEventModal ? 'Agendar Google Calendar' : 'Nova Tarefa Todoist'}</h4>
                 <X size={20} className="cursor-pointer text-gray-400 hover:text-red-500 transition-all" onClick={() => { setShowTaskModal(false); setShowEventModal(false); setModalText(''); }} />
              </div>
              <input 
                autoFocus 
                className="w-full p-6 bg-[#FCF9F1] border border-gold/10 rounded-2xl outline-none text-[15px] font-bold text-gray-800 mb-8 placeholder:text-gray-300" 
                placeholder={showEventModal ? "Título do compromisso..." : "O que precisa ser feito?"} 
                value={modalText} 
                onChange={e => setModalText(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && (showEventModal ? handleAddEvent() : handleTaskSubmit())} 
              />
              <div className="flex gap-4">
                 <button onClick={() => { setShowTaskModal(false); setShowEventModal(false); setModalText(''); }} className="flex-1 py-5 text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] hover:text-gray-600 transition-all">Cancelar</button>
                 <button onClick={showEventModal ? handleAddEvent : handleTaskSubmit} className="flex-1 py-5 bg-[#333333] text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-gold transition-all shadow-xl">Gravar Ciclo</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Internal icon mappings for this component only
const TrendingUp = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);
