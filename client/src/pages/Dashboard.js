import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import api from '../config/api';
import { usePreferences } from '../context/PreferencesContext';
import LeadDetailPopup from '../components/LeadDetailPopup';
import EditLeadModal from '../components/EditLeadModal';
import GooglePlacesInput from '../components/GooglePlacesInput';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import DashboardLegacy from './legacy/DashboardLegacy';
import EnterpriseDashboard from './EnterpriseDashboard';
import AdminDashboardLists from '../components/AdminDashboardLists';
import { getDashboardCache, setDashboardCache, invalidateDashboardCache, takeDashboardInvalidated, DASHBOARD_INVALIDATED_KEY } from '../config/dashboardCache';
import { getSalesCache, setSalesCache, takeSalesInvalidated } from '../config/salesCache';
import { brand, getStatusColor } from '../config/brandColors';
import { sanitizeAgencyBranchDisplay } from '../utils/display';
import { isNewsOrPropertySourceUrl } from '../utils/newsUrl';
import QuickActionsButton from '../components/QuickActionsButton';
import { getDemoState } from '../components/DemoModeBar';

// Fallback only when API returns no trends (e.g. offline). Actuals from marketTrendsMonthly.json; server should always return real data.
const DEFAULT_MARKET_TRENDS = [
    { country: 'South Africa', status: 'Good', color: '#2ecc71', priceChange: '+4.7%', yoyPercent: '+4.7%', monthlyData: [{ month: 'Mar', value: 2.0 }, { month: 'Apr', value: 2.2 }, { month: 'May', value: 2.6 }, { month: 'Jun', value: 3.5 }, { month: 'Jul', value: 4.4 }, { month: 'Aug', value: 4.5 }, { month: 'Sep', value: 6.3 }, { month: 'Oct', value: 5.0 }, { month: 'Nov', value: 4.7 }, { month: 'Dec', value: 4.7 }, { month: 'Jan', value: 4.7 }, { month: 'Feb', value: 4.7 }] },
    { country: 'Dubai', status: 'Excellent', color: '#00c2cb', priceChange: '+8.4%', yoyPercent: '+8.4%', monthlyData: [{ month: 'Mar', value: 1538 }, { month: 'Apr', value: 1565 }, { month: 'May', value: 1587 }, { month: 'Jun', value: 1609 }, { month: 'Jul', value: 1625 }, { month: 'Aug', value: 1644 }, { month: 'Sep', value: 1663 }, { month: 'Oct', value: 1683 }, { month: 'Nov', value: 1686 }, { month: 'Dec', value: 1689 }, { month: 'Jan', value: 1678 }, { month: 'Feb', value: 1667 }] },
    { country: 'London', status: 'Stable', color: '#ffc801', priceChange: '+2.4%', yoyPercent: '+2.4%', monthlyData: [{ month: 'Mar', value: 6.4 }, { month: 'Apr', value: 3.5 }, { month: 'May', value: 3.9 }, { month: 'Jun', value: 3.7 }, { month: 'Jul', value: 2.8 }, { month: 'Aug', value: 3.0 }, { month: 'Sep', value: 2.6 }, { month: 'Oct', value: 1.7 }, { month: 'Nov', value: 2.1 }, { month: 'Dec', value: 2.4 }, { month: 'Jan', value: 2.4 }, { month: 'Feb', value: 2.4 }] },
    { country: 'Netherlands', status: 'Good', color: '#0f766e', priceChange: '+5.8%', yoyPercent: '+5.8%', monthlyData: [{ month: 'Mar', value: 10.6 }, { month: 'Apr', value: 10.2 }, { month: 'May', value: 9.7 }, { month: 'Jun', value: 9.3 }, { month: 'Jul', value: 8.6 }, { month: 'Aug', value: 7.9 }, { month: 'Sep', value: 7.0 }, { month: 'Oct', value: 6.6 }, { month: 'Nov', value: 6.1 }, { month: 'Dec', value: 5.8 }, { month: 'Jan', value: 5.8 }, { month: 'Feb', value: 5.8 }] }
];
const DEFAULT_NEWS_FEEDS = [
    { title: 'Buying or Selling? Why Timing Alone Is No Longer the Deciding Factor', category: 'Buying Property', date: '6 February 2026' },
    { title: 'From Listings to Intelligence: How AI Is Reshaping Property', category: 'Market Intelligence', date: '13 February 2026' },
    { title: 'International property outlook for 2026', category: 'Market Update', date: '11 February 2026' }
];

