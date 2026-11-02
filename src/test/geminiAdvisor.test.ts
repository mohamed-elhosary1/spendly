import { describe, it, expect } from 'vitest';
import {
  rankWishlistItemsAlgorithmic,
  generateFinancialAdviceMessage,
} from '@/lib/geminiAdvisor';
import { WishlistItem, DailySpendingAnalysis } from '@/types';

describe('Gemini Advisor & Smart Wishlist Prioritization', () => {
  const mockAnalysis: DailySpendingAnalysis = {
    monthly_budget: 3000,
    total_expenses: 1800,
    remaining_budget: 1200,
    total_days_in_month: 30,
    elapsed_days: 10,
    remaining_days: 20,
    spent_today: 50,
    average_daily_spending: 50,
    recommended_daily_pace: 60,
    budget_consumption_pct: 60,
    projected_month_end_spending: 3000,
    projected_variance: 0,
    is_preliminary: false,
    assessment_level: 'within_budget',
    assessment_title: 'Within Budget',
    assessment_title_ar: 'ضمن الميزانية',
    assessment_explanation: 'Healthy pace',
    assessment_explanation_ar: 'وتيرة صحية',
  };

  const sampleItems: WishlistItem[] = [
    {
      id: 'item-1',
      user_id: 'u1',
      name: 'Expensive Laptop',
      estimated_price: 25000,
      saved_amount: 0,
      currency: 'EGP',
      priority: 'high',
      status: 'planned',
    },
    {
      id: 'item-2',
      user_id: 'u1',
      name: 'Running Shoes',
      estimated_price: 1500,
      saved_amount: 1500, // 100% saved
      currency: 'EGP',
      priority: 'medium',
      status: 'planned',
    },
    {
      id: 'item-3',
      user_id: 'u1',
      name: 'Programming Book',
      estimated_price: 120, // Fits easily with 6 EGP/day drop
      saved_amount: 0,
      currency: 'EGP',
      priority: 'medium',
      status: 'planned',
    },
    {
      id: 'item-4',
      user_id: 'u1',
      name: 'Winter Coat',
      estimated_price: 1100, // Consumes almost entire remaining 1200
      saved_amount: 0,
      currency: 'EGP',
      priority: 'high',
      status: 'planned',
    },
  ];

  it('ranks 100% saved items as #1 priority because they have zero impact on monthly pace', () => {
    const res = rankWishlistItemsAlgorithmic(sampleItems, mockAnalysis, 10000, 'EGP', 'ar');
    expect(res.ranked_items.length).toBe(4);
    // Running shoes is 100% saved, so must be #1
    expect(res.ranked_items[0].id).toBe('item-2');
    expect(res.ranked_items[0].urgency_tier).toBe('immediate_buy');
  });

  it('ranks affordable low-impact items above items that crush daily budget', () => {
    const res = rankWishlistItemsAlgorithmic(sampleItems, mockAnalysis, 10000, 'EGP', 'ar');
    // Programming book should be ranked ahead of winter coat and expensive laptop
    const bookIndex = res.ranked_items.findIndex((i) => i.id === 'item-3');
    const coatIndex = res.ranked_items.findIndex((i) => i.id === 'item-4');
    const laptopIndex = res.ranked_items.findIndex((i) => i.id === 'item-1');

    expect(bookIndex).toBeLessThan(coatIndex);
    expect(coatIndex).toBeLessThan(laptopIndex);
    // Laptop exceeds both remaining budget and total balance (25000 > 10000)
    expect(res.ranked_items[laptopIndex].verdict).toBe('exceeds_budget');
  });

  it('generates rich financial advice briefing message', async () => {
    const advice = await generateFinancialAdviceMessage(mockAnalysis, 5000, sampleItems, 'EGP', 'ar');
    expect(advice).toBeDefined();
    expect(advice.title_ar).toBeDefined();
    expect(advice.summary_ar.length).toBeGreaterThan(10);
    expect(advice.status).toBe('healthy');
  });
});
