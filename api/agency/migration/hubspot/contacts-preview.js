const { handleCors } = require('../../../_lib/cors');
const { requireAgencyUser } = require('../_helpers');
const { fetchContacts } = require('../../../../server/services/hubspotApi');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const contacts = await fetchContacts(agencyUser._id, { limit: 100, maxPages: 5 });
    const lifecycleCounts = {};
    const leadStatusCounts = {};
    for (const c of contacts) {
      const lc = c.lifecycleStage || 'unknown';
      lifecycleCounts[lc] = (lifecycleCounts[lc] || 0) + 1;
      if (c.leadStatus) leadStatusCounts[c.leadStatus] = (leadStatusCounts[c.leadStatus] || 0) + 1;
    }
    res.json({
      success: true, totalFetched: contacts.length, lifecycleStages: lifecycleCounts, leadStatuses: leadStatusCounts,
      sample: contacts.slice(0, 20).map((c) => ({ name: c.name, email: c.email, lifecycleStage: c.lifecycleStage, leadStatus: c.leadStatus })),
    });
  } catch (err) {
    res.status(err.message?.includes('not connected') ? 400 : 500).json({ message: err.message });
  }
};
