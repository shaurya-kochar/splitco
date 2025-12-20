export default function Statistics({ expenses, balances, group, currentUser }) {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calculate total group spending
  const totalSpending = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate total paid by each user
  const calculateTotalPaid = () => {
    const paidMap = new Map();
    
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

  // Calculate fair share for each user
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

  const totalPaidList = calculateTotalPaid();
  const fairShareList = calculateFairShare();
  const hasOutstandingDebts = balances && balances.some(b => b.owes && b.owes.length > 0);

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
              {balances
                .filter(b => b.owes && b.owes.length > 0)
                .map(balance => {
                  const totalOwed = balance.owes.reduce((sum, debt) => sum + debt.amount, 0);
                  const userName = balance.userId === currentUser?.id ? 'You' : balance.userName;
                  return (
                    <div key={balance.userId} className="flex items-center justify-between py-2 px-3 bg-[var(--color-surface)] rounded-lg">
                      <span className="text-sm text-[var(--color-text-primary)]">{userName}</span>
                      <span className="text-sm font-medium text-[var(--color-error)] rupee">{formatAmount(totalOwed)}</span>
                    </div>
                  );
                })}
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
