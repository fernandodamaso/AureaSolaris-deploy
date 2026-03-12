import React, { useState, useEffect } from 'react';
import {
  Moon, Calendar, PieChart,
  Settings, MessageSquare, Plus,
  User, Star, Edit3, Eye, Clock,
  Sparkles, X, Activity,
  Archive, PanelLeftClose, PanelLeftOpen,
  BookOpen
} from 'lucide-react';
import { safeInvoke } from './utils/tauri';
import "./styles.css";

// Hooks
import { useAstrologyData } from './hooks/useAstrologyData';

// Components
import { NavItem, SectionTitle } from './components/common/UIComponents';
import { AgentChat } from './components/AgentChat';
import { AgendaView } from './components/agenda/AgendaView';
import { AstrologiaPage } from './components/AstrologiaBoard';
import { SaudeView } from './components/SaudeView';
import { FinancasView } from './components/FinancasView';
import { ControlePanel } from './components/ControlePanel';
import { DiarioView } from './components/DiarioView';
import { MesaCriacao } from './components/MesaCriacao';
import { MemoriasView } from './components/MemoriasView';

// --- ESTILOS GLOBAIS ---
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  .font-sans { font-family: 'Inter', sans-serif; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .glass-panel { background: rgba(252, 249, 241, 0.95); backdrop-filter: blur(16px); }
  .paper-bg { background-color: #FCF9F1; }
  .panel-light { background-color: #ffffff; border: 1px solid rgba(184, 134, 11, 0.08); border-radius: 12px; }
  .text-gold { color: #B8860B; }
  .bg-gold { background-color: #B8860B; }
  
  .layout-grid { display: grid; height: 100vh; width: 100vw; overflow: hidden; background: #F5F1E6; gap: 16px; padding: 16px; transition: grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
  .main-area { border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; background: #FCF9F1; box-shadow: 0 4px 20px rgba(0,0,0,0.02); border: 1px solid rgba(184, 134, 11, 0.05); position: relative; }

  .hook-dot { position: absolute; width: 8px; height: 8px; background: #B8860B; border: 1.5px solid white; border-radius: 50%; opacity: 0; transition: 0.2s; cursor: crosshair; z-index: 40; }
  .canvas-node:hover .hook-dot { opacity: 1; }
  .hook-dot:hover { transform: scale(1.5); box-shadow: 0 0 8px rgba(184,134,11,0.3); }
`;

export default function App() {
  const [currentPage, setCurrentPage] = useState('astrologia');
  const [isStrangeOpen, setIsStrangeOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [strangeMsgs, setStrangeMsgs] = useState<any[]>([]);
  const [strangeInput, setStrangeInput] = useState('');
  const [loadingStrange, setLoadingStrange] = useState(false);

  const hasChat = !['mesa-criacao', 'diario', 'memorias'].includes(currentPage);
  const isMesa = currentPage === 'mesa-criacao';

  useEffect(() => {
    const load = async () => {
      const h = await safeInvoke<any[]>('load_history', { agent: 'Strange' });
      if (h) setStrangeMsgs(h);
      else setStrangeMsgs([{ role: 'assistant', content: 'Olho de Agamotto detecta estabilidade dimensional.' }]);
    };
    load();
  }, []);

  const handleStrange = async () => {
    if (!strangeInput.trim() || loadingStrange) return;
    const ut = [...strangeMsgs, { role: 'user', content: strangeInput }];
    setStrangeMsgs(ut);
    setStrangeInput('');
    setLoadingStrange(true);

    try {
      const res = await safeInvoke<string>('openrouter_chat', {
        model: 'google/gemini-2.0-pro-exp-02-05',
        messages: [
          { role: 'system', content: 'Você é Dr. Strange, o mestre supremo do sistema Aurea Solaris. Você vê múltiplos futuros e padrões. Responda de forma sábia, breve e mística.' },
          ...ut
        ]
      });
      if (res) {
        const f = [...ut, { role: 'assistant', content: res }];
        setStrangeMsgs(f);
        await safeInvoke('save_history', { agent: 'Strange', history: f });
      }
    } catch (err) {
      console.error("Strange error:", err);
    }
    setLoadingStrange(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'astrologia': return <AstrologiaPage />;
      case 'saude': return <SaudeView />;
      case 'agenda': return <AgendaView />;
      case 'financas': return <FinancasView />;
      case 'controle': return <ControlePanel />;
      case 'diario': return <DiarioView />;
      case 'mesa-criacao': return <MesaCriacao />;
      case 'memorias': return <MemoriasView />;
      default: return <AstrologiaPage />;
    }
  };

  const ProfilePopup = () => (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-md px-4 animate-in fade-in font-sans">
       <div className="bg-[#FCF9F1] rounded-[3rem] p-12 w-full max-w-4xl shadow-2xl border border-gold/30">
          <SectionTitle rightAction={<X onClick={() => setIsProfileOpen(false)} className="cursor-pointer text-gray-400 hover:text-red-500"/>}>Identidade Mestre (Configurações)</SectionTitle>
          <div className="grid grid-cols-2 gap-12 mt-8">
             <div className="space-y-6">
                <div><label className="text-[10px] font-bold uppercase text-gray-400 pl-2 tracking-widest">Nome Mestre</label><input className="w-full bg-white p-4 rounded-2xl border border-gold/10 font-bold text-gray-800" defaultValue="Viviane" /></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 pl-2 tracking-widest">Contexto Pessoal</label><textarea className="w-full h-32 bg-white p-4 rounded-2xl outline-none border border-gold/10 resize-none text-[13px] text-gray-600 font-medium leading-relaxed" defaultValue="Puerpério. Filhos 2m e 2a. Estudo UDV. Foco em equilíbrio total." /></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 pl-2 tracking-widest">Estilo de Diálogo</label><select className="w-full bg-white p-4 rounded-2xl border border-gold/10 text-[13px] font-bold outline-none cursor-pointer"><option>Inteligente e Poética</option></select></div>
             </div>
             <div className="space-y-6 flex flex-col">
                <div className="flex-1 flex flex-col">
                    <label className="text-[10px] font-bold uppercase text-gray-400 pl-2 tracking-widest">Mapa Natal (Bulk Text)</label>
                    <textarea className="flex-1 w-full bg-white p-6 rounded-2xl font-mono text-[12px] border border-gold/10 resize-none leading-relaxed text-gray-800 shadow-inner mt-1" defaultValue="Sun in Sagittarius 29°37'\nMoon in Libra 16°17'\nASC in Aquarius 21°51'" />
                </div>
                <button className="w-full py-5 bg-[#333333] text-white rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-gold shadow-xl transition-all">Gravar Alma Master</button>
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <div className="layout-grid font-sans overflow-hidden" style={{ gridTemplateColumns: `${isSidebarCollapsed ? '80px' : '260px'} 1fr ${hasChat ? '360px' : '0px'}` }}>
      <style>{globalStyles}</style>

      {/* SIDEBAR */}
      <aside className="bg-white rounded-[2.5rem] border border-[#B8860B]/10 shadow-xl shrink-0 z-30 flex flex-col relative overflow-hidden transition-all duration-300">
        <div className="flex items-center gap-4 p-8 pb-4 shrink-0">
          <div className="cursor-pointer hover:rotate-12 transition-all shrink-0" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <PanelLeftOpen size={24} className="text-gold"/> : <PanelLeftClose size={24} className="text-gold"/>}
          </div>
          {!isSidebarCollapsed && <h1 className="text-[13px] font-bold tracking-widest text-[#B8860B] uppercase">Aurea Solaris</h1>}
        </div>
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto no-scrollbar pb-6 pt-4">
          <NavItem icon={<Edit3 size={18} />} label="Mesa de Criação" active={currentPage === 'mesa-criacao'} onClick={() => setCurrentPage('mesa-criacao')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Star size={18} />} label="Astrologia" active={currentPage === 'astrologia'} onClick={() => setCurrentPage('astrologia')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Activity size={18} />} label="Saúde & Vitalidade" active={currentPage === 'saude'} onClick={() => setCurrentPage('saude')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Calendar size={18} />} label="Agenda Preditiva" active={currentPage === 'agenda'} onClick={() => setCurrentPage('agenda')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<PieChart size={18} />} label="Gestão de Ouro" active={currentPage === 'financas'} onClick={() => setCurrentPage('financas')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Settings size={18} />} label="Painel de Controle" active={currentPage === 'controle'} onClick={() => setCurrentPage('controle')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<BookOpen size={18} />} label="Meu Diário" active={currentPage === 'diario'} onClick={() => setCurrentPage('diario')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Archive size={18} />} label="Logs & Memórias" active={currentPage === 'memorias'} onClick={() => setCurrentPage('memorias')} collapsed={isSidebarCollapsed} />
        </nav>
        <div className="p-4 pt-2 border-t border-gray-100 shrink-0">
          <button onClick={() => setIsProfileOpen(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#FCF9F1] hover:bg-white border border-transparent transition-all group shadow-sm">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-white text-[#B8860B] flex items-center justify-center shrink-0"><User size={16} /></div>
            {!isSidebarCollapsed && <div className="text-left overflow-hidden"><p className="text-[11px] font-bold uppercase truncate text-gray-800 leading-none">Viviane</p></div>}
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="main-area">
        {!isMesa && (
          <header className="px-12 py-8 flex justify-between items-center glass-panel shrink-0 border-b border-gold/10 z-20">
            <h2 className="text-2xl font-bold tracking-[0.2em] uppercase text-gray-800">{currentPage.replace('-', ' ')}</h2>
            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <span className="flex items-center gap-2.5 text-[#B8860B] bg-[#FCF9F1] px-4 py-2 rounded-xl border border-gold/10"><Moon size={16} /> Minguante</span>
              <span onClick={() => setCurrentPage('agenda')} className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-gray-800 font-bold cursor-pointer hover:border-gold transition-all"><Clock size={14} /> {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
          </header>
        )}
        <div className={`flex-1 relative ${isMesa ? '' : 'px-12 pt-10 overflow-y-auto no-scrollbar pb-40'}`}>
          {renderPage()}
        </div>
      </main>

      {/* CHAT DIREITO */}
      <aside className={`h-full shrink-0 z-10 transition-all duration-500 overflow-hidden ${hasChat ? 'w-[360px] opacity-100' : 'w-0 opacity-0'}`}>
          {currentPage === 'astrologia' && <AgentChat agent="Rafiki" />}
          {currentPage === 'saude' && <AgentChat agent="Alfred" />}
          {currentPage === 'agenda' && <AgentChat agent="Alfred" />}
          {currentPage === 'financas' && <AgentChat agent="Uncle Duck" />}
          {currentPage === 'controle' && <AgentChat agent="Stark" />}
      </aside>

      {/* STRANGE FAB */}
      <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-6 pointer-events-none">
        {isStrangeOpen && (
          <div className="w-[420px] h-[650px] bg-white rounded-[3.5rem] shadow-2xl border border-gold/30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 pointer-events-auto">
            <div className="p-8 bg-[#FCF9F1] border-b border-gold/10 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-full text-[#B8860B] shadow-sm"><Eye size={24}/></div>
                  <div><p className="text-[14px] font-bold uppercase tracking-widest text-gray-800 leading-tight">Dr. Strange</p><p className="text-[9px] font-bold text-[#B8860B] uppercase tracking-widest leading-none">Supervisor Macro</p></div>
               </div>
               <X onClick={() => setIsStrangeOpen(false)} className="cursor-pointer text-gray-400 hover:text-red-500 p-2 rounded-full transition-all"/>
            </div>
            <div className="flex-1 p-8 space-y-6 overflow-y-auto no-scrollbar bg-white">
               {strangeMsgs.map((m, i) => (
                  <div key={i} className={`p-6 rounded-3xl border border-gray-100 text-[13px] text-gray-600 font-medium leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-[#FCF9F1] ml-auto border-[#B8860B]/20' : 'bg-gray-50 mr-auto'}`}>
                    {m.content}
                  </div>
               ))}
               {loadingStrange && <div className="text-[10px] opacity-40 animate-pulse text-center">Consultando linhas temporais...</div>}
            </div>
            <div className="p-6 bg-[#FCF9F1] border-t border-gray-100">
               <div className="flex items-center gap-3 bg-white p-2 rounded-full border border-gold/10 shadow-sm">
                  <input className="flex-1 bg-transparent text-[#333333] font-medium text-[13px] px-5 outline-none" placeholder="Consultar o Olho..." value={strangeInput} onChange={e => setStrangeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleStrange()} />
                  <button onClick={handleStrange} className="p-3 bg-[#333333] text-white rounded-full hover:bg-[#B8860B] transition-all"><Sparkles size={18}/></button>
               </div>
            </div>
          </div>
        )}
        <button onClick={() => setIsStrangeOpen(!isStrangeOpen)} className="pointer-events-auto w-20 h-20 rounded-full shadow-2xl bg-white border-4 border-[#B8860B]/30 flex items-center justify-center hover:scale-110 transition-all"><Eye size={40} className="text-[#B8860B]"/></button>
      </div>

      {isProfileOpen && <ProfilePopup />}
    </div>
  );
}
