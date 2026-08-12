import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { GlobalProvider } from '../context/GlobalContext';
import { AgendaProvider } from '../context/AgendaContext';
import { SaudeProvider } from '../context/SaudeContext';

vi.mock('../utils/tauri', () => ({
  safeInvoke: vi.fn(async (command: string) => {
    if (command === 'remembered_owner_clear') return null;
    if (command === 'private_session_open') return 'profile-1';
    return null;
  }),
}));

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
  LoginView: ({ onLogin }: { onLogin: (id: string, password: string, remember: boolean) => Promise<{ ok: boolean }> }) => (
    <button
      type="button"
      onClick={() => {
        void onLogin('profile-1', 'secret', false);
      }}
    >
      ENTRAR
    </button>
  ),
}));

vi.mock('../components/AstrologiaBoard', () => ({
  AstrologiaPage: () => <div>Astrologia landmark</div>,
}));
vi.mock('../components/SaudeView', () => ({
  SaudeView: () => <div>Saúde landmark</div>,
}));
vi.mock('../components/agenda/AgendaView', () => ({
  AgendaView: () => <div>Agenda landmark</div>,
}));
vi.mock('../components/MesaCriacao', () => ({
  MesaCriacao: () => <div>Caderno Vivo landmark</div>,
}));
vi.mock('../components/MemoriasView', () => ({
  MemoriasView: () => <div>Memórias landmark</div>,
}));
vi.mock('../components/DiarioView', () => ({
  DiarioView: () => <div>Histórico landmark</div>,
}));
vi.mock('../components/HermesChat', () => ({
  HermesChat: () => null,
}));

const renderApp = () => render(
  <AgendaProvider>
    <SaudeProvider>
      <GlobalProvider>
        <App />
      </GlobalProvider>
    </SaudeProvider>
  </AgendaProvider>,
);

describe('App navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aurea_profiles', JSON.stringify([
      { id: 'profile-1', name: 'Teste', active: true, connections: [] },
    ]));
    vi.clearAllMocks();
  });

  it('loads each primary screen landmark after navigation', async () => {
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'ENTRAR' }));
    await screen.findByTitle('Astrologia', {}, { timeout: 10000 });

    const pages: Array<{ label: string; landmark: string }> = [
      { label: 'Astrologia', landmark: 'Astrologia landmark' },
      { label: 'Saúde & Vitalidade', landmark: 'Saúde landmark' },
      { label: 'Agenda Preditiva', landmark: 'Agenda landmark' },
      { label: 'Caderno Vivo', landmark: 'Caderno Vivo landmark' },
      { label: 'Memórias', landmark: 'Memórias landmark' },
      { label: 'Histórico & Notas', landmark: 'Histórico landmark' },
    ];

    for (const page of pages) {
      fireEvent.click(screen.getByTitle(page.label));
      await waitFor(() => {
        expect(screen.getByText(page.landmark)).toBeTruthy();
      });
    }
  }, 15000);
});
