import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/api';
import { showNotification } from '../components/NotificationManager';
import GooglePlacesInput from '../components/GooglePlacesInput';
import { useIsMobile } from '../hooks/useMediaQuery';

// Agent Terms of Service – "Privacy Policy" is clickable (yellow highlight)
const AgentTermsContent = ({ onOpenPrivacy }) => (
    <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#334155', textAlign: 'left', paddingRight: '8px' }}>
        <p><strong>TERMS OF SERVICE (AGENTS) – International Property Market Platform</strong></p>
        <p><strong>Introduction.</strong> International Property Market B.V., registered with the Dutch Trade Register under number 98220136, (“IPM”) offers an online platform for real estate owners, buyers, tenants, investors, brokers, agents and service providers (the “Platform”). These terms (the “Terms”) govern your access to, and use of, the Platform and the services offered throughout the Platform. Please read these Terms carefully. If you do not agree to these Terms, do not use the Platform.</p>
        <p>By creating an account, accessing, or using the Platform, you (“Agent”, "User" or "you") acknowledge that you have read, understood, and agree to be bound by these Terms, our <button type="button" onClick={onOpenPrivacy} style={{ background: 'rgba(255, 200, 1, 0.35)', border: 'none', padding: '0 2px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600', color: '#1e293b' }}>Privacy Policy</button>, and any additional terms and conditions that may apply to specific features of the Platform and services offered. To use the Platform, you must: be at least 18 years of age; hold the required licenses and permits in the jurisdiction(s) where you conduct business; be authorized to represent and list properties for sale or for rent; and comply with all applicable laws and regulations.</p>
        <p><strong>Account registration.</strong> You must create an account to access certain features of the Platform available to real estate agents. You agree to provide accurate, complete, and current information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason.</p>
        <p><strong>Services.</strong> The Platform provides a comprehensive suite of services for real estate professionals, subject to your applicable subscription level as set forth on our subscription page. We reserve the right to modify, suspend, or discontinue any aspect of the Platform or any specific service at any time, with or without notice. Leads provided to you through the Platform are provided on an as-available basis. We do not guarantee the quality, quantity, or conversion rate of any leads. You must respect the privacy rights of individuals and obtain appropriate consent for communications. You may not resell, redistribute, or share leads with third parties without our express written consent. Some of our services utilize AI systems. AI-generated content may contain inaccuracies and should be verified before use. You maintain sole responsibility for listings using AI outputs or AI guidance.</p>
        <p><strong>Subscription plans and service tiers.</strong> The Platform offers various subscription plans with different features, usage limits, and pricing. By subscribing to a particular plan, you agree to the terms, limitations, and pricing associated with that plan. We reserve the right to modify subscription plans, features, and pricing with reasonable notice to existing subscribers.</p>
        <p><strong>User responsibilities and prohibited conduct.</strong> You agree to comply with all applicable laws, regulations, and industry standards, including fair housing laws, anti-discrimination laws, data protection regulations, and real estate licensing requirements. You represent and warrant that all information you provide through the Platform, including property listings, descriptions, images, and pricing, is accurate, current, complete, and not misleading. You must have proper authorization to list any property on the Platform. You agree not to: post false or misleading information; upload content that infringes intellectual property rights; violate fair housing or anti-discrimination laws; list properties you are not authorized to represent; use the Platform for any illegal or unauthorized purpose; resell or share leads or proprietary data with third parties; or attempt to gain unauthorized access to the Platform or other user accounts.</p>
        <p><strong>Privacy and Data Protection.</strong> Your use of the Platform is subject to our <button type="button" onClick={onOpenPrivacy} style={{ background: 'rgba(255, 200, 1, 0.35)', border: 'none', padding: '0 2px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600', color: '#1e293b' }}>Privacy Policy</button>. By using the Platform, you consent to our collection and use of your information as described in the Privacy Policy. You are responsible for ensuring that any personal data you collect, store, or process through the Platform complies with all applicable data protection laws.</p>
        <p><strong>Fees and payment.</strong> Access to our services requires payment of subscription fees according to the plan you select. Payment is due in accordance with your billing cycle. Subscriptions automatically renew unless you cancel. All fees are non-refundable unless otherwise stated or required by law. We reserve the right to change our fees with reasonable notice.</p>
        <p><strong>Disclaimers &amp; liability.</strong> The Platform and all services are provided "as is" and "as available" without warranties of any kind. The Platform does not provide legal, financial, tax, or professional real estate advice. We are not responsible for the accuracy of user content, third-party content, or market data. We make no guarantees regarding the quality, accuracy, or conversion rate of leads. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.</p>
        <p><strong>Indemnification.</strong> You agree to indemnify, defend, and hold harmless IPM, its affiliates, officers, directors, employees and licensors from and against any claims, liabilities, damages, losses, costs, or expenses arising from your use of the Platform, your User Content, your communications with leads, your violation of these Terms, or your violation of any rights of third parties or applicable laws.</p>
        <p><strong>Termination.</strong> You may terminate your account at any time. We may suspend or terminate your account at any time, with or without cause. Upon termination, all licenses cease and you lose access to all Platform services. Provisions that by their nature should survive termination shall survive.</p>
        <p><strong>Miscellaneous.</strong> These terms may be revised by IPM at any time; you will be notified when you next login. Dutch law applies. Any dispute shall be submitted to the competent court in Amsterdam, the Netherlands. Contact: enquiries@internationalpropertymarket.com</p>
    </div>
);

const agentTermsParagraphStyle = { fontSize: '13px', lineHeight: 1.6, color: '#334155', textAlign: 'left', paddingRight: '8px' };
const AGENT_GENERAL_TERMS_CONTENT = (
    <div style={agentTermsParagraphStyle}>
        <p><strong>GENERAL TERMS OF USE – International Property Market Platform</strong></p>
        <p><strong>Introduction.</strong> International Property Market B.V. (“IPM”) offers an online platform for real estate owners, buyers, tenants, investors, brokers, agents and service providers (the “Platform”). These terms govern your access to and use of the Platform. By accessing or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. To use the Platform, you must be at least 18 years of age. We reserve the right to modify subscription plans, features, and pricing with reasonable notice.</p>
        <p><strong>User responsibilities.</strong> Users shall maintain professional standards. Users shall not use the Platform for any illegal purpose; resell or redistribute data; attempt unauthorized access; interfere with the Platform; or use automated systems to extract data beyond authorized use.</p>
        <p><strong>Privacy and Data Protection.</strong> Your use of the Platform is subject to our Privacy Policy. By using the Platform, you consent to our collection and use of your information as described in the Privacy Policy.</p>
        <p><strong>Liability.</strong> The Platform and all services are provided "as is". To the maximum extent permitted by law, we shall not be liable for any damage as a result of your use of the Platform. Dutch law applies. Contact: enquiries@internationalpropertymarket.com</p>
    </div>
);
const AGENT_PRIVACY_POLICY_CONTENT = (
    <div style={agentTermsParagraphStyle}>
        <p><strong>PRIVACY POLICY – International Property Market</strong></p>
        <p>IPM collects, uses, and protects your personal information in connection with the Platform. By using the Platform, you consent to our collection and use of your information. We may collect information you provide (e.g. account registration, profile, property data), usage data, and device information. We use this information to operate and improve the Platform and to provide services. We implement commercially reasonable security measures. We do not sell your personal information to third parties for their marketing. For privacy questions, contact enquiries@internationalpropertymarket.com.</p>
    </div>
);

