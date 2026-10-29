import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import { CurrencyCode, LanguageCode } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CURRENCY_SYMBOLS } from '@/lib/currency';

export const OnboardingModal: React.FC = () => {
  const {
    user,
    isOnboardingOpen,
    setIsOnboardingOpen,
    updateProfile,
    saveMonthlyBudget,
    saveCategoryBudgets,
    categories,
    selectedYear,
    selectedMonth,
  } = useApp();
  const { t, isRTL } = useTranslation(user?.language || 'en');

  const [step, setStep] = useState<number>(1);

  // Form states
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [language, setLanguage] = useState<LanguageCode>(user?.language || 'en');
  const [currency, setCurrency] = useState<CurrencyCode>(user?.currency || 'EGP');
  const [monthlyBudgetAmount, setMonthlyBudgetAmount] = useState<string>('10000');
  const [openingBalance, setOpeningBalance] = useState<string>('15000');
  const [budgetCycleDay, setBudgetCycleDay] = useState<number>(1);

  // Optional category limits
  const [foodBudget, setFoodBudget] = useState<string>('3000');
  const [transportBudget, setTransportBudget] = useState<string>('1200');
  const [groceriesBudget, setGroceriesBudget] = useState<string>('2500');

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    // 1. Save user profile
    await updateProfile({
      display_name: displayName.trim() || 'User',
      language,
      currency,
      opening_balance: parseFloat(openingBalance) || 0,
      budget_cycle_start_day: budgetCycleDay,
      is_onboarded: true,
    });

    // 2. Save initial monthly budget
    const budgetNum = parseFloat(monthlyBudgetAmount);
    if (!isNaN(budgetNum) && budgetNum > 0) {
      const savedBudget = await saveMonthlyBudget({
        year: selectedYear,
        month: selectedMonth,
        total_budget: budgetNum,
        currency,
        notes: 'Initial monthly budget configured in onboarding',
      });

      // 3. Save category budgets if entered
      const catBudgetItems: { category_id: string; amount: number }[] = [];
      const foodCat = categories.find((c) => c.name.toLowerCase().includes('food'));
      const transCat = categories.find((c) => c.name.toLowerCase().includes('transport'));
      const grocCat = categories.find((c) => c.name.toLowerCase().includes('grocer'));

      if (foodCat && parseFloat(foodBudget) > 0) {
        catBudgetItems.push({
          category_id: foodCat.id,
          amount: parseFloat(foodBudget),
        });
      }
      if (transCat && parseFloat(transportBudget) > 0) {
        catBudgetItems.push({
          category_id: transCat.id,
          amount: parseFloat(transportBudget),
        });
      }
      if (grocCat && parseFloat(groceriesBudget) > 0) {
        catBudgetItems.push({
          category_id: grocCat.id,
          amount: parseFloat(groceriesBudget),
        });
      }

      if (catBudgetItems.length > 0) {
        await saveCategoryBudgets(savedBudget.id, catBudgetItems);
      }
    }

    setIsOnboardingOpen(false);
  };

  return (
    <Modal
      isOpen={isOnboardingOpen}
      onClose={() => setIsOnboardingOpen(false)}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-foreground">{t('onboarding_welcome')}</h2>
          <p className="text-xs text-muted-foreground">{t('onboarding_subtitle')}</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? 'w-8 bg-emerald-600'
                  : s < step
                  ? 'w-4 bg-emerald-600/40'
                  : 'w-4 bg-secondary'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Profile & Regional */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-foreground">
              Step 1 of 4: {t('step_profile')}
            </h3>

            <Input
              label="Your Display Name"
              placeholder="e.g. Karim or Sarah"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t('language_label')}
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                options={[
                  { value: 'en', label: 'English (US)' },
                  { value: 'ar', label: 'العربية (Egyptian)' },
                ]}
              />

              <Select
                label={t('currency_label')}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                options={Object.keys(CURRENCY_SYMBOLS).map((c) => ({
                  value: c,
                  label: `${c} (${CURRENCY_SYMBOLS[c as CurrencyCode].symbol})`,
                }))}
              />
            </div>
          </div>
        )}

        {/* Step 2: Monthly Budget */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-foreground">
              Step 2 of 4: {t('step_budget')}
            </h3>
            <p className="text-xs text-muted-foreground">
              What is your target spending ceiling for this month? (You can adjust this anytime).
            </p>

            <Input
              label={`Monthly Spending Budget (${currency})`}
              type="number"
              placeholder="e.g. 10000"
              value={monthlyBudgetAmount}
              onChange={(e) => setMonthlyBudgetAmount(e.target.value)}
            />

            <Select
              label={t('budget_cycle_day_label')}
              value={budgetCycleDay}
              onChange={(e) => setBudgetCycleDay(parseInt(e.target.value))}
              options={Array.from({ length: 28 }, (_, i) => ({
                value: i + 1,
                label: `Day ${i + 1} of the month`,
              }))}
            />
          </div>
        )}

        {/* Step 3: Available Funds (Optional) */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-foreground">
              Step 3 of 4: {t('step_balance')}
            </h3>
            <p className="text-xs text-muted-foreground">
              Optionally track your actual available cash or bank balance to evaluate purchase affordability.
              Spendly never connects to bank accounts.
            </p>

            <Input
              label={`Tracked Available Funds (${currency})`}
              type="number"
              placeholder="e.g. 15000 (Optional)"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
          </div>
        )}

        {/* Step 4: Category Budgets (Optional) */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-foreground">
              Step 4 of 4: {t('step_categories')}
            </h3>
            <p className="text-xs text-muted-foreground">
              Set optional sub-budgets for your top expense categories to receive granular pace alerts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Food & Drinks"
                type="number"
                value={foodBudget}
                onChange={(e) => setFoodBudget(e.target.value)}
              />
              <Input
                label="Groceries"
                type="number"
                value={groceriesBudget}
                onChange={(e) => setGroceriesBudget(e.target.value)}
              />
              <Input
                label="Transportation"
                type="number"
                value={transportBudget}
                onChange={(e) => setTransportBudget(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border/70">
          {step > 1 ? (
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
              <ArrowLeft className={isRTL ? 'rotate-180 h-4 w-4' : 'h-4 w-4'} />
              <span>{t('action_back')}</span>
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button size="sm" onClick={handleNext} className="gap-1.5">
              <span>{t('action_next')}</span>
              <ArrowRight className={isRTL ? 'rotate-180 h-4 w-4' : 'h-4 w-4'} />
            </Button>
          ) : (
            <Button size="sm" variant="success" onClick={handleFinish} className="gap-1.5">
              <Check className="h-4 w-4" />
              <span>{t('get_started_btn')}</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
