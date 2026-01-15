import cron from 'node-cron';
import { getExpensesByGroup, createExpense } from '../store/expenseStore.js';
import { getAllGroups } from '../store/groupStore.js';
import { createExpenseSplits, getSplitsByExpenses } from '../store/expenseSplitStore.js';
import { logUserAction } from './devLogger.js';

/**
 * Check and create recurring expenses that are due
 */
export function checkRecurringExpenses() {
  try {
    const now = new Date();
    const groups = getAllGroups();
    let createdCount = 0;

    for (const group of groups) {
      const expenses = getExpensesByGroup(group.id);
      
      for (const expense of expenses) {
        // Only process expenses with recurring data
        if (!expense.recurringData || !expense.recurringData.frequency) {
          continue;
        }

        const recurringData = expense.recurringData;
        const nextDue = new Date(recurringData.nextDueDate);

        // Check if expense is due
        if (nextDue <= now) {
          // Get the original splits
          const splitsMap = getSplitsByExpenses([expense.id]);
          const originalSplits = splitsMap.get(expense.id) || [];

          // Create the new recurring expense
          const newExpense = createExpense({
            groupId: expense.groupId,
            amount: expense.amount,
            paidBy: expense.paidBy,
            paidByData: expense.paidByData,
            description: expense.description,
            category: expense.category
          });

          // Copy splits
          const newSplits = originalSplits.map(split => ({
            userId: split.userId,
            shareAmount: split.shareAmount
          }));
          createExpenseSplits(newExpense.id, newSplits);

          // Calculate next due date
          const nextDueDate = calculateNextDueDate(nextDue, recurringData.frequency);
          
          // Update the original expense's next due date
          expense.recurringData.nextDueDate = nextDueDate.toISOString();
          expense.recurringData.lastCreated = now.toISOString();

          createdCount++;

          // Log the recurring expense creation
          logUserAction('RECURRING_EXPENSE_CREATED', expense.paidBy, {
            originalExpenseId: expense.id,
            newExpenseId: newExpense.id,
            frequency: recurringData.frequency,
            nextDueDate: nextDueDate.toISOString()
          });

          console.log(`✓ Created recurring expense: ${expense.description} (${recurringData.frequency})`);
        }
      }
    }

    if (createdCount > 0) {
      console.log(`✓ Recurring expenses check: Created ${createdCount} expense(s)`);
    }

    return createdCount;
  } catch (error) {
    console.error('Error checking recurring expenses:', error.message);
    return 0;
  }
}

/**
 * Calculate the next due date based on frequency
 */
function calculateNextDueDate(currentDue, frequency) {
  const nextDue = new Date(currentDue);

  switch (frequency) {
    case 'daily':
      nextDue.setDate(nextDue.getDate() + 1);
      break;
    case 'weekly':
      nextDue.setDate(nextDue.getDate() + 7);
      break;
    case 'monthly':
      nextDue.setMonth(nextDue.getMonth() + 1);
      break;
    case 'yearly':
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      break;
    default:
      nextDue.setMonth(nextDue.getMonth() + 1); // Default to monthly
  }

  return nextDue;
}

/**
 * Start the recurring expenses cron job
 * Runs every hour to check for due expenses
 */
export function startRecurringExpensesCron() {
  console.log('📅 Starting recurring expenses scheduler...');
  
  // Run immediately on startup
  checkRecurringExpenses();

  // Schedule to run every hour
  cron.schedule('0 * * * *', () => {
    console.log('⏰ Running scheduled recurring expenses check...');
    checkRecurringExpenses();
  });

  console.log('✓ Recurring expenses scheduler started (runs every hour)');
}
