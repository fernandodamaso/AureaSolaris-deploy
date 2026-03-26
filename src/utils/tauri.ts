import { invoke } from '@tauri-apps/api/core';
import { MOCK_ASTRO_DATA, getMockResponse as getAgentResponse } from './mockData';

// Check if running in Tauri or browser
const isTauri = () => {
  // @ts-expect-error - Tauri internal API not typed
  return !!(window.__TAURI_INTERNALS__);
};

export async function safeInvoke<T>(cmd: string, args?: any): Promise<T | null> {
  try {
    if (isTauri()) {
      return await invoke<T>(cmd, args);
    }
    // Browser dev mode — return mock data
    return handleCommand<T>(cmd, args);
  } catch (err: any) {
    console.error(`[safeInvoke Error] ${cmd}:`, err);
    if (cmd === 'run_astro_engine') throw err;
    return null;
  }
}

function handleCommand<T>(cmd: string, args?: any): T | null {
  switch (cmd) {
    case 'run_astro_engine':
      return JSON.stringify(MOCK_ASTRO_DATA) as T;

    case 'openrouter_chat':
    case 'ollama_chat': {
      const messages = args?.messages || [];
      const systemMsg = messages.find((m: any) => m.role === 'system')?.content || '';
      let agent = 'Rafiki';
      if (systemMsg.includes('Dr. Strange')) agent = 'Dr. Strange';
      else if (systemMsg.includes('Alfred')) agent = 'Alfred';
      else if (systemMsg.includes('Uncle Duck')) agent = 'Uncle Duck';
      else if (systemMsg.includes('Stark')) agent = 'Stark';
      return getAgentResponse(agent) as T;
    }

    case 'save_history':
    case 'load_history':
    case 'save_board':
    case 'load_board':
    case 'list_chat_sessions':
    case 'delete_chat_session':
    case 'archive_chat':
    case 'list_archived_chats':
    case 'load_archived_chat':
      // Storage ops in browser use localStorage
      return handleMockStorage<T>(cmd, args);

    case 'get_todoist_tasks':
      console.log('[Mock] get_todoist_tasks returning data');
      return JSON.stringify([
        { id: 't1', content: 'Estudar trânsitos de Netuno', is_completed: false },
        { id: 't2', content: 'Revisão mensal de finanças', is_completed: false },
        { id: 't3', content: 'Sessão UDV às 20h', is_completed: false },
        { id: 't4', content: 'Organizar Mesa de Criação', is_completed: true },
      ]) as T;

    case 'get_google_events':
      console.log('[Mock] get_google_events returning data');
      const todayStr = new Date().toISOString().split('T')[0];
      return JSON.stringify([
        { id: 'g1', title: 'Sessão UDV', start: `${todayStr}T20:00:00Z`, type: 'spiritual' },
        { id: 'g2', title: 'Almoço em Família', start: `${todayStr}T12:00:00Z`, type: 'social' },
        { id: 'g3', title: 'Yoga às 7h', start: `${todayStr}T07:00:00Z`, type: 'health' },
      ]) as T;

    case 'get_sys_info':
      return { os: 'Windows', arch: 'x64', memory: '16GB', cpu: 'Mock CPU', uptime: '4d 12h' } as T;

    case 'get_total_tokens':
      return 12500 as T;

    default:
      console.log(`[Mock] No mock for command: ${cmd}`);
      return null;
  }
}

