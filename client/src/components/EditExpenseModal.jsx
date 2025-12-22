import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EditExpenseModal({ expense, group, onClose, onSave, onDelete }) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(expense.amount);
  const [description, setDescription] = useState(expense.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  
  // Parse existing paidByData to get initial payers
  const getInitialPayers = () => {
    try {
      const paidByData = typeof expense.paidByData === 'string' 
        ? JSON.parse(expense.paidByData) 
        : expense.paidByData;
      
      if (paidByData?.mode === 'multiple' && paidByData?.payments) {
        return paidByData.payments.map(p => ({
          userId: p.userId,
          amount: p.amount
        }));
      }
    } catch (e) {
      console.error('Failed to parse paidByData:', e);
    }
    
    // Default to single payer
    return [{ userId: expense.paidBy.id, amount: expense.amount }];
  };

  // Parse existing splits to get initial splitters
  const getInitialSplits = () => {
    if (expense.splits && expense.splits.length > 0) {
      return expense.splits.map(s => ({
        userId: s.userId,
        shareAmount: s.shareAmount
      }));
    }
    return [];
  };

  const [payers, setPayers] = useState(getInitialPayers());
  const [splitters, setSplitters] = useState(getInitialSplits());

  // Update individual payer amount
  const updatePayerAmount = (userId, newAmount) => {
    setPayers(prev => prev.map(p => 
      p.userId === userId ? { ...p, amount: Number(newAmount) || 0 } : p
    ));
  };

  // Toggle payer selection
  const togglePayer = (userId) => {
    setPayers(prev => {
      const exists = prev.find(p => p.userId === userId);
      if (exists) {
        // Remove if unchecked
        return prev.filter(p => p.userId !== userId);
      } else {
        // Add with 0 amount if checked
        return [...prev, { userId, amount: 0 }];
      }
    });
  };

  // Update individual splitter share
  const updateSplitterShare = (userId, newShare) => {
    setSplitters(prev => prev.map(s => 
      s.userId === userId ? { ...s, shareAmount: Number(newShare) || 0 } : s
    ));
  };

  // Toggle splitter selection
  const toggleSplitter = (userId) => {
    setSplitters(prev => {
      const exists = prev.find(s => s.userId === userId);
      if (exists) {
        // Remove if unchecked
        return prev.filter(s => s.userId !== userId);
      } else {
        // Add with equal split if checked
        const equalShare = Number(amount) / (prev.length + 1);
        return [...prev, { userId, shareAmount: equalShare }];
      }
    });
  };

  // Auto-distribute splits equally when amount or splitter count changes
  const distributeEqually = () => {
    if (splitters.length === 0) return;
    const equalShare = Number(amount) / splitters.length;
    setSplitters(prev => prev.map(s => ({ ...s, shareAmount: equalShare })));
  };

  const handleSave = async () => {
    // Validation
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (payers.length === 0) {
      setError('Please select at least one payer');
      return;
    }

    if (splitters.length === 0) {
      setError('Please select at least one person to split with');
      return;
    }

    const totalPaid = payers.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - Number(amount)) > 0.01) {
      setError(`Total paid (₹${totalPaid.toFixed(2)}) must equal expense amount (₹${amount})`);
      return;
    }

    const totalSplit = splitters.reduce((sum, s) => sum + s.shareAmount, 0);
    if (Math.abs(totalSplit - Number(amount)) > 0.01) {
      setError(`Total split (₹${totalSplit.toFixed(2)}) must equal expense amount (₹${amount})`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Build paidByData
      const paidByData = payers.length === 1
        ? null // Single payer - will use paidBy field
        : {
            mode: 'multiple',
            payments: payers.map(p => ({
              userId: p.userId,
              amount: p.amount
            }))
          };

      await onSave({
        amount: Number(amount),
        description,
        paidByData: paidByData, // Send as object, backend will handle it
        paidBy: payers[0].userId, // Use first payer as primary
        splits: splitters.map(s => ({
          userId: s.userId,
          shareAmount: s.shareAmount
        }))
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = () => {
    // Navigate to add expense page with pre-filled data
    const params = new URLSearchParams({
      amount: amount,
      description: description,
      payers: JSON.stringify(payers),
      splitters: JSON.stringify(splitters)
    });
    navigate(`/group/${group.id}/add-expense?${params.toString()}`);
    onClose();
  };

  const handleRecurring = (frequency) => {
    // Navigate to add expense page with recurring flag
    const params = new URLSearchParams({
      amount: amount,
      description: description,
      payers: JSON.stringify(payers),
      splitters: JSON.stringify(splitters),
      recurring: frequency
    });
    navigate(`/group/${group.id}/add-expense?${params.toString()}`);
    onClose();
  };

  const getMemberName = (memberId) => {
    const member = group.members.find(m => m.id === memberId);
    return member?.name || member?.phone || 'Unknown';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 animate-fade-in">
      <div 
        className="bg-[var(--color-bg)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-auto animate-slide-up shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-bg)] border-b border-[var(--color-border-subtle)] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Edit Expense
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-[var(--color-surface)] flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-5">
          {error && (
            <div className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-xl text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-[var(--color-text-muted)]">
                ₹
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
              placeholder="What was this for?"
              maxLength={100}
            />
          </div>

          {/* Payers Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                Who Paid?
              </label>
            </div>
            <div className="space-y-2">
              {group.members.map(member => {
                const isPayer = payers.find(p => p.userId === member.id);
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!isPayer}
                      onChange={() => togglePayer(member.id)}
                      className="w-4 h-4 text-[var(--color-accent)] border-[var(--color-border)] rounded focus:ring-2 focus:ring-[var(--color-accent)]/20"
                    />
                    <span className="flex-1 text-sm text-[var(--color-text-primary)]">
                      {getMemberName(member.id)}
                    </span>
                    {isPayer && (
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={isPayer.amount}
                          onChange={(e) => updatePayerAmount(member.id, e.target.value)}
                          className="w-full pl-5 pr-2 py-1.5 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {payers.length > 0 && (
              <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
                Total paid: ₹{payers.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
              </div>
            )}
          </div>

          {/* Splitters Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                Split With
              </label>
              <button
                onClick={distributeEqually}
                className="text-xs text-[var(--color-accent)] hover:underline"
              >
                Split Equally
              </button>
            </div>
            <div className="space-y-2">
              {group.members.map(member => {
                const isSplitter = splitters.find(s => s.userId === member.id);
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!isSplitter}
                      onChange={() => toggleSplitter(member.id)}
                      className="w-4 h-4 text-[var(--color-accent)] border-[var(--color-border)] rounded focus:ring-2 focus:ring-[var(--color-accent)]/20"
                    />
                    <span className="flex-1 text-sm text-[var(--color-text-primary)]">
                      {getMemberName(member.id)}
                    </span>
                    {isSplitter && (
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={isSplitter.shareAmount}
                          onChange={(e) => updateSplitterShare(member.id, e.target.value)}
                          className="w-full pl-5 pr-2 py-1.5 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/20"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {splitters.length > 0 && (
              <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
                Total split: ₹{splitters.reduce((sum, s) => sum + s.shareAmount, 0).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-border-subtle)] px-6 py-4 space-y-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 px-6 bg-[var(--color-accent)] text-white rounded-xl font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Duplicate and Recurring Options */}
          <div className="flex gap-2">
            <button
              onClick={handleDuplicate}
              disabled={loading}
              className="flex-1 py-3 px-6 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl font-medium hover:bg-[var(--color-surface-elevated)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Duplicate
            </button>
            <button
              onClick={() => setShowRecurringOptions(!showRecurringOptions)}
              disabled={loading}
              className="flex-1 py-3 px-6 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl font-medium hover:bg-[var(--color-surface-elevated)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Repeat
            </button>
          </div>

          {/* Recurring Options */}
          {showRecurringOptions && (
            <div className="space-y-2 p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                Repeat this expense:
              </p>
              <button
                onClick={() => handleRecurring('daily')}
                className="w-full py-2 px-4 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] rounded-lg transition-colors"
              >
                Every day
              </button>
              <button
                onClick={() => handleRecurring('weekly')}
                className="w-full py-2 px-4 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] rounded-lg transition-colors"
              >
                Every week
              </button>
              <button
                onClick={() => handleRecurring('monthly')}
                className="w-full py-2 px-4 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] rounded-lg transition-colors"
              >
                Every month
              </button>
              <button
                onClick={() => handleRecurring('yearly')}
                className="w-full py-2 px-4 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] rounded-lg transition-colors"
              >
                Every year
              </button>
              <button
                onClick={() => handleRecurring('custom')}
                className="w-full py-2 px-4 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] rounded-lg transition-colors"
              >
                Custom interval...
              </button>
            </div>
          )}
          
          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full py-3 px-6 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-xl font-medium hover:bg-[var(--color-error)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Deleting...' : 'Delete Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
