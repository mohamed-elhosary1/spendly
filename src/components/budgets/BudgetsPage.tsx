import React, { useState, useMemo } from 'react';
import {
  Edit2,
  Trash2,
  Layers,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import { formatCurrency } from '@/lib/currency';
import { MONTH_NAMES, parseISO } from '@/lib/dateUtils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export const BudgetsPage: React.FC = () => {
  const {
    currentMonthBudget,
    categoryBudgets,
    categories,
    transactions,
    currency,
    language,
    selectedYear,
    selectedMonth,
    saveMonthlyBudget,
    saveCategoryBudgets,
    dailySpendingAnalysis,
  } = useApp();
  const { t } = useTranslation(language);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState<string>(
    currentMonthBudget ? currentMonthBudget.total_budget.toString() : '10000'
  );
  const [budgetNotes, setBudgetNotes] = useState<string>(currentMonthBudget?.notes || '');

  // Category limits edit map
  const [catLimits, setCatLimits] = useState<Record<string, string>>({});

  const openConfigureModal = () => {
    setTotalBudgetInput(currentMonthBudget ? currentMonthBudget.total_budget.toString() : '10000');
    setBudgetNotes(currentMonthBudget?.notes || '');

    const limitMap: Record<string, string> = {};
    categoryBudgets.forEach((cb) => {
      limitMap[cb.category_id] = cb.amount.toString();
    });
    setCatLimits(limitMap);
    setIsEditModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = parseFloat(totalBudgetInput);
    if (isNaN(totalNum) || totalNum < 0) return;

    // 1. Save overall budget
    const saved = await saveMonthlyBudget({
      id: currentMonthBudget?.id,
      year: selectedYear,
      month: selectedMonth,
      total_budget: totalNum,
      currency,
      notes: budgetNotes.trim() || undefined,
    });

    // 2. Save category budgets
    const categoryBudgetEntries: { category_id: string; amount: number }[] = [];
    Object.entries(catLimits).forEach(([catId, amtStr]) => {
      const amt = parseFloat(amtStr);
      if (!isNaN(amt) && amt > 0) {
        categoryBudgetEntries.push({
          category_id: catId,
          amount: amt,
        });
      }
    });

    await saveCategoryBudgets(saved.id, categoryBudgetEntries);
    setIsEditModalOpen(false);
  };

  // Month transactions
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

  // Spending per category map
  const spentPerCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthTransactions.forEach((t) => {
      if (t.type === 'expense' && t.category_id) {
        map[t.category_id] = (map[t.category_id] || 0) + Number(t.amount);
      }
    });
    return map;
  }, [monthTransactions]);

  const monthName = MONTH_NAMES[language]?.[selectedMonth - 1] || MONTH_NAMES.en[selectedMonth - 1];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header & Config Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">{t('budgets_title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {monthName} {selectedYear} • {t('budgets_subtitle')}
          </p>
        </div>

        <Button size="sm" onClick={openConfigureModal} className="gap-1.5 font-semibold text-xs">
          <Edit2 className="h-3.5 w-3.5" />
          <span>{t('set_budget_btn')}</span>
        </Button>
      </div>

      {/* Overall Monthly Budget Hero Card */}
      <Card className="p-6 space-y-5 bg-gradient-to-br from-card via-card to-emerald-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Badge variant="default" className="text-xs mb-2">
              {t('overall_budget_card')}
            </Badge>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {formatCurrency(
                dailySpendingAnalysis.monthly_budget,
                currency,
                language,
                { showDecimals: false }
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(dailySpendingAnalysis.total_expenses, currency, language)}{' '}
              {t('spent_of')}{' '}
              {formatCurrency(dailySpendingAnalysis.monthly_budget, currency, language)}
            </p>
          </div>

          <div className="text-end">
            <span className="text-2xl sm:text-3xl font-black text-foreground">
              {dailySpendingAnalysis.budget_consumption_pct.toFixed(1)}%
            </span>
            <p
              className={`text-xs font-semibold mt-1 ${
                dailySpendingAnalysis.remaining_budget < 0
                  ? 'text-rose-500'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {dailySpendingAnalysis.remaining_budget < 0
                ? `${t('exceeded_by')} ${formatCurrency(
                    Math.abs(dailySpendingAnalysis.remaining_budget),
                    currency,
                    language
                  )}`
                : `${formatCurrency(
                    dailySpendingAnalysis.remaining_budget,
                    currency,
                    language
                  )} remaining`}
            </p>
          </div>
        </div>

        {/* Real & Clamped progress bar */}
        <ProgressBar
          value={dailySpendingAnalysis.budget_consumption_pct}
          size="lg"
          showLabel
        />
      </Card>

      {/* Category-Specific Budgets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">{t('category_budgets_title')}</h3>
            <p className="text-xs text-muted-foreground">
              Track spending against category allocations
            </p>
          </div>
        </div>

        {categoryBudgets.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground">
              No category-specific limits configured for this month. You can set limits for Food,
              Transport, Shopping, etc.
            </p>
            <Button size="sm" variant="outline" onClick={openConfigureModal} className="text-xs">
              Configure Category Budgets
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryBudgets.map((cb) => {
              const cat = categories.find((c) => c.id === cb.category_id);
              const spent = spentPerCategory[cb.category_id] || 0;
              const limit = cb.amount;
              const pct = limit > 0 ? (spent / limit) * 100 : 0;
              const remaining = limit - spent;

              return (
                <Card key={cb.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon
                        iconName={cat?.icon || 'Tag'}
                        color={cat?.color}
                        size={16}
                      />
                      <span className="text-sm font-bold text-foreground">
                        {(language === 'ar' ? cat?.name_ar : cat?.name) || 'Category'}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  <ProgressBar value={pct} size="sm" />

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>
                      {formatCurrency(spent, currency, language)} / {formatCurrency(limit, currency, language)}
                    </span>
                    <span
                      className={`font-semibold ${
                        remaining < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {remaining < 0
                        ? `${t('exceeded_by')} ${formatCurrency(Math.abs(remaining), currency, language)}`
                        : `${formatCurrency(remaining, currency, language)} left`}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Budget Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Configure Monthly & Category Budgets"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBudget} className="space-y-5">
          <Input
            label={`Overall Monthly Budget (${currency})`}
            type="number"
            step="100"
            min="0"
            value={totalBudgetInput}
            onChange={(e) => setTotalBudgetInput(e.target.value)}
            required
          />

          <div className="space-y-3">
            <span className="text-xs font-bold text-foreground/80 block">
              Optional Category Limits ({currency})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
              {categories
                .filter((c) => c.type === 'expense')
                .map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <CategoryIcon iconName={cat.icon} color={cat.color} size={14} />
                    <Input
                      label={language === 'ar' ? cat.name_ar : cat.name}
                      type="number"
                      step="50"
                      min="0"
                      placeholder="0"
                      value={catLimits[cat.id] || ''}
                      onChange={(e) =>
                        setCatLimits((prev) => ({
                          ...prev,
                          [cat.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
            </div>
          </div>

          <Input
            label="Notes (Optional)"
            placeholder="e.g. Higher budget due to travel plans"
            value={budgetNotes}
            onChange={(e) => setBudgetNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              {t('action_cancel')}
            </Button>
            <Button type="submit" size="sm" className="font-semibold">
              {t('action_save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
