// In-memory group store
// In production, replace with database
const groupStore = new Map();

export function createGroup({ name, type, createdBy }) {
  const group = {
    id: crypto.randomUUID(),
    name,
    type, // 'group' or 'direct'
    createdBy,
    createdAt: new Date().toISOString()
  };
  groupStore.set(group.id, group);
  return group;
}

export function getGroupById(groupId) {
  return groupStore.get(groupId);
}

export function getAllGroups() {
  return Array.from(groupStore.values());
}
