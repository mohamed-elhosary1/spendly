import { WishlistItem, AffordabilityResult, CurrencyCode } from '@/types';
import { formatCurrency } from './currency';

export interface AffordabilityContext {
  remainingBudget: number;
  availableBalance: number; // Opening/bank balance if tracked
  currency: CurrencyCode;
  language: 'en' | 'ar';
  remainingDays: number;
}

/**
 * Evaluates whether a wishlist item can be afforded without breaking budget discipline.
 */
export function evaluateAffordability(
  item: WishlistItem,
  context: AffordabilityContext
): AffordabilityResult {
  const { remainingBudget, availableBalance, currency, language, remainingDays } = context;
  const price = Number(item.estimated_price) || 0;
  const saved = Number(item.saved_amount) || 0;
  const netRequired = Math.max(0, price - saved);

  // If already fully saved for:
  if (saved >= price) {
    return {
      is_affordable_in_budget: true,
      is_affordable_with_savings: true,
      budget_impact_percentage: 0,
      remaining_after_purchase: remainingBudget,
      verdict: 'comfortable',
      explanation: `You have already saved the entire target amount (${formatCurrency(saved, currency, language)}) for this purchase!`,
      explanation_ar: `لقد ادخرت بالفعل كامل المبلغ المطلوب (${formatCurrency(saved, currency, language)}) لهذا الغرض!`,
      recommended_action: 'Proceed with purchase when ready. Use "Record as Expense" once bought.',
      recommended_action_ar: 'يمكنك إتمام الشراء في الوقت المناسب، ثم الضغط على "تسجيل كمصروف".',
    };
  }

  const remainingAfterPurchase = remainingBudget - netRequired;
  const budgetImpactPct = remainingBudget > 0 ? (netRequired / remainingBudget) * 100 : 100;

  // Case 1: Can comfortably absorb within remaining monthly budget with safe buffer
  if (remainingAfterPurchase >= remainingBudget * 0.25 && netRequired <= remainingBudget) {
    return {
      is_affordable_in_budget: true,
      is_affordable_with_savings: true,
      budget_impact_percentage: budgetImpactPct,
      remaining_after_purchase: remainingAfterPurchase,
      verdict: 'comfortable',
      explanation: `Fits within your remaining budget of ${formatCurrency(remainingBudget, currency, language)}, leaving a healthy buffer of ${formatCurrency(remainingAfterPurchase, currency, language)} for the remaining ${remainingDays} days.`,
      explanation_ar: `يتناسب مع ميزانيتك المتبقية (${formatCurrency(remainingBudget, currency, language)})، مع ترك هامش أمان قدره ${formatCurrency(remainingAfterPurchase, currency, language)} للأيام الـ ${remainingDays} المتبقية.`,
      recommended_action: 'Affordable this month. Safe to proceed.',
      recommended_action_ar: 'متاح ضمن ميزانية الشهر بدون ضغط مالي.',
    };
  }

  // Case 2: Fits in remaining budget, but leaves very little buffer (< 25% of remaining budget)
  if (netRequired <= remainingBudget) {
    return {
      is_affordable_in_budget: true,
      is_affordable_with_savings: true,
      budget_impact_percentage: budgetImpactPct,
      remaining_after_purchase: remainingAfterPurchase,
      verdict: 'tight',
      explanation: `Purchase is possible, but it consumes ${budgetImpactPct.toFixed(0)}% of your remaining budget. Only ${formatCurrency(remainingAfterPurchase, currency, language)} will be left for ${remainingDays} remaining days.`,
      explanation_ar: `الشراء ممكن لكنه يستهلك ${budgetImpactPct.toFixed(0)}% من المتبقي، ويترك فقط ${formatCurrency(remainingAfterPurchase, currency, language)} لما تبقى من الشهر (${remainingDays} يوماً).`,
      recommended_action: 'Tight margin. Consider postponing to next month or saving incrementally.',
      recommended_action_ar: 'هامش ضيق. يُفضل التأجيل للشهر القادم أو الادخار تدريجياً.',
    };
  }

  // Case 3: Exceeds remaining budget, but available funds / bank balance could cover it
  if (availableBalance > 0 && netRequired <= availableBalance) {
    return {
      is_affordable_in_budget: false,
      is_affordable_with_savings: true,
      budget_impact_percentage: budgetImpactPct,
      remaining_after_purchase: remainingAfterPurchase,
      verdict: 'requires_savings',
      explanation: `Exceeds your monthly spending budget by ${formatCurrency(Math.abs(remainingAfterPurchase), currency, language)}, but your total tracked available balance (${formatCurrency(availableBalance, currency, language)}) can cover it if treated as an extraordinary purchase.`,
      explanation_ar: `يتجاوز ميزانية الإنفاق الشهرية بمقدار ${formatCurrency(Math.abs(remainingAfterPurchase), currency, language)}، ولكن رصيدك المتاح (${formatCurrency(availableBalance, currency, language)}) يغطيه كشراء استثنائي.`,
      recommended_action: 'Treat as an extraordinary purchase from savings, or defer to next month.',
      recommended_action_ar: 'يمكن تمويله كبند استثنائي من المدخرات أو تأجيله للشهر المقبل.',
    };
  }

  // Case 4: Exceeds remaining monthly budget
  return {
    is_affordable_in_budget: false,
    is_affordable_with_savings: false,
    budget_impact_percentage: budgetImpactPct,
    remaining_after_purchase: remainingAfterPurchase,
    verdict: 'exceeds_budget',
    explanation: `Exceeds your remaining monthly budget by ${formatCurrency(Math.abs(remainingAfterPurchase), currency, language)}. Making this purchase now would cause a budget deficit.`,
    explanation_ar: `يتجاوز ميزانيتك الشهرية المتبقية بمقدار ${formatCurrency(Math.abs(remainingAfterPurchase), currency, language)}. الشراء الآن سيؤدي لعجز في الميزانية.`,
    recommended_action: 'Add to wishlist savings goal and allocate funds over future budget cycles.',
    recommended_action_ar: 'أضف المبلغ إلى هدف ادخار وقسّطه على دورات الميزانية القادمة.',
  };
}
