import React, { useState } from 'react';
import {
  Settings,
  Database,
  CloudOff,
  Sun,
  Moon,
  Languages,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Repeat,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import {
  CurrencyCode,
  LanguageCode,
  ThemeMode,
  RecurringTransaction,
  RecurringFrequency,
} from '@/types';
import { formatCurrency, CURRENCY_SYMBOLS } from '@/lib/currency';
import { formatDateString, getTodayDateString } from '@/lib/dateUtils';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  clearStoredSupabaseConfig,
  testSupabaseConnection,
} from '@/lib/supabase';
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
    storageMode,
    setStorageMode,
    language,
    setLanguage,
    theme,
    setTheme,
    currency,
    setCurrency,
    loadDemoData,
    clearAllData,
    recurringTransactions,
    saveRecurringTransaction,
    deleteRecurringTransaction,
    processDueRecurring,
  } = useApp();
  const { t } = useTranslation(language);

  // Profile preferences state
  const [displayName, setDisplayName] = useState<string>(user?.display_name || '');
  const [openingBalance, setOpeningBalance] = useState<string>(
    user?.opening_balance ? user.opening_balance.toString() : '0'
  );
  const [budgetCycleDay, setBudgetCycleDay] = useState<number>(user?.budget_cycle_start_day || 1);
  const [isSavedFeedback, setIsSavedFeedback] = useState<boolean>(false);

  // Supabase cloud config state
  const storedConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState<string>(storedConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>(storedConfig.anonKey);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Recurring subscription modal
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
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

  const handleTestSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestResult({ success: false, message: 'Please enter both Supabase URL and Anon Key.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setIsTesting(false);
    if (res.success) {
      setTestResult({ success: true, message: 'Connection successful! Database is accessible.' });
    } else {
      setTestResult({
        success: false,
        message: `Connection failed: ${res.error || 'Check URL and Anon Key.'}`,
      });
    }
  };

  const handleSaveSupabaseConfig = () => {
    if (supabaseUrl.trim() && supabaseAnonKey.trim()) {
      saveStoredSupabaseConfig(supabaseUrl, supabaseAnonKey);
      setStorageMode('supabase');
      setTestResult({
        success: true,
        message: 'Saved! Application is now configured to sync with Supabase.',
      });
    }
  };

  const handleDisconnectSupabase = () => {
    clearStoredSupabaseConfig();
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setStorageMode('local');
    setTestResult({
      success: true,
      message: 'Disconnected from cloud. Operating in local mode.',
    });
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(recAmount);
    if (isNaN(amt) || amt <= 0 || !recDescription.trim()) return;

    await saveRecurringTransaction({
      user_id: user?.id || 'local-user',
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

      {/* 1. Appearance & Preferences */}
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

      {/* 2. Recurring Subscriptions & Bills */}
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

      {/* 3. Demo & Sample Data Management */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
          <Database className="h-5 w-5 text-amber-500" />
          <div>
            <h3 className="text-base font-bold text-foreground">{t('demo_data_section')}</h3>
            <p className="text-xs text-muted-foreground">
              Explicit sample data loader for testing calculations and charts without affecting remote data.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadDemoData}
            className="text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('load_demo_btn')}</span>
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={clearAllData}
            className="text-xs font-semibold gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t('clear_demo_btn')}</span>
          </Button>
        </div>
      </Card>

      {/* 4. Supabase Cloud Sync Configuration */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <div>
              <h3 className="text-base font-bold text-foreground">{t('supabase_section')}</h3>
              <p className="text-xs text-muted-foreground">
                Connect your real Supabase PostgreSQL backend with Row Level Security (RLS).
              </p>
            </div>
          </div>

          <Badge
            variant={storageMode === 'supabase' ? 'success' : 'warning'}
            className="text-xs font-bold"
          >
            {storageMode === 'supabase' ? t('connected_status') : t('disconnected_status')}
          </Badge>
        </div>

        <div className="space-y-4">
          <Input
            label={t('supabase_url_label')}
            placeholder="https://xyzcompany.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
          />

          <Input
            label={t('supabase_key_label')}
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
            value={supabaseAnonKey}
            onChange={(e) => setSupabaseAnonKey(e.target.value)}
          />

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestSupabase}
              isLoading={isTesting}
              className="text-xs font-semibold"
            >
              {t('test_connection_btn')}
            </Button>

            <div className="flex items-center gap-2">
              {storageMode === 'supabase' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectSupabase}
                  className="text-xs text-rose-500"
                >
                  Disconnect
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                variant="success"
                onClick={handleSaveSupabaseConfig}
                className="text-xs font-bold"
              >
                {t('save_connection_btn')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

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
