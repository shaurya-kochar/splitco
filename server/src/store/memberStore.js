// In-memory group member store
// In production, replace with database
const memberStore = new Map(); // key: `${groupId}:${userId}`

export function addMember(groupId, userId) {
  const key = `${groupId}:${userId}`;
  if (memberStore.has(key)) {
    return memberStore.get(key);
  }
  
  const member = {
    groupId,
    userId,
    joinedAt: new Date().toISOString()
  };
  memberStore.set(key, member);
  return member;
}

export function isMember(groupId, userId) {
  return memberStore.has(`${groupId}:${userId}`);
}

export function getGroupMembers(groupId) {
  const members = [];
  for (const [key, member] of memberStore.entries()) {
    if (member.groupId === groupId) {
      members.push(member);
    }
  }
  return members;
}

export function getUserGroups(userId) {
  const groups = [];
  for (const member of memberStore.values()) {
    if (member.userId === userId) {
      groups.push(member.groupId);
    }
  }
  return groups;
}

export function findDirectGroup(userId1, userId2) {
  // Find a direct group that contains exactly these two users
  const user1Groups = getUserGroups(userId1);
  
  for (const groupId of user1Groups) {
    const members = getGroupMembers(groupId);
    if (members.length === 2) {
      const memberIds = members.map(m => m.userId);
      if (memberIds.includes(userId1) && memberIds.includes(userId2)) {
        return groupId;
      }
    }
  }
  return null;
}
