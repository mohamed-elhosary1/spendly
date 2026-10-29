import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  UserProfile,
  Category,
  Transaction,
  MonthlyBudget,
  CategoryBudget,
  WishlistItem,
  SavingsGoal,
  RecurringTransaction,
  StorageMode,
  LanguageCode,
  ThemeMode,
  CurrencyCode,
  DailySpendingAnalysis,
} from '@/types';
import { StorageService } from '@/lib/storage';
import { getCurrentYearAndMonth, getTodayDateString } from '@/lib/dateUtils';
import { calculateDailySpending } from '@/lib/spendingCalculator';
import { getSupabase } from '@/lib/supabase';
import { addMoney } from '@/lib/currency';
import { useToast } from '@/components/ui/Toast';

export type AppPage =
  | 'dashboard'
  | 'workspace'
  | 'transactions'
  | 'budgets'
  | 'wishlist'
  | 'savings'
  | 'reports'
  | 'settings';

interface AppContextType {
  user: UserProfile | null;
  storageMode: StorageMode;
  setStorageMode: (mode: StorageMode) => void;
  categories: Category[];
  transactions: Transaction[];
  monthlyBudgets: MonthlyBudget[];
  categoryBudgets: CategoryBudget[];
  wishlistItems: WishlistItem[];
  savingsGoals: SavingsGoal[];
  recurringTransactions: RecurringTransaction[];

  // Navigation & Page State
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;

  // Selected period for viewing data
  selectedYear: number;
  selectedMonth: number;
  setSelectedPeriod: (year: number, month: number) => void;

  // Preferences
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  currency: CurrencyCode;
  setCurrency: (cur: CurrencyCode) => void;

