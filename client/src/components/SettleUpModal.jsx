import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSettlement } from '../api/groups';

export default function SettleUpModal({ groupId, balances, currentUserId, onClose, onSettled }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // Find who the current user owes money to
  const currentUserBalance = balances?.find(b => b.userId === currentUserId);
  const debts = currentUserBalance?.owes || [];

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleUpiPayment = (creditorId, creditorName, amount) => {
    // For MVP, we'll generate UPI payment intent
    // In production, you'd get the creditor's UPI ID from their profile
    
    // UPI payment format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
    // For now, we'll show a simple flow since we don't have UPI IDs stored
    
    setIsProcessing(true);
    
    // Simulate payment flow - in reality this would open UPI apps
    setTimeout(() => {
      setIsProcessing(false);
      // Show confirmation
      alert(`Payment of ${formatAmount(amount)} to ${creditorName} initiated.\n\nIn production, this would open your UPI app (GPay, PhonePe, Paytm, etc.)`);
    }, 500);
  };

  const handleMarkAsSettled = async (creditorId, amount) => {
    // Record settlement manually
    if (!confirm(`Mark payment of ${formatAmount(amount)} as settled?`)) {
      return;
    }

    setIsProcessing(true);
    
    try {
      await createSettlement(groupId, {
        toUserId: creditorId,
        amount,
        method: 'manual'
      });
      
      if (onSettled) {
        onSettled();
      }
    } catch (error) {
      alert(error.message || 'Failed to record settlement');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!debts || debts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={onClose}>
        <div 
          className="w-full max-w-lg bg-[var(--color-bg)] rounded-t-3xl p-6 animate-slide-up safe-area-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--color-success)]/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              All settled up!
            </h3>
            <p className="text-[var(--color-text-secondary)]">
              You don't owe anyone in this group
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-4 bg-[var(--color-accent)] text-white rounded-2xl font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-[var(--color-bg)] rounded-t-3xl p-6 max-h-[90vh] overflow-auto animate-slide-up safe-area-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Settle Up
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
            You owe the following people
          </p>
        </div>

        {/* Debts List */}
        <div className="space-y-3 mb-6">
          {debts.map((debt, index) => (
            <div
              key={debt.userId}
              className="card p-4 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {debt.userName}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                    Payment pending
                  </p>
                </div>
                <p className="text-xl font-semibold text-[var(--color-error)] rupee">
                  {formatAmount(debt.amount)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleUpiPayment(debt.userId, debt.userName, debt.amount)}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 px-4 bg-[var(--color-accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-all duration-200"
                >
                  Pay via UPI
                </button>
                <button
                  onClick={() => handleMarkAsSettled(debt.userId, debt.amount)}
                  className="py-2.5 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl text-sm font-medium hover:bg-[var(--color-accent-subtle)] transition-all duration-200"
                >
                  Mark Settled
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-[var(--color-accent-subtle)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                <strong className="text-[var(--color-text-primary)]">UPI Payment:</strong> Opens your UPI app (GPay, PhonePe, Paytm) to complete the payment.
              </p>
              <p className="text-[var(--color-text-secondary)] leading-relaxed mt-2">
                <strong className="text-[var(--color-text-primary)]">Mark Settled:</strong> Record payment done outside the app (cash, bank transfer, etc.)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
