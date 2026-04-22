const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Property = require('../models/Property');
const Development = require('../models/Development');

const BATCH = 80;

function str(v) {
    return v == null ? '' : String(v);
}

function importDir(agencyId, sub) {
    return path.join('uploads', 'agency-imports', String(agencyId), sub);
}

function unlinkQuiet(p) {
    try {
        if (p && fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {
        console.warn('agencyResetJob unlink:', p, e.message);
    }
}

function rmDirQuiet(dir) {
    try {
        if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
        console.warn('agencyResetJob rmdir:', dir, e.message);
    }
}

function ensureMigrationImports(user) {
    if (!user.agencyStats) user.agencyStats = {};
    if (!user.agencyStats.migrationImports || typeof user.agencyStats.migrationImports !== 'object') {
        user.agencyStats.migrationImports = { hubspot: [], propdata: [] };
    }
    if (!Array.isArray(user.agencyStats.migrationImports.hubspot)) user.agencyStats.migrationImports.hubspot = [];
    if (!Array.isArray(user.agencyStats.migrationImports.propdata)) user.agencyStats.migrationImports.propdata = [];
}

function pruneTopAgentsForRemovedIds(user, removedObjectIds) {
    const idSet = new Set(removedObjectIds.map((id) => String(id)));
    if (!user.agencyStats || !Array.isArray(user.agencyStats.topAgents)) return;
    user.agencyStats.topAgents = user.agencyStats.topAgents.filter((a) => {
        const aid = a._id != null ? String(a._id) : '';
        return !aid || !idSet.has(aid);
    });
}

/**
 * @param {Set<string>} expanded
 */
function planResetPhases(expanded) {
    const phases = [];
    if (expanded.has('hubspot-files') || expanded.has('propdata-files')) {
        phases.push({ key: 'files', title: 'Archived migration files', status: 'pending', current: 0, total: 0, detail: '', error: '' });
    }
    if (expanded.has('agency-properties-all') || expanded.has('propdata-properties')) {
        phases.push({ key: 'properties', title: 'Property listings', status: 'pending', current: 0, total: 0, detail: '', error: '' });
    }
    if (expanded.has('agency-agents-all') || expanded.has('propdata-agents')) {
        phases.push({ key: 'agents', title: 'Listing agent accounts', status: 'pending', current: 0, total: 0, detail: '', error: '' });
    }
    const touchesCrm =
        expanded.has('agency-crm-all') || expanded.has('propdata-leads') || expanded.has('hubspot-leads');
    if (touchesCrm) {
        phases.push({ key: 'crm', title: 'CRM leads', status: 'pending', current: 0, total: 0, detail: '', error: '' });
    }
    const touchesDeals = expanded.has('agency-pipeline-all') || expanded.has('hubspot-deals');
    if (touchesDeals) {
        phases.push({ key: 'deals', title: 'Pipeline deals', status: 'pending', current: 0, total: 0, detail: '', error: '' });
    }
    return phases;
}

function createAgencyResetJob({ id, agencyId, expandedScopes }) {
    const expanded = new Set(expandedScopes);
    return {
        id,
        agencyId: String(agencyId),
        expandedScopes: [...expanded],
        phases: planResetPhases(expanded),
        report: {},
        done: false,
        error: null,
        _expanded: expanded,
    };
}

async function batchedDeleteProperties(query, phase) {
    const ids = await Property.find(query).select('_id').lean();
    const all = ids.map((x) => x._id);
    phase.total = all.length;
    phase.current = 0;
    if (!all.length) return 0;
    let deleted = 0;
    for (let i = 0; i < all.length; i += BATCH) {
        const slice = all.slice(i, i + BATCH);
        const r = await Property.deleteMany({ _id: { $in: slice } });
        deleted += r.deletedCount || 0;
        phase.current = Math.min(i + slice.length, all.length);
        await new Promise((resolve) => setImmediate(resolve));
    }
    return deleted;
}

async function executeAgencyResetJob(job) {
    const expanded = job._expanded instanceof Set ? job._expanded : new Set(job.expandedScopes || []);
    const agencyId = job.agencyId;
    const report = {
        deletedProperties: 0,
        deletedPropdataProperties: 0,
        deletedAgencyAgents: 0,
        deletedPropdataAgents: 0,
        removedCrmLeads: 0,
        removedPropdataLeads: 0,
        removedHubspotLeads: 0,
        removedPipelineDeals: 0,
        removedHubspotDeals: 0,
        clearedPropdataFiles: false,
        clearedHubspotFiles: false,
        deletedDevelopments: 0,
    };
    job.report = report;
    job.error = null;
    job.done = false;

    try {
        const user = await User.findById(agencyId);
        if (!user) throw new Error('Agency not found');
        ensureMigrationImports(user);

        const hubDir = importDir(agencyId, 'hubspot');
        const propDir = importDir(agencyId, 'propdata');

        for (const phase of job.phases) {
            phase.status = 'running';
            phase.detail = '';
            phase.error = '';

            if (phase.key === 'files') {
                const steps = (expanded.has('hubspot-files') ? 1 : 0) + (expanded.has('propdata-files') ? 1 : 0);
                phase.total = Math.max(steps, 1);
                phase.current = 0;
                let step = 0;
                if (expanded.has('hubspot-files')) {
                    for (const meta of user.agencyStats.migrationImports.hubspot) {
                        unlinkQuiet(meta.storedPath);
                    }
                    user.agencyStats.migrationImports.hubspot = [];
                    rmDirQuiet(hubDir);
                    report.clearedHubspotFiles = true;
                    step += 1;
                    phase.current = step;
                    await new Promise((r) => setImmediate(r));
                }
                if (expanded.has('propdata-files')) {
                    for (const meta of user.agencyStats.migrationImports.propdata) {
                        unlinkQuiet(meta.storedPath);
                    }
                    user.agencyStats.migrationImports.propdata = [];
                    rmDirQuiet(propDir);
                    report.clearedPropdataFiles = true;
                    step += 1;
                    phase.current = step;
                    await new Promise((r) => setImmediate(r));
                }
                if (!steps) {
                    phase.status = 'skipped';
                    phase.detail = 'No file scopes';
                } else {
                    phase.status = 'done';
                    phase.detail = `Cleared ${step} archive group(s)`;
                }
                continue;
            }

            if (phase.key === 'properties') {
                if (expanded.has('agency-properties-all')) {
                    const agentIds = await User.find({ agencyId: user._id, role: 'agency_agent' }).distinct('_id');
                    const q = {
                        $or: [{ importAgencyId: user._id }, { agentId: user._id }, { agentId: { $in: agentIds } }],
                    };
                    const n = await batchedDeleteProperties(q, phase);
                    report.deletedProperties = n;
                    const devMemberIds = await User.find({ agencyId: user._id }).distinct('_id');
                    const devDel = await Development.deleteMany({
                        $or: [
                            { agencyId: user._id },
                            { agentId: user._id },
                            { agentId: { $in: devMemberIds } },
                        ],
                    });
                    report.deletedDevelopments = devDel.deletedCount || 0;
                    phase.detail = `Removed ${n} listing(s) and ${report.deletedDevelopments} development project(s) (all sources for this agency)`;
                } else if (expanded.has('propdata-properties')) {
                    const q = { importSource: 'propdata', importAgencyId: user._id };
                    const n = await batchedDeleteProperties(q, phase);
                    report.deletedPropdataProperties = n;
                    report.deletedProperties = n;
                    phase.detail = `Removed ${n} PropData import listing(s)`;
                } else {
                    phase.status = 'skipped';
                    continue;
                }
                phase.status = 'done';
                continue;
            }

            if (phase.key === 'agents') {
                if (expanded.has('agency-agents-all')) {
                    const agentDocs = await User.find({ agencyId: user._id, role: 'agency_agent' }).select('_id');
                    const ids = agentDocs.map((d) => d._id);
                    phase.total = ids.length;
                    phase.current = 0;
                    if (!ids.length) {
                        user.agencyStats.topAgents = [];
                        phase.detail = 'No agent accounts to remove';
                    } else {
                        let del = 0;
                        for (let i = 0; i < ids.length; i += BATCH) {
                            const slice = ids.slice(i, i + BATCH);
                            const r = await User.deleteMany({ _id: { $in: slice } });
                            del += r.deletedCount || 0;
                            phase.current = Math.min(i + slice.length, ids.length);
                            await new Promise((r2) => setImmediate(r2));
                        }
                        report.deletedAgencyAgents = del;
                        user.agencyStats.topAgents = [];
                        phase.detail = `Removed ${del} agency agent account(s); cleared top-agents list`;
                    }
                } else if (expanded.has('propdata-agents')) {
                    const agentDocs = await User.find({
                        agencyId: user._id,
                        role: 'agency_agent',
                        migrationSource: 'propdata',
                    }).select('_id');
                    const ids = agentDocs.map((d) => d._id);
                    phase.total = ids.length;
                    phase.current = 0;
                    if (ids.length) {
                        pruneTopAgentsForRemovedIds(user, ids);
                        let del = 0;
                        for (let i = 0; i < ids.length; i += BATCH) {
                            const slice = ids.slice(i, i + BATCH);
                            const r = await User.deleteMany({ _id: { $in: slice } });
                            del += r.deletedCount || 0;
                            phase.current = Math.min(i + slice.length, ids.length);
                            await new Promise((r2) => setImmediate(r2));
                        }
                        report.deletedPropdataAgents = del;
                        phase.detail = `Removed ${del} agent(s) tagged PropData import`;
                    } else {
                        phase.detail = 'No PropData-tagged agents found (use “All listing agents” if older accounts lack tags)';
                    }
                } else {
                    phase.status = 'skipped';
                    continue;
                }
                phase.status = 'done';
                continue;
            }

            if (phase.key === 'crm') {
                if (!Array.isArray(user.agencyStats.crmLeads)) user.agencyStats.crmLeads = [];
                const before = user.agencyStats.crmLeads.length;
                phase.total = Math.max(before, 1);
                phase.current = 0;

                if (expanded.has('agency-crm-all')) {
                    report.removedCrmLeads = before;
                    user.agencyStats.crmLeads = [];
                    phase.current = 1;
                    phase.detail = `Cleared all ${before} lead(s)`;
                } else {
                    let leads = user.agencyStats.crmLeads;
                    if (expanded.has('hubspot-leads')) {
                        const n = leads.length;
                        leads = leads.filter((l) => !str(l.id).startsWith('hubspot-co-'));
                        report.removedHubspotLeads = n - leads.length;
                    }
                    if (expanded.has('propdata-leads')) {
                        const n = leads.length;
                        leads = leads.filter(
                            (l) => !str(l.id).startsWith('propdata-') && !str(l.id).startsWith('propdata-pd-'),
                        );
                        report.removedPropdataLeads = n - leads.length;
                    }
                    user.agencyStats.crmLeads = leads;
                    report.removedCrmLeads = before - leads.length;
                    phase.current = 1;
                    phase.detail = `Removed ${before - leads.length} lead row(s) (filtered)`;
                }
                phase.status = 'done';
                continue;
            }

            if (phase.key === 'deals') {
                if (!Array.isArray(user.agencyStats.pipelineDeals)) user.agencyStats.pipelineDeals = [];
                const before = user.agencyStats.pipelineDeals.length;
                phase.total = 1;
                phase.current = 0;

                if (expanded.has('agency-pipeline-all')) {
                    report.removedPipelineDeals = before;
                    user.agencyStats.pipelineDeals = [];
                    phase.detail = `Cleared all ${before} deal(s)`;
                } else if (expanded.has('hubspot-deals')) {
                    user.agencyStats.pipelineDeals = user.agencyStats.pipelineDeals.filter(
                        (d) => !str(d.id).startsWith('hubspot-de-'),
                    );
                    report.removedHubspotDeals = before - user.agencyStats.pipelineDeals.length;
                    phase.detail = `Removed ${report.removedHubspotDeals} HubSpot-linked deal(s)`;
                }
                phase.current = 1;
                phase.status = 'done';
            }
        }

        user.markModified('agencyStats');
        await user.save();
    } catch (e) {
        job.error = e.message || String(e);
        for (const p of job.phases || []) {
            if (p.status === 'running') {
                p.status = 'error';
                p.error = job.error;
            }
        }
    } finally {
        delete job._expanded;
        job.done = true;
    }
}

function publicAgencyResetPayload(job) {
    return {
        jobId: job.id,
        done: job.done,
        error: job.error,
        phases: (job.phases || []).map((p) => ({
            key: p.key,
            title: p.title,
            status: p.status,
            current: p.current,
            total: p.total,
            detail: p.detail || '',
            error: p.error || '',
        })),
        summary: job.report,
    };
}

module.exports = {
    createAgencyResetJob,
    executeAgencyResetJob,
    publicAgencyResetPayload,
    planResetPhases,
};
