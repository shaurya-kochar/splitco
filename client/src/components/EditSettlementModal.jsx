import { useState } from 'react';

export default function EditSettlementModal({ settlement, group, onClose, onSave, onDelete }) {
  const [amount, setAmount] = useState(settlement.amount);
  const [fromUserId, setFromUserId] = useState(settlement.fromUser.id);
  const [toUserId, setToUserId] = useState(settlement.toUser.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (fromUserId === toUserId) {
      setError('Payer and receiver cannot be the same person');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave({ amount: Number(amount), fromUserId, toUserId });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update settlement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this settlement? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete settlement');
    } finally {
      setLoading(false);
    }
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
              Edit Settlement
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

          {/* From User */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              From (Who Paid)
            </label>
            <select
              value={fromUserId}
              onChange={(e) => setFromUserId(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
            >
              {group.members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name || member.phone}
                </option>
              ))}
            </select>
          </div>

          {/* To User */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              To (Who Received)
            </label>
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
            >
              {group.members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name || member.phone}
                </option>
              ))}
            </select>
          </div>

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
          
          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full py-3 px-6 bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-xl font-medium hover:bg-[var(--color-error)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Deleting...' : 'Delete Settlement'}
          </button>
        </div>
      </div>
    </div>
  );
}
