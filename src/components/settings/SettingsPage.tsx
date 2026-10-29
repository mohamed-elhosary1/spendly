import React, { useState } from 'react';
import {
  Settings,
  Database,
  Sun,
  Moon,
  Languages,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  Repeat,
  ShieldCheck,
  RefreshCw,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import {
  CurrencyCode,
  LanguageCode,
  ThemeMode,
  RecurringFrequency,
} from '@/types';
import { formatCurrency, CURRENCY_SYMBOLS } from '@/lib/currency';
import { formatDateString, getTodayDateString } from '@/lib/dateUtils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

export const SettingsPage: React.FC = () => {
  const {
    user,
    updateProfile,
    language,
    setLanguage,
    theme,
    setTheme,
    currency,
    setCurrency,
    clearUserData,
    recurringTransactions,
    saveRecurringTransaction,
    deleteRecurringTransaction,
    processDueRecurring,
    handleSignOut,
  } = useApp();
  const { t } = useTranslation(language);

  // Profile preferences state
  const [displayName, setDisplayName] = useState<string>(user?.display_name || '');
  const [openingBalance, setOpeningBalance] = useState<string>(
    user?.opening_balance ? user.opening_balance.toString() : '0'
  );
  const [budgetCycleDay, setBudgetCycleDay] = useState<number>(user?.budget_cycle_start_day || 1);
  const [isSavedFeedback, setIsSavedFeedback] = useState<boolean>(false);

  // Recurring subscription modal
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [recDescription, setRecDescription] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('monthly');
  const [recStartDate, setRecStartDate] = useState(getTodayDateString());

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      display_name: displayName.trim() || 'User',
      opening_balance: parseFloat(openingBalance) || 0,
      budget_cycle_start_day: budgetCycleDay,
    });
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 3000);
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(recAmount);
    if (isNaN(amt) || amt <= 0 || !recDescription.trim()) return;

    await saveRecurringTransaction({
      description: recDescription.trim(),
      amount: amt,
      currency,
      type: 'expense',
      frequency: recFrequency,
      start_date: recStartDate,
      next_due_date: recStartDate,
      is_active: true,
    });

    setIsRecurringModalOpen(false);
    setRecDescription('');
    setRecAmount('');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="pb-2 border-b border-border/70">
        <h2 className="text-xl font-black tracking-tight text-foreground">{t('settings_title')}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{t('settings_subtitle')}</p>
      </div>

      {/* 1. Online Database & Account Status Banner */}
      <Card className="p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Online Database Connected</h3>
                <Badge variant="success" className="text-[10px] font-bold">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Signed in as <span className="font-semibold text-foreground">{user?.email || 'Authenticated User'}</span>.
                All transactions are synchronized with the live PostgreSQL database.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleSignOut}
            className="text-xs font-semibold gap-1.5 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 self-start sm:self-center shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </Card>

      {/* 2. Appearance & Preferences */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
          <Settings className="h-5 w-5 text-emerald-500" />
          <h3 className="text-base font-bold text-foreground">{t('appearance_section')}</h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <Select
              label={t('language_label')}
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              options={[
                { value: 'en', label: 'English (LTR)' },
                { value: 'ar', label: 'العربية (Egyptian - RTL)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label={t('currency_label')}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              options={Object.keys(CURRENCY_SYMBOLS).map((c) => ({
                value: c,
                label: `${c} (${CURRENCY_SYMBOLS[c as CurrencyCode].symbol})`,
              }))}
            />

            <Select
              label={t('theme_label')}
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeMode)}
              options={[
                { value: 'light', label: 'Light Mode' },
                { value: 'dark', label: 'Dark Mode' },
              ]}
            />

            <Select
              label={t('budget_cycle_day_label')}
              value={budgetCycleDay}
              onChange={(e) => setBudgetCycleDay(parseInt(e.target.value))}
              options={Array.from({ length: 28 }, (_, i) => ({
                value: i + 1,
                label: `Day ${i + 1}`,
              }))}
            />
          </div>

          <Input
            label={t('opening_balance_label')}
            type="number"
            step="100"
            min="0"
            placeholder="0.00"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />

          <div className="flex items-center justify-between pt-2">
            {isSavedFeedback && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Preferences saved!
              </span>
            )}
            <div className="ms-auto">
              <Button type="submit" size="sm" className="font-semibold">
                {t('action_save')} Preferences
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* 3. Recurring Subscriptions & Bills */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <Repeat className="h-5 w-5 text-sky-500" />
            <div>
              <h3 className="text-base font-bold text-foreground">{t('recurring_title')}</h3>
              <p className="text-xs text-muted-foreground">{t('recurring_subtitle')}</p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRecurringModalOpen(true)}
            className="text-xs font-semibold gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Subscription</span>
          </Button>
        </div>

        {recurringTransactions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No recurring bills added yet. Add regular subscriptions like Internet, Spotify, Gym, or
            Rent to receive due notifications.
          </p>
        ) : (
          <div className="space-y-3">
            {recurringTransactions.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-secondary/30"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{rec.description}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {rec.frequency}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Next due date: {formatDateString(rec.next_due_date, language)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-foreground">
                    {formatCurrency(rec.amount, rec.currency, language)}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => processDueRecurring(rec)}
                    className="text-xs py-1 h-8 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  >
                    {t('confirm_due_tx')}
                  </Button>

                  <button
                    onClick={() => deleteRecurringTransaction(rec.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Account Data Management */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
          <Database className="h-5 w-5 text-rose-500" />
          <div>
            <h3 className="text-base font-bold text-foreground">Data Management</h3>
            <p className="text-xs text-muted-foreground">
              Manage your personal financial records or reset your workspace if you wish to start fresh.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground max-w-md">
            Resetting your account permanently removes all your transactions, custom budgets, wishlist items, and savings targets from Supabase cloud storage.
          </p>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setIsConfirmClearOpen(true)}
            className="text-xs font-semibold gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset My Records</span>
          </Button>
        </div>
      </Card>

      {/* Clear Account Data Confirmation Modal */}
      <Modal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        title="Reset Account Financial Records"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete all transactions, budgets, wishlist items, and savings goals from your account? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmClearOpen(false)}
            >
              {t('action_cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="font-semibold"
              onClick={async () => {
                await clearUserData();
                setIsConfirmClearOpen(false);
              }}
            >
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Recurring Template Modal */}
      <Modal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        title="Add Recurring Subscription / Bill"
      >
        <form onSubmit={handleAddRecurring} className="space-y-4">
          <Input
            label="Description"
            placeholder="e.g. Netflix, Home Internet, Gym Membership"
            value={recDescription}
            onChange={(e) => setRecDescription(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Amount (${currency})`}
              type="number"
              step="1"
              min="1"
              placeholder="0.00"
              value={recAmount}
              onChange={(e) => setRecAmount(e.target.value)}
              required
            />

            <Select
              label="Frequency"
              value={recFrequency}
              onChange={(e) => setRecFrequency(e.target.value as RecurringFrequency)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>

          <Input
            label="First Payment / Due Date"
            type="date"
            value={recStartDate}
            onChange={(e) => setRecStartDate(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRecurringModalOpen(false)}
            >
              {t('action_cancel')}
            </Button>
            <Button type="submit" size="sm" className="font-semibold">
              {t('action_save')} Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
