import { useState } from 'react';
import { 
  Clock, Sparkles, ListTodo, Trash2, ChevronLeft, ChevronRight, 
  X, ArrowUpRight, Calendar 
} from 'lucide-react';
import { useAgendaTasks } from '../../hooks/useAgendaTasks';
import { Card, SectionTitle, Advice, TodoRow } from '../common/UIComponents';

export const AgendaView = () => {
  const {
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
  };

  return (
    <div className="space-y-12 pb-32 animate-in fade-in max-w-5xl mx-auto">
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

      {/* WEEKLY CALENDAR OVERHAUL */}
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

      {/* METRICS & TASKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <div className="space-y-8">
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
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                     <div className="h-full bg-gold transition-all duration-1000" style={{ width: `${metrics.done}%` }} />
                     <div className="h-full bg-emerald-200 transition-all duration-1000" style={{ width: `${metrics.pending}%` }} />
                  </div>
                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter">
                     <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gold" /> Realizado</div>
                     <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-200" /> Em Fluxo</div>
                     <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-100" /> Atrasado</div>
                  </div>
               </div>
            </Card>

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
         </div>

         <div className="space-y-8">
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

            <Card title="Agenda Previsional (30 dias)" icon={<Calendar size={18}/>}>
               <div className="mt-4 space-y-1 max-h-[300px] overflow-y-auto no-scrollbar">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border-b border-gray-50 last:border-none hover:bg-gray-50 rounded-lg transition-all text-[12px]">
                       <div className="flex gap-3 items-center">
                          <span className="font-bold text-gray-400">{(15+i)} Mar</span>
                          <span className="font-medium text-gray-700">Mercúrio em Peixes</span>
                       </div>
                       <span className="text-[10px] font-bold text-gold uppercase tracking-tighter">Ingresso</span>
                    </div>
                  ))}
               </div>
            </Card>
         </div>
      </div>

      {/* MODALS */}
      {(showTaskModal || showEventModal) && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gold/20">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{showEventModal ? 'Agendar Google Calendar' : 'Nova Tarefa Todoist'}</h4>
                 <X size={18} className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => { setShowTaskModal(false); setShowEventModal(false); setModalText(''); }} />
              </div>
              <input 
                autoFocus 
                className="w-full p-4 bg-[#FCF9F1] border border-gold/10 rounded-xl outline-none text-[14px] text-gray-800 font-medium mb-6" 
                placeholder={showEventModal ? "Título do compromisso..." : "O que precisa ser feito?"} 
                value={modalText} 
                onChange={e => setModalText(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && (showEventModal ? handleAddEvent() : handleTaskSubmit())} 
              />
              <div className="flex gap-4">
                 <button onClick={() => { setShowTaskModal(false); setShowEventModal(false); setModalText(''); }} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all">Cancelar</button>
                 <button onClick={showEventModal ? handleAddEvent : handleTaskSubmit} className="flex-1 py-4 bg-[#333333] text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-gold transition-all shadow-lg">Gravar Ciclo</button>
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
