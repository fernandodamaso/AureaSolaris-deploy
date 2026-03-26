import { useState, useEffect } from 'react';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  color: string;
}

export const useFinancasData = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('aurea_transactions');
    return saved ? JSON.parse(saved) : [
      { id: '1', description: 'Consultoria Astrológica', amount: 4500, type: 'income', date: '2026-03-10', category: 'Trabalho' },
      { id: '2', description: 'Curso de Tarot', amount: 89, type: 'expense', date: '2026-03-11', category: 'Educação' },
      { id: '3', description: 'Investimento Mensal', amount: 2000, type: 'expense', date: '2026-03-12', category: 'Aporte' }
    ];
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('aurea_goals');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Reserva Master', target: 50000, current: 32000, color: '#c5a059' },
      { id: '2', name: 'Viagem Egito', target: 20000, current: 8500, color: '#333333' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('aurea_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('aurea_goals', JSON.stringify(goals));
  }, [goals]);

  const stats = {
    balance: transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0),
    incomes: transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
    expenses: transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [{ ...t, id: Date.now().toString() + Math.random().toString(36).substr(2, 5) }, ...prev]);
  };

  const batchAddTransactions = (newTxs: Omit<Transaction, 'id'>[]) => {
    setTransactions(prev => [
      ...newTxs.map(t => ({ ...t, id: Date.now().toString() + Math.random().toString(36).substr(2, 5) })),
      ...prev
    ]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateGoal = (id: string, current: number) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current } : g));
  };

  return {
    transactions,
    goals,
    stats,
    addTransaction,
    batchAddTransactions,
    deleteTransaction,
    updateGoal
  };
};
