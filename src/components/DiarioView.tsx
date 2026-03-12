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
     <div className="flex h-full gap-8 pb-40 animate-in fade-in pt-4 font-sans max-w-7xl mx-auto px-4">
        <div className="w-72 shrink-0 flex flex-col gap-6">
           <SectionTitle rightAction={<Plus size={14} className="text-gold cursor-pointer hover:rotate-90 transition-all"/>}>Arquivos</SectionTitle>
           <div className="space-y-3 overflow-y-auto no-scrollbar pr-2">
              {notes.map((n, i) => (
                <div key={n.id} onClick={() => setActiveNote(i)} className={`p-4 border transition-all cursor-pointer rounded-xl ${activeNote === i ? 'bg-[#333333] border-[#333333] shadow-md scale-[1.02] text-white' : 'bg-white border-gray-100 hover:border-gold/20'}`}>
                   <p className={`text-[11px] font-black leading-tight mb-1 ${activeNote === i ? 'text-white' : 'text-gray-800'}`}>{n.title}</p>
                   <p className={`text-[8px] uppercase font-black tracking-widest ${activeNote === i ? 'text-gold opacity-100' : 'text-gray-300'}`}>{n.date}</p>
                </div>
              ))}
           </div>
        </div>
        <div className="flex-1 flex flex-col gap-6">
           <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gold/10 shadow-sm">
              <input className="text-2xl font-black text-gray-800 bg-transparent outline-none flex-1 px-2 tracking-tight" defaultValue={notes[activeNote]?.title} />
              <button className="flex items-center gap-2 px-8 py-3 bg-[#333333] text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em] hover:bg-gold transition-all shadow-md group"><Save size={14} className="group-hover:scale-110 transition-all"/> Gravar</button>
           </div>
           <div className="flex-1 bg-white rounded-xl p-10 border border-gray-50 shadow-xs overflow-hidden flex flex-col relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FCF9F1]" />
              <textarea className="flex-1 w-full bg-transparent outline-none text-[15px] leading-[2.4] text-gray-700 font-bold no-scrollbar resize-none pl-4" placeholder="No silêncio profundo, as estrelas disseram..." value={text} onChange={e => setText(e.target.value)} />
           </div>
        </div>
     </div>
  );
};