// --- Map: DashboardMapCard with hasInitedRef (same fix as tiles – stable deps, init once) ---
let dashboardMapScriptPromise = null;
// Black-and-white map styling — matches Prospecting tab for visual consistency.
const dashboardMapStyles = [
    { elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 5 }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#5f6368' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 20 }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#cccccc' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e0e0e0' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] }
];
const loadDashboardMapScript = (apiKey) => {
    if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key'));
    if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
    if (window.google?.maps) return Promise.resolve(window.google);
    if (!dashboardMapScriptPromise) {
        dashboardMapScriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-google-maps="core"]');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.google));
                existing.addEventListener('error', reject);
                return;
            }
            const script = document.createElement('script');
            // Load all libraries the app uses anywhere (drawing/geometry are needed by
            // the Prospecting tab; places is harmless overhead). We must request them
            // up-front because if we lazy-load later, the script tag is already in
            // the DOM and Google won't re-evaluate its libraries param.
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,geometry`;
            script.async = true;
            script.defer = true;
            script.setAttribute('data-google-maps', 'core');
            script.onload = () => resolve(window.google);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    return dashboardMapScriptPromise;
};
const DASHBOARD_MAP_CENTER = { lat: 15, lng: 0 };
const DASHBOARD_MAP_ZOOM = 3;
const EMPTY_LIST_STABLE = []; // Stable ref so map does not re-init when only sort changes (agency view passes listData=[])

// Hide the Google attribution + bottom controls *only* inside the dashboard map card.
// (Done via a scoped class so we don't affect any other Google Map on the app.)
if (typeof document !== 'undefined' && !document.getElementById('dashboard-map-attribution-hide')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'dashboard-map-attribution-hide';
    styleEl.textContent = `
        .dashboard-map-clean .gm-style-cc,
        .dashboard-map-clean a[href^="https://maps.google.com/maps"],
        .dashboard-map-clean a[href^="https://www.google.com/maps"],
        .dashboard-map-clean a[title*="Google"],
        .dashboard-map-clean img[alt="Google"],
        .dashboard-map-clean .gmnoprint:not(.gm-bundled-control) {
            display: none !important;
        }
    `;
    document.head.appendChild(styleEl);
}

/** Prefer DB/import coordinates (same sources as Property.js); avoids blank maps when address strings are empty. */
function getLatLngForDashboardItem(item) {
    const nested = item && item.details;
    const candidates = nested ? [nested, item] : [item];
    for (const s of candidates) {
        if (!s || typeof s !== 'object') continue;
        const lat =
            s.locationDetails?.coordinates?.lat ??
            s.listingMetadata?.property?.coordinates?.latitude;
        const lng =
            s.locationDetails?.coordinates?.lng ??
            s.listingMetadata?.property?.coordinates?.longitude;
        const nlat = Number(lat);
        const nlng = Number(lng);
        if (
            Number.isFinite(nlat) &&
            Number.isFinite(nlng) &&
            Math.abs(nlat) <= 90 &&
            Math.abs(nlng) <= 180
        ) {
            return { lat: nlat, lng: nlng };
        }
    }
    return null;
}

function getGeocodeQueryForDashboardItem(item) {
    const nested = item && item.details;
    const p = nested || item;
    const single =
        (typeof item?.location === 'string' && item.location.trim()) ||
        (typeof p?.location === 'string' && p.location.trim()) ||
        (typeof p?.address === 'string' && p.address.trim()) ||
        (typeof nested?.location === 'string' && nested.location.trim()) ||
        (typeof p?.details?.location === 'string' && p.details.location.trim()) ||
        '';
    if (single) return single.trim();
    const ld = p?.locationDetails || nested?.locationDetails;
    if (ld && typeof ld === 'object') {
        const parts = [ld.streetAddress, ld.suburb, ld.city, ld.region, ld.state, ld.postalCode, ld.country]
            .map((x) => (x != null ? String(x).trim() : ''))
            .filter(Boolean)
            .filter((p, i, a) => a.findIndex(q => q.toLowerCase() === p.toLowerCase()) === i);
        if (parts.length) return parts.join(', ');
    }
    const title =
        (typeof item?.propertyTitle === 'string' && item.propertyTitle.trim()) ||
        (typeof p?.title === 'string' && p.title.trim()) ||
        '';
    return title || '';
}

function DashboardMapCard({ loading, userRole, listData, agentProperties }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const listenersRef = useRef(null);
    const geocodeRunIdRef = useRef(0);
    const isAgency = userRole?.toLowerCase() === 'agency';

    useEffect(() => {
        if (loading) return;
        const container = mapContainerRef.current;
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!container || !apiKey) return;

        const items = isAgency ? (agentProperties || []) : (listData || []);
        let cancelled = false;
        const runId = ++geocodeRunIdRef.current;

        const clearListeners = () => {
            const L = listenersRef.current;
            if (L) {
                window.removeEventListener('resize', L.refreshMap);
                document.removeEventListener('visibilitychange', L.handleVisibility);
                if (L.resizeTimer) clearTimeout(L.resizeTimer);
                listenersRef.current = null;
            }
        };

        const attachMapListeners = (google) => {
            if (listenersRef.current) return;
            const refreshMap = () => {
                if (!mapRef.current) return;
                google.maps.event.trigger(mapRef.current, 'resize');
                const c = mapRef.current.getCenter();
                if (c) mapRef.current.setCenter(c);
            };
            const resizeTimer = setTimeout(refreshMap, 150);
            const handleVisibility = () => {
                if (document.visibilityState === 'visible') setTimeout(refreshMap, 50);
            };
            window.addEventListener('resize', refreshMap);
            document.addEventListener('visibilitychange', handleVisibility);
            listenersRef.current = { refreshMap, handleVisibility, resizeTimer };
        };

        // Small, semi-transparent yellow dot — matches Prospecting visual language.
        const pinIcon = (google) => ({
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#ffc801',
            fillOpacity: 0.5,
            strokeColor: '#ffc801',
            strokeOpacity: 0.7,
            strokeWeight: 1
        });

        const fitMapToBounds = (map, bounds, markerCount) => {
            if (markerCount === 0) {
                map.setCenter(DASHBOARD_MAP_CENTER);
                map.setZoom(DASHBOARD_MAP_ZOOM);
                return;
            }
            if (markerCount === 1) {
                map.setCenter(bounds.getCenter());
                map.setZoom(11);
                return;
            }
            map.fitBounds(bounds, 40);
        };

        const initAndUpdate = () => {
            loadDashboardMapScript(apiKey)
                .then((google) => {
                    if (cancelled || runId !== geocodeRunIdRef.current) return;
                    if (!mapRef.current) {
                        mapRef.current = new google.maps.Map(container, {
                            center: DASHBOARD_MAP_CENTER,
                            zoom: DASHBOARD_MAP_ZOOM,
                            minZoom: 0,
                            maxZoom: 18,
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: false,
                            zoomControl: false,
                            clickableIcons: false,
                            styles: dashboardMapStyles
                        });
                    }
                    attachMapListeners(google);
                    const map = mapRef.current;
                    markersRef.current.forEach((m) => m.setMap(null));
                    markersRef.current = [];

                    const bounds = new google.maps.LatLngBounds();
                    let markerCount = 0;
                    const addMarkerAt = (lat, lng) => {
                        const position = { lat, lng };
                        const marker = new google.maps.Marker({
                            map,
                            position,
                            icon: pinIcon(google)
                        });
                        markersRef.current.push(marker);
                        bounds.extend(position);
                        markerCount += 1;
                    };

                    const pendingQueries = [];
                    for (const raw of items) {
                        const ll = getLatLngForDashboardItem(raw);
                        if (ll) addMarkerAt(ll.lat, ll.lng);
                        else {
                            const q = getGeocodeQueryForDashboardItem(raw);
                            if (q) pendingQueries.push(q);
                        }
                    }

                    fitMapToBounds(map, bounds, markerCount);

                    if (pendingQueries.length === 0) return;

                    const geocoder = new google.maps.Geocoder();
                    let idx = 0;
                    const step = () => {
                        if (cancelled || runId !== geocodeRunIdRef.current) return;
                        if (idx >= pendingQueries.length) {
                            fitMapToBounds(map, bounds, markerCount);
                            return;
                        }
                        const address = pendingQueries[idx++];
                        geocoder.geocode({ address }, (results, status) => {
                            if (cancelled || runId !== geocodeRunIdRef.current) return;
                            if (status === 'OK' && results?.[0]) {
                                const loc = results[0].geometry.location;
                                addMarkerAt(loc.lat(), loc.lng());
                                fitMapToBounds(map, bounds, markerCount);
                            }
                            setTimeout(step, 160);
                        });
                    };
                    step();
                })
                .catch(() => {});
        };

        requestAnimationFrame(() => requestAnimationFrame(initAndUpdate));

        return () => {
            cancelled = true;
            clearListeners();
        };
    }, [loading, userRole, isAgency, listData, agentProperties]);

    if (loading) return null;

    const whiteCard = { background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative' };
    const cardHeaderSmall = { fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px', textAlign: 'center' };
    const mapContainerLocal = { flex: 1, position: 'relative', minHeight: 160, height: 160, background: '#f8fafc', borderRadius: '8px', overflow: 'hidden' };

    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
        return (
            <div style={{ ...whiteCard, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <div style={cardHeaderSmall}>ACTIVE PROPERTIES BY REGION</div>
                <div
                    style={{
                        ...mapContainerLocal,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontSize: '12px',
                        textAlign: 'center',
                        padding: '12px'
                    }}
                >
                    Map needs a Google Maps API key (REACT_APP_GOOGLE_MAPS_API_KEY).
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...whiteCard, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={cardHeaderSmall}>ACTIVE PROPERTIES BY REGION</div>
            <div style={mapContainerLocal}>
                <div ref={mapContainerRef} className="dashboard-map-clean" style={{ position: 'absolute', inset: 0, minHeight: 160, minWidth: 100 }} />
            </div>
        </div>
    );
}

const Dashboard = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user?._id;
    const userRole = user?.role;
    const navigate = useNavigate();
    const location = useLocation();
    const previewAgentParam = useMemo(() => {
        try {
            const p = new URLSearchParams(location.search).get('previewAgent');
            if (!p || !/^[a-f0-9]{24}$/i.test(p)) return null;
            return p;
        } catch (_) {
            return null;
        }
    }, [location.search]);
    const dashboardFetchUserId = (userRole?.toLowerCase() === 'agency' && previewAgentParam) ? previewAgentParam : userId;
    const isAgencyAgentPreview = userRole?.toLowerCase() === 'agency' && !!previewAgentParam;
    const { convertToPreferredCurrency, formatAssetValueCompact, currency: preferredCurrency } = usePreferences();

    // Strip cache-bust param after login/register redirect so URL stays clean
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.has('r')) {
            params.delete('r');
            const clean = params.toString() ? '?' + params.toString() : '';
            window.history.replaceState({}, '', window.location.pathname + clean);
        }
    }, []);
    const [data, setData] = useState({ 
        stats: {}, 
        listData: [], 
        crmLeads: [],
        vaultCount: 0, 
        newsFeeds: [],
        marketTrends: []
    });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [agentProperties, setAgentProperties] = useState([]);
    const [showAddAgentModal, setShowAddAgentModal] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branches, setBranches] = useState([]);
    const [branchForm, setBranchForm] = useState({ name: '', address: '' });
    const [newAgentData, setNewAgentData] = useState({ firstName: '', lastName: '', email: '', branchId: '' });
    const [selectedLead, setSelectedLead] = useState(null);
    const [editingLead, setEditingLead] = useState(null);
    const [dashLeadSearch, setDashLeadSearch] = useState('');
    const [dashLeadTypeFilter, setDashLeadTypeFilter] = useState('');
    const [developments, setDevelopments] = useState([]);
    /** When an agency opens ?previewAgent=, holds the agent user shape for rendering the agent dashboard (read-only). */
    const [previewAgentDisplay, setPreviewAgentDisplay] = useState(null);
    const devScrollRef = useRef(null);
    const agentDevScrollRef = useRef(null);
    const [topAgentsSortBy, setTopAgentsSortBy] = useState('revenue'); // 'revenue' | 'percent'
    // Deals from /api/agency/sales-deals — drives the Commission Probability Pipeline tile
    const [salesDeals, setSalesDeals] = useState([]);
    const [selectedNews, setSelectedNews] = useState(null);
    const [savedNews, setSavedNews] = useState(() => {
        try {
            const key = userId ? `ipm_saved_news_${userId}` : 'ipm_saved_news';
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (_) { return []; }
    });
    const isMobile = useIsMobile();

    const persistSavedNews = useCallback((list) => {
        const key = userId ? `ipm_saved_news_${userId}` : 'ipm_saved_news';
        try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) {}
    }, [userId]);

    const newsId = (item) => item._id || item.id || `${(item.title || '')}|${(item.date || '')}`;
    const isNewsSaved = (item) => savedNews.some((n) => newsId(n) === newsId(item));
    const toggleSaveNews = (item) => {
        const id = newsId(item);
        const exists = savedNews.some((n) => newsId(n) === id);
        const next = exists ? savedNews.filter((n) => newsId(n) !== id) : [...savedNews, { ...item, _id: item._id || id }];
        setSavedNews(next);
        persistSavedNews(next);
    };

    useEffect(() => {
        if (!userId) return;
        try {
            const raw = localStorage.getItem(`ipm_saved_news_${userId}`);
            setSavedNews(raw ? JSON.parse(raw) : []);
        } catch (_) {}
    }, [userId]);

    const applyDashboardData = useCallback((resData) => {
        const agentStats = resData.agentStats || resData.stats || {};
        setData({
            stats: resData.stats || {},
            listData: resData.portfolio || resData.data || [],
            crmLeads: agentStats.crmLeads || [],
            vaultCount: resData.vaultCount || 0,
            newsFeeds: (resData.newsFeeds && resData.newsFeeds.length > 0) ? resData.newsFeeds : DEFAULT_NEWS_FEEDS,
            marketTrends: (resData.marketTrends && resData.marketTrends.length > 0) ? resData.marketTrends : DEFAULT_MARKET_TRENDS,
            sales: resData.sales || [],
            monthlyRevenueTarget: resData.monthlyRevenueTarget,
            combinedMonthlyTarget: resData.combinedMonthlyTarget,
            combinedRevenueThisMonth: resData.combinedRevenueThisMonth,
            agentTier: resData.agentTier,
            agentScore: resData.agentScore
        });
        if (resData.branches) setBranches(resData.branches);
        setAgentProperties(resData.agentProperties || []);
    }, []);

    const fetchDashboardData = useCallback(async (skipCache = false) => {
        if (!dashboardFetchUserId) return;
        const isAgency = userRole?.toLowerCase() === 'agency';
        const isPreview = isAgencyAgentPreview && dashboardFetchUserId === previewAgentParam;
        const cacheKey = isPreview ? null : dashboardFetchUserId;
        if (!skipCache && !isAgency && !isPreview && cacheKey) {
            const cached = getDashboardCache(cacheKey);
            if (cached) {
                applyDashboardData(cached);
                setLoading(false);
                if (takeDashboardInvalidated() === String(cacheKey)) {
                    api.get(`/api/users/${cacheKey}?type=dashboard`)
                        .then((res) => {
                            setDashboardCache(cacheKey, res.data);
                            applyDashboardData(res.data);
                        })
                        .catch((err) => console.error("Dashboard background refresh:", err));
                }
                return;
            }
        }
        try {
            if (dashboardFetchUserId !== userId) setLoading(true);
            const res = await api.get(`/api/users/${dashboardFetchUserId}?type=dashboard`);
            if (isPreview) {
                const r = (res.data.role || 'agency_agent').toLowerCase();
                setPreviewAgentDisplay({
                    _id: dashboardFetchUserId,
                    name: res.data.name || 'Agent',
                    role: r === 'independent_agent' ? 'independent_agent' : 'agency_agent',
                    agencyName: res.data.agencyName,
                    branchName: res.data.branchName
                });
            } else {
                setPreviewAgentDisplay(null);
            }
            if (cacheKey) setDashboardCache(cacheKey, res.data);
            applyDashboardData(res.data);
            // Mirror freshly-computed agent tier/score onto the cached
            // localStorage user so the Sidebar's "Tier" + "IPM Score" pills
            // update without a full re-login. Skips agent-preview mode where
            // the logged-in user isn't the one being viewed.
            if (!isPreview && (res.data?.agentTier != null || res.data?.agentScore != null)) {
                try {
                    const stored = JSON.parse(localStorage.getItem('user') || 'null');
                    if (stored && String(stored._id) === String(dashboardFetchUserId)) {
                        const next = {
                            ...stored,
                            ...(res.data.agentTier != null ? { agentTier: res.data.agentTier } : {}),
                            ...(res.data.agentScore != null ? { agentScore: res.data.agentScore } : {}),
                            ...(res.data.agencyName ? { agencyName: res.data.agencyName } : {}),
                            ...(res.data.branchName ? { branchName: res.data.branchName } : {}),
                        };
                        localStorage.setItem('user', JSON.stringify(next));
                    }
                } catch (_) {}
            }
            setLoading(false);
            const role = userRole?.toLowerCase();
            if (isPreview) {
                api.get(`/api/developments?agentId=${encodeURIComponent(dashboardFetchUserId)}`)
                    .then((r) => { if (r.data && Array.isArray(r.data)) setDevelopments(r.data); })
                    .catch(() => setDevelopments([]));
            } else if (role === 'agency') {
                api.get(`/api/developments?agencyId=${encodeURIComponent(userId)}`)
                    .then((r) => { if (r.data && Array.isArray(r.data)) setDevelopments(r.data); })
                    .catch(() => setDevelopments([]));
            } else if (role === 'agency_agent' || role === 'independent_agent' || role === 'agent') {
                api.get(`/api/developments?agentId=${encodeURIComponent(userId)}`)
                    .then((r) => { if (r.data && Array.isArray(r.data)) setDevelopments(r.data); })
                    .catch(() => setDevelopments([]));
            }
        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
            if (isPreview && (err.response?.status === 403 || err.response?.status === 404)) {
                setPreviewAgentDisplay(null);
                navigate('/dashboard', { replace: true });
            }
            setLoading(false);
        }
    }, [dashboardFetchUserId, userId, userRole, applyDashboardData, isAgencyAgentPreview, previewAgentParam, navigate]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Fetch sales deals for the Commission Probability Pipeline tile.
    // Cache-first like the Sales page so re-entries are instant. Runs for
    // agencies and any agent role — the API scopes deals to the caller's
    // listings automatically, so each user only ever sees their own.
    useEffect(() => {
        const r = userRole?.toLowerCase();
        const canSeeDeals = r === 'agency' || r === 'agency_agent' || r === 'independent_agent' || r === 'agent';
        if (!canSeeDeals || !userId) return;
        const cached = getSalesCache(userId);
        if (cached?.deals) setSalesDeals(cached.deals);
        const wasInvalidated = takeSalesInvalidated();
        if (cached && !wasInvalidated) return; // hydrated, no need to refetch right away
        api.get('/api/agency/sales-deals')
            .then((res) => {
                const list = Array.isArray(res.data?.deals) ? res.data.deals : [];
                setSalesDeals(list);
                setSalesCache(userId, { ...(getSalesCache(userId) || {}), deals: list });
            })
            .catch((err) => console.warn('Sales deals fetch failed:', err?.message || err));
    }, [userId, userRole]);

    useEffect(() => {
        if (userRole?.toLowerCase() === 'agency' && !previewAgentParam) setPreviewAgentDisplay(null);
    }, [userRole, previewAgentParam]);

    useEffect(() => {
        const onFocus = () => {
            if (takeDashboardInvalidated() === String(userId)) fetchDashboardData(true);
        };
        const onStorage = (e) => {
            if (e.key === DASHBOARD_INVALIDATED_KEY && e.newValue === String(userId)) {
                takeDashboardInvalidated();
                fetchDashboardData(true);
            }
        };
        window.addEventListener('focus', onFocus);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('storage', onStorage);
        };
    }, [userId, fetchDashboardData]);

    const role = user?.role?.toLowerCase();
    const isInDemoMode = !!getDemoState();
    if (role === 'enterprise') {
        return <EnterpriseDashboard />;
    }
    if (role === 'partner' && !isInDemoMode) {
        return <Navigate to="/my-ads" replace />;
    }
    if (role === 'partner' && isInDemoMode) {
        const pt = (user?.partnerType || '').toLowerCase();
        if (pt === 'conveyancer') return <Navigate to="/conveyancer" replace />;
        if (pt === 'bond_originator') return <Navigate to="/bond-originator-dashboard" replace />;
        return <Navigate to="/partner-dashboard" replace />;
    }
    if (role === 'tenant') {
        return <Navigate to="/saved" replace />;
    }
    // Agents: only redirect to /agent-dashboard when on /dashboard; when already on /agent-dashboard render this same Dashboard (agent view)
    if (role === 'agent' || role === 'independent_agent' || role === 'agency_agent') {
        if (location.pathname === '/dashboard') return <Navigate to="/agent-dashboard" replace />;
    }
    if (role === 'buyer' || role === 'seller' || role === 'investor') {
        return <DashboardLegacy />;
    }
    if (role === 'admin') {
        return (
            <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
                <Sidebar />
                <main className="dashboard-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', padding: isMobile ? '16px' : '24px 40px', background: '#f1f5f9', fontFamily: 'sans-serif' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h1 style={{ margin: 0, color: '#0f172a', fontSize: '24px' }}>Admin · Dashboard</h1>
                        <button type="button" onClick={() => navigate('/admin/demo')} style={{ background: '#10575c', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-eye" style={{ fontSize: '11px' }} /> Demo Dashboards
                        </button>
                    </div>
                    <AdminDashboardLists />
                </main>
            </div>
        );
    }

    if (loading) return (
        <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 16px' : '40px' }}>
                <LogoLoading message="Loading dashboard..." style={{ minHeight: '60vh' }} />
            </main>
        </div>
    );

    // Helper component for Coming Soon overlay (Agency)
    const ComingSoonOverlay = ({ children, message }) => (
        <div style={{ position: 'relative' }}>
            <div style={{ opacity: 0.3, pointerEvents: 'none' }}>
                {children}
            </div>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(1px)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '16px',
                pointerEvents: 'auto'
            }}>
                <div style={{
                    background: 'white',
                    padding: '30px 40px',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    maxWidth: '400px',
                    textAlign: 'center',
                    border: '2px solid #11575C'
                }}>
                    <i className="fas fa-clock" style={{ fontSize: '36px', color: '#11575C', marginBottom: '15px' }}></i>
                    <h3 style={{ color: '#11575C', fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>Coming Soon</h3>
                    <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.5' }}>{message || 'This feature is coming soon'}</p>
                </div>
            </div>
        </div>
    );

    const handleAddBranch = async () => {
        if (!branchForm.name.trim()) return;
        try {
            const res = await api.put(`/api/users/${userId}`, {
                action: 'add-branch',
                name: branchForm.name.trim(),
                address: branchForm.address.trim()
            });
            if (res.data.success) {
                invalidateDashboardCache(userId);
                setBranches(res.data.branches || []);
                setNewAgentData(prev => ({ ...prev, branchId: res.data.branches[res.data.branches.length - 1]?._id || '' }));
                setBranchForm({ name: '', address: '' });
                setShowBranchModal(false);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Handle Add Agent (optimistic: show agent immediately, send invite in background)
    const handleAddAgent = () => {
        if (!newAgentData.firstName?.trim() || !newAgentData.lastName?.trim() || !newAgentData.email) {
            alert('Name, Surname and Email are required');
            return;
        }
        if (!newAgentData.branchId) {
            alert('Please select or create a branch first');
            return;
        }
        const firstName = newAgentData.firstName.trim();
        const lastName = newAgentData.lastName.trim();
        const email = newAgentData.email;
        const branchId = newAgentData.branchId;
        const isAgency = branchId === '__agency__';
        const branch = isAgency ? null : branches.find((b) => String(b._id) === String(branchId));
        const branchName = isAgency ? (user?.name || 'Agency') : (branch ? branch.name : '');
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || email;
        const optimisticAgent = {
            name: fullName,
            email: email.toLowerCase(),
            branch: branchName,
            branchId: isAgency ? String(user._id) : String(branchId),
            status: 'invited',
            totalSales: 0,
            percentOfTarget: null
        };
        setData((prev) => ({
            ...prev,
            stats: {
                ...prev.stats,
                topAgents: [...(prev.stats?.topAgents || []), optimisticAgent]
            }
        }));
        setShowAddAgentModal(false);
        setNewAgentData({ firstName: '', lastName: '', email: '', branchId: '' });
        alert('Agent added. They\'ll receive an email with a link to complete registration.');

        api.put(`/api/users/${userId}`, {
            action: 'add-agent',
            agentData: { firstName, lastName, email, branchId }
        })
            .then((res) => {
                if (res.data?.success) {
                    invalidateDashboardCache(userId);
                    return api.get(`/api/users/${userId}?type=dashboard`);
                }
            })
            .then((dashboardRes) => {
                if (dashboardRes?.data) {
                    setDashboardCache(userId, dashboardRes.data);
                const da = dashboardRes.data.agentStats || dashboardRes.data.stats || {};
                    if (dashboardRes.data.branches) setBranches(dashboardRes.data.branches);
                    setAgentProperties(dashboardRes.data.agentProperties || []);
                    setData((prev) => ({
                    ...prev,
                    stats: dashboardRes.data.stats || {},
                    listData: dashboardRes.data.data || dashboardRes.data.portfolio || [],
                    crmLeads: da.crmLeads || [],
                    vaultCount: dashboardRes.data.vaultCount ?? prev.vaultCount,
                    newsFeeds: dashboardRes.data.newsFeeds || [],
                    marketTrends: dashboardRes.data.marketTrends || []
                }));
            }
            })
            .catch((err) => {
            console.error('Error adding agent:', err);
                setData((prev) => ({
                    ...prev,
                    stats: {
                        ...prev.stats,
                        topAgents: (prev.stats?.topAgents || []).filter((a) => (a.email || '').toLowerCase() !== email.toLowerCase())
                    }
                }));
                alert('Failed to send invite: ' + (err.response?.data?.message || err.message));
            });
    };

    // --- RENDER AGENCY VIEW ---
    const renderAgencyView = () => (
        <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, fontFamily: "'Poppins', sans-serif", position: 'relative' }}>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: isMobile ? '16px' : '24px 40px 24px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '700' }}>Good day, {user.name}!</h2>
                    <p style={{ color: '#888' }}>Agency View &bull; Welcome back</p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <QuickActionsButton
                        userId={userId}
                        onAddAgent={() => setShowAddAgentModal(true)}
                    />
                </div>
            </header>

            {/* Row 1: Active Properties, Active Leads, Total Revenue Generated */}
            {(() => {
                const sales = data.sales || [];
                const totalRevenue = sales.reduce((sum, s) => sum + convertToPreferredCurrency(s.salePrice || 0, s.currency), 0);
                const combinedTarget = data.combinedMonthlyTarget != null ? Number(data.combinedMonthlyTarget) : 0;
                const combinedThisMonth = data.combinedRevenueThisMonth != null ? Number(data.combinedRevenueThisMonth) : 0;
                const percentTarget = combinedTarget > 0 ? Math.round((combinedThisMonth / combinedTarget) * 100) : null;
                const revenueSubtext = percentTarget != null ? `${percentTarget}% of monthly target` : 'Set targets in Agents';
                return (
            <div className="dashboard-stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <StatBoxCentered label="ACTIVE PROPERTIES" value={data.stats.totalListings ?? agentProperties.length ?? 0} subtext="" />
                <StatBoxCentered label="ACTIVE LEADS" value={data.stats.activeLeads ?? 0} subtext="" />
                <StatBoxCentered label={`TOTAL REVENUE GENERATED (${preferredCurrency})`} value={formatAssetValueCompact(totalRevenue)} subtext={revenueSubtext} />
            </div>
                );
            })()}

            {/* Row 2: Properties by region (map), Top Agents (Name, Branch), Branch Ranking — same column widths as row 1 */}
            <div className="dashboard-stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* ACTIVE PROPERTIES BY REGION — pins from all agents' properties */}
                {loading ? (
                <div style={cardStyle}>
                        <h4 style={cardTitle}>ACTIVE PROPERTIES BY REGION</h4>
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading map…</div>
                    </div>
                ) : (
                    <DashboardMapCard loading={loading} userRole="agency" listData={EMPTY_LIST_STABLE} agentProperties={agentProperties} />
                )}
                {/* TOP AGENTS — table: Name | Properties | Sales | % target */}
                <div style={cardStyle}>
                    <h4 style={cardTitle}>TOP AGENTS</h4>
                    {(data.stats.topAgents && data.stats.topAgents.length > 0) ? (
                        <>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Sort by:</span>
                                <button type="button" onClick={() => setTopAgentsSortBy('revenue')} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: topAgentsSortBy === 'revenue' ? '1px solid #11575C' : '1px solid #e2e8f0', background: topAgentsSortBy === 'revenue' ? '#f0fdf4' : 'white', color: topAgentsSortBy === 'revenue' ? '#11575C' : '#64748b', cursor: 'pointer', fontWeight: '600' }}>Sold value</button>
                                <button type="button" onClick={() => setTopAgentsSortBy('percent')} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', border: topAgentsSortBy === 'percent' ? '1px solid #11575C' : '1px solid #e2e8f0', background: topAgentsSortBy === 'percent' ? '#f0fdf4' : 'white', color: topAgentsSortBy === 'percent' ? '#11575C' : '#64748b', cursor: 'pointer', fontWeight: '600' }}>% of target</button>
                            </div>
                            <div style={{ marginTop: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 56px', gap: '10px 12px', alignItems: 'center', padding: '8px 0', borderBottom: '2px solid #e2e8f0', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    <span>Name</span>
                                    <span style={{ textAlign: 'right' }}>Properties</span>
                                    <span style={{ textAlign: 'right' }}>Sales</span>
                                    <span style={{ textAlign: 'right' }}>% target</span>
                                </div>
                                {[...(data.stats.topAgents || [])]
                                    .sort((a, b) => {
                                        if (topAgentsSortBy === 'revenue') return (b.totalSales || 0) - (a.totalSales || 0);
                                        const pa = a.percentOfTarget != null ? a.percentOfTarget : -1;
                                        const pb = b.percentOfTarget != null ? b.percentOfTarget : -1;
                                        return pb - pa;
                                    })
                                    .map((agent, i) => {
                                        const aid = agent._id || agent.id;
                                        return (
                                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 56px', gap: '10px 12px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                                    <div>
                                                <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{agent.name}</span>
                                                <span style={{ fontSize: '11px', color: '#888', marginLeft: '6px' }}>{sanitizeAgencyBranchDisplay(agent.branch) || sanitizeAgencyBranchDisplay(agent.branchName) || '—'}</span>
                                                <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '6px', marginLeft: '6px', background: (agent.status === 'active') ? '#dcfce7' : '#fef3c7', color: (agent.status === 'active') ? '#166534' : '#b45309' }}>
                                                    {(agent.status === 'active') ? 'Active' : 'Pending'}
                                                </span>
                                                {aid ? (
                                                    <Link
                                                        to={`/dashboard?previewAgent=${encodeURIComponent(aid)}`}
                                                        style={{ fontSize: '11px', color: '#11575C', marginLeft: '8px', fontWeight: '600', whiteSpace: 'nowrap' }}
                                                    >
                                                        View dashboard
                                                    </Link>
                                                ) : null}
                                    </div>
                                            <div style={{ textAlign: 'right', fontWeight: '600', color: '#11575C' }}>{agentProperties.filter(p => String(p.agentId) === String(agent._id || agent.id)).length}</div>
                                            <div style={{ textAlign: 'right', fontWeight: '600', color: '#11575C', fontSize: '12px' }}>{formatAssetValueCompact(convertToPreferredCurrency(agent.totalSales || 0, 'USD'))}</div>
                                            <div style={{ textAlign: 'right', fontWeight: '600', fontSize: '12px', color: agent.percentOfTarget != null && agent.percentOfTarget >= 100 ? '#15803d' : '#b45309' }}>
                                                {agent.percentOfTarget != null ? `${agent.percentOfTarget}%` : '—'}
                                        </div>
                                    </div>
                                        );
                                    })}
                                </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#888' }}>
                            <i className="fas fa-users" style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.3 }}></i>
                            <p style={{ fontSize: '13px' }}>No agents yet. Click &quot;Add Agent&quot; to invite your first agent.</p>
                            </div>
                        )}
                    </div>
                {/* COMMISSION PROBABILITY PIPELINE — replaces Branch Ranking. Shows weighted internal commission across active deals. */}
                <CommissionPipelineTile
                    deals={salesDeals}
                    formatAssetValueCompact={formatAssetValueCompact}
                    navigate={navigate}
                />
            </div>

            {/* Row 3: DEVELOPMENT + MARKET SHARE | SALES BY REGION + NEWS FEEDS | MARKET TRENDS (full height) */}
            <div className="dashboard-grid-3col" style={{ display: 'grid', gridTemplateColumns: '0.9fr 0.9fr 0.9fr', gap: '24px', marginBottom: '24px', alignItems: 'stretch', maxHeight: 'min(72vh, 640px)', minHeight: 0 }}>
                {/* Column 1: Development Management (half height, centered) + Market Share */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0 }}>
                    <div style={cardStyle}>
                        <h4 style={cardTitle}>DEVELOPMENT MANAGEMENT</h4>
                        <div style={{ position: 'relative', marginTop: '15px', height: '110px' }}>
                            <button
                                type="button"
                                onClick={() => { if (devScrollRef.current) devScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' }); }}
                                style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 2, width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#ffc801', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                                aria-label="Scroll left"
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            <div
                                ref={devScrollRef}
                                style={{ display: 'flex', gap: '12px', overflowX: 'auto', overflowY: 'hidden', scrollBehavior: 'smooth', height: '100%', padding: '8px 40px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', alignItems: 'flex-start', justifyContent: 'center' }}
                            >
                                {developments.length === 0 ? (
                                    <div style={{ padding: '12px', color: '#888', textAlign: 'center', minWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                        <i className="fas fa-building" style={{ fontSize: '24px', marginBottom: '4px', opacity: 0.3 }}></i>
                                        <p style={{ fontSize: '12px' }}>No developments from your agents yet.</p>
                        </div>
                                ) : (
                                    developments.map((dev) => {
                                        const isProperty = dev.source === 'property';
                                        const linkTo = isProperty ? `/property/${dev._id}` : { pathname: '/new-developments', state: { openDevelopmentId: dev._id } };
                                        return (
                                            <Link
                                                key={isProperty ? `p-${dev._id}` : `d-${dev._id}`}
                                                to={linkTo}
                                                style={{ flexShrink: 0, width: '160px', textAlign: 'center', textDecoration: 'none', color: 'inherit', display: 'block', cursor: 'pointer' }}
                                            >
                                                <div style={{ width: '160px', height: '85px', borderRadius: '10px', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {dev.imageUrl ? <img src={dev.imageUrl} alt={dev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fas fa-city" style={{ fontSize: 32, color: '#94a3b8' }} />}
                    </div>
                                                <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: '600', color: '#1a1a1a', lineHeight: 1.25 }}>{dev.title}</div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => { if (devScrollRef.current) devScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' }); }}
                                style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 2, width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#ffc801', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                                aria-label="Scroll right"
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                    </div>
                    </div>
                    <div style={cardStyle}>
                        <h4 style={cardTitle}>MARKET SHARE</h4>
                        {(() => {
                            const agencyName = sanitizeAgencyBranchDisplay(user?.name || user?.agencyName) || 'Your agency';
                            const totalListings = data.stats?.totalListings ?? agentProperties?.length ?? 0;
                            const agencySharePercent = totalListings > 0 ? Math.min(80, Math.max(8, Math.round(12 + totalListings * 2))) : 28;
                            const restPercent = 100 - agencySharePercent;
                            return (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ display: 'flex', height: '36px', borderRadius: '10px', overflow: 'hidden', background: '#e2e8f0', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
                                        <div style={{ width: `${agencySharePercent}%`, background: 'linear-gradient(135deg, #11575C 0%, #11575C 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '700', transition: 'width 0.3s ease' }} title={`${agencyName}: ${agencySharePercent}%`}>
                                            {agencySharePercent >= 18 ? `${agencySharePercent}%` : ''}
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
                                            {restPercent}%
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#11575C' }} />
                                            <span style={{ color: '#1e293b', fontWeight: '600' }}>{agencyName}</span>
                                            <span style={{ color: '#64748b' }}>{agencySharePercent}%</span>
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#e2e8f0' }} />
                                            <span style={{ color: '#64748b', fontWeight: '500' }}>Rest of market</span>
                                            <span style={{ color: '#94a3b8' }}>{restPercent}%</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
                {/* Column 2: Sales by Area (suburb-grouped, same height as dev tile) + News Feeds */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0 }}>
                    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <h4 style={cardTitle}>SALES BY AREA</h4>
                        <div style={{ marginTop: '10px', height: '110px', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px', gap: '10px 12px', alignItems: 'center', padding: '8px 0', borderBottom: '2px solid #e2e8f0', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                <span>Suburb</span>
                                <span style={{ textAlign: 'right' }}>Sold</span>
                                <span style={{ textAlign: 'right' }}>Total</span>
                        </div>
                            {(() => {
                                const soldBySuburb = {};
                                (agentProperties || []).forEach((p) => {
                                    if ((p.status || '') !== 'Sold') return;
                                    // Prefer the structured suburb; fall back to the second-to-last
                                    // segment of a comma-separated location string (typical pattern:
                                    // "Street, Suburb, City, Country") so seeded listings still bucket.
                                    const loc = p.locationDetails || {};
                                    let suburb = loc.suburb || loc.area || loc.neighbourhood;
                                    if (!suburb && p.location) {
                                        const parts = String(p.location).split(',').map((s) => s.trim()).filter(Boolean);
                                        if (parts.length >= 2) suburb = parts[parts.length - 2];
                                    }
                                    const key = (suburb && String(suburb).trim()) || 'Unknown';
                                    if (!soldBySuburb[key]) soldBySuburb[key] = { count: 0, total: 0 };
                                    soldBySuburb[key].count += 1;
                                    soldBySuburb[key].total += convertToPreferredCurrency(p.salePrice || p.pricing?.askingPrice || 0, (p.pricing && p.pricing.currency) || 'USD');
                                });
                                const rows = Object.entries(soldBySuburb).map(([suburb, v]) => ({ suburb, count: v.count, total: v.total })).sort((a, b) => (b.total || 0) - (a.total || 0));
                                if (rows.length === 0) {
                                    return (
                                        <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '13px' }}>
                                            No sold listings yet.
                    </div>
                                    );
                                }
                                return rows.map((row, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px', gap: '10px 12px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                                        <div style={{ fontWeight: '600', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.suburb}</div>
                                        <div style={{ textAlign: 'right', fontWeight: '600', color: '#475569', fontSize: '12px' }}>{row.count}</div>
                                        <div style={{ textAlign: 'right', fontWeight: '600', color: '#11575C', fontSize: '12px' }}>{formatAssetValueCompact(row.total)}</div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                    <div style={{ ...cardStyleSmall, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={cardTitle}>News Feeds</h4>
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            {data.newsFeeds && data.newsFeeds.length > 0 ? (
                                data.newsFeeds.map((news, i) => {
                                    const url = news.sourceUrl || news.link || news.url;
                                    const hasLink = url && isNewsOrPropertySourceUrl(url);
                                    const saved = isNewsSaved(news);
                                    return (
                                        <div
                                            key={newsId(news) || i}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setSelectedNews(news)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedNews(news); } }}
                                            style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #eee', alignItems: 'flex-start', cursor: 'pointer', borderRadius: 8, transition: 'background 0.15s' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {news.image && (
                                                <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9' }}>
                                                    <img src={news.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            )}
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: brand.text, marginBottom: '4px' }}>{news.title}</div>
                                                {(news.aiSummary || news.desc) && (
                                                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: brand.muted, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{news.aiSummary || news.desc}</p>
                                                )}
                                                {hasLink ? (
                                                    <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: '11px', color: brand.primary, wordBreak: 'break-all' }}>Source: {url}</a>
                                                ) : news._id ? (
                                                    <Link to={`/news/${news._id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: '11px', color: brand.primary }}>View article</Link>
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: brand.muted }}>No link</span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); toggleSaveNews(news); }}
                                                aria-label={saved ? 'Remove from My IPM News' : 'Save to My IPM News'}
                                                style={{ flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: saved ? '#dc2626' : '#94a3b8', fontSize: 14 }}
                                            >
                                                <i className={saved ? 'fas fa-heart' : 'far fa-heart'} />
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ fontSize: '12px', color: brand.muted, padding: '12px 0', textAlign: 'center' }}>No news for your markets yet.</div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Column 3: Market Trends — full height, bottom aligns with News Feeds */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
                    <div style={{ ...cardStyleSmall, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h4 style={cardTitle}>Market Trends</h4>
                        <p style={{ fontSize: '9px', color: brand.muted, margin: '0 0 8px', textAlign: 'center', lineHeight: 1.3, flexShrink: 0 }}>
                            {data.marketTrends?.some((t) => t.monthlyData?.length > 0)
                                ? 'Official index values (raw). YoY from data. Do not compare numbers across countries — each uses its own base. Source per region below.'
                                : 'Charts: 12‑month trend. Growth % is YoY.'}
                        </p>
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            {data.marketTrends && data.marketTrends.length > 0 ? (
                                data.marketTrends.map((trend, i) => (
                                    <TrendRow key={i} country={trend.country} status={trend.sentiment || trend.status} color={getStatusColor(trend.sentiment || trend.status) || trend.color} price={trend.yoyPercent != null && trend.yoyPercent !== '' ? trend.yoyPercent : trend.priceChange} monthlyData={trend.monthlyData} sourceText={trend.sourceText} interpretation={trend.interpretation} />
                                ))
                            ) : (
                                <div style={{ fontSize: '12px', color: brand.muted, padding: '12px 0', textAlign: 'center' }}>No trends for your markets yet. Add countries in portfolio or preferences to see trends here.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            </div>

            {/* ADD AGENT MODAL */}
            {showAddAgentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '30px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        <h2 style={{ margin: '0 0 20px 0', color: '#1f3a3d', fontSize: '20px', fontWeight: '700' }}>Add New Agent</h2>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Name *</label>
                            <input
                                type="text"
                                value={newAgentData.firstName}
                                onChange={(e) => setNewAgentData({...newAgentData, firstName: e.target.value})}
                                placeholder="First name"
                                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Surname *</label>
                            <input
                                type="text"
                                value={newAgentData.lastName}
                                onChange={(e) => setNewAgentData({...newAgentData, lastName: e.target.value})}
                                placeholder="Surname"
                                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Email Address *</label>
                            <input
                                type="email"
                                value={newAgentData.email}
                                onChange={(e) => setNewAgentData({...newAgentData, email: e.target.value})}
                                placeholder="agent@example.com"
                                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Branch *</label>
                                <select
                                value={newAgentData.branchId}
                                onChange={(e) => {
                                    if (e.target.value === '__add__') setShowBranchModal(true);
                                    else setNewAgentData({ ...newAgentData, branchId: e.target.value });
                                }}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                                >
                                <option value="">Select a branch</option>
                                <option value="__agency__">{user?.name || 'Agency'} (Agency)</option>
                                {branches.map((b) => (
                                    <option key={b._id} value={b._id}>{b.name}{b.address ? ` — ${b.address}` : ''}</option>
                                ))}
                                <option value="__add__">+ Add new branch</option>
                                </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowAddAgentModal(false);
                                    setNewAgentData({ firstName: '', lastName: '', email: '', branchId: '' });
                                }}
                                style={{
                                    padding: '10px 20px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    background: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#333'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddAgent}
                                disabled={!newAgentData.firstName?.trim() || !newAgentData.lastName?.trim() || !newAgentData.email || !newAgentData.branchId}
                                style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: (!newAgentData.firstName?.trim() || !newAgentData.lastName?.trim() || !newAgentData.email || !newAgentData.branchId) ? '#ccc' : '#11575C',
                                    cursor: (!newAgentData.firstName?.trim() || !newAgentData.lastName?.trim() || !newAgentData.email || !newAgentData.branchId) ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: 'white'
                                }}
                            >
                                Add Agent
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBranchModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }} onClick={() => setShowBranchModal(false)}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px 0', color: '#1f3a3d', fontSize: '18px' }}>Add New Branch</h2>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Branch Name *</label>
                            <input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dubai Hills Estate" style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }} />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Address</label>
                            <GooglePlacesInput
                                name="address"
                                value={branchForm.address}
                                onChange={e => setBranchForm(f => ({ ...f, address: e.target.value }))}
                                onPlaceSelected={(formatted) => setBranchForm(f => ({ ...f, address: formatted }))}
                                placeholder="Street, City, Country"
                                inputStyle={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowBranchModal(false)} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                            <button onClick={handleAddBranch} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: '#11575C', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Save Branch</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );

    // --- RENDER INVESTOR VIEW: agent gets new dashboard; buyer/investor/seller get original ---
    const renderInvestorView = (opts) => {
        const previewUser = opts && opts.previewUser;
        const viewUser = previewUser || user;
        const isAgentPreview = !!previewUser;
        const role = viewUser?.role?.toLowerCase();
        const isSeller = role === 'seller';
        const isBuyer = role === 'buyer';
        const isInvestor = role === 'investor';
        const isAgent = role === 'agent' || role === 'independent_agent' || role === 'agency_agent';
        const isSellerView = isSeller || isBuyer || isInvestor || isAgent;
        const overlayProps = { isSellerView, isInvestor: false, isAgent: false, comingSoonMessage: '' };

        const sharedHeader = (
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>Good day, {viewUser?.name?.split(' ')[0] || 'User'}!</h2>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <QuickActionsButton userId={userId} />
                </div>
            </header>
        );

        // --- AGENT DASHBOARD (independent_agent, agent, agency_agent) ---
        if (isAgent) {
            const isAgencyAgent = role === 'agency_agent';
            const agencyName = sanitizeAgencyBranchDisplay(viewUser?.agencyName);
            const branchName = sanitizeAgencyBranchDisplay(viewUser?.branchName);
            const agencyBanner = isAgencyAgent && (agencyName || branchName) ? (
                <div style={{ padding: '12px 16px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', color: '#11575C', fontWeight: '600' }}>
                    {agencyName && <span>{agencyName}</span>}
                    {agencyName && branchName && agencyName !== branchName && <span> — </span>}
                    {branchName && agencyName !== branchName && <span>{branchName}</span>}
                </div>
            ) : null;
            const agentScopeId = viewUser?._id;
            return (
            <>
                <main className="dashboard-main" style={{ padding: isMobile ? '16px' : '24px 40px', fontFamily: "'Poppins', sans-serif", position: 'relative', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {sharedHeader}
                    {isAgentPreview && (
                        <div
                            style={{
                                padding: '12px 16px',
                                background: '#fffbeb',
                                border: '1px solid #fcd34d',
                                borderRadius: '10px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                flexWrap: 'wrap'
                            }}
                        >
                            <span style={{ fontSize: '14px', color: '#92400e', fontWeight: '600' }}>
                                <i className="fas fa-eye" style={{ marginRight: '8px' }} aria-hidden />
                                Preview: {viewUser?.name || 'Agent'}&apos;s dashboard (read-only)
                            </span>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard', { replace: true })}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #b45309',
                                    background: 'white',
                                    color: '#92400e',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            >
                                Back to agency dashboard
                            </button>
                        </div>
                    )}
                    {agencyBanner}
                    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {(() => {
                            const sales = data.sales || [];
                            const totalRevenue = sales.reduce((sum, s) => sum + convertToPreferredCurrency(s.salePrice || 0, s.currency), 0);
                            const now = new Date();
                            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                            const thisMonthRevenue = sales
                                .filter((s) => s.saleDate && new Date(s.saleDate) >= thisMonthStart)
                                .reduce((sum, s) => sum + convertToPreferredCurrency(s.salePrice || 0, s.currency), 0);
                            const monthlyTarget = data.monthlyRevenueTarget != null ? Number(data.monthlyRevenueTarget) : 0;
                            const percentTarget = monthlyTarget > 0 ? Math.round((thisMonthRevenue / monthlyTarget) * 100) : null;
                            const revenueSubtext = percentTarget != null ? `${percentTarget}% of monthly target` : 'Set target in settings';
                            return (
                        <>
                            {(data.agentTier || data.agentScore != null) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                    {data.agentTier && (
                                        <span style={{
                                            fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                                            padding: '4px 12px', borderRadius: '8px',
                                            background: data.agentTier === 'platinum' ? '#e0e7ff' : data.agentTier === 'gold' ? '#fef3c7' : '#f1f5f9',
                                            color: data.agentTier === 'platinum' ? '#3730a3' : data.agentTier === 'gold' ? '#b45309' : '#64748b'
                                        }}>
                                            Tier: {data.agentTier}
                                        </span>
                                    )}
                                    {data.agentScore != null && <span style={{ fontSize: '13px', color: '#64748b' }}>Score: <strong style={{ color: '#11575C' }}>{data.agentScore}</strong></span>}
                                </div>
                            )}
                        <div className="dashboard-stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px', flexShrink: 0 }}>
                            <StatBoxCentered label="ACTIVE PROPERTIES" value={data.stats.totalListings ?? data.stats.totalProperties ?? (data.listData?.length || 0)} subtext="" />
                            <StatBoxCentered label="ACTIVE LEADS" value={data.stats.activeLeads ?? (data.crmLeads?.length || 0)} subtext="" />
                            <StatBoxCentered label={`TOTAL REVENUE GENERATED (${preferredCurrency})`} value={formatAssetValueCompact(totalRevenue)} subtext={revenueSubtext} />
                        </div>
                        </>
                            );
                        })()}
                        <div className="dashboard-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', flexShrink: 0, minHeight: 220 }}>
                            {loading ? (
                                <div style={{ ...whiteCard, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <div style={cardHeaderSmall}>ACTIVE PROPERTIES BY REGION</div>
                                    <div style={mapContainer} />
                                </div>
                            ) : (
                                <DashboardMapCard loading={loading} userRole={viewUser?.role} listData={data.listData} agentProperties={agentProperties} />
                            )}
                            {/* COMMISSION PROBABILITY PIPELINE — replaces the
                                old Active Properties counter so agents see a
                                forward-looking earnings view (deal value × %
                                probability of sale) instead of a raw count. */}
                            <CommissionPipelineTile
                                deals={salesDeals}
                                formatAssetValueCompact={formatAssetValueCompact}
                                navigate={navigate}
                            />
                        </div>
                        <div className="dashboard-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', flexShrink: 0, minHeight: 0 }}>
                            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: 340 }}>
                                <h4 style={{ ...cardTitle, margin: '0 0 10px 0', textAlign: 'left' }}>ACTIVE LEAD LIST</h4>
                                {/* Search + Type filter */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexShrink: 0 }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }} />
                                        <input
                                            type="text"
                                            placeholder="Search leads..."
                                            value={dashLeadSearch}
                                            onChange={(e) => setDashLeadSearch(e.target.value)}
                                            style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#f8f9fa', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                    <select
                                        value={dashLeadTypeFilter}
                                        onChange={(e) => setDashLeadTypeFilter(e.target.value)}
                                        style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#f8f9fa', color: '#1e293b', fontFamily: 'inherit', minWidth: 90 }}
                                    >
                                        <option value="">All</option>
                                        <option value="buyer">Buyers</option>
                                        <option value="seller">Sellers</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {(() => {
                                    let visibleLeads = data.crmLeads || [];
                                    const q = dashLeadSearch.trim().toLowerCase();
                                    if (q) visibleLeads = visibleLeads.filter(l => (l.name || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q) || (l.mobile || '').toLowerCase().includes(q));
                                    if (dashLeadTypeFilter) visibleLeads = visibleLeads.filter(l => (l.leadType || 'buyer') === dashLeadTypeFilter);
                                    return visibleLeads.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>{(data.crmLeads || []).length === 0 ? 'No leads yet. Add leads in My CRM.' : 'No matching leads.'}</div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.9fr 1fr', gap: '12px', padding: '8px 0', borderBottom: '2px solid #e2e8f0', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                                                <span>Name</span>
                                                <span>Source</span>
                                                <span>Date Added</span>
                                                <span>Linked Properties</span>
                                            </div>
                                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                                {visibleLeads.map((lead, i) => {
                                                    const source = lead.source || 'Inquiry';
                                                    const dateAdded = lead.dateAdded || lead.lastContact || '—';
                                                    const linked = (lead.linkedProperties && lead.linkedProperties.length > 0) ? lead.linkedProperties.map(lp => lp.title).join(', ') : (lead.propertyOfInterest || '—');
                                                    const isSeller = (lead.leadType || '').toLowerCase() === 'seller';
                                                    return (
                                                        <div
                                                            key={i}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setSelectedLead(lead)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedLead(lead); } }}
                                                            style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.9fr 1fr', gap: '12px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px', cursor: 'pointer', color: '#334155' }}
                                                        >
                                                            <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                {lead.name || '—'}
                                                                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: isSeller ? 'rgba(212,160,23,0.12)' : 'rgba(17,87,92,0.08)', color: isSeller ? '#d4a017' : '#11575C' }}>{isSeller ? 'S' : 'B'}</span>
                                                            </span>
                                                            <span style={{ color: '#64748b' }}>{source}</span>
                                                            <span style={{ color: '#64748b' }}>{dateAdded}</span>
                                                            <span style={{ color: '#11575C', fontSize: '12px' }}>{linked}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', height: 340 }}>
                                <h4 style={{ ...cardTitle, marginBottom: '12px', textAlign: 'left' }}>MY MANDATES</h4>
                                <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden', display: 'flex', flexWrap: 'nowrap', gap: '16px', alignContent: 'flex-start', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
                                {(data.listData || []).length === 0 ? (
                                    <div style={{ padding: '24px', color: '#94a3b8', fontSize: '14px' }}>No listings yet.</div>
                                ) : (
                                        (data.listData || []).map((item, i) => {
                                            const propId = String(item.details?._id || item._id);
                                            const propTitle = (item.propertyTitle || '').toLowerCase().trim();
                                            const propAddr = (item.details?.locationDetails?.streetAddress || item.details?.location || '').toLowerCase().trim();
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
                                            const sellerLead = (data.crmLeads || []).find(l => {
                                                const lt = (l.leadType || l.type || '').toLowerCase();
                                                if (lt !== 'seller') return false;
                                                if (l.linkedProperties && Array.isArray(l.linkedProperties) && l.linkedProperties.some(matchesLinkedProp)) return true;
                                                if (propTitle && l.propertyOfInterest && l.propertyOfInterest.toLowerCase().trim() === propTitle) return true;
                                                return false;
                                            });
                                            return (
                                                <Link
                                                    key={i}
                                                    to={propId ? `/property/${propId}` : '#'}
                                                    style={{ ...mandateCard, textDecoration: 'none', color: 'inherit', cursor: propId ? 'pointer' : 'default' }}
                                                >
                                                    <div style={mandateThumbWrap}>
                                                        {item.photo ? <img src={item.photo} alt="" style={mandateThumbImg} /> : null}
                                                    </div>
                                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#1f3a3d', marginTop: '6px', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.25, maxWidth: 160 }}>{item.propertyTitle || 'Untitled'}</div>
                                                    {sellerLead && (
                                                        <div
                                                            style={{ fontSize: 10, color: '#d4a017', fontWeight: 600, textAlign: 'center', marginTop: 2, cursor: 'pointer' }}
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedLead(sellerLead); }}
                                                        >
                                                            <i className="fas fa-user" style={{ fontSize: 8, marginRight: 3 }} />{sellerLead.name}
                                                        </div>
                                                    )}
                                                </Link>
                                            );
                                        })
                                )}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flexShrink: 0, marginBottom: '24px' }}>
                            <AgentCalendarTile />
                            <div style={cardStyle}>
                                <h4 style={{ ...cardTitle, marginBottom: 6 }}>MARKET INSIGHTS</h4>
                                <p style={{ fontSize: '9px', color: brand.muted, margin: '0 0 8px', textAlign: 'center', lineHeight: 1.3 }}>
                                    {data.marketTrends?.some((t) => t.monthlyData?.length > 0)
                                        ? 'Official index values (raw). YoY from data. Do not compare numbers across countries — each uses its own base. Source per region below.'
                                        : 'Charts: 12‑month trend. Growth % is YoY.'}
                                </p>
                                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                                    {data.marketTrends && data.marketTrends.length > 0 ? (
                                        data.marketTrends.map((trend, i) => (
                                            <TrendRow key={i} country={trend.country} status={trend.sentiment || trend.status} color={getStatusColor(trend.sentiment || trend.status) || trend.color} price={trend.yoyPercent != null && trend.yoyPercent !== '' ? trend.yoyPercent : trend.priceChange} monthlyData={trend.monthlyData} sourceText={trend.sourceText} interpretation={trend.interpretation} />
                                        ))
                                    ) : (
                                        <div style={{ fontSize: '12px', color: brand.muted, padding: '12px 0', textAlign: 'center' }}>No trends for your markets yet.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* DEVELOPMENT MANAGEMENT — scrollable cards for agents */}
                        <div style={{ ...cardStyle, flexShrink: 0, marginBottom: '24px' }}>
                            <h4 style={cardTitle}>DEVELOPMENT MANAGEMENT</h4>
                            <div style={{ position: 'relative', marginTop: '15px', height: '220px' }}>
                                <button
                                    type="button"
                                    onClick={() => { if (agentDevScrollRef.current) agentDevScrollRef.current.scrollBy({ left: -240, behavior: 'smooth' }); }}
                                    style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 2, width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#ffc801', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                                    aria-label="Scroll left"
                                >
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                <div
                                    ref={agentDevScrollRef}
                                    style={{ display: 'flex', gap: '16px', overflowX: 'auto', overflowY: 'hidden', scrollBehavior: 'smooth', height: '100%', padding: '8px 40px 8px 0', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', alignItems: 'flex-start' }}
                                >
                                    {developments.length === 0 ? (
                                        <div style={{ padding: '20px', color: '#888', textAlign: 'center', minWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <i className="fas fa-building" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.3 }}></i>
                                            <p style={{ fontSize: '13px' }}>No developments yet.</p>
                                        </div>
                                    ) : (
                                        developments.map((dev) => {
                                            const isProperty = dev.source === 'property';
                                            const linkTo = isProperty ? `/property/${dev._id}` : { pathname: '/new-developments', state: { openDevelopmentId: dev._id } };
                                            return (
                                                <Link
                                                    key={isProperty ? `p-${dev._id}` : `d-${dev._id}`}
                                                    to={linkTo}
                                                    style={{ flexShrink: 0, width: '200px', textAlign: 'center', textDecoration: 'none', color: 'inherit', display: 'block', cursor: 'pointer' }}
                                                >
                                                    <div style={{ width: '200px', height: '140px', borderRadius: '12px', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {dev.imageUrl ? <img src={dev.imageUrl} alt={dev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fas fa-city" style={{ fontSize: 48, color: '#94a3b8' }} />}
                                                    </div>
                                                    <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a', lineHeight: 1.3 }}>{dev.title}</div>
                                                </Link>
                                            );
                                        })
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { if (agentDevScrollRef.current) agentDevScrollRef.current.scrollBy({ left: 240, behavior: 'smooth' }); }}
                                    style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 2, width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#ffc801', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                                    aria-label="Scroll right"
                                >
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
                {selectedLead && (
                    <LeadDetailPopup
                        lead={selectedLead}
                        userId={isAgentPreview ? null : agentScopeId}
                        user={viewUser}
                        agents={data?.stats?.topAgents}
                        onAddAgent={isAgentPreview ? undefined : () => setShowAddAgentModal(true)}
                        onRefresh={(updatedLead) => {
                            setSelectedLead(updatedLead);
                            const list = [...(data.crmLeads || [])];
                            const idx = list.findIndex((l) => (l.id || l._id) === (selectedLead.id || selectedLead._id) || (l.email === selectedLead.email && l.name === selectedLead.name));
                            if (idx >= 0) {
                                list[idx] = updatedLead;
                                setData((prev) => ({ ...prev, crmLeads: list }));
                            }
                        }}
                        onClose={() => setSelectedLead(null)}
                        onEdit={isAgentPreview ? undefined : (lead) => {
                            const list = data.crmLeads || [];
                            const idx = list.findIndex((l) => l.email === lead.email && l.name === lead.name && (l.lastContact === lead.lastContact || l.dateAdded === lead.dateAdded));
                            if (idx >= 0) setEditingLead({ lead, index: idx });
                            setSelectedLead(null);
                        }}
                        onDelete={isAgentPreview ? undefined : async (lead) => {
                            const list = data.crmLeads || [];
                            const idx = list.findIndex((l) => l.email === lead.email && l.name === lead.name && (l.lastContact === lead.lastContact || l.dateAdded === lead.dateAdded));
                            if (idx < 0) {
                                alert('Lead not found in list.');
                                return;
                            }
                            try {
                                await api.post('/api/delete-lead', { userId: agentScopeId, index: idx, leadId: lead?.id || lead?._id || undefined, leadName: lead?.name, leadEmail: lead?.email });
                                invalidateDashboardCache(agentScopeId);
                                setSelectedLead(null);
                                const res = await api.get(`/api/users/${agentScopeId}?type=dashboard`);
                                setDashboardCache(agentScopeId, res.data);
                                const agentStats = res.data.agentStats || res.data.stats || {};
                                setData((prev) => ({ ...prev, crmLeads: agentStats.crmLeads || [] }));
                                alert('Lead deleted.');
                            } catch (err) {
                                alert(err.response?.data?.message || 'Failed to delete lead.');
                            }
                        }}
                    />
                )}
                {editingLead && viewUser && !isAgentPreview && (
                    <EditLeadModal
                        isOpen={true}
                        onClose={() => setEditingLead(null)}
                        onSuccess={(updatedLead, crmLeads) => {
                            setEditingLead(null);
                            invalidateDashboardCache(agentScopeId);
                            if (viewUser?.agencyId) invalidateDashboardCache(viewUser.agencyId);
                            if (Array.isArray(crmLeads)) setData((prev) => ({ ...prev, crmLeads }));
                            else api.get(`/api/users/${agentScopeId}?type=dashboard`).then((res) => {
                                setDashboardCache(agentScopeId, res.data);
                                const agentStats = res.data.agentStats || res.data.stats || {};
                                setData((prev) => ({ ...prev, crmLeads: agentStats.crmLeads || prev.crmLeads }));
                            });
                        }}
                        userId={viewUser._id}
                        user={viewUser}
                        lead={editingLead.lead}
                        leadIndex={editingLead.index}
                        properties={data.listData}
                    />
                )}
            </>
            );
        }

        // --- BUYER / INVESTOR / SELLER: original dashboard (OWNED PROPERTIES, AVERAGE ROI, ASSET VALUE, map, Portfolio Earnings, Vault, Market Trends, News, My Performance) ---
        return (
        <main className="dashboard-main" style={{ padding: isMobile ? '16px' : '24px 40px', fontFamily: "'Poppins', sans-serif", position: 'relative', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {sharedHeader}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="dashboard-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px', flexShrink: 0 }}>
                    <StatBoxCentered label={(user?.role?.toLowerCase() === 'buyer' || user?.role?.toLowerCase() === 'investor') ? 'REAL ESTATE Linked to MY IPM portfolio' : 'OWNED PROPERTIES'} value={data.stats.totalProperties || 0} subtext="Properties in Portfolio" />
                    {(() => {
                        const list = data.listData || [];
                        const assetValueSum = list.reduce((sum, item) => sum + convertToPreferredCurrency(item.currentValue || 0, item.currency), 0);
                        const totalInvested = list.reduce((sum, item) => sum + convertToPreferredCurrency(item.investedAmount || 0, item.currency), 0);
                        const hasAssetValue = Number(assetValueSum) > 0;
                        const returnPct = totalInvested > 0 ? ((assetValueSum - totalInvested) / totalInvested) * 100 : null;
                        const rois = list.map((p) => Number(p.roi)).filter((n) => !isNaN(n));
                        const avgRoi = rois.length > 0 ? rois.reduce((a, b) => a + b, 0) / rois.length : null;
                        const percentText = returnPct != null ? `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}% return` : avgRoi != null ? `${avgRoi.toFixed(1)}% avg ROI` : null;
                        const subtext = !hasAssetValue
                            ? (list.length ? 'Add values to see performance' : 'Add properties to see value')
                            : 'Portfolio value';
                        return (
                            <StatBoxCentered
                                label={`ASSET VALUE (${preferredCurrency})`}
                                value={formatAssetValueCompact(assetValueSum)}
                                subtext={subtext}
                                percentText={percentText}
                            />
                        );
                    })()}
                </div>
                <div className="dashboard-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {loading || user?.role?.toLowerCase() === 'agency' ? (
                        <div style={{ ...whiteCard, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                            <div style={cardHeaderSmall}>MY PROPERTIES BY REGION</div>
                            <div style={mapContainer} />
                        </div>
                    ) : (
                        <DashboardMapCard loading={loading} userRole={user?.role} listData={data.listData} agentProperties={agentProperties} />
                    )}
                    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: '16px' }}>
                        <h4 style={{ ...cardTitle, flexShrink: 0 }}>Portfolio Earnings</h4>
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px', WebkitOverflowScrolling: 'touch' }}>
                            {(data.listData && data.listData.length > 0) ? (
                                data.listData.map((property, i) => (
                                <div key={i} style={earningRow}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: '12px', lineHeight: 1.25 }}>{property.propertyTitle}</div>
                                            <div style={{ fontSize: '10px', color: '#999' }}>{formatAssetValueCompact(convertToPreferredCurrency(property.currentValue || 0, property.currency))} VALUE</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '12px' }}>{property.roi ?? 0}%</div>
                                            <div style={{ fontSize: '10px', color: '#999' }}>{formatAssetValueCompact(convertToPreferredCurrency((property.investedAmount || 0) * 0.1, property.currency))}/yr</div>
                                    </div>
                                </div>
                                ))
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: '#64748b', textAlign: 'center', padding: '20px' }}>
                                    <i className="fas fa-chart-line" style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.5 }} aria-hidden />
                                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>No portfolio properties yet</div>
                                    <div style={{ fontSize: '12px' }}>Add properties to your portfolio to see earnings and ROI here.</div>
                        </div>
                            )}
                    </div>
                </div>
                </div>
                <div className="dashboard-stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', flexShrink: 0, marginTop: '12px', marginBottom: '8px' }}>
                    <div style={cardStyleSmall}>
                        <h4 style={cardTitle}>MY SECURE DIGITAL VAULT</h4>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: brand.primary, margin: '12px 0', textAlign: 'center' }}>{data.vaultCount} DOCUMENTS</div>
                        <button style={{ ...addButton, display: 'block', margin: '0 auto' }}><i className="fas fa-plus"></i> Add documents</button>
                    </div>
                        <div style={cardStyleSmall}>
                            <h4 style={cardTitle}>Market Trends</h4>
                            <p style={{ fontSize: '9px', color: brand.muted, margin: '0 0 8px', textAlign: 'center', lineHeight: 1.3 }}>
                                {data.marketTrends?.some((t) => t.monthlyData?.length > 0)
                                    ? 'Official index values (raw). YoY from data. Do not compare numbers across countries — each uses its own base. Source per region below.'
                                    : 'Charts: 12‑month trend. Growth % is YoY.'}
                            </p>
                            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                {data.marketTrends && data.marketTrends.length > 0 ? (
                                    data.marketTrends.map((trend, i) => (
                                        <TrendRow key={i} country={trend.country} status={trend.sentiment || trend.status} color={getStatusColor(trend.sentiment || trend.status) || trend.color} price={trend.yoyPercent != null && trend.yoyPercent !== '' ? trend.yoyPercent : trend.priceChange} monthlyData={trend.monthlyData} sourceText={trend.sourceText} interpretation={trend.interpretation} />
                                    ))
                                ) : (
                                    <div style={{ fontSize: '12px', color: brand.muted, padding: '12px 0', textAlign: 'center' }}>No trends for your markets yet. Add countries in your portfolio or preferences to see trends here.</div>
                                )}
                            </div>
                        </div>
                        <div style={cardStyleSmall}>
                            <h4 style={cardTitle}>News Feeds</h4>
                            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                {data.newsFeeds && data.newsFeeds.length > 0 ? (
                                    data.newsFeeds.map((news, i) => {
                                        const url = news.sourceUrl || news.link || news.url;
                                        const hasLink = url && isNewsOrPropertySourceUrl(url);
                                        const saved = isNewsSaved(news);
                                        return (
                                            <div
                                                key={newsId(news) || i}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSelectedNews(news)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedNews(news); } }}
                                                style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #eee', alignItems: 'flex-start', cursor: 'pointer', borderRadius: 8, transition: 'background 0.15s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                {news.image && (
                                                    <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9' }}>
                                                        <img src={news.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                                )}
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontSize: '12px', fontWeight: '600', color: brand.text, marginBottom: '4px' }}>{news.title}</div>
                                                    {(news.aiSummary || news.desc) && (
                                                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: brand.muted, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{news.aiSummary || news.desc}</p>
                                                    )}
                                                    {hasLink ? (
                                                        <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: '11px', color: brand.primary, wordBreak: 'break-all' }}>Source: {url}</a>
                                                    ) : news._id ? (
                                                        <Link to={`/news/${news._id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: '11px', color: brand.primary }}>View article</Link>
                                                    ) : (
                                                        <span style={{ fontSize: '11px', color: brand.muted }}>No link</span>
                                                    )}
                            </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); toggleSaveNews(news); }}
                                                    aria-label={saved ? 'Remove from My IPM News' : 'Save to My IPM News'}
                                                    style={{ flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: saved ? '#dc2626' : '#94a3b8', fontSize: 14 }}
                                                >
                                                    <i className={saved ? 'fas fa-heart' : 'far fa-heart'} />
                                                </button>
                        </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ fontSize: '12px', color: brand.muted, padding: '12px 0', textAlign: 'center' }}>No news for your markets yet.</div>
                                )}
                            </div>
                        </div>
                </div>
                <InvestorComingSoonOverlay {...overlayProps}>
                    <div style={{ background: '#fcfcfc', borderRadius: '12px', padding: '15px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -2px 10px rgba(0,0,0,0.02)', marginTop: '10px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '24px', height: '24px', background: brand.primary, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><i className="fas fa-check"></i></div>
                            <div>
                                <div style={{ fontSize: '10px', color: brand.muted, textTransform: 'uppercase' }}>My Performance</div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: brand.text }}>You have {data.stats.activeLeads || 0} deals in pipeline</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '10px', color: brand.muted }}>Active listings:</div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: brand.primary }}>{data.stats.totalListings || 0}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: brand.muted }}>Meetings scheduled:</div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: brand.primary }}>{data.stats.meetingsScheduled || 0}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: brand.muted }}>Leads in CRM:</div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: brand.primary }}>{data.stats.activeLeads || 0}</div>
                            </div>
                        </div>
                    </div>
                </InvestorComingSoonOverlay>
            </div>
        </main>
        );
    };

            return (
                <>
                    <div style={{ display: 'flex', backgroundColor: '#f4f7f9', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        <Sidebar />
                        {user?.role?.toLowerCase() === 'agency'
                            ? (isAgencyAgentPreview && previewAgentDisplay ? renderInvestorView({ previewUser: previewAgentDisplay }) : renderAgencyView())
                            : renderInvestorView()}
                    </div>
                    {/* News detail popup — clickable tile opens this; source link retained; save to My IPM News */}
                    {selectedNews && (
                        <div
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                            onClick={() => setSelectedNews(null)}
                            role="dialog"
                            aria-modal="true"
                            aria-label="News article"
                        >
                            <div
                                style={{ background: 'white', borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {selectedNews.image && (
                                    <div style={{ height: 200, background: '#f1f5f9' }}>
                                        <img src={selectedNews.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
                                <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{selectedNews.title}</h3>
                                        <button type="button" onClick={() => setSelectedNews(null)} aria-label="Close" style={{ flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 4, fontSize: 20, color: '#64748b' }}><i className="fas fa-times" /></button>
                                    </div>
                                    {(selectedNews.aiSummary || selectedNews.desc) && (
                                        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>{selectedNews.aiSummary || selectedNews.desc}</p>
                                    )}
                                    {(selectedNews.sourceUrl || selectedNews.link || selectedNews.url) && (
                                        <>
                                            <p style={{ margin: 0, fontSize: 12, color: brand.muted }}>Source:</p>
                                            <a
                                                href={selectedNews.sourceUrl || selectedNews.link || selectedNews.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: 13, color: brand.primary, wordBreak: 'break-all', display: 'block', marginBottom: 16 }}
                                            >
                                                {selectedNews.sourceUrl || selectedNews.link || selectedNews.url}
                                            </a>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => toggleSaveNews(selectedNews)}
                                        style={{
                                            border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                            background: isNewsSaved(selectedNews) ? '#fef2f2' : '#f0fdfa', color: isNewsSaved(selectedNews) ? '#dc2626' : '#11575C'
                                        }}
                                    >
                                        <i className={isNewsSaved(selectedNews) ? 'fas fa-heart' : 'far fa-heart'} style={{ marginRight: 8 }} />
                                        {isNewsSaved(selectedNews) ? 'Saved to My IPM News' : 'Save to My IPM News'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            );
};

// Coming Soon overlay (same treatment for all roles: muted card + badge)
const InvestorComingSoonOverlay = ({ children, isSellerView, isInvestor, isAgent, comingSoonMessage }) => {
    if (isSellerView) {
        return (
            <div style={{ position: 'relative' }}>
                <div style={{ opacity: 0.35, pointerEvents: 'none' }}>{children}</div>
                <div style={{
                    position: 'absolute', top: '12px', right: '12px', background: '#ffffff', color: brand.primary,
                    border: '1px solid ' + brand.border, borderRadius: '999px', padding: '4px 10px', fontSize: '10px',
                    fontWeight: '700', letterSpacing: '0.4px', textTransform: 'uppercase', boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                }}>Coming Soon</div>
            </div>
        );
    }
    if (!isInvestor && !isAgent) return children;
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ opacity: 0.3, pointerEvents: 'none' }}>{children}</div>
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(1px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '16px', pointerEvents: 'auto'
            }}>
                <div style={{
                    background: 'white', padding: '30px 40px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    maxWidth: '400px', textAlign: 'center', border: '2px solid ' + brand.primary
                }}>
                    <i className="fas fa-clock" style={{ fontSize: '36px', color: brand.primary, marginBottom: '15px' }}></i>
                    <h3 style={{ color: brand.primary, fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>Coming Soon</h3>
                    <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.5' }}>{comingSoonMessage}</p>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTS ---
const StatBox = ({ label, value, subtext, chartColor, data, dataKey, isTrend, chartType, color, percent }) => (
    <div style={{ background: 'white', padding: '25px', borderRadius: '24px', display: 'flex', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ flex: 1, zIndex: 2 }}>
            <div style={{ fontSize: '11px', color: '#aaa', fontWeight: 'bold' }}>{label}</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#1a1a1a', margin: '10px 0' }}>{value}</div>
            <div style={{ fontSize: '12px', color: isTrend ? brand.primary : '#aaa' }}>{subtext}</div>
        </div>
        <div style={{ width: 120, height: 100, position: 'absolute', right: -10, bottom: -20 }}>
            <ResponsiveContainer width={120} height={100}>
                {chartType === 'bar' ? (
                    <BarChart data={data}><Bar dataKey="investedAmount" fill={color} radius={[4, 4, 0, 0]} /></BarChart>
                ) : chartType === 'gauge' ? (
                    <div style={{textAlign: 'center', color: color, fontWeight: 'bold', fontSize: '22px', marginTop: '30px'}}>{percent}%</div>
                ) : (
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/><stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey={dataKey} stroke={chartColor} strokeWidth={3} fillOpacity={1} fill={`url(#color${dataKey})`} />
                    </AreaChart>
                )}
            </ResponsiveContainer>
        </div>
    </div>
);

