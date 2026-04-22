/**
 * Remove trailing duplicate address/segment from a property title.
 * e.g. "house at 28 Dirkie Uys Street, Franschhoek, South Africa, 28 Dirkie Uys Street, South Africa"
 *   → "house at 28 Dirkie Uys Street, Franschhoek, South Africa"
 */
export function dedupePropertyTitle(title) {
  if (!title || typeof title !== 'string') return title || '';
  let s = title.trim();
  if (!s) return '';
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return s;
  for (let len = 1; len <= Math.floor(parts.length / 2); len++) {
    const suffix = parts.slice(-len);
    const rest = parts.slice(0, -len);
    for (let i = 0; i + len <= rest.length; i++) {
      if (rest.slice(i, i + len).every((p, j) => p.toLowerCase() === suffix[j].toLowerCase())) {
        return rest.slice(0, i + len).join(', ').trim() || title.trim();
      }
    }
  }
  return s.trim() || title.trim();
}

/**
 * Remove duplicate address phrases from a string (e.g. title or description).
 * Uses same logic as dedupePropertyTitle for consistency.
 */
export function dedupeAddress(str) {
  return dedupePropertyTitle(str || '');
}
