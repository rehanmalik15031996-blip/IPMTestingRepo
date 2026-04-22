import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../config/api';
import { usePreferences } from '../context/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useMediaQuery';

const NewDevelopments = () => {
    const location = useLocation();
    const isMobile = useIsMobile();
    const { formatPrice } = usePreferences();
    const { t } = useTranslation();
    const [developments, setDevelopments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDev, setSelectedDev] = useState(null);
    const [selectedDevDetail, setSelectedDevDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Open development modal when navigated from dashboard with openDevelopmentId
    useEffect(() => {
        const id = location.state?.openDevelopmentId;
        if (!id || developments.length === 0) return;
        const dev = developments.find((d) => String(d._id) === String(id));
        if (dev) setSelectedDev(dev);
    }, [developments, location.state?.openDevelopmentId]);

    // Fetch full development detail (floor plans, grouped units) when a development card is opened
    useEffect(() => {
        if (!selectedDev || selectedDev.source === 'property') {
            setSelectedDevDetail(null);
            return;
        }
        const id = selectedDev._id;
        if (!id) return;
        setDetailLoading(true);
        setSelectedDevDetail(null);
        api.get(`/api/developments/${id}`)
            .then((res) => { setSelectedDevDetail(res.data); setDetailLoading(false); })
            .catch(() => { setSelectedDevDetail(null); setDetailLoading(false); });
    }, [selectedDev]);
    
    // ✅ FILTER STATE
    const [showFilter, setShowFilter] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState('All');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/api/developments');
                console.log('🏗️ Developments API Response:', res.data);
                if (res.data && Array.isArray(res.data)) {
                    setDevelopments(res.data);
                    if (res.data.length === 0) {
                        console.warn("⚠️ No developments found. Database may need seeding.");
                    }
                } else {
                    console.error("Invalid developments response format:", res.data);
                    setDevelopments([]);
                }
                setLoading(false);
            } catch (err) {
                console.error("❌ Error fetching developments:", err);
                console.error("Error details:", err.response?.data || err.message);
                setDevelopments([]);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- FILTER LOGIC ---
    // 1. Extract unique countries from locations (assuming "City, Country" format)
    const countries = ['All', ...new Set(developments.filter(d => d.source !== 'property' && d.location).map(dev => {
        const parts = String(dev.location).split(',');
        return parts.length > 1 ? parts[parts.length - 1].trim() : dev.location;
    }))];

    // 2. Filter the list
    const filteredList = selectedCountry === 'All' 
        ? developments 
        : developments.filter(dev => dev.location.includes(selectedCountry));

    // --- MODAL COMPONENT (with floor plans + grouped units when detail loaded) ---
    const DevelopmentModal = ({ dev, detail, detailLoading: loadingDetail, onClose }) => (
        <div style={modalOverlay} onClick={onClose}>
            <div style={{ ...modalContent, maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
                <img src={dev.imageUrl} alt={dev.title} style={modalImage} />
                <div style={{ padding: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <span style={pillBadge}>{dev.location}</span>
                            <h2 style={{ margin: '15px 0 5px 0', color: '#115e59' }}>{dev.title}</h2>
                            <h4 style={{ margin: '0 0 20px 0', color: '#64748b', fontWeight: 'normal' }}>{dev.subtitle}</h4>
                            {detail && detail.groupedUnits && detail.groupedUnits.length > 0 && (
                                <span style={{ fontSize: 12, color: '#64748b' }}>
                                    {detail.groupedUnits.reduce((acc, g) => acc + g.count, 0)} unit{detail.groupedUnits.reduce((acc, g) => acc + g.count, 0) !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <button onClick={onClose} style={closeBtn}><i className="fas fa-times"></i></button>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', marginBottom: '20px' }}>
                        <div><strong>Completion:</strong> {dev.completion}</div>
                        <div><strong>{t('common.price')}:</strong> {formatPrice(dev.priceStart)}</div>
                        <div><strong>Yield:</strong> {dev.yieldRange}</div>
                    </div>

                    <p style={{ lineHeight: '1.6', color: '#333' }}>{dev.description}</p>

                    {/* Floor plans / layout options – preview image + files (JPG, PDF, CAD, etc.) */}
                    {detail && detail.floorPlans && detail.floorPlans.length > 0 && (
                        <div style={{ marginTop: 24, marginBottom: 24 }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#115e59' }}>Floor plans & layouts</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 16 }}>
                                {detail.floorPlans.map((fp, idx) => (
                                    <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                                        {fp.imageUrl && <img src={fp.imageUrl} alt={fp.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />}
                                        <div style={{ padding: 12 }}>
                                            <div style={{ fontWeight: 600, color: '#111', marginBottom: 4 }}>{fp.name}</div>
                                            <div style={{ fontSize: 12, color: '#64748b' }}>
                                                {fp.beds != null && `${fp.beds} bed`}
                                                {fp.beds != null && fp.baths != null && ' · '}
                                                {fp.baths != null && `${fp.baths} bath`}
                                                {(fp.sizeSqft != null || fp.sizeSqm != null) && ` · ${fp.sizeSqft || fp.sizeSqm} ${fp.sizeSqft ? 'sq ft' : 'm²'}`}
                                            </div>
                                            {fp.priceFrom && <div style={{ fontSize: 12, color: '#115e59', marginTop: 4 }}>{fp.priceFrom}</div>}
                                            {fp.files && fp.files.length > 0 && (
                                                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                                                    {fp.files.map((file, fIdx) => {
                                                        const isPdf = (file.mimeType || '').includes('pdf') || (file.fileType || '').toLowerCase() === 'pdf';
                                                        const isImage = (file.mimeType || '').startsWith('image/') || ['image', 'jpg', 'jpeg', 'png'].includes((file.fileType || '').toLowerCase());
                                                        const isCad = ['cad', 'dwg', 'dxf'].includes((file.fileType || '').toLowerCase()) || (file.mimeType || '').toLowerCase().includes('dwg');
                                                        const icon = isPdf ? 'fa-file-pdf' : isCad ? 'fa-file-code' : 'fa-file-image';
                                                        return (
                                                            <a key={fIdx} href={file.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#115e59', marginBottom: 6, textDecoration: 'none' }}>
                                                                <i className={`fas ${icon}`} style={{ color: '#64748b', width: 14 }} />
                                                                <span>{file.name || (isPdf ? 'PDF' : isCad ? 'CAD/DWG' : 'Image')}</span>
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Grouped units (same layout = one group; nested list of units) */}
                    {loadingDetail && <p style={{ color: '#64748b', fontSize: 13 }}>Loading units…</p>}
                    {!loadingDetail && detail && detail.groupedUnits && detail.groupedUnits.length > 0 && (
                        <div style={{ marginTop: 24, marginBottom: 24 }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#115e59' }}>Units by type</h3>
                            {detail.groupedUnits.map((group, gIdx) => (
                                <div key={gIdx} style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                                    <div style={{ padding: '10px 14px', background: '#f8fafc', fontWeight: 600, fontSize: 14, color: '#334155' }}>
                                        {group.groupName} <span style={{ fontWeight: 400, color: '#64748b' }}>({group.count} unit{group.count !== 1 ? 's' : ''})</span>
                                    </div>
                                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                        {group.units.map((u) => (
                                            <li key={u._id} style={{ borderTop: '1px solid #e2e8f0', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                                <div>
                                                    <span style={{ fontWeight: 500, color: '#111' }}>{u.developmentUnitLabel || u.title}</span>
                                                    {u.location && <div style={{ fontSize: 12, color: '#64748b' }}>{u.location}</div>}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    {u.price && <span style={{ fontSize: 13, fontWeight: 600, color: '#115e59' }}>{u.price}</span>}
                                                    <Link to={`/property/${u._id}`} style={{ fontSize: 13, fontWeight: 600, color: '#115e59', textDecoration: 'none' }} onClick={onClose}>View →</Link>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}

                    <button style={inquireBtn}>Inquire about this Project</button>
                </div>
            </div>
        </div>
    );

    return (
        <main style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif", padding: isMobile ? '24px 16px' : '40px 60px' }}>
                
                {/* HEADER */}
                <div style={{display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : 0, justifyContent:'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom:'40px'}}>
                    <h1 style={{fontSize:'32px', color:'#ffc801', fontWeight:'800', margin:0, letterSpacing:'-0.5px'}}>{t('newDev.title')}</h1>
                    
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <span style={{fontSize:'14px', color:'#666'}}>{t('newDev.filterBy')}</span>
                        
                        {/* ✅ FILTER DROPDOWN */}
                        <div style={{position:'relative'}}>
                            <button 
                                style={filterBtn} 
                                onClick={() => setShowFilter(!showFilter)}
                            >
                                {selectedCountry === 'All' ? t('newDev.country') : selectedCountry} 
                                <i className="fas fa-chevron-down" style={{fontSize:'10px', marginLeft:'5px'}}></i>
                            </button>

                            {showFilter && (
                                <div style={dropdownMenu}>
                                    {countries.map(country => (
                                        <div 
                                            key={country} 
                                            style={dropdownItem}
                                            onClick={() => {
                                                setSelectedCountry(country);
                                                setShowFilter(false);
                                            }}
                                        >
                                            {country}
                                            {selectedCountry === country && <i className="fas fa-check" style={{marginLeft:'auto', color:'#115e59', fontSize:'10px'}}></i>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* GRID */}
                {loading ? <div>{t('common.loading')}</div> : (
                    <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap:'30px'}}>
                        {filteredList.length === 0 ? (
                            <div style={{gridColumn:'1/-1', textAlign:'center', color:'#888', padding:'50px'}}>{t('newDev.noDevelopments')} {selectedCountry}.</div>
                        ) : (
                            filteredList.map(dev => (
                                <div key={dev._id} style={cardStyle}>
                                    <div style={{...imgStyle, backgroundImage: `url('${dev.imageUrl}')`}}>
                                        <div style={topBadgeLeft}><i className="fas fa-map-marker-alt" style={{marginRight:'5px'}}></i> {dev.location}</div>
                                        <div style={topBadgeRight}>Completion: {dev.completion}</div>
                                    </div>

                                    <div style={{padding:'25px', display:'flex', flexDirection:'column', flex:1}}>
                                        <h3 style={{margin:'0 0 5px 0', fontSize:'18px', color:'#111', fontWeight:'bold'}}>{dev.title}</h3>
                                        <p style={{margin:'0 0 15px 0', fontSize:'14px', color:'#64748b'}}>{dev.subtitle}</p>
                                        
                                        <ul style={{paddingLeft:'20px', margin:'0 0 20px 0', fontSize:'13px', color:'#333', lineHeight:'1.8'}}>
                                            <li>{t('newDev.from')} {formatPrice(dev.priceStart)}</li>
                                            <li>{t('newDev.estimatedYield')}: {dev.yieldRange}</li>
                                            {dev.unitCount != null && dev.unitCount > 0 && <li>{dev.unitCount} unit{dev.unitCount !== 1 ? 's' : ''}</li>}
                                        </ul>

                                        <button 
                                            onClick={() => setSelectedDev(dev)} 
                                            style={viewLink}
                                        >
                                            {t('newDev.viewDevelopment')}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {selectedDev && (
                    <DevelopmentModal
                        dev={selectedDev}
                        detail={selectedDevDetail}
                        detailLoading={detailLoading}
                        onClose={() => { setSelectedDev(null); setSelectedDevDetail(null); }}
                    />
                )}

        </main>
    );
};

// --- STYLES ---
const cardStyle = { background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'transform 0.2s', display:'flex', flexDirection:'column' };
const imgStyle = { height: '220px', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' };

const topBadgeLeft = { position: 'absolute', top: '15px', left: '15px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center' };
const topBadgeRight = { position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.9)', color: '#111', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight:'bold' };

const filterBtn = { padding: '8px 20px', borderRadius: '30px', border: '1px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '13px', display:'flex', alignItems:'center', color:'#333', fontWeight:'500', minWidth:'120px', justifyContent:'space-between' };
const viewLink = { background: 'none', border: 'none', color: '#115e59', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '13px', fontWeight: 'bold', textAlign:'left', marginTop:'auto' };

// Dropdown Styles
const dropdownMenu = { position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 5px 20px rgba(0,0,0,0.1)', width: '160px', zIndex: 10, overflow: 'hidden' };
const dropdownItem = { padding: '10px 15px', fontSize: '13px', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.2s', borderBottom:'1px solid #f9f9f9' };

// Modal Styles
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent = { background: 'white', width: '600px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' };
const modalImage = { width: '100%', height: '300px', objectFit: 'cover' };
const closeBtn = { background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' };
const pillBadge = { background: '#f1f5f9', color: '#64748b', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', textTransform:'uppercase', fontWeight:'bold' };
const inquireBtn = { width: '100%', padding: '15px', background: '#ffc801', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' };

export default NewDevelopments;