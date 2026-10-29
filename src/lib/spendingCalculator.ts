import { DailySpendingAnalysis, AssessmentLevel, Transaction, MonthlyBudget } from '@/types';
import { getMonthProgress, parseISO, isSameDay } from './dateUtils';
import { addMoney, subtractMoney, toCents, fromCents } from './currency';

export interface SpendingCalculationOptions {
  transactions: Transaction[];
  monthlyBudget: MonthlyBudget | null;
  year: number;
  month: number; // 1-12
  todayDateStr?: string;
}

/**
 * Calculates spending pace, daily allowance, month-end projection, and assessment.
 */
export function calculateDailySpending(options: SpendingCalculationOptions): DailySpendingAnalysis {
  const { transactions, monthlyBudget, year, month, todayDateStr } = options;
  const now = todayDateStr ? parseISO(todayDateStr) : new Date();
  const progress = getMonthProgress(year, month, now);

  const totalBudget = monthlyBudget ? Number(monthlyBudget.total_budget) : 0;

  // Filter transactions for this specific month & year
  const monthTransactions = transactions.filter((t) => {
    try {
      const d = parseISO(t.transaction_date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    } catch {
      return false;
    }
  });

  // Calculate total eligible expenses:
  // - expenses add to total
  // - refunds reduce total
  // - transfers are NOT counted as expenses
  let totalExpensesCents = 0;
  let spentTodayCents = 0;

  for (const t of monthTransactions) {
    const amtCents = toCents(Number(t.amount) || 0);

    if (t.type === 'expense') {
      totalExpensesCents += amtCents;
    } else if (t.type === 'refund') {
      totalExpensesCents = Math.max(0, totalExpensesCents - amtCents);
    }

    // Check if spent today
    try {
      const d = parseISO(t.transaction_date);
      if (isSameDay(d, now)) {
        if (t.type === 'expense') {
          spentTodayCents += amtCents;
        } else if (t.type === 'refund') {
          spentTodayCents = Math.max(0, spentTodayCents - amtCents);
        }
      }
    } catch {
      // ignore invalid date
    }
  }

  const totalExpenses = fromCents(totalExpensesCents);
  const spentToday = fromCents(spentTodayCents);

  // R = B - E
  const remainingBudget = subtractMoney(totalBudget, totalExpenses);

  // Days:
  // D = remaining budget days, including today if period hasn't ended
  const remainingDays = progress.remainingDays;
  const elapsedDays = Math.max(1, progress.elapsedDays);

  // Remaining daily allowance = max(0, R) / max(1, D)
  const safeRemainingBudget = Math.max(0, remainingBudget);
  const recommendedDailyPace = remainingDays > 0 ? safeRemainingBudget / Math.max(1, remainingDays) : 0;

  // Average daily spending so far
  const averageDailySpending = elapsedDays > 0 ? totalExpenses / elapsedDays : 0;

  // Budget consumption percentage:
  // Total eligible expenses / Monthly budget * 100
  const budgetConsumptionPct =
    totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : totalExpenses > 0 ? 100 : 0;

  // Projected month-end spending:
  // Projected = average daily spending * total days in month
  // If no transactions yet, projection is 0
  const projectedMonthEndSpending =
    totalExpenses > 0
      ? progress.isPastMonth
        ? totalExpenses
        : averageDailySpending * progress.totalDays
      : 0;

  const projectedVariance = totalBudget > 0 ? totalBudget - projectedMonthEndSpending : 0;

  // When there are fewer than 3 days of data or zero transactions, mark projection as preliminary
  const isPreliminary = progress.isCurrentMonth && (elapsedDays < 3 || monthTransactions.length < 3);

  // Determine Assessment Level & Explanation
  let assessmentLevel: AssessmentLevel = 'within_budget';
  let assessmentTitle = 'Within Budget';
  let assessmentTitleAr = 'ضمن الميزانية';
  let assessmentExplanation = 'Your spending is currently at a healthy, sustainable pace.';
  let assessmentExplanationAr = 'معدل إنفاقك حالياً متوازن ومستدام حتى نهاية الشهر.';

  if (totalBudget === 0) {
    assessmentLevel = 'within_budget';
    assessmentTitle = 'No Budget Set';
    assessmentTitleAr = 'لم يتم تحديد ميزانية';
    assessmentExplanation = 'Set a monthly budget to unlock spending velocity and daily pacing insights.';
    assessmentExplanationAr = 'حدد ميزانية شهرية لتفعيل تحليل وتيرة الإنفاق والمخصص اليومي.';
  } else if (totalExpenses > totalBudget) {
    assessmentLevel = 'exceeded';
    assessmentTitle = 'Budget Exceeded';
    assessmentTitleAr = 'تم تجاوز الميزانية';
    assessmentExplanation = `You have exceeded your monthly budget by ${fromCents(totalExpensesCents - toCents(totalBudget)).toFixed(2)}. Focus on essential expenses for the remainder of the month.`;
    assessmentExplanationAr = `تجاوزت ميزانيتك الشهرية بمقدار ${fromCents(totalExpensesCents - toCents(totalBudget)).toFixed(2)}. يُنصح بالتركيز على النفقات الضرورية لبقية الشهر.`;
  } else if (budgetConsumptionPct >= 85) {
    assessmentLevel = 'approaching_limit';
    assessmentTitle = 'Approaching Budget Limit';
    assessmentTitleAr = 'تقترب من الحد الأقصى للميزانية';
    assessmentExplanation = `You have used ${budgetConsumptionPct.toFixed(0)}% of your monthly budget with ${remainingDays} days remaining. Keep daily spending below ${recommendedDailyPace.toFixed(0)} to stay on target.`;
    assessmentExplanationAr = `استهلكت ${budgetConsumptionPct.toFixed(0)}% من الميزانية مع بقاء ${remainingDays} يوماً. حافظ على إنفاق يومي أقل من ${recommendedDailyPace.toFixed(0)} للالتزام بالميزانية.`;
  } else if (averageDailySpending > recommendedDailyPace * 1.2 && elapsedDays >= 3) {
    assessmentLevel = 'above_pace';
    assessmentTitle = 'Above Recommended Pace';
    assessmentTitleAr = 'أعلى من الوتيرة الموصى بها';
    assessmentExplanation = `Your recent average of ${averageDailySpending.toFixed(0)}/day is higher than the sustainable target of ${recommendedDailyPace.toFixed(0)}/day. Pacing adjustments will keep you comfortable.`;
    assessmentExplanationAr = `متوسط إنفاقك الحالي (${averageDailySpending.toFixed(0)}/يوم) أعلى من المعدل المستدام (${recommendedDailyPace.toFixed(0)}/يوم). تعديل بسيط في الوتيرة يبقيك في منطقة الأمان.`;
  }

  return {
    monthly_budget: totalBudget,
    total_expenses: totalExpenses,
    remaining_budget: remainingBudget,
    total_days_in_month: progress.totalDays,
    elapsed_days: elapsedDays,
    remaining_days: remainingDays,
    spent_today: spentToday,
    average_daily_spending: averageDailySpending,
    recommended_daily_pace: recommendedDailyPace,
    budget_consumption_pct: budgetConsumptionPct,
    projected_month_end_spending: projectedMonthEndSpending,
    projected_variance: projectedVariance,
    is_preliminary: isPreliminary,
    assessment_level: assessmentLevel,
    assessment_title: assessmentTitle,
    assessment_title_ar: assessmentTitleAr,
    assessment_explanation: assessmentExplanation,
    assessment_explanation_ar: assessmentExplanationAr,
  };
}
