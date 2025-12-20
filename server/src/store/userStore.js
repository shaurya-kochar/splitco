// In-memory user store
// In production, replace with database
const userStore = new Map();
const userByIdIndex = new Map(); // Index for lookup by ID

export function findUserByPhone(phone) {
  return userStore.get(phone);
}

export function findUserById(userId) {
  return userByIdIndex.get(userId);
}

export function createUser(phone) {
  const user = {
    id: crypto.randomUUID(),
    phone,
    name: '',
    email: null,
    createdAt: new Date().toISOString()
  };
  userStore.set(phone, user);
  userByIdIndex.set(user.id, user);
  return user;
}

export function findOrCreateUser(phone) {
  const existing = findUserByPhone(phone);
  if (existing) {
    // Ensure user is indexed by ID (may have been created before index existed)
    if (!userByIdIndex.has(existing.id)) {
      userByIdIndex.set(existing.id, existing);
    }
    return existing;
  }
  return createUser(phone);
}
