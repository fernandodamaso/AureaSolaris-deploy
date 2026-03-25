import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Habit {
  id: string;
  name: string;
  time: string;
  checked: boolean;
  dateStr: string; // ISO date string without time to group habits by day
}

export interface BiometricLog {
  id: string;
  dateStr: string;
  sleepHours: number;
  mood: string; // "Ótimo", "Bom", "Cansada", "Estressada"
  energyLevel: number; // 1-10
}

interface SaudeContextType {
  habits: Habit[];
  biometrics: BiometricLog[];
  documents: any[]; // we can share this structure with Agenda documents later
  toggleHabit: (id: string) => void;
  addHabit: (name: string, time: string, dateStr: string) => void;
  logBiometrics: (bio: Omit<BiometricLog, 'id'>) => void;
  uploadDocument: (fileData: any) => void;
  getHabitsByDate: (dateStr: string) => Habit[];
  getBiometricsByDate: (dateStr: string) => BiometricLog | null;
}

const SaudeContext = createContext<SaudeContextType | undefined>(undefined);

export const SaudeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [biometrics, setBiometrics] = useState<BiometricLog[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Load from local storage
  useEffect(() => {
    const storedHabits = localStorage.getItem('saude_habits');
    const storedBio = localStorage.getItem('saude_biometrics');
    const storedDocs = localStorage.getItem('saude_documents');
    
    if (storedHabits) setHabits(JSON.parse(storedHabits));
    else {
      // Default initial habits
      const today = new Date().toISOString().split('T')[0];
      setHabits([
        { id: '1', name: 'Vitamina D (Aurora)', time: '08:00', checked: true, dateStr: today },
        { id: '2', name: 'Probiótico (Benício)', time: '08:30', checked: false, dateStr: today },
        { id: '3', name: 'Meditação UDV (30min)', time: '06:00', checked: true, dateStr: today },
        { id: '4', name: 'Ingestão de Água (3L)', time: 'Ao longo do dia', checked: false, dateStr: today }
      ]);
    }

    if (storedBio) setBiometrics(JSON.parse(storedBio));
    if (storedDocs) setDocuments(JSON.parse(storedDocs));
    else {
      setDocuments([
        { name: "Hemograma_Vivi_Mar.pdf", date: "10 Mar" },
        { name: "Dieta_Nutri_Puerperio.pdf", date: "05 Mar" }
      ]);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    if (habits.length > 0) localStorage.setItem('saude_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    if (biometrics.length > 0) localStorage.setItem('saude_biometrics', JSON.stringify(biometrics));
  }, [biometrics]);

  useEffect(() => {
    if (documents.length > 0) localStorage.setItem('saude_documents', JSON.stringify(documents));
  }, [documents]);

  const toggleHabit = (id: string) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, checked: !h.checked } : h));
  };

  const addHabit = (name: string, time: string, dateStr: string) => {
    const newHabit: Habit = {
      id: Date.now().toString(),
      name,
      time,
      checked: false,
      dateStr
    };
    setHabits(prev => [...prev, newHabit]);
  };

  const logBiometrics = (bio: Omit<BiometricLog, 'id'>) => {
    setBiometrics(prev => {
      // replace if same date
      const filtered = prev.filter(b => b.dateStr !== bio.dateStr);
      return [...filtered, { ...bio, id: Date.now().toString() }];
    });
  };

  const uploadDocument = (fileData: any) => {
    // Basic mock for MVP
    setDocuments(prev => [{ name: fileData.name, date: new Date().toLocaleDateString('pt-BR').substring(0, 5) }, ...prev]);
  };

  const getHabitsByDate = (dateStr: string) => habits.filter(h => h.dateStr === dateStr);
  const getBiometricsByDate = (dateStr: string) => biometrics.find(b => b.dateStr === dateStr) || null;

  return (
    <SaudeContext.Provider value={{
      habits, biometrics, documents,
      toggleHabit, addHabit, logBiometrics, uploadDocument,
      getHabitsByDate, getBiometricsByDate
    }}>
      {children}
    </SaudeContext.Provider>
  );
};

export const useSaudeData = () => {
  const context = useContext(SaudeContext);
  if (!context) throw new Error("useSaudeData must be used within a SaudeProvider");
  return context;
};
