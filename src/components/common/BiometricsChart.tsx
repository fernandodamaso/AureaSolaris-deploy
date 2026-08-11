import { useState } from 'react';
import { useSaudeData } from '../../context/SaudeContext';

export const BiometricsChart = () => {
  const { biometrics } = useSaudeData();
  const [view, setView] = useState<'week' | 'month'>('week');

  const points = (view === 'week' ? biometrics.slice(-7) : biometrics.slice(-30)).map((b) => ({
    date: b.dateStr.substring(8, 10),
    sleep: b.sleepHours,
    mood: b.mood === 'Ótimo' ? 10 : b.mood === 'Bom' ? 8 : 5,
    energy: b.energyLevel,
  }));

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-700">Vitalidade</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('week')}
            className={`rounded px-3 py-1 text-[10px] font-semibold ${
              view === 'week' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setView('month')}
            className={`rounded px-3 py-1 text-[10px] font-semibold ${
              view === 'month' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Mês
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-amber-900/10 bg-white p-4">
        <p className="text-[11px] text-gray-500">
          Registros: {points.length} · Sono, humor e energia (placeholder visual).
        </p>
      </div>
    </div>
  );
};
