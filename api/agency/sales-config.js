const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');

const ALLOWED_TEMPLATES = ['industrial-sale-sa', 'commercial-sale-sa', 'commercial-lease', 'custom'];

module.exports = async (req, res) => {
    if (handleCors(req, res)) return;
    const userId = getUserIdFromRequest(req, res);
    if (!userId) return;

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const role = String(user.role || '').toLowerCase();
    const isAgency = role === 'agency';
    const isAgencyAgent = role === 'agency_agent';
    const isIndependentAgent = role === 'independent_agent' || role === 'agent';
    if (!isAgency && !isAgencyAgent && !isIndependentAgent) {
        return res.status(403).json({ message: 'Sales pipeline is restricted to agency and agent accounts' });
    }

    // Agency agents read the parent agency's pipeline so the stages and
    // template they see match their colleagues exactly. Independent / sole
    // agents store their own config on `agentStats.salesConfig`.
    let configOwner = user;
    if (isAgencyAgent) {
        if (!user.agencyId) {
            return res.status(200).json({ success: true, salesConfig: { template: null, pipelineStages: [], updatedAt: null } });
        }
        configOwner = await User.findById(user.agencyId);
        if (!configOwner) return res.status(404).json({ message: 'Linked agency not found' });
    }

    if (req.method === 'GET') {
        const cfgRaw = isIndependentAgent
            ? (configOwner.agentStats?.salesConfig || {})
            : (configOwner.agencyStats?.salesConfig || {});
        return res.json({
            success: true,
            salesConfig: {
                template: cfgRaw.template || null,
                pipelineStages: cfgRaw.pipelineStages || [],
                updatedAt: cfgRaw.updatedAt || null,
            },
        });
    }

    // Pipeline stages and template are owned by the agency (or sole agent for
    // their own pipeline). Agency agents can read but never write the config.
    if (req.method === 'PUT' && isAgencyAgent) {
        return res.status(403).json({ message: 'Pipeline settings are managed by your agency' });
    }

    if (req.method === 'PUT') {
        const { template, pipelineStages, automationRules } = req.body || {};
        const statsKey = isIndependentAgent ? 'agentStats' : 'agencyStats';
        if (!user[statsKey]) user[statsKey] = {};
        if (!user[statsKey].salesConfig) user[statsKey].salesConfig = {};
        const cfg = user[statsKey].salesConfig;

        if (template !== undefined) {
            cfg.template = ALLOWED_TEMPLATES.includes(template) ? template : 'custom';
        }
        if (Array.isArray(pipelineStages)) {
            cfg.pipelineStages = pipelineStages.map((s, i) => ({
                id: s.id || s.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
                title: s.title,
                order: s.order != null ? s.order : i,
                color: s.color || undefined,
                hint: s.hint || undefined,
            }));
        }
        if (automationRules && typeof automationRules === 'object') {
            cfg.automationRules = automationRules;
        }
        cfg.updatedAt = new Date();
        user.markModified(statsKey);
        await user.save();
        return res.json({ success: true, salesConfig: cfg });
    }

    return res.status(405).json({ message: 'Method not allowed' });
};
