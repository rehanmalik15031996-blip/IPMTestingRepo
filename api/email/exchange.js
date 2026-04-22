// POST /api/email/exchange – exchange OAuth code for tokens, save to user (DIY Google / Microsoft)
const crypto = require('crypto');
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const User = require('../../server/models/User');

const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://www.googleapis.com/oauth2/v2/userinfo';
const MICROSOFT_TOKEN = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_ME = 'https://graph.microsoft.com/v1.0/me';

async function exchangeGoogle(code, redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth not configured');
  const r = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!r.ok) throw new Error('Google token exchange failed');
  const data = await r.json();
  let email = data.email;
  if (!email && data.access_token) {
    const u = await fetch(GOOGLE_USERINFO, { headers: { Authorization: `Bearer ${data.access_token}` } });
    if (u.ok) {
      const profile = await u.json();
      email = profile.email || profile.emailAddress;
    }
  }
  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
    email: email || 'unknown',
  };
}

async function exchangeMicrosoft(code, redirectUri) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Microsoft OAuth not configured');
  const r = await fetch(MICROSOFT_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!r.ok) throw new Error('Microsoft token exchange failed');
  const data = await r.json();
  let email = data.email;
  if (!email && data.access_token) {
    const u = await fetch(GRAPH_ME, { headers: { Authorization: `Bearer ${data.access_token}` } });
    if (u.ok) {
      const profile = await u.json();
      email = profile.mail || profile.userPrincipalName;
    }
  }
  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
    email: email || 'unknown',
  };
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { code, state } = req.body || {};
  if (!code || !state) return res.status(400).json({ message: 'code and state are required' });

  let userId, provider;
  try {
    const parsed = JSON.parse(state);
    userId = parsed.userId;
    provider = (parsed.provider || 'google').toLowerCase();
  } catch {
    userId = state;
    provider = 'google';
  }
  if (!userId) return res.status(400).json({ message: 'Invalid state' });

  const redirectUri = process.env.EMAIL_REDIRECT_URI;
  if (!redirectUri) return res.status(500).json({ message: 'EMAIL_REDIRECT_URI not set' });

  try {
    const payload = provider === 'microsoft'
      ? await exchangeMicrosoft(code, redirectUri)
      : await exchangeGoogle(code, redirectUri);

    const connectionId = crypto.randomBytes(12).toString('hex');
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const connections = Array.isArray(user.emailConnections) ? user.emailConnections : [];
    const existing = connections.find(c => c.email === payload.email && c.provider === provider);
    if (existing) {
      existing.refreshToken = payload.refreshToken;
      existing.accessToken = payload.accessToken;
      existing.expiresAt = payload.expiresAt;
    } else {
      connections.push({
        connectionId,
        provider,
        email: payload.email,
        refreshToken: payload.refreshToken,
        accessToken: payload.accessToken,
        expiresAt: payload.expiresAt,
      });
    }
    user.emailConnections = connections;
    await user.save();

    return res.status(200).json({ success: true, email: payload.email });
  } catch (err) {
    console.error('Email exchange error:', err);
    return res.status(400).json({ message: err.message || 'Failed to connect email' });
  }
};
