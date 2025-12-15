import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getGroupDetails, getExpenses } from '../api/groups';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [groupId]);

  // Show success toast if coming back from adding expense
  useEffect(() => {
    if (location.state?.expenseAdded) {
      setToastMessage('Expense added');
      setShowToast(true);
      // Clear the state to prevent showing toast on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [groupRes, expensesRes] = await Promise.all([
        getGroupDetails(groupId),
        getExpenses(groupId)
      ]);
      setGroup(groupRes.group);
      setExpenses(expensesRes.expenses || []);
    } catch (err) {
      setError(err.message || 'Failed to load group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    const inviteUrl = `${window.location.origin}/join/${groupId}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setToastMessage('Invite link copied');
      setShowToast(true);
    } catch {
      setToastMessage(inviteUrl);
      setShowToast(true);
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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getPayerName = (expense) => {
    if (expense.paidBy.id === user?.id) {
      return 'You';
    }
    return expense.paidBy.name || expense.paidBy.phone?.slice(-4) || 'Someone';
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !group) {
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

  const isDirectSplit = group.type === 'direct';
  const title = isDirectSplit ? group.displayName : group.name;
  const hasExpenses = expenses.length > 0;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/home')}
            className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-[var(--color-text-primary)] truncate max-w-[180px]">
            {title}
          </h1>
          {!isDirectSplit ? (
            <button
              onClick={handleInvite}
              className="p-1 -mr-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Members Section - Subtle, not loud */}
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {group.members.slice(0, 4).map((member, index) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full bg-[var(--color-accent-subtle)] border-2 border-[var(--color-bg)] flex items-center justify-center text-xs font-medium text-[var(--color-text-secondary)]"
                  style={{ zIndex: 4 - index }}
                >
                  {(member.name || member.phone).slice(0, 1).toUpperCase()}
                </div>
              ))}
              {group.members.length > 4 && (
                <div 
                  className="w-8 h-8 rounded-full bg-[var(--color-border)] border-2 border-[var(--color-bg)] flex items-center justify-center text-xs font-medium text-[var(--color-text-muted)]"
                  style={{ zIndex: 0 }}
                >
                  +{group.members.length - 4}
                </div>
              )}
            </div>
            <span className="text-sm text-[var(--color-text-muted)]">
              {group.members.length} {group.members.length === 1 ? 'person' : 'people'}
            </span>
          </div>
        </div>

        {/* Content Area */}
        {!hasExpenses ? (
          /* Empty State - Calm and intentional */
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
            <div className="animate-fade-in text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center justify-center shadow-[var(--shadow-sm)]">
                <svg 
                  className="w-7 h-7 text-[var(--color-text-muted)]"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                No expenses yet
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-[240px] mx-auto">
                Add the first one when you spend together
              </p>
            </div>
          </div>
        ) : (
          /* Expense Feed */
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="space-y-3">
              {expenses.map((expense, index) => (
                <div
                  key={expense.id}
                  className={`
                    card p-4 animate-fade-in
                    ${index === 0 && location.state?.expenseAdded ? 'ring-2 ring-[var(--color-success)]/20' : ''}
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Amount - Primary */}
                      <p className="text-xl font-semibold text-[var(--color-text-primary)] rupee">
                        {formatAmount(expense.amount)}
                      </p>
                      {/* Paid by - Secondary */}
                      <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                        Paid by {getPayerName(expense)}
                      </p>
                      {/* Split info - Subtle */}
                      {expense.splits && expense.splits.length > 0 && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                          Split {expense.splits.length} {expense.splits.length === 1 ? 'way' : 'ways'}
                        </p>
                      )}
                      {/* Description - If present */}
                      {expense.description && (
                        <p className="text-sm text-[var(--color-text-muted)] mt-2 truncate">
                          {expense.description}
                        </p>
                      )}
                    </div>
                    {/* Timestamp - Very subtle */}
                    <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap pt-1">
                      {formatTime(expense.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Expense CTA - Fixed at bottom */}
        <div className="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-border-subtle)] safe-area-bottom">
          <div className="px-6 py-4">
            <button
              onClick={() => navigate(`/group/${groupId}/add-expense`)}
              className="w-full py-4 px-6 bg-[var(--color-accent)] text-white rounded-2xl font-semibold text-base hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all duration-200 shadow-[var(--shadow-md)]"
            >
              Add Expense
            </button>
          </div>
        </div>
      </div>

      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
