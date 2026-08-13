import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLiveTransitData } from '../hooks/useLiveTransitData';
import { useAgendaContext, AureaProfile, AureaTask, AureaEvent, AureaDocument, AstroMapSubject } from './AgendaContext';
import type { LiveAstroData, AstroAspect, PlanetaryPosition } from '../types/astrology';
import type { HermesInsight } from '../types/private-profile';

interface AstroState {
  liveData: LiveAstroData | null;
  transits: ReturnType<typeof useLiveTransitData>['transits'];
  loading: boolean;
  error: string | null;
  planetaryHour: { icon: string; name: string; time: string };
  dayRegent: { icon: string; name: string };
}

interface GlobalContextType {
  astro: AstroState;
  agenda: {
    profiles: AureaProfile[];
    mapSubjects: AstroMapSubject[];
    activeProfile: AureaProfile | null;
    activeSubjectId: string;
    tasks: AureaTask[];
    events: AureaEvent[];
    metrics: { done: number; pending: number; notDone: number };
    documents: AureaDocument[];
    insights: HermesInsight[];
    setActiveProfileId: (id: string) => void;
    addProfile: (name: string, password: string, id?: string) => Promise<AureaProfile>;
    ensureLocalUiProfile: (ownerId: string, displayName: string) => void;
    updateProfile: (id: string, updates: Partial<AureaProfile>) => void;
  };
  system: {
    status: string;
    lastSync: Date;
  };
  getAiContext: () => string;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const agenda = useAgendaContext();
  // Personal transits stay unavailable until this context consumes a natal
  // calculation with a verifiable receipt, never the legacy `profile.natal`.
  const { liveData, transits, loading, error, getPlanetaryHour } = useLiveTransitData(undefined);

  const value = useMemo(() => {
    const activeProfile = agenda.activeProfile;
    const pPager = getPlanetaryHour();
    const dRegent = agenda.getPlanetaryDayRegent(new Date());

    const getAiContext = () => {
      const pendingTasks = agenda.tasks.filter((t: AureaTask) => !t.completed && !t.is_completed);
      const completedTasks = agenda.tasks.filter((t: AureaTask) => t.completed || t.is_completed);
      
      const planets = liveData?.planets || {};
      const retrogradePlanets = Object.entries(planets)
        .filter(([name, value]: [string, PlanetaryPosition]) => value?.retrograde && !['ASC', 'MC', 'DSC', 'IC'].includes(name))
        .map(([k]) => k);
      
      const planetPositions = Object.entries(planets)
        .map(([k, v]: [string, PlanetaryPosition]) => Number.isFinite(v?.pos_in_sign) && typeof v?.sign === 'string'
          ? `${k}: ${v.pos_in_sign.toFixed(1)}° ${v.sign}`
          : null)
        .filter((position): position is string => Boolean(position))
        .join(', ');
      
      const skyAspects = (liveData?.aspects || []).slice(0, 5).map((a: AstroAspect) => `${a.p1} ${a.symbol} ${a.p2}`).join(', ') || 'Nenhum';
      const transitSummary = 'Não calculados: mapa natal certificado não disponível';

      return `
═══════════════════════════════════════════════════
CONTEXTO UNIFICADO AUREA SOLARIS
═══════════════════════════════════════════════════

--- TEMPORAL ---
Data: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
Hora Planetária: ${pPager.icon} ${pPager.name} (${pPager.time})
Regente do Dia: ${dRegent.icon} ${dRegent.name}

--- PERFIL ---
Nome: ${activeProfile?.name || 'Não configurado'}

--- ASTROLOGIA ---
Planetas: ${planetPositions}
Aspectos no céu: ${skyAspects}
Trânsitos pessoais: ${transitSummary}
Retrogradações: ${retrogradePlanets.length > 0 ? retrogradePlanets.join(', ') : 'Nenhuma'}

--- TAREFAS ---
Pendentes: ${pendingTasks.length} | Completas: ${completedTasks.length} | Progresso: ${agenda.getMetrics().done}%
Top 3 Pendentes: ${pendingTasks.slice(0, 3).map((t: AureaTask) => `- ${t.content}`).join('\n') || 'Nenhuma'}

--- SAÚDE ---
Documentos: ${agenda.documents.length} registrados

--- STATUS DO SISTEMA ---
Estabilidade: Alta | Agentes: Sintonizados | Conectividade: OK
`;
    };

    return {
      astro: { liveData, transits, loading, error, planetaryHour: pPager, dayRegent: dRegent },
      agenda: {
        profiles: agenda.profiles,
        mapSubjects: agenda.mapSubjects ?? [],
        activeProfile,
        activeSubjectId: agenda.activeSubjectId,
        tasks: agenda.tasks,
        events: agenda.events,
        metrics: agenda.getMetrics(),
        documents: agenda.documents,
        insights: agenda.getHermesInsights(transits),
        setActiveProfileId: agenda.setActiveProfileId,
        addProfile: agenda.addProfile,
        ensureLocalUiProfile: agenda.ensureLocalUiProfile,
        updateProfile: agenda.updateProfile
      },
      system: { status: error ? 'Astronomical engine unavailable' : loading ? 'Calculating' : 'Stable', lastSync: new Date() },
      getAiContext
    };
  }, [liveData, transits, loading, error, getPlanetaryHour, agenda]);

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};
