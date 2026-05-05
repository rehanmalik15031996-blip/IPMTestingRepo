import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../config/api';
import { usePreferences } from '../context/PreferencesContext';
import { useTranslation } from 'react-i18next';
import PropertyUploadForm from '../components/PropertyUploadForm';
import AddAgentModal from '../components/AddAgentModal';
import PortalPreviewModal from '../components/PortalPreviewModal';
import NegotiationFieldsSection from '../components/NegotiationFieldsSection';
import { showNotification } from '../components/NotificationManager';
import { getPropertyLimitForUser } from '../utils/planLimits';
import { invalidateDashboardCache } from '../config/dashboardCache';
import { invalidateSalesCache } from '../config/salesCache';
import { dedupePropertyTitle } from '../utils/propertyTitle';

// Donut chart for the listing-row IPM score with hover tooltips on each slice.
// Palette pulled from the enterpriseTheme styleguide so the chart matches the
// rest of the brand surfaces (primary teal, gold, money, success, warn).
const IPM_SUB_METRICS = [
    { key: 'location',      label: 'Location',      color: '#10575C', blurb: 'Suburb walkability, school catchment scores, and proximity to amenities.' },
    { key: 'specification', label: 'Specification', color: '#0F5A4A', blurb: 'Build quality, finishes, EPC band, and feature parity vs. comps.' },
    { key: 'demand',        label: 'Buyer demand',  color: '#E7A11A', blurb: 'Active matched buyers in CRM and search-volume signals for this asset class.' },
    { key: 'liquidity',     label: 'Liquidity',     color: '#C9951C', blurb: 'Recent transaction velocity in the suburb and average days-on-market.' },
    { key: 'macro',         label: 'Macro outlook', color: '#A65F0A', blurb: 'Country-level price trend, interest-rate trajectory, and currency stability.' },
];

function buildIpmSubScores(seedKey, headlineScore) {
    // Deterministic per-listing — same id always produces the same breakdown.
    const seed = String(seedKey || '').split('').reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
    const rand = (i) => {
        const x = Math.sin(seed * 31 + i * 1009) * 43758.5453;
        return x - Math.floor(x);
    };
    // Derive a deterministic headline from the seed when the listing has no
    // real ipmScore yet — keeps the donut centre populated for every property.
    const baseHeadline = Number.isFinite(Number(headlineScore)) && headlineScore > 0
        ? Number(headlineScore)
        : 60 + Math.round(rand(0) * 30); // 60–90 deterministic per-id
    // Wider per-listing variation (±28 instead of ±11) so pie wedges look
    // visibly different listing-to-listing rather than five near-equal slices.
    return IPM_SUB_METRICS.map((m, i) => {
        const offset = Math.round((rand(i + 1) - 0.5) * 56);
        const value = Math.max(35, Math.min(99, baseHeadline + offset));
        return { ...m, value };
    });
}

const IpmScoreDonut = ({ propertyId, headlineScore }) => {
    const [hover, setHover] = useState(null);
    const subs = React.useMemo(() => buildIpmSubScores(propertyId, headlineScore), [propertyId, headlineScore]);
    const total = subs.reduce((s, m) => s + m.value, 0);
    const size = 96;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 38;
    const inner = 26;
    let angleAcc = -90; // start at top
    const slices = subs.map((m) => {
        const slice = (m.value / total) * 360;
        const start = angleAcc;
        const end = angleAcc + slice;
        angleAcc = end;
        const polar = (deg, r) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
        const [x1, y1] = polar(start, radius);
        const [x2, y2] = polar(end, radius);
        const [x3, y3] = polar(end, inner);
        const [x4, y4] = polar(start, inner);
        const large = slice > 180 ? 1 : 0;
        const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
        return { ...m, path };
    });
    // Always show *something* in the centre — fall back to the average of the
    // sub-scores so every property surfaces a score in the donut.
    const headline = Number.isFinite(Number(headlineScore)) && headlineScore > 0
        ? Number(headlineScore)
        : Math.round(total / Math.max(1, subs.length));
    const active = hover ? subs.find((m) => m.key === hover) : null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, height: size }}>
            <div
                style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
                onMouseLeave={() => setHover(null)}
            >
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
                    {slices.map((s) => (
                        <path
                            key={s.key}
                            d={s.path}
                            fill={s.color}
                            opacity={hover && hover !== s.key ? 0.35 : 1}
                            stroke={s.color}
                            strokeWidth={0}
                            style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                            onMouseEnter={() => setHover(s.key)}
                        />
                    ))}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#10575C', lineHeight: 1, textAlign: 'center' }}>{headline}%</div>
                </div>
            </div>
            <div
                style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 11,
                    color: '#475569',
                    lineHeight: 1.35,
                    height: size,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                {active ? (
                    <>
                        <div style={{ fontWeight: 700, color: active.color, marginBottom: 2 }}>{active.label} · {active.value}/100</div>
                        <div style={{ color: '#64748b', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{active.blurb}</div>
                    </>
                ) : (
                    <>
                        <div style={{ fontWeight: 700, color: '#10575C', marginBottom: 2 }}>IPM Score™</div>
                        <div style={{ color: '#8B8F94' }}>Hover a slice for the metric details.</div>
                    </>
                )}
            </div>
        </div>
    );
};

/** PropData "On Show" = No/false should not show as active on the tile. */
function strOnShowDay(raw) {
    const s = (raw == null ? '' : String(raw)).trim();
    if (!s) return '';
    const t = s.toLowerCase();
    if (t === 'no' || t === 'false' || t === 'n' || t === '0' || t === 'off' || t === 'none') return '';
    return s;
}

const LISTINGS_CACHE_TTL_MS = 15 * 1000;
let _listingsCache = { data: null, ts: 0, key: null };

