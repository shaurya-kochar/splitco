import { useState, useEffect } from 'react';

/**
 * Custom hook to manage expense calculation logic
 * Handles split distribution, payer management, and validation
 */
export function useExpenseCalculator(group, amount, user) {
  const [payers, setPayers] = useState([]);
  const [splitMembers, setSplitMembers] = useState([]);

  // Initialize payers and split members when group/user changes
  useEffect(() => {
    if (group && user) {
      // Initialize with current user as sole payer
      const currentUserMember =
        group.members.find((m) => m.id === user?.id) || group.members[0];
      setPayers([{ ...currentUserMember, amount: parseFloat(amount) || 0 }]);

      // Initialize all members in split with equal shares
      const numAmount = parseFloat(amount) || 0;
      const equalShare =
        numAmount > 0
          ? Number((numAmount / group.members.length).toFixed(2))
          : 0;
      setSplitMembers(
        group.members.map((member) => ({
          ...member,
          included: true,
          share: equalShare,
          isFixed: false
        }))
      );
    }
  }, [group, user, amount]);

  // Recalculate splits when amount changes (only for non-fixed members)
  useEffect(() => {
    if (group && amount) {
      const numAmount = parseFloat(amount);
      if (numAmount > 0) {
        // Calculate total fixed shares
        const fixedTotal = splitMembers
          .filter(m => m.isFixed && m.included)
          .reduce((sum, m) => sum + m.share, 0);

        // Get non-fixed included members
        const nonFixedMembers = splitMembers.filter(m => !m.isFixed && m.included);
        
        if (nonFixedMembers.length > 0) {
          const remaining = numAmount - fixedTotal;
          const sharePerMember = remaining > 0 
            ? Number((remaining / nonFixedMembers.length).toFixed(2))
            : 0;

          setSplitMembers(prev =>
            prev.map(m =>
              !m.isFixed && m.included
                ? { ...m, share: sharePerMember }
                : m
            )
          );
        }

        // Update payer amounts if single payer
        if (payers.length === 1) {
          setPayers(prev => prev.map(p => ({ ...p, amount: numAmount })));
        }
      }
    }
  }, [amount, group]);

  // Toggle member inclusion in split
  const toggleMember = (memberId) => {
    setSplitMembers((prev) => {
      const updated = prev.map((m) =>
        m.id === memberId ? { ...m, included: !m.included, isFixed: false } : m
      );

      // Recalculate equal split for non-fixed members
      const numAmount = parseFloat(amount);
      if (numAmount > 0) {
        const includedCount = updated.filter((m) => m.included).length;
        if (includedCount > 0) {
          const equalShare = Number((numAmount / includedCount).toFixed(2));
          return updated.map((m) => ({
            ...m,
            share: m.included ? equalShare : 0,
            isFixed: false // Reset fixed flag when toggling
          }));
        }
      }
      return updated;
    });
  };

  // Update individual split amount with smart distribution
  const updateSplitAmount = (memberId, newAmount) => {
    const val = parseFloat(newAmount) || 0;
    const total = parseFloat(amount) || 0;

    // Update the specific member and mark as manually edited
    setSplitMembers(prev => {
      const updated = prev.map(m =>
        m.id === memberId ? { ...m, share: val, isFixed: true } : m
      );

      // Smart distribution: Auto-adjust other non-fixed members
      const fixedTotal = updated
        .filter(m => m.isFixed && m.included)
        .reduce((sum, m) => sum + m.share, 0);

      const remaining = total - fixedTotal;
      const nonFixedMembers = updated.filter(m => !m.isFixed && m.included);

      if (nonFixedMembers.length > 0 && remaining >= 0) {
        const sharePerMember = Number((remaining / nonFixedMembers.length).toFixed(2));
        
        // Distribute remaining amount
        return updated.map(m => {
          if (!m.isFixed && m.included) {
            return { ...m, share: sharePerMember };
          }
          return m;
        });
      }

      return updated;
    });
  };

  // Distribute splits equally
  const distributeSplitsEqually = () => {
    const numAmount = parseFloat(amount) || 0;
    const includedMembers = splitMembers.filter(m => m.included);
    if (numAmount > 0 && includedMembers.length > 0) {
      const equalShare = Number((numAmount / includedMembers.length).toFixed(2));
      setSplitMembers(prev => prev.map(m => ({
        ...m,
        share: m.included ? equalShare : 0,
        isFixed: false // Reset all fixed flags
      })));
    }
  };

  // Toggle payer
  const togglePayer = (memberId) => {
    setPayers(prev => {
      const exists = prev.find(p => p.id === memberId);
      if (exists) {
        return prev.filter(p => p.id !== memberId);
      } else {
        const member = group.members.find(m => m.id === memberId);
        return [...prev, { ...member, amount: 0 }];
      }
    });
  };

  // Update payer amount
  const updatePayerAmount = (payerId, newAmount) => {
    setPayers(prev => prev.map(p =>
      p.id === payerId ? { ...p, amount: Number(newAmount) || 0 } : p
    ));
  };

  // Distribute payments equally
  const distributePaymentsEqually = () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount > 0 && payers.length > 0) {
      const equalAmount = Number((numAmount / payers.length).toFixed(2));
      setPayers(prev => prev.map(p => ({ ...p, amount: equalAmount })));
    }
  };

  // Validation functions
  const validateExpense = () => {
    const numAmount = parseFloat(amount);
    
    if (!numAmount || numAmount <= 0) {
      return { valid: false, error: 'Enter a valid amount' };
    }

    if (payers.length === 0) {
      return { valid: false, error: 'Select at least one payer' };
    }

    const totalPaid = payers.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - numAmount) > 0.01) {
      return { valid: false, error: `Total paid (₹${totalPaid.toFixed(2)}) must equal expense amount` };
    }

    const includedMembers = splitMembers.filter((m) => m.included);
    if (includedMembers.length === 0) {
      return { valid: false, error: 'Select at least one person to split with' };
    }

    const totalSplit = includedMembers.reduce((sum, m) => sum + m.share, 0);
    if (Math.abs(totalSplit - numAmount) > 0.01) {
      return { valid: false, error: `Total split (₹${totalSplit.toFixed(2)}) must equal expense amount` };
    }

    return { valid: true };
  };

  // Get expense data for submission
  const getExpenseData = () => {
    const includedMembers = splitMembers.filter((m) => m.included);
    
    const splits = includedMembers.map((m) => ({
      userId: m.id,
      shareAmount: m.share,
    }));

    const paidByData = payers.length === 1
      ? { mode: 'single', userId: payers[0].id }
      : {
          mode: 'multiple',
          payments: payers.map(p => ({ userId: p.id, amount: p.amount }))
        };

    return { splits, paidByData };
  };

  return {
    payers,
    splitMembers,
    toggleMember,
    updateSplitAmount,
    distributeSplitsEqually,
    togglePayer,
    updatePayerAmount,
    distributePaymentsEqually,
    validateExpense,
    getExpenseData
  };
}
