import { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { SectionTitle } from './common/UIComponents';

export const DiarioView = () => {
  const [activeNote, setActiveNote] = useState(0);
  const [text, setText] = useState("");
  const notes = [
    {id: 1, title: "Sessão UDV: O Retorno ao Sol", date: "12 Mar"},
    {id: 2, title: "Insights do Puerpério", date: "10 Mar"},
    {id: 3, title: "Estudos Tarot Rider", date: "05 Mar"},
  ];

  return (
    <div className="flex h-full gap-8 pb-40 animate-in fade-in pt-4 font-sans">
       <div className="w-80 shrink-0 flex flex-col gap-6">
          <SectionTitle rightAction={<Plus size={14} className="text-gold cursor-pointer hover:scale-110 transition-all"/>}>Histórico</SectionTitle>
          <div className="space-y-3 overflow-y-auto no-scrollbar">
             {notes.map((n, i) => (
               <div key={n.id} onClick={() => setActiveNote(i)} className={`p-5 border transition-all cursor-pointer rounded-3xl ${activeNote === i ? 'bg-[#FCF9F1] border-gold/30 shadow-md scale-[1.02]' : 'bg-white border-gray-100 hover:border-gold/20'}`}>
                  <p className="text-[13px] font-bold text-gray-800 mb-1">{n.title}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{n.date}</p>
               </div>
             ))}
          </div>
       </div>
       <div className="flex-1 flex flex-col gap-6">
          <div className="flex justify-between items-center bg-white p-7 rounded-3xl border border-[#B8860B]/10 shadow-sm font-sans">
             <input className="text-3xl font-bold text-gray-800 bg-transparent outline-none flex-1 font-sans px-4" defaultValue={notes[activeNote]?.title} />
             <div className="flex gap-4">
                <button className="flex items-center gap-2 px-10 py-4 bg-[#333333] text-white rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-[#B8860B] transition-all shadow-lg"><Save size={18}/> Salvar Nota</button>
             </div>
          </div>
          <div className="flex-1 bg-white rounded-3xl p-12 border border-gray-100 shadow-inner overflow-hidden flex flex-col relative font-sans">
             <div className="absolute top-0 left-0 w-2 h-full bg-[#FCF9F1]" />
             <textarea className="flex-1 w-full bg-transparent outline-none text-[18px] leading-[2.6] text-gray-700 font-medium no-scrollbar resize-none font-sans" placeholder="No silêncio profundo, as estrelas disseram..." value={text} onChange={e => setText(e.target.value)} />
          </div>
       </div>
    </div>
  );
};
