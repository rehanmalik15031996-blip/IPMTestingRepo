import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboardLists from '../components/AdminDashboardLists';
import Sidebar from '../components/Sidebar';

const Admin = () => {
    const navigate = useNavigate();

    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('user'));
        } catch (_) {
            return null;
        }
    })();
    const isAdmin = currentUser && (currentUser.role || '').toLowerCase() === 'admin';

    useEffect(() => {
        if (!currentUser || !isAdmin) {
            navigate('/login');
        }
    }, [currentUser, isAdmin, navigate]);

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto', padding: '24px 40px', background: '#f1f5f9', fontFamily: 'sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 style={{ margin: 0, color: '#0f172a', fontSize: '24px' }}>Admin · Dashboard</h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => navigate('/admin/demo')} style={{ background: '#10575c', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-eye" style={{ fontSize: '11px' }} /> Demo Dashboards
                        </button>
                        <button type="button" onClick={() => navigate('/dashboard')} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Back to Dashboard</button>
                    </div>
                </div>
                <AdminDashboardLists />
            </main>
        </div>
    );
};

export default Admin;
