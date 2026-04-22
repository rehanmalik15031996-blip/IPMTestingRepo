import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { showNotification } from './NotificationManager';
import GooglePlacesInput from './GooglePlacesInput';
import { invalidateDashboardCache } from '../config/dashboardCache';
import { sanitizeAgencyBranchDisplay } from '../utils/display';

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 };
const contentStyle = { background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' };
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333' };

/**
 * Reusable Add Agent modal (same flow as Dashboard / Agents page).
 * Props: isOpen, onClose, user, onSuccess (optional, (agents) => {})
 */
const AddAgentModal = ({ isOpen, onClose, user, onSuccess }) => {
    const userId = user?._id;
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', branchId: '' });
    const [branches, setBranches] = useState([]);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branchForm, setBranchForm] = useState({ name: '', address: '' });
    const [loading, setLoading] = useState(false);
    const [branchLoading, setBranchLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            setFormData({ firstName: '', lastName: '', email: '', branchId: '__agency__' });
            setLoading(true);
            api.get(`/api/users/${userId}?type=dashboard`)
                .then((res) => {
                    const b = res.data?.branches || [];
                    setBranches(b);
                    setFormData((prev) => ({ ...prev, branchId: prev.branchId || '__agency__' }));
                })
                .catch(() => setBranches([]))
                .finally(() => setLoading(false));
        }
    }, [isOpen, userId]);

    const handleAddBranch = async () => {
        if (!branchForm.name?.trim()) {
            showNotification('Branch name is required', 'error');
            return;
        }
        setBranchLoading(true);
        try {
            const res = await api.put(`/api/users/${userId}`, {
                action: 'add-branch',
                name: branchForm.name.trim(),
                address: (branchForm.address || '').trim()
            });
            if (res.data?.success && Array.isArray(res.data.branches)) {
                setBranches(res.data.branches);
                setFormData((prev) => ({ ...prev, branchId: res.data.branches[res.data.branches.length - 1]?._id || '' }));
                setBranchForm({ name: '', address: '' });
                setShowBranchModal(false);
                showNotification('Branch added. You can now assign it to the agent.', 'success');
            }
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to add branch', 'error');
        } finally {
            setBranchLoading(false);
        }
    };

    const handleAddAgent = async () => {
        if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email) {
            showNotification('Name, Surname and Email are required', 'error');
            return;
        }
        if (!formData.branchId) {
            showNotification('Please select or create a branch first', 'error');
            return;
        }
        const branchId = formData.branchId;
        const isAgency = branchId === '__agency__';
        const branch = isAgency ? null : branches.find((b) => String(b._id) === String(branchId));
        try {
            const res = await api.put(`/api/users/${userId}`, {
                action: 'add-agent',
                agentData: {
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    email: formData.email,
                    branchId
                }
            });
            if (res.data?.success) {
                invalidateDashboardCache(userId);
                showNotification('Agent added. They\'ll receive an email with a link to complete registration.', 'success');
                if (onSuccess && Array.isArray(res.data.agents)) onSuccess(res.data.agents);
                setFormData({ firstName: '', lastName: '', email: '', branchId: '__agency__' });
                onClose();
            }
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to add agent', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div style={overlayStyle} onClick={onClose}>
                <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
                    <h2 style={{ margin: '0 0 20px 0', color: '#1f3a3d', fontSize: '20px', fontWeight: '700' }}>Add New Agent</h2>
                    {loading ? (
                        <p style={{ color: '#64748b' }}>Loading...</p>
                    ) : (
                        <>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={labelStyle}>Name *</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="First name"
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={labelStyle}>Surname *</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Surname"
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={labelStyle}>Email Address *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="agent@example.com"
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Branch *</label>
                                <select
                                    value={formData.branchId}
                                    onChange={(e) => {
                                        if (e.target.value === '__add__') setShowBranchModal(true);
                                        else setFormData({ ...formData, branchId: e.target.value });
                                    }}
                                    style={{ ...inputStyle, marginBottom: 0 }}
                                >
                                    <option value="">Select a branch</option>
                                    <option value="__agency__">{sanitizeAgencyBranchDisplay(user?.name) || 'Agency'} (Agency)</option>
                                    {branches.map((b) => (
                                        <option key={b._id} value={b._id}>{sanitizeAgencyBranchDisplay(b.name) || 'Branch'}{b.address ? ` — ${b.address}` : ''}</option>
                                    ))}
                                    <option value="__add__">+ Add new branch</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#333' }}>Cancel</button>
                                <button type="button" onClick={handleAddAgent} disabled={!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email || !formData.branchId} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email || !formData.branchId) ? '#ccc' : '#11575C', cursor: (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email || !formData.branchId) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600', color: 'white' }}>Add Agent</button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showBranchModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }} onClick={() => setShowBranchModal(false)}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px 0', color: '#1f3a3d', fontSize: '18px' }}>Add New Branch</h2>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Branch Name *</label>
                            <input value={branchForm.name} onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Dubai Hills Estate" style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Address</label>
                            <GooglePlacesInput name="address" value={branchForm.address} onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))} onPlaceSelected={(formatted) => setBranchForm((f) => ({ ...f, address: formatted }))} placeholder="Street, City, Country" inputStyle={{ ...inputStyle, boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowBranchModal(false)} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                            <button type="button" onClick={handleAddBranch} disabled={branchLoading || !branchForm.name?.trim()} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: (branchLoading || !branchForm.name?.trim()) ? '#ccc' : '#11575C', color: 'white', fontWeight: '600', cursor: (branchLoading || !branchForm.name?.trim()) ? 'not-allowed' : 'pointer', fontSize: '14px' }}>{branchLoading ? 'Saving...' : 'Save Branch'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AddAgentModal;
