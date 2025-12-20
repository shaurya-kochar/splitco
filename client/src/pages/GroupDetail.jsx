import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getGroupDetails, getExpenses, getGroupBalances, getSettlements } from '../api/groups';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import SettleUpModal from '../components/SettleUpModal';
import Statistics from '../components/Statistics';

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]); // Combined expenses + settlements
  const [balances, setBalances] = useState(null);
  const [currentUserBalance, setCurrentUserBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showSettlementPicker, setShowSettlementPicker] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'statistics'

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [groupRes, expensesRes, settlementsRes, balancesRes] = await Promise.all([
        getGroupDetails(groupId),
        getExpenses(groupId),
        getSettlements(groupId),
        getGroupBalances(groupId)
      ]);
      setGroup(groupRes.group);
      
      const expensesData = expensesRes.expenses || [];
      const settlementsData = settlementsRes.settlements || [];
      
      setExpenses(expensesData);
      
      // Combine expenses and settlements into activity feed, sorted by date
      const combinedFeed = [
        ...expensesData.map(e => ({ ...e, type: 'expense' })),
        ...settlementsData.map(s => ({ ...s, type: 'settlement' }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setActivityFeed(combinedFeed);
      setBalances(balancesRes.balances || []);
      setCurrentUserBalance(balancesRes.currentUserBalance || 0);
    } catch (err) {
      setError(err.message || 'Failed to load group');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show success toast if coming back from adding expense
  useEffect(() => {
    if (location.state?.expenseAdded) {
      setToastMessage('Expense added');
      setShowToast(true);
      // Clear the state to prevent showing toast on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Show success toast if coming back from adding expense
  useEffect(() => {
    if (location.state?.expenseAdded) {
      setToastMessage('Expense added');
      setShowToast(true);
      // Clear the state to prevent showing toast on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  const getSettlementText = (settlement) => {
    if (!settlement.fromUser || !settlement.toUser) {
      return 'Payment recorded';
    }
    
    const fromName = settlement.fromUser.id === user?.id 
      ? 'You' 
      : (settlement.fromUser.name || settlement.fromUser.phone?.slice(-4) || 'Someone');
    const toName = settlement.toUser.id === user?.id 
      ? 'you' 
      : (settlement.toUser.name || settlement.toUser.phone?.slice(-4) || 'someone');
    
    return `${fromName} paid ${toName}`;
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/group/${groupId}/info`)}
                className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </button>
              <button
                onClick={handleInvite}
                className="p-1 -mr-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="w-6" />
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeView === 'dashboard'
                ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('statistics')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeView === 'statistics'
                ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            Statistics
          </button>
        </div>

        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <>
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

        {/* Balance Summary - Clear and prominent */}
        {hasExpenses && (
          <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                  Your Balance
                </p>
                <p className={`text-2xl font-semibold rupee ${
                  currentUserBalance > 0 
                    ? 'text-[var(--color-success)]' 
                    : currentUserBalance < 0
                    ? 'text-[var(--color-error)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}>
                  {currentUserBalance > 0 ? '+' : ''}{formatAmount(Math.abs(currentUserBalance))}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                  {currentUserBalance > 0 
                    ? 'You get back' 
                    : currentUserBalance < 0
                    ? 'You owe'
                    : 'All settled up'}
                </p>
              </div>
              <button
                onClick={() => setShowSettlementPicker(true)}
                className="py-2.5 px-5 bg-[var(--color-accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-all duration-200 shadow-[var(--shadow-sm)]"
              >
                Record Settlement
              </button>
            </div>
          </div>
        )}

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
          /* Activity Feed (Expenses + Settlements) */
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="space-y-3">
              {activityFeed.map((item, index) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`
                    card p-4 animate-fade-in
                    ${index === 0 && location.state?.expenseAdded ? 'ring-2 ring-[var(--color-success)]/20' : ''}
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {item.type === 'expense' ? (
                    /* Expense Item */
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Amount - Primary */}
                        <p className="text-xl font-semibold text-[var(--color-text-primary)] rupee">
                          {formatAmount(item.amount)}
                        </p>
                        {/* Paid by - Secondary */}
                        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                          Paid by {getPayerName(item)}
                        </p>
                        {/* Split info - Subtle */}
                        {item.splits && item.splits.length > 0 && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                            Split {item.splits.length} {item.splits.length === 1 ? 'way' : 'ways'}
                          </p>
                        )}
                        {/* Description - If present */}
                        {item.description && (
                          <p className="text-sm text-[var(--color-text-muted)] mt-2 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {/* Timestamp - Very subtle */}
                      <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap pt-1">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                  ) : (
                    /* Settlement Item */
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Settlement badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-medium text-[var(--color-success)] uppercase tracking-wider">
                            Settlement
                          </span>
                        </div>
                        {/* Amount */}
                        <p className="text-xl font-semibold text-[var(--color-text-primary)] rupee">
                          {formatAmount(item.amount)}
                        </p>
                        {/* Settlement details */}
                        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                          {getSettlementText(item)}
                        </p>
                        {/* Method */}
                        {item.method && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-1.5 capitalize">
                            {item.method}
                          </p>
                        )}
                      </div>
                      {/* Timestamp */}
                      <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap pt-1">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                  )}
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
          </>
        )}

        {/* Statistics View */}
        {activeView === 'statistics' && (
          <div className="flex-1 overflow-auto">
            {hasExpenses ? (
              <Statistics 
                expenses={expenses}
                balances={balances}
                group={group}
                currentUser={user}
              />
            ) : (
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
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                    No statistics yet
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-[240px] mx-auto">
                    Add expenses to see group statistics
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Settlement Picker Modal */}
      {showSettlementPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={() => setShowSettlementPicker(false)}>
          <div 
            className="w-full max-w-lg bg-[var(--color-bg)] rounded-t-3xl p-6 animate-slide-up safe-area-bottom max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Record Settlement
                </h2>
                <button
                  onClick={() => setShowSettlementPicker(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
                >
                  <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Select who paid whom
              </p>
            </div>

            {/* Balances List */}
            {balances && balances.length > 0 ? (
              <div className="space-y-3">
                {balances.map((balance, index) => {
                  const userName = balance.userName || balance.userPhone?.slice(-4) || 'Unknown';
                  const owes = balance.owes || [];
                  
                  return owes.map((debt, debtIndex) => {
                    const creditorName = debt.userName || debt.userPhone?.slice(-4) || 'Unknown';
                    
                    return (
                      <button
                        key={`${balance.userId}-${debt.userId}-${debtIndex}`}
                        onClick={() => {
                          setSelectedSettlement({
                            fromUser: { id: balance.userId, name: userName, phone: balance.userPhone },
                            toUser: { id: debt.userId, name: creditorName, phone: debt.userPhone },
                            amount: debt.amount
                          });
                          setShowSettlementPicker(false);
                          setShowSettleUp(true);
                        }}
                        className="w-full card p-4 text-left hover:bg-[var(--color-accent-subtle)] transition-colors animate-fade-in"
                        style={{ animationDelay: `${(index * owes.length + debtIndex) * 50}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-medium text-[var(--color-text-primary)]">
                              {userName} → {creditorName}
                            </p>
                            <p className="text-sm text-[var(--color-text-muted)] mt-1">
                              {userName === 'You' || balance.userId === user?.id ? 'You owe' : `${userName} owes`} {creditorName === 'You' || debt.userId === user?.id ? 'you' : creditorName}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-[var(--color-error)] rupee">
                            {formatAmount(debt.amount)}
                          </p>
                        </div>
                      </button>
                    );
                  });
                })}
              </div>
            ) : (
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
                  No outstanding balances in this group
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showSettleUp && selectedSettlement && (
        <SettleUpModal
          groupId={groupId}
          fromUser={selectedSettlement.fromUser}
          toUser={selectedSettlement.toUser}
          defaultAmount={selectedSettlement.amount}
          onClose={() => {
            setShowSettleUp(false);
            setSelectedSettlement(null);
          }}
          onSettled={() => {
            setShowSettleUp(false);
            setSelectedSettlement(null);
            setToastMessage('Payment recorded');
            setShowToast(true);
            loadData(); // Reload to update balances
          }}
        />
      )}
    </div>
  );
}
