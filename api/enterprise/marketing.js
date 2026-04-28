const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');

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
    return res.status(200).json({ success: true, connectedAccounts: stored });
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

    return res.status(200).json({ success: true, connectedAccounts: enterprise.outstandAccounts });
  }

  if (req.method === 'POST' && action === 'disconnect') {
    const { outstandAccountId } = req.body;
    if (!outstandAccountId) return res.status(400).json({ message: 'Account ID required.' });
    enterprise.outstandAccounts = (enterprise.outstandAccounts || []).filter(
      a => a.outstandAccountId !== outstandAccountId
    );
    await enterprise.save();
    return res.status(200).json({ success: true, connectedAccounts: enterprise.outstandAccounts });
  }

  return res.status(405).json({ message: 'Method or action not supported' });
};
