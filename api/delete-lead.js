// Vercel serverless: DELETE /api/delete-lead – remove a CRM lead by index
const connectDB = require('./_lib/mongodb');
const { handleCors } = require('./_lib/cors');
const { getUserIdFromRequest } = require('./_lib/auth');
const User = require('../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  try {
    await connectDB();
    const body = req.method === 'POST' ? req.body : {};
    let index = req.method === 'DELETE' ? parseInt(req.query?.index, 10) : body.index;
    const leadId = body.leadId;
    const leadName = body.leadName || body.name;
    const leadEmail = body.leadEmail || body.email;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const role = (user.role || '').toLowerCase();
    const isAgency = role === 'agency';
    const isAgencyAgent = role === 'agency_agent';

    let targetUser = user;
    let crmLeads;
    if (isAgency) {
      crmLeads = targetUser.agencyStats?.crmLeads || [];
    } else if (isAgencyAgent && user.agencyId) {
      targetUser = await User.findById(user.agencyId);
      if (!targetUser) return res.status(404).json({ message: 'Agency not found' });
      crmLeads = targetUser.agencyStats?.crmLeads || [];
    } else {
      crmLeads = targetUser.agentStats?.crmLeads || [];
    }
    if (!Array.isArray(crmLeads)) crmLeads = [];

    const getLeadId = (l) => (l != null && (l.id != null ? String(l.id) : (l._id != null ? String(l._id) : ''))) || '';
    const matchLeadId = (l, id) => getLeadId(l) === String(id || '');
    const matchLeadByNameEmail = (l, name, email) => {
      const n = (name || '').toString().trim().toLowerCase();
      const e = (email || '').toString().trim().toLowerCase();
      if (!n && !e) return false;
      const ln = (l.name || '').toString().trim().toLowerCase();
      const le = (l.email || '').toString().trim().toLowerCase();
      return (n ? ln === n : true) && (e ? le === e : true);
    };

    let indexToDelete = -1;
    if (leadId) {
      indexToDelete = crmLeads.findIndex((l) => matchLeadId(l, leadId));
    }
    if (indexToDelete < 0 && typeof index === 'number' && index >= 0 && (isAgency || isAgencyAgent)) {
      const filtered = isAgencyAgent
        ? crmLeads.filter((l) => String(l.assignedAgentId || '') === String(user._id))
        : crmLeads;
      const leadAt = filtered[index];
      if (leadAt) {
        const resolvedId = getLeadId(leadAt);
        if (resolvedId) indexToDelete = crmLeads.findIndex((l) => getLeadId(l) === resolvedId);
      }
    }
    if (indexToDelete < 0 && typeof index === 'number' && index >= 0) {
      indexToDelete = index;
    }
    if (indexToDelete < 0 && (leadName || leadEmail)) {
      if (isAgencyAgent) {
        indexToDelete = crmLeads.findIndex((l) =>
          String(l.assignedAgentId || '') === String(user._id) && matchLeadByNameEmail(l, leadName, leadEmail)
        );
      } else {
        indexToDelete = crmLeads.findIndex((l) => matchLeadByNameEmail(l, leadName, leadEmail));
      }
    }
    if (typeof indexToDelete !== 'number' || indexToDelete < 0 || indexToDelete >= crmLeads.length) {
      return res.status(400).json({ message: 'Lead not found (invalid index or leadId)' });
    }
    index = indexToDelete;

    if (isAgency || isAgencyAgent) {
      if (!targetUser.agencyStats) targetUser.agencyStats = { crmLeads: [] };
      targetUser.agencyStats.crmLeads.splice(index, 1);
      targetUser.markModified('agencyStats');
    } else {
      if (!targetUser.agentStats) targetUser.agentStats = { crmLeads: [] };
      targetUser.agentStats.crmLeads.splice(index, 1);
    }
    await targetUser.save();

    let resultLeads = (isAgency || isAgencyAgent) ? targetUser.agencyStats.crmLeads : targetUser.agentStats.crmLeads;
    if (isAgencyAgent && user.agencyId) {
      resultLeads = (resultLeads || []).filter((l) => String(l.assignedAgentId || '') === String(user._id));
    }
    return res.status(200).json({ success: true, crmLeads: resultLeads });
  } catch (err) {
    console.error('Delete lead error:', err);
    return res.status(500).json({ message: err.message });
  }
};
