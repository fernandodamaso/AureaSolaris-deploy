import { FileText, Star, Heart, Brain, Activity } from 'lucide-react';
import { Card, SectionTitle, Advice, FileItem, RoutineItem, TodoRow } from './common/UIComponents';

export const SaudeView = () => (
  <div className="space-y-12 pb-32 animate-in fade-in max-w-5xl mx-auto">
    <Advice agent="Alfred" content="Viviane, monitorei seu ciclo de puerpério. Marte na sua 6ª casa natal sugere risco de fadiga cervical; priorize o descanso hoje." />
    
    <SectionTitle>A. Fluxo de Vitalidade & Laudos</SectionTitle>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <Card title="Arquivo de Laudos & Dietas" icon={<FileText size={18}/>}>
          <div className="space-y-1 mt-4">
             <FileItem name="Hemograma_Vivi_Mar.pdf" date="10 Mar" />
             <FileItem name="Dieta_Nutri_Puerperio.pdf" date="05 Mar" />
             <button className="w-full py-4 mt-4 border border-dashed border-[#B8860B]/20 text-[#B8860B] text-[10px] font-bold uppercase rounded-xl hover:bg-[#FCF9F1] transition-all">Upload Novo Documento</button>
          </div>
       </Card>
       <Card title="Astrologia Médica (Hyleg)" icon={<Star size={18}/>}>
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 mb-4 shadow-xs">
             <h5 className="text-[9px] font-black uppercase text-emerald-700 mb-2 tracking-[0.2em]">Sol em Sagitário (Doador)</h5>
             <p className="text-[12px] text-emerald-800 leading-relaxed font-bold">Júpiter atua como Alcocoden, garantindo regeneração rápida, mas sensível a excessos.</p>
          </div>
       </Card>
    </div>

    <SectionTitle>B. Rotina & Hábitos de Cura</SectionTitle>
    <Card title="Hábitos Diários" icon={<Heart size={18}/>}>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 mt-4">
          <div className="space-y-4">
             <RoutineItem name="Vitamina D (Aurora)" time="08:00" />
             <RoutineItem name="Probiótico (Benício)" time="08:30" />
          </div>
          <div className="space-y-3 pt-4 md:pt-0">
             <TodoRow label="Meditação UDV (30min)" checked={true} />
             <TodoRow label="Ingestão de Água (3L)" checked={false} />
          </div>
       </div>
    </Card>

    <SectionTitle>C. Pílulas de Autocuidado</SectionTitle>
    <div className="panel-light p-8 bg-white shadow-sm border border-gold/5 rounded-xl">
       <ul className="text-[12px] text-gray-700 space-y-5 font-bold">
          <li className="flex gap-4 items-start"><span className="p-2 bg-[#FCF9F1] rounded-lg text-gold shadow-xs"><Brain size={16}/></span> <div className="leading-relaxed"><span className="text-gold uppercase text-[10px] block mb-1 tracking-widest">Alquimia Lunar</span> Chá de Camomila ativa a energia lunar receptiva necessária para o equilíbrio emocional agora.</div></li>
          <li className="flex gap-4 items-start"><span className="p-2 bg-[#FCF9F1] rounded-lg text-gold shadow-xs"><Activity size={16}/></span> <div className="leading-relaxed"><span className="text-gold uppercase text-[10px] block mb-1 tracking-widest">Fisiologia Astral</span> O Sol em Sagitário rege a região lombar; realize alongamentos suaves para circular o fogo interno.</div></li>
       </ul>
    </div>
  </div>
);
