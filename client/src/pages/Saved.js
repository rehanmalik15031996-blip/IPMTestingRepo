import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import { usePreferences } from '../context/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useMediaQuery';

const Saved = () => {
    const isMobile = useIsMobile();
    const { formatPrice, formatArea } = usePreferences();
    const { t } = useTranslation();
    // 1. Get User safely (using useMemo prevents the Infinite Loop)
    const user = useMemo(() => JSON.parse(localStorage.getItem('user') || 'null'), []);
    
    // 2. STATE DECLARATION
    const [savedProps, setSavedProps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 3. FETCH DATA
    const fetchSaved = useCallback(async () => {
        if (!user?._id) {
            setLoading(false);
            return;
        }
        try {
            setError(null);
            const res = await api.get(`/api/users/${user._id}?type=saved`);
            if (Array.isArray(res.data)) {
                setSavedProps(res.data);
            } else {
                console.warn("Received non-array data:", res.data);
                setSavedProps([]);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Could not load saved properties.");
            setSavedProps([]);
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => {
        setLoading(true);
        fetchSaved();
    }, [fetchSaved]);

    // 4. REMOVE FUNCTION
    const handleRemove = async (propId) => {
        try {
            await api.put(`/api/users/${user._id}`, { 
                propertyId: propId, 
                action: 'unsave' 
            });
            // Remove from the list immediately
            setSavedProps(prev => prev.filter(p => p._id !== propId));
        } catch (err) {
            alert("Error removing property");
        }
    };

    const retryFetch = () => {
        setError(null);
        setLoading(true);
        fetchSaved();
    };

    if (loading) return (
        <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f6' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '50px' }}>
                <LogoLoading message={t('common.loading')} style={{ minHeight: '60vh' }} />
            </main>
        </div>
    );

    return (
        <div className="dashboard-container" style={{ display: 'flex' }}>
            
            {/* 1. DYNAMIC SIDEBAR (Replaces the hardcoded aside) */}
            <Sidebar />

            {/* 2. MAIN CONTENT (same for seller, buyer, investor) */}
            <main className="dashboard-main" style={{ flex: 1, padding: isMobile ? '16px' : '30px', backgroundColor: '#f4f7f6', minHeight: '100vh', position: 'relative' }}>
                {/* Header */}
                <header className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div className="welcome-text">
                        <h1 style={{ margin: 0, color: '#1f3a3d' }}>{t('saved.title')}</h1>
                        <p style={{ margin: '5px 0 0 0', color: '#888' }}>{t('saved.subtitle')}</p>
                    </div>
                    <div className="header-actions" style={{ display: 'flex', gap: '15px' }}>
                        <div className="search-bar" style={{ display: 'none', background: 'white', padding: '10px 20px', borderRadius: '30px', alignItems: 'center', gap: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                            <i className="fas fa-search" style={{ color: '#ccc' }}></i>
                            <input type="text" placeholder="Search saved items..." style={{ border: 'none', outline: 'none' }} />
                        </div>
                        <button
                            className="filter-pill-btn"
                            disabled
                            title="Coming soon"
                            style={{ background: 'white', border: '1px solid #ddd', borderRadius: '30px', padding: '10px 20px', fontWeight: 'bold', color: '#555', opacity: 0.5, cursor: 'not-allowed' }}
                            onClick={(e) => e.preventDefault()}
                        >
                            {t('saved.allTypes')} <i className="fas fa-filter"></i>
                        </button>
                    </div>
                </header>

                <div className="saved-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                    {error ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px' }}>
                            <div style={{ background: 'white', borderRadius: '16px', padding: '40px', maxWidth: '400px', margin: '0 auto', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                                <i className="fas fa-cloud-showers-heavy" style={{ fontSize: '40px', color: '#94a3b8', marginBottom: '16px' }} />
                                <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '16px' }}>We couldn’t load your saved properties. Please try again.</p>
                                <button type="button" onClick={retryFetch} style={{ background: '#0f766e', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Try again</button>
                            </div>
                        </div>
                    ) : savedProps.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#888' }}>
                            <i className="far fa-heart" style={{ fontSize: '40px', marginBottom: '20px', opacity: 0.5 }}></i>
                            <h3>{t('saved.noSavedYet')}</h3>
                            <Link to="/collection" style={{ display: 'inline-block', marginTop: '10px', background: '#ffc801', padding: '10px 20px', borderRadius: '20px', textDecoration: 'none', color: 'black', fontWeight: 'bold', opacity: 0.6, cursor: 'not-allowed', pointerEvents: 'none' }}>{t('saved.browseCollection')}</Link>
                        </div>
                    ) : (
                        savedProps.map(prop => (
                            <div className="saved-card" key={prop._id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                                {/* Image Safety Check */}
                                <div className="sc-img" style={{ height: '180px', backgroundColor: '#ddd', backgroundImage: prop.imageUrl ? `url('${prop.imageUrl}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                    {!prop.imageUrl && <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#888'}}>No Image</div>}
                                </div>
                            
                                <div className="sc-body" style={{ padding: '20px', flex: 1 }}>
                                    <h4 style={{ margin: '0 0 15px 0', color: '#1f3a3d', fontSize: '18px' }}>{prop.title || "Untitled Property"}</h4>
                                    <div className="sc-row" style={rowStyle}><span>{t('common.price')}:</span> <strong style={{ color: '#1f3a3d' }}>{formatPrice(prop.price)}</strong></div>
                                    <div className="sc-row" style={rowStyle}><span>{t('common.location')}:</span> <strong>{prop.location}</strong></div>
                                    
                                    <div className="sc-divider" style={{ height: '1px', background: '#eee', margin: '15px 0' }}></div>
                                    
                                    <div className="sc-specs" style={{ fontSize: '13px', color: '#666' }}>
                                        {prop.specs && String(prop.propertyCategory || '').toLowerCase() !== 'development' && (
                                            <>
                                                <div style={rowStyle}><span>{t('common.beds')}:</span> <strong>{prop.specs.beds}</strong></div>
                                                <div style={rowStyle}><span>{t('common.baths')}:</span> <strong>{prop.specs.baths}</strong></div>
                                                <div style={rowStyle}><span>{t('common.area')}:</span> <strong>{formatArea(prop.specs.sqft)}</strong></div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="sc-actions" style={{ padding: '20px', borderTop: '1px solid #f5f5f5', display: 'flex', gap: '10px' }}>
                                    <Link to={`/property/${prop._id}`} className="sc-btn-teal" style={{ flex: 1, textAlign: 'center', background: '#e6fcf5', color: '#0ca678', padding: '10px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
                                        {t('saved.viewDetails')}
                                    </Link>
                                    <button className="sc-btn-white" onClick={() => handleRemove(prop._id)} style={{ background: 'transparent', border: '1px solid #ddd', borderRadius: '8px', padding: '10px 15px', cursor: 'pointer', color: '#dc3545' }}>
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

// Inline style helper for rows
const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#555'
};

export default Saved;