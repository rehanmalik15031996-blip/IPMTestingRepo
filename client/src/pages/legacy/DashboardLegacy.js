import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../config/api';
import { usePreferences } from '../../context/PreferencesContext';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { getDashboardCache, setDashboardCache } from '../../config/dashboardCache';
import { Link } from 'react-router-dom';
import { brand, getStatusColor } from '../../config/brandColors';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { sanitizeAgencyBranchDisplay } from '../../utils/display';
import { isNewsOrPropertySourceUrl } from '../../utils/newsUrl';

const DEFAULT_MARKET_TRENDS = [
    { country: 'South Africa', status: 'Good', color: '#2ecc71', priceChange: '+3.2%' },
    { country: 'Dubai', status: 'Excellent', color: '#00c2cb', priceChange: '+7.8%' },
    { country: 'London', status: 'Stable', color: '#ffc801', priceChange: '+1.2%' },
    { country: 'Netherlands', status: 'Caution', color: '#e74c3c', priceChange: '-0.8%' }
];
const DEFAULT_NEWS_FEEDS = [
    { title: 'Buying or Selling? Why Timing Alone Is No Longer the Deciding Factor', category: 'Buying Property', date: '6 February 2026' },
    { title: 'From Listings to Intelligence: How AI Is Reshaping Property', category: 'Market Intelligence', date: '13 February 2026' },
    { title: 'International property outlook for 2026', category: 'Market Update', date: '11 February 2026' }
];

