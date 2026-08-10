import { useState, useEffect } from 'react';
import { safeInvoke } from '../utils/tauri';

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

export const useAstroData = (birthData?: any, enabled = true) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const payloadStr = birthData ? JSON.stringify(birthData) : JSON.stringify({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
        hour: new Date().getHours() + (new Date().getMinutes() / 60),
        house_system: localStorage.getItem('aurea_house_system') || 'Regiomontanus'
      });

      let result: string | null = null;
      
      // Try direct HTTP to sidecar first (works in both Tauri and browser dev mode)
      try {
        const res = await fetch('http://127.0.0.1:9876/natal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadStr,
        });
        if (res.ok) result = await res.text();
      } catch { /* sidecar not reachable, fall through */ }
      
      // Fallback to Tauri invoke
      if (!result) {
        result = await safeInvoke<string | null>('run_astro_engine', { payload: payloadStr });
      }

      if (result === null) {
        setError('Motor astrológico indisponível. O mapa não será estimado. Verifique o serviço local e tente novamente.');
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
      } else if (!parsed.meta?.receipt) {
        setData(null);
        setError('O motor respondeu sem recibo auditável. Nenhuma mandala será exibida.');
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
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    calculate();
  }, [JSON.stringify(birthData), enabled]);

  return { data, loading, error, recalculate: calculate };
};
