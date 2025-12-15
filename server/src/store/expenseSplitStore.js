// In-memory expense split store
// Production would use a database

const expenseSplits = new Map();

// Create splits for an expense
export function createExpenseSplits(expenseId, splits) {
  if (!Array.isArray(splits) || splits.length === 0) {
    throw new Error('Splits array is required');
  }

  const splitRecords = splits.map(split => {
    const id = crypto.randomUUID();
    const record = {
      id,
      expenseId,
      userId: split.userId,
      shareAmount: split.shareAmount
    };
    
    expenseSplits.set(id, record);
    return record;
  });

  return splitRecords;
}

// Get splits for an expense
export function getSplitsByExpense(expenseId) {
  const splits = [];
  
  for (const split of expenseSplits.values()) {
    if (split.expenseId === expenseId) {
      splits.push(split);
    }
  }
  
  return splits;
}

// Get splits for multiple expenses (batch)
export function getSplitsByExpenses(expenseIds) {
  const splitsMap = new Map();
  
  for (const expenseId of expenseIds) {
    splitsMap.set(expenseId, []);
  }
  
  for (const split of expenseSplits.values()) {
    if (splitsMap.has(split.expenseId)) {
      splitsMap.get(split.expenseId).push(split);
    }
  }
  
  return splitsMap;
}

// Validate splits sum to total amount
export function validateSplits(splits, totalAmount) {
  const sum = splits.reduce((acc, split) => acc + split.shareAmount, 0);
  
  // Allow for floating point precision errors (within 0.01)
  const diff = Math.abs(sum - totalAmount);
  return diff < 0.01;
}