function getMockChatSessions(agent: string): any[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const twoDaysAgo = new Date(now.getTime() - 172800000);

  const defaultSessions: Record<string, any[]> = {
    'Rafiki': [
      {
        chatId: `mock_${Date.now() - 86400000}`,
        agent: 'Rafiki',
        date: yesterday.toLocaleDateString('pt-BR'),
        messageCount: 4,
        preview: 'Como estão os trânsitos hoje?',
        messages: [
          { role: 'user', content: 'Como estão os trânsitos hoje?' },
          { role: 'assistant', content: 'A Lua em Capricórnio favorece disciplina e estruturação. Netuno em Peixes indica introspecção e conexão espiritual. Momento propício para meditação e planejamento de longo prazo.' },
          { role: 'user', content: 'Recomendaria alguma tarefa?' },
          { role: 'assistant', content: 'Sugiro: 1) Revisar metas de longo prazo, 2) Praticar meditação matinal, 3) Organizar documentos financeiros. A energia capricorniana pede ação concreta.' }
        ]
      },
      {
        chatId: `mock_${Date.now() - 172800000}`,
        agent: 'Rafiki',
        date: twoDaysAgo.toLocaleDateString('pt-BR'),
        messageCount: 2,
        preview: 'Que dia é hoje no mapa astral?',
        messages: [
          { role: 'user', content: 'Que dia é hoje no mapa astral?' },
          { role: 'assistant', content: 'Mercúrio em Gêmeos acelera comunicações. Você está em período favorável para estudos, viagens curtas e networking. Evite decisões definitivas no campo emocional.' }
        ]
      }
    ],
    'Alfred': [
      {
        chatId: `mock_${Date.now() - 86400000}`,
        agent: 'Alfred',
        date: yesterday.toLocaleDateString('pt-BR'),
        messageCount: 4,
        preview: 'Priorize minhas tarefas de hoje',
        messages: [
          { role: 'user', content: 'Priorize minhas tarefas de hoje' },
          { role: 'assistant', content: 'Prioridades do dia: 1) Reunião às 10h (urgente), 2) Revisar documento X, 3) Ligação para cliente. Hora planetária de Marte favorece ação direta.' },
          { role: 'user', content: 'Adicionemeditação à agenda' },
          { role: 'assistant', content: 'Tarefa adicionada: Meditação matinal às 6h. Recomendo 15 minutos durante a hora de Sol para máxima absorção de energia.' }
        ]
      }
    ],
    'Uncle Duck': [
      {
        chatId: `mock_${Date.now() - 86400000}`,
        agent: 'Uncle Duck',
        date: yesterday.toLocaleDateString('pt-BR'),
        messageCount: 4,
        preview: 'Análise das finanças do mês',
        messages: [
          { role: 'user', content: 'Análise das finanças do mês' },
          { role: 'assistant', content: 'Balanço: Entradas R$ 15.000, Saídas R$ 12.500, Economia: R$ 2.500 (16,7%). Performance acima da meta de 15%. Parabéns!' },
          { role: 'user', content: 'Onde posso cortar gastos?' },
          { role: 'assistant', content: 'Corte sugerido: Assinaturas (R$ 450/mês) e restaurantes (R$ 600/mês). Potencial economia: R$ 1.050/mês.' }
        ]
      }
    ],
    'Stark': [
      {
        chatId: `mock_${Date.now() - 86400000}`,
        agent: 'Stark',
        date: yesterday.toLocaleDateString('pt-BR'),
        messageCount: 2,
        preview: 'Status do sistema',
        messages: [
          { role: 'user', content: 'Status do sistema' },
          { role: 'assistant', content: 'Sistema operante: CPU 12%, RAM 8GB/16GB, Uptime 4d 12h. Sem anomalias detectadas. Ponte Tauri-React estável.' }
        ]
      }
    ],
    'Dr. Strange': [
      {
        chatId: `mock_${Date.now() - 86400000}`,
        agent: 'Dr. Strange',
        date: yesterday.toLocaleDateString('pt-BR'),
        messageCount: 4,
        preview: 'Visão macro do dia',
        messages: [
          { role: 'user', content: 'Visão macro do dia' },
          { role: 'assistant', content: 'Padrão identificado: Lua em Capricórnio + Mercúrio em Gêmeos = ideal para planejamento estruturado com comunicação fluida. Finanças estáveis, tarefas em dia.' },
          { role: 'user', content: 'Conecte os astros às ações' },
          { role: 'assistant', content: 'Recomendação: Organize caos (Capricórnio) + transmita ideias (Mercúrio). Ação: Defina 3 metas claras e comunique-as. Momento favorável para acordos.' }
        ]
      }
    ]
  };

  return defaultSessions[agent] || [];
}

function handleMockStorage<T>(cmd: string, args?: any): T | null {
  const chatId = args?.chat_id;
  const key = `aurea_mock_${args?.agent || 'default'}_${chatId ?? 'legacy'}`;
  
  switch (cmd) {
    case 'save_history':
      localStorage.setItem(key, JSON.stringify(args?.history || []));
      return null;

    case 'load_history': {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) as T : [] as T;
    }

    case 'list_chat_sessions': {
      console.log('[Mock] list_chat_sessions called for agent:', args?.agent);
      const sessions: any[] = [];
      const prefix = `aurea_mock_${args?.agent}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey?.startsWith(prefix)) {
          const rawId = storageKey.replace(prefix, '');
          if (rawId === 'legacy' || rawId === 'board') continue;
          const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const firstUserMsg = data.find((m: any) => m.role === 'user');
          sessions.push({
            chatId: rawId,
            agent: args?.agent,
            date: new Date().toLocaleDateString('pt-BR'),
            messageCount: data.length,
            preview: firstUserMsg?.content?.substring(0, 50) || 'Chat vazio'
          });
        }
      }
      console.log('[Mock] Found sessions in localStorage:', sessions.length);
      if (sessions.length === 0) {
        const mockSessions = getMockChatSessions(args?.agent);
        mockSessions.forEach(s => {
          localStorage.setItem(`${prefix}${s.chatId}`, JSON.stringify(s.messages));
        });
        console.log('[Mock] Created mock sessions:', mockSessions.length);
        return mockSessions as T;
      }
      return sessions as T;
    }

    case 'delete_chat_session': {
      const delKey = `aurea_mock_${args?.agent}_${args?.chat_id}`;
      localStorage.removeItem(delKey);
      return null;
    }

    case 'save_board':
      localStorage.setItem('aurea_mock_board', JSON.stringify(args));
      return null;

    case 'load_board': {
      const board = localStorage.getItem('aurea_mock_board');
      return board ? JSON.parse(board) as T : null;
    }

    default:
      return null;
  }
}
