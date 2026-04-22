import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import api from '../config/api';
import { invalidateDashboardCache } from '../config/dashboardCache';
import Sidebar from './Sidebar';
import PropertyUploadForm from './PropertyUploadForm';
import { showNotification } from './NotificationManager';
import { useIsMobile } from '../hooks/useMediaQuery';

const AgentDashboard = () => {
    const isMobile = useIsMobile();
    const user = JSON.parse(localStorage.getItem('user'));

    const [agentStats, setAgentStats] = useState({
        myCommission: 0,
        activeListings: 0,
        pendingDeals: 0,
        meetingsScheduled: 0,
        recentLeads: []
    });
    const [seeding, setSeeding] = useState(false);
    const [agentProperties, setAgentProperties] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editPropertyId, setEditPropertyId] = useState(null);
    const [editInitialData, setEditInitialData] = useState(null);
    const [editLoading, setEditLoading] = useState(false);

    const chartPropRef = useRef(null);
    const chartLeadsRef = useRef(null);
    const chartRevRef = useRef(null);

    const fetchAgentProperties = useCallback(async () => {
        if (!user?._id) return;
        try {
            const res = await api.get('/api/properties');
            const myList = (res.data || []).filter((p) => p.agentId === user._id);
            setAgentProperties(myList);
        } catch (err) {
            console.error("Agent properties fetch error:", err);
        }
    }, [user?._id]);

    const fetchAgentStats = useCallback(async (userId) => {
        if (!userId) return;
        try {
            const res = await api.get(`/api/users/${userId}?type=dashboard`);
            if (res.data?.agentStats) setAgentStats(res.data.agentStats);
        } catch (err) {
            console.error("Agent dashboard fetch error:", err);
        }
    }, []);

    useEffect(() => {
        if (!user?._id) return;
        invalidateDashboardCache(user._id);
        fetchAgentStats(user._id);
    }, [user?._id, fetchAgentStats]);

    useEffect(() => {
        fetchAgentProperties();
    }, [fetchAgentProperties]);

    // Refetch when page is restored from bfcache (e.g. Back button) so user doesn't see stale dashboard
    useEffect(() => {
        const onPageShow = (e) => {
            if (!e.persisted) return;
            const u = (() => {
                try {
                    return JSON.parse(localStorage.getItem('user'));
                } catch (_) {
                    return null;
                }
            })();
            if (u?._id) {
                fetchAgentStats(u._id);
                fetchAgentProperties();
            }
        };
        window.addEventListener('pageshow', onPageShow);
        return () => window.removeEventListener('pageshow', onPageShow);
    }, [fetchAgentStats, fetchAgentProperties]);

    const handleEditProperty = async (property) => {
        const id = property._id;
        if (!id) return;
        setEditLoading(true);
        try {
            let res = await api.get('/api/properties', { params: { id } });
            if (Array.isArray(res.data)) {
                res = await api.get(`/api/properties/${id}`);
            }
            setEditInitialData(res.data);
            setEditPropertyId(id);
            setShowEditModal(true);
        } catch (err) {
            console.error("Failed to load property for edit:", err);
            showNotification("Unable to load property for editing.", "error");
        } finally {
            setEditLoading(false);
        }
    };

    useEffect(() => {
        const orangeColor = '#ffc801';
        const yellowColor = '#ffc801';
        
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false } }
        };

        // 1. Active Properties Chart
        const ctxProp = document.getElementById('agentPropChart');
        if (ctxProp) {
            if (chartPropRef.current) chartPropRef.current.destroy();
            chartPropRef.current = new Chart(ctxProp, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                    datasets: [{ data: Array(7).fill(agentStats.activeListings || 0), backgroundColor: orangeColor, borderRadius: 3 }]
                },
                options: commonOptions
            });
        }

        // 2. Active Leads Chart
        const ctxLeads = document.getElementById('agentLeadsChart');
        if (ctxLeads) {
            if (chartLeadsRef.current) chartLeadsRef.current.destroy();
            chartLeadsRef.current = new Chart(ctxLeads, {
                type: 'bar',
                data: {
                    labels: ['New', 'Contact', 'Qualify', 'Close'],
                    datasets: [{ data: [agentStats.recentLeads.length || 0, 0, 0, 0], backgroundColor: yellowColor, borderRadius: 3 }]
                },
                options: { ...commonOptions, indexAxis: 'y' }
            });
        }

        // 3. Revenue / Commission Target Chart
        const ctxRev = document.getElementById('agentRevChart');
        if (ctxRev) {
            if (chartRevRef.current) chartRevRef.current.destroy();
            chartRevRef.current = new Chart(ctxRev, {
                type: 'doughnut',
                data: {
                    labels: ['Achieved', 'Remaining'],
                    datasets: [{ 
                        data: [
                            agentStats.myCommission || 0,
                            Math.max((agentStats.myCommission || 0) * 0.25, 1)
                        ],
                        backgroundColor: ['#b45309', '#eee'],
                        borderWidth: 0
                    }]
                },
                options: { cutout: '75%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        return () => {
            if (chartPropRef.current) chartPropRef.current.destroy();
            if (chartLeadsRef.current) chartLeadsRef.current.destroy();
            if (chartRevRef.current) chartRevRef.current.destroy();
        };
    }, [agentStats]);

    // ✅ Corrected handleSeed function
    const handleSeed = async () => {
        if (!user || !user._id) {
            alert("User ID not found. Please log in again.");
            return;
        }

        setSeeding(true);

        try {
            // Updated URL to match your backend route structure
            const res = await api.put(`/api/users/${user._id}`, { action: 'seed' });
            
            if (res.data.success) {
                alert("✅ Database Seeded Successfully!");
                window.location.reload(); // Refresh to show new data
            }
        } catch (err) {
            console.error('Seed error', err);
            const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
            alert(`❌ Seed Failed: ${errorMessage}`);
        } finally {
            setSeeding(false);
        }
    };

    const totalLeads = agentStats.recentLeads?.length || 0;

    return (
        <div className="dashboard-container" style={{ display: 'flex' }}>
            {/* SIDEBAR (same as other app pages) */}
            <Sidebar />

            {/* MAIN CONTENT */}
            <main 
                className="dashboard-main" 
                style={{ 
                    flex: 1, 
                    padding: isMobile ? '16px' : '30px', 
                    background: '#f4f5f7', 
                    minHeight: '100vh', 
                    fontFamily: "'Inter', sans-serif" 
                }}
            >
                {/* HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ margin: 0, color: '#111', fontSize: '24px' }}>Good day, {user?.name || 'Agent'}!</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button 
                            onClick={handleSeed}
                            disabled={seeding}
                            style={{ 
                                background: '#1f3a3d', 
                                color: 'white', 
                                border: 'none', 
                                padding: '8px 16px', 
                                borderRadius: '20px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '5px' 
                            }}
                        >
                            {seeding ? 'Seeding...' : <><i className="fas fa-sync"></i> Seed Data</>}
                        </button>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            style={{ background: '#11575C', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <i className="fas fa-plus"></i> Add Property
                        </button>
                        <div style={{ color: '#888', fontSize: '12px' }}>
                            {new Date().toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </div>
                    </div>
                </div>

            {/* TOP STATS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                
                {/* Prop Card */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div><span style={labelStyle}>ACTIVE PROPERTIES</span><div style={numberStyle}>{agentProperties.length || agentStats.activeListings}</div></div>
                        <div style={{ width: '120px', height: '60px' }}><canvas id="agentPropChart"></canvas></div>
                    </div>
                </div>

                {/* Leads Card */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div><span style={labelStyle}>ACTIVE LEADS</span><div style={numberStyle}>{totalLeads}</div></div>
                        <div style={{ width: '120px', height: '60px' }}><canvas id="agentLeadsChart"></canvas></div>
                    </div>
                </div>

                {/* Revenue Card */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <span style={labelStyle}>MY COMMISSION (AED)</span>
                            <div style={numberStyle}>{agentStats.myCommission?.toLocaleString() || 0}</div>
                        </div>
                        <div style={{ width: '100px', height: '100px', position: 'relative' }}>
                            <canvas id="agentRevChart"></canvas>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold', color: '#888' }}>71%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MIDDLE ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr 2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                
                {/* Map */}
                <div style={cardStyle}>
                    <span style={labelStyle}>ACTIVE PROPERTIES BY REGION</span>
                    <div style={{ height: '200px', backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')", backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.6, marginTop: '20px' }}></div>
                </div>

                {/* My listings: upload + edit (full PropertyUploadForm) */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <span style={labelStyle}>MY LISTINGS</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{agentProperties.length} propert{agentProperties.length === 1 ? 'y' : 'ies'}</span>
                    </div>
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {agentProperties.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No properties yet. Use &quot;Add Property&quot; to upload (full flow + vault).</div>
                        ) : (
                            agentProperties.map((p) => (
                                <div
                                    key={p._id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 0',
                                        borderBottom: '1px solid #f1f5f9'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '56px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            background: p.imageUrl ? `url('${p.imageUrl}') center/cover` : '#e2e8f0'
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f3a3d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title || 'Untitled'}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{p.location || p.price || '—'}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleEditProperty(p)}
                                        disabled={editLoading}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #11575C',
                                            background: 'white',
                                            color: '#11575C',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: editLoading ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Lead List */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span style={labelStyle}>ACTIVE LEAD LIST</span>
                        <div style={{ fontSize: '12px', color: '#999' }}>Sort by: <span style={{ textDecoration: 'underline' }}>Status</span></div>
                    </div>
                    <table style={{ width: '100%' }}>
                        <thead style={{ color: '#aaa', fontSize: '11px', textAlign: 'left' }}>
                            <tr><th>Name</th><th>Source</th><th>Score</th><th>Matches</th><th>Engagement</th></tr>
                        </thead>
                        <tbody style={{ fontSize: '13px' }}>
                            {agentStats.recentLeads?.map((l, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                                            {l.name?.charAt(0)}
                                        </div>
                                        {l.name}
                                    </td>
                                    <td>{l.status}</td>
                                    <td><div style={{ width: '30px', height: '6px', background: '#eee', borderRadius: '3px' }}><div style={{ width: `75%`, background: '#ffc801', height: '100%', borderRadius: '3px' }}></div></div></td>
                                    <td style={{ color: '#11575C', fontWeight: 'bold', textDecoration: 'underline' }}>{l.property}</td>
                                    <td style={{ color: '#666' }}>{l.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Sales Region List */}
                <div style={cardStyle}>
                    <span style={labelStyle}>SALES BY REGION</span>
                    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[{ n: 'Dubai', v: 12 }, { n: 'United Kingdom', v: 1 }, { n: 'Australia', v: 0 }].map((r, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}><span>{r.n}</span><span>{r.v}</span></div>
                                <div style={{ background: '#eee', height: '5px', borderRadius: '3px', marginTop: '3px' }}>
                                    <div style={{ width: `${r.v * 5}%`, background: '#11575C', height: '100%', borderRadius: '3px' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

                {/* BOTTOM ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                
                {/* My Mandates */}
                <div style={cardStyle}>
                    <span style={labelStyle}>MY MANDATES</span>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <div style={{ flex: 1, height: '100px', borderRadius: '8px', backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-2a429ad83e5c?ixlib=rb-4.0.3')", backgroundSize: 'cover', position: 'relative' }}>
                            <span style={{ position: 'absolute', bottom: '5px', left: '5px', color: 'white', fontSize: '10px', fontWeight: 'bold', textShadow: '0 1px 2px black' }}>Mareva The Oasis</span>
                        </div>
                        <div style={{ flex: 1, height: '100px', borderRadius: '8px', backgroundImage: "url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3')", backgroundSize: 'cover', position: 'relative' }}>
                            <span style={{ position: 'absolute', bottom: '5px', left: '5px', color: 'white', fontSize: '10px', fontWeight: 'bold', textShadow: '0 1px 2px black' }}>Avelia</span>
                        </div>
                    </div>
                </div>

                {/* Calendar */}
                <div style={cardStyle}>
                    <span style={labelStyle}>CALENDAR + SCHEDULE</span>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                        <div style={{ flex: 1, fontSize: '10px', color: '#ccc' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center' }}>
                                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                                <span>1</span><span>2</span><span>3</span><span>4</span><span style={{ background: '#11575C', color: 'white', borderRadius: '4px' }}>5</span><span>6</span><span>7</span>
                            </div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>09h30</span> Roger Smith</div>
                            <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>11h00</span> Zara Aziz</div>
                        </div>
                    </div>
                </div>

                {/* Insights */}
                <div style={cardStyle}>
                    <span style={labelStyle}>MARKET INSIGHTS</span>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px', marginBottom: '10px' }}>
                        <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px', flex: 1 }}>
                            <div style={{ fontSize: '10px', color: '#666' }}>Avg Price</div>
                            <div style={{ color: '#166534', fontSize: '16px', fontWeight: 'bold' }}>+5.2%</div>
                        </div>
                        <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px', flex: 1 }}>
                            <div style={{ fontSize: '10px', color: '#666' }}>Days Market</div>
                            <div style={{ color: '#1e40af', fontSize: '16px', fontWeight: 'bold' }}>28 days</div>
                        </div>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Real Estate Market Resilience...</div>
                    <div style={{ fontSize: '10px', color: '#11575C', cursor: 'pointer' }}>Read more →</div>
                </div>

            </div>

                {/* PERFORMANCE FOOTER STRIP */}
                <div style={{ background: '#fcfcfc', borderRadius: '12px', padding: isMobile ? '15px' : '15px 25px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: isMobile ? '12px' : 0, boxShadow: '0 -2px 10px rgba(0,0,0,0.02)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '24px', height: '24px', background: '#ffc801', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><i className="fas fa-check"></i></div>
                    <div>
                        <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>My Performance</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>You have {agentStats.pendingDeals || 0} deals in pipeline</div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: isMobile ? '16px' : '40px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: '10px', color: '#888' }}>Active listings:</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffc801' }}>{agentProperties.length || agentStats.activeListings}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', color: '#888' }}>Meetings scheduled:</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffc801' }}>{agentStats.meetingsScheduled}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', color: '#888' }}>Leads in CRM:</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffc801' }}>{totalLeads}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', color: '#888' }}>Pending deals:</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffc801' }}>{agentStats.pendingDeals}</div>
                    </div>
                </div>
                </div>

            {/* Full upload: same as Portfolio/ListingManagement (steps, vault, quick-jump) */}
            <PropertyUploadForm
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={() => {
                    showNotification('Property uploaded successfully!', 'success');
                    fetchAgentProperties();
                    setShowUploadModal(false);
                }}
            />

            {/* Full edit: same as Portfolio (quick-jump 1–13, Save Draft, Publish) */}
            <PropertyUploadForm
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditInitialData(null);
                    setEditPropertyId(null);
                }}
                onSuccess={() => {
                    showNotification('Property updated successfully!', 'success');
                    fetchAgentProperties();
                    setShowEditModal(false);
                    setEditInitialData(null);
                    setEditPropertyId(null);
                }}
                initialData={editInitialData}
                propertyId={editPropertyId}
            />
            </main>
        </div>
    );
};

// Styles
const cardStyle = { background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' };
const labelStyle = { fontSize: '10px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.5px', textTransform: 'uppercase' };
const numberStyle = { fontSize: '32px', fontWeight: '800', color: '#0f393b', marginTop: '5px' };

export default AgentDashboard;