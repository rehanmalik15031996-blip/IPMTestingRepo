const multer = require('multer');
const { handleCors } = require('../../../_lib/cors');
const { requireAgencyUser } = require('../_helpers');
const User = require('../../../../server/models/User');
const { runHubspotCsvImport } = require('../../../../server/services/hubspotCsvImport');
const { buildConfigFromHubspotExport } = require('../../../../server/services/hubspotConfigBuilder');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 2 } });

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.fields([{ name: 'contacts', maxCount: 1 }, { name: 'deals', maxCount: 1 }])(req, res, (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    await runMulter(req, res);
    const contactsF = req.files?.contacts?.[0] || null;
    const dealsF = req.files?.deals?.[0] || null;
    if (!contactsF && !dealsF) return res.status(400).json({ message: 'Upload at least one file.' });
    const freshUser = await User.findById(agencyUser._id);
    if (!freshUser) return res.status(404).json({ message: 'Agency not found' });
    const replaceHubspotLeads = String(req.body?.replaceHubspotLeads || '').toLowerCase() === 'true';
    const summary = await runHubspotCsvImport({
      agencyId: freshUser._id,
      contactsBuffer: contactsF ? contactsF.buffer : null,
      dealsBuffer: dealsF ? dealsF.buffer : null,
      contactsFilename: contactsF ? contactsF.originalname : '',
      dealsFilename: dealsF ? dealsF.originalname : '',
      replaceHubspotLeads,
    });
    try {
      const configResult = buildConfigFromHubspotExport({
        contactsBuffer: contactsF ? contactsF.buffer : null,
        dealsBuffer: dealsF ? dealsF.buffer : null,
        contactsFilename: contactsF ? contactsF.originalname : '',
        dealsFilename: dealsF ? dealsF.originalname : '',
      });
      const u2 = await User.findById(freshUser._id);
      if (u2) {
        if (!u2.agencyStats) u2.agencyStats = {};
        if (!u2.agencyStats.crmConfig) u2.agencyStats.crmConfig = {};
        u2.agencyStats.crmConfig.pipelineStages = configResult.pipelineStages.map((s, i) => ({ id: s.id, title: s.title, order: i, color: s.color }));
        u2.agencyStats.crmConfig.activityChannels = configResult.activityChannels.map((c) => ({ value: c.value, label: c.label }));
        u2.agencyStats.crmConfig.hubspotFieldMap = configResult.hubspotFieldMap;
        u2.agencyStats.crmConfig.builtFrom = 'hubspot-import';
        u2.agencyStats.crmConfig.updatedAt = new Date();
        u2.markModified('agencyStats');
        await u2.save();
        summary.crmConfigUpdated = true;
        summary.pipelineStagesCount = configResult.pipelineStages.length;
        summary.activityChannelsCount = configResult.activityChannels.length;
      }
    } catch (cfgErr) {
      console.error('Auto-config from HubSpot import failed (non-fatal):', cfgErr.message);
      summary.crmConfigUpdated = false;
    }
    res.status(200).json({ success: true, summary, message: `HubSpot export: ${summary.contactsImported} contacts, ${summary.dealsImported} deals.` });
  } catch (err) {
    console.error('hubspot-export import:', err);
    res.status(500).json({ message: err.message || 'Import failed' });
  }
}

module.exports = handler;

/** @type {import('@vercel/node').VercelApiHandler['config']} */
module.exports.config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
