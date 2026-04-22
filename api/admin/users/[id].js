// Admin-only: get one user (with children count), update, reset password, delete (with transfer or delete children)
const path = require('path');
const root = path.resolve(__dirname, '../../..');
const connectDB = require(path.join(root, 'api', '_lib', 'mongodb'));
const { handleCors } = require(path.join(root, 'api', '_lib', 'cors'));
const { requireAuth } = require(path.join(root, 'api', '_lib', 'auth'));
const User = require(path.join(root, 'server', 'models', 'User'));
const Property = require(path.join(root, 'server', 'models', 'Property'));
const Development = require(path.join(root, 'server', 'models', 'Development'));
const AgencyInvite = require(path.join(root, 'server', 'models', 'AgencyInvite'));
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

function getAdminUserId(req, res) {
  const userId = requireAuth(req, res);
  if (!userId) return null;
  return userId;
}

async function requireAdmin(req, res) {
  const userId = getAdminUserId(req, res);
  if (!userId) return null;
  await connectDB();
  const user = await User.findById(userId).select('role').lean();
  if (!user || (user.role || '').toLowerCase() !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return null;
  }
  return userId;
}

function getIdFromPath(req) {
  let id = req.query && req.query.id;
  if (id) return id;
  if (typeof req.url === 'string') {
    const pathPart = req.url.split('?')[0];
    const match = pathPart.match(/\/api\/admin\/users\/([^/]+)/);
    if (match) return match[1];
  }
  return null;
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  const id = getIdFromPath(req);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  try {
    await connectDB();
    const adminUserId = await requireAdmin(req, res);
    if (!adminUserId) return;

    const targetId = new mongoose.Types.ObjectId(id);

    // GET: one user + linked children count (for delete flow)
    if (req.method === 'GET') {
      const user = await User.findById(targetId).select('-password').lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      const linkedChildrenCount = await User.countDocuments({ agencyId: targetId });
      const linkedInvitesCount = await AgencyInvite.countDocuments({ agencyId: targetId });
      const propertiesCount = await Property.countDocuments({ agentId: targetId });
      return res.status(200).json({
        user,
        linkedChildrenCount,
        linkedInvitesCount,
        propertiesCount
      });
    }

    // PATCH: update user and/or reset password
    if (req.method === 'PATCH') {
      const body = typeof req.body === 'object' ? req.body : {};
      const user = await User.findById(targetId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const allowed = ['name', 'email', 'role', 'subscriptionPlan', 'subscriptionStatus', 'subscriptionPlanOption', 'agencyName', 'phone', 'location'];
      for (const key of allowed) {
        if (body[key] !== undefined) user[key] = body[key];
      }
      if (body.newPassword && String(body.newPassword).length >= 8) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(String(body.newPassword), salt);
      }
      await user.save();
      const { password: _, ...out } = user._doc;
      return res.status(200).json({ success: true, user: out });
    }

    // DELETE: purge user; if agency with children, require transferToUserId or deleteChildren
    if (req.method === 'DELETE') {
      const user = await User.findById(targetId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const children = await User.find({ agencyId: targetId }).select('_id email name').lean();
      const body = typeof req.body === 'object' ? req.body : {};
      const transferToUserId = body.transferToUserId ? String(body.transferToUserId).trim() : null;
      const deleteChildren = body.deleteChildren === true;

      if (children.length > 0) {
        if (!transferToUserId && !deleteChildren) {
          return res.status(400).json({
            message: 'Account has linked agent(s). Provide transferToUserId to reassign them, or deleteChildren: true to delete them.',
            linkedChildrenCount: children.length
          });
        }
        if (transferToUserId) {
          const toAgency = await User.findById(transferToUserId);
          if (!toAgency || (toAgency.role || '').toLowerCase() !== 'agency') {
            return res.status(400).json({ message: 'transferToUserId must be a valid agency user id' });
          }
          await User.updateMany({ agencyId: targetId }, { $set: { agencyId: toAgency._id } });
          // Move topAgents refs: add these agents to toAgency.agencyStats.topAgents (simplified: just update agencyId)
          const agencyStats = toAgency.agencyStats || {};
          const topAgents = Array.isArray(agencyStats.topAgents) ? agencyStats.topAgents : [];
          for (const c of children) {
            topAgents.push({ _id: c._id, name: c.name, email: c.email, status: 'active' });
          }
          await User.updateOne(
            { _id: toAgency._id },
            { $set: { 'agencyStats.topAgents': topAgents, 'agencyStats.activeAgents': topAgents.length } }
          );
          // Remove from old agency's topAgents
          await User.updateOne(
            { _id: targetId },
            { $pull: { 'agencyStats.topAgents': { _id: { $in: children.map(c => c._id) } } } }
          );
        } else {
          // deleteChildren: delete each child user and their data
          for (const c of children) {
            await Property.deleteMany({ agentId: c._id });
            await Development.updateMany(
              { $or: [{ agentId: c._id }, { agencyId: c._id }] },
              { $unset: { agentId: '', agencyId: '' } }
            );
            await AgencyInvite.deleteMany({ agencyId: c._id });
            await User.deleteOne({ _id: c._id });
          }
          await AgencyInvite.deleteMany({ agencyId: targetId });
        }
      } else {
        await AgencyInvite.deleteMany({ agencyId: targetId });
      }

      // Delete target's properties, developments refs, then user
      await Property.deleteMany({ agentId: targetId });
      await Development.updateMany(
        { $or: [{ agentId: targetId }, { agencyId: targetId }] },
        { $unset: { agentId: '', agencyId: '' } }
      );
      await AgencyInvite.deleteMany({ agencyId: targetId });
      // Remove from any other agency's topAgents
      await User.updateMany(
        {},
        { $pull: { 'agencyStats.topAgents': { _id: targetId } } }
      );
      await User.deleteOne({ _id: targetId });

      return res.status(200).json({ success: true, message: 'User deleted' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Admin user action error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};
