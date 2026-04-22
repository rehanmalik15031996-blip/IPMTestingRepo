import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/api';
import { showNotification } from '../components/NotificationManager';
import { useIsMobile } from '../hooks/useMediaQuery';

const ForgotPassword = () => {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Enter email, 2: Enter OTP, 3: Enter new password, 4: Success
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Step 1: Send OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!email) {
            showNotification('Please enter your email address', 'error');
            return;
        }
        
        setLoading(true);
        try {
            // First check if email exists
            const checkRes = await api.post('/api/auth/otp', { 
                action: 'check-email',
                email 
            });
            if (!checkRes.data.exists) {
                showNotification('This email is not registered. Please sign up instead.', 'error');
                setLoading(false);
                return;
            }

            // Email exists, send OTP
            const res = await api.post('/api/auth/otp', {
                action: 'send',
                email: email.toLowerCase().trim(),
                userType: 'password_reset'
            });
            
            if (res.data.success) {
                setStep(2);
                showNotification(`OTP sent to ${email}. Please check your email.`, 'success');
            } else {
                showNotification(res.data.error || 'Failed to send OTP', 'error');
            }
        } catch (err) {
            console.error('Send OTP error:', err);
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP. Please try again.';
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp || otp.length !== 4) {
            showNotification('Please enter a valid 4-digit OTP code', 'error');
            return;
        }
        
        setLoading(true);
        try {
            const res = await api.post('/api/auth/otp', {
                action: 'verify',
                email: email.toLowerCase().trim(),
                otp: otp.trim()
            });
            
            if (res.data.success && res.data.verified) {
                showNotification('OTP verified successfully!', 'success');
                setStep(3);
            } else {
                const errorMsg = res.data.error || 'Invalid OTP code';
                const attemptsRemaining = res.data.attemptsRemaining;
                if (attemptsRemaining !== undefined) {
                    showNotification(`${errorMsg}. Attempts remaining: ${attemptsRemaining}`, 'error');
                } else {
                    showNotification(errorMsg, 'error');
                }
            }
        } catch (err) {
            console.error('Verify OTP error:', err);
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Invalid OTP code. Please try again.';
            const attemptsRemaining = err.response?.data?.attemptsRemaining;
            if (attemptsRemaining !== undefined) {
                showNotification(`${errorMsg}. Attempts remaining: ${attemptsRemaining}`, 'error');
            } else {
                showNotification(errorMsg, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            showNotification('Password must be at least 6 characters long', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        setLoading(true);
        try {
            const res = await api.post('/api/auth/otp', {
                action: 'reset-password',
                email: email.toLowerCase().trim(),
                otp: otp.trim(),
                newPassword: newPassword
            });
            
            if (res.data.success) {
                showNotification('Password reset successfully! Redirecting to login...', 'success');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                showNotification(res.data.error || 'Failed to reset password', 'error');
            }
        } catch (err) {
            console.error('Reset password error:', err);
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to reset password. Please try again.';
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={pageContainer}>
            {/* Left Side: Visuals */}
            <div className="auth-visual-side" style={{ ...visualSide, display: isMobile ? 'none' : 'flex' }}>
                <div style={overlay}>
                    <h1 style={{fontSize: '3em', marginBottom: '10px'}}>Reset Password.</h1>
                    <p style={{fontSize: '1.2em', opacity: 0.9}}>We'll help you regain access to your account securely.</p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="auth-form-side" style={formSide}>
                <div style={formWrapper}>
                    <div style={{marginBottom: '40px'}}>
                        <h2 style={{fontSize: '32px', color: '#0f172a', marginBottom: '10px'}}>Forgot Password</h2>
                        <p style={{color: '#64748b'}}>
                            {step === 1 && 'Enter your email to receive a verification code.'}
                            {step === 2 && 'Enter the 4-digit code sent to your email.'}
                            {step === 3 && 'Enter your new password.'}
                        </p>
                    </div>

                    {step === 1 && (
                        <form onSubmit={handleSendOtp}>
                            <div style={inputGroup}>
                                <label style={labelStyle}>Email Address</label>
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
                            <button type="submit" style={btnStyle} disabled={loading}>
                                {loading ? 'Sending...' : 'Send Verification Code'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp}>
                            <div style={inputGroup}>
                                <label style={labelStyle}>Verification Code</label>
                                <div style={{position: 'relative'}}>
                                    <i className="fas fa-key" style={iconStyle}></i>
                                    <input 
                                        type="text" 
                                        placeholder="Enter 4-digit code" 
                                        required 
                                        style={inputStyle} 
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength="4"
                                    />
                                </div>
                                <p style={{fontSize: '12px', color: '#64748b', marginTop: '5px'}}>
                                    Didn't receive the code? <button type="button" onClick={handleSendOtp} style={linkButton}>Resend</button>
                                </p>
                            </div>
                            <button type="submit" style={btnStyle} disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword}>
                            <div style={inputGroup}>
                                <label style={labelStyle}>New Password</label>
                                <div style={{position: 'relative'}}>
                                    <i className="fas fa-lock" style={iconStyle}></i>
                                    <input 
                                        type="password" 
                                        placeholder="Enter new password (min 6 characters)" 
                                        required 
                                        style={inputStyle} 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        minLength="6"
                                    />
                                </div>
                            </div>
                            <div style={inputGroup}>
                                <label style={labelStyle}>Confirm New Password</label>
                                <div style={{position: 'relative'}}>
                                    <i className="fas fa-lock" style={iconStyle}></i>
                                    <input 
                                        type="password" 
                                        placeholder="Confirm new password" 
                                        required 
                                        style={inputStyle} 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        minLength="6"
                                    />
                                </div>
                            </div>
                            <button type="submit" style={btnStyle} disabled={loading}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    <p style={{textAlign: 'center', marginTop: '30px', color: '#64748b'}}>
                        Remember your password? <Link to="/login" style={linkStyle}>Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- STYLES ---
const pageContainer = { display: 'flex', height: '100vh', width: '100%', fontFamily: "'Poppins', sans-serif" };
const visualSide = { 
    flex: 1, 
    background: "linear-gradient(135deg, #11575C 0%, #115e59 100%)", 
    position: 'relative', 
    alignItems: 'center',
    justifyContent: 'center'
};
const overlay = { 
    position: 'absolute', 
    inset: 0, 
    background: 'rgba(31, 75, 67, 0.8)', 
    padding: '60px', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    color: 'white' 
};
const formSide = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff' };
const formWrapper = { width: '100%', maxWidth: '450px', padding: '40px' };

const inputGroup = { marginBottom: '20px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '8px' };
const inputStyle = { 
    width: '100%', 
    padding: '12px 12px 12px 45px', 
    borderRadius: '8px', 
    border: '1px solid #cbd5e1', 
    outline: 'none', 
    fontSize: '14px',
    boxSizing: 'border-box'
};
const iconStyle = { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px' };
const btnStyle = { 
    width: '100%', 
    padding: '14px', 
    background: '#11575C', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    fontSize: '15px',
    transition: '0.2s'
};
const linkStyle = { color: '#11575C', textDecoration: 'none', fontWeight: '600' };
const linkButton = { 
    background: 'none', 
    border: 'none', 
    color: '#11575C', 
    textDecoration: 'underline', 
    cursor: 'pointer', 
    fontSize: '12px',
    padding: 0
};

export default ForgotPassword;

