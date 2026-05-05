const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');
const { buildMarketingSummary } = require('../_lib/marketingFixtures');

// Wraps a JSON response with a synthesised marketingSummary built from the
// user's own listings + connected accounts. Returns null when the user has
// no connected accounts (so the dashboard keeps showing the empty state).
async function withMarketingSummary(user, payload) {
    try {
        const summary = await buildMarketingSummary({
            userId: user._id,
            agencyId: user.agencyId,
            role: user.role,
            accounts: payload.connectedAccounts || user.outstandAccounts || [],
        });
        return { ...payload, marketingSummary: summary };
    } catch (err) {
        console.warn('[marketing] summary build failed:', err.message);
        return payload;
    }
}

const OUTSTAND_API = 'https://api.outstand.so/v1';
const OUTSTAND_KEY = process.env.OUTSTAND_API_KEY;

const outstandFetch = async (path, opts = {}) => {
  const res = await fetch(`${OUTSTAND_API}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${OUTSTAND_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  return res.json();
};

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.query.action === 'health') {
    return res.status(200).json({ ok: true, hasKey: !!OUTSTAND_KEY, keyPrefix: OUTSTAND_KEY ? OUTSTAND_KEY.substring(0, 6) + '...' : null });
  }

  await connectDB();

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  // The marketing dashboard (Outstand integration) is now shared across all
  // authenticated users that have a "Marketing" tab — agency, agency_agent,
  // independent_agent, agent, partner, admin, and enterprise. Each user's
  // connected social accounts are stored on their own User document
  // (`outstandAccounts`), so reads/writes are naturally scoped per-user.
  const enterprise = await User.findById(userId);
  if (!enterprise) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const action = req.query.action || req.body?.action;

  if (req.method === 'GET' && action === 'networks') {
    if (!OUTSTAND_KEY) {
      return res.status(200).json({ success: true, networks: [], error: 'OUTSTAND_API_KEY not configured' });
    }
    try {
      const data = await outstandFetch('/social-networks');
      return res.status(200).json({ success: true, networks: data.data || [] });
    } catch (err) {
      console.error('Outstand networks fetch error:', err);
      return res.status(200).json({ success: true, networks: [], error: err.message });
    }
  }

  if (req.method === 'GET' && action === 'accounts') {
    const stored = enterprise.outstandAccounts || [];
    return res.status(200).json(await withMarketingSummary(enterprise, { success: true, connectedAccounts: stored }));
  }

  if (req.method === 'POST' && action === 'auth-url') {
    const { platform, redirectUri } = req.body;
    if (!platform) return res.status(400).json({ message: 'Platform required.' });
    const data = await outstandFetch(`/social-networks/${platform}/auth-url`, {
      method: 'POST',
      body: JSON.stringify({ redirect_uri: redirectUri || undefined }),
    });
    if (!data.success) return res.status(400).json({ message: data.error || 'Failed to get auth URL' });
    return res.status(200).json({ success: true, authUrl: data.data.auth_url });
  }

  if (req.method === 'POST' && action === 'sync-accounts') {
    const data = await outstandFetch('/social-accounts');
    const remoteAccounts = data.data || [];

    const existing = enterprise.outstandAccounts || [];
    const existingIds = new Set(existing.map(a => a.outstandAccountId));

    for (const acct of remoteAccounts) {
      if (!existingIds.has(acct.id)) {
        existing.push({
          outstandAccountId: acct.id,
          platform: acct.network || acct.platform,
          username: acct.username || acct.name || '',
          connectedAt: new Date(),
        });
      }
    }

    enterprise.outstandAccounts = existing;
    await enterprise.save();

    return res.status(200).json(await withMarketingSummary(enterprise, { success: true, connectedAccounts: enterprise.outstandAccounts }));
  }

  if (req.method === 'POST' && action === 'disconnect') {
    const { outstandAccountId } = req.body;
    if (!outstandAccountId) return res.status(400).json({ message: 'Account ID required.' });
    enterprise.outstandAccounts = (enterprise.outstandAccounts || []).filter(
      a => a.outstandAccountId !== outstandAccountId
    );
    await enterprise.save();
    return res.status(200).json(await withMarketingSummary(enterprise, { success: true, connectedAccounts: enterprise.outstandAccounts }));
  }

  // Demo / no-Outstand-credentials shortcut: stamp a synthetic connected
  // account onto the user's profile so the rest of the marketing UI (KPIs,
  // calendar, recent posts feed, post composer) can be exercised without
  // the real Meta/X/LinkedIn OAuth dance. The account id is prefixed with
  // "mock_" so the regular sync-accounts merger never overwrites it and a
  // simple disconnect call removes it cleanly.
  if (req.method === 'POST' && action === 'mock-connect') {
    const { platform, username } = req.body || {};
    if (!platform) return res.status(400).json({ message: 'Platform required.' });
    const safePlatform = String(platform).trim().toLowerCase();
    if (!safePlatform) return res.status(400).json({ message: 'Platform required.' });
    const existing = enterprise.outstandAccounts || [];
    const handle = (username && String(username).trim()) || `${enterprise.name || 'Demo'} ${safePlatform}`.replace(/\s+/g, '').toLowerCase();
    const mockAccount = {
      outstandAccountId: `mock_${safePlatform}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      platform: safePlatform,
      username: handle,
      followers: Math.floor(800 + Math.random() * 9200),
      connectedAt: new Date(),
      isMock: true,
    };
    existing.push(mockAccount);
    enterprise.outstandAccounts = existing;
    await enterprise.save();
    return res.status(200).json(await withMarketingSummary(enterprise, {
      success: true,
      connectedAccounts: enterprise.outstandAccounts,
      account: mockAccount,
    }));
  }

  return res.status(405).json({ message: 'Method or action not supported' });
};
