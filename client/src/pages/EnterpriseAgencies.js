import React, { useEffect, useState, useCallback } from 'react';
import api from '../config/api';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import { useIsMobile } from '../hooks/useMediaQuery';
import { usePreferences } from '../context/PreferencesContext';
import { sanitizeAgencyBranchDisplay } from '../utils/display';
import { showNotification } from '../components/NotificationManager';
import { brand, card, sectionTitle, KpiSection, pageShell, statusPill as getStatusPill } from '../components/enterpriseTheme';

export default function EnterpriseAgencies() {
    const isMobile = useIsMobile();
    const { formatAssetValueCompact } = usePreferences();
    const [agencies, setAgencies] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [linkEmail, setLinkEmail] = useState('');
    const [linkName, setLinkName] = useState('');
    const [linkType, setLinkType] = useState('franchise');
    const [linking, setLinking] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [expandedAgency, setExpandedAgency] = useState(null);
    const [agencyDetail, setAgencyDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [royaltyConfig, setRoyaltyConfig] = useState(null);
    const [editingRates, setEditingRates] = useState({});
    const [savingRates, setSavingRates] = useState(false);
    const [resendingInvite, setResendingInvite] = useState(null);
    const [resendEmail, setResendEmail] = useState({});

    const refresh = useCallback(async () => {
        try {
            const [agRes, invRes, rcRes] = await Promise.all([
                api.get('/api/enterprise/agencies'),
                api.get('/api/enterprise/pending-invites'),
                api.get('/api/enterprise/royalty-config'),
            ]);
            setAgencies(agRes.data?.agencies || []);
            setInvites(invRes.data?.invites || []);
            setRoyaltyConfig(rcRes.data || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSaveRates = async (agencyId) => {
        const rates = editingRates[agencyId];
        if (!rates) return;
        setSavingRates(true);
        try {
            await api.put('/api/enterprise/royalty-config', {
                agencyId,
                branchToFranchise: rates.branchToFranchise,
                franchiseToCountry: rates.franchiseToCountry,
                countryToHq: rates.countryToHq,
            });
            showNotification('Royalty rates saved.', 'success');
            refresh();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to save rates.', 'error');
        } finally {
            setSavingRates(false);
        }
    };

    const handleSaveDefaults = async () => {
        const rates = editingRates._defaults;
        if (!rates) return;
        setSavingRates(true);
        try {
            await api.put('/api/enterprise/royalty-config', {
                updateDefaults: true,
                branchToFranchise: rates.branchToFranchise,
                franchiseToCountry: rates.franchiseToCountry,
                countryToHq: rates.countryToHq,
            });
            showNotification('Default royalty rates saved.', 'success');
            refresh();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to save defaults.', 'error');
        } finally {
            setSavingRates(false);
        }
    };

    const getRatesForAgency = (agencyId) => {
        const agConf = (royaltyConfig?.agencies || []).find((a) => String(a._id) === String(agencyId));
        const d = royaltyConfig?.defaults || { branchToFranchise: 3, franchiseToCountry: 5, countryToHq: 1.5 };
        return {
            branchToFranchise: agConf?.royaltyRates?.branchToFranchise ?? d.branchToFranchise,
            franchiseToCountry: agConf?.royaltyRates?.franchiseToCountry ?? d.franchiseToCountry,
            countryToHq: agConf?.royaltyRates?.countryToHq ?? d.countryToHq,
            isCustom: !!(agConf?.royaltyRates?.branchToFranchise != null || agConf?.royaltyRates?.franchiseToCountry != null || agConf?.royaltyRates?.countryToHq != null),
        };
    };

    useEffect(() => { refresh(); }, [refresh]);

    const handleLink = async () => {
        if (!linkEmail.trim()) return;
        setLinking(true);
        try {
            const res = await api.post('/api/enterprise/link-agency', {
                agencyEmail: linkEmail.trim(),
                name: linkName.trim(),
                type: linkType,
            });
            showNotification(res.data?.message || 'Invite sent.', 'success');
            setLinkEmail('');
            setLinkName('');
            setLinkType('franchise');
            setShowLinkModal(false);
            refresh();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to send invite.', 'error');
        } finally {
            setLinking(false);
        }
    };

    const handleUnlink = async (agencyId, agencyName) => {
        if (!window.confirm(`Unlink "${agencyName}" from your enterprise? They will continue to operate independently.`)) return;
        try {
            await api.post('/api/enterprise/unlink-agency', { agencyId });
            showNotification(`${agencyName} has been unlinked.`, 'success');
            setExpandedAgency(null);
            setAgencyDetail(null);
            refresh();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to unlink.', 'error');
        }
    };

    const handleCancelInvite = async (inviteId, name) => {
        if (!window.confirm(`Cancel invite for "${name || 'this agency'}"?`)) return;
        try {
            await api.post('/api/enterprise/cancel-invite', { inviteId });
            showNotification('Invite cancelled.', 'success');
            refresh();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to cancel invite.', 'error');
        }
    };

    const handleResendInvite = async (inviteId) => {
        const newEmail = resendEmail[inviteId] || '';
        try {
            await api.post('/api/enterprise/resend-invite', { inviteId, newEmail: newEmail.trim() || undefined });
            showNotification(newEmail.trim() ? `Invite resent to ${newEmail.trim()}.` : 'Invite resent.', 'success');
            setResendingInvite(null);
            setResendEmail((prev) => { const n = { ...prev }; delete n[inviteId]; return n; });
            refresh();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to resend invite.', 'error');
        }
    };

    const handleExpandAgency = async (agencyId) => {
        if (expandedAgency === agencyId) { setExpandedAgency(null); setAgencyDetail(null); return; }
        setExpandedAgency(agencyId);
        setDetailLoading(true);
        try {
            const res = await api.get(`/api/enterprise/agency-detail/${agencyId}`);
            setAgencyDetail(res.data);
        } catch (err) {
            console.error(err);
            setAgencyDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const shell = pageShell(isMobile);

    if (loading) {
        return (
            <div className="dashboard-container" style={shell.container}>
                <Sidebar />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
                    <main className="dashboard-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', ...shell.main }}>
                        <LogoLoading message="Loading franchises & branches..." style={{ minHeight: '60vh' }} />
                    </main>
                </div>
            </div>
        );
    }

    const kpis = [
        { label: 'Linked Franchises', value: String(agencies.length), delta: agencies.length > 0 ? 'Active' : '—', deltaMuted: true },
        { label: 'Total Agents', value: String(agencies.reduce((s, a) => s + (a.agentCount || 0), 0)), delta: 'Across all franchises', deltaMuted: true },
        { label: 'Pending Invites', value: String(invites.length), delta: invites.length > 0 ? `${invites.length} awaiting` : '—', danger: invites.length > 0, deltaTone: invites.length > 0 ? undefined : undefined },
    ];

    return (
        <div className="dashboard-container" style={shell.container}>
            <Sidebar />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
                <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, ...shell.main }}>
                    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: brand.text }}>
                                <i className="fas fa-city" style={{ color: brand.gold, marginRight: 8 }}></i>Franchises &amp; Branches
                            </h2>
                            <p style={{ color: brand.muted, margin: '2px 0 0', fontSize: 11 }}>Manage linked franchises and branches, view their performance, or invite new ones.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowLinkModal(true)}
                            style={{ padding: '8px 16px', borderRadius: 999, border: 'none', background: brand.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <i className="fas fa-plus"></i> Link Franchise or Branch
                        </button>
                    </header>

                    <KpiSection isMobile={isMobile} cards={kpis} />

                    {/* Pending invites */}
                    {invites.length > 0 && (
                        <article style={{ ...card, marginBottom: 12, padding: 14, border: '1px solid rgba(231,161,26,0.35)', background: '#fffdf5' }}>
                            <h3 style={{ ...sectionTitle, color: brand.gold }}><i className="fas fa-clock" style={{ marginRight: 6 }}></i>PENDING INVITES ({invites.length})</h3>
                            <div style={{ marginTop: 10 }}>
                                {invites.map((inv) => (
                                    <div key={inv._id} style={{ padding: '10px 0', borderBottom: `1px solid ${brand.borderRow}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                            <span style={{ fontWeight: 600, color: brand.text }}>{inv.agencyName || '—'}</span>
                                            <span style={{ color: brand.muted }}>{inv.agencyEmail}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 9, color: '#8A5F0A', fontWeight: 600, background: 'rgba(231,161,26,0.22)', padding: '3px 8px', borderRadius: 999 }}>Awaiting</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setResendingInvite(resendingInvite === inv._id ? null : inv._id)}
                                                    style={{ border: `1px solid ${brand.border}`, borderRadius: 999, padding: '3px 10px', fontSize: 9, fontWeight: 600, cursor: 'pointer', background: '#fff', color: brand.primary }}
                                                >
                                                    <i className="fas fa-redo" style={{ marginRight: 4, fontSize: 8 }}></i>Resend
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelInvite(inv._id, inv.agencyName)}
                                                    style={{ border: 'none', borderRadius: 999, padding: '3px 10px', fontSize: 9, fontWeight: 600, cursor: 'pointer', background: 'rgba(217,48,37,0.08)', color: '#D93025' }}
                                                >
                                                    <i className="fas fa-times" style={{ marginRight: 4, fontSize: 8 }}></i>Cancel
                                                </button>
                                            </div>
                                        </div>
                                        {resendingInvite === inv._id && (
                                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, background: brand.pageBg, padding: '8px 10px', borderRadius: 8 }}>
                                                <label style={{ fontSize: 9, fontWeight: 600, color: brand.muted, whiteSpace: 'nowrap' }}>New email (optional):</label>
                                                <input
                                                    type="email"
                                                    placeholder={inv.agencyEmail}
                                                    value={resendEmail[inv._id] || ''}
                                                    onChange={(e) => setResendEmail((prev) => ({ ...prev, [inv._id]: e.target.value }))}
                                                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${brand.border}`, fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleResendInvite(inv._id)}
                                                    style={{ padding: '6px 14px', borderRadius: 999, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: brand.primary, color: '#fff', whiteSpace: 'nowrap' }}
                                                >
                                                    {resendEmail[inv._id]?.trim() ? 'Resend to new email' : 'Resend invite'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setResendingInvite(null); setResendEmail((prev) => { const n = { ...prev }; delete n[inv._id]; return n; }); }}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: brand.muted, fontSize: 10, fontWeight: 600 }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </article>
                    )}

                    {/* Linked franchises */}
                    <article style={{ ...card, padding: 14, marginBottom: 12 }}>
                        <h3 style={sectionTitle}>LINKED FRANCHISES</h3>
                        {agencies.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 16px', color: brand.muted }}>
                                <i className="fas fa-city" style={{ fontSize: 28, marginBottom: 8, opacity: 0.3, display: 'block' }}></i>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>No franchises yet</div>
                                <div style={{ fontSize: 11 }}>Click &quot;Link Franchise or Branch&quot; to connect your first franchise.</div>
                            </div>
                        ) : (
                            <div style={{ marginTop: 10, overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, minWidth: 560 }}>
                                    <thead>
                                        <tr style={{ borderBottom: `2px solid ${brand.border}` }}>
                                            {['Franchise', 'Branches', 'Agents', 'Listings', 'Revenue', ''].map((h) => (
                                                <th key={h} style={{ textAlign: h === 'Franchise' || h === '' ? 'left' : 'right', padding: '8px 6px', color: brand.muted, fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agencies.map((a) => (
                                            <React.Fragment key={a._id}>
                                                <tr
                                                    style={{ borderBottom: `1px solid ${brand.borderRow}`, cursor: 'pointer' }}
                                                    onClick={() => handleExpandAgency(a._id)}
                                                >
                                                    <td style={{ padding: '10px 6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <i className={`fas fa-chevron-${expandedAgency === a._id ? 'down' : 'right'}`} style={{ color: brand.muted, fontSize: 8, width: 10 }}></i>
                                                            {a.logo ? (
                                                                <img src={a.logo} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: 28, height: 28, borderRadius: 6, background: brand.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <i className="fas fa-building" style={{ color: brand.muted, fontSize: 10 }}></i>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: brand.text }}>{sanitizeAgencyBranchDisplay(a.name) || 'Franchise'}</div>
                                                                {a.location && <div style={{ fontSize: 9, color: brand.muted }}>{a.location}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 600, color: brand.text }}>{a.branchCount || 1}</td>
                                                    <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 600, color: brand.text }}>{a.agentCount || 0}</td>
                                                    <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 600, color: brand.text }}>{a.listingCount || 0}</td>
                                                    <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 700, color: brand.money }}>{formatAssetValueCompact(a.revenue || 0)}</td>
                                                    <td style={{ textAlign: 'right', padding: '10px 6px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleUnlink(a._id, a.name); }}
                                                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: brand.danger, fontSize: 9, fontWeight: 600, padding: '3px 6px', borderRadius: 999 }}
                                                        >
                                                            <i className="fas fa-unlink" style={{ marginRight: 3 }}></i>Unlink
                                                        </button>
                                                    </td>
                                                </tr>

                                                {expandedAgency === a._id && (
                                                    <tr>
                                                        <td colSpan={6} style={{ padding: '12px 6px 12px 30px', background: brand.pageBg }}>
                                                            {detailLoading ? (
                                                                <div style={{ padding: 16, color: brand.muted, fontSize: 11 }}>
                                                                    <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Loading…
                                                                </div>
                                                            ) : agencyDetail ? (
                                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                                                                    {/* Branches */}
                                                                    <div style={{ ...card, padding: '10px 12px' }}>
                                                                        <h4 style={sectionTitle}>BRANCHES ({agencyDetail.branches?.length || 0})</h4>
                                                                        {(agencyDetail.branches || []).length === 0 ? (
                                                                            <p style={{ fontSize: 10, color: brand.muted, marginTop: 6 }}>No branches</p>
                                                                        ) : (
                                                                            <div style={{ marginTop: 6, maxHeight: 140, overflowY: 'auto' }}>
                                                                                {(agencyDetail.branches || []).map((br, i) => (
                                                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${brand.borderRow}`, fontSize: 10 }}>
                                                                                        <span style={{ fontWeight: 600, color: brand.text }}>{sanitizeAgencyBranchDisplay(br.name)}</span>
                                                                                        <span style={{ color: brand.muted }}>{br.address || '—'}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {/* Agents */}
                                                                    <div style={{ ...card, padding: '10px 12px' }}>
                                                                        <h4 style={sectionTitle}>AGENTS ({agencyDetail.agents?.length || 0})</h4>
                                                                        {(agencyDetail.agents || []).length === 0 ? (
                                                                            <p style={{ fontSize: 10, color: brand.muted, marginTop: 6 }}>No agents</p>
                                                                        ) : (
                                                                            <div style={{ marginTop: 6, maxHeight: 140, overflowY: 'auto' }}>
                                                                                {(agencyDetail.agents || []).map((ag, i) => (
                                                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${brand.borderRow}`, fontSize: 10 }}>
                                                                                        <span style={{ fontWeight: 600, color: brand.text }}>{ag.name || '—'}</span>
                                                                                        <span style={getStatusPill(ag.status === 'active' ? 'active' : 'pending')}>
                                                                                            {ag.status === 'active' ? 'Active' : 'Pending'}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {/* Royalty Rates */}
                                                                    <div style={{ ...card, padding: '10px 12px', gridColumn: isMobile ? 'auto' : '1 / -1' }}>
                                                                        <h4 style={sectionTitle}><i className="fas fa-coins" style={{ marginRight: 4, color: brand.gold }}></i>ROYALTY RATES</h4>
                                                                        {(() => {
                                                                            const current = getRatesForAgency(a._id);
                                                                            const editing = editingRates[a._id] || current;
                                                                            return (
                                                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr auto', gap: 8, marginTop: 8, alignItems: 'end' }}>
                                                                                    {[
                                                                                        { key: 'branchToFranchise', label: 'Branch → Franchise %' },
                                                                                        { key: 'franchiseToCountry', label: 'Franchise → Country %' },
                                                                                        { key: 'countryToHq', label: 'Country → HQ %' },
                                                                                    ].map((field) => (
                                                                                        <div key={field.key}>
                                                                                            <label style={{ display: 'block', fontSize: 8, fontWeight: 600, color: brand.muted, textTransform: 'uppercase', marginBottom: 3 }}>{field.label}</label>
                                                                                            <input
                                                                                                type="number"
                                                                                                step="0.1"
                                                                                                min="0"
                                                                                                max="100"
                                                                                                value={editing[field.key] ?? ''}
                                                                                                onChange={(e) => setEditingRates((prev) => ({
                                                                                                    ...prev,
                                                                                                    [a._id]: { ...(prev[a._id] || current), [field.key]: parseFloat(e.target.value) || 0 },
                                                                                                }))}
                                                                                                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${brand.border}`, fontSize: 12, fontWeight: 600, color: brand.primary, outline: 'none', boxSizing: 'border-box' }}
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={savingRates || !editingRates[a._id]}
                                                                                        onClick={() => handleSaveRates(a._id)}
                                                                                        style={{
                                                                                            padding: '6px 14px', borderRadius: 999, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                                                                            background: editingRates[a._id] ? brand.primary : brand.pageBg,
                                                                                            color: editingRates[a._id] ? '#fff' : brand.muted,
                                                                                            opacity: savingRates ? 0.6 : 1, whiteSpace: 'nowrap',
                                                                                        }}
                                                                                    >
                                                                                        {savingRates ? 'Saving…' : 'Save Rates'}
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                        {getRatesForAgency(a._id).isCustom && (
                                                                            <div style={{ marginTop: 6, fontSize: 9, color: brand.gold, fontWeight: 600 }}>
                                                                                <i className="fas fa-star" style={{ marginRight: 4 }}></i>Custom rates applied
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {/* Leads */}
                                                                    <div style={{ ...card, padding: '10px 12px' }}>
                                                                        <h4 style={sectionTitle}>LEADS (AGGREGATED)</h4>
                                                                        <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                                                            {['buyer', 'seller', 'investor'].map((type) => (
                                                                                <div key={type} style={{ textAlign: 'center', background: brand.pageBg, borderRadius: 6, padding: 8 }}>
                                                                                    <div style={{ fontSize: 18, fontWeight: 300, color: brand.primary }}>{agencyDetail.leadSummary?.[type] || 0}</div>
                                                                                    <div style={{ fontSize: 9, color: brand.muted, textTransform: 'capitalize' }}>{type}s</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    {/* Listings */}
                                                                    <div style={{ ...card, padding: '10px 12px' }}>
                                                                        <h4 style={sectionTitle}>LISTINGS OVERVIEW</h4>
                                                                        {(agencyDetail.listings || []).length === 0 ? (
                                                                            <p style={{ fontSize: 10, color: brand.muted, marginTop: 6 }}>No listings</p>
                                                                        ) : (
                                                                            <div style={{ marginTop: 6, maxHeight: 100, overflowY: 'auto' }}>
                                                                                {(agencyDetail.listings || []).map((l, i) => (
                                                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${brand.borderRow}`, fontSize: 10 }}>
                                                                                        <span style={{ color: brand.text, fontWeight: 500 }}>{l.title || l.propertyType || 'Listing'}</span>
                                                                                        <span style={{ fontWeight: 600, color: brand.primary }}>{l.status || '—'}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p style={{ color: brand.muted, fontSize: 11 }}>Could not load franchise details.</p>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </article>
                </div>

                {/* Link Modal */}
                {showLinkModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: 20 }} onClick={() => setShowLinkModal(false)}>
                        <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '100%', padding: '24px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
                            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: brand.text, fontWeight: 700 }}>Link Franchise or Branch</h2>
                            <p style={{ margin: '0 0 16px', fontSize: 12, color: brand.muted }}>
                                Link an existing franchise or branch. If they haven&apos;t registered yet, an invite will be waiting.
                            </p>

                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: brand.text, marginBottom: 6, textTransform: 'uppercase' }}>Type</label>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                                {[{ id: 'franchise', label: 'Franchise', icon: 'fas fa-city' }, { id: 'branch', label: 'Branch', icon: 'fas fa-code-branch' }].map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setLinkType(opt.id)}
                                        style={{
                                            flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            border: linkType === opt.id ? `2px solid ${brand.primary}` : `2px solid ${brand.border}`,
                                            background: linkType === opt.id ? 'rgba(16,87,92,0.08)' : '#fff',
                                            color: linkType === opt.id ? brand.primary : brand.muted,
                                        }}
                                    >
                                        <i className={opt.icon}></i> {opt.label}
                                    </button>
                                ))}
                            </div>

                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: brand.text, marginBottom: 6, textTransform: 'uppercase' }}>
                                {linkType === 'franchise' ? 'Franchise' : 'Branch'} name
                            </label>
                            <input
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${brand.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                                type="text" value={linkName} onChange={(e) => setLinkName(e.target.value)}
                                placeholder={linkType === 'franchise' ? 'e.g. Coastal Properties Group' : 'e.g. Northside Office'}
                            />

                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: brand.text, marginBottom: 6, textTransform: 'uppercase' }}>Admin email</label>
                            <input
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${brand.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                                type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)}
                                placeholder="admin@franchise.com" autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleLink()}
                            />

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                                <button style={{ border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: '8px 16px', background: brand.pageBg, color: brand.text }} onClick={() => { setShowLinkModal(false); setLinkEmail(''); setLinkName(''); }}>Cancel</button>
                                <button style={{ border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 12, padding: '8px 16px', background: brand.primary, color: '#fff', opacity: linking ? 0.7 : 1 }} onClick={handleLink} disabled={linking}>
                                    {linking ? 'Sending…' : 'Send Invite'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            </div>
        </div>
    );
}
