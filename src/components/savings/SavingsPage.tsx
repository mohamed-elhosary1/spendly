import React, { useState, useMemo } from 'react';
import {
  PiggyBank,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/lib/i18n';
import { SavingsGoal, SavingsGoalPriority, SavingsGoalStatus } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { formatDateString, parseISO } from '@/lib/dateUtils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';

export const SavingsPage: React.FC = () => {
  const {
    savingsGoals,
    saveSavingsGoal,
    deleteSavingsGoal,
    contributeToSavingsGoal,
    user,
    currency,
    language,
  } = useApp();
  const { t } = useTranslation(language);

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Contribute modal
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>('');

  // Form state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentSavedAmount, setCurrentSavedAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<SavingsGoalPriority>('medium');
  const [status, setStatus] = useState<SavingsGoalStatus>('active');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setCurrentSavedAmount('0');
    setTargetDate('');
    setPriority('medium');
    setStatus('active');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.target_amount.toString());
    setCurrentSavedAmount(goal.current_saved_amount.toString());
    setTargetDate(goal.target_date || '');
    setPriority(goal.priority);
    setStatus(goal.status);
    setNotes(goal.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(targetAmount);
    if (isNaN(targetNum) || targetNum <= 0 || !name.trim()) return;

    await saveSavingsGoal({
      id: editingGoal?.id,
      user_id: user?.id || 'local-user',
      name: name.trim(),
      target_amount: targetNum,
      current_saved_amount: parseFloat(currentSavedAmount) || 0,
      currency,
      target_date: targetDate || undefined,
      priority,
      status,
      notes: notes.trim() || undefined,
    });

    setIsModalOpen(false);
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;
    const amt = parseFloat(contributionAmount);
    if (isNaN(amt) || amt <= 0) return;

    await contributeToSavingsGoal(contributeGoal.id, amt);
    setContributeGoal(null);
    setContributionAmount('');
  };

  // Aggregate Totals
  const { totalTarget, totalSaved, overallProgressPct } = useMemo(() => {
    let target = 0;
    let saved = 0;
    savingsGoals.forEach((g) => {
      target += Number(g.target_amount) || 0;
      saved += Number(g.current_saved_amount) || 0;
    });
    return {
      totalTarget: target,
      totalSaved: saved,
      overallProgressPct: target > 0 ? (saved / target) * 100 : 0,
    };
  }, [savingsGoals]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">{t('savings_title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('savings_subtitle')}</p>
        </div>

        <Button size="sm" onClick={openAddModal} className="gap-1.5 font-semibold text-xs">
          <Plus className="h-4 w-4" />
          <span>{t('add_savings_goal')}</span>
        </Button>
      </div>

      {/* Aggregate Overview Card */}
      <Card className="p-6 space-y-5 bg-gradient-to-br from-card via-card to-emerald-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Total Savings Reserve
            </span>
            <div className="text-2xl sm:text-3xl font-black text-foreground mt-1">
              {formatCurrency(totalSaved, currency, language, { showDecimals: false })}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Target goal of {formatCurrency(totalTarget, currency, language, { showDecimals: false })}
            </p>
          </div>

          <div className="text-end">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {overallProgressPct.toFixed(1)}%
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatCurrency(Math.max(0, totalTarget - totalSaved), currency, language, {
                showDecimals: false,
              })}{' '}
              remaining
            </p>
          </div>
        </div>

        <ProgressBar value={overallProgressPct} size="lg" colorScheme="emerald" />
      </Card>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {savingsGoals.length === 0 ? (
          <Card className="col-span-full py-12 text-center text-muted-foreground text-xs">
            No savings goals yet. Create one for emergency funds, travel, or long-term dreams!
          </Card>
        ) : (
          savingsGoals.map((goal) => {
            const pct =
              goal.target_amount > 0
                ? (goal.current_saved_amount / goal.target_amount) * 100
                : 0;
            const remaining = Math.max(0, goal.target_amount - goal.current_saved_amount);

            // Compute suggested monthly pace if target date exists
            let suggestedPace = 0;
            if (goal.target_date && remaining > 0) {
              try {
                const targetD = parseISO(goal.target_date);
                const now = new Date();
                const monthsDiff = Math.max(
                  1,
                  (targetD.getFullYear() - now.getFullYear()) * 12 +
                    (targetD.getMonth() - now.getMonth())
                );
                suggestedPace = remaining / monthsDiff;
              } catch {}
            }

            return (
              <Card key={goal.id} className="p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{goal.name}</h3>
                        {goal.status === 'completed' && (
                          <Badge variant="success" className="text-[10px]">
                            Completed
                          </Badge>
                        )}
                      </div>
                      {goal.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{goal.notes}</p>
                      )}
                    </div>

                    <Badge
                      variant={
                        goal.priority === 'high'
                          ? 'destructive'
                          : goal.priority === 'medium'
                          ? 'warning'
                          : 'secondary'
                      }
                      className="text-[10px]"
                    >
                      {goal.priority.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-lg font-black text-foreground">
                        {formatCurrency(goal.current_saved_amount, goal.currency, language)}
                      </span>
                      <span className="text-xs text-muted-foreground ms-1.5">
                        / {formatCurrency(goal.target_amount, goal.currency, language)}
                      </span>
                    </div>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  <ProgressBar value={pct} size="md" colorScheme="emerald" />

                  {/* Target Date & Suggested Pace */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    {goal.target_date ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateString(goal.target_date, language)}
                      </span>
                    ) : (
                      <span>Open-ended</span>
                    )}

                    {suggestedPace > 0 && (
                      <span className="font-semibold text-foreground">
                        Suggested: {formatCurrency(suggestedPace, goal.currency, language, { showDecimals: false })}/mo
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(goal)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteSavingsGoal(goal.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setContributeGoal(goal);
                      setContributionAmount('');
                    }}
                    className="text-xs font-bold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('goal_add_funds')}</span>
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Goal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGoal ? 'Edit Savings Goal' : t('add_savings_goal')}
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <Input
            label="Goal Name"
            placeholder="e.g. Emergency Fund or New Laptop"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Target Amount (${currency})`}
              type="number"
              step="100"
              min="1"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
            />

            <Input
              label={`Current Saved (${currency})`}
              type="number"
              step="100"
              min="0"
              value={currentSavedAmount}
              onChange={(e) => setCurrentSavedAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Target Completion Date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />

            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as SavingsGoalPriority)}
            >
              <option value="high">{t('priority_high')}</option>
              <option value="medium">{t('priority_medium')}</option>
              <option value="low">{t('priority_low')}</option>
            </Select>
          </div>

          <Input
            label="Notes"
            placeholder="Notes or savings strategy..."
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

      {/* Deposit Contribution Modal */}
      {contributeGoal && (
        <Modal
          isOpen={!!contributeGoal}
          onClose={() => setContributeGoal(null)}
          title={`Add Funds to ${contributeGoal.name}`}
        >
          <form onSubmit={handleAddContribution} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Deposit funds directly into this savings reserve. Note: This allocates funds toward your
              target without double-counting as an expense.
            </p>

            <Input
              label={`Deposit Amount (${contributeGoal.currency})`}
              type="number"
              step="50"
              min="1"
              placeholder="0.00"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setContributeGoal(null)}
              >
                {t('action_cancel')}
              </Button>
              <Button type="submit" size="sm" variant="success" className="font-bold">
                Confirm Deposit
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
