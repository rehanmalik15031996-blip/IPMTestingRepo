// Module-level cache for the Marketing tab so navigating away and back is
// instant. The "networks" endpoint hits the external Outstand API which can
// be slow on every load — caching its result (plus the connected-accounts
// list) and revalidating in the background removes the perceptible delay.
//
// Same pattern as dashboardCache / salesCache: cache-first, revalidate in
// background, invalidate explicitly on mutations (connect / disconnect /
// sync-accounts).

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — networks list rarely changes.

let _cache = {};

export function getMarketingCache(userId) {
    const entry = _cache[userId];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        delete _cache[userId];
        return null;
    }
    return entry.data;
}

export function setMarketingCache(userId, data) {
    _cache[userId] = { data, timestamp: Date.now() };
}

export const MARKETING_INVALIDATED_KEY = 'marketingInvalidated';

/**
 * Drop the cache for a user (or all users when no id is provided). Call this
 * after any mutation that affects the connected-accounts list — connecting
 * a new platform, disconnecting one, or running a sync.
 *
 * Uses localStorage so the signal crosses tabs.
 */
export function invalidateMarketingCache(userId) {
    if (userId) {
        try { localStorage.setItem(MARKETING_INVALIDATED_KEY, String(userId)); } catch (_) {}
        delete _cache[userId];
    } else {
        _cache = {};
    }
}

export function takeMarketingInvalidated() {
    try {
        const id = localStorage.getItem(MARKETING_INVALIDATED_KEY);
        localStorage.removeItem(MARKETING_INVALIDATED_KEY);
        return id || null;
    } catch (_) {
        return null;
    }
}
