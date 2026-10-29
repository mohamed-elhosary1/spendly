import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Receipt,
  PieChart,
  Heart,
  PiggyBank,
  BarChart3,
  Settings,
  Database,
  LogOut,
  Sun,
  Moon,
  Languages,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp, AppPage } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import { MONTH_NAMES } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC = () => {
  const {
    activePage,
    setActivePage,
    language,
    setLanguage,
    theme,
    setTheme,
    selectedYear,
    selectedMonth,
    setSelectedPeriod,
    user,
    handleSignOut,
  } = useApp();
  const { t, isRTL } = useTranslation(language);

  const navItems: { id: AppPage; label: string; icon: React.FC<any> }[] = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'workspace', label: t('nav_workspace'), icon: Sparkles },
    { id: 'transactions', label: t('nav_transactions'), icon: Receipt },
    { id: 'budgets', label: t('nav_budgets'), icon: PieChart },
    { id: 'wishlist', label: t('nav_wishlist'), icon: Heart },
    { id: 'savings', label: t('nav_savings'), icon: PiggyBank },
    { id: 'reports', label: t('nav_reports'), icon: BarChart3 },
    { id: 'settings', label: t('nav_settings'), icon: Settings },
  ];

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

  return (
    <aside className="hidden lg:flex w-64 flex-col border-e border-border/70 bg-card/70 backdrop-blur-md px-4 py-5 shrink-0 select-none justify-between h-screen sticky top-0">
      <div className="space-y-6">
        {/* Brand Logo */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground font-sans">
                {t('app_name')}
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {t('app_tagline')}
              </p>
            </div>
          </div>
        </div>

        {/* Online Database & User Status Badge */}
        <div className="px-2">
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <div className="flex items-center gap-2 truncate">
              <Database className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="truncate">{user?.display_name || user?.email || 'Connected'}</span>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1 rounded-md text-emerald-700 dark:text-emerald-300 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Month Selector Widget */}
        <div className="bg-secondary/60 rounded-2xl p-2.5 border border-border/50">
          <div className="flex items-center justify-between">
            <button
              onClick={isRTL ? handleNextMonth : handlePrevMonth}
              className="p-1 rounded-lg hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center font-bold text-xs tracking-tight text-foreground">
              {monthName} {selectedYear}
            </div>
            <button
              onClick={isRTL ? handlePrevMonth : handleNextMonth}
              className="p-1 rounded-lg hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-transform group-hover:scale-110',
                    isActive ? 'text-white' : 'text-muted-foreground'
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls: Language & Theme */}
      <div className="pt-4 border-t border-border/70 flex items-center justify-between px-2">
        {/* Language switch */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="Switch Language"
        >
          <Languages className="h-3.5 w-3.5" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>

        {/* Theme switch */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
};
