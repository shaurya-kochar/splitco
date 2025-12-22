import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createGroup, getGroupById, getAllGroups } from '../store/groupStore.js';
import { addMember, isMember, getGroupMembers, getUserGroups, findDirectGroup } from '../store/memberStore.js';
import { findUserByPhone, findUserById, findOrCreateUser } from '../store/userStore.js';
import { createExpense, getExpensesByGroup, getExpenseById, deleteExpense, updateExpense } from '../store/expenseStore.js';
import { createExpenseSplits, getSplitsByExpenses, validateSplits, deleteSplitsForExpense } from '../store/expenseSplitStore.js';
import { calculateGroupBalances, getSettlementPlan } from '../store/balanceCalculator.js';
import { createSettlement, getGroupSettlements, deleteSettlement, getSettlementById, updateSettlement } from '../store/settlementStore.js';
import { logExpense, logSettlement, logBalances, logGroupOperation, logAuth, logUserAction, logError } from '../utils/devLogger.js';

const router = Router();

// POST /groups - Create a new group
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Group name is required'
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Group name must be 50 characters or less'
      });
    }

    // Create group
    const group = createGroup({
      name: name.trim(),
      type: 'group',
      createdBy: userId
    });

    // Add creator as member
    addMember(group.id, userId);

    res.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        type: group.type,
        createdAt: group.createdAt,
        memberCount: 1
      }
    });

  } catch (error) {
    console.error('Create group error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create group'
    });
  }
});

// GET /groups - Get user's groups
router.get('/', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const groupIds = getUserGroups(userId);
    
    const groups = groupIds.map(groupId => {
      const group = getGroupById(groupId);
      if (!group) return null;
      
      const members = getGroupMembers(groupId);
      
      // Get expenses for this group
      const expenseRecords = getExpensesByGroup(groupId);
      const expenseIds = expenseRecords.map(e => e.id);
      const splitsMap = getSplitsByExpenses(expenseIds);
      
      // Build expenses with splits
      const expenses = expenseRecords.map(expense => ({
        ...expense,
        splits: splitsMap.get(expense.id) || []
      }));
      
      // Get settlements
      const settlementRecords = getGroupSettlements(groupId);
      
      // Calculate balances
      const balances = calculateGroupBalances(expenses, settlementRecords);
      const currentUserBalance = balances.get(userId) ? Number(balances.get(userId).balance.toFixed(2)) : 0;
      
      // Get who owes/owed by current user
      const currentUserBalanceData = balances.get(userId);
      let owesTo = null;
      let owedBy = null;
      
      if (currentUserBalanceData) {
        // If current user owes money (negative balance)
        if (currentUserBalance < 0) {
          const owesEntries = Array.from(currentUserBalanceData.owes.entries());
          if (owesEntries.length > 0) {
            // Get the person they owe the most to
            const [creditorId, amount] = owesEntries.sort((a, b) => b[1] - a[1])[0];
            const creditor = findUserById(creditorId);
            owesTo = {
              userId: creditorId,
              name: creditor?.name || creditor?.phone || 'Unknown',
              amount: Number(amount.toFixed(2))
            };
          }
        }
        // If current user is owed money (positive balance)
        else if (currentUserBalance > 0) {
          const owedByEntries = Array.from(currentUserBalanceData.owedBy.entries());
          if (owedByEntries.length > 0) {
            // Get the person who owes them the most
            const [debtorId, amount] = owedByEntries.sort((a, b) => b[1] - a[1])[0];
            const debtor = findUserById(debtorId);
            owedBy = {
              userId: debtorId,
              name: debtor?.name || debtor?.phone || 'Unknown',
              amount: Number(amount.toFixed(2))
            };
          }
        }
      }
      
      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Get recent expenses (last 5)
      const recentExpenses = expenses
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(exp => {
          const payer = findUserById(exp.paidBy);
          
          // Determine if the current user has paid their share
          // An expense is considered "paid" by the user if:
          // 1. They are the payer, OR
          // 2. Their balance for this specific expense is settled (they've paid back their share)
          // For simplicity, we'll check if the user is involved in the expense and has positive/zero balance
          const userSplit = exp.splits?.find(s => s.userId === userId);
          const userIsPayer = exp.paidBy === userId;
          
          // If user is the payer, it's "paid" (they paid upfront)
          // If user has a split and the group balance shows they don't owe money for this specific expense,
          // we'll consider it paid. For now, we'll use a simplified logic:
          // - If user is payer: paid
          // - If user owes money (negative balance) in the group: pending
          // - If user has positive balance or zero: paid
          const isPaid = userIsPayer || currentUserBalance >= 0;
          
          return {
            id: exp.id,
            description: exp.description,
            amount: exp.amount,
            createdAt: exp.createdAt,
            isPaid: isPaid,
            paidBy: {
              id: exp.paidBy,
              name: payer?.name || '',
              phone: payer?.phone || ''
            }
          };
        });
      
      // For direct groups, get the other person's info
      let displayName = group.name;
      let otherUser = null;
      
      if (group.type === 'direct') {
        const otherMember = members.find(m => m.userId !== userId);
        if (otherMember) {
          otherUser = findUserById(otherMember.userId);
          displayName = otherUser?.name || otherUser?.phone || 'Unknown';
        }
      }
      
      // Get member details
      const memberDetails = members.map(m => {
        const user = findUserById(m.userId);
        return {
          id: m.userId,
          phone: user?.phone || 'Unknown',
          name: user?.name || '',
          joinedAt: m.joinedAt
        };
      });
      
      return {
        id: group.id,
        name: group.name,
        displayName,
        type: group.type,
        memberCount: members.length,
        createdAt: group.createdAt,
        currentUserBalance,
        owesTo,
        owedBy,
        expenseCount: expenses.length,
        totalExpenses: Number(totalExpenses.toFixed(2)),
        recentExpenses,
        members: memberDetails,
        ...(otherUser && { otherUser: { id: otherUser.id, phone: otherUser.phone, name: otherUser.name } })
      };
    }).filter(Boolean);

    res.json({
      success: true,
      groups
    });

  } catch (error) {
    console.error('Get groups error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups'
    });
  }
});

