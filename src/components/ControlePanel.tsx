import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Clock, Brain, Activity, Settings, X } from 'lucide-react';
import { Card, SectionTitle } from './common/UIComponents';

const HardwareRow = ({ label, val, icon }: { label: string, val: string, icon: React.ReactNode }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-none px-1">
    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
      <div className="p-2 bg-[#FCF9F1] rounded-lg text-[#B8860B]">{icon}</div> {label}
    </div>
    <div className="text-[12px] font-bold text-gray-800">{val}</div>
  </div>
);

export const ControlePanel = () => {
  const [editing, setEditing] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ uptime: '---', latency: '---', memory: '---', cpu: '---' });

  useEffect(() => {
    // Mocking real metrics
    setMetrics({
      uptime: '4d 12h',
      latency: '24ms',
      memory: '1.2GB / 16GB',
      cpu: '4% (Aurea Idle)'
    });
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in pb-20">
      <SectionTitle>Métricas de Sistema (Stark Lab)</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card title="Recursos do Núcleo" icon={<Cpu size={14}/>}>
            <div className="space-y-1">
               <HardwareRow label="Latência API" val={metrics.latency} icon={<Zap size={14}/>} />
               <HardwareRow label="Uptime Sistema" val={metrics.uptime} icon={<Clock size={14}/>} />
               <HardwareRow label="Uso de Memória" val={metrics.memory} icon={<Brain size={14}/>} />
               <HardwareRow label="Carregamento CPU" val={metrics.cpu} icon={<Activity size={14}/>} />
            </div>
         </Card>
      </div>

      <SectionTitle>Painel de Controle (Alma dos Agentes)</SectionTitle>
      <div className="grid grid-cols-2 gap-6">
         {['Rafiki', 'Alfred', 'Stark', 'Uncle Duck'].map(n => (
           <div key={n} onClick={() => setEditing(n)} className="p-7 bg-white border border-gray-100 rounded-3xl cursor-pointer hover:border-gold transition-all shadow-sm group">
              <div className="flex justify-between items-center mb-3">
                 <h5 className="font-bold text-gray-800 tracking-tight uppercase text-[12px]">{n}</h5>
                 <Settings size={14} className="text-gray-300 group-hover:text-gold transition-all" />
              </div>
              <p className="text-[12px] text-gray-400 font-medium">Clique para moldar o comportamento e diretrizes comportamentais.</p>
           </div>
         ))}
      </div>
      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 font-sans">
           <div className="bg-white rounded-[2.5rem] p-12 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 border border-gold/20">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                 <h3 className="font-sans text-xl font-bold uppercase tracking-widest text-gray-800">Forjar Alma: {editing}</h3>
                 <X onClick={() => setEditing(null)} className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors"/>
              </div>
              <textarea className="w-full h-80 bg-gray-50 p-6 rounded-3xl outline-none focus:border-gold/50 border border-gray-100 text-[14px] leading-relaxed font-sans font-medium" defaultValue={`Instruções mestras para ${editing}...`} />
              <div className="flex justify-end mt-8"><button onClick={() => setEditing(null)} className="px-12 py-4 bg-[#333333] text-white rounded-full font-bold text-[11px] uppercase tracking-widest hover:bg-gold transition-all shadow-xl">Gravar Alma</button></div>
           </div>
        </div>
      )}
    </div>
  );
};
