import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { safeInvoke } from '../utils/tauri';
import { createPasswordVerifier, PasswordVerifier, validatePassword, verifyPassword } from '../utils/auth';

export interface AureaProfile {
  id: string;
  name: string;
  active: boolean;
  natal?: any;
  connections?: any[];
  /** Nunca é uma senha; é somente um verificador derivado. */
  passwordVerifier?: PasswordVerifier;
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  birthTimezone?: string;
  avatar?: string;
  context?: string;
  dialogStyle?: string;
  }

export interface AureaTask {
  id: string;
  content: string;
  completed: boolean;
  is_completed?: boolean;
  profileId?: string;
}

export interface AureaEvent {
  id: string;
  title: string;
  start: string;
  type?: string;
}

export interface AureaDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  path?: string;
  date?: string;
}

interface AgendaContextType {
  profiles: AureaProfile[];
  activeProfile: AureaProfile | null;
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  addProfile: (name: string, password: string) => Promise<AureaProfile>;
  authenticateProfile: (id: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  addConnection: (name: string, birthData: { date: string, time: string, location: string, lat: number, lng: number, timezone: string }) => void;
  updateProfile: (id: string, updates: Partial<AureaProfile>) => void;
  houseSystem: string;
  setHouseSystem: (hs: string) => void;
  documents: AureaDocument[];
  addDocument: (doc: Omit<AureaDocument, 'id' | 'date'>) => void;
  tasks: AureaTask[];
  events: AureaEvent[];
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
  getPlanetRegency: (date: Date) => { icon: string, name: string };
  getHermesInsights: (transits?: any[]) => any[];
  refreshTasks: () => Promise<void>;
}

const AgendaContext = createContext<AgendaContextType | undefined>(undefined);

export const AgendaProvider = ({ children }: { children: ReactNode }) => {
  const [profiles, setProfiles] = useState<AureaProfile[]>(() => {
    const saved = localStorage.getItem('aurea_profiles');
    if (saved) {
      const parsed = JSON.parse(saved);
      const filtered = parsed.filter((p: any) => {
        if (p.id === 'damiao' || p.name === 'Damiao') return false;
        // Remove only the exact profile old builds created without user action.
        const isGeneratedVivianeSeed = p.id === 'viviane' && p.name === 'Viviane'
          && !p.passwordVerifier && !p.birthDate && !p.birthTime && !p.birthCity && !p.natal
          && (!Array.isArray(p.connections) || p.connections.length === 0);
        return !isGeneratedVivianeSeed;
      });
      
      const sanitized = filtered.map((p: any) => {
        const { password: _legacyPassword, todoistToken: _legacyTodoist, composioKey: _legacyComposio, ...safeProfile } = p;
        return {
          ...safeProfile,
          connections: p.connections || []
        };
      });
      // Contenção imediata: segredos e senhas legados saem de localStorage na primeira abertura.
      localStorage.setItem('aurea_profiles', JSON.stringify(sanitized));
      return sanitized;
    }
    return [];
  });
  
  const [activeProfileId, setActiveProfileId] = useState(() => {
    return localStorage.getItem('aurea_active_id') || '';
  });

  const activeProfile = useMemo(() => 
    profiles.find(p => p.id === activeProfileId) || null
  , [profiles, activeProfileId]);
  
  const [documents, setDocuments] = useState<AureaDocument[]>(() => {
    const saved = localStorage.getItem('aurea_documents');
    if (!saved) return [];
    const generatedIds = new Set(['d1', 'd2']);
    const sanitized = JSON.parse(saved).filter((document: AureaDocument) => !(
      generatedIds.has(document.id) && document.path === '#'
    ));
    localStorage.setItem('aurea_documents', JSON.stringify(sanitized));
    return sanitized;
  });

  const [tasks, setTasks] = useState<AureaTask[]>([]);
  const [events, setEvents] = useState<AureaEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [houseSystem, setHouseSystem] = useState(
    () => localStorage.getItem('aurea_house_system') || 'Regiomontanus'
  );
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const addProfile = async (name: string, password: string): Promise<AureaProfile> => {
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);
    const newProfile: AureaProfile = { 
      id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(), 
      name, 
      active: true,
      connections: [],
      passwordVerifier: await createPasswordVerifier(password)
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('aurea_profiles', JSON.stringify(updated));
    setActiveProfileId(newProfile.id);
    localStorage.setItem('aurea_active_id', newProfile.id);
    return newProfile;
  };

  const authenticateProfile = async (id: string, password: string) => {
    const profile = profiles.find((candidate: any) => candidate.id === id) as (AureaProfile & { password?: string }) | undefined;
    if (!profile) return { ok: false, error: 'Perfil não encontrado.' };

    if (profile.passwordVerifier) {
      return (await verifyPassword(password, profile.passwordVerifier))
        ? { ok: true }
        : { ok: false, error: 'Senha incorreta.' };
    }

    // Migração única de perfis legados: a senha antiga não sobrevive após uma entrada válida.
    if (typeof profile.password === 'string' && profile.password.length > 0) {
      if (profile.password !== password) return { ok: false, error: 'Senha incorreta.' };
      const passwordVerifier = await createPasswordVerifier(password);
      const updated = profiles.map((candidate: any) => {
        if (candidate.id !== id) return candidate;
        const { password: _legacyPassword, ...safeProfile } = candidate;
        return { ...safeProfile, passwordVerifier };
      });
      setProfiles(updated);
      localStorage.setItem('aurea_profiles', JSON.stringify(updated));
      return { ok: true };
    }

    const passwordError = validatePassword(password);
    if (passwordError) return { ok: false, error: `Defina a senha inicial deste perfil. ${passwordError}` };
    const passwordVerifier = await createPasswordVerifier(password);
    const updated = profiles.map(candidate => candidate.id === id ? { ...candidate, passwordVerifier } : candidate);
    setProfiles(updated);
    localStorage.setItem('aurea_profiles', JSON.stringify(updated));
    return { ok: true };
  };

  const addConnection = (name: string, birthData: { date: string, time: string, location: string, lat: number, lng: number, timezone: string }) => {
    if (!activeProfile) return;
    if (!Number.isFinite(birthData.lat) || !Number.isFinite(birthData.lng) || birthData.lat < -90 || birthData.lat > 90 || birthData.lng < -180 || birthData.lng > 180) {
      console.warn('[AgendaContext] Conexão não salva: coordenadas de nascimento inválidas.');
      return;
    }
    if (!birthData.timezone || (birthData.timezone !== 'UTC' && !birthData.timezone.includes('/'))) {
      console.warn('[AgendaContext] Conexão não salva: fuso IANA de nascimento ausente.');
      return;
    }

    const newConn = { 
      id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(), 
      name, 
      birthData,
      natal: null
    };
    
    const updated = profiles.map(p => 
      p.id === activeProfileId 
        ? { ...p, connections: [...(p.connections || []), newConn] } 
        : p
    );
    
    setProfiles(updated);
    localStorage.setItem('aurea_profiles', JSON.stringify(updated));
  };

  const updateProfile = (id: string, updates: Partial<AureaProfile>) => {
    const updated = profiles.map(p => p.id === id ? { ...p, ...updates } : p);
    setProfiles(updated);
    localStorage.setItem('aurea_profiles', JSON.stringify(updated));
  };

  const addDocument = (doc: Omit<AureaDocument, 'id' | 'date'>) => {
    const newDoc: AureaDocument = {
      ...doc,
      id: 'doc_' + Date.now(),
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    localStorage.setItem('aurea_documents', JSON.stringify(updated));
  };

  const fetchTasks = async () => {
    // Never read integration credentials from browser storage.
    let tRes = await safeInvoke<any>('get_todoist_tasks', {});
    if (tRes) {
      try {
        const parsed = typeof tRes === 'string' ? JSON.parse(tRes) : tRes;
        setTasks(parsed);
      } catch (e) {
        console.error("[AgendaContext] Error parsing tasks", e);
      }
    }

    let eRes = await safeInvoke<any>('get_google_events', {});
    if (eRes) {
      try {
        const parsed = typeof eRes === 'string' ? JSON.parse(eRes) : eRes;
        // Transformar se necessário (Composio retorna campos específicos)
        const formatted = Array.isArray(parsed) ? parsed.map((e: any) => ({
          id: e.id || Math.random().toString(),
          title: e.summary || e.title || 'Sem título',
          start: e.start?.dateTime || e.start || '',
          type: 'google'
        })) : [];
        setEvents(formatted);
      } catch (e) {
        console.error("[AgendaContext] Error parsing events", e);
      }
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 60000);
    return () => clearInterval(interval);
  }, [activeProfileId]);

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
    const created = await safeInvoke('add_todoist_task', { content });
    if (created === null) throw new Error('Não foi possível criar a tarefa. A integração está indisponível.');
    await fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await safeInvoke('delete_todoist_task', { id });
    await fetchTasks();
  };

