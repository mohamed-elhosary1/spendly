import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingDown,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Award,
  ArrowUpRight,
  ArrowDownRight,
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
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import { formatCurrency } from '@/lib/currency';
import { MONTH_NAMES, formatDateString, getTodayDateString, parseISO } from '@/lib/dateUtils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const ReportsPage: React.FC = () => {
  const {
    transactions,
    monthlyBudgets,
    categories,
    wishlistItems,
    savingsGoals,
    selectedYear,
    selectedMonth,
    currency,
    language,
  } = useApp();
  const { t } = useTranslation(language);

  // Timeframe filter: this month vs past 3 months vs full year
  const [timeframe, setTimeframe] = useState<'current_month' | 'past_3_months' | 'year'>(
    'current_month'
  );

  // Filter transactions according to selected timeframe
  const reportTransactions = useMemo(() => {
    return transactions.filter((t) => {
      try {
        const d = parseISO(t.transaction_date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;

        if (timeframe === 'current_month') {
          return y === selectedYear && m === selectedMonth;
        } else if (timeframe === 'past_3_months') {
          // within 90 days
          const diffDays = (new Date().getTime() - d.getTime()) / (1000 * 3600 * 24);
          return diffDays >= 0 && diffDays <= 90;
        } else if (timeframe === 'year') {
          return y === selectedYear;
        }
        return true;
      } catch {
        return false;
      }
    });
  }, [transactions, timeframe, selectedYear, selectedMonth]);

  // Aggregates
  const {
    totalExpenses,
    totalIncome,
    netCashflow,
    largestExpense,
    mostExpensiveDay,
    dailyAverages,
  } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    let maxExp: any = null;
    const dayTotals: Record<string, number> = {};

    reportTransactions.forEach((t) => {
      if (t.type === 'expense') {
        exp += Number(t.amount) || 0;
        if (!maxExp || t.amount > maxExp.amount) {
          maxExp = t;
        }
        dayTotals[t.transaction_date] = (dayTotals[t.transaction_date] || 0) + Number(t.amount);
      } else if (t.type === 'income') {
        inc += Number(t.amount) || 0;
      }
    });

    let topDay = { date: '', amount: 0 };
    Object.entries(dayTotals).forEach(([date, amt]) => {
      if (amt > topDay.amount) {
        topDay = { date, amount: amt };
      }
    });

    const activeDaysCount = Math.max(1, Object.keys(dayTotals).length);
    const dailyAvg = exp / activeDaysCount;

    return {
      totalExpenses: exp,
      totalIncome: inc,
      netCashflow: inc - exp,
      largestExpense: maxExp,
      mostExpensiveDay: topDay,
      dailyAverages: dailyAvg,
    };
  }, [reportTransactions]);

  // Category Breakdown for Reports
  const categoryChartData = useMemo(() => {
    const map: Record<string, { name: string; amount: number; color: string }> = {};

    reportTransactions.forEach((t) => {
      if (t.type === 'expense') {
        const cat = categories.find((c) => c.id === t.category_id);
        const name = (language === 'ar' ? cat?.name_ar : cat?.name) || 'Other';
        const color = cat?.color || '#94a3b8';

        if (!map[name]) {
          map[name] = { name, amount: 0, color };
        }
        map[name].amount += Number(t.amount) || 0;
      }
    });

    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [reportTransactions, categories, language]);

  // Monthly Budget Comparison
  const currentBudget = monthlyBudgets.find(
    (b) => b.year === selectedYear && b.month === selectedMonth
  );

  // CSV export
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Currency', 'Notes'];
    const rows = reportTransactions.map((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      return [
        t.transaction_date,
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${cat?.name || 'Uncategorized'}"`,
        t.amount,
        t.currency,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Spendly_Report_${timeframe}_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">{t('reports_title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('reports_subtitle')}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-secondary/80 p-1 rounded-xl border border-border/50 text-xs font-semibold">
            <button
              onClick={() => setTimeframe('current_month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === 'current_month'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe('past_3_months')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === 'past_3_months'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setTimeframe('year')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === 'year'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {selectedYear}
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>{t('action_export_csv')}</span>
          </Button>
        </div>
      </div>

      {/* Hero Financial Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Expenses */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('metric_total_expenses')}</span>
            <ArrowDownRight className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {formatCurrency(totalExpenses, currency, language, { showDecimals: false })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Avg: {formatCurrency(dailyAverages, currency, language, { showDecimals: false })} / active day
          </p>
        </Card>

        {/* Total Income */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('metric_total_income')}</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatCurrency(totalIncome, currency, language, { showDecimals: false })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {reportTransactions.filter((t) => t.type === 'income').length} income records
          </p>
        </Card>

        {/* Net Cash Flow */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('net_cashflow')}</span>
            <TrendingUp className="h-4 w-4 text-sky-500" />
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              netCashflow >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {netCashflow >= 0 ? '+' : ''}
            {formatCurrency(netCashflow, currency, language, { showDecimals: false })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {netCashflow >= 0 ? 'Cash surplus' : 'Cash deficit'}
          </p>
        </Card>
      </div>

      {/* Behavioral Insights: Largest Expense & Peak Day */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Largest Single Expense */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('largest_single_expense')}
            </span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>

          {largestExpense ? (
            <div>
              <div className="text-xl font-black text-foreground">
                {formatCurrency(largestExpense.amount, largestExpense.currency, language)}
              </div>
              <p className="text-xs font-bold text-foreground mt-1">{largestExpense.description}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDateString(largestExpense.transaction_date, language)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No expenses recorded yet.</p>
          )}
        </Card>

        {/* Most Expensive Day */}
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('most_expensive_day')}
            </span>
            <Calendar className="h-4 w-4 text-indigo-500" />
          </div>

          {mostExpensiveDay.amount > 0 ? (
            <div>
              <div className="text-xl font-black text-foreground">
                {formatCurrency(mostExpensiveDay.amount, currency, language)}
              </div>
              <p className="text-xs font-bold text-foreground mt-1">
                {formatDateString(mostExpensiveDay.date, language)}
              </p>
              <p className="text-[11px] text-muted-foreground">Highest single-day expenditure</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No expenses recorded yet.</p>
          )}
        </Card>
      </div>

      {/* Category Breakdown Chart */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">{t('chart_category_breakdown')}</h3>
            <p className="text-xs text-muted-foreground">Distribution of expenditures by category</p>
          </div>
        </div>

        {categoryChartData.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs">
            No expenses recorded for this timeframe.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={3}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val), currency, language), 'Spent']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {categoryChartData.map((cat) => {
                const pct = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-semibold text-foreground">{cat.name}</span>
                      </div>
                      <span className="font-bold text-foreground">
                        {formatCurrency(cat.amount, currency, language)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
