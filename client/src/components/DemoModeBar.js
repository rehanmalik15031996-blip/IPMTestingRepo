import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BRAND = '#10575c';
const SESSION_KEY = 'ipm_demo_mode';

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

export function getDemoState() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

function buildFakeUserFromDemo(demoUser, adminToken) {
    // Prefer the short-lived demo JWT minted server-side (issued by /api/admin/demo-users).
    // Falls back to the admin's token only if the backend didn't supply one, so API calls
    // are authenticated as the demo user and the dashboard loads that user's real data.
    const token = demoUser?._demoToken || adminToken;
    return {
        ...demoUser,
        token,
        _id: demoUser._id,
    };
}

export function startDemoMode(realUser, demoUsers, selectedRole) {
    const availableRoles = ROLE_ORDER.filter((k) => demoUsers[k]);
    const demoUser = demoUsers[selectedRole];
    if (!demoUser) return false;

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ realUser, demoUsers, selectedRole, availableRoles }));

    const fakeUser = buildFakeUserFromDemo(demoUser, realUser.token);
    localStorage.setItem('user', JSON.stringify(fakeUser));
    return true;
}

export function switchDemoRole(roleKey) {
    const state = getDemoState();
    if (!state || !state.demoUsers[roleKey]) return null;

    state.selectedRole = roleKey;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));

    const demoUser = state.demoUsers[roleKey];
    const fakeUser = buildFakeUserFromDemo(demoUser, state.realUser?.token);
    localStorage.setItem('user', JSON.stringify(fakeUser));
    return ROLE_HOME_ROUTE[roleKey] || '/dashboard';
}

export function exitDemoMode() {
    const state = getDemoState();
    if (state?.realUser) {
        localStorage.setItem('user', JSON.stringify(state.realUser));
    }
    sessionStorage.removeItem(SESSION_KEY);
}

const DemoModeBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [demoState, setDemoState] = useState(() => getDemoState());

    useEffect(() => { setDemoState(getDemoState()); }, [location.pathname]);

    const handleRoleChange = useCallback((e) => {
        const roleKey = e.target.value;
        const route = switchDemoRole(roleKey);
        if (route) {
            setDemoState(getDemoState());
            navigate(route);
        }
    }, [navigate]);

    const handleBack = useCallback(() => {
        exitDemoMode();
        navigate('/admin');
    }, [navigate]);

    if (!demoState) return null;

    const currentUser = demoState.demoUsers?.[demoState.selectedRole];
    const sortedRoles = ROLE_ORDER.filter((k) => (demoState.availableRoles || []).includes(k));

    const handleSelectChange = (e) => {
        const val = e.target.value;
        if (val === '__admin__') {
            handleBack();
            return;
        }
        handleRoleChange(e);
    };

    return (
        <div style={{
            position: 'fixed', top: 56, left: 0, right: 0, zIndex: 9999,
            background: '#0d4a4e', padding: '8px 28px', display: 'flex',
            alignItems: 'center', gap: 14, fontFamily: "'Poppins', sans-serif",
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)', borderBottom: '2px solid #ffc803',
        }}>
            <span style={{ color: '#ffc803', fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>
                DEMO MODE
            </span>

            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, flexShrink: 0 }}>Switch dashboard:</span>
            <select
                value={demoState.selectedRole}
                onChange={handleSelectChange}
                style={{
                    background: '#fff', color: BRAND, border: 'none', borderRadius: 6,
                    padding: '5px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    minWidth: 180,
                }}
            >
                <option value="__admin__" style={{ color: '#64748b', fontWeight: 700 }}>--- Admin Dashboard ---</option>
                {sortedRoles.map((k) => (
                    <option key={k} value={k}>{ROLE_LABELS[k] || k}</option>
                ))}
            </select>

            {currentUser && (
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Viewing as: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{currentUser.name}</strong>
                </span>
            )}

            <div style={{ flex: 1 }} />

            <button
                type="button"
                onClick={handleBack}
                style={{
                    background: '#ffc803', color: '#0d4a4e', border: 'none', borderRadius: 6,
                    padding: '5px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    flexShrink: 0,
                }}
            >
                Exit Demo
            </button>
        </div>
    );
};

export default DemoModeBar;
