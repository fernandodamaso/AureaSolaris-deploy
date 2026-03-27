import { useState, useEffect } from 'react';
import {
  Calendar, PieChart,
  Settings,
  User, Star, Edit3, Eye, Clock,
  Sparkles, X, Activity,
  PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen,
  Package
} from 'lucide-react';
import { safeInvoke } from './utils/tauri';
import "./styles.css";

// Hooks
import { useAstrologyData } from './hooks/useAstrologyData';
import { useAgendaTasks } from './hooks/useAgendaTasks';
import { useFinancas } from './context/FinancasContext';
import { AgendaProvider } from './context/AgendaContext';

// Components
import { NavItem } from './components/common/UIComponents';
import { AgentChat } from './components/AgentChat';
import { AgendaView } from './components/agenda/AgendaView';
import { AstrologiaPage } from './components/AstrologiaBoard';
import { SaudeView } from './components/SaudeView';
import { FinancasView } from './components/FinancasView';
import { ControlePanel } from './components/ControlePanel';
import { MesaCriacao } from './components/MesaCriacao';
import { MemoriasView } from './components/MemoriasView';
import { AlfredHubView } from './components/AlfredHubView';
import { LoginView } from './components/LoginView';
import { DiarioView } from './components/DiarioView';
import { ProfileEditor } from './components/ProfileEditor';
// --- ESTILOS GLOBAIS ---
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800&family=Raleway:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
  .font-sans { font-family: 'Inter', sans-serif; }
  .font-display { font-family: 'Montserrat', sans-serif; }
  .font-heading { font-family: 'Poppins', sans-serif; }
  .font-label { font-family: 'Raleway', sans-serif; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .glass-panel { background: rgba(252, 249, 241, 0.95); backdrop-filter: blur(16px); }
  .paper-bg { background-color: #FCF9F1; }
  .panel-light { background-color: #ffffff; border: 1px solid rgba(197, 160, 89, 0.08); border-radius: 12px; }
  .text-gold { color: #c5a059; }
  .bg-gold { background-color: #c5a059; }
  
  .layout-grid { display: grid; height: 100vh; width: 100vw; overflow: hidden; background: #0e1120; gap: 16px; padding: 16px; transition: grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
  .main-area { border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; background: #FCF9F1; position: relative; }

  .hook-dot { position: absolute; width: 8px; height: 8px; background: #c5a059; border: 1.5px solid white; border-radius: 50%; opacity: 0; transition: 0.2s; cursor: crosshair; z-index: 40; }
  .canvas-node:hover .hook-dot { opacity: 1; }
  .hook-dot:hover { transform: scale(1.5); box-shadow: 0 0 8px rgba(197, 160, 89, 0.3); }

  /* Moldura Cósmica Sutil */
  .cosmic-border {
    border: 1px solid rgba(197, 160, 89, 0.25);
  }
  
  /* Moldura Cósmica com Azul */
  .cosmic-border-blue {
    border: 1px solid rgba(37, 99, 235, 0.2);
    border-top-color: rgba(37, 99, 235, 0.4);
  }
  
  /* Chat Panel - sem sombra exagerada */
  .chat-panel {
    border: 1px solid rgba(197, 160, 89, 0.15);
    overflow: hidden;
  }
  
  .section-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: #c5a059;
    border-bottom: 1px solid rgba(197, 160, 89, 0.3);
    padding-bottom: 8px;
    margin-bottom: 15px;
  }
  
  .pill-cosmic {
    font-family: 'Montserrat', sans-serif;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #c5a059;
    border: 1px solid #c5a059;
    padding: 4px 12px;
    border-radius: 2px;
  }
`;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('aurea_active_id'));
  const [currentPage, setCurrentPage] = useState('astrologia');
  const [isStrangeOpen, setIsStrangeOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(localStorage.getItem('aurea_active_id'));
  const [strangeMsgs, setStrangeMsgs] = useState<any[]>([]);
  const [strangeInput, setStrangeInput] = useState('');
  const [loadingStrange, setLoadingStrange] = useState(false);

  const { profiles, tasks, updateProfile, addProfile: addRootProfile, getMetrics, getPlanetRegency, getAlfredInsights } = useAgendaTasks();
  const { stats: financeStats, goals } = useFinancas();
  const masterProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  const { liveData, getPlanetaryHour, transits } = useAstrologyData(masterProfile?.natal);
  const [currentTime, setCurrentTime] = useState(getPlanetaryHour());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getPlanetaryHour()), 60000);
    return () => clearInterval(timer);
  }, [getPlanetaryHour]);

  const hasChat = !['mesa-criacao', 'memorias', 'diario'].includes(currentPage);
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
      const planetaryHour = getPlanetaryHour();
      const regency = getPlanetRegency(new Date());
      const metrics = getMetrics();
      const insights = getAlfredInsights();
      const pendingTasks = tasks.filter((t: any) => !t.completed && !t.is_completed);
      const completedTasks = tasks.filter((t: any) => t.completed || t.is_completed);
      
      const planets = liveData?.planets || {};
      const aspects = liveData?.aspects || [];
      const retrogradePlanets = Object.entries(planets)
        .filter(([_, v]: any) => v?.retrograde)
        .map(([k]) => k);
      
      const planetPositions = Object.entries(planets)
        .map(([k, v]: any) => `${k}: ${v?.pos_in_sign?.toFixed(1) || 0}° ${v?.sign || '?'}`)
        .join(', ');
      
      const skyAspects = aspects.slice(0, 5).map((a: any) => `${a.p1} ${a.symbol} ${a.p2}`).join(', ') || 'Nenhum';
      const transitSummary = transits.slice(0, 5).map((t: any) => `${t.p} ${t.icon} ${t.n}`).join(', ') || 'Nenhum';

      const systemContext = `
═══════════════════════════════════════════════════
VISÃO MACRO DR. STRANGE — AUREA SOLARIS
═══════════════════════════════════════════════════

--- TEMPORAL ---
Data: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
Hora Planetária: ${planetaryHour.icon} ${planetaryHour.name} (${planetaryHour.time})
Regente do Dia: ${regency.icon} ${regency.name}
Página Ativa: ${currentPage}

--- PERFIL ---
Nome: ${masterProfile?.name || 'Não configurado'}

--- ASTROLOGIA (RESUMO) ---
Planetas: ${planetPositions}
Aspectos no céu: ${skyAspects}
Trânsitos pessoais: ${transitSummary}
Retrogradações: ${retrogradePlanets.length > 0 ? retrogradePlanets.join(', ') : 'Nenhuma'}

--- TAREFAS ---
Pendentes: ${pendingTasks.length} | Completas: ${completedTasks.length} | Progresso: ${metrics.done}%
${pendingTasks.slice(0, 3).map((t: any) => `- ${t.content || t.title}`).join('\n') || '- Nenhuma pendente'}

--- FINANÇAS ---
Saldo: R$ ${financeStats.balance.toLocaleString('pt-BR')}
Entradas: R$ ${financeStats.incomes.toLocaleString('pt-BR')} | Saídas: R$ ${financeStats.expenses.toLocaleString('pt-BR')}
Metas ativas: ${goals.length}

--- INSIGHTS DO ALFRED ---
${insights.map(i => `- [${i.type}] ${i.content}`).join('\n') || '- Nenhum insight gerado'}

--- STATUS ---
Sistema: Estável | Agentes: 5 ativos | Memória: Persistente
`;

      const aiMode = localStorage.getItem('ai_master_switch') || 'ollama';
      let res: string | null = null;
      
      if (aiMode === 'ollama') {
        res = await safeInvoke<string>('ollama_chat', {
          messages: [
            { role: 'system', content: `Você é Dr. Strange, o mestre supremo do sistema Aurea Solaris. Você tem visão MACRO de TUDO: astrologia, tarefas, finanças, saúde, horários planetários. Conecte padrões entre os dados e dê visão estratégica. Seja sábio, conciso, místico e proativa. Quando apropriado, sugira ações concretas (criar tarefa, verificar finanças, etc.).\n\n${systemContext}` },
            ...ut.slice(-6)
          ]
        });
      } else {
        res = await safeInvoke<string>('openrouter_chat', {
          model: 'google/gemini-2.0-pro-exp-02-05',
          messages: [
            { role: 'system', content: `Você é Dr. Strange, o mestre supremo do sistema Aurea Solaris. Você tem visão MACRO de TUDO: astrologia, tarefas, finanças, saúde, horários planetários. Conecte padrões entre os dados e dê visão estratégica. Seja sábio, conciso, místico e proativa. Quando apropriado, sugira ações concretas (criar tarefa, verificar finanças, etc.).\n\n${systemContext}` },
            ...ut.slice(-6)
          ]
        });
      }
      
      if (res) {
        const f = [...ut, { role: 'assistant', content: res }];
        setStrangeMsgs(f);
        await safeInvoke('save_history', { agent: 'Strange', history: f, chat_id: null });
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
      case 'mesa-criacao': return <MesaCriacao />;
      case 'memorias': return <MemoriasView />;
      case 'hub': return <AlfredHubView />;
      case 'diario': return <DiarioView />;
      default: return <AstrologiaPage />;
    }
  };



  if (!isAuthenticated) {
    return (
      <LoginView 
        profiles={profiles} 
        onLogin={(id) => {
          setActiveProfileId(id);
          localStorage.setItem('aurea_active_id', id);
          setIsAuthenticated(true);
        }}
        onSignUp={(name) => {
          addRootProfile(name);
        }}
      />
    );
  }

  return (
    <AgendaProvider>
    <div className="layout-grid font-sans overflow-hidden" style={{ gridTemplateColumns: `${isSidebarCollapsed ? '80px' : '260px'} 1fr ${hasChat ? (isChatCollapsed ? '0px' : '360px') : '0px'}` }}>
      <style>{globalStyles}</style>
      
      {/* ... rest of the code ... */}

      {/* SIDEBAR - Borda Cósmica */}
      <aside className="bg-white rounded-[1.5rem] border border-[#c5a059]/20 shadow-xl shrink-0 z-30 flex flex-col relative overflow-hidden transition-all duration-300 cosmic-border">
        <div className="flex items-center gap-4 p-8 pb-4 shrink-0">
          <div className="cursor-pointer hover:rotate-12 transition-all shrink-0" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <PanelLeftOpen size={24} className="text-gold"/> : <PanelLeftClose size={24} className="text-gold"/>}
          </div>
          {/* SVG sempre visível — texto condicional */}
          <svg width="28" height="28" viewBox="0 0 130 130" fill="none">
            <circle cx="65" cy="65" r="18" stroke="#c5a059" strokeWidth="1.5"/>
            <circle cx="65" cy="65" r="24" stroke="#c5a059" strokeWidth="0.8" strokeDasharray="3 4" opacity="0.5"/>
            <circle cx="65" cy="65" r="6" fill="#c5a059" opacity="0.25"/>
            <circle cx="65" cy="65" r="3" fill="#c5a059"/>
            <line x1="65" y1="6" x2="65" y2="20" stroke="#c5a059" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="65" y1="110" x2="65" y2="124" stroke="#c5a059" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="6" y1="65" x2="20" y2="65" stroke="#c5a059" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="110" y1="65" x2="124" y2="65" stroke="#c5a059" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="22" y1="22" x2="32" y2="32" stroke="#c5a059" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
            <line x1="98" y1="98" x2="108" y2="108" stroke="#c5a059" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
            <line x1="108" y1="22" x2="98" y2="32" stroke="#c5a059" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
            <line x1="22" y1="108" x2="32" y2="98" stroke="#c5a059" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
          </svg>
          {!isSidebarCollapsed && <h1 className="text-[11px] font-black tracking-[0.2em] text-[#c5a059] uppercase">Aurea Solaris</h1>}
        </div>
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto no-scrollbar pb-6 pt-4">
          <NavItem icon={<Edit3 size={18} />} label="Mesa de Criação" active={currentPage === 'mesa-criacao'} onClick={() => setCurrentPage('mesa-criacao')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Star size={18} />} label="Astrologia" active={currentPage === 'astrologia'} onClick={() => setCurrentPage('astrologia')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Activity size={18} />} label="Saúde & Vitalidade" active={currentPage === 'saude'} onClick={() => setCurrentPage('saude')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Calendar size={18} />} label="Agenda Preditiva" active={currentPage === 'agenda'} onClick={() => setCurrentPage('agenda')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<PieChart size={18} />} label="Gestão de Ouro" active={currentPage === 'financas'} onClick={() => setCurrentPage('financas')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Settings size={18} />} label="Painel de Controle" active={currentPage === 'controle'} onClick={() => setCurrentPage('controle')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Package size={18} />} label="Alfred Hub" active={currentPage === 'hub'} onClick={() => setCurrentPage('hub')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Edit3 size={18} />} label="Diário" active={currentPage === 'diario'} onClick={() => setCurrentPage('diario')} collapsed={isSidebarCollapsed} />
        </nav>
        <div className="p-4 pt-2 border-t border-gray-100 shrink-0">
          <button onClick={() => setIsProfileOpen(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#FCF9F1] hover:bg-white border border-transparent transition-all group shadow-sm">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-white text-[#c5a059] flex items-center justify-center shrink-0"><User size={16} /></div>
            {!isSidebarCollapsed && <div className="text-left overflow-hidden"><p className="text-[11px] font-bold uppercase truncate text-gray-800 leading-none">{masterProfile?.name || 'Viviane'}</p></div>}
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="main-area cosmic-border">
        {!isMesa && (
          <>
          {/* Símbolos cósmicos decorativos */}
          <div className="text-center text-[9px] tracking-[10px] text-gold/15 py-1 select-none">☉ ✦ ☽ ✧ ★</div>
          
          <header className="px-6 py-3 flex justify-between items-center glass-panel shrink-0 border-b border-gold/10 z-20">
            <h2 className="text-sm font-black tracking-[0.25em] uppercase text-gray-800 truncate mr-3">{currentPage === 'hub' ? 'Alfred Central Hub' : currentPage.replace('-', ' ')}</h2>
              <div className="flex items-center gap-2 flex-nowrap">
              {/* Moon Phase Pill - Estilo Rafiki */}
              <div className="flex items-center gap-1.5 bg-[#FCF9F1] border border-gold/20 px-2 py-1 rounded-sm">
                <span className="text-gold text-[10px]">{liveData?.moon_phase?.icon || '☽'}</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-[#c5a059]">{liveData?.moon_phase?.phase || '...'}</span>
                {liveData?.planets?.Moon?.sign && (
                  <span className="text-[7px] text-gray-400 border-l border-gold/15 pl-1.5">{liveData.planets.Moon.sign}</span>
                )}
              </div>

              {/* Date & Regent Pill */}
              <div className="flex items-center gap-2 bg-white border border-gray-100 px-2 py-1 rounded-sm">
                <div className="flex items-center gap-1 border-r border-gray-100 pr-2">
                  <Clock size={10} className="text-gray-400"/>
                  <span className="text-[8px] font-bold uppercase tracking-tighter text-gray-500 whitespace-nowrap">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1" title="Regente do Dia">
                  <span className="text-gold text-[10px]">{getPlanetRegency(new Date()).icon}</span>
                  <span className="text-[7px] font-bold uppercase text-gray-400 tracking-wider">{getPlanetRegency(new Date()).name}</span>
                </div>
              </div>

              {/* Planetary Hour Pill - Estilo Rafiki */}
              <div className="flex items-center gap-1.5 bg-[#171c31] text-gold px-2 py-1 rounded-sm border border-gold/30">
                <span className="text-[10px] opacity-80">{currentTime.icon}</span>
                <span className="text-[7px] font-bold uppercase tracking-wider text-gold/80">{currentTime.name}</span>
                <span className="w-0.5 h-0.5 bg-gold/40 rounded-full" />
                <span className="text-[9px] font-bold text-white">{currentTime.time}</span>
              </div>

              {/* Chat Toggle Button */}
              {hasChat && (
                <button 
                  onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                  className="bg-white border border-gray-100 p-1.5 rounded-sm hover:bg-gray-50 text-[#c5a059] transition-colors shadow-sm ml-2"
                  title="Recolher / Expandir Agente IA"
                >
                  {isChatCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
                </button>
              )}
            </div>
          </header>
          </>
        )}
        <div className={`flex-1 relative ${isMesa ? '' : 'px-6 pt-8 overflow-y-auto no-scrollbar pb-32'}`}>
          {renderPage()}
        </div>
      </main>

      {/* CHAT DIREITO */}
      <aside className={`h-full shrink-0 z-10 transition-all duration-500 overflow-hidden ${hasChat && !isChatCollapsed ? 'w-[360px] opacity-100' : 'w-0 opacity-0'}`}>
          {currentPage === 'astrologia' && <AgentChat agent="Rafiki" />}
          {currentPage === 'saude' && <AgentChat agent="Alfred" />}
          {currentPage === 'agenda' && <AgentChat agent="Alfred" />}
          {currentPage === 'financas' && <AgentChat agent="Uncle Duck" />}
          {currentPage === 'hub' && <AgentChat agent="Alfred" />}
          {currentPage === 'controle' && <AgentChat agent="Stark" />}
      </aside>

      {/* STRANGE FAB */}
      {isStrangeOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsStrangeOpen(false)} />
      )}
      <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-6 pointer-events-none">
        {isStrangeOpen && (
          <div className="w-[380px] max-h-[560px] bg-white rounded-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 pointer-events-auto chat-panel" onClick={e => e.stopPropagation()}>
            {/* Símbolos cósmicos */}
            <div className="text-center text-[9px] tracking-[6px] text-gold/30 py-1 select-none bg-[#FCF9F1] shrink-0">✦ ✧ ✦ ✧ ✦</div>
            
            <div className="px-4 py-3 bg-[#FCF9F1] border-b border-gold/10 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white rounded-lg text-[#c5a059] border border-gold/20"><Eye size={18}/></div>
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-gray-800 leading-tight">Dr. Strange</p><p className="text-[7px] font-bold text-[#c5a059] uppercase tracking-wider leading-none">Supervisor Macro</p></div>
               </div>
               <X onClick={() => setIsStrangeOpen(false)} className="cursor-pointer text-gray-400 hover:text-red-400 p-1.5 rounded-lg transition-all"/>
            </div>
            <div className="flex-1 p-3 space-y-3 overflow-y-auto no-scrollbar bg-white">
               {strangeMsgs.map((m, i) => (
                   <div key={i} className={`p-3 rounded-lg text-[11px] text-gray-600 font-medium leading-relaxed ${m.role === 'user' ? 'bg-gold/10 ml-auto' : 'bg-[#FCF9F1] mr-auto'}`}>
                     {m.content}
                   </div>
                ))}
               {loadingStrange && <div className="text-[10px] opacity-50 animate-pulse text-center text-gold/60">Consultando linhas temporais...</div>}
            </div>
            <div className="p-3 bg-[#FCF9F1] border-t border-gold/10 shrink-0">
               <div className="flex gap-2 bg-white p-1.5 rounded-lg border border-gold/10">
                  <input className="flex-1 bg-transparent text-[#333333] font-medium text-[11px] px-3 outline-none" placeholder="Consultar o Olho..." value={strangeInput} onChange={e => setStrangeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleStrange()} />
                   <button onClick={handleStrange} className="p-1.5 bg-[#171c31] text-gold rounded-md hover:bg-gold hover:text-white transition-all"><Sparkles size={13}/></button>
               </div>
            </div>
          </div>
        )}
        <button onClick={() => setIsStrangeOpen(!isStrangeOpen)} className="pointer-events-auto w-20 h-20 rounded-full shadow-2xl bg-white border-4 border-[#c5a059]/30 flex items-center justify-center hover:scale-110 transition-all"><Eye size={40} className="text-[#c5a059]"/></button>
      </div>

      {isProfileOpen && (
        <ProfileEditor
          profile={masterProfile}
          onSave={(updates) => {
            updateProfile(masterProfile.id, updates);
            setIsProfileOpen(false);
          }}
          onClose={() => setIsProfileOpen(false)}
          onLogout={() => {
            localStorage.removeItem('aurea_active_id');
            setIsAuthenticated(false);
            setIsProfileOpen(false);
          }}
        />
      )}
    </div>
    </AgendaProvider>
  );
}
