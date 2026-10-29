# Spendly — Personal Finance Workspace

**Spendly** is a production-minded personal finance workspace designed to help users take control of their financial life. It allows users to record expenses effortlessly using natural language (in English and Egyptian Arabic), monitor monthly budgets, evaluate daily spending velocity, analyze purchase wishlists for affordability, track income, and build long-term savings goals.

---

## 1. Product Highlights & The 5 Core Questions

Spendly answers the five critical personal finance questions at a glance:

1. **How much money have I spent this month?**  
   Tracked in real time on the Dashboard and Transactions ledger, separating expenses from internal transfers and deducting refunds.
2. **How much of my budget remains?**  
   Calculated as `R = B - E` with a visual progress bar that clamps between 0% and 100% while explicitly displaying the real consumption percentage (including overspending beyond 100%).
3. **Is my current spending pace sustainable until the end of the month?**  
   Transparent spending pace analysis computes your remaining daily allowance:  
   $$\text{Daily Allowance} = \frac{\max(0, R)}{\max(1, D)}$$  
   accompanied by an objective, non-shaming daily assessment (*Within Budget*, *Above Recommended Pace*, *Approaching Budget Limit*, or *Budget Exceeded*).
4. **What am I spending my money on?**  
   Interactive category breakdown donut chart, category budget limits, and period-over-period trend analysis.
5. **Can I afford a planned purchase without compromising my budget?**  
   A dedicated Wishlist Affordability Analyzer evaluates every wishlist item against your remaining monthly budget, remaining cycle days, and tracked available funds, providing clear guidance instead of a naive binary label.

---

## 2. Technology Stack

- **Frontend Framework**: React 19 with TypeScript.
- **Build Tool**: Vite 8 with PWA Service Worker precaching (`vite-plugin-pwa`).
- **Styling**: Tailwind CSS with custom design system variables and dark mode class strategy.
- **Icons**: Lucide React (`lucide-react`).
- **Data Visualization**: Recharts (Responsive bar charts, pie/donut charts, and trend lines).
- **Backend & Database**: Supabase PostgreSQL 15+ / 17+ with complete Row Level Security (RLS).
- **Client Storage Architecture**: Dual-mode repository supporting full offline Local Mode (LocalStorage / browser persistence) and live Supabase Cloud Sync.
- **I18n & Regional**: Full English and Egyptian Arabic support with dynamic bidirectional layout switching (`dir="ltr"` / `dir="rtl"`), font optimization, and Western/Eastern numeral parsing.
- **Testing**: Vitest with unit test suites covering the NL parser, financial pace calculations, wishlist affordability, and currency precision.

---

## 3. Database Architecture & Row Level Security (RLS)

