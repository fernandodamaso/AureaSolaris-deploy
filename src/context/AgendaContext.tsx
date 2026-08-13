import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { validatePassword } from '../utils/auth';
import type { PrivateProfile, ProfileConnection, HermesInsight } from '../types/private-profile';
import { applyReferenceNatalMock, resolveLocalOwnerSubjectId, syncReferenceNatalMockFromLocation } from '../utils/reference-natal';

export type AureaProfile = PrivateProfile;

export interface AureaTask {
  id: string;
  content: string;
  completed: boolean;
  is_completed?: boolean;
  profileId?: string;
}

export interface AstroMapSubject {
  id: string;
  name: string;
  kind: 'profile' | 'connection';
  ownerProfileId: string;
  source: AureaProfile | ProfileConnection;
}

export interface AureaEvent {
  id: string;
  title: string;
  start: string;
  type?: string;
  /** Legacy browser-local event; private storage migration is tracked separately. */
  profileId?: string;
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
  mapSubjects?: AstroMapSubject[];
  activeProfile: AureaProfile | null;
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  activeSubjectId: string;
  setActiveSubjectId: (id: string) => void;
  addProfile: (name: string, password: string, id?: string) => Promise<AureaProfile>;
  ensureLocalUiProfile: (ownerId: string, displayName: string) => void;
  hydrateProfilesFromStorage: () => void;
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
  executeInsight: (insight: HermesInsight) => Promise<void>;
  getMetrics: () => { done: number, pending: number, notDone: number };
  getPlanetaryHour: (date: Date) => { icon: string, name: string, hour: string };
  getPlanetaryDayRegent: (date: Date) => { icon: string, name: string };
  getPlanetRegency: (date: Date) => { icon: string, name: string };
  getHermesInsights: (transits?: unknown[]) => HermesInsight[];
  refreshTasks: () => Promise<void>;
}

const AgendaContext = createContext<AgendaContextType | undefined>(undefined);

const stripLegacySecrets = (profile: Record<string, unknown>): AureaProfile => {
  const { password, passwordVerifier, composioKey, ...safeProfile } = profile;
  void password;
  void passwordVerifier;
  void composioKey;
  return {
    ...safeProfile,
    connections: Array.isArray(profile.connections) ? profile.connections as ProfileConnection[] : [],
  } as AureaProfile;
};

const isLegacySeedProfile = (profile: AureaProfile) => (
  profile.id === 'viviane' && profile.name === 'Viviane'
  && !profile.birthDate && !profile.birthTime && !profile.birthCity && !profile.natal
  && (!Array.isArray(profile.connections) || profile.connections.length === 0)
);

const resolveSubjectId = (profiles: AureaProfile[], profileId: string, requestedId: string) => {
  const profile = profiles.find(candidate => candidate.id === profileId);
  if (!profile) return '';
  const connections = Array.isArray(profile.connections) ? profile.connections : [];
  const subjectIds = [profile.id, ...connections.map(connection => connection.id)];
  return subjectIds.includes(requestedId) ? requestedId : subjectIds[0] || '';
};

