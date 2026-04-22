// Simple in-memory cache for dashboard data to prevent redundant API calls
// when navigating between dashboard sections (Portfolio, CRM, Agents, etc.)

const CACHE_TTL_MS = 60 * 1000; // 1 minute cache TTL

let _cache = {};

/**
 * Get cached dashboard data for a user.
 * Returns null if cache is missing or expired.
 */
export function getDashboardCache(userId) {
  const entry = _cache[userId];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    delete _cache[userId];
    return null;
  }
  return entry.data;
}

/**
 * Store dashboard data in cache.
 */
export function setDashboardCache(userId, data) {
  _cache[userId] = {
    data,
    timestamp: Date.now()
  };
}

export const DASHBOARD_INVALIDATED_KEY = 'dashboardInvalidated';

/**
 * Invalidate cache for a user (call after mutations like add-agent, add-lead, property status change, etc.)
 * Uses localStorage so the flag is visible across tabs (e.g. update in one tab, dashboard in another).
 */
export function invalidateDashboardCache(userId) {
  if (userId) {
    try {
      localStorage.setItem(DASHBOARD_INVALIDATED_KEY, String(userId));
    } catch (_) {}
    delete _cache[userId];
  } else {
    _cache = {};
  }
}

/**
 * Check and clear the "dashboard was invalidated" flag (so Dashboard can refetch on mount/focus).
 */
export function takeDashboardInvalidated() {
  try {
    const id = localStorage.getItem(DASHBOARD_INVALIDATED_KEY);
    localStorage.removeItem(DASHBOARD_INVALIDATED_KEY);
    return id || null;
  } catch (_) {
    return null;
  }
}