// GET /groups/:groupId - Get group details
router.get('/:groupId', authMiddleware, (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    const members = getGroupMembers(groupId);
    const memberDetails = members.map(m => {
      const user = findUserById(m.userId);
      return {
        id: m.userId,
        phone: user?.phone || 'Unknown',
        name: user?.name || '',
        joinedAt: m.joinedAt
      };
    });

    // For direct groups, get display name from other user
    let displayName = group.name;
    if (group.type === 'direct') {
      const otherMember = members.find(m => m.userId !== userId);
      if (otherMember) {
        const otherUser = findUserById(otherMember.userId);
        displayName = otherUser?.name || otherUser?.phone || 'Unknown';
      }
    }

    res.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        displayName,
        type: group.type,
        createdAt: group.createdAt,
        members: memberDetails
      }
    });

  } catch (error) {
    console.error('Get group details error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch group details'
    });
  }
});

// POST /groups/:groupId/join - Join a group via invite
router.post('/:groupId/join', authMiddleware, (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Cannot join direct groups via invite
    if (group.type === 'direct') {
      return res.status(400).json({
        success: false,
        error: 'Cannot join this type of group'
      });
    }

    // Check if already a member
    if (isMember(groupId, userId)) {
      return res.json({
        success: true,
        message: 'Already a member',
        group: {
          id: group.id,
          name: group.name,
          type: group.type
        }
      });
    }

    // Add as member
    addMember(groupId, userId);

    const members = getGroupMembers(groupId);

    res.json({
      success: true,
      message: 'Joined successfully',
      group: {
        id: group.id,
        name: group.name,
        type: group.type,
        memberCount: members.length
      }
    });

  } catch (error) {
    console.error('Join group error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to join group'
    });
  }
});

