import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import axios from 'axios';

const ListingManagement = () => {
    const user = JSON.parse(localStorage.getItem('user'));

    const [columns, setColumns] = useState([]);
    const [deals, setDeals] = useState([]);

    // Replace your existing useEffect with this one
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                // Use your unified route instead of agent-dashboard
                const res = await axios.get(`http://localhost:5000/api/users/dashboard/${user._id}`);
                
                // Check both locations for pipeline data to support both roles
                const statsSource = res.data.agentStats || res.data.stats;
                
                if (statsSource) {
                    setColumns(statsSource.pipelineColumns || []);
                    setDeals(statsSource.pipelineDeals || []);
                }
            } catch (err) {
                console.error("ListingManagement fetch error:", err);
            }
        };
        fetchData();
    }, [user._id]); // Use user._id specifically to stabilize the hook

    const seedData = async () => {
        if (!user) return;
        if (!window.confirm(`Populate pipeline with dummy data for ${user.role}?`)) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/users/seed/${user._id}`);
            if (res.data.success) {
                alert("Database Seeded Successfully!");
                window.location.reload();
            }
        } catch (err) {
            alert("Error seeding data: " + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="dashboard-container" style={{ display: 'flex' }}>
            <Sidebar />
            
            <main className="dash-content" style={{ flex: 1, marginLeft: '280px', padding: '30px', backgroundColor: '#fdfdfd', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
                
                {/* HEADER SECTION */}
                <header style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111', margin: 0 }}>Good day, {user.name}!</h2>
                        <div style={{ fontSize: '12px', color: '#888' }}>Saturday, November 20 10:18AM</div>
                    </div>
                    
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button 
                            onClick={seedData}
                            style={{ 
                                background: '#115e59', color: 'white', border: 'none', padding: '10px 18px', 
                                borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
                            }}
                        >
                            <i className="fas fa-sync"></i> Seed Data
                        </button>
                        <button style={{ 
                            background: '#9ca3af', color: 'white', border: 'none', padding: '10px 20px', 
                            borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
                        }}>
                            <i className="fas fa-plus"></i> Add New Lead
                        </button>
                        <div style={{ display: 'flex', gap: '15px', color: '#666', fontSize: '18px' }}>
                            <i className="far fa-bell" style={{ cursor: 'pointer' }}></i>
                            <i className="far fa-envelope" style={{ cursor: 'pointer' }}></i>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1f3a3d', margin: '0 0 5px 0' }}>Pipeline</h1>
                        <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>Total Deals: 85</p>
                    </div>
                </header>

                {/* PIPELINE BOARD (Kanban) */}
                <div className="pipeline-board" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px' }}>
                    
                    {columns.map(col => (
                        <div key={col.id} style={{ minWidth: '300px', flex: 1 }}>
                            
                            {/* COLUMN HEADER */}
                            <div style={{ 
                                background: '#115e59', // Dark Teal
                                color: 'white', 
                                padding: '15px', 
                                borderTopLeftRadius: '12px', 
                                borderTopRightRadius: '12px',
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{col.title}</div>
                                    <div style={{ fontSize: '11px', opacity: 0.8 }}>Total: {col.total}</div>
                                </div>
                                <div style={{ 
                                    background: 'rgba(255,255,255,0.2)', 
                                    borderRadius: '50%', 
                                    width: '24px', height: '24px', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '12px', fontWeight: 'bold'
                                }}>
                                    {col.count}
                                </div>
                            </div>

                            {/* CARDS CONTAINER */}
                            <div style={{ 
                                background: '#f8fafc', // Light gray track
                                border: '1px solid #e2e8f0',
                                borderTop: 'none',
                                borderBottomLeftRadius: '12px', 
                                borderBottomRightRadius: '12px',
                                padding: '15px',
                                minHeight: '500px'
                            }}>
                                {deals.filter(d => d.status === col.id).map(deal => (
                                    <div key={deal.id} style={{ 
                                        background: 'white', 
                                        borderRadius: '8px', 
                                        padding: '15px', 
                                        marginBottom: '15px',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                                        border: '1px solid #f1f5f9',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{deal.name}</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{deal.role}</div>
                                        </div>
                                        
                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{deal.type}</div>
                                        <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: '500', marginBottom: '12px', lineHeight: '1.4' }}>
                                            {deal.property}
                                        </div>

                                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                                            {deal.price}
                                        </div>

                                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Days in stage:</span>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b' }}>{deal.days}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                </div>
            </main>
        </div>
    );
};

export default ListingManagement;