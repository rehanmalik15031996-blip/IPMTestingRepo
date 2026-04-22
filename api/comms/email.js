const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');
const Conversation = require('../../server/models/Conversation');
const Message = require('../../server/models/Message');

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;

function getRedirectUri(req, provider) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    return `${proto}://${host}/api/comms/email?action=callback&provider=${provider}`;
}

async function refreshGmailToken(refreshToken) {
    const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GMAIL_CLIENT_ID,
            client_secret: GMAIL_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });
    return resp.json();
}

async function refreshOutlookToken(refreshToken) {
    const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: OUTLOOK_CLIENT_ID,
            client_secret: OUTLOOK_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            scope: 'Mail.ReadWrite Mail.Send offline_access',
        }),
    });
    return resp.json();
}

async function getValidToken(emailAccount) {
    const now = new Date();
    if (emailAccount.tokenExpiry && new Date(emailAccount.tokenExpiry) > now) {
        return emailAccount.accessToken;
    }
    let result;
    if (emailAccount.provider === 'gmail') {
        result = await refreshGmailToken(emailAccount.refreshToken);
    } else {
        result = await refreshOutlookToken(emailAccount.refreshToken);
    }
    if (result.access_token) {
        await User.updateOne(
            { 'connectedEmails._id': emailAccount._id },
            {
                $set: {
                    'connectedEmails.$.accessToken': result.access_token,
                    'connectedEmails.$.tokenExpiry': new Date(Date.now() + (result.expires_in || 3600) * 1000),
                },
            },
        );
        return result.access_token;
    }
    return null;
}

