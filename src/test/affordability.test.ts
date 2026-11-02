import { describe, it, expect } from 'vitest';
import { evaluateAffordability } from '@/lib/affordabilityCalculator';
import { WishlistItem } from '@/types';

describe('Wishlist Affordability Analysis', () => {
  const baseItem: WishlistItem = {
    id: 'w1',
    user_id: 'u1',
    name: 'Desk Chair',
    estimated_price: 1000,
    currency: 'EGP',
    priority: 'medium',
    saved_amount: 0,
    status: 'planned',
  };

  it('verdicts comfortable when purchase is comfortably within remaining budget with buffer', () => {
    const res = evaluateAffordability(baseItem, {
      remainingBudget: 5000,
      availableBalance: 20000,
      currency: 'EGP',
      language: 'en',
      remainingDays: 15,
    });

    expect(res.is_affordable_in_budget).toBe(true);
    expect(res.verdict).toBe('comfortable');
    expect(res.remaining_after_purchase).toBe(4000);
  });

  it('verdicts tight when purchase consumes the bulk of remaining budget', () => {
    const res = evaluateAffordability(baseItem, {
      remainingBudget: 1100, // item is 1000, leaves only 100 (< 25% of 1100)
      availableBalance: 5000,
      currency: 'EGP',
      language: 'en',
      remainingDays: 10,
    });

    expect(res.is_affordable_in_budget).toBe(true);
    expect(res.verdict).toBe('tight');
  });

  it('verdicts requires_savings when exceeding monthly budget but covered by available funds', () => {
    const res = evaluateAffordability(baseItem, {
      remainingBudget: 500, // item is 1000, exceeds budget by 500
      availableBalance: 15000, // but funds exist
      currency: 'EGP',
      language: 'en',
      remainingDays: 10,
    });

    expect(res.is_affordable_in_budget).toBe(false);
    expect(res.is_affordable_with_savings).toBe(true);
    expect(res.verdict).toBe('requires_savings');
  });

  it('verdicts exceeds_budget when exceeding both budget and available balance', () => {
    const expensiveItem: WishlistItem = {
      ...baseItem,
      estimated_price: 50000,
    };

    const res = evaluateAffordability(expensiveItem, {
      remainingBudget: 2000,
      availableBalance: 5000,
      currency: 'EGP',
      language: 'en',
      remainingDays: 10,
    });

    expect(res.is_affordable_in_budget).toBe(false);
    expect(res.is_affordable_with_savings).toBe(false);
    expect(res.verdict).toBe('exceeds_budget');
  });

  it('verdicts comfortable when item is already fully saved for', () => {
    const savedItem: WishlistItem = {
      ...baseItem,
      saved_amount: 1000,
    };

    const res = evaluateAffordability(savedItem, {
      remainingBudget: 100,
      availableBalance: 200,
      currency: 'EGP',
      language: 'en',
      remainingDays: 5,
    });

    expect(res.is_affordable_in_budget).toBe(true);
    expect(res.is_affordable_with_savings).toBe(true);
    expect(res.verdict).toBe('comfortable');
  });

  it('does NOT verdict comfortable without a monthly budget even if total funds are huge', () => {
    const res = evaluateAffordability(baseItem, {
      monthlyBudget: 0,
      remainingBudget: 0,
      availableBalance: 50000,
      currency: 'EGP',
      language: 'ar',
      remainingDays: 20,
    });

    expect(res.verdict).not.toBe('comfortable');
    expect(res.is_affordable_in_budget).toBe(false);
  });

  it('verdicts tight when purchase crushes daily pace below user average spending pace', () => {
    // 2000 remaining budget, item is 1000, leaves 1000 (> 25% of 2000).
    // But with 25 days left, new daily pace is 1000 / 25 = 40/day.
    // If user's average spending is 75/day, 40/day is below their spending pace!
    const res = evaluateAffordability(baseItem, {
      monthlyBudget: 3000,
      remainingBudget: 2000,
      availableBalance: 10000,
      currency: 'EGP',
      language: 'en',
      remainingDays: 25,
      averageDailySpending: 75,
      recommendedDailyPace: 80,
    });

    expect(res.is_affordable_in_budget).toBe(true);
    expect(res.verdict).toBe('tight');
    expect(res.new_daily_pace).toBe(40);
  });
});