  const toggleTask = async (id: string, completed: boolean) => {
    const toggled = await safeInvoke('toggle_todoist_task', { id, completed });
    if (toggled === null) throw new Error('Não foi possível atualizar a tarefa.');
    await fetchTasks();
  };

  const postponeTask = async (id: string) => {
    const postponed = await safeInvoke('postpone_todoist_task', { id });
    if (postponed === null) throw new Error('Não foi possível adiar a tarefa.');
    await fetchTasks();
  };

  const addEvent = async (title: string, start: string) => {
    const created = await safeInvoke('add_google_event', { title, start });
    if (created === null) throw new Error('Não foi possível criar o compromisso. A integração está indisponível.');
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
    const dayOfWeek = date.getDay();
    const dayRegent = DAY_REGENTS[dayOfWeek];
    const startIdx = CHALDEAN_ORDER.indexOf(dayRegent);
    const hourIdx = (startIdx + date.getHours()) % 7;
    const regentEng = CHALDEAN_ORDER[hourIdx];
    const ptName = PLANET_NAMES_PT[regentEng] || regentEng;
    return { icon: PLANET_ICONS[regentEng] || '?', name: ptName, hour: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
  };
  
  const getPlanetaryDayRegent = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayRegent = DAY_REGENTS[dayOfWeek];
    return { icon: PLANET_ICONS[dayRegent] || '?', name: PLANET_NAMES_PT[dayRegent] || dayRegent };
  };

  const getHermesInsights = (_transits?: any[]) => {
    // Do not publish interpretations before they can carry rule, source and
    // a visible "Hermes inference" label in the certified vertical.
    return [];
  };

  return (
    <AgendaContext.Provider value={{
      profiles, activeProfile, activeProfileId, setActiveProfileId, addProfile, authenticateProfile, addConnection, updateProfile,
      tasks, events, selectedDay, setSelectedDay, weekStart, weekDays, nextWeek, prevWeek,
      addTask, deleteTask, toggleTask, postponeTask, addEvent, deleteEvent, executeInsight,
      documents, addDocument,
      getMetrics, getPlanetaryHour, getPlanetaryDayRegent, getPlanetRegency: getPlanetaryDayRegent, getHermesInsights, refreshTasks: fetchTasks,
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
