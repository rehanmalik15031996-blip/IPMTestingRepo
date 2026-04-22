const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');
const Conversation = require('../../server/models/Conversation');
const Message = require('../../server/models/Message');

const GRAPH_API = 'https://graph.facebook.com/v21.0';
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_CONFIG_ID = process.env.META_WA_CONFIG_ID || '';

async function sendWhatsAppMessage(phoneNumberId, accessToken, to, text) {
    const url = `${GRAPH_API}/${phoneNumberId}/messages`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text },
        }),
    });
    return resp.json();
}

async function exchangeCodeForToken(code, redirectUri) {
    const url = `${GRAPH_API}/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    const resp = await fetch(url);
    return resp.json();
}

async function discoverWhatsAppAssets(accessToken) {
    const bizResp = await fetch(`${GRAPH_API}/debug_token?input_token=${accessToken}`, {
        headers: { Authorization: `Bearer ${META_APP_ID}|${META_APP_SECRET}` },
    });
    const bizData = await bizResp.json();
    const granularScopes = bizData?.data?.granular_scopes || [];
    const waScope = granularScopes.find(s => s.scope === 'whatsapp_business_messaging');
    const wabaIds = waScope?.target_ids || [];

    if (!wabaIds.length) {
        const sharedResp = await fetch(`${GRAPH_API}/me/businesses?access_token=${accessToken}`);
        const sharedData = await sharedResp.json();
        const bizIds = (sharedData.data || []).map(b => b.id);
        for (const bizId of bizIds) {
            const wabaResp = await fetch(`${GRAPH_API}/${bizId}/owned_whatsapp_business_accounts?access_token=${accessToken}`);
            const wabaData = await wabaResp.json();
            if (wabaData.data?.length) wabaIds.push(...wabaData.data.map(w => w.id));
        }
    }

    if (!wabaIds.length) return null;

    const wabaId = wabaIds[0];
    const phonesResp = await fetch(`${GRAPH_API}/${wabaId}/phone_numbers?access_token=${accessToken}`);
    const phonesData = await phonesResp.json();
    const phone = phonesData.data?.[0];

    if (!phone) return null;

    return {
        wabaId,
        phoneNumberId: phone.id,
        displayPhone: phone.display_phone_number || phone.verified_name || '',
    };
}

function getRedirectUri(req) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    return `${proto}://${host}/api/comms/whatsapp?action=callback`;
}

