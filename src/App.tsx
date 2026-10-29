import React from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { AuthPage } from '@/components/auth/AuthPage';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { TransactionsPage } from '@/components/transactions/TransactionsPage';
import { BudgetsPage } from '@/components/budgets/BudgetsPage';
import { WishlistPage } from '@/components/wishlist/WishlistPage';
import { SavingsPage } from '@/components/savings/SavingsPage';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { SettingsPage } from '@/components/settings/SettingsPage';

const AppContent: React.FC = () => {
  const { activePage, isLoading, isAuthenticated, refreshAllData } = useApp();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <span className="text-xs font-semibold text-muted-foreground tracking-wide">
            Connecting to Spendly Online Database...
          </span>
        </div>
      </div>
    );
  }

  // Enforce authentication: show Auth Page if not logged in
  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={refreshAllData} />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'workspace':
        return <WorkspacePage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'budgets':
        return <BudgetsPage />;
      case 'wishlist':
        return <WishlistPage />;
      case 'savings':
        return <SavingsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header />

        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>

        {/* Mobile Compact Navigation Bar */}
        <MobileNav />
      </div>

      {/* Onboarding Wizard Modal */}
      <OnboardingModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
