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
  const [isFocused, setIsFocused] = useState(false);

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
      setTimeout(() => {
        amountInputRef.current?.focus();
        setIsFocused(true);
      }, 100);
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
      amountInputRef.current?.focus();
      return;
    }

    if (numAmount > 10000000) {
      setError('Amount exceeds limit');
      return;
    }

    // Navigate to who-paid screen with expense data
    navigate(`/group/${groupId}/add-expense/who-paid`, {
      state: {
        expenseData: {
          amount: numAmount,
          description: description.trim() || null
        }
      }
    });
  };

  const formatDisplayAmount = (value) => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

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
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(`/group/${groupId}`)}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors font-medium text-[15px]"
          >
            Cancel
          </button>
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)] truncate max-w-[180px]">
            {title}
          </span>
          <div className="w-14" />
        </div>
      </header>

      <form onSubmit={handleContinue} className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Amount Section - Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm animate-fade-in">
            {/* Amount Display + Input */}
            <div className="relative mb-8">
              <div className="flex items-baseline justify-center gap-1 mb-3">
                <span className="text-[32px] font-light text-[var(--color-text-muted)]">₹</span>
                <div className="relative flex-1 max-w-[280px]">
                  <input
                    ref={amountInputRef}
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={handleAmountChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="0"
                    autoComplete="off"
                    className="w-full text-[56px] font-semibold text-[var(--color-text-primary)] bg-transparent border-none outline-none text-center placeholder:text-[var(--color-text-subtle)] rupee"
                    style={{ 
                      letterSpacing: '-0.02em',
                      lineHeight: '1',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  />
                  {/* Formatted display (shows when not focused and has value) */}
                  {!isFocused && amount && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <span className="text-[56px] font-semibold text-[var(--color-text-primary)] rupee" style={{ letterSpacing: '-0.02em', lineHeight: '1' }}>
                        {formatDisplayAmount(amount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Hint */}
              <div className="text-center">
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  {amount ? 'Tap to edit' : 'Enter the total amount'}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-center mb-6 animate-fade-in">
                <p className="text-[14px] text-[var(--color-error)] font-medium">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="px-6 pb-6 safe-area-bottom">
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
            {/* Paid By */}
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-[15px] text-[var(--color-text-secondary)]">Paid by</span>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                  <span className="text-[12px] font-semibold text-white">
                    {(user?.name || 'Y').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-[15px] font-medium text-[var(--color-text-primary)]">
                  You
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[var(--color-border-subtle)]" />

            {/* Description */}
            <div className="px-5 py-4">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this for?"
                maxLength={100}
                className="w-full text-[15px] bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              />
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1.5">
                Optional
              </p>
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="submit"
            disabled={!amount || parseFloat(amount) <= 0}
            className={`
              w-full mt-5 py-[15px] px-6 rounded-[14px] font-semibold text-[16px]
              transition-all duration-200 shadow-[var(--shadow-md)]
              ${amount && parseFloat(amount) > 0
                ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] active:scale-[0.98]'
                : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed shadow-none'
              }
            `}
          >
            Continue to Split
          </button>
        </div>
      </form>
    </div>
  );
}
