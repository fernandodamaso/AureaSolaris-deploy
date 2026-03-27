import { useState, useMemo, useEffect, useRef } from 'react';
import { useAstroData } from '../hooks/useAstroData';
import { MandalaChart } from './MandalaChart';
import { RefreshCw, Compass, User, Users, Plus, Edit3 } from 'lucide-react';
import { useAgendaContext } from '../context/AgendaContext';
import { BirthForm } from './common/BirthForm';

export const MandalaPage = () => {
  const { profiles, activeProfileId, addConnection, updateProfile } = useAgendaContext();
  const [selectedTarget, setSelectedTarget] = useState<'current' | string>('current');
  const [showForm, setShowForm] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  
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
    // Calculamos o tamanho ideal (90% da largura, com limites)
    const idealSize = Math.floor(containerWidth * 0.95);
    return Math.min(Math.max(idealSize, 400), 1200);
  }, [containerWidth]);

  const birthData = useMemo(() => {
    if (selectedTarget === 'current') return null;
    if (selectedTarget === 'me') {
       const bd = activeProfile?.birthData;
       if (bd) {
         const [y, m, d] = String(bd.date || '1989-12-21').split('-').map(Number);
         const [h, min] = String(bd.time || '10:32').split(':').map(Number);
         return {
           year: y || 1989,
           month: m || 12,
           day: d || 21,
           hour: (h || 10) + ((min || 32) / 60),
           lat: bd.lat ?? -15.7833,
           lon: bd.lng ?? -47.9333,
         };
       }
       return {
         year: 1989, month: 12, day: 21, hour: 10.533,
         lat: -15.7833, lon: -47.9333
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

  return (
    <div ref={containerRef} className="flex flex-col h-full items-center justify-start gap-8 p-4 md:p-8 overflow-y-auto no-scrollbar transition-all duration-500">
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-gold/10 shadow-sm transition-all">
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingConnectionId(null);
              setShowForm(true);
            }}
            className="p-3 bg-[#FCF9F1] border border-gold/10 rounded-xl text-[#c5a059] hover:bg-gold/5 transition-all shadow-sm"
            title="Adicionar Novo Mapa"
          >
            <Plus size={16} />
          </button>

          <select 
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 outline-none focus:border-gold/30 shadow-sm transition-all"
          >
            {allTargets.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {selectedTarget !== 'current' && selectedTarget !== 'me' && (
            <button
              onClick={() => {
                setEditingConnectionId(selectedTarget);
                setShowForm(true);
              }}
              className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-[#c5a059] shadow-sm transition-all"
              title="Editar Dados do Mapa"
            >
              <Edit3 size={16} />
            </button>
          )}

          <button
            onClick={recalculate}
            disabled={loading}
            className="p-3 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-[#c5a059] hover:border-gold/20 transition-all shadow-sm disabled:opacity-40"
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
        <div className="animate-in zoom-in-95 duration-700 bg-white/40 backdrop-blur-sm rounded-[3rem] border border-gold/10 p-4 md:p-10 shadow-lg relative transition-all" style={{ width: chartSize + 80 }}>
          <MandalaChart
            size={chartSize}
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
  );
};
