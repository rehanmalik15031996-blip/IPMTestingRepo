const { handleCors } = require('../../../_lib/cors');
const { requireAgencyUser } = require('../_helpers');
const { fetchDealPipelines, fetchDeals } = require('../../../../server/services/hubspotApi');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const [{ pipelines }, deals] = await Promise.all([
      fetchDealPipelines(agencyUser._id),
      fetchDeals(agencyUser._id, { limit: 100, maxPages: 5 }),
    ]);
    const stageMap = {};
    for (const p of pipelines) for (const s of p.stages) stageMap[s.id] = { label: s.label, pipelineLabel: p.label };
    const stageCounts = {};
    for (const d of deals) {
      const info = stageMap[d.stageId];
      const label = info ? `${info.pipelineLabel} → ${info.label}` : d.stageId || 'unknown';
      stageCounts[label] = (stageCounts[label] || 0) + 1;
    }
    res.json({
      success: true, totalFetched: deals.length, dealStages: stageCounts,
      sample: deals.slice(0, 20).map((d) => { const info = stageMap[d.stageId] || {}; return { name: d.name, amount: d.amount, pipeline: info.pipelineLabel || d.pipelineId, stage: info.label || d.stageId }; }),
    });
  } catch (err) {
    res.status(err.message?.includes('not connected') ? 400 : 500).json({ message: err.message });
  }
};
