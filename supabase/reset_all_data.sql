-- ====================================================================
-- SPENDLY: Complete Database & Accounts Reset Script
-- 
-- WARNING: This script permanently deletes:
--  - All registered user accounts and authentication credentials (auth.users)
--  - All user profiles (public.profiles)
--  - All transactions, budgets, wishlist items, savings goals, and subscriptions
--  - All custom user categories (system default categories are preserved)
--
-- How to run:
-- 1. Open your Supabase Dashboard:
--    https://supabase.com/dashboard/project/fdtinjhomdpxzcvfmsev/sql/new
-- 2. Paste this entire script into the SQL Editor.
-- 3. Click "Run" (or Ctrl + Enter).
-- ====================================================================

BEGIN;

-- 1. Truncate all application user data tables
TRUNCATE TABLE 
    public.transactions,
    public.wishlist_items,
    public.savings_goals,
    public.recurring_transactions,
    public.category_budgets,
    public.monthly_budgets,
    public.profiles
CASCADE;

-- 2. Remove all custom user-created categories (preserves system defaults)
DELETE FROM public.categories 
WHERE is_system = FALSE OR user_id IS NOT NULL;

-- 3. Delete all authentication users, credentials, and OAuth identities
DELETE FROM auth.users;

-- 4. Re-seed default system categories if missing
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

COMMIT;
