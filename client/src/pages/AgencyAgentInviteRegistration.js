import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../config/api';
import { useIsMobile } from '../hooks/useMediaQuery';
import { sanitizeAgencyBranchDisplay } from '../utils/display';

/** Read token from URL; use both router and window to avoid email-client / lazy-load timing issues */
function getTokenFromUrl(searchParams) {
    const fromRouter = searchParams.get('token');
    if (fromRouter) return fromRouter;
    if (typeof window === 'undefined') return null;
    try {
        return new URLSearchParams(window.location.search).get('token');
    } catch (_) {
        return null;
    }
}

const AgencyAgentInviteRegistration = () => {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tokenFromUrl = useMemo(() => getTokenFromUrl(searchParams), [searchParams]);
    const [invite, setInvite] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Create password step (token in URL → validate → show password form; no PIN)
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [createPasswordLoading, setCreatePasswordLoading] = useState(false);
    const [createPasswordError, setCreatePasswordError] = useState(null);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(null);
    const [pinLoading, setPinLoading] = useState(false);
    const [pastedLink, setPastedLink] = useState('');
    const [pasteError, setPasteError] = useState(null);
    const [showPasteLink, setShowPasteLink] = useState(false);

    // When we have a token, validate it with the API
    useEffect(() => {
        if (!tokenFromUrl) return;
        // Clear any existing session so the new agent never sees another user's dashboard
        try {
            localStorage.removeItem('user');
        } catch (_) {}
        setLoading(true);
        setError(null);
        const fetchInvite = async () => {
            try {
                const res = await api.get(`/api/auth/agency-invite?token=${encodeURIComponent(tokenFromUrl)}`);
                if (res.data.valid) setInvite(res.data);
                else setError(res.data.error || 'Invalid invite');
            } catch (err) {
                setError(err.response?.data?.error || 'Invalid or expired invite link');
            } finally {
                setLoading(false);
            }
        };
        fetchInvite();
    }, [tokenFromUrl]);

    // No token: re-check URL after a short delay (email clients sometimes redirect and add query string late)
    useEffect(() => {
        if (tokenFromUrl) return;
        const t = setTimeout(() => {
            if (typeof window === 'undefined') {
                setLoading(false);
                return;
            }
            const search = window.location.search;
            const lateToken = search ? new URLSearchParams(search).get('token') : null;
            if (lateToken) {
                setLoading(true);
                navigate(window.location.pathname + search, { replace: true });
                return;
            }
            setLoading(false);
        }, 250);
        return () => clearTimeout(t);
    }, [tokenFromUrl, navigate]);

    const passwordChecks = {
        minLength: password.length >= 8,
        hasLower: /[a-z]/.test(password),
        hasUpper: /[A-Z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[^A-Za-z0-9]/.test(password)
    };
    const isPasswordValid = Object.values(passwordChecks).every(Boolean);

    const handleCreatePassword = async (e) => {
        e.preventDefault();
        setCreatePasswordError(null);
        if (!isPasswordValid) {
            setCreatePasswordError('Please meet all password requirements.');
            return;
        }
        if (password !== confirmPassword) {
            setCreatePasswordError('Passwords do not match.');
            return;
        }
        setCreatePasswordLoading(true);
        try {
            const res = await api.post('/api/auth/register-agency', {
                inviteToken: invite.token || tokenFromUrl,
                email: invite.email,
                password
            }, { headers: { 'Content-Type': 'application/json' } });
            if (res.data?.user) {
                localStorage.setItem('user', JSON.stringify(res.data.user));
                const role = (res.data.user.role || '').toLowerCase();
                // Agents land on agent-dashboard so they always see the correct dashboard on first load
                const isAgent = role === 'agent' || role === 'independent_agent' || role === 'agency_agent';
                const dashboardPath = isAgent ? '/agent-dashboard' : '/dashboard';
                window.location.href = dashboardPath + '?r=' + Date.now();
            } else {
                setCreatePasswordError(res.data?.message || 'Registration failed.');
            }
        } catch (err) {
            setCreatePasswordError(err.response?.data?.message || err.message || 'Something went wrong. Please try again.');
        } finally {
            setCreatePasswordLoading(false);
        }
    };

    const message = "To join as an agency agent, your agency will send you an invitation email with a link. Open that link to set your password and complete registration.";

    const extractTokenFromLink = (str) => {
        if (!str || typeof str !== 'string') return null;
        const trimmed = str.trim();
        try {
            if (trimmed.startsWith('http')) {
                const url = new URL(trimmed);
                return url.searchParams.get('token');
            }
            const match = trimmed.match(/[?&]token=([^&\s]+)/);
            return match ? decodeURIComponent(match[1]) : null;
        } catch (_) {
            return null;
        }
    };

    const handlePinSubmit = async () => {
        const pin = pinInput.replace(/\D/g, '').slice(0, 4);
        if (pin.length !== 4) {
            setPinError('Enter the 4-digit PIN from your invite email.');
            return;
        }
        setPinError(null);
        setPinLoading(true);
        try {
            const res = await api.get(`/api/auth/agency-invite?pin=${encodeURIComponent(pin)}`);
            if (res.data && res.data.valid) {
                setInvite(res.data);
            } else {
                setPinError(res.data?.error || 'Invalid or expired PIN. Check the code from your email.');
            }
        } catch (err) {
            setPinError(err.response?.data?.error || 'Invalid or expired PIN. Please try again.');
        } finally {
            setPinLoading(false);
        }
    };

    const handlePasteLink = () => {
        setPasteError(null);
        const token = extractTokenFromLink(pastedLink);
        if (!token) {
            setPasteError('No invite token found in that link. Paste the full link from your email.');
            return;
        }
        navigate(`/agency-agent-invite?token=${encodeURIComponent(token)}`, { replace: true });
    };

    if (loading) {
        return (
            <div style={{ ...pageContainer, alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '16px', color: '#64748b' }}>Loading invite...</p>
            </div>
        );
    }

    if (invite) {
        return (
            <div style={pageContainer}>
                <div className="auth-visual-side" style={{ ...visualSide, display: isMobile ? 'none' : 'flex' }}>
                    <div style={visualOverlay}>
                        <h1 style={{ fontSize: '2.5em', marginBottom: '15px' }}>Almost there</h1>
                        <p style={{ fontSize: '1.1em', opacity: 0.9 }}>Create a password to sign in next time.</p>
                    </div>
                </div>
                <div style={contentSide}>
                    <div style={messageCard}>
                        <div style={messageIcon}><i className="fas fa-key"></i></div>
                        <h2 style={messageTitle}>Create your password</h2>
                        <p style={{ ...messageText, marginBottom: '16px' }}>
                            You’ll use this to log in to your account. Your email is already set.
                        </p>
                        {(() => {
                            const agency = sanitizeAgencyBranchDisplay(invite.agencyName);
                            const branch = sanitizeAgencyBranchDisplay(invite.branchName);
                            if (!agency && !branch) return null;
                            return (
                                <p style={{ fontSize: '13px', color: '#11575C', marginBottom: '16px', padding: '10px', background: '#f0fdfa', borderRadius: '8px' }}>
                                    Joining {agency && <strong>{agency}</strong>}{agency && branch ? ` — ${branch}` : (branch ? branch : '')}
                                </p>
                            );
                        })()}
                        <form onSubmit={handleCreatePassword} style={{ textAlign: 'left' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>Email</label>
                            <input type="email" value={invite.email} readOnly style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', marginBottom: '16px', background: '#f8fafc', boxSizing: 'border-box' }} />
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>Create password *</label>
                            <div style={{ position: 'relative', marginBottom: '8px' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setCreatePasswordError(null); }}
                                    placeholder="••••••••"
                                    style={{ width: '100%', padding: '12px 40px 12px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
                                <li style={{ color: passwordChecks.minLength ? '#166534' : '#94a3b8' }}>{passwordChecks.minLength ? '✓' : '○'} At least 8 characters</li>
                                <li style={{ color: passwordChecks.hasUpper ? '#166534' : '#94a3b8' }}>{passwordChecks.hasUpper ? '✓' : '○'} One uppercase letter</li>
                                <li style={{ color: passwordChecks.hasLower ? '#166534' : '#94a3b8' }}>{passwordChecks.hasLower ? '✓' : '○'} One lowercase letter</li>
                                <li style={{ color: passwordChecks.hasNumber ? '#166534' : '#94a3b8' }}>{passwordChecks.hasNumber ? '✓' : '○'} One number</li>
                                <li style={{ color: passwordChecks.hasSpecial ? '#166534' : '#94a3b8' }}>{passwordChecks.hasSpecial ? '✓' : '○'} One special character</li>
                            </ul>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>Confirm password *</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => { setConfirmPassword(e.target.value); setCreatePasswordError(null); }}
                                placeholder="••••••••"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' }}
                            />
                            {createPasswordError && <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{createPasswordError}</p>}
                            <button type="submit" disabled={createPasswordLoading || !isPasswordValid || password !== confirmPassword} style={{ ...btnPrimary, width: '100%', opacity: (createPasswordLoading || !isPasswordValid || password !== confirmPassword) ? 0.6 : 1 }}>
                                {createPasswordLoading ? 'Creating account...' : 'Create password & go to dashboard'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (tokenFromUrl && error) {
        return (
            <div style={pageContainer}>
                <div className="auth-visual-side" style={{ ...visualSide, display: isMobile ? 'none' : 'flex' }}>
                    <div style={visualOverlay}>
                        <h1 style={{ fontSize: '2.5em', marginBottom: '15px' }}>Invalid Invite</h1>
                        <p style={{ fontSize: '1.1em', opacity: 0.9 }}>This link may have expired or already been used.</p>
                    </div>
                </div>
                <div className="auth-form-side" style={contentSide}>
                    <div style={messageCard}>
                        <div style={messageIcon}><i className="fas fa-exclamation-triangle"></i></div>
                        <h2 style={messageTitle}>Invite not valid</h2>
                        <p style={messageText}>{error}</p>
                        <div style={buttonRow}>
                            <Link to="/login" style={btnPrimary}>Log in</Link>
                            <Link to="/forgot-password" style={{ fontSize: '14px', color: '#11575C', fontWeight: '600', textDecoration: 'none' }}>Forgot password?</Link>
                            <button type="button" onClick={() => navigate('/')} style={btnOutline}>Go to Home</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={pageContainer}>
            <div className="auth-visual-side" style={{ ...visualSide, display: isMobile ? 'none' : 'flex' }}>
                <div style={visualOverlay}>
                    <h1 style={{ fontSize: '2.5em', marginBottom: '15px' }}>Join Your Agency</h1>
                    <p style={{ fontSize: '1.1em', opacity: 0.9 }}>Enter the 4-digit PIN from your invite email to set your password and complete registration.</p>
                </div>
            </div>
            <div className="auth-form-side" style={contentSide}>
                <div style={messageCard}>
                    <div style={messageIcon}><i className="fas fa-key"></i></div>
                    <h2 style={messageTitle}>Enter your invite PIN</h2>
                    <p style={messageText}>
                        Your invite email contains a 4-digit PIN. Enter it below to continue—your email and details will be filled in for you.
                    </p>
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={pinInput}
                        onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(null); }}
                        placeholder="0000"
                        style={{ width: '100%', padding: '14px', borderRadius: '8px', border: pinError ? '1px solid #dc2626' : '1px solid #e2e8f0', fontSize: '18px', letterSpacing: '6px', textAlign: 'center', marginBottom: '8px', boxSizing: 'border-box' }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handlePinSubmit(); }}
                    />
                    {pinError && <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{pinError}</p>}
                    <button type="button" onClick={handlePinSubmit} disabled={pinLoading || pinInput.replace(/\D/g, '').length !== 4} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: (pinLoading || pinInput.replace(/\D/g, '').length !== 4) ? '#94a3b8' : '#11575C', color: 'white', fontWeight: '600', cursor: (pinLoading || pinInput.replace(/\D/g, '').length !== 4) ? 'not-allowed' : 'pointer', fontSize: '14px', marginBottom: '16px' }}>
                        {pinLoading ? 'Checking...' : 'Continue'}
                    </button>
                    <button type="button" onClick={() => setShowPasteLink(!showPasteLink)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', marginBottom: showPasteLink ? '12px' : '20px' }}>
                        {showPasteLink ? 'Hide' : 'Having trouble? Paste your invite link instead'}
                    </button>
                    {showPasteLink && (
                        <>
                            <input
                                type="text"
                                value={pastedLink}
                                onChange={(e) => { setPastedLink(e.target.value); setPasteError(null); }}
                                placeholder="https://...agency-agent-invite?token=..."
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', marginBottom: '6px', boxSizing: 'border-box' }}
                            />
                            {pasteError && <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '6px' }}>{pasteError}</p>}
                            <button type="button" onClick={handlePasteLink} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '13px', marginBottom: '16px' }}>Use this link</button>
                        </>
                    )}
                    <div style={{ ...buttonRow, marginTop: '24px', flexWrap: 'wrap', gap: '10px' }}>
                        <Link to="/login" style={btnPrimary}>Log in</Link>
                        <Link to="/forgot-password" style={{ fontSize: '14px', color: '#11575C', fontWeight: '600', textDecoration: 'none' }}>Forgot password?</Link>
                        <button type="button" onClick={() => navigate('/')} style={btnOutline}>Go to Home</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- STYLES ---
const pageContainer = {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    fontFamily: "'Inter', 'Poppins', sans-serif"
};

const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
};

const popupCard = {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
    animation: 'fadeIn 0.3s ease'
};

const popupIcon = {
    fontSize: '48px',
    color: '#11575C',
    marginBottom: '16px'
};

const popupTitle = {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '12px'
};

const popupText = {
    fontSize: '15px',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '24px'
};

const popupButton = {
    padding: '12px 28px',
    background: '#11575C',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer'
};

const visualSide = {
    flex: 1,
    background: "url('/site-assets/signup-left/signup.jpg') center/cover no-repeat",
    position: 'relative'
};

const visualOverlay = {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(17, 87, 92, 0.85), rgba(17, 87, 92, 0.5))',
    padding: '60px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    color: 'white'
};

const contentSide = {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f8fafc',
    padding: '24px'
};

const messageCard = {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
};

const messageIcon = {
    fontSize: '56px',
    color: '#11575C',
    marginBottom: '20px',
    opacity: 0.9
};

const messageTitle = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '16px'
};

const messageText = {
    fontSize: '15px',
    color: '#64748b',
    lineHeight: '1.7',
    marginBottom: '28px'
};

const buttonRow = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
};

const btnPrimary = {
    display: 'block',
    padding: '14px 24px',
    background: '#11575C',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    transition: 'background 0.2s'
};

const btnOutline = {
    padding: '14px 24px',
    background: 'transparent',
    color: '#11575C',
    border: '2px solid #11575C',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
};

if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`;
    document.head.appendChild(styleSheet);
}

export default AgencyAgentInviteRegistration;
