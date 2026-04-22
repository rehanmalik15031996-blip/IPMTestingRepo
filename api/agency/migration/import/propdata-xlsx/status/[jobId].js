const { handleCors } = require('../../../../../_lib/cors');
const { requireAgencyUser } = require('../../../_helpers');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const jobId = req.query.jobId;
    if (!jobId) return res.status(400).json({ message: 'jobId is required' });
    const parentHandler = require('../../propdata-xlsx');
    const jobs = parentHandler._propdataImportJobs;
    parentHandler._cleanupJobs();
    const entry = jobs.get(jobId);
    if (!entry) return res.status(404).json({ message: 'Job not found or expired' });
    if (entry.agencyId !== String(agencyUser._id)) return res.status(403).json({ message: 'Forbidden' });
    res.json({ success: true, ...parentHandler._publicJobPayload(entry.job) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
