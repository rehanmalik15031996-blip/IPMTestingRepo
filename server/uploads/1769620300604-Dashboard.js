import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Dashboard = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const [data, setData] = useState({ 
        stats: {}, 
        listData: [], 
        vaultCount: 0, 
        newsFeeds: [],
        marketTrends: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                const res = await axios.get(`http://localhost:5000/api/users/dashboard/${user._id}`);
                setData({
                    stats: res.data.stats || {},
                    listData: res.data.data || [],
                    vaultCount: res.data.vaultCount || 0,
                    newsFeeds: res.data.newsFeeds || [],
                    marketTrends: res.data.marketTrends || []
                });
                setLoading(false);
            } catch (err) {
                console.error("Dashboard Fetch Error:", err);
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { 
        style: 'currency', currency: 'USD', notation: 'compact' 
    }).format(val || 0);

    // Helper: Map property locations to coordinates for map markers
    const getCoordinates = (location) => {
        if (!location) return { left: '20%', top: '40%' };
        const loc = location.toLowerCase();
        if (loc.includes("dubai")) return { left: '55%', top: '45%' };
        if (loc.includes("london")) return { left: '48%', top: '30%' };
        if (loc.includes("africa")) return { left: '52%', top: '70%' };
        return { left: '20%', top: '40%' };
    };

    if (loading) return <div style={{marginLeft: '280px', padding: '40px'}}>Loading Dashboard...</div>;

    const seedData = async () => {
        if(!window.confirm(`Populate database with dummy data for ${user.role}?`)) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/users/seed/${user._id}`);
            if (res.data.success) {
                alert("Database Seeded Successfully!");
                window.location.reload(); // Refresh to show new data
            }
        } catch (err) {
            alert("Error seeding data: " + (err.response?.data?.message || err.message));
        }
    };

    // --- RENDER AGENCY VIEW ---
    const renderAgencyView = () => (
        <main style={{ flex: 1, marginLeft: '280px', padding: '40px', fontFamily: "'Segoe UI', sans-serif" }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <div>
                            <h2 style={{ fontSize: '28px', fontWeight: '700' }}>Good day, {user.name}!</h2>
                            <p style={{ color: '#888' }}>Agency View &bull; Welcome back</p>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            {/* ✅ ADD THE SEED BUTTON HERE */}
                            <button 
                                onClick={seedData} 
                                style={{ background: '#1f3a3d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                <i className="fas fa-sync" style={{marginRight: '8px'}}></i> Sync Dummy Data
                            </button>
                            
                            <button style={agencyAddBtn}>+ Add Agent</button>
                            <div style={iconCircle}><i className="fas fa-bell"></i></div>
                        </div>
                    </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '30px' }}>
                <StatBox label="ACTIVE PROPERTIES" value={data.stats.totalListings || 0} subtext="Properties by listing month" chartType="bar" data={data.listData} color="#1f3a3d" />
                <StatBox label="ACTIVE LEADS" value={data.stats.activeLeads || 0} subtext="Active leads in pipeline" chartType="bar" data={data.listData} color="#00c2cb" />
                <StatBox label="SALES (USD)" value={formatCurrency(data.stats.totalRevenue)} subtext="Performance against target"/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '25px' }}>
                <div style={cardStyle}>
                    <h4 style={cardTitle}>ACTIVE PROPERTIES BY REGION</h4>
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg" alt="map" style={{ width: '100%', opacity: 0.1 }} />
                    </div>
                </div>
                <div style={cardStyle}>
                    <h4 style={cardTitle}>TOP AGENTS</h4>
                    {data.stats.topAgents?.map((agent, i) => (
                        <div key={i} style={earningRow}>
                            <div style={{fontWeight: '600', fontSize: '14px'}}>{agent.name}</div>
                            <div style={{color: '#00c2cb', fontWeight: 'bold'}}>{formatCurrency(agent.revenue)}</div>
                        </div>
                    ))}
                </div>
                <div style={cardStyle}>
                    <h4 style={cardTitle}>SALES BY REGION</h4>
                    <div style={{marginTop: '15px'}}>
                        <RegionProgress label="Dubai" val={37} />
                        <RegionProgress label="United Kingdom" val={2} />
                        <RegionProgress label="South Africa" val={0} />
                    </div>
                </div>
            </div>
        </main>

        
    );

    // --- RENDER INVESTOR VIEW ---
    const renderInvestorView = () => (
        <main style={{ flex: 1, marginLeft: '280px', padding: '40px', fontFamily: "'Segoe UI', sans-serif" }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }}>Good day, {user?.name.split(' ')[0]}!</h2>
                <div style={{ display: 'flex', gap: '15px' }}>
                    {['search', 'microphone', 'map', 'bell', 'envelope'].map(icon => (
                        <div key={icon} style={iconCircle}><i className={`fas fa-${icon}`}></i></div>
                    ))}
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '30px' }}>
                <StatBox label="OWNED PROPERTIES" value={data.stats.totalProperties || 0} subtext="Properties in Portfolio" chartColor="#1f3a3d" data={data.listData} dataKey="investedAmount" />
                <StatBox label="AVERAGE ROI" value={`${data.stats.avgRoi || 0}%`} subtext="ANNUAL RETURN" chartColor="#00c2cb" data={data.listData} dataKey="roi" />
                <StatBox label="ASSET VALUE" value={formatCurrency(data.stats.currentValue)} subtext="+8.5% YTD" chartColor="#f39c12" isTrend data={data.listData} dataKey="currentValue" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '25px', marginBottom: '30px' }}>
                <div style={cardStyle}>
                    <h4 style={cardTitle}>MY PROPERTIES BY REGION</h4>
                    <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg" alt="world map" style={{ width: '100%', opacity: 0.1 }} />
                        {data.listData.map((prop, i) => (
                            <div key={i} style={{ position: 'absolute', color: '#00c2cb', ...getCoordinates(prop.location) }}><i className="fas fa-map-marker-alt"></i></div>
                        ))}
                    </div>
                </div>

                <div style={cardStyle}>
                    <h4 style={cardTitle}>Portfolio Earnings</h4>
                    {data.listData.map((property, i) => (
                        <div key={i} style={earningRow}>
                            <div>
                                <div style={{fontWeight:'600', fontSize:'14px'}}>{property.propertyTitle}</div>
                                <div style={{fontSize:'11px', color:'#999'}}>{formatCurrency(property.currentValue)} VALUE</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                                <div style={{color:'#16a34a', fontWeight:'bold', fontSize:'14px'}}>{property.roi}%</div>
                                <div style={{fontSize:'11px', color:'#999'}}>{formatCurrency(property.investedAmount*0.1)}/yr</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '25px' }}>
                <div style={cardStyle}>
                    <h4 style={cardTitle}>MY SECURE DIGITAL VAULT</h4>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f39c12', margin: '20px 0' }}>{data.vaultCount} DOCUMENTS</div>
                    <button style={addButton}><i className="fas fa-plus"></i> Add documents</button>
                </div>
                <div style={cardStyle}>
                    <h4 style={cardTitle}>Market Trends</h4>
                    {data.marketTrends.map((trend, i) => (
                        <TrendRow key={i} country={trend.country} status={trend.status} color={trend.color} price={trend.priceChange} />
                    ))}
                </div>
                <div style={cardStyle}>
                    <h4 style={cardTitle}>News Feeds</h4>
                    {data.newsFeeds.map((news, i) => (
                        <div key={i} style={{padding:'12px 0', borderBottom:'1px solid #eee'}}>
                            <div style={{fontSize: '10px', color: '#00c2cb', fontWeight: 'bold'}}>{news.category?.toUpperCase() || 'MARKET'}</div>
                            <div style={{fontSize: '13px', fontWeight: '600', color: '#333'}}>{news.title}</div>
                            <div style={{fontSize: '11px', color: '#bbb', marginTop: '4px'}}>{news.date}</div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );

    return (
        <div style={{ display: 'flex', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
            <Sidebar />
            {user?.role?.toLowerCase() === 'agency' ? renderAgencyView() : renderInvestorView()}
        </div>
    );
};

// --- COMPONENTS ---
const StatBox = ({ label, value, subtext, chartColor, data, dataKey, isTrend, chartType, color, percent }) => (
    <div style={{ background: 'white', padding: '25px', borderRadius: '24px', display: 'flex', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ flex: 1, zIndex: 2 }}>
            <div style={{ fontSize: '11px', color: '#aaa', fontWeight: 'bold' }}>{label}</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#1a1a1a', margin: '10px 0' }}>{value}</div>
            <div style={{ fontSize: '12px', color: isTrend ? '#16a34a' : '#aaa' }}>{subtext}</div>
        </div>
        <div style={{ width: '120px', height: '100px', position: 'absolute', right: -10, bottom: -20 }}>
            <ResponsiveContainer width="100%" height="100%">
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

const TrendRow = ({ country, status, color, price }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f1f1' }}>
        <div style={{ fontSize: '14px', fontWeight: '600' }}>{country} <span style={{fontSize:'10px', color:'#999'}}>{price}</span></div>
        <span style={{ fontSize: '10px', color: 'white', background: color, padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{status.toUpperCase()}</span>
    </div>
);

const cardStyle = { background: 'white', padding: '25px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative' };
const cardTitle = { margin: 0, fontSize: '12px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' };
const earningRow = { display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #f8f9fa' };
const iconCircle = { width: '42px', height: '42px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00c2cb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', cursor: 'pointer' };
const addButton = { border: 'none', background: '#eee', color: '#666', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };
const agencyAddBtn = { border: 'none', background: '#ccc', color: '#666', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' };

export default Dashboard;