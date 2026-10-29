export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'SAR' | 'AED' | 'GBP';
export type LanguageCode = 'en' | 'ar';
export type ThemeMode = 'light' | 'dark';

export interface UserProfile {
  id: string;
  email?: string;
  display_name: string;
  currency: CurrencyCode;
  language: LanguageCode;
  theme: ThemeMode;
  opening_balance: number;
  budget_cycle_start_day: number;
  is_onboarded: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CategoryType = 'expense' | 'income' | 'both';

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  name_ar: string;
  icon: string;
  color: string;
  type: CategoryType;
  is_system: boolean;
  created_at?: string;
}

export type TransactionType = 'expense' | 'income' | 'refund' | 'transfer';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  category_id: string;
  description: string;
  transaction_date: string; // YYYY-MM-DD
  notes?: string;
  is_recurring?: boolean;
  recurring_template_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MonthlyBudget {
  id: string;
  user_id: string;
  year: number;
  month: number; // 1-12
  total_budget: number;
  currency: CurrencyCode;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryBudget {
  id: string;
  user_id: string;
  monthly_budget_id: string;
  category_id: string;
  amount: number;
  created_at?: string;
  updated_at?: string;
}

export type WishlistPriority = 'high' | 'medium' | 'low';
export type WishlistStatus = 'planned' | 'saving' | 'purchased' | 'cancelled';

export interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category_id?: string;
  estimated_price: number;
  actual_purchase_price?: number;
  currency: CurrencyCode;
  priority: WishlistPriority;
  target_purchase_date?: string; // YYYY-MM-DD
  product_url?: string;
  saved_amount: number;
  status: WishlistStatus;
  notes?: string;
  recorded_transaction_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type SavingsGoalPriority = 'high' | 'medium' | 'low';
export type SavingsGoalStatus = 'active' | 'completed' | 'paused';

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_saved_amount: number;
  currency: CurrencyCode;
  target_date?: string; // YYYY-MM-DD
  priority: SavingsGoalPriority;
  status: SavingsGoalStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  category_id?: string;
  type: 'expense' | 'income';
  frequency: RecurringFrequency;
  start_date: string; // YYYY-MM-DD
  end_date?: string;
  next_due_date: string; // YYYY-MM-DD
  is_active: boolean;
  last_generated_date?: string;
  created_at?: string;
  updated_at?: string;
}

// Natural Language Parsed Structures
export interface ParsedItem {
  temp_id: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  category_id: string;
  category_name?: string;
  category_confidence: 'high' | 'medium' | 'low';
  type: TransactionType;
  transaction_date: string;
  original_text: string;
  needs_review: boolean;
  needsReview?: boolean;
  reviewReason?: string;
}

export type NaturalLanguageCommandType = 
  | 'create_transactions'
  | 'query_today'
  | 'query_week'
  | 'query_category'
  | 'query_budget'
  | 'update_transaction'
  | 'delete_transaction'
  | 'unknown';

export interface ParsedCommand {
  type: NaturalLanguageCommandType;
  raw_text: string;
  confidence: number;
  items?: ParsedItem[];
  query_params?: {
    category_id?: string;
    category_name?: string;
    timeframe?: 'today' | 'week' | 'month';
  };
  mutation_target?: {
    search_term: string;
    target_amount?: number;
    new_amount?: number;
    action: 'update' | 'delete';
  };
  feedback_message?: string;
  feedback_message_ar?: string;
}

// Spending Pace Analysis
export type AssessmentLevel = 'within_budget' | 'above_pace' | 'approaching_limit' | 'exceeded';

export interface DailySpendingAnalysis {
  monthly_budget: number;
  total_expenses: number;
  remaining_budget: number;
  total_days_in_month: number;
  elapsed_days: number;
  remaining_days: number;
  spent_today: number;
  average_daily_spending: number;
  recommended_daily_pace: number;
  budget_consumption_pct: number;
  projected_month_end_spending: number;
  projected_variance: number; // positive = surplus, negative = deficit
  is_preliminary: boolean;
  assessment_level: AssessmentLevel;
  assessment_title: string;
  assessment_title_ar: string;
  assessment_explanation: string;
  assessment_explanation_ar: string;
}

// Affordability Analysis
export interface AffordabilityResult {
  is_affordable_in_budget: boolean;
  is_affordable_with_savings: boolean;
  budget_impact_percentage: number;
  remaining_after_purchase: number;
  verdict: 'comfortable' | 'tight' | 'exceeds_budget' | 'requires_savings';
  explanation: string;
  explanation_ar: string;
  recommended_action: string;
  recommended_action_ar: string;
}

// Storage Mode
export type StorageMode = 'supabase' | 'local';

export interface AppState {
  storageMode: StorageMode;
  user: UserProfile | null;
  categories: Category[];
  transactions: Transaction[];
  monthlyBudgets: MonthlyBudget[];
  categoryBudgets: CategoryBudget[];
  wishlistItems: WishlistItem[];
  savingsGoals: SavingsGoal[];
  recurringTransactions: RecurringTransaction[];
}
