import { useState, useEffect } from 'react';
import { safeInvoke } from '../utils/tauri';

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
        hour: new Date().getHours() + (new Date().getMinutes() / 60)
      });

      const result = await safeInvoke<string | null>('run_astro_engine', { payload: payloadStr });
      if (result === null) {
        throw new Error("O motor não respondeu (provável erro interno no Python ou Rust).");
      }
      const parsed = JSON.parse(result);
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
