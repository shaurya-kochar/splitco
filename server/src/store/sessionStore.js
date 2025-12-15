// In-memory session store
// In production, replace with Redis or database
const sessionStore = new Map();

export function createSession(userId) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  sessionStore.set(token, {
    userId,
    expiresAt,
    createdAt: new Date()
  });
  
  return { token, expiresAt };
}

export function getSession(token) {
  const session = sessionStore.get(token);
  if (!session) return null;
  
  if (new Date() > session.expiresAt) {
    sessionStore.delete(token);
    return null;
  }
  
  return session;
}

export function deleteSession(token) {
  sessionStore.delete(token);
}
