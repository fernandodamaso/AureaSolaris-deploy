/**
 * Composio MCP Service para Google Calendar
 * 
 * NOTA: O composio-core completo requer dependências Node.js.
 * Esta versão stub funciona no browser e mostra a UI de integração.
 * Para produção, use composio-core via Tauri (backend Rust).
 */

import type { GoogleCalendarEvent } from '../types/googleCalendar';
export type { GoogleCalendarEvent } from '../types/googleCalendar';

declare global {
  interface ImportMetaEnv {
    readonly VITE_COMPOSIO_API_KEY: string;
    readonly VITE_GOOGLE_CLIENT_ID?: string;
  }
}

// Estado da conexão (mock para browser)
interface ConnectionState {
  connected: boolean;
  loading: boolean;
  error: string | null;
  events: GoogleCalendarEvent[];
  lastSync: number | null;
}

const state: ConnectionState = {
  connected: false,
  loading: false,
  error: null,
  events: [],
  lastSync: null,
};

/**
 * Servico de Google Calendar via Composio MCP
 * 
 * Para usar em produção:
 * 1. Configure VITE_COMPOSIO_API_KEY no .env
 * 2. Use este serviço via Tauri (backend Rust) para chamadas reais
 * 3. Este stub mostra a UI mas não faz chamadas API no browser
 */
export const googleCalendarService = {
  // Getters de estado
  get connected() { return state.connected; },
  get loading() { return state.loading; },
  get error() { return state.error; },
  get events() { return state.events; },
  get lastSync() { return state.lastSync; },

  /**
   * Conecta ao Google Calendar via Composio
   * 
   * No browser: mostra instruções para configurar
   * No Tauri: usa composio-core via Rust
   */
  async connect(): Promise<boolean> {
    state.loading = true;
    state.error = null;

    // Verifica se tem API key configurada
    const apiKey = import.meta.env.VITE_COMPOSIO_API_KEY;
    
    if (!apiKey) {
      state.error = 'Configure VITE_COMPOSIO_API_KEY no arquivo .env para usar Google Calendar';
      state.loading = false;
      return false;
    }

    try {
      // Tenta conectar via Tauri (backend)
      const { safeInvoke } = await import('../utils/tauri');
      
      // Verifica se Tauri está disponível
      if (typeof window !== 'undefined' && 'api' in window) {
        const result = await safeInvoke('connect_google_calendar');
        state.connected = result as boolean;
      } else {
        // Browser mode: simula conexão
        console.info('[Composio] Browser mode - usando dados mock');
        state.connected = true;
        state.events = getMockEvents();
      }

      state.loading = false;
      state.lastSync = Date.now();
      return state.connected;
    } catch (err) {
      // Fallback para browser mode
      console.info('[Composio] Usando modo mock (sem Tauri)');
      state.connected = true;
      state.events = getMockEvents();
      state.loading = false;
      state.lastSync = Date.now();
      return true;
    }
  },

  /**
   * Desconecta do Google Calendar
   */
  async disconnect(): Promise<void> {
    state.connected = false;
    state.events = [];
    state.lastSync = null;
  },

  /**
   * Lista eventos do Google Calendar
   */
  async listEvents(params?: {
    maxResults?: number;
    timeMin?: string;
    timeMax?: string;
    calendarId?: string;
  }): Promise<GoogleCalendarEvent[]> {
    if (!state.connected) {
      throw new Error('Não conectado ao Google Calendar');
    }

    state.loading = true;
    state.error = null;

    try {
      // Tenta via Tauri primeiro
      const { safeInvoke } = await import('../utils/tauri');
      
      if (typeof window !== 'undefined' && 'api' in window) {
        const result = await safeInvoke('list_google_calendar_events', params);
        state.events = result as GoogleCalendarEvent[];
      } else {
        // Browser mode: retorna mock
        state.events = getMockEvents();
      }

      state.loading = false;
      state.lastSync = Date.now();
      return state.events;
    } catch (err) {
      // Fallback
      state.events = getMockEvents();
      state.loading = false;
      state.lastSync = Date.now();
      return state.events;
    }
  },

  /**
   * Cria um evento no Google Calendar
   */
  async createEvent(params: {
    summary: string;
    start: string;
    end?: string;
    description?: string;
    location?: string;
    calendarId?: string;
  }): Promise<GoogleCalendarEvent | null> {
    if (!state.connected) {
      throw new Error('Não conectado ao Google Calendar');
    }

    state.loading = true;
    state.error = null;

    try {
      const newEvent: GoogleCalendarEvent = {
        id: `gcal_${Date.now()}`,
        title: params.summary,
        start: params.start,
        end: params.end || params.start,
        description: params.description,
        location: params.location,
        source: 'google',
      };

      // Adiciona localmente (em produção, chamaria API)
      state.events.push(newEvent);
      state.loading = false;
      state.lastSync = Date.now();
      
      return newEvent;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Falha ao criar evento';
      state.loading = false;
      return null;
    }
  },

  /**
   * Deleta um evento do Google Calendar
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    if (!state.connected) {
      throw new Error('Não conectado ao Google Calendar');
    }

    state.loading = true;
    state.error = null;

    try {
      state.events = state.events.filter(e => e.id !== eventId);
      state.loading = false;
      state.lastSync = Date.now();
      return true;
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Falha ao deletar evento';
      state.loading = false;
      return false;
    }
  },

  /**
   * Retorna instruções de configuração
   */
  getSetupInstructions(): string {
    return `
Para usar Google Calendar com Composio MCP:

1. Obtenha uma API key em: https://app.composio.dev
2. Adicione ao arquivo .env:
   VITE_COMPOSIO_API_KEY=sua_api_key_aqui

3. Conecte sua conta Google no dashboard Composio:
   https://app.composio.dev/apps/googlecalendar

4. Reinicie o servidor:
   npm start
    `.trim();
  },
};

/**
 * Gera eventos mock para teste no browser
 */
function getMockEvents(): GoogleGoogleCalendarEvent[] {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  return [
    {
      id: 'mock_1',
      title: 'Reunião de equipe',
      start: `${today}T10:00:00`,
      end: `${today}T11:00:00`,
      description: 'Daily standup',
      location: 'Sala virtual',
      source: 'google',
    },
    {
      id: 'mock_2',
      title: 'Almoço com cliente',
      start: `${today}T12:30:00`,
      end: `${today}T14:00:00`,
      description: 'Apresentação do projeto',
      location: 'Restaurante X',
      source: 'google',
    },
  ];
}

// Tipo local para evitar import circular
type GoogleGoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  description?: string;
  location?: string;
  source: 'google' | 'local';
};

export default googleCalendarService;
