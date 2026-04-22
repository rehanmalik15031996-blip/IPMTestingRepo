import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { useIsMobile } from '../hooks/useMediaQuery';
import { usePreferences } from '../context/PreferencesContext';

const Profile = () => {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const { formatAssetValueCompact, convertToPreferredCurrency } = usePreferences();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    
    // Edit Form State
    const [formData, setFormData] = useState({});

    useEffect(() => {
        // 1. Get Logged In User ID
        const loggedUser = JSON.parse(localStorage.getItem('user'));
        if (!loggedUser) {
            navigate('/login');
            return;
        }
        fetchUserData(loggedUser._id || loggedUser.user._id); // Handle different token structures
    }, [navigate]);

    const fetchUserData = async (id) => {
        try {
            // Fetch fresh data from DB to get latest stats
            const res = await api.get(`/api/users/${id}`);
            setUser(res.data);
            setFormData(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching profile:", err);
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put(`/api/users/${user._id}`, formData);
            setUser(res.data.data || formData); // Update local state
            setShowEditModal(false);
            alert("✅ Profile Updated Successfully");
        } catch (err) {
            alert("Error updating profile");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
        window.location.reload();
    };

    if (loading) return <div style={centerFlex}>Loading Profile...</div>;

    // --- RENDER HELPERS ---
    const isInvestor = user.role === 'Investor';
    const isAgent = user.role === 'Agent';
    const isAgency = user.role === 'agency';

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            
            {/* HERO HEADER */}
            <div style={headerStyle}>
                <div style={contentWrapper}>
                    <div style={{ ...profileHeader, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-end' }}>
                        <img 
                            src={user.photo || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                            alt="Profile" 
                            style={avatarStyle} 
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h1 style={{ margin: 0, fontSize: '32px' }}>{user.name}</h1>
                                <span style={roleBadge}>{user.role}</span>
                            </div>
                            <p style={{ color: '#94a3b8', margin: '5px 0' }}>{user.email} • {user.location || 'Location not set'}</p>
                            <p style={{ maxWidth: '600px', fontSize: '14px', color: '#cbd5e1', marginTop: '10px' }}>
                                {user.bio || "No bio added yet."}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                            <button onClick={() => setShowEditModal(true)} style={editBtn}>Edit Profile</button>
                            <button onClick={handleLogout} style={logoutBtn}>Log Out</button>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ ...contentWrapper, marginTop: '-50px' }}>
                
                {/* 1. KEY STATS DASHBOARD */}
                <div style={statsGrid}>
                    {/* INVESTOR STATS */}
                    {isInvestor && (
                        <>
                            <StatCard icon="fas fa-wallet" title="Total Invested" value={formatAssetValueCompact(convertToPreferredCurrency(user.portfolio?.reduce((a, b) => a + (b.investedAmount || 0), 0) || 0, 'USD'))} />
                            <StatCard icon="fas fa-chart-line" title="Active Properties" value={user.portfolio?.length || 0} />
                            <StatCard icon="fas fa-percentage" title="Avg. ROI" value="12.5%" />
                        </>
                    )}

                    {/* AGENT STATS */}
                    {isAgent && (
                        <>
                            <StatCard icon="fas fa-coins" title="My Commission" value={formatAssetValueCompact(convertToPreferredCurrency(user.agentStats?.myCommission || 0, 'USD'))} />
                            <StatCard icon="fas fa-home" title="Active Listings" value={user.agentStats?.activeListings || 0} />
                            <StatCard icon="fas fa-handshake" title="Pending Deals" value={user.agentStats?.pendingDeals || 0} />
                        </>
                    )}

                    {/* AGENCY STATS */}
                    {isAgency && (
                        <>
                            <StatCard icon="fas fa-building" title="Total Revenue" value={formatAssetValueCompact(convertToPreferredCurrency(user.agencyStats?.totalRevenue || 0, 'USD'))} />
                            <StatCard icon="fas fa-users" title="Active Agents" value={user.agencyStats?.activeAgents || 0} />
                            <StatCard icon="fas fa-chart-pie" title="Properties Sold" value={user.agencyStats?.propertiesSold || 0} />
                        </>
                    )}
                </div>

                {/* 2. MAIN CONTENT SECTIONS */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '30px', marginTop: '40px', paddingBottom: '50px' }}>
                    
                    {/* LEFT COLUMN: Lists */}
                    <div>
                        <h3 style={sectionTitle}>
                            {isInvestor ? "My Investment Portfolio" : isAgency ? "Top Performing Agents" : "Active Pipeline"}
                        </h3>

                        {/* INVESTOR PORTFOLIO */}
                        {isInvestor && (
                            <div style={cardBox}>
                                {user.portfolio?.length > 0 ? user.portfolio.map((item, i) => (
                                    <div key={i} style={listItem}>
                                        <div style={iconBox}><i className="fas fa-city"></i></div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{item.propertyTitle}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{item.location}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 'bold', color: '#115e59' }}>${item.currentValue?.toLocaleString()}</div>
                                            <div style={{ fontSize: '11px', color: '#16a34a' }}>+{item.roi}% ROI</div>
                                        </div>
                                    </div>
                                )) : <p style={emptyText}>No investments yet. Check the Collection!</p>}
                            </div>
                        )}

                        {/* AGENCY TEAM LIST */}
                        {isAgency && (
                            <div style={cardBox}>
                                {user.agencyStats?.topAgents?.length > 0 ? user.agencyStats.topAgents.map((agent, i) => (
                                    <div key={i} style={listItem}>
                                        <div style={iconBox}><i className="fas fa-user-tie"></i></div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{agent.name}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>Sales: {agent.sales} units</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 'bold', color: '#115e59' }}>AED {agent.revenue?.toLocaleString()}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Revenue Generated</div>
                                        </div>
                                    </div>
                                )) : <p style={emptyText}>No agents registered.</p>}
                            </div>
                        )}

                        {/* AGENT PIPELINE */}
                        {isAgent && (
                            <div style={cardBox}>
                                {user.agentStats?.pipelineDeals?.length > 0 ? user.agentStats.pipelineDeals.map((deal, i) => (
                                    <div key={i} style={listItem}>
                                        <div style={iconBox}><i className="fas fa-file-contract"></i></div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{deal.property}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>Client: {deal.name}</div>
                                        </div>
                                        <div style={statusBadge(deal.status)}>{deal.status}</div>
                                    </div>
                                )) : <p style={emptyText}>No active deals in pipeline.</p>}
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Contact & Bio */}
                    <div>
                        <div style={cardBox}>
                            <h4 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>Contact Details</h4>
                            <div style={infoRow}><i className="fas fa-phone" style={{ color: '#115e59' }}></i> {user.phone || "No phone linked"}</div>
                            <div style={infoRow}><i className="fas fa-envelope" style={{ color: '#115e59' }}></i> {user.email}</div>
                            <div style={infoRow}><i className="fas fa-map-marker-alt" style={{ color: '#115e59' }}></i> {user.location || "Global"}</div>
                        </div>
                        
                        <div style={{ ...cardBox, marginTop: '20px', background: '#115e59', color: 'white' }}>
                            <h4 style={{ margin: '0 0 10px 0' }}>Need Help?</h4>
                            <p style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.6' }}>
                                Contact IPM support for assistance with your portfolio or account settings.
                            </p>
                            <button style={{ width: '100%', padding: '10px', marginTop: '10px', border: 'none', borderRadius: '6px', background: 'white', color: '#115e59', fontWeight: 'bold', cursor: 'pointer' }}>Contact Support</button>
                        </div>
                    </div>

                </div>
            </div>
            <Footer />

            {/* EDIT MODAL */}
            {showEditModal && (
                <div style={modalOverlay}>
                    <div style={{ ...modalContent, maxWidth: isMobile ? '95vw' : '400px', width: isMobile ? '100%' : '400px' }}>
                        <h3>Edit Profile</h3>
                        <form onSubmit={handleUpdate}>
                            <label style={labelStyle}>Full Name</label>
                            <input style={inputStyle} value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            
                            <label style={labelStyle}>Phone Number</label>
                            <input style={inputStyle} value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                            
                            <label style={labelStyle}>Location</label>
                            <input style={inputStyle} value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                            
                            <label style={labelStyle}>Bio / About Me</label>
                            <textarea style={{...inputStyle, height: '80px'}} value={formData.bio || ''} onChange={(e) => setFormData({...formData, bio: e.target.value})} />

                            <label style={labelStyle}>Photo URL</label>
                            <input style={inputStyle} value={formData.photo || ''} onChange={(e) => setFormData({...formData, photo: e.target.value})} />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowEditModal(false)} style={{ ...btnBase, background: '#e2e8f0', color: '#333' }}>Cancel</button>
                                <button type="submit" style={{ ...btnBase, background: '#115e59', color: 'white' }}>Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB COMPONENTS ---
const StatCard = ({ icon, title, value }) => (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#115e59', fontSize: '20px' }}>
            <i className={icon}></i>
        </div>
        <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>{title}</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{value}</div>
        </div>
    </div>
);

// --- STYLES ---
const centerFlex = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#115e59', fontWeight: 'bold' };
const headerStyle = { background: '#0f172a', color: 'white', padding: '120px 0 80px 0' };
const contentWrapper = { maxWidth: '1100px', margin: '0 auto', padding: '0 20px' };
const profileHeader = { display: 'flex', alignItems: 'flex-end', gap: '30px' };
const avatarStyle = { width: '120px', height: '120px', borderRadius: '50%', border: '4px solid white', objectFit: 'cover', background: '#ccc' };
const roleBadge = { background: '#ffc801', color: '#0f172a', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' };
const editBtn = { padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const logoutBtn = { padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };

const statsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' };
const sectionTitle = { fontSize: '18px', color: '#0f172a', marginBottom: '15px', borderLeft: '4px solid #115e59', paddingLeft: '10px' };
const cardBox = { background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const listItem = { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 0', borderBottom: '1px solid #f1f5f9' };
const iconBox = { width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' };
const emptyText = { color: '#94a3b8', fontStyle: 'italic', padding: '10px' };
const infoRow = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#334155', fontSize: '14px' };

const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContent = { background: 'white', padding: '30px', borderRadius: '12px', width: '400px' };
const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginTop: '15px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
const btnBase = { padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };

const statusBadge = (status) => ({
    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
    background: status === 'Closed' ? '#dcfce7' : '#fff7ed',
    color: status === 'Closed' ? '#166534' : '#c2410c'
});

export default Profile;