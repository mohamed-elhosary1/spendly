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
  CurrencyCode,
} from '@/types';
import { getSupabase } from './supabase';
import { SYSTEM_CATEGORIES } from './defaultCategories';
import { generateUUID } from './utils';
import { getCurrentYearAndMonth, getTodayDateString } from './dateUtils';
import { subDays } from 'date-fns';

const KEYS = {
  USER: 'spendly_user',
  CATEGORIES: 'spendly_categories',
  TRANSACTIONS: 'spendly_transactions',
  MONTHLY_BUDGETS: 'spendly_monthly_budgets',
  CATEGORY_BUDGETS: 'spendly_category_budgets',
  WISHLIST: 'spendly_wishlist',
  SAVINGS: 'spendly_savings',
  RECURRING: 'spendly_recurring',
  MODE: 'spendly_storage_mode',
};

// Default fallback local user
export const DEFAULT_LOCAL_USER: UserProfile = {
  id: 'local-user-id',
  email: 'demo@spendly.local',
  display_name: 'Ahmed',
  currency: 'EGP',
  language: 'en',
  theme: 'light',
  opening_balance: 15000,
  budget_cycle_start_day: 1,
  is_onboarded: true,
};

export class StorageService {
  static getStorageMode(): StorageMode {
    const client = getSupabase();
    if (!client) return 'local';
    const saved = localStorage.getItem(KEYS.MODE);
    return saved === 'supabase' ? 'supabase' : 'local';
  }

  static setStorageMode(mode: StorageMode): void {
    localStorage.setItem(KEYS.MODE, mode);
  }

