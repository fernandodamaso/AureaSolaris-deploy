import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { AppProviders } from '../app/AppProviders';
import type { AppBootstrapState } from '../app/useAppBootstrap';

const { bootstrapState, retryBootstrap, signOut, openInitialAccess } = vi.hoisted(() => ({
  bootstrapState: { current: { status: 'ready' } as AppBootstrapState },
  retryBootstrap: vi.fn(),
  signOut: vi.fn(async () => ({ ok: true as const })),
  openInitialAccess: vi.fn(),
}));
const readyState = {
  status: 'ready',
  profile: { id: 'profile-1', display_name: 'Teste' } as never,
  birthProfile: {} as never,
} as AppBootstrapState;

vi.mock('../app/useAppBootstrap', () => ({
  useAppBootstrap: () => ({ state: bootstrapState.current, retry: retryBootstrap, signOut }),
}));

vi.mock('../utils/tauri', () => ({ openInitialAccess }));

vi.mock('../hooks/useLiveTransitData', () => ({
  useLiveTransitData: () => ({
    liveData: null,
    loading: false,
    error: null,
    transits: [],
    getPlanetaryHour: () => ({ icon: '☉', name: 'Sol', time: '12:00' }),
    getSchedulingSuggestion: () => '',
    fetchAstro: vi.fn(),
    NATAL: undefined,
  }),
}));

vi.mock('../components/LoginView', () => ({
  LoginView: () => <div>Login screen</div>,
}));

vi.mock('../profile/ProfileOnboarding', () => ({
  ProfileOnboarding: ({ mode, onLogout }: { mode: string; onLogout: () => void }) => (
    <div>{mode === 'profile' ? 'Profile onboarding' : 'Birth onboarding'}<button type="button" onClick={onLogout}>Sair</button></div>
  ),
}));

vi.mock('../components/AstrologiaBoard', () => ({
  AstrologiaPage: () => <div>Astrologia landmark</div>,
}));
vi.mock('../components/SaudeView', () => ({ SaudeView: () => <div>Saúde landmark</div> }));
vi.mock('../components/agenda/AgendaView', () => ({ AgendaView: () => <div>Agenda landmark</div> }));
vi.mock('../components/MesaCriacao', () => ({ MesaCriacao: () => <div>Caderno Vivo landmark</div> }));
vi.mock('../components/MemoriasView', () => ({ MemoriasView: () => <div>Memórias landmark</div> }));
vi.mock('../components/DiarioView', () => ({ DiarioView: () => <div>Histórico landmark</div> }));
vi.mock('../components/HermesChat', () => ({ HermesChat: () => null }));

const renderApp = () => render(<AppProviders><App /></AppProviders>);

describe('App bootstrap states', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aurea_profiles', JSON.stringify([
      { id: 'profile-1', name: 'Teste', active: true, connections: [] },
    ]));
    bootstrapState.current = readyState;
    retryBootstrap.mockClear();
    signOut.mockClear();
    openInitialAccess.mockClear();
  });

  it('shows the private login for signed-out users and never calls desktop boot', () => {
    bootstrapState.current = { status: 'signed-out' };
    renderApp();

    expect(screen.getByText('Login screen')).toBeTruthy();
    expect(openInitialAccess).not.toHaveBeenCalled();
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

    bootstrapState.current = {
      status: 'needs-birth-profile',
      profile: {} as never,
    };
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

describe('App ready shell', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aurea_profiles', JSON.stringify([
      { id: 'profile-1', name: 'Teste', active: true, connections: [] },
    ]));
    bootstrapState.current = readyState;
  });

  it('keeps Astrologia as the default and loads the primary screens', async () => {
    renderApp();
    await screen.findByTitle('Astrologia');
    expect(await screen.findByText('Astrologia landmark')).toBeTruthy();

    const pages: Array<{ label: string; landmark: string }> = [
      { label: 'Saúde & Vitalidade', landmark: 'Saúde landmark' },
      { label: 'Agenda Preditiva', landmark: 'Agenda landmark' },
      { label: 'Caderno Vivo', landmark: 'Caderno Vivo landmark' },
      { label: 'Memórias', landmark: 'Memórias landmark' },
      { label: 'Histórico & Notas', landmark: 'Histórico landmark' },
    ];

    for (const page of pages) {
      fireEvent.click(screen.getByTitle(page.label));
      expect(await screen.findByText(page.landmark)).toBeTruthy();
    }
  });
});
