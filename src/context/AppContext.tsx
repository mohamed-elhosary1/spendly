import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
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
import { addMoney, subtractMoney } from '@/lib/currency';

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
  saveMonthlyBudget: (budget: Omit<MonthlyBudget, 'id' | 'user_id'> & { id?: string; user_id?: string }) => Promise<MonthlyBudget>;
  saveCategoryBudgets: (
    monthlyBudgetId: string,
    items: Omit<CategoryBudget, 'id' | 'monthly_budget_id' | 'user_id'>[]
  ) => Promise<void>;
  saveWishlistItem: (item: Omit<WishlistItem, 'id' | 'user_id'> & { id?: string; user_id?: string }) => Promise<WishlistItem>;
  deleteWishlistItem: (id: string) => Promise<void>;
  convertWishlistToExpense: (item: WishlistItem, amount: number) => Promise<void>;
  saveSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'user_id'> & { id?: string; user_id?: string }) => Promise<SavingsGoal>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  contributeToSavingsGoal: (goalId: string, amount: number) => Promise<void>;
  saveRecurringTransaction: (
    item: Omit<RecurringTransaction, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => Promise<RecurringTransaction>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  processDueRecurring: (item: RecurringTransaction) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  refreshAllData: () => Promise<void>;

  // Auth
  isLoading: boolean;
  isAuthenticated: boolean;
  handleSignOut: () => Promise<void>;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentYM = getCurrentYearAndMonth();
  const [selectedYear, setSelectedYear] = useState<number>(currentYM.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentYM.month);
  const [activePage, setActivePage] = useState<AppPage>('dashboard');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setIsAuthenticated(false);
        setUser(null);
        setTransactions([]);
        setMonthlyBudgets([]);
        setCategoryBudgets([]);
        setWishlistItems([]);
        setSavingsGoals([]);
        setRecurringTransactions([]);
        setIsLoading(false);
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
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
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
  };

  useEffect(() => {
    loadData();
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadData();
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
    loadData();
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

  // Actions
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'user_id'> & { user_id?: string }) => {
    const userId = user?.id || 'local-user';
    const created = await StorageService.createTransaction({
      ...tx,
      user_id: tx.user_id || userId,
      currency: tx.currency || user?.currency || 'EGP',
    });
    setTransactions((prev) => [created, ...prev]);
    return created;
  };

  const updateTransaction = async (tx: Transaction) => {
    const updated = await StorageService.updateTransaction(tx);
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? updated : t)));
    return updated;
  };

  const deleteTransaction = async (id: string) => {
    await StorageService.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const saveMonthlyBudget = async (
    budget: Omit<MonthlyBudget, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => {
    const userId = user?.id || 'local-user';
    const saved = await StorageService.saveMonthlyBudget({
      ...budget,
      user_id: budget.user_id || userId,
      currency: budget.currency || user?.currency || 'EGP',
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
    return saved;
  };

  const saveCategoryBudgets = async (
    monthlyBudgetId: string,
    items: Omit<CategoryBudget, 'id' | 'monthly_budget_id' | 'user_id'>[]
  ) => {
    const userId = user?.id || 'local-user';
    const itemsWithUser = items.map((i) => ({ ...i, user_id: userId }));
    await StorageService.saveCategoryBudgets(monthlyBudgetId, itemsWithUser);
    const updated = await StorageService.getCategoryBudgets(monthlyBudgetId);
    setCategoryBudgets(updated);
  };

  const saveWishlistItem = async (
    item: Omit<WishlistItem, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => {
    const userId = user?.id || 'local-user';
    const saved = await StorageService.saveWishlistItem({
      ...item,
      user_id: item.user_id || userId,
      currency: item.currency || user?.currency || 'EGP',
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
    return saved;
  };

  const deleteWishlistItem = async (id: string) => {
    await StorageService.deleteWishlistItem(id);
    setWishlistItems((prev) => prev.filter((w) => w.id !== id));
  };

  const convertWishlistToExpense = async (item: WishlistItem, amount: number) => {
    // 1. Create transaction
    const newTx = await addTransaction({
      user_id: user?.id || 'local-user',
      type: 'expense',
      amount,
      currency: item.currency,
      category_id: item.category_id || 'c1111111-1111-1111-1111-111111111109', // Shopping default
      description: `Purchased: ${item.name}`,
      transaction_date: getTodayDateString(),
      notes: `Wishlist purchase recorded on ${getTodayDateString()}`,
    });

    // 2. Update wishlist item status to 'purchased' and store recorded_transaction_id
    await saveWishlistItem({
      ...item,
      status: 'purchased',
      actual_purchase_price: amount,
      recorded_transaction_id: newTx.id,
    });
  };

  const saveSavingsGoal = async (
    goal: Omit<SavingsGoal, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => {
    const userId = user?.id || 'local-user';
    const saved = await StorageService.saveSavingsGoal({
      ...goal,
      user_id: goal.user_id || userId,
      currency: goal.currency || user?.currency || 'EGP',
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
    return saved;
  };

  const deleteSavingsGoal = async (id: string) => {
    await StorageService.deleteSavingsGoal(id);
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const contributeToSavingsGoal = async (goalId: string, amount: number) => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return;

    const newSaved = addMoney(goal.current_saved_amount, amount);
    const isCompleted = newSaved >= goal.target_amount;

    await saveSavingsGoal({
      ...goal,
      current_saved_amount: newSaved,
      status: isCompleted ? 'completed' : goal.status,
    });
  };

  const saveRecurringTransaction = async (
    item: Omit<RecurringTransaction, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ) => {
    const userId = user?.id || 'local-user';
    const saved = await StorageService.saveRecurringTransaction({
      ...item,
      user_id: item.user_id || userId,
      currency: item.currency || user?.currency || 'EGP',
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
    return saved;
  };

  const deleteRecurringTransaction = async (id: string) => {
    await StorageService.deleteRecurringTransaction(id);
    setRecurringTransactions((prev) => prev.filter((r) => r.id !== id));
  };

  const processDueRecurring = async (item: RecurringTransaction) => {
    // 1. Create the transaction
    await addTransaction({
      user_id: user?.id || 'local-user',
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
      last_generated_date: getTodayDateString(),
      next_due_date: nextStr,
    });
  };

  const loadDemoData = async () => {
    await StorageService.loadDemoData(user?.currency || 'EGP');
    await loadData();
  };

  const clearAllData = async () => {
    StorageService.clearAllLocalData();
    await loadData();
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
        loadDemoData,
        clearAllData,
        refreshAllData: loadData,
        isLoading,
        isAuthenticated,
        handleSignOut,
        isOnboardingOpen,
        setIsOnboardingOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
