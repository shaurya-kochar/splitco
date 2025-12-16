// Balance calculation utilities
// This computes net balances between users in a group

/**
 * Calculate net balances for all users in a group
 * Returns a map of userId -> balance (positive = gets money, negative = owes money)
 * 
 * @param {Array} expenses - Array of expense objects with splits
 * @param {Array} settlements - Array of settlement objects (optional)
 * @returns {Map} userId -> { balance, owes: Map, owedBy: Map }
 */
export function calculateGroupBalances(expenses, settlements = []) {
  const balances = new Map();
  
  // Track who owes whom how much
  const owesMatrix = new Map(); // userId -> Map(otherUserId -> amount)
  
  for (const expense of expenses) {
    const paidBy = expense.paidBy;
    const splits = expense.splits || [];
    
    // Each person who has a split owes the payer their share
    for (const split of splits) {
      if (split.userId === paidBy) {
        // Payer doesn't owe themselves
        continue;
      }
      
      // split.userId owes paidBy the split.shareAmount
      if (!owesMatrix.has(split.userId)) {
        owesMatrix.set(split.userId, new Map());
      }
      
      const currentOwed = owesMatrix.get(split.userId).get(paidBy) || 0;
      owesMatrix.get(split.userId).set(paidBy, currentOwed + split.shareAmount);
    }
  }
  
  // Apply settlements (reduce debts)
  for (const settlement of settlements) {
    const fromUser = settlement.fromUserId;
    const toUser = settlement.toUserId;
    const amount = settlement.amount;
    
    // Settlement: fromUser paid toUser, so reduce fromUser's debt to toUser
    if (owesMatrix.has(fromUser) && owesMatrix.get(fromUser).has(toUser)) {
      const currentDebt = owesMatrix.get(fromUser).get(toUser);
      const newDebt = currentDebt - amount;
      
      if (newDebt <= 0.01) {
        // Debt fully paid or overpaid
        owesMatrix.get(fromUser).delete(toUser);
        
        if (newDebt < -0.01) {
          // Overpaid - now toUser owes fromUser
          if (!owesMatrix.has(toUser)) {
            owesMatrix.set(toUser, new Map());
          }
          owesMatrix.get(toUser).set(fromUser, Math.abs(newDebt));
        }
      } else {
        owesMatrix.get(fromUser).set(toUser, newDebt);
      }
    }
  }
  
  // Simplify the debts (net out mutual debts)
  const users = new Set();
  for (const userId of owesMatrix.keys()) {
    users.add(userId);
  }
  
  // Also add all payers
  for (const expense of expenses) {
    users.add(expense.paidBy);
  }
  
  // Initialize balance structure for all users
  for (const userId of users) {
    balances.set(userId, {
      balance: 0,
      owes: new Map(), // who this user owes to
      owedBy: new Map() // who owes this user
    });
  }
  
  // Simplify debts by netting out mutual obligations
  const userArray = Array.from(users);
  for (let i = 0; i < userArray.length; i++) {
    for (let j = i + 1; j < userArray.length; j++) {
      const user1 = userArray[i];
      const user2 = userArray[j];
      
      const user1OwesUser2 = owesMatrix.get(user1)?.get(user2) || 0;
      const user2OwesUser1 = owesMatrix.get(user2)?.get(user1) || 0;
      
      const netDebt = user1OwesUser2 - user2OwesUser1;
      
      if (Math.abs(netDebt) < 0.01) {
        // Effectively zero, skip
        continue;
      }
      
      if (netDebt > 0) {
        // user1 owes user2
        balances.get(user1).owes.set(user2, netDebt);
        balances.get(user2).owedBy.set(user1, netDebt);
        balances.get(user1).balance -= netDebt;
        balances.get(user2).balance += netDebt;
      } else {
        // user2 owes user1
        const absNetDebt = Math.abs(netDebt);
        balances.get(user2).owes.set(user1, absNetDebt);
        balances.get(user1).owedBy.set(user2, absNetDebt);
        balances.get(user2).balance -= absNetDebt;
        balances.get(user1).balance += absNetDebt;
      }
    }
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
