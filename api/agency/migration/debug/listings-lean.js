const { handleCors } = require('../../../_lib/cors');
const { requireAgencyUser } = require('../_helpers');
const Property = require('../../../../server/models/Property');
const User = require('../../../../server/models/User');
const { agencyListingPropertyFilter } = require('../../../../server/utils/agencyListingsQuery');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const agencyId = agencyUser._id;
    const filter = await agencyListingPropertyFilter(agencyId);
    const [broad, byImportOnly, props] = await Promise.all([
      Property.countDocuments(filter),
      Property.countDocuments({ importAgencyId: agencyId }),
      Property.find(filter).select('title agentId importListingRef importSource').sort({ createdAt: -1 }).limit(35).lean(),
    ]);
    const agentIds = [...new Set(props.map((p) => String(p.agentId)).filter(Boolean))];
    const agents = await User.find({ _id: { $in: agentIds } }).select('name email').lean();
    const agentLabel = Object.fromEntries(agents.map((u) => [String(u._id), u.name || u.email || String(u._id)]));
    const items = props.map((p) => ({ title: p.title || '(no title)', agent: agentLabel[String(p.agentId)] || String(p.agentId || '—'), webRef: p.importListingRef || '' }));
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, counts: { matchingAgencyScope: broad, importAgencyIdOnly: byImportOnly }, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
