import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeInvoke } from '../utils/tauri';

interface AgendaContextType {
  profiles: any[];
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  addProfile: (name: string, password?: string) => void;
  addConnection: (name: string, birthData: { date: string, time: string, location: string, lat?: number, lng?: number }) => void;
  updateProfile: (id: string, updates: any) => void;
  houseSystem: string;
  setHouseSystem: (hs: string) => void;
  documents: any[];
  addDocument: (doc: { name: string, type: string, size: string, path?: string }) => void;
  tasks: any[];
  events: any[];
  selectedDay: Date;
  setSelectedDay: (date: Date) => void;
  weekStart: Date;
  weekDays: Date[];
  nextWeek: () => void;
  prevWeek: () => void;
  addTask: (content: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string, completed: boolean) => Promise<void>;
  postponeTask: (id: string) => Promise<void>;
  addEvent: (title: string, start: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  executeInsight: (insight: any) => Promise<void>;
  getMetrics: () => { done: number, pending: number, notDone: number };
  getPlanetaryHour: (date: Date) => { icon: string, name: string, hour: string };
  getPlanetaryDayRegent: (date: Date) => { icon: string, name: string };
  getPlanetRegency: (date: Date) => { icon: string, name: string }; // Alias para getPlanetaryDayRegent
  getAlfredInsights: () => any[];
  refreshTasks: () => Promise<void>;
}

const AgendaContext = createContext<AgendaContextType | undefined>(undefined);

export const AgendaProvider = ({ children }: { children: ReactNode }) => {
  const [profiles, setProfiles] = useState<any[]>(() => {
    const saved = localStorage.getItem('aurea_profiles');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Clean up and ensure 'damiao' is not a root profile, but migrated to viviane if needed
      let filtered = parsed.filter((p: any) => p.id !== 'damiao' && p.name !== 'Damiao');
      
      return filtered.map((p: any) => ({
        ...p,
        natal: p.natal || { Sun: 269.6, Moon: 196.2, ASC: 321.8 },
        connections: p.connections || []
      }));
    }
    return [{ id: 'viviane', name: 'Viviane', active: true, natal: { Sun: 269.6, Moon: 196.2, ASC: 321.8 }, connections: [] }];
  });
  
  const [activeProfileId, setActiveProfileId] = useState(() => {
    return localStorage.getItem('aurea_active_id') || 'viviane';
  });
  
