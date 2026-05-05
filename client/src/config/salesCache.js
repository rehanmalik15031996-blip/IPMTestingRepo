// Module-level cache for the Sales pipeline page so navigating away and back
// is instant. Mirrors the dashboard cache pattern: cache-first, revalidate
// in the background, invalidate explicitly on mutations that affect deals.

const CACHE_TTL_MS = 60 * 1000; // 1 minute — same as dashboardCache

let _cache = {};

export function getSalesCache(userId) {
    const entry = _cache[userId];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        delete _cache[userId];
        return null;
    }
    return entry.data;
}

export function setSalesCache(userId, data) {
    _cache[userId] = { data, timestamp: Date.now() };
}

export const SALES_INVALIDATED_KEY = 'salesInvalidated';

/**
 * Invalidate cache for a user. Call after mutations that affect the Sales
 * pipeline — e.g. flipping a listing to "Under Negotiation" creates a deal,
 * editing negotiation details refreshes a deal, etc.
 *
 * Uses localStorage so the signal crosses tabs.
 */
export function invalidateSalesCache(userId) {
    if (userId) {
        try { localStorage.setItem(SALES_INVALIDATED_KEY, String(userId)); } catch (_) {}
        delete _cache[userId];
    } else {
        _cache = {};
    }
}

export function takeSalesInvalidated() {
    try {
        const id = localStorage.getItem(SALES_INVALIDATED_KEY);
        localStorage.removeItem(SALES_INVALIDATED_KEY);
        return id || null;
    } catch (_) {
        return null;
    }
}