All database migrations and security policies are version-controlled in [`supabase/migrations/20261029000000_spendly_schema.sql`](file:///c:/Users/cassi/Documents/antigravity/hopeful-galileo/supabase/migrations/20261029000000_spendly_schema.sql).

### Tables Created:
1. `public.profiles`: User configuration, display name, currency, language, theme, and opening balance.
2. `public.categories`: System defaults and custom user categories with icons, colors, and types (`expense`, `income`, `both`).
3. `public.monthly_budgets`: Overall monthly spending ceilings per user, year, and month with `UNIQUE(user_id, year, month)`.
4. `public.category_budgets`: Sub-budgets per category for fine-grained pacing.
5. `public.transactions`: Complete financial ledger with `NUMERIC(12,2)` amounts, transaction dates, types (`expense`, `income`, `refund`, `transfer`), and notes.
6. `public.wishlist_items`: Wishlist tracker with estimated vs actual purchase prices, priorities, target dates, and purchase conversion status.
7. `public.savings_goals`: Long-term and emergency fund goals with current saved amounts, contribution pace, and status.
8. `public.recurring_transactions`: Subscriptions and bills with frequencies (`daily`, `weekly`, `biweekly`, `monthly`, `yearly`) and next due dates.

### Security Guarantees:
- **Strict User Isolation**: All tables have RLS enabled with `auth.uid() = user_id` for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- **System Categories**: Public system categories are readable by all users (`is_system = true`), but only custom categories can be created or modified by individual users.
- **Zero Client Secrets**: Only public anonymous keys are utilized in the browser; no service-role credentials are ever bundled.

---

## 4. Natural Language Parser Capabilities

Located in [`src/lib/parser.ts`](file:///c:/Users/cassi/Documents/antigravity/hopeful-galileo/src/lib/parser.ts), the deterministic conversational engine handles:

- **Multi-Transaction Entries**:
  - *"I spent 85 EGP on lunch, 30 EGP on transportation, and 20 EGP on coffee"* $\rightarrow$ creates 3 staged transactions: Lunch (85 EGP, Food), Transportation (30 EGP, Transport), Coffee (20 EGP, Food).
- **Egyptian Arabic Expense Phrases**:
  - *"صرفت 85 جنيه على الغدا و 30 جنيه مواصلات و 20 جنيه قهوة"*
  - *"صرفت 250 جنيه على النت"*
  - *"استلمت 1500 جنيه مرتب"*
- **Arabic and Western Numerals**:
  - Recognizes `١٢٣` as `123` and `،` as `.`.
- **Query & Information Commands**:
  - *"How much did I spend today?"* / *"كم صرفت اليوم؟"* $\rightarrow$ aggregates today's expenses immediately.
  - *"How much budget do I have left?"* / *"كم الميزانية المتبقية؟"* $\rightarrow$ outputs remaining budget and daily allowance.
  - *"Show my food expenses this week"* $\rightarrow$ queries category totals.
- **Destructive Mutation Safety**:
  - Commands like *"Change the lunch expense from 85 to 70 EGP"* or *"Delete the coffee transaction"* identify the target record and require explicit user confirmation before executing.

---

## 5. Local Development & Setup

### Prerequisites
- Node.js 18+ (tested on Node.js v24)
- npm 9+

### 1. Installation
```bash
git clone <repository_url>
cd hopeful-galileo
npm install
```

### 2. Running in Local Offline Mode (No Cloud Account Required)
Spendly works immediately in **Local Mode**:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).  
Data is stored securely in your browser's local storage. You can click **Load Sample Month Data** in Settings to test all visualizations with realistic sample records.

### 3. Connecting to Supabase Cloud
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Set your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the SQL migration in your Supabase SQL Editor:
   Copy and run the contents of [`supabase/migrations/20261029000000_spendly_schema.sql`](file:///c:/Users/cassi/Documents/antigravity/hopeful-galileo/supabase/migrations/20261029000000_spendly_schema.sql).
4. You can also configure or switch your Supabase URL and Key at runtime inside the **Settings** page.

---

## 6. Running Tests & Code Verification

Spendly includes a comprehensive test suite executed with Vitest:

```bash
npm run test
```

### Test Results Summary:
- **Files Passed**: 4 of 4
- **Tests Passed**: 26 of 26
  - `src/test/parser.test.ts`: 10 tests (Arabic numerals, English clauses, Egyptian Arabic phrases, queries, updates, deletions)
  - `src/test/spendingCalculator.test.ts`: 6 tests (Remaining allowance formula, refund deduction, transfer exclusion, overspending, leap years)
  - `src/test/affordability.test.ts`: 5 tests (Comfortable, tight, requires savings, exceeds budget verdicts)
  - `src/test/currency.test.ts`: 5 tests (Precision decimal arithmetic, IEEE 754 float prevention, currency formatting)

### Building for Production
```bash
npm run build
```
Generates optimized assets in `dist/` with PWA manifest and service worker.

---

## 7. Known Limitations & Roadmap

- **Offline Sync Queue**: Offline edits are persisted locally. When connecting a fresh Supabase instance, users can currently use the import/export JSON tool; automatic bi-directional delta synchronization will be expanded in v2.
- **Voice Input**: The conversational workspace currently processes typed text; speech-to-text Web Audio API integration is queued for future releases.
- **External Bank Feeds**: In accordance with user privacy guidelines, Spendly deliberately avoids third-party open banking aggregators and prioritizes fast conversational manual logging.
