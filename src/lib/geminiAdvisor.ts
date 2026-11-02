import { WishlistItem, CurrencyCode, LanguageCode, DailySpendingAnalysis } from '@/types';
import { formatCurrency } from './currency';
import { evaluateAffordability } from './affordabilityCalculator';

export interface PrioritizedWishlistItem {
  id: string;
  name: string;
  estimated_price: number;
  saved_amount: number;
  net_required: number;
  priority: 'high' | 'medium' | 'low';
  rank: number; // 1 = buy first, 2 = second...
  urgency_tier: 'immediate_buy' | 'plan_this_month' | 'save_incrementally' | 'defer_next_month';
  new_daily_pace: number;
  daily_pace_drop: number;
  verdict: 'comfortable' | 'tight' | 'exceeds_budget' | 'requires_savings';
  headline: string;
  headline_ar: string;
  reasoning: string;
  reasoning_ar: string;
  ai_tip: string;
  ai_tip_ar: string;
}

export interface WishlistPrioritizationResult {
  ranked_items: PrioritizedWishlistItem[];
  overall_strategy: string;
  overall_strategy_ar: string;
  current_daily_pace: number;
  remaining_budget: number;
  remaining_days: number;
  total_balance: number;
  source: 'gemini' | 'algorithmic';
}

export interface FinancialAdviceMessage {
  id: string;
  title: string;
  title_ar: string;
  summary: string;
  summary_ar: string;
  daily_pace_advice: string;
  daily_pace_advice_ar: string;
  top_recommendation: string;
  top_recommendation_ar: string;
  status: 'healthy' | 'caution' | 'critical';
  timestamp: string;
  source: 'gemini' | 'algorithmic';
}

const STORAGE_KEY = 'spendly_gemini_api_key';

/**
 * Retrieve the active Gemini API key from localStorage or Vite environment variables
 */
export function getGeminiApiKey(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {}

  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  return typeof envKey === 'string' ? envKey.trim() : '';
}

/**
 * Store or clear the user's Gemini API key in localStorage
 */
export function setGeminiApiKey(key: string): void {
  try {
    if (!key || !key.trim()) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, key.trim());
    }
  } catch {}
}

/**
 * Check if a Gemini API key is configured
 */
export function isGeminiConfigured(): boolean {
  return !!getGeminiApiKey();
}

/**
 * Robust mathematical prioritization engine that ranks wishlist items:
 * 1. Items 100% saved in envelope (0 risk, 0 budget impact) -> First
 * 2. High necessity items that fit within budget without crushing daily pace -> Second
 * 3. Items with minimal daily pace reduction -> Third
 * 4. Items that leave very little daily allowance (tight) -> Fourth
 * 5. Items exceeding monthly budget (defer / long-term savings) -> Last
 */
