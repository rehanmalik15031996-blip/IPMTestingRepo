import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { startDemoMode, getDemoState, exitDemoMode } from '../components/DemoModeBar';

const ROLE_ORDER = [
    'agency', 'agency_agent', 'independent_agent', 'investor', 'buyer', 'seller',
    'enterprise', 'partner_conveyancer', 'partner_bond',
];

const ROLE_LABELS = {
    agency: 'Agency',
    agency_agent: 'Agent',
    independent_agent: 'Independent Agent',
    investor: 'Investor / Buyer',
    buyer: 'Buyer',
    seller: 'Seller',
    enterprise: 'Enterprise',
    partner_conveyancer: 'Conveyancer',
    partner_bond: 'Bond Originator',
};

const ROLE_DESCRIPTIONS = {
    agency: 'Full agency dashboard with listings, agents, and analytics.',
    agency_agent: 'Agent view with assigned listings and performance metrics.',
    independent_agent: 'Solo agent dashboard with personal listings and leads.',
    investor: 'Investor/buyer dashboard with market trends and portfolio.',
    buyer: 'Buyer dashboard with saved searches and property alerts.',
    seller: 'Seller dashboard with listing performance and offers.',
    enterprise: 'Enterprise dashboard with multi-agency oversight and royalties.',
    partner_conveyancer: 'Conveyancer partner dashboard with assigned transfers.',
    partner_bond: 'Bond originator dashboard with applications and pipeline.',
};

const ROLE_HOME_ROUTE = {
    agency: '/dashboard',
    agency_agent: '/dashboard',
    independent_agent: '/dashboard',
    investor: '/dashboard',
    buyer: '/dashboard',
    seller: '/dashboard',
    enterprise: '/dashboard',
    partner_conveyancer: '/conveyancer',
    partner_bond: '/bond-originator-dashboard',
};

const AdminDemo = () => {
    const navigate = useNavigate();
    const [demoUsers, setDemoUsers] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // roleKey -> selected userId for roles that expose multiple options
    // (buyer/seller/investor). Defaults to the API's first option per role.
    const [selectedOption, setSelectedOption] = useState({});

    const realUser = (() => {
        const ds = getDemoState();
        if (ds?.realUser) return ds.realUser;
        try { return JSON.parse(localStorage.getItem('user')); } catch (_) { return null; }
    })();

    useEffect(() => {
        const ds = getDemoState();
        if (ds) exitDemoMode();

        api.get('/api/admin/demo-users')
            .then((res) => {
                setDemoUsers(res.data);
                const initial = {};
                Object.entries(res.data || {}).forEach(([key, value]) => {
                    if (Array.isArray(value?._options) && value._options.length > 0) {
                        initial[key] = String(value._options[0]._id);
                    }
                });
                setSelectedOption(initial);
                setLoading(false);
            })
            .catch((err) => { setError(err.response?.data?.message || err.message); setLoading(false); });
    }, []);

    const handleLaunch = useCallback((roleKey) => {
        if (!demoUsers || !realUser) return;
        let usersForLaunch = demoUsers;
        const role = demoUsers[roleKey];
        if (Array.isArray(role?._options) && role._options.length > 0) {
            const wantedId = selectedOption[roleKey] ? String(selectedOption[roleKey]) : String(role._options[0]._id);
            const chosen = role._options.find((o) => String(o._id) === wantedId) || role._options[0];
            usersForLaunch = {
                ...demoUsers,
                [roleKey]: {
                    ...role,
                    ...chosen,
                    _label: role._label,
                    _options: role._options,
                },
            };
        }
        const ok = startDemoMode(realUser, usersForLaunch, roleKey);
        if (ok) {
            navigate(ROLE_HOME_ROUTE[roleKey] || '/dashboard');
        }
    }, [demoUsers, realUser, navigate, selectedOption]);

    const handleBack = () => {
        exitDemoMode();
        navigate('/admin');
    };

    const availableRoles = demoUsers ? ROLE_ORDER.filter((k) => demoUsers[k]) : [];

    if (loading) {
        return (
            <div style={{ fontFamily: "'Poppins', sans-serif", padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, marginBottom: 16, display: 'block' }} />
                Loading demo users...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ fontFamily: "'Poppins', sans-serif", padding: '60px', textAlign: 'center', color: '#dc2626' }}>
                <p>Error: {error}</p>
                <button type="button" onClick={handleBack} style={{ marginTop: 16, background: '#10575c', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>Back to Admin</button>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: "'Poppins', sans-serif", padding: '40px', maxWidth: 960, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <h1 style={{ margin: 0, color: '#0f172a', fontSize: 26 }}>Demo Dashboards</h1>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>Select a user role to preview their full dashboard experience.</p>
                </div>
                <button type="button" onClick={handleBack} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                    <i className="fas fa-arrow-left" style={{ marginRight: 6, fontSize: 11 }} /> Back to Admin
                </button>
            </div>

            {availableRoles.length === 0 && (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 40 }}>No demo users found in the database.</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {availableRoles.map((roleKey) => {
                    const user = demoUsers[roleKey];
                    const options = Array.isArray(user._options) ? user._options : null;
                    const selectedId = selectedOption[roleKey] ? String(selectedOption[roleKey]) : (options ? String(options[0]._id) : String(user._id));
                    const activeUser = options ? (options.find((o) => String(o._id) === selectedId) || options[0]) : user;
                    return (
                        <div
                            key={roleKey}
                            onClick={() => handleLaunch(roleKey)}
                            style={{
                                background: '#fff', borderRadius: 12, padding: '20px', cursor: 'pointer',
                                border: '1px solid #e2e8f0', transition: 'all 0.15s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                display: 'flex', flexDirection: 'column', gap: 6,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10575c'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,87,92,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{ROLE_LABELS[roleKey] || roleKey}</span>
                                {activeUser._propertyCount > 0 && (
                                    <span style={{ fontSize: 10, background: '#f0fdfa', color: '#10575c', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                        {activeUser._propertyCount} listing{activeUser._propertyCount !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{ROLE_DESCRIPTIONS[roleKey]}</p>
                            {options && options.length > 1 ? (
                                <select
                                    aria-label={`Choose ${ROLE_LABELS[roleKey] || roleKey} demo account`}
                                    value={selectedId}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setSelectedOption((prev) => ({ ...prev, [roleKey]: e.target.value }));
                                    }}
                                    style={{
                                        marginTop: 4, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1',
                                        fontSize: 12, color: '#0f172a', background: '#f8fafc', cursor: 'pointer',
                                        width: '100%',
                                    }}
                                >
                                    {options.map((o) => (
                                        <option key={o._id} value={String(o._id)}>
                                            {o._pinned ? '★ ' : ''}{o.name || o.email || 'Unnamed'}{o._propertyCount > 0 ? ` · ${o._propertyCount} listing${o._propertyCount !== 1 ? 's' : ''}` : ''}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    <i className="fas fa-user" style={{ fontSize: 9 }} />
                                    <span>{activeUser.name}</span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleLaunch(roleKey); }}
                                style={{
                                    marginTop: 8, background: '#10575c', color: '#fff', border: 'none',
                                    padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                                    fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content',
                                }}
                            >
                                <i className="fas fa-eye" style={{ fontSize: 10 }} /> Launch Dashboard
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminDemo;
