import { useState, useMemo, useEffect, useRef } from 'react';
import { useAstroData } from '../hooks/useAstroData';
import { MandalaChart } from './MandalaChart';
import { RefreshCw, Compass, User, Users, Plus, Edit3, MessageSquare, FileText } from 'lucide-react';
import { useAgendaContext } from '../context/AgendaContext';
import { BirthForm } from './common/BirthForm';
import { CalculationEvidence } from './common/CalculationEvidence';

type BirthInput = { year: number; month: number; day: number; hour: number; lat: number; lon: number; timezone: string };

// Sem dados confirmados, não há mapa: nunca completar data, hora ou local fictícios.
function readBirthInput(profile: any): BirthInput | null {
  const natal = profile?.natal || {};
  const source = profile?.birthData || natal;
  const date = profile?.birthDate || source?.birthDate || source?.date;
  const time = profile?.birthTime || source?.birthTime || source?.time;
  const lat = Number(source?.lat ?? profile?.lat);
  const lon = Number(source?.lon ?? source?.lng ?? profile?.lon ?? profile?.lng);
  const timezone = source?.timezone ?? source?.birthTimezone ?? profile?.birthTimezone;
  if (typeof date !== 'string' || typeof time !== 'string') return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(hours) || !Number.isInteger(minutes) || month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || typeof timezone !== 'string' || (timezone !== 'UTC' && !timezone.includes('/'))) return null;
  return { year, month, day, hour: hours + (minutes / 60), lat, lon, timezone };
}

