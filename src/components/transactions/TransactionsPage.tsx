import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import { Transaction, TransactionType } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { formatDateString, getTodayDateString, parseISO } from '@/lib/dateUtils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export const TransactionsPage: React.FC = () => {
  const {
    transactions,
    categories,
    currency,
    language,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    selectedYear,
    selectedMonth,
  } = useApp();
  const { t, isRTL } = useTranslation(language);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Edit / Add modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form state
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || '');
  const [transactionDate, setTransactionDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');

  // Delete confirmation
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  const openAddModal = () => {
    setEditingTransaction(null);
    setDescription('');
    setAmount('');
    setType('expense');
    setCategoryId(categories[0]?.id || '');
    setTransactionDate(getTodayDateString());
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setDescription(tx.description);
    setAmount(tx.amount.toString());
    setType(tx.type);
    setCategoryId(tx.category_id || categories[0]?.id || '');
    setTransactionDate(tx.transaction_date);
    setNotes(tx.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !description.trim()) return;

    if (editingTransaction) {
      await updateTransaction({
        ...editingTransaction,
        description: description.trim(),
        amount: amt,
        type,
        category_id: categoryId,
        transaction_date: transactionDate,
        notes: notes.trim() || undefined,
      });
    } else {
      await addTransaction({
        user_id: 'local-user',
        description: description.trim(),
        amount: amt,
        currency,
        type,
        category_id: categoryId,
        transaction_date: transactionDate,
        notes: notes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTx) return;
    await deleteTransaction(deletingTx.id);
    setDeletingTx(null);
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Search term
        if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          const matchDesc = t.description.toLowerCase().includes(lower);
          const matchNotes = t.notes?.toLowerCase().includes(lower);
          if (!matchDesc && !matchNotes) return false;
        }

        // Type filter
        if (typeFilter !== 'all' && t.type !== typeFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && t.category_id !== categoryFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        }
        if (sortBy === 'amount_desc') {
          return b.amount - a.amount;
        }
        if (sortBy === 'amount_asc') {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [transactions, searchTerm, typeFilter, categoryFilter, sortBy]);

  // Aggregate stats for filtered list
  const { totalFilteredExpenses, totalFilteredIncome } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'expense') exp += t.amount;
      if (t.type === 'income') inc += t.amount;
    });
    return { totalFilteredExpenses: exp, totalFilteredIncome: inc };
  }, [filteredTransactions]);

  // Export transactions as clean CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Currency', 'Notes'];
    const rows = filteredTransactions.map((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      return [
        t.transaction_date,
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${cat?.name || 'Uncategorized'}"`,
        t.amount,
        t.currency,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Spendly_Transactions_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">{t('transactions_title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('transactions_subtitle')}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>{t('action_export_csv')}</span>
          </Button>

          <Button size="sm" onClick={openAddModal} className="gap-1.5 text-xs font-semibold">
            <Plus className="h-4 w-4" />
            <span>{t('action_add')}</span>
          </Button>
        </div>
      </div>

      {/* Aggregate Mini Cards for Filtered Results */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Filtered Expenses
          </span>
          <span className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(totalFilteredExpenses, currency, language)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Filtered Income
          </span>
          <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalFilteredIncome, currency, language)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/60 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Matching Count
          </span>
          <span className="text-base sm:text-lg font-bold text-foreground">
            {filteredTransactions.length} records
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary/40 border border-input rounded-xl ps-9 pe-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-foreground"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-secondary/40 border border-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-foreground cursor-pointer"
          >
            <option value="all">{t('filter_all_types')}</option>
            <option value="expense">{t('filter_expense')}</option>
            <option value="income">{t('filter_income')}</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-secondary/40 border border-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-foreground cursor-pointer"
          >
            <option value="all">{t('filter_all_categories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {language === 'ar' ? c.name_ar : c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
          <span className="text-muted-foreground font-semibold">{t('sort_by')}:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSortBy('date_desc')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                sortBy === 'date_desc' ? 'bg-emerald-600 text-white' : 'hover:bg-secondary'
              }`}
            >
              {t('sort_date_desc')}
            </button>
            <button
              onClick={() => setSortBy('date_asc')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                sortBy === 'date_asc' ? 'bg-emerald-600 text-white' : 'hover:bg-secondary'
              }`}
            >
              {t('sort_date_asc')}
            </button>
            <button
              onClick={() => setSortBy('amount_desc')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                sortBy === 'amount_desc' ? 'bg-emerald-600 text-white' : 'hover:bg-secondary'
              }`}
            >
              {t('sort_amount_desc')}
            </button>
          </div>
        </div>
      </Card>

      {/* Transaction List */}
      <div className="space-y-2.5">
        {filteredTransactions.length === 0 ? (
          <Card className="py-12 text-center text-muted-foreground text-xs">
            {t('empty_transactions')}
          </Card>
        ) : (
          filteredTransactions.map((tx) => {
            const cat = categories.find((c) => c.id === tx.category_id);
            const isExpense = tx.type === 'expense';
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-card hover:border-emerald-500/40 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon
                    iconName={cat?.icon || 'Tag'}
                    color={cat?.color}
                    size={18}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{tx.description}</p>
                      <Badge variant={isExpense ? 'secondary' : 'success'} className="text-[10px]">
                        {isExpense ? 'Expense' : 'Income'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateString(tx.transaction_date, language)} •{' '}
                      {(language === 'ar' ? cat?.name_ar : cat?.name) || 'Expense'}
                      {tx.notes && ` • ${tx.notes}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-base font-black ${
                      isExpense ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isExpense ? '-' : '+'}
                    {formatCurrency(tx.amount, tx.currency, language)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(tx)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingTx(tx)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTransaction ? t('edit_transaction_title') : t('add_transaction_title')}
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                type === 'expense' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t('filter_expense')}
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                type === 'income' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t('filter_income')}
            </button>
          </div>

          <Input
            label="Description"
            placeholder="e.g. Weekly grocery shopping"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Amount (${currency})`}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'ar' ? c.name_ar : c.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Transaction Date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            required
          />

          <Input
            label="Notes (Optional)"
            placeholder="Additional details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              {t('action_cancel')}
            </Button>
            <Button type="submit" size="sm" className="font-semibold">
              {t('action_save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingTx && (
        <Modal
          isOpen={!!deletingTx}
          onClose={() => setDeletingTx(null)}
          title={t('delete_transaction_confirm')}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('delete_transaction_desc')}</p>
            <div className="p-3 rounded-xl bg-secondary/50 text-xs font-semibold text-foreground">
              {deletingTx.description} — {formatCurrency(deletingTx.amount, deletingTx.currency, language)}
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingTx(null)}>
                {t('action_cancel')}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>
                {t('action_delete')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
