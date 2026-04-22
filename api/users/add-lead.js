// Vercel serverless: POST /api/users/add-lead – agency: agencyStats.crmLeads; agency_agent: push to agency doc with assignedAgentId (agency + agent both see)
const crypto = require('crypto');
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const User = require('../../server/models/User');
const { sanitizeAgencyBranch } = require('../../server/utils/display');

function buildChangedBy(user, agency) {
  const name = user.name || user.email || 'Unknown';
  const role = (user.role || '').toLowerCase();
  const changedBy = { userId: String(user._id), name, role };
  let rawAgency = null;
  if (role === 'agency_agent' && agency) rawAgency = agency.name || agency.agencyName || null;
  if (role === 'agency') rawAgency = user.name || user.agencyName || null;
  const sanitized = rawAgency ? sanitizeAgencyBranch(String(rawAgency)) : '';
  if (sanitized) changedBy.agencyName = sanitized;
  return changedBy;
}
function createActivity(activity, changedBy) {
  return { actionId: crypto.randomUUID(), datetime: new Date().toISOString(), activity, changedBy };
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const { userId, lead } = req.body || {};

    if (!userId || !lead) {
      return res.status(400).json({ message: 'userId and lead are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const name = lead.name || `${(lead.firstName || '').trim()} ${(lead.lastName || '').trim()}`.trim() || 'Unknown';
    const dateAdded = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const linkedProperties = [];
    if (lead.propertyId && (lead.propertyOfInterest || lead.propertyTitle)) {
      linkedProperties.push({ id: lead.propertyId, title: lead.propertyOfInterest || lead.propertyTitle || 'Property' });
    } else if (lead.propertyOfInterest) {
      linkedProperties.push({ id: null, title: lead.propertyOfInterest });
    }
    const role = (user.role || '').toLowerCase();
    const isAgency = role === 'agency';
    const isAgencyAgent = role === 'agency_agent';
    const agencyDoc = isAgency ? null : (isAgencyAgent && user.agencyId ? await User.findById(user.agencyId).lean() : null);
    const changedBy = buildChangedBy(user, agencyDoc);

    const rawStatus = (lead.status || lead.initialStatus || 'new').toString().trim().toLowerCase();
    const validStatus = ['new', 'contacted', 'qualified', 'viewing_scheduled', 'viewing_completed', 'negotiation', 'under_contract', 'won', 'lost', 'on_hold'].includes(rawStatus) ? rawStatus : 'new';
    const leadId = 'lid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const newLead = {
      id: leadId,
      name,
      email: lead.email || '',
      mobile: lead.mobile || '',
      type: lead.propertyOfInterest || lead.type || '—',
      budget: lead.budget || '—',
      status: validStatus,
      lastContact: dateAdded,
      propertyOfInterest: lead.propertyOfInterest || '',
      source: lead.source || 'Inquiry',
      dateAdded,
      linkedProperties,
      activities: [createActivity('Lead created', changedBy)],
      leadType: lead.leadType === 'seller' ? 'seller' : 'buyer',
      buyerDetails: lead.leadType === 'buyer' && lead.buyerDetails ? lead.buyerDetails : undefined,
      sellerDetails: lead.leadType === 'seller' && lead.sellerDetails ? lead.sellerDetails : undefined
    };

    const triggerLeadMatch = (leadPayload, ownerId) => {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.API_BASE_URL || process.env.FRONTEND_ORIGIN || '').replace(/\/$/, '') || 'http://localhost:3000';
      fetch(`${baseUrl}/api/match/run-lead-matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: leadPayload, ownerId: ownerId ? String(ownerId) : null }),
      }).catch((err) => console.warn('[add-lead] Match trigger failed:', err.message));
    };

    if (isAgency) {
      newLead.assignedAgentId = (lead.assignedAgentId && String(lead.assignedAgentId).trim()) || null;
      if (!user.agencyStats) user.agencyStats = { crmLeads: [] };
      if (!Array.isArray(user.agencyStats.crmLeads)) user.agencyStats.crmLeads = [];
      user.agencyStats.crmLeads.push(newLead);
      user.markModified('agencyStats');
      await user.save();
      if (newLead.leadType === 'buyer' || newLead.leadType === 'investor') triggerLeadMatch(newLead, user._id);
      return res.status(200).json({ success: true, lead: newLead, crmLeads: user.agencyStats.crmLeads });
    }
    if (isAgencyAgent && user.agencyId) {
      const agency = await User.findById(user.agencyId);
      if (!agency) return res.status(404).json({ message: 'Agency not found' });
      if (!agency.agencyStats) agency.agencyStats = { crmLeads: [] };
      if (!Array.isArray(agency.agencyStats.crmLeads)) agency.agencyStats.crmLeads = [];
      newLead.assignedAgentId = String(user._id);
      agency.agencyStats.crmLeads.push(newLead);
      agency.markModified('agencyStats');
      await agency.save();
      if (newLead.leadType === 'buyer' || newLead.leadType === 'investor') triggerLeadMatch(newLead, agency._id);
      const crmLeads = agency.agencyStats.crmLeads.filter((l) => String(l.assignedAgentId || '') === String(userId));
      return res.status(200).json({ success: true, lead: newLead, crmLeads });
    }
    if (!user.agentStats) user.agentStats = { crmLeads: [] };
    if (!Array.isArray(user.agentStats.crmLeads)) user.agentStats.crmLeads = [];
    user.agentStats.crmLeads.push(newLead);
    await user.save();
    if (newLead.leadType === 'buyer' || newLead.leadType === 'investor') triggerLeadMatch(newLead, user._id);
    return res.status(200).json({ success: true, lead: newLead, crmLeads: user.agentStats.crmLeads });
  } catch (err) {
    console.error('Add lead error:', err);
    return res.status(500).json({ message: err.message });
  }
};
