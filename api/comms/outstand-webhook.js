const connectDB = require('../_lib/mongodb');
const Notification = require('../../server/models/Notification');
const User = require('../../server/models/User');

const WEBHOOK_SECRET = process.env.OUTSTAND_WEBHOOK_SECRET || '';

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    if (WEBHOOK_SECRET) {
        const sig = req.headers['x-outstand-signature'] || req.headers['x-webhook-signature'] || '';
        if (sig !== WEBHOOK_SECRET) {
            return res.status(403).json({ message: 'Invalid signature' });
        }
    }

    await connectDB();

    try {
        const { event, data } = req.body || {};
        if (!event) return res.status(400).json({ message: 'Missing event' });

        const EVENT_TITLES = {
            'post.published': 'Post Published',
            'post.scheduled': 'Post Scheduled',
            'post.failed': 'Post Failed',
            'post.error': 'Post Error',
            'account.connected': 'Account Connected',
            'account.disconnected': 'Account Disconnected',
            'account.token_expired': 'Account Token Expired',
            'engagement.new': 'New Engagement',
        };

        const title = EVENT_TITLES[event] || `Social Activity: ${event}`;
        const body = data?.message || data?.description || data?.platform
            ? `${data.platform || ''}: ${data.message || data.description || event}`.trim()
            : event;

        const outstandAccountId = data?.accountId || data?.account_id;
        let userIds = [];

        if (outstandAccountId) {
            const users = await User.find({
                'outstandAccounts.outstandAccountId': outstandAccountId,
            }).select('_id').lean();
            userIds = users.map(u => u._id);
        }

        if (!userIds.length && data?.userId) {
            userIds = [data.userId];
        }

        const isError = event.includes('error') || event.includes('failed') || event.includes('expired');

        for (const uid of userIds) {
            await Notification.create({
                userId: uid,
                type: 'marketing',
                channel: 'social',
                title,
                body,
                linkTo: '/enterprise-dashboard?tab=marketing',
                metadata: { event, ...data },
            });
        }

        return res.status(200).json({ status: 'ok', notified: userIds.length });
    } catch (err) {
        console.error('Outstand webhook error:', err);
        return res.status(500).json({ message: 'Internal error' });
    }
};