  const [documents, setDocuments] = useState<any[]>(() => {
    const saved = localStorage.getItem('aurea_documents');
    return saved ? JSON.parse(saved) : [
      { id: 'd1', name: 'Exame_Sangue_Março.pdf', path: '#', size: '1.2 MB', date: '2026-03-01', type: 'health' },
      { id: 'd2', name: 'Laudo_Astrologico_Natal.pdf', path: '#', size: '840 KB', date: '2026-02-15', type: 'astrology' }
    ];
  });

  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [houseSystem, setHouseSystem] = useState(
    () => localStorage.getItem('aurea_house_system') || 'Regiomontanus'
  );
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const addProfile = (name: string, password?: string) => {
    const newProfile = { 
      id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(), 
      name, 
      active: true,
      natal: { Sun: 0, Moon: 0, ASC: 0 },
      connections: [],
      password: password || ''
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('aurea_profiles', JSON.stringify(updated));
    setActiveProfileId(newProfile.id);
    localStorage.setItem('aurea_active_id', newProfile.id);
  };

  const addConnection = (name: string, birthData: { date: string, time: string, location: string, lat?: number, lng?: number }) => {
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    if (!activeProfile) return;

    // Default lat/lng (São Paulo) if not provided
    const lat = birthData.lat ?? -23.5505;
    const lng = birthData.lng ?? -46.6333;

    const newConn = { 
      id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(), 
      name, 
      birthData: { ...birthData, lat, lng },
      natal: null // Will be calculated when first viewed
    };
    
    const updated = profiles.map(p => 
      p.id === activeProfileId 
        ? { ...p, connections: [...(p.connections || []), newConn] } 
        : p
    );
    
    setProfiles(updated);
    localStorage.setItem('aurea_profiles', JSON.stringify(updated));
  };

  const updateProfile = (id: string, updates: any) => {
    const updated = profiles.map(p => p.id === id ? { ...p, ...updates } : p);
    setProfiles(updated);
    localStorage.setItem('aurea_profiles', JSON.stringify(updated));
  };

  const addDocument = (doc: { name: string, type: string, size: string, path?: string }) => {
    const newDoc = {
      ...doc,
      id: 'doc_' + Date.now(),
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    localStorage.setItem('aurea_documents', JSON.stringify(updated));
  };

  const fetchTasks = async () => {
    console.log('[AgendaContext] fetchTasks() called');
    console.log('[AgendaContext] isTauri:', !!(window as any).__TAURI_INTERNALS__);
    
    let tRes = await safeInvoke<string>('get_todoist_tasks');
    console.log('[AgendaContext] Todoist result type:', typeof tRes, tRes ? 'HAS DATA' : 'NULL/EMPTY');
    
    // Browser Fallback for Todoist
    // @ts-expect-error - Tauri internal check
    if (!tRes && !window.__TAURI_INTERNALS__) {
      console.log('[AgendaContext] Applying Todoist browser fallback mock');
      tRes = JSON.stringify([
        { id: 't1', content: 'Estudar trânsitos de Netuno', is_completed: false },
        { id: 't2', content: 'Revisão mensal de finanças', is_completed: false },
        { id: 't3', content: 'Sessão UDV às 20h', is_completed: false },
        { id: 't4', content: 'Organizar Mesa de Criação', is_completed: true }
      ]);
    }

    if (tRes) {
      try {
        const parsed = JSON.parse(tRes);
        console.log('[AgendaContext] Todoist tasks count:', parsed.length);
        setTasks(parsed);
        console.log('[AgendaContext] setTasks called with', parsed.length, 'items');
      } catch (e) {
        console.error("[AgendaContext] Error parsing tasks", e);
      }
    } else {
      console.warn('[AgendaContext] WARNING: No Todoist data!');
    }

    let eRes = await safeInvoke<string>('get_google_events');
    console.log('[AgendaContext] Google events result type:', typeof eRes, eRes ? 'HAS DATA' : 'NULL/EMPTY');

    // Browser Fallback for Google Events
    // @ts-expect-error - Tauri internal check
    if (!eRes && !window.__TAURI_INTERNALS__) {
      console.log('[AgendaContext] Applying Google events browser fallback mock');
      const today = new Date().toISOString().split('T')[0];
      eRes = JSON.stringify([
        { id: 'g1', title: 'Sessão UDV', start: `${today}T20:00:00Z`, type: 'spiritual' },
        { id: 'g2', title: 'Almoço em Família', start: `${today}T12:00:00Z`, type: 'social' },
        { id: 'g3', title: 'Consulta Médica', start: `${today}T14:30:00Z`, type: 'health' }
      ]);
    }

    if (eRes) {
      try {
        const parsed = JSON.parse(eRes);
        console.log('[AgendaContext] Google events count:', parsed.length);
        setEvents(parsed);
        console.log('[AgendaContext] setEvents called with', parsed.length, 'items');
      } catch (e) {
        console.error("[AgendaContext] Error parsing events", e);
      }
    } else {
      console.warn('[AgendaContext] WARNING: No Google events data!');
    }
  };

  useEffect(() => {
    console.log('[AgendaContext] useEffect mounted - calling fetchTasks()');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
    const interval = setInterval(fetchTasks, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const addTask = async (content: string) => {
    await safeInvoke('add_todoist_task', { content });
    await fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await safeInvoke('delete_todoist_task', { id });
    await fetchTasks();
  };

  const toggleTask = async (id: string, completed: boolean) => {
    await safeInvoke('toggle_todoist_task', { id, completed });
    await fetchTasks();
  };

  const postponeTask = async (id: string) => {
    await safeInvoke('postpone_todoist_task', { id });
    await fetchTasks();
  };

  const addEvent = async (title: string, start: string) => {
    await safeInvoke('add_google_event', { title, start });
    await fetchTasks();
  };

  const deleteEvent = async (id: string) => {
    await safeInvoke('delete_google_event', { id });
    await fetchTasks();
  };

  const executeInsight = async (insight: any) => {
    if (insight.type === 'move' || insight.type === 'opportunity') {
      await addTask(insight.suggestion || insight.content);
    } else {
      await addEvent(insight.suggestion || insight.content, new Date().toISOString());
    }
    await fetchTasks();
  };

  const getMetrics = () => {
    if (tasks.length === 0) return { done: 0, pending: 0, notDone: 0 };
    const done = tasks.filter((t: any) => t.completed || t.is_completed).length;
    const total = tasks.length;
    return {
      done: Math.round((done / total) * 100),
      pending: Math.round(((total - done) / total) * 100),
      notDone: 0 
    };
  };

  const CHALDEAN_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
  const DAY_REGENTS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const PLANET_ICONS: Record<string, string> = { 'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀', 'Mars': '♂', 'Jupiter': '♃', 'Saturn': '♄' };
  const PLANET_NAMES_PT: Record<string, string> = { 'Sun': 'Sol', 'Moon': 'Lua', 'Mercury': 'Mercúrio', 'Venus': 'Vênus', 'Mars': 'Marte', 'Jupiter': 'Júpiter', 'Saturn': 'Saturno' };

  const getPlanetaryHour = (date: Date) => {
    const dayOfWeek = (date.getDay() + 1) % 7;
    const dayRegent = DAY_REGENTS[dayOfWeek];
    const startIdx = CHALDEAN_ORDER.indexOf(dayRegent);
    const hourIdx = (startIdx + date.getHours()) % 7;
    const regentEng = CHALDEAN_ORDER[hourIdx];
    const ptName = PLANET_NAMES_PT[regentEng] || regentEng;
    return { icon: PLANET_ICONS[regentEng] || '?', name: ptName, hour: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
  };

  const getPlanetaryDayRegent = (date: Date) => {
    const dayOfWeek = (date.getDay() + 1) % 7;
    const dayRegent = DAY_REGENTS[dayOfWeek];
    return { icon: PLANET_ICONS[dayRegent] || '?', name: PLANET_NAMES_PT[dayRegent] || dayRegent };
  };

  const getAlfredInsights = () => {
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    if (!activeProfile) return [];
    
    // Logic: In a real app we'd use useAstrologyData here if we could, 
    // but context can't use hooks that depend on it. 
    // We'll use a simplified version for the MVP that feels real.
    const insights = [
      { 
        id: 1, 
        type: 'move', 
        content: `A regência de ${getPlanetaryDayRegent(new Date()).name} sugere foco em organização. Vamos realocar 'Redação'?`,
        suggestion: 'Finalizar Redação do Mês'
      },
      { 
        id: 2, 
        type: 'focus', 
        content: 'Marte em aspecto tenso detectado. Alfred recomenda cautela em comunicações hoje.',
        suggestion: 'Revisar e-mails importantes'
      },
      { 
        id: 3, 
        type: 'opportunity', 
        content: 'Vênus favorece conexões agora. Ótimo momento para aquela reunião social.',
        suggestion: 'Marcar café com a equipe'
      }
    ];
    return insights;
  };

  return (
    <AgendaContext.Provider value={{
      profiles, activeProfileId, setActiveProfileId, addProfile, addConnection, updateProfile,
      tasks, events, selectedDay, setSelectedDay, weekStart, weekDays, nextWeek, prevWeek,
      addTask, deleteTask, toggleTask, postponeTask, addEvent, deleteEvent, executeInsight,
      documents, addDocument,
      getMetrics, getPlanetaryHour, getPlanetaryDayRegent, getPlanetRegency: getPlanetaryDayRegent, getAlfredInsights, refreshTasks: fetchTasks,
      houseSystem,
      setHouseSystem: (hs: string) => {
        setHouseSystem(hs);
        localStorage.setItem('aurea_house_system', hs);
      }
    }}>
      {children}
    </AgendaContext.Provider>
  );
};

export const useAgendaContext = () => {
  const context = useContext(AgendaContext);
  if (context === undefined) {
    throw new Error('useAgendaContext must be used within an AgendaProvider');
  }
  return context;
};