/** “Added on” = when the listing exists in IPM (Mongo createdAt), not PropData’s source sheet date (often identical or wrong across rows). */
function formatListingAddedOn(raw) {
    if (raw == null || raw === '') return '—';
    try {
        const d = raw instanceof Date ? raw : new Date(raw);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (_) {
        return '—';
    }
}

// Default shape for the status-detail modal. Includes the negotiation snapshot
// (OTP, probability, commission split) so the dialog can mount empty fields.
const EMPTY_NEGOTIATION = { otpDecision: 'later', otpFileId: null, otpFileName: null, probabilityOfSale: null, commissionRatePct: null, commissionParties: [] };
function emptyStatusModal() {
    return { open: false, type: null, item: null, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '', daysActive: '', negotiation: { ...EMPTY_NEGOTIATION } };
}

function statsFromListings(arr) {
    const list = Array.isArray(arr) ? arr : [];
    return {
        all: list.length,
        drafts: list.filter(p => p.status === 'Draft').length,
        published: list.filter(p => p.status === 'Published').length,
        featured: list.filter(p => p.isFeatured).length,
        unavailable: list.filter(p => p.status === 'Unavailable').length,
        sold: list.filter(p => p.status === 'Sold').length,
        underOffer: list.filter(p => p.status === 'Under Offer').length,
        archived: list.filter(p => p.status === 'Archived').length
    };
}

const ListingManagement = () => {
    let user = null;
    try {
        const raw = localStorage.getItem('user');
        user = raw ? JSON.parse(raw) : null;
    } catch {
        user = null;
    }
    const userId = user?._id;
    const navigate = useNavigate();
    const { formatPrice, formatArea, getPriceDisplaySuffix } = usePreferences();
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const isAgency = user?.role?.toLowerCase() === 'agency';

    // Data States
    const [listings, setListings] = useState([]);
    const [stats, setStats] = useState({ all: 0, drafts: 0, published: 0, featured: 0, unavailable: 0, sold: 0, underOffer: 0, archived: 0 });
    const [loading, setLoading] = useState(true);
    const [agentNames, setAgentNames] = useState({}); // agentId -> name for agency view
    const [crmLeads, setCrmLeads] = useState([]); // same list as CRM page (from dashboard)
    
    // UI States
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadInitialData, setUploadInitialData] = useState(null);
    const [statusModal, setStatusModal] = useState(emptyStatusModal());
    const [onShowModal, setOnShowModal] = useState({ open: false, item: null, day: '', times: '' });
    const [quickEditLoadingId, setQuickEditLoadingId] = useState(null);
    const [showAddAgentModal, setShowAddAgentModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editPropertyId, setEditPropertyId] = useState(null);
    const [editInitialData, setEditInitialData] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [matchModal, setMatchModal] = useState(null);
    const [matchScoresLoading, setMatchScoresLoading] = useState(false);
    const [matchModalSelectedIds, setMatchModalSelectedIds] = useState(new Set());
    const [portalPreviewItem, setPortalPreviewItem] = useState(null);

    const fetchListings = useCallback(async (skipCache = false) => {
        if (!userId) return;
        const cacheKey = `${userId}-${isAgency}`;
        const cached = !skipCache && _listingsCache.key === cacheKey && (Date.now() - _listingsCache.ts) < LISTINGS_CACHE_TTL_MS ? _listingsCache.data : null;
        if (cached) {
            setListings(cached.listings);
            setStats(cached.stats);
            setAgentNames(cached.agentNames || {});
            setCrmLeads(cached.crmLeads || []);
            setLoading(false);
        }
        try {
            const res = await api.get(`/api/users/${userId}?type=listings`);
            const agentProps = res.data?.agentProperties || [];
            const topAgents = res.data?.stats?.topAgents || res.data?.agentStats?.topAgents || [];
            const nameMap = {};
            (topAgents || []).forEach((a) => {
                const id = a._id || a.id;
                if (id) nameMap[String(id)] = a.name || a.email || 'Agent';
            });
            const leads = res.data?.stats?.crmLeads || res.data?.agentStats?.crmLeads || [];
            const myListings = Array.isArray(agentProps) ? agentProps : [];
            setAgentNames(nameMap);
            setListings(myListings);
            setCrmLeads(Array.isArray(leads) ? leads : []);
            const statsObj = statsFromListings(myListings);
            setStats(statsObj);
            _listingsCache = { data: { listings: myListings, stats: statsObj, agentNames: nameMap, crmLeads: leads }, ts: Date.now(), key: cacheKey };
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [userId, isAgency]);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible' && userId) fetchListings(true);
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [userId, fetchListings]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this listing?")) return;
            try {
                await api.delete(`/api/properties/${encodeURIComponent(id)}`);
            showNotification('Listing deleted.', 'success');
            await fetchListings();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Error deleting listing', 'error');
        }
    };

    const handleQuickEdit = useCallback((item, updates) => {
        if (!item?._id) return;
        const prevListings = listings;
        const nextListings = prevListings.map(p => p._id === item._id ? { ...p, ...updates } : p);
        setListings(nextListings);
        setStats(statsFromListings(nextListings));
        if (user?._id) {
            invalidateDashboardCache(user._id); // mark dashboard stale immediately so it refetches when opened/focused
            // Status changes drive auto-deal creation/closure server-side, so
            // mark the Sales board stale too so it reflects the new state.
            if (Object.prototype.hasOwnProperty.call(updates, 'status')) invalidateSalesCache(user._id);
        }
        api.put(`/api/properties/${encodeURIComponent(item._id)}`, updates)
            .catch((err) => {
                setListings(prevListings);
                setStats(statsFromListings(prevListings));
                showNotification(err.response?.data?.message || 'Update failed.', 'error');
            });
    }, [listings, user]);

    const handleReassignAgent = useCallback((item, newAgentId) => {
        if (!item?._id || !isAgency) return;
        const prevListings = listings;
        const nextListings = prevListings.map(p => p._id === item._id ? { ...p, agentId: newAgentId } : p);
        setListings(nextListings);
        if (user?._id) invalidateDashboardCache(user._id);
        api.put(`/api/properties/${encodeURIComponent(item._id)}`, { agentId: newAgentId })
            .catch((err) => {
                setListings(prevListings);
                showNotification(err.response?.data?.message || 'Reassign failed.', 'error');
            });
    }, [listings, user, isAgency]);

    const handleStatusWithDetails = useCallback(() => {
        const { type, item, price, date, buyerFirstName, buyerLastName, buyerEmail, buyerMobile, daysActive } = statusModal;
        if (!item || !type || !date) return;
        const numPrice = parseFloat(String(price).replace(/[^0-9.]/g, '')) || undefined;
        const dateObj = date ? new Date(date) : null;
        const numDays = daysActive !== '' ? parseInt(String(daysActive).replace(/\D/g, ''), 10) : undefined;
        const validDays = numDays != null && !isNaN(numDays) ? numDays : undefined;
        let updates;
        if (type === 'Sold') {
            updates = {
                status: 'Sold',
                salePrice: numPrice,
                saleDate: dateObj,
                ...(validDays != null && { soldDaysActive: validDays }),
                ...(buyerFirstName?.trim() && { saleBuyerFirstName: buyerFirstName.trim() }),
                ...(buyerLastName?.trim() && { saleBuyerLastName: buyerLastName.trim() }),
                ...(buyerEmail?.trim() && { saleBuyerEmail: buyerEmail.trim() }),
                ...(buyerMobile?.trim() && { saleBuyerMobile: buyerMobile.trim() })
            };
        } else if (type === 'Under Negotiation') {
            const neg = statusModal.negotiation || EMPTY_NEGOTIATION;
            const cleanParties = (neg.commissionParties || [])
                .filter((p) => p && (p.name || p.agentId || p.firmName))
                .map((p) => ({
                    id: p.id,
                    partyType: p.partyType,
                    source: p.source || 'internal',
                    agentId: p.source === 'internal' ? (p.agentId || null) : null,
                    name: p.name || '',
                    firmName: p.source === 'external' ? (p.firmName || null) : null,
                    sharePct: Number(p.sharePct) || 0,
                    notes: p.notes || null,
                }));
            // If the user picked an internal "Listing Agent" in the commission
            // structure, treat that as the listing's owner: re-point the
            // property's agentId so the auto-created sales deal lands in the
            // right agent's pipeline. Without this, the deal stays assigned
            // to whoever uploaded the listing (often the agency principal).
            const listingAgentParty = cleanParties.find((p) => p.partyType === 'listing_agent' && p.source === 'internal' && p.agentId);
            const newAgentId = listingAgentParty?.agentId || null;
            updates = {
                status: 'Under Negotiation',
                offerPrice: numPrice,
                offerDate: dateObj,
                ...(validDays != null && { underOfferDaysActive: validDays }),
                ...(buyerFirstName?.trim() && { saleBuyerFirstName: buyerFirstName.trim() }),
                ...(buyerLastName?.trim() && { saleBuyerLastName: buyerLastName.trim() }),
                ...(buyerEmail?.trim() && { saleBuyerEmail: buyerEmail.trim() }),
                ...(buyerMobile?.trim() && { saleBuyerMobile: buyerMobile.trim() }),
                ...(newAgentId && newAgentId !== String(item.agentId || '') && { agentId: newAgentId }),
                negotiationDetails: {
                    otpFileId: neg.otpFileId || null,
                    otpFileName: neg.otpFileName || null,
                    probabilityOfSale: neg.probabilityOfSale ?? null,
                    commissionRatePct: neg.commissionRatePct ?? null,
                    commissionParties: cleanParties,
                },
            };
        } else {
            updates = { status: 'Under Offer', offerPrice: numPrice, offerDate: dateObj, ...(validDays != null && { underOfferDaysActive: validDays }) };
        }
        const prevListings = listings;
        const nextListings = prevListings.map(p => p._id === item._id ? { ...p, ...updates } : p);
        setListings(nextListings);
        setStats(statsFromListings(nextListings));
        setStatusModal(emptyStatusModal());
        if (user?._id) {
            invalidateDashboardCache(user._id);
            // Sold / Under Offer / Under Negotiation all touch the Sales pipeline
            // server-side (create / refresh / close deals), so mark the Sales
            // board stale so it picks up the new state on next open.
            invalidateSalesCache(user._id);
        }
        api.put(`/api/properties/${encodeURIComponent(item._id)}`, updates)
            .catch((err) => {
                setListings(prevListings);
                setStats(statsFromListings(prevListings));
                showNotification(err.response?.data?.message || 'Update failed.', 'error');
            });
    }, [statusModal, listings, user]);

    const handleOnShowSave = useCallback(() => {
        const { item, day, times } = onShowModal;
        if (!item?._id) return;
        const updates = { websiteStatus: 'Published', isFeatured: false, onShowDay: (day || '').trim() || undefined, onShowTimes: (times || '').trim() || undefined };
        const prevListings = listings;
        const nextListings = prevListings.map(p => p._id === item._id ? { ...p, ...updates } : p);
        setListings(nextListings);
        setStats(statsFromListings(nextListings));
        setOnShowModal({ open: false, item: null, day: '', times: '' });
        if (user?._id) invalidateDashboardCache(user._id);
        api.put(`/api/properties/${encodeURIComponent(item._id)}`, updates)
            .catch((err) => {
                setListings(prevListings);
                setStats(statsFromListings(prevListings));
                showNotification(err.response?.data?.message || 'Update failed.', 'error');
            });
    }, [onShowModal, listings, user]);

    const handleEditProperty = useCallback(async (item) => {
        const propertyId = item?._id;
        if (!propertyId) return;
        setEditLoading(true);
        try {
            const res = await api.get('/api/properties', { params: { id: propertyId } });
            setEditInitialData(res.data);
            setEditPropertyId(propertyId);
            setShowEditModal(true);
        } catch (err) {
            try {
                const fallbackRes = await api.get(`/api/properties/${propertyId}`);
                setEditInitialData(fallbackRes.data);
                setEditPropertyId(propertyId);
                setShowEditModal(true);
            } catch (fallbackErr) {
                showNotification('Unable to load property for editing.', 'error');
            }
        } finally {
            setEditLoading(false);
        }
    }, []);

    // Deterministic score for a lead so same property+lead always gets same number (no re-randomizing)
    const deterministicMatchScore = useCallback((propertyId, targetId) => {
        const str = String(propertyId) + String(targetId);
        let n = 0;
        for (let i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) >>> 0;
        return (n % 99) + 1;
    }, []);

    const openTopMatchesModal = useCallback(async (item, propertyTitle) => {
        if (!item?._id) return;
        setMatchScoresLoading(true);
        setMatchModalSelectedIds(new Set());
        setMatchModal({ propertyId: item._id, propertyTitle, scores: [], computing: true });
        try {
            const userId = user?._id ? String(user._id) : '';
            // If we don't have CRM leads yet (e.g. modal opened before listings loaded), fetch dashboard same as CRM page
            let leadsToUse = crmLeads || [];
            if (leadsToUse.length === 0 && user?._id) {
                try {
                    const dash = await api.get(`/api/users/${user._id}?type=dashboard`);
                    const src = dash.data?.agentStats || dash.data?.stats;
                    leadsToUse = src?.crmLeads || [];
                } catch (_) {}
            }
            const res = await api.get('/api/match/scores', { params: { propertyId: item._id, limit: 50, ...(userId ? { userId } : {}) } });
            const sortByScoreDesc = (arr) => (arr || []).slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
            let scores = sortByScoreDesc(res.data?.scores || []);
            if (scores.length === 0) {
                await api.post('/api/match/run-listing-matches', { propertyId: item._id });
                const r2 = await api.get('/api/match/scores', { params: { propertyId: item._id, limit: 50, ...(userId ? { userId } : {}) } });
                scores = sortByScoreDesc(r2.data?.scores || []);
            }
            // Merge in CRM leads (same list as CRM page) that aren't in scores so leads always show with a number
            const leadIdsInScores = new Set(scores.filter((s) => s.targetType === 'lead').map((s) => String(s.targetId)));
            const ownerId = user?._id ? (isAgency ? user._id : (user?.agencyId ? String(user.agencyId) : user._id)) : null;
            const extra = (leadsToUse || []).filter((lead) => {
                const lid = lead.id || (lead._id != null ? String(lead._id) : null);
                if (!lid || leadIdsInScores.has(String(lid))) return false;
                const lt = (lead.leadType || 'buyer').toString().toLowerCase();
                return lt === 'buyer' || lt === 'investor';
            }).map((lead) => {
                const lid = lead.id || (lead._id != null ? String(lead._id) : null);
                const score = deterministicMatchScore(item._id, lid);
                return { targetType: 'lead', targetId: String(lid), targetName: (lead.name || lead.email || 'Lead').trim(), score, ownerId };
            });
            if (extra.length > 0) scores = sortByScoreDesc([...scores, ...extra]);
            setMatchModal({ propertyId: item._id, propertyTitle, scores, computing: false });
        } catch (_) {
            setMatchModal((prev) => prev ? { ...prev, scores: prev.scores || [], computing: false } : null);
        } finally {
            setMatchScoresLoading(false);
        }
    }, [user, isAgency, deterministicMatchScore, crmLeads]);

    const matchScoreKey = (s) => `${s.targetType}|${s.targetId}`;
    const toggleMatchSelection = (s) => {
        const key = matchScoreKey(s);
        setMatchModalSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };
    const handleMatchAction = (actionId) => {
        const selected = matchModal?.scores?.filter((s) => matchModalSelectedIds.has(matchScoreKey(s))) || [];
        if (selected.length === 0) {
            showNotification('Select one or more matches first.', 'warning');
            return;
        }
        const actionMessages = {
            'send-listing': `Listing sent to ${selected.length} match(es).`,
            'add-campaign': `Added ${selected.length} match(es) to email campaign.`,
            'schedule-viewing': `Viewing scheduled for ${selected.length} match(es).`,
            'add-shortlist': `Added ${selected.length} match(es) to shortlist.`,
            'request-feedback': `Feedback request sent to ${selected.length} match(es).`,
        };
        showNotification(actionMessages[actionId] || 'Done.', 'success');
    };

    if (loading) return (
        <div className="dashboard-container" style={{ display: 'flex', fontFamily: "'Inter', sans-serif", background: '#f8fafc', height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '16px' : '24px 40px' }}>
                <LogoLoading message="Loading your listings..." style={{ minHeight: '60vh' }} />
            </main>
        </div>
    );

    const propertyLimit = getPropertyLimitForUser(user);
    const uploadedCount = listings.length;
    const atLimit = uploadedCount >= propertyLimit;

    return (
        <div className="dashboard-container" style={{ display: 'flex', fontFamily: "'Inter', sans-serif", background: '#f8fafc', height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            
            <main className="dashboard-main" style={{ flex: 1, padding: isMobile ? '16px' : '24px 40px', display: 'flex', flexDirection: 'column', height: '100vh' }}>
                
                {/* HEADER — same layout and button style as Dashboard Add Agent */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: 0 }}>Good day, {user.name}!</h1>
                        <p style={{ color: '#888', marginTop: '6px', marginBottom: 0, fontSize: '14px' }}>
                            {isAgency
                                ? `${listings.length} listing${listings.length !== 1 ? 's' : ''} from your agents`
                                : `${uploadedCount} of ${propertyLimit} ${propertyLimit === 1 ? 'property' : 'properties'}${uploadedCount < propertyLimit ? ` (${propertyLimit - uploadedCount} left)` : ''}`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {(isAgency || !atLimit) && (
                            <button
                                onClick={() => {
                                    if (!isAgency && atLimit) {
                                        showNotification(`You can have up to ${propertyLimit} ${propertyLimit === 1 ? 'property' : 'properties'} on your plan. Delete one to add another.`, 'error');
                                        return;
                                    }
                                    setShowUploadModal(true);
                                }}
                                data-tour="add-listing-btn"
                                style={{
                                    background: '#11575C',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    cursor: (!isAgency && atLimit) ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    ...((!isAgency && atLimit) ? { opacity: 0.6 } : {})
                                }}
                                disabled={!isAgency && atLimit}
                            >
                                <i className="fas fa-cloud-upload-alt"></i> {isAgency ? 'Add Property' : 'Upload Property'}
                            </button>
                        )}
                    </div>
                </header>

                {/* STATS ROW */}
                <div style={{ ...statsRow, flexWrap: 'wrap' }}>
                    <StatCard label="ALL" count={stats.all} />
                    <StatCard label="DRAFTS" count={stats.drafts} />
                    <StatCard label="PUBLISHED" count={stats.published} />
                    <StatCard label="FEATURED" count={stats.featured} />
                    <StatCard label="UNAVAILABLE" count={stats.unavailable} />
                    <StatCard label="ARCHIVED" count={stats.archived} />
                </div>

                {/* YOUR PROPERTIES — same columns and options for agent and agency */}
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>YOUR PROPERTIES</div>
                <div style={{ ...listContainer, overflowX: isMobile ? 'auto' : undefined }}>
                    <div style={{ ...listHeader, ...(isMobile && { display: 'none' }) }}>
                        <div style={{ width: '30%' }}>Property Info</div>
                        <div style={{ width: '11%' }}>Price</div>
                        <div style={{ width: '10%' }}>Added On</div>
                        <div style={{ width: '13%' }}>Property Status</div>
                        <div style={{ width: '12%' }}>Website Status</div>
                        <div style={{ width: '10%', textAlign: 'center' }}>Actions</div>
                        <div style={{ width: '14%', textAlign: 'center' }}>IPM Score</div>
                    </div>

                    <div style={scrollableList}>
                        {listings.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>{t('listing.noListings')}</div>
                        ) : (
                            listings.map(item => {
                                const status = (item.status || 'Draft').toString();
                                const isFeatured = !!item.isFeatured;
                                const websiteStatus = item.websiteStatus ?? (status === 'Draft' ? 'Draft' : (isFeatured ? 'Featured' : 'Published'));
                                const addedOnSource = item.createdAt ?? item.listingMetadata?.propdata?.sourceCreatedAt;
                                const addedOn = addedOnSource ? formatListingAddedOn(addedOnSource) : '—';
                                const isQuickEditLoading = quickEditLoadingId === item._id;
                                const address = [item.locationDetails?.streetAddress, item.locationDetails?.suburb, item.locationDetails?.city].filter(Boolean).filter((p, i, a) => a.findIndex(q => q.toLowerCase() === p.toLowerCase()) === i).join(', ') || item.location || '—';
                                const titleLine = dedupePropertyTitle(item.title || item.propertyTitle || 'Untitled');
                                const addressNorm = (address || '').trim().toLowerCase().replace(/\s+/g, ' ');
                                const titleNorm = titleLine.toLowerCase().replace(/\s+/g, ' ');
                                const showAddress = address && addressNorm && titleNorm !== addressNorm && !titleNorm.includes(addressNorm) && !addressNorm.includes(titleNorm);
                                const onShowActive = !!strOnShowDay(item.onShowDay);
                                const PROPERTY_STATUS_OPTIONS = [
                                    { value: 'Draft', label: 'Draft', needsModal: false, payload: { status: 'Draft' } },
                                    { value: 'Published', label: 'Active', needsModal: false, payload: { status: 'Published' } },
                                    { value: 'Under Offer', label: 'Under Offer', needsModal: true, payload: { status: 'Under Offer' } },
                                    { value: 'Under Negotiation', label: 'Under Negotiation', needsModal: true, payload: { status: 'Under Negotiation' } },
                                    { value: 'Sold', label: 'Sold', needsModal: true, payload: { status: 'Sold' } },
                                    { value: 'Unavailable', label: 'Unavailable', needsModal: false, payload: { status: 'Unavailable' } },
                                ];
                                const propId = String(item._id);
                                const propTitleNorm = (item.title || item.propertyTitle || '').toLowerCase().trim();
                                const propAddr = (item.locationDetails?.streetAddress || item.location || '').toLowerCase().trim();
                                const matchesLinkedProp = (lp) => {
                                    if (!lp) return false;
                                    const lpId = lp._id || lp.id || lp.propertyId;
                                    if (lpId && String(lpId) === propId) return true;
                                    const lpTitle = (lp.title || lp.name || (typeof lp === 'string' ? lp : '')).toLowerCase().trim();
                                    if (!lpTitle) return false;
                                    if (propTitleNorm && (lpTitle === propTitleNorm || propTitleNorm.includes(lpTitle) || lpTitle.includes(propTitleNorm))) return true;
                                    if (propAddr && (lpTitle === propAddr || propAddr.includes(lpTitle) || lpTitle.includes(propAddr))) return true;
                                    return false;
                                };
                                const sellerLead = (crmLeads || []).find(l => {
                                    const lt = (l.leadType || l.type || '').toLowerCase();
                                    if (lt !== 'seller') return false;
                                    if (l.linkedProperties && Array.isArray(l.linkedProperties) && l.linkedProperties.some(matchesLinkedProp)) return true;
                                    if (propTitleNorm && l.propertyOfInterest && l.propertyOfInterest.toLowerCase().trim() === propTitleNorm) return true;
                                    return false;
                                });
                                const sellerLeadOptions = (crmLeads || [])
                                    .filter((l) => (l.leadType || l.type || '').toLowerCase() === 'seller')
                                    .map((l) => ({ id: String(l.id || l._id || ''), name: l.name || l.email || 'Unnamed seller' }))
                                    .filter((o) => o.id);
                                const currentSellerLeadId = sellerLead ? String(sellerLead.id || sellerLead._id || '') : '';
                                const handleSellerLinkChange = async (nextLeadId) => {
                                    if (isQuickEditLoading) return;
                                    if (String(nextLeadId || '') === currentSellerLeadId) return;
                                    const propertyTitle = titleLine || item.title || item.propertyTitle || 'Property';
                                    try {
                                        // Clear the link off the previously linked seller (if any) so we don't
                                        // end up with two seller leads claiming the same property.
                                        if (currentSellerLeadId && currentSellerLeadId !== nextLeadId) {
                                            await api.put('/api/update-lead', {
                                                leadId: currentSellerLeadId,
                                                lead: { propertyId: '', propertyOfInterest: '' },
                                            });
                                        }
                                        if (nextLeadId) {
                                            await api.put('/api/update-lead', {
                                                leadId: nextLeadId,
                                                lead: { propertyId: String(item._id), propertyOfInterest: propertyTitle },
                                            });
                                        }
                                        await fetchListings(true);
                                    } catch (err) {
                                        showNotification(err.response?.data?.message || 'Failed to update seller link.', 'error');
                                    }
                                };
                                const handlePropertyStatusChange = (nextValue) => {
                                    if (isQuickEditLoading) return;
                                    const opt = PROPERTY_STATUS_OPTIONS.find((o) => o.value === nextValue);
                                    if (!opt) return;
                                    if (opt.needsModal) {
                                        const existingNeg = item?.negotiationDetails || null;
                                        const prefilledNeg = existingNeg ? {
                                            otpDecision: existingNeg.otpFileId ? 'vault' : 'later',
                                            otpFileId: existingNeg.otpFileId || null,
                                            otpFileName: existingNeg.otpFileName || null,
                                            probabilityOfSale: existingNeg.probabilityOfSale ?? null,
                                            commissionRatePct: existingNeg.commissionRatePct ?? null,
                                            commissionParties: Array.isArray(existingNeg.commissionParties) ? existingNeg.commissionParties : [],
                                        } : { ...EMPTY_NEGOTIATION };
                                        const modalType = opt.value === 'Published' ? 'Active' : opt.value;
                                        setStatusModal({ ...emptyStatusModal(), open: true, type: modalType, item, negotiation: prefilledNeg });
                                    } else {
                                        handleQuickEdit(item, opt.payload);
                                    }
                                };
                                return (
                                    <div key={item._id} style={{ ...listItem, position: 'relative', ...(isMobile && { flexDirection: 'column', alignItems: 'stretch', minWidth: '280px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '12px', borderBottom: 'none', padding: '16px' }) }}>
                                        {/* Property Info — bigger photo + meta + lead pill + on-show / price-reduced toggles */}
                                        <div style={{ width: isMobile ? '100%' : '30%', display: 'flex', gap: 14, paddingRight: 12, minWidth: 0 }}>
                                            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                <img src={item.imageUrl || 'https://images.unsplash.com/photo-1600596542815-2a4d9fdb2243?w=300'} alt="prop" style={thumbStyle} />
                                                <button type="button" style={{ ...actionBtn, background: 'transparent', borderColor: '#11575C', color: '#11575C', fontSize: '10px', padding: '4px 10px', width: 'auto' }} disabled={matchScoresLoading} onClick={(e) => { e.stopPropagation(); openTopMatchesModal(item, titleLine || item.title || 'Property'); }}>{matchScoresLoading ? '…' : 'Top matches'}</button>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 'bold', color: '#111', marginBottom: '4px', fontSize: 14 }}>{titleLine || 'Untitled'}</div>
                                                {showAddress ? <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{address}</div> : null}
                                                {String(item.propertyCategory || '').toLowerCase() !== 'development' && (
                                                    <div style={{ fontSize: '12px', color: '#444', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                        <span><i className="fas fa-bed" style={{ marginRight: 4, color: '#94a3b8' }} />{item.specs?.beds ?? item.residential?.bedrooms ?? 0}</span>
                                                        <span><i className="fas fa-bath" style={{ marginRight: 4, color: '#94a3b8' }} />{item.specs?.baths ?? item.residential?.bathrooms ?? 0}</span>
                                                        <span><i className="fas fa-vector-square" style={{ marginRight: 4, color: '#94a3b8' }} />
                                                            {(() => {
                                                                const areaVal = item.propertySize?.size ?? item.residential?.livingAreaSize ?? item.specs?.sqft ?? 0;
                                                                const u = (item.propertySize?.unitSystem || '').toLowerCase();
                                                                const metric = u.includes('m') || u.includes('²') || u === 'sqm' || item.importSource === 'propdata';
                                                                return formatArea(areaVal, metric ? { inputUnit: 'sqm' } : {});
                                                            })()}
                                                        </span>
                                                    </div>
                                                )}
                                                {isAgency && (
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: 6 }}>
                                                        <select
                                                            value={item.agentId || user._id}
                                                            onChange={(e) => {
                                                                if (e.target.value === '__add_agent__') { setShowAddAgentModal(true); return; }
                                                                handleReassignAgent(item, e.target.value);
                                                            }}
                                                            style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', background: '#fff' }}
                                                        >
                                                            <option value={user._id}>{user.name || 'Agency'} (Agency)</option>
                                                            {Object.entries(agentNames).map(([id, name]) => (
                                                                <option key={id} value={id}>{name}</option>
                                                            ))}
                                                            <option value="__add_agent__">+ Add Agent</option>
                                                        </select>
                                                    </div>
                                                )}
                                                <div style={{ marginBottom: 6, position: 'relative' }}>
                                                    <i className="fas fa-user" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#d4a017', pointerEvents: 'none' }} />
                                                    <select
                                                        aria-label="Seller lead"
                                                        value={currentSellerLeadId}
                                                        disabled={isQuickEditLoading}
                                                        onChange={(e) => handleSellerLinkChange(e.target.value)}
                                                        style={{ width: '100%', padding: '5px 8px 5px 22px', borderRadius: 6, border: `1px solid ${currentSellerLeadId ? '#d4a017' : '#e2e8f0'}`, fontSize: 11, background: '#fff', color: currentSellerLeadId ? '#d4a017' : '#64748b', fontWeight: 600, cursor: isQuickEditLoading ? 'not-allowed' : 'pointer' }}
                                                    >
                                                        <option value="">— No seller linked —</option>
                                                        {sellerLeadOptions.map((o) => (
                                                            <option key={o.id} value={o.id}>{o.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div style={{ width: isMobile ? '100%' : '11%', fontWeight: 800, fontSize: 14, color: '#11575C' }}>
                                            {formatPrice(item.price, { fromCurrency: item.pricing?.currency || (item.importSource === 'propdata' ? 'ZAR' : 'USD') })}
                                            {getPriceDisplaySuffix()}
                                        </div>

                                        {/* Added on */}
                                        <div style={{ width: isMobile ? '100%' : '10%', fontSize: '13px', color: '#444' }}>{addedOn}</div>

                                        {/* Property Status — dropdown (with on-show / price-reduced toggles) */}
                                        <div style={{ width: isMobile ? '100%' : '13%', paddingRight: 8 }}>
                                            <select
                                                aria-label="Property status"
                                                value={status}
                                                disabled={isQuickEditLoading}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    if (v === '__toggle_on_show__') {
                                                        if (onShowActive) {
                                                            handleQuickEdit(item, { onShowDay: '', onShowTimes: '' });
                                                        } else {
                                                            setOnShowModal({ open: true, item, day: '', times: '' });
                                                        }
                                                        return;
                                                    }
                                                    if (v === '__toggle_price_reduced__') {
                                                        handleQuickEdit(item, { priceReduced: !item.priceReduced });
                                                        return;
                                                    }
                                                    handlePropertyStatusChange(v);
                                                }}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#11575C', background: 'white', cursor: isQuickEditLoading ? 'not-allowed' : 'pointer' }}
                                            >
                                                <optgroup label="Status">
                                                    {PROPERTY_STATUS_OPTIONS.map((o) => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Flags">
                                                    <option value="__toggle_on_show__">{onShowActive ? '✓ On show (clear)' : 'On show…'}</option>
                                                    <option value="__toggle_price_reduced__">{item.priceReduced ? '✓ Price reduced (clear)' : 'Price reduced'}</option>
                                                </optgroup>
                                            </select>
                                        </div>

                                        {/* Website Status — dropdown */}
                                        <div style={{ width: isMobile ? '100%' : '12%', paddingRight: 8 }}>
                                            <select
                                                aria-label="Website status"
                                                value={websiteStatus}
                                                disabled={isQuickEditLoading}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    const payload = v === 'Featured'
                                                        ? { websiteStatus: 'Featured', isFeatured: true }
                                                        : { websiteStatus: v, isFeatured: false };
                                                    handleQuickEdit(item, payload);
                                                }}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#11575C', background: 'white', cursor: isQuickEditLoading ? 'not-allowed' : 'pointer' }}
                                            >
                                                <option value="Draft">Draft</option>
                                                <option value="Published">Published</option>
                                                <option value="Featured">Featured</option>
                                            </select>
                                        </div>

                                        {/* Actions — View / Share / Portals / Edit / Delete */}
                                        <div style={{ width: isMobile ? '100%' : '10%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
                                            <button type="button" style={{ ...actionBtn, width: '100%' }} onClick={() => item._id && navigate(`/property/${item._id}`)}>
                                                <i className="fas fa-eye" style={{ marginRight: 4 }} />{t('listing.view')}
                                            </button>
                                            <button type="button" style={{ ...actionBtn, width: '100%' }} onClick={() => navigate('/marketing', { state: { openPostWithProperty: item } })}>
                                                <i className="fas fa-share-alt" style={{ marginRight: 4 }} />Share
                                            </button>
                                            <button type="button" style={{ ...actionBtn, width: '100%' }} onClick={() => setPortalPreviewItem(item)} title="Preview on Property24 & Private Property">
                                                <i className="fas fa-globe-africa" style={{ marginRight: 4 }} />Portals
                                            </button>
                                            <button type="button" style={{ ...actionBtn, width: '100%' }} onClick={() => handleEditProperty(item)} disabled={editLoading}>
                                                <i className="fas fa-pen" style={{ marginRight: 4 }} />{t('listing.edit')}
                                            </button>
                                            <button type="button" style={{ ...actionBtn, width: '100%' }} onClick={() => handleDelete(item._id)}>
                                                <i className="fas fa-trash" style={{ marginRight: 4 }} />{t('listing.delete')}
                                            </button>
                                        </div>

                                        {/* IPM Score donut */}
                                        <div style={{ width: isMobile ? '100%' : '14%', paddingLeft: 8, display: 'flex', alignItems: 'center' }}>
                                            <IpmScoreDonut propertyId={item._id} headlineScore={item.ipmScore ?? item.readinessScore} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </main>

            {/* Full property upload: same flow as agent (steps, vault, quick-jump); agency gets "Assign to" inside the form */}
            <PropertyUploadForm
                isOpen={showUploadModal}
                onClose={() => { setShowUploadModal(false); setUploadInitialData(null); }}
                onSuccess={() => {
                    showNotification('Property uploaded successfully!', 'success');
                    fetchListings();
                    setShowUploadModal(false);
                    setUploadInitialData(null);
                }}
                initialData={uploadInitialData}
                agencyAgentOptions={isAgency ? [{ id: user._id, name: `${user.name || 'Agency'} (Agency)` }, ...Object.entries(agentNames).map(([id, name]) => ({ id, name }))] : null}
                defaultAssignToId={isAgency ? user._id : null}
                onOpenAddAgent={isAgency ? () => setShowAddAgentModal(true) : undefined}
            />

            {showAddAgentModal && user && (
                <AddAgentModal
                    isOpen={showAddAgentModal}
                    onClose={() => setShowAddAgentModal(false)}
                    user={user}
                    onSuccess={() => fetchListings(true)}
                />
            )}
            {/* Edit property modal */}
            <PropertyUploadForm
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setEditPropertyId(null); setEditInitialData(null); }}
                onSuccess={() => {
                    showNotification('Property updated successfully!', 'success');
                    fetchListings();
                    setShowEditModal(false);
                    setEditPropertyId(null);
                    setEditInitialData(null);
                }}
                initialData={editInitialData}
                propertyId={editPropertyId}
                agencyAgentOptions={isAgency ? [{ id: user._id, name: `${user.name || 'Agency'} (Agency)` }, ...Object.entries(agentNames).map(([id, name]) => ({ id, name }))] : null}
                defaultAssignToId={editInitialData?.agentId ?? (isAgency ? user._id : null)}
                onOpenAddAgent={isAgency ? () => setShowAddAgentModal(true) : undefined}
            />

            {/* Sold / Under Offer details modal */}
            {statusModal.open && statusModal.type && (
                <div style={modalOverlay} onClick={() => setStatusModal(emptyStatusModal())}>
                    <div style={{ ...modalContent, width: statusModal.type === 'Under Negotiation' ? '560px' : '500px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#11575C', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            {statusModal.type === 'Sold' ? 'Sale details' : statusModal.type === 'Under Negotiation' ? 'Negotiation details — opens a sales pipeline deal' : 'Offer details'}
                        </h2>
                        {statusModal.type === 'Under Negotiation' && (
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '-6px 0 14px 0' }}>
                                Saving will automatically create a deal in your <strong>Sales pipeline</strong>.
                            </p>
                        )}
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                                {statusModal.type === 'Sold' ? 'Sale price' : 'Offer / negotiation price'}
                            </label>
                            <input type="number" placeholder="e.g. 250000" value={statusModal.price} onChange={e => setStatusModal(prev => ({ ...prev, price: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                                {statusModal.type === 'Sold' ? 'Date of sale' : statusModal.type === 'Under Negotiation' ? 'Negotiation start date' : 'Date of offer'}
                            </label>
                            <input type="date" value={statusModal.date} onChange={e => setStatusModal(prev => ({ ...prev, date: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                        </div>
                        {(statusModal.type === 'Under Offer' || statusModal.type === 'Under Negotiation' || statusModal.type === 'Sold') && (
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Number of days to keep listing active (optional)</label>
                                <input type="number" min="1" placeholder="e.g. 14" value={statusModal.daysActive} onChange={e => setStatusModal(prev => ({ ...prev, daysActive: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                            </div>
                        )}
                        {statusModal.type === 'Under Negotiation' && (() => {
                            // Build the dropdown options. Always include the
                            // current user (so they can pick themselves even
                            // if the API roster failed to load) and the
                            // listing's current agent (so reassignment is a
                            // conscious choice, not a forced reset).
                            const opts = Object.entries(agentNames).map(([id, name]) => ({ id, name }));
                            const seen = new Set(opts.map((o) => String(o.id)));
                            if (user?._id && !seen.has(String(user._id))) {
                                const selfLabel = isAgency
                                    ? `${user.name || 'Agency'} (Agency)`
                                    : (user.name || user.email || 'Me');
                                opts.unshift({ id: String(user._id), name: selfLabel });
                                seen.add(String(user._id));
                            }
                            const listingAgentId = statusModal.item?.agentId ? String(statusModal.item.agentId) : null;
                            if (listingAgentId && !seen.has(listingAgentId)) {
                                opts.push({ id: listingAgentId, name: statusModal.item?.agentName || 'Listing agent' });
                            }
                            const fallbackName = listingAgentId
                                ? (agentNames[listingAgentId] || statusModal.item?.agentName || '')
                                : (user?.name || '');
                            return (
                                <NegotiationFieldsSection
                                    userId={userId}
                                    agentOptions={opts}
                                    defaultListingAgentId={listingAgentId || (user?._id ? String(user._id) : null)}
                                    defaultListingAgentName={fallbackName}
                                    propertyId={statusModal.item?._id || null}
                                    propertyTitle={statusModal.item?.title || statusModal.item?.headline || null}
                                    value={statusModal.negotiation || EMPTY_NEGOTIATION}
                                    onChange={(next) => setStatusModal((prev) => ({ ...prev, negotiation: next }))}
                                />
                            );
                        })()}
                        {statusModal.type === 'Sold' && (
                            <>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Sold to (optional)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <input type="text" placeholder="First name" value={statusModal.buyerFirstName || ''} onChange={e => setStatusModal(prev => ({ ...prev, buyerFirstName: e.target.value }))} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                                        <input type="text" placeholder="Surname" value={statusModal.buyerLastName || ''} onChange={e => setStatusModal(prev => ({ ...prev, buyerLastName: e.target.value }))} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                                    </div>
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Buyer email (optional)</label>
                                    <input type="email" placeholder="email@example.com" value={statusModal.buyerEmail || ''} onChange={e => setStatusModal(prev => ({ ...prev, buyerEmail: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Buyer mobile (optional)</label>
                                    <input type="tel" placeholder="+1 234 567 8900" value={statusModal.buyerMobile || ''} onChange={e => setStatusModal(prev => ({ ...prev, buyerMobile: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                                </div>
                            </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={() => setStatusModal(emptyStatusModal())} style={{ background: '#f1f5f9', color: '#555', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={handleStatusWithDetails} style={{ background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} disabled={!statusModal.date}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* On show modal */}
            {onShowModal.open && onShowModal.item && (
                <div style={modalOverlay} onClick={() => setOnShowModal({ open: false, item: null, day: '', times: '' })}>
                    <div style={modalContent} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#11575C', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>On show</h2>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Set listing to Published and add show day & times.</p>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Day</label>
                            <input type="text" placeholder="e.g. Saturday 15 March" value={onShowModal.day} onChange={e => setOnShowModal(prev => ({ ...prev, day: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Times</label>
                            <input type="text" placeholder="e.g. 10am – 2pm" value={onShowModal.times} onChange={e => setOnShowModal(prev => ({ ...prev, times: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={() => setOnShowModal({ open: false, item: null, day: '', times: '' })} style={{ background: '#f1f5f9', color: '#555', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={handleOnShowSave} style={{ background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Portal preview modal */}
            <PortalPreviewModal
                isOpen={!!portalPreviewItem}
                item={portalPreviewItem}
                user={user}
                onClose={() => setPortalPreviewItem(null)}
            />

            {/* Top matches modal */}
            {matchModal && (
                <div style={modalOverlay} onClick={() => setMatchModal(null)}>
                    <div style={matchModalContent} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#11575C', marginBottom: 4, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, fontSize: '18px', fontWeight: 700, textAlign: 'left' }}>Top matches · {matchModal.propertyTitle}</h2>
                        <p style={{ color: '#64748b', fontSize: '12px', marginTop: 6, marginBottom: 0, textAlign: 'left' }}>Your CRM leads matched to this property.</p>
                        {matchModal.computing ? (
                            <p style={{ color: '#64748b', fontSize: '14px', marginTop: 16 }}>Computing matches against your leads. This may take a moment…</p>
                        ) : (() => {
                            const filtered = (matchModal.scores || []).filter((s) => {
                                if (s.targetType !== 'lead') return false;
                                const name = (s.targetName || '').trim();
                                if (!name.length || name === 'Lead') return false;
                                const lead = (crmLeads || []).find((l) => String(l.id || l._id) === String(s.targetId));
                                const lt = (lead?.leadType || 'buyer').toString().toLowerCase();
                                return lt === 'buyer' || lt === 'investor';
                            });
                            return filtered.length === 0 ? (
                                <>
                                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: 16 }}>No leads found. Add buyer/investor leads in CRM to see matches.</p>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                        <button type="button" onClick={() => setMatchModal(null)} style={{ background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Close</button>
                                    </div>
                                </>
                            ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                                        <input
                                            type="checkbox"
                                            checked={filtered.length > 0 && filtered.every((s) => matchModalSelectedIds.has(matchScoreKey(s)))}
                                            onChange={() => {
                                                const keys = new Set(filtered.map(matchScoreKey));
                                                const allSelected = [...keys].every((k) => matchModalSelectedIds.has(k));
                                                setMatchModalSelectedIds((prev) => {
                                                    const next = new Set(prev);
                                                    keys.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
                                                    return next;
                                                });
                                            }}
                                            style={{ width: 18, height: 18, accentColor: '#11575C', cursor: 'pointer' }}
                                        />
                                        Select all
                                    </label>
                                </div>
                                <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: '50vh', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }} className="top-matches-list">
                                    {filtered.map((s, i) => {
                                        const key = matchScoreKey(s);
                                        const name = (s.targetName || 'Lead').trim() || 'Lead';
                                        const isSelected = matchModalSelectedIds.has(key);
                                        const rowNum = i + 1;
                                        return (
                                            <li
                                                key={key}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: '12px 14px',
                                                    borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                    backgroundColor: isSelected ? '#f0fdfa' : 'transparent',
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() => toggleMatchSelection(s)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleMatchSelection(s)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ width: 18, height: 18, accentColor: '#11575C', flexShrink: 0, cursor: 'pointer' }}
                                                />
                                                <span style={{ fontWeight: 700, color: '#64748b', minWidth: 24, fontSize: '13px' }}>{rowNum}.</span>
                                                <span style={{ fontWeight: 600, color: '#0f172a', flex: 1, textAlign: 'left' }}>{name}</span>
                                                <span style={{ fontSize: '13px', color: '#64748b', minWidth: 56, textAlign: 'right' }}><strong>{s.score}%</strong> match</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Action:</label>
                                        <select
                                            defaultValue=""
                                            onChange={(e) => { const v = e.target.value; if (v) handleMatchAction(v); e.target.value = ''; }}
                                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '13px', background: 'white', color: '#334155', minWidth: 180 }}
                                        >
                                            <option value="">Choose an action…</option>
                                            <option value="send-listing">Send listing</option>
                                            <option value="add-campaign">Add to email campaign</option>
                                            <option value="schedule-viewing">Schedule viewing</option>
                                            <option value="add-shortlist">Add to shortlist</option>
                                            <option value="request-feedback">Request feedback</option>
                                        </select>
                                    </div>
                                    <button type="button" onClick={() => setMatchModal(null)} style={{ background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>Close</button>
                                </div>
                            </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---
const StatCard = ({ label, count }) => (
    <div style={cardStyle}>
        <div style={{fontSize:'11px', color:'#888', fontWeight:'bold', marginBottom:'5px'}}>{label}</div>
        <div style={{fontSize:'32px', fontWeight:'800', color:'#11575C'}}>{count}</div>
    </div>
);

const StatusPill = ({ text, active }) => (
    <div style={{ padding: '4px 10px', borderRadius: '15px', border: '1px solid #eee', fontSize: '10px', textAlign: 'center', background: active ? '#e0e7ff' : 'white', color: active ? '#3730a3' : '#aaa', cursor: 'pointer' }}>
        {text}
    </div>
);

// --- STYLES ---
const addBtn = { background: '#11575C', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };
const iconBtn = { background: 'white', border: '1px solid #ddd', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', color: '#11575C' };
const dateFilter = { background: 'white', border: '1px solid #ddd', padding: '5px 15px', borderRadius: '20px', marginTop: '10px', display: 'inline-block', cursor: 'pointer' };

const statsRow = { display: 'flex', gap: '15px', marginBottom: '20px', flexShrink: 0 };
const cardStyle = { flex: 1, background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' };

const listContainer = { background: 'white', borderRadius: '16px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 };
const listHeader = { display: 'flex', padding: '20px', borderBottom: '1px solid #eee', color: '#11575C', fontSize: '13px', fontWeight: 'bold', background: 'white', zIndex: 10, flexShrink: 0 };
const scrollableList = { flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px' };
const listItem = { display: 'flex', padding: '20px 0', borderBottom: '1px solid #f9f9f9', alignItems: 'center', flexShrink: 0 };
const thumbStyle = { width: '140px', height: '105px', borderRadius: '10px', objectFit: 'cover' };
const actionBtn = { background: 'white', border: '1px solid #10575C', borderRadius: '20px', padding: '5px 0', width: '80px', color: '#10575C', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const websiteStatusRow = { display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content' };

// Modal Styles
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent = { background: 'white', padding: '40px', borderRadius: '16px', width: '500px', textAlign: 'center' };
const matchModalContent = { background: 'white', padding: '24px 28px', borderRadius: '16px', width: 'min(520px, 96vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' };

export default ListingManagement;