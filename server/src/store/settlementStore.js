// In-memory settlement store
// In production, replace with database
const settlementStore = new Map();

export function createSettlement({ groupId, fromUserId, toUserId, amount, method = 'manual' }) {
  const id = crypto.randomUUID();
  const settlement = {
    id,
    groupId,
    fromUserId,
    toUserId,
    amount,
    method,
    createdAt: new Date().toISOString()
  };

  settlementStore.set(id, settlement);
  return settlement;
}

export function getGroupSettlements(groupId) {
  const results = [];
  for (const settlement of settlementStore.values()) {
    if (settlement.groupId === groupId) {
      results.push(settlement);
    }
  }
  // Sort newest first
  return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function deleteSettlement(settlementId) {
  return settlementStore.delete(settlementId);
}

export function getSettlementById(settlementId) {
  return settlementStore.get(settlementId) || null;
}

export function updateSettlement(settlementId, updates) {
  const settlement = settlementStore.get(settlementId);
  if (!settlement) return null;
  
  const updatedSettlement = {
    ...settlement,
    ...updates,
    id: settlement.id, // Preserve original ID
    groupId: settlement.groupId, // Preserve original groupId
    createdAt: settlement.createdAt, // Preserve original createdAt
    updatedAt: new Date().toISOString()
  };
  
  settlementStore.set(settlementId, updatedSettlement);
  return updatedSettlement;
}
