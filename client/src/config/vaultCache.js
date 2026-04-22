// Vault file list cache so the view populates instantly when revisiting.
// Uses in-memory + sessionStorage so cache survives page refresh within the same tab.
// Background refresh keeps data current; cache TTL avoids stale data.

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY_PREFIX = 'ipm_vault_';

let _cache = {};

function storageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function getFromStorage(userId) {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || !entry.timestamp) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(storageKey(userId));
      return null;
    }
    return { files: entry.files || [], usedBytes: entry.usedBytes || 0 };
  } catch (_) {
    return null;
  }
}

function setToStorage(userId, data) {
  try {
    const entry = {
      files: Array.isArray(data.files) ? data.files : [],
      usedBytes: typeof data.usedBytes === 'number' ? data.usedBytes : 0,
      timestamp: Date.now()
    };
    sessionStorage.setItem(storageKey(userId), JSON.stringify(entry));
  } catch (_) {}
}

export function getVaultCache(userId) {
  if (!userId) return null;
  // 1) In-memory (fastest)
  const entry = _cache[userId];
  if (entry && Date.now() - entry.timestamp <= CACHE_TTL_MS) {
    return { files: entry.files, usedBytes: entry.usedBytes };
  }
  if (entry) delete _cache[userId];
  // 2) sessionStorage (survives refresh)
  const stored = getFromStorage(userId);
  if (stored) {
    _cache[userId] = { ...stored, timestamp: Date.now() };
    return stored;
  }
  return null;
}

export function setVaultCache(userId, data) {
  if (!userId) return;
  const payload = {
    files: Array.isArray(data.files) ? data.files : [],
    usedBytes: typeof data.usedBytes === 'number' ? data.usedBytes : 0,
    timestamp: Date.now()
  };
  _cache[userId] = payload;
  setToStorage(userId, payload);
}

export function invalidateVaultCache(userId) {
  if (userId) {
    delete _cache[userId];
    try {
      sessionStorage.removeItem(storageKey(userId));
    } catch (_) {}
  } else {
    _cache = {};
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(STORAGE_KEY_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => sessionStorage.removeItem(k));
    } catch (_) {}
  }
}
