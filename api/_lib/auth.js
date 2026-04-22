/**
 * Verify JWT from Authorization: Bearer <token> and return the user id from the payload.
 * Use this so APIs never trust client-supplied userId for authorization.
 * Returns null and sends 401 if missing/invalid token.
 */
const jwt = require('jsonwebtoken');

function getUserIdFromRequest(req, res) {
  const secret = process.env.JWT_SECRET || 'SECRET_KEY_123';

  const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ message: 'Authorization required' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret);
    const id = decoded && (decoded.id || decoded.userId || decoded.sub);
    if (!id) {
      res.status(401).json({ message: 'Invalid token' });
      return null;
    }
    return String(id);
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
    return null;
  }
}

/**
 * Require valid JWT and that the token's user id matches the requested resource id.
 * Use for routes like GET/PUT /api/users/:id so a user can only access their own data.
 * Returns authUserId (from token) or null (and sends 401/403).
 */
function requireAuthMatchId(req, res, resourceId) {
  const authUserId = getUserIdFromRequest(req, res);
  if (!authUserId) return null;
  const id = resourceId ? String(resourceId) : null;
  if (id && authUserId !== id) {
    res.status(403).json({ message: 'Forbidden' });
    return null;
  }
  return authUserId;
}

/**
 * Require valid JWT. Returns userId or null (and sends 401).
 * Use with requireAdminRole: load user by userId and check user.role === 'admin'.
 */
function requireAuth(req, res) {
  const userId = getUserIdFromRequest(req, res);
  return userId || null;
}

module.exports = { getUserIdFromRequest, requireAuthMatchId, requireAuth };
