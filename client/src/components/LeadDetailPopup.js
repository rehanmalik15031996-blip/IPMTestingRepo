import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/api';
import { sanitizeAgencyBranchDisplay } from '../utils/display';

const linkStyleEarly = { color: '#11575C', textDecoration: 'underline', fontSize: '14px' };
const valueStyleEarly = { fontSize: '14px', color: '#1e293b' };

/**
 * Render any monetary lead field as `ZAR 1,234,567`. Falls back to the raw
 * value when it isn't a positive finite number so non-numeric text passes
 * through unchanged.
 */
const formatLeadMoney = (v) => {
    if (v == null || v === '') return null;
    const num = Number(String(v).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(num) || num <= 0) return String(v);
    try { return `ZAR ${num.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`; }
    catch (_) { return `ZAR ${Math.round(num)}`; }
};

const BUYER_MONEY_KEYS = new Set(['budgetMin', 'budgetMax', 'preApprovalAmount']);
const SELLER_MONEY_KEYS = new Set(['askingPrice', 'outstandingBondAmount']);
const INVESTOR_MONEY_KEYS = new Set(['capitalAvailable', 'dealSizeMin', 'dealSizeMax', 'portfolioValue']);

/** CRM leads may store linkedProperties as an array of { id, title } or a PropData object / free text. */
function normalizeLinkedPropertyEntries(lead) {
    const out = [];
    const lp = lead?.linkedProperties;
    if (Array.isArray(lp) && lp.length > 0) {
        for (const item of lp) {
            if (!item) continue;
            const id = item.id || item._id || item.propertyId;
            const title = item.title || item.name || 'Property';
            const webRef = (item.webRef || item.propdataWebRef || '').toString().trim();
            out.push({ id: id ? String(id) : null, title, webRef });
        }
        return out;
    }
    if (lp && typeof lp === 'object' && !Array.isArray(lp)) {
        const webRef = (lp.propdataWebRef || lead?.externalIds?.propdata?.webRef || '').toString().trim();
        const title =
            (lead?.propertyOfInterest || lp.propdataListingText || webRef || '').toString().trim() ||
            (webRef ? `Listing ${webRef}` : '');
        if (title || webRef) {
            out.push({ id: null, title: title || webRef || 'Linked listing', webRef });
        }
    }
    if (out.length === 0 && lead?.propertyOfInterest) {
        const poi = String(lead.propertyOfInterest).trim();
        const m = poi.match(/\b(SIR\d+|[A-Z]{2,12}\d{4,})\b/i);
        out.push({ id: null, title: poi, webRef: m ? m[1].toUpperCase() : '' });
    }
    return out;
}

function agencyIdForPropertyResolve(user) {
    if (!user) return '';
    const role = String(user.role || '').toLowerCase();
    if (role === 'agency') return user._id ? String(user._id) : '';
    if (user.agencyId) return String(user.agencyId);
    return '';
}