  // Derived Calculations
  currentMonthBudget: MonthlyBudget | null;
  dailySpendingAnalysis: DailySpendingAnalysis;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'user_id'> & { user_id?: string }) => Promise<Transaction>;
  updateTransaction: (tx: Transaction) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  saveMonthlyBudget: (
    budget: Omit<MonthlyBudget, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => Promise<MonthlyBudget>;
  saveCategoryBudgets: (
    monthlyBudgetId: string,
    items: Omit<CategoryBudget, 'id' | 'monthly_budget_id' | 'user_id'>[]
  ) => Promise<void>;
  saveWishlistItem: (
    item: Omit<WishlistItem, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => Promise<WishlistItem>;
  deleteWishlistItem: (id: string) => Promise<void>;
  convertWishlistToExpense: (item: WishlistItem, amount: number) => Promise<void>;
  saveSavingsGoal: (
    goal: Omit<SavingsGoal, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => Promise<SavingsGoal>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  contributeToSavingsGoal: (goalId: string, amount: number) => Promise<void>;
  saveRecurringTransaction: (
    item: Omit<RecurringTransaction, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => Promise<RecurringTransaction>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  processDueRecurring: (item: RecurringTransaction) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  clearUserData: () => Promise<void>;
  refreshAllData: () => Promise<void>;

  // Auth & Database lifecycle
  isLoading: boolean;
  isFetchingData: boolean;
  isAuthenticated: boolean;
  dbError: string | null;
  retryLoadData: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toast = useToast();
  const currentYM = getCurrentYearAndMonth();
  const [selectedYear, setSelectedYear] = useState<number>(currentYM.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentYM.month);
  const [activePage, setActivePage] = useState<AppPage>('dashboard');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingData, setIsFetchingData] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [storageMode, setStorageModeState] = useState<StorageMode>(StorageService.getStorageMode());

  const [user, setUser] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Set initial preferences
  const language = user?.language || 'en';
  const theme = user?.theme || 'light';
  const currency = user?.currency || 'EGP';

  // Apply RTL/LTR and Theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    root.setAttribute('lang', language);

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [language, theme]);

  // Load user data from Supabase PostgreSQL
  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsFetchingData(true);
    }
    setDbError(null);

    try {
      const supabase = getSupabase();
      const {
        data: { user: authUser },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !authUser) {
        setIsAuthenticated(false);
        setUser(null);
        setTransactions([]);
        setMonthlyBudgets([]);
        setCategoryBudgets([]);
        setWishlistItems([]);
        setSavingsGoals([]);
        setRecurringTransactions([]);
        setIsLoading(false);
        setIsFetchingData(false);
        return;
      }

      setIsAuthenticated(true);
      const profile = await StorageService.getUserProfile();
      setUser(profile);
      if (profile && !profile.is_onboarded) {
        setIsOnboardingOpen(true);
      }

      const [cats, txs, mBudgets, wish, savings, recurring] = await Promise.all([
        StorageService.getCategories(),
        StorageService.getTransactions(),
        StorageService.getMonthlyBudgets(),
        StorageService.getWishlistItems(),
        StorageService.getSavingsGoals(),
        StorageService.getRecurringTransactions(),
      ]);

      setCategories(cats);
      setTransactions(txs);
      setMonthlyBudgets(mBudgets);
      setWishlistItems(wish);
      setSavingsGoals(savings);
      setRecurringTransactions(recurring);

      // Find current monthly budget and load category budgets if found
      const currentMB = mBudgets.find((b) => b.year === selectedYear && b.month === selectedMonth);
      if (currentMB) {
        const catBuds = await StorageService.getCategoryBudgets(currentMB.id);
        setCategoryBudgets(catBuds);
      } else {
        setCategoryBudgets([]);
      }
    } catch (err: any) {
      console.error('Spendly database synchronization error:', err);
      const message = err?.message || 'Failed to synchronize with Supabase database.';
      setDbError(message);
      toast.error(message, 'Database Connection');
    } finally {
      setIsLoading(false);
      setIsFetchingData(false);
    }
  }, [selectedYear, selectedMonth, toast]);

  const retryLoadData = async () => {
    await loadData(false);
  };

  const handleSignOut = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setTransactions([]);
      setMonthlyBudgets([]);
      setCategoryBudgets([]);
      setWishlistItems([]);
      setSavingsGoals([]);
      setRecurringTransactions([]);
      setDbError(null);
      toast.info('You have been signed out safely.', 'Signed Out');
    } catch (err: any) {
      console.error('Error during sign out:', err);
    }
  };

  useEffect(() => {
    loadData(true);
    const supabase = getSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadData(false);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Reload category budgets whenever selected period changes
  useEffect(() => {
    const mb = monthlyBudgets.find((b) => b.year === selectedYear && b.month === selectedMonth);
    if (mb) {
      StorageService.getCategoryBudgets(mb.id).then(setCategoryBudgets);
    } else {
      setCategoryBudgets([]);
    }
  }, [selectedYear, selectedMonth, monthlyBudgets]);

  const setSelectedPeriod = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const setStorageMode = (mode: StorageMode) => {
    setStorageModeState(mode);
    loadData(false);
  };

  const setLanguage = async (newLang: LanguageCode) => {
    if (!user) return;
    const updated = { ...user, language: newLang };
    setUser(updated);
    await StorageService.saveUserProfile(updated);
  };

  const setTheme = async (newTheme: ThemeMode) => {
    if (!user) return;
    const updated = { ...user, theme: newTheme };
    setUser(updated);
    await StorageService.saveUserProfile(updated);
  };

  const setCurrency = async (newCurrency: CurrencyCode) => {
    if (!user) return;
    const updated = { ...user, currency: newCurrency };
    setUser(updated);
    await StorageService.saveUserProfile(updated);
  };

  const updateProfile = async (partial: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...partial };
    setUser(updated);
    await StorageService.saveUserProfile(updated);
    toast.success('Your preferences have been saved.', 'Profile Updated');
  };

  // Find monthly budget for selected year & month
  const currentMonthBudget = useMemo(() => {
    return monthlyBudgets.find((b) => b.year === selectedYear && b.month === selectedMonth) || null;
  }, [monthlyBudgets, selectedYear, selectedMonth]);

  // Derived daily spending calculations
  const dailySpendingAnalysis = useMemo(() => {
    return calculateDailySpending({
      transactions,
      monthlyBudget: currentMonthBudget,
      year: selectedYear,
      month: selectedMonth,
      todayDateStr: getTodayDateString(),
    });
  }, [transactions, currentMonthBudget, selectedYear, selectedMonth]);

  // --- ACTIONS WITH USER ISOLATION & FEEDBACK ---
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'user_id'> & { user_id?: string }) => {
    if (!user) throw new Error('Authentication required.');
    try {
      const created = await StorageService.createTransaction({
        ...tx,
        user_id: user.id,
        currency: tx.currency || user.currency || 'EGP',
      });
      setTransactions((prev) => [created, ...prev]);
      toast.success(
        `${created.type === 'income' ? 'Income' : 'Expense'} of ${created.amount} ${created.currency} recorded.`,
        'Transaction Saved'
      );
      return created;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record transaction.');
      throw err;
    }
  };

  const updateTransaction = async (tx: Transaction) => {
    if (!user) throw new Error('Authentication required.');
    try {
      const updated = await StorageService.updateTransaction({
        ...tx,
        user_id: user.id,
      });
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? updated : t)));
      toast.success('Transaction updated successfully.');
      return updated;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update transaction.');
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await StorageService.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.info('Transaction deleted.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete transaction.');
      throw err;
    }
  };

  const saveMonthlyBudget = async (
    budget: Omit<MonthlyBudget, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => {
    if (!user) throw new Error('Authentication required.');
    try {
      const saved = await StorageService.saveMonthlyBudget({
        ...budget,
        user_id: user.id,
        currency: budget.currency || user.currency || 'EGP',
      });
      setMonthlyBudgets((prev) => {
        const idx = prev.findIndex((b) => b.year === saved.year && b.month === saved.month);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved];
      });
      toast.success('Monthly budget configured successfully.');
      return saved;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save budget.');
      throw err;
    }
  };

  const saveCategoryBudgets = async (
    monthlyBudgetId: string,
    items: Omit<CategoryBudget, 'id' | 'monthly_budget_id' | 'user_id'>[]
  ) => {
    if (!user) throw new Error('Authentication required.');
    try {
      const itemsWithUser = items.map((i) => ({ ...i, user_id: user.id }));
      await StorageService.saveCategoryBudgets(monthlyBudgetId, itemsWithUser);
      const updated = await StorageService.getCategoryBudgets(monthlyBudgetId);
      setCategoryBudgets(updated);
      toast.success('Category budget limits saved.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save category budgets.');
      throw err;
    }
  };

  const saveWishlistItem = async (
    item: Omit<WishlistItem, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => {
    if (!user) throw new Error('Authentication required.');
    try {
      const saved = await StorageService.saveWishlistItem({
        ...item,
        user_id: user.id,
        currency: item.currency || user.currency || 'EGP',
      });
      setWishlistItems((prev) => {
        const idx = prev.findIndex((w) => w.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });
      toast.success('Wishlist item saved.');
      return saved;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save wishlist item.');
      throw err;
    }
  };

  const deleteWishlistItem = async (id: string) => {
    try {
      await StorageService.deleteWishlistItem(id);
      setWishlistItems((prev) => prev.filter((w) => w.id !== id));
      toast.info('Item removed from wishlist.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete wishlist item.');
      throw err;
    }
  };

  const convertWishlistToExpense = async (item: WishlistItem, amount: number) => {
    if (!user) throw new Error('Authentication required.');
    try {
      // 1. Create transaction
      const newTx = await addTransaction({
        user_id: user.id,
        type: 'expense',
        amount,
        currency: item.currency,
        category_id: item.category_id || 'c1111111-1111-1111-1111-111111111109',
        description: `Purchased: ${item.name}`,
        transaction_date: getTodayDateString(),
        notes: `Wishlist purchase recorded on ${getTodayDateString()}`,
      });

      // 2. Update wishlist item status to 'purchased'
      await saveWishlistItem({
        ...item,
        user_id: user.id,
        status: 'purchased',
        actual_purchase_price: amount,
        recorded_transaction_id: newTx.id,
      });

      toast.success(`Purchase recorded as expense: ${amount} ${item.currency}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to convert wishlist item to purchase.');
      throw err;
    }
  };

  const saveSavingsGoal = async (
    goal: Omit<SavingsGoal, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => {
    if (!user) throw new Error('Authentication required.');
    try {
      const saved = await StorageService.saveSavingsGoal({
        ...goal,
        user_id: user.id,
        currency: goal.currency || user.currency || 'EGP',
      });
      setSavingsGoals((prev) => {
        const idx = prev.findIndex((g) => g.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved];
      });
      toast.success('Savings target saved.');
      return saved;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save savings goal.');
      throw err;
    }
  };

  const deleteSavingsGoal = async (id: string) => {
    try {
      await StorageService.deleteSavingsGoal(id);
      setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
      toast.info('Savings goal removed.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete savings goal.');
      throw err;
    }
  };

  const contributeToSavingsGoal = async (goalId: string, amount: number) => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal || !user) return;

    try {
      const newSaved = addMoney(goal.current_saved_amount, amount);
      const isCompleted = newSaved >= goal.target_amount;

      await saveSavingsGoal({
        ...goal,
        user_id: user.id,
        current_saved_amount: newSaved,
        status: isCompleted ? 'completed' : goal.status,
      });

      toast.success(
        `Added ${amount} ${goal.currency} to "${goal.name}".${isCompleted ? ' Target achieved!' : ''}`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to contribute to savings goal.');
    }
  };

  const saveRecurringTransaction = async (
    item: Omit<RecurringTransaction, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => {
    if (!user) throw new Error('Authentication required.');
    try {
      const saved = await StorageService.saveRecurringTransaction({
        ...item,
        user_id: user.id,
        currency: item.currency || user.currency || 'EGP',
      });
      setRecurringTransactions((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved];
      });
      toast.success('Recurring bill schedule saved.');
      return saved;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save recurring bill.');
      throw err;
    }
  };

  const deleteRecurringTransaction = async (id: string) => {
    try {
      await StorageService.deleteRecurringTransaction(id);
      setRecurringTransactions((prev) => prev.filter((r) => r.id !== id));
      toast.info('Recurring bill removed.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete recurring bill.');
      throw err;
    }
  };

  const processDueRecurring = async (item: RecurringTransaction) => {
    if (!user) return;
    try {
      // 1. Create the transaction
      await addTransaction({
        user_id: user.id,
        type: item.type,
        amount: item.amount,
        currency: item.currency,
        category_id: item.category_id || 'c1111111-1111-1111-1111-111111111105',
        description: item.description,
        transaction_date: getTodayDateString(),
        notes: `Generated from recurring subscription on ${getTodayDateString()}`,
        is_recurring: true,
        recurring_template_id: item.id,
      });

      // 2. Advance next_due_date based on frequency
      const now = new Date();
      let nextDate = new Date();
      if (item.frequency === 'daily') nextDate.setDate(now.getDate() + 1);
      else if (item.frequency === 'weekly') nextDate.setDate(now.getDate() + 7);
      else if (item.frequency === 'biweekly') nextDate.setDate(now.getDate() + 14);
      else if (item.frequency === 'monthly') nextDate.setMonth(now.getMonth() + 1);
      else if (item.frequency === 'yearly') nextDate.setFullYear(now.getFullYear() + 1);

      const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;

      await saveRecurringTransaction({
        ...item,
        user_id: user.id,
        last_generated_date: getTodayDateString(),
        next_due_date: nextStr,
      });

      toast.success(`Recurring bill "${item.description}" confirmed and paid.`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process recurring bill.');
    }
  };

  const clearUserData = async () => {
    try {
      await StorageService.clearAllUserData();
      await loadData(false);
      toast.info('All personal records in your account have been cleared.', 'Account Reset');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to clear account records.');
    }
  };

  const refreshAllData = async () => {
    await loadData(false);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        storageMode,
        setStorageMode,
        categories,
        transactions,
        monthlyBudgets,
        categoryBudgets,
        wishlistItems,
        savingsGoals,
        recurringTransactions,
        activePage,
        setActivePage,
        selectedYear,
        selectedMonth,
        setSelectedPeriod,
        language,
        setLanguage,
        theme,
        setTheme,
        currency,
        setCurrency,
        currentMonthBudget,
        dailySpendingAnalysis,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        saveMonthlyBudget,
        saveCategoryBudgets,
        saveWishlistItem,
        deleteWishlistItem,
        convertWishlistToExpense,
        saveSavingsGoal,
        deleteSavingsGoal,
        contributeToSavingsGoal,
        saveRecurringTransaction,
        deleteRecurringTransaction,
        processDueRecurring,
        updateProfile,
        clearUserData,
        refreshAllData,
        isLoading,
        isFetchingData,
        isAuthenticated,
        dbError,
        retryLoadData,
        handleSignOut,
        isOnboardingOpen,
        setIsOnboardingOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
