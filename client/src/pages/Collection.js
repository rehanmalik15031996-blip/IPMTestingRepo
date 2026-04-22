import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../config/api';
import { useIsMobile } from '../hooks/useMediaQuery';
import { usePreferences } from '../context/PreferencesContext';
import { useTranslation } from 'react-i18next';

const Collection = () => {
    const isMobile = useIsMobile();
    const { state } = useLocation();
    const navigate = useNavigate();
    const { formatPrice, formatArea, getPriceDisplaySuffix } = usePreferences();
    const { t } = useTranslation();

    // 1. Capture incoming data
    const incomingSearch = state?.searchQuery || ""; 
    const incomingLocation = state?.filterLocation || "All";
    const startOpen = state?.openFilters || false; 

    // 2. Data States
    const [properties, setProperties] = useState([]);
    const [savedIds, setSavedIds] = useState([]);
    const [loading, setLoading] = useState(true);

    // 3. Filter States
    const [showFilters, setShowFilters] = useState(startOpen);
    const [filters, setFilters] = useState({
        location: incomingLocation, 
        maxPrice: '',
        minBeds: 0
    });
    const [sortBy, setSortBy] = useState('match'); 

    const user = JSON.parse(localStorage.getItem('user'));

    // ✅ FORCE FILTER OPEN ON NAVIGATION
    useEffect(() => {
        if (state?.openFilters) {
            setShowFilters(true);
        }
    }, [state]);

    // ✅ FETCH DATA
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const endpoint = incomingSearch 
                    ? `/api/properties?search=${incomingSearch}` 
                    : `/api/properties`;

                const propsPromise = api.get(endpoint);
                const savedPromise = (user && user._id) ? api.get(`/api/users/${user._id}?type=saved`) : Promise.resolve(null);
                const [resProps, resSaved] = await Promise.all([propsPromise, savedPromise]);

                setProperties(resProps.data);
                setLoading(false);

                if (resSaved?.data && Array.isArray(resSaved.data)) {
                    setSavedIds(resSaved.data.map(p => p._id));
                } else if (user && user._id) {
                    setSavedIds([]);
                }
            } catch (err) { 
                console.error('Error fetching properties:', err); 
                setLoading(false);
                setProperties([]);
            }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incomingSearch, user?._id]); // Only depend on user._id to prevent unnecessary re-renders when user object changes 

    // Helper: Price Normalization
    const getPriceValue = (priceStr) => {
        if (!priceStr) return 0;
        let str = priceStr.toString().toLowerCase().split('|')[0];
        let multiplier = str.includes('m') ? 1000000 : str.includes('k') ? 1000 : 1;
        let val = parseFloat(str.replace(/[^0-9.]/g, ''));
        return isNaN(val) ? 0 : val * multiplier;
    };

    // Helper: Save/Unsave
    const handleSave = async (propId) => {
        if (!user) return alert(t('common.pleaseLogin'));
        try {
            if (savedIds.includes(propId)) {
                await api.put(`/api/users/${user._id}?propertyId=${propId}`, { action: 'unsave' });
                setSavedIds(savedIds.filter(id => id !== propId));
            } else {
                await api.put(`/api/users/${user._id}?propertyId=${propId}`, { action: 'save' });
                setSavedIds([...savedIds, propId]);
            }
        } catch (err) { console.error(err); }
    };

    // ✅ MASTER FILTER LOGIC
    let displayedProperties = properties.filter(prop => {
        if (incomingSearch) {
            const term = incomingSearch.toLowerCase();
            const matchTitle = prop.title?.toLowerCase().includes(term);
            const matchLoc = prop.location?.toLowerCase().includes(term);
            const matchType = prop.type?.toLowerCase().includes(term);
            if (!matchTitle && !matchLoc && !matchType) return false;
        }
        if (filters.location !== 'All') {
            if (!prop.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
        }
        if (filters.maxPrice) {
            if (getPriceValue(prop.price) > parseFloat(filters.maxPrice)) return false;
        }
        if (filters.minBeds > 0) {
            const beds = prop.specs ? parseInt(prop.specs.beds) : 0; 
            if (beds < filters.minBeds) return false;
        }
        return true;
    });

    // Sort Logic
    displayedProperties.sort((a, b) => {
        if (sortBy === 'match') return (b.matchPercentage || 0) - (a.matchPercentage || 0);
        if (sortBy === 'price-asc') return getPriceValue(a.price) - getPriceValue(b.price);
        if (sortBy === 'price-desc') return getPriceValue(b.price) - getPriceValue(a.price);
        return 0;
    });

    // Reset Logic
    const handleReset = () => {
        setFilters({ location: 'All', maxPrice: '', minBeds: 0 });
        navigate('/collection', { replace: true, state: {} });
        setShowFilters(false);
    };

    if (loading) return <div style={{ height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color: '#11575C', fontWeight:'bold' }}>Searching Global Database...</div>;

    return (
        <div style={{ ...pageWrapper, paddingTop: isMobile ? '80px' : '100px' }}>
            {/* 1. HEADER SECTION */}
            <div style={headerContainer}>
                <h2 style={headerTitle}>
                    {incomingSearch ? `${t('collection.resultsFor')} "${incomingSearch}"` : t('collection.bestMatches')}
                </h2>

                <div style={headerActions}>
                    <button style={filterBtn} onClick={() => setShowFilters(!showFilters)}>
                        {showFilters ? `- ${t('collection.hideFilters')}` : `+ ${t('collection.specifyFilters')}`}
                    </button>

                    <div style={sortWrapper}>
                        <span style={sortLabel}>{t('collection.sortBy')}</span>
                        <button style={sortPill} onClick={() => setSortBy(prev => prev === 'match' ? 'price-asc' : prev === 'price-asc' ? 'price-desc' : 'match')}>
                            {sortBy === 'match' ? t('collection.matchScore') : sortBy.includes('asc') ? t('collection.priceLow') : t('collection.priceHigh')}
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. FILTER PANEL (Conditionally Rendered) */}
            {showFilters && (
                <div style={filterPanel}>
                    <div>
                        <label style={labelStyle}>{t('common.location')}</label>
                        <select style={inputStyle} value={filters.location} onChange={(e) => setFilters({...filters, location: e.target.value})}>
                            <option value="All">{t('collection.all')} {t('collection.locations')}</option>
                            <option value="Dubai">Dubai</option>
                            <option value="London">London</option>
                            <option value="USA">USA</option>
                            <option value="South Africa">South Africa</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>{t('collection.maxPrice')}</label>
                        <input type="number" style={inputStyle} value={filters.maxPrice} onChange={(e) => setFilters({...filters, maxPrice: e.target.value})} placeholder="e.g. 2000000" />
                    </div>
                    <div>
                        <label style={labelStyle}>{t('common.bedrooms')}</label>
                        <div style={{display:'flex', gap:'5px'}}>
                            {[0,1,2,3,4].map(n => (
                                <button key={n} onClick={() => setFilters({...filters, minBeds: n})} style={{...bedBtn, background: filters.minBeds===n ? '#ffc801':'white', color: filters.minBeds===n?'white':'#555'}}>
                                    {n === 0 ? t('common.any') : `${n}+`}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleReset} style={resetBtn}>{t('common.resetAll')}</button>
                </div>
            )}

            {/* 3. PROPERTY GRID */}
            <div style={{ ...gridContainer, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(500px, 1fr))' }}>
                {displayedProperties.length === 0 ? (
                    <div style={emptyState}>
                        <h3>{t('collection.noPropertiesFound')}</h3>
                        <button onClick={handleReset} style={clearBtn}>{t('common.clearFilters')}</button>
                    </div>
                ) : (
                    displayedProperties.map(prop => (
                        <div key={prop._id} style={{ ...cardStyle, flexDirection: isMobile ? 'column' : 'row', minHeight: isMobile ? 'auto' : '260px' }}>
                            
                            {/* LEFT: Image Area */}
                            <div style={{...imageArea, width: isMobile ? '100%' : '45%', minHeight: isMobile ? '200px' : undefined, backgroundImage: `url('${prop.imageUrl}')`}}>
                                <span style={matchBadge}>{t('collection.matchScoreLabel')}: {prop.matchPercentage || 85}%</span>
                            </div>

                            {/* RIGHT: Content Area */}
                            <div style={contentArea}>
                                <h3 style={cardTitle}>{prop.title}</h3>
                                
                                <div style={infoRow}>
                                    <span style={{fontWeight:'bold'}}>{t('common.address')}:</span> {prop.location}
                                </div>
                                <div style={infoRow}>
                                    <span style={{fontWeight:'bold'}}>{t('common.price')}:</span> {formatPrice(prop.price)}{getPriceDisplaySuffix()}
                                </div>

                                {/* Specs Row (Optional based on data; hidden for developments) */}
                                {prop.specs && String(prop.propertyCategory || '').toLowerCase() !== 'development' && (
                                    <div style={specsRow}>
                                        <span>{prop.specs.beds} {t('common.beds')}</span> • <span>{prop.specs.baths} {t('common.baths')}</span> • <span>{formatArea(prop.specs.sqft)}</span>
                                    </div>
                                )}

                                {/* Bottom Actions */}
                                <div style={cardFooter}>
                                    <div style={iconGroup}>
                                        <i 
                                            className={savedIds.includes(prop._id) ? "fas fa-heart" : "far fa-heart"} 
                                            onClick={() => handleSave(prop._id)} 
                                            style={{...iconStyle, color: savedIds.includes(prop._id) ? '#dc3545' : '#94a3b8'}}
                                        ></i>
                                        <i className="far fa-paper-plane" style={iconStyle}></i>
                                    </div>
                                    <Link to={`/property/${prop._id}`} style={viewBtn}>{t('common.viewProperty')}</Link>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- STYLES (Based on SEARCH PAGE.jpg) ---
const pageWrapper = {
    background: '#f0f2f5', // Light grey background
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif",
    paddingTop: '100px',
    paddingBottom: '60px'
};

const headerContainer = {
    maxWidth: '1200px',
    margin: '0 auto 30px auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
};

const headerTitle = {
    color: '#ffc801', // Orange/Yellow
    fontSize: '24px',
    fontWeight: '700',
    margin: 0
};

const headerActions = {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
};

const filterBtn = {
    background: '#11575C', // Dark Teal
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '25px', // Pill shape
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px'
};

const sortWrapper = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#64748b'
};

const sortLabel = {
    fontWeight: '500'
};

const sortPill = {
    background: 'transparent',
    border: '1px solid #cbd5e1',
    padding: '8px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    color: '#0f172a',
    fontWeight: '600'
};

const filterPanel = {
    maxWidth: '1200px',
    margin: '0 auto 30px auto',
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
};

const labelStyle = { display:'block', marginBottom:'8px', fontSize:'12px', fontWeight:'bold', color:'#64748b' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline:'none' };
const bedBtn = { flex:1, padding:'8px 0', borderRadius:'6px', border:'1px solid #e2e8f0', cursor:'pointer', fontSize:'13px' };
const resetBtn = { marginTop:'25px', border:'none', background:'transparent', color:'#ef4444', cursor:'pointer', fontWeight:'bold', textAlign:'left' };

// --- GRID & CARD STYLES ---
const gridContainer = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', // Wide cards
    gap: '30px'
};

const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex', // Horizontal layout
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    border: '1px solid #fff',
    minHeight: '260px'
};

const imageArea = {
    width: '45%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative'
};

const matchBadge = {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'rgba(255,255,255,0.9)',
    color: '#11575C',
    padding: '4px 12px',
    borderRadius: '15px',
    fontSize: '11px',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const contentArea = {
    flex: 1,
    padding: '25px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
};

const cardTitle = {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 15px 0',
    lineHeight: '1.4'
};

const infoRow = {
    fontSize: '13px',
    color: '#334155',
    marginBottom: '8px'
};

const specsRow = {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '10px',
    marginBottom: '15px'
};

const cardFooter = {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '15px'
};

const iconGroup = {
    display: 'flex',
    gap: '15px'
};

const iconStyle = {
    fontSize: '18px',
    cursor: 'pointer',
    color: '#94a3b8',
    transition: 'color 0.2s'
};

const viewBtn = {
    textDecoration: 'none',
    color: '#94a3b8',
    border: '1px solid #e2e8f0',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s'
};

const emptyState = { width:'100%', textAlign:'center', padding:'60px', color:'#94a3b8', gridColumn:'1 / -1' };
const clearBtn = { marginTop:'15px', padding:'10px 20px', cursor:'pointer', background:'transparent', border:'1px solid #ccc', borderRadius:'8px' };

export default Collection;