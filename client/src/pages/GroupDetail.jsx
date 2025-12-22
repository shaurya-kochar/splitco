import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getGroupDetails,
  getExpenses,
  getGroupBalances,
  getSettlements,
  updateExpense,
  deleteExpense,
  updateSettlement,
  deleteSettlement,
} from "../api/groups";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";
import SettleUpModal from "../components/SettleUpModal";
import Statistics from "../components/Statistics";
import HeroCard from "../components/HeroCard";
import EditExpenseModal from "../components/EditExpenseModal";
import EditSettlementModal from "../components/EditSettlementModal";

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [balances, setBalances] = useState(null);
  const [currentUserBalance, setCurrentUserBalance] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showSettlementPicker, setShowSettlementPicker] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard' or 'statistics'
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingSettlement, setEditingSettlement] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [groupRes, expensesRes, settlementsRes, balancesRes] =
        await Promise.all([
          getGroupDetails(groupId),
          getExpenses(groupId),
          getSettlements(groupId),
          getGroupBalances(groupId),
        ]);
      setGroup(groupRes.group);

      const expensesData = expensesRes.expenses || [];
      const settlementsData = settlementsRes.settlements || [];

      setExpenses(expensesData);
      setSettlements(settlementsData);

      // Calculate total spent
      const total = expensesData.reduce((sum, exp) => sum + exp.amount, 0);
      setTotalSpent(total);

      const combinedFeed = [
        ...expensesData.map((e) => ({ ...e, type: "expense" })),
        ...settlementsData.map((s) => ({ ...s, type: "settlement" })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setActivityFeed(combinedFeed);
      setBalances(balancesRes.balances || []);
      setCurrentUserBalance(balancesRes.currentUserBalance || 0);
    } catch (err) {
      setError(err.message || "Failed to load group");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (location.state?.expenseAdded) {
      setToastMessage("Expense added");
      setShowToast(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleInvite = async () => {
    const inviteUrl = `${window.location.origin}/join/${groupId}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setToastMessage("Invite link copied");
      setShowToast(true);
    } catch {
      setToastMessage(inviteUrl);
      setShowToast(true);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  const getPayerName = (expense) => {
    if (expense.paidBy.id === user?.id) {
      return "You";
    }
    return expense.paidBy.name || expense.paidBy.phone?.slice(-4) || "Someone";
  };

  const getSettlementText = (settlement) => {
    if (!settlement.fromUser || !settlement.toUser) {
      return "Payment recorded";
    }

    const fromName =
      settlement.fromUser.id === user?.id
        ? "You"
        : settlement.fromUser.name ||
          settlement.fromUser.phone?.slice(-4) ||
          "Someone";
    const toName =
      settlement.toUser.id === user?.id
        ? "you"
        : settlement.toUser.name ||
          settlement.toUser.phone?.slice(-4) ||
          "someone";

    return `${fromName} paid ${toName}`;
  };

  const handleUpdateExpense = async (expenseId, updates) => {
    try {
      await updateExpense(groupId, expenseId, updates);
      setToastMessage("Expense updated");
      setShowToast(true);
      await loadData();
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await deleteExpense(groupId, expenseId);
      setToastMessage("Expense deleted");
      setShowToast(true);
      await loadData();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateSettlement = async (settlementId, updates) => {
    try {
      await updateSettlement(groupId, settlementId, updates);
      setToastMessage("Settlement updated");
      setShowToast(true);
      await loadData();
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteSettlement = async (settlementId) => {
    try {
      await deleteSettlement(groupId, settlementId);
      setToastMessage("Settlement deleted");
      setShowToast(true);
      await loadData();
    } catch (err) {
      throw err;
    }
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
        <p className="text-[var(--color-text-secondary)] mb-4">
          {error || "Group not found"}
        </p>
        <button
          onClick={() => navigate("/home")}
          className="text-[var(--color-accent)] font-medium"
        >
          Go Home
        </button>
      </div>
    );
  }

  const isDirectSplit = group.type === "direct";
  const title = isDirectSplit ? group.displayName : group.name;
  const hasExpenses = expenses.length > 0;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/95 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/home")}
            className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
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
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              </button>
              <button
                onClick={handleInvite}
                className="p-1 -mr-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <div className="w-6" />
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full pb-24">
        {/* Tab Switcher */}
        {hasExpenses && (
          <div className="px-6 pt-4 border-b border-[var(--color-border)]">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveView("dashboard")}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                  activeView === "dashboard"
                    ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                    : "border-transparent text-[var(--color-text-secondary)]"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveView("statistics")}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                  activeView === "statistics"
                    ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                    : "border-transparent text-[var(--color-text-secondary)]"
                }`}
              >
                Statistics
              </button>
            </div>
          </div>
        )}

        {/* Dashboard View */}
        {activeView === "dashboard" && (
          <>
            {hasExpenses && (
              <div className="px-6 pt-6">
                <HeroCard
                  balance={currentUserBalance}
                  type="balance"
                  members={group.members}
                  splitCount={group.members.length}
                  expenseCount={expenses.length}
                />
                <button
                  onClick={() => setShowSettlementPicker(true)}
                  className="mt-4 w-full px-6 py-4 bg-[var(--color-accent)] text-black rounded-2xl font-semibold shadow-[var(--shadow-card)] active:scale-95 transition-transform"
                >
                  Record Settlement
                </button>

                {/* Balance Breakdown */}
                {currentUserBalance !== 0 && balances && (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">
                      Balance Breakdown
                    </h3>
                    <div className="space-y-2">
                      {balances.map((balance) => {
                        if (!balance.owes || balance.owes.length === 0) return null;
                        
                        const userName = balance.userId === user?.id 
                          ? 'You' 
                          : (balance.userName || balance.userPhone || 'Unknown');
                        
                        return balance.owes.map((debt, idx) => {
                          const creditorName = debt.userId === user?.id 
                            ? 'You' 
                            : (debt.userName || debt.userPhone || 'Unknown');
                          
                          // Only show if current user is involved
                          if (balance.userId !== user?.id && debt.userId !== user?.id) return null;
                          
                          const isUserOwing = balance.userId === user?.id;
                          
                          return (
                            <div
                              key={`${balance.userId}-${debt.userId}-${idx}`}
                              className="bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)]"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                    {isUserOwing 
                                      ? `You owe ${creditorName}` 
                                      : `${userName} owes you`}
                                  </p>
                                </div>
                                <p className={`text-base font-semibold rupee ${
                                  isUserOwing 
                                    ? 'text-[var(--color-error)]' 
                                    : 'text-[var(--color-success)]'
                                }`}>
                                  {formatAmount(debt.amount)}
                                </p>
                              </div>
                            </div>
                          );
                        });
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}{" "}
            {!hasExpenses ? (
              <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
                <div className="animate-fade-in text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl flex items-center justify-center shadow-[var(--shadow-sm)]">
                    <svg
                      className="w-10 h-10 text-[var(--color-accent)]"
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
                  <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
                    No expenses yet
                  </h3>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed max-w-[260px] mx-auto">
                    Add the first one when you spend together
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto px-6 pt-6 pb-8">
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">
                  Activity
                </h2>
                <div className="space-y-3">
                  {activityFeed.map((item, index) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] shadow-[var(--shadow-card)] animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      {item.type === "expense" ? (
                        <div>
                          {/* Description as primary */}
                          {item.description && (
                            <p className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
                              {item.description}
                            </p>
                          )}
                          {/* Amount */}
                          <p className="text-2xl font-bold text-[var(--color-text-primary)] rupee mb-1">
                            {formatAmount(item.amount)}
                          </p>
                          {/* Meta */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-[var(--color-text-secondary)]">
                                Paid by {getPayerName(item)}
                              </p>
                              {item.splits && item.splits.length > 0 && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                  Split {item.splits.length}{" "}
                                  {item.splits.length === 1 ? "way" : "ways"}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {formatTime(item.createdAt)}
                              </span>
                              <button
                                onClick={() => setEditingExpense(item)}
                                className="block ml-auto mt-1 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {/* Settlement badge */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-[var(--color-success)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                            <span className="text-xs font-bold text-[var(--color-success)] uppercase tracking-wider">
                              Settlement
                            </span>
                          </div>
                          {/* Amount */}
                          <p className="text-2xl font-bold text-[var(--color-text-primary)] rupee mb-1">
                            {formatAmount(item.amount)}
                          </p>
                          {/* Meta */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-[var(--color-text-secondary)]">
                                {getSettlementText(item)}
                              </p>
                              {item.method && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 capitalize">
                                  {item.method}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {formatTime(item.createdAt)}
                              </span>
                              <button
                                onClick={() => setEditingSettlement(item)}
                                className="block ml-auto mt-1 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Statistics View */}
        {activeView === "statistics" && hasExpenses && (
          <div className="flex-1 overflow-auto">
            <Statistics
              expenses={expenses}
              settlements={settlements}
              balances={balances}
              group={group}
              currentUser={user}
            />
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)] to-transparent pb-safe">
        <div className="max-w-lg mx-auto px-6 pt-4 pb-6">
          <button
            onClick={() => navigate(`/group/${groupId}/add-expense`)}
            className="w-full py-4 bg-[var(--color-accent)] text-[#0a0a0b] rounded-2xl font-bold text-lg hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all duration-200 shadow-[var(--shadow-hero)] flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Add Expense
          </button>
        </div>
      </div>

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Settlement Picker Modal */}
      {showSettlementPicker && balances && balances.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 animate-fade-in"
          onClick={() => setShowSettlementPicker(false)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-[var(--color-surface)] rounded-t-3xl p-6 animate-slide-up safe-area-bottom max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Record Settlement
              </h2>
              <button
                onClick={() => setShowSettlementPicker(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] transition-colors"
              >
                <svg
                  className="w-5 h-5 text-[var(--color-text-secondary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Your Settlements Section */}
            {(() => {
              const yourSettlements = [];
              const otherSettlements = [];
              
              balances.forEach((balance) => {
                const userName = balance.userName || balance.userPhone?.slice(-4) || "Unknown";
                const owes = balance.owes || [];
                
                owes.forEach((debt) => {
                  const creditorName = debt.userName || debt.userPhone?.slice(-4) || "Unknown";
                  const settlementData = {
                    balance,
                    debt,
                    userName,
                    creditorName,
                    isUserInvolved: balance.userId === user?.id || debt.userId === user?.id
                  };
                  
                  if (settlementData.isUserInvolved) {
                    yourSettlements.push(settlementData);
                  } else {
                    otherSettlements.push(settlementData);
                  }
                });
              });
              
              return (
                <>
                  {/* Your Settlements */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">
                      Your Settlements
                    </h3>
                    {yourSettlements.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          You are all settled up! 🎉
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {yourSettlements.map((item, idx) => {
                          const isUserOwing = item.balance.userId === user?.id;
                          return (
                            <button
                              key={`your-${item.balance.userId}-${item.debt.userId}-${idx}`}
                              onClick={() => {
                                setSelectedSettlement({
                                  fromUser: {
                                    id: item.balance.userId,
                                    name: item.userName,
                                    phone: item.balance.userPhone,
                                  },
                                  toUser: {
                                    id: item.debt.userId,
                                    name: item.creditorName,
                                    phone: item.debt.userPhone,
                                  },
                                  amount: item.debt.amount,
                                });
                                setShowSettlementPicker(false);
                                setShowSettleUp(true);
                              }}
                              className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-4 text-left hover:bg-[var(--color-border)] transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-base font-medium text-[var(--color-text-primary)]">
                                    {isUserOwing ? 'You' : item.userName} → {isUserOwing ? item.creditorName : 'You'}
                                  </p>
                                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                    {isUserOwing 
                                      ? `You owe ${item.creditorName}` 
                                      : `${item.userName} owes you`}
                                  </p>
                                </div>
                                <p className={`text-lg font-semibold rupee ${
                                  isUserOwing ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'
                                }`}>
                                  {formatAmount(item.debt.amount)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Other Settlements */}
                  {otherSettlements.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">
                        Other Settlements
                      </h3>
                      <div className="space-y-2">
                        {otherSettlements.map((item, idx) => (
                          <button
                            key={`other-${item.balance.userId}-${item.debt.userId}-${idx}`}
                            onClick={() => {
                              setSelectedSettlement({
                                fromUser: {
                                  id: item.balance.userId,
                                  name: item.userName,
                                  phone: item.balance.userPhone,
                                },
                                toUser: {
                                  id: item.debt.userId,
                                  name: item.creditorName,
                                  phone: item.debt.userPhone,
                                },
                                amount: item.debt.amount,
                              });
                              setShowSettlementPicker(false);
                              setShowSettleUp(true);
                            }}
                            className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-4 text-left hover:bg-[var(--color-border)] transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-base font-medium text-[var(--color-text-primary)]">
                                  {item.userName} → {item.creditorName}
                                </p>
                                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                  {item.userName} owes {item.creditorName}
                                </p>
                              </div>
                              <p className="text-lg font-semibold text-[var(--color-text-secondary)] rupee">
                                {formatAmount(item.debt.amount)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
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
            setToastMessage("Payment recorded");
            setShowToast(true);
            loadData();
          }}
        />
      )}

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          group={group}
          onClose={() => setEditingExpense(null)}
          onSave={(updates) => handleUpdateExpense(editingExpense.id, updates)}
          onDelete={() => handleDeleteExpense(editingExpense.id)}
        />
      )}

      {editingSettlement && (
        <EditSettlementModal
          settlement={editingSettlement}
          group={group}
          onClose={() => setEditingSettlement(null)}
          onSave={(updates) =>
            handleUpdateSettlement(editingSettlement.id, updates)
          }
          onDelete={() => handleDeleteSettlement(editingSettlement.id)}
        />
      )}
    </div>
  );
}