export function rankWishlistItemsAlgorithmic(
  items: WishlistItem[],
  analysis: DailySpendingAnalysis,
  totalBalance: number,
  currency: CurrencyCode,
  language: LanguageCode
): WishlistPrioritizationResult {
  const activeItems = items.filter((i) => i.status === 'planned' || i.status === 'saving');

  const evaluated = activeItems.map((item) => {
    const aff = evaluateAffordability(item, {
      monthlyBudget: analysis.monthly_budget,
      remainingBudget: analysis.remaining_budget,
      availableBalance: totalBalance,
      currency,
      language,
      remainingDays: analysis.remaining_days,
      spentToday: analysis.spent_today,
      averageDailySpending: analysis.average_daily_spending,
      recommendedDailyPace: analysis.recommended_daily_pace,
    });

    const price = Number(item.estimated_price) || 0;
    const saved = Number(item.saved_amount) || 0;
    const netRequired = Math.max(0, price - saved);
    const savedRatio = price > 0 ? saved / price : 0;

    // Score calculation (higher score = buy earlier)
    let score = 0;

    if (saved >= price) {
      // 100% saved items have top priority
      score += 10000;
    } else if (aff.verdict === 'comfortable') {
      score += 5000;
    } else if (aff.verdict === 'tight') {
      score += 2000;
    } else if (aff.verdict === 'requires_savings') {
      score += 1000;
    } else {
      score += 100;
    }

    // User priority weight
    if (item.priority === 'high') score += 300;
    else if (item.priority === 'medium') score += 150;
    else score += 50;

    // Favor items with higher saved percentage
    score += savedRatio * 200;

    // Penalize large daily pace drops
    if (analysis.recommended_daily_pace > 0) {
      const paceDropRatio = (aff.daily_pace_drop || 0) / analysis.recommended_daily_pace;
      score -= paceDropRatio * 150;
    }

    return {
      item,
      aff,
      price,
      saved,
      netRequired,
      score,
    };
  });

  // Sort descending by score
  evaluated.sort((a, b) => b.score - a.score);

  const ranked_items: PrioritizedWishlistItem[] = evaluated.map((e, index) => {
    const rank = index + 1;
    let urgency_tier: PrioritizedWishlistItem['urgency_tier'] = 'plan_this_month';
    let headline = '';
    let headline_ar = '';
    let ai_tip = '';
    let ai_tip_ar = '';

    if (e.saved >= e.price) {
      urgency_tier = 'immediate_buy';
      headline = 'Top Priority: Ready to Buy';
      headline_ar = 'الأولوية الأولى: جاهز للشراء فوراً';
      ai_tip = 'Fully funded from dedicated savings envelope. Zero impact on monthly cash flow.';
      ai_tip_ar = 'مغطى بالكامل من أموال الادخار المخصصة. ليس له أي تأثير سلبي على ميزانية ومصروف الشهر.';
    } else if (e.aff.verdict === 'comfortable') {
      urgency_tier = rank === 1 ? 'immediate_buy' : 'plan_this_month';
      headline = rank === 1 ? 'Best Choice for This Month' : 'Safe to Buy This Month';
      headline_ar = rank === 1 ? 'الخيار الأفضل للشراء الآن' : 'متاح للشراء بأمان هذا الشهر';
      ai_tip = `Leaves ${formatCurrency(e.aff.new_daily_pace || 0, currency, language)}/day for daily spending. Pacing remains stable.`;
      ai_tip_ar = `يترك مخصصاً يومياً قدره ${formatCurrency(e.aff.new_daily_pace || 0, currency, language)}/يوم. وتيرة الصرف ستظل مستقرة تماماً.`;
    } else if (e.aff.verdict === 'tight') {
      urgency_tier = 'save_incrementally';
      headline = 'Requires Careful Daily Pacing';
      headline_ar = 'يتطلب ترشيد الصرف اليومي بحذر';
      ai_tip = `Buying this reduces your daily allowance by ${formatCurrency(e.aff.daily_pace_drop || 0, currency, language)}/day. Consider waiting until mid-month or saving half first.`;
      ai_tip_ar = `شراؤه سيخفض مصروفك اليومي بمقدار ${formatCurrency(e.aff.daily_pace_drop || 0, currency, language)}/يوم. يُفضل تأجيله أو ادخار نصف المبلغ أولاً.`;
    } else {
      urgency_tier = 'defer_next_month';
      headline = 'Defer to Next Month or Savings Goal';
      headline_ar = 'تأجيل للشهر القادم أو وضعه بهدف ادخار';
      ai_tip = `Exceeds current monthly budget by ${formatCurrency(Math.abs(e.aff.remaining_after_purchase), currency, language)}. Don't break this month's budget pacing.`;
      ai_tip_ar = `يتجاوز ميزانية الشهر المتبقية بمقدار ${formatCurrency(Math.abs(e.aff.remaining_after_purchase), currency, language)}. لا تكسر ميزانية الشهر لتفادي العجز.`;
    }

    return {
      id: e.item.id,
      name: e.item.name,
      estimated_price: e.price,
      saved_amount: e.saved,
      net_required: e.netRequired,
      priority: e.item.priority,
      rank,
      urgency_tier,
      new_daily_pace: e.aff.new_daily_pace || 0,
      daily_pace_drop: e.aff.daily_pace_drop || 0,
      verdict: e.aff.verdict,
      headline,
      headline_ar,
      reasoning: e.aff.explanation,
      reasoning_ar: e.aff.explanation_ar,
      ai_tip,
      ai_tip_ar,
    };
  });

  const affordableCount = ranked_items.filter((i) => i.verdict === 'comfortable').length;
  let overall_strategy = '';
  let overall_strategy_ar = '';

  if (ranked_items.length === 0) {
    overall_strategy = 'Your wishlist is empty. Add items you wish to purchase to receive AI priority ranking.';
    overall_strategy_ar = 'قائمة رغباتك فارغة حالياً. أضف مشترياتك المخططة لتفعيل ترتيب الأولويات بالذكاء الاصطناعي.';
  } else if (analysis.monthly_budget <= 0) {
    overall_strategy = 'Define a monthly budget to unlock sustainable daily pacing and precise purchase timing.';
    overall_strategy_ar = 'حدد ميزانية شهرية لتفعيل حساب وتيرة الصرف اليومي وتحديد التوقيت الأمثل لكل غرض.';
  } else if (affordableCount > 0) {
    const topItem = ranked_items[0];
    overall_strategy = `You have ${affordableCount} purchase(s) safe for this month. Start with "${topItem.name}" to keep daily pace above ${formatCurrency(topItem.new_daily_pace, currency, language)}/day.`;
    overall_strategy_ar = `لديك ${affordableCount} غرض آمن للشراء هذا الشهر. ابدأ بـ "${topItem.name}" للحفاظ على مخصص يومي لا يقل عن ${formatCurrency(topItem.new_daily_pace, currency, language)}/يوم.`;
  } else {
    overall_strategy = 'Current spending pace is tight. Postpone non-essential wishlist purchases to protect daily living allowance.';
    overall_strategy_ar = 'وتيرة الإنفاق الحالية ضيقة هذا الشهر. يُفضل تأجيل المشتريات غير الضرورية لحماية مخصصك اليومي للأيام المتبقية.';
  }

  return {
    ranked_items,
    overall_strategy,
    overall_strategy_ar,
    current_daily_pace: analysis.recommended_daily_pace,
    remaining_budget: analysis.remaining_budget,
    remaining_days: analysis.remaining_days,
    total_balance: totalBalance,
    source: 'algorithmic',
  };
}