  // --- USER PROFILE ---
  static async getUserProfile(): Promise<UserProfile | null> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Supabase profile:', error);
      }
      if (data) return data as UserProfile;
    }

    // Local storage fallback
    const raw = localStorage.getItem(KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }

  static async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          display_name: profile.display_name,
          currency: profile.currency,
          language: profile.language,
          theme: profile.theme,
          opening_balance: profile.opening_balance,
          budget_cycle_start_day: profile.budget_cycle_start_day,
          is_onboarded: profile.is_onboarded,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating Supabase profile:', error);
        throw error;
      }
      return data as UserProfile;
    }

    localStorage.setItem(KEYS.USER, JSON.stringify(profile));
    return profile;
  }

  // --- CATEGORIES ---
  static async getCategories(): Promise<Category[]> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Category[];
      }
    }

    // Local
    const raw = localStorage.getItem(KEYS.CATEGORIES);
    if (raw) {
      try {
        const custom: Category[] = JSON.parse(raw);
        // Combine system categories + custom
        const existingIds = new Set(custom.map((c) => c.id));
        const combined = [...custom];
        for (const sys of SYSTEM_CATEGORIES) {
          if (!existingIds.has(sys.id)) {
            combined.push(sys);
          }
        }
        return combined;
      } catch {
        // Fall back to system categories
      }
    }

    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(SYSTEM_CATEGORIES));
    return SYSTEM_CATEGORIES;
  }

  static async saveCategory(category: Category): Promise<Category> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('categories')
        .upsert(category)
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    }

    const categories = await this.getCategories();
    const index = categories.findIndex((c) => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    return category;
  }

  // --- TRANSACTIONS ---
  static async getTransactions(): Promise<Transaction[]> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      if (!error && data) return data as Transaction[];
    }

    const raw = localStorage.getItem(KEYS.TRANSACTIONS);
    if (!raw) return [];
    try {
      const parsed: Transaction[] = JSON.parse(raw);
      return parsed.sort(
        (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );
    } catch {
      return [];
    }
  }

  static async createTransaction(tx: Omit<Transaction, 'id'> & { id?: string }): Promise<Transaction> {
    const fullTx: Transaction = {
      ...tx,
      id: tx.id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('transactions')
        .insert(fullTx)
        .select()
        .single();
      if (error) throw error;
      return data as Transaction;
    }

    const list = await this.getTransactions();
    list.unshift(fullTx);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list));
    return fullTx;
  }

  static async updateTransaction(tx: Transaction): Promise<Transaction> {
    const updated: Transaction = {
      ...tx,
      updated_at: new Date().toISOString(),
    };

    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('transactions')
        .update(updated)
        .eq('id', tx.id)
        .select()
        .single();
      if (error) throw error;
      return data as Transaction;
    }

    const list = await this.getTransactions();
    const index = list.findIndex((item) => item.id === tx.id);
    if (index >= 0) {
      list[index] = updated;
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list));
    }
    return updated;
  }

  static async deleteTransaction(id: string): Promise<void> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      return;
    }

    const list = await this.getTransactions();
    const filtered = list.filter((item) => item.id !== id);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));
  }

  // --- MONTHLY BUDGETS ---
  static async getMonthlyBudgets(): Promise<MonthlyBudget[]> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase.from('monthly_budgets').select('*');
      if (!error && data) return data as MonthlyBudget[];
    }

    const raw = localStorage.getItem(KEYS.MONTHLY_BUDGETS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static async saveMonthlyBudget(budget: Omit<MonthlyBudget, 'id'> & { id?: string }): Promise<MonthlyBudget> {
    const full: MonthlyBudget = {
      ...budget,
      id: budget.id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('monthly_budgets')
        .upsert(full, { onConflict: 'user_id,year,month' })
        .select()
        .single();
      if (error) throw error;
      return data as MonthlyBudget;
    }

    const list = await this.getMonthlyBudgets();
    const idx = list.findIndex((b) => b.year === full.year && b.month === full.month);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...full };
    } else {
      list.push(full);
    }
    localStorage.setItem(KEYS.MONTHLY_BUDGETS, JSON.stringify(list));
    return full;
  }

  // --- CATEGORY BUDGETS ---
  static async getCategoryBudgets(monthlyBudgetId: string): Promise<CategoryBudget[]> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('category_budgets')
        .select('*')
        .eq('monthly_budget_id', monthlyBudgetId);
      if (!error && data) return data as CategoryBudget[];
    }

    const raw = localStorage.getItem(KEYS.CATEGORY_BUDGETS);
    if (!raw) return [];
    try {
      const list: CategoryBudget[] = JSON.parse(raw);
      return list.filter((cb) => cb.monthly_budget_id === monthlyBudgetId);
    } catch {
      return [];
    }
  }

  static async saveCategoryBudgets(
    monthlyBudgetId: string,
    items: Omit<CategoryBudget, 'id' | 'monthly_budget_id'>[]
  ): Promise<void> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    const fullItems: CategoryBudget[] = items.map((item) => ({
      ...item,
      id: generateUUID(),
      monthly_budget_id: monthlyBudgetId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (mode === 'supabase' && supabase) {
      // Clear existing for this budget, then insert new
      await supabase.from('category_budgets').delete().eq('monthly_budget_id', monthlyBudgetId);
      if (fullItems.length > 0) {
        const { error } = await supabase.from('category_budgets').insert(fullItems);
        if (error) throw error;
      }
      return;
    }

    const raw = localStorage.getItem(KEYS.CATEGORY_BUDGETS);
    let all: CategoryBudget[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {}
    }
    const filtered = all.filter((cb) => cb.monthly_budget_id !== monthlyBudgetId);
    filtered.push(...fullItems);
    localStorage.setItem(KEYS.CATEGORY_BUDGETS, JSON.stringify(filtered));
  }

  // --- WISHLIST ITEMS ---
  static async getWishlistItems(): Promise<WishlistItem[]> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .order('priority', { ascending: false });
      if (!error && data) return data as WishlistItem[];
    }

    const raw = localStorage.getItem(KEYS.WISHLIST);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static async saveWishlistItem(item: Omit<WishlistItem, 'id'> & { id?: string }): Promise<WishlistItem> {
    const full: WishlistItem = {
      ...item,
      id: item.id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('wishlist_items')
        .upsert(full)
        .select()
        .single();
      if (error) throw error;
      return data as WishlistItem;
    }

    const list = await this.getWishlistItems();
    const idx = list.findIndex((i) => i.id === full.id);
    if (idx >= 0) {
      list[idx] = full;
    } else {
      list.push(full);
    }
    localStorage.setItem(KEYS.WISHLIST, JSON.stringify(list));
    return full;
  }

  static async deleteWishlistItem(id: string): Promise<void> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      await supabase.from('wishlist_items').delete().eq('id', id);
      return;
    }

    const list = await this.getWishlistItems();
    const filtered = list.filter((i) => i.id !== id);
    localStorage.setItem(KEYS.WISHLIST, JSON.stringify(filtered));
  }

  // --- SAVINGS GOALS ---
  static async getSavingsGoals(): Promise<SavingsGoal[]> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase.from('savings_goals').select('*');
      if (!error && data) return data as SavingsGoal[];
    }

    const raw = localStorage.getItem(KEYS.SAVINGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static async saveSavingsGoal(goal: Omit<SavingsGoal, 'id'> & { id?: string }): Promise<SavingsGoal> {
    const full: SavingsGoal = {
      ...goal,
      id: goal.id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase.from('savings_goals').upsert(full).select().single();
      if (error) throw error;
      return data as SavingsGoal;
    }

    const list = await this.getSavingsGoals();
    const idx = list.findIndex((g) => g.id === full.id);
    if (idx >= 0) {
      list[idx] = full;
    } else {
      list.push(full);
    }
    localStorage.setItem(KEYS.SAVINGS, JSON.stringify(list));
    return full;
  }

  static async deleteSavingsGoal(id: string): Promise<void> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      await supabase.from('savings_goals').delete().eq('id', id);
      return;
    }

    const list = await this.getSavingsGoals();
    const filtered = list.filter((g) => g.id !== id);
    localStorage.setItem(KEYS.SAVINGS, JSON.stringify(filtered));
  }

  // --- RECURRING TRANSACTIONS ---
  static async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase.from('recurring_transactions').select('*');
      if (!error && data) return data as RecurringTransaction[];
    }

    const raw = localStorage.getItem(KEYS.RECURRING);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static async saveRecurringTransaction(
    item: Omit<RecurringTransaction, 'id'> & { id?: string }
  ): Promise<RecurringTransaction> {
    const full: RecurringTransaction = {
      ...item,
      id: item.id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .upsert(full)
        .select()
        .single();
      if (error) throw error;
      return data as RecurringTransaction;
    }

    const list = await this.getRecurringTransactions();
    const idx = list.findIndex((r) => r.id === full.id);
    if (idx >= 0) {
      list[idx] = full;
    } else {
      list.push(full);
    }
    localStorage.setItem(KEYS.RECURRING, JSON.stringify(list));
    return full;
  }

  static async deleteRecurringTransaction(id: string): Promise<void> {
    const mode = this.getStorageMode();
    const supabase = getSupabase();

    if (mode === 'supabase' && supabase) {
      await supabase.from('recurring_transactions').delete().eq('id', id);
      return;
    }

    const list = await this.getRecurringTransactions();
    const filtered = list.filter((r) => r.id !== id);
    localStorage.setItem(KEYS.RECURRING, JSON.stringify(filtered));
  }

  // --- DEMO SAMPLE DATA SEEDING (Explicit choice only) ---
  static async loadDemoData(currency: CurrencyCode = 'EGP'): Promise<void> {
    const { year, month } = getCurrentYearAndMonth();
    const todayStr = getTodayDateString();
    const now = new Date();

    const demoProfile: UserProfile = {
      id: 'local-demo-user',
      display_name: 'Karim',
      currency,
      language: 'en',
      theme: 'light',
      opening_balance: 24000,
      budget_cycle_start_day: 1,
      is_onboarded: true,
    };

    const demoBudget: MonthlyBudget = {
      id: 'demo-budget-id',
      user_id: demoProfile.id,
      year,
      month,
      total_budget: 12000,
      currency,
      notes: 'Standard monthly living budget',
    };

    const demoCategoryBudgets: CategoryBudget[] = [
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        monthly_budget_id: demoBudget.id,
        category_id: 'c1111111-1111-1111-1111-111111111101', // Food & Drinks
        amount: 3500,
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        monthly_budget_id: demoBudget.id,
        category_id: 'c1111111-1111-1111-1111-111111111102', // Groceries
        amount: 2500,
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        monthly_budget_id: demoBudget.id,
        category_id: 'c1111111-1111-1111-1111-111111111103', // Transportation
        amount: 1500,
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        monthly_budget_id: demoBudget.id,
        category_id: 'c1111111-1111-1111-1111-111111111106', // Internet
        amount: 600,
      },
    ];

    // Helper for generating relative dates
    const makeDate = (daysAgo: number) => {
      const d = subDays(now, daysAgo);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const demoTransactions: Transaction[] = [
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        type: 'income',
        amount: 18000,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111112', // Salary
        description: 'Monthly Tech Salary',
        transaction_date: makeDate(15),
        notes: 'Direct deposit',
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        type: 'income',
        amount: 3500,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111113', // Freelance
        description: 'Frontend Web Consulting Project',
        transaction_date: makeDate(8),
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        type: 'expense',
        amount: 85,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111101', // Food
        description: 'Lunch at Koshari Abou Tarek',
        transaction_date: todayStr,
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        type: 'expense',
        amount: 30,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111103', // Transport
        description: 'Metro ride to Downtown',
        transaction_date: todayStr,
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        type: 'expense',
        amount: 20,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111101', // Food
        description: 'Morning Espresso at local cafe',
        transaction_date: todayStr,
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        type: 'expense',
        amount: 450,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111102', // Groceries
        description: 'Weekly fresh fruits & dairy',
        transaction_date: makeDate(2),
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        type: 'expense',
        amount: 250,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111106', // Internet
        description: 'VDSL Home Internet 200 Mbps',
        transaction_date: makeDate(5),
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        type: 'expense',
        amount: 140,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111103', // Transport
        description: 'Uber trip back home',
        transaction_date: makeDate(6),
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        type: 'expense',
        amount: 320,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111107', // Healthcare
        description: 'Prescription vitamins & medicine',
        transaction_date: makeDate(10),
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        type: 'expense',
        amount: 210,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111108', // Entertainment
        description: 'Weekend Cinema Movie Ticket',
        transaction_date: makeDate(12),
      },
    ];

    const demoWishlist: WishlistItem[] = [
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        name: 'Ergonomic Desk Chair',
        description: 'Lumbar support mesh office chair for work from home',
        category_id: 'c1111111-1111-1111-1111-111111111109',
        estimated_price: 3200,
        currency,
        priority: 'high',
        saved_amount: 1500,
        status: 'saving',
        product_url: 'https://example.com/chair',
        notes: 'Targeting end-of-year sale',
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        name: 'Noise-Cancelling Headphones',
        description: 'Sony WH-1000XM5 for quiet focus hours',
        category_id: 'c1111111-1111-1111-1111-111111111108',
        estimated_price: 8500,
        currency,
        priority: 'medium',
        saved_amount: 0,
        status: 'planned',
      },
    ];

    const demoSavingsGoals: SavingsGoal[] = [
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        name: 'Emergency Fund (6 Months)',
        target_amount: 50000,
        current_saved_amount: 22000,
        currency,
        priority: 'high',
        status: 'active',
        notes: 'Targeting mid-2027 completion',
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        name: 'Alexandria Summer Vacation',
        target_amount: 10000,
        current_saved_amount: 6500,
        currency,
        priority: 'medium',
        status: 'active',
      },
    ];

    const demoRecurring: RecurringTransaction[] = [
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        description: 'WE Home VDSL Fiber 200GB',
        amount: 250,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111106',
        type: 'expense',
        frequency: 'monthly',
        start_date: '2026-01-01',
        next_due_date: '2026-11-05',
        is_active: true,
      },
      {
        id: generateUUID(),
        user_id: demoProfile.id,
        description: 'Spotify Premium Family',
        amount: 120,
        currency,
        category_id: 'c1111111-1111-1111-1111-111111111108',
        type: 'expense',
        frequency: 'monthly',
        start_date: '2026-01-10',
        next_due_date: '2026-11-10',
        is_active: true,
      },
    ];

    localStorage.setItem(KEYS.USER, JSON.stringify(demoProfile));
    localStorage.setItem(KEYS.MONTHLY_BUDGETS, JSON.stringify([demoBudget]));
    localStorage.setItem(KEYS.CATEGORY_BUDGETS, JSON.stringify(demoCategoryBudgets));
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(demoTransactions));
    localStorage.setItem(KEYS.WISHLIST, JSON.stringify(demoWishlist));
    localStorage.setItem(KEYS.SAVINGS, JSON.stringify(demoSavingsGoals));
    localStorage.setItem(KEYS.RECURRING, JSON.stringify(demoRecurring));
  }

  static clearAllLocalData(): void {
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.MONTHLY_BUDGETS);
    localStorage.removeItem(KEYS.CATEGORY_BUDGETS);
    localStorage.removeItem(KEYS.WISHLIST);
    localStorage.removeItem(KEYS.SAVINGS);
    localStorage.removeItem(KEYS.RECURRING);
  }
}
