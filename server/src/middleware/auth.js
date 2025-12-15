import { getSession } from '../store/sessionStore.js';
import { findUserById } from '../store/userStore.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  const session = getSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Session expired'
    });
  }

  const user = findUserById(session.userId);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User not found'
    });
  }

  req.user = user;
  next();
}
