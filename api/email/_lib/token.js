// Get valid access_token for a connection; refresh if needed (DIY Google / Microsoft)
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const MICROSOFT_TOKEN = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

async function refreshGoogle(connection) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.EMAIL_REDIRECT_URI;
  const r = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) throw new Error('Google refresh failed');
  const data = await r.json();
  connection.accessToken = data.access_token;
  connection.expiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
  return data.access_token;
}

async function refreshMicrosoft(connection) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.EMAIL_REDIRECT_URI;
  const r = await fetch(MICROSOFT_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) throw new Error('Microsoft refresh failed');
  const data = await r.json();
  connection.accessToken = data.access_token;
  connection.expiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
  return data.access_token;
}

async function getAccessToken(connection) {
  if (!connection) throw new Error('No email connection');
  const isExpired = connection.expiresAt && connection.expiresAt < Date.now() + 60 * 1000;
  if (connection.accessToken && !isExpired) return connection.accessToken;
  if (connection.refreshToken) {
    const provider = (connection.provider || 'google').toLowerCase();
    return provider === 'microsoft' ? refreshMicrosoft(connection) : refreshGoogle(connection);
  }
  if (connection.grantId) throw new Error('Nylas grants no longer supported; reconnect email in Settings.');
  throw new Error('Invalid connection');
}

module.exports = { getAccessToken };
