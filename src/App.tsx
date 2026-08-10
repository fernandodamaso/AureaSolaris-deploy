import { useState, useEffect } from 'react';
import { Edit3, Star, Activity, Calendar, User, PanelLeftOpen, PanelLeftClose, MessageCircle } from 'lucide-react';
import "./styles.css";

// Contexts
import { useGlobalContext } from './context/GlobalContext.tsx';

// Components
import { NavItem } from './components/common/UIComponents';
import { AgendaView } from './components/agenda/AgendaView';
import { AstrologiaPage } from './components/AstrologiaBoard';
import { SaudeView } from './components/SaudeView';

import { MesaCriacao } from './components/MesaCriacao';
import type { CadernoIntent } from './components/MesaCriacao';
import { MemoriasView } from './components/MemoriasView';
import { LoginView } from './components/LoginView';
import { DiarioView } from './components/DiarioView';
import { ProfileEditor } from './components/ProfileEditor';
import { HermesChat } from './components/HermesChat';
import { safeInvoke } from './utils/tauri';

// --- ESTILOS GLOBAIS ---
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800&family=Raleway:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
  .font-sans { font-family: 'Inter', sans-serif; }
  .font-display { font-family: 'Montserrat', sans-serif; }
  .font-heading { font-family: 'Poppins', sans-serif; }
  .font-label { font-family: 'Raleway', sans-serif; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .glass-panel { background: rgba(252, 249, 241, 0.95); backdrop-filter: blur(16px); }
  .paper-bg { background-color: var(--color-paper); }
  .panel-light { background-color: #ffffff; border: 1px solid rgba(197, 160, 89, 0.08); border-radius: 12px; }
  .text-gold { color: var(--color-gold); }
  .bg-gold { background-color: var(--color-gold); }
  
  .layout-grid { display: grid; height: 100vh; width: 100vw; overflow: hidden; background: #0e1120; gap: 16px; padding: 16px; transition: grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
  .main-area { border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; background: var(--color-paper); position: relative; }

  .cosmic-border {
    border: 1px solid rgba(197, 160, 89, 0.25);
  }
   
  .chat-panel {
    border: 1px solid rgba(197, 160, 89, 0.15);
    overflow: hidden;
  }
   
  .section-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: var(--color-gold);
    border-bottom: 1px solid rgba(197, 160, 89, 0.3);
    padding-bottom: 8px;
    margin-bottom: 15px;
  }
  .hook-dot {
    width: 10px; height: 10px; border-radius: 50%; background: var(--color-gold);
    cursor: crosshair; z-index: 20;
  }
  .hook-dot:hover { transform: scale(1.6); background: #B8860B; }
  .canvas-node { transition: box-shadow 0.2s, border-color 0.2s; }
`;

const PlanetaryInfo = () => {
  const { astro } = useGlobalContext();
  return (
    <div className="flex items-center gap-2 flex-nowrap">
      {/* Moon Phase */}
      <div title={astro.error || 'Valor astronômico recebido do motor'} className="flex items-center gap-1.5 bg-mystic-bg border border-gold/20 px-2 py-1 rounded-sm">
        <span className="text-gold text-[10px]">{astro.liveData?.moon_phase?.icon || '—'}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gold">{astro.loading ? 'calculando' : astro.liveData?.moon_phase?.phase || 'indisponível'}</span>
      </div>

      {/* Regent Pill */}
      <div title="Regra tradicional baseada no dia da semana; não é um valor astronômico calculado." className="flex items-center gap-2 bg-white border border-gray-100 px-2 py-1 rounded-sm">
        <span className="text-gold text-[10px]">{astro.dayRegent.icon}</span>
        <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Regra do dia: {astro.dayRegent.name}</span>
      </div>

      {/* Planetary Hour */}
      <div title={astro.error || 'Valor astronômico recebido do motor'} className="flex items-center gap-1.5 bg-[#171c31] text-gold px-2 py-1 rounded-sm border border-gold/30">
        <span className="text-[10px] opacity-80">{astro.planetaryHour.icon}</span>
        <span className="text-[10px] font-bold text-white">{astro.loading ? '...' : astro.planetaryHour.time}</span>
      </div>
    </div>
  );
};

export default function App() {
  // Identificador de perfil não é sessão autenticada. Sempre exigir a senha ao abrir.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringAccess, setIsRestoringAccess] = useState(true);
  const [currentPage, setCurrentPage] = useState('astrologia');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [cadernoIntent, setCadernoIntent] = useState<CadernoIntent | null>(null);
      
  const { agenda } = useGlobalContext();
  const masterProfile = agenda.activeProfile;

  const isMesa = currentPage === 'mesa-criacao';

  const openCaderno = (intent: CadernoIntent) => {
    setCadernoIntent(intent);
    setCurrentPage('mesa-criacao');
  };

  useEffect(() => {
    let active = true;
    const restoreRememberedAccess = async () => {
      const rememberedOwner = await safeInvoke<string | null>('remembered_owner_get');
      if (!active || !rememberedOwner) {
        if (active) setIsRestoringAccess(false);
        return;
      }

      const profile = agenda.profiles.find(candidate => candidate.id === rememberedOwner);
      if (!profile) {
        await safeInvoke('remembered_owner_clear');
        if (active) setIsRestoringAccess(false);
        return;
      }

      const openedOwner = await safeInvoke<string>('private_session_open', { ownerId: rememberedOwner });
      if (!active) return;
      if (openedOwner === rememberedOwner) {
        agenda.setActiveProfileId(rememberedOwner);
        localStorage.setItem('aurea_active_id', rememberedOwner);
        setIsAuthenticated(true);
      } else {
        await safeInvoke('remembered_owner_clear');
      }
      if (active) setIsRestoringAccess(false);
    };
    void restoreRememberedAccess();
    return () => { active = false; };
  }, [agenda]);

  const handleLogout = async () => {
    await safeInvoke('private_session_close');
    await safeInvoke('remembered_owner_clear');
    localStorage.removeItem('aurea_active_id');
    agenda.setActiveProfileId('');
    setIsAuthenticated(false);
    setIsProfileOpen(false);
  };

  useEffect(() => {
    const handleOpen = () => setIsChatOpen(true);
    const handleOpenCaderno = (event: Event) => {
      const intent = (event as CustomEvent<CadernoIntent>).detail;
      if (!intent || !['browse', 'create-study', 'open-study'].includes(intent.type)) return;
      setCadernoIntent(intent);
      setCurrentPage('mesa-criacao');
    };
    window.addEventListener('open-hermes-chat', handleOpen);
    window.addEventListener('open-caderno-vivo', handleOpenCaderno);
    return () => {
      window.removeEventListener('open-hermes-chat', handleOpen);
      window.removeEventListener('open-caderno-vivo', handleOpenCaderno);
    };
  }, []);

  

  

  const renderPage = () => {
    switch (currentPage) {
      case 'astrologia': return <AstrologiaPage onOpenCaderno={openCaderno} />;
      case 'saude': return <SaudeView />;
      case 'agenda': return <AgendaView />;

      
      case 'mesa-criacao': return <MesaCriacao ownerId={masterProfile?.id} intent={cadernoIntent} onIntentHandled={() => setCadernoIntent(null)} />;
      case 'memorias': return <MemoriasView />;
      
      case 'diario': return (
        <DiarioView
          onOpenStudy={(boardId, nodeId) => openCaderno({ type: 'open-study', boardId, nodeId })}
        />
      );
      default: return <AstrologiaPage onOpenCaderno={openCaderno} />;
    }
  };

  if (isRestoringAccess) {
    return <div className="fixed inset-0 bg-[#FCF9F1]" aria-label="Restaurando acesso" />;
  }

  if (!isAuthenticated) {
    return (
      <LoginView 
        profiles={agenda.profiles} 
        onLogin={async (id, password, rememberAccess) => {
          const result = await agenda.authenticateProfile(id, password);
          if (!result.ok) return result;
          const openedOwner = await safeInvoke<string>('private_session_open', { ownerId: id });
          if (openedOwner !== id) return { ok: false, error: 'Nao foi possivel abrir sua sessao privada neste computador.' };
          agenda.setActiveProfileId(id);
          localStorage.setItem('aurea_active_id', id);
          let notice: string | undefined;
          if (rememberAccess) {
            const remembered = await safeInvoke('remembered_owner_set', { ownerId: id });
            if (remembered === null) notice = 'O acesso foi aberto, mas nao pode ser mantido neste Windows.';
          } else {
            await safeInvoke('remembered_owner_clear');
          }
          setIsAuthenticated(true);
          return { ok: true, notice };
        }}
        onSignUp={async (name, password, rememberAccess) => {
          try {
            const profile = await agenda.addProfile(name, password);
            const openedOwner = await safeInvoke<string>('private_session_open', { ownerId: profile.id });
            if (openedOwner !== profile.id) return { ok: false, error: 'Seu perfil foi criado, mas a sessao privada nao pode ser aberta. Tente entrar novamente.' };
            let notice: string | undefined;
            if (rememberAccess) {
              const remembered = await safeInvoke('remembered_owner_set', { ownerId: profile.id });
              if (remembered === null) notice = 'Perfil criado, mas o acesso nao pode ser mantido neste Windows.';
            }
            setIsAuthenticated(true);
            return { ok: true, notice };
          } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível criar o perfil.' };
          }
        }}
      />
    );
  }

  return (
    <div className="layout-grid font-sans overflow-hidden" 
      style={{ gridTemplateColumns: `${isSidebarCollapsed ? "80px" : "260px"} 1fr` }}>
      <style>{globalStyles}</style>
      
      {/* SIDEBAR */}
      <aside className="bg-white rounded-[1.5rem] border border-(--color-gold)/20 shadow-xl shrink-0 z-30 flex flex-col relative overflow-hidden transition-all duration-300 cosmic-border">
        <div className="flex items-center gap-4 p-8 pb-4 shrink-0">
          <button type="button" aria-label={isSidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'} aria-expanded={!isSidebarCollapsed} className="p-1 hover:rotate-12 focus-visible:outline-2 focus-visible:outline-gold rounded transition-all shrink-0" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <PanelLeftOpen size={24} className="text-gold"/> : <PanelLeftClose size={24} className="text-gold"/>}
          </button>
          <svg width="28" height="28" viewBox="0 0 130 130" fill="none">
            <circle cx="65" cy="65" r="18" stroke="var(--color-gold)" strokeWidth="1.5"/>
            <circle cx="65" cy="65" r="3" fill="var(--color-gold)"/>
            <line x1="65" y1="6" x2="65" y2="20" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="65" y1="110" x2="65" y2="124" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="6" y1="65" x2="20" y2="65" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="110" y1="65" x2="124" y2="65" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {!isSidebarCollapsed && <h1 className="text-[12px] font-black tracking-[0.2em] text-[var(--color-gold)] uppercase">Aurea Solaris</h1>}
        </div>
        
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto no-scrollbar pb-6 pt-4">
          <NavItem icon={<Edit3 size={18} />} label="Caderno Vivo" active={currentPage === 'mesa-criacao'} onClick={() => { setCadernoIntent(null); setCurrentPage('mesa-criacao'); }} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Star size={18} />} label="Astrologia" active={currentPage === 'astrologia'} onClick={() => setCurrentPage('astrologia')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Activity size={18} />} label="Saúde & Vitalidade" active={currentPage === 'saude'} onClick={() => setCurrentPage('saude')} collapsed={isSidebarCollapsed} />
          <NavItem icon={<Calendar size={18} />} label="Agenda Preditiva" active={currentPage === 'agenda'} onClick={() => setCurrentPage('agenda')} collapsed={isSidebarCollapsed} />

          <NavItem icon={<Edit3 size={18} />} label="Histórico & Notas" active={currentPage === 'diario'} onClick={() => setCurrentPage('diario')} collapsed={isSidebarCollapsed} />
        </nav>

        <div className="p-4 pt-2 border-t border-gray-100 shrink-0">
          <button onClick={() => setIsProfileOpen(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-mystic-bg hover:bg-white border border-transparent transition-all group shadow-sm">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-white text-[var(--color-gold)] flex items-center justify-center shrink-0"><User size={16} /></div>
            {!isSidebarCollapsed && <div className="text-left overflow-hidden"><p className="text-[12px] font-bold uppercase truncate text-gray-800 leading-none">{masterProfile?.name || 'Perfil indisponível'}</p></div>}
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="main-area cosmic-border">
        {!isMesa && currentPage !== 'astrologia' && (
          <header className="px-6 py-3 flex justify-between items-center glass-panel shrink-0 border-b border-gold/10 z-20">
            <h2 className="text-sm font-black tracking-[0.25em] uppercase text-gray-800 truncate mr-3">{currentPage.replace('-', ' ')}</h2>
            <PlanetaryInfo />
          </header>
        )}
        <div className={`flex-1 relative overflow-hidden ${isMesa ? '' : currentPage === 'astrologia' ? 'flex flex-col px-6 pt-6' : 'px-6 pt-8 overflow-y-auto no-scrollbar pb-32'}`}>
          {currentPage === 'astrologia' ? (
            <div className="flex-1 h-full flex flex-col overflow-hidden">
              {renderPage()}
            </div>
          ) : (
            renderPage()
          )}
        </div>
      </main>

      {/* HERMES CHAT PANEL */}
      <HermesChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      {/* CHAT FAB BUTTON */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold/30 bg-[#171c31] text-gold shadow-xl transition-all hover:scale-110"
          aria-label="Abrir conversa com Hermes"
          title="Perguntar ao Hermes"
        >
          <MessageCircle size={21} />
        </button>
      )}

      {isProfileOpen && masterProfile && (
        <ProfileEditor
          profile={masterProfile}
          onSave={(updates) => {
            agenda.updateProfile(masterProfile.id, updates);
            setIsProfileOpen(false);
          }}
          onClose={() => setIsProfileOpen(false)}
          onLogout={() => { void handleLogout(); }}
        />
      )}
    </div>
  );
}
