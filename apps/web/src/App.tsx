import { lazy, Suspense, useState } from 'react';
import { User, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import "./styles.css";

import { useIdentity } from './features/identity/IdentityContext';
import { PageLoadingFallback } from './components/common/PageLoadingFallback';
import { LoginView } from './components/LoginView';
import { ProfileEditor } from './components/ProfileEditor';
import { AppErrorBoundary } from './app/AppErrorBoundary';
import { ServiceStatusPanel } from './app/ServiceStatusPanel';
import { useAppBootstrap } from './app/useAppBootstrap';
import { ProfileOnboarding } from './profile/ProfileOnboarding';
import { V1Navigation, resolveV1Page, type V1Page } from './app/V1Navigation';

const AstrologiaPage = lazy(() => import('./components/AstrologiaBoard').then(m => ({ default: m.AstrologiaPage })));

// --- ESTILOS GLOBAIS ---
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
  .font-sans { font-family: var(--font-body); }
  .font-display { font-family: var(--font-display); }

  .layout-grid { display: grid; height: 100vh; width: 100vw; overflow: hidden; background: var(--aurea-navy); gap: 16px; padding: 16px; transition: grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
  .main-area { border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; background-color: var(--aurea-bg); background-image: radial-gradient(circle at 92% 88%, transparent 0 96px, rgba(217,166,83,.10) 97px 98px, transparent 99px 145px, rgba(217,166,83,.06) 146px 147px, transparent 148px), radial-gradient(circle at 92% 88%, rgba(217,166,83,.10) 0 2px, transparent 3px); position: relative; }

  .text-gold { color: var(--aurea-gold); }
  .bg-gold { background-color: var(--aurea-gold); }

  .section-title {
    font-family: var(--font-display);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: var(--aurea-gold);
    border-bottom: 1px solid var(--aurea-line);
    padding-bottom: 8px;
    margin-bottom: 15px;
  }
`;

function AppContent() {
  const { state: bootstrapState, retry: retryBootstrap, signOut } = useAppBootstrap();
  const [currentPage, setCurrentPage] = useState<V1Page>('astrologia');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const identity = useIdentity();
  const masterProfile = identity.activeProfile ?? (
    bootstrapState.status === 'ready'
      ? { id: bootstrapState.profile.id, name: bootstrapState.profile.display_name, active: true }
      : null
  );

  const handleLogout = async () => {
    await signOut();
    identity.setActiveProfileId('');
    setIsProfileOpen(false);
  };

  const pageContent = (
    <Suspense fallback={<PageLoadingFallback />}>
      <AstrologiaPage />
    </Suspense>
  );

  if (bootstrapState.status === 'restoring-session') {
    return <div className="fixed inset-0 bg-[#FCF9F1]" aria-label="Restaurando acesso" />;
  }

  if (bootstrapState.status === 'signed-out') {
    return <LoginView />;
  }

  if (bootstrapState.status === 'loading-account') {
    return (
      <div className="fixed inset-0 bg-[#FCF9F1]" aria-label="Carregando sua conta" role="status" />
    );
  }

  if (bootstrapState.status === 'needs-profile') {
    return <ProfileOnboarding mode="profile" onComplete={retryBootstrap} onLogout={() => { void handleLogout(); }} />;
  }

  if (bootstrapState.status === 'needs-birth-profile') {
    return <ProfileOnboarding mode="birth-profile" profile={bootstrapState.profile} onComplete={retryBootstrap} onLogout={() => { void handleLogout(); }} />;
  }

  if (bootstrapState.status === 'service-unavailable') {
    return <ServiceStatusPanel message={bootstrapState.message} onRetry={retryBootstrap} onLogout={() => { void handleLogout(); }} />;
  }

  return (
    <div className="layout-grid font-sans overflow-hidden" 
      style={{ gridTemplateColumns: `${isSidebarCollapsed ? "80px" : "260px"} 1fr` }}>
      <style>{globalStyles}</style>
      
      {/* SIDEBAR */}
      <aside className="rounded-[1.5rem] border border-white/10 shadow-xl shrink-0 z-30 flex flex-col relative overflow-hidden transition-all duration-300 cosmic-border" style={{ background: 'var(--aurea-navy)', color: 'var(--aurea-text-on-dark)' }}>
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
        
        <V1Navigation currentPage={currentPage} onNavigate={(page) => setCurrentPage(resolveV1Page(page))} collapsed={isSidebarCollapsed} />

        <div className="p-4 pt-2 border-t border-white/10 shrink-0">
          <button onClick={() => setIsProfileOpen(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 transition-all group shadow-sm" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="w-10 h-10 rounded-full border-2 shadow-md flex items-center justify-center shrink-0" style={{ borderColor: 'var(--aurea-gold)', background: 'var(--aurea-navy-2)', color: 'var(--aurea-gold-light)' }}><User size={16} /></div>
            {!isSidebarCollapsed && <div className="text-left overflow-hidden"><p className="text-[12px] font-bold uppercase truncate text-[var(--aurea-text-on-dark)] leading-none">{masterProfile?.name || 'Perfil indisponível'}</p></div>}
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="main-area cosmic-border">
        <div className="flex-1 relative overflow-hidden flex flex-col px-6 pt-6">
          <div className="flex-1 h-full flex flex-col overflow-hidden">
            {pageContent}
          </div>
        </div>
      </main>

      {isProfileOpen && masterProfile && (
        <ProfileEditor
          profile={masterProfile}
          apiProfile={bootstrapState.status === 'ready' ? bootstrapState.profile : undefined}
          apiBirthProfile={bootstrapState.status === 'ready' ? bootstrapState.birthProfile : undefined}
          showLogout
          onSave={(updates) => {
            identity.updateProfile(masterProfile.id, updates);
            setIsProfileOpen(false);
          }}
          onClose={() => setIsProfileOpen(false)}
          onLogout={() => { void handleLogout(); }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
