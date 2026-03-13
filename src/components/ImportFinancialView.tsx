import { useState } from 'react';
import { useAgendaContext } from '../context/AgendaContext';
import { 
  Upload, FileText, 
  X, ArrowLeft, RefreshCw, 
  Trash2, AlertCircle, Save
} from 'lucide-react';

interface ImportFinancialViewProps {
  onBack: () => void;
  onImport: (transactions: any[]) => void;
}

export const ImportFinancialView = ({ onBack, onImport }: ImportFinancialViewProps) => {
  const { addDocument } = useAgendaContext();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    setFiles(newFiles);
    setIsProcessing(true);
    // Simular processamento (Parsing)
    setTimeout(() => {
      setParsedData([
        { id: 'p1', description: 'SUPERMERCADO SOL', amount: 345.20, type: 'expense', category: 'Alimentação', date: '2026-03-10' },
        { id: 'p2', description: 'TRANSFERÊNCIA RECEBIDA', amount: 1200.00, type: 'income', category: 'Extra', date: '2026-03-11' },
        { id: 'p3', description: 'POSTO DE GASOLINA', amount: 210.00, type: 'expense', category: 'Transporte', date: '2026-03-12' },
      ]);
      setIsProcessing(false);
    }, 1500);
  };

  const removeTransaction = (id: string) => {
    setParsedData(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-10 pb-32 animate-in fade-in max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-white/40 p-8 border border-gold/10 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 hover:bg-white rounded-full text-gold transition-all border border-gold/5 shadow-xs">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold">Uncle Duck Logistics</h2>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">Importação de Fluxo Vital</h3>
          </div>
        </div>
        <div className="flex gap-4">
           {parsedData.length > 0 && (
             <button 
               onClick={() => {
                 // Adicionar ao histórico do Alfred Hub
                 if (files[0]) {
                   addDocument({
                     name: files[0].name,
                     type: 'finances',
                     size: (files[0].size / 1024).toFixed(1) + ' KB',
                     path: '#'
                   });
                 }
                 onImport(parsedData);
               }}
               className="px-10 py-4 bg-[#333333] text-white rounded-none font-black uppercase text-[10px] tracking-[0.3em] hover:bg-gold transition-all shadow-xl flex items-center gap-3"
             >
               <Save size={16} /> Consolidar no Patrimônio
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-12">
          {!files.length ? (
            <div 
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              className={`relative border-2 border-dashed p-24 text-center transition-all ${dragActive ? 'border-gold bg-gold/5 scale-[1.01]' : 'border-gold/10 bg-white'}`}
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-gold/5 rounded-full flex items-center justify-center text-gold/40 mb-2">
                  <Upload size={40} className={dragActive ? 'animate-bounce' : ''} />
                </div>
                <div>
                   <h4 className="text-lg font-black text-gray-800 mb-2">Arraste seu extrato bancário (CSV/OFX)</h4>
                   <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Ou clique para selecionar arquivos localmente</p>
                </div>
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gold/10 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
               <div className="p-6 bg-[#FCF9F1] border-b border-gold/5 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <FileText className="text-gold" />
                    <div>
                      <p className="text-[12px] font-black text-gray-800">{files[0].name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Sincronizando com as estrelas...</p>
                    </div>
                  </div>
                  <button onClick={() => { setFiles([]); setParsedData([]); }} className="text-gray-300 hover:text-red-500 transition-all"><X size={18}/></button>
               </div>

               <div>
                  {isProcessing ? (
                    <div className="p-20 flex flex-col items-center gap-4">
                       <RefreshCw className="animate-spin text-gold" size={32} />
                       <p className="text-[11px] font-black uppercase text-gold tracking-widest">O Pato está lendo os números...</p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                       <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                             <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Transação Detectada</th>
                             <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Categoria (Sugestão)</th>
                             <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Valor</th>
                             <th className="px-8 py-4 text-center"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {parsedData.map(tx => (
                            <tr key={tx.id} className="group hover:bg-[#FCF9F1]/40 transition-all">
                               <td className="px-8 py-5">
                                  <div className="flex flex-col">
                                     <span className="text-[13px] font-bold text-gray-800 italic uppercase">"{tx.description}"</span>
                                     <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{tx.date}</span>
                                  </div>
                               </td>
                               <td className="px-8 py-5">
                                  <span className="px-3 py-1 bg-white border border-gold/10 rounded-full text-[9px] font-black text-gold uppercase tracking-widest">{tx.category}</span>
                               </td>
                               <td className={`px-8 py-5 text-right font-black text-[14px] ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-800'}`}>
                                  {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR')}
                               </td>
                               <td className="px-8 py-5 text-center">
                                  <button onClick={() => removeTransaction(tx.id)} className="p-2 text-gray-200 hover:text-red-400 transition-all"><Trash2 size={14}/></button>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                  )}
               </div>

               <div className="p-8 bg-[#FCF9F1]/20 flex items-center gap-4 text-gray-400 border-t border-gold/5">
                  <AlertCircle size={16} className="text-gold/60" />
                  <p className="text-[10px] font-medium leading-relaxed italic">
                    O Uncle Duck utiliza heurísticas avançadas para identificar gastos recorrentes. Verifique cada linha antes de consolidar.
                  </p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
