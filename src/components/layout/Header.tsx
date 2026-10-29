import React from 'react';
import { Sparkles, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import { MONTH_NAMES } from '@/lib/dateUtils';
import { Button } from '@/components/ui/Button';

export const Header: React.FC = () => {
  const {
    activePage,
    setActivePage,
    language,
    selectedYear,
    selectedMonth,
    setSelectedPeriod,
    user,
  } = useApp();
  const { t, isRTL } = useTranslation(language);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedPeriod(selectedYear - 1, 12);
    } else {
      setSelectedPeriod(selectedYear, selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedPeriod(selectedYear + 1, 1);
    } else {
      setSelectedPeriod(selectedYear, selectedMonth + 1);
    }
  };

  const monthName = MONTH_NAMES[language]?.[selectedMonth - 1] || MONTH_NAMES.en[selectedMonth - 1];

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return t('nav_dashboard');
      case 'workspace':
        return t('nav_workspace');
      case 'transactions':
        return t('nav_transactions');
      case 'budgets':
        return t('nav_budgets');
      case 'wishlist':
        return t('nav_wishlist');
      case 'savings':
        return t('nav_savings');
      case 'reports':
        return t('nav_reports');
      case 'settings':
        return t('nav_settings');
      default:
        return t('app_name');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/80 backdrop-blur-md px-4 sm:px-6">
      {/* Title & User Greeting */}
      <div className="flex items-center gap-3">
        {/* Mobile Logo pill */}
        <div className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-600 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            {getPageTitle()}
          </h2>
          {user?.display_name && activePage === 'dashboard' && (
            <p className="hidden sm:block text-xs text-muted-foreground">
              {language === 'ar' ? `أهلاً، ${user.display_name}` : `Welcome back, ${user.display_name}`}
            </p>
          )}
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile/Compact Month Selector */}
        <div className="lg:hidden flex items-center bg-secondary/80 rounded-xl px-2 py-1 text-xs font-semibold border border-border/60">
          <button onClick={isRTL ? handleNextMonth : handlePrevMonth} className="p-1 hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-1.5 text-[11px] whitespace-nowrap">
            {monthName.slice(0, 3)} {selectedYear}
          </span>
          <button onClick={isRTL ? handlePrevMonth : handleNextMonth} className="p-1 hover:text-foreground">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Quick Add Expense button */}
        {activePage !== 'workspace' && (
          <Button
            size="sm"
            onClick={() => setActivePage('workspace')}
            className="rounded-xl shadow-sm text-xs font-semibold py-1.5 px-3"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('action_add')}</span>
          </Button>
        )}
      </div>
    </header>
  );
};
