import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getGroupDetails, createExpense } from '../api/groups';
import { useAuth } from '../context/AuthContext';

export default function SplitExpense() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Get expense data from navigation state
  const expenseData = location.state?.expenseData;
  
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Split state
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' or 'custom'
  const [memberSplits, setMemberSplits] = useState([]);

  useEffect(() => {
    if (!expenseData) {
      navigate(`/group/${groupId}/add-expense`, { replace: true });
      return;
    }
    loadGroup();
  }, [groupId, expenseData]);

  const loadGroup = async () => {
    try {
      const response = await getGroupDetails(groupId);
      setGroup(response.group);
      initializeSplits(response.group);
    } catch (err) {
      setError('Failed to load group');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSplits = (groupData) => {
    const amount = expenseData.amount;
    const members = groupData.members;
    const shareAmount = Number((amount / members.length).toFixed(2));
    
    // Initialize with all members included, equal split
    const splits = members.map(member => ({
      userId: member.id,
      userName: member.name || member.phone,
      isIncluded: true,
      shareAmount: shareAmount,
      isCurrentUser: member.id === user?.id
    }));
    
    setMemberSplits(splits);
  };

  const handleToggleMember = (userId) => {
    setMemberSplits(prev => {
      const updated = prev.map(split => {
        if (split.userId === userId) {
          return { ...split, isIncluded: !split.isIncluded };
        }
        return split;
      });
      
      // Recalculate equal split if in equal mode
      if (splitMode === 'equal') {
        const includedCount = updated.filter(s => s.isIncluded).length;
        if (includedCount > 0) {
          const newShare = Number((expenseData.amount / includedCount).toFixed(2));
          return updated.map(split => ({
            ...split,
            shareAmount: split.isIncluded ? newShare : 0
          }));
        }
      }
      
      return updated;
    });
  };

  const handleCustomAmountChange = (userId, value) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    
    if (!isNaN(numValue) && numValue >= 0) {
      setMemberSplits(prev => prev.map(split => {
        if (split.userId === userId) {
          return { 
            ...split, 
            shareAmount: numValue,
            isIncluded: numValue > 0
          };
        }
        return split;
      }));
    }
  };

  const handleSwitchToCustom = () => {
    setSplitMode('custom');
  };

  const handleSwitchToEqual = () => {
    setSplitMode('equal');
    const includedCount = memberSplits.filter(s => s.isIncluded).length;
    if (includedCount > 0) {
      const newShare = Number((expenseData.amount / includedCount).toFixed(2));
      setMemberSplits(prev => prev.map(split => ({
        ...split,
        shareAmount: split.isIncluded ? newShare : 0
      })));
    }
  };

  const calculateTotal = () => {
    return memberSplits
      .filter(s => s.isIncluded)
      .reduce((sum, split) => sum + split.shareAmount, 0);
  };

  const isValidSplit = () => {
    const total = calculateTotal();
    const diff = Math.abs(total - expenseData.amount);
    const hasIncluded = memberSplits.some(s => s.isIncluded);
    return hasIncluded && diff < 0.01;
  };

  const handleSave = async () => {
    if (!isValidSplit()) return;

    setIsSaving(true);
    setError('');

    try {
      const splits = memberSplits
        .filter(s => s.isIncluded)
        .map(s => ({
          userId: s.userId,
          shareAmount: s.shareAmount
        }));

      await createExpense(groupId, {
        amount: expenseData.amount,
        description: expenseData.description,
        splits
      });

      navigate(`/group/${groupId}`, {
        state: { expenseAdded: true },
        replace: true
      });
    } catch (err) {
      setError(err.message || 'Failed to create expense');
      setIsSaving(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDisplayName = (split) => {
    if (split.isCurrentUser) return 'You';
    if (split.userName) {
      return split.userName.length > 20 
        ? split.userName.slice(0, 20) + '...' 
        : split.userName;
    }
    return 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group || !expenseData) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--color-bg)] px-6">
        <p className="text-[var(--color-text-secondary)] mb-4">Something went wrong</p>
        <button
          onClick={() => navigate(`/group/${groupId}`)}
          className="text-[var(--color-accent)] font-medium"
        >
          Back to Group
        </button>
      </div>
    );
  }

  const total = calculateTotal();
  const isValid = isValidSplit();
  const diff = Math.abs(total - expenseData.amount);
  const includedCount = memberSplits.filter(s => s.isIncluded).length;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(`/group/${groupId}/add-expense`, {
              state: { expenseData }
            })}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors font-medium"
          >
            Back
          </button>
          <span className="text-sm text-[var(--color-text-muted)]">Split</span>
          <div className="w-14" />
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Amount Context */}
        <div className="px-6 py-5 border-b border-[var(--color-border-subtle)]">
          <div className="text-center">
            <div className="text-3xl font-semibold text-[var(--color-text-primary)] rupee">
              {formatAmount(expenseData.amount)}
            </div>
            {expenseData.description && (
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {expenseData.description}
              </p>
            )}
          </div>
        </div>

        {/* Split Mode Toggle */}
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex gap-2">
            <button
              onClick={handleSwitchToEqual}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                splitMode === 'equal'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-accent-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
              }`}
            >
              Split Equally
            </button>
            <button
              onClick={handleSwitchToCustom}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                splitMode === 'custom'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-accent-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
              }`}
            >
              Custom Amounts
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-2">
            {memberSplits.map((split, index) => (
              <div
                key={split.userId}
                className={`
                  card p-4 transition-all duration-200 animate-fade-in
                  ${!split.isIncluded ? 'opacity-40' : ''}
                `}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Toggle + Name */}
                  <button
                    onClick={() => handleToggleMember(split.userId)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div
                      className={`
                        w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200
                        ${split.isIncluded
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                          : 'bg-transparent border-[var(--color-border)]'
                        }
                      `}
                    >
                      {split.isIncluded && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-[var(--color-text-primary)] truncate">
                      {formatDisplayName(split)}
                    </span>
                  </button>

                  {/* Amount */}
                  {split.isIncluded && (
                    <div className="flex items-center">
                      {splitMode === 'custom' ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--color-text-muted)]">₹</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={split.shareAmount || ''}
                            onChange={(e) => handleCustomAmountChange(split.userId, e.target.value)}
                            className="w-20 text-right bg-transparent text-[var(--color-text-primary)] font-medium focus:outline-none border-b border-[var(--color-border)] focus:border-[var(--color-accent)] transition-colors"
                            placeholder="0"
                          />
                        </div>
                      ) : (
                        <span className="text-[var(--color-text-primary)] font-medium rupee">
                          {formatAmount(split.shareAmount)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Hint */}
        {!isValid && includedCount > 0 && (
          <div className="px-6 py-3 bg-[var(--color-accent-subtle)] border-t border-[var(--color-border-subtle)] animate-fade-in">
            <p className="text-sm text-[var(--color-text-secondary)] text-center">
              Total {formatAmount(total)} · {diff > 0.01 ? `${formatAmount(diff)} ${total > expenseData.amount ? 'over' : 'short'}` : 'Adjust amounts to match'}
            </p>
          </div>
        )}

        {/* Save Button */}
        <div className="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-border-subtle)] safe-area-bottom">
          <div className="px-6 py-4">
            <button
              onClick={handleSave}
              disabled={!isValid || isSaving}
              className={`
                w-full py-4 px-6 rounded-2xl font-semibold text-base
                transition-all duration-200
                ${isValid && !isSaving
                  ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] active:scale-[0.98] shadow-[var(--shadow-md)]'
                  : 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
                }
              `}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                `Split with ${includedCount} ${includedCount === 1 ? 'person' : 'people'}`
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in safe-area-bottom">
          <div className="bg-[var(--color-error)] text-white px-5 py-3 rounded-full text-sm font-medium shadow-[var(--shadow-lg)]">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
