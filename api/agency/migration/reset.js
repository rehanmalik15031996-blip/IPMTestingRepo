const { handleCors } = require('../../_lib/cors');
const { requireAgencyUser } = require('./_helpers');
const User = require('../../../server/models/User');
const { createAgencyResetJob, executeAgencyResetJob, publicAgencyResetPayload } = require('../../../server/services/agencyResetJob');

const RESET_CONFIRM_PHRASE = 'ok';
const RESET_CONFIRM_ALIASES = new Set([RESET_CONFIRM_PHRASE, 'reset my import data']);
const RESET_ATOMIC = new Set(['propdata-properties','propdata-leads','propdata-agents','propdata-files','hubspot-leads','hubspot-deals','hubspot-files','agency-properties-all','agency-agents-all','agency-crm-all','agency-pipeline-all']);
const AGENCY_EVERYTHING_SCOPES = ['propdata-files','hubspot-files','agency-properties-all','agency-agents-all','agency-crm-all','agency-pipeline-all'];

function normalizePhrase(s) { return String(s ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase().normalize('NFKC'); }
function strReset(v) { return v == null ? '' : String(v); }

function expandResetScopes(list) {
  const out = new Set();
  for (let s of list) {
    s = strReset(s).replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase().trim();
    if (!s) continue;
    if (s === 'all') ['propdata-properties','propdata-leads','propdata-agents','propdata-files','hubspot-leads','hubspot-deals','hubspot-files'].forEach((x) => out.add(x));
    else if (s === 'agency-everything') AGENCY_EVERYTHING_SCOPES.forEach((x) => out.add(x));
    else if (s === 'propdata' || s === 'propdata-all') ['propdata-properties','propdata-leads','propdata-agents','propdata-files'].forEach((x) => out.add(x));
    else if (s === 'hubspot' || s === 'hubspot-all') ['hubspot-leads','hubspot-deals','hubspot-files'].forEach((x) => out.add(x));
    else if (RESET_ATOMIC.has(s)) out.add(s);
  }
  return out;
}

async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { scope, scopes, confirmPhrase } = body;
    const phrase = normalizePhrase(confirmPhrase);
    if (!RESET_CONFIRM_ALIASES.has(phrase)) return res.status(400).json({ message: `Type the confirmation (${RESET_CONFIRM_PHRASE}) in the box.` });
    const norm = (v) => strReset(v).replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase().trim();
    let rawList = [];
    if (Array.isArray(scopes) && scopes.length) rawList = scopes.map(norm).filter(Boolean);
    else if (typeof scopes === 'string' && scopes.trim()) rawList = [norm(scopes)];
    else if (scope) rawList = [norm(scope)];
    if (!rawList.length) return res.status(400).json({ message: 'Provide scopes[].' });
    const expanded = expandResetScopes(rawList);
    if (!expanded.size) return res.status(400).json({ message: 'No valid reset scopes.' });
    const user = await User.findById(agencyUser._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const job = createAgencyResetJob({ id: 'sync-reset', agencyId: user._id, expandedScopes: [...expanded] });
    await executeAgencyResetJob(job);
    const payload = publicAgencyResetPayload(job);
    res.status(200).json({ success: true, done: true, scopesApplied: [...expanded], ...payload });
  } catch (err) {
    console.error('agency reset error:', err);
    res.status(500).json({ message: err.message });
  }
}

module.exports = handler;
