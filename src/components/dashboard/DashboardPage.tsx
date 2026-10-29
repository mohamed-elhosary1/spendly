import React, { useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  PieChart as PieIcon,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import { formatCurrency } from '@/lib/currency';
import { formatDateString, parseISO } from '@/lib/dateUtils';
import { Card } from '@/components/ui/Card';
import { TiltCard } from '@/components/ui/TiltCard';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyState } from '@/components/ui/EmptyState';

export const DashboardPage: React.FC = () => {
  const {
    transactions,
    dailySpendingAnalysis,
    selectedYear,
    selectedMonth,
    language,
    currency,
    categories,
    setActivePage,
  } = useApp();
  const { t, isRTL } = useTranslation(language);

  const {
    monthly_budget,
    total_expenses,
    remaining_budget,
    total_days_in_month,
    remaining_days,
    average_daily_spending,
    recommended_daily_pace,
    budget_consumption_pct,
    projected_month_end_spending,
    projected_variance,
    is_preliminary,
    assessment_level,
    assessment_title,
    assessment_title_ar,
    assessment_explanation,
    assessment_explanation_ar,
  } = dailySpendingAnalysis;

  // Filter transactions for this selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      try {
        const d = parseISO(t.transaction_date);
        return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
      } catch {
        return false;
      }
    });
  }, [transactions, selectedYear, selectedMonth]);

  // Total Income this month
  const totalIncome = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [monthTransactions]);

  // Daily Spending Chart Data
  const dailyChartData = useMemo(() => {
    const daysMap: Record<number, number> = {};
    for (let day = 1; day <= total_days_in_month; day++) {
      daysMap[day] = 0;
    }

    monthTransactions.forEach((t) => {
      if (t.type === 'expense') {
        try {
          const d = parseISO(t.transaction_date);
          const dayNum = d.getDate();
          if (daysMap[dayNum] !== undefined) {
            daysMap[dayNum] += Number(t.amount) || 0;
          }
        } catch {}
      }
    });

    return Object.entries(daysMap).map(([day, amount]) => ({
      day: parseInt(day),
      displayDay: `${day}`,
      amount: Math.round(amount),
    }));
  }, [monthTransactions, total_days_in_month]);

  // Category Breakdown Data
  const categoryData = useMemo(() => {
    const catMap: Record<string, { name: string; amount: number; color: string }> = {};

    monthTransactions.forEach((t) => {
      if (t.type === 'expense') {
        const cat = categories.find((c) => c.id === t.category_id);
        const catName = (language === 'ar' ? cat?.name_ar : cat?.name) || 'Other';
        const catColor = cat?.color || '#94a3b8';

        if (!catMap[catName]) {
          catMap[catName] = { name: catName, amount: 0, color: catColor };
        }
        catMap[catName].amount += Number(t.amount) || 0;
      }
    });

    return Object.values(catMap).sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, categories, language]);

  // Recent 5 transactions
  const recentTransactions = useMemo(() => {
    return monthTransactions.slice(0, 5);
  }, [monthTransactions]);

  // Alerts
  const alerts = useMemo(() => {
    const list: { type: 'danger' | 'warning' | 'info'; title: string; desc: string }[] = [];

    if (monthly_budget > 0 && total_expenses > monthly_budget) {
      list.push({
        type: 'danger',
        title: language === 'ar' ? 'تجاوز الميزانية' : 'Budget Exceeded',
        desc:
          language === 'ar'
            ? `لقد تجاوزت ميزانيتك بمقدار ${formatCurrency(total_expenses - monthly_budget, currency, language)}.`
            : `You have exceeded your monthly budget by ${formatCurrency(total_expenses - monthly_budget, currency, language)}.`,
      });
    } else if (monthly_budget > 0 && budget_consumption_pct >= 85) {
      list.push({
        type: 'warning',
        title: language === 'ar' ? 'تنبيه الاقتراب من الحد' : 'Approaching Budget Limit',
        desc:
          language === 'ar'
            ? `استهلكت ${budget_consumption_pct.toFixed(0)}% من الميزانية، تبقى ${remaining_days} يوماً.`
            : `You have consumed ${budget_consumption_pct.toFixed(0)}% of your budget with ${remaining_days} days remaining.`,
      });
    }

    if (average_daily_spending > recommended_daily_pace * 1.3 && remaining_days > 2) {
      list.push({
        type: 'info',
        title: language === 'ar' ? 'وتيرة إنفاق مرتفعة' : 'Above Target Pace',
        desc:
          language === 'ar'
            ? `متوسط إنفاقك الحالي (${formatCurrency(average_daily_spending, currency, language)}/يوم) أعلى من المخصص المستدام (${formatCurrency(recommended_daily_pace, currency, language)}/يوم).`
            : `Your recent pace of ${formatCurrency(average_daily_spending, currency, language)}/day exceeds the recommended allowance of ${formatCurrency(recommended_daily_pace, currency, language)}/day.`,
      });
    }

    return list;
  }, [
    monthly_budget,
    total_expenses,
    budget_consumption_pct,
    remaining_days,
    average_daily_spending,
    recommended_daily_pace,
    currency,
    language,
  ]);

  const assessmentBadgeVariant =
    assessment_level === 'within_budget'
      ? 'success'
      : assessment_level === 'above_pace'
      ? 'warning'
      : 'destructive';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Daily Financial Assessment Banner */}
      <TiltCard
        maxTilt={2}
        glowColor="16, 185, 129"
        className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent relative overflow-hidden"
      >
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <Badge variant={assessmentBadgeVariant} className="px-3 py-1 font-semibold text-xs flex items-center gap-1.5 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
                <span>{language === 'ar' ? assessment_title_ar : assessment_title}</span>
              </Badge>
              {is_preliminary && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {t('metric_preliminary')}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground/90 leading-relaxed">
              {language === 'ar' ? assessment_explanation_ar : assessment_explanation}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setActivePage('workspace')}
              className="gap-2 shadow-lg shadow-emerald-600/25 font-bold hover:shadow-emerald-500/35 transition-all group"
            >
              <Sparkles className="h-4 w-4 text-emerald-200 transition-transform group-hover:rotate-12" />
              <span>{t('nav_workspace')}</span>
            </Button>
          </div>
        </div>
      </TiltCard>

      {/* 2. Top Summary Metric Cards with 3D Tilt & Lighting */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Monthly Budget */}
        <TiltCard maxTilt={4} glowColor="16, 185, 129" className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('metric_monthly_budget')}</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg sm:text-2xl font-black text-foreground tracking-tight">
              {formatCurrency(monthly_budget, currency, language, { showDecimals: false })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {monthly_budget > 0
                ? `${budget_consumption_pct.toFixed(0)}% consumed`
                : 'No budget set'}
            </p>
          </div>
        </TiltCard>

        {/* Total Expenses */}
        <TiltCard maxTilt={4} glowColor="244, 63, 94" className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('metric_total_expenses')}</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {formatCurrency(total_expenses, currency, language, { showDecimals: false })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {monthTransactions.filter((t) => t.type === 'expense').length} transactions
            </p>
          </div>
        </TiltCard>

        {/* Remaining Budget */}
        <TiltCard
          maxTilt={4.2}
          glowColor={remaining_budget < 0 ? '244, 63, 94' : '6, 182, 212'}
          className="p-4 sm:p-5 border-sky-500/30"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('metric_remaining_budget')}</span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div
              className={`text-lg sm:text-2xl font-black tracking-tight ${
                remaining_budget < 0 ? 'text-rose-500' : 'text-foreground'
              }`}
            >
              {formatCurrency(remaining_budget, currency, language, { showDecimals: false })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {remaining_days} days left in cycle
            </p>
          </div>
        </TiltCard>

        {/* Total Income */}
        <TiltCard maxTilt={4} glowColor="16, 185, 129" className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('metric_total_income')}</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(totalIncome, currency, language, { showDecimals: false })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Net: {formatCurrency(totalIncome - total_expenses, currency, language, { showDecimals: false })}
            </p>
          </div>
        </TiltCard>
      </div>

      {/* 3. Monthly Budget Progress & Pacing Metrics */}
      <TiltCard maxTilt={2.2} glowColor="16, 185, 129" className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-foreground">{t('metric_monthly_budget')} Progress</h3>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(total_expenses, currency, language)} {t('spent_of')}{' '}
              {formatCurrency(monthly_budget, currency, language)}
            </p>
          </div>
          <div className="text-sm font-black text-foreground">
            {budget_consumption_pct.toFixed(1)}%
          </div>
        </div>

        {/* Budget Progress Bar with Clamped visual + Real label */}
        <ProgressBar value={budget_consumption_pct} showLabel size="lg" />

        {/* Pacing Breakdown Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">
              {t('metric_daily_average')}
            </span>
            <span className="text-sm sm:text-base font-bold text-foreground">
              {formatCurrency(average_daily_spending, currency, language, { showDecimals: false })}/day
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">
              {t('metric_recommended_pace')}
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(recommended_daily_pace, currency, language, { showDecimals: false })}/day
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">
              {t('metric_projected_month_end')}
            </span>
            <span className="text-sm sm:text-base font-bold text-foreground">
              {formatCurrency(projected_month_end_spending, currency, language, { showDecimals: false })}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">
              {projected_variance >= 0 ? t('metric_projected_surplus') : t('metric_projected_deficit')}
            </span>
            <span
              className={`text-sm sm:text-base font-bold ${
                projected_variance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-500'
              }`}
            >
              {formatCurrency(Math.abs(projected_variance), currency, language, { showDecimals: false })}
            </span>
          </div>
        </div>
      </TiltCard>

      {/* 4. Charts Section: Daily Trend + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily Spending Trend (2 cols on lg) */}
        <TiltCard maxTilt={1.8} glowColor="16, 185, 129" className="lg:col-span-2 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">{t('chart_daily_spending')}</h3>
              <p className="text-xs text-muted-foreground">Expenses recorded by calendar day</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendingBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="displayDay"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-emerald-500/30 bg-background/95 backdrop-blur-md p-2.5 shadow-xl shadow-black/40 text-xs">
                          <p className="font-semibold text-muted-foreground">Day {data.day}</p>
                          <p className="font-black text-emerald-500 text-sm mt-0.5">
                            {formatCurrency(data.amount, currency, language)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" fill="url(#spendingBarGrad)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TiltCard>

        {/* Expenses by Category (1 col on lg) */}
        <TiltCard maxTilt={1.8} glowColor="20, 184, 166" className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">{t('chart_category_breakdown')}</h3>
              <p className="text-xs text-muted-foreground">Top spending categories</p>
            </div>
            <PieIcon className="h-4 w-4 text-muted-foreground" />
          </div>

          {categoryData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <PieIcon className="h-10 w-10 opacity-30 mb-2" />
              <p className="text-xs">No expenses recorded for this month yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          return (
                            <div className="rounded-xl border border-teal-500/30 bg-background/95 backdrop-blur-md p-2.5 shadow-xl shadow-black/40 text-xs">
                              <p className="font-semibold text-foreground/90">{data.name}</p>
                              <p className="font-bold text-teal-400 text-sm mt-0.5">
                                {formatCurrency(Number(data.value), currency, language)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Legend List */}
              <div className="space-y-2 max-h-36 overflow-y-auto pe-1 text-xs">
                {categoryData.slice(0, 4).map((cat) => {
                  const pct = total_expenses > 0 ? (cat.amount / total_expenses) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium text-foreground truncate max-w-[120px]">
                          {cat.name}
                        </span>
                      </div>
                      <span className="font-bold text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TiltCard>
      </div>

      {/* 5. Budget Alerts & Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Budget Alerts (1 col) */}
        <TiltCard maxTilt={2} glowColor="245, 158, 11" className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">{t('budget_alerts')}</h3>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>

          {alerts.length === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{t('no_alerts')}</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    alert.type === 'danger'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                      : alert.type === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300'
                  }`}
                >
                  <p className="font-bold">{alert.title}</p>
                  <p className="opacity-90">{alert.desc}</p>
                </div>
              ))}
            </div>
          )}
        </TiltCard>

        {/* Recent Transactions (2 cols) */}
        <TiltCard maxTilt={1.8} glowColor="16, 185, 129" className="lg:col-span-2 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">{t('recent_transactions')}</h3>
              <p className="text-xs text-muted-foreground">Latest transactions logged this month</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActivePage('transactions')}
              className="text-xs font-semibold gap-1 text-emerald-600 dark:text-emerald-400"
            >
              <span>{t('action_view_all')}</span>
              <ChevronRight className={isRTL ? 'rotate-180 h-3.5 w-3.5' : 'h-3.5 w-3.5'} />
            </Button>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyState
              title={language === 'ar' ? 'لا توجد معاملات مسجلة' : 'No transactions recorded yet'}
              description={
                language === 'ar'
                  ? 'سجل أول مصروف أو دخل لك لبدء متابعة ميزانيتك ووتيرة إنفاقك.'
                  : 'Log your first expense or income to begin evaluating your spending pace and budget.'
              }
              mascotMood="curious"
              actionLabel={t('action_add')}
              onAction={() => setActivePage('workspace')}
              className="py-8 border-0 bg-transparent"
            />
          ) : (
            <div className="space-y-2.5">
              {recentTransactions.map((tx) => {
                const cat = categories.find((c) => c.id === tx.category_id);
                const isExpense = tx.type === 'expense';
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-border/50 bg-secondary/20 hover:bg-secondary/60 hover:border-emerald-500/30 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        iconName={cat?.icon || 'Tag'}
                        color={cat?.color}
                        size={16}
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateString(tx.transaction_date, language)} •{' '}
                          {(language === 'ar' ? cat?.name_ar : cat?.name) || 'Expense'}
                        </p>
                      </div>
                    </div>

                    <div className="text-end">
                      <p
                        className={`text-sm font-bold ${
                          isExpense ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatCurrency(tx.amount, tx.currency, language)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TiltCard>
      </div>
    </div>
  );
};
