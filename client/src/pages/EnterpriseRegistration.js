import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/api';
import { showNotification } from '../components/NotificationManager';
import GooglePlacesInput from '../components/GooglePlacesInput';
import { useIsMobile } from '../hooks/useMediaQuery';

const EnterpriseTermsContent = ({ onOpenPrivacy }) => (
    <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#334155', textAlign: 'left', paddingRight: '8px' }}>
        <p><strong>TERMS OF SERVICE (ENTERPRISE) – International Property Market Platform</strong></p>
        <p>By creating an account, you acknowledge that you have read, understood, and agree to be bound by these Terms, our <button type="button" onClick={onOpenPrivacy} style={{ background: 'rgba(255, 200, 1, 0.35)', border: 'none', padding: '0 2px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600', color: '#1e293b' }}>Privacy Policy</button>, and any additional terms. You must be at least 18, hold required authority, and comply with applicable laws. The Platform provides services for real estate enterprise groups subject to your subscription. We reserve the right to modify or discontinue services. Your use is subject to our Privacy Policy. Fees apply per your plan; subscriptions renew unless cancelled. The Platform is provided &quot;as is&quot;. Our liability is limited to the amount you paid in the 12 months preceding a claim. Dutch law applies. Contact: enquiries@internationalpropertymarket.com</p>
    </div>
);
const ENTERPRISE_PRIVACY = (
    <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#334155', textAlign: 'left', paddingRight: '8px' }}>
        <p><strong>PRIVACY POLICY</strong></p>
        <p>IPM collects, uses, and protects your personal information. By using the Platform you consent to our collection and use as described herein. We do not sell your data to third parties for marketing. Contact: enquiries@internationalpropertymarket.com</p>
    </div>
);

const EnterpriseRegistration = () => {
    const isMobile = useIsMobile();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [planTermsAccepted, setPlanTermsAccepted] = useState({ Enterprise: { terms: false }, Custom: { terms: false } });
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showAdminAckModal, setShowAdminAckModal] = useState(false);
    const [adminAckChecked, setAdminAckChecked] = useState(false);

    const adminAckModalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' };
    const adminAckModalContent = { background: '#fff', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
    const adminAckModalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' };
    const adminAckModalClose = { background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' };
    const adminAckModalBody = { overflowY: 'auto', padding: '20px', flex: 1, minHeight: 0 };
    const adminAckModalFooter = { padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' };

    const [formData, setFormData] = useState({
        email: '',
        otp: '',
        password: '',
        plan: '',
        enterpriseName: '',
        location: '',
        contact: '',
        phone: ''
    });

    const [otpSent, setOtpSent] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [locating, setLocating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const detectLocation = () => {
        if (!navigator.geolocation) {
            showNotification('Geolocation is not supported by your browser.', 'warning');
            return;
        }
        setLocating(true);
        const onSuccess = async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const res = await api.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                const city = res.data.city || res.data.locality || '';
                const country = res.data.countryName || '';
                if (city) {
                    setFormData(prev => ({ ...prev, location: `${city}, ${country}` }));
                } else {
                    showNotification('Location found but could not resolve name. Try again.', 'warning');
                }
            } catch (err) {
                showNotification('Could not resolve location. Try again.', 'error');
            } finally {
                setLocating(false);
            }
        };
        const onError = (err) => {
            setLocating(false);
            if (err.code === 1) showNotification('Permission denied. Allow location in browser settings.', 'error');
            else if (err.code === 2) showNotification('Position unavailable. Check network.', 'error');
            else if (err.code === 3) showNotification('Timeout. Try again.', 'error');
            else showNotification('Location error. Try again.', 'error');
        };
        navigator.geolocation.getCurrentPosition(onSuccess, (err) => {
            navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    };

    const sendOtp = async () => {
        if (!formData.email) {
            showNotification('Please enter an email address', 'error');
            return;
        }
        if (!formData.password || formData.password.length < 6) {
            showNotification('Please enter a password (at least 6 characters)', 'error');
            return;
        }
        setOtpSent(true);
        setResendCooldown(60);
        setLoading(true);
        try {
            const checkRes = await api.post('/api/auth/otp', { action: 'check-email', email: formData.email });
            if (checkRes.data.exists) {
                showNotification('This email is already registered. Please log in instead.', 'error');
                setOtpSent(false);
                setLoading(false);
                return;
            }
            const res = await api.post('/api/auth/otp', { action: 'send', email: formData.email, userType: 'enterprise' });
            if (res.data.success) {
                showNotification(`OTP sent to ${formData.email}. Please check your email.`, 'success');
            } else {
                if (res.data.userExists) {
                    showNotification('This email is already registered. Please log in instead.', 'error');
                } else {
                    showNotification(res.data.error || 'Failed to send OTP', 'error');
                }
                setOtpSent(false);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP. Please try again.';
            if (err.response?.data?.exists) {
                showNotification('This email is already registered. Please log in instead.', 'error');
            } else {
                showNotification(errorMsg, 'error');
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

    const verifyOtp = async () => {
        if (!formData.otp) { showNotification('Please enter the OTP code', 'error'); return; }
        if (formData.otp.length !== 4) { showNotification('Please enter a 4-digit OTP code', 'error'); return; }
        setLoading(true);
        try {
            const res = await api.post('/api/auth/otp', { action: 'verify', email: formData.email, otp: formData.otp });
            if (res.data.success && res.data.verified) {
                showNotification('OTP verified successfully!', 'success');
                setTimeout(() => setStep(3), 500);
            } else {
                const errorMsg = res.data.error || 'Invalid OTP code';
                const attemptsRemaining = res.data.attemptsRemaining;
                showNotification(attemptsRemaining !== undefined ? `${errorMsg}. Attempts remaining: ${attemptsRemaining}` : errorMsg, 'error');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Invalid OTP code. Please try again.';
            const attemptsRemaining = err.response?.data?.attemptsRemaining;
            showNotification(attemptsRemaining !== undefined ? `${errorMsg}. Attempts remaining: ${attemptsRemaining}` : errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const selectPlan = (planName) => {
        setFormData(prev => ({ ...prev, plan: planName }));
        submitRegistration(planName);
    };

    const submitRegistration = async (planOverride) => {
        if (!formData.password || formData.password.trim().length < 6) {
            showNotification('Please enter a password (at least 6 characters)', 'error');
            return;
        }
        setLoading(true);
        const effectivePlan = planOverride != null ? planOverride : formData.plan;
        try {
            const res = await api.post('/api/auth/register-enterprise', {
                name: formData.enterpriseName,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
                location: formData.location,
                contact: formData.contact,
                plan: effectivePlan || 'Enterprise',
            });
            if (res.data && res.data.user) {
                localStorage.setItem('user', JSON.stringify(res.data.user));
            }
            setLoading(false);
            setStep(5);
        } catch (err) {
            setLoading(false);
            showNotification(err.response?.data?.message || 'Registration failed. Please try again.', 'error');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setStep(4);
    };

    // --- RENDER STEPS ---
    const renderStep1 = () => (
        <div style={stepContainer}>
            <button type="button" style={{ ...backBtn, alignSelf: 'flex-start', marginBottom: '8px' }} onClick={() => navigate('/signup', { state: { step: 'account-type' } })}>
                <i className="fas fa-arrow-left"></i> Back to change account type
            </button>
            <div style={{ ...iconCircle, background: '#f0f1ff', color: '#11575C' }}><i className="fas fa-building"></i></div>
            <h2>Enterprise Setup</h2>
            <p style={subText}>
                Welcome to the IPM Enterprise Portal. You are about to configure your enterprise group profile.
                You will be responsible for managing your agencies, branches, branding, and billing.
            </p>
            <button style={btnPrimary} onClick={() => setShowAdminAckModal(true)}>Get Started <i className="fas fa-arrow-right"></i></button>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <Link to="/login" style={linkStyle}>Already have an account? Login</Link>
                <Link to="/forgot-password" style={{ ...linkStyle, fontSize: '13px' }}>Forgot password?</Link>
            </div>
            {showAdminAckModal && (
                <div style={adminAckModalOverlay} onClick={() => setShowAdminAckModal(false)}>
                    <div style={adminAckModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={adminAckModalHeader}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>Enterprise administrator acknowledgment</h3>
                            <button type="button" style={adminAckModalClose} onClick={() => setShowAdminAckModal(false)} aria-label="Close"><i className="fas fa-times"></i></button>
                        </div>
                        <div style={adminAckModalBody}>
                            <p style={{ marginBottom: '16px', color: '#334155', lineHeight: 1.6 }}>
                                By continuing, you confirm that you are the <strong>enterprise administrator</strong>, or are duly authorized to set up this enterprise account. You will be responsible for managing your enterprise&apos;s agencies, branding, billing, and overall operations on the IPM platform.
                            </p>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                <input type="checkbox" checked={adminAckChecked} onChange={(e) => setAdminAckChecked(e.target.checked)} style={{ marginTop: '4px' }} />
                                <span>I acknowledge that I am the enterprise administrator (or authorized to set up this enterprise) and accept responsibility for managing this account.</span>
                            </label>
                        </div>
                        <div style={adminAckModalFooter}>
                            <button type="button" style={backBtn} onClick={() => setShowAdminAckModal(false)}>Cancel</button>
                            <button type="button" style={{ ...btnPrimary, width: 'auto', padding: '12px 24px', opacity: adminAckChecked ? 1 : 0.6, cursor: adminAckChecked ? 'pointer' : 'not-allowed' }} onClick={() => { if (adminAckChecked) { setShowAdminAckModal(false); setStep(2); } }} disabled={!adminAckChecked}>
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep2 = () => (
        <div style={stepContainer}>
            <button type="button" style={{ ...backBtn, alignSelf: 'flex-start', marginBottom: '8px' }} onClick={() => navigate('/signup', { state: { step: 'account-type' } })}>
                <i className="fas fa-arrow-left"></i> Back to change account type
            </button>
            <h2>Verify Your Email</h2>
            <p style={subText}>We need to verify your identity before setting up your enterprise.</p>

            <div style={inputGroup}>
                <label style={labelStyle}>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="admin@enterprise.com" style={inputStyle} disabled={otpSent} />
            </div>
            <div style={inputGroup}>
                <label style={labelStyle}>Create Password</label>
                <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} style={{ ...inputStyle, paddingRight: '40px' }} placeholder="••••••••" disabled={otpSent} />
                    <button type="button" onClick={() => setShowPassword((prev) => !prev)} style={togglePasswordBtn} aria-label={showPassword ? 'Hide password' : 'Show password'} disabled={otpSent}>
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                </div>
            </div>

            {!otpSent ? (
                <button style={btnPrimary} onClick={sendOtp} disabled={loading}>{loading ? 'Sending...' : 'Send OTP'}</button>
            ) : (
                <div style={{ marginTop: '20px', animation: 'fadeIn 0.5s', width: '100%' }}>
                    {loading && <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Sending code to your email…</p>}
                    <div style={inputGroup}>
                        <label style={labelStyle}>Enter OTP</label>
                        <input type="text" name="otp" value={formData.otp} onChange={handleChange} placeholder="Enter 4-digit OTP code" style={inputStyle} maxLength="4" />
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                        Didn&apos;t receive the code?{' '}
                        {resendCooldown > 0 ? (
                            <span style={{ color: '#94a3b8' }}>Resend in {resendCooldown}s</span>
                        ) : (
                            <button type="button" onClick={sendOtp} disabled={loading} style={{ background: 'none', border: 'none', padding: 0, color: '#11575C', textDecoration: 'underline', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '12px' }}>Resend</button>
                        )}
                    </p>
                    <button style={btnPrimary} onClick={verifyOtp}>Verify & Continue</button>
                    <p style={{ fontSize: '12px', marginTop: '10px', color: '#64748b', cursor: 'pointer' }} onClick={() => setOtpSent(false)}>Change Email</p>
                </div>
            )}
            <button style={backBtn} onClick={() => setStep(1)}>
                <i className="fas fa-arrow-left"></i> Back
            </button>
        </div>
    );

    const renderStep3 = () => (
        <div style={stepContainer}>
            <h2>Enterprise Details</h2>
            <p style={subText}>Tell us about your enterprise group.</p>
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <div style={inputGroup}>
                    <label style={labelStyle}>Enterprise / Group Name</label>
                    <input type="text" name="enterpriseName" value={formData.enterpriseName} onChange={handleChange} required style={inputStyle} placeholder="e.g. Property Group Holdings" />
                </div>
                <div style={inputGroup}>
                    <label style={labelStyle}><i className="fas fa-map-marker-alt" style={{ marginRight: '8px', color: '#11575C' }}></i>Head Office Address</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <GooglePlacesInput
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            onPlaceSelected={(formatted) => setFormData(prev => ({ ...prev, location: formatted }))}
                            placeholder="Street, City, Country, Postal Code"
                            inputStyle={{ ...inputStyle, flex: 1, background: '#f8fafc' }}
                        />
                        <button type="button" onClick={detectLocation} disabled={locating} style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #11575C', background: '#fff', color: '#11575C', cursor: 'pointer', fontSize: '16px' }} title="Use current location">
                            {locating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-map-marker-alt"></i>}
                        </button>
                    </div>
                </div>
                <div style={inputGroup}>
                    <label style={labelStyle}>Contact Number</label>
                    <input type="tel" name="contact" value={formData.contact} onChange={handleChange} required style={inputStyle} placeholder="+27 ..." />
                </div>
                <div style={inputGroup}>
                    <label style={labelStyle}>Phone (optional)</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} placeholder="Office line" />
                </div>
                <button type="submit" style={btnPrimary}>Next: Select Plan</button>
            </form>
            <button style={backBtn} onClick={() => setStep(2)}>
                <i className="fas fa-arrow-left"></i> Back
            </button>
        </div>
    );

    const ENTERPRISE_PLAN_OPTIONS = [
        { id: 'Enterprise', title: 'Enterprise', subtitle: 'Manage multiple agencies & branches', dueToday: true, earlyReg: true, features: ['Unlimited agencies & branches under one enterprise', 'Enterprise-wide dashboard with aggregated analytics', 'Centralized agency management & invite system', 'Brand-wide listing & lead oversight (read-only)', 'Enterprise Smart Vault for group-wide documents', 'Priority support & onboarding'], cta: 'Get Started', recommended: true },
        { id: 'Custom', title: 'Custom', subtitle: 'Tailored for large groups', dueToday: false, earlyReg: false, features: ['Everything in Enterprise', 'Dedicated account manager', 'Custom integrations & API access', 'White-label branding options'], cta: 'Contact us', recommended: false }
    ];
    const termsModalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' };
    const termsModalContent = { background: '#fff', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
    const termsModalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' };
    const termsModalClose = { background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' };
    const termsModalBody = { overflowY: 'auto', padding: '20px', flex: 1, minHeight: 0 };
    const termsModalFooter = { padding: '12px 20px', borderTop: '1px solid #e2e8f0' };
    const termsLinkBtn = { background: 'none', border: 'none', padding: 0, color: '#11575C', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600', fontSize: 'inherit' };
    const termsLinkBtnHighlight = { background: 'rgba(255, 200, 1, 0.35)', border: 'none', padding: '0 2px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600', color: '#1e293b', fontSize: 'inherit' };
    const termsCheckboxLabel = { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '4px', fontSize: '11px', color: '#475569', cursor: 'pointer', marginBottom: '8px', textAlign: 'left' };
    const termsCheckboxInput = { marginTop: '2px', flexShrink: 0 };
    const planGridEnterprise = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', width: '100%', maxWidth: '700px', marginBottom: '8px' };
    const planCardBase = { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0, flex: 1, position: 'relative' };
    const planCardRecommended = { ...planCardBase, border: '2px solid #11575C', background: '#f0fdfa' };

    const renderStep4 = () => (
        <div style={stepContainer}>
            <h2 style={{ marginBottom: '20px' }}>Select a Plan</h2>
            <p style={subText}>Choose the plan that fits your enterprise.</p>
            <div style={planGridEnterprise}>
                {ENTERPRISE_PLAN_OPTIONS.map((plan) => (
                    <div key={plan.id} style={plan.recommended ? planCardRecommended : planCardBase}>
                        {plan.recommended && <div style={badge}>RECOMMENDED</div>}
                        <h3 style={planTitle}>{plan.title}</h3>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{plan.subtitle}</div>
                        {plan.dueToday && <div style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold', marginBottom: '2px' }}>€0.00 due today</div>}
                        {plan.earlyReg && <div style={{ fontSize: '11px', color: '#166534', marginBottom: '10px' }}>Early registration — start free during beta!</div>}
                        <ul style={{ ...planList, flex: 1, width: '100%', marginBottom: '12px' }}>
                            {plan.features.map((f, i) => (
                                <li key={i}><i className="fas fa-check" style={{ color: '#166534', marginRight: '6px' }}></i>{f}</li>
                            ))}
                        </ul>
                        <div style={{ marginTop: 'auto', width: '100%', paddingTop: '8px' }}>
                            {plan.id !== 'Custom' && (
                                <label style={termsCheckboxLabel}>
                                    <input type="checkbox" checked={planTermsAccepted[plan.id]?.terms || false} onChange={(e) => setPlanTermsAccepted(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], terms: e.target.checked } }))} style={termsCheckboxInput} />
                                    <span>I accept the <button type="button" style={termsLinkBtn} onClick={() => setShowTermsModal(true)}>Terms of Service</button> (see <button type="button" style={termsLinkBtnHighlight} onClick={() => setShowPrivacyModal(true)}>Privacy Policy</button>).</span>
                                </label>
                            )}
                            {plan.id === 'Custom' ? (
                                <a href="mailto:contact@ipm.com" style={{ ...btnPrimary, marginTop: '8px', textAlign: 'center', textDecoration: 'none', display: 'block' }}>{plan.cta}</a>
                            ) : (
                                <button style={{ ...btnPrimary, marginTop: '8px', opacity: planTermsAccepted[plan.id]?.terms ? 1 : 0.6, cursor: planTermsAccepted[plan.id]?.terms ? 'pointer' : 'not-allowed' }} onClick={() => selectPlan(plan.id)} disabled={loading || !planTermsAccepted[plan.id]?.terms}>
                                    {loading ? 'Setting up...' : plan.cta}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <button style={backBtn} onClick={() => setStep(3)}><i className="fas fa-arrow-left"></i> Back</button>
            {showTermsModal && (
                <div style={termsModalOverlay} onClick={() => setShowTermsModal(false)}>
                    <div style={termsModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={termsModalHeader}><h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>Terms of Service (Enterprise)</h3><button type="button" style={termsModalClose} onClick={() => setShowTermsModal(false)} aria-label="Close"><i className="fas fa-times"></i></button></div>
                        <div style={termsModalBody}><EnterpriseTermsContent onOpenPrivacy={() => { setShowTermsModal(false); setShowPrivacyModal(true); }} /></div>
                        <div style={termsModalFooter}><button type="button" style={btnPrimary} onClick={() => setShowTermsModal(false)}>Close</button></div>
                    </div>
                </div>
            )}
            {showPrivacyModal && (
                <div style={termsModalOverlay} onClick={() => setShowPrivacyModal(false)}>
                    <div style={termsModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={termsModalHeader}><h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>Privacy Policy</h3><button type="button" style={termsModalClose} onClick={() => setShowPrivacyModal(false)} aria-label="Close"><i className="fas fa-times"></i></button></div>
                        <div style={termsModalBody}>{ENTERPRISE_PRIVACY}</div>
                        <div style={termsModalFooter}><button type="button" style={btnPrimary} onClick={() => setShowPrivacyModal(false)}>Close</button></div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep5 = () => (
        <div style={stepContainer}>
            <div style={{ ...iconCircle, background: '#dcfce7', color: '#166534' }}>
                <i className="fas fa-check"></i>
            </div>
            <h2>Setup Complete!</h2>
            <p style={subText}>Your enterprise dashboard is ready. You can now link your agencies, invite new ones, and manage your group.</p>
            <button style={btnPrimary} onClick={() => { window.location.href = '/dashboard'; }}>Go to Dashboard</button>
        </div>
    );

    const isPlanStep = step === 4;
    return (
        <div style={pageContainer}>
            <div className="auth-visual-side" style={{ ...visualSide, display: isMobile ? 'none' : 'flex' }}>
                <div style={overlay}>
                    <h1 style={{ fontSize: '2.5em', marginBottom: '20px' }}>Enterprise with IPM.</h1>
                    <div style={stepIndicator}>
                        {[1, 2, 3, 4, 5].map(s => (
                            <div key={s} style={{ ...stepDot, opacity: step >= s ? 1 : 0.4, background: step >= s ? '#fff' : 'transparent', border: '1px solid #fff' }}>
                                {step > s ? <i className="fas fa-check" style={{ color: '#11575C', fontSize: '10px' }}></i> : s}
                            </div>
                        ))}
                        <span style={{ marginLeft: '10px', fontSize: '14px' }}>Step {step} of 5</span>
                    </div>
                </div>
            </div>
            <div className="auth-form-side" style={{
                ...formSide,
                overflowY: 'auto',
                minHeight: 0,
                alignItems: isPlanStep ? 'flex-start' : 'center',
                paddingTop: isPlanStep ? '24px' : undefined,
                paddingBottom: isPlanStep ? '24px' : undefined
            }}>
                <div style={{ ...formWrapper, maxWidth: step === 4 ? '750px' : formWrapper.maxWidth }}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                    {step === 5 && renderStep5()}
                </div>
            </div>
        </div>
    );
};

// --- STYLES (same as AgencyRegistration for visual consistency) ---
const pageContainer = { display: 'flex', height: '100vh', width: '100%', fontFamily: "'Inter', sans-serif" };
const visualSide = { flex: 1, background: "url('/site-assets/signup-left/signup.jpg') center/cover no-repeat", position: 'relative' };
const overlay = { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(17, 87, 92, 0.5), rgba(17, 87, 92, 0.9))', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: 'white' };
const formSide = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff', minHeight: 0 };
const formWrapper = { width: '100%', maxWidth: '450px', padding: '40px' };
const stepContainer = { display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center', animation: 'fadeIn 0.5s ease', width: '100%' };
const iconCircle = { width: '60px', height: '60px', background: '#f0fdfa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#11575C', marginBottom: '10px' };
const subText = { color: '#64748b', lineHeight: '1.6' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', textAlign: 'left', marginBottom: '15px' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#334155' };
const inputStyle = { width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc' };
const btnPrimary = { width: '100%', padding: '16px', background: '#11575C', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '10px', transition: '0.2s' };
const linkStyle = { color: '#11575C', fontWeight: 'bold', textDecoration: 'none' };
const backBtn = { background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' };
const togglePasswordBtn = { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '14px' };
const planTitle = { fontSize: '16px', fontWeight: '700', color: '#334155' };
const planList = { listStyle: 'none', padding: 0, textAlign: 'left', fontSize: '13px', color: '#64748b', lineHeight: '2' };
const badge = { position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#11575C', color: 'white', fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' };
const stepIndicator = { display: 'flex', alignItems: 'center', marginTop: 'auto' };
const stepDot = { width: '25px', height: '25px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '5px', fontSize: '12px', fontWeight: 'bold', color: '#11575C' };

export default EnterpriseRegistration;
