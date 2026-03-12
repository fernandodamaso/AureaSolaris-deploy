import { useState, useEffect } from 'react';
import { Star, Calendar, PieChart, Zap, Eye } from 'lucide-react';
import { SectionTitle } from './common/UIComponents';
import { safeInvoke } from '../utils/tauri';

const AGENT_ICONS: Record<string, string> = { Rafiki: '🌟', Alfred: '📜', Stark: '🚀', 'Uncle Duck': '🦆', Strange: '👁️' };

export const MemoriasView = () => {
  const [activeAgent, setActiveAgent] = useState('Rafiki');
  const [archives, setArchives] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const all: any[] = [];
      for (const agent of Object.keys(AGENT_ICONS)) {
        const h = await safeInvoke<string[]>('list_archived_chats', { agent });
        if (h) h.forEach(name => all.push({ agent, name, date: name.split('_')[1]?.split('.')[0] || 'Antiga' }));
      }
      setArchives(all.sort((a,b) => b.name.localeCompare(a.name)));
    };
    load();
  }, []);

  const openArchive = async (arc: any) => {
    // Note: Path is specific to user system as seen in App.tsx
    const path = `C:\\Users\\vivic\\AppData\\Roaming\\aurea-solaris\\memory\\archives\\${arc.name}`;
    const raw = await safeInvoke<string>('read_text_file', { path });
    if (raw) try { setSelectedChat(JSON.parse(raw)); } catch(e) { setSelectedChat([]); }
  };

  const agents = [
    { name: 'Rafiki', icon: <Star size={16}/> }, 
    { name: 'Alfred', icon: <Calendar size={16}/> }, 
    { name: 'Uncle Duck', icon: <PieChart size={16}/> }, 
    { name: 'Stark', icon: <Zap size={16}/> }, 
    { name: 'Strange', icon: <Eye size={16}/> }
  ];
  
  return (
    <div className="w-full h-full flex gap-8 animate-in fade-in pb-10 pt-6 font-sans">
      <aside className="w-80 panel-light rounded-[2.5rem] flex flex-col overflow-hidden shrink-0 shadow-sm">
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          <SectionTitle>Arquivos de Memória</SectionTitle>
          <div className="space-y-4">
             {archives.filter(a => a.agent === activeAgent || !activeAgent).map((arc, i) => (
               <div key={i} onClick={() => openArchive(arc)} className="p-4 bg-white border border-gray-100 rounded-2xl cursor-pointer hover:border-gold transition-all">
                  <p className="text-[12px] font-bold text-gray-800">{arc.name}</p>
                  <p className="text-[9px] text-gold uppercase font-bold">{arc.date}</p>
               </div>
             ))}
          </div>
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-4 px-2">Trocar Agente</h4>
            <div className="space-y-1">
              {agents.map(a => (
                <button key={a.name} onClick={() => setActiveAgent(a.name)} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${activeAgent === a.name ? 'bg-[#FCF9F1] text-gold font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {a.icon} <span className="text-[13px]">{a.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 panel-light rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-lg">
        <div className="p-8 border-b border-gray-100 bg-[#FCF9F1] flex justify-between items-center shrink-0">
          <h3 className="font-sans text-[16px] font-bold uppercase tracking-widest text-[#333333]">Fluxo Dimensional: {activeAgent}</h3>
        </div>
        <div className="flex-1 p-10 overflow-y-auto no-scrollbar space-y-6 bg-white">
             {selectedChat.length > 0 ? selectedChat.map((m: any, i: number) => (
               <div key={i} className={`p-6 rounded-2xl text-[14px] max-w-[85%] ${m.role === 'user' ? 'bg-[#FCF9F1] ml-auto border border-gold/10' : 'bg-gray-50 mr-auto border border-gray-100'}`}>
                  {m.content}
               </div>
             )) : <p className="text-center text-gray-300 italic mt-20">Selecione uma memória para projetar...</p>}
        </div>
      </main>
    </div>
  );
};
