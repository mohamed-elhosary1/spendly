import { describe, it, expect } from 'vitest';
import { calculateDailySpending } from '@/lib/spendingCalculator';
import { Transaction, MonthlyBudget } from '@/types';

describe('Spending Pace & Allowance Calculator', () => {
  const sampleBudget: MonthlyBudget = {
    id: 'b1',
    user_id: 'u1',
    year: 2026,
    month: 10,
    total_budget: 10000,
    currency: 'EGP',
  };

  it('calculates remaining daily allowance correctly according to formula: max(0, R)/max(1, D)', () => {
    // Oct 2026 has 31 days. If today is Oct 15, elapsed = 15, remaining = 31 - 15 + 1 = 17 days
    const txs: Transaction[] = [
      {
        id: 't1',
        user_id: 'u1',
        type: 'expense',
        amount: 3200,
        currency: 'EGP',
        category_id: 'c1',
        description: 'Living expenses',
        transaction_date: '2026-10-10',
      },
    ];

    const result = calculateDailySpending({
      transactions: txs,
      monthlyBudget: sampleBudget,
      year: 2026,
      month: 10,
      todayDateStr: '2026-10-15',
    });

    expect(result.monthly_budget).toBe(10000);
    expect(result.total_expenses).toBe(3200);
    expect(result.remaining_budget).toBe(6800);
    // 6800 / 17 remaining days = 400
    expect(result.recommended_daily_pace).toBe(400);
    expect(result.budget_consumption_pct).toBe(32);
  });

  it('handles refunds properly by deducting from eligible expenses', () => {
    const txs: Transaction[] = [
      {
        id: 't1',
        user_id: 'u1',
        type: 'expense',
        amount: 1000,
        currency: 'EGP',
        category_id: 'c1',
        description: 'Item purchased',
        transaction_date: '2026-10-05',
      },
      {
        id: 't2',
        user_id: 'u1',
        type: 'refund',
        amount: 400,
        currency: 'EGP',
        category_id: 'c1',
        description: 'Item returned',
        transaction_date: '2026-10-06',
      },
    ];

    const result = calculateDailySpending({
      transactions: txs,
      monthlyBudget: sampleBudget,
      year: 2026,
      month: 10,
      todayDateStr: '2026-10-15',
    });

    // 1000 - 400 = 600 net expense
    expect(result.total_expenses).toBe(600);
    expect(result.remaining_budget).toBe(9400);
  });

  it('excludes internal transfers from expense calculations', () => {
    const txs: Transaction[] = [
      {
        id: 't1',
        user_id: 'u1',
        type: 'transfer',
        amount: 5000,
        currency: 'EGP',
        category_id: 'c1',
        description: 'Transfer to savings account',
        transaction_date: '2026-10-05',
      },
      {
        id: 't2',
        user_id: 'u1',
        type: 'expense',
        amount: 200,
        currency: 'EGP',
        category_id: 'c1',
        description: 'Lunch',
        transaction_date: '2026-10-05',
      },
    ];

    const result = calculateDailySpending({
      transactions: txs,
      monthlyBudget: sampleBudget,
      year: 2026,
      month: 10,
      todayDateStr: '2026-10-15',
    });

    expect(result.total_expenses).toBe(200);
  });

  it('handles overspending (> 100%) gracefully without negative allowance', () => {
    const txs: Transaction[] = [
      {
        id: 't1',
        user_id: 'u1',
        type: 'expense',
        amount: 12000,
        currency: 'EGP',
        category_id: 'c1',
        description: 'Major repair',
        transaction_date: '2026-10-05',
      },
    ];

    const result = calculateDailySpending({
      transactions: txs,
      monthlyBudget: sampleBudget,
      year: 2026,
      month: 10,
      todayDateStr: '2026-10-15',
    });

    expect(result.remaining_budget).toBe(-2000);
    expect(result.recommended_daily_pace).toBe(0); // max(0, R)
    expect(result.budget_consumption_pct).toBe(120);
    expect(result.assessment_level).toBe('exceeded');
  });

  it('handles zero budget safely without NaN or division by zero', () => {
    const zeroBudget: MonthlyBudget = {
      id: 'b0',
      user_id: 'u1',
      year: 2026,
      month: 10,
      total_budget: 0,
      currency: 'EGP',
    };

    const result = calculateDailySpending({
      transactions: [],
      monthlyBudget: zeroBudget,
      year: 2026,
      month: 10,
      todayDateStr: '2026-10-15',
    });

    expect(result.budget_consumption_pct).toBe(0);
    expect(result.recommended_daily_pace).toBe(0);
    expect(isNaN(result.budget_consumption_pct)).toBe(false);
  });

  it('correctly handles leap year February date counts (2024 = 29 days)', () => {
    const leapBudget: MonthlyBudget = {
      id: 'b-leap',
      user_id: 'u1',
      year: 2024,
      month: 2,
      total_budget: 2900,
      currency: 'EGP',
    };

    const result = calculateDailySpending({
      transactions: [],
      monthlyBudget: leapBudget,
      year: 2024,
      month: 2,
      todayDateStr: '2024-02-01',
    });

    expect(result.total_days_in_month).toBe(29);
  });
});
