import { useState, useEffect, useRef } from 'react';
import { safeInvoke } from '../utils/tauri';
import { calculateFallback } from '../utils/astro-calc';
import { getAspectOrbs, AspectOrb } from '../utils/astro-settings';

const SIGN_MAP: Record<string, string> = {
  Ari: 'Áries', Tau: 'Touro', Gem: 'Gêmeos', Can: 'Câncer',
  Leo: 'Leão', Vir: 'Virgem', Lib: 'Libra', Sco: 'Escorpião',
  Sag: 'Sagitário', Cap: 'Capricórnio', Aqu: 'Aquário', Pis: 'Peixes'
};

const ASPECT_MAP: Record<string, string> = {
  Conjunction: 'Conjunção', Trine: 'Trígono', Square: 'Quadratura',
  Sextile: 'Sextil', Opposition: 'Oposição', Quincunx: 'Inconjunto',
  Quintile: 'Quintil', BiQuintile: 'Bi-Quintil', SemiSextile: 'Semi-Sextil',
  SemiSquare: 'Semi-Quadratura', SesquiQuadrature: 'Sesqui-Quadratura'
};

const REGENT_MAP: Record<string, string> = {
  Sun: 'Sol', Moon: 'Lua', Mercury: 'Mercúrio', Venus: 'Vênus',
  Mars: 'Marte', Jupiter: 'Júpiter', Saturn: 'Saturno'
};

function normalizeAstroData(data: any): any {
  if (!data) return null;
  
  const normalized = { ...data };
  
  if (normalized.planets) {
    normalized.planets = Object.fromEntries(
      Object.entries(normalized.planets).map(([k, v]: [string, any]) => [
        k,
        {
          ...v,
          sign: SIGN_MAP[v.sign] || v.sign,
          element: v.element === 'Fire' ? 'Fogo' : v.element === 'Earth' ? 'Terra' : v.element === 'Air' ? 'Ar' : v.element === 'Water' ? 'Água' : v.element
        }
      ])
    );
  }
  
  if (normalized.aspects) {
    normalized.aspects = normalized.aspects.map((a: any) => ({
      ...a,
      type: ASPECT_MAP[a.type] || a.type
    }));
  }
  
  if (normalized.regence) {
    normalized.regence = {
      day_regent: REGENT_MAP[normalized.regence.day_regent] || normalized.regence.day_regent,
      hour_regent: REGENT_MAP[normalized.regence.hour_regent] || normalized.regence.hour_regent
    };
  }
  
  if (normalized.secondary) {
    normalized.secondary = Object.fromEntries(
      Object.entries(normalized.secondary).map(([k, v]: [string, any]) => [
        k,
        {
          ...v,
          sign: SIGN_MAP[v.sign] || v.sign,
          element: v.element === 'Fire' ? 'Fogo' : v.element === 'Earth' ? 'Terra' : v.element === 'Air' ? 'Ar' : v.element === 'Water' ? 'Água' : v.element
        }
      ])
    );
  }
  
  return normalized;
}

export interface PlanetaryPosition {
  sign: string;
  pos_in_sign: number;
  degree: number;
  element: string;
  house: string | number;
  retrograde: boolean;
}

export interface AstroAspect {
  p1: string;
  p2: string;
  type: string;
  symbol: string;
  orb: number;
  applying?: boolean;
}

export interface LiveAstroData {
  planets: Record<string, PlanetaryPosition>;
  aspects: AstroAspect[];
  houses: number[];
  regence: {
    day_regent: string;
    hour_regent: string;
  };
  moon_phase: {
    phase: string;
    icon: string;
    illumination: number;
  };
  meta: {
    timestamp: string;
    location: { lat: number, lon: number };
  };
  secondary?: Record<string, PlanetaryPosition>;
}

