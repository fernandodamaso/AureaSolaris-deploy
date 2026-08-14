import { createContext, useContext, type ReactNode, useMemo } from 'react';
import { getHermesInsights } from '../app/workflows/hermesAgendaWorkflow';
import { useAgenda } from '../features/agenda/AgendaContext';
import type { AureaEvent, AureaTask } from '../features/agenda/types';
import { getPlanetaryDayRegent } from '../features/astrology/planetaryRegency';
import { useHealthDocuments } from '../features/health/HealthDocumentsContext';
import type { AureaDocument } from '../features/health/types';
import { useIdentity } from '../features/identity/IdentityContext';
import type { AstroMapSubject, AureaProfile } from '../features/identity/types';
import { useLiveTransitData } from '../hooks/useLiveTransitData';
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
  /** @deprecated Read compatibility only while consumers move to feature hooks. */
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
    hydrateProfilesFromStorage: () => void;
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
  const identity = useIdentity();
  const agenda = useAgenda();
  const healthDocuments = useHealthDocuments();
  // Personal transits stay unavailable until this context consumes a natal
  // calculation with a verifiable receipt, never the legacy `profile.natal`.
  const { liveData, transits, loading, error, getPlanetaryHour } = useLiveTransitData(undefined);

  const value = useMemo(() => {
    const pPager = getPlanetaryHour();
    const dRegent = getPlanetaryDayRegent(new Date());

    const getAiContext = () => {
      const pendingTasks = agenda.tasks.filter((task) => !task.completed && !task.is_completed);
      const completedTasks = agenda.tasks.filter((task) => task.completed || task.is_completed);
      const planets = liveData?.planets || {};
      const retrogradePlanets = Object.entries(planets)
        .filter(([name, value]: [string, PlanetaryPosition]) => value?.retrograde && !['ASC', 'MC', 'DSC', 'IC'].includes(name))
        .map(([key]) => key);
      const planetPositions = Object.entries(planets)
        .map(([key, value]: [string, PlanetaryPosition]) => Number.isFinite(value?.pos_in_sign) && typeof value?.sign === 'string'
          ? `${key}: ${value.pos_in_sign.toFixed(1)}° ${value.sign}`
          : null)
        .filter((position): position is string => Boolean(position))
        .join(', ');
      const skyAspects = (liveData?.aspects || []).slice(0, 5)
        .map((aspect: AstroAspect) => `${aspect.p1} ${aspect.symbol} ${aspect.p2}`)
        .join(', ') || 'Nenhum';
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
Nome: ${identity.activeProfile?.name || 'Não configurado'}

--- ASTROLOGIA ---
Planetas: ${planetPositions}
Aspectos no céu: ${skyAspects}
Trânsitos pessoais: ${transitSummary}
Retrogradações: ${retrogradePlanets.length > 0 ? retrogradePlanets.join(', ') : 'Nenhuma'}

--- TAREFAS ---
Pendentes: ${pendingTasks.length} | Completas: ${completedTasks.length} | Progresso: ${agenda.getMetrics().done}%
Top 3 Pendentes: ${pendingTasks.slice(0, 3).map((task) => `- ${task.content}`).join('\n') || 'Nenhuma'}

--- SAÚDE ---
Documentos: ${healthDocuments.documents.length} registrados

--- STATUS DO SISTEMA ---
Estabilidade: Alta | Agentes: Sintonizados | Conectividade: OK
`;
    };

    return {
      astro: { liveData, transits, loading, error, planetaryHour: pPager, dayRegent: dRegent },
      agenda: {
        profiles: identity.profiles,
        mapSubjects: identity.mapSubjects,
        activeProfile: identity.activeProfile,
        activeSubjectId: identity.activeSubjectId,
        tasks: agenda.tasks,
        events: agenda.events,
        metrics: agenda.getMetrics(),
        documents: healthDocuments.documents,
        insights: getHermesInsights(transits),
        setActiveProfileId: identity.setActiveProfileId,
        addProfile: identity.addProfile,
        ensureLocalUiProfile: identity.ensureLocalUiProfile,
        hydrateProfilesFromStorage: () => {
          identity.refreshFromStorage();
          agenda.refreshFromStorage();
        },
        updateProfile: identity.updateProfile,
      },
      system: {
        status: error ? 'Astronomical engine unavailable' : loading ? 'Calculating' : 'Stable',
        lastSync: new Date(),
      },
      getAiContext,
    };
  }, [liveData, transits, loading, error, getPlanetaryHour, identity, agenda, healthDocuments.documents]);

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};
