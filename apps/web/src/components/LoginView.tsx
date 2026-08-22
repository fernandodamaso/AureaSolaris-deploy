import { useState, type FormEvent } from 'react';
import { ArrowRight, Lock, Star } from 'lucide-react';
import aureaSymbol from '../assets/brand/logo/aurea-symbol.svg';
import { useAuth } from '../auth/useAuth';
import { GENERIC_LOGIN_ERROR } from '../utils/auth';
import type { PrivateProfile } from '../types/private-profile';

type LegacyProfile = PrivateProfile & { passwordVerifier?: unknown };

/**
 * Legacy props remain accepted while the authenticated boot state moves to
 * Supabase in FDM-720. They are intentionally not rendered or called here.
 */
interface LoginViewProps {
  profiles?: LegacyProfile[];
  onLogin?: (profileId: string, password: string, rememberAccess: boolean) => Promise<{ ok: boolean; error?: string; notice?: string }>;
  onSignUp?: (name: string, password: string, rememberAccess: boolean) => Promise<{ ok: boolean; error?: string; notice?: string }>;
}

export const LoginView = (_legacyProps?: LoginViewProps) => {
  void _legacyProps;
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);
    try {
      const result = await signIn(email.trim(), password);
      if (!result.ok) {
        setPassword('');
        setError(GENERIC_LOGIN_ERROR);
        return;
      }
      setPassword('');
    } catch {
      setPassword('');
      setError(GENERIC_LOGIN_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden font-sans" style={{ background: 'var(--aurea-bg)' }}>
      <div className="absolute inset-0 overflow-hidden opacity-40" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'var(--aurea-gold-deep)', opacity: 0.25 }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'var(--aurea-gold-deep)', opacity: 0.25 }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle_at_center, transparent 0%, var(--aurea-bg) 100%)' }} />
      </div>

      <main className="relative w-full max-w-lg p-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full blur-xl" style={{ background: 'var(--aurea-gold)', opacity: 0.12 }} />
            <div className="relative p-6 rounded-full shadow-lg" style={{ background: 'var(--aurea-surface)', border: '1px solid rgba(217,166,83,0.25)' }}>
              <img src={aureaSymbol} alt="Aurea Solaris" className="w-16 h-16" />
            </div>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.5em] mb-2" style={{ color: 'var(--aurea-text)' }}>Aurea Solaris</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] italic" style={{ color: 'var(--aurea-gold)' }}>Acesso privado</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate aria-label="Formulário de entrada">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] px-2" style={{ color: 'var(--aurea-text-muted)' }}>Entrar</h2>

          <div>
            <label htmlFor="login-email" className="text-[9px] font-black uppercase tracking-widest mb-2 block pl-1" style={{ color: 'var(--aurea-text-muted)' }}>
              E-mail
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              className="w-full p-5 rounded-lg outline-none transition-all shadow-sm"
              style={{ background: 'var(--aurea-surface)', border: '1px solid rgba(217,166,83,0.15)', color: 'var(--aurea-text)' }}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="text-[9px] font-black uppercase tracking-widest mb-2 block pl-1" style={{ color: 'var(--aurea-text-muted)' }}>
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2" size={18} aria-hidden="true" style={{ color: 'var(--aurea-gold)', opacity: 0.55 }} />
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                className="w-full p-5 pl-14 rounded-lg outline-none transition-all shadow-sm"
                style={{ background: 'var(--aurea-surface)', border: '1px solid rgba(217,166,83,0.15)', color: 'var(--aurea-text)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-xl flex items-center justify-center gap-3 transition-all disabled:cursor-wait disabled:opacity-60"
            style={{ background: 'var(--aurea-bg-deep)', color: 'var(--aurea-text-on-dark)', border: '1px solid rgba(217,166,83,0.25)' }}
          >
            {isSubmitting ? 'Entrando…' : 'Entrar'}
            {!isSubmitting && <ArrowRight size={16} aria-hidden="true" />}
          </button>

          {error && <p role="alert" className="text-center text-sm font-semibold" style={{ color: '#EF4444' }}>{error}</p>}
        </form>

        <div className="mt-16 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3" style={{ color: 'var(--aurea-text-muted)' }}>
            <Star size={12} aria-hidden="true" style={{ color: 'var(--aurea-gold)', opacity: 0.35 }} /> Aurea Solaris <span className="w-1 h-1 rounded-full" style={{ background: 'var(--aurea-gold)', opacity: 0.4 }} /> Acesso protegido <Star size={12} aria-hidden="true" style={{ color: 'var(--aurea-gold)', opacity: 0.35 }} />
          </p>
        </div>
      </main>
    </div>
  );
};
