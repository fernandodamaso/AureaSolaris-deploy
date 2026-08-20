import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { AppProviders } from '../app/AppProviders';
import type { AppBootstrapState } from '../app/useAppBootstrap';

const { bootstrapState, retryBootstrap, signOut } = vi.hoisted(() => ({
  bootstrapState: { current: { status: 'ready' } as AppBootstrapState },
  retryBootstrap: vi.fn(),
  signOut: vi.fn(async () => ({ ok: true as const })),
}));
const readyState = {
  status: 'ready',
  profile: { id: 'profile-1', display_name: 'Teste' } as never,
  birthProfile: {} as never,
} as AppBootstrapState;

vi.mock('../app/useAppBootstrap', () => ({
  useAppBootstrap: () => ({ state: bootstrapState.current, retry: retryBootstrap, signOut }),
}));

vi.mock('../components/LoginView', () => ({ LoginView: () => <div>Login screen</div> }));
vi.mock('../components/AstrologiaBoard', () => ({ AstrologiaPage: () => <div>Astrologia landmark</div> }));
vi.mock('../components/ProfileEditor', () => ({
  ProfileEditor: ({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) => (
    <div role="dialog">
      <button type="button" onClick={onClose}>Fechar perfil</button>
      <button type="button" onClick={onLogout}>Sair</button>
    </div>
  ),
}));
vi.mock('../profile/ProfileOnboarding', () => ({
  ProfileOnboarding: ({ mode, onLogout }: { mode: string; onLogout: () => void }) => (
    <div>{mode === 'profile' ? 'Profile onboarding' : 'Birth onboarding'}<button type="button" onClick={onLogout}>Sair</button></div>
  ),
}));

const renderApp = () => render(<AppProviders><App /></AppProviders>);

describe('App bootstrap states', () => {
  beforeEach(() => {
    localStorage.clear();
    bootstrapState.current = readyState;
    retryBootstrap.mockClear();
    signOut.mockClear();
  });

  it('shows the private login for signed-out users', () => {
    bootstrapState.current = { status: 'signed-out' };
    renderApp();
    expect(screen.getByText('Login screen')).toBeTruthy();
  });

  it('shows restoring and loading account states', () => {
    bootstrapState.current = { status: 'restoring-session' };
    const first = renderApp();
    expect(screen.getByLabelText('Restaurando acesso')).toBeTruthy();
    first.unmount();

    bootstrapState.current = { status: 'loading-account' };
    renderApp();
    expect(screen.getByLabelText('Carregando sua conta')).toBeTruthy();
  });

  it('keeps profile onboarding states stable with a logout control', () => {
    bootstrapState.current = { status: 'needs-profile' };
    const first = renderApp();
    expect(screen.getByText('Profile onboarding')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy();
    first.unmount();

    bootstrapState.current = { status: 'needs-birth-profile', profile: {} as never };
    renderApp();
    expect(screen.getByText('Birth onboarding')).toBeTruthy();
  });

  it('exposes safe retry and logout controls when the service is unavailable', () => {
    bootstrapState.current = {
      status: 'service-unavailable',
      message: 'Não foi possível carregar sua conta. Tente novamente.',
    };
    renderApp();

    expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar sua conta. Tente novamente.');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(retryBootstrap).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

describe('scoped V1 shell', () => {
  beforeEach(() => {
    localStorage.clear();
    bootstrapState.current = readyState;
  });

  it('mounts only Astrology and excludes legacy navigation and screens', async () => {
    renderApp();
    expect(await screen.findByText('Astrologia landmark')).toBeTruthy();
    expect(screen.getByTitle('Astrologia')).toBeTruthy();
    for (const label of ['Saúde & Vitalidade', 'Agenda Preditiva', 'Caderno Vivo', 'Memórias', 'Histórico & Notas']) {
      expect(screen.queryByTitle(label)).toBeNull();
      expect(screen.queryByText(`${label} landmark`)).toBeNull();
    }
  });

  it('opens settings, closes back to Astrology, and logs out from the private shell', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Teste/ }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar perfil' }));
    await waitFor(() => expect(screen.getByText('Astrologia landmark')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Teste/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(signOut).toHaveBeenCalled();
  });
});
