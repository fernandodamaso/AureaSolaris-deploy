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
    if (dist < 8) return { type: 'Conj.', desc: 'Conjunção (Foco e Intensidade)' };
    if (Math.abs(dist - 180) < 8) return { type: 'Opos.', desc: 'Oposição (Tensão e Polaridade)' };
    if (Math.abs(dist - 120) < 8) return { type: 'Trig.', desc: 'Trígono (Harmonia e Fluidez)' };
    if (Math.abs(dist - 90) < 6) return { type: 'Quad.', desc: 'Quadrado (Desafio e Atômico)' };
    if (Math.abs(dist - 60) < 4) return { type: 'Sext.', desc: 'Sextil (Oportunidade)' };
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

  return { liveData, transits: getTransits(), fetchAstro, NATAL };
};