// POST /direct - Create or get direct split
router.post('/direct', authMiddleware, (req, res) => {
  try {
    const { phone } = req.body;
    const currentUserId = req.user.id;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Validate phone format
    const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`;
    if (!/^\+91\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }

    // Cannot create direct with self
    if (normalizedPhone === req.user.phone) {
      return res.status(400).json({
        success: false,
        error: 'Cannot create a split with yourself'
      });
    }

    // Find or create the other user
    const otherUser = findOrCreateUser(normalizedPhone);

    // Check if direct group already exists
    const existingGroupId = findDirectGroup(currentUserId, otherUser.id);
    if (existingGroupId) {
      const group = getGroupById(existingGroupId);
      return res.json({
        success: true,
        isNew: false,
        group: {
          id: group.id,
          name: group.name,
          displayName: otherUser.name || otherUser.phone,
          type: group.type,
          otherUser: {
            id: otherUser.id,
            phone: otherUser.phone,
            name: otherUser.name
          }
        }
      });
    }

    // Create new direct group
    const group = createGroup({
      name: `${req.user.phone} & ${otherUser.phone}`,
      type: 'direct',
      createdBy: currentUserId
    });

    // Add both users as members
    addMember(group.id, currentUserId);
    addMember(group.id, otherUser.id);

    res.json({
      success: true,
      isNew: true,
      group: {
        id: group.id,
        name: group.name,
        displayName: otherUser.name || otherUser.phone,
        type: group.type,
        otherUser: {
          id: otherUser.id,
          phone: otherUser.phone,
          name: otherUser.name
        }
      }
    });

  } catch (error) {
    console.error('Create direct error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create split'
    });
  }
});

// POST /groups/:groupId/expenses - Create an expense
router.post('/:groupId/expenses', authMiddleware, (req, res) => {
  try {
    const { groupId } = req.params;
    const { amount, description, splits, paidBy } = req.body;
    const userId = req.user.id;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    if (amount > 10000000) {
      return res.status(400).json({
        success: false,
        error: 'Amount exceeds maximum limit'
      });
    }

    // Validate splits
    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Splits are required'
      });
    }

    // Validate splits sum to amount
    if (!validateSplits(splits, amount)) {
      return res.status(400).json({
        success: false,
        error: 'Split amounts must sum to total amount'
      });
    }

    // Validate all split users are members
    const members = getGroupMembers(groupId);
    const memberIds = new Set(members.map(m => m.userId));
    for (const split of splits) {
      if (!memberIds.has(split.userId)) {
        return res.status(400).json({
          success: false,
          error: 'All split users must be group members'
        });
      }
    }

    // Handle paidBy - default to current user if not provided
    let paidByUserId = userId;
    let paidByData = { mode: 'single', userId };
    
    if (paidBy) {
      if (paidBy.mode === 'single') {
        paidByUserId = paidBy.userId;
        paidByData = paidBy;
      } else if (paidBy.mode === 'multiple') {
        // Validate multiple payers
        const paymentSum = paidBy.payments.reduce((sum, p) => sum + p.amount, 0);
        if (Math.abs(paymentSum - amount) >= 0.01) {
          return res.status(400).json({
            success: false,
            error: 'Payment amounts must sum to total amount'
          });
        }
        paidByUserId = paidBy.payments[0].userId; // Use first payer as primary
        paidByData = paidBy;
      }
    }

    // Create expense
    const expense = createExpense({
      groupId,
      amount,
      paidBy: paidByUserId,
      paidByData: JSON.stringify(paidByData), // Store full payment data
      description: description?.trim() || null
    });

    // Create splits
    const splitRecords = createExpenseSplits(expense.id, splits);

    // Log expense in dev mode
    const groupMembers = getGroupMembers(groupId);
    logExpense(expense, splits, paidByData, groupMembers, userId);

    // Get payer details
    const payer = findUserById(paidByUserId);

    res.json({
      success: true,
      expense: {
        id: expense.id,
        groupId: expense.groupId,
        amount: expense.amount,
        paidBy: {
          id: paidByUserId,
          phone: payer?.phone || 'Unknown',
          name: payer?.name || ''
        },
        paidByData: paidByData,
        description: expense.description,
        createdAt: expense.createdAt,
        splits: splitRecords.map(split => ({
          userId: split.userId,
          shareAmount: split.shareAmount
        }))
      }
    });

  } catch (error) {
    console.error('Create expense error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create expense'
    });
  }
});

// GET /groups/:groupId/expenses - Get group expenses
router.get('/:groupId/expenses', authMiddleware, (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    // Get expenses
    const expenseRecords = getExpensesByGroup(groupId);
    const expenseIds = expenseRecords.map(e => e.id);
    
    // Get splits for all expenses
    const splitsMap = getSplitsByExpenses(expenseIds);

    // Build response with payer details and splits
    const expenses = expenseRecords.map(expense => {
      const payer = findUserById(expense.paidBy);
      const splits = splitsMap.get(expense.id) || [];
      
      return {
        id: expense.id,
        groupId: expense.groupId,
        amount: expense.amount,
        paidBy: {
          id: expense.paidBy,
          phone: payer?.phone || 'Unknown',
          name: payer?.name || ''
        },
        paidByData: expense.paidByData, // Include multi-payer data if present
        description: expense.description,
        createdAt: expense.createdAt,
        splits: splits.map(split => {
          const user = findUserById(split.userId);
          return {
            userId: split.userId,
            userName: user?.name || user?.phone || 'Unknown',
            shareAmount: split.shareAmount
          };
        })
      };
    });

    res.json({
      success: true,
      expenses
    });

  } catch (error) {
    console.error('Get expenses error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expenses'
    });
  }
});

// GET /groups/:groupId/balances - Get net balances for the group
router.get('/:groupId/balances', authMiddleware, (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    // Get all expenses with splits
    const expenseRecords = getExpensesByGroup(groupId);
    const expenseIds = expenseRecords.map(e => e.id);
    const splitsMap = getSplitsByExpenses(expenseIds);

    // Build expenses array with splits for calculation
    const expenses = expenseRecords.map(expense => ({
      ...expense,
      splits: splitsMap.get(expense.id) || []
    }));

    // Get settlements to factor into balance calculation
    const settlementRecords = getGroupSettlements(groupId);

    // Calculate balances (including settlements)
    const balances = calculateGroupBalances(expenses, settlementRecords);
    const settlements = getSettlementPlan(balances);

    // Build response with user details
    const balanceDetails = [];
    for (const [userId, data] of balances.entries()) {
      const user = findUserById(userId);
      
      const owesDetails = [];
      for (const [creditorId, amount] of data.owes.entries()) {
        const creditor = findUserById(creditorId);
        owesDetails.push({
          userId: creditorId,
          userName: creditor?.name || creditor?.phone || 'Unknown',
          amount: Number(amount.toFixed(2))
        });
      }
      
      const owedByDetails = [];
      for (const [debtorId, amount] of data.owedBy.entries()) {
        const debtor = findUserById(debtorId);
        owedByDetails.push({
          userId: debtorId,
          userName: debtor?.name || debtor?.phone || 'Unknown',
          amount: Number(amount.toFixed(2))
        });
      }
      
      balanceDetails.push({
        userId,
        userName: user?.name || user?.phone || 'Unknown',
        balance: Number(data.balance.toFixed(2)),
        owes: owesDetails,
        owedBy: owedByDetails
      });
    }

    // Log balances in dev mode
    logBalances(groupId, balanceDetails, userId);

    res.json({
      success: true,
      balances: balanceDetails,
      currentUserBalance: balances.get(userId) ? Number(balances.get(userId).balance.toFixed(2)) : 0
    });

  } catch (error) {
    console.error('Get balances error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate balances'
    });
  }
});

// POST /groups/:groupId/settlements - Record a settlement
router.post('/:groupId/settlements', authMiddleware, (req, res) => {
  try {
    const { groupId } = req.params;
    const { fromUserId, toUserId, amount, method = 'manual' } = req.body;
    const currentUserId = req.user.id;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate current user is a member
    if (!isMember(groupId, currentUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }
    
    // Validate fromUserId and toUserId are provided
    if (!fromUserId || !toUserId) {
      return res.status(400).json({
        success: false,
        error: 'Both fromUserId and toUserId are required'
      });
    }

    // Validate both users are members
    if (!isMember(groupId, fromUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Payer is not a member of this group'
      });
    }

    if (!isMember(groupId, toUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Recipient is not a member of this group'
      });
    }

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    // Cannot settle with yourself
    if (fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot settle with yourself'
      });
    }

    // Create settlement
    const settlement = createSettlement({
      groupId,
      fromUserId,
      toUserId,
      amount,
      method
    });

    // Get user details
    const fromUser = findUserById(fromUserId);
    const toUser = findUserById(toUserId);

    // Log settlement in dev mode
    logSettlement(settlement, fromUser, toUser, groupId, currentUserId);

    res.json({
      success: true,
      settlement: {
        id: settlement.id,
        groupId: settlement.groupId,
        from: {
          id: fromUserId,
          name: fromUser?.name || fromUser?.phone || 'Unknown'
        },
        to: {
          id: toUserId,
          name: toUser?.name || toUser?.phone || 'Unknown'
        },
        amount: settlement.amount,
        method: settlement.method,
        createdAt: settlement.createdAt
      }
    });

  } catch (error) {
    console.error('Create settlement error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to record settlement'
    });
  }
});

// GET /groups/:groupId/settlements - Get group settlements
router.get('/:groupId/settlements', authMiddleware, (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    // Get settlements
    const settlementRecords = getGroupSettlements(groupId);

    // Build response with user details
    const settlements = settlementRecords.map(settlement => {
      const fromUser = findUserById(settlement.fromUserId);
      const toUser = findUserById(settlement.toUserId);

      return {
        id: settlement.id,
        groupId: settlement.groupId,
        fromUser: {
          id: settlement.fromUserId,
          name: fromUser?.name || '',
          phone: fromUser?.phone || ''
        },
        toUser: {
          id: settlement.toUserId,
          name: toUser?.name || '',
          phone: toUser?.phone || ''
        },
        amount: settlement.amount,
        method: settlement.method,
        createdAt: settlement.createdAt
      };
    });

    res.json({
      success: true,
      settlements
    });

  } catch (error) {
    console.error('Get settlements error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settlements'
    });
  }
});

// DELETE /groups/:groupId/expenses/:expenseId - Delete an expense
router.delete('/:groupId/expenses/:expenseId', authMiddleware, (req, res) => {
  try {
    const { groupId, expenseId } = req.params;
    const userId = req.user.id;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    // Get expense
    const expense = getExpenseById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Verify expense belongs to this group
    if (expense.groupId !== groupId) {
      return res.status(403).json({
        success: false,
        error: 'Expense does not belong to this group'
      });
    }

    // Delete splits first
    deleteSplitsForExpense(expenseId);
    
    // Delete expense
    deleteExpense(expenseId);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete expense'
    });
  }
});

// PUT /groups/:groupId/expenses/:expenseId - Update an expense
router.put('/:groupId/expenses/:expenseId', authMiddleware, (req, res) => {
  try {
    const { groupId, expenseId } = req.params;
    const userId = req.user.id;
    const { amount, description, paidByData, paidBy, splits } = req.body;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    // Get expense
    const expense = getExpenseById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Verify expense belongs to this group
    if (expense.groupId !== groupId) {
      return res.status(403).json({
        success: false,
        error: 'Expense does not belong to this group'
      });
    }

    // Validate amount if provided
    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount'
        });
      }
    }

    // Update expense
    const updates = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (description !== undefined) updates.description = description;
    if (paidByData !== undefined) {
      // Parse paidByData if it's a string
      updates.paidByData = typeof paidByData === 'string' ? JSON.parse(paidByData) : paidByData;
    }
    if (paidBy !== undefined) updates.paidBy = paidBy;

    const updatedExpense = updateExpense(expenseId, updates);

    // Update splits if provided
    if (splits && Array.isArray(splits)) {
      // Validate splits
      const isValid = validateSplits(splits, updatedExpense.amount);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Split amounts must sum to total expense amount'
        });
      }

      // Delete old splits and create new ones
      deleteSplitsForExpense(expenseId);
      createExpenseSplits(expenseId, splits);
    }

    res.json({
      success: true,
      expense: updatedExpense
    });

  } catch (error) {
    console.error('Update expense error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update expense'
    });
  }
});

// DELETE /groups/:groupId/settlements/:settlementId - Delete a settlement
router.delete('/:groupId/settlements/:settlementId', authMiddleware, (req, res) => {
  try {
    const { groupId, settlementId } = req.params;
    const userId = req.user.id;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    // Get settlement
    const settlement = getSettlementById(settlementId);
    if (!settlement) {
      return res.status(404).json({
        success: false,
        error: 'Settlement not found'
      });
    }

    // Verify settlement belongs to this group
    if (settlement.groupId !== groupId) {
      return res.status(403).json({
        success: false,
        error: 'Settlement does not belong to this group'
      });
    }

    // Delete settlement
    deleteSettlement(settlementId);

    res.json({
      success: true,
      message: 'Settlement deleted successfully'
    });

  } catch (error) {
    console.error('Delete settlement error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete settlement'
    });
  }
});

// PUT /groups/:groupId/settlements/:settlementId - Update a settlement
router.put('/:groupId/settlements/:settlementId', authMiddleware, (req, res) => {
  try {
    const { groupId, settlementId } = req.params;
    const userId = req.user.id;
    const { amount, fromUserId, toUserId } = req.body;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    // Get settlement
    const settlement = getSettlementById(settlementId);
    if (!settlement) {
      return res.status(404).json({
        success: false,
        error: 'Settlement not found'
      });
    }

    // Verify settlement belongs to this group
    if (settlement.groupId !== groupId) {
      return res.status(403).json({
        success: false,
        error: 'Settlement does not belong to this group'
      });
    }

    // Validate amount if provided
    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount'
        });
      }
    }

    // Validate users if provided
    if (fromUserId && !isMember(groupId, fromUserId)) {
      return res.status(400).json({
        success: false,
        error: 'From user is not a member of this group'
      });
    }

    if (toUserId && !isMember(groupId, toUserId)) {
      return res.status(400).json({
        success: false,
        error: 'To user is not a member of this group'
      });
    }

    // Update settlement
    const updates = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (fromUserId !== undefined) updates.fromUserId = fromUserId;
    if (toUserId !== undefined) updates.toUserId = toUserId;

    const updatedSettlement = updateSettlement(settlementId, updates);

    res.json({
      success: true,
      settlement: updatedSettlement
    });

  } catch (error) {
    console.error('Update settlement error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update settlement'
    });
  }
});

// GET /groups/:groupId/export/csv - Export group data as CSV
router.get('/:groupId/export/csv', authMiddleware, (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    // Get all data
    const expenses = getExpensesByGroup(groupId);
    const settlements = getGroupSettlements(groupId);
    const members = getGroupMembers(groupId);

    // Build member map for name lookup
    const memberMap = new Map();
    for (const member of members) {
      const user = findUserById(member.userId);
      if (user) {
        memberMap.set(user.id, user.name || user.phone);
      }
    }

    // Create CSV content
    let csv = 'Group Name,' + group.name + '\n';
    csv += 'Export Date,' + new Date().toISOString() + '\n\n';

    // Expenses section
    csv += 'EXPENSES\n';
    csv += 'Date,Amount,Paid By,Description,Splits\n';
    
    for (const expense of expenses) {
      const date = new Date(expense.createdAt).toLocaleDateString();
      const paidByName = memberMap.get(expense.paidBy) || expense.paidBy;
      const desc = (expense.description || 'No description').replace(/,/g, ';');
      
      // Get splits info
      const expenseSplits = getSplitsByExpenses([expense.id]);
      const splitInfo = expenseSplits
        .map(s => `${memberMap.get(s.userId) || s.userId}: ₹${s.shareAmount}`)
        .join(' | ');
      
      csv += `${date},₹${expense.amount},${paidByName},"${desc}","${splitInfo}"\n`;
    }

    // Settlements section
    csv += '\nSETTLEMENTS\n';
    csv += 'Date,Amount,From,To\n';
    
    for (const settlement of settlements) {
      const date = new Date(settlement.createdAt).toLocaleDateString();
      const fromName = memberMap.get(settlement.fromUserId) || settlement.fromUserId;
      const toName = memberMap.get(settlement.toUserId) || settlement.toUserId;
      
      csv += `${date},₹${settlement.amount},${fromName},${toName}\n`;
    }

    // Send CSV
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="splitco_${group.name}_${Date.now()}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Export CSV error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to export CSV'
    });
  }
});

// GET /groups/:groupId/export/json - Export group data as JSON (useful for PDF generation on frontend)
router.get('/:groupId/export/json', authMiddleware, (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Validate group exists
    const group = getGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Validate user is a member
    if (!isMember(groupId, userId)) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this group'
      });
    }

    // Get all data
    const expenses = getExpensesByGroup(groupId);
    const settlements = getGroupSettlements(groupId);
    const members = getGroupMembers(groupId);
    const balances = calculateGroupBalances(expenses, settlements);

    // Build member details
    const memberDetails = members.map(m => {
      const user = findUserById(m.userId);
      return {
        id: m.userId,
        name: user?.name || user?.phone || 'Unknown',
        phone: user?.phone,
        joinedAt: m.joinedAt
      };
    });

    // Add splits to expenses
    const expensesWithSplits = expenses.map(expense => {
      const splits = getSplitsByExpenses([expense.id]);
      return {
        ...expense,
        splits: splits.map(s => {
          const user = findUserById(s.userId);
          return {
            userId: s.userId,
            userName: user?.name || user?.phone || 'Unknown',
            shareAmount: s.shareAmount
          };
        })
      };
    });

    // Add names to settlements
    const settlementsWithNames = settlements.map(settlement => {
      const fromUser = findUserById(settlement.fromUserId);
      const toUser = findUserById(settlement.toUserId);
      return {
        ...settlement,
        fromUserName: fromUser?.name || fromUser?.phone || 'Unknown',
        toUserName: toUser?.name || toUser?.phone || 'Unknown'
      };
    });

    // Convert balances to array
    const balanceArray = [];
    for (const [userId, data] of balances.entries()) {
      const user = findUserById(userId);
      balanceArray.push({
        userId,
        userName: user?.name || user?.phone || 'Unknown',
        balance: data.balance
      });
    }

    res.json({
      success: true,
      exportData: {
        group: {
          id: group.id,
          name: group.name,
          type: group.type,
          createdAt: group.createdAt
        },
        members: memberDetails,
        expenses: expensesWithSplits,
        settlements: settlementsWithNames,
        balances: balanceArray,
        exportDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Export JSON error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

export default router;
