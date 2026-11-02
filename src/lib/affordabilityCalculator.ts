import { WishlistItem, AffordabilityResult, CurrencyCode } from '@/types';
import { formatCurrency } from './currency';

export interface AffordabilityContext {
  monthlyBudget?: number;
  remainingBudget: number;
  availableBalance: number; // Total money / bank balance
  currency: CurrencyCode;
  language: 'en' | 'ar';
  remainingDays: number;
  spentToday?: number;
  averageDailySpending?: number;
  recommendedDailyPace?: number;
}

/**
 * Evaluates whether a wishlist item can be afforded without breaking budget discipline.
 * Takes into account:
 * - Monthly budget & remaining budget
 * - Actual daily spending pace & today's spending
 * - Pre-purchase vs. post-purchase recommended daily allowance
 * - Never returns 'comfortable' solely because the user has money in their account.
 */
export function evaluateAffordability(
  item: WishlistItem,
  context: AffordabilityContext
): AffordabilityResult {
  const {
    monthlyBudget = 0,
    remainingBudget,
    availableBalance,
    currency,
    language,
    remainingDays: rawRemainingDays,
    spentToday = 0,
    averageDailySpending = 0,
    recommendedDailyPace,
  } = context;

  const remainingDays = Math.max(1, rawRemainingDays);
  const currentDailyPace =
    recommendedDailyPace ?? (remainingBudget > 0 ? remainingBudget / remainingDays : 0);

  const price = Number(item.estimated_price) || 0;
  const saved = Number(item.saved_amount) || 0;
  const netRequired = Math.max(0, price - saved);

  // 1. If already fully saved for in dedicated envelope:
  if (saved >= price) {
    return {
      is_affordable_in_budget: true,
      is_affordable_with_savings: true,
      budget_impact_percentage: 0,
      remaining_after_purchase: remainingBudget,
      new_daily_pace: currentDailyPace,
      daily_pace_drop: 0,
      verdict: 'comfortable',
      explanation: `You have already saved the entire target amount (${formatCurrency(saved, currency, language)}) for this purchase! Zero impact on this month's daily spending pace.`,
      explanation_ar: `لقد ادخرت بالفعل كامل المبلغ المطلوب (${formatCurrency(saved, currency, language)}) لهذا الغرض في بند مستقل! لا يوجد أي تأثير سلبي على وتيرة إنفاقك اليومي.`,
      recommended_action: 'Proceed with purchase when ready. Use "Record as Expense" once bought.',
      recommended_action_ar: 'جاهز للشراء فوراً من أموال الادخار المخصصة، ثم اضغط "تسجيل كمصروف".',
    };
  }

  // 2. If no monthly budget is set at all:
  // Never give 'comfortable' just because total funds/balance are positive.
  if (monthlyBudget <= 0 && remainingBudget <= 0) {
    return {
      is_affordable_in_budget: false,
      is_affordable_with_savings: availableBalance >= netRequired,
      budget_impact_percentage: 100,
      remaining_after_purchase: -netRequired,
      new_daily_pace: 0,
      daily_pace_drop: 0,
      verdict: 'requires_savings',
      explanation: `No monthly budget is set. Although your account balance has ${formatCurrency(availableBalance, currency, language)}, this cannot be marked 'comfortable' without a defined monthly budget to protect daily cash flow.`,
      explanation_ar: `لم يتم تحديد ميزانية شهرية. بالرغم من توفر رصيد مالي (${formatCurrency(availableBalance, currency, language)}) في حسابك، لا يمكن اعتبار الشراء مريحاً (comfortable) دون ميزانية شهرية تحمي وتيرة الصرف اليومي.`,
      recommended_action: 'Set a monthly budget to calculate your sustainable daily spending pace.',
      recommended_action_ar: 'حدد ميزانية شهرية أولاً لحساب وتيرة الصرف اليومي والمخصص الموصى به بدقة.',
    };
  }

  const remainingAfterPurchase = remainingBudget - netRequired;
  const budgetImpactPct = remainingBudget > 0 ? (netRequired / remainingBudget) * 100 : 100;
  const newDailyPace = remainingDays > 0 ? Math.max(0, remainingAfterPurchase / remainingDays) : 0;
  const dailyPaceDrop = Math.max(0, currentDailyPace - newDailyPace);

  // 3. If purchase exceeds remaining monthly budget:
  if (netRequired > remainingBudget) {
    const deficit = Math.abs(remainingAfterPurchase);
    // Can it be funded from extraordinary savings?
    if (availableBalance > 0 && netRequired <= availableBalance) {
      return {
        is_affordable_in_budget: false,
        is_affordable_with_savings: true,
        budget_impact_percentage: budgetImpactPct,
        remaining_after_purchase: remainingAfterPurchase,
        new_daily_pace: 0,
        daily_pace_drop: currentDailyPace,
        verdict: 'requires_savings',
        explanation: `Exceeds your remaining monthly budget by ${formatCurrency(deficit, currency, language)}. Total funds (${formatCurrency(availableBalance, currency, language)}) exist, but buying this now breaks this month's budget pacing.`,
        explanation_ar: `يتجاوز ميزانيتك الشهرية المتبقية بمقدار ${formatCurrency(deficit, currency, language)}. توفر رصيد كلي (${formatCurrency(availableBalance, currency, language)}) لا يجعله آمناً لأنه يكسر ميزانية الشهر ويسبب عجزاً في وتيرة الإنفاق.`,
        recommended_action: 'Treat as an extraordinary purchase from savings, or defer to next month.',
        recommended_action_ar: 'أجّل الشراء للشهر القادم أو خصص له مدخرات تدريجية بدلاً من كسر الميزانية.',
      };
    }

    return {
      is_affordable_in_budget: false,
      is_affordable_with_savings: false,
      budget_impact_percentage: budgetImpactPct,
      remaining_after_purchase: remainingAfterPurchase,
      new_daily_pace: 0,
      daily_pace_drop: currentDailyPace,
      verdict: 'exceeds_budget',
      explanation: `Exceeds your remaining monthly budget by ${formatCurrency(deficit, currency, language)}. Making this purchase now would cause a budget deficit.`,
      explanation_ar: `يتجاوز ميزانيتك الشهرية المتبقية بمقدار ${formatCurrency(deficit, currency, language)}. الشراء الآن سيؤدي لعجز مالي وتجاوز الميزانية.`,
      recommended_action: 'Add to wishlist savings goal and allocate funds over future budget cycles.',
      recommended_action_ar: 'أضف المبلغ إلى هدف ادخار وقسّطه على دورات الميزانية القادمة.',
    };
  }

  // 4. Fits within remaining budget (netRequired <= remainingBudget).
  // Rigorously assess impact on DAILY SPENDING and RECOMMENDED PACE:
  const leavesSmallBuffer = remainingAfterPurchase < remainingBudget * 0.25;
  const crushesDailyPace = currentDailyPace > 0 && dailyPaceDrop > currentDailyPace * 0.40;
  const belowDailySpendingRate =
    averageDailySpending > 0 && newDailyPace < averageDailySpending * 0.85;

  if (leavesSmallBuffer || crushesDailyPace || belowDailySpendingRate) {
    return {
      is_affordable_in_budget: true,
      is_affordable_with_savings: true,
      budget_impact_percentage: budgetImpactPct,
      remaining_after_purchase: remainingAfterPurchase,
      new_daily_pace: newDailyPace,
      daily_pace_drop: dailyPaceDrop,
      verdict: 'tight',
      explanation: `Purchase is possible within budget, but it tightens your daily allowance from ${formatCurrency(currentDailyPace, currency, language)}/day down to ${formatCurrency(newDailyPace, currency, language)}/day for the remaining ${remainingDays} days${averageDailySpending > 0 ? ` (below your current average spending of ${formatCurrency(averageDailySpending, currency, language)}/day)` : ''}.`,
      explanation_ar: `الشراء ممكن حسابياً من الميزانية، لكنه يضغط وتيرة الصرف اليومي: سينخفض مخصصك اليومي من ${formatCurrency(currentDailyPace, currency, language)}/يوم إلى ${formatCurrency(newDailyPace, currency, language)}/يوم للأيام الـ ${remainingDays} المتبقية${averageDailySpending > 0 ? ` (أقل من متوسط صرفك الفعلي: ${formatCurrency(averageDailySpending, currency, language)}/يوم)` : ''}.`,
      recommended_action: 'Tight daily margin. Postpone or save incrementally to maintain comfortable daily living.',
      recommended_action_ar: 'هامش يومي ضاغط سيجبرك على تقليص مصاريفك اليومية بشدة. يُفضل التأجيل أو الادخار تدريجياً.',
    };
  }

  // 5. Genuine 'comfortable' purchase:
  return {
    is_affordable_in_budget: true,
    is_affordable_with_savings: true,
    budget_impact_percentage: budgetImpactPct,
    remaining_after_purchase: remainingAfterPurchase,
    new_daily_pace: newDailyPace,
    daily_pace_drop: dailyPaceDrop,
    verdict: 'comfortable',
    explanation: `Comfortably fits within your budget. Leaves a sustainable daily pace of ${formatCurrency(newDailyPace, currency, language)}/day for the remaining ${remainingDays} days (pace drops by only ${formatCurrency(dailyPaceDrop, currency, language)}/day).`,
    explanation_ar: `يتناسب بأمان تام مع ميزانيتك ومعدل صرفك اليومي. يتبقى بعد الشراء مخصص يومي قدره ${formatCurrency(newDailyPace, currency, language)}/يوم للأيام الـ ${remainingDays} المتبقية (تأثير طفيف قدره -${formatCurrency(dailyPaceDrop, currency, language)}/يوم).`,
    recommended_action: 'Sustainable and safe to purchase without disrupting your daily living pace.',
    recommended_action_ar: 'شراء آمن ومستدام لا يخل بوتيرة صرفك اليومي. يمكنك الشراء باطمئنان.',
  };
}
