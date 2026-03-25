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
      return JSON.stringify([
        { id: 't1', content: 'Estudar trânsitos de Netuno', is_completed: false },
        { id: 't2', content: 'Revisão mensal de finanças', is_completed: false },
        { id: 't3', content: 'Sessão UDV às 20h', is_completed: false },
      ]) as T;

    case 'get_google_events':
      return JSON.stringify([
        { id: 'g1', title: 'Sessão UDV', start: new Date().toISOString().split('T')[0] + 'T20:00:00Z', type: 'spiritual' },
        { id: 'g2', title: 'Almoço em Família', start: new Date().toISOString().split('T')[0] + 'T12:00:00Z', type: 'social' },
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

function handleMockStorage<T>(cmd: string, args?: any): T | null {
  const key = `aurea_mock_${args?.agent || 'default'}_${args?.chat_id || 'legacy'}`;
  
  switch (cmd) {
    case 'save_history':
      localStorage.setItem(key, JSON.stringify(args?.history || []));
      return null;

    case 'load_history': {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) as T : [] as T;
    }

    case 'list_chat_sessions': {
      const sessions: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey?.startsWith(`aurea_mock_${args?.agent}_`) && !storageKey.includes('legacy')) {
          const chatId = storageKey.replace(`aurea_mock_${args?.agent}_`, '');
          const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
          sessions.push({
            chatId,
            agent: args?.agent,
            date: new Date().toLocaleDateString('pt-BR'),
            messageCount: data.length,
            preview: data[0]?.content?.substring(0, 50) || 'Chat vazio'
          });
        }
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
