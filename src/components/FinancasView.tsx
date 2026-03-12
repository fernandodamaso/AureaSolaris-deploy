import { FileJson, Upload } from 'lucide-react';
import { Card, Advice, StatBox } from './common/UIComponents';

const TrendingUp = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

export const FinancasView = () => (
  <div className="space-y-12 pb-32 animate-in fade-in">
    <Advice agent="Uncle Duck" content="Quá! Patrimônio crescendo 1.2% este mês. Recomendo aporte no CDI dia 18 para aproveitar o timing astral." />
    
    <div className="grid grid-cols-3 gap-8">
       <StatBox label="Saldo Mestre" val="R$ 42.100" />
       <StatBox label="Entradas (Mês)" val="+ R$ 8.400" />
       <StatBox label="Saídas (Mês)" val="- R$ 3.120" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card title="Registros e Extratos" icon={<FileJson size={18}/>}>
            <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-gray-50"><span className="text-[13px] font-medium text-gray-700">Curso de Astrologia Tradicional</span><span className="text-red-500 font-bold">-R$ 89,00</span></div>
                <button className="w-full py-4 mt-3 border border-dashed border-gold/30 text-gold text-[10px] font-bold uppercase rounded-xl hover:bg-[#FCF9F1] flex items-center justify-center gap-2 transition-all"><Upload size={14}/> Importar Extrato</button>
            </div>
        </Card>
        <Card title="Astrologia do Ouro (Timing de Rafiki)">
            <div className="space-y-4">
                <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col gap-3">
                    <h5 className="flex items-center gap-2 text-[9px] font-black text-emerald-700 uppercase tracking-[0.2em]"><TrendingUp size={14}/> Datas de Alta</h5>
                    <div className="flex justify-between text-[12px] font-bold text-emerald-800"><span>18 Mar (Vênus △ Júp)</span><span className="text-emerald-600 uppercase tracking-widest text-[10px] opacity-70">Excelente</span></div>
                </div>
            </div>
        </Card>
    </div>
  </div>
);
