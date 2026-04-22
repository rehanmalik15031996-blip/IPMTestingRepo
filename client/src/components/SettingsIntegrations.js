import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../config/api';
import { usePropdataImport } from '../context/PropdataImportContext';
import { invalidateDashboardCache } from '../config/dashboardCache';

const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#334155' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' };
const saveBtnStyle = { background: '#11575C', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' };
const muted = { fontSize: '13px', color: '#64748b', lineHeight: 1.5 };
const cardStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    background: '#fafafa',
};
const docLink = { color: '#11575C', fontWeight: 600, textDecoration: 'underline' };

const RESET_CONFIRM_PHRASE = 'ok';

function normalizeResetConfirmationInput(s) {
    return String(s ?? '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim()
        .toLowerCase()
        .normalize('NFKC');
}

function isResetConfirmationValid(s) {
    const n = normalizeResetConfirmationInput(s);
    return n === RESET_CONFIRM_PHRASE || n === 'reset my import data';
}

function ModeToggle({ value, onChange, isMobile }) {
    const opts = [
        { id: 'api', label: 'Connect with API' },
        { id: 'files', label: 'Upload export files' },
    ];
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {opts.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    onClick={() => onChange(o.id)}
                    style={{
                        padding: isMobile ? '10px 14px' : '10px 18px',
                        borderRadius: '8px',
                        border: value === o.id ? '2px solid #11575C' : '1px solid #cbd5e1',
                        background: value === o.id ? '#ecfdf5' : '#fff',
                        color: value === o.id ? '#11575C' : '#475569',
                        fontWeight: value === o.id ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export default function SettingsIntegrations({ isMobile }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [status, setStatus] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [hubMode, setHubMode] = useState('api');
    const [propMode, setPropMode] = useState('api');
    const [hubConnectKind, setHubConnectKind] = useState('private_app'); // private_app | oauth

    const [hubPrivateToken, setHubPrivateToken] = useState('');
    const [hubClientId, setHubClientId] = useState('');
    const [hubClientSecret, setHubClientSecret] = useState('');
    const [hubRedirectUri, setHubRedirectUri] = useState(() => {
        if (typeof window === 'undefined') return '';
        return `${window.location.origin}/api/agency/migration/integrations/hubspot/oauth/callback`;
    });

    const [propUser, setPropUser] = useState('');
    const [propPass, setPropPass] = useState('');
    const [propXlsxResidential, setPropXlsxResidential] = useState(null);
    const [propXlsxLeads, setPropXlsxLeads] = useState(null);
    const [replacePropdataLeads, setReplacePropdataLeads] = useState(false);
    const [leanPropdataImport, setLeanPropdataImport] = useState(false);
    const [maxListingsInput, setMaxListingsInput] = useState('');
    const [hsContactsFile, setHsContactsFile] = useState(null);
    const [hsDealsFile, setHsDealsFile] = useState(null);
    const [replaceHubspotLeads, setReplaceHubspotLeads] = useState(false);

    const [hubPipelines, setHubPipelines] = useState(null);
    const [hubContactsPreview, setHubContactsPreview] = useState(null);
    const [hubDealsPreview, setHubDealsPreview] = useState(null);
    const [hubSyncResult, setHubSyncResult] = useState(null);
    const [hubImportResult, setHubImportResult] = useState(null);

    const [busy, setBusy] = useState('');
    const [msg, setMsg] = useState({ type: '', text: '' });

    const { propdataJobId, propdataJobStatus, beginPropdataImportJob } = usePropdataImport();

    const [resetPhrase, setResetPhrase] = useState('');
    const [resetJobId, setResetJobId] = useState(null);
    const [resetJobStatus, setResetJobStatus] = useState(null);
    const [leanListingsDebug, setLeanListingsDebug] = useState(null);

    const showMsg = (type, text) => {
        setMsg({ type, text });
        if (text) setTimeout(() => setMsg({ type: '', text: '' }), 8000);
    };

    const loadStatus = useCallback(async () => {
        setLoadError('');
        try {
            const res = await api.get('/api/agency/migration/integrations/status');
            setStatus(res.data?.status || null);
        } catch (e) {
            setStatus(null);
            setLoadError(e.response?.data?.message || e.message || 'Could not load integration status');
        }
    }, []);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    useEffect(() => {
        if (searchParams.get('hubspot') === 'oauth_ok') {
            showMsg('ok', 'HubSpot account authorized. OAuth tokens are saved for sync.');
            const next = new URLSearchParams(searchParams);
            next.delete('hubspot');
            setSearchParams(next, { replace: true });
            loadStatus();
        }
    }, [searchParams, setSearchParams, loadStatus]);

    /** When global import job finishes, clear file inputs and refresh integration status (toast comes from PropdataImportProvider). */
    const prevDoneRef = useRef(false);
    useEffect(() => {
        const done = !!propdataJobStatus?.done;
        if (done && !prevDoneRef.current) {
            setPropXlsxResidential(null);
            setPropXlsxLeads(null);
            loadStatus();
        }
        prevDoneRef.current = done;
    }, [propdataJobStatus?.done, loadStatus]);

    useEffect(() => {
        if (!resetJobId) return undefined;
        let cancelled = false;
        let intervalId = null;

        const poll = async () => {
            try {
                const res = await api.get(`/api/agency/migration/reset/status/${resetJobId}`);
                if (cancelled) return;
                setResetJobStatus(res.data);
                if (res.data?.done) {
                    if (intervalId) clearInterval(intervalId);
                    const sum = res.data.summary || {};
                    const topErr = res.data.error;
                    const bits = [
                        sum.deletedProperties != null && sum.deletedProperties > 0 && `listings ${sum.deletedProperties}`,
                        sum.deletedAgencyAgents != null && sum.deletedAgencyAgents > 0 && `agents ${sum.deletedAgencyAgents}`,
                        sum.deletedPropdataAgents != null && sum.deletedPropdataAgents > 0 && `PropData-tagged agents ${sum.deletedPropdataAgents}`,
                        sum.removedCrmLeads != null && sum.removedCrmLeads > 0 && `CRM leads −${sum.removedCrmLeads}`,
                        sum.removedPipelineDeals != null && sum.removedPipelineDeals > 0 && `deals −${sum.removedPipelineDeals}`,
                    ]
                        .filter(Boolean)
                        .join(', ');
                    if (topErr) {
                        setMsg({ type: 'err', text: topErr });
                        setTimeout(() => setMsg({ type: '', text: '' }), 12000);
                    } else {
                        setMsg({
                            type: 'ok',
                            text: `Reset finished.${bits ? ` ${bits}.` : ''}`,
                        });
                        setTimeout(() => setMsg({ type: '', text: '' }), 10000);
                    }
                    setResetJobId(null);
                    setResetPhrase('');
                    loadStatus();
                }
            } catch (e) {
                if (!cancelled) {
                    setMsg({
                        type: 'err',
                        text: e.response?.data?.message || e.message || 'Could not read reset status',
                    });
                    setTimeout(() => setMsg({ type: '', text: '' }), 8000);
                    setResetJobId(null);
                    setResetJobStatus(null);
                }
            }
        };

        poll();
        intervalId = setInterval(poll, 550);
        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [resetJobId, loadStatus]);

    const postJson = async (path, body, label) => {
        setBusy(label);
        try {
            const res = await api.post(path, body);
            if (res.data?.status) setStatus(res.data.status);
            showMsg('ok', res.data?.message || 'Saved.');
            return true;
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'Request failed');
            return false;
        } finally {
            setBusy('');
        }
    };

    const hubspotPrivateSave = (e) => {
        e.preventDefault();
        if (!hubPrivateToken.trim()) {
            showMsg('err', 'Paste your HubSpot private app access token.');
            return;
        }
        postJson('/api/agency/migration/integrations/hubspot/private-app', { accessToken: hubPrivateToken.trim() }, 'hub-private');
        setHubPrivateToken('');
    };

    const hubspotOAuthSave = (e) => {
        e.preventDefault();
        postJson(
            '/api/agency/migration/integrations/hubspot/oauth-app',
            { clientId: hubClientId.trim(), clientSecret: hubClientSecret.trim(), redirectUri: hubRedirectUri.trim() },
            'hub-oauth-save',
        );
    };

    const hubspotAuthorize = async () => {
        setBusy('hub-oauth-url');
        try {
            const res = await api.post('/api/agency/migration/integrations/hubspot/oauth/authorize-url');
            const url = res.data?.url;
            if (!url) {
                showMsg('err', 'No authorize URL returned.');
                return;
            }
            window.location.href = url;
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'Could not start OAuth');
        } finally {
            setBusy('');
        }
    };

    const propdataConnect = (e) => {
        e.preventDefault();
        if (!propUser.trim() || !propPass) {
            showMsg('err', 'Enter PropData API username and password.');
            return;
        }
        postJson('/api/agency/migration/integrations/propdata/connect', { username: propUser.trim(), password: propPass }, 'propdata');
        setPropPass('');
    };

    const disconnect = (provider) => {
        if (!window.confirm(`Disconnect ${provider === 'hubspot' ? 'HubSpot' : 'PropData'}? Stored tokens for this agency will be removed.`)) return;
        postJson('/api/agency/migration/integrations/disconnect', { provider }, 'disconnect');
    };

    const runHubspotExportImport = async () => {
        if (!hsContactsFile && !hsDealsFile) {
            showMsg('err', 'Choose at least one HubSpot export: contacts and/or deals (CSV or XLSX).');
            return;
        }
        setBusy('hubspot-export');
        setHubImportResult(null);
        try {
            let combinedSummary = null;
            if (hsContactsFile) {
                const form = new FormData();
                form.append('contacts', hsContactsFile);
                if (replaceHubspotLeads) form.append('replaceHubspotLeads', 'true');
                const res = await api.post('/api/agency/migration/import/hubspot-export', form);
                combinedSummary = res.data?.summary || null;
            }
            if (hsDealsFile) {
                const form = new FormData();
                form.append('deals', hsDealsFile);
                const res = await api.post('/api/agency/migration/import/hubspot-export', form);
                const ds = res.data?.summary;
                if (combinedSummary && ds) {
                    combinedSummary.dealsImported = ds.dealsImported;
                    combinedSummary.dealsUpdated = ds.dealsUpdated;
                    combinedSummary.dealsSkipped = ds.dealsSkipped;
                    combinedSummary.crmConfigUpdated = ds.crmConfigUpdated || combinedSummary.crmConfigUpdated;
                    combinedSummary.pipelineStagesCount = ds.pipelineStagesCount || combinedSummary.pipelineStagesCount;
                    combinedSummary.activityChannelsCount = ds.activityChannelsCount || combinedSummary.activityChannelsCount;
                    if (ds.errors?.length) combinedSummary.errors = [...(combinedSummary.errors || []), ...ds.errors];
                } else {
                    combinedSummary = ds || null;
                }
            }
            const sum = combinedSummary;
            setHubImportResult(sum || null);
            const detail = sum
                ? ` Contacts: ${sum.contactsImported || 0} new, ${sum.contactsUpdated || 0} updated (skipped ${sum.contactsSkipped || 0}). Deals: ${sum.dealsImported || 0} new, ${sum.dealsUpdated || 0} updated (skipped ${sum.dealsSkipped || 0}).`
                : '';
            const err = sum?.errors?.length ? ` ${sum.errors.join(' ')}` : '';
            showMsg('ok', 'HubSpot import finished.' + detail + err);
            setHsContactsFile(null);
            setHsDealsFile(null);
            loadStatus();
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'HubSpot import failed');
        } finally {
            setBusy('');
        }
    };

    const fetchHubspotPipelines = async () => {
        setBusy('hub-pipelines');
        setHubPipelines(null);
        try {
            const res = await api.get('/api/agency/migration/hubspot/pipelines');
            setHubPipelines(res.data);
            showMsg('ok', `Fetched ${(res.data?.dealPipelines || []).length} deal pipeline(s) from HubSpot.`);
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'Could not fetch pipelines');
        } finally {
            setBusy('');
        }
    };

    const fetchHubspotContactsPreview = async () => {
        setBusy('hub-contacts-preview');
        setHubContactsPreview(null);
        try {
            const res = await api.get('/api/agency/migration/hubspot/contacts-preview');
            setHubContactsPreview(res.data);
            showMsg('ok', `Fetched ${res.data?.totalFetched || 0} contact(s) from HubSpot.`);
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'Could not fetch contacts');
        } finally {
            setBusy('');
        }
    };

    const fetchHubspotDealsPreview = async () => {
        setBusy('hub-deals-preview');
        setHubDealsPreview(null);
        try {
            const res = await api.get('/api/agency/migration/hubspot/deals-preview');
            setHubDealsPreview(res.data);
            showMsg('ok', `Fetched ${res.data?.totalFetched || 0} deal(s) from HubSpot.`);
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'Could not fetch deals');
        } finally {
            setBusy('');
        }
    };

    const runHubspotApiSync = async () => {
        if (!window.confirm('This will pull all contacts and deals from HubSpot and upsert them into your CRM. Continue?')) return;
        setBusy('hub-sync');
        setHubSyncResult(null);
        try {
            const res = await api.post('/api/agency/migration/hubspot/sync');
            setHubSyncResult(res.data?.summary || null);
            const s = res.data?.summary;
            const detail = s ? ` Contacts: ${s.contacts?.created} new, ${s.contacts?.updated} updated. Deals: ${s.deals?.created} new, ${s.deals?.updated} updated.` : '';
            showMsg('ok', (res.data?.message || 'HubSpot sync complete.') + detail);
            loadStatus();
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'HubSpot sync failed');
        } finally {
            setBusy('');
        }
    };

    const runPropdataXlsxImport = async () => {
        if (!propXlsxResidential && !propXlsxLeads) {
            showMsg('err', 'Choose at least one file: residential XLSX and/or leads XLSX.');
            return;
        }
        const ml = maxListingsInput.trim();
        if (ml !== '' && (Number.isNaN(Number(ml)) || Number(ml) < 1)) {
            showMsg('err', 'Max listings must be empty (import all) or a positive number (e.g. 3 for a quick test).');
            return;
        }
        setBusy('propdata-xlsx');
        try {
            let totalProperties = 0;
            let totalLeads = 0;
            if (propXlsxResidential) {
                const form = new FormData();
                form.append('residential', propXlsxResidential);
                if (leanPropdataImport) form.append('leanImport', 'true');
                if (ml !== '') form.append('maxListings', ml);
                const res = await api.post('/api/agency/migration/import/propdata-xlsx', form);
                totalProperties = res.data?.summary?.propertiesUpserted || 0;
                totalLeads += res.data?.summary?.leadsImported || 0;
            }
            if (propXlsxLeads) {
                const form = new FormData();
                form.append('leads', propXlsxLeads);
                if (replacePropdataLeads) form.append('replacePropdataLeads', 'true');
                if (ml !== '') form.append('maxListings', ml);
                const res = await api.post('/api/agency/migration/import/propdata-xlsx', form);
                totalLeads += res.data?.summary?.leadsImported || 0;
                if (!propXlsxResidential) totalProperties = res.data?.summary?.propertiesUpserted || 0;
            }
            showMsg('ok', `Import complete — ${totalProperties} properties, ${totalLeads} leads.`);
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'Import failed');
        } finally {
            setBusy('');
        }
    };

    const runMigrationReset = async () => {
        if (!isResetConfirmationValid(resetPhrase)) {
            showMsg('err', `Type ${RESET_CONFIRM_PHRASE} in the confirmation box.`);
            return;
        }
        if (
            !window.confirm(
                'This permanently deletes all agency listings and development projects, all listing-agent accounts, all CRM leads, all pipeline deals, and PropData/HubSpot import archives. API connections stay — disconnect above if needed. Continue?',
            )
        ) {
            return;
        }
        setBusy('migration-reset');
        setResetJobStatus(null);
        try {
            const res = await api.post('/api/agency/migration/reset', {
                scopes: ['agency-everything'],
                confirmPhrase: normalizeResetConfirmationInput(resetPhrase),
            });
            if (res.data?.done) {
                const sum = res.data.summary || res.data.report || {};
                const parts = [];
                if (sum.deletedProperties) parts.push(`${sum.deletedProperties} properties`);
                if (sum.removedCrmLeads) parts.push(`${sum.removedCrmLeads} leads`);
                if (sum.deletedAgencyAgents) parts.push(`${sum.deletedAgencyAgents} agents`);
                showMsg('ok', `Reset complete.${parts.length ? ' Removed: ' + parts.join(', ') + '.' : ''}`);
                setResetPhrase('');
                loadStatus();
            } else if (res.data?.jobId) {
                setResetJobId(res.data.jobId);
                showMsg('ok', 'Reset running — progress below updates automatically.');
            } else {
                showMsg('err', 'Unexpected server response.');
            }
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'Reset failed');
        } finally {
            setBusy('');
        }
    };

    /** One action: sync stub listings from CRM Web Refs (when present), then load the same lean snapshot Listing Management uses. */
    const refreshListingSnapshot = async () => {
        setBusy('listing-snapshot');
        setLeanListingsDebug(null);
        try {
            let syncLine = '';
            try {
                const syncRes = await api.post('/api/agency/migration/sync/listings-from-crm-leads');
                const s = syncRes.data?.summary;
                if (s) {
                    syncLine = ` CRM sync: ${s.created} new, ${s.updated} updated (${s.uniqueWebRefs} refs).`;
                    try {
                        const u = JSON.parse(localStorage.getItem('user') || '{}');
                        if (u?._id) invalidateDashboardCache(u._id);
                    } catch {
                        /* ignore */
                    }
                    if (s.warnings?.length) {
                        syncLine += ` Warnings: ${s.warnings.slice(0, 3).join(' ')}`;
                    }
                }
            } catch (e) {
                showMsg('err', e.response?.data?.message || e.message || 'CRM listing sync failed');
                return;
            }
            const res = await api.get('/api/agency/migration/debug/listings-lean');
            setLeanListingsDebug(res.data);
            const n = res.data?.counts?.matchingAgencyScope;
            showMsg(
                'ok',
                typeof n === 'number' ? `${n} listing(s) in agency scope.${syncLine}` : `Snapshot loaded.${syncLine}`,
            );
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'Snapshot failed');
        } finally {
            setBusy('');
        }
    };

    const uploadFiles = async (provider, fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const form = new FormData();
        files.forEach((f) => form.append('files', f));
        setBusy(`upload-${provider}`);
        try {
            await api.post(`/api/agency/migration/${provider}`, form);
            showMsg('ok', `${files.length} file(s) uploaded.`);
            loadStatus();
        } catch (e) {
            showMsg('err', e.response?.data?.message || e.message || 'Upload failed');
        } finally {
            setBusy('');
        }
    };

    const s = status;

    return (
        <div>
            <h3 style={{ marginTop: 0, color: '#1f3a3d' }}>Integrations</h3>
            <p style={muted}>
                Connect HubSpot and PropData for CRM and listing sync, or upload exports manually. API details follow each vendor&apos;s official documentation.
            </p>

            {loadError && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px' }}>
                    {loadError}
                </div>
            )}
            {msg.text && (
                <div
                    style={{
                        padding: '12px 16px',
                        marginBottom: '16px',
                        borderRadius: '8px',
                        background: msg.type === 'ok' ? '#ecfdf5' : '#fef2f2',
                        border: `1px solid ${msg.type === 'ok' ? '#a7f3d0' : '#fecaca'}`,
                        color: msg.type === 'ok' ? '#065f46' : '#991b1b',
                    }}
                >
                    {msg.text}
                </div>
            )}

            {/* HubSpot */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, color: '#1f3a3d' }}>HubSpot</h4>
                    {s?.hubspot && (s.hubspot.privateAppConnected || s.hubspot.oauthConnected) && (
                        <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>Connected</span>
                    )}
                </div>
                <p style={muted}>
                    <a href="https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview" target="_blank" rel="noopener noreferrer" style={docLink}>
                        Private apps
                    </a>{' '}
                    use a single access token (Super Admin).{' '}
                    <a href="https://developers.hubspot.com/docs/guides/apps/authentication/working-with-oauth" target="_blank" rel="noopener noreferrer" style={docLink}>
                        OAuth
                    </a>{' '}
                    uses a public app with client ID, client secret, and redirect URL. Recommended CRM scopes include contacts, deals, and companies (read/write as needed).
                </p>
                {s?.hubspot?.portalId && (
                    <p style={{ ...muted, marginTop: 8 }}>Portal ID: {s.hubspot.portalId}</p>
                )}

                <ModeToggle value={hubMode} onChange={setHubMode} isMobile={isMobile} />

                {hubMode === 'api' && (
                    <>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            <button
                                type="button"
                                onClick={() => setHubConnectKind('private_app')}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    border: hubConnectKind === 'private_app' ? '2px solid #11575C' : '1px solid #cbd5e1',
                                    background: hubConnectKind === 'private_app' ? '#fff' : '#f8fafc',
                                    cursor: 'pointer',
                                }}
                            >
                                Private app token
                            </button>
                            <button
                                type="button"
                                onClick={() => setHubConnectKind('oauth')}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    border: hubConnectKind === 'oauth' ? '2px solid #11575C' : '1px solid #cbd5e1',
                                    background: hubConnectKind === 'oauth' ? '#fff' : '#f8fafc',
                                    cursor: 'pointer',
                                }}
                            >
                                OAuth app
                            </button>
                        </div>

                        {hubConnectKind === 'private_app' && (
                            <form onSubmit={hubspotPrivateSave}>
                                <p style={muted}>
                                    In HubSpot: Settings → Integrations → Private Apps → Create a token. Grant scopes such as{' '}
                                    <code style={{ fontSize: '12px' }}>crm.objects.contacts.read</code>,{' '}
                                    <code style={{ fontSize: '12px' }}>crm.objects.deals.read</code> (and write scopes if you need two-way sync). Paste the token below; we verify it against HubSpot before saving.
                                </p>
                                <label style={labelStyle}>Private app access token</label>
                                <input
                                    type="password"
                                    autoComplete="off"
                                    value={hubPrivateToken}
                                    onChange={(e) => setHubPrivateToken(e.target.value)}
                                    style={inputStyle}
                                    placeholder="pat-na1-..."
                                />
                                <button type="submit" style={{ ...saveBtnStyle, marginTop: '14px' }} disabled={!!busy}>
                                    {busy === 'hub-private' ? 'Verifying…' : 'Save & verify token'}
                                </button>
                            </form>
                        )}

                        {hubConnectKind === 'oauth' && (
                            <form onSubmit={hubspotOAuthSave}>
                                <p style={muted}>
                                    Create a public app in HubSpot (Developer account) and add this <strong>exact</strong> redirect URL to the app. It must match what you enter here and what HubSpot shows in the app settings.
                                </p>
                                <label style={labelStyle}>Redirect URL (callback)</label>
                                <input type="url" value={hubRedirectUri} onChange={(e) => setHubRedirectUri(e.target.value)} style={inputStyle} />
                                <label style={{ ...labelStyle, marginTop: '14px' }}>Client ID</label>
                                <input type="text" value={hubClientId} onChange={(e) => setHubClientId(e.target.value)} style={inputStyle} autoComplete="off" />
                                <label style={{ ...labelStyle, marginTop: '14px' }}>Client secret</label>
                                <input type="password" value={hubClientSecret} onChange={(e) => setHubClientSecret(e.target.value)} style={inputStyle} autoComplete="off" />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '14px' }}>
                                    <button type="submit" style={saveBtnStyle} disabled={!!busy}>
                                        {busy === 'hub-oauth-save' ? 'Saving…' : 'Save app credentials'}
                                    </button>
                                    <button type="button" onClick={hubspotAuthorize} style={{ ...saveBtnStyle, background: '#0f766e' }} disabled={!!busy}>
                                        {busy === 'hub-oauth-url' ? '…' : 'Continue to HubSpot to authorize'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {(s?.hubspot?.privateAppConnected || s?.hubspot?.oauthConnected) && (
                            <button type="button" onClick={() => disconnect('hubspot')} style={{ marginTop: '16px', background: 'transparent', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>
                                Disconnect HubSpot
                            </button>
                        )}
                    </>
                )}

                {(s?.hubspot?.privateAppConnected || s?.hubspot?.oauthConnected) && (
                    <div style={{ marginTop: '20px', padding: '20px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                        <h5 style={{ margin: '0 0 12px', color: '#166534' }}>Live HubSpot sync</h5>
                        <p style={muted}>
                            Pull pipeline stages, contacts (with lifecycle stage &amp; lead status), and deals (with deal stage) directly from HubSpot&rsquo;s API.
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
                            <button type="button" onClick={fetchHubspotPipelines} disabled={!!busy} style={{ ...saveBtnStyle, background: '#15803d', fontSize: '13px', padding: '8px 14px' }}>
                                {busy === 'hub-pipelines' ? 'Loading…' : 'View pipelines & stages'}
                            </button>
                            <button type="button" onClick={fetchHubspotContactsPreview} disabled={!!busy} style={{ ...saveBtnStyle, background: '#0e7490', fontSize: '13px', padding: '8px 14px' }}>
                                {busy === 'hub-contacts-preview' ? 'Loading…' : 'Preview contacts & lead stages'}
                            </button>
                            <button type="button" onClick={fetchHubspotDealsPreview} disabled={!!busy} style={{ ...saveBtnStyle, background: '#7c3aed', fontSize: '13px', padding: '8px 14px' }}>
                                {busy === 'hub-deals-preview' ? 'Loading…' : 'Preview deals & deal stages'}
                            </button>
                        </div>

                        {hubPipelines && (
                            <div style={{ marginTop: '16px' }}>
                                <h6 style={{ margin: '0 0 8px', color: '#334155' }}>Deal Pipelines</h6>
                                {(hubPipelines.dealPipelines || []).length === 0 && <p style={muted}>No deal pipelines found in HubSpot.</p>}
                                {(hubPipelines.dealPipelines || []).map((p) => (
                                    <div key={p.id} style={{ marginBottom: '12px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                                        <strong style={{ color: '#166534' }}>{p.label}</strong>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                            {(p.stages || []).map((st, i) => (
                                                <span key={st.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '12px', color: '#065f46' }}>
                                                    <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '16px' }}>{i + 1}</span>
                                                    {st.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {(hubPipelines.ticketPipelines || []).length > 0 && (
                                    <>
                                        <h6 style={{ margin: '12px 0 8px', color: '#334155' }}>Ticket / Service Pipelines</h6>
                                        {hubPipelines.ticketPipelines.map((p) => (
                                            <div key={p.id} style={{ marginBottom: '8px', padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <strong>{p.label}</strong>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                                    {(p.stages || []).map((st, i) => (
                                                        <span key={st.id} style={{ padding: '3px 8px', borderRadius: '12px', background: '#f1f5f9', fontSize: '12px', color: '#475569' }}>
                                                            {i + 1}. {st.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}

                        {hubContactsPreview && (
                            <div style={{ marginTop: '16px' }}>
                                <h6 style={{ margin: '0 0 8px', color: '#334155' }}>Contacts — Lifecycle stages ({hubContactsPreview.totalFetched} fetched)</h6>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                    {Object.entries(hubContactsPreview.lifecycleStages || {}).map(([stage, count]) => (
                                        <span key={stage} style={{ padding: '4px 12px', borderRadius: '20px', background: '#dbeafe', border: '1px solid #93c5fd', fontSize: '13px', color: '#1e40af' }}>
                                            {stage}: <strong>{count}</strong>
                                        </span>
                                    ))}
                                </div>
                                {Object.keys(hubContactsPreview.leadStatuses || {}).length > 0 && (
                                    <>
                                        <h6 style={{ margin: '8px 0 6px', color: '#334155', fontSize: '13px' }}>Lead Statuses</h6>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                            {Object.entries(hubContactsPreview.leadStatuses).map(([st, count]) => (
                                                <span key={st} style={{ padding: '3px 10px', borderRadius: '12px', background: '#fef3c7', border: '1px solid #ffc801', fontSize: '12px', color: '#92400e' }}>
                                                    {st}: <strong>{count}</strong>
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {(hubContactsPreview.sample || []).length > 0 && (
                                    <details>
                                        <summary style={{ cursor: 'pointer', fontSize: '13px', color: '#64748b' }}>Sample contacts</summary>
                                        <div style={{ maxHeight: '200px', overflow: 'auto', marginTop: '6px' }}>
                                            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                                        <th style={{ padding: '4px 8px' }}>Name</th>
                                                        <th style={{ padding: '4px 8px' }}>Email</th>
                                                        <th style={{ padding: '4px 8px' }}>Lifecycle</th>
                                                        <th style={{ padding: '4px 8px' }}>Lead status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {hubContactsPreview.sample.map((c, i) => (
                                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '4px 8px' }}>{c.name}</td>
                                                            <td style={{ padding: '4px 8px' }}>{c.email}</td>
                                                            <td style={{ padding: '4px 8px' }}>{c.lifecycleStage || '—'}</td>
                                                            <td style={{ padding: '4px 8px' }}>{c.leadStatus || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </details>
                                )}
                            </div>
                        )}

                        {hubDealsPreview && (
                            <div style={{ marginTop: '16px' }}>
                                <h6 style={{ margin: '0 0 8px', color: '#334155' }}>Deals — Pipeline stages ({hubDealsPreview.totalFetched} fetched)</h6>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                    {Object.entries(hubDealsPreview.dealStages || {}).map(([stage, count]) => (
                                        <span key={stage} style={{ padding: '4px 12px', borderRadius: '20px', background: '#ede9fe', border: '1px solid #c4b5fd', fontSize: '13px', color: '#5b21b6' }}>
                                            {stage}: <strong>{count}</strong>
                                        </span>
                                    ))}
                                </div>
                                {(hubDealsPreview.sample || []).length > 0 && (
                                    <details>
                                        <summary style={{ cursor: 'pointer', fontSize: '13px', color: '#64748b' }}>Sample deals</summary>
                                        <div style={{ maxHeight: '200px', overflow: 'auto', marginTop: '6px' }}>
                                            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                                        <th style={{ padding: '4px 8px' }}>Name</th>
                                                        <th style={{ padding: '4px 8px' }}>Amount</th>
                                                        <th style={{ padding: '4px 8px' }}>Pipeline</th>
                                                        <th style={{ padding: '4px 8px' }}>Stage</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {hubDealsPreview.sample.map((d, i) => (
                                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '4px 8px' }}>{d.name}</td>
                                                            <td style={{ padding: '4px 8px' }}>{d.amount || '—'}</td>
                                                            <td style={{ padding: '4px 8px' }}>{d.pipeline || '—'}</td>
                                                            <td style={{ padding: '4px 8px' }}>{d.stage || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </details>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: '20px', padding: '14px', background: '#fff', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                            <p style={{ ...muted, margin: '0 0 10px' }}>
                                <strong>Full sync</strong> — pulls all contacts (with lifecycle stage &amp; lead status) and deals (with pipeline stage) from HubSpot,
                                then upserts them into your agency CRM. Existing HubSpot-synced leads/deals are updated in place.
                            </p>
                            <button type="button" onClick={runHubspotApiSync} disabled={!!busy} style={{ ...saveBtnStyle, background: '#166534' }}>
                                {busy === 'hub-sync' ? 'Syncing…' : 'Sync contacts & deals from HubSpot'}
                            </button>
                        </div>

                        {hubSyncResult && (
                            <div style={{ marginTop: '14px', padding: '14px', background: '#fff', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                                <h6 style={{ margin: '0 0 8px', color: '#166534' }}>Sync summary</h6>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
                                    <div>Contacts: <strong>{hubSyncResult.contacts?.total}</strong> total — {hubSyncResult.contacts?.created} created, {hubSyncResult.contacts?.updated} updated</div>
                                    <div>Deals: <strong>{hubSyncResult.deals?.total}</strong> total — {hubSyncResult.deals?.created} created, {hubSyncResult.deals?.updated} updated</div>
                                </div>
                                {hubSyncResult.stageSummary && (
                                    <div style={{ marginTop: '10px' }}>
                                        {Object.keys(hubSyncResult.stageSummary.lifecycleStages || {}).length > 0 && (
                                            <div style={{ marginBottom: '8px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Lifecycle stages: </span>
                                                {Object.entries(hubSyncResult.stageSummary.lifecycleStages).map(([k, v]) => (
                                                    <span key={k} style={{ display: 'inline-block', padding: '2px 8px', margin: '2px 4px', borderRadius: '10px', background: '#dbeafe', fontSize: '12px' }}>{k}: {v}</span>
                                                ))}
                                            </div>
                                        )}
                                        {Object.keys(hubSyncResult.stageSummary.dealStages || {}).length > 0 && (
                                            <div>
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Deal stages: </span>
                                                {Object.entries(hubSyncResult.stageSummary.dealStages).map(([k, v]) => (
                                                    <span key={k} style={{ display: 'inline-block', padding: '2px 8px', margin: '2px 4px', borderRadius: '10px', background: '#ede9fe', fontSize: '12px' }}>{k}: {v}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {hubMode === 'files' && (
                    <div>
                        <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
                            <h5 style={{ margin: '0 0 10px', color: '#334155' }}>Import contacts &amp; deals from HubSpot export</h5>
                            <p style={muted}>
                                Export from HubSpot (<strong>CRM &rarr; Contacts/Deals &rarr; Actions &rarr; Export</strong>) as CSV or Excel.
                                Existing HubSpot contacts/deals are updated in place on re-import.
                            </p>

                            <details style={{ marginBottom: '16px' }}>
                                <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#11575C' }}>Which columns to include in your HubSpot export</summary>
                                <div style={{ marginTop: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#334155', lineHeight: 1.7 }}>
                                    <strong>Contacts export — include these columns:</strong>
                                    <ul style={{ margin: '4px 0 12px', paddingLeft: '20px' }}>
                                        <li><strong>Record ID</strong> — required for dedup</li>
                                        <li><strong>Email</strong>, <strong>First Name</strong>, <strong>Last Name</strong></li>
                                        <li><strong>Lifecycle Stage</strong> — where the lead is (Lead, MQL, SQL, Opportunity, Customer)</li>
                                        <li><strong>Lead Status</strong> — sub-status (New, Open, In Progress, Attempted to Contact)</li>
                                        <li><strong>Phone Number</strong>, <strong>HubSpot Owner</strong></li>
                                        <li><strong>Contact Type / Persona</strong> — helps detect buyer vs seller vs investor</li>
                                        <li><strong>Create Date</strong>, <strong>Original Source</strong>, <strong>Job Title</strong>, <strong>Company Name</strong></li>
                                    </ul>
                                    <strong>Deals export — include these columns:</strong>
                                    <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                                        <li><strong>Record ID</strong> — required for dedup</li>
                                        <li><strong>Deal Name</strong>, <strong>Amount</strong></li>
                                        <li><strong>Deal Stage</strong> — the pipeline stage (e.g. &ldquo;Contract Sent&rdquo;, &ldquo;Closed Won&rdquo;)</li>
                                        <li><strong>Pipeline</strong> — which pipeline (Sales, Rentals, etc.)</li>
                                        <li><strong>Close Date</strong>, <strong>Deal Owner</strong></li>
                                        <li><strong>Associated Contact</strong> — links the deal stage back to a contact</li>
                                    </ul>
                                </div>
                            </details>

                            <label style={labelStyle}>Contacts export (.csv / .xlsx)</label>
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                style={{ ...inputStyle, padding: '8px' }}
                                onChange={(e) => setHsContactsFile(e.target.files?.[0] || null)}
                                disabled={!!busy}
                            />
                            <label style={{ ...labelStyle, marginTop: '14px' }}>Deals export (.csv / .xlsx)</label>
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                style={{ ...inputStyle, padding: '8px' }}
                                onChange={(e) => setHsDealsFile(e.target.files?.[0] || null)}
                                disabled={!!busy}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
                                <input
                                    type="checkbox"
                                    checked={replaceHubspotLeads}
                                    onChange={(e) => setReplaceHubspotLeads(e.target.checked)}
                                    style={{ accentColor: '#11575C', width: '18px', height: '18px' }}
                                />
                                Replace existing HubSpot-imported contacts before importing
                            </label>
                            <button type="button" style={{ ...saveBtnStyle, marginTop: '16px' }} disabled={!!busy} onClick={runHubspotExportImport}>
                                {busy === 'hubspot-export' ? 'Importing…' : 'Run HubSpot export import'}
                            </button>

                            {hubImportResult && (
                                <div style={{ marginTop: '18px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                    <h6 style={{ margin: '0 0 10px', color: '#166534' }}>Import results</h6>
                                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
                                        <div>Contacts: <strong>{hubImportResult.contactsImported}</strong> new, <strong>{hubImportResult.contactsUpdated || 0}</strong> updated, <strong>{hubImportResult.contactsMergedWithPropdata || 0}</strong> merged with PropData, {hubImportResult.contactsSkipped} skipped</div>
                                        <div>Deals: <strong>{hubImportResult.dealsImported}</strong> new, <strong>{hubImportResult.dealsUpdated || 0}</strong> updated, {hubImportResult.dealsSkipped} skipped</div>
                                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                                            Agent matching: <strong>{hubImportResult.agentMatchedByEmail || 0}</strong> matched by email, <strong>{hubImportResult.agentNameOnly || 0}</strong> stored owner name only (no agent created)
                                        </div>
                                    </div>
                                    {hubImportResult.crmConfigUpdated && (
                                        <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #ffc801', fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fas fa-magic" />
                                            <span>
                                                <strong>Pipeline auto-configured</strong> — {hubImportResult.pipelineStagesCount || 0} stages and {hubImportResult.activityChannelsCount || 0} activity channels were built from your data.
                                                {' '}<a href="/crm" style={{ color: '#11575C', fontWeight: 600 }}>Go to Pipeline</a> to review.
                                            </span>
                                        </div>
                                    )}

                                    {hubImportResult.stages && (
                                        <div style={{ marginTop: '12px' }}>
                                            {Object.keys(hubImportResult.stages.lifecycleStages || {}).length > 0 && (
                                                <div style={{ marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Lifecycle stages: </span>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                                        {Object.entries(hubImportResult.stages.lifecycleStages).map(([k, v]) => (
                                                            <span key={k} style={{ padding: '3px 10px', borderRadius: '14px', background: '#dbeafe', border: '1px solid #93c5fd', fontSize: '12px', color: '#1e40af' }}>
                                                                {k || 'empty'}: <strong>{v}</strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {Object.keys(hubImportResult.stages.leadStatuses || {}).length > 0 && (
                                                <div style={{ marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Lead statuses: </span>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                                        {Object.entries(hubImportResult.stages.leadStatuses).map(([k, v]) => (
                                                            <span key={k} style={{ padding: '3px 10px', borderRadius: '14px', background: '#fef3c7', border: '1px solid #ffc801', fontSize: '12px', color: '#92400e' }}>
                                                                {k}: <strong>{v}</strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {Object.keys(hubImportResult.stages.dealStages || {}).length > 0 && (
                                                <div style={{ marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Deal stages: </span>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                                        {Object.entries(hubImportResult.stages.dealStages).map(([k, v]) => (
                                                            <span key={k} style={{ padding: '3px 10px', borderRadius: '14px', background: '#ede9fe', border: '1px solid #c4b5fd', fontSize: '12px', color: '#5b21b6' }}>
                                                                {k || 'empty'}: <strong>{v}</strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {Object.keys(hubImportResult.stages.dealPipelines || {}).length > 0 && (
                                                <div style={{ marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Pipelines: </span>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                                        {Object.entries(hubImportResult.stages.dealPipelines).map(([k, v]) => (
                                                            <span key={k} style={{ padding: '3px 10px', borderRadius: '14px', background: '#f0f9ff', border: '1px solid #7dd3fc', fontSize: '12px', color: '#0369a1' }}>
                                                                {k}: <strong>{v}</strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {Object.keys(hubImportResult.stages.contactTypes || {}).length > 0 && (
                                                <div>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Contact types (buyer/seller/investor): </span>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                                        {Object.entries(hubImportResult.stages.contactTypes).map(([k, v]) => (
                                                            <span key={k} style={{ padding: '3px 10px', borderRadius: '14px', background: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '12px', color: '#065f46' }}>
                                                                {k || 'unset'}: <strong>{v}</strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {hubImportResult.errors?.length > 0 && (
                                        <div style={{ marginTop: '10px', color: '#991b1b', fontSize: '12px' }}>
                                            {hubImportResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <h5 style={{ margin: '0 0 10px', color: '#334155' }}>Archive raw files on server</h5>
                        <p style={muted}>Upload HubSpot export files for backup. Max 50 files, 50 MB each.</p>
                        <input
                            type="file"
                            multiple
                            onChange={(e) => {
                                uploadFiles('hubspot', e.target.files);
                                e.target.value = '';
                            }}
                            disabled={!!busy}
                        />
                        {s?.migrationFiles?.hubspot > 0 && (
                            <p style={{ ...muted, marginTop: '10px' }}>{s.migrationFiles.hubspot} file(s) on record.</p>
                        )}
                    </div>
                )}
            </div>

            {/* PropData */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, color: '#1f3a3d' }}>PropData</h4>
                    {s?.propdata?.connected && <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>Connected</span>}
                </div>
                <p style={muted}>
                    PropData uses a vendor API account. Login is HTTP Basic (username:password, Base64) to obtain a <strong>bearer token</strong> for all other endpoints. See{' '}
                    <a href="https://staging.api-docs.propdata.net/api/users/authentication" target="_blank" rel="noopener noreferrer" style={docLink}>
                        PropData authentication
                    </a>
                    . Production gateway: <code style={{ fontSize: '12px' }}>api-gw.propdata.net</code>. Request vendor access from{' '}
                    <a href="mailto:support@propdata.net" style={docLink}>
                        support@propdata.net
                    </a>{' '}
                    if needed. Tokens can be renewed via <code style={{ fontSize: '12px' }}>GET /users/api/v1/renew-token/</code> with <code style={{ fontSize: '12px' }}>Authorization: Bearer</code>.
                </p>
                {s?.propdata?.vendorEmail && (
                    <p style={{ ...muted, marginTop: 8 }}>Last linked account email: {s.propdata.vendorEmail}</p>
                )}

                <ModeToggle value={propMode} onChange={setPropMode} isMobile={isMobile} />

                {propMode === 'api' && (
                    <form onSubmit={propdataConnect}>
                        <label style={labelStyle}>API username</label>
                        <input type="text" value={propUser} onChange={(e) => setPropUser(e.target.value)} style={inputStyle} autoComplete="username" />
                        <label style={{ ...labelStyle, marginTop: '14px' }}>API password</label>
                        <input type="password" value={propPass} onChange={(e) => setPropPass(e.target.value)} style={inputStyle} autoComplete="current-password" />
                        <button type="submit" style={{ ...saveBtnStyle, marginTop: '14px' }} disabled={!!busy}>
                            {busy === 'propdata' ? 'Connecting…' : 'Verify & store bearer token'}
                        </button>
                        {s?.propdata?.connected && (
                            <button type="button" onClick={() => disconnect('propdata')} style={{ marginLeft: '12px', marginTop: '14px', background: 'transparent', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>
                                Disconnect
                            </button>
                        )}
                    </form>
                )}

                {propMode === 'files' && (
                    <div>
                        <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
                            <h5 style={{ margin: '0 0 10px', color: '#334155' }}>Import listings &amp; CRM from XLSX</h5>
                            <p style={muted}>
                                Use the PropData <strong>residential-all-data</strong> workbook (sheets <code style={{ fontSize: '12px' }}>Export</code>,{' '}
                                <code style={{ fontSize: '12px' }}>Images</code>, optional <code style={{ fontSize: '12px' }}>Floor Plans</code>) and the{' '}
                                <strong>leads-all-data</strong> workbook.                                 Image URLs from the file are stored on each listing (no download). Each property gets <code style={{ fontSize: '12px' }}>importRecordId</code> /{' '}
                                <code style={{ fontSize: '12px' }}>importListingRef</code> (Web Ref) and <code style={{ fontSize: '12px' }}>externalIds.propdata</code>. Listing agents are created as{' '}
                                <code style={{ fontSize: '12px' }}>agency_agent</code> users with a random password — <strong>no invite emails</strong> are sent. Leads get <code style={{ fontSize: '12px' }}>externalIds.propdata.webRef</code> when parsed from the listing text (e.g. SIR…).
                            </p>
                            <label style={labelStyle}>Residential export (.xlsx)</label>
                            <input
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                style={{ ...inputStyle, padding: '8px' }}
                                onChange={(e) => setPropXlsxResidential(e.target.files?.[0] || null)}
                                disabled={!!busy || !!propdataJobId}
                            />
                            <label style={{ ...labelStyle, marginTop: '14px' }}>Leads export (.xlsx)</label>
                            <input
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                style={{ ...inputStyle, padding: '8px' }}
                                onChange={(e) => setPropXlsxLeads(e.target.files?.[0] || null)}
                                disabled={!!busy || !!propdataJobId}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
                                <input
                                    type="checkbox"
                                    checked={replacePropdataLeads}
                                    onChange={(e) => setReplacePropdataLeads(e.target.checked)}
                                    style={{ accentColor: '#11575C', width: '18px', height: '18px' }}
                                />
                                Replace existing PropData-imported leads (id prefixes <code style={{ fontSize: '12px' }}>propdata-</code> / <code style={{ fontSize: '12px' }}>propdata-pd-</code>) before adding from this file
                            </label>
                            <label style={{ ...labelStyle, marginTop: '14px' }}>Max listings (optional)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={maxListingsInput}
                                onChange={(e) => setMaxListingsInput(e.target.value.replace(/[^\d]/g, ''))}
                                placeholder="e.g. 3 for a quick test — leave empty for all rows"
                                style={{ ...inputStyle, maxWidth: '320px' }}
                                disabled={!!busy || !!propdataJobId}
                            />
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '12px', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
                                <input
                                    type="checkbox"
                                    checked={leanPropdataImport}
                                    onChange={(e) => setLeanPropdataImport(e.target.checked)}
                                    style={{ accentColor: '#11575C', width: '18px', height: '18px', marginTop: '2px' }}
                                    disabled={!!busy || !!propdataJobId}
                                />
                                <span>
                                    <strong>Lean listings only</strong> — same data as full import (all photos from <code style={{ fontSize: '12px' }}>Images</code>, floor plan URLs, location, pricing, features, etc.); tagged{' '}
                                    <code style={{ fontSize: '12px' }}>listingMetadata.propdata.leanImport</code>.
                                </span>
                            </label>
                            <p style={{ ...muted, marginTop: '6px', fontSize: '12px' }}>
                                Listing rows need a Web Ref or record id. Agents and leads still run as usual; only eligible listing rows are capped.
                            </p>
                            <button
                                type="button"
                                style={{ ...saveBtnStyle, marginTop: '16px' }}
                                disabled={!!busy || !!propdataJobId}
                                onClick={runPropdataXlsxImport}
                            >
                                {busy === 'propdata-xlsx' || propdataJobId ? 'Starting…' : 'Run XLSX import'}
                            </button>
                            {(propdataJobId || propdataJobStatus?.phases?.length) && (
                                <div
                                    style={{
                                        marginTop: '20px',
                                        padding: '16px',
                                        background: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                    }}
                                >
                                    <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#334155' }}>Import progress</p>
                                    {propdataJobId && !propdataJobStatus?.phases?.length && (
                                        <p style={{ ...muted, margin: 0 }}>Starting job…</p>
                                    )}
                                    {(propdataJobStatus?.phases || []).map((ph) => {
                                        const pct = ph.total > 0 ? Math.round((ph.current / ph.total) * 100) : 0;
                                        const done = ph.status === 'done';
                                        const skip = ph.status === 'skipped';
                                        const err = ph.status === 'error';
                                        const pend = ph.status === 'pending';
                                        const run = ph.status === 'running';
                                        return (
                                            <div key={ph.key} style={{ marginBottom: '14px' }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        marginBottom: '6px',
                                                    }}
                                                >
                                                    <span style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>{ph.title}</span>
                                                    <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                                        {done && 'Done ✓'}
                                                        {skip && 'Skipped'}
                                                        {err && 'Failed'}
                                                        {pend && 'Waiting…'}
                                                        {run && ph.total > 0 && `${ph.current} of ${ph.total}`}
                                                        {run && ph.total === 0 && '…'}
                                                    </span>
                                                </div>
                                                {(run || done) && ph.total > 0 && (
                                                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div
                                                            style={{
                                                                width: `${done ? 100 : pct}%`,
                                                                height: '100%',
                                                                background: err ? '#dc2626' : '#11575C',
                                                                borderRadius: '4px',
                                                                transition: 'width 0.2s ease',
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                {ph.detail ? (
                                                    <p style={{ ...muted, margin: '6px 0 0', fontSize: '12px' }}>{ph.detail}</p>
                                                ) : null}
                                                {ph.error ? (
                                                    <p style={{ color: '#b91c1c', margin: '4px 0 0', fontSize: '12px' }}>{ph.error}</p>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <h5 style={{ margin: '0 0 10px', color: '#334155' }}>Archive raw files on server</h5>
                        <p style={muted}>Upload PropData export files for backup. Max 50 files, 50 MB each.</p>
                        <input
                            type="file"
                            multiple
                            onChange={(e) => {
                                uploadFiles('propdata', e.target.files);
                                e.target.value = '';
                            }}
                            disabled={!!busy}
                        />
                        {s?.migrationFiles?.propdata > 0 && (
                            <p style={{ ...muted, marginTop: '10px' }}>{s.migrationFiles.propdata} file(s) on record.</p>
                        )}
                    </div>
                )}
            </div>

            <div style={{ ...cardStyle, background: '#f0f9ff', borderColor: '#bae6fd' }}>
                <h4 style={{ margin: '0 0 8px', color: '#0369a1' }}>Listing snapshot</h4>
                <p style={muted}>
                    One step: pull Web Refs from your CRM into listing rows (where possible), then show counts and sample rows the same way Listing Management does.
                </p>
                <button
                    type="button"
                    onClick={refreshListingSnapshot}
                    disabled={!!busy || !!propdataJobId || !!resetJobId}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #0284c7',
                        background: '#e0f2fe',
                        cursor: busy || propdataJobId || resetJobId ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        color: '#0369a1',
                    }}
                >
                    {busy === 'listing-snapshot' ? 'Working…' : 'Refresh listing snapshot'}
                </button>
                {leanListingsDebug && (
                    <pre
                        style={{
                            marginTop: '14px',
                            padding: '12px',
                            background: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #bae6fd',
                            fontSize: '12px',
                            overflow: 'auto',
                            maxHeight: '320px',
                        }}
                    >
                        {JSON.stringify(leanListingsDebug, null, 2)}
                    </pre>
                )}
            </div>

            <div style={{ ...cardStyle, borderColor: '#fecdd3', background: '#fffafa' }}>
                <h4 style={{ margin: '0 0 8px', color: '#9f1239' }}>Reset all</h4>
                <p style={muted}>
                    Permanently deletes <strong>everything</strong> for your agency only: all listings and development projects, all listing-agent accounts, all CRM leads,
                    all pipeline deals, and PropData/HubSpot import archives. API connections stay — use Disconnect above to remove tokens.
                </p>
                <p style={{ ...muted, marginTop: '10px', fontSize: '12px' }}>
                    Type <code style={{ fontSize: '12px' }}>{RESET_CONFIRM_PHRASE}</code> exactly below, then confirm in the popup.
                </p>
                <label style={{ ...labelStyle, marginTop: '12px' }}>Confirmation</label>
                <input
                    type="text"
                    value={resetPhrase}
                    onChange={(e) => setResetPhrase(e.target.value)}
                    style={inputStyle}
                    placeholder={RESET_CONFIRM_PHRASE}
                    autoComplete="off"
                    disabled={!!busy || !!resetJobId}
                />
                <button
                    type="button"
                    onClick={runMigrationReset}
                    disabled={!!busy || !!resetJobId || !isResetConfirmationValid(resetPhrase)}
                    style={{
                        marginTop: '16px',
                        background: '#be123c',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 'bold',
                        cursor: busy || resetJobId || !isResetConfirmationValid(resetPhrase) ? 'not-allowed' : 'pointer',
                    }}
                >
                    {busy === 'migration-reset' || resetJobId ? 'Starting…' : 'Reset all agency data'}
                </button>
                {(resetJobId || resetJobStatus?.phases?.length) && (
                    <div
                        style={{
                            marginTop: '20px',
                            padding: '16px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                        }}
                    >
                        <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#334155' }}>Reset progress</p>
                        {resetJobId && !resetJobStatus?.phases?.length && <p style={{ ...muted, margin: 0 }}>Starting job…</p>}
                        {(resetJobStatus?.phases || []).map((ph) => {
                            const pct = ph.total > 0 ? Math.round((ph.current / ph.total) * 100) : 0;
                            const done = ph.status === 'done';
                            const skip = ph.status === 'skipped';
                            const err = ph.status === 'error';
                            const pend = ph.status === 'pending';
                            const run = ph.status === 'running';
                            return (
                                <div key={ph.key} style={{ marginBottom: '14px' }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '6px',
                                        }}
                                    >
                                        <span style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>{ph.title}</span>
                                        <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                            {done && 'Done ✓'}
                                            {skip && 'Skipped'}
                                            {err && 'Failed'}
                                            {pend && 'Waiting…'}
                                            {run && ph.total > 0 && `${ph.current} of ${ph.total}`}
                                            {run && ph.total === 0 && '…'}
                                        </span>
                                    </div>
                                    {(run || done) && ph.total > 0 && (
                                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    width: `${done ? 100 : pct}%`,
                                                    height: '100%',
                                                    background: err ? '#dc2626' : '#be123c',
                                                    borderRadius: '4px',
                                                    transition: 'width 0.2s ease',
                                                }}
                                            />
                                        </div>
                                    )}
                                    {ph.detail ? <p style={{ ...muted, margin: '6px 0 0', fontSize: '12px' }}>{ph.detail}</p> : null}
                                    {ph.error ? <p style={{ color: '#b91c1c', margin: '4px 0 0', fontSize: '12px' }}>{ph.error}</p> : null}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
