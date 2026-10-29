import React, { useState } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Receipt,
  Wallet,
  Menu,
  ShoppingBag,
  PiggyBank,
  BarChart3,
  Settings,
  X,
  Languages,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useApp, AppPage } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const MobileNav: React.FC = () => {
  const { activePage, setActivePage, language, setLanguage, theme, setTheme, handleSignOut } = useApp();
  const { t } = useTranslation(language);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const primaryItems: { id: AppPage; label: string; icon: React.FC<any> }[] = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'workspace', label: t('nav_workspace'), icon: Sparkles },
    { id: 'transactions', label: t('nav_transactions'), icon: Receipt },
    { id: 'budgets', label: t('nav_budgets'), icon: Wallet },
  ];

  const secondaryItems: { id: AppPage; label: string; icon: React.FC<any> }[] = [
    { id: 'wishlist', label: t('nav_wishlist'), icon: ShoppingBag },
    { id: 'savings', label: t('nav_savings'), icon: PiggyBank },
    { id: 'reports', label: t('nav_reports'), icon: BarChart3 },
    { id: 'settings', label: t('nav_settings'), icon: Settings },
  ];

  const handleSelectPage = (id: AppPage) => {
    setActivePage(id);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Bottom Bar for Mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectPage(item.id)}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-w-[56px]',
                isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px]',
            ['wishlist', 'savings', 'reports', 'settings'].includes(activePage)
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-muted-foreground'
          )}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed bottom-0 inset-x-0 bg-card rounded-t-3xl border-t border-border p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="font-bold text-base text-foreground">Menu</span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectPage(item.id)}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-2xl border text-sm font-semibold transition-all',
                      isActive
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-border/60 bg-secondary/50 text-foreground hover:bg-secondary'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Settings & Sign Out in Mobile Drawer */}
            <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-secondary text-xs font-semibold"
                >
                  <Languages className="h-3.5 w-3.5" />
                  <span>{language === 'en' ? 'العربية' : 'English'}</span>
                </button>

                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-secondary text-xs font-semibold"
                >
                  {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                  <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  handleSignOut();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-500/20"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