/** Centered stat only (no chart). Optional percentText shown under value (e.g. "+8% return") for context. */
const StatBoxCentered = ({ label, value, subtext, percentText }) => (
    <div style={{ background: 'white', padding: '16px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', textAlign: 'center' }}>{label}</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '48px', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontSize: '42px', fontWeight: '800', color: '#11575C', lineHeight: '1' }}>{value}</div>
            {percentText ? <div style={{ fontSize: '13px', fontWeight: '600', color: percentText.startsWith('+') ? '#16a34a' : percentText.startsWith('-') ? '#dc2626' : brand.primary }}>{percentText}</div> : null}
        </div>
        {subtext ? <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', marginTop: '2px' }}>{subtext}</div> : null}
    </div>
);

/**
 * Replaces the legacy Branch Ranking tile with a probability-weighted
 * commission forecast for deals currently in the sales pipeline.
 *
 * Per deal:
 *   pool             = (offerPrice || askingPrice) × commissionRatePct%
 *   internalShare    = sum(party.sharePct% where party.source === 'internal')
 *   internalEarnings = pool × internalShare
 *   weightedValue    = internalEarnings × probabilityOfSale%
 *
 * Tile shows:
 *   - per-deal row with weighted value and probability
 *   - total weighted value summed across deals (excludes Closed Won/Lost)
 */
