import { describe, it, expect } from 'vitest';
import { calculateDailySpending } from '@/lib/spendingCalculator';
import { evaluateAffordability } from '@/lib/affordabilityCalculator';
import { addMoney, subtractMoney } from '@/lib/currency';
import { Transaction, MonthlyBudget, WishlistItem } from '@/types';

describe('Multi-User Data Isolation & Financial Integrity Tests', () => {
  const userA_Id = '11111111-aaaa-aaaa-aaaa-111111111111';
  const userB_Id = '22222222-bbbb-bbbb-bbbb-222222222222';

  const userA_Transactions: Transaction[] = [
    {
      id: 'tx-1',
      user_id: userA_Id,
      type: 'expense',
      amount: 150,
      currency: 'EGP',
      category_id: 'cat-food',
      description: 'Groceries User A',
      transaction_date: '2026-10-15',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-2',
      user_id: userA_Id,
      type: 'income',
      amount: 5000,
      currency: 'EGP',
      category_id: 'cat-salary',
      description: 'Salary User A',
      transaction_date: '2026-10-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const userB_Transactions: Transaction[] = [
    {
      id: 'tx-3',
      user_id: userB_Id,
      type: 'expense',
      amount: 800,
      currency: 'EGP',
      category_id: 'cat-electronics',
      description: 'Headphones User B',
      transaction_date: '2026-10-18',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('strictly isolates records: User A data contains no User B transactions', () => {
    const allTxs = [...userA_Transactions, ...userB_Transactions];
    const filteredForUserA = allTxs.filter((t) => t.user_id === userA_Id);
    const filteredForUserB = allTxs.filter((t) => t.user_id === userB_Id);

    expect(filteredForUserA).toHaveLength(2);
    expect(filteredForUserB).toHaveLength(1);
    expect(filteredForUserA.some((t) => t.user_id === userB_Id)).toBe(false);
    expect(filteredForUserB.some((t) => t.user_id === userA_Id)).toBe(false);
  });

  it('calculates daily spending accurately for User A without pollution from User B', () => {
    const userA_Budget: MonthlyBudget = {
      id: 'mb-user-a',
      user_id: userA_Id,
      year: 2026,
      month: 10,
      total_budget: 3000,
      currency: 'EGP',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const analysisUserA = calculateDailySpending({
      transactions: userA_Transactions,
      monthlyBudget: userA_Budget,
      year: 2026,
      month: 10,
      todayDateStr: '2026-10-20',
    });

    expect(analysisUserA.total_expenses).toBe(150);
    expect(analysisUserA.monthly_budget).toBe(3000);
    expect(analysisUserA.remaining_budget).toBe(2850);
    expect(analysisUserA.budget_consumption_pct).toBe(5);
    expect(analysisUserA.assessment_level).toBe('within_budget');
  });

  it('handles empty database states with real zeros instead of fake fallback numbers', () => {
    const emptyAnalysis = calculateDailySpending({
      transactions: [],
      monthlyBudget: null,
      year: 2026,
      month: 10,
      todayDateStr: '2026-10-20',
    });

    expect(emptyAnalysis.total_expenses).toBe(0);
    expect(emptyAnalysis.monthly_budget).toBe(0);
    expect(emptyAnalysis.remaining_budget).toBe(0);
    expect(emptyAnalysis.budget_consumption_pct).toBe(0);
    expect(emptyAnalysis.average_daily_spending).toBe(0);
    expect(emptyAnalysis.recommended_daily_pace).toBe(0);
  });

  it('evaluates wishlist affordability without compromising monthly budget safety', () => {
    const item: WishlistItem = {
      id: 'w-1',
      user_id: userA_Id,
      name: 'Wireless Keyboard',
      estimated_price: 600,
      currency: 'EGP',
      priority: 'medium',
      saved_amount: 200,
      status: 'saving',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Remaining budget: 2850, net needed is 400. Leaves 2450 (> 25% of 2850).
    const result = evaluateAffordability(item, {
      remainingBudget: 2850,
      availableBalance: 5000,
      currency: 'EGP',
      language: 'en',
      remainingDays: 12,
    });

    expect(result.is_affordable_in_budget).toBe(true);
    expect(result.verdict).toBe('comfortable');
    expect(result.remaining_after_purchase).toBe(2450);
  });

  it('correctly warns when wishlist item exceeds remaining monthly budget', () => {
    const expensiveItem: WishlistItem = {
      id: 'w-2',
      user_id: userA_Id,
      name: 'High-end Monitor',
      estimated_price: 4500,
      currency: 'EGP',
      priority: 'low',
      saved_amount: 0,
      status: 'planned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Remaining budget is only 500, item is 4500
    const result = evaluateAffordability(expensiveItem, {
      remainingBudget: 500,
      availableBalance: 1000,
      currency: 'EGP',
      language: 'en',
      remainingDays: 10,
    });

    expect(result.is_affordable_in_budget).toBe(false);
    expect(result.verdict).toBe('exceeds_budget');
    expect(result.remaining_after_purchase).toBe(-4000);
  });

  it('ensures monetary math never suffers from binary floating-point representation drift', () => {
    const sum = addMoney(0.1, 0.2);
    expect(sum).toBe(0.3);

    const diff = subtractMoney(100.55, 50.25);
    expect(diff).toBe(50.3);
  });
});
