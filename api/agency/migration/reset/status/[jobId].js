const { handleCors } = require('../../../../_lib/cors');
const { requireAgencyUser } = require('../../_helpers');
const { publicAgencyResetPayload } = require('../../../../../server/services/agencyResetJob');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const jobId = req.query.jobId;
    if (!jobId) return res.status(400).json({ message: 'jobId is required' });
    const resetHandler = require('../../reset');
    resetHandler._cleanupJobs();
    const entry = resetHandler._agencyResetJobs.get(jobId);
    if (!entry) return res.status(404).json({ message: 'Job not found or expired' });
    if (entry.agencyId !== String(agencyUser._id)) return res.status(403).json({ message: 'Forbidden' });
    res.json({ success: true, ...publicAgencyResetPayload(entry.job) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
