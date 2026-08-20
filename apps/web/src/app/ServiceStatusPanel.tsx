export function ServiceStatusPanel({
  title = 'Serviço indisponível',
  message,
  onRetry,
  onLogout,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  onLogout?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center font-sans" style={{ background: 'var(--aurea-bg)' }} role="alert">
      <div className="max-w-md p-10 text-center space-y-5">
        <h1 className="text-lg font-black uppercase tracking-[0.2em]" style={{ color: 'var(--aurea-text)' }}>{title}</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--aurea-text-muted)' }}>{message}</p>
        <div className="flex justify-center gap-3">
          {onRetry && (
            <button type="button" onClick={onRetry} className="aurea-button-primary px-8 py-3 font-black uppercase text-[10px] tracking-[0.2em]">
              Tentar novamente
            </button>
          )}
          {onLogout && (
            <button type="button" onClick={onLogout} className="px-8 py-3 font-black uppercase text-[10px] tracking-[0.2em]" style={{ color: 'var(--aurea-text-muted)', border: '1px solid var(--aurea-line)' }}>
              Sair
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function OnboardingStatusPanel({
  title,
  message,
  onLogout,
}: {
  title: string;
  message: string;
  onLogout: () => void;
}) {
  return <ServiceStatusPanel title={title} message={message} onLogout={onLogout} />;
}