export const useAstrologyData = (natalData?: { Sun: number, Moon: number, ASC: number, Mercury?: number, Venus?: number, Mars?: number }) => {
  const [liveData, setLiveData] = useState<LiveAstroData | null>(null);
  
  // Estabilizar o objeto NATAL usando ref para evitar re-renders desnecessários.
  const NATAL = natalData || { Sun: 269.6, Moon: 196.2, ASC: 321.8, Mercury: 300.5, Venus: 45.2, Mars: 120.8 };
  const natalRef = useRef(NATAL);
  
  const sunVal = NATAL.Sun;
  const moonVal = NATAL.Moon;
  const ascVal = NATAL.ASC;

  useEffect(() => {
    natalRef.current = NATAL;
  }, [sunVal, moonVal, ascVal]);

  const fetchAstro = async () => {
    try {
      let res = await safeInvoke<string>('run_astro_engine');
      if (!res) {
        res = await safeInvoke<string>('read_text_file', { path: 'astro_data.json' });
      }
      
      // Se ainda for nulo (provavelmente rodando no navegador padrão sem Tauri)
      // tenta um fetch direto da pasta public
      if (!res) {
        try {
          const fetchRes = await fetch('/astro_data.json');
          if (fetchRes.ok) {
            res = await fetchRes.text();
          }
        } catch (e) {
          console.warn("Navegador: Falha ao buscar /astro_data.json diretamente.");
        }
      }

      // Último fallback: calcular no browser usando algorithms JavaScript puros
      if (!res) {
        const now = new Date();
        const fallback = await calculateFallback(
          now.getFullYear(),
          now.getMonth() + 1,
          now.getDate(),
          now.getHours(),
          now.getMinutes()
        );
        setLiveData(normalizeAstroData(fallback));
        return;
      }

      if (res) {
        try {
          const parsed = JSON.parse(res);
          if (parsed && !parsed.error) {
            if (parsed.planets) {
              setLiveData(normalizeAstroData(parsed));
            }
          }
        } catch (e) { console.error("Erro ao parsear astro data:", e); }
      }
    } catch (e) { console.error("Erro ao buscar astro data:", e); }
  };

  useEffect(() => {
    fetchAstro();
    const interval = setInterval(fetchAstro, 60000);
    return () => clearInterval(interval);
  }, [sunVal, moonVal, ascVal]);

  const getAspect = (d1: number, d2: number) => {
    const diff = Math.abs(d1 - d2) % 360;
    const dist = diff > 180 ? 360 - diff : diff;
    const orbValue = Math.round(dist * 100) / 100;
    
    const ASPECT_CONFIG = Object.values(getAspectOrbs()) as AspectOrb[];

    for (const asp of ASPECT_CONFIG) {
      if (Math.abs(dist - asp.angle) < asp.orb) {
        return { 
          type: asp.type, 
          icon: asp.symbol, 
          desc: `${asp.type} (orbe: ${orbValue}°)`, 
          orb: orbValue
        };
      }
    }
    return null;
  };

  const getTransits = () => {
    if (!liveData || !liveData.planets) return [];
    const N = natalRef.current;
    const planets = liveData.planets;
    const transitPairs = [
      { p: 'Sun',     n: 'Sun',  d1: planets.Sun?.degree     || 0, d2: N.Sun },
      { p: 'Moon',    n: 'Moon', d1: planets.Moon?.degree    || 0, d2: N.Moon },
      { p: 'Mercury', n: 'Mercury', d1: planets.Mercury?.degree || 0, d2: N.Mercury || 0 },
      { p: 'Venus',   n: 'Venus',   d1: planets.Venus?.degree   || 0, d2: N.Venus   || 0 },
      { p: 'Mars',    n: 'Mars',    d1: planets.Mars?.degree    || 0, d2: N.Mars    || 0 },
      { p: 'Jupiter', n: 'Sun',  d1: planets.Jupiter?.degree || 0, d2: N.Sun },
      { p: 'Jupiter', n: 'Moon', d1: planets.Jupiter?.degree || 0, d2: N.Moon },
      { p: 'Saturn',  n: 'Sun',  d1: planets.Saturn?.degree  || 0, d2: N.Sun },
      { p: 'Saturn',  n: 'Moon', d1: planets.Saturn?.degree  || 0, d2: N.Moon },
      { p: 'Saturn',  n: 'ASC',  d1: planets.Saturn?.degree  || 0, d2: N.ASC },
      { p: 'Uranus',  n: 'Sun',  d1: planets.Uranus?.degree  || 0, d2: N.Sun },
      { p: 'Uranus',  n: 'Moon', d1: planets.Uranus?.degree  || 0, d2: N.Moon },
      { p: 'Neptune', n: 'Sun',  d1: planets.Neptune?.degree || 0, d2: N.Sun },
      { p: 'Pluto',   n: 'Sun',  d1: planets.Pluto?.degree   || 0, d2: N.Sun },
    ];
    return transitPairs.map(t => ({ p: t.p, n: t.n, ...getAspect(t.d1, t.d2) })).filter(t => t.type);
  };

  const getMonthForecast = () => {
    const now = new Date();
    const year = now.getFullYear();
    const msPerDay = 86400000;
    const refNewMoon = new Date(2026, 2, 29, 7, 44);
    const lunarCycle = 29.53 * msPerDay;
    const elapsed = now.getTime() - refNewMoon.getTime();
    const cyclesPassed = Math.ceil(elapsed / lunarCycle);
    const nextNewMoon = new Date(refNewMoon.getTime() + cyclesPassed * lunarCycle);
    const nextFullMoon = new Date(nextNewMoon.getTime() - lunarCycle / 2);
    const upcomingFullMoon = nextFullMoon < now ? new Date(nextFullMoon.getTime() + lunarCycle) : nextFullMoon;

    const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const fmtHour = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const astronomicEvents = [
      { date: new Date(year, 2, 20, 9, 2), event: 'Equinócio (Sol em Áries)', aspect: '☌', desc: 'Sol ingressa em Áries — Ponto Vernal' },
      { date: new Date(year, 5, 21, 3, 57), event: 'Solstício (Sol em Câncer)', aspect: '☌', desc: 'Sol ingressa em Câncer' },
      { date: new Date(year, 8, 22, 19, 19), event: 'Equinócio (Sol em Libra)', aspect: '☌', desc: 'Sol ingressa em Libra' },
      { date: new Date(year, 11, 21, 15, 3), event: 'Solstício (Sol em Capricórnio)', aspect: '☌', desc: 'Sol ingressa em Capricórnio' },
    ].filter(e => e.date > now);

    const events = [
      { date: fmtDate(upcomingFullMoon), hour: fmtHour(upcomingFullMoon), event: 'Lua Cheia', aspect: '☍', desc: 'Oposição Sol/Lua' },
      { date: fmtDate(nextNewMoon),      hour: fmtHour(nextNewMoon),      event: 'Lua Nova',  aspect: '☌', desc: 'Conjunção Sol/Lua' },
      ...astronomicEvents.map(e => ({ date: fmtDate(e.date), hour: fmtHour(e.date), event: e.event, aspect: e.aspect, desc: e.desc })),
    ];

    return events.slice(0, 4);
  };

  const getPlanetaryHour = () => {
    const now = new Date();
    const icons: Record<string, string> = { 'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀', 'Mars': '♂', 'Jupiter': '♃', 'Saturn': '♄' };
    const engToPt: Record<string, string> = { 'Sun': 'Sol', 'Moon': 'Lua', 'Mercury': 'Mercúrio', 'Venus': 'Vênus', 'Mars': 'Marte', 'Jupiter': 'Júpiter', 'Saturn': 'Saturno' };
    
    if (liveData?.regence) {
      const regentEng = liveData.regence.hour_regent;
      const ptName = engToPt[regentEng] || regentEng;
      return { icon: icons[ptName] || icons[regentEng] || '?', name: ptName, time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
    }
    
    const dayOfWeek = (now.getDay() + 1) % 7;
    const dayRegent = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"][dayOfWeek];
    const chaldeanOrder = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
    const startIdx = chaldeanOrder.indexOf(dayRegent);
    const hourIdx = (startIdx + now.getHours()) % 7;
    const regentEng = chaldeanOrder[hourIdx];
    const ptName = engToPt[regentEng] || regentEng;
    
    return { icon: icons[regentEng] || '?', name: ptName, time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
  };

  const getSchedulingSuggestion = () => {
    const regent = getPlanetaryHour().name;
    const suggestions: Record<string, string> = {
      'Sol': 'Ótimo para visibilidade, liderança e começar projetos criativos.',
      'Vênus': 'Excelente para conexões sociais, prazer, beleza e parcerias.',
      'Mercúrio': 'Priorize comunicação, escrita, estudos e resoluções lógicas.',
      'Lua': 'Momento para introspecção, nutrição e assuntos domésticos.',
      'Saturno': 'Foque em disciplina, organização, limites e tarefas pesadas.',
      'Júpiter': 'Ideal para expansão, aprendizado espiritual e abundância.',
      'Marte': 'Ação direta, exercício físico, coragem e competitividade.'
    };
    return suggestions[regent] || 'Siga sua intuição celular.';
  };

  return { 
    liveData, 
    transits: getTransits(), 
    forecast: getMonthForecast(), 
    fetchAstro, 
    NATAL, 
    getPlanetaryHour,
    getSchedulingSuggestion 
  };
};
