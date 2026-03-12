import { useState, useEffect } from 'react';
import { safeInvoke } from '../utils/tauri';

export const useAstrologyData = () => {
  const [liveData, setLiveData] = useState<any>(null);
  const NATAL = { Sun: 269.6, Moon: 196.2, ASC: 321.8 };

  const fetchAstro = async () => {
    try {
      let res = await safeInvoke<string>('run_astro_engine');
      if (!res) {
        const path = "C:\\AureaSolaris\\astro_data.json";
        res = await safeInvoke<string>('read_text_file', { path });
      }
      if (res) {
        try {
          const parsed = JSON.parse(res);
          if (parsed && !parsed.error) setLiveData(parsed);
        } catch(e) {}
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchAstro();
  }, []);

  const getAspect = (d1: number, d2: number) => {
    const diff = Math.abs(d1 - d2) % 360;
    const dist = diff > 180 ? 360 - diff : diff;
    if (dist < 8) return { type: 'Conj.', icon: '☌', desc: 'Conjunção (Foco e Intensidade)' };
    if (Math.abs(dist - 180) < 8) return { type: 'Opos.', icon: '☍', desc: 'Oposição (Tensão e Polaridade)' };
    if (Math.abs(dist - 120) < 8) return { type: 'Trig.', icon: '△', desc: 'Trígono (Harmonia e Fluidez)' };
    if (Math.abs(dist - 90) < 6) return { type: 'Quad.', icon: '□', desc: 'Quadrado (Desafio e Atômico)' };
    if (Math.abs(dist - 60) < 4) return { type: 'Sext.', icon: '＊', desc: 'Sextil (Oportunidade)' };
    return null;
  };

  const getTransits = () => {
    if (!liveData) return [];
    return [
      { p: 'Sun', n: 'Sun', ...getAspect(liveData.Sun?.degree || 0, NATAL.Sun) },
      { p: 'Jupiter', n: 'Moon', ...getAspect(liveData.Jupiter?.degree || 0, NATAL.Moon) },
      { p: 'Saturn', n: 'ASC', ...getAspect(liveData.Saturn?.degree || 0, NATAL.ASC) }
    ].filter(t => t.type);
  };

  const getMonthForecast = () => [
    { date: '14/03', hour: '13:52', event: 'Lua Cheia em Virgem', aspect: '☍', desc: 'Oposição Sol/Lua' },
    { date: '20/03', hour: '09:02', event: 'Equinócio de Outono', aspect: '☌', desc: 'Ingresso do Sol em Áries' },
    { date: '25/03', hour: '18:30', event: 'Vênus em Touro', aspect: 'Trig', desc: 'Trígono com seu Mercúrio' },
    { date: '29/03', hour: '07:44', event: 'Lua Nova em Áries', aspect: '☌', desc: 'Conjunto ao Natal' }
  ];

  const getPlanetaryHour = () => {
    const now = new Date();
    const hour = now.getHours();
    const dayRegents = [6, 1, 2, 3, 4, 5, 0]; // Sun=0, Mon=1, etc.
    const chaldeanOrder = [0, 5, 3, 1, 6, 2, 4]; // Sun, Ven, Mer, Moon, Sat, Jup, Mars
    const dayRegent = dayRegents[now.getDay()];
    const startIndex = chaldeanOrder.indexOf(dayRegent);
    const hourRegentIndex = (startIndex + hour) % 7;
    const icons = ['☉', '♀', '☿', '☽', '♄', '♃', '♂'];
    const names = ['Sol', 'Vênus', 'Mercúrio', 'Lua', 'Saturno', 'Júpiter', 'Marte'];
    
    return { icon: icons[hourRegentIndex], name: names[hourRegentIndex], time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
  };

  return { liveData, transits: getTransits(), forecast: getMonthForecast(), fetchAstro, NATAL, getPlanetaryHour };
};
