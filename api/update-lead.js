// Vercel serverless: PUT /api/update-lead – update an existing CRM lead by index; logs activities
const crypto = require('crypto');
const connectDB = require('./_lib/mongodb');
const { handleCors } = require('./_lib/cors');
const User = require('../server/models/User');
const { sanitizeAgencyBranch } = require('../server/utils/display');

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

function createActivity(activity, changedBy, channel) {
  const entry = {
    actionId: crypto.randomUUID(),
    datetime: new Date().toISOString(),
    activity,
    changedBy
  };
  if (channel && String(channel).trim()) {
    entry.channel = String(channel).trim();
  }
  return entry;
}

const { getUserIdFromRequest } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  try {
    await connectDB();
    const { index, leadId, lead, activitySummary, statusChangeReason, noteChannel } = req.body || {};

    if (!lead) {
      return res.status(400).json({ message: 'lead is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const role = (user.role || '').toLowerCase();
    const isAgency = role === 'agency';
    const isAgencyAgent = role === 'agency_agent';
    const agencyDoc = isAgency ? null : (isAgencyAgent && user.agencyId ? await User.findById(user.agencyId).lean() : null);
    const changedBy = buildChangedBy(user, agencyDoc);

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

    let indexToUpdate = -1;
    if (leadId) {
      const wantId = String(leadId).trim();
      indexToUpdate = crmLeads.findIndex((l) => getLeadId(l) === wantId);
    }
    if (indexToUpdate < 0 && typeof index === 'number' && index >= 0) {
      if (isAgency || isAgencyAgent) {
        const filtered = isAgencyAgent
          ? crmLeads.filter((l) => String(l.assignedAgentId || '') === String(user._id))
          : crmLeads;
        const leadAt = filtered[index];
        if (leadAt) {
          const resolvedId = getLeadId(leadAt);
          if (resolvedId) indexToUpdate = crmLeads.findIndex((l) => getLeadId(l) === resolvedId);
        }
      }
      if (indexToUpdate < 0) indexToUpdate = index;
    }
    if (indexToUpdate < 0 && lead && (lead.name || lead.email)) {
      if (isAgencyAgent) {
        indexToUpdate = crmLeads.findIndex((l) =>
          String(l.assignedAgentId || '') === String(user._id) && matchLeadByNameEmail(l, lead.name, lead.email)
        );
      } else {
        indexToUpdate = crmLeads.findIndex((l) => matchLeadByNameEmail(l, lead.name, lead.email));
      }
    }
    if (indexToUpdate < 0 || indexToUpdate >= crmLeads.length) {
      return res.status(400).json({ message: 'Lead not found (invalid index or leadId)' });
    }

    const rawExisting = crmLeads[indexToUpdate];
    // Plain copy so we preserve every field (Mongoose subdoc spread can miss fields)
    const existing = rawExisting && typeof rawExisting.toObject === 'function'
      ? rawExisting.toObject()
      : (typeof rawExisting === 'object' && rawExisting !== null ? JSON.parse(JSON.stringify(rawExisting)) : {});
    const name = lead.name || `${(lead.firstName || '').trim()} ${(lead.lastName || '').trim()}`.trim() || existing.name;
    const linkedProperties = [];
    const explicitlyClearProperty = lead.propertyOfInterest === '' || (lead.propertyId === '' && lead.propertyOfInterest !== undefined && lead.propertyOfInterest !== null && String(lead.propertyOfInterest).trim() === '');
    if (explicitlyClearProperty) {
      linkedProperties.length = 0;
    } else if (lead.propertyId && (lead.propertyOfInterest || lead.propertyTitle)) {
      linkedProperties.push({ id: lead.propertyId, title: lead.propertyOfInterest || lead.propertyTitle || 'Property' });
    } else if (lead.propertyOfInterest) {
      linkedProperties.push({ id: null, title: lead.propertyOfInterest });
    } else if (existing.linkedProperties?.length) {
      linkedProperties.push(...existing.linkedProperties);
    }

    const newStatus = lead.status != null && lead.status !== undefined ? String(lead.status).toLowerCase() : undefined;
    const prevStatus = existing.status ? String(existing.status).toLowerCase() : 'new';
    const newEmail = lead.email !== undefined && lead.email !== null ? lead.email : existing.email;
    const newMobile = lead.mobile !== undefined && lead.mobile !== null ? lead.mobile : existing.mobile;
    const newPropertyOfInterest = explicitlyClearProperty ? '' : (lead.propertyOfInterest !== undefined && lead.propertyOfInterest !== null ? lead.propertyOfInterest : existing.propertyOfInterest);
    const newAssignedAgentId = lead.assignedAgentId !== undefined ? (lead.assignedAgentId && String(lead.assignedAgentId).trim()) || null : undefined;
    const prevAssignedAgentId = existing.assignedAgentId != null ? String(existing.assignedAgentId) : null;

    const updated = {
      ...existing,
      name,
      email: newEmail ?? existing.email,
      mobile: newMobile ?? existing.mobile,
      type: explicitlyClearProperty ? '—' : (lead.propertyOfInterest || existing.type || '—'),
      propertyOfInterest: explicitlyClearProperty ? '' : (newPropertyOfInterest ?? existing.propertyOfInterest),
      linkedProperties: linkedProperties.length ? linkedProperties : (explicitlyClearProperty ? [] : (existing.linkedProperties || [])),
      // Preserve status when only reassigning agent (so lead doesn’t reset to “new”)
      status: newStatus !== undefined ? newStatus : (existing.status || 'new')
    };
    const newLeadType = lead.leadType === 'seller' || lead.leadType === 'investor' ? lead.leadType : (lead.leadType === 'buyer' ? 'buyer' : undefined);
    if (newLeadType !== undefined) updated.leadType = newLeadType;
    if (lead.whatsapp !== undefined) updated.whatsapp = lead.whatsapp != null ? String(lead.whatsapp).trim() : undefined;
    if (lead.preferredContact !== undefined) updated.preferredContact = lead.preferredContact != null ? String(lead.preferredContact).trim() : undefined;
    if (lead.leadSource !== undefined) {
      updated.leadSource = lead.leadSource != null ? String(lead.leadSource).trim() : undefined;
      updated.source = updated.leadSource || updated.source || 'Inquiry';
    }
    if (lead.buyerDetails !== undefined) updated.buyerDetails = lead.buyerDetails;
    if (lead.sellerDetails !== undefined) updated.sellerDetails = lead.sellerDetails;
    if (lead.investorDetails !== undefined) updated.investorDetails = lead.investorDetails;
    if (lead.viewingScheduledProperty !== undefined) updated.viewingScheduledProperty = lead.viewingScheduledProperty != null ? String(lead.viewingScheduledProperty).trim() : undefined;
    if (lead.viewingScheduledDate !== undefined) updated.viewingScheduledDate = lead.viewingScheduledDate != null ? String(lead.viewingScheduledDate).trim() : undefined;
    if (lead.viewingScheduledTime !== undefined) updated.viewingScheduledTime = lead.viewingScheduledTime != null ? String(lead.viewingScheduledTime).trim() : undefined;
    if (newAssignedAgentId !== undefined && (isAgency || isAgencyAgent)) {
      updated.assignedAgentId = newAssignedAgentId;
    }

    const newActivities = [];
    if (activitySummary) {
      newActivities.push(createActivity(activitySummary, changedBy, noteChannel));
    } else {
      if (newStatus !== undefined && newStatus !== prevStatus) {
        newActivities.push(createActivity(`Status changed from ${prevStatus} to ${newStatus}`, changedBy));
      }
    }
    if (newStatus !== undefined && (newStatus === 'lost' || newStatus === 'on_hold') && statusChangeReason && String(statusChangeReason).trim()) {
      const label = newStatus === 'lost' ? 'Lost' : 'On hold';
      newActivities.push(createActivity(`Marked as ${label}: ${String(statusChangeReason).trim()}`, changedBy));
    }
    if (newStatus === 'viewing_scheduled' && (lead.viewingScheduledProperty || lead.viewingScheduledDate || lead.viewingScheduledTime)) {
      const parts = [];
      if (lead.viewingScheduledProperty) parts.push(lead.viewingScheduledProperty);
      if (lead.viewingScheduledDate || lead.viewingScheduledTime) parts.push([lead.viewingScheduledDate, lead.viewingScheduledTime].filter(Boolean).join(' '));
      newActivities.push(createActivity(`Viewing scheduled: ${parts.join(' · ')}`, changedBy));
    }
    if (!activitySummary) {
      if ((lead.name || lead.firstName || lead.lastName) != null && name !== (existing.name || '')) {
        newActivities.push(createActivity('Name updated', changedBy));
      }
      if (lead.email != null && (newEmail ?? existing.email) !== (existing.email ?? '')) {
        newActivities.push(createActivity('Email updated', changedBy));
      }
      if (lead.mobile != null && (String(newMobile ?? '') !== String(existing.mobile ?? ''))) {
        newActivities.push(createActivity('Phone number updated', changedBy));
      }
      if (lead.propertyOfInterest != null && (newPropertyOfInterest ?? '') !== (existing.propertyOfInterest ?? '')) {
        newActivities.push(createActivity('Property of interest updated', changedBy));
      }
      if (newAssignedAgentId !== undefined && String(newAssignedAgentId || '') !== String(prevAssignedAgentId || '')) {
        let toAgentName = 'Another agent';
        if (newAssignedAgentId) {
          try {
            const toAgent = await User.findById(newAssignedAgentId).select('name email').lean();
            toAgentName = (toAgent && (toAgent.name || toAgent.email)) || toAgentName;
          } catch (_) {
            const agencyForAgents = isAgency ? user : await User.findById(user.agencyId).lean();
            const topAgents = agencyForAgents?.agencyStats?.topAgents || [];
            const found = topAgents.find((a) => String(a._id || a.id) === String(newAssignedAgentId));
            if (found) toAgentName = found.name || found.email || toAgentName;
          }
        } else {
          toAgentName = 'Unassigned';
        }
        newActivities.push(createActivity(`Transferred to ${toAgentName}`, changedBy));
      }
    }
    updated.activities = [...(existing.activities || []), ...newActivities];

    if (isAgency) {
      if (!targetUser.agencyStats) targetUser.agencyStats = { crmLeads: [] };
      targetUser.agencyStats.crmLeads[indexToUpdate] = updated;
      targetUser.markModified('agencyStats');
    } else if (isAgencyAgent) {
      if (!targetUser.agencyStats) targetUser.agencyStats = { crmLeads: [] };
      targetUser.agencyStats.crmLeads[indexToUpdate] = updated;
      targetUser.markModified('agencyStats');
    } else {
      if (!targetUser.agentStats) targetUser.agentStats = { crmLeads: [] };
      targetUser.agentStats.crmLeads[indexToUpdate] = updated;
    }
    await targetUser.save();

    let updatedList = isAgency ? targetUser.agencyStats.crmLeads : targetUser.agentStats.crmLeads;
    if (isAgencyAgent && user.agencyId) {
      updatedList = (updatedList || []).filter((l) => String(l.assignedAgentId || '') === String(user._id));
    }
    return res.status(200).json({ success: true, lead: updated, crmLeads: updatedList });
  } catch (err) {
    console.error('Update lead error:', err);
    if (err && err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message || 'Validation failed', details: err.errors });
    }
    return res.status(500).json({ message: err.message || 'Update lead failed' });
  }
};
