import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import axios from 'axios';

const CRM = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    // Hardcoded columns for CRM statuses
    const columns = [
        { id: 'New', title: 'New Leads' },
        { id: 'Negotiating', title: 'Negotiating' },
        { id: 'Closed', title: 'Closed Deals' }
    ];

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const res = await axios.get(`http://localhost:5000/api/users/dashboard/${user._id}`);
                const source = res.data.agentStats || res.data.stats;
                setLeads(source?.crmLeads || []);
                setLoading(false);
            } catch (err) {
                console.error("CRM fetch error:", err);
                setLoading(false);
            }
        };
        fetchData();
    }, [user._id]);

    const seedData = async () => {
        if (!user) return;
        if (!window.confirm(`Populate CRM with dummy data?`)) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/users/seed/${user._id}`);
            if (res.data.success) {
                alert("Database Seeded Successfully!");
                window.location.reload();
            }
        } catch (err) {
            alert("Error seeding data");
        }
    };

    if (loading) return <div style={{ marginLeft: '280px', padding: '30px' }}>Loading CRM...</div>;

    return (
        <div className="dashboard-container" style={{ display: 'flex' }}>
            <Sidebar />
            
            <main className="dash-content" style={{ flex: 1, marginLeft: '280px', padding: '30px', backgroundColor: '#fdfdfd', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
                
                {/* HEADER SECTION */}
                <header style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111', margin: 0 }}>Client Relationships</h2>
                        <div style={{ fontSize: '12px', color: '#888' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
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
                            <i className="fas fa-user-plus"></i> Add New Client
                        </button>
                        <div style={{ display: 'flex', gap: '15px', color: '#666', fontSize: '18px' }}>
                            <i className="far fa-bell" style={{ cursor: 'pointer' }}></i>
                            <i className="far fa-envelope" style={{ cursor: 'pointer' }}></i>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1f3a3d', margin: '0 0 5px 0' }}>CRM Board</h1>
                        <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>Total Active Leads: {leads.length}</p>
                    </div>
                </header>

                {/* CRM BOARD (Kanban Style) */}
                <div className="pipeline-board" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px' }}>
                    
                    {columns.map(col => {
                        // Filter leads for this column
                        const colLeads = leads.filter(l => l.status === col.id);
                        
                        return (
                            <div key={col.id} style={{ minWidth: '320px', flex: 1 }}>
                                
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
                                        <div style={{ fontSize: '11px', opacity: 0.8 }}>Value: 
                                            {/* Sum budgets if numeric, else just count */}
                                            {colLeads.length > 0 ? " Active" : " 0"}
                                        </div>
                                    </div>
                                    <div style={{ 
                                        background: 'rgba(255,255,255,0.2)', 
                                        borderRadius: '50%', 
                                        width: '24px', height: '24px', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: 'bold'
                                    }}>
                                        {colLeads.length}
                                    </div>
                                </div>

                                {/* CARDS TRACK */}
                                <div style={{ 
                                    background: '#f8fafc', 
                                    border: '1px solid #e2e8f0',
                                    borderTop: 'none',
                                    borderBottomLeftRadius: '12px', 
                                    borderBottomRightRadius: '12px',
                                    padding: '15px',
                                    minHeight: '500px'
                                }}>
                                    {colLeads.map((lead, index) => (
                                        <div key={index} style={{ 
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
                                            {/* Card Top: Name & Initials */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                <div style={{ 
                                                    width: '32px', height: '32px', borderRadius: '50%', 
                                                    background: '#e0f2f1', color: '#115e59', fontWeight: 'bold',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                                }}>
                                                    {lead.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{lead.name}</div>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{lead.email}</div>
                                                </div>
                                            </div>
                                            
                                            {/* Card Details */}
                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Interest: {lead.type}</div>
                                            
                                            {/* Budget Display */}
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                                                {lead.budget}
                                            </div>

                                            {/* Footer: Last Contact */}
                                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Last Contact:</span>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b' }}>{lead.lastContact}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                </div>
            </main>
        </div>
    );
};

export default CRM;