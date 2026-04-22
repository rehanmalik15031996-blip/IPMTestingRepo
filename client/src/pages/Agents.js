import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import { useIsMobile } from '../hooks/useMediaQuery';
import { usePreferences } from '../context/PreferencesContext';
import api from '../config/api';
import { getDashboardCache, setDashboardCache, invalidateDashboardCache } from '../config/dashboardCache';
import { showNotification } from '../components/NotificationManager';
import GooglePlacesInput from '../components/GooglePlacesInput';
import { sanitizeAgencyBranchDisplay } from '../utils/display';

const Agents = () => {
    const isMobile = useIsMobile();
    const { currency: preferredCurrency } = usePreferences();
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user?._id;
    const [agents, setAgents] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showModal, setShowModal] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showTargetsModal, setShowTargetsModal] = useState(false);
    const [showDeleteTransferModal, setShowDeleteTransferModal] = useState(false);
    const [deleteTransferToId, setDeleteTransferToId] = useState('');
    const [deleteTransferLoading, setDeleteTransferLoading] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);
    const [pendingTargetsAgent, setPendingTargetsAgent] = useState(null);
    const [targetForm, setTargetForm] = useState({ name: '', email: '', monthlyTarget: '', commissionRate: '0', branchId: '', agencyName: '' });
    const [branchForm, setBranchForm] = useState({ name: '', address: '' });
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', branchId: ''
    });

    const fetchDashboard = async () => {
        if (!userId) return;
        try {
            // Always fetch fresh so agent tier/score from API is up to date (no cache for Agents page)
            const res = await api.get(`/api/users/${userId}?type=dashboard`);
            setDashboardCache(userId, res.data);
            const source = res.data.stats || res.data.agentStats;
            setAgents(source?.topAgents || []);
            setBranches(res.data.branches || []);
            setLoading(false);
        } catch (err) {
            console.error("Agents fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [userId]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddBranch = async () => {
        if (!branchForm.name.trim()) {
            showNotification('Branch name is required', 'error');
            return;
        }
        try {
            const res = await api.put(`/api/users/${user._id}`, {
                action: 'add-branch',
                name: branchForm.name.trim(),
                address: branchForm.address.trim()
            });
            if (res.data.success) {
                const newBranches = res.data.branches || [];
                const newBranchId = newBranches[newBranches.length - 1]?._id || '';
                setBranches(newBranches);
                setFormData(prev => ({ ...prev, branchId: newBranchId || prev.branchId }));
                setBranchForm({ name: '', address: '' });
                setShowBranchModal(false);
                if (pendingTargetsAgent) {
                    setEditingAgent(pendingTargetsAgent);
                    setTargetForm(prev => ({ ...prev, branchId: newBranchId, name: pendingTargetsAgent.name || '', email: pendingTargetsAgent.email || '', monthlyTarget: pendingTargetsAgent.monthlyTarget != null ? String(pendingTargetsAgent.monthlyTarget) : '', commissionRate: pendingTargetsAgent.commissionRate != null ? String(pendingTargetsAgent.commissionRate) : '0', agencyName: pendingTargetsAgent.agencyName || '' }));
                    setShowTargetsModal(true);
                    setPendingTargetsAgent(null);
                    showNotification('Branch added. You can now save the agent with this branch.', 'success');
                } else {
                    showNotification('Branch added. You can now assign it to the agent.', 'success');
                }
            }
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to add branch', 'error');
        }
    };

    const handleAddAgent = () => {
        if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email) {
            showNotification('Name, Surname and Email are required', 'error');
            return;
        }
        if (!formData.branchId) {
            showNotification('Please select or create a branch first', 'error');
            return;
        }
        const firstName = formData.firstName.trim();
        const lastName = formData.lastName.trim();
        const email = formData.email;
        const branchId = formData.branchId;
        const isAgency = branchId === '__agency__';
        const branch = isAgency ? null : branches.find((b) => String(b._id) === String(branchId));
        const branchName = isAgency ? (user?.name || 'Agency') : (branch ? branch.name : '');
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || email;
        const optimisticAgent = {
            name: fullName,
            email: email.toLowerCase(),
            branch: branchName,
            branchId: isAgency ? String(user._id) : String(branchId),
            status: 'invited',
            sales: 0,
            revenue: 0,
            totalSales: 0,
            avgDays: 0,
            conversionRate: '0%'
        };
        setAgents((prev) => [...prev, optimisticAgent]);
        setShowModal(false);
        setFormData({ firstName: '', lastName: '', email: '', branchId: '__agency__' });
        showNotification('Agent added. They\'ll receive an email with a link to complete registration.', 'success');

        api.put(`/api/users/${user._id}`, {
            action: 'add-agent',
            agentData: { firstName, lastName, email, branchId }
        })
            .then((res) => {
                if (res.data?.success) {
                    invalidateDashboardCache(userId);
                    fetchDashboard();
                }
            })
            .catch((err) => {
                showNotification(err.response?.data?.message || 'Failed to send invite', 'error');
                setAgents((prev) => prev.filter((a) => (a.email || '').toLowerCase() !== email.toLowerCase()));
            });
    };

    const handleOpenEditTargets = (agent) => {
        setEditingAgent(agent);
        const branchId = agent.branchId != null ? String(agent.branchId) : (agent.branch === (user?.name || 'Agency') ? '__agency__' : '');
        setTargetForm({
            name: agent.name || '',
            email: agent.email || '',
            monthlyTarget: agent.monthlyTarget != null ? String(agent.monthlyTarget) : '',
            commissionRate: agent.commissionRate != null ? String(agent.commissionRate) : '0',
            branchId: branchId || (branches.find((b) => (b.name || '').trim() === (agent.branch || '').trim())?._id ?? ''),
            agencyName: agent.agencyName || ''
        });
    };

    const handleOpenDeleteTransfer = () => {
        setDeleteTransferToId('');
        setShowDeleteTransferModal(true);
    };

    const handleRemoveAgent = async () => {
        if (!editingAgent || !user?._id) return;
        if (!deleteTransferToId) {
            showNotification('Please choose where to assign this agent\'s leads and listings.', 'error');
            return;
        }
        const agentId = editingAgent._id || editingAgent.id;
        if (String(deleteTransferToId) === String(agentId)) {
            showNotification('Cannot assign to the same agent you are removing.', 'error');
            return;
        }
        setDeleteTransferLoading(true);
        try {
            const res = await api.put(`/api/users/${user._id}`, {
                action: 'remove-agent',
                agentId,
                agentEmail: editingAgent.email,
                transferToId: deleteTransferToId
            });
            if (res.data.success) {
                setAgents(res.data.agents || []);
                setShowTargetsModal(false);
                setShowDeleteTransferModal(false);
                setEditingAgent(null);
                setDeleteTransferToId('');
                setTargetForm({ name: '', email: '', monthlyTarget: '', commissionRate: '0', branchId: '', agencyName: '' });
                invalidateDashboardCache(userId);
                showNotification(res.data.leadsTransferred != null || res.data.propertiesTransferred != null
                    ? `Reassigned ${res.data.leadsTransferred ?? 0} lead(s) and ${res.data.propertiesTransferred ?? 0} listing(s). Agent removed.`
                    : 'Agent removed from agency.', 'success');
            }
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to remove agent', 'error');
        } finally {
            setDeleteTransferLoading(false);
        }
    };

    const handleSaveTargets = async () => {
        if (!editingAgent || !user?._id) return;
        try {
            const payload = {
                action: 'update-agent-targets',
                agentId: editingAgent._id || editingAgent.id || undefined,
                agentEmail: (editingAgent._id || editingAgent.id) ? undefined : (editingAgent.email || '').trim() || undefined,
                name: targetForm.name.trim() || undefined,
                email: targetForm.email.trim() || undefined,
                monthlyTarget: targetForm.monthlyTarget === '' ? null : (parseFloat(targetForm.monthlyTarget) || null),
                commissionRate: targetForm.commissionRate === '' ? null : (parseFloat(targetForm.commissionRate) || null),
                branchId: targetForm.branchId && targetForm.branchId.trim() ? targetForm.branchId.trim() : undefined,
                agencyName: targetForm.agencyName != null ? String(targetForm.agencyName).trim() : undefined
            };
            const res = await api.put(`/api/users/${user._id}`, payload);
            if (res.data.success) {
                invalidateDashboardCache(user._id);
                setAgents(res.data.agents || []);
                setEditingAgent(null);
                setTargetForm({ name: '', email: '', monthlyTarget: '', commissionRate: '0', branchId: '', agencyName: '' });
                showNotification('Targets saved.', 'success');
                // Refetch dashboard so UI always shows persisted state (branch, targets, etc.)
                const dashRes = await api.get(`/api/users/${user._id}?type=dashboard&_=${Date.now()}`);
                if (dashRes?.data?.stats?.topAgents?.length != null) {
                    setAgents(dashRes.data.stats.topAgents);
                    setDashboardCache(user._id, dashRes.data);
                } else if (dashRes?.data?.agentStats?.topAgents?.length != null) {
                    setAgents(dashRes.data.agentStats.topAgents);
                    setDashboardCache(user._id, dashRes.data);
                }
            }
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to save targets', 'error');
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', fontFamily: "'Inter', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
                <LogoLoading message="Loading agents..." style={{ minHeight: '60vh' }} />
            </main>
        </div>
    );

    return (
        <div className="dashboard-container" style={{ display: 'flex', fontFamily: "'Inter', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
            <Sidebar />
            
            <main className="dash-content" style={{ flex: 1, marginLeft: '280px', padding: '30px' }}>
                
                {/* HEADER — same position as Add Property / Add Lead: greeting left, buttons right */}
                <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: 0 }}>Good day, {user.name}!</h2>
                        <p style={{ color: '#888', marginTop: '6px', marginBottom: 0, fontSize: '14px' }}>Agents &amp; targets</p>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button
                            onClick={() => setShowModal(true)}
                            data-tour="add-agent-btn"
                            style={{ background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <i className="fas fa-user-plus"></i> Add New Agent
                        </button>
                        <button
                            onClick={() => { setShowTargetsModal(true); setEditingAgent(null); setTargetForm({ name: '', email: '', monthlyTarget: '', commissionRate: '0', branchId: '', agencyName: '' }); }}
                            style={{ background: '#ffc801', color: '#1a1a1a', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <i className="fas fa-bullseye"></i> Set Targets
                        </button>
                    </div>
                </header>

                {/* STATS ROW */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '40px', flexWrap: 'wrap' }}>
                    <StatCard label="TOTAL AGENTS" value={agents.length} />
                    <StatCard label="ACTIVE (SIGNED ON)" value={agents.filter(a => a.status === 'active').length} />
                    <StatCard label="PENDING INVITE" value={agents.filter(a => a.status !== 'active').length} />
                    <StatCard label="AGENTS WITH DEALS IN PIPELINE" value={Math.floor(agents.length * 0.6)} />
                    <StatCard label="AGENTS WITH CLOSED TRANSACTIONS" value={Math.floor(agents.length * 0.9)} />
                    <StatCard label="LOW ACTIVITY AGENTS" value={Math.floor(agents.length * 0.1)} />
                    <StatCard label="INACTIVE AGENTS" value={0} />
                </div>

                {/* AGENTS GRID - ranked by total sales (highest first), scrollable when list grows */}
                <div style={{ maxHeight: '70vh', overflowY: 'auto', marginBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                    {[...agents]
                        .sort((a, b) => (Number(b.totalSales) || 0) - (Number(a.totalSales) || 0))
                        .map((agent, index) => {
                        const totalValue = Number(agent.totalSales) || (agent.revenueThisMonth != null ? agent.revenueThisMonth : (agent.revenue != null ? agent.revenue : 0));
                        return (
                        <div key={index} style={{ ...agentCardStyle, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, right: '12px', textAlign: 'right', minWidth: '60px' }}>
                                {/* Tier badges hidden for now */}
                                {agent.score != null && (
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>Score: {agent.score}</div>
                                )}
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                {agent.photo ? (
                                    <img src={agent.photo} alt={agent.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px' }} />
                                ) : (
                                    <img
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name || 'A')}&background=ffc801&color=1a1a1a`}
                                        alt={agent.name}
                                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px' }}
                                    />
                                )}
                                <h3 style={{ margin: '0', fontSize: '16px', color: '#1f3a3d' }}>{agent.name}</h3>
                                <div style={{ fontSize: '10px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
                                    {agent.status === 'active' ? `Active since ${new Date().getFullYear()}` : 'Invite sent'}
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ fontSize: '10px', color: '#999' }}>Branch:</div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#11575C' }}>{sanitizeAgencyBranchDisplay(agent.branch) || '—'}</div>
                                <span style={{
                                    display: 'inline-block',
                                    marginTop: '6px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: (agent.status === 'active') ? '#dcfce7' : '#fef3c7',
                                    color: (agent.status === 'active') ? '#166534' : '#b45309'
                                }}>
                                    {(agent.status === 'active') ? 'Active' : 'Pending invite'}
                                </span>
                            </div>

                            <div style={statsList}>
                                <StatRow label="Total transactions closed:" value={agent.closedCount ?? agent.sales ?? 0} />
                                <StatRow label="Total transaction value:" value={`${preferredCurrency || 'USD'} ${Number(totalValue).toLocaleString()}`} highlight />
                                <StatRow label="Average days to close:" value={agent.avgDays ?? 0} />
                                <StatRow label="Overall conversion rate:" value={agent.conversionRate ?? '0%'} />
                            </div>

                            <button
                                type="button"
                                onClick={() => { setShowTargetsModal(true); handleOpenEditTargets(agent); }}
                                style={{ width: '100%', padding: '10px', background: '#ffc801', color: '#1a1a1a', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <i className="fas fa-bullseye"></i> Edit or set target
                            </button>
                            {/* Message Agent button hidden for now */}
                        </div>
                        );
                    })}
                    </div>
                </div>
            </main>

            {/* ✅ ADD AGENT MODAL */}
            {showModal && (
                <div style={modalOverlay}>
                    <div style={modalContent} data-tour="add-agent-modal">
                        <h2 style={{color: '#11575C', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>Add New Agent</h2>
                        
                        <label style={labelStyle}>Name *</label>
                        <input name="firstName" value={formData.firstName} style={inputStyle} placeholder="First name" onChange={handleInputChange} />

                        <label style={labelStyle}>Surname *</label>
                        <input name="lastName" value={formData.lastName} style={inputStyle} placeholder="Surname" onChange={handleInputChange} />

                        <label style={labelStyle}>Email Address *</label>
                        <input name="email" type="email" value={formData.email} style={inputStyle} placeholder="agent@example.com" onChange={handleInputChange} />

                        <div>
                            <label style={labelStyle}>Branch *</label>
                            <select name="branchId" style={inputStyle} value={formData.branchId} onChange={(e) => {
                                if (e.target.value === '__add__') {
                                    setShowBranchModal(true);
                                    return;
                                }
                                setFormData({ ...formData, branchId: e.target.value });
                            }}>
                                <option value="">Select a branch</option>
                                <option value="__agency__">{user?.name || 'Agency'} (Agency)</option>
                                {branches.map((b) => (
                                    <option key={b._id} value={b._id}>{b.name}{b.address ? ` — ${b.address}` : ''}</option>
                                ))}
                                <option value="__add__">+ Add new branch</option>
                            </select>
                        </div>

                        <div style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                            <button onClick={() => setShowModal(false)} style={cancelBtn}>Cancel</button>
                            <button onClick={handleAddAgent} style={saveBtn} disabled={!formData.branchId || !formData.firstName?.trim() || !formData.lastName?.trim()}>Add Agent</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add new branch modal — above Add Agent modal */}
            {showBranchModal && (
                <div style={{ ...modalOverlay, zIndex: 1100 }} onClick={() => { setShowBranchModal(false); setPendingTargetsAgent(null); }}>
                    <div style={modalContent} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#11575C', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Add New Branch</h2>
                        <label style={labelStyle}>Branch Name *</label>
                        <input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="e.g. Dubai Hills Estate" />
                        <label style={labelStyle}>Address</label>
                        <GooglePlacesInput
                            name="address"
                            value={branchForm.address}
                            onChange={e => setBranchForm(f => ({ ...f, address: e.target.value }))}
                            onPlaceSelected={(formatted) => setBranchForm(f => ({ ...f, address: formatted }))}
                            placeholder="Street, City, Country"
                            inputStyle={{ ...inputStyle, boxSizing: 'border-box' }}
                        />
                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowBranchModal(false); setPendingTargetsAgent(null); }} style={cancelBtn}>Cancel</button>
                            <button onClick={handleAddBranch} style={saveBtn}>Save Branch</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit or Set Targets modal */}
            {showTargetsModal && (
                <div style={{ ...modalOverlay, zIndex: 1050 }} onClick={() => { setShowTargetsModal(false); setEditingAgent(null); }}>
                    <div style={{ ...modalContent, width: isMobile ? '95vw' : '520px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#11575C', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Edit or Set Targets</h2>
                        {!editingAgent ? (
                            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>Select an agent to edit name, email, and monthly sales target.</p>
                                {agents.length === 0 ? (
                                    <p style={{ color: '#888', fontSize: '13px' }}>No agents yet.</p>
                                ) : (
                                    agents.map((agent, idx) => (
                                        <div
                                            key={idx}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleOpenEditTargets(agent)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenEditTargets(agent); } }}
                                            style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <div>
                                                <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{agent.name || 'Unnamed'}</span>
                                                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>{sanitizeAgencyBranchDisplay(agent.branch) || '—'}</span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#11575C' }}>{agent.monthlyTarget != null ? `Target: ${Number(agent.monthlyTarget).toLocaleString()}` : 'No target'}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div>
                                <label style={labelStyle}>Name</label>
                                <input value={targetForm.name} onChange={e => setTargetForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Agent name" />
                                <label style={labelStyle}>Email</label>
                                <input type="email" value={targetForm.email} onChange={e => setTargetForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="agent@example.com" />
                                <label style={labelStyle}>Branch</label>
                                <select
                                    value={targetForm.branchId}
                                    onChange={(e) => {
                                        if (e.target.value === '__add__') {
                                            setPendingTargetsAgent(editingAgent);
                                            setShowTargetsModal(false);
                                            setShowBranchModal(true);
                                            return;
                                        }
                                        setTargetForm((f) => ({ ...f, branchId: e.target.value }));
                                    }}
                                    style={inputStyle}
                                >
                                    <option value="">Select a branch</option>
                                    <option value="__agency__">{sanitizeAgencyBranchDisplay(user?.name) || 'Agency'} (Agency)</option>
                                    {branches.map((b) => (
                                        <option key={b._id} value={b._id}>{sanitizeAgencyBranchDisplay(b.name) || 'Branch'}{b.address ? ` — ${b.address}` : ''}</option>
                                    ))}
                                    <option value="__add__">+ Add new branch</option>
                                </select>
                                <label style={labelStyle}>Agency (display name for this agent)</label>
                                <input value={targetForm.agencyName} onChange={e => setTargetForm(f => ({ ...f, agencyName: e.target.value }))} style={inputStyle} placeholder="e.g. Your Agency — leave blank to use default" />
                                <label style={labelStyle}>Monthly sales target (value)</label>
                                <input type="number" min="0" step="1" value={targetForm.monthlyTarget} onChange={e => setTargetForm(f => ({ ...f, monthlyTarget: e.target.value }))} style={inputStyle} placeholder="e.g. 50000" />
                                <label style={labelStyle}>Monthly commission target (value)</label>
                                <input type="number" min="0" max="100" step="0.5" value={targetForm.commissionRate} onChange={e => setTargetForm(f => ({ ...f, commissionRate: e.target.value }))} style={inputStyle} placeholder="e.g. 0" />
                                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                    <button type="button" onClick={handleOpenDeleteTransfer} style={{ ...cancelBtn, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Delete agent</button>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => { setEditingAgent(null); setTargetForm({ name: '', email: '', monthlyTarget: '', commissionRate: '0', branchId: '', agencyName: '' }); }} style={cancelBtn}>Back</button>
                                        <button onClick={handleSaveTargets} style={saveBtn}>Save</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                            <button onClick={() => { setShowTargetsModal(false); setEditingAgent(null); }} style={cancelBtn}>Close</button>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteTransferModal && editingAgent && (
                <div style={{ ...modalOverlay, zIndex: 1150 }} onClick={() => !deleteTransferLoading && setShowDeleteTransferModal(false)}>
                    <div style={modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#11575C' }}>Reassign leads and listings</h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                            Assign all leads and listings from <strong>{editingAgent.name || editingAgent.email}</strong> to:
                        </p>
                        <label style={labelStyle}>Assign to</label>
                        <select
                            value={deleteTransferToId}
                            onChange={(e) => setDeleteTransferToId(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">— Select —</option>
                            <option value={user._id}>{user.name || 'Agency'} (Agency)</option>
                            {agents.filter((a) => (a._id || a.id) && String(a._id || a.id) !== String(editingAgent._id || editingAgent.id)).map((a) => (
                                <option key={a._id || a.id} value={a._id || a.id}>{a.name || a.email || 'Agent'}{sanitizeAgencyBranchDisplay(a.branch) ? ` (${sanitizeAgencyBranchDisplay(a.branch)})` : ''}</option>
                            ))}
                        </select>
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '-8px', marginBottom: '20px' }}>Then the agent will be removed from your agency.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => !deleteTransferLoading && setShowDeleteTransferModal(false)} style={cancelBtn} disabled={deleteTransferLoading}>Cancel</button>
                            <button
                                type="button"
                                onClick={handleRemoveAgent}
                                disabled={deleteTransferLoading || !deleteTransferToId || String(deleteTransferToId) === String(editingAgent._id || editingAgent.id)}
                                style={{ ...saveBtn, background: (deleteTransferToId && String(deleteTransferToId) !== String(editingAgent._id || editingAgent.id) && !deleteTransferLoading) ? '#dc2626' : '#94a3b8' }}
                            >
                                {deleteTransferLoading ? 'Reassigning...' : 'Reassign & delete agent'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---
const StatCard = ({ label, value }) => (
    <div style={{ flex: 1, background: 'white', padding: '20px 10px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#bbb', textTransform: 'uppercase', marginBottom: '8px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</div>
        <div style={{ fontSize: '32px', fontWeight: '800', color: '#11575C' }}>{value}</div>
    </div>
);

const StatRow = ({ label, value, highlight }) => (
    <div style={{ marginBottom: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', color: '#888' }}>{label}</div>
        <div style={{ fontSize: '13px', fontWeight: highlight ? '800' : 'bold', color: highlight ? '#11575C' : '#333' }}>{value}</div>
    </div>
);

const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

// --- STYLES ---
const btnGrayStyle = { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' };
const filterPill = { background: 'white', border: '1px solid #ddd', padding: '5px 15px', borderRadius: '20px', marginTop: '5px', display: 'inline-block', cursor: 'pointer' };
const agentCardStyle = { background: 'white', borderRadius: '16px', padding: '25px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center' };
const statsList = { width: '100%', marginBottom: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' };
const rankingBadge = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '5px 15px', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '15px' };
const msgBtnStyle = { width: '100%', padding: '10px', background: '#11575C', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };

// Modal Styles
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent = { background: 'white', padding: '30px', borderRadius: '16px', width: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '15px', fontSize: '13px', boxSizing: 'border-box' };
const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px', display: 'block' };
const saveBtn = { background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const cancelBtn = { background: '#f1f5f9', color: '#555', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

export default Agents;