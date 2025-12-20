// In-memory expense store
// Production would use a database

const expenses = new Map();

export function createExpense({ groupId, amount, paidBy, paidByData, description }) {
  const id = crypto.randomUUID();
  const expense = {
    id,
    groupId,
    amount,
    paidBy,
    paidByData: paidByData || null, // Store payment mode data
    description: description || null,
    createdAt: new Date().toISOString()
  };
  
  expenses.set(id, expense);
  return expense;
}

export function getExpensesByGroup(groupId) {
  const groupExpenses = [];
  
  for (const expense of expenses.values()) {
    if (expense.groupId === groupId) {
      groupExpenses.push(expense);
    }
  }
  
  // Sort by createdAt descending (newest first)
  return groupExpenses.sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

export function getExpenseById(id) {
  return expenses.get(id) || null;
}

export function deleteExpense(id) {
  return expenses.delete(id);
}

export function updateExpense(id, updates) {
  const expense = expenses.get(id);
  if (!expense) return null;
  
  const updatedExpense = {
    ...expense,
    ...updates,
    id, // Preserve original ID
    groupId: expense.groupId, // Preserve original groupId
    createdAt: expense.createdAt, // Preserve original createdAt
    updatedAt: new Date().toISOString()
  };
  
  expenses.set(id, updatedExpense);
  return updatedExpense;
}
