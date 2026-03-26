import { useState } from 'react';
import { FileText, Star, Heart, Brain, Activity, Plus, X } from 'lucide-react';
import { Card, SectionTitle, Advice, FileItem, TodoRow } from './common/UIComponents';
import { useSaudeData } from '../context/SaudeContext';

export const SaudeView = () => {
  const { habits, documents, toggleHabit, addHabit, uploadDocument } = useSaudeData();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysHabits = habits.filter(h => h.dateStr === todayStr);

  const [showHabitModal, setShowHabitModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTime, setNewHabitTime] = useState('');

  const handleAddHabit = () => {
    if (newHabitName) {
      addHabit(newHabitName, newHabitTime || 'Livre', todayStr);
      setNewHabitName('');
      setNewHabitTime('');
      setShowHabitModal(false);
    }
  };

  const handleUpload = () => {
    // Mock upload action
    const fakeName = `Exame_Sangue_${new Date().getTime().toString().slice(-4)}.pdf`;
    uploadDocument({ name: fakeName });
  };

  return (
    <div className="space-y-12 pb-32 animate-in fade-in max-w-5xl mx-auto">
      <Advice 
        agent="Alfred" 
        content="Viviane, monitorei seu ciclo de puerpério. Marte na sua 6ª casa natal sugere risco de fadiga cervical; priorize o descanso nas próximas 4 horas." 
      />
      
      <SectionTitle>A. Fluxo de Vitalidade & Laudos</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <Card title="Arquivo de Laudos & Dietas" icon={<FileText size={18}/>}>
            <div className="space-y-1 mt-4 max-h-[160px] overflow-y-auto no-scrollbar">
               {documents.map((doc, idx) => (
                  <FileItem key={idx} name={doc.name} date={doc.date} />
               ))}
            </div>
            <button 
                onClick={handleUpload}
                className="w-full py-4 mt-4 border border-dashed border-[#c5a059]/20 text-[#c5a059] text-[10px] font-bold uppercase rounded-xl hover:bg-[#FCF9F1] transition-all"
            >
                Simular Upload de Documento
            </button>
         </Card>
         <Card title="Astrologia Médica (Hyleg)" icon={<Star size={18}/>}>
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 mb-4 shadow-xs">
               <h5 className="text-[9px] font-black uppercase text-emerald-700 mb-2 tracking-[0.2em]">Sol em Sagitário (Doador)</h5>
               <p className="text-[12px] text-emerald-800 leading-relaxed font-bold">Júpiter atua como Alcocoden, garantindo regeneração rápida, mas sensível a excessos na região do fígado e coxas.</p>
            </div>
         </Card>
      </div>

      <SectionTitle rightAction={
        <button onClick={() => setShowHabitModal(true)} className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center hover:bg-gold hover:text-white transition-all">
          <Plus size={16}/>
        </button>
      }>
        B. Rotina & Hábitos de Cura
      </SectionTitle>

      <Card title={`Hábitos do Dia - ${new Date().toLocaleDateString('pt-BR')}`} icon={<Heart size={18}/>}>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 mt-4">
            {todaysHabits.length > 0 ? (
                todaysHabits.map(habit => (
                    <div key={habit.id} className="relative group">
                        <TodoRow 
                            label={`${habit.name} ${habit.time ? `(${habit.time})` : ''}`} 
                            checked={habit.checked} 
                            onClick={() => toggleHabit(habit.id)} 
                        />
                    </div>
                ))
            ) : (
                <p className="text-[11px] text-gray-400 italic font-medium p-4">Nenhum hábito rastreado hoje.</p>
            )}
         </div>
      </Card>

      <SectionTitle>C. Pílulas de Autocuidado</SectionTitle>
      <div className="panel-light p-8 bg-white shadow-sm border border-gold/5 rounded-xl">
         <ul className="text-[12px] text-gray-700 space-y-5 font-bold">
            <li className="flex gap-4 items-start"><span className="p-2 bg-[#FCF9F1] rounded-lg text-gold shadow-xs"><Brain size={16}/></span> <div className="leading-relaxed"><span className="text-gold uppercase text-[10px] block mb-1 tracking-widest">Alquimia Lunar</span> Chá de Camomila ativa a energia lunar receptiva necessária para o equilíbrio emocional agora.</div></li>
            <li className="flex gap-4 items-start"><span className="p-2 bg-[#FCF9F1] rounded-lg text-gold shadow-xs"><Activity size={16}/></span> <div className="leading-relaxed"><span className="text-gold uppercase text-[10px] block mb-1 tracking-widest">Fisiologia Astral</span> O Sol em Sagitário rege a região lombar; realize alongamentos suaves para circular o fogo interno.</div></li>
         </ul>
      </div>

      {showHabitModal && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl border border-gold/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-sans text-[12px] tracking-[0.2em] font-bold uppercase text-[#c5a059]">Novo Hábito de Cura</h3>
              <X className="cursor-pointer text-gray-400 hover:text-red-500" size={20} onClick={() => setShowHabitModal(false)} />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Hábito / Medicação</label>
                <input 
                  autoFocus
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[13px] font-medium text-gray-800 outline-none focus:border-gold/50 transition-colors"
                  placeholder="Ex: Vitamina D"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Horário (Opcional)</label>
                <input 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[13px] font-medium text-gray-800 outline-none focus:border-gold/50 transition-colors"
                  placeholder="Ex: 08:30"
                  value={newHabitTime}
                  onChange={e => setNewHabitTime(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddHabit()}
                />
              </div>

              <button 
                onClick={handleAddHabit}
                className="w-full mt-6 bg-[#333333] text-gold font-bold uppercase text-[10px] tracking-widest py-4 rounded-xl hover:bg-gold hover:text-white transition-all"
              >
                Ativar Hábito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