/**
 * Prioritize wishlist items using Google Gemini AI model when API key is available,
 * falling back seamlessly to the algorithmic prioritizer.
 */
export async function prioritizeWishlistWithAI(
  items: WishlistItem[],
  analysis: DailySpendingAnalysis,
  totalBalance: number,
  currency: CurrencyCode,
  language: LanguageCode
): Promise<WishlistPrioritizationResult> {
  const baseResult = rankWishlistItemsAlgorithmic(items, analysis, totalBalance, currency, language);
  if (items.length === 0) return baseResult;

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return baseResult;
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const payload = {
      financial_context: {
        monthly_budget: analysis.monthly_budget,
        total_spent: analysis.total_expenses,
        remaining_budget: analysis.remaining_budget,
        days_remaining_in_cycle: analysis.remaining_days,
        current_daily_allowance: analysis.recommended_daily_pace,
        average_daily_spending: analysis.average_daily_spending,
        spent_today: analysis.spent_today,
        total_account_balance: totalBalance,
        currency,
        language,
      },
      wishlist_items: items
        .filter((i) => i.status === 'planned' || i.status === 'saving')
        .map((i) => ({
          id: i.id,
          name: i.name,
          estimated_price: i.estimated_price,
          saved_amount: i.saved_amount,
          priority: i.priority,
        })),
    };

    const prompt = `You are the core AI financial intelligence model for Spendly (Personal Finance Workspace).
Analyze the user's financial context and rank what items from their wishlist they should buy first ("ترتيب الأولويات وما يجب شراؤه أولاً").
STRICT FINANCIAL RULES:
1. NEVER declare an item 'comfortable' merely because total_account_balance is positive!
2. Calculate affordability strictly based on remaining_budget, remaining days, daily spending pace, and the recommended daily pace drop.
3. If an item drastically crushes daily allowance below average_daily_spending, rank it lower or mark it tight/defer.
4. Output strict JSON with:
{
  "overall_strategy_ar": "نصيحة استراتيجية عامة باللغة العربية بلهجة مصرية مهذبة وذكية مالياً",
  "overall_strategy_en": "Overall financial strategy in English",
  "rankings": [
    {
      "id": "item_id",
      "rank": 1,
      "headline_ar": "عنوان موجز للأولوية",
      "headline_en": "Headline in English",
      "ai_tip_ar": "نصيحة ذكية عن الأثر اليومي والتوقيت",
      "ai_tip_en": "Smart advice on daily pace impact and timing",
      "urgency_tier": "immediate_buy" | "plan_this_month" | "save_incrementally" | "defer_next_month"
    }
  ]
}

Data:
${JSON.stringify(payload, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed.rankings && Array.isArray(parsed.rankings)) {
        const enrichedItems: PrioritizedWishlistItem[] = [...baseResult.ranked_items];

        parsed.rankings.forEach((geminiItem: any) => {
          const match = enrichedItems.find((i) => i.id === geminiItem.id);
          if (match) {
            if (geminiItem.headline_ar) match.headline_ar = geminiItem.headline_ar;
            if (geminiItem.headline_en) match.headline = geminiItem.headline_en;
            if (geminiItem.ai_tip_ar) match.ai_tip_ar = geminiItem.ai_tip_ar;
            if (geminiItem.ai_tip_en) match.ai_tip = geminiItem.ai_tip_en;
            if (geminiItem.urgency_tier) match.urgency_tier = geminiItem.urgency_tier;
            if (typeof geminiItem.rank === 'number') match.rank = geminiItem.rank;
          }
        });

        // Re-sort if Gemini changed rank
        enrichedItems.sort((a, b) => a.rank - b.rank);

        return {
          ranked_items: enrichedItems,
          overall_strategy: parsed.overall_strategy_en || baseResult.overall_strategy,
          overall_strategy_ar: parsed.overall_strategy_ar || baseResult.overall_strategy_ar,
          current_daily_pace: baseResult.current_daily_pace,
          remaining_budget: baseResult.remaining_budget,
          remaining_days: baseResult.remaining_days,
          total_balance: baseResult.total_balance,
          source: 'gemini',
        };
      }
    }
  } catch (err) {
    console.warn('Gemini API call skipped or failed, using algorithmic ranking:', err);
  }

  return baseResult;
}

/**
 * Generate a conversational financial advice message and daily velocity briefing.
 */
export async function generateFinancialAdviceMessage(
  analysis: DailySpendingAnalysis,
  totalBalance: number,
  wishlistItems: WishlistItem[],
  currency: CurrencyCode,
  language: LanguageCode
): Promise<FinancialAdviceMessage> {
  const apiKey = getGeminiApiKey();

  // Algorithmic default
  const remainingBudget = analysis.remaining_budget;
  const pace = analysis.recommended_daily_pace;
  const avg = analysis.average_daily_spending;
  const isPaceOver = avg > pace && pace > 0;
  const isBudgetExceeded = analysis.total_expenses > analysis.monthly_budget && analysis.monthly_budget > 0;

  const status: FinancialAdviceMessage['status'] = isBudgetExceeded
    ? 'critical'
    : isPaceOver
    ? 'caution'
    : 'healthy';

  let title = 'Financial Pace Briefing';
  let title_ar = 'تقرير وتيرة الإنفاق الذكي';
  let summary = `Your daily spending pace is currently ${formatCurrency(avg, currency, language)}/day compared to your recommended ${formatCurrency(pace, currency, language)}/day target.`;
  let summary_ar = `متوسط إنفاقك اليومي حالياً ${formatCurrency(avg, currency, language)}/يوم مقارنة بالمخصص المقترح ${formatCurrency(pace, currency, language)}/يوم.`;
  let daily_pace_advice = isPaceOver
    ? `You are spending above your sustainable daily pace. Trimming daily spending by ${formatCurrency(avg - pace, currency, language)}/day will keep you on track.`
    : `Your spending velocity is healthy and leaves ${formatCurrency(remainingBudget, currency, language)} across ${analysis.remaining_days} remaining days.`;
  let daily_pace_advice_ar = isPaceOver
    ? `أنت تصرف أعلى من الوتيرة المستدامة. تقليل الصرف اليومي بمقدار ${formatCurrency(avg - pace, currency, language)}/يوم يعيدك لمسار الأمان.`
    : `وتيرة صرفك صحية ومتزنة، ويتبقى لديك ${formatCurrency(remainingBudget, currency, language)} على مدار الـ ${analysis.remaining_days} يوماً المتبقية.`;
  let top_recommendation = 'Maintain budget discipline and avoid unexpected non-essential purchases.';
  let top_recommendation_ar = 'التزم بالمخصص اليومي وأجّل أي مشتريات كمالية غير مجدولة حتى بداية الشهر الجديد.';

  if (apiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are Spendly's AI financial advisor. Provide a smart, concise financial briefing in JSON:
Financial Context:
- Monthly Budget: ${analysis.monthly_budget} ${currency}
- Total Spent: ${analysis.total_expenses} ${currency}
- Remaining Budget: ${remainingBudget} ${currency}
- Days Left: ${analysis.remaining_days}
- Daily Allowance: ${pace} ${currency}/day
- Average Daily Spending: ${avg} ${currency}/day
- Spent Today: ${analysis.spent_today} ${currency}
- Total Money in Account: ${totalBalance} ${currency}

Rules:
- Give sound mathematical advice based on budget and daily velocity, NOT just having account money.
- Respond in JSON:
{
  "title_ar": "عنوان موجز وجذاب",
  "title_en": "Brief catchy title",
  "summary_ar": "ملخص وضع الصرف بالعامية المصرية الراقية",
  "summary_en": "English summary of spending status",
  "daily_pace_advice_ar": "نصيحة محددة للمصروف اليومي بالأرقام",
  "daily_pace_advice_en": "Specific daily pace recommendation with numbers",
  "top_recommendation_ar": "أهم إجراء ينصح به الآن",
  "top_recommendation_en": "Top actionable step to take now",
  "status": "healthy" | "caution" | "critical"
}`;

      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (res.text) {
        const p = JSON.parse(res.text);
        return {
          id: `advice-${Date.now()}`,
          title: p.title_en || title,
          title_ar: p.title_ar || title_ar,
          summary: p.summary_en || summary,
          summary_ar: p.summary_ar || summary_ar,
          daily_pace_advice: p.daily_pace_advice_en || daily_pace_advice,
          daily_pace_advice_ar: p.daily_pace_advice_ar || daily_pace_advice_ar,
          top_recommendation: p.top_recommendation_en || top_recommendation,
          top_recommendation_ar: p.top_recommendation_ar || top_recommendation_ar,
          status: p.status || status,
          timestamp: new Date().toISOString(),
          source: 'gemini',
        };
      }
    } catch (e) {
      console.warn('Gemini advice call skipped, using local engine:', e);
    }
  }

  return {
    id: `advice-${Date.now()}`,
    title,
    title_ar,
    summary,
    summary_ar,
    daily_pace_advice,
    daily_pace_advice_ar,
    top_recommendation,
    top_recommendation_ar,
    status,
    timestamp: new Date().toISOString(),
    source: 'algorithmic',
  };
}
