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
import { showNotification } from '../components/NotificationManager';
import { getPropertyLimitForUser } from '../utils/planLimits';
import { invalidateDashboardCache } from '../config/dashboardCache';
import { dedupePropertyTitle } from '../utils/propertyTitle';

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
    const [statusModal, setStatusModal] = useState({ open: false, type: null, item: null, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '', daysActive: '' });
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
        if (user?._id) invalidateDashboardCache(user._id); // mark dashboard stale immediately so it refetches when opened/focused
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
        const updates = type === 'Sold'
            ? {
                status: 'Sold',
                salePrice: numPrice,
                saleDate: dateObj,
                ...(validDays != null && { soldDaysActive: validDays }),
                ...(buyerFirstName?.trim() && { saleBuyerFirstName: buyerFirstName.trim() }),
                ...(buyerLastName?.trim() && { saleBuyerLastName: buyerLastName.trim() }),
                ...(buyerEmail?.trim() && { saleBuyerEmail: buyerEmail.trim() }),
                ...(buyerMobile?.trim() && { saleBuyerMobile: buyerMobile.trim() })
            }
            : { status: 'Under Offer', offerPrice: numPrice, offerDate: dateObj, ...(validDays != null && { underOfferDaysActive: validDays }) };
        const prevListings = listings;
        const nextListings = prevListings.map(p => p._id === item._id ? { ...p, ...updates } : p);
        setListings(nextListings);
        setStats(statsFromListings(nextListings));
        setStatusModal({ open: false, type: null, item: null, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '', daysActive: '' });
        if (user?._id) invalidateDashboardCache(user._id);
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
                        <div style={{ width: '14%' }}>Feature Photo</div>
                        <div style={{ width: '24%' }}>Property Info</div>
                        <div style={{ width: '14%' }}>Added On</div>
                        <div style={{ width: '18%', textAlign: 'left' }}>Property Status</div>
                        <div style={{ width: '14%', textAlign: 'left' }}>Website Status</div>
                        <div style={{ width: '16%', textAlign: 'center' }}>{t('listing.priceActions')}</div>
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
                                return (
                                    <div key={item._id} style={{ ...listItem, position: 'relative', ...(isMobile && { flexDirection: 'column', alignItems: 'stretch', minWidth: '280px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '12px', borderBottom: 'none', padding: '16px' }) }}>
                                        {(item.ipmScore != null || item.readinessScore != null) && (
                                            <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1 }}>
                                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score</div>
                                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#11575C' }}>{item.ipmScore ?? item.readinessScore ?? 0}</div>
                                            </div>
                                        )}
                                        <div style={{ width: isMobile ? '100%' : '14%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0, gap: 14 }}>
                                            <div style={{ flex: 1, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                <button type="button" style={{ ...actionBtn, background: '#ffc801', borderColor: '#ffc801', color: '#1a1a1a', padding: '4px 10px', fontSize: '11px', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/marketing', { state: { openPostWithProperty: item } })}><i className="fas fa-share-alt" /> Social</button>
                                            </div>
                                            <img src={item.imageUrl || 'https://images.unsplash.com/photo-1600596542815-2a4d9fdb2243?w=200'} alt="prop" style={thumbStyle} />
                                            <div style={{ flex: 1, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                <button type="button" style={{ ...actionBtn, background: 'transparent', borderColor: '#11575C', color: '#11575C', fontSize: '11px', padding: '4px 10px', width: 'auto' }} disabled={matchScoresLoading} onClick={(e) => { e.stopPropagation(); openTopMatchesModal(item, titleLine || item.title || 'Property'); }}>{matchScoresLoading ? '…' : 'Top matches'}</button>
                                            </div>
                                        </div>
                                        <div style={{ width: isMobile ? '100%' : '24%', paddingRight: '10px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#111', marginBottom: '5px' }}>{titleLine || 'Untitled'}</div>
                                            {showAddress ? <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{address}</div> : null}
                                            {isAgency && (
                                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                                                    <label style={{ display: 'block', marginBottom: '2px' }}>Assigned to</label>
                                                    <select
                                                        value={item.agentId || user._id}
                                                        onChange={(e) => {
                                                            if (e.target.value === '__add_agent__') { setShowAddAgentModal(true); return; }
                                                            handleReassignAgent(item, e.target.value);
                                                        }}
                                                        style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', background: '#fff' }}
                                                    >
                                                        <option value={user._id}>{user.name || 'Agency'} (Agency)</option>
                                                        {Object.entries(agentNames).map(([id, name]) => (
                                                            <option key={id} value={id}>{name}</option>
                                                        ))}
                                                        <option value="__add_agent__">+ Add Agent</option>
                                                    </select>
                                                </div>
                                            )}
                                            {(() => {
                                                const propId = String(item._id);
                                                const propTitle = (item.title || item.propertyTitle || '').toLowerCase().trim();
                                                const propAddr = (item.locationDetails?.streetAddress || item.location || '').toLowerCase().trim();
                                                const matchesLinkedProp = (lp) => {
                                                    if (!lp) return false;
                                                    const lpId = lp._id || lp.id || lp.propertyId;
                                                    if (lpId && String(lpId) === propId) return true;
                                                    const lpTitle = (lp.title || lp.name || (typeof lp === 'string' ? lp : '')).toLowerCase().trim();
                                                    if (!lpTitle) return false;
                                                    if (propTitle && (lpTitle === propTitle || propTitle.includes(lpTitle) || lpTitle.includes(propTitle))) return true;
                                                    if (propAddr && (lpTitle === propAddr || propAddr.includes(lpTitle) || lpTitle.includes(propAddr))) return true;
                                                    return false;
                                                };
                                                const sellerLead = (crmLeads || []).find(l => {
                                                    const lt = (l.leadType || l.type || '').toLowerCase();
                                                    if (lt !== 'seller') return false;
                                                    if (l.linkedProperties && Array.isArray(l.linkedProperties) && l.linkedProperties.some(matchesLinkedProp)) return true;
                                                    if (propTitle && l.propertyOfInterest && l.propertyOfInterest.toLowerCase().trim() === propTitle) return true;
                                                    return false;
                                                });
                                                return sellerLead ? (
                                                    <div style={{ fontSize: '11px', color: '#d4a017', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <i className="fas fa-user" style={{ fontSize: 9 }} />
                                                        {sellerLead.name}
                                                    </div>
                                                ) : null;
                                            })()}
                                            {String(item.propertyCategory || '').toLowerCase() !== 'development' && (
                                            <div style={{ fontSize: '11px', color: '#444' }}>
                                                <b>{item.specs?.beds ?? item.residential?.bedrooms ?? 0}</b> {t('common.beds')} · <b>{item.specs?.baths ?? item.residential?.bathrooms ?? 0}</b> {t('common.baths')} ·{' '}
                                                <b>
                                                    {(() => {
                                                        const areaVal = item.propertySize?.size ?? item.residential?.livingAreaSize ?? item.specs?.sqft ?? 0;
                                                        const u = (item.propertySize?.unitSystem || '').toLowerCase();
                                                        const metric =
                                                            u.includes('m') ||
                                                            u.includes('²') ||
                                                            u === 'sqm' ||
                                                            item.importSource === 'propdata';
                                                        return formatArea(areaVal, metric ? { inputUnit: 'sqm' } : {});
                                                    })()}
                                                </b>
                                            </div>
                                            )}
                                        </div>
                                        <div style={{ width: isMobile ? '100%' : '14%', fontSize: '13px', color: '#444' }}>{addedOn}</div>
                                        <div style={{ width: isMobile ? '100%' : '18%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', justifyContent: 'center' }} role="radiogroup" aria-label="Property status">
                                            {[
                                                { id: 'Draft', payload: { status: 'Draft' }, needsModal: false },
                                                { id: 'Active', payload: { status: 'Published' }, needsModal: false },
                                                { id: 'Under Offer', payload: { status: 'Under Offer' }, needsModal: true },
                                                { id: 'Sold', payload: { status: 'Sold' }, needsModal: true },
                                                { id: 'Unavailable', payload: { status: 'Unavailable' }, needsModal: false }
                                            ].map(({ id, payload, needsModal }) => {
                                                const selected = (id === 'Draft' && status === 'Draft') || (id === 'Active' && status === 'Published') || (id === 'Under Offer' && status === 'Under Offer') || (id === 'Sold' && status === 'Sold') || (id === 'Unavailable' && status === 'Unavailable');
                                                const onSelect = () => {
                                                    if (isQuickEditLoading) return;
                                                    if (needsModal) setStatusModal({ open: true, type: id, item, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '', daysActive: '' });
                                                    else handleQuickEdit(item, payload);
                                                };
                                                return (
                                                    <label key={id} style={{ ...websiteStatusRow, opacity: isQuickEditLoading ? 0.6 : 1, cursor: isQuickEditLoading ? 'not-allowed' : 'pointer' }}>
                                                        <input type="radio" name={`property-status-${item._id}`} checked={selected} onChange={onSelect} disabled={isQuickEditLoading} style={{ margin: 0, width: 14, height: 14, accentColor: '#11575C', flexShrink: 0 }} />
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: selected ? '#11575C' : '#64748b' }}>{id}</span>
                                                    </label>
                                                );
                                            })}
                                            {(() => {
                                                const onShowActive = !!strOnShowDay(item.onShowDay);
                                                return (
                                                    <label
                                                        key="onShow"
                                                        style={{ ...websiteStatusRow, opacity: isQuickEditLoading ? 0.6 : 1, cursor: isQuickEditLoading ? 'not-allowed' : 'pointer' }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (isQuickEditLoading) return;
                                                            setOnShowModal({
                                                                open: true,
                                                                item,
                                                                day: strOnShowDay(item.onShowDay),
                                                                times: strOnShowDay(item.onShowDay) ? item.onShowTimes || '' : '',
                                                            });
                                                        }}
                                                    >
                                                        <input type="radio" name={`prop-extra-${item._id}-onshow`} checked={onShowActive} onChange={() => {}} disabled={isQuickEditLoading} style={{ margin: 0, width: 14, height: 14, accentColor: '#11575C', flexShrink: 0 }} />
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: onShowActive ? '#11575C' : '#64748b' }}>On show</span>
                                                    </label>
                                                );
                                            })()}
                                            {(() => {
                                                const prActive = !!item.priceReduced;
                                                return (
                                                    <label
                                                        key="priceReduced"
                                                        style={{ ...websiteStatusRow, opacity: isQuickEditLoading ? 0.6 : 1, cursor: isQuickEditLoading ? 'not-allowed' : 'pointer' }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (!isQuickEditLoading) handleQuickEdit(item, { priceReduced: !item.priceReduced });
                                                        }}
                                                    >
                                                        <input type="radio" name={`prop-extra-${item._id}-pricereduced`} checked={prActive} onChange={() => {}} disabled={isQuickEditLoading} style={{ margin: 0, width: 14, height: 14, accentColor: '#11575C', flexShrink: 0 }} />
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: prActive ? '#11575C' : '#64748b' }}>Price reduced</span>
                                                    </label>
                                                );
                                            })()}
                                    </div>
                                        <div style={{ width: isMobile ? '100%' : '14%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', justifyContent: 'center' }} role="radiogroup" aria-label="Website status">
                                            {[
                                                { id: 'Draft', payload: { websiteStatus: 'Draft', isFeatured: false } },
                                                { id: 'Published', payload: { websiteStatus: 'Published', isFeatured: false } },
                                                { id: 'Featured', payload: { websiteStatus: 'Featured', isFeatured: true } }
                                            ].map(({ id, payload }) => {
                                                const selected = id === websiteStatus;
                                                const onSelect = () => { if (!isQuickEditLoading) handleQuickEdit(item, payload); };
                                                return (
                                                    <label key={id} style={{ ...websiteStatusRow, opacity: isQuickEditLoading ? 0.6 : 1, cursor: isQuickEditLoading ? 'not-allowed' : 'pointer' }}>
                                                        <input type="radio" name={`website-status-${item._id}`} checked={selected} onChange={onSelect} disabled={isQuickEditLoading} style={{ margin: 0, width: 14, height: 14, accentColor: '#11575C', flexShrink: 0 }} />
                                                        <span style={{ fontSize: '12px', fontWeight: 500, color: selected ? '#11575C' : '#64748b' }}>{id}</span>
                                                    </label>
                                                );
                                            })}
                                    </div>
                                        <div style={{ width: isMobile ? '100%' : '16%', textAlign: 'center' }}>
                                            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '12px', color: '#11575C' }}>
                                                {formatPrice(item.price, {
                                                    fromCurrency: item.pricing?.currency || (item.importSource === 'propdata' ? 'ZAR' : 'USD'),
                                                })}
                                                {getPriceDisplaySuffix()}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                                <button type="button" style={actionBtn} onClick={() => item._id && navigate(`/property/${item._id}`)}>{t('listing.view')}</button>
                                                <button
                                                    type="button"
                                                    style={{ ...actionBtn, background: '#fff5f6', borderColor: '#C8102E', color: '#C8102E' }}
                                                    onClick={() => setPortalPreviewItem(item)}
                                                    title="Preview on Property24 & Private Property"
                                                >
                                                    <i className="fas fa-globe-africa" style={{ marginRight: 4 }} />Portals
                                                </button>
                                                <button type="button" style={actionBtn} onClick={() => handleEditProperty(item)} disabled={editLoading}>{t('listing.edit')}</button>
                                                <button type="button" style={{ ...actionBtn, color: '#dc2626', borderColor: '#dc2626' }} onClick={() => handleDelete(item._id)}>{t('listing.delete')}</button>
                                    </div>
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
                <div style={modalOverlay} onClick={() => setStatusModal({ open: false, type: null, item: null, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '', daysActive: '' })}>
                    <div style={modalContent} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#11575C', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            {statusModal.type === 'Sold' ? 'Sale details' : 'Offer details'}
                        </h2>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                                {statusModal.type === 'Sold' ? 'Sale price' : 'Offer price'}
                            </label>
                            <input type="number" placeholder="e.g. 250000" value={statusModal.price} onChange={e => setStatusModal(prev => ({ ...prev, price: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                                {statusModal.type === 'Sold' ? 'Date of sale' : 'Date of offer'}
                            </label>
                            <input type="date" value={statusModal.date} onChange={e => setStatusModal(prev => ({ ...prev, date: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                        </div>
                        {(statusModal.type === 'Under Offer' || statusModal.type === 'Sold') && (
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Number of days to keep listing active (optional)</label>
                                <input type="number" min="1" placeholder="e.g. 14" value={statusModal.daysActive} onChange={e => setStatusModal(prev => ({ ...prev, daysActive: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }} />
                            </div>
                        )}
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
                            <button type="button" onClick={() => setStatusModal({ open: false, type: null, item: null, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '', daysActive: '' })} style={{ background: '#f1f5f9', color: '#555', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
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
const thumbStyle = { width: '100px', height: '70px', borderRadius: '8px', objectFit: 'cover' };
const actionBtn = { background: 'white', border: '1px solid #11575C', borderRadius: '20px', padding: '5px 0', width: '80px', color: '#11575C', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const websiteStatusRow = { display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content' };

// Modal Styles
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent = { background: 'white', padding: '40px', borderRadius: '16px', width: '500px', textAlign: 'center' };
const matchModalContent = { background: 'white', padding: '24px 28px', borderRadius: '16px', width: 'min(520px, 96vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' };

export default ListingManagement;