async function gmailFetchEmails(accessToken, maxResults = 20) {
    const listResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const listData = await listResp.json();
    const messageIds = (listData.messages || []).map(m => m.id);
    const emails = [];
    for (const id of messageIds.slice(0, maxResults)) {
        const msgResp = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date&metadataHeaders=Message-ID&metadataHeaders=In-Reply-To`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const msgData = await msgResp.json();
        const headers = {};
        for (const h of (msgData.payload?.headers || [])) {
            headers[h.name.toLowerCase()] = h.value;
        }
        emails.push({
            id: msgData.id,
            threadId: msgData.threadId,
            from: headers.from || '',
            to: headers.to || '',
            cc: headers.cc || '',
            subject: headers.subject || '(no subject)',
            date: headers.date || '',
            messageId: headers['message-id'] || '',
            inReplyTo: headers['in-reply-to'] || '',
            snippet: msgData.snippet || '',
        });
    }
    return emails;
}

async function gmailSendEmail(accessToken, to, subject, body, inReplyTo, threadId, cc) {
    const lines = [
        `To: ${to}`,
        `Subject: ${subject}`,
    ];
    if (cc) lines.push(`Cc: ${cc}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`);
    lines.push('', body);
    const raw = Buffer.from(lines.join('\r\n')).toString('base64url');
    const payload = { raw };
    if (threadId) payload.threadId = threadId;
    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return resp.json();
}

async function outlookFetchEmails(accessToken, maxResults = 20) {
    const resp = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc&$select=id,conversationId,from,toRecipients,subject,bodyPreview,receivedDateTime,internetMessageId`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await resp.json();
    return (data.value || []).map(m => ({
        id: m.id,
        threadId: m.conversationId,
        from: m.from?.emailAddress?.address || '',
        to: (m.toRecipients || []).map(r => r.emailAddress?.address).join(', '),
        subject: m.subject || '(no subject)',
        date: m.receivedDateTime || '',
        messageId: m.internetMessageId || '',
        snippet: m.bodyPreview || '',
    }));
}

async function outlookSendEmail(accessToken, to, subject, body, cc) {
    const message = {
        subject,
        body: { contentType: 'Text', content: body },
        toRecipients: to.split(',').map(addr => ({ emailAddress: { address: addr.trim() } })),
    };
    if (cc) {
        message.ccRecipients = cc.split(',').map(addr => ({ emailAddress: { address: addr.trim() } }));
    }
    const resp = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
    return resp.ok ? { success: true } : resp.json();
}

module.exports = async (req, res) => {
    if (handleCors(req, res)) return;
    await connectDB();

    const action = req.query.action || req.body?.action;

    if (action === 'callback') {
        const provider = req.query.provider;
        const code = req.query.code;
        const state = req.query.state;
        if (!code || !state) return res.status(400).send('Missing code or state');

        let tokenData;
        const redirectUri = getRedirectUri(req, provider);

        if (provider === 'gmail') {
            const resp = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: GMAIL_CLIENT_ID,
                    client_secret: GMAIL_CLIENT_SECRET,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri,
                }),
            });
            tokenData = await resp.json();
        } else if (provider === 'outlook') {
            const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: OUTLOOK_CLIENT_ID,
                    client_secret: OUTLOOK_CLIENT_SECRET,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri,
                    scope: 'Mail.ReadWrite Mail.Send offline_access',
                }),
            });
            tokenData = await resp.json();
        }

        if (!tokenData?.access_token) {
            return res.status(400).send('OAuth failed: ' + JSON.stringify(tokenData));
        }

        let emailAddress = '';
        if (provider === 'gmail') {
            const infoResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            const info = await infoResp.json();
            emailAddress = info.emailAddress || '';
        } else {
            const infoResp = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            const info = await infoResp.json();
            emailAddress = info.mail || info.userPrincipalName || '';
        }

        const userId = state;
        await User.updateOne({ _id: userId }, {
            $push: {
                connectedEmails: {
                    provider,
                    email: emailAddress,
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token || '',
                    tokenExpiry: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
                    connectedAt: new Date(),
                },
            },
        });

        return res.send(`<html><body><script>window.opener && window.opener.postMessage({type:'email_oauth_done'},'*');window.close();</script>Email connected. You may close this window.</body></html>`);
    }

    const userId = getUserIdFromRequest(req, res);
    if (!userId) return;

    if (req.method === 'POST' && action === 'auth-url') {
        const { provider } = req.body;
        let url;
        if (provider === 'gmail') {
            if (!GMAIL_CLIENT_ID) return res.status(400).json({ message: 'Gmail not configured yet — add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables (from Google Cloud Console → APIs & Services → Credentials).' });
            const redirectUri = getRedirectUri(req, 'gmail');
            url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GMAIL_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify')}&access_type=offline&prompt=consent&state=${userId}`;
        } else if (provider === 'outlook') {
            if (!OUTLOOK_CLIENT_ID) return res.status(400).json({ message: 'Outlook not configured yet — add OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET environment variables (from Azure Portal → App Registrations).' });
            const redirectUri = getRedirectUri(req, 'outlook');
            url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${OUTLOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('Mail.ReadWrite Mail.Send offline_access')}&state=${userId}`;
        } else {
            return res.status(400).json({ message: 'Invalid provider' });
        }
        return res.status(200).json({ success: true, url });
    }

    if (req.method === 'GET' && action === 'accounts') {
        const user = await User.findById(userId).select('connectedEmails').lean();
        const accounts = (user?.connectedEmails || []).map(a => ({
            _id: a._id,
            provider: a.provider,
            email: a.email,
            connectedAt: a.connectedAt,
        }));
        return res.status(200).json({ success: true, accounts });
    }

    if (req.method === 'POST' && action === 'disconnect') {
        const { accountId } = req.body;
        await User.updateOne({ _id: userId }, { $pull: { connectedEmails: { _id: accountId } } });
        return res.status(200).json({ success: true });
    }

    if (req.method === 'POST' && action === 'sync') {
        const { accountId } = req.body;
        const user = await User.findById(userId).select('connectedEmails').lean();
        const acct = (user?.connectedEmails || []).find(a => String(a._id) === accountId);
        if (!acct) return res.status(404).json({ message: 'Account not found' });

        const token = await getValidToken(acct);
        if (!token) return res.status(401).json({ message: 'Unable to refresh token' });

        const emails = acct.provider === 'gmail'
            ? await gmailFetchEmails(token, 20)
            : await outlookFetchEmails(token, 20);

        let synced = 0;
        for (const email of emails) {
            const existing = await Message.findOne({ 'metadata.emailMessageId': email.messageId || email.id });
            if (existing) continue;

            let convo = await Conversation.findOne({
                channel: 'email',
                participants: userId,
                'metadata.emailThreadId': email.threadId,
            });

            if (!convo) {
                convo = await Conversation.create({
                    channel: 'email',
                    participants: [userId],
                    title: email.subject,
                    metadata: {
                        emailSubject: email.subject,
                        emailThreadId: email.threadId,
                        emailFrom: email.from,
                        emailTo: email.to || '',
                        emailCc: email.cc || '',
                    },
                    lastActivity: new Date(email.date) || new Date(),
                });
            }

            const isOutbound = (acct.email && email.from.includes(acct.email));

            const emailDate = email.date ? new Date(email.date) : new Date();
            const msgDoc = new Message({
                conversationId: convo._id,
                channel: 'email',
                sender: isOutbound ? userId : null,
                senderExternal: isOutbound ? null : email.from,
                direction: isOutbound ? 'outbound' : 'inbound',
                content: email.snippet,
                status: 'delivered',
                metadata: {
                    emailMessageId: email.messageId || email.id,
                    emailInReplyTo: email.inReplyTo || '',
                    emailTo: email.to || '',
                    emailCc: email.cc || '',
                },
            });
            msgDoc.createdAt = emailDate;
            await msgDoc.save();

            convo.lastMessage = { content: email.snippet, timestamp: new Date(email.date) || new Date() };
            convo.lastActivity = new Date(email.date) || new Date();
            if (!isOutbound) {
                const current = convo.unreadCount instanceof Map
                    ? convo.unreadCount.get(userId) || 0
                    : convo.unreadCount?.[userId] || 0;
                if (convo.unreadCount instanceof Map) {
                    convo.unreadCount.set(userId, current + 1);
                } else {
                    convo.unreadCount = { ...(convo.unreadCount || {}), [userId]: current + 1 };
                }
            }
            await convo.save();
            synced++;
        }

        return res.status(200).json({ success: true, synced });
    }

    if (req.method === 'POST' && action === 'compose') {
        const { to, cc, subject, content, accountId } = req.body;
        if (!to || !subject || !content) return res.status(400).json({ message: 'To, Subject, and body are required' });

        const user = await User.findById(userId).select('connectedEmails').lean();
        const acct = accountId
            ? (user?.connectedEmails || []).find(a => String(a._id) === accountId)
            : (user?.connectedEmails || [])[0];
        if (!acct) return res.status(400).json({ message: 'No email account connected' });

        const token = await getValidToken(acct);
        if (!token) return res.status(401).json({ message: 'Unable to refresh token' });

        let sendResult;
        if (acct.provider === 'gmail') {
            sendResult = await gmailSendEmail(token, to, subject, content, null, null, cc);
        } else {
            sendResult = await outlookSendEmail(token, to, subject, content, cc);
        }

        const convo = await Conversation.create({
            channel: 'email',
            participants: [userId],
            title: subject,
            metadata: {
                emailSubject: subject,
                emailFrom: acct.email,
                emailTo: to,
                emailCc: cc || '',
            },
            lastMessage: { content, sender: userId, timestamp: new Date() },
            lastActivity: new Date(),
        });

        const msg = await Message.create({
            conversationId: convo._id,
            channel: 'email',
            sender: userId,
            direction: 'outbound',
            content,
            status: 'sent',
            metadata: { emailTo: to, emailCc: cc || '' },
        });

        return res.status(201).json({ success: true, conversation: convo, message: msg });
    }

    if (req.method === 'POST' && action === 'send') {
        const { conversationId, content, accountId } = req.body;
        if (!conversationId || !content) return res.status(400).json({ message: 'Missing fields' });

        const user = await User.findById(userId).select('connectedEmails').lean();
        const acct = accountId
            ? (user?.connectedEmails || []).find(a => String(a._id) === accountId)
            : (user?.connectedEmails || [])[0];
        if (!acct) return res.status(400).json({ message: 'No email account connected' });

        const token = await getValidToken(acct);
        if (!token) return res.status(401).json({ message: 'Unable to refresh token' });

        const convo = await Conversation.findOne({ _id: conversationId, participants: userId, channel: 'email' });
        if (!convo) return res.status(404).json({ message: 'Conversation not found' });

        const to = convo.metadata?.emailFrom || '';
        const subject = convo.metadata?.emailSubject || 'Re:';

        const lastMsg = await Message.findOne({ conversationId: convo._id })
            .sort({ createdAt: -1 })
            .select('metadata')
            .lean();

        if (acct.provider === 'gmail') {
            await gmailSendEmail(token, to, subject, content, lastMsg?.metadata?.emailMessageId, convo.metadata?.emailThreadId);
        } else {
            await outlookSendEmail(token, to, subject, content);
        }

        const msg = await Message.create({
            conversationId: convo._id,
            channel: 'email',
            sender: userId,
            direction: 'outbound',
            content,
            status: 'sent',
        });

        convo.lastMessage = { content, sender: userId, timestamp: new Date() };
        convo.lastActivity = new Date();
        await convo.save();

        return res.status(201).json({ success: true, message: msg });
    }

    return res.status(400).json({ message: 'Invalid action' });
};
