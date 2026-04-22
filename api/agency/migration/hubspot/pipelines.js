const { handleCors } = require('../../../_lib/cors');
const { requireAgencyUser } = require('../_helpers');
const { fetchDealPipelines, fetchTicketPipelines } = require('../../../../server/services/hubspotApi');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const [deals, tickets] = await Promise.all([
      fetchDealPipelines(agencyUser._id),
      fetchTicketPipelines(agencyUser._id).catch(() => ({ pipelines: [] })),
    ]);
    res.json({ success: true, dealPipelines: deals.pipelines, ticketPipelines: tickets.pipelines });
  } catch (err) {
    res.status(err.message?.includes('not connected') ? 400 : 500).json({ message: err.message });
  }
};
