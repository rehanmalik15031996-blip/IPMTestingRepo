/**
 * Only treat URLs as linkable when they are from news or property sites.
 * Exclude social / login-required domains (Twitter, Facebook, LinkedIn, etc.).
 * We link to the publisher only (no republishing); use sourceUrl for the canonical article/section URL to avoid plagiarism.
 */
const BLOCKED_HOSTS = [
  'twitter.com', 'x.com', 't.co',
  'facebook.com', 'fb.com', 'fb.me', 'fb.watch', 'm.facebook.com',
  'linkedin.com', 'lnkd.in',
  'instagram.com', 'instagr.am',
  'tiktok.com', 'youtube.com', 'youtu.be',
  'reddit.com', 'old.reddit.com',
  'pinterest.com', 'wa.me', 'api.whatsapp.com',
  'telegram.org', 't.me'
];

function isNewsOrPropertySourceUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  const u = url.trim();
  if (!u.startsWith('http://') && !u.startsWith('https://')) return false;
  try {
    const host = new URL(u).hostname.toLowerCase().replace(/^www\./, '');
    if (BLOCKED_HOSTS.some((h) => host === h || host.endsWith('.' + h))) return false;
    return true;
  } catch (_) {
    return false;
  }
}

/** e.g. "https://www.reuters.com/markets/real-estate/" -> "Reuters" */
function getSourceDisplayName(url) {
  if (typeof url !== 'string' || !url.trim()) return 'news site';
  try {
    const host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '');
    const part = host.split('.')[0];
    return part ? part.charAt(0).toUpperCase() + part.slice(1) : 'news site';
  } catch (_) {
    return 'news site';
  }
}

export { isNewsOrPropertySourceUrl, getSourceDisplayName };
