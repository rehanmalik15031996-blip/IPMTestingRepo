/**
 * CMA report cache per lead (by userId) to avoid re-calling the listing metadata API.
 * Key: lead id, or lead email+name if no id.
 */

const STORAGE_KEY = (userId) => `crm_cma_cache_${userId || 'anon'}`;

export function getLeadCacheKey(lead) {
    if (!lead) return '';
    if (lead.id) return String(lead.id);
    if (lead._id) return String(lead._id);
    const email = (lead.email || '').trim();
    const name = (lead.name || '').trim();
    return `lead-${email}-${name}`;
}

export function getCMACache(userId) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY(userId));
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function getCachedMetadataForLead(userId, lead) {
    const key = getLeadCacheKey(lead);
    const entry = getCMACache(userId)[key];
    return entry?.metadata ?? null;
}

export function getCachedCustomPhotoForLead(userId, lead) {
    const key = getLeadCacheKey(lead);
    const entry = getCMACache(userId)[key];
    return entry?.customPhoto ?? null;
}

export function setCMACacheEntry(userId, lead, metadata) {
    const key = getLeadCacheKey(lead);
    if (!key) return;
    try {
        const cache = getCMACache(userId);
        const existing = cache[key] || {};
        cache[key] = { ...existing, generatedAt: Date.now(), metadata };
        localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(cache));
    } catch (_) {}
}

export function setCMACustomPhoto(userId, lead, dataUrlOrNull) {
    const key = getLeadCacheKey(lead);
    if (!key) return;
    try {
        const cache = getCMACache(userId);
        const existing = cache[key] || {};
        cache[key] = { ...existing, customPhoto: dataUrlOrNull ?? null };
        localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(cache));
    } catch (_) {}
}

/**
 * Bust the cached metadata for a single lead so the next CMA render re-hits
 * the listing-metadata API. Preserves the custom photo by default — pass
 * `{ keepPhoto: false }` to clear that too.
 */
export function clearCMACacheForLead(userId, lead, { keepPhoto = true } = {}) {
    const key = getLeadCacheKey(lead);
    if (!key) return;
    try {
        const cache = getCMACache(userId);
        const existing = cache[key];
        if (!existing) return;
        if (keepPhoto && existing.customPhoto) {
            cache[key] = { customPhoto: existing.customPhoto };
        } else {
            delete cache[key];
        }
        localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(cache));
    } catch (_) {}
}
