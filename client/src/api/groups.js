const API_BASE = 'http://localhost:3001';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('splitco_token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Create a new group
export async function createGroup(name) {
  return request('/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// Get all user's groups
export async function getGroups() {
  return request('/groups');
}

// Get group details
export async function getGroupDetails(groupId) {
  return request(`/groups/${groupId}`);
}

// Join a group via invite
export async function joinGroup(groupId) {
  return request(`/groups/${groupId}/join`, {
    method: 'POST',
  });
}

// Create or get direct split
export async function createDirectSplit(phone) {
  return request('/groups/direct', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

// Create an expense in a group
export async function createExpense(groupId, { amount, description, splits, paidBy }) {
  return request(`/groups/${groupId}/expenses`, {
    method: 'POST',
    body: JSON.stringify({ amount, description, splits, paidBy }),
  });
}

// Get expenses for a group
export async function getExpenses(groupId) {
  return request(`/groups/${groupId}/expenses`);
}

// Get balances for a group
export async function getGroupBalances(groupId) {
  return request(`/groups/${groupId}/balances`);
}

// Create a settlement
export async function createSettlement(groupId, { fromUserId, toUserId, amount, method = 'manual' }) {
  return request(`/groups/${groupId}/settlements`, {
    method: 'POST',
    body: JSON.stringify({ fromUserId, toUserId, amount, method }),
  });
}

// Get settlements for a group
export async function getSettlements(groupId) {
  return request(`/groups/${groupId}/settlements`);
}

// Delete an expense
export async function deleteExpense(groupId, expenseId) {
  return request(`/groups/${groupId}/expenses/${expenseId}`, {
    method: 'DELETE',
  });
}
