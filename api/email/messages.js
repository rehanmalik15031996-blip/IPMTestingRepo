// GET /api/email/messages?userId=...&connectionId=...&limit=20 – list inbox (DIY Gmail / Graph)
// GET /api/email/messages?userId=...&connectionId=...&id=... – get one message
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const User = require('../../server/models/User');
const { getAccessToken } = require('./_lib/token');

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0/me';

function pickConnection(connections, connectionId) {
  const list = Array.isArray(connections) ? connections : [];
  if (connectionId) return list.find(c => c.connectionId === connectionId || c.grantId === connectionId);
  return list[0];
}

function normalizeGmailMessage(msg) {
  const id = msg.id;
  const headers = msg.payload?.headers || [];
  const get = (name) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;
  const from = get('From') || '';
  const subject = get('Subject') || '';
  const date = get('Date');
  const snippet = msg.snippet || '';
  const body = msg.payload?.body?.data
    ? Buffer.from(msg.payload.body.data, 'base64').toString('utf-8')
    : (msg.payload?.parts?.[0]?.body?.data
      ? Buffer.from(msg.payload.parts[0].body.data, 'base64').toString('utf-8')
      : snippet);
  return { id, from: [{ email: from, name: from }], from_email: [{ email: from }], subject, body, snippet, date, received_at: date };
}

function normalizeGraphMessage(msg) {
  const from = msg.from?.emailAddress?.address || msg.from?.emailAddress?.name || '';
  return {
    id: msg.id,
    from: [{ email: from, name: msg.from?.emailAddress?.name }],
    from_email: [{ email: from }],
    subject: msg.subject || '',
    body: msg.body?.content || msg.bodyPreview || '',
    snippet: msg.bodyPreview || '',
    date: msg.receivedDateTime,
    received_at: msg.receivedDateTime,
  };
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { userId, connectionId, limit = '20', id: messageId } = req.query || {};
  if (!userId) return res.status(400).json({ message: 'userId required' });

  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const conn = pickConnection(user.emailConnections, connectionId);
    if (!conn) return res.status(400).json({ message: 'No email connected. Connect in Settings.' });

    const accessToken = await getAccessToken(conn);
    const provider = (conn.provider || 'google').toLowerCase();

    if (messageId) {
      if (provider === 'microsoft') {
        const r = await fetch(`${GRAPH_BASE}/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!r.ok) return res.status(r.status).json({ message: 'Message not found' });
        const msg = await r.json();
        return res.status(200).json(normalizeGraphMessage(msg));
      }
      const r = await fetch(`${GMAIL_BASE}/messages/${messageId}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!r.ok) return res.status(r.status).json({ message: 'Message not found' });
      const msg = await r.json();
      return res.status(200).json(normalizeGmailMessage(msg));
    }

    const limitNum = Math.min(parseInt(limit, 10) || 20, 50);
    if (provider === 'microsoft') {
      const r = await fetch(`${GRAPH_BASE}/mailFolders/inbox/messages?$top=${limitNum}&$orderby=receivedDateTime desc`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!r.ok) return res.status(r.status).json({ message: 'Failed to fetch messages' });
      const data = await r.json();
      const messages = (data.value || []).map(normalizeGraphMessage);
      return res.status(200).json({ messages, grantId: conn.connectionId });
    }
    const r = await fetch(`${GMAIL_BASE}/messages?maxResults=${limitNum}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return res.status(r.status).json({ message: 'Failed to fetch messages' });
    const listData = await r.json();
    const msgIds = (listData.messages || []).map(m => m.id);
    const messages = [];
    for (const mid of msgIds.slice(0, limitNum)) {
      const mr = await fetch(`${GMAIL_BASE}/messages/${mid}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (mr.ok) {
        const msg = await mr.json();
        messages.push(normalizeGmailMessage(msg));
      }
    }
    return res.status(200).json({ messages, grantId: conn.connectionId });
  } catch (err) {
    console.error('Email messages error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};