export const AgendaProvider = ({ children }: { children: ReactNode }) => {
  const [profiles, setProfiles] = useState<AureaProfile[]>(() => {
    const saved = localStorage.getItem('aurea_profiles');
    if (saved) {
      const parsed = JSON.parse(saved) as AureaProfile[];
      const filtered = parsed.filter((p) => {
        if (p.id === 'damiao' || p.name === 'Damiao') return false;
        return !isLegacySeedProfile(p);
      });
      
      const sanitized = filtered.map((p) => stripLegacySecrets(p as unknown as Record<string, unknown>));
      // Contenção imediata: segredos e senhas legados saem de localStorage na primeira abertura.
      localStorage.setItem('aurea_profiles', JSON.stringify(sanitized));
      return sanitized;
    }
    return [];
  });
  
  const [activeProfileId, setActiveProfileIdState] = useState(() => {
    return localStorage.getItem('aurea_active_id') || '';
  });

  const [activeSubjectId, setActiveSubjectIdState] = useState(() => (
    resolveSubjectId(
      profiles,
      localStorage.getItem('aurea_active_id') || '',
      localStorage.getItem(`aurea_active_subject:${localStorage.getItem('aurea_active_id') || ''}`)
        || localStorage.getItem('aurea_active_id')
        || '',
    )
  ));

  useEffect(() => {
    if (activeProfileId && activeSubjectId) {
      localStorage.setItem(`aurea_active_subject:${activeProfileId}`, activeSubjectId);
    }
  }, [activeProfileId, activeSubjectId]);

  const activeProfile = useMemo(() => 
    profiles.find(p => p.id === activeProfileId) || null
  , [profiles, activeProfileId]);

  // One canonical list is shared by Mandala, Saúde, Agenda and Caderno.
  // A connected natal map is a study subject, not a second login/profile.
  const mapSubjects = useMemo<AstroMapSubject[]>(() => profiles.flatMap(profile => [
    { id: profile.id, name: profile.name, kind: 'profile' as const, ownerProfileId: profile.id, source: profile },
    ...(Array.isArray(profile.connections) ? profile.connections : []).map((connection: ProfileConnection) => ({
      id: connection.id,
      name: connection.name,
      kind: 'connection' as const,
      ownerProfileId: profile.id,
      source: connection,
    })),
  ]), [profiles]);

  const persistActiveSubject = (profileId: string, subjectId: string) => {
    setActiveSubjectIdState(subjectId);
    const storageKey = `aurea_active_subject:${profileId}`;
    if (subjectId) {
      localStorage.setItem(storageKey, subjectId);
    } else {
      localStorage.removeItem(storageKey);
    }
  };

  const setActiveProfileId = (id: string) => {
    setActiveProfileIdState(id);
    localStorage.setItem('aurea_active_id', id);
    persistActiveSubject(id, resolveSubjectId(profiles, id, ''));
  };

  const setActiveSubjectId = (id: string) => {
    const subject = mapSubjects.find(candidate => candidate.id === id && candidate.ownerProfileId === activeProfileId);
    if (!subject) return;
    persistActiveSubject(activeProfileId, id);
  };
  
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

  const [tasks, setTasks] = useState<AureaTask[]>(() => {
    const saved = localStorage.getItem('aurea_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [events, setEvents] = useState<AureaEvent[]>(() => {
    const saved = localStorage.getItem('aurea_events');
    return saved ? JSON.parse(saved) : [];
  });

  const persistTasks = (updated: AureaTask[]) => {
    setTasks(updated);
    localStorage.setItem('aurea_tasks', JSON.stringify(updated));
  };

  const persistEvents = (updated: AureaEvent[]) => {
    setEvents(updated);
    localStorage.setItem('aurea_events', JSON.stringify(updated));
  };

  const [selectedDay, setSelectedDay] = useState(new Date());
  const [houseSystem, setHouseSystem] = useState(
    () => localStorage.getItem('aurea_house_system') || 'Regiomontanus'
  );
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const addProfile = async (name: string, password: string, id?: string): Promise<AureaProfile> => {
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);
    const newProfile: AureaProfile = { 
      id: id || `${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      name, 
      active: true,
      connections: [],
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('aurea_profiles', JSON.stringify(updated));
    setActiveProfileIdState(newProfile.id);
    localStorage.setItem('aurea_active_id', newProfile.id);
    persistActiveSubject(newProfile.id, resolveSubjectId(updated, newProfile.id, ''));
    return newProfile;
  };

  const ensureLocalUiProfile = (ownerId: string, displayName: string) => {
    syncReferenceNatalMockFromLocation();
    const resolvedName = displayName || 'Aurea';
    const requestedSubject = localStorage.getItem(`aurea_active_subject:${ownerId}`) || '';
    let nextSubject = ownerId;
    setProfiles((current) => {
      const existing = current.find((profile) => profile.id === ownerId);
      const nextName = existing?.name?.trim() ? existing.name : resolvedName;
      const nextProfile = applyReferenceNatalMock(existing
        ? { ...existing, name: nextName, active: true }
        : { id: ownerId, name: resolvedName, active: true, connections: [] });
      const updated = existing
        ? current.map((profile) => (profile.id === ownerId ? nextProfile : profile))
        : [...current, nextProfile];
      nextSubject = resolveLocalOwnerSubjectId(nextProfile, requestedSubject);
      localStorage.setItem('aurea_profiles', JSON.stringify(updated));
      localStorage.setItem('aurea_active_id', ownerId);
      localStorage.setItem(`aurea_active_subject:${ownerId}`, nextSubject);
      return updated;
    });
    setActiveProfileIdState(ownerId);
    setActiveSubjectIdState(() => localStorage.getItem(`aurea_active_subject:${ownerId}`) || nextSubject);
  };

  const hydrateProfilesFromStorage = () => {
    const saved = localStorage.getItem('aurea_profiles');
    let parsedProfiles = profiles;
    if (saved) {
      parsedProfiles = JSON.parse(saved) as AureaProfile[];
      const sanitized = parsedProfiles.map((profile) => stripLegacySecrets(profile as unknown as Record<string, unknown>));
      setProfiles(sanitized);
      parsedProfiles = sanitized;
    }
    const ownerId = localStorage.getItem('aurea_active_id') || '';
    if (ownerId) {
      setActiveProfileIdState(ownerId);
      const requestedSubject = localStorage.getItem(`aurea_active_subject:${ownerId}`) || '';
      persistActiveSubject(ownerId, resolveSubjectId(parsedProfiles, ownerId, requestedSubject));
    }
    const savedTasks = localStorage.getItem('aurea_tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks) as AureaTask[]);
    }
    const savedEvents = localStorage.getItem('aurea_events');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents) as AureaEvent[]);
    }
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

    const newConn: ProfileConnection = { 
      id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(), 
      name, 
      birthData,
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
    if (id === activeProfileId) {
      persistActiveSubject(activeProfileId, resolveSubjectId(updated, activeProfileId, activeSubjectId));
    }
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

  const refreshTasks = async () => {
    return;
  };

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
    const newTask: AureaTask = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      content,
      completed: false,
      is_completed: false,
    };
    const updated = [...tasks, newTask];
    persistTasks(updated);
  };

  const deleteTask = async (id: string) => {
    const updated = tasks.filter(task => task.id !== id);
    persistTasks(updated);
  };

  const toggleTask = async (id: string, completed: boolean) => {
    const updated = tasks.map(task =>
      task.id === id ? { ...task, completed, is_completed: completed } : task
    );
    persistTasks(updated);
  };

  const postponeTask = async (id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const updated = tasks.map(task =>
      task.id === id ? { ...task, due: tomorrow.toISOString() } : task
    );
    persistTasks(updated);
  };

  const addEvent = async (title: string, start: string) => {
    const event: AureaEvent = {
      id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      start,
      type: 'local',
      profileId: activeProfileId || undefined,
    };
    persistEvents([...events, event]);
  };

  const deleteEvent = async (id: string) => {
    persistEvents(events.filter(event => event.id !== id));
  };

  const executeInsight = async (insight: HermesInsight) => {
    if (insight.type === 'move' || insight.type === 'opportunity') {
      await addTask(insight.suggestion ?? insight.content ?? '');
    } else {
      await addEvent(insight.suggestion ?? insight.content ?? '', new Date().toISOString());
    }
    await refreshTasks();
  };

  const getMetrics = () => {
    if (tasks.length === 0) return { done: 0, pending: 0, notDone: 0 };
    const done = tasks.filter((t) => t.completed || t.is_completed).length;
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

  const getHermesInsights = () => {
    // Do not publish interpretations before they can carry rule, source and
    // a visible "Hermes inference" label in the certified vertical.
    return [];
  };

  return (
    <AgendaContext.Provider value={{
      profiles, mapSubjects, activeProfile, activeProfileId, setActiveProfileId, activeSubjectId, setActiveSubjectId, addProfile, ensureLocalUiProfile, hydrateProfilesFromStorage, addConnection, updateProfile,
      tasks, events, selectedDay, setSelectedDay, weekStart, weekDays, nextWeek, prevWeek,
      addTask, deleteTask, toggleTask, postponeTask, addEvent, deleteEvent, executeInsight,
      documents, addDocument,
      getMetrics, getPlanetaryHour, getPlanetaryDayRegent, getPlanetRegency: getPlanetaryDayRegent, getHermesInsights, refreshTasks,
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
