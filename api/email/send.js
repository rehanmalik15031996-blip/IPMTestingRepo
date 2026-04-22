// POST /api/email/send – send email (DIY Gmail / Microsoft Graph)
// Body: { userId, connectionId?, to, subject, body }
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const User = require('../../server/models/User');
const { getAccessToken } = require('./_lib/token');

const GMAIL_SEND = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const GRAPH_SEND = 'https://graph.microsoft.com/v1.0/me/sendMail';

function pickConnection(connections, connectionId) {
  const list = Array.isArray(connections) ? connections : [];
  if (connectionId) return list.find(c => c.connectionId === connectionId || c.grantId === connectionId);
  return list[0];
}

function buildGmailRaw(to, subject, body) {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject.replace(/\r?\n/g, ' ')}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body || '',
  ];
  const raw = lines.join('\r\n');
  return Buffer.from(raw, 'utf-8').toString('base64url');
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { userId, connectionId, to, subject, body } = req.body || {};
  if (!userId || !to || !subject) {
    return res.status(400).json({ message: 'userId, to, and subject are required' });
  }

  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const conn = pickConnection(user.emailConnections, connectionId);
    if (!conn) return res.status(400).json({ message: 'No email connected. Connect in Settings.' });

    const accessToken = await getAccessToken(conn);
    const provider = (conn.provider || 'google').toLowerCase();

    if (provider === 'microsoft') {
      const r = await fetch(GRAPH_SEND, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            toRecipients: [{ emailAddress: { address: to.trim() } }],
            subject: (subject || '').replace(/\r?\n/g, ' '),
            body: { contentType: 'Text', content: body || '' },
          },
        }),
      });
      if (!r.ok) {
        const text = await r.text();
        console.error('Graph send failed:', r.status, text);
        return res.status(400).json({ message: 'Failed to send email' });
      }
      return res.status(200).json({ success: true });
    }

    const raw = buildGmailRaw(to.trim(), subject || '', body || '');
    const r = await fetch(GMAIL_SEND, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });
    if (!r.ok) {
      const text = await r.text();
      console.error('Gmail send failed:', r.status, text);
      return res.status(400).json({ message: 'Failed to send email' });
    }
    const sent = await r.json();
    return res.status(200).json({ success: true, id: sent.id });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};
