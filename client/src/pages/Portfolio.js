import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import api from '../config/api';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getDashboardCache, setDashboardCache, invalidateDashboardCache } from '../config/dashboardCache';
import PropertyUploadForm from '../components/PropertyUploadForm';
import { showNotification } from '../components/NotificationManager';
import { getPropertyLimitForUser } from '../utils/planLimits';
import PortfolioLegacy from './legacy/PortfolioLegacy';

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

/** Format price for display: "USD 12.3K", "USD 2.1M", etc. */
const formatCompactNumber = (num) => {
    const v = typeof num === 'number' ? num : parseFloat(String(num).replace(/[^0-9.]/g, '')) || 0;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toLocaleString();
};
const formatPriceDisplay = (price) => {
    if (price == null || price === '') return '—';
    const str = String(price);
    const currency = /^[A-Z]{3}\s*/i.test(str) ? str.match(/^[A-Z]{3}/i)[0] : 'USD';
    const num = parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
    if (num === 0) return '—';
    return `${currency} ${formatCompactNumber(num)}`;
};

const Portfolio = () => {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    // --- STATE ---
    const [holdings, setHoldings] = useState([]);
    const [stats, setStats] = useState({ totalValue: 0, avgRoi: 0, totalCount: 0, totalInvested: 0 });
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
    const [quickEditLoadingId, setQuickEditLoadingId] = useState(null); // property _id being quick-edited
    const [statusModal, setStatusModal] = useState({ open: false, type: null, holding: null, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '' });
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const mapContainerNodeRef = useRef(null); // node the map was created in (to detect remount)
    const markersRef = useRef([]);
    const spotlightTitleRef = useRef(null);
    const [spotlightTitleFontSize, setSpotlightTitleFontSize] = useState(16);

    // Listing status counts for tiles (ALL, DRAFTS, PUBLISHED, FEATURED, UNAVAILABLE, ARCHIVED)
    const listingCounts = (() => {
        const list = Array.isArray(holdings) ? holdings : [];
        const norm = (s) => (s && String(s).toLowerCase()) || '';
        let all = list.length, drafts = 0, published = 0, featured = 0, unavailable = 0, sold = 0, underOffer = 0, archived = 0;
        list.forEach((h) => {
            const status = norm(h.status || h.details?.status);
            if (h.details?.isFeatured === true) featured++;
            if (status === 'draft') drafts++;
            else if (status === 'published' || status === 'active') published++;
            else if (status === 'unavailable') unavailable++;
            else if (status === 'sold') sold++;
            else if (status === 'under offer') underOffer++;
            else if (status === 'archived') archived++;
        });
        return { all, drafts, published, featured, unavailable, sold, underOffer, archived };
    })();

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
    /** Avoid duplicate display when title and address are the same (e.g. AI-generated title from address). Returns { titleLine, addressLine } with addressLine empty if same as title. */
    const titleAndAddressLines = (title, address, locationDetails) => {
        const t = (dedupePropertyTitle(title, locationDetails) || 'Untitled Property').trim();
        const a = (address || '—').trim();
        const tNorm = t.toLowerCase().replace(/\s+/g, ' ');
        const aNorm = a.toLowerCase().replace(/\s+/g, ' ');
        if (!tNorm || tNorm === aNorm || (aNorm && tNorm.includes(aNorm)) || (tNorm && aNorm.includes(tNorm))) return { titleLine: a || t, addressLine: '' };
        return { titleLine: t, addressLine: a };
    };
    const dedupeAddress = (streetAddress, city, country, suburb) => {
        const parts = [streetAddress, suburb, city, country].filter(Boolean);
        const unique = parts.filter((p, i) => parts.findIndex(q => q.toLowerCase() === p.toLowerCase()) === i);
        return unique.join(', ');
    };

    // --- FETCH DATA ---
    const userId = user?._id;
    const fetchPortfolio = useCallback(async () => {
        if (!userId) return null;
        try {
            const cached = getDashboardCache(userId);
            if (cached) {
                const portfolioList = cached.portfolio || [];
                const portfolioStats = cached.stats || {};
                setHoldings(portfolioList);
                setStats({
                    totalValue: Number(portfolioStats.currentValue) || 0,
                    totalInvested: Number(portfolioStats.totalInvested) || 0,
                    avgRoi: Number(portfolioStats.avgRoi) || 0,
                    totalCount: portfolioList.length
                });
                setLoading(false);
                return portfolioList;
            }

            const res = await api.get(`/api/users/${userId}?type=dashboard`);
            setDashboardCache(userId, res.data);

            const portfolioList = res.data.portfolio || [];
            const portfolioStats = res.data.stats || {};

            setHoldings(portfolioList);
            
            setStats({
                totalValue: Number(portfolioStats.currentValue) || 0,
                totalInvested: Number(portfolioStats.totalInvested) || 0,
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

    /** Quick-edit: update property status / isFeatured without opening full edit modal. */
    const handleQuickEdit = useCallback(async (holding, updates) => {
        const id = holding?.details?._id || holding?._id;
        if (!id || !holding?.details?.isUploaded) return;
        setQuickEditLoadingId(id);
        try {
            await api.put(`/api/properties/${encodeURIComponent(id)}`, updates);
            showNotification('Listing updated.', 'success');
            invalidateDashboardCache(userId);
            await fetchPortfolio();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Update failed.', 'error');
        } finally {
            setQuickEditLoadingId(null);
        }
    }, [userId, fetchPortfolio]);

    const handleStatusWithDetails = useCallback(async () => {
        const { type, holding, price, date, buyerFirstName, buyerLastName, buyerEmail, buyerMobile } = statusModal;
        if (!holding || !type || !date) return;
        const id = holding?.details?._id || holding?._id;
        if (!id) return;
        const numPrice = parseFloat(String(price).replace(/[^0-9.]/g, '')) || undefined;
        const dateObj = date ? new Date(date) : null;
        const updates = type === 'Sold'
            ? {
                status: 'Sold',
                salePrice: numPrice,
                saleDate: dateObj,
                ...(buyerFirstName?.trim() && { saleBuyerFirstName: buyerFirstName.trim() }),
                ...(buyerLastName?.trim() && { saleBuyerLastName: buyerLastName.trim() }),
                ...(buyerEmail?.trim() && { saleBuyerEmail: buyerEmail.trim() }),
                ...(buyerMobile?.trim() && { saleBuyerMobile: buyerMobile.trim() })
            }
            : { status: 'Under Offer', offerPrice: numPrice, offerDate: dateObj };
        setQuickEditLoadingId(id);
        try {
            await api.put(`/api/properties/${encodeURIComponent(id)}`, updates);
            showNotification('Listing updated.', 'success');
            setStatusModal({ open: false, type: null, holding: null, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '' });
            invalidateDashboardCache(userId);
            await fetchPortfolio();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Update failed.', 'error');
        } finally {
            setQuickEditLoadingId(null);
        }
    }, [statusModal, userId, fetchPortfolio]);

    // Buyers, sellers, investors, and tenants use the legacy version of Portfolio (after all hooks)
    const role = user?.role?.toLowerCase();
    if (role === 'buyer' || role === 'seller' || role === 'investor' || role === 'tenant') {
        return <PortfolioLegacy />;
    }

    // Count only properties uploaded by user (for seller/agent limits)
    const uploadedCount = holdings.filter((h) => h.details?.isUploaded === true).length;

    const holdingsList = Array.isArray(holdings) ? holdings : [];

    if (loading) return (
        <div style={{ display: 'flex', fontFamily: "'Poppins', sans-serif", background: '#f0f4f4', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ flex: 1, padding: isMobile ? '16px' : '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogoLoading message="Loading portfolio..." style={{ minHeight: '60vh' }} />
            </main>
        </div>
    );

    const isBuyer = user?.role?.toLowerCase() === 'buyer';
    const isInvestor = user?.role?.toLowerCase() === 'investor';
    const isSeller = user?.role?.toLowerCase() === 'seller';
    const isLandlord = user?.role?.toLowerCase() === 'landlord';
    const isAgent = user?.role?.toLowerCase() === 'agent' || user?.role?.toLowerCase() === 'independent_agent' || user?.role?.toLowerCase() === 'agency_agent';
    const isAgency = user?.role?.toLowerCase() === 'agency';
    const propertyLimit = getPropertyLimitForUser(user);
    const canUpload = isSeller || isBuyer || isInvestor || isLandlord || isAgent || isAgency;
    const uploadDisabled = canUpload && uploadedCount >= propertyLimit;

    return (
        <div style={{ display: 'flex', fontFamily: "'Poppins', sans-serif", background: '#f0f4f4', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Sidebar />
            
            <main className="dashboard-main" style={{ padding: isMobile ? '16px' : '24px 40px', color: '#1f3a3d', position: 'relative', minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* HEADER */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
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

                {isAgent ? (
                    <>
                        {/* AGENT: Listing management — status tiles + table */}
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px', flexShrink: 0 }}>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>ALL</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>{listingCounts.all}</div></div>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>DRAFTS</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>{listingCounts.drafts}</div></div>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>PUBLISHED</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>{listingCounts.published}</div></div>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>FEATURED</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>{listingCounts.featured}</div></div>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>UNAVAILABLE</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>{listingCounts.unavailable}</div></div>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>ARCHIVED</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>{listingCounts.archived}</div></div>
                        </div>
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ ...cardHeaderSmall, textAlign: 'left', marginBottom: '12px' }}>YOUR PROPERTIES</div>
                            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                {holdingsList.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                        <colgroup><col style={{ width: '16.66%' }} /><col style={{ width: '16.66%' }} /><col style={{ width: '16.66%' }} /><col style={{ width: '16.66%' }} /><col style={{ width: '16.66%' }} /><col style={{ width: '16.66%' }} /></colgroup>
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f8fafc' }}>
                                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={tableHeader}>Feature Photo</th><th style={tableHeader}>Property Info</th><th style={tableHeader}>Added On</th><th style={{ ...tableHeader, textAlign: 'left' }}>Property Status</th><th style={{ ...tableHeader, textAlign: 'left' }}>Website Status</th><th style={tableHeader}>Price + Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {holdingsList.map((holding) => {
                                                const details = holding.details || {};
                                                const locationDetails = details.locationDetails || {};
                                                const specs = details.specs || {};
                                                const priceVal = details.price || holding.price;
                                                const primaryImage = holding.photo && holding.photo.length > 5 ? holding.photo : `https://images.unsplash.com/photo-1600596542815-2a4d9fdb2243?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`;
                                                const address = dedupeAddress(locationDetails.streetAddress, locationDetails.city, locationDetails.country, locationDetails.suburb) || holding.location || '—';
                                                const { titleLine: propTitleLine, addressLine: propAddressLine } = titleAndAddressLines(holding.propertyTitle, address, locationDetails);
                                                const canEdit = Boolean(holding?.details?._id && holding?.details?.isUploaded);
                                                const propId = details._id || holding._id;
                                                const status = (holding.status || details.status || 'Published').toString();
                                                const isFeatured = details.isFeatured === true;
                                                const websiteStatus = details.websiteStatus ?? (status === 'Draft' ? 'Draft' : (isFeatured ? 'Featured' : 'Published'));
                                                const addedOn = holding.addedOn ? (() => { try { return new Date(holding.addedOn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch (_) { return '—'; } })() : '—';
                                                const beds = specs.beds != null && specs.beds !== '' ? specs.beds : '—';
                                                const baths = specs.baths != null && specs.baths !== '' ? specs.baths : '—';
                                                const sqftStr = specs.sqft != null && specs.sqft !== '' ? `${Number(specs.sqft).toLocaleString()} sq ft` : '—';
                                                const isQuickEditLoading = quickEditLoadingId === propId;
                                                return (
                                                    <tr key={holding._id || `${holding.propertyTitle}-${holding.location}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={tableCell}><div style={{ width: 100, height: 72, borderRadius: '10px', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#e2e8f0', backgroundImage: `url('${primaryImage}')`, margin: '0 auto' }} /></td>
                                                        <td style={tableCell}><div style={{ ...tableCellWrap, textAlign: 'center' }}><div style={{ fontWeight: 700, color: '#1f3a3d', marginBottom: 4 }}>{propTitleLine}</div>{propAddressLine ? <div style={{ fontSize: '12px', color: '#64748b', marginBottom: 6 }}>{propAddressLine}</div> : null}{String(details.propertyCategory || '').toLowerCase() !== 'development' && <div style={{ fontSize: '11px', color: '#475569' }}><span style={{ fontWeight: 700 }}>{beds}</span> Bedrooms · <span style={{ fontWeight: 700 }}>{baths}</span> Bathrooms · <span style={{ fontWeight: 700 }}>{sqftStr}</span></div>}</div></td>
                                                        <td style={tableCell}>{addedOn}</td>
                                                        <td style={{ ...tableCell, textAlign: 'left' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', justifyContent: 'center' }} role="radiogroup" aria-label="Property status">
                                                                {[
                                                                    { id: 'Draft', payload: { status: 'Draft' }, needsModal: false },
                                                                    { id: 'Active', payload: { status: 'Published' }, needsModal: false },
                                                                    { id: 'Under Offer', payload: { status: 'Under Offer' }, needsModal: true },
                                                                    { id: 'Sold', payload: { status: 'Sold' }, needsModal: true },
                                                                    { id: 'Unavailable', payload: { status: 'Unavailable' }, needsModal: false }
                                                                ].map(({ id, payload, needsModal }) => {
                                                                    const selected = (id === 'Draft' && status === 'Draft') || (id === 'Active' && status === 'Published') || (id === 'Under Offer' && status === 'Under Offer') || (id === 'Sold' && status === 'Sold') || (id === 'Unavailable' && status === 'Unavailable');
                                                                    const disabled = isQuickEditLoading || !canEdit;
                                                                    const onSelect = () => {
                                                                        if (disabled) return;
                                                                        if (needsModal) setStatusModal({ open: true, type: id, holding, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '' });
                                                                        else handleQuickEdit(holding, payload);
                                                                    };
                                                                    return (<label key={id} style={{ ...websiteStatusRow, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}><input type="radio" name={`property-status-${holding._id || propId}`} checked={selected} onChange={onSelect} disabled={disabled} style={{ margin: 0, width: 16, height: 16, accentColor: '#11575C', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0 }} /><span style={{ fontSize: '12px', fontWeight: 500, color: selected ? '#11575C' : '#64748b' }}>{id}</span></label>);
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td style={{ ...tableCell, textAlign: 'left' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', justifyContent: 'center' }} role="radiogroup" aria-label="Website status">
                                                                {[
                                                                    { id: 'Draft', payload: { websiteStatus: 'Draft', isFeatured: false }, needsModal: false },
                                                                    { id: 'Published', payload: { websiteStatus: 'Published', isFeatured: false }, needsModal: false },
                                                                    { id: 'Featured', payload: { websiteStatus: 'Featured', isFeatured: true }, needsModal: false }
                                                                ].map(({ id, payload, needsModal }) => {
                                                                    const selected = id === websiteStatus;
                                                                    const disabled = isQuickEditLoading || !canEdit;
                                                                    const onSelect = () => {
                                                                        if (disabled) return;
                                                                        if (needsModal) setStatusModal({ open: true, type: id, holding, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '' });
                                                                        else handleQuickEdit(holding, payload);
                                                                    };
                                                                    return (<label key={id} style={{ ...websiteStatusRow, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}><input type="radio" name={`website-status-${holding._id || propId}`} checked={selected} onChange={onSelect} disabled={disabled} style={{ margin: 0, width: 16, height: 16, accentColor: '#11575C', cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0 }} /><span style={{ fontSize: '12px', fontWeight: 500, color: selected ? '#11575C' : '#64748b' }}>{id}</span></label>);
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td style={tableCell}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}><div style={{ fontWeight: 700, color: '#11575C' }}>{formatPriceDisplay(priceVal)}</div><div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}><button type="button" style={actionBtn} onClick={() => propId && navigate(`/property/${propId}`)}>View</button><button type="button" style={actionBtn} onClick={() => handleEditProperty(holding)} disabled={!canEdit || editLoading}>Edit</button><button type="button" style={{ ...actionBtn, color: '#800020', borderColor: '#800020' }} onClick={() => handleDeleteClick(holding)}>Delete</button></div></div></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (<div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No properties yet. Upload one to get started.</div>)}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* BUYER / INVESTOR / SELLER: previous portfolio — performance tiles + horizontal card list */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px', flexShrink: 0 }}>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>IN PORTFOLIO</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>{stats.totalCount}</div></div>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>AVG ROI</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>{Number(stats.avgRoi).toFixed(1)}%</div></div>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>ASSET VALUE</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>{(Number(stats.totalValue) / 1000000).toFixed(2)}M</div></div>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>TOTAL INVESTED</div><div style={{ fontSize: '22px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>${(Number(stats.totalInvested || stats.totalValue) / 1000).toFixed(0)}K</div></div>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>YTD CHANGE</div><div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', lineHeight: '1.2' }}>+8.5%</div></div>
                            <div style={{ ...whiteCard, textAlign: 'center', padding: '16px' }}><div style={cardHeaderSmall}>UPLOADED</div><div style={{ fontSize: '32px', fontWeight: '800', color: '#11575C', lineHeight: '1.2' }}>{uploadedCount}</div></div>
                        </div>
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ ...cardHeaderSmall, textAlign: 'left', marginBottom: '12px' }}>YOUR PROPERTIES</div>
                            <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', alignItems: 'stretch', flex: 1, minHeight: 280, WebkitOverflowScrolling: 'touch' }}>
                                {holdingsList.length > 0 ? holdingsList.map((holding) => {
                                    const details = holding.details || {};
                                    const locationDetails = details.locationDetails || {};
                                    const priceVal = details.price || holding.price;
                                    const propId = details._id || holding._id;
                                    const primaryImage = holding.photo && holding.photo.length > 5 ? holding.photo : `https://images.unsplash.com/photo-1600596542815-2a4d9fdb2243?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`;
                                    const address = dedupeAddress(locationDetails.streetAddress, locationDetails.city, locationDetails.country, locationDetails.suburb) || holding.location || '—';
                                    const { titleLine: propTitleLine, addressLine: propAddressLine } = titleAndAddressLines(holding.propertyTitle, address, locationDetails);
                                    const canEdit = Boolean(holding?.details?._id && holding?.details?.isUploaded);
                                    return (
                                        <div key={holding._id || `${holding.propertyTitle}-${holding.location}`} style={{ ...portfolioCard, minWidth: 280, maxWidth: 280, flexShrink: 0 }}>
                                            <div style={{ ...portfolioImage, height: 160, backgroundImage: `url('${primaryImage}')` }} />
                                            <div style={portfolioBody}>
                                                <div style={portfolioTitle}>{propTitleLine}</div>
                                                {propAddressLine ? <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>{propAddressLine}</div> : null}
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#11575C', marginBottom: '12px' }}>{priceVal || '—'}</div>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', alignItems: 'center' }}>
                                                    {propId && <button type="button" style={{ ...portfolioEditBtn, padding: '6px 12px', fontSize: '11px' }} onClick={() => navigate(`/property/${propId}`)}>View</button>}
                                                    <button type="button" style={{ ...portfolioDeleteBtn, padding: '6px 12px', fontSize: '11px' }} onClick={() => handleDeleteClick(holding)}>Delete</button>
                                                    <button style={!canEdit || editLoading ? { ...portfolioEditBtn, opacity: 0.6, cursor: 'not-allowed', padding: '6px 12px', fontSize: '11px' } : { ...portfolioEditBtn, padding: '6px 12px', fontSize: '11px' }} onClick={() => handleEditProperty(holding)} disabled={!canEdit || editLoading}>Edit</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : (<div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', width: '100%' }}>No properties yet. Upload one to get started.</div>)}
                            </div>
                        </div>
                    </>
                )}
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

            {/* SOLD / UNDER OFFER DETAILS MODAL */}
            {statusModal.open && statusModal.type && (
                <div style={modalOverlay} onClick={() => setStatusModal({ open: false, type: null, holding: null, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '' })}>
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
                            <button onClick={() => setStatusModal({ open: false, type: null, holding: null, price: '', date: '', buyerFirstName: '', buyerLastName: '', buyerEmail: '', buyerMobile: '' })} style={cancelBtn}>Cancel</button>
                            <button onClick={handleStatusWithDetails} style={saveBtn} disabled={!statusModal.date}>Save</button>
                        </div>
                    </div>
                </div>
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
                                        <div style={{fontSize:'11px', color:'#888'}}>{p.price}</div>
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

const propertyListTile = { display: 'flex', alignItems: 'stretch', width: '100%', minHeight: 110, flexShrink: 0, textAlign: 'left', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff', cursor: 'pointer', padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const propertyListTileImage = { width: '100px', minWidth: 100, height: '90px', flexShrink: 0, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#e2e8f0' };
const propertyListTileBody = { padding: '10px 12px', flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' };
const propertyListTileTitle = { fontSize: '12px', fontWeight: '700', color: '#1f3a3d', marginBottom: '4px', lineHeight: 1.2 };
const propertyListTileAddress = { fontSize: '10px', color: '#64748b', marginBottom: '2px' };
const propertyListTilePrice = { fontSize: '10px', color: '#11575C', fontWeight: '600' };

const spotlightGridCards = { display:'flex', gap:'18px', overflowX:'auto', paddingBottom:'8px' };
const portfolioCard = { background:'#ffffff', borderRadius:'16px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.06)', minWidth:'220px', maxWidth:'240px', height:'420px', display:'flex', flexDirection:'column' };
const portfolioCardFullWidth = { background:'#ffffff', borderRadius:'16px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.06)', width:'100%' };
const portfolioImage = { height:'150px', backgroundSize:'cover', backgroundPosition:'center', backgroundColor:'#e2e8f0' };
const portfolioBody = { padding:'12px 14px', display:'flex', flexDirection:'column', gap:'6px', flex: 1, overflowY:'auto' };
const portfolioTitle = { fontSize:'13px', fontWeight:'700', color:'#1f3a3d' };
const portfolioDetail = { display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#6b7280' };
const portfolioDetailLabel = { fontWeight:'600' };
const portfolioDetailValue = { fontWeight:'600', color:'#1f2937' };
const portfolioEditBtn = { background:'#11575C', color:'white', border:'none', borderRadius:'12px', padding:'5px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer' };
const portfolioDeleteBtn = { background:'#800020', color:'white', border:'none', borderRadius:'12px', padding:'5px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer' };

const tableHeader = { padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tableCell = { padding: '12px 8px', fontSize: '13px', color: '#334155', verticalAlign: 'middle', textAlign: 'center' };
const tableCellWrap = { wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' };
const websiteStatusRow = { display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content' };
const websiteStatusRowRight = { flexDirection: 'row-reverse' };
const actionBtn = { padding: '4px 10px', borderRadius: '8px', border: '2px solid #11575C', background: 'white', color: '#11575C', fontSize: '10px', fontWeight: 700, cursor: 'pointer', width: 'fit-content', minWidth: 56 };

// Modal Styles
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent = { background: 'white', padding: '30px', borderRadius: '16px', width: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginTop:'5px', outline:'none', boxSizing:'border-box' };
const saveBtn = { background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const cancelBtn = { background: '#f1f5f9', color: '#555', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

export default Portfolio;