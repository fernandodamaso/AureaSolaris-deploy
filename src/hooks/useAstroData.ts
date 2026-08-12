import { useState, useEffect, useCallback, useMemo } from 'react';
import { safeInvoke } from '../utils/tauri';
import { readCertifiedCalculation } from '../utils/certifiedCalculation';
import { LOCAL_API_URL } from '../utils/api';

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

const STARTUP_RETRY_DELAYS_MS = [0, 250, 750, 1500, 2500];

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

async function requestNatalFromSidecar(payload: string): Promise<string | null> {
  // The packaged FastAPI sidecar starts alongside the desktop application and
  // can take a few seconds to unpack on first launch.  Retrying the service
  // never manufactures a chart: it only waits for the certified local engine.
  for (const delay of STARTUP_RETRY_DELAYS_MS) {
    if (delay) await wait(delay);
    try {
      const response = await fetch(`${LOCAL_API_URL}/natal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (response.ok) return await response.text();
    } catch {
      // Tauri IPC is attempted below for desktop-origin restrictions.
    }
  }
  return null;
}

function hasDisplayableNatalShape(value: any): boolean {
  const requiredPoints = ['Sun', 'Moon', 'ASC', 'MC'];
  const hasDegree = (point: unknown) => {
    const degree = (point as { degree?: unknown } | null)?.degree;
    return typeof degree === 'number' && Number.isFinite(degree) && degree >= 0 && degree < 360;
  };

  return requiredPoints.every((name) => hasDegree(value?.planets?.[name])) &&
    Array.isArray(value?.houses) && value.houses.length === 12 &&
    value.houses.every((house: unknown) => hasDegree(house));
}

export const useAstroData = (birthData?: any, enabled = true) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const birthDataKey = useMemo(() => JSON.stringify(birthData ?? null), [birthData]);

  const calculate = useCallback(async () => {
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
      
      // Try direct HTTP first (works in both Tauri and browser dev mode).
      result = await requestNatalFromSidecar(payloadStr);
      
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
      } else if (!readCertifiedCalculation(parsed, 'natal')) {
        setData(null);
        setError('O motor respondeu sem recibo auditável. Nenhuma mandala será exibida.');
      } else if (!hasDisplayableNatalShape(parsed)) {
        setData(null);
        setError('O recibo natal não contém os pontos e casas necessários para desenhar uma mandala confiável.');
      } else {
        setData(parsed);
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }, [birthData]);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    calculate();
  }, [birthDataKey, enabled, calculate]);

  return { data, loading, error, recalculate: calculate };
};