export const MandalaPage = () => {
  const { profiles, activeProfileId, addConnection, updateProfile } = useAgendaContext();
  const [selectedTarget, setSelectedTarget] = useState<'current' | string>('me');
  const [showForm, setShowForm] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // O mapa é a visão principal. O Caderno abre apenas por uma ação explícita.
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  
  const activeProfile = useMemo(() => 
    profiles.find(p => p.id === activeProfileId) || profiles[0]
  , [profiles, activeProfileId]);

  const handleSaveConnection = (data: any) => {
    if (editingConnectionId) {
      const updatedConnections = (activeProfile.connections || []).map((c: any) => 
        c.id === editingConnectionId ? { ...c, ...data, birthData: data } : c
      );
      updateProfile(activeProfile.id, { connections: updatedConnections });
    } else {
      addConnection(data.name, data);
    }
    setShowForm(false);
    setEditingConnectionId(null);
  };

  // Observer para redimensionar dinamicamente
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const chartSize = useMemo(() => {
    // Mantém margem para o painel sem cortar os rótulos externos da mandala.
    const idealSize = Math.floor(containerWidth * 0.92);
    return Math.min(Math.max(idealSize, 280), 500);
  }, [containerWidth]);

  const birthData = useMemo<BirthInput | null>(() => {
    if (selectedTarget === 'current') return null;
    if (selectedTarget === 'me') {
       return readBirthInput(activeProfile);
     }
    const conn = activeProfile.connections?.find((c: any) => c.id === selectedTarget);
    return readBirthInput(conn);
  }, [selectedTarget, activeProfile]);

  const calculationEnabled = Boolean(birthData);
  const { data, loading, error, recalculate } = useAstroData(birthData, calculationEnabled);

  // Parse data for MandalaChart - includes planets, secondary bodies, and angles
  const chartPlanets = useMemo(() => {
    if (!data?.planets) return [];
    const allPoints: Array<{
      name: string;
      degree: number;
      sign: string;
      retrograde?: boolean;
      isAngle?: boolean;
    }> = [];

    // Traditional planets + Chiron
    Object.entries(data.planets).forEach(([name, info]: [string, any]) => {
      allPoints.push({
        name,
        degree: info.degree || 0,
        sign: info.sign || '',
        retrograde: info.retrograde || false,
        isAngle: ['ASC', 'MC'].includes(name),
      });
    });

    // Secondary bodies (NorthNode, SouthNode, Lilith, PartOfFortune, Vertex)
    if (data.secondary) {
      Object.entries(data.secondary).forEach(([name, info]: [string, any]) => {
        allPoints.push({
          name,
          degree: info.degree || 0,
          sign: info.sign || '',
          retrograde: false,
        });
      });
    }

    // Angles (ASC, MC, DSC, IC) - DSC and IC calculated
    if (data.angles) {
      Object.entries(data.angles).forEach(([name, deg]: [string, any]) => {
        if (!data.planets[name]) { // Don't duplicate ASC/MC if already in planets
          const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                         'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
          const idx = Math.floor((deg % 360) / 30);
          const pos = deg % 30;
          allPoints.push({
            name,
            degree: deg,
            sign: `${signs[idx]} ${pos.toFixed(0)}°`,
            retrograde: false,
            isAngle: true,
          });
        }
      });
    }

    return allPoints;
  }, [data]);

  const chartHouses = useMemo(() => {
    if (!data?.houses) return [];
    return data.houses.map((h: any, i: number) => ({
      house: i + 1,
      degree: h.degree || 0,
      sign: h.sign,
    }));
  }, [data]);

  const chartAspects = useMemo(() => {
    return data?.aspects || [];
  }, [data]);

  const allTargets = [
    { id: 'current', name: 'Céu Sagrado (Agora)', icon: <Compass size={14}/> },
    { id: 'me', name: `Meu Mapa Natal`, icon: <User size={14}/> },
    ...(activeProfile.connections || []).map((c: any) => ({
      id: c.id, 
      name: `Natal: ${c.name}`, 
      icon: <Users size={14}/> 
    }))
  ];

  const activeTargetLabel = allTargets.find(t => t.id === selectedTarget)?.name || 'Mapa selecionado';

  const openHermesForCurrentMap = () => {
    window.dispatchEvent(new Event('open-hermes-chat'));
    window.dispatchEvent(new CustomEvent('send-hermes-msg', {
      detail: {
        prompt: `Quero estudar ${activeTargetLabel}. Separe com clareza: valores calculados, regra interpretativa, fonte disponível e sua inferência.`,
      },
    }));
  };

  const openCadernoForCurrentMap = () => {
    const auditReceipt = data?.meta?.receipt;
    const receipt = data?.meta
      ? `Cálculo astronômico recebido\n• UTC: ${auditReceipt?.resolved_time?.utc || data.meta.timestamp || 'não informado'}\n• Fuso IANA: ${auditReceipt?.resolved_time?.iana_timezone || 'não informado'}\n• Local: ${data.meta.location?.lat ?? '—'}, ${data.meta.location?.lon ?? '—'}\n• Motor: ${auditReceipt?.engine?.name || 'não informado'} ${auditReceipt?.engine?.version || ''}\n• Hash da entrada: ${auditReceipt?.input_hash || 'não informado'}`
      : 'Cálculo astronômico: indisponível — não registrar interpretação como fato.';
    window.dispatchEvent(new CustomEvent('open-caderno-vivo', {
      detail: {
        type: 'create-study',
        topic: activeTargetLabel,
        seedNote: `Origem: ${activeTargetLabel}\n\n${receipt}\n\nRegra interpretativa: a selecionar\nFonte: a selecionar\nInferência Hermes: a solicitar\n\nMinha anotação:`,
      },
    }));
  };

  return (
    <div className="flex h-full min-w-0 overflow-hidden w-full">
      <div ref={containerRef} className="flex flex-1 min-w-0 flex-col h-full items-center justify-start gap-6 p-4 md:p-8 overflow-y-auto no-scrollbar transition-all duration-500">
        <div className="w-full flex flex-wrap items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-5 rounded-[2rem] border border-gold/10 shadow-sm transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#FCF9F1] rounded-2xl border border-gold/10 text-[#c5a059]">
            {selectedTarget === 'current' ? <Compass size={24} /> : <User size={24} />}
          </div>
          <div>
            <h1 className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-800 leading-tight">Mandala Astrológica</h1>
            <p className="text-[9px] font-bold text-[#c5a059] uppercase tracking-widest mt-1">
              {allTargets.find(t => t.id === selectedTarget)?.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0" aria-label="Ações do mapa">
          <button
            onClick={() => {
              setEditingConnectionId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-gold/10 bg-[#FCF9F1] px-3 py-2.5 text-[#c5a059] shadow-sm transition-all hover:-translate-y-px hover:bg-gold/5 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 shrink-0"
            title="Adicionar Novo Mapa"
          >
            <Plus size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Mapa</span>
          </button>

          <label className="flex flex-col gap-0.5 rounded-xl border border-gray-100 bg-white px-3 py-1.5 shadow-sm transition-colors focus-within:border-gold/40 focus-within:ring-2 focus-within:ring-[#c5a059]/20 shrink-0">
            <span className="text-[8px] font-black uppercase tracking-[0.14em] text-gray-400">Mapa em foco</span>
            <select 
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-700 outline-none"
              aria-label="Mapa em foco"
            >
              {allTargets.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>

          {selectedTarget !== 'current' && selectedTarget !== 'me' && (
            <button
              onClick={() => {
                setEditingConnectionId(selectedTarget);
                setShowForm(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-gray-500 shadow-sm transition-all hover:-translate-y-px hover:border-gold/20 hover:text-[#c5a059] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 shrink-0"
              title="Editar Dados do Mapa"
            >
              <Edit3 size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Editar</span>
            </button>
          )}

          <button
            onClick={openCadernoForCurrentMap}
            className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-gray-500 shadow-sm transition-all hover:-translate-y-px hover:border-gold/20 hover:text-gold hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 shrink-0"
            title="Criar estudo no Caderno Vivo a partir deste mapa"
          >
            <FileText size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Estudar no Caderno</span>
          </button>

          <button
            onClick={openHermesForCurrentMap}
            className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-gray-500 shadow-sm transition-all hover:-translate-y-px hover:border-gold/20 hover:text-gold hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 shrink-0"
            title="Abrir Hermes com este mapa em foco"
          >
            <MessageSquare size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Tutor IA</span>
          </button>

          <button
            onClick={recalculate}
            disabled={loading || !birthData}
            aria-label={loading ? 'Calculando mapa' : birthData ? 'Atualizar cálculo do mapa' : 'Complete os dados de nascimento para calcular'}
            className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-gray-500 shadow-sm transition-all hover:-translate-y-px hover:border-gold/20 hover:text-[#c5a059] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none shrink-0"
            title={birthData ? 'Atualizar cálculo' : 'Data, hora, coordenadas e fuso são obrigatórios'}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">{loading ? 'Calculando' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <CalculationEvidence meta={data?.meta} loading={loading} error={error} />
      </div>

      {error && (
        <div className="text-[11px] text-red-500 bg-red-50 border border-red-100 rounded-xl px-6 py-4 font-medium max-w-md text-center animate-in shake duration-500">
          ⚠️ {error}
          <br />
           <span className="text-[10px] text-red-400">Confira o serviço local e os dados declarados no recibo.</span>
        </div>
      )}

       {!birthData && !loading && (
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-[11px] font-medium text-amber-900">
           Este mapa não foi calculado: faltam dados de nascimento confirmados. Informe data, hora, local, coordenadas e fuso IANA antes de gerar uma mandala.
        </div>
      )}

      {loading && !data && (
        <div className="h-[580px] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-gold/10 border-t-gold rounded-full animate-spin" />
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] animate-pulse">
            Sintonizando Esferas Celestes...
          </div>
        </div>
      )}

       {chartPlanets.length > 0 && birthData ? (
        <div className="w-full max-w-[580px] animate-in zoom-in-95 duration-700 bg-white/40 backdrop-blur-sm rounded-[2rem] border border-gold/10 p-2 sm:p-5 shadow-lg relative transition-all">
          <MandalaChart
            size={chartSize}
            planets={chartPlanets}
            houses={chartHouses}
            aspects={chartAspects}
            showPanel={showDetails}
          />
          <button
            type="button"
            onClick={() => setShowDetails(value => !value)}
            className="mx-auto mt-4 flex rounded-xl border border-gold/20 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 transition hover:border-gold/50 hover:text-[#c5a059]"
            aria-expanded={showDetails}
          >
            {showDetails ? 'Ocultar dados técnicos' : 'Ver dados técnicos do mapa'}
          </button>
        </div>
      ) : !loading && !error ? (
        <div className="text-[11px] text-gray-400 font-medium">
           Nenhum dado astrológico disponível para este mapa.
        </div>
      ) : null}

      {showForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
           <BirthForm 
             title={editingConnectionId ? "Editar Mapa" : "Adicionar Mapa"}
             initialData={editingConnectionId ? activeProfile.connections?.find((c: any) => c.id === editingConnectionId)?.birthData : undefined}
             onSave={handleSaveConnection} 
             onClose={() => {
               setShowForm(false);
               setEditingConnectionId(null);
             }} 
           />
        </div>
      )}
      </div>

    </div>
  );
};
