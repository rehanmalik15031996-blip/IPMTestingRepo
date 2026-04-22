import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/api';
import { useIsMobile } from '../hooks/useMediaQuery';

const PartnerRegistration = () => {
    const isMobile = useIsMobile();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        otp: '',
        password: ''
    });
    const [otpSent, setOtpSent] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const sendOtp = async () => {
        if (!formData.email) {
            alert('Please enter an email address');
            return;
        }
        if (!formData.password || formData.password.length < 6) {
            alert('Please enter a password (at least 6 characters)');
            return;
        }
        setOtpSent(true);
        setResendCooldown(60);
        setLoading(true);
        try {
            const checkRes = await api.post('/api/auth/otp', {
                action: 'check-email',
                email: formData.email
            });
            if (checkRes.data.exists) {
                alert('This email is already registered. Please log in instead.');
                setOtpSent(false);
                setLoading(false);
                return;
            }
            const res = await api.post('/api/auth/otp', {
                action: 'send',
                email: formData.email,
                userType: 'partner'
            });
            if (res.data.success) {
                // success
            } else {
                if (res.data.userExists) {
                    alert('This email is already registered. Please log in instead.');
                } else {
                    alert(res.data.error || 'Failed to send OTP');
                }
                setOtpSent(false);
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP. Please try again.';
            if (err.response?.data?.exists) {
                alert('This email is already registered. Please log in instead.');
            } else {
                alert(msg);
            }
            setOtpSent(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!otpSent || resendCooldown <= 0) return;
        const t = setInterval(() => setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
        return () => clearInterval(t);
    }, [otpSent, resendCooldown]);

    const verifyAndRegister = async () => {
        if (!formData.otp || formData.otp.length !== 4) {
            alert('Please enter the 4-digit OTP code');
            return;
        }
        setLoading(true);
        try {
            const verifyRes = await api.post('/api/auth/otp', {
                action: 'verify',
                email: formData.email,
                otp: formData.otp
            });
            if (!verifyRes.data.success || !verifyRes.data.verified) {
                alert(verifyRes.data.error || 'Invalid OTP code');
                setLoading(false);
                return;
            }
            const data = new FormData();
            data.append('email', formData.email);
            data.append('password', formData.password);
            data.append('role', 'partner');
            const res = await api.post('/api/auth/register-agency', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data && res.data.user) {
                localStorage.setItem('user', JSON.stringify(res.data.user));
                window.location.href = '/my-ads';
                return;
            } else {
                alert(res.data?.message || 'Registration failed.');
            }
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const pageContainer = { display: 'flex', minHeight: '100vh', width: '100%', fontFamily: "'Poppins', sans-serif" };
    const visualSide = { flex: 1, background: "url('/site-assets/signup-left/signup.jpg') center/cover no-repeat", position: 'relative', display: isMobile ? 'none' : 'block' };
    const overlay = { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(17, 87, 92, 0.5), rgba(17, 87, 92, 0.9))', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: 'white' };
    const formSide = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff', padding: '24px' };
    const formWrapper = { width: '100%', maxWidth: '420px' };
    const stepContainer = { display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center', width: '100%' };
    const iconCircle = { width: '56px', height: '56px', background: '#f0fdfa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#11575C', marginBottom: '8px' };
    const subText = { color: '#64748b', lineHeight: 1.6, fontSize: '14px' };
    const inputGroup = { display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', textAlign: 'left', marginBottom: '14px' };
    const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#334155' };
    const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' };
    const btnPrimary = { width: '100%', padding: '14px', background: '#11575C', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' };
    const backBtn = { background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' };
    const togglePasswordBtn = { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '14px' };

    return (
        <div style={pageContainer}>
            <div style={visualSide}>
                <div style={overlay}>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>Advertise with IPM</h1>
                    <p style={{ opacity: 0.9, fontSize: '0.95rem' }}>Register as a partner to manage your ads on our platform.</p>
                </div>
            </div>
            <div style={formSide}>
                <div style={formWrapper}>
                    <button type="button" style={{ ...backBtn, alignSelf: 'flex-start' }} onClick={() => navigate('/signup')}>
                        <i className="fas fa-arrow-left"></i> Back
                    </button>
                    <div style={stepContainer}>
                        <div style={iconCircle}><i className="fas fa-bullhorn"></i></div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>Partner sign up</h2>
                        <p style={subText}>Enter your email and password. We’ll send a one-time code to verify your email.</p>

                        <div style={inputGroup}>
                            <label style={labelStyle}>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" style={inputStyle} disabled={otpSent} />
                        </div>
                        <div style={inputGroup}>
                            <label style={labelStyle}>Password (min 6 characters)</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    style={{ ...inputStyle, paddingRight: '40px' }}
                                    placeholder="••••••••"
                                    disabled={otpSent}
                                />
                                <button type="button" onClick={() => setShowPassword((p) => !p)} style={togglePasswordBtn} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        {!otpSent ? (
                            <button style={btnPrimary} onClick={sendOtp} disabled={loading}>
                                {loading ? 'Sending...' : 'Send verification code'}
                            </button>
                        ) : (
                            <>
                                <div style={inputGroup}>
                                    <label style={labelStyle}>Verification code</label>
                                    <input type="text" name="otp" value={formData.otp} onChange={handleChange} placeholder="4-digit code" style={inputStyle} maxLength={4} />
                                </div>
                                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '-8px' }}>
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : (
                                        <button type="button" onClick={sendOtp} disabled={loading} style={{ background: 'none', border: 'none', padding: 0, color: '#11575C', textDecoration: 'underline', cursor: 'pointer' }}>Resend code</button>
                                    )}
                                </p>
                                <button style={btnPrimary} onClick={verifyAndRegister} disabled={loading}>
                                    {loading ? 'Creating account...' : 'Verify & create account'}
                                </button>
                                <button type="button" style={{ ...backBtn, fontSize: '12px' }} onClick={() => setOtpSent(false)}>Change email</button>
                            </>
                        )}

                        <p style={{ marginTop: '20px', fontSize: '13px', color: '#64748b' }}>
                            Already have an account? <Link to="/login" style={{ color: '#11575C', fontWeight: '600' }}>Log in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerRegistration;
