import { useState } from 'react';
import { 
  FileJson, Upload, TrendingUp, TrendingDown, 
  Plus, Target, DollarSign, Wallet, ArrowUpRight, 
  Trash2, X, ChevronRight
} from 'lucide-react';
import { Card, Advice, StatBox } from './common/UIComponents';
import { useFinancasData } from '../hooks/useFinancasData';

export const FinancasView = () => {
  const { transactions, goals, stats, addTransaction, deleteTransaction } = useFinancasData();
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({ description: '', amount: '', type: 'expense' as const, category: 'Geral' });

  const handleAdd = () => {
    if (!newTx.description || !newTx.amount) return;
    addTransaction({
      description: newTx.description,
      amount: Number(newTx.amount),
      type: newTx.type,
      date: new Date().toISOString().split('T')[0],
      category: newTx.category
    });
    setNewTx({ description: '', amount: '', type: 'expense', category: 'Geral' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-10 pb-32 animate-in fade-in max-w-7xl mx-auto">
      <Advice 
        agent="Uncle Duck" 
        content={`Quá! Seu Saldo Mestre é de R$ ${stats.balance.toLocaleString('pt-BR')}. O fluxo de este mês está saudável com +R$ ${stats.incomes.toLocaleString('pt-BR')} em entradas.`} 
      />
      
      {/* HEADER STATS - Geometria mais reta/sofisticada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-8 border border-gold/10 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 -rotate-45 translate-x-16 -translate-y-16" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">Capital Disponível</p>
            <h3 className="text-3xl font-black text-gray-800">R$ {stats.balance.toLocaleString('pt-BR')}</h3>
            <Wallet className="absolute bottom-6 right-6 text-gold/10 group-hover:text-gold/20 transition-all" size={40} />
         </div>
         <div className="bg-white p-8 border border-gold/10 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-2 text-emerald-600">
               <TrendingUp size={14}/>
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Entradas Totais</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">+ R$ {stats.incomes.toLocaleString('pt-BR')}</h3>
         </div>
         <div className="bg-white p-8 border border-gold/10 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-2 text-red-400">
               <TrendingDown size={14}/>
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Saídas Totais</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">- R$ {stats.expenses.toLocaleString('pt-BR')}</h3>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* TRANSACTIONS COLUMN */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center mb-4">
             <h4 className="text-[14px] font-black uppercase tracking-[0.4em] text-gray-800">Fluxo de Caixa</h4>
             <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-6 py-2 bg-[#333333] text-white text-[10px] font-black uppercase tracking-widest hover:bg-gold transition-all shadow-lg">
                <Plus size={14}/> Novo Registro
             </button>
          </div>

          <div className="bg-white border border-gold/5 shadow-xl overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-20 text-center opacity-30 italic font-medium">Nenhum registro encontrado nas estrelas.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#FCF9F1] border-b border-gold/10">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Descrição</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Valor</th>
                    <th className="px-6 py-4 text-center"><X size={10} className="opacity-0"/></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="group hover:bg-gray-50 transition-all">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-gray-800">{tx.description}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{tx.category} • {new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-5 text-right font-black text-[14px] ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-800'}`}>
                        {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button onClick={() => deleteTransaction(tx.id)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all">
                          <Trash2 size={14}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="p-4 bg-[#FCF9F1]/50 border-t border-gold/5">
                <button className="w-full py-4 border border-dashed border-gold/20 text-gold text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white transition-all">
                   <Upload size={14}/> Importar Extrato Bancário
                </button>
            </div>
          </div>
        </div>

        {/* GOALS & TIMING COLUMN */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* RESERVAS DE OURO */}
          <div className="bg-white border border-gold/10 p-8 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-gold/10 rounded-lg text-gold"><Target size={20}/></div>
                   <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-800">Reservas de Ouro</h4>
                </div>
                <ArrowUpRight size={16} className="text-gray-300 cursor-pointer hover:text-gold" />
             </div>
             
             <div className="space-y-8">
                {goals.map(goal => {
                  const percent = Math.round((goal.current / goal.target) * 100);
                  return (
                    <div key={goal.id} className="space-y-3">
                       <div className="flex justify-between items-end">
                          <div>
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{goal.name}</p>
                             <p className="text-[13px] font-black text-gray-800">R$ {goal.current.toLocaleString('pt-BR')} <span className="text-xs font-bold text-gray-400">/ R$ {goal.target.toLocaleString('pt-BR')}</span></p>
                          </div>
                          <span className="text-[11px] font-black text-gold">{percent}%</span>
                       </div>
                       <div className="h-2 w-full bg-gray-100 overflow-hidden">
                          <div 
                            className="h-full bg-gold transition-all duration-1000" 
                            style={{ width: `${percent}%`, backgroundColor: goal.color }}
                          />
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>

          {/* ASTRO TIMING */}
          <div className="bg-[#333333] p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-5"><DollarSign size={80} className="text-white"/></div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold mb-6 border-b border-white/10 pb-4 flex items-center gap-2">
                <ChevronRight size={14}/> Timing de Rafiki
             </h4>
             <div className="space-y-4 relative z-10">
                <div className="p-5 bg-white/5 border border-white/5 flex flex-col gap-2 hover:bg-white/10 transition-all cursor-pointer">
                   <div className="flex justify-between items-center text-white">
                      <span className="text-[13px] font-bold">18 Mar • Vênus △ Júpiter</span>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest">Excelente</span>
                   </div>
                   <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Momento ideal para aportes em ativos de expansão ou fechamento de contratos de longo prazo.</p>
                </div>
                <div className="p-5 bg-white/5 border border-white/5 flex flex-col gap-2 hover:bg-white/10 transition-all cursor-pointer opacity-60">
                   <div className="flex justify-between items-center text-white">
                      <span className="text-[13px] font-bold">24 Mar • Mercúrio Rx □ Marte</span>
                      <span className="px-3 py-1 bg-orange-500/20 text-orange-400 text-[9px] font-black uppercase tracking-widest">Cuidado</span>
                   </div>
                   <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Possíveis atrasos em transações. Verifique dados antes de enviar TEDs ou assinar papéis.</p>
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* MODAL ADICIONAR TX */}
      {showAdd && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white p-12 w-full max-w-lg shadow-2xl border border-gold/20">
              <div className="flex justify-between items-center mb-10 border-b border-gray-100 pb-6">
                 <h2 className="text-xl font-black uppercase tracking-[0.2em] text-gray-800">Novo Movimento</h2>
                 <X onClick={() => setShowAdd(false)} className="cursor-pointer text-gray-400 hover:text-red-500"/>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest pl-1 mb-2 block">Descrição</label>
                    <input autoFocus className="w-full bg-gray-50 p-5 font-bold text-gray-800 border-none outline-none focus:ring-1 focus:ring-gold/30" placeholder="Ex: Venda de Infoproduto" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest pl-1 mb-2 block">Valor (R$)</label>
                       <input type="number" className="w-full bg-gray-50 p-5 font-bold text-gray-800 border-none outline-none focus:ring-1 focus:ring-gold/30" placeholder="0.00" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest pl-1 mb-2 block">Tipo</label>
                       <div className="grid grid-cols-2 h-[64px] bg-gray-50 p-1">
                          <button onClick={() => setNewTx({...newTx, type: 'income'})} className={`text-[10px] font-black uppercase tracking-widest transition-all ${newTx.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Entrada</button>
                          <button onClick={() => setNewTx({...newTx, type: 'expense'})} className={`text-[10px] font-black uppercase tracking-widest transition-all ${newTx.type === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>Saída</button>
                       </div>
                    </div>
                 </div>
                 <button onClick={handleAdd} className="w-full py-6 bg-[#333333] text-white font-black uppercase text-[11px] tracking-[0.3em] hover:bg-gold transition-all mt-6 shadow-xl">
                    Registrar no Patrimônio
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