module.exports = async (req, res) => {
    if (handleCors(req, res)) return;

    const action = req.query.action || req.body?.action;

    if (action === 'callback') {
        await connectDB();
        const code = req.query.code;
        const state = req.query.state;
        if (!code || !state) return res.status(400).send('Missing code or state');

        try {
            const redirectUri = getRedirectUri(req);
            const tokenData = await exchangeCodeForToken(code, redirectUri);

            if (!tokenData.access_token) {
                return res.send('<html><body><script>window.opener&&window.opener.postMessage({type:"wa_oauth_error",error:"Token exchange failed"},"*");window.close();</script>Failed. You may close this window.</body></html>');
            }

            const assets = await discoverWhatsAppAssets(tokenData.access_token);

            if (!assets) {
                return res.send('<html><body><script>window.opener&&window.opener.postMessage({type:"wa_oauth_error",error:"No WhatsApp Business phone number found on your account"},"*");window.close();</script>No phone number found. Close this window.</body></html>');
            }

            await User.updateOne({ _id: state }, {
                $set: {
                    'whatsappBusiness.phoneNumberId': assets.phoneNumberId,
                    'whatsappBusiness.wabaId': assets.wabaId,
                    'whatsappBusiness.accessToken': tokenData.access_token,
                    'whatsappBusiness.displayPhone': assets.displayPhone,
                    'whatsappBusiness.connectedAt': new Date(),
                },
            });

            return res.send(`<html><body><script>window.opener&&window.opener.postMessage({type:"wa_oauth_done",phone:"${assets.displayPhone}"},"*");window.close();</script>WhatsApp connected! You may close this window.</body></html>`);
        } catch (err) {
            console.error('WA callback error:', err);
            return res.send('<html><body><script>window.opener&&window.opener.postMessage({type:"wa_oauth_error",error:"Something went wrong"},"*");window.close();</script>Error. Close this window.</body></html>');
        }
    }

    await connectDB();
    const userId = getUserIdFromRequest(req, res);
    if (!userId) return;

    if (req.method === 'POST' && action === 'auth-url') {
        if (!META_APP_ID || !META_APP_SECRET) {
            return res.status(400).json({ message: 'WhatsApp Business OAuth not configured. Add META_APP_ID and META_APP_SECRET to environment variables.' });
        }
        const redirectUri = getRedirectUri(req);
        const scopes = 'whatsapp_business_management,whatsapp_business_messaging,business_management';
        let url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${userId}`;
        if (META_CONFIG_ID) url += `&config_id=${META_CONFIG_ID}`;
        return res.status(200).json({ success: true, url });
    }

    if (req.method === 'POST' && action === 'connect') {
        const { phoneNumberId, wabaId, accessToken, displayPhone } = req.body;
        if (!phoneNumberId || !accessToken) {
            return res.status(400).json({ message: 'phoneNumberId and accessToken required' });
        }
        await User.updateOne({ _id: userId }, {
            $set: {
                'whatsappBusiness.phoneNumberId': phoneNumberId,
                'whatsappBusiness.wabaId': wabaId || '',
                'whatsappBusiness.accessToken': accessToken,
                'whatsappBusiness.displayPhone': displayPhone || '',
                'whatsappBusiness.connectedAt': new Date(),
            },
        });
        return res.status(200).json({ success: true });
    }

    if (req.method === 'GET' && action === 'status') {
        const user = await User.findById(userId).select('whatsappBusiness').lean();
        const hasMetaOAuth = !!META_APP_ID;
        return res.status(200).json({
            success: true,
            connected: !!user?.whatsappBusiness?.phoneNumberId,
            displayPhone: user?.whatsappBusiness?.displayPhone || null,
            oauthAvailable: hasMetaOAuth,
        });
    }

    if (req.method === 'POST' && action === 'send') {
        const { conversationId, content } = req.body;
        if (!conversationId || !content) {
            return res.status(400).json({ message: 'conversationId and content required' });
        }

        const me = await User.findById(userId).select('whatsappBusiness').lean();
        if (!me?.whatsappBusiness?.phoneNumberId || !me?.whatsappBusiness?.accessToken) {
            return res.status(400).json({ message: 'WhatsApp Business not connected' });
        }

        const convo = await Conversation.findOne({ _id: conversationId, participants: userId, channel: 'whatsapp' });
        if (!convo) return res.status(404).json({ message: 'Conversation not found' });

        const to = convo.metadata?.whatsappPhone;
        if (!to) return res.status(400).json({ message: 'No phone number on conversation' });

        const result = await sendWhatsAppMessage(
            me.whatsappBusiness.phoneNumberId,
            me.whatsappBusiness.accessToken,
            to,
            content,
        );

        const waMessageId = result?.messages?.[0]?.id;

        const msg = await Message.create({
            conversationId: convo._id,
            channel: 'whatsapp',
            sender: userId,
            direction: 'outbound',
            content,
            status: waMessageId ? 'sent' : 'failed',
            metadata: { whatsappMessageId: waMessageId || null },
        });

        convo.lastMessage = { content, sender: userId, timestamp: new Date() };
        convo.lastActivity = new Date();
        await convo.save();

        return res.status(201).json({ success: true, message: msg });
    }

    if (req.method === 'POST' && action === 'disconnect') {
        await User.updateOne({ _id: userId }, { $unset: { whatsappBusiness: 1 } });
        return res.status(200).json({ success: true });
    }

    return res.status(400).json({ message: 'Invalid action' });
};
