// GET /api/email/auth-url?provider=google|microsoft&userId=... – OAuth URL for connecting email (DIY: Google / Microsoft)
const { handleCors } = require('../_lib/cors');

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const MICROSOFT_AUTH = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify';
const GRAPH_SCOPES = 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access';

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const userId = req.query.userId;
  const provider = (req.query.provider || 'google').toLowerCase();
  const redirectUri = process.env.EMAIL_REDIRECT_URI;
  const state = JSON.stringify({ userId, provider });

  if (!userId || !redirectUri) {
    return res.status(400).json({ message: 'Missing userId or EMAIL_REDIRECT_URI' });
  }

  if (provider === 'microsoft') {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) return res.status(400).json({ message: 'Microsoft OAuth not configured' });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GRAPH_SCOPES,
      state,
      response_mode: 'query',
    });
    return res.status(200).json({ url: `${MICROSOFT_AUTH}?${params.toString()}` });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(400).json({ message: 'Google OAuth not configured' });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return res.status(200).json({ url: `${GOOGLE_AUTH}?${params.toString()}` });
};