// --- Map: DashboardMapCard with hasInitedRef (same fix as tiles – stable deps, init once) ---
let dashboardMapScriptPromise = null;
const dashboardMapStyles = [
    { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
    { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#a3a3a3' }] },
    { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] }
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
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
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

function DashboardMapCard({ loading, userRole, listData, agentProperties }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const hasInitedRef = useRef(false);

    useEffect(() => {
        if (loading || userRole?.toLowerCase() === 'agency') return;
        const container = mapContainerRef.current;
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!container || !apiKey) return;
        if (hasInitedRef.current) return;
        hasInitedRef.current = true;

        const items = (listData || []);
        const locations = items
            .map((item) =>
                item.location ||
                item.address ||
                item.details?.location ||
                item.details?.locationDetails?.streetAddress ||
                item.details?.locationDetails?.city
            )
            .filter(Boolean);

        let cancelled = false;
        let resizeTimer = null;
        let refreshMap = null;
        let handleVisibility = null;

        const initMap = () => {
            if (cancelled) return;
            loadDashboardMapScript(apiKey)
                .then((google) => {
                    if (cancelled) return;
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
                refreshMap = () => {
                    if (!mapRef.current) return;
                    google.maps.event.trigger(mapRef.current, 'resize');
                    mapRef.current.setCenter(mapRef.current.getCenter() || DASHBOARD_MAP_CENTER);
                };
                resizeTimer = setTimeout(refreshMap, 150);
                handleVisibility = () => {
                    if (document.visibilityState === 'visible') setTimeout(refreshMap, 50);
                };
                window.addEventListener('resize', refreshMap);
                document.addEventListener('visibilitychange', handleVisibility);

                markersRef.current.forEach((m) => m.setMap(null));
                markersRef.current = [];

                if (locations.length === 0) {
                    mapRef.current.setCenter(DASHBOARD_MAP_CENTER);
                    mapRef.current.setZoom(DASHBOARD_MAP_ZOOM);
                    return;
                }
                const geocoder = new google.maps.Geocoder();
                const bounds = new google.maps.LatLngBounds();
                locations.forEach((address) => {
                    geocoder.geocode({ address }, (results, status) => {
                        if (cancelled) return;
                        if (status === 'OK' && results?.[0]) {
                            const position = results[0].geometry.location;
                            const marker = new google.maps.Marker({
                                map: mapRef.current,
                                position,
                                icon: {
                                    url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ffc801"/></svg>'),
                                    scaledSize: new google.maps.Size(40, 40),
                                    anchor: new google.maps.Point(12, 24)
                                }
                            });
                            markersRef.current.push(marker);
                            bounds.extend(position);
                            mapRef.current.fitBounds(bounds);
                            google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
                                if (mapRef.current.getZoom() > 15) mapRef.current.setZoom(15);
                            });
                        }
                    });
                });
                })
                .catch(() => {
                    hasInitedRef.current = false;
                });
        };

        requestAnimationFrame(() => {
            requestAnimationFrame(initMap);
        });

        return () => {
            cancelled = true;
            if (resizeTimer) clearTimeout(resizeTimer);
            if (refreshMap) window.removeEventListener('resize', refreshMap);
            if (handleVisibility) document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [loading, userRole]);

    if (loading || userRole?.toLowerCase() === 'agency') return null;

    const whiteCard = { background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative' };
    const cardHeaderSmall = { fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px', textAlign: 'center' };
    const mapContainerLocal = { flex: 1, position: 'relative', minHeight: 160, height: 160, background: '#f8fafc', borderRadius: '8px', overflow: 'hidden' };

    return (
        <div style={{ ...whiteCard, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={cardHeaderSmall}>MY PROPERTIES BY REGION</div>
            <div style={mapContainerLocal}>
                <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0, minHeight: 160, minWidth: 100 }} />
            </div>
        </div>
    );
}

const DashboardLegacy = () => {
    const isMobile = useIsMobile();
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user?._id;
    const navigate = useNavigate();
    const { convertToPreferredCurrency, formatAssetValueCompact, currency: preferredCurrency } = usePreferences();
    const [data, setData] = useState({ 
        stats: {}, 
        listData: [], 
        vaultCount: 0, 
        newsFeeds: [],
        marketTrends: []
    });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [agentProperties, setAgentProperties] = useState([]);
    const [showAddAgentModal, setShowAddAgentModal] = useState(false);
    const [newAgentData, setNewAgentData] = useState({ name: '', email: '', branch: 'Dubai Hills Estate', tier: 'Pro Agent' });
    const [selectedNews, setSelectedNews] = useState(null);
    const [savedNews, setSavedNews] = useState(() => {
        try {
            const key = user?._id ? `ipm_saved_news_${user._id}` : 'ipm_saved_news';
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (_) { return []; }
    });

    const persistSavedNews = (list) => {
        const key = userId ? `ipm_saved_news_${userId}` : 'ipm_saved_news';
        try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) {}
    };
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

    useEffect(() => {
        const applyData = (resData) => {
            setData({
                stats: resData.stats || {},
                listData: resData.portfolio || resData.data || [],
                vaultCount: resData.vaultCount || 0,
                newsFeeds: (resData.newsFeeds && resData.newsFeeds.length > 0) ? resData.newsFeeds : DEFAULT_NEWS_FEEDS,
                marketTrends: (resData.marketTrends && resData.marketTrends.length > 0) ? resData.marketTrends : DEFAULT_MARKET_TRENDS
            });
            // agentProperties is now always included in the dashboard API response
            setAgentProperties(resData.agentProperties || []);
        };

        const fetchDashboardData = async () => {
            if (!userId) return;

            // Check cache first for instant load
            const cached = getDashboardCache(userId);
            if (cached) {
                applyData(cached);
                setLoading(false);
                return;
            }

            try {
                const res = await api.get(`/api/users/${userId}?type=dashboard`);
                setDashboardCache(userId, res.data);
                applyData(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [userId]);

    const formatCurrency = (val) => formatAssetValueCompact(convertToPreferredCurrency(val || 0, 'USD'));

    if (loading) return <div style={{marginLeft: '280px', padding: '40px'}}>Loading Dashboard...</div>;

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

    // Handle Add Agent
    const handleAddAgent = async () => {
        if (!newAgentData.name || !newAgentData.email) {
            alert('Name and Email are required');
            return;
        }
        
        try {
            // Add agent to agency stats
            const res = await api.put(`/api/users/${user._id}`, {
                action: 'add-agent',
                agentData: {
                    ...newAgentData,
                    sales: 0,
                    revenue: 0,
                    avgDays: 0,
                    conversionRate: '0%'
                }
            });
            
            if (res.data.success) {
                // Generate invite link
                const inviteLink = `${window.location.origin}/agency-agent-invite?email=${encodeURIComponent(newAgentData.email)}`;
                
                // TODO: Send invite email with link (for now, just show alert)
                alert(`Agent added! Invite link: ${inviteLink}\n\nPlease send this link to ${newAgentData.email}`);
                
                // Refresh dashboard data
                const dashboardRes = await api.get(`/api/users/${user._id}?type=dashboard`);
                setData({
                    stats: dashboardRes.data.stats || {},
                    listData: dashboardRes.data.data || [],
                    vaultCount: dashboardRes.data.vaultCount || 0,
                    newsFeeds: (dashboardRes.data.newsFeeds && dashboardRes.data.newsFeeds.length > 0) ? dashboardRes.data.newsFeeds : DEFAULT_NEWS_FEEDS,
                    marketTrends: (dashboardRes.data.marketTrends && dashboardRes.data.marketTrends.length > 0) ? dashboardRes.data.marketTrends : DEFAULT_MARKET_TRENDS
                });
                
                setShowAddAgentModal(false);
                setNewAgentData({ name: '', email: '', branch: 'Dubai Hills Estate', tier: 'Pro Agent' });
            }
        } catch (err) {
            console.error('Error adding agent:', err);
            alert('Error adding agent: ' + (err.response?.data?.message || err.message));
        }
    };

    // --- RENDER AGENCY VIEW ---
    const renderAgencyView = () => (
        <main className="dashboard-main" style={{ flex: 1, padding: isMobile ? '16px' : '40px', fontFamily: "'Poppins', sans-serif", position: 'relative' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '700' }}>Good day, {user.name}!</h2>
                    <p style={{ color: '#888' }}>Agency View &bull; Welcome back</p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button 
                        onClick={() => setShowAddAgentModal(true)}
                        style={{ background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <i className="fas fa-user-plus"></i> Add Agent
                    </button>
                </div>
            </header>

            {/* VISIBLE SECTIONS: Agents and Properties */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '25px', marginBottom: '30px' }}>
                {/* AGENTS SECTION - Always visible */}
                <div style={cardStyle}>
                    <h4 style={cardTitle}>YOUR AGENTS</h4>
                    <div style={{ marginTop: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                        {data.stats.topAgents && data.stats.topAgents.length > 0 ? (
                            data.stats.topAgents.map((agent, i) => (
                                <div key={i} style={{...earningRow, padding: '15px', borderBottom: '1px solid #f0f0f0'}}>
                                    <div>
                                        <div style={{fontWeight: '600', fontSize: '14px', color: '#1a1a1a'}}>{agent.name}</div>
                                        <div style={{fontSize: '12px', color: '#888', marginTop: '4px'}}>{agent.email || sanitizeAgencyBranchDisplay(agent.branch) || 'Agent'}</div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div style={{fontSize: '12px', color: '#888'}}>Properties</div>
                                        <div style={{fontWeight: 'bold', color: '#11575C'}}>
                                            {agentProperties.filter(p => String(p.agentId) === String(agent._id || agent.id)).length}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{textAlign: 'center', padding: '40px', color: '#888'}}>
                                <i className="fas fa-users" style={{fontSize: '48px', marginBottom: '15px', opacity: 0.3}}></i>
                                <p>No agents yet. Click "Add Agent" to invite your first agent.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* PROPERTIES SECTION - Always visible */}
                <div style={cardStyle}>
                    <h4 style={cardTitle}>AGENT PROPERTIES</h4>
                    <div style={{ marginTop: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                        {agentProperties.length > 0 ? (
                            agentProperties.map((property, i) => (
                                <div key={i} style={{padding: '15px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '15px', alignItems: 'center'}}>
                                    <img 
                                        src={property.imageUrl || 'https://via.placeholder.com/60'} 
                                        alt={property.title}
                                        style={{width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover'}}
                                    />
                                    <div style={{flex: 1}}>
                                        <div style={{fontWeight: '600', fontSize: '14px', color: '#1a1a1a'}}>{property.title}</div>
                                        <div style={{fontSize: '12px', color: '#888', marginTop: '4px'}}>{property.location}</div>
                                        <div style={{fontSize: '12px', color: '#11575C', fontWeight: 'bold', marginTop: '4px'}}>{property.price}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{textAlign: 'center', padding: '40px', color: '#888'}}>
                                <i className="fas fa-home" style={{fontSize: '48px', marginBottom: '15px', opacity: 0.3}}></i>
                                <p>No properties uploaded by agents yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* GREYED OUT SECTIONS */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '25px', marginBottom: '30px' }}>
                <ComingSoonOverlay message="Active properties analytics coming soon">
                    <StatBox label="ACTIVE PROPERTIES" value={data.stats.totalListings || 0} subtext="Properties by listing month" chartType="bar" data={data.listData} color="#1f3a3d" />
                </ComingSoonOverlay>
                <ComingSoonOverlay message="Active leads tracking coming soon">
                    <StatBox label="ACTIVE LEADS" value={data.stats.activeLeads || 0} subtext="Active leads in pipeline" chartType="bar" data={data.listData} color="#00c2cb" />
                </ComingSoonOverlay>
                <ComingSoonOverlay message="Sales analytics coming soon">
                    <StatBox label="SALES (USD)" value={formatCurrency(data.stats.totalRevenue)} subtext="Performance against target"/>
                </ComingSoonOverlay>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr', gap: '25px' }}>
                <ComingSoonOverlay message="Regional property distribution coming soon">
                    <div style={cardStyle}>
                        <h4 style={cardTitle}>ACTIVE PROPERTIES BY REGION</h4>
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg" alt="map" style={{ width: '100%', opacity: 0.1 }} />
                        </div>
                    </div>
                </ComingSoonOverlay>
                <ComingSoonOverlay message="Top agents performance coming soon">
                    <div style={cardStyle}>
                        <h4 style={cardTitle}>TOP AGENTS</h4>
                        {data.stats.topAgents?.map((agent, i) => (
                            <div key={i} style={earningRow}>
                                <div style={{fontWeight: '600', fontSize: '14px'}}>{agent.name}</div>
                                <div style={{color: '#00c2cb', fontWeight: 'bold'}}>{formatCurrency(agent.revenue)}</div>
                            </div>
                        ))}
                    </div>
                </ComingSoonOverlay>
                <ComingSoonOverlay message="Sales by region analytics coming soon">
                    <div style={cardStyle}>
                        <h4 style={cardTitle}>SALES BY REGION</h4>
                        <div style={{marginTop: '15px'}}>
                            <RegionProgress label="Dubai" val={37} />
                            <RegionProgress label="United Kingdom" val={2} />
                            <RegionProgress label="South Africa" val={0} />
                        </div>
                    </div>
                </ComingSoonOverlay>
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
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Full Name *</label>
                            <input
                                type="text"
                                value={newAgentData.name}
                                onChange={(e) => setNewAgentData({...newAgentData, name: e.target.value})}
                                placeholder="Agent Name"
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Branch</label>
                                <select
                                    value={newAgentData.branch}
                                    onChange={(e) => setNewAgentData({...newAgentData, branch: e.target.value})}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                                >
                                    <option>Dubai Hills Estate</option>
                                    <option>Downtown Dubai</option>
                                    <option>Palm Jumeirah</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Agent Tier</label>
                                <select
                                    value={newAgentData.tier}
                                    onChange={(e) => setNewAgentData({...newAgentData, tier: e.target.value})}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
                                >
                                    <option>Pro Agent</option>
                                    <option>Senior Agent</option>
                                    <option>Junior Agent</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowAddAgentModal(false);
                                    setNewAgentData({ name: '', email: '', branch: 'Dubai Hills Estate', tier: 'Pro Agent' });
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
                                disabled={!newAgentData.name || !newAgentData.email}
                                style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: (!newAgentData.name || !newAgentData.email) ? '#ccc' : '#11575C',
                                    cursor: (!newAgentData.name || !newAgentData.email) ? 'not-allowed' : 'pointer',
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
        </main>
    );

    // --- RENDER INVESTOR VIEW (same for seller, buyer, investor, agent) ---
    const renderInvestorView = () => {
        const role = user?.role?.toLowerCase();
        const isSeller = role === 'seller';
        const isBuyer = role === 'buyer';
        const isInvestor = role === 'investor';
        const isLandlord = role === 'landlord';
        const isAgent = role === 'agent' || role === 'independent_agent' || role === 'agency_agent';
        const isClientPortfolioRole = isSeller || isBuyer || isInvestor || isLandlord;
        // All client roles see the same dashboard as seller (no blur, same Coming Soon treatment)
        const isSellerView = isSeller || isBuyer || isInvestor || isLandlord || isAgent;
        const overlayProps = { isSellerView, isInvestor: false, isAgent: false, comingSoonMessage: '' };
        const portfolioItemTitle = (property) => {
            if (!isClientPortfolioRole) return property.propertyTitle || 'Untitled Property';
            const loc = property.location || (property.details?.locationDetails && [property.details.locationDetails.streetAddress, property.details.locationDetails.city, property.details.locationDetails.country].filter(Boolean).join(', '));
            return (loc && loc.trim()) ? loc : (property.propertyTitle || 'Untitled Property');
        };

        return (
        <main className="dashboard-main" style={{ flex: 1, padding: isMobile ? '16px' : '24px 40px', fontFamily: "'Poppins', sans-serif", position: 'relative', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>Good day, {user?.name?.split(' ')[0] || 'User'}!</h2>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (searchQuery.trim()) {
                                navigate('/collection', { state: { searchQuery: searchQuery.trim() } });
                            }
                        }}
                        style={{ display: 'none', alignItems: 'center', background: 'white', padding: '8px 15px', borderRadius: '30px', gap: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)', width: '300px' }}
                    >
                        <i className="fas fa-search" style={{color:'#00c2cb'}}></i>
                        <input 
                            type="text"
                            placeholder="Search properties..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '12px', color: '#555' }}
                        />
                    </form>
                </div>
            </header>

            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px', flexShrink: 0 }}>
                        <StatBoxCentered label={(user?.role?.toLowerCase() === 'buyer' || user?.role?.toLowerCase() === 'investor') ? 'REAL ESTATE Linked to MY IPM portfolio' : 'OWNED PROPERTIES'} value={data.stats.totalProperties || 0} subtext="Properties in Portfolio" />
                        <StatBoxCentered label="AVG ROI" value={`${Number((data.listData || []).length ? ((data.listData || []).reduce((sum, p) => sum + (Number(p.roi) || 0), 0) / (data.listData || []).length) : (data.stats.avgRoi || 0)).toFixed(1)}%`} subtext="Portfolio average" />
                        {(() => {
                        const assetValueSum = (data.listData || []).reduce((sum, item) => sum + convertToPreferredCurrency(item.currentValue || 0, item.currency), 0);
                        const hasAssetValue = Number(assetValueSum) > 0;
                        return (
                            <StatBoxCentered
                                label={`ASSET VALUE (${preferredCurrency})`}
                                value={formatAssetValueCompact(assetValueSum)}
                                subtext={hasAssetValue ? 'Portfolio value' : (data.listData?.length ? 'Add values to see performance' : 'Add properties to see value')}
                            />
                        );
                    })()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '20px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        {loading || user?.role?.toLowerCase() === 'agency' ? (
                            <div style={{ ...whiteCard, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                                <div style={cardHeaderSmall}>MY PROPERTIES BY REGION</div>
                                <div style={mapContainer} />
                            </div>
                        ) : (
                            <DashboardMapCard
                                loading={loading}
                                userRole={user?.role}
                                listData={data.listData}
                                agentProperties={agentProperties}
                            />
                        )}

                        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: '16px' }}>
                            <h4 style={{ ...cardTitle, flexShrink: 0 }}>Portfolio Earnings</h4>
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px', WebkitOverflowScrolling: 'touch' }}>
                                {(data.listData && data.listData.length > 0) ? (
                                    data.listData.map((property, i) => (
                                    <div key={i} style={earningRow}>
                                        <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: '600', fontSize: '12px', lineHeight: 1.25 }}>{portfolioItemTitle(property)}</div>
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

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px', flexShrink: 0, marginTop: '12px', marginBottom: '8px' }}>
                        {/* My Secure Digital Vault - Always visible for Investor, Seller, and Agent */}
                        <div style={cardStyleSmall}>
                            <h4 style={cardTitle}>MY SECURE DIGITAL VAULT</h4>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: brand.primary, margin: '12px 0', textAlign: 'center' }}>{data.vaultCount} DOCUMENTS</div>
                    <button style={{ ...addButton, display: 'block', margin: '0 auto' }}><i className="fas fa-plus"></i> Add documents</button>
                </div>
                
                        {/* Market Trends – live data (filtered by portfolio/preferences) */}
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
                                <TrendRow key={i} country={trend.country} status={trend.status} color={getStatusColor(trend.status) || trend.color} price={trend.yoyPercent != null && trend.yoyPercent !== '' ? trend.yoyPercent : trend.priceChange} monthlyData={trend.monthlyData} sourceText={trend.sourceText} />
                            ))
                        ) : (
                            <div style={{ fontSize: '12px', color: brand.muted, padding: '12px 0', textAlign: 'center' }}>No trends for your markets yet. Add countries in your portfolio or preferences to see trends here.</div>
                        )}
                        </div>
                    </div>
                
                        {/* News Feeds – image + title + source link */}
                            <div style={cardStyleSmall}>
                                <h4 style={cardTitle}>News Feeds</h4>
                            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                {data.newsFeeds && data.newsFeeds.length > 0 ? (
                                    data.newsFeeds.map((news, i) => {
                                        const url = news.sourceUrl || news.link || news.url;
                                        const hasLink = url && isNewsOrPropertySourceUrl(url);
                                        return (
                                            <div key={newsId(news) || i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #eee', alignItems: 'flex-start' }}>
                                                {news.image && (
                                                    <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9' }}>
                                                        {hasLink ? (
                                                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                                                                <img src={news.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </a>
                                                        ) : news._id ? (
                                                            <Link to={`/news/${news._id}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                                                                <img src={news.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </Link>
                                                        ) : (
                                                            <img src={news.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        )}
                            </div>
                                                )}
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontSize: '12px', fontWeight: '600', color: brand.text, marginBottom: '4px' }}>{news.title}</div>
                                                    {(news.aiSummary || news.desc) && (
                                                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: brand.muted, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{news.aiSummary || news.desc}</p>
                                                    )}
                                                    {hasLink ? (
                                                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: brand.primary, wordBreak: 'break-all' }}>Source: {url}</a>
                                                    ) : news._id ? (
                                                        <Link to={`/news/${news._id}`} style={{ fontSize: '11px', color: brand.primary }}>View article</Link>
                                                    ) : (
                                                        <span style={{ fontSize: '11px', color: brand.muted }}>No link</span>
                                                    )}
                        </div>
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
                <div className="dashboard-container" style={{ display: 'flex', backgroundColor: '#f4f7f9', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <Sidebar />
                    {/* Buyer, Investor, Seller, and Agent share the same dashboard view */}
                    {user?.role?.toLowerCase() === 'agency' ? renderAgencyView() : renderInvestorView()}
                </div>
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

/** Centered stat only (no chart), like Portfolio "REAL ESTATES IN MY IPM PORTFOLIO". */
const StatBoxCentered = ({ label, value, subtext }) => (
    <div style={{ background: 'white', padding: '16px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', textAlign: 'center' }}>{label}</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '48px' }}>
            <div style={{ fontSize: '42px', fontWeight: '800', color: '#115e59', lineHeight: '1' }}>{value}</div>
        </div>
        {subtext ? <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', marginTop: '2px' }}>{subtext}</div> : null}
    </div>
);

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
const MONTH_LABELS_LEGACY = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Monotonic 12-month index (Jan=100, Dec=100+YoY%). Illustrative only. */
function getMonthlyTrendDataLegacy(priceChange) {
    const pct = parseFloat(String(priceChange || '0').replace(/[^0-9.-]/g, '')) || 0;
    const endValue = 100 + pct;
    const seed = Math.abs(pct * 10) % 7 + 1;
    const points = [100];
    for (let i = 1; i < 12; i++) {
        const t = i / 11;
        const linear = 100 + t * (endValue - 100);
        const wiggle = (Math.sin(seed * i) * 0.015) * (endValue - 100);
        points.push(linear + wiggle);
    }
    return MONTH_LABELS_LEGACY.map((month, i) => ({
        month,
        value: Math.round((points[i] ?? 100) * 10) / 10
    }));
}
const TrendRow = ({ country, status, color, price, monthlyData, sourceText }) => {
    const hasRealData = monthlyData && Array.isArray(monthlyData) && monthlyData.length > 0;
    const chartData = hasRealData
        ? monthlyData.map((d, i) => ({ month: d.month || MONTH_LABELS_LEGACY[i] || '', value: Number(d.value) }))
        : getMonthlyTrendDataLegacy(price);
    return (
        <div style={{ padding: '10px 0', borderBottom: '1px solid #f1f1f1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{country} <span style={{ fontSize: '10px', color: '#999' }}>{price}</span></div>
                <span style={{ fontSize: '10px', color: 'white', background: color, padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>{(status || '').toUpperCase()}</span>
            </div>
            <p style={{ margin: 0, fontSize: '10px', color: brand.muted, lineHeight: 1.3 }}>{getTrendDescription(status, price)}</p>
            <div style={{ marginTop: '6px', height: 52, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke={brand.muted} />
                        <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip contentStyle={{ fontSize: '11px', padding: '6px 10px', maxWidth: 320 }} formatter={(value) => [hasRealData ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : `${Number(value).toFixed(1)}`, 'Index']} labelFormatter={(label) => label} labelStyle={{ fontWeight: 'bold' }} />
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

const cardStyle = { background: 'white', padding: '25px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative' };
const cardStyleSmall = { background: 'white', padding: '14px 18px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative' };
const cardTitle = { margin: 0, fontSize: '12px', color: brand.muted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', textAlign: 'center' };
const whiteCard = { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative' };
const cardHeaderSmall = { fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px', textAlign: 'center' };
const mapContainer = { flex: 1, position: 'relative', minHeight: 160, height: 160, background: '#f8fafc', borderRadius: '8px', overflow: 'hidden' };
const earningRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8f9fa', flexShrink: 0 };
const addButton = { border: 'none', background: '#eee', color: brand.muted, padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };

export default DashboardLegacy;