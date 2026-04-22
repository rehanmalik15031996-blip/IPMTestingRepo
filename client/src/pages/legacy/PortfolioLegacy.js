import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../config/api';
import { useIsMobile } from '../../hooks/useMediaQuery';
import PropertyUploadForm from '../../components/PropertyUploadForm';
import { showNotification } from '../../components/NotificationManager';
import { getPropertyLimitForUser } from '../../utils/planLimits';

let googleMapsScriptPromise = null;
const minimalMapStyles = [
    { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
    { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#a3a3a3' }] },
    { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] }
];
const loadGoogleMapsScript = (apiKey) => {
    if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key'));
    if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
    if (window.google?.maps) return Promise.resolve(window.google);

    if (!googleMapsScriptPromise) {
        googleMapsScriptPromise = new Promise((resolve, reject) => {
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
    return googleMapsScriptPromise;
};
const DEFAULT_MAP_CENTER = { lat: 15, lng: 0 };
const DEFAULT_MAP_ZOOM = 0;

/** Format a numeric value as K/M for display (e.g. 44322 -> "44.3K", 2111111 -> "2.1M"). */
const formatCompactNumber = (num) => {
    const v = typeof num === 'number' ? num : parseFloat(String(num).replace(/[^0-9.]/g, '')) || 0;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toLocaleString();
};

/** Format price string or number as "USD 44.3K" / "USD 2.1M". Preserves existing "USD" prefix if present. */
const formatPriceDisplay = (price) => {
    if (price == null || price === '') return '—';
    const str = String(price);
    const currency = /^[A-Z]{3}\s*/i.test(str) ? str.match(/^[A-Z]{3}/i)[0] : 'USD';
    const num = parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
    if (num === 0) return '—';
    return `${currency} ${formatCompactNumber(num)}`;
};

/** Format area number with unit (e.g. 22222 -> "22.2K sqft"). */
const formatAreaDisplay = (area, unit = 'sqft') => {
    if (area == null || area === '') return '—';
    const v = typeof area === 'number' ? area : parseFloat(String(area).replace(/[^0-9.]/g, '')) || 0;
    if (v === 0) return '—';
    return `${formatCompactNumber(v)} ${unit}`;
};

const PortfolioLegacy = () => {
    const isMobile = useIsMobile();
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));
    const navigate = useNavigate();
    
    // --- STATE ---
    const [holdings, setHoldings] = useState([]);
    const [stats, setStats] = useState({ totalValue: 0, avgRoi: 0, totalCount: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(''); 

    // --- MODAL STATE ---
    const [showAddModal, setShowAddModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [availableProps] = useState([]);
    const [investAmount, setInvestAmount] = useState('');
    const [selectedPropToAdd, setSelectedPropToAdd] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editInitialData, setEditInitialData] = useState(null);
    const [editPropertyId, setEditPropertyId] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState(null);
    const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const mapContainerNodeRef = useRef(null); // node the map was created in (to detect remount)
    const markersRef = useRef([]);
    const spotlightTitleRef = useRef(null);
    const [spotlightTitleFontSize, setSpotlightTitleFontSize] = useState(16);
    const [occupancyFilter, setOccupancyFilter] = useState(null); // null = all; else primary_home | holiday_real_estate | long_term_rentals | short_term_rentals

    const getHoldingAddress = (holding) => {
        if (!holding) return null;
        return (
            holding.location ||
            holding.details?.location ||
            (holding.details?.locationDetails && [
                holding.details.locationDetails.streetAddress,
                holding.details.locationDetails.city,
                holding.details.locationDetails.country
            ].filter(Boolean).join(', ')) ||
            null
        );
    };

    /** Remove trailing duplicate "City, Country" from title/address so we don't show e.g. "...South Africa, Bellville, South Africa". */
    const dedupePropertyTitle = (title, locationDetails) => {
        if (!title || !locationDetails) return title || 'Untitled Property';
        const city = locationDetails.city || '';
        const country = locationDetails.country || '';
        const suffix = [city, country].filter(Boolean).join(', ');
        if (!suffix) return title;
        const trailing = ', ' + suffix;
        if (title.endsWith(trailing)) return title.slice(0, -trailing.length).trim();
        return title;
    };
    const dedupeAddress = (streetAddress, city, country) => {
        const raw = [streetAddress, city, country].filter(Boolean).join(', ');
        const suffix = [city, country].filter(Boolean).join(', ');
        if (!suffix || !raw.endsWith(', ' + suffix)) return raw;
        return raw.slice(0, -(', ' + suffix).length).trim();
    };

    // --- FETCH DATA ---
    const userId = user?._id;
    const fetchPortfolio = useCallback(async () => {
        try {
            console.log("Fetching Portfolio for:", userId);
            const res = await api.get(`/api/users/${userId}?type=dashboard`);
            
            console.log("✅ API Response:", res.data); // CHECK CONSOLE FOR THIS

            const portfolioList = res.data.portfolio || [];
            const portfolioStats = res.data.stats || {};

            setHoldings(portfolioList);
            
            setStats({
                totalValue: Number(portfolioStats.currentValue) || 0,
                avgRoi: Number(portfolioStats.avgRoi) || 0,
                totalCount: portfolioList.length
            });
            setLoading(false);
            return portfolioList;
        } catch (err) { 
            console.error("❌ Error fetching portfolio:", err);
            setLoading(false);
            return null;
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        fetchPortfolio();
    }, [userId, fetchPortfolio]);

    // Reset title font size when selected property changes
    useEffect(() => {
        setSpotlightTitleFontSize(16);
    }, [selectedHolding]);

    // Shrink spotlight title font so it fits on one line
    useEffect(() => {
        const el = spotlightTitleRef.current;
        if (!el || !selectedHolding) return;
        if (el.scrollWidth > el.clientWidth && spotlightTitleFontSize > 10) {
            setSpotlightTitleFontSize((s) => s - 1);
        }
    }, [selectedHolding, spotlightTitleFontSize]);

    useEffect(() => {
        const list = Array.isArray(holdings) ? holdings : [];
        if (list.length === 0) setSelectedHolding(null);
        else setSelectedHolding((prev) => {
            if (!prev) return list[0];
            const prevId = prev._id || prev.details?._id;
            if (!list.some((h) => (h._id || h.details?._id) === prevId)) return list[0];
            return prev;
        });
    }, [holdings]);

    useEffect(() => {
        window.dispatchEvent(new Event('resize'));
    }, [selectedHolding]);

    useEffect(() => {
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return;

        let cancelled = false;
        let resizeTimer = null;
        let refreshMap = null;
        let handleVisibility = null;
        const list = Array.isArray(holdings) ? holdings : [];
        const spotlightAddress = getHoldingAddress(selectedHolding) || (list[0] ? getHoldingAddress(list[0]) : null);

        const initOrResizeMap = () => {
            const container = mapContainerRef.current;
            if (!container || !window.google?.maps) return;

            const mapContainerWasReplaced = mapRef.current && mapContainerNodeRef.current && !document.contains(mapContainerNodeRef.current);
            if (mapContainerWasReplaced) {
                mapRef.current = null;
                mapContainerNodeRef.current = null;
                markersRef.current = [];
            }

            if (mapRef.current) {
                const map = mapRef.current;
                try {
                    markersRef.current.forEach((m) => m.setMap(null));
                    markersRef.current = [];
                    if (spotlightAddress) {
                        const geocoder = new window.google.maps.Geocoder();
                        geocoder.geocode({ address: spotlightAddress }, (results, status) => {
                            if (cancelled || !mapRef.current) return;
                            if (status === 'OK' && results?.[0]) {
                                const position = results[0].geometry.location;
                                const g = window.google.maps;
                                const marker = new g.Marker({
                                    map: mapRef.current,
                                    position,
                                    icon: {
                                        url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ffc801"/></svg>'),
                                        scaledSize: new g.Size(40, 40),
                                        anchor: new g.Point(12, 24)
                                    }
                                });
                                markersRef.current.push(marker);
                                mapRef.current.setCenter(position);
                                mapRef.current.setZoom(14);
                            }
                            setTimeout(() => {
                                if (mapRef.current) {
                                    window.google.maps.event.trigger(mapRef.current, 'resize');
                                }
                            }, 300);
                        });
                    } else {
                        mapRef.current.setCenter(DEFAULT_MAP_CENTER);
                        mapRef.current.setZoom(DEFAULT_MAP_ZOOM);
                        setTimeout(() => window.google.maps.event.trigger(mapRef.current, 'resize'), 300);
                    }
                } catch (_) { /* no-op */ }
                return;
            }

            mapRef.current = new window.google.maps.Map(container, {
                center: DEFAULT_MAP_CENTER,
                zoom: DEFAULT_MAP_ZOOM,
                minZoom: 0,
                maxZoom: 18,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: true,
                clickableIcons: false,
                styles: minimalMapStyles
            });
            mapContainerNodeRef.current = container;

            refreshMap = () => {
                if (!mapRef.current) return;
                window.google.maps.event.trigger(mapRef.current, 'resize');
                mapRef.current.setCenter(mapRef.current.getCenter() || DEFAULT_MAP_CENTER);
            };
            resizeTimer = setTimeout(refreshMap, 150);
            setTimeout(refreshMap, 400);
            handleVisibility = () => {
                if (document.visibilityState === 'visible') setTimeout(refreshMap, 50);
            };
            window.addEventListener('resize', refreshMap);
            document.addEventListener('visibilitychange', handleVisibility);

            markersRef.current.forEach((m) => m.setMap(null));
            markersRef.current = [];

            if (!spotlightAddress) {
                mapRef.current.setCenter(DEFAULT_MAP_CENTER);
                mapRef.current.setZoom(DEFAULT_MAP_ZOOM);
                return;
            }

            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: spotlightAddress }, (results, status) => {
                if (cancelled) return;
if (status === 'OK' && results?.[0]) {
                                const position = results[0].geometry.location;
                                const g = window.google.maps;
                                const marker = new g.Marker({
                                    map: mapRef.current,
                                    position,
                                    icon: {
                                        url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ffc801"/></svg>'),
                                        scaledSize: new g.Size(40, 40),
                                        anchor: new g.Point(12, 24)
                                    }
                                });
                                markersRef.current.push(marker);
                                mapRef.current.setCenter(position);
                                mapRef.current.setZoom(14);
                }
            });
        };

        loadGoogleMapsScript(apiKey)
            .then(() => {
                if (cancelled) return;
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (cancelled) return;
                        initOrResizeMap();
                    }, 150);
                });
            })
            .catch(() => {});

        return () => {
            cancelled = true;
            if (resizeTimer) clearTimeout(resizeTimer);
            if (refreshMap) window.removeEventListener('resize', refreshMap);
            if (handleVisibility) document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [holdings, selectedHolding]);

    // Keep user in sync if localStorage changes (e.g., role updates)
    useEffect(() => {
        const handleStorage = (event) => {
            if (event.key !== 'user') return;
            try {
                setUser(event.newValue ? JSON.parse(event.newValue) : null);
            } catch {
                setUser(null);
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // --- HANDLERS ---
    const handleAddToPortfolio = async () => {
        if (!selectedPropToAdd) return alert("Select a property first");
        
        const investment = parseFloat(investAmount) || parseFloat(selectedPropToAdd.price.replace(/[^0-9.]/g, ''));
        
        const newHolding = {
            propertyTitle: selectedPropToAdd.title,
            location: selectedPropToAdd.location,
            investedAmount: investment,
            currentValue: investment * 1.08, // Mock 8% growth
            roi: 7.1, // Mock ROI
            status: 'Active',
            photo: selectedPropToAdd.imageUrl,
            details: {
                ...(selectedPropToAdd.details || {}),
                listingType: selectedPropToAdd.listingType || selectedPropToAdd.details?.listingType,
                propertyCategory: selectedPropToAdd.propertyCategory || selectedPropToAdd.details?.propertyCategory,
                propertyType: selectedPropToAdd.propertyType || selectedPropToAdd.type || selectedPropToAdd.details?.propertyType,
                price: selectedPropToAdd.price || selectedPropToAdd.details?.price,
                specs: selectedPropToAdd.specs || selectedPropToAdd.details?.specs,
                media: selectedPropToAdd.media || selectedPropToAdd.details?.media,
                imageUrl: selectedPropToAdd.imageUrl || selectedPropToAdd.details?.imageUrl,
                locationDetails: selectedPropToAdd.locationDetails || selectedPropToAdd.details?.locationDetails,
                esgRating: selectedPropToAdd.esgRating || selectedPropToAdd.details?.esgRating,
                occupancy: selectedPropToAdd.occupancy || selectedPropToAdd.details?.occupancy,
                ltv: selectedPropToAdd.ltv || selectedPropToAdd.details?.ltv
            }
        };

        try {
            const res = await api.put(`/api/users/${user._id}`, {
                action: 'add-portfolio',
                propertyData: newHolding
            });

            if (res.data.success) {
                alert("✅ Property Added Successfully!");
                fetchPortfolio(); // Refresh data from server
                setShowAddModal(false);
                setSelectedPropToAdd(null);
                setInvestAmount('');
            }
        } catch (err) {
            alert("Error adding property");
        }
    };

    const handleEditProperty = async (holding) => {
        const propertyId = holding?.details?._id || holding?._id;
        if (!propertyId) {
            showNotification('Only uploaded properties can be edited right now.', 'warning');
            return;
        }
        setEditLoading(true);
        try {
            let res = await api.get('/api/properties', { params: { id: propertyId } });
            if (Array.isArray(res.data)) {
                throw new Error('Invalid property response');
            }
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
                console.error('Failed to load property for edit:', fallbackErr);
                showNotification('Unable to load property details for editing.', 'error');
            }
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteClick = (holding) => {
        const propertyId = holding?.details?._id || holding?._id;
        if (!propertyId) {
            showNotification('Only uploaded properties can be deleted.', 'warning');
            return;
        }
        setPropertyToDelete(holding);
        setDeleteConfirmChecked(false);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmChecked || !propertyToDelete) return;
        const propertyId = propertyToDelete?.details?._id || propertyToDelete?._id;
        if (!propertyId) return;
        setDeleteLoading(true);
        try {
            await api.delete(`/api/properties/${encodeURIComponent(propertyId)}`);
            showNotification('Property deleted successfully.', 'success');
            setShowDeleteModal(false);
            setPropertyToDelete(null);
            setDeleteConfirmChecked(false);
            if (selectedHolding && (selectedHolding?.details?._id === propertyId || selectedHolding?._id === propertyId)) {
                setSelectedHolding(null);
            }
            fetchPortfolio();
        } catch (err) {
            console.error('Delete property error:', err);
            showNotification(err.response?.data?.message || 'Failed to delete property.', 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Count only properties uploaded by user (for seller/agent limits)
    const uploadedCount = holdings.filter((h) => h.details?.isUploaded === true).length;

    const OCCUPANCY_OPTIONS = [
        { value: null, label: 'All' },
        { value: 'primary_home', label: 'Primary Home' },
        { value: 'holiday_real_estate', label: 'Holiday Real Estate' },
        { value: 'long_term_rentals', label: 'Long Term Rentals' },
        { value: 'short_term_rentals', label: 'Short Term Rentals' }
    ];
    const holdingsList = (() => {
        const list = Array.isArray(holdings) ? holdings : [];
        if (occupancyFilter == null) return list;
        return list.filter((h) => (h.details?.investmentType || h.investmentType || '').toLowerCase() === occupancyFilter);
    })();

    if (loading) return <div className="dashboard-main" style={{ padding: isMobile ? '16px' : '40px' }}>Loading Portfolio...</div>;

    const isBuyer = user?.role?.toLowerCase() === 'buyer';
    const isInvestor = user?.role?.toLowerCase() === 'investor';
    const isSeller = user?.role?.toLowerCase() === 'seller';
    const isLandlord = user?.role?.toLowerCase() === 'landlord';
    const isAgent = user?.role?.toLowerCase() === 'agent' || user?.role?.toLowerCase() === 'independent_agent' || user?.role?.toLowerCase() === 'agency_agent';
    const isAgency = user?.role?.toLowerCase() === 'agency';
    const isClientOneProperty = isBuyer || isSeller || isInvestor || isLandlord;
    const canUpload = isSeller || isBuyer || isInvestor || isLandlord || isAgent || isAgency;
    const propertyLimit = getPropertyLimitForUser(user);
    const uploadDisabled = canUpload && uploadedCount >= propertyLimit;

    return (
        <div style={{ display: 'flex', fontFamily: "'Poppins', sans-serif", background: '#f0f4f4', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Sidebar />
            
            <main className="dashboard-main" style={{ flex: 1, padding: isMobile ? '16px' : '30px', color: '#1f3a3d', position: 'relative', minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* HEADER */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Good day, {user?.name}!</h1>
                        </div>
                        <form 
                            style={{ ...searchBar, display: 'none' }} 
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (searchQuery.trim()) {
                                    navigate('/collection', { state: { searchQuery: searchQuery.trim() } });
                                }
                            }}
                        >
                            <i className="fas fa-search" style={{color:'#11575C'}}></i>
                            <input 
                                type="text"
                                placeholder="Describe your ideal next investment" 
                                style={searchInput}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </form>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {canUpload && (
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                                {uploadedCount} of {propertyLimit} {propertyLimit === 1 ? 'property' : 'properties'}
                                {uploadedCount < propertyLimit && (
                                    <span style={{ color: '#94a3b8', fontWeight: '400' }}> ({propertyLimit - uploadedCount} left)</span>
                                )}
                            </span>
                        )}
                        <button 
                            style={(uploadDisabled || !canUpload) ? { ...addBtn, background:'#11575C', opacity: 0.6, cursor: 'not-allowed' } : { ...addBtn, background:'#11575C' }} 
                            onClick={() => {
                                if (!canUpload) return;
                                if (uploadedCount >= propertyLimit) {
                                    showNotification(`You can have up to ${propertyLimit} ${propertyLimit === 1 ? 'property' : 'properties'} on your plan. Delete one to add another.`, 'error');
                                    return;
                                }
                                setShowUploadModal(true);
                            }}
                            disabled={uploadDisabled || !canUpload}
                        >
                            <i className="fas fa-upload"></i> Upload Property
                        </button>
                    </div>
                </header>

                {/* MAIN DASHBOARD GRID - fixed height so left list scrolls instead of stretching page */}
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...dashboardGrid, gridTemplateColumns: isMobile ? '1fr' : '340px 1fr', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                    
                    {/* --- LEFT COLUMN: stats + filters + property list --- */}
                    <div style={leftCol}>
                        <div style={{ ...whiteCard, textAlign: 'center' }}>
                            <div style={cardHeaderSmall}>{(isBuyer || isInvestor) ? 'REAL ESTATE Linked to MY IPM portfolio' : 'REAL ESTATES IN MY IPM PORTFOLIO'}</div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60px' }}>
                                <div style={{ fontSize: '56px', fontWeight: '800', color: '#11575C', lineHeight: '1' }}>{stats.totalCount}</div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={cardHeaderSmall}>VIEW BY OCCUPANCY</div>
                            <div style={{ ...filterStack, alignItems: 'center' }}>
                                {OCCUPANCY_OPTIONS.map(({ value, label }) => {
                                    const isActive = occupancyFilter === value;
                                    return (
                                        <button
                                            key={value ?? 'all'}
                                            type="button"
                                            style={{
                                                ...filterBtn,
                                                background: isActive ? '#11575C' : 'white',
                                                color: isActive ? 'white' : '#64748b',
                                                borderColor: isActive ? '#11575C' : '#e2e8f0'
                                            }}
                                            onClick={() => setOccupancyFilter(value)}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={cardHeaderSmall}>YOUR PROPERTIES</div>
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '6px', WebkitOverflowScrolling: 'touch', alignContent: 'flex-start' }}>
                                {holdingsList.length > 0 ? holdingsList.map((holding) => {
                                    const details = holding.details || {};
                                    const locationDetails = details.locationDetails || {};
                                    const priceVal = details.price || holding.price;
                                    const propId = details._id || holding._id;
                                    const primaryImage = holding.photo && holding.photo.length > 5 ? holding.photo : `https://images.unsplash.com/photo-1600596542815-2a4d9fdb2243?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`;
                                    const address = dedupeAddress(locationDetails.streetAddress, locationDetails.city, locationDetails.country) || holding.location || '—';
                                    const isSelected = (selectedHolding?._id || selectedHolding?.details?._id) === (holding._id || holding.details?._id);
                                    return (
                                        <div
                                            key={holding._id || `${holding.propertyTitle}-${holding.location}`}
                                            style={{
                                                ...propertyListTile,
                                                borderColor: isSelected ? '#11575C' : '#e2e8f0',
                                                background: isSelected ? '#f0fdfa' : '#fff',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setSelectedHolding(holding)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedHolding(holding); } }}
                                        >
                                            <div style={{ ...propertyListTileImage, backgroundImage: `url('${primaryImage}')` }} />
                                            <div style={propertyListTileBody}>
                                                <div style={propertyListTileTitle}>{isClientOneProperty ? (address !== '—' ? address : (dedupePropertyTitle(holding.propertyTitle, locationDetails) || 'Untitled Property')) : (dedupePropertyTitle(holding.propertyTitle, locationDetails) || 'Untitled Property')}</div>
                                                {!isClientOneProperty && <div style={propertyListTileAddress}>Address: {address}</div>}
                                                <div style={propertyListTilePrice}>{isClientOneProperty ? 'Purchase Price: ' : 'Price: '}{formatPriceDisplay(priceVal)}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                                                    {propId ? (
                                                        <Link to={`/property/${propId}`} style={{ fontSize: '11px', fontWeight: '600', color: '#11575C', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>View property</Link>
                                                    ) : (
                                                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>View property</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No properties yet. Upload one to get started.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT COLUMN: spotlight block (title + stats + map + selected property detail) --- */}
                    <div style={{ ...rightCol, flex: 1 }}>
                        <div style={spotlightBlock}>
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <h2 style={{ color: '#11575C', fontSize: '18px', fontWeight: '800', margin: 0, padding: '20px 20px 0 20px', textAlign: 'center' }}>Property Spotlight</h2>
                            
                            <div style={{ padding: isMobile ? '16px' : '20px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                                <div style={{ ...whiteCard, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                    <div style={cardHeaderSmall}>MY PROPERTY'S PERFORMANCE</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80px' }}>
                                        <div style={{ fontSize: '42px', fontWeight: '800', color: '#11575C' }}>
                                            {selectedHolding != null
                                                ? `${Number(selectedHolding.roi ?? 0).toFixed(1)}%`
                                                : holdings.length > 0
                                                    ? `${Number(stats.avgRoi).toFixed(1)}%`
                                                    : '—'}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#aaa', fontWeight: 'bold', letterSpacing: '1px', marginTop: '4px' }}>
                                            {selectedHolding ? 'ANNUAL ROI (this property)' : (holdings.length > 0 ? 'ANNUAL ROI (portfolio avg)' : 'ANNUAL')}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ ...whiteCard, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                    <div style={cardHeaderSmall}>Current Value</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80px' }}>
                                        <div style={{ fontSize: '42px', fontWeight: '800', color: '#11575C' }}>
                                            {selectedHolding
                                                ? formatCompactNumber(
                                                    Number(selectedHolding.currentValue) || Number(selectedHolding.investedAmount) || parseFloat(String(selectedHolding.details?.price || '0').replace(/[^0-9.]/g, '')) || 0
                                                )
                                                : '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div key="portfolio-region-map-section" style={{ padding: '0 20px 20px', flex: '0 0 auto', height: '240px', minHeight: 240, width: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={cardHeaderSmall}>MY PROPERTIES BY REGION</div>
                                <div style={{ ...mapContainer, flex: 1, height: 200, minHeight: 200, width: '100%' }}>
                                    {process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? (
                                        <div key="portfolio-region-map" ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', minHeight: 200, height: '100%' }} />
                                    ) : (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: 8, color: '#64748b', fontSize: 13 }}>
                                            Map (set REACT_APP_GOOGLE_MAPS_API_KEY to enable)
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedHolding && holdingsList.length > 0 ? (() => {
                                const holding = selectedHolding;
                                const details = holding.details || {};
                                const specs = details.specs || holding.specs || {};
                                const locationDetails = details.locationDetails || {};
                                const countryValue = locationDetails.country || '';
                                const spotlightAddress = dedupeAddress(locationDetails.streetAddress, locationDetails.city, countryValue) || holding.location || '—';
                                const listingTypeLabel = details.listingType || holding.listingType || '-';
                                const propertyTypeLabel = details.propertyType || details.type || holding.type || '-';
                                const priceValue = details.price || holding.price || '-';
                                const cityValue = locationDetails.city || '';
                                const investmentType = details.investmentType || holding.investmentType || '';
                                const occupancyLabel = OCCUPANCY_OPTIONS.find((o) => o.value === investmentType)?.label || investmentType || '-';
                                const bedroomsValue = specs.beds ?? '';
                                const bathroomsValue = specs.baths ?? '';
                                const areaValue = specs.sqft ?? '';
                                const primaryImage = holding.photo && holding.photo.length > 5 ? holding.photo : `https://images.unsplash.com/photo-1600596542815-2a4d9fdb2243?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`;
                                const detailLines = [
                                    { label: 'Type', value: listingTypeLabel || '-' },
                                    { label: 'Purchase Price', value: formatPriceDisplay(priceValue) },
                                    { label: 'Property Type', value: propertyTypeLabel || '-' },
                                    { label: 'City', value: cityValue || '-' },
                                    { label: 'Country', value: countryValue || '-' },
                                    { label: 'Bedrooms', value: bedroomsValue !== '' ? String(bedroomsValue) : '-' },
                                    { label: 'Bathrooms', value: bathroomsValue !== '' ? String(bathroomsValue) : '-' },
                                    { label: 'Property Area', value: areaValue !== '' && areaValue != null ? formatAreaDisplay(areaValue) : '-' },
                                    { label: 'Occupancy', value: occupancyLabel }
                                ];
                                const canEdit = Boolean(holding?.details?._id && holding?.details?.isUploaded);
                                return (
                                    <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 20px 16px' }}>
                                        <div style={{ display: 'flex', gap: isMobile ? '12px' : '20px', flexWrap: 'wrap', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
                                                <div style={{ ...portfolioImage, width: isMobile ? '100%' : '280px', minHeight: '180px', borderRadius: '12px', backgroundImage: `url('${primaryImage}')` }} />
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        style={portfolioDeleteBtn}
                                                        onClick={() => handleDeleteClick(holding)}
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        style={!canEdit || editLoading ? { ...portfolioEditBtn, opacity: 0.6, cursor: 'not-allowed' } : { ...portfolioEditBtn }}
                                                        onClick={() => handleEditProperty(holding)}
                                                        disabled={!canEdit || editLoading}
                                                    >
                                                        Edit Property
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div
                                                    ref={spotlightTitleRef}
                                                    style={{
                                                        fontSize: `${spotlightTitleFontSize}px`,
                                                        fontWeight: '700',
                                                        color: '#1f3a3d',
                                                        marginBottom: '4px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        minWidth: 0
                                                    }}
                                                    title={isClientOneProperty ? (spotlightAddress !== '—' ? spotlightAddress : (dedupePropertyTitle(holding.propertyTitle, locationDetails) || 'Untitled Property')) : (dedupePropertyTitle(holding.propertyTitle, locationDetails) || 'Untitled Property')}
                                                >
                                                    {isClientOneProperty ? (spotlightAddress !== '—' ? spotlightAddress : (dedupePropertyTitle(holding.propertyTitle, locationDetails) || 'Untitled Property')) : (dedupePropertyTitle(holding.propertyTitle, locationDetails) || 'Untitled Property')}
                                                </div>
                                                {!isClientOneProperty && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{spotlightAddress}</div>}
                                                {detailLines.map((item) => (
                                                    <div key={item.label} style={portfolioDetail}>
                                                        <span style={portfolioDetailLabel}>{item.label}:</span>
                                                        <span style={portfolioDetailValue}>{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div style={{ borderTop: '1px solid #e2e8f0', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                    <i className="fas fa-hand-pointer" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
                                    <p style={{ margin: 0, fontSize: '14px' }}>Select a property from the list to see details here.</p>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </main>

            {/* UPLOAD PROPERTY MODAL */}
            {showUploadModal && (
                <PropertyUploadForm
                    isOpen={showUploadModal}
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={(property) => {
                        showNotification('Property uploaded successfully!', 'success');
                        fetchPortfolio(); // Refresh portfolio
                    }}
                />
            )}

            {/* DELETE PROPERTY CONFIRMATION MODAL */}
            {showDeleteModal && propertyToDelete && (
                <div style={modalOverlay} onClick={() => !deleteLoading && (setShowDeleteModal(false), setPropertyToDelete(null), setDeleteConfirmChecked(false))}>
                    <div style={modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', color: '#1f3a3d', fontSize: '18px' }}>Delete property</h3>
                        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '14px' }}>
                            This will remove the property from the database. All dashboards, totals, and tiles will update. This cannot be undone.
                        </p>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
                            <input
                                type="checkbox"
                                checked={deleteConfirmChecked}
                                onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                                disabled={deleteLoading}
                            />
                            I confirm I want to delete this property
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                style={cancelBtn}
                                onClick={() => { setShowDeleteModal(false); setPropertyToDelete(null); setDeleteConfirmChecked(false); }}
                                disabled={deleteLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                style={{ ...portfolioDeleteBtn, padding: '10px 20px' }}
                                onClick={handleDeleteConfirm}
                                disabled={!deleteConfirmChecked || deleteLoading}
                            >
                                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT PROPERTY MODAL */}
            {showEditModal && (
                <PropertyUploadForm
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditInitialData(null);
                        setEditPropertyId(null);
                    }}
                    onSuccess={async () => {
                        showNotification('Property updated successfully!', 'success');
                        const idToRefresh = editPropertyId;
                        setShowEditModal(false);
                        setEditInitialData(null);
                        setEditPropertyId(null);
                        const list = await fetchPortfolio();
                        if (idToRefresh && list && list.length > 0) {
                            const updated = list.find((h) => (h.details?._id || h._id) === idToRefresh);
                            if (updated) setSelectedHolding(updated);
                        }
                    }}
                    initialData={editInitialData}
                    propertyId={editPropertyId}
                />
            )}

            {/* ADD TO PORTFOLIO MODAL */}
            {showAddModal && (
                <div style={modalOverlay}>
                    <div style={modalContent}>
                        <h2 style={{color:'#11575C', marginBottom:'15px', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>Add Property</h2>
                        
                        <div style={{maxHeight:'300px', overflowY:'auto', marginBottom:'20px', background:'#f9f9f9', borderRadius:'8px'}}>
                            {availableProps.map(p => (
                                <div 
                                    key={p._id} 
                                    onClick={() => { setSelectedPropToAdd(p); setInvestAmount(p.price.replace(/[^0-9.]/g, '')); }}
                                    style={{
                                        padding:'10px', borderBottom:'1px solid #eee', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px',
                                        background: selectedPropToAdd?._id === p._id ? '#dcfce7' : 'transparent'
                                    }}
                                >
                                    <img src={p.imageUrl} alt="" style={{width:'40px', height:'40px', borderRadius:'4px', objectFit:'cover'}} />
                                    <div>
                                        <div style={{fontSize:'13px', fontWeight:'bold', color:'#333'}}>{p.title}</div>
                                        <div style={{fontSize:'11px', color:'#888'}}>{formatPriceDisplay(p.price)}</div>
                                    </div>
                                    {selectedPropToAdd?._id === p._id && <i className="fas fa-check-circle" style={{marginLeft:'auto', color:'#11575C'}}></i>}
                                </div>
                            ))}
                        </div>

                        {selectedPropToAdd && (
                            <div style={{marginBottom:'20px'}}>
                                <label style={{fontSize:'12px', fontWeight:'bold', color:'#555'}}>Invested Amount ($)</label>
                                <input type="number" value={investAmount} onChange={(e) => setInvestAmount(e.target.value)} style={inputStyle} />
                            </div>
                        )}

                        <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                            <button onClick={() => setShowAddModal(false)} style={cancelBtn}>Cancel</button>
                            <button onClick={handleAddToPortfolio} style={saveBtn} disabled={!selectedPropToAdd}>Add Property</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS & STYLES ---

const whiteCard = { background:'white', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.04)', position:'relative' };
const cardHeaderSmall = { fontSize:'10px', fontWeight:'bold', color:'#9ca3af', textTransform:'uppercase', marginBottom:'10px', letterSpacing:'0.5px', textAlign:'center' };

const searchBar = { display:'flex', alignItems:'center', background:'white', padding:'8px 20px', borderRadius:'30px', width:'350px', gap:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.03)' };
const searchInput = { border:'none', outline:'none', width:'100%', fontSize:'12px', color:'#555' };

const addBtn = { background:'#9ca3af', color:'white', border:'none', padding:'8px 16px', borderRadius:'30px', cursor:'pointer', fontWeight:'bold', fontSize:'12px', display:'flex', alignItems:'center', gap:'8px' };

const dashboardGrid = { display:'grid', gridTemplateColumns:'340px 1fr', gap:'25px', alignItems:'stretch', minHeight:0 };
const leftCol = { display:'flex', flexDirection:'column', gap:'16px', minHeight:0, overflow:'hidden' };
const rightCol = { display:'flex', flexDirection:'column', gap:0, minHeight:0 };
const spotlightBlock = { border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 };

const mapContainer = { flex:1, position:'relative', minHeight:'200px', background:'#f8fafc', borderRadius:'8px', overflow:'hidden' };

const filterStack = { display:'flex', flexDirection:'column', gap:'8px' };
const filterBtn = { padding:'10px', borderRadius:'20px', border:'1px solid #e2e8f0', background:'white', fontSize:'10px', fontWeight:'bold', color:'#64748b', cursor:'pointer', textAlign:'center', letterSpacing:'0.5px' };
const filterBtnDisabled = { ...filterBtn, opacity: 0.6, cursor: 'not-allowed', pointerEvents: 'none' };

const propertyListTile = { display: 'flex', alignItems: 'center', width: '100%', minHeight: 110, flexShrink: 0, textAlign: 'left', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff', cursor: 'pointer', padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const propertyListTileImage = { width: '100px', minWidth: 100, height: '90px', flexShrink: 0, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#e2e8f0' };
const propertyListTileBody = { padding: '10px 12px', flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' };
const propertyListTileTitle = { fontSize: '12px', fontWeight: '700', color: '#1f3a3d', marginBottom: '4px', lineHeight: 1.2 };
const propertyListTileAddress = { fontSize: '10px', color: '#64748b', marginBottom: '2px' };
const propertyListTilePrice = { fontSize: '10px', color: '#11575C', fontWeight: '600' };

const spotlightGridCards = { display:'flex', gap:'18px', overflowX:'auto', paddingBottom:'8px' };
const portfolioCard = { background:'#ffffff', borderRadius:'16px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.06)', minWidth:'220px', maxWidth:'240px', height:'420px', display:'flex', flexDirection:'column' };
const portfolioImage = { height:'150px', backgroundSize:'cover', backgroundPosition:'center', backgroundColor:'#e2e8f0' };
const portfolioBody = { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'6px', flex: 1, overflowY:'auto' };
const portfolioTitle = { fontSize:'13px', fontWeight:'700', color:'#1f3a3d' };
const portfolioDetail = { display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#6b7280' };
const portfolioDetailLabel = { fontWeight:'600' };
const portfolioDetailValue = { fontWeight:'600', color:'#1f2937' };
const portfolioEditBtn = { background:'#11575C', color:'white', border:'none', borderRadius:'12px', padding:'5px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer' };
const portfolioDeleteBtn = { background:'#800020', color:'white', border:'none', borderRadius:'12px', padding:'5px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer' };

// Modal Styles
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent = { background: 'white', padding: '30px', borderRadius: '16px', width: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginTop:'5px', outline:'none', boxSizing:'border-box' };
const saveBtn = { background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const cancelBtn = { background: '#f1f5f9', color: '#555', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

export default PortfolioLegacy;