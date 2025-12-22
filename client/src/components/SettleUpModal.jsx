import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSettlement } from '../api/groups';

export default function SettleUpModal({ groupId, fromUser, toUser, defaultAmount, onClose, onSettled }) {
  const [amount, setAmount] = useState(defaultAmount?.toString() || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  const handleUpiPayment = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    // UPI deep link format
    const upiId = 'merchant@paytm'; // Placeholder
    const payeeName = encodeURIComponent(toUser.name || toUser.phone);
    const transactionNote = encodeURIComponent(`SplitCo settlement`);
    
    const upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${numAmount}&cu=INR&tn=${transactionNote}`;
    
    try {
      window.location.href = upiUrl;
      
      setTimeout(() => {
        if (confirm('Have you completed the UPI payment?\n\nClick OK to mark as settled, or Cancel to try again.')) {
          handleMarkAsSettled();
        }
      }, 2000);
    } catch (error) {
      alert('Unable to open UPI app. Please pay manually and mark as settled.');
    }
  };

  const handleMarkAsSettled = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (!confirm(`Mark payment of ${formatAmount(numAmount)} from ${fromUser.name || fromUser.phone} to ${toUser.name || toUser.phone} as settled?`)) {
      return;
    }

    setIsProcessing(true);
    setError('');
    
    try {
      await createSettlement(groupId, {
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        amount: numAmount,
        method: 'manual'
      });
      
      if (onSettled) {
        onSettled();
      }
    } catch (error) {
      setError(error.message || 'Failed to record settlement');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-[var(--color-bg)] rounded-t-3xl p-6 animate-slide-up safe-area-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Record Settlement
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {fromUser.name || fromUser.phone} paying {toUser.name || toUser.phone}
          </p>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Settlement Amount
          </label>
          <div className={`flex items-center bg-[var(--color-surface)] border rounded-xl overflow-hidden transition-colors ${
            error ? 'border-[var(--color-error)]' : 'border-[var(--color-border)] focus-within:border-[var(--color-accent)]'
          }`}>
            <span className="pl-4 pr-2 text-[var(--color-text-secondary)] font-medium text-lg">
              ₹
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              disabled={isProcessing}
              className="flex-1 py-4 pr-4 bg-transparent text-[var(--color-text-primary)] text-lg placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--color-error)] mt-2">{error}</p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            {defaultAmount && `Suggested: ${formatAmount(defaultAmount)}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 mb-4">
          <button
            onClick={handleUpiPayment}
            disabled={isProcessing || !amount}
            className="w-full py-4 px-6 bg-[var(--color-accent)] text-white rounded-2xl font-semibold hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Pay via UPI
          </button>
          <button
            onClick={handleMarkAsSettled}
            disabled={isProcessing || !amount}
            className="w-full py-4 px-6 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-2xl font-semibold hover:bg-[var(--color-accent-subtle)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Mark as Settled
          </button>
        </div>

        {/* Info */}
        {/* <div className="bg-[var(--color-accent-subtle)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              You can edit the amount if settling a partial payment or combining cash + UPI
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
