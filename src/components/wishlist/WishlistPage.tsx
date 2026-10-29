import React, { useState, useMemo } from 'react';
import {
  Heart,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShoppingBag,
  DollarSign,
  Calendar,
  Filter,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import {
  WishlistItem,
  WishlistPriority,
  WishlistStatus,
} from '@/types';
import { formatCurrency } from '@/lib/currency';
import { formatDateString, getTodayDateString } from '@/lib/dateUtils';
import { evaluateAffordability } from '@/lib/affordabilityCalculator';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';

export const WishlistPage: React.FC = () => {
  const {
    wishlistItems,
    saveWishlistItem,
    deleteWishlistItem,
    convertWishlistToExpense,
    categories,
    dailySpendingAnalysis,
    user,
    currency,
    language,
  } = useApp();
  const { t } = useTranslation(language);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [savedAmount, setSavedAmount] = useState('0');
  const [status, setStatus] = useState<WishlistStatus>('planned');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');

  // Affordability modal for detailed inspection
  const [selectedAffordabilityItem, setSelectedAffordabilityItem] = useState<WishlistItem | null>(
    null
  );

  // Record as purchase confirmation modal
  const [confirmPurchaseItem, setConfirmPurchaseItem] = useState<WishlistItem | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<string>('');

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setEstimatedPrice('');
    setPriority('medium');
    setTargetDate('');
    setProductUrl('');
    setSavedAmount('0');
    setStatus('planned');
    setNotes('');
    setCategoryId(categories[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (item: WishlistItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || '');
    setEstimatedPrice(item.estimated_price.toString());
    setPriority(item.priority);
    setTargetDate(item.target_purchase_date || '');
    setProductUrl(item.product_url || '');
    setSavedAmount(item.saved_amount.toString());
    setStatus(item.status);
    setNotes(item.notes || '');
    setCategoryId(item.category_id || categories[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(estimatedPrice);
    if (isNaN(priceNum) || priceNum <= 0 || !name.trim()) return;

    await saveWishlistItem({
      id: editingItem?.id,
      user_id: user?.id || 'local-user',
      name: name.trim(),
      description: description.trim() || undefined,
      estimated_price: priceNum,
      currency,
      priority,
      target_purchase_date: targetDate || undefined,
      product_url: productUrl.trim() || undefined,
      saved_amount: parseFloat(savedAmount) || 0,
      status,
      notes: notes.trim() || undefined,
      category_id: categoryId,
    });

    setIsModalOpen(false);
  };

  const openRecordPurchaseModal = (item: WishlistItem) => {
    setConfirmPurchaseItem(item);
    setPurchaseAmount(item.estimated_price.toString());
  };

  const handleConfirmRecordExpense = async () => {
    if (!confirmPurchaseItem) return;
    const finalAmt = parseFloat(purchaseAmount) || confirmPurchaseItem.estimated_price;
    await convertWishlistToExpense(confirmPurchaseItem, finalAmt);
    setConfirmPurchaseItem(null);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return wishlistItems.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        if (
          !item.name.toLowerCase().includes(lower) &&
          !item.description?.toLowerCase().includes(lower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [wishlistItems, statusFilter, priorityFilter, searchTerm]);

  // Aggregate Metrics
  const { totalPlannedValue, totalSavedValue, remainingNeeded } = useMemo(() => {
    let planned = 0;
    let saved = 0;
    wishlistItems
      .filter((i) => i.status !== 'cancelled')
      .forEach((i) => {
        planned += Number(i.estimated_price) || 0;
        saved += Number(i.saved_amount) || 0;
      });
    return {
      totalPlannedValue: planned,
      totalSavedValue: saved,
      remainingNeeded: Math.max(0, planned - saved),
    };
  }, [wishlistItems]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">{t('wishlist_title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('wishlist_subtitle')}</p>
        </div>

        <Button size="sm" onClick={openAddModal} className="gap-1.5 font-semibold text-xs">
          <Plus className="h-4 w-4" />
          <span>{t('add_wishlist_item')}</span>
        </Button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5">
          <span className="text-xs font-semibold text-muted-foreground block">
            {t('total_wishlist_value')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-foreground mt-1 block">
            {formatCurrency(totalPlannedValue, currency, language, { showDecimals: false })}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Across {wishlistItems.filter((i) => i.status !== 'cancelled').length} planned items
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-xs font-semibold text-muted-foreground block">
            {t('total_saved_for_wishlist')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {formatCurrency(totalSavedValue, currency, language, { showDecimals: false })}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalPlannedValue > 0
              ? `${((totalSavedValue / totalPlannedValue) * 100).toFixed(0)}% funded`
              : '0% funded'}
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-xs font-semibold text-muted-foreground block">
            {t('remaining_needed')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-foreground mt-1 block">
            {formatCurrency(remainingNeeded, currency, language, { showDecimals: false })}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Current remaining budget: {formatCurrency(dailySpendingAnalysis.remaining_budget, currency, language)}
          </p>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-secondary/60 border border-input rounded-xl px-3 py-1.5 font-semibold text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="planned">{t('status_planned')}</option>
            <option value="saving">{t('status_saving')}</option>
            <option value="purchased">{t('status_purchased')}</option>
            <option value="cancelled">{t('status_cancelled')}</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-secondary/60 border border-input rounded-xl px-3 py-1.5 font-semibold text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="high">{t('priority_high')}</option>
            <option value="medium">{t('priority_medium')}</option>
            <option value="low">{t('priority_low')}</option>
          </select>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary/40 border border-input rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none w-44 sm:w-60"
        />
      </Card>

      {/* Wishlist Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.length === 0 ? (
          <Card className="col-span-full py-12 text-center text-muted-foreground text-xs">
            No wishlist items found. Click "+ Add Wishlist Item" to plan your first purchase!
          </Card>
        ) : (
          filteredItems.map((item) => {
            const affordability = evaluateAffordability(item, {
              remainingBudget: dailySpendingAnalysis.remaining_budget,
              availableBalance: user?.opening_balance || 0,
              currency,
              language,
              remainingDays: dailySpendingAnalysis.remaining_days,
            });

            const savedPct =
              item.estimated_price > 0 ? (item.saved_amount / item.estimated_price) * 100 : 0;

            const priorityBadgeVariant =
              item.priority === 'high'
                ? 'destructive'
                : item.priority === 'medium'
                ? 'warning'
                : 'secondary';

            return (
              <Card key={item.id} className="p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Top Bar: Name, Priority, Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{item.name}</h3>
                        {item.product_url && (
                          <a
                            href={item.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-emerald-500"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <Badge variant={priorityBadgeVariant} className="text-[10px] shrink-0 font-bold">
                      {item.priority.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Price & Target Date */}
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xl font-black text-foreground">
                      {formatCurrency(item.estimated_price, item.currency, language)}
                    </span>
                    {item.target_purchase_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateString(item.target_purchase_date, language)}
                      </span>
                    )}
                  </div>

                  {/* Saved Progress if in saving status */}
                  {item.status === 'saving' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          Saved {formatCurrency(item.saved_amount, item.currency, language)}
                        </span>
                        <span>{savedPct.toFixed(0)}%</span>
                      </div>
                      <ProgressBar value={savedPct} size="sm" colorScheme="blue" />
                    </div>
                  )}

                  {/* Affordability Badge & Explanation snippet */}
                  <div
                    onClick={() => setSelectedAffordabilityItem(item)}
                    className="p-2.5 rounded-xl bg-secondary/50 border border-border/60 hover:bg-secondary cursor-pointer transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">
                        {language === 'ar' ? 'تقييم القدرة على الشراء' : 'Affordability Analysis'}
                      </span>
                      <Badge
                        variant={
                          affordability.verdict === 'comfortable'
                            ? 'success'
                            : affordability.verdict === 'tight'
                            ? 'warning'
                            : 'destructive'
                        }
                        className="text-[10px]"
                      >
                        {affordability.verdict.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {language === 'ar' ? affordability.explanation_ar : affordability.explanation}
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteWishlistItem(item.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Explicit Action to Record Purchase as Expense */}
                  {item.status !== 'purchased' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRecordPurchaseModal(item)}
                      className="text-xs font-semibold gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>{t('action_record_expense')}</span>
                    </Button>
                  ) : (
                    <Badge variant="success" className="text-xs font-bold gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{t('status_purchased')}</span>
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Wishlist Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Wishlist Item' : t('add_wishlist_item')}
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Item Name"
            placeholder="e.g. Ergonomic Office Chair"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Description"
            placeholder="e.g. Black mesh with lumbar support"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Estimated Price (${currency})`}
              type="number"
              step="1"
              min="1"
              placeholder="0.00"
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(e.target.value)}
              required
            />

            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as WishlistPriority)}
            >
              <option value="high">{t('priority_high')}</option>
              <option value="medium">{t('priority_medium')}</option>
              <option value="low">{t('priority_low')}</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as WishlistStatus)}
            >
              <option value="planned">{t('status_planned')}</option>
              <option value="saving">{t('status_saving')}</option>
              <option value="purchased">{t('status_purchased')}</option>
              <option value="cancelled">{t('status_cancelled')}</option>
            </Select>

            <Input
              label={`Saved Towards (${currency})`}
              type="number"
              step="1"
              min="0"
              value={savedAmount}
              onChange={(e) => setSavedAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Target Purchase Date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />

            <Input
              label="Product URL (Optional)"
              type="url"
              placeholder="https://..."
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
            />
          </div>

          <Input
            label="Notes"
            placeholder="Store location, discount codes, or notes..."
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

      {/* Detailed Affordability Analysis Modal */}
      {selectedAffordabilityItem && (
        <Modal
          isOpen={!!selectedAffordabilityItem}
          onClose={() => setSelectedAffordabilityItem(null)}
          title={t('affordability_verdict')}
        >
          {(() => {
            const aff = evaluateAffordability(selectedAffordabilityItem, {
              remainingBudget: dailySpendingAnalysis.remaining_budget,
              availableBalance: user?.opening_balance || 0,
              currency,
              language,
              remainingDays: dailySpendingAnalysis.remaining_days,
            });

            return (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border/70 flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">
                    {selectedAffordabilityItem.name}
                  </span>
                  <span className="font-black text-base text-foreground">
                    {formatCurrency(selectedAffordabilityItem.estimated_price, currency, language)}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Analysis Explanation
                  </span>
                  <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                    {language === 'ar' ? aff.explanation_ar : aff.explanation}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs space-y-1">
                  <span className="font-bold">Recommended Guidance:</span>
                  <p>{language === 'ar' ? aff.recommended_action_ar : aff.recommended_action}</p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={() => setSelectedAffordabilityItem(null)}>
                    {t('action_close')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Record Purchase As Transaction Modal */}
      {confirmPurchaseItem && (
        <Modal
          isOpen={!!confirmPurchaseItem}
          onClose={() => setConfirmPurchaseItem(null)}
          title="Record Wishlist Item as Expense"
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Confirm recording this purchase as an official transaction in your ledger. It will update
              the item status to "Purchased" and calculate against your monthly budget.
            </p>

            <Input
              label={`Actual Purchase Price (${confirmPurchaseItem.currency})`}
              type="number"
              step="0.01"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmPurchaseItem(null)}
              >
                {t('action_cancel')}
              </Button>
              <Button
                size="sm"
                variant="success"
                onClick={handleConfirmRecordExpense}
                className="font-bold"
              >
                Confirm & Log Expense
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