const IndependentAgentRegistration = ({ inviteToken = null, inviteEmail = '', inviteAgencyName = '', inviteBranchName = '', skipOtp = false }) => {
    const isMobile = useIsMobile();
    const isAgencyInvite = Boolean(inviteToken);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [planTermsAccepted, setPlanTermsAccepted] = useState({ Basic: { terms: false, generalTerms: false } });
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showGeneralTermsModal, setShowGeneralTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [selectedAgencyEliteOption, setSelectedAgencyEliteOption] = useState('10-100'); // 10 Users, 100 Listings @ 550

    // Form State
    const [formData, setFormData] = useState({
        email: inviteEmail || '',
        otp: '',
        password: '',
        plan: '',
        firstName: '',
        lastName: '',
        location: ''
    });

    const [otpSent, setOtpSent] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [locating, setLocating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Password validation (same as ClientRegistration: 8+ chars, upper, lower, number, special)
    const passwordChecks = {
        minLength: formData.password.length >= 8,
        hasLower: /[a-z]/.test(formData.password),
        hasUpper: /[A-Z]/.test(formData.password),
        hasNumber: /\d/.test(formData.password),
        hasSpecial: /[^A-Za-z0-9]/.test(formData.password)
    };
    const isPasswordValid = Object.values(passwordChecks).every(Boolean);

    // --- HANDLERS ---
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

    // Step 1: Send OTP (Real API) – show OTP box immediately, send in background
    const sendOtp = async () => {
        if (!formData.email) {
            showNotification('Please enter your email address', 'error');
            return;
        }
        if (!isPasswordValid) {
            showNotification('Please use a stronger password before sending OTP.', 'error');
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
                showNotification('This email is already registered. Please log in instead.', 'error');
                setOtpSent(false);
                setLoading(false);
                return;
            }
            const res = await api.post('/api/auth/otp', {
                action: 'send',
                email: formData.email,
                userType: 'independent_agent'
            });
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
            console.error('OTP send error:', err);
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

    // OTP resend countdown
    useEffect(() => {
        if (!otpSent || resendCooldown <= 0) return;
        const t = setInterval(() => setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
        return () => clearInterval(t);
    }, [otpSent, resendCooldown]);

    // Step 1: Verify OTP (Real API)
    const verifyOtp = async () => {
        if (!formData.otp) {
            showNotification('Please enter the OTP code', 'error');
            return;
        }
        if (formData.otp.length !== 4) {
            showNotification('Please enter a 4-digit OTP code', 'error');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/api/auth/otp', {
                action: 'verify',
                email: formData.email,
                otp: formData.otp
            });
            
            if (res.data.success && res.data.verified) {
                showNotification('OTP verified successfully!', 'success');
                setTimeout(() => setStep(2), 500); // Step 2 = Personal Details
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
            console.error('OTP verify error:', err);
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

    // Step 3: Select Plan (after profile); then submit (pass plan and optional Agency Elite option)
    const selectPlan = (planName, agencyEliteOption = null) => {
        setFormData(prev => ({ ...prev, plan: planName, ...(agencyEliteOption != null && { agencyEliteOption }) }));
        submitRegistration(planName, agencyEliteOption);
    };

    // Submit registration (used after Plan selection in step 3; planOverride and optionOverride so state is current)
    const submitRegistration = async (planOverride, agencyEliteOptionOverride = null) => {
        if (!formData.password || formData.password.trim().length < 8) {
            showNotification('Please enter a password that meets all requirements (8+ characters, upper, lower, number, special).', 'error');
            return;
        }
        setLoading(true);
        const effectivePlan = planOverride != null ? planOverride : formData.plan;
        const effectiveOption = agencyEliteOptionOverride != null ? agencyEliteOptionOverride : formData.agencyEliteOption;
        try {
            const data = new FormData();
            data.append('email', formData.email);
            data.append('password', formData.password);
            data.append('name', `${formData.firstName} ${formData.lastName}`);
            data.append('location', formData.location);
            data.append('plan', effectivePlan || 'Basic Agent');
            if (effectivePlan === 'Premium' && effectiveOption) data.append('planOption', effectiveOption);
            data.append('role', inviteToken ? 'agency_agent' : 'independent_agent');
            if (inviteToken) data.append('inviteToken', inviteToken);
            const res = await api.post('/api/auth/register-agency', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data?.user) {
                if (res.data.stripeRedirect && effectivePlan === 'Basic') {
                    try {
                        const checkoutRes = await api.post('/api/stripe-create-checkout', {
                            plan: 'Basic',
                            userId: res.data.user._id,
                            role: 'independent_agent'
                        });
                        if (checkoutRes.data?.url) {
                            localStorage.setItem('user', JSON.stringify(res.data.user));
                            window.location.href = checkoutRes.data.url;
                            return;
                        }
                        await api.post('/api/auth/rollback-registration', { userId: res.data.user._id }).catch(() => {});
                        showNotification(checkoutRes?.data?.message || 'Could not start payment. Please try again.', 'error');
                    } catch (checkoutErr) {
                        await api.post('/api/auth/rollback-registration', { userId: res.data.user._id }).catch(() => {});
                        showNotification(checkoutErr.response?.data?.message || checkoutErr.message || 'Could not start payment. Please try again.', 'error');
                    }
                    setLoading(false);
                    return;
                }
                localStorage.setItem('user', JSON.stringify(res.data.user));
            }
            setLoading(false);
            setStep(skipOtp ? 3 : 4);
        } catch (err) {
            console.error(err);
            setLoading(false);
            if (err.response?.status === 413 || err.message?.includes('413') || err.message?.includes('Content Too Large')) {
                showNotification('Request too large. Please try again.', 'error');
            } else {
                showNotification(err.response?.data?.message || "Registration failed. Email might be taken.", 'error');
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setStep(3); // Go to Plan step
    };

    // --- RENDER STEPS ---

    // Agency invite step 1: Password + Profile (no OTP)
    const renderAgencyStep1 = () => (
        <div style={stepContainer}>
            {inviteAgencyName && (
                <p style={{ fontSize: '13px', color: '#11575C', marginBottom: '12px', padding: '10px', background: '#f0fdfa', borderRadius: '8px' }}>
                    Joining <strong>{inviteAgencyName}</strong>{inviteBranchName ? ` — ${inviteBranchName}` : ''}
                </p>
            )}
            <div style={iconCircle}><i className="fas fa-user-plus"></i></div>
            <h2>Set Password &amp; Profile</h2>
            <p style={subText}>Create your password and complete your profile. No email verification needed.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (isPasswordValid && formData.firstName?.trim() && formData.lastName?.trim()) setStep(2); }} style={{ width: '100%' }}>
                <div style={inputGroup}>
                    <label style={labelStyle}>Email</label>
                    <input type="email" name="email" value={formData.email} readOnly style={{ ...inputStyle, opacity: 0.9 }} />
                </div>
                <div style={inputGroup}>
                    <label style={labelStyle}>Create Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            style={{ ...inputStyle, paddingRight: '40px' }}
                            placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowPassword((prev) => !prev)} style={togglePasswordBtn} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                </div>
                <div style={passwordChecklist}>
                    {['minLength', 'hasUpper', 'hasLower', 'hasNumber', 'hasSpecial'].map((k, i) => (
                        <div key={k} style={{ ...passwordRule, ...(passwordChecks[k] ? passwordRuleOk : passwordRuleBad) }}>
                            <i className={`fas ${passwordChecks[k] ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                            {k === 'minLength' && 'At least 8 characters'}
                            {k === 'hasUpper' && 'One uppercase letter'}
                            {k === 'hasLower' && 'One lowercase letter'}
                            {k === 'hasNumber' && 'One number'}
                            {k === 'hasSpecial' && 'One special character'}
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={inputGroup}><label style={labelStyle}>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required style={inputStyle} placeholder="e.g. John" /></div>
                    <div style={inputGroup}><label style={labelStyle}>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required style={inputStyle} placeholder="e.g. Doe" /></div>
                </div>
                <div style={inputGroup}>
                    <label style={labelStyle}><i className="fas fa-map-marker-alt" style={{ marginRight: '8px', color: '#11575C' }}></i>Address</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <GooglePlacesInput name="location" value={formData.location} onChange={handleChange} onPlaceSelected={(formatted) => setFormData(prev => ({ ...prev, location: formatted }))} placeholder="Street, City, Country, Postal Code" inputStyle={{ ...inputStyle, flex: 1, background: '#f8fafc' }} />
                        <button type="button" onClick={detectLocation} disabled={locating} style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #11575C', background: '#fff', color: '#11575C', cursor: 'pointer', fontSize: '16px' }} title="Use current location">
                            {locating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-map-marker-alt"></i>}
                        </button>
                    </div>
                </div>
                <button type="submit" style={{ ...btnPrimary, opacity: isPasswordValid && formData.firstName?.trim() && formData.lastName?.trim() ? 1 : 0.6 }} disabled={!isPasswordValid || !formData.firstName?.trim() || !formData.lastName?.trim()}>
                    Continue to Plan
                </button>
            </form>
        </div>
    );

    // STEP 1: OTP
    const renderStep1 = () => (
        <div style={stepContainer}>
            {!isAgencyInvite && (
                <button
                    type="button"
                    style={{ ...backBtn, alignSelf: 'flex-start', marginBottom: '8px' }}
                    onClick={() => navigate('/signup', { state: { step: 'agent-type' } })}
                >
                    <i className="fas fa-arrow-left"></i> Back to change account type
                </button>
            )}
            {isAgencyInvite && inviteAgencyName && (
                <p style={{ fontSize: '13px', color: '#11575C', marginBottom: '12px', padding: '10px', background: '#f0fdfa', borderRadius: '8px' }}>
                    Joining <strong>{inviteAgencyName}</strong>{inviteBranchName ? ` — ${inviteBranchName}` : ''}
                </p>
            )}
            <div style={iconCircle}><i className="fas fa-shield-alt"></i></div>
            <h2>{isAgencyInvite ? 'Complete Your Registration' : 'Create Agent Account'}</h2>
            <p style={subText}>Verify your email to secure your account.</p>
            
            <div style={inputGroup}>
                <label style={labelStyle}>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" style={inputStyle} readOnly={otpSent || isAgencyInvite} />
            </div>
            <div style={inputGroup}>
                <label style={labelStyle}>Create Password</label>
                <div style={{ position: 'relative' }}>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        style={{ ...inputStyle, paddingRight: '40px' }}
                        placeholder="••••••••"
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
            <div style={passwordChecklist}>
                <div style={{ ...passwordRule, ...(passwordChecks.minLength ? passwordRuleOk : passwordRuleBad) }}>
                    <i className={`fas ${passwordChecks.minLength ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    At least 8 characters
                </div>
                <div style={{ ...passwordRule, ...(passwordChecks.hasUpper ? passwordRuleOk : passwordRuleBad) }}>
                    <i className={`fas ${passwordChecks.hasUpper ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    One uppercase letter
                </div>
                <div style={{ ...passwordRule, ...(passwordChecks.hasLower ? passwordRuleOk : passwordRuleBad) }}>
                    <i className={`fas ${passwordChecks.hasLower ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    One lowercase letter
                </div>
                <div style={{ ...passwordRule, ...(passwordChecks.hasNumber ? passwordRuleOk : passwordRuleBad) }}>
                    <i className={`fas ${passwordChecks.hasNumber ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    One number
                </div>
                <div style={{ ...passwordRule, ...(passwordChecks.hasSpecial ? passwordRuleOk : passwordRuleBad) }}>
                    <i className={`fas ${passwordChecks.hasSpecial ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    One special character
                </div>
            </div>

            {!otpSent ? (
                <button
                    style={{
                        ...btnPrimary,
                        opacity: isPasswordValid ? 1 : 0.6,
                        cursor: isPasswordValid ? 'pointer' : 'not-allowed'
                    }}
                    onClick={sendOtp}
                    disabled={loading || !isPasswordValid}
                >
                    {loading ? 'Sending...' : 'Send OTP'}
                </button>
            ) : (
                <div style={{ width: '100%', marginTop: '15px', animation: 'fadeIn 0.5s' }}>
                    {loading && <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Sending code to your email…</p>}
                    <input type="text" name="otp" value={formData.otp} onChange={handleChange} placeholder="Enter 4-digit OTP code" style={inputStyle} maxLength="4" />
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                        Didn&apos;t receive the code?{' '}
                        {resendCooldown > 0 ? (
                            <span style={{ color: '#94a3b8' }}>Resend in {resendCooldown}s</span>
                        ) : (
                            <button type="button" onClick={sendOtp} disabled={loading} style={{ background: 'none', border: 'none', padding: 0, color: '#11575C', textDecoration: 'underline', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '12px' }}>Resend</button>
                        )}
                    </p>
                    <button onClick={verifyOtp} style={{ ...btnPrimary, marginTop: '15px' }}>Verify</button>
                </div>
            )}
            <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#64748b' }}>
                Already have an account? <Link to="/login" style={{ color: '#11575C', fontWeight: '600', textDecoration: 'none' }}>Login</Link>
                {' · '}
                <Link to="/forgot-password" style={{ color: '#11575C', fontWeight: '600', textDecoration: 'none' }}>Forgot password?</Link>
            </p>
        </div>
    );

    // STEP 2: Personal Details (then Plan in step 3)
    const renderStep2 = () => (
        <div style={stepContainer}>
            <h2>Complete Profile</h2>
            <p style={subText}>Tell us a bit about yourself to setup your agent card.</p>
            <form onSubmit={handleSubmit} style={{width: '100%'}}>
                <div style={{display: 'flex', gap: '15px'}}>
                    <div style={inputGroup}>
                        <label style={labelStyle}>First Name</label>
                        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required style={inputStyle} placeholder="e.g. John" />
                    </div>
                    <div style={inputGroup}>
                        <label style={labelStyle}>Last Name</label>
                        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required style={inputStyle} placeholder="e.g. Doe" />
                    </div>
                </div>
                <div style={inputGroup}>
                    <label style={labelStyle}><i className="fas fa-map-marker-alt" style={{marginRight:'8px', color:'#11575C'}}></i>Address</label>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <GooglePlacesInput
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            onPlaceSelected={(formatted) => setFormData(prev => ({ ...prev, location: formatted }))}
                            placeholder="Street, City, Country, Postal Code"
                            inputStyle={{...inputStyle, flex:1, background:'#f8fafc'}}
                        />
                        <button type="button" onClick={detectLocation} disabled={locating} style={{padding:'12px 15px', borderRadius:'8px', border:'1px solid #11575C', background:'#fff', color:'#11575C', cursor:'pointer', fontSize:'16px'}} title="Use current location">
                            {locating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-map-marker-alt"></i>}
                        </button>
                    </div>
                </div>
                <button type="submit" style={btnPrimary}>Next: Select Plan</button>
            </form>
            <button style={backBtn} onClick={() => setStep(1)}>
                <i className="fas fa-arrow-left"></i> Back
            </button>
        </div>
    );

    const AGENCY_ELITE_OPTIONS = [
        { key: '10-100', users: 10, listings: 100, price: 980, label: '10 Users, 100 Listings' },
        { key: '15-150', users: 15, listings: 150, price: 1470, label: '15 Users, 150 Listings' },
        { key: '20-200', users: 20, listings: 200, price: 1960, label: '20 Users, 200 Listings' },
        { key: '25-250', users: 25, listings: 250, price: 2450, label: '25 Users, 250 Listings' }
    ];
    const AGENT_PLAN_OPTIONS = [
        { id: 'Basic', title: 'Basic', constraint: '1 User, 10 Listings', strikePrice: '59', subtitle: 'Ideal for Independent Pro', dueToday: true, earlyReg: true, features: ['Active Inventory: Manage up to 10 listings (pay-per-listing for more).', 'Client Relations: Full Smart CRM & Relation Management suite.', 'Lead Capture: Unlimited property enquiries & 5 IPM-verified leads monthly.', 'Data Security: Secure Smart Vault for document management.'], cta: 'Get Started', recommended: false }
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
    const constraintHighlightAgent = { background: 'rgba(17, 87, 92, 0.12)', color: '#11575C', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', marginBottom: '6px', display: 'inline-block' };
    const planGridAgent = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', width: '100%', maxWidth: '920px', marginBottom: '8px' };
    const planCardAgent = { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0, flex: 1, position: 'relative' };
    const planCardAgentPremium = { ...planCardAgent, border: '2px solid #11575C', background: '#f0fdfa' };

    // STEP 3: Subscription Plan – Basic only (independent agent)
    const renderStep3 = () => (
        <div style={stepContainer}>
            <h2>Select Your Plan</h2>
            <p style={subText}>Choose the plan that fits your business.</p>
            <div style={planGridAgent}>
                {AGENT_PLAN_OPTIONS.map((plan) => {
                    const premiumOption = plan.id === 'Premium' ? AGENCY_ELITE_OPTIONS.find(o => o.key === selectedAgencyEliteOption) : null;
                    return (
                    <div key={plan.id} style={plan.recommended ? planCardAgentPremium : planCardAgent}>
                        {plan.recommended && <div style={badge}>RECOMMENDED</div>}
                        <h3 style={planTitle}>{plan.title}</h3>
                        {plan.constraint && !plan.constraintDropdown && (
                            <div style={constraintHighlightAgent}>{plan.constraint}</div>
                        )}
                        {plan.constraintDropdown && premiumOption && (
                            <div style={{ width: '100%', marginBottom: '8px' }}>
                                <div style={constraintHighlightAgent}>{premiumOption.label}</div>
                                <select value={selectedAgencyEliteOption} onChange={(e) => setSelectedAgencyEliteOption(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', marginTop: '6px', background: '#fff' }}>
                                    {AGENCY_ELITE_OPTIONS.map(opt => (
                                        <option key={opt.key} value={opt.key}>{opt.label} — ${opt.price}/mo</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {(plan.strikePrice || (plan.id === 'Premium' && premiumOption)) ? (
                            <div style={{ marginBottom: '4px' }}>
                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginRight: '4px', fontSize: '15px' }}>{plan.id === 'Premium' && premiumOption ? premiumOption.price : plan.strikePrice}</span>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>/ Month</span>
                            </div>
                        ) : (
                            <div style={{ fontSize: '14px', color: '#11575C', fontWeight: '600', marginBottom: '8px' }}>Inquire for pricing</div>
                        )}
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{plan.subtitle}</div>
                        {plan.dueToday && <div style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold', marginBottom: '2px' }}>€0.00 due today</div>}
                        {plan.earlyReg && <div style={{ fontSize: '11px', color: '#166534', marginBottom: '10px' }}>Early registration gets you February and March for free!</div>}
                        <ul style={{ ...planList, flex: 1, width: '100%', marginBottom: '12px' }}>
                            {plan.features.map((f, i) => (
                                <li key={i}><i className="fas fa-check" style={{ color: '#166534', marginRight: '6px' }}></i>{f}</li>
                            ))}
                        </ul>
                        <div style={{ marginTop: 'auto', width: '100%', paddingTop: '8px' }}>
                            {plan.id !== 'Custom' && (
                                <>
                                    <label style={termsCheckboxLabel}>
                                        <input type="checkbox" checked={planTermsAccepted[plan.id]?.terms || false} onChange={(e) => setPlanTermsAccepted(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], terms: e.target.checked } }))} style={termsCheckboxInput} />
                                        <span>I accept the <button type="button" style={termsLinkBtn} onClick={() => setShowTermsModal(true)}>Terms of Service</button> (see <button type="button" style={termsLinkBtnHighlight} onClick={() => setShowPrivacyModal(true)}>Privacy Policy</button>).</span>
                                    </label>
                                </>
                            )}
                            {plan.id === 'Custom' ? (
                                <a href="mailto:contact@ipm.com" style={{ ...btnPrimary, marginTop: '8px', textAlign: 'center', textDecoration: 'none', display: 'block' }}>{plan.cta}</a>
                            ) : (
                                <button style={{ ...btnPrimary, marginTop: '8px', opacity: planTermsAccepted[plan.id]?.terms ? 1 : 0.6, cursor: planTermsAccepted[plan.id]?.terms ? 'pointer' : 'not-allowed' }} onClick={() => selectPlan(plan.id, plan.id === 'Premium' ? selectedAgencyEliteOption : null)} disabled={loading || !planTermsAccepted[plan.id]?.terms}>
                                    {loading ? 'Creating Profile...' : plan.cta}
                                </button>
                            )}
                        </div>
                    </div>
                    );
                })}
            </div>
            <button style={backBtn} onClick={() => setStep(skipOtp ? 1 : 2)}><i className="fas fa-arrow-left"></i> Back</button>
            {showTermsModal && (
                <div style={termsModalOverlay} onClick={() => setShowTermsModal(false)}>
                    <div style={termsModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={termsModalHeader}><h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>Terms of Service (Agents)</h3><button type="button" style={termsModalClose} onClick={() => setShowTermsModal(false)} aria-label="Close"><i className="fas fa-times"></i></button></div>
                        <div style={termsModalBody}><AgentTermsContent onOpenPrivacy={() => { setShowTermsModal(false); setShowPrivacyModal(true); }} /></div>
                        <div style={termsModalFooter}><button type="button" style={btnPrimary} onClick={() => setShowTermsModal(false)}>Close</button></div>
                    </div>
                </div>
            )}
            {showGeneralTermsModal && (
                <div style={termsModalOverlay} onClick={() => setShowGeneralTermsModal(false)}>
                    <div style={termsModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={termsModalHeader}><h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>General Terms of Use</h3><button type="button" style={termsModalClose} onClick={() => setShowGeneralTermsModal(false)} aria-label="Close"><i className="fas fa-times"></i></button></div>
                        <div style={termsModalBody}><p style={{ ...agentTermsParagraphStyle, marginBottom: '12px' }}>This document also contains our <button type="button" style={termsLinkBtnHighlight} onClick={() => { setShowGeneralTermsModal(false); setShowPrivacyModal(true); }}>Privacy Policy</button> (click to open).</p>{AGENT_GENERAL_TERMS_CONTENT}</div>
                        <div style={termsModalFooter}><button type="button" style={btnPrimary} onClick={() => setShowGeneralTermsModal(false)}>Close</button></div>
                    </div>
                </div>
            )}
            {showPrivacyModal && (
                <div style={termsModalOverlay} onClick={() => setShowPrivacyModal(false)}>
                    <div style={termsModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={termsModalHeader}><h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>Privacy Policy</h3><button type="button" style={termsModalClose} onClick={() => setShowPrivacyModal(false)} aria-label="Close"><i className="fas fa-times"></i></button></div>
                        <div style={termsModalBody}>{AGENT_PRIVACY_POLICY_CONTENT}</div>
                        <div style={termsModalFooter}><button type="button" style={btnPrimary} onClick={() => setShowPrivacyModal(false)}>Close</button></div>
                    </div>
                </div>
            )}
        </div>
    );

    // STEP 4: Success
    const renderStep4 = () => (
        <div style={stepContainer}>
            <div style={{...iconCircle, background: '#dcfce7', color: '#166534'}}>
                <i className="fas fa-check"></i>
            </div>
            <h2>You're All Set!</h2>
            <p style={subText}>Your Independent Agent account is active. You can now access your dashboard and start listing properties.</p>
            <button style={btnPrimary} onClick={() => { window.location.href = '/agent-dashboard'; }}>Go to Dashboard</button>
        </div>
    );

    const isPlanStep = (skipOtp && step === 2) || (!skipOtp && step === 3);
        return (
        <div style={pageContainer}>
            {/* Visual Side */}
            <div className="auth-visual-side" style={{ ...visualSide, display: isMobile ? 'none' : 'flex' }}>
                <div style={overlay}>
                    <h1 style={{fontSize: '2.5em', marginBottom: '20px'}}>Grow Your Business.</h1>
                    <div style={stepIndicator}>
                        {(skipOtp ? [1,2,3] : [1,2,3,4]).map(s => (
                            <div key={s} style={{...stepDot, opacity: step >= s ? 1 : 0.4, background: step >= s ? '#fff' : 'transparent', border: '1px solid #fff'}}>
                                {step > s ? <i className="fas fa-check" style={{color: '#11575C', fontSize:'10px'}}></i> : s}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Form Side */}
            <div className="auth-form-side" style={{
                ...formSide,
                overflowY: 'auto',
                minHeight: 0,
                alignItems: isPlanStep ? 'flex-start' : 'center',
                paddingTop: isPlanStep ? '24px' : undefined,
                paddingBottom: isPlanStep ? '24px' : undefined
            }}>
                <div style={{ ...formWrapper, maxWidth: (skipOtp ? step === 2 : step === 3) ? '920px' : formWrapper.maxWidth }}>
                    {skipOtp ? (
                        <>
                            {step === 1 && renderAgencyStep1()}
                            {step === 2 && renderStep3()}
                            {step === 3 && renderStep4()}
                        </>
                    ) : (
                        <>
                            {step === 1 && renderStep1()}
                            {step === 2 && renderStep2()}
                            {step === 3 && renderStep3()}
                            {step === 4 && renderStep4()}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- STYLES ---
const pageContainer = { display: 'flex', height: '100vh', width: '100%', fontFamily: "'Inter', sans-serif" };
const visualSide = { flex: 1, background: "url('/site-assets/signup-left/independent-agent.jpg') center/cover no-repeat", position: 'relative' };
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
const backBtn = { background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' };
const togglePasswordBtn = { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '14px' };
const passwordChecklist = { width: '100%', textAlign: 'left', marginTop: '-5px', marginBottom: '15px', fontSize: '12px' };
const passwordRule = { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' };
const passwordRuleOk = { color: '#166534' };
const passwordRuleBad = { color: '#dc2626' };
const promoBanner = { background: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', width: '100%', textAlign: 'center' };

const planCardActive = { width: '100%', border: '2px solid #11575C', borderRadius: '12px', padding: '25px', textAlign: 'center', position: 'relative', background: '#f0fdfa' };
const planTitle = { fontSize: '18px', fontWeight: '700', color: '#334155' };
const planPrice = { fontSize: '28px', fontWeight: '800', color: '#11575C', margin: '10px 0' };
const planList = { listStyle: 'none', padding: 0, textAlign: 'left', fontSize: '13px', color: '#64748b', lineHeight: '2.2', marginBottom: '20px' };
const badge = { position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#11575C', color: 'white', fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' };
const fileUploadBox = { border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#f8fafc', gap: '10px' };

const stepIndicator = { display: 'flex', alignItems: 'center', gap: '8px' };
const stepDot = { width: '25px', height: '25px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#11575C' };

// Animation
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(styleSheet);
}

export default IndependentAgentRegistration;

