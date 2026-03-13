import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeInvoke } from '../utils/tauri';

interface AgendaContextType {
  profiles: any[];
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  addProfile: (name: string, password?: string) => void;
  addConnection: (name: string, birthData?: any) => void;
  updateProfile: (id: string, updates: any) => void;
  documents: any[];
  addDocument: (doc: { name: string, type: string, size: string, path?: string }) => void;
  tasks: any[];
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
  getMetrics: () => { done: number, pending: number, notDone: number };
  getPlanetRegency: (date: Date) => { icon: string, name: string };
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
  const [selectedDay, setSelectedDay] = useState(new Date());
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

  const addConnection = (name: string, birthData?: any) => {
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    if (!activeProfile) return;

    const newConn = { 
      id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(), 
      name, 
      birthData: birthData || null,
      natal: { Sun: 0, Moon: 0, ASC: 0 }
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
    const tRes = await safeInvoke<string>('get_todoist_tasks');
    if (tRes) {
      try {
        const parsed = JSON.parse(tRes);
        setTasks(parsed);
      } catch (e) {
        console.error("Error parsing tasks", e);
      }
    }
  };

  useEffect(() => {
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
  };

  const deleteEvent = async (id: string) => {
    await safeInvoke('delete_google_event', { id });
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

  const getPlanetRegency = (date: Date) => {
    const day = date.getDay();
    const regencies = ['☉', '☽', '♂', '☿', '♃', '♀', '♄'];
    const names = ['Sol', 'Lua', 'Marte', 'Mercúrio', 'Júpiter', 'Vênus', 'Saturno'];
    return { icon: regencies[day], name: names[day] };
  };

  const getAlfredInsights = () => {
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    if (!activeProfile) return [];
    
    const insights = [
      { id: 1, type: 'move', content: 'Senhora, quinta-feira apresenta trânsitos harmônicos para escrita. Sugiro realocar sua tarefa de Redação.' },
      { id: 2, type: 'focus', content: 'Marte em quadratura amanhã exige cautela redobrada em atividades físicas ou discussões ríspidas.' },
      { id: 3, type: 'opportunity', content: 'Vênus entra em trígono com seu Meio do Céu. Ótimo momento para lançamentos ou negociações.' }
    ];
    return insights;
  };

  return (
    <AgendaContext.Provider value={{
      profiles, activeProfileId, setActiveProfileId, addProfile, addConnection, updateProfile,
      tasks, selectedDay, setSelectedDay, weekStart, weekDays, nextWeek, prevWeek,
      addTask, deleteTask, toggleTask, postponeTask, addEvent, deleteEvent,
      documents, addDocument,
      getMetrics, getPlanetRegency, getAlfredInsights, refreshTasks: fetchTasks
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
