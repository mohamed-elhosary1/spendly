import React from 'react';
import { RefreshCw } from 'lucide-react';
import { AppProvider, useApp } from '@/context/AppContext';
import { ToastProvider } from '@/components/ui/Toast';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { AuthPage } from '@/components/auth/AuthPage';
import { Mascot } from '@/components/ui/Mascot';
import { Button } from '@/components/ui/Button';

// Pages
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { TransactionsPage } from '@/components/transactions/TransactionsPage';
import { BudgetsPage } from '@/components/budgets/BudgetsPage';
import { WishlistPage } from '@/components/wishlist/WishlistPage';
import { SavingsPage } from '@/components/savings/SavingsPage';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { SettingsPage } from '@/components/settings/SettingsPage';

// Context-Aware Skeletons
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { TransactionsSkeleton } from '@/components/ui/TransactionsSkeleton';
import { BudgetsSkeleton } from '@/components/ui/BudgetsSkeleton';
import { WishlistSkeleton } from '@/components/ui/WishlistSkeleton';
import { AmbientBackground } from '@/components/ui/AmbientBackground';

const AppContent: React.FC = () => {
  const {
    activePage,
    isLoading,
    isFetchingData,
    isAuthenticated,
    dbError,
    retryLoadData,
    refreshAllData,
  } = useApp();

  // 1. Initial Application Loading with Branded Mascot
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs animate-in fade-in duration-300">
          <Mascot mood="loading" size="lg" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Synchronizing Workspace</h3>
            <p className="text-xs text-muted-foreground">
              Connecting securely to Spendly Cloud Database...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fatal Database Connection Error Screen (Prevents infinite loaders)
  if (dbError && !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-md p-6 sm:p-8 rounded-3xl border border-rose-500/30 bg-card shadow-xl animate-in fade-in">
          <Mascot mood="error" size="lg" />
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground">Database Connection Error</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{dbError}</p>
          </div>
          <Button onClick={retryLoadData} size="sm" className="gap-2 font-semibold mt-2">
            <RefreshCw className="h-4 w-4" />
            <span>Retry Connection</span>
          </Button>
        </div>
      </div>
    );
  }

  // 3. Authentication Gate: Real Supabase Login / Signup Required
  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={refreshAllData} />;
  }

  // 4. Page Rendering with Context-Aware Skeleton Fallbacks & Smooth Transitions
  const renderActivePage = () => {
    if (isFetchingData) {
      switch (activePage) {
        case 'dashboard':
          return <DashboardSkeleton />;
        case 'transactions':
          return <TransactionsSkeleton />;
        case 'budgets':
          return <BudgetsSkeleton />;
        case 'wishlist':
          return <WishlistSkeleton />;
        default:
          return <DashboardSkeleton />;
      }
    }

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
    <div className="relative flex min-h-screen bg-background/95 text-foreground overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-500">
      {/* Interactive Ambient Particle & Lighting Environment */}
      <AmbientBackground />

      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header />

        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {/* Subtle page enter transition */}
          <div key={activePage} className="animate-page-enter">
            {renderActivePage()}
          </div>
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
    <ToastProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ToastProvider>
  );
}
