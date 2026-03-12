import { useState, useEffect } from 'react';
import { safeInvoke } from '../utils/tauri';

export const useAgendaTasks = () => {
  const [profiles, setProfiles] = useState<any[]>(() => {
    const saved = localStorage.getItem('aurea_profiles');
    return saved ? JSON.parse(saved) : [{ id: 'viviane', name: 'Viviane', active: true }];
  });
  const [activeProfileId, setActiveProfileId] = useState('viviane');
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const addProfile = (name: string) => {
    const newProfile = { id: name.toLowerCase().replace(/\s+/g, '_'), name, active: true };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('aurea_profiles', JSON.stringify(updated));
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
    // Logic to move task to tomorrow or next available slot
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
    const done = tasks.filter(t => t.completed || t.is_completed).length;
    // For simplicity, we'll treat all others as pending for now, 
    // but in a real app we'd check due dates vs today for "Not Done"
    const total = tasks.length;
    return {
      done: Math.round((done / total) * 100),
      pending: Math.round(((total - done) / total) * 100),
      notDone: 0 // Logic for 'Not Done' requires due date checking
    };
  };

  const getPlanetRegency = (date: Date) => {
    const day = date.getDay();
    const regencies = ['☉', '☽', '♂', '☿', '♃', '♀', '♄'];
    const names = ['Sol', 'Lua', 'Marte', 'Mercúrio', 'Júpiter', 'Vênus', 'Saturno'];
    return { icon: regencies[day], name: names[day] };
  };

  return {
    profiles,
    activeProfileId,
    setActiveProfileId,
    addProfile,
    tasks,
    selectedDay,
    setSelectedDay,
    weekStart,
    weekDays,
    nextWeek,
    prevWeek,
    addTask,
    deleteTask,
    toggleTask,
    postponeTask,
    addEvent,
    deleteEvent,
    getMetrics,
    getPlanetRegency
  };
};
