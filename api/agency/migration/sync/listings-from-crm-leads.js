const { handleCors } = require('../../../_lib/cors');
const { requireAgencyUser } = require('../_helpers');
const { materializeListingsFromAgencyCrmLeads } = require('../../../../server/services/materializeListingsFromCrm');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const summary = await materializeListingsFromAgencyCrmLeads(agencyUser._id);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Sync failed' });
  }
};
