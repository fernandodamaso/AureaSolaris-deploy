import { useState, useMemo } from 'react';
import { useAstroData } from '../hooks/useAstroData';
import { MandalaChart } from './MandalaChart';
import { RefreshCw, Compass, User, Users } from 'lucide-react';
import { useAgendaContext } from '../context/AgendaContext';

export const MandalaPage = () => {
  const { profiles, activeProfileId } = useAgendaContext();
  const [selectedTarget, setSelectedTarget] = useState<'current' | string>('current');
  
  const activeProfile = useMemo(() => 
    profiles.find(p => p.id === activeProfileId) || profiles[0]
  , [profiles, activeProfileId]);

  const birthData = useMemo(() => {
    if (selectedTarget === 'current') return null;
    if (selectedTarget === 'me') {
       return {
         year: 1985, month: 12, day: 26, hour: 12.0,
         lat: -23.5505, lon: -46.6333
       };
    }
    const conn = activeProfile.connections?.find((c: any) => c.id === selectedTarget);
    if (conn && conn.birthData) {
       const [y, m, d] = conn.birthData.date.split('-').map(Number);
       const [h, min] = conn.birthData.time.split(':').map(Number);
       return {
         year: y, month: m, day: d,
         hour: h + (min / 60),
         lat: conn.birthData.lat, lon: conn.birthData.lng
       };
    }
    return null;
  }, [selectedTarget, activeProfile]);

  const { data, loading, error, recalculate } = useAstroData(birthData);

  // Parse data for MandalaChart
  const chartPlanets = useMemo(() => {
    if (!data?.planets) return [];
    return Object.entries(data.planets).map(([name, info]: [string, any]) => ({
      name,
      degree: info.degree || 0,
      sign: info.sign,
      retrograde: info.retrograde || false,
    }));
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

  return (
    <div className="flex flex-col h-full items-center justify-center gap-6 p-8 overflow-y-auto no-scrollbar">
      <div className="w-full max-w-2xl flex flex-col md:flex-row items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-gold/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#FCF9F1] rounded-2xl border border-gold/10 text-[#B8860B]">
            {selectedTarget === 'current' ? <Compass size={24} /> : <User size={24} />}
          </div>
          <div>
            <h1 className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-800 leading-tight">Mandala Astrológica</h1>
            <p className="text-[9px] font-bold text-[#B8860B] uppercase tracking-widest mt-1">
              {allTargets.find(t => t.id === selectedTarget)?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 outline-none focus:border-gold/30 shadow-sm transition-all"
          >
            {allTargets.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <button
            onClick={recalculate}
            disabled={loading}
            className="p-3 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-[#B8860B] hover:border-gold/20 transition-all shadow-sm disabled:opacity-40"
            title="Sincronizar Estrelas"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[11px] text-red-500 bg-red-50 border border-red-100 rounded-xl px-6 py-4 font-medium max-w-md text-center animate-in shake duration-500">
          ⚠️ {error}
          <br />
          <span className="text-[10px] text-red-400">Verifique se o Python e o kerykeion estão instalados.</span>
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

      {chartPlanets.length > 0 ? (
        <div className="animate-in zoom-in-95 duration-700 bg-white/40 backdrop-blur-sm rounded-[2rem] border border-gold/10 p-6 shadow-sm">
          <MandalaChart
            size={580}
            planets={chartPlanets}
            houses={chartHouses}
            aspects={chartAspects}
          />
        </div>
      ) : !loading && !error ? (
        <div className="text-[11px] text-gray-400 font-medium">
          Nenhum dado astrológico disponível. Clique em recalcular.
        </div>
      ) : null}
    </div>
  );
};
