import { useState, useEffect, useRef } from 'react';
import { safeInvoke } from '../utils/tauri';
import { calculateFallback } from '../utils/astro-calc';

export const useTransitData = (birthData?: any, includeAsteroids = false) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const CACHE_DURATION = 60 * 1000;

  const calculate = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastUpdateRef.current < CACHE_DURATION && data) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const currentTime = new Date();
      const payload = {
        year: currentTime.getFullYear(),
        month: currentTime.getMonth() + 1,
        day: currentTime.getDate(),
        hour: currentTime.getHours() + (currentTime.getMinutes() / 60),
        lat: birthData?.lat || -15.7833,
        lon: birthData?.lon || -47.9333,
        include_asteroids: includeAsteroids,
        transit: true,
      };

      const payloadStr = JSON.stringify(payload);
      const result = await safeInvoke<string | null>('get_transit_positions', { payload: payloadStr });

      if (result === null) {
        const fallback = await calculateFallback(
          payload.year, payload.month, payload.day,
          Math.floor(payload.hour), Math.floor((payload.hour % 1) * 60),
          payload.lat, payload.lon, 'Regiomontanus'
        );
        setData({
          planets: fallback.planets,
          secondary: fallback.secondary,
          moon_phase: fallback.moon_phase,
        });
        lastUpdateRef.current = Date.now();
      } else {
        const parsed = JSON.parse(result);
        if (parsed.error) {
          setError(parsed.error);
        } else {
          setData(parsed);
          lastUpdateRef.current = Date.now();
        }
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    lastUpdateRef.current = 0;
    calculate(true);
  }, [birthData, includeAsteroids]);

  return { data, loading, error, recalculate: () => calculate(true) };
};
