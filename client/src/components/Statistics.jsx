import { useState } from 'react';

export default function Statistics({ expenses, settlements = [], balances, group, currentUser }) {
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationChannels, setNotificationChannels] = useState({
    inApp: true,
    whatsapp: false,
    sms: false,
    email: false
  });
  
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calculate total group spending (expenses only)
  const totalSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate net balances using pure net balance approach (same as backend)
  const calculateNetBalances = () => {
    const netBalances = new Map();
    
    // Helper to safely update balance
    const addBalance = (userId, amount) => {
      const current = netBalances.get(userId) || 0;
      netBalances.set(userId, current + amount);
    };

    // 1. Process Expenses - Payers gain equity, Splitters lose equity
    expenses.forEach(expense => {
      // Handle payers (they gain equity)
      let payers = [];
      if (expense.paidByData) {
        try {
          const paidByData = typeof expense.paidByData === 'string' 
            ? JSON.parse(expense.paidByData) 
            : expense.paidByData;
          
          if (paidByData.mode === 'multiple' && paidByData.payments) {
            payers = paidByData.payments;
          } else {
            payers = [{ userId: expense.paidBy.id, amount: expense.amount }];
          }
        } catch (e) {
          payers = [{ userId: expense.paidBy.id, amount: expense.amount }];
        }
      } else {
        payers = [{ userId: expense.paidBy.id, amount: expense.amount }];
      }

      // Add amounts to payers' balances
      payers.forEach(payer => {
        addBalance(payer.userId, payer.amount);
      });

      // Handle splitters (they lose equity/incur debt)
      expense.splits?.forEach(split => {
        addBalance(split.userId, -split.shareAmount);
      });
    });

    // 2. Process Settlements - Payer gains equity, Receiver loses equity
    settlements.forEach(settlement => {
      // The person paying (fromUser) is "buying back" their equity
      addBalance(settlement.fromUser.id, settlement.amount);
      
      // The person receiving (toUser) is "cashing out" their equity
      addBalance(settlement.toUser.id, -settlement.amount);
    });

    return netBalances;
  };

  // Calculate total paid by each user (including settlements)
  const calculateTotalPaid = () => {
    const paidMap = new Map();
    
    // Expenses
    expenses.forEach(expense => {
      if (expense.paidByData) {
        try {
          const paidByData = typeof expense.paidByData === 'string' 
            ? JSON.parse(expense.paidByData) 
            : expense.paidByData;
          
          if (paidByData.mode === 'multiple' && paidByData.payments) {
            paidByData.payments.forEach(payment => {
              paidMap.set(payment.userId, (paidMap.get(payment.userId) || 0) + payment.amount);
            });
          } else {
            paidMap.set(expense.paidBy.id, (paidMap.get(expense.paidBy.id) || 0) + expense.amount);
          }
        } catch (e) {
          paidMap.set(expense.paidBy.id, (paidMap.get(expense.paidBy.id) || 0) + expense.amount);
        }
      } else {
        paidMap.set(expense.paidBy.id, (paidMap.get(expense.paidBy.id) || 0) + expense.amount);
      }
    });

    // Add settlements (fromUser paid)
    settlements.forEach(settlement => {
      paidMap.set(settlement.fromUser.id, (paidMap.get(settlement.fromUser.id) || 0) + settlement.amount);
    });

    return Array.from(paidMap.entries())
      .map(([userId, amount]) => {
        const member = group.members.find(m => m.id === userId);
        return {
          userId,
          name: userId === currentUser?.id ? 'You' : (member?.name || member?.phone?.slice(-4) || 'Unknown'),
          amount
        };
      })
      .sort((a, b) => b.amount - a.amount);
  };

  // Calculate fair share for each user (from splits only)
  const calculateFairShare = () => {
    const shareMap = new Map();
    
    expenses.forEach(expense => {
      expense.splits?.forEach(split => {
        shareMap.set(split.userId, (shareMap.get(split.userId) || 0) + split.shareAmount);
      });
    });

    return Array.from(shareMap.entries())
      .map(([userId, amount]) => {
        const member = group.members.find(m => m.id === userId);
        return {
          userId,
          name: userId === currentUser?.id ? 'You' : (member?.name || member?.phone?.slice(-4) || 'Unknown'),
          amount
        };
      })
      .sort((a, b) => b.amount - a.amount);
  };

  // Get current owes from net balances with details on who owes to whom
  const getCurrentOwes = () => {
    const netBalances = calculateNetBalances();
    const owesList = [];
    
    // Find who owes money (negative balance)
    const debtors = Array.from(netBalances.entries())
      .filter(([_, balance]) => balance < -0.01)
      .map(([userId, balance]) => ({ userId, amount: Math.abs(balance) }));
    
    // Find who is owed money (positive balance)
    const creditors = Array.from(netBalances.entries())
      .filter(([_, balance]) => balance > 0.01)
      .map(([userId, balance]) => ({ userId, amount: balance }))
      .sort((a, b) => b.amount - a.amount);

    // For each debtor, determine who they owe to
    debtors.forEach(debtor => {
      const member = group.members.find(m => m.id === debtor.userId);
      const debtorName = debtor.userId === currentUser?.id ? 'You' : (member?.name || member?.phone?.slice(-4) || 'Unknown');
      
      // Find the main creditor (simplified - in reality debt could be split)
      const owesTo = creditors.length > 0 ? creditors[0] : null;
      const creditorMember = owesTo ? group.members.find(m => m.id === owesTo.userId) : null;
      const creditorName = owesTo ? (
        owesTo.userId === currentUser?.id ? 'You' : (creditorMember?.name || creditorMember?.phone?.slice(-4) || 'Unknown')
      ) : 'Unknown';
      
      owesList.push({
        userId: debtor.userId,
        name: debtorName,
        amount: debtor.amount,
        owesTo: creditorName,
        owesToId: owesTo?.userId
      });
    });

    return owesList.sort((a, b) => b.amount - a.amount);
  };

  const totalPaidList = calculateTotalPaid();
  const fairShareList = calculateFairShare();
  const currentOwesList = getCurrentOwes();
  const hasOutstandingDebts = currentOwesList.length > 0;

  return (
    <div className="px-6 py-5 border-b border-[var(--color-border-subtle)]">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Statistics</h2>
      
      {/* Total Group Spending */}
      <div className="mb-5">
        <p className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          Total
        </p>
        <p className="text-3xl font-bold text-[var(--color-text-primary)] rupee">
          {formatAmount(totalSpending)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Total group spending
        </p>
      </div>

      {/* Three Lists */}
      <div className="space-y-5">
        {/* 1. Who has paid how much */}
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Total Paid
          </p>
          <div className="space-y-2">
            {totalPaidList.map(item => (
              <div key={item.userId} className="flex items-center justify-between py-2 px-3 bg-[var(--color-surface)] rounded-lg">
                <span className="text-sm text-[var(--color-text-primary)]">{item.name}</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)] rupee">{formatAmount(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Who owes how much and to whom */}
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Currently Owes
          </p>
          {hasOutstandingDebts ? (
            <div className="space-y-2">
              {currentOwesList.map(item => (
                <div key={item.userId} className="py-2 px-3 bg-[var(--color-surface)] rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-primary)]">{item.name}</span>
                        <span className="text-sm font-medium text-[var(--color-error)] rupee">{formatAmount(item.amount)}</span>
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        owes to {item.owesTo}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDebtor(item);
                      setNotificationMessage(`Hi ${item.name}, this is a reminder that you owe ${formatAmount(item.amount)} to ${item.owesTo} in ${group.name}.`);
                      setShowNotifyModal(true);
                    }}
                    className="mt-2 w-full py-1.5 px-3 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-semibold rounded-lg hover:bg-[var(--color-accent)]/20 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 inline-block mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Send Reminder
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 px-3 bg-[var(--color-success)]/10 rounded-lg">
              <p className="text-sm text-[var(--color-success)] text-center">✓ All expenses are settled</p>
            </div>
          )}
        </div>

        {/* 3. Total share if all settled */}
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Fair Share (when settled)
          </p>
          <div className="space-y-2">
            {fairShareList.map(item => (
              <div key={item.userId} className="flex items-center justify-between py-2 px-3 bg-[var(--color-surface)] rounded-lg">
                <span className="text-sm text-[var(--color-text-primary)]">{item.name}</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)] rupee">{formatAmount(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      {showNotifyModal && selectedDebtor && (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 animate-fade-in" onClick={() => setShowNotifyModal(false)}>
        <div 
          className="bg-[var(--color-bg)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-auto animate-slide-up shadow-[var(--shadow-xl)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-[var(--color-bg)] border-b border-[var(--color-border-subtle)] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                Send Reminder
              </h2>
              <button
                onClick={() => setShowNotifyModal(false)}
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
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Sending to: {selectedDebtor.name}
              </label>
              <p className="text-xs text-[var(--color-text-muted)]">
                Amount: {formatAmount(selectedDebtor.amount)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Message
              </label>
              <textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] resize-none"
                rows={4}
                placeholder="Write your message..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                Send via
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <input
                    type="checkbox"
                    checked={notificationChannels.inApp}
                    onChange={(e) => setNotificationChannels(prev => ({ ...prev, inApp: e.target.checked }))}
                    className="w-4 h-4 text-[var(--color-accent)] border-[var(--color-border)] rounded focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">In-App Notification</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Send push notification</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <input
                    type="checkbox"
                    checked={notificationChannels.whatsapp}
                    onChange={(e) => setNotificationChannels(prev => ({ ...prev, whatsapp: e.target.checked }))}
                    className="w-4 h-4 text-[var(--color-accent)] border-[var(--color-border)] rounded focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">WhatsApp</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Send via WhatsApp</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <input
                    type="checkbox"
                    checked={notificationChannels.sms}
                    onChange={(e) => setNotificationChannels(prev => ({ ...prev, sms: e.target.checked }))}
                    className="w-4 h-4 text-[var(--color-accent)] border-[var(--color-border)] rounded focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">SMS</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Send text message</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <input
                    type="checkbox"
                    checked={notificationChannels.email}
                    onChange={(e) => setNotificationChannels(prev => ({ ...prev, email: e.target.checked }))}
                    className="w-4 h-4 text-[var(--color-accent)] border-[var(--color-border)] rounded focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Email</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Send email notification</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-border-subtle)] px-6 py-4">
            <button
              onClick={() => {
                // TODO: Implement actual notification sending
                console.log('Sending notification to', selectedDebtor.name, 'via', Object.entries(notificationChannels).filter(([k, v]) => v).map(([k]) => k));
                setShowNotifyModal(false);
              }}
              className="w-full py-3 px-6 bg-[var(--color-accent)] text-white rounded-xl font-medium hover:bg-[var(--color-accent-hover)] transition-all"
            >
              Send Reminder
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
