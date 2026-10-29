-- Spendly PostgreSQL Schema & Row Level Security (RLS) Migrations
-- Compatible with Supabase PostgreSQL 15+ / 17+

-- 1. Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    currency TEXT NOT NULL DEFAULT 'EGP',
    language TEXT NOT NULL DEFAULT 'en',
    theme TEXT NOT NULL DEFAULT 'light',
    opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    budget_cycle_start_day INT NOT NULL DEFAULT 1 CHECK (budget_cycle_start_day BETWEEN 1 AND 28),
    is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger for profile updated_at
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Automatically create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, currency, language, theme)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'currency', 'EGP'),
        COALESCE(NEW.raw_user_meta_data->>'language', 'en'),
        'light'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL if system default
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'CircleDollarSign',
    color TEXT NOT NULL DEFAULT '#0ea5e9',
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);

-- 4. Monthly Budgets
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INT NOT NULL CHECK (year >= 2020),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    total_budget NUMERIC(12,2) NOT NULL CHECK (total_budget >= 0),
    currency TEXT NOT NULL DEFAULT 'EGP',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_month_budget UNIQUE (user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_lookup ON public.monthly_budgets(user_id, year, month);

DROP TRIGGER IF EXISTS on_monthly_budgets_updated ON public.monthly_budgets;
CREATE TRIGGER on_monthly_budgets_updated
    BEFORE UPDATE ON public.monthly_budgets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Category Budgets
CREATE TABLE IF NOT EXISTS public.category_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_budget_id UUID NOT NULL REFERENCES public.monthly_budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_budget_category UNIQUE (monthly_budget_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_category_budgets_mb ON public.category_budgets(monthly_budget_id);

DROP TRIGGER IF EXISTS on_category_budgets_updated ON public.category_budgets;
CREATE TRIGGER on_category_budgets_updated
    BEFORE UPDATE ON public.category_budgets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'refund', 'transfer')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'EGP',
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_template_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

DROP TRIGGER IF EXISTS on_transactions_updated ON public.transactions;
CREATE TRIGGER on_transactions_updated
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Wishlist Items
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    estimated_price NUMERIC(12,2) NOT NULL CHECK (estimated_price > 0),
    actual_purchase_price NUMERIC(12,2),
    currency TEXT NOT NULL DEFAULT 'EGP',
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    target_purchase_date DATE,
    product_url TEXT,
    saved_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (saved_amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('planned', 'saving', 'purchased', 'cancelled')) DEFAULT 'planned',
    notes TEXT,
    recorded_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist_items(user_id, status);

DROP TRIGGER IF EXISTS on_wishlist_updated ON public.wishlist_items;
CREATE TRIGGER on_wishlist_updated
    BEFORE UPDATE ON public.wishlist_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. Savings Goals
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    current_saved_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (current_saved_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'EGP',
    target_date DATE,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals(user_id);

DROP TRIGGER IF EXISTS on_savings_goals_updated ON public.savings_goals;
CREATE TRIGGER on_savings_goals_updated
    BEFORE UPDATE ON public.savings_goals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Recurring Transactions Templates
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'EGP',
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')) DEFAULT 'expense',
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')) DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    next_due_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_generated_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_recurring_user ON public.recurring_transactions(user_id, is_active);

DROP TRIGGER IF EXISTS on_recurring_updated ON public.recurring_transactions;
CREATE TRIGGER on_recurring_updated
    BEFORE UPDATE ON public.recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Categories Policies (Users see system defaults + their custom categories)
CREATE POLICY "Users can view system and their own categories"
    ON public.categories FOR SELECT
    USING (is_system = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update their own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id AND is_system = false)
    WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete their own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id AND is_system = false);

-- 3. Monthly Budgets Policies
CREATE POLICY "Users can view their own monthly budgets"
    ON public.monthly_budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly budgets"
    ON public.monthly_budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly budgets"
    ON public.monthly_budgets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly budgets"
    ON public.monthly_budgets FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Category Budgets Policies
CREATE POLICY "Users can view their own category budgets"
    ON public.category_budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own category budgets"
    ON public.category_budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category budgets"
    ON public.category_budgets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category budgets"
    ON public.category_budgets FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Transactions Policies
CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON public.transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON public.transactions FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Wishlist Policies
CREATE POLICY "Users can view their own wishlist items"
    ON public.wishlist_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wishlist items"
    ON public.wishlist_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wishlist items"
    ON public.wishlist_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items"
    ON public.wishlist_items FOR DELETE
    USING (auth.uid() = user_id);

-- 7. Savings Goals Policies
CREATE POLICY "Users can view their own savings goals"
    ON public.savings_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings goals"
    ON public.savings_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals"
    ON public.savings_goals FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals"
    ON public.savings_goals FOR DELETE
    USING (auth.uid() = user_id);

-- 8. Recurring Transactions Policies
CREATE POLICY "Users can view their own recurring transactions"
    ON public.recurring_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring transactions"
    ON public.recurring_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring transactions"
    ON public.recurring_transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring transactions"
    ON public.recurring_transactions FOR DELETE
    USING (auth.uid() = user_id);

--------------------------------------------------------------------------------
-- DEFAULT SYSTEM CATEGORIES SEED
--------------------------------------------------------------------------------
INSERT INTO public.categories (id, user_id, name, name_ar, icon, color, type, is_system)
VALUES
    ('c1111111-1111-1111-1111-111111111101', NULL, 'Food & Drinks', 'طعام ومشروبات', 'Utensils', '#f97316', 'expense', true),
    ('c1111111-1111-1111-1111-111111111102', NULL, 'Groceries', 'بقالة وسوبرماركت', 'ShoppingCart', '#84cc16', 'expense', true),
    ('c1111111-1111-1111-1111-111111111103', NULL, 'Transportation', 'مواصلات ونقل', 'Bus', '#06b6d4', 'expense', true),
    ('c1111111-1111-1111-1111-111111111104', NULL, 'Housing & Rent', 'سكن وإيجار', 'Home', '#6366f1', 'expense', true),
    ('c1111111-1111-1111-1111-111111111105', NULL, 'Utilities & Bills', 'فواتير ومرافق', 'Zap', '#eab308', 'expense', true),
    ('c1111111-1111-1111-1111-111111111106', NULL, 'Internet & Telecom', 'إنترنت واتصالات', 'Wifi', '#3b82f6', 'expense', true),
    ('c1111111-1111-1111-1111-111111111107', NULL, 'Healthcare', 'صحة وعلاج', 'HeartPulse', '#ef4444', 'expense', true),
    ('c1111111-1111-1111-1111-111111111108', NULL, 'Entertainment', 'ترفيه وتسلية', 'Gamepad2', '#a855f7', 'expense', true),
    ('c1111111-1111-1111-1111-111111111109', NULL, 'Shopping & Clothing', 'تسوق وملابس', 'ShoppingBag', '#ec4899', 'expense', true),
    ('c1111111-1111-1111-1111-111111111110', NULL, 'Education', 'تعليم ودراسة', 'GraduationCap', '#14b8a6', 'expense', true),
    ('c1111111-1111-1111-1111-111111111111', NULL, 'Personal Care', 'عناية شخصية', 'Sparkles', '#f43f5e', 'expense', true),
    ('c1111111-1111-1111-1111-111111111112', NULL, 'Salary', 'مرتب وراتب شهري', 'Briefcase', '#10b981', 'income', true),
    ('c1111111-1111-1111-1111-111111111113', NULL, 'Freelance', 'عمل حر ومشاريع', 'Laptop', '#22c55e', 'income', true),
    ('c1111111-1111-1111-1111-111111111114', NULL, 'Allowance', 'مصروف شهري', 'Wallet', '#34d399', 'income', true),
    ('c1111111-1111-1111-1111-111111111115', NULL, 'Gifts', 'هدايا ومكافآت', 'Gift', '#8b5cf6', 'income', true),
    ('c1111111-1111-1111-1111-111111111116', NULL, 'Investments', 'استثمارات وعوائد', 'TrendingUp', '#059669', 'income', true),
    ('c1111111-1111-1111-1111-111111111117', NULL, 'Other Expenses', 'مصاريف أخرى', 'HelpCircle', '#64748b', 'expense', true),
    ('c1111111-1111-1111-1111-111111111118', NULL, 'Other Income', 'دخل آخر', 'Coins', '#0d9488', 'income', true)
ON CONFLICT (id) DO NOTHING;