function LinkedPropertyLine({ entry, agencyId, onClose }) {
    const navigate = useNavigate();
    const [resolvedId, setResolvedId] = useState(entry.id || '');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (resolvedId || !entry.webRef || !agencyId) return undefined;
        let cancelled = false;
        api.get('/api/properties/resolve-import-ref', {
            params: { ref: entry.webRef, agencyId: String(agencyId) }
        })
            .then((res) => {
                if (!cancelled && res.data?._id) setResolvedId(String(res.data._id));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [entry.webRef, agencyId, resolvedId, entry.id]);

    const label = entry.title || entry.webRef || 'View property';

    if (resolvedId) {
        return (
            <Link to={`/property/${resolvedId}`} style={linkStyleEarly} onClick={onClose}>
                {label}
            </Link>
        );
    }

    const openByRef = async () => {
        if (!agencyId || !entry.webRef) return;
        try {
            const res = await api.get('/api/properties/resolve-import-ref', {
                params: { ref: entry.webRef, agencyId: String(agencyId) }
            });
            if (res.data?._id) {
                onClose?.();
                navigate(`/property/${res.data._id}`);
            } else {
                setFailed(true);
            }
        } catch (_) {
            setFailed(true);
        }
    };

    if (entry.webRef && agencyId) {
        return (
            <button
                type="button"
                onClick={openByRef}
                style={{
                    ...linkStyleEarly,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    font: 'inherit',
                    textAlign: 'left'
                }}
            >
                {label}
                {failed ? ' (listing not in workspace)' : ''}
            </button>
        );
    }

    return <span style={valueStyleEarly}>{label}</span>;
}

function formatLeadTimestamp(raw) {
    if (raw == null || raw === '') return '—';
    try {
        const s = typeof raw === 'string' ? raw : raw instanceof Date ? raw.toISOString() : String(raw);
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return typeof raw === 'string' ? raw : '—';
        return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch (_) {
        return '—';
    }
}

const DEFAULT_NOTE_CHANNELS = [
    { value: '', label: 'Select channel' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone call' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'sms', label: 'SMS' },
    { value: 'other', label: 'Other' }
];

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '20px'
};
const contentStyle = {
    background: '#fff',
    borderRadius: '16px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    padding: '24px',
    position: 'relative'
};
const closeBtn = { position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' };
const labelStyle = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' };
const valueStyle = { fontSize: '14px', color: '#1e293b', marginBottom: '12px' };
const linkStyle = { color: '#11575C', textDecoration: 'underline', fontSize: '14px' };
const tabStyle = (active) => ({
    padding: '10px 16px',
    border: 'none',
    background: active ? '#11575C' : 'transparent',
    color: active ? '#fff' : '#64748b',
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '14px'
});

/**
 * Shared popup showing lead summary and activity log.
 * lead: { name, email, mobile, source, dateAdded, lastContact, linkedProperties, assignedAgentId, activities }
 * userId: required for Add note. onRefresh(updatedLead): called after adding a note so parent can update the lead.
 * user: current user (for Agency option in Assigned to). agents: list of agents (for agency context).
 */
const LeadDetailPopup = ({ lead, onClose, onEdit, onDelete, userId, onRefresh, user, agents, onAddAgent, onOpenTopMatches, leadMatchesLoading, activityChannels }) => {
    const noteChannelOptions = React.useMemo(() => {
        if (Array.isArray(activityChannels) && activityChannels.length > 0) {
            return [{ value: '', label: 'Select channel' }, ...activityChannels.filter((c) => c.value)];
        }
        return DEFAULT_NOTE_CHANNELS;
    }, [activityChannels]);
    const [tab, setTab] = useState('details');
    const [showAddNote, setShowAddNote] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [noteChannel, setNoteChannel] = useState('');
    const [noteSaving, setNoteSaving] = useState(false);
    const [assignSaving, setAssignSaving] = useState(false);
    if (!lead) return null;
    const isAgency = (user?.role || '').toLowerCase() === 'agency';
    const showAssignedTo = isAgency && !!user?._id;
    const leadType = (lead.leadType || '').toLowerCase();
    const isBuyerOrInvestor = leadType === 'buyer' || leadType === 'investor';
    const linkedPropertyEntries = normalizeLinkedPropertyEntries(lead);
    const propertyResolveAgencyId = agencyIdForPropertyResolve(user);
    const source = lead.source || 'Inquiry';
    const dateAdded = formatLeadTimestamp(lead.dateAdded || lead.lastContact);
    const activities = Array.isArray(lead.activities) ? [...lead.activities].reverse() : [];

    const formatChangedBy = (cb) => {
        if (!cb) return '';
        const parts = [cb.name || 'Unknown'];
        const agency = sanitizeAgencyBranchDisplay(cb.agencyName);
        if (agency) parts.push(` (${agency})`);
        else if (cb.role) parts.push(` · ${(cb.role || '').replace(/_/g, ' ')}`);
        return parts.join('');
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
        } catch (_) {
            return iso;
        }
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
                <button type="button" style={closeBtn} onClick={onClose} aria-label="Close">&times;</button>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#11575C' }}>Lead details</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button type="button" style={tabStyle(tab === 'details')} onClick={() => setTab('details')}>Details</button>
                    <button type="button" style={tabStyle(tab === 'activities')} onClick={() => setTab('activities')}>Activities ({activities.length})</button>
                </div>
                {tab === 'details' && (
                    <>
                        <div style={labelStyle}>Name</div>
                        <div style={valueStyle}>{lead.name || '—'}</div>
                        <div style={labelStyle}>Email</div>
                        <div style={valueStyle}>{lead.email || '—'}</div>
                        <div style={labelStyle}>Mobile</div>
                        <div style={valueStyle}>{lead.mobile || '—'}</div>
                        <div style={labelStyle}>Source</div>
                        <div style={valueStyle}>{source}</div>
                        <div style={labelStyle}>Date added</div>
                        <div style={valueStyle}>{dateAdded}</div>
                        {lead.buyerDetails?.hubspotCreateDate && lead.dateAdded && lead.buyerDetails.hubspotCreateDate !== lead.dateAdded && (
                            <>
                                <div style={labelStyle}>HubSpot create date</div>
                                <div style={valueStyle}>{formatLeadTimestamp(lead.buyerDetails.hubspotCreateDate)}</div>
                            </>
                        )}
                        {lead.buyerDetails?.lifecycleStage && (
                            <>
                                <div style={labelStyle}>Lifecycle stage</div>
                                <div style={valueStyle}>
                                    <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#dbeafe', fontSize: '12px', color: '#1e40af' }}>
                                        {lead.buyerDetails.lifecycleStage}
                                    </span>
                                </div>
                            </>
                        )}
                        {lead.buyerDetails?.leadStatus && (
                            <>
                                <div style={labelStyle}>Lead status</div>
                                <div style={valueStyle}>
                                    <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', fontSize: '12px', color: '#92400e' }}>
                                        {lead.buyerDetails.leadStatus}
                                    </span>
                                </div>
                            </>
                        )}
                        {lead.buyerDetails?.dealStage && (
                            <>
                                <div style={labelStyle}>Deal stage</div>
                                <div style={valueStyle}>
                                    <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#ede9fe', fontSize: '12px', color: '#5b21b6' }}>
                                        {lead.buyerDetails.dealStage}
                                    </span>
                                    {lead.buyerDetails.dealPipeline && <span style={{ marginLeft: '6px', fontSize: '12px', color: '#64748b' }}>({lead.buyerDetails.dealPipeline})</span>}
                                </div>
                            </>
                        )}
                        {lead.buyerDetails?.marketingContactStatus && (
                            <>
                                <div style={labelStyle}>Marketing status</div>
                                <div style={valueStyle}>{lead.buyerDetails.marketingContactStatus}</div>
                            </>
                        )}
                        {lead.buyerDetails?.lastActivityDate && (
                            <>
                                <div style={labelStyle}>Last activity</div>
                                <div style={valueStyle}>{formatLeadTimestamp(lead.buyerDetails.lastActivityDate)}</div>
                            </>
                        )}
                        {lead.buyerDetails?.hubspotOwnerName && !lead.assignedAgentId && (
                            <>
                                <div style={labelStyle}>HubSpot owner</div>
                                <div style={valueStyle}>
                                    <span style={{ color: '#b45309', fontSize: '13px' }}>{lead.buyerDetails.hubspotOwnerName}</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>(not matched to an agent — assign below)</span>
                                </div>
                            </>
                        )}
                        {(leadType === 'buyer' || leadType === 'seller' || leadType === 'investor' || leadType === 'prospect') && (
                            <>
                                <div style={labelStyle}>Lead type</div>
                                <div style={valueStyle}>
                                    {leadType === 'seller' ? 'Seller'
                                        : leadType === 'investor' ? 'Investor'
                                        : leadType === 'prospect' ? 'Prospect'
                                        : 'Buyer'}
                                </div>
                            </>
                        )}
                        {isBuyerOrInvestor && onOpenTopMatches && (
                            <div style={{ marginBottom: '12px' }}>
                                <button
                                    type="button"
                                    disabled={leadMatchesLoading}
                                    onClick={() => onOpenTopMatches(lead)}
                                    style={{
                                        width: '100%',
                                        fontSize: '13px',
                                        padding: '8px 14px',
                                        background: '#A7ABAC',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: leadMatchesLoading ? 'wait' : 'pointer',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <i className="fas fa-home" /> {leadMatchesLoading ? '…' : 'Top property matches'}
                                </button>
                            </div>
                        )}
                        {leadType === 'buyer' && lead.buyerDetails && Object.keys(lead.buyerDetails).some((k) => lead.buyerDetails[k] !== '' && lead.buyerDetails[k] != null && (Array.isArray(lead.buyerDetails[k]) ? lead.buyerDetails[k].length > 0 : true)) && (
                            <>
                                <div style={{ ...labelStyle, marginTop: '8px', color: '#11575C' }}>Buyer details</div>
                                <div style={{ ...valueStyle, fontSize: '13px', background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                    {[
                                        ['buyerType', 'Buyer type'],
                                        ['budgetMin', 'Budget min'],
                                        ['budgetMax', 'Budget max'],
                                        ['financeType', 'Finance type'],
                                        ['preApprovalStatus', 'Pre-approval status'],
                                        ['preApprovalAmount', 'Pre-approval amount'],
                                        ['preApprovalExpiry', 'Pre-approval expiry'],
                                        ['minBedrooms', 'Min bedrooms'],
                                        ['minBathrooms', 'Min bathrooms'],
                                        ['minFloorSizeM2', 'Min floor size (m²)'],
                                        ['propertyTypePreference', 'Property type preference'],
                                        ['locationPreferences', 'Location preferences'],
                                        ['mustHaveFeatures', 'Must-have features'],
                                        ['urgency', 'Urgency'],
                                        ['currentLivingSituation', 'Current living situation'],
                                        ['mustSellFirst', 'Must sell first']
                                    ].map(([key, label]) => {
                                        const v = lead.buyerDetails[key];
                                        if (v === '' || v == null) return null;
                                        if (Array.isArray(v)) {
                                            if (v.length === 0) return null;
                                            return <div key={key} style={{ marginBottom: '6px' }}><strong>{label}:</strong> {v.join(', ')}</div>;
                                        }
                                        if (typeof v === 'boolean') return <div key={key} style={{ marginBottom: '6px' }}><strong>{label}:</strong> {v ? 'Yes' : 'No'}</div>;
                                        const display = BUYER_MONEY_KEYS.has(key) ? formatLeadMoney(v) : String(v);
                                        return <div key={key} style={{ marginBottom: '6px' }}><strong>{label}:</strong> {display}</div>;
                                    })}
                                </div>
                            </>
                        )}
                        {leadType === 'seller' && lead.sellerDetails && Object.keys(lead.sellerDetails).some((k) => lead.sellerDetails[k] !== '' && lead.sellerDetails[k] != null && (Array.isArray(lead.sellerDetails[k]) ? lead.sellerDetails[k].length > 0 : true)) && (
                            <>
                                <div style={{ ...labelStyle, marginTop: '8px', color: '#11575C' }}>Seller / listing details</div>
                                <div style={{ ...valueStyle, fontSize: '13px', background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                    {[
                                        ['propertyAddress', 'Property address'],
                                        ['propertyStreet', 'Property street'],
                                        ['propertySuburb', 'Suburb'],
                                        ['propertyCity', 'City'],
                                        ['propertyCountry', 'Country'],
                                        ['propertyType', 'Property type'],
                                        ['bedrooms', 'Bedrooms'],
                                        ['bathrooms', 'Bathrooms'],
                                        ['floorSizeM2', 'Floor size (m²)'],
                                        ['erfSizeM2', 'Erf / lot size (m²)'],
                                        ['askingPrice', 'Asking price'],
                                        ['reasonForSelling', 'Reason for selling'],
                                        ['occupationStatus', 'Occupation status'],
                                        ['urgency', 'Urgency'],
                                        ['mandateType', 'Mandate type'],
                                        ['mandateStart', 'Mandate start'],
                                        ['mandateExpiry', 'Mandate expiry'],
                                        ['outstandingBond', 'Outstanding bond'],
                                        ['outstandingBondAmount', 'Outstanding bond amount'],
                                        ['commissionPct', 'Commission %']
                                    ].map(([key, label]) => {
                                        const v = lead.sellerDetails[key];
                                        if (v === '' || v == null) return null;
                                        // When full address is present, skip the component fields to avoid duplication
                                        if (lead.sellerDetails.propertyAddress && ['propertyStreet', 'propertySuburb', 'propertyCity', 'propertyCountry'].includes(key)) return null;
                                        if (key === 'outstandingBond' && typeof v === 'boolean') return <div key={key} style={{ marginBottom: '6px' }}><strong>{label}:</strong> {v ? 'Yes' : 'No'}</div>;
                                        if (Array.isArray(v)) {
                                            if (v.length === 0) return null;
                                            return <div key={key} style={{ marginBottom: '6px' }}><strong>{label}:</strong> {v.join(', ')}</div>;
                                        }
                                        const display = SELLER_MONEY_KEYS.has(key) ? formatLeadMoney(v) : String(v);
                                        return <div key={key} style={{ marginBottom: '6px' }}><strong>{label}:</strong> {display}</div>;
                                    })}
                                </div>
                            </>
                        )}
                        {leadType === 'prospect' && lead.prospectDetails && (
                            <>
                                <div style={{ ...labelStyle, marginTop: '8px', color: '#11575C' }}>Prospect details</div>
                                <div style={{ ...valueStyle, fontSize: '13px', background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                    {(() => {
                                        const pd = lead.prospectDetails || {};
                                        const fmtZar = (v) => {
                                            const n = Number(v);
                                            if (!Number.isFinite(n) || n <= 0) return null;
                                            try { return `ZAR ${n.toLocaleString('en-ZA')}`; } catch (_) { return `ZAR ${n}`; }
                                        };
                                        const NA = <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>not available</span>;
                                        const rows = [
                                            ['Address', pd.address || NA],
                                            ['Suburb', pd.suburb || NA],
                                            ['Property type', pd.propertyType ? String(pd.propertyType).replace(/^./, (c) => c.toUpperCase()) : NA],
                                            ['Size', pd.sizeSqm ? `${Number(pd.sizeSqm).toLocaleString()} m²` : NA],
                                            ['Asking price', fmtZar(pd.askingPrice) || NA],
                                            ['AI prospect score', pd.score != null ? `${pd.score} (${pd.tone || 'n/a'})` : NA],
                                            ['Listing agent', pd.listingAgentName || NA],
                                            ['Listing agency', pd.listingAgencyName || NA],
                                        ];
                                        const renderable = rows;
                                        return (
                                            <>
                                                {pd.listingAgentPhoto && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                        <img
                                                            src={pd.listingAgentPhoto}
                                                            alt={pd.listingAgentName || 'Listing agent'}
                                                            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                                                        />
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontWeight: 700, color: '#11575C' }}>{pd.listingAgentName || 'Listing agent'}</div>
                                                            {pd.listingAgencyName && <div style={{ fontSize: 12, color: '#64748b' }}>{pd.listingAgencyName}</div>}
                                                        </div>
                                                    </div>
                                                )}
                                                {renderable.map(([k, v]) => (
                                                    <div key={k} style={{ marginBottom: 6 }}><strong>{k}:</strong> {v}</div>
                                                ))}
                                                {pd.note && (
                                                    <div style={{ marginTop: 8, padding: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Note from the field</div>
                                                        <div style={{ color: '#1f2937' }}>{pd.note}</div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </>
                        )}
                        {leadType === 'investor' && lead.investorDetails && Object.keys(lead.investorDetails).some((k) => lead.investorDetails[k] !== '' && lead.investorDetails[k] != null && (Array.isArray(lead.investorDetails[k]) ? lead.investorDetails[k].length > 0 : true)) && (
                            <>
                                <div style={{ ...labelStyle, marginTop: '8px', color: '#11575C' }}>Investor details</div>
                                <div style={{ ...valueStyle, fontSize: '13px', background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                    {[
                                        ['investmentStrategy', 'Investment strategy'],
                                        ['targetYieldPct', 'Target yield %'],
                                        ['targetRoiPct', 'Target ROI %'],
                                        ['holdPeriod', 'Hold period'],
                                        ['capitalAvailable', 'Capital available'],
                                        ['dealSizeMin', 'Deal size min'],
                                        ['dealSizeMax', 'Deal size max'],
                                        ['financeType', 'Finance type'],
                                        ['entityType', 'Entity type'],
                                        ['portfolioSize', 'Portfolio size'],
                                        ['portfolioValue', 'Portfolio value'],
                                        ['existingAssetClasses', 'Existing asset classes'],
                                        ['complianceStatus', 'Compliance status'],
                                        ['communicationFrequency', 'Communication frequency']
                                    ].map(([key, label]) => {
                                        const v = lead.investorDetails[key];
                                        if (v === '' || v == null) return null;
                                        if (Array.isArray(v)) {
                                            if (v.length === 0) return null;
                                            return <div key={key} style={{ marginBottom: '6px' }}><strong>{label}:</strong> {v.join(', ')}</div>;
                                        }
                                        const display = INVESTOR_MONEY_KEYS.has(key) ? formatLeadMoney(v) : String(v);
                                        return <div key={key} style={{ marginBottom: '6px' }}><strong>{label}:</strong> {display}</div>;
                                    })}
                                </div>
                            </>
                        )}
                        {showAssignedTo && (
                            <>
                                <div style={labelStyle}>Assigned to</div>
                                <div style={{ ...valueStyle, marginBottom: '12px' }}>
                                    <select
                                        value={lead.assignedAgentId != null ? String(lead.assignedAgentId) : (user?._id ? String(user._id) : '')}
                                        onChange={async (e) => {
                                            const value = e.target.value;
                                            if (value === '__add_agent__') { onAddAgent && onAddAgent(); return; }
                                            if (!userId || !lead) return;
                                            setAssignSaving(true);
                                            const previousId = lead.assignedAgentId != null ? String(lead.assignedAgentId) : null;
                                            const previousName = !previousId ? 'Unassigned' : (previousId === String(user._id) ? (user.name || 'Agency') : ((agents || []).find((a) => String(a._id || a.id) === previousId)?.name || 'Agent'));
                                            const assigneeName = value === String(user._id) ? (user.name || 'Agency') : ((agents || []).find((a) => String(a._id || a.id) === value)?.name || 'Agent');
                                            const activitySummary = `Assignment updated: from ${previousName} to ${assigneeName}`;
                                            try {
                                                const res = await api.put('/api/update-lead', {
                                                    userId,
                                                    leadId: lead.id || lead._id,
                                                    lead: { name: lead.name, email: lead.email, status: lead.status, assignedAgentId: value || undefined },
                                                    activitySummary
                                                });
                                                if (res.data?.success && res.data?.lead && onRefresh) onRefresh(res.data.lead);
                                            } catch (err) {
                                                alert(err.response?.data?.message || 'Failed to update assignment');
                                            } finally {
                                                setAssignSaving(false);
                                            }
                                        }}
                                        disabled={assignSaving}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: '#fff', color: '#1e293b' }}
                                    >
                                        <option value={user._id}>{user.name || 'Agency'} (Agency)</option>
                                        {(agents || []).filter((a) => a._id || a.id).map((a) => (
                                            <option key={a._id || a.id} value={a._id || a.id}>{a.name || a.email || 'Agent'}{sanitizeAgencyBranchDisplay(a.branch) ? ` (${sanitizeAgencyBranchDisplay(a.branch)})` : ''}</option>
                                        ))}
                                        <option value="__add_agent__">+ Add Agent</option>
                                    </select>
                                    {assignSaving && <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>Saving...</span>}
                                </div>
                            </>
                        )}
                        <div style={labelStyle}>Linked properties</div>
                        <div style={valueStyle}>
                            {linkedPropertyEntries.length === 0
                                ? '—'
                                : linkedPropertyEntries.map((entry, i) => (
                                    <span key={`${entry.webRef || ''}-${entry.id || ''}-${i}`}>
                                        {i > 0 && ', '}
                                        <LinkedPropertyLine entry={entry} agencyId={propertyResolveAgencyId} onClose={onClose} />
                                    </span>
                                  ))}
                        </div>
                    </>
                )}
                {tab === 'activities' && (
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {activities.length === 0 && !showAddNote ? (
                            <div style={{ color: '#94a3b8', fontSize: '14px' }}>No activity yet.</div>
                        ) : (
                            activities.map((a) => (
                                <div key={a.actionId || a.datetime} style={{ borderLeft: '3px solid #11575C', paddingLeft: '12px', marginBottom: '14px' }}>
                                    {a.channel && <div style={{ fontSize: '10px', color: '#11575C', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{a.channel}</div>}
                                    <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '4px' }}>{a.activity}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{formatDate(a.datetime)}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{formatChangedBy(a.changedBy)}</div>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {showAddNote && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1101, padding: '20px' }}>
                        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#11575C' }}>Add note</h4>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Channel</label>
                            <select value={noteChannel} onChange={(e) => setNoteChannel(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                                {noteChannelOptions.map((opt) => <option key={opt.value || 'blank'} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Note</label>
                            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Enter note..." rows={3} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', resize: 'vertical' }} />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => { setShowAddNote(false); setNoteText(''); setNoteChannel(''); }} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                <button type="button" disabled={!noteText.trim() || noteSaving} onClick={async () => {
                                    if (!noteText.trim() || !userId) return;
                                    setNoteSaving(true);
                                    try {
                                        const res = await api.put('/api/update-lead', { userId, lead, activitySummary: noteText.trim(), noteChannel: noteChannel || undefined });
                                        if (res.data?.success && res.data?.lead) {
                                            if (onRefresh) onRefresh(res.data.lead);
                                            setShowAddNote(false);
                                            setNoteText('');
                                            setNoteChannel('');
                                        }
                                    } catch (err) {
                                        alert(err.response?.data?.message || 'Failed to add note');
                                    } finally {
                                        setNoteSaving(false);
                                    }
                                }} style={{ padding: '8px 16px', background: '#11575C', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: noteText.trim() && !noteSaving ? 'pointer' : 'not-allowed', opacity: noteText.trim() && !noteSaving ? 1 : 0.6 }}>{noteSaving ? 'Saving...' : 'Save note'}</button>
                            </div>
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {userId && (
                        <button type="button" onClick={() => setShowAddNote(true)} style={{ padding: '10px 20px', background: '#11575C', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
                            <i className="fas fa-plus" style={{ marginRight: '6px' }} /> Add note
                        </button>
                    )}
                    {onEdit && (
                        <button type="button" onClick={() => { onEdit(lead); onClose(); }} style={{ padding: '10px 20px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Edit</button>
                    )}
                    {onDelete && (
                        <button type="button" onClick={() => { onDelete(lead); onClose(); }} style={{ padding: '10px 20px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
                    )}
                    <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: '#64748b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default LeadDetailPopup;
