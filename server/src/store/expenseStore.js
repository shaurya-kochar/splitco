// In-memory expense store
// Production would use a database

const expenses = new Map();

export function createExpense({ groupId, amount, paidBy, description }) {
  const id = crypto.randomUUID();
  const expense = {
    id,
    groupId,
    amount,
    paidBy,
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
