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
    <div className="w-full h-full flex gap-10 animate-in fade-in pb-10 pt-6 font-sans max-w-7xl mx-auto">
      <aside className="w-80 bg-white border border-gold/10 flex flex-col overflow-hidden shrink-0 shadow-sm">
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-10">
          <SectionTitle>Arquivos de Memória</SectionTitle>
          <div className="space-y-[1px]">
             {archives.filter(a => a.agent === activeAgent || !activeAgent).map((arc, i) => (
               <div key={i} onClick={() => openArchive(arc)} className="p-5 bg-white border border-gray-50 cursor-pointer hover:bg-gray-50 transition-all group">
                  <p className="text-[11px] font-black text-gray-700 group-hover:text-gold transition-all uppercase tracking-wider">{arc.name}</p>
                  <p className="text-[8px] text-gold uppercase font-black tracking-[0.2em] mt-2 opacity-40">{arc.date}</p>
               </div>
             ))}
          </div>
          <div className="border-t border-gray-100 pt-8">
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6 px-2">Filtrar Agente</h4>
            <div className="space-y-1">
              {agents.map(a => (
                <button key={a.name} onClick={() => setActiveAgent(a.name)} className={`w-full flex items-center justify-between p-4 transition-all ${activeAgent === a.name ? 'bg-[#333333] text-white font-black shadow-lg' : 'text-gray-400 hover:bg-gray-50 border-b border-gray-50'}`}>
                  <div className="flex items-center gap-4">
                     <span className={activeAgent === a.name ? 'text-gold' : 'opacity-40'}>{a.icon}</span> 
                     <span className="text-[10px] uppercase tracking-[0.2em]">{a.name}</span>
                  </div>
                  {activeAgent === a.name && <div className="w-1 h-4 bg-gold" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 bg-white border border-gold/10 flex flex-col overflow-hidden relative shadow-xl">
        <div className="p-8 border-b border-gold/5 bg-[#FCF9F1]/20 flex justify-between items-center shrink-0">
          <h3 className="font-sans text-[11px] font-black uppercase tracking-[0.5em] text-gray-800">Câmara de Ecrãs • {activeAgent}</h3>
        </div>
        <div className="flex-1 p-10 overflow-y-auto no-scrollbar space-y-6 bg-white">
             {selectedChat.length > 0 ? selectedChat.map((m: any, i: number) => (
               <div key={i} className={`p-6 text-[13px] max-w-[80%] leading-relaxed border ${m.role === 'user' ? 'bg-[#FCF9F1] ml-auto border-gold/10 text-gray-800 font-bold' : 'bg-gray-50 mr-auto border-gray-100 text-gray-600 font-medium'}`}>
                  {m.content}
               </div>
             )) : <div className="flex flex-col items-center justify-center mt-32 opacity-20"><PieChart size={40} className="mb-4 text-gold"/><p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Projetando Fluxo Dimensional...</p></div>}
        </div>
      </main>
    </div>
  );
};
