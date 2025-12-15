import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getGroupDetails } from '../api/groups';
import { useAuth } from '../context/AuthContext';

export default function AddExpense() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const amountInputRef = useRef(null);
  
  const [group, setGroup] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGroup();
    
    // Restore state if coming back from split screen
    if (location.state?.expenseData) {
      const { amount: savedAmount, description: savedDesc } = location.state.expenseData;
      setAmount(savedAmount.toString());
      setDescription(savedDesc || '');
    }
  }, [groupId]);

  useEffect(() => {
    // Focus amount input after group loads
    if (!isLoading && amountInputRef.current && !location.state?.expenseData) {
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isLoading]);

  const loadGroup = async () => {
    try {
      const response = await getGroupDetails(groupId);
      setGroup(response.group);
    } catch (err) {
      setError('Failed to load group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only allow valid number input
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  const handleContinue = (e) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (numAmount > 10000000) {
      setError('Amount exceeds limit');
      return;
    }

    // Navigate to split screen with expense data
    navigate(`/group/${groupId}/add-expense/split`, {
      state: {
        expenseData: {
          amount: numAmount,
          description: description.trim() || null
        }
      }
    });
  };

  const formatDisplayAmount = (value) => {
    if (!value) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-IN');
  };

  const currentUserName = user?.name || user?.phone?.slice(-4) || 'You';

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--color-bg)] px-6">
        <p className="text-[var(--color-text-secondary)] mb-4">{error || 'Group not found'}</p>
        <button
          onClick={() => navigate('/home')}
          className="text-[var(--color-accent)] font-medium"
        >
          Go Home
        </button>
      </div>
    );
  }

  const title = group.type === 'direct' ? group.displayName : group.name;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(`/group/${groupId}`)}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors font-medium"
          >
            Cancel
          </button>
          <span className="text-sm text-[var(--color-text-muted)] truncate max-w-[150px]">
            {title}
          </span>
          <div className="w-14" /> {/* Spacer for centering */}
        </div>
      </header>

      <form onSubmit={handleContinue} className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Amount Section - Primary Focus */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="animate-fade-in text-center w-full">
            {/* Rupee Symbol + Amount */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-3xl font-light text-[var(--color-text-muted)]">₹</span>
              <span className="amount-display">
                {formatDisplayAmount(amount)}
              </span>
            </div>
            
            {/* Hidden input for keyboard */}
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="sr-only"
              autoComplete="off"
            />
            
            {/* Visible input area */}
            <button
              type="button"
              onClick={() => amountInputRef.current?.focus()}
              className="w-full py-3 text-center"
            >
              <span className="text-sm text-[var(--color-text-muted)]">
                {amount ? 'Tap to edit amount' : 'Enter amount'}
              </span>
            </button>

            {/* Error Message */}
            {error && (
              <p className="mt-4 text-sm text-[var(--color-error)] animate-fade-in">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="px-6 pb-8 safe-area-bottom animate-fade-in stagger-2">
          {/* Paid By - Current user only for now */}
          <div className="flex items-center justify-between py-4 border-t border-[var(--color-border)]">
            <span className="text-[var(--color-text-secondary)]">Paid by</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {currentUserName.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <span className="font-medium text-[var(--color-text-primary)]">You</span>
            </div>
          </div>

          {/* Description Input */}
          <div className="py-4 border-t border-[var(--color-border)]">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this for? (optional)"
              maxLength={100}
              className="w-full bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>

          {/* Continue Button */}
          <button
            type="submit"
            disabled={!amount}
            className={`
              w-full mt-6 py-4 px-6 rounded-2xl font-semibold text-base
              transition-all duration-200
              ${amount
                ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] active:scale-[0.98]'
                : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
              }
            `}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
