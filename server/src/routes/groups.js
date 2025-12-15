import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createGroup, getGroupById, getAllGroups } from '../store/groupStore.js';
import { addMember, isMember, getGroupMembers, getUserGroups, findDirectGroup } from '../store/memberStore.js';
import { findUserByPhone, findUserById, findOrCreateUser } from '../store/userStore.js';
import { createExpense, getExpensesByGroup } from '../store/expenseStore.js';
import { createExpenseSplits, getSplitsByExpenses, validateSplits } from '../store/expenseSplitStore.js';

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
      
      return {
        id: group.id,
        name: group.name,
        displayName,
        type: group.type,
        memberCount: members.length,
        createdAt: group.createdAt,
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
    const { amount, description, splits } = req.body;
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

    // Create expense
    const expense = createExpense({
      groupId,
      amount,
      paidBy: userId,
      description: description?.trim() || null
    });

    // Create splits
    const splitRecords = createExpenseSplits(expense.id, splits);

    // Get payer details
    const payer = findUserById(userId);

    res.json({
      success: true,
      expense: {
        id: expense.id,
        groupId: expense.groupId,
        amount: expense.amount,
        paidBy: {
          id: userId,
          phone: payer?.phone || 'Unknown',
          name: payer?.name || ''
        },
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

export default router;
