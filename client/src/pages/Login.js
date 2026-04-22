import React, { useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import api from '../config/api';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useMediaQuery';

const Login = () => {
    const devBypass = process.env.REACT_APP_DEV_BYPASS_AUTH === 'true';

    const [searchParams] = useSearchParams();
    const sessionExpired = searchParams.get('session') === 'expired';
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (devBypass) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/api/auth/login', { email, password });
            
            // 1. Save Data
            localStorage.setItem('user', JSON.stringify(res.data));
            // 2. Redirect based on role
            const role = (res.data.role || '').toLowerCase();
            const pt = (res.data.partnerType || '').toLowerCase();
            const isAdmin = role === 'admin' || (res.data.email || '').toLowerCase() === 'admin@internationalpropertymarket.com';
            const isEnterprise = role === 'enterprise';
            const isAgent = role === 'agent' || role === 'independent_agent' || role === 'agency_agent';
            const isBondOriginator = role === 'partner' && pt === 'bond_originator';
            const isConveyancer = role === 'partner' && pt === 'conveyancer';
            const isPartner = role === 'partner';
            const path = isAdmin ? '/admin'
                : isEnterprise ? '/enterprise-dashboard'
                : isBondOriginator ? '/bond-originator'
                : isConveyancer ? '/conveyancer'
                : isPartner ? '/partner-dashboard'
                : isAgent ? '/agent-dashboard'
                : '/dashboard';
            window.location.href = path + '?r=' + Date.now(); 
        } catch (err) {
            const status = err.response?.status;
            const body = err.response?.data;
            const errorMessage =
                (typeof body === 'object' && body?.message) ||
                (typeof body === 'string' && body) ||
                err.message ||
                'Invalid credentials';
            console.error('Login error:', err.response?.data || err);
            let hint =
                '\n\nIf this account is new to your local database, open the homepage once (auto-seed) or use Sign up.';
            if (status === 403) {
                hint =
                    '\n\n403 often means the browser hit the wrong service on port 5000 (macOS AirPlay) or a protected deployment URL. ' +
                    'Run the API on port 5001 (default in this repo), restart `npm start` in /client, and leave REACT_APP_API_URL empty for local dev.';
            }
            alert(`❌ ${errorMessage}${hint}`);
            setLoading(false);
        }
    };

    return (
        <div style={pageContainer}>
            {/* Left Side: Visuals */}
            <div className="auth-visual-side" style={{ ...visualSide, display: isMobile ? 'none' : 'flex' }}>
                <div style={overlay}>
                    <h1 style={{fontSize: '3em', marginBottom: '10px'}}>{t('login.welcomeBack')}</h1>
                    <p style={{fontSize: '1.2em', opacity: 0.9}}>{t('login.welcomeSub')}</p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="auth-form-side" style={formSide}>
                <div style={topActions}>
                    <Link to="/" className="btn-outline" style={topButtonStyle}>
                        <i className="fas fa-home"></i> {t('login.backToHome')}
                    </Link>
                </div>
                <div style={formWrapper}>
                    <div style={{marginBottom: '40px'}}>
                        <h2 style={{fontSize: '32px', color: '#0f172a', marginBottom: '10px'}}>{t('login.logIn')}</h2>
                        <p style={{color: '#64748b'}}>{t('login.enterCredentials')}</p>
                        {sessionExpired && (
                            <p style={{ marginTop: '12px', padding: '10px 14px', background: '#fef3c7', color: '#92400e', borderRadius: '8px', fontSize: '14px' }}>
                                Your session expired. Please sign in again to continue.
                            </p>
                        )}
                    </div>

                    <form onSubmit={handleLogin}>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px'}}>
                            <div style={inputGroup}>
                                <label style={labelStyle}>{t('login.emailAddress')}</label>
                                <div style={{position: 'relative'}}>
                                    <i className="fas fa-envelope" style={iconStyle}></i>
                                    <input 
                                        type="email" 
                                        placeholder="e.g. name@company.com" 
                                        required 
                                        style={inputStyle} 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={inputGroup}>
                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                    <label style={labelStyle}>{t('login.password')}</label>
                                    <Link to="/forgot-password" style={{fontSize:'12px', color:'#11575C', cursor:'pointer', fontWeight:'600', textDecoration:'none'}}>{t('login.forgot')}</Link>
                                </div>
                                <div style={{position: 'relative'}}>
                                    <i className="fas fa-lock" style={iconStyle}></i>
                                    <input 
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••" 
                                        required 
                                        style={{ ...inputStyle, paddingRight: '45px' }} 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        style={togglePasswordBtn}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button type="submit" style={btnStyle} disabled={loading}>
                            {loading ? t('login.authenticating') : t('login.logIn')}
                        </button>
                    </form>

                    <p style={{textAlign: 'center', marginTop: '30px', color: '#64748b'}}>
                        {t('login.newToIpm')} <Link to="/signup" style={linkStyle}>{t('login.createAccount')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- STYLES (Reusing consistent design system) ---
const pageContainer = { display: 'flex', height: '100vh', width: '100%', fontFamily: "'Inter', sans-serif" };
const visualSide = { flex: 1, background: "url('/site-assets/signup-left/login.jpg') center/cover no-repeat", position: 'relative' };
const overlay = { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.8))', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: 'white' };
const formSide = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff', position: 'relative' };
const formWrapper = { width: '100%', maxWidth: '420px', padding: '40px' };
const topActions = { position: 'absolute', top: '30px', right: '40px' };
const topButtonStyle = { display: 'flex', alignItems: 'center', gap: '8px', color: '#11575C', border: '1px solid #11575C' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#334155' };
const iconStyle = { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' };
const inputStyle = { width: '100%', padding: '14px 14px 14px 45px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box', background:'#f8fafc' };
const btnStyle = { width: '100%', padding: '16px', background: '#11575C', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: '0.2s', marginTop: '10px', boxShadow: '0 4px 6px -1px rgba(17, 87, 92, 0.2)' };
const linkStyle = { color: '#11575C', fontWeight: 'bold', textDecoration: 'none' };
const togglePasswordBtn = { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, fontSize: '14px' };

export default Login;