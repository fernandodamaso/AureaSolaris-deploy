import { useState, useEffect } from 'react';
import { safeInvoke } from '../utils/tauri';
import { calculateFallback } from '../utils/astro-calc';

const ASPECT_MAP: Record<string, string> = {
  Conjunction: 'Conjunção',
  Opposition: 'Oposição',
  Trine: 'Trígono',
  Square: 'Quadratura',
  Sextile: 'Sextil',
  Quincunx: 'Quincúncio',
  Quintile: 'Quintil',
  BiQuintile: 'Bi-Quintil',
  SemiSextile: 'Semi-Sextil',
  SemiSquare: 'Semi-Quadratura',
  SesquiQuadrature: 'Sesqui-Quadratura',
};

export const useAstroData = (birthData?: any) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payloadStr = birthData ? JSON.stringify(birthData) : JSON.stringify({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
        hour: new Date().getHours() + (new Date().getMinutes() / 60),
        house_system: localStorage.getItem('aurea_house_system') || 'Regiomontanus'
      });

      const result = await safeInvoke<string | null>('run_astro_engine', { payload: payloadStr });
      if (result === null) {
        // Browser fallback: calcular usando algoritmos JavaScript puros
        const birthDataParsed = birthData || {
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          day: new Date().getDate(),
          hour: new Date().getHours() + (new Date().getMinutes() / 60),
        };
        const fallback = await calculateFallback(
          birthDataParsed.year,
          birthDataParsed.month,
          birthDataParsed.day,
          Math.floor(birthDataParsed.hour),
          Math.floor((birthDataParsed.hour % 1) * 60),
          birthDataParsed.lat || -15.7833,
          birthDataParsed.lon || -47.9333,
          birthDataParsed.house_system || 'Regiomontanus'
        );
        setData(fallback);
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(result);
      if (parsed.aspects) {
        parsed.aspects = parsed.aspects.map((asp: any) => ({
          ...asp,
          type: ASPECT_MAP[asp.type] || asp.type,
        }));
      }
      if (parsed.error) {
        setError(parsed.error);
      } else {
        setData(parsed);
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculate();
  }, [JSON.stringify(birthData)]);

  return { data, loading, error, recalculate: calculate };
};
