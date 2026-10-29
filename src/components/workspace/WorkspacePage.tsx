import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  AlertCircle,
  Check,
  Trash2,
  Edit2,
  Plus,
  HelpCircle,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import {
  parseNaturalLanguageInput,
  matchCategory,
} from '@/lib/parser';
import {
  ParsedCommand,
  ParsedItem,
  TransactionType,
  CurrencyCode,
} from '@/types';
import { formatCurrency } from '@/lib/currency';
import { getTodayDateString, formatDateString } from '@/lib/dateUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export const WorkspacePage: React.FC = () => {
  const {
    user,
    categories,
    transactions,
    currency,
    language,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    dailySpendingAnalysis,
    setActivePage,
  } = useApp();
  const { t, isRTL } = useTranslation(language);

  const [activeTab, setActiveTab] = useState<'nl' | 'manual'>('nl');
  const [inputText, setInputText] = useState<string>('');
  const [stagedItems, setStagedItems] = useState<ParsedItem[]>([]);
  const [queryFeedback, setQueryFeedback] = useState<{
    title: string;
    description: string;
    items?: any[];
  } | null>(null);

  // Mutation confirmation modal state (for destructive/update natural language commands)
  const [pendingMutation, setPendingMutation] = useState<{
    action: 'update' | 'delete';
    targetTx: any;
    newAmount?: number;
    explanation: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Manual fallback form state
  const [manualDescription, setManualDescription] = useState<string>('');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualType, setManualType] = useState<TransactionType>('expense');
  const [manualCategory, setManualCategory] = useState<string>(categories[0]?.id || '');
  const [manualDate, setManualDate] = useState<string>(getTodayDateString());
  const [manualNotes, setManualNotes] = useState<string>('');

  const samplePrompts = [
    {
      en: 'I spent 85 EGP on lunch, 30 EGP on transportation, and 20 EGP on coffee',
      ar: 'صرفت 85 جنيه على الغدا و 30 جنيه مواصلات و 20 جنيه قهوة',
    },
    {
      en: 'How much did I spend today?',
      ar: 'كم صرفت اليوم؟',
    },
    {
      en: 'How much budget do I have left?',
      ar: 'كم الميزانية المتبقية؟',
    },
    {
      en: 'I spent 250 EGP on internet',
      ar: 'صرفت 250 جنيه على النت',
    },
    {
      en: 'I received 2500 EGP freelance project',
      ar: 'استلمت 2500 جنيه مشروع فريلانس',
    },
    {
      en: 'Change the lunch expense from 85 to 70 EGP',
      ar: 'عدل مصروف الغدا من 85 ل 70',
    },
    {
      en: 'Delete the coffee transaction',
      ar: 'احذف مصروف القهوة',
    },
  ];

  const handleProcessInput = (textToProcess?: string) => {
    const text = textToProcess || inputText;
    if (!text.trim()) return;

    setQueryFeedback(null);
    setSaveSuccessMessage(null);

    const result: ParsedCommand = parseNaturalLanguageInput(text, currency);

    // 1. Handle Transaction Creation Proposals
    if (result.type === 'create_transactions' && result.items) {
      setStagedItems(result.items);
      return;
    }

    // 2. Handle Query: Spent Today
    if (result.type === 'query_today') {
      const today = getTodayDateString();
      const todayExpenses = transactions.filter(
        (t) => t.type === 'expense' && t.transaction_date === today
      );
      const totalToday = todayExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      setQueryFeedback({
        title: language === 'ar' ? 'إجمالي إنفاق اليوم' : "Today's Total Spending",
        description:
          language === 'ar'
            ? `لقد سجلت ${todayExpenses.length} معاملات اليوم بإجمالي ${formatCurrency(totalToday, currency, language)}.`
            : `You have recorded ${todayExpenses.length} transaction${todayExpenses.length === 1 ? '' : 's'} today totaling ${formatCurrency(totalToday, currency, language)}.`,
        items: todayExpenses,
      });
      return;
    }

    // 3. Handle Query: Budget Remaining
    if (result.type === 'query_budget') {
      const { remaining_budget, recommended_daily_pace, remaining_days } = dailySpendingAnalysis;
      setQueryFeedback({
        title: language === 'ar' ? 'حالة الميزانية المتبقية' : 'Remaining Budget Status',
        description:
          language === 'ar'
            ? `المتبقي في ميزانيتك: ${formatCurrency(remaining_budget, currency, language)}. المخصص اليومي المقترح للأيام الـ ${remaining_days} المتبقية هو ${formatCurrency(recommended_daily_pace, currency, language)}/يوم.`
            : `You have ${formatCurrency(remaining_budget, currency, language)} remaining in your monthly budget. Your recommended pace for the remaining ${remaining_days} days is ${formatCurrency(recommended_daily_pace, currency, language)}/day.`,
      });
      return;
    }

    // 4. Handle Query: Category Expenses This Week / Month
    if (result.type === 'query_category' && result.query_params?.category_id) {
      const catId = result.query_params.category_id;
      const catName = result.query_params.category_name;
      const matching = transactions.filter((t) => t.category_id === catId);
      const total = matching.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      setQueryFeedback({
        title: language === 'ar' ? `مصروفات ${catName}` : `${catName} Expenses`,
        description:
          language === 'ar'
            ? `إجمالي مصروفات تصنيف (${catName}) المسجلة هي ${formatCurrency(total, currency, language)} عبر ${matching.length} معاملة.`
            : `Total spending for ${catName} is ${formatCurrency(total, currency, language)} across ${matching.length} recorded transactions.`,
        items: matching.slice(0, 5),
      });
      return;
    }

    // 5. Handle Update Transaction Command (With Safety Confirmation)
    if (result.type === 'update_transaction' && result.mutation_target) {
      const { search_term, target_amount, new_amount } = result.mutation_target;

      // Find best match in recent transactions
      const match = transactions.find((t) => {
        const descMatch = t.description.toLowerCase().includes(search_term.toLowerCase());
        const amtMatch = target_amount ? Math.abs(t.amount - target_amount) < 0.01 : true;
        return descMatch && amtMatch;
      });

      if (!match) {
        setQueryFeedback({
          title: language === 'ar' ? 'لم يتم العثور على معاملة مطابقة' : 'No Matching Transaction Found',
          description:
            language === 'ar'
              ? `تعذر العثور على معاملة باسم "${search_term}". تأكد من الاسم في سجل المعاملات.`
              : `Could not find an expense matching "${search_term}". Check your transactions list.`,
        });
        return;
      }

      setPendingMutation({
        action: 'update',
        targetTx: match,
        newAmount: new_amount,
        explanation:
          language === 'ar'
            ? `تأكيد تعديل المعاملة: "${match.description}" من ${formatCurrency(match.amount, match.currency, language)} إلى ${formatCurrency(new_amount || 0, match.currency, language)}؟`
            : `Confirm updating "${match.description}" from ${formatCurrency(match.amount, match.currency, language)} to ${formatCurrency(new_amount || 0, match.currency, language)}?`,
      });
      return;
    }

    // 6. Handle Delete Transaction Command (With Safety Confirmation)
    if (result.type === 'delete_transaction' && result.mutation_target) {
      const { search_term } = result.mutation_target;

      const match = transactions.find((t) =>
        t.description.toLowerCase().includes(search_term.toLowerCase())
      );

      if (!match) {
        setQueryFeedback({
          title: language === 'ar' ? 'لم يتم العثور على معاملة مطابقة' : 'No Matching Transaction Found',
          description:
            language === 'ar'
              ? `تعذر العثور على معاملة باسم "${search_term}".`
              : `Could not find an expense matching "${search_term}".`,
        });
        return;
      }

      setPendingMutation({
        action: 'delete',
        targetTx: match,
        explanation:
          language === 'ar'
            ? `تأكيد حذف المعاملة: "${match.description}" بمبلغ ${formatCurrency(match.amount, match.currency, language)}؟`
            : `Confirm deleting "${match.description}" for ${formatCurrency(match.amount, match.currency, language)}?`,
      });
      return;
    }

    // Feedback for unknown command
    setQueryFeedback({
      title: language === 'ar' ? 'لم يتم فهم العبارة' : 'Unrecognized Phrase',
      description:
        (language === 'ar' ? result.feedback_message_ar : result.feedback_message) ||
        'Try typing an expense like "I spent 85 EGP on lunch" or click a sample below.',
    });
  };

  const handleUpdateStagedItem = (id: string, updates: Partial<ParsedItem>) => {
    setStagedItems((prev) =>
      prev.map((item) => (item.temp_id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveStagedItem = (id: string) => {
    setStagedItems((prev) => prev.filter((item) => item.temp_id !== id));
  };

  const handleConfirmSaveAll = async () => {
    if (stagedItems.length === 0) return;
    setIsSaving(true);

    try {
      for (const item of stagedItems) {
        await addTransaction({
          user_id: user?.id || 'local-user',
          type: item.type,
          amount: item.amount,
          currency: item.currency,
          category_id: item.category_id,
          description: item.description,
          transaction_date: item.transaction_date || getTodayDateString(),
          notes: `Parsed from: "${item.original_text}"`,
        });
      }

      setSaveSuccessMessage(
        language === 'ar'
          ? `تم حفظ ${stagedItems.length} معاملات بنجاح وتحديث أرقام لوحة التحكم!`
          : `Successfully saved ${stagedItems.length} transaction${stagedItems.length > 1 ? 's' : ''}! Dashboard figures updated.`
      );
      setStagedItems([]);
      setInputText('');
    } catch (err) {
      console.error('Failed to save transactions:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecutePendingMutation = async () => {
    if (!pendingMutation) return;

    if (pendingMutation.action === 'delete') {
      await deleteTransaction(pendingMutation.targetTx.id);
      setSaveSuccessMessage(
        language === 'ar'
          ? `تم حذف المعاملة "${pendingMutation.targetTx.description}" بنجاح.`
          : `Successfully deleted "${pendingMutation.targetTx.description}".`
      );
    } else if (pendingMutation.action === 'update' && pendingMutation.newAmount) {
      await updateTransaction({
        ...pendingMutation.targetTx,
        amount: pendingMutation.newAmount,
      });
      setSaveSuccessMessage(
        language === 'ar'
          ? `تم تعديل مبلغ "${pendingMutation.targetTx.description}" إلى ${formatCurrency(pendingMutation.newAmount, pendingMutation.targetTx.currency, language)}.`
          : `Successfully updated "${pendingMutation.targetTx.description}" to ${formatCurrency(pendingMutation.newAmount, pendingMutation.targetTx.currency, language)}.`
      );
    }

    setPendingMutation(null);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (isNaN(amt) || amt <= 0 || !manualDescription.trim()) return;

    await addTransaction({
      user_id: user?.id || 'local-user',
      type: manualType,
      amount: amt,
      currency,
      category_id: manualCategory || categories[0]?.id || '',
      description: manualDescription.trim(),
      transaction_date: manualDate,
      notes: manualNotes.trim() || undefined,
    });

    setSaveSuccessMessage(
      language === 'ar' ? 'تم تسجيل المعاملة بنجاح!' : 'Transaction recorded successfully!'
    );
    setManualDescription('');
    setManualAmount('');
    setManualNotes('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-border/70">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">{t('workspace_title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('workspace_subtitle')}</p>
        </div>

        {/* Tab switch: NL vs Manual */}
        <div className="flex items-center bg-secondary/80 p-1 rounded-xl border border-border/50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('nl')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'nl'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t('workspace_nl_tab')}</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{t('workspace_manual_tab')}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="font-medium">{saveSuccessMessage}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setActivePage('dashboard')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400"
          >
            View Dashboard
          </Button>
        </div>
      )}

      {/* Natural Language Tab */}
      {activeTab === 'nl' && (
        <div className="space-y-6">
          {/* Main Conversational Input Bar */}
          <Card className="p-3 sm:p-4 shadow-md border-emerald-500/20 focus-within:border-emerald-500 transition-all">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleProcessInput();
                    }
                  }}
                  placeholder={t('workspace_input_placeholder')}
                  className="w-full bg-transparent px-3 py-2 text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
              </div>
              <Button
                onClick={() => handleProcessInput()}
                disabled={!inputText.trim()}
                className="gap-2 shrink-0 font-semibold"
              >
                <span>{t('workspace_action_parse')}</span>
                <Send className={isRTL ? 'rotate-180 h-4 w-4' : 'h-4 w-4'} />
              </Button>
            </div>
          </Card>

          {/* Quick Clickable Example Prompts */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground tracking-wide">
              {t('quick_templates_title')}
            </p>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((p, idx) => {
                const text = language === 'ar' ? p.ar : p.en;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(text);
                      handleProcessInput(text);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-border/70 bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 hover:border-emerald-500/40 transition-all text-start"
                  >
                    "{text}"
                  </button>
                );
              })}
            </div>
          </div>

          {/* Query Response Feedback Card (For commands like "How much did I spend today?") */}
          {queryFeedback && (
            <Card className="p-5 border-sky-500/30 bg-sky-500/5 animate-in fade-in duration-200 space-y-3">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-bold text-sm">
                <HelpCircle className="h-4 w-4" />
                <span>{queryFeedback.title}</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                {queryFeedback.description}
              </p>

              {queryFeedback.items && queryFeedback.items.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-sky-500/20">
                  {queryFeedback.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-card border border-border/50"
                    >
                      <span className="font-semibold text-foreground">{item.description}</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(item.amount, item.currency, language)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Pending Mutation Confirmation Dialog */}
          {pendingMutation && (
            <Card className="p-5 border-amber-500/40 bg-amber-500/5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <AlertCircle className="h-5 w-5" />
                <span>Confirmation Required</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{pendingMutation.explanation}</p>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  size="sm"
                  variant={pendingMutation.action === 'delete' ? 'destructive' : 'default'}
                  onClick={handleExecutePendingMutation}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {t('action_confirm')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPendingMutation(null)}
                >
                  {t('action_cancel')}
                </Button>
              </div>
            </Card>
          )}

          {/* Staged Proposed Transactions Review Cards */}
          {stagedItems.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{t('workspace_review_title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('workspace_review_subtitle')}</p>
                </div>
                <Badge variant="success" className="px-3 py-1 font-bold">
                  {stagedItems.length} Proposed
                </Badge>
              </div>

              <div className="space-y-3">
                {stagedItems.map((item) => {
                  const cat = categories.find((c) => c.id === item.category_id);
                  return (
                    <Card
                      key={item.temp_id}
                      className={`p-4 border transition-all ${
                        item.needs_review
                          ? 'border-amber-500/50 bg-amber-500/5'
                          : 'border-border/80 bg-card'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CategoryIcon
                            iconName={cat?.icon || 'Tag'}
                            color={cat?.color}
                            size={18}
                          />
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                handleUpdateStagedItem(item.temp_id, {
                                  description: e.target.value,
                                })
                              }
                              className="font-bold text-sm bg-transparent border-b border-transparent hover:border-border focus:border-emerald-500 focus:outline-none text-foreground"
                            />
                            {item.needs_review && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                <span>{item.reviewReason}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Amount & Category Controls */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {/* Category Selector */}
                          <select
                            value={item.category_id}
                            onChange={(e) =>
                              handleUpdateStagedItem(item.temp_id, {
                                category_id: e.target.value,
                                needs_review: false,
                              })
                            }
                            className="text-xs font-semibold bg-secondary/80 border border-border rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {language === 'ar' ? c.name_ar : c.name}
                              </option>
                            ))}
                          </select>

                          {/* Editable Amount */}
                          <div className="flex items-center gap-1 bg-secondary/60 rounded-xl px-2 py-1 border border-border">
                            <input
                              type="number"
                              value={item.amount}
                              onChange={(e) =>
                                handleUpdateStagedItem(item.temp_id, {
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-16 font-bold text-sm text-end bg-transparent focus:outline-none text-foreground"
                            />
                            <span className="text-xs font-bold text-muted-foreground">
                              {item.currency}
                            </span>
                          </div>

                          {/* Delete Item */}
                          <button
                            onClick={() => handleRemoveStagedItem(item.temp_id)}
                            className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-accent transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Confirm All Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setStagedItems([])}>
                  {t('action_cancel')}
                </Button>
                <Button
                  size="md"
                  variant="success"
                  onClick={handleConfirmSaveAll}
                  isLoading={isSaving}
                  className="font-bold shadow-md"
                >
                  <Check className="h-4 w-4" />
                  <span>{t('workspace_save_all')}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Traditional Fallback Expense Form */}
      {activeTab === 'manual' && (
        <Card className="p-6">
          <form onSubmit={handleManualSubmit} className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-base font-bold text-foreground">
              {t('add_transaction_title')}
            </h3>

            {/* Type Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-xl">
              <button
                type="button"
                onClick={() => setManualType('expense')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  manualType === 'expense'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                {t('filter_expense')}
              </button>
              <button
                type="button"
                onClick={() => setManualType('income')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  manualType === 'income'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                {t('filter_income')}
              </button>
            </div>

            <Input
              label="Description"
              placeholder="e.g. Lunch with team or Internet bill"
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={`Amount (${currency})`}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                required
              />

              <Select
                label="Category"
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {language === 'ar' ? c.name_ar : c.name}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              label="Transaction Date"
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              required
            />

            <Input
              label="Notes (Optional)"
              placeholder="Add extra context or receipt details..."
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
            />

            <Button type="submit" className="w-full font-bold">
              <Plus className="h-4 w-4" />
              <span>{t('action_save')}</span>
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
