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

export class StorageService {
  static getStorageMode(): StorageMode {
    return 'supabase';
  }

  // --- USER PROFILE ---
  static async getUserProfile(): Promise<UserProfile | null> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      return {
        ...data,
        email: user.email,
      } as UserProfile;
    }

    // If profile record does not exist in DB yet, create it
    const newProfile: UserProfile = {
      id: user.id,
      email: user.email,
      display_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.display_name ||
        user.email?.split('@')[0] ||
        'User',
      currency: (user.user_metadata?.currency as CurrencyCode) || 'EGP',
      language: user.user_metadata?.language || 'en',
      theme: 'light',
      opening_balance: 0,
      budget_cycle_start_day: 1,
      is_onboarded: false,
    };

    return await this.saveUserProfile(newProfile);
  }

  static async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || profile.id;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
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
      console.error('Error saving profile to Supabase:', error);
      return profile;
    }
    return { ...data, email: user?.email } as UserProfile;
  }

  // --- CATEGORIES ---
  static async getCategories(): Promise<Category[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Category[];
    }
    return SYSTEM_CATEGORIES;
  }

  static async saveCategory(category: Category): Promise<Category> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('categories')
      .upsert({
        ...category,
        user_id: user?.id,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  }

  // --- TRANSACTIONS ---
  static async getTransactions(): Promise<Transaction[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (!error && data) {
      return data as Transaction[];
    }
    return [];
  }

  static async createTransaction(
    tx: Omit<Transaction, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ): Promise<Transaction> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || tx.user_id;

    const fullTx: Transaction = {
      ...tx,
      user_id: userId!,
      id: tx.id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(fullTx)
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  }

  static async updateTransaction(tx: Transaction): Promise<Transaction> {
    const supabase = getSupabase();
    const updated: Transaction = {
      ...tx,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('transactions')
      .update(updated)
      .eq('id', tx.id)
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  }

  static async deleteTransaction(id: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  // --- MONTHLY BUDGETS ---
  static async getMonthlyBudgets(): Promise<MonthlyBudget[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('monthly_budgets').select('*');
    if (!error && data) return data as MonthlyBudget[];
    return [];
  }

  static async saveMonthlyBudget(
    budget: Omit<MonthlyBudget, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ): Promise<MonthlyBudget> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || budget.user_id;

    const full: MonthlyBudget = {
      ...budget,
      user_id: userId!,
      id: budget.id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('monthly_budgets')
      .upsert(full, { onConflict: 'user_id,year,month' })
      .select()
      .single();

    if (error) throw error;
    return data as MonthlyBudget;
  }

  // --- CATEGORY BUDGETS ---
  static async getCategoryBudgets(monthlyBudgetId: string): Promise<CategoryBudget[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('category_budgets')
      .select('*')
      .eq('monthly_budget_id', monthlyBudgetId);

    if (!error && data) return data as CategoryBudget[];
    return [];
  }

  static async saveCategoryBudgets(
    monthlyBudgetId: string,
    items: Omit<CategoryBudget, 'id' | 'monthly_budget_id'>[]
  ): Promise<void> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const fullItems: CategoryBudget[] = items.map((item) => ({
      ...item,
      id: generateUUID(),
      user_id: user?.id || item.user_id,
      monthly_budget_id: monthlyBudgetId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Delete existing for this budget, then insert new
    await supabase.from('category_budgets').delete().eq('monthly_budget_id', monthlyBudgetId);
    if (fullItems.length > 0) {
      const { error } = await supabase.from('category_budgets').insert(fullItems);
      if (error) throw error;
    }
  }

  // --- WISHLIST ITEMS ---
  static async getWishlistItems(): Promise<WishlistItem[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .order('priority', { ascending: false });

    if (!error && data) return data as WishlistItem[];
    return [];
  }

  static async saveWishlistItem(
    item: Omit<WishlistItem, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ): Promise<WishlistItem> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const full: WishlistItem = {
      ...item,
      user_id: user?.id || item.user_id!,
      id: item.id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('wishlist_items')
      .upsert(full)
      .select()
      .single();

    if (error) throw error;
    return data as WishlistItem;
  }

  static async deleteWishlistItem(id: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
    if (error) throw error;
  }

  // --- SAVINGS GOALS ---
  static async getSavingsGoals(): Promise<SavingsGoal[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('savings_goals').select('*');
    if (!error && data) return data as SavingsGoal[];
    return [];
  }

  static async saveSavingsGoal(
    goal: Omit<SavingsGoal, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ): Promise<SavingsGoal> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const full: SavingsGoal = {
      ...goal,
      user_id: user?.id || goal.user_id!,
      id: goal.id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('savings_goals')
      .upsert(full)
      .select()
      .single();

    if (error) throw error;
    return data as SavingsGoal;
  }

  static async deleteSavingsGoal(id: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) throw error;
  }

  // --- RECURRING TRANSACTIONS ---
  static async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('recurring_transactions').select('*');
    if (!error && data) return data as RecurringTransaction[];
    return [];
  }

  static async saveRecurringTransaction(
    item: Omit<RecurringTransaction, 'id' | 'user_id'> & { id?: string; user_id?: string }
  ): Promise<RecurringTransaction> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const full: RecurringTransaction = {
      ...item,
      user_id: user?.id || item.user_id!,
      id: item.id || generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('recurring_transactions')
      .upsert(full)
      .select()
      .single();

    if (error) throw error;
    return data as RecurringTransaction;
  }

  static async deleteRecurringTransaction(id: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (error) throw error;
  }

  // --- USER DATA MANAGEMENT ---
  static async clearAllUserData(): Promise<void> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await Promise.all([
      supabase.from('transactions').delete().eq('user_id', user.id),
      supabase.from('monthly_budgets').delete().eq('user_id', user.id),
      supabase.from('category_budgets').delete().eq('user_id', user.id),
      supabase.from('wishlist_items').delete().eq('user_id', user.id),
      supabase.from('savings_goals').delete().eq('user_id', user.id),
      supabase.from('recurring_transactions').delete().eq('user_id', user.id),
    ]);
  }
}
