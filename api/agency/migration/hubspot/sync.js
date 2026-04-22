const { handleCors } = require('../../../_lib/cors');
const { requireAgencyUser } = require('../_helpers');
const { syncHubspotToAgency } = require('../../../../server/services/hubspotApi');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const summary = await syncHubspotToAgency(agencyUser._id);
    res.json({ success: true, summary, message: 'HubSpot sync complete.' });
  } catch (err) {
    res.status(err.message?.includes('not connected') ? 400 : 500).json({ message: err.message });
  }
};
