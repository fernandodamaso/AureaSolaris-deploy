import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFinancasData } from '../../hooks/useFinancasData';

describe('useFinancasData', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads default transactions when localStorage is empty', () => {
    const { result } = renderHook(() => useFinancasData());
    expect(result.current.transactions.length).toBeGreaterThan(0);
  });

  it('loads transactions from localStorage when present', () => {
    const savedTransactions = [
      { id: 'saved-1', description: 'Salvo', amount: 500, type: 'income' as const, date: '2026-01-01', category: 'Teste' },
    ];
    localStorage.setItem('aurea_transactions', JSON.stringify(savedTransactions));

    const { result } = renderHook(() => useFinancasData());
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].description).toBe('Salvo');
  });

  it('calculates correct balance', () => {
    const { result } = renderHook(() => useFinancasData());
    const { incomes, expenses } = result.current.stats;
    expect(result.current.stats.balance).toBe(incomes - expenses);
  });

  it('adds a new transaction', () => {
    const { result } = renderHook(() => useFinancasData());
    const initialCount = result.current.transactions.length;

    act(() => {
      result.current.addTransaction({
        description: 'Teste',
        amount: 100,
        type: 'income',
        date: '2026-03-24',
        category: 'Teste',
      });
    });

    expect(result.current.transactions).toHaveLength(initialCount + 1);
    expect(result.current.transactions[0].description).toBe('Teste');
  });

  it('deletes a transaction', () => {
    const { result } = renderHook(() => useFinancasData());
    const idToDelete = result.current.transactions[0].id;
    const initialCount = result.current.transactions.length;

    act(() => {
      result.current.deleteTransaction(idToDelete);
    });

    expect(result.current.transactions).toHaveLength(initialCount - 1);
    expect(result.current.transactions.find(t => t.id === idToDelete)).toBeUndefined();
  });

  it('batch adds transactions', () => {
    const { result } = renderHook(() => useFinancasData());
    const initialCount = result.current.transactions.length;

    act(() => {
      result.current.batchAddTransactions([
        { description: 'Batch 1', amount: 50, type: 'expense', date: '2026-03-24', category: 'Teste' },
        { description: 'Batch 2', amount: 200, type: 'income', date: '2026-03-24', category: 'Teste' },
      ]);
    });

    expect(result.current.transactions).toHaveLength(initialCount + 2);
  });

  it('persists transactions to localStorage', () => {
    const { result } = renderHook(() => useFinancasData());

    act(() => {
      result.current.addTransaction({
        description: 'Persist Test',
        amount: 999,
        type: 'income',
        date: '2026-03-24',
        category: 'Teste',
      });
    });

    const stored = JSON.parse(localStorage.getItem('aurea_transactions')!);
    expect(stored[0].description).toBe('Persist Test');
  });

  it('updates goal current amount', () => {
    const { result } = renderHook(() => useFinancasData());
    const goalId = result.current.goals[0].id;

    act(() => {
      result.current.updateGoal(goalId, 99999);
    });

    const updatedGoal = result.current.goals.find(g => g.id === goalId);
    expect(updatedGoal!.current).toBe(99999);
  });
});