function CommissionPipelineTile({ deals, formatAssetValueCompact, navigate }) {
    const rows = (deals || [])
        .filter((d) => d.stageId !== 'won' && d.stageId !== 'lost')
        .map((d) => {
            const price = Number(d.offerPrice) || Number(d.askingPrice) || 0;
            const pool = price * (Number(d.commissionRatePct) || 0) / 100;
            const internalShare = (d.commissionParties || [])
                .filter((p) => (p.source || 'internal') === 'internal')
                .reduce((acc, p) => acc + (Number(p.sharePct) || 0), 0) / 100;
            const internalEarnings = pool * internalShare;
            const probability = (Number(d.probabilityOfSale) || 0) / 100;
            const weightedValue = internalEarnings * probability;
            return { id: d.id, title: d.propertyTitle || 'Untitled', address: d.propertyAddress || '', internalEarnings, probability, weightedValue, ready: pool > 0 && internalShare > 0 && probability > 0 };
        })
        .sort((a, b) => b.weightedValue - a.weightedValue);

    const total = rows.reduce((acc, r) => acc + r.weightedValue, 0);

    return (
        <div style={cardStyle}>
            <h4 style={cardTitle}>COMMISSION PROBABILITY PIPELINE</h4>
            {rows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#888' }}>
                    <i className="fas fa-percent" style={{ fontSize: '36px', marginBottom: '10px', opacity: 0.3 }}></i>
                    <p style={{ fontSize: '13px' }}>No active deals yet. Listings flipped to "Under Negotiation" appear here.</p>
                </div>
            ) : (
                <>
                    <div style={{ marginTop: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Weighted forecast</span>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#11575C' }}>{formatAssetValueCompact(total)}</span>
                    </div>
                    <div style={{ marginTop: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: '8px 12px', alignItems: 'center', padding: '8px 0', borderBottom: '2px solid #e2e8f0', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            <span>Property</span>
                            <span style={{ textAlign: 'right' }}>Prob.</span>
                            <span style={{ textAlign: 'right' }}>Value</span>
                        </div>
                        {rows.map((row) => (
                            <div
                                key={row.id}
                                onClick={() => navigate('/sales')}
                                style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px', gap: '8px 12px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px', cursor: 'pointer' }}
                                title={row.ready ? 'Open Sales pipeline' : 'Add commission % and probability on the Listings page to see weighted value'}
                            >
                                <div>
                                    <div style={{ fontWeight: '600', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.title}</div>
                                    {row.address && <div style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.address}</div>}
                                </div>
                                <div style={{ textAlign: 'right', fontWeight: '600', fontSize: '12px', color: row.probability >= 0.7 ? '#15803d' : row.probability >= 0.4 ? '#b45309' : '#94a3b8' }}>
                                    {row.probability ? `${Math.round(row.probability * 100)}%` : '—'}
                                </div>
                                <div style={{ textAlign: 'right', fontWeight: '600', color: '#11575C', fontSize: '12px' }}>
                                    {row.ready ? formatAssetValueCompact(row.weightedValue) : '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

const RegionProgress = ({ label, val }) => (
    <div style={{marginBottom: '15px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px'}}>
            <span>{label}</span><span style={{fontWeight:'bold'}}>{val}</span>
        </div>
        <div style={{width: '100%', height: '6px', background: '#f0f0f0', borderRadius: '10px'}}>
            <div style={{width: `${val * 2}%`, height: '100%', background: '#1f3a3d', borderRadius: '10px'}}></div>
        </div>
    </div>
);

/** Short description of what this trend means for the user */
function getTrendDescription(status, priceChange) {
    const s = (status || '').toLowerCase();
    const pct = parseFloat(String(priceChange || '0').replace(/[^0-9.-]/g, '')) || 0;
    const isUp = pct >= 0;
    if (s === 'excellent') return isUp ? 'Strong year-on-year growth; favorable for investors and sellers.' : 'Market cooling; good time to negotiate.';
    if (s === 'good') return isUp ? 'Steady appreciation; solid for medium-term holds.' : 'Moderate correction; watch for entry points.';
    if (s === 'stable') return 'Prices moving sideways; low volatility, stable yields.';
    if (s === 'caution') return isUp ? 'Rising but volatile; consider diversification.' : 'Declining prices; review holdings and exit strategy.';
    return isUp ? 'Market showing positive momentum.' : 'Market under pressure; monitor closely.';
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Generate 12 monthly index points (Jan = 100, Dec = 100 + YoY%). Monotonic so chart direction matches growth %. Illustrative only. */
function getMonthlyTrendData(priceChange) {
    const pct = parseFloat(String(priceChange || '0').replace(/[^0-9.-]/g, '')) || 0;
    const endValue = 100 + pct; // e.g. 107.8 for +7.8%
    const seed = Math.abs(pct * 10) % 7 + 1;
    const points = [100];
    for (let i = 1; i < 12; i++) {
        const t = i / 11; // 0..1 so last month = endValue
        const linear = 100 + t * (endValue - 100);
        const wiggle = (Math.sin(seed * i) * 0.015) * (endValue - 100);
        points.push(linear + wiggle);
    }
    return MONTH_LABELS.map((month, i) => ({
        month,
        value: Math.round((points[i] ?? 100) * 10) / 10
    }));
}

const TrendRow = ({ country, status, color, price, monthlyData, sourceText, interpretation }) => {
    const hasRealData = monthlyData && Array.isArray(monthlyData) && monthlyData.length > 0;
    const chartData = hasRealData
        ? monthlyData.map((d, i) => ({ month: d.month || MONTH_LABELS[i] || '', value: Number(d.value) }))
        : getMonthlyTrendData(price);
    const description = (interpretation && interpretation.trim()) ? interpretation.trim() : getTrendDescription(status, price);
    return (
        <div style={{ padding: '10px 0', borderBottom: '1px solid #f1f1f1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{country} <span style={{ fontSize: '10px', color: '#999' }}>{price}</span></div>
                <span style={{ fontSize: '10px', color: 'white', background: color, padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>{(status || '').toUpperCase()}</span>
            </div>
            <p style={{ margin: 0, fontSize: '10px', color: brand.muted, lineHeight: 1.3 }}>{description}</p>
            <div style={{ marginTop: '6px', height: 52, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke={brand.muted} />
                        <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip
                            contentStyle={{ fontSize: '11px', padding: '6px 10px', maxWidth: 320 }}
                            formatter={(value) => [hasRealData ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : `${Number(value).toFixed(1)}`, 'Index']}
                            labelFormatter={(label) => label}
                            labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            {sourceText && (
                <p style={{ margin: '4px 0 0', fontSize: '9px', color: brand.muted, lineHeight: 1.25 }} title={sourceText}>
                    {sourceText.length > 120 ? sourceText.slice(0, 120) + '…' : sourceText}
                </p>
            )}
    </div>
);
};

// Demo-data calendar used on the agent dashboard. Generates a deterministic
// set of viewings / meetings / calls for the visible month so the tile feels
// alive without real data backing it yet. Hooks live inside the component (it
// can't sit inside renderInvestorView, which isn't a true component).
const CALENDAR_EVENT_TEMPLATES = [
    { type: 'Viewing',   icon: 'fa-eye',          color: '#11575C', bg: '#dcfce7', label: 'Viewing',   pool: ['12 Park Lane', '88 Sandton Drive', '4 Atlantic Quay', '23 Marina Heights', '7 Riverside Mews'] },
    { type: 'Meeting',   icon: 'fa-handshake',    color: '#1e40af', bg: '#dbeafe', label: 'Meeting',   pool: ['Roger Smith', 'Zara Aziz', 'Daniel Becker', 'Sophia Linden', 'Theo Page'] },
    { type: 'Call',      icon: 'fa-phone',        color: '#b45309', bg: '#fef3c7', label: 'Call',      pool: ['Marder HQ', 'Kim Walker', 'Investor follow-up', 'Lender callback', 'Mortgage broker'] },
    { type: 'Open day',  icon: 'fa-door-open',    color: '#7c3aed', bg: '#ede9fe', label: 'Open day',  pool: ['Hyde Vista launch', 'Phoenix Square preview', '3 The Oaks open house'] },
    { type: 'Valuation', icon: 'fa-clipboard-check', color: '#0d9488', bg: '#ccfbf1', label: 'Valuation', pool: ['9 Albany Park', '156 Greenstone', '21 Constantia Heights'] },
];

function buildFakeAgentEvents(year, month) {
    const seed = year * 12 + month;
    const rand = (i) => {
        const x = Math.sin(seed * 9301 + i * 49297) * 233280;
        return x - Math.floor(x);
    };
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const targetDays = Math.min(14, daysInMonth);
    const days = new Set();
    // Bounded loop: counter advances every iteration so we can't spin forever
    // when the PRNG happens to produce a duplicate day.
    for (let i = 1; i < 200 && days.size < targetDays; i++) {
        days.add(1 + Math.floor(rand(i) * daysInMonth));
    }
    const events = [];
    Array.from(days).forEach((day, idx) => {
        const tmpl = CALENDAR_EVENT_TEMPLATES[Math.floor(rand(idx + 100) * CALENDAR_EVENT_TEMPLATES.length)];
        const subject = tmpl.pool[Math.floor(rand(idx + 200) * tmpl.pool.length)];
        const hour = 8 + Math.floor(rand(idx + 300) * 10);
        const minute = Math.floor(rand(idx + 400) * 4) * 15;
        events.push({
            day,
            time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            type: tmpl.type, label: tmpl.label, icon: tmpl.icon, color: tmpl.color, bg: tmpl.bg,
            subject,
        });
        if (rand(idx + 500) > 0.7) {
            const tmpl2 = CALENDAR_EVENT_TEMPLATES[(idx + 1) % CALENDAR_EVENT_TEMPLATES.length];
            const subject2 = tmpl2.pool[Math.floor(rand(idx + 600) * tmpl2.pool.length)];
            const hour2 = Math.min(18, hour + 2 + Math.floor(rand(idx + 700) * 3));
            events.push({
                day,
                time: `${String(hour2).padStart(2, '0')}:00`,
                type: tmpl2.type, label: tmpl2.label, icon: tmpl2.icon, color: tmpl2.color, bg: tmpl2.bg,
                subject: subject2,
            });
        }
    });
    return events.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
}

const AgentCalendarTile = () => {
    const todayDate = new Date();
    const [view, setView] = React.useState({ year: todayDate.getFullYear(), month: todayDate.getMonth() });
    const [selectedDay, setSelectedDay] = React.useState(todayDate.getDate());

    const events = React.useMemo(() => buildFakeAgentEvents(view.year, view.month), [view.year, view.month]);
    const eventsByDay = React.useMemo(() => {
        const map = {};
        events.forEach((e) => { (map[e.day] = map[e.day] || []).push(e); });
        return map;
    }, [events]);

    const monthName = new Date(view.year, view.month, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    const firstDow = (new Date(view.year, view.month, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const isToday = (d) => view.year === todayDate.getFullYear() && view.month === todayDate.getMonth() && d === todayDate.getDate();

    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);

    const goPrev = () => setView((v) => {
        const m = v.month - 1; return m < 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: m };
    });
    const goNext = () => setView((v) => {
        const m = v.month + 1; return m > 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: m };
    });
    const goToday = () => { setView({ year: todayDate.getFullYear(), month: todayDate.getMonth() }); setSelectedDay(todayDate.getDate()); };

    const selectedEvents = eventsByDay[selectedDay] || [];

    const navBtn = { width: 26, height: 26, borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', color: brand.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 };
    const dayCellBase = { aspectRatio: '1 / 1', borderRadius: 8, fontSize: 11, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', userSelect: 'none', transition: 'background 0.15s' };

    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h4 style={{ ...cardTitle, textAlign: 'left', flex: 1 }}>CALENDAR + SCHEDULE</h4>
                <button type="button" onClick={goToday} style={{ fontSize: 10, fontWeight: 700, color: brand.primary, background: '#f0fdfa', border: '1px solid #99f6e4', padding: '3px 10px', borderRadius: 999, cursor: 'pointer' }}>Today</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <button type="button" aria-label="Previous month" onClick={goPrev} style={navBtn}><i className="fas fa-chevron-left" /></button>
                        <div style={{ fontSize: 12, fontWeight: 700, color: brand.text }}>{monthName}</div>
                        <button type="button" aria-label="Next month" onClick={goNext} style={navBtn}><i className="fas fa-chevron-right" /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 9, color: brand.muted, textAlign: 'center', marginBottom: 4, fontWeight: 700, letterSpacing: '0.05em' }}>
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                        {cells.map((d, i) => {
                            if (d == null) return <div key={i} />;
                            const isSelected = d === selectedDay;
                            const today = isToday(d);
                            const dayEvents = eventsByDay[d] || [];
                            const bg = isSelected ? brand.primary : today ? '#f0fdfa' : 'transparent';
                            const color = isSelected ? 'white' : today ? brand.primary : brand.text;
                            return (
                                <div
                                    key={i}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedDay(d)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDay(d); } }}
                                    style={{ ...dayCellBase, background: bg, color, border: today && !isSelected ? '1px solid #99f6e4' : '1px solid transparent' }}
                                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = today ? '#f0fdfa' : 'transparent'; }}
                                >
                                    <span>{d}</span>
                                    {dayEvents.length > 0 && (
                                        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                                            {dayEvents.slice(0, 3).map((e, j) => (
                                                <span key={j} style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'white' : e.color, opacity: isSelected ? 0.9 : 1 }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: brand.text, marginBottom: 2 }}>
                        {new Date(view.year, view.month, selectedDay || 1).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </div>
                    <div style={{ fontSize: 10, color: brand.muted, marginBottom: 10 }}>
                        {selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'} scheduled
                    </div>
                    <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedEvents.length === 0 ? (
                            <div style={{ fontSize: 11, color: brand.muted, padding: '20px 0', textAlign: 'center', fontStyle: 'italic' }}>Nothing scheduled — pick another day to preview.</div>
                        ) : (
                            selectedEvents.map((e, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 8, background: '#fafafa', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                    <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: e.bg, color: e.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                                        <i className={`fas ${e.icon}`} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: brand.text }}>
                                            <span>{e.time}</span>
                                            <span style={{ fontSize: 9, fontWeight: 600, color: e.color, background: e.bg, padding: '1px 6px', borderRadius: 4 }}>{e.label}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: brand.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.subject}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const cardStyle = { background: 'white', padding: '25px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative' };
const cardStyleSmall = { background: 'white', padding: '14px 18px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative' };
const cardTitle = { margin: 0, fontSize: '12px', color: brand.muted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', textAlign: 'center' };
const whiteCard = { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative' };
const cardHeaderSmall = { fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px', textAlign: 'center' };
const mapContainer = { flex: 1, position: 'relative', minHeight: 160, height: 160, background: '#f8fafc', borderRadius: '8px', overflow: 'hidden' };
const earningRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8f9fa', flexShrink: 0 };
const mandateCard = { flexShrink: 0, minWidth: 160 };
const mandateThumbWrap = { width: 160, height: 100, borderRadius: '10px', background: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const mandateThumbImg = { width: '100%', height: '100%', objectFit: 'contain', display: 'block' };
const addButton = { border: 'none', background: '#eee', color: brand.muted, padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };

export default Dashboard;