export default function Statistics({ expenses, settlements = [], balances, group, currentUser }) {
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

  // Get current owes from net balances
  const getCurrentOwes = () => {
    const netBalances = calculateNetBalances();
    const owesList = [];

    for (const [userId, balance] of netBalances.entries()) {
      if (balance < -0.01) { // They owe money
        const member = group.members.find(m => m.id === userId);
        owesList.push({
          userId,
          name: userId === currentUser?.id ? 'You' : (member?.name || member?.phone?.slice(-4) || 'Unknown'),
          amount: Math.abs(balance)
        });
      }
    }

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

        {/* 2. Who owes how much */}
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Currently Owes
          </p>
          {hasOutstandingDebts ? (
            <div className="space-y-2">
              {currentOwesList.map(item => (
                <div key={item.userId} className="flex items-center justify-between py-2 px-3 bg-[var(--color-surface)] rounded-lg">
                  <span className="text-sm text-[var(--color-text-primary)]">{item.name}</span>
                  <span className="text-sm font-medium text-[var(--color-error)] rupee">{formatAmount(item.amount)}</span>
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
    </div>
  );
}
