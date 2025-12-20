// Balance calculation utilities
// This computes net balances between users in a group

/**
 * Calculate net balances for all users in a group
 * Uses a "Pure Net Balance" approach to ensure mathematical accuracy 
 * across expenses, multi-payers, and settlements.
 * 
 * @param {Array} expenses - Array of expense objects with splits
 * @param {Array} settlements - Array of settlement objects (optional)
 * @returns {Map} userId -> { balance, owes: Map, owedBy: Map }
 */
export function calculateGroupBalances(expenses, settlements = []) {
  const netBalances = new Map();

  // Helper to safely update balance
  const addBalance = (userId, amount) => {
    const current = netBalances.get(userId) || 0;
    netBalances.set(userId, current + amount);
  };

  // 1. Process Expenses
  for (const expense of expenses) {
    // A. Handle Payers (They gain equity in the group)
    // ------------------------------------------------
    let payers = [];
    
    // Parse multi-payer data if it exists
    if (expense.paidByData) {
      try {
        const paidByData = typeof expense.paidByData === 'string' 
          ? JSON.parse(expense.paidByData) 
          : expense.paidByData;
        
        if (paidByData.mode === 'multiple' && paidByData.payments) {
          payers = paidByData.payments;
        } else {
          payers = [{ userId: expense.paidBy, amount: expense.amount }];
        }
      } catch (e) {
        payers = [{ userId: expense.paidBy, amount: expense.amount }];
      }
    } else {
      payers = [{ userId: expense.paidBy, amount: expense.amount }];
    }

    // Add amounts to payers' balances
    for (const payer of payers) {
      addBalance(payer.userId, payer.amount);
    }

    // B. Handle Splitters (They lose equity/incur debt)
    // -------------------------------------------------
    const splits = expense.splits || [];
    for (const split of splits) {
      addBalance(split.userId, -split.shareAmount);
    }
  }

  // 2. Process Settlements
  // -------------------------------------------------
  for (const settlement of settlements) {
    // The person paying (fromUser) is "buying back" their equity
    addBalance(settlement.fromUserId, settlement.amount);
    
    // The person receiving (toUser) is "cashing out" their equity
    addBalance(settlement.toUserId, -settlement.amount);
  }

  // 3. Prepare Final Structure
  // -------------------------------------------------
  const balances = new Map();
  
  // Separate into Debtors (-) and Creditors (+)
  const debtors = [];
  const creditors = [];

  for (const [userId, amount] of netBalances.entries()) {
    // Round to 2 decimals to avoid floating point errors
    const balance = Math.round(amount * 100) / 100;
    
    balances.set(userId, {
      balance,
      owes: new Map(),
      owedBy: new Map()
    });

    if (Math.abs(balance) < 0.01) continue; // Skip settled users

    if (balance > 0) {
      creditors.push({ userId, amount: balance });
    } else {
      // Store positive magnitude for matching logic
      debtors.push({ userId, amount: Math.abs(balance) });
    }
  }

  // 4. Greedy Matching Algorithm
  // -------------------------------------------------
  // Sort by magnitude (descending) to settle largest debts first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let i = 0; // Debtor index
  let j = 0; // Creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // The amount to settle is the minimum of what's owed vs what's waiting
    const amountToSettle = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Number(amountToSettle.toFixed(2));

    if (roundedAmount > 0) {
      // Record the simplified debt edge
      balances.get(debtor.userId).owes.set(creditor.userId, roundedAmount);
      balances.get(creditor.userId).owedBy.set(debtor.userId, roundedAmount);

      // Adjust temp trackers
      debtor.amount -= amountToSettle;
      creditor.amount -= amountToSettle;
    }

    // Move pointers if fully settled (using epsilon for float safety)
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return balances;
}

/**
 * Get a simplified list of who owes whom (for settlement purposes)
 * Returns an array of { from, to, amount } representing debts
 * 
 * @param {Map} balances - Output from calculateGroupBalances
 * @returns {Array} Array of debt objects
 */
export function getSettlementPlan(balances) {
  const settlements = [];
  
  for (const [userId, data] of balances.entries()) {
    for (const [creditorId, amount] of data.owes.entries()) {
      settlements.push({
        from: userId,
        to: creditorId,
        amount: Number(amount.toFixed(2))
      });
    }
  }
  
  return settlements;
}
