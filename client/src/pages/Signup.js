import React, { useState } from 'react';
import api from '../config/api';
import { contactPublicFetch } from '../utils/contactPublicFetch';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';

const Signup = () => {
    const isMobile = useIsMobile();
    const location = useLocation();
    // --- State Management ---
    // Steps: 'account-type' -> 'role-selection' -> 'landlord-type' (if Landlord) -> 'contact-enquiry' (Seller / rent out) -> 'agent-type' -> 'form'
    const [step, setStep] = useState(location.state?.step || 'account-type'); 
    const [role] = useState(''); // Role is set via navigation state, not state setter 
    
    // Form Data
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptPrivacy, setAcceptPrivacy] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Modal State
    const [showAgencyWarning, setShowAgencyWarning] = useState(false);
    // Contact step (Seller / Landlord rental – inline step, no popup)
    const [contactStepConfig, setContactStepConfig] = useState({ title: '', enquiryType: '', backStep: 'role-selection' });
    const [contactFormData, setContactFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', message: '' });
    const [contactLoading, setContactLoading] = useState(false);
    
    const navigate = useNavigate();

    // --- HANDLERS ---

    // Step 1: Account Type (Individual vs Agency vs Partner)
    const handleAccountType = (type) => {
        if (type === 'agency') {
            navigate('/agency-signup');
        } else if (type === 'enterprise') {
            navigate('/enterprise-signup');
        } else if (type === 'partner') {
            navigate('/partner-signup');
        } else {
            setStep('role-selection'); // Go to User Role Grid
        }
    };

    // Step 2: Role Selection
    const handleRoleSelect = (selectedRole) => {
        if (selectedRole === 'seller') {
            setContactStepConfig({ title: 'Get in touch with us to register as a seller', enquiryType: 'Seller Registration', backStep: 'role-selection' });
            setStep('contact-enquiry');
            return;
        }
        if (selectedRole === 'landlord') {
            setStep('landlord-type');
            return;
        }
        if (selectedRole === 'agent') {
            setStep('agent-type'); // Agent needs one more step
        } else {
            navigate('/client-signup', { state: { role: selectedRole } });
        }
    };

    // Landlord sub-options
    const handleLandlordOption = (option) => {
        if (option === 'manage_occupied') {
            navigate('/client-signup', { state: { role: 'seller', fromLandlordRental: true } });
        } else {
            setContactStepConfig({ title: 'Get in touch with us to register your Property for Rental', enquiryType: 'New Rental Registration', backStep: 'landlord-type' });
            setStep('contact-enquiry');
        }
    };

    const handleContactFormChange = (e) => {
        setContactFormData({ ...contactFormData, [e.target.name]: e.target.value });
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setContactLoading(true);
        try {
            await contactPublicFetch.postInquiry({
                firstName: contactFormData.firstName,
                lastName: contactFormData.lastName,
                email: contactFormData.email,
                phone: contactFormData.phone,
                message: contactFormData.message,
                enquiryType: contactStepConfig.enquiryType
            });
            setContactFormData({ firstName: '', lastName: '', email: '', phone: '', message: '' });
            alert('Thank you. We\'ll be in touch soon.');
            setStep(contactStepConfig.backStep);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setContactLoading(false);
        }
    };

    // Step 3: Agent Type
    const handleAgentType = (type) => {
        if (type === 'independent_agent') {
            navigate('/independent-agent-signup'); // ✅ Redirect Sole Agents to new wizard
        } else {
            // 'agency_agent' - Show invite message immediately (no form steps)
            setShowAgencyWarning(true);
        }
    };

    // Step 4: Final Submission (This should not be reached for agency_agent anymore)
    const handleSignup = async (e) => {
        e.preventDefault();
        if (!acceptTerms || !acceptPrivacy) {
            alert('Please accept both the Terms of Service and Privacy Policy to continue.');
            return;
        }
        setLoading(true);
        try {
            // REGISTER the new user
            await api.post('/api/auth/register', {
                name, email, password, role 
            });

            // AUTO-LOGIN
            const loginRes = await api.post('/api/auth/login', { 
                email, password 
            });

            localStorage.setItem('user', JSON.stringify(loginRes.data));
            alert(`✅ Welcome to IPM, ${name}!`);
            window.location.href = '/'; 

        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Registration failed. Email might be taken.");
            setLoading(false);
        }
    };

    // Handle "Understood" Click
    const handleUnderstood = () => {
        navigate('/login'); // Redirect them to login (or home)
    };

    // --- RENDER SCREENS ---

    // 1. Initial Screen: Individual vs Agency
    const renderAccountType = () => (
        <div style={contentFadeIn}>
            <div style={{marginBottom: '30px'}}>
                <h2 style={headingStyle}>How would you like to sign up?</h2>
                <p style={subHeadingStyle}>Choose your account type</p>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <SelectionCard 
                    title="Individual Account" 
                    subtitle="Buyer, Seller, Investor, Tenant, Agent, or Landlord"
                    onClick={() => handleAccountType('individual')}
                />
                <SelectionCard 
                    title="Agency Account" 
                    subtitle="Register your real estate agency"
                    onClick={() => handleAccountType('agency')}
                />
                <SelectionCard 
                    title="Enterprise Account" 
                    subtitle="Manage multiple agencies and branches"
                    onClick={() => handleAccountType('enterprise')}
                />
                <SelectionCard 
                    title="Partner" 
                    subtitle="Advertise and partner with us"
                    onClick={() => handleAccountType('partner')}
                />
            </div>
        </div>
    );

    // 2. Role Grid: Buyer, Seller, Investor, Agent
    const renderRoleSelection = () => (
        <div style={contentFadeIn}>
            <div style={{marginBottom: '30px'}}>
                <h2 style={headingStyle}>What describes you?</h2>
                <p style={subHeadingStyle}>Choose your account type</p>
            </div>
            <div style={gridContainer}>
                <RoleCard label="Buyer" onClick={() => handleRoleSelect('buyer')} />
                <RoleCard label="Seller" onClick={() => handleRoleSelect('seller')} />
                <RoleCard label="Investor" onClick={() => handleRoleSelect('investor')} />
                <RoleCard label="Tenant" onClick={() => handleRoleSelect('tenant')} />
                <RoleCard label="Agent" onClick={() => handleRoleSelect('agent')} />
                <RoleCard label="Landlord" onClick={() => handleRoleSelect('landlord')} />
            </div>
            <button style={backLink} onClick={() => setStep('account-type')}>
                <i className="fas fa-arrow-left"></i> Back
            </button>
        </div>
    );

    // 2b. Landlord sub-options
    const renderLandlordType = () => (
        <div style={contentFadeIn}>
            <div style={{marginBottom: '30px'}}>
                <h2 style={headingStyle}>What describes you?</h2>
                <p style={subHeadingStyle}>Choose your landlord option</p>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <SelectionCard 
                    title="Manage an existing occupied Property" 
                    subtitle="Sign up to load and manage your existing rentals"
                    onClick={() => handleLandlordOption('manage_occupied')}
                />
                <SelectionCard 
                    title="I want to rent out my property" 
                    subtitle="Get in touch to register your property for rental"
                    onClick={() => handleLandlordOption('rent_out')}
                />
            </div>
            <button style={backLink} onClick={() => setStep('role-selection')}>
                <i className="fas fa-arrow-left"></i> Back
            </button>
        </div>
    );

    // 2c. Contact step (Seller / New Rental – same format as Create Seller Account)
    const renderContactEnquiryStep = () => (
        <div style={enquiryStepContainer}>
            <button type="button" style={enquiryBackBtn} onClick={() => setStep(contactStepConfig.backStep)}>
                <i className="fas fa-arrow-left"></i> Back to change account type
            </button>
            <div style={enquiryIconCircle}><i className="fas fa-envelope"></i></div>
            <h2 style={enquiryTitle}>{contactStepConfig.title}</h2>
            <p style={enquirySubText}>We’ll get back to you shortly.</p>
            <form onSubmit={handleContactSubmit} style={{ width: '100%' }}>
                <div style={enquiryInputGroup}>
                    <label style={enquiryLabelStyle}>First Name</label>
                    <input type="text" name="firstName" placeholder="First Name" required style={enquiryInputStyle} value={contactFormData.firstName} onChange={handleContactFormChange} />
                </div>
                <div style={enquiryInputGroup}>
                    <label style={enquiryLabelStyle}>Last Name</label>
                    <input type="text" name="lastName" placeholder="Last Name" required style={enquiryInputStyle} value={contactFormData.lastName} onChange={handleContactFormChange} />
                </div>
                <div style={enquiryInputGroup}>
                    <label style={enquiryLabelStyle}>Email</label>
                    <input type="email" name="email" placeholder="you@example.com" required style={enquiryInputStyle} value={contactFormData.email} onChange={handleContactFormChange} />
                </div>
                <div style={enquiryInputGroup}>
                    <label style={enquiryLabelStyle}>Phone</label>
                    <input type="text" name="phone" placeholder="Phone" style={enquiryInputStyle} value={contactFormData.phone} onChange={handleContactFormChange} />
                </div>
                <div style={enquiryInputGroup}>
                    <label style={enquiryLabelStyle}>Message</label>
                    <textarea name="message" placeholder="What can we help you with?" required style={{ ...enquiryInputStyle, minHeight: '100px', resize: 'vertical' }} value={contactFormData.message} onChange={handleContactFormChange} />
                </div>
                <button type="submit" style={enquiryBtnPrimary} disabled={contactLoading}>
                    {contactLoading ? 'Sending...' : 'Submit'}
                </button>
            </form>
            <button type="button" style={enquiryBackBtn} onClick={() => setStep(contactStepConfig.backStep)}>
                <i className="fas fa-arrow-left"></i> Back
            </button>
        </div>
    );

    // 3. Agent Specific: Sole vs Linked
    const renderAgentType = () => (
        <div style={contentFadeIn}>
            <div style={{marginBottom: '30px'}}>
                <h2 style={headingStyle}>How do you operate?</h2>
                <p style={subHeadingStyle}>Are you independent or part of an agency?</p>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <SelectionCard 
                    title="Sole Agent" 
                    subtitle="You operate independently with your own subscription"
                    onClick={() => handleAgentType('independent_agent')}
                />
                <SelectionCard 
                    title="Linked with an Agency" 
                    subtitle="You work for an agency"
                    onClick={() => handleAgentType('agency_agent')}
                />
            </div>
            <button style={backLink} onClick={() => setStep('role-selection')}>
                <i className="fas fa-arrow-left"></i> Back
            </button>
        </div>
    );

    // 4. Final Form (Not used for agency_agent anymore)
    const renderForm = () => (
        <div style={contentFadeIn}>
             <div style={{marginBottom: '20px'}}>
                <h2 style={headingStyle}>Create Account</h2>
                <p style={subHeadingStyle}>
                    Signing up as: <strong style={{color: '#11575C'}}>{formatRole(role)}</strong>
                </p>
            </div>

            <form onSubmit={handleSignup}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px'}}>
                    <div style={inputGroup}>
                        <i className="fas fa-user" style={iconStyle}></i>
                        <input type="text" placeholder="Full Name" required style={inputStyle} value={name} onChange={e=>setName(e.target.value)} />
                    </div>
                    <div style={inputGroup}>
                        <i className="fas fa-envelope" style={iconStyle}></i>
                        <input type="email" placeholder="Email Address" required style={inputStyle} value={email} onChange={e=>setEmail(e.target.value)} />
                    </div>
                    <div style={inputGroup}>
                        <i className="fas fa-lock" style={iconStyle}></i>
                        <input type="password" placeholder="Password" required style={inputStyle} value={password} onChange={e=>setPassword(e.target.value)} />
                    </div>
                </div>

                <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={consentLabelStyle}>
                        <input
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            style={consentCheckboxStyle}
                        />
                        <span>
                            I accept the <Link to="/legal" style={consentLinkStyle}>Terms of Service</Link>.
                        </span>
                    </label>
                    <label style={consentLabelStyle}>
                        <input
                            type="checkbox"
                            checked={acceptPrivacy}
                            onChange={(e) => setAcceptPrivacy(e.target.checked)}
                            style={consentCheckboxStyle}
                        />
                        <span>
                            I accept the <Link to="/privacy" style={consentLinkStyle}>Privacy Policy</Link>.
                        </span>
                    </label>
                </div>

                <button
                    type="submit"
                    style={{
                        ...btnStyle,
                        opacity: loading || !acceptTerms || !acceptPrivacy ? 0.65 : 1,
                        cursor: loading || !acceptTerms || !acceptPrivacy ? 'not-allowed' : 'pointer',
                    }}
                    disabled={loading || !acceptTerms || !acceptPrivacy}
                >
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
            </form>
            
            <button style={backLink} onClick={() => setStep(role.includes('agent') ? 'agent-type' : 'role-selection')}>
                <i className="fas fa-arrow-left"></i> Change Role
            </button>
        </div>
    );

    return (
        <div style={pageContainer}>
            {/* Left Side: Visuals */}
            <div className="auth-visual-side" style={{ ...visualSide, display: isMobile ? 'none' : 'flex' }}>
                <div style={overlay}>
                    <h1 style={{fontSize: '3em', marginBottom: '10px'}}>Join the Network.</h1>
                    <p style={{fontSize: '1.2em', opacity: 0.9}}>Connect with global opportunities in the premium real estate market.</p>
                </div>
            </div>

            {/* Right Side: Form Content */}
            <div className="auth-form-side" style={formSide}>
                <div style={topActions}>
                    <Link to="/" className="btn-outline" style={topButtonStyle}>
                        <i className="fas fa-home"></i> Back to Home
                    </Link>
                </div>
                <div style={formWrapper}>
                    {/* Render the current step */}
                    {step === 'account-type' && renderAccountType()}
                    {step === 'role-selection' && renderRoleSelection()}
                    {step === 'landlord-type' && renderLandlordType()}
                    {step === 'contact-enquiry' && renderContactEnquiryStep()}
                    {step === 'agent-type' && renderAgentType()}
                    {step === 'form' && renderForm()}

                    {step !== 'form' && (
                        <p style={{textAlign: 'center', marginTop: '30px', color: '#64748b', fontSize: '0.9rem'}}>
                            Already a member? <Link to="/login" style={linkStyle}>Sign In</Link>
                            {' · '}
                            <Link to="/forgot-password" style={linkStyle}>Forgot password?</Link>
                        </p>
                    )}
                </div>
            </div>

            {/* --- 5. AGENCY REGISTRATION WARNING MODAL --- */}
            {showAgencyWarning && (
                <div style={modalOverlay}>
                    <div style={modalCard}>
                        {/* Close Icon (X) - Optional */}
                        <div style={{position: 'absolute', top: '15px', right: '15px', cursor: 'pointer', color: '#94a3b8'}} onClick={handleUnderstood}>
                            <i className="fas fa-times"></i>
                        </div>

                        {/* Icon */}
                        <div style={infoIconCircle}>
                            <i className="fas fa-info" style={{color: 'white', fontSize: '24px'}}></i>
                        </div>

                        <h2 style={{fontSize: '22px', fontWeight: '700', color: '#1e293b', marginBottom: '10px'}}>
                            Agency Registration
                        </h2>
                        
                        <p style={{color: '#64748b', fontSize: '15px', lineHeight: '1.5', marginBottom: '20px'}}>
                            To join as an agency agent, your agency must invite you. Ask your agency administrator to send you an invite—you’ll receive an email with a link or a PIN to complete registration.
                        </p>

                        <button
                            onClick={() => { setShowAgencyWarning(false); navigate('/agency-agent-invite'); }}
                            style={{ ...understoodBtn, marginBottom: '12px' }}
                        >
                            I have a PIN to register
                        </button>
                        <button onClick={handleUnderstood} style={{ ...understoodBtn, background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' }}>
                            Understood
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

// --- HELPER COMPONENTS ---

const SelectionCard = ({ title, subtitle, onClick }) => (
    <div onClick={onClick} style={selectionCardStyle} className="hover-card">
        <div style={{fontWeight: '700', fontSize: '16px', color: '#1e293b', marginBottom: '5px'}}>{title}</div>
        <div style={{fontSize: '13px', color: '#64748b'}}>{subtitle}</div>
    </div>
);

const RoleCard = ({ label, isDark, onClick, style }) => (
    <div onClick={onClick} style={{
        ...roleCardStyle,
        background: isDark ? '#a8a29e' : '#f8fafc',
        color: isDark ? '#fff' : '#334155',
        border: isDark ? 'none' : '1px solid #e2e8f0',
        ...style
    }} className="hover-card">
        {label}
    </div>
);

const formatRole = (r) => {
    if (!r) return '';
    if (r === 'independent_agent') return 'Sole Agent';
    if (r === 'agency_agent') return 'Agency Agent';
    if (r === 'tenant') return 'Tenant';
    return r.charAt(0).toUpperCase() + r.slice(1);
};

// --- STYLES ---
const pageContainer = { display: 'flex', height: '100vh', width: '100%', fontFamily: "'Poppins', sans-serif" };
const visualSide = { flex: 1, background: "url('/site-assets/signup-left/signup.jpg') center/cover no-repeat", position: 'relative' }; 
const overlay = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.4))', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: 'white' };
const formSide = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff', position: 'relative' };
const formWrapper = { width: '100%', maxWidth: '500px', padding: '40px' };
const topActions = { position: 'absolute', top: '30px', right: '40px' };
const topButtonStyle = { display: 'flex', alignItems: 'center', gap: '8px', color: '#11575C', border: '1px solid #11575C' };

const headingStyle = { fontSize: '28px', color: '#0f172a', marginBottom: '8px', fontWeight: '800' };
const subHeadingStyle = { color: '#64748b', fontSize: '15px' };
const contentFadeIn = { animation: 'fadeIn 0.4s ease' };

// Cards
const selectionCardStyle = {
    padding: '24px', borderRadius: '16px', background: '#f9fafb', 
    border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease',
    display: 'flex', flexDirection: 'column', justifyContent: 'center'
};

const gridContainer = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' };
const roleCardStyle = { 
    padding: '36px 24px', minHeight: '64px', borderRadius: '12px', cursor: 'pointer', 
    fontWeight: '700', textAlign: 'center', fontSize: '17px', transition: 'all 0.2s ease',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
};

// Form Inputs
const inputGroup = { position: 'relative' };
const iconStyle = { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' };
const inputStyle = { width: '100%', padding: '14px 14px 14px 45px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', transition: 'border 0.2s' };
const btnStyle = { width: '100%', padding: '16px', background: '#11575C', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' };
const consentLabelStyle = { display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#475569', fontSize: '13px', lineHeight: 1.45 };
const consentCheckboxStyle = { marginTop: '2px', accentColor: '#11575C', flexShrink: 0 };
const consentLinkStyle = { color: '#11575C', fontWeight: 600, textDecoration: 'underline' };

const linkStyle = { color: '#11575C', fontWeight: 'bold', textDecoration: 'none' };
const backLink = { background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', padding: 0 };

// --- Enquiry step (same format as Create Seller Account) ---
const enquiryStepContainer = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'fadeIn 0.5s ease', width: '100%' };
const enquiryBackBtn = { background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', marginTop: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start', padding: 0 };
const enquiryIconCircle = { width: '60px', height: '60px', background: '#f0fdfa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#11575C', marginBottom: '15px' };
const enquiryTitle = { fontSize: '28px', color: '#0f172a', marginBottom: '8px', fontWeight: '800' };
const enquirySubText = { color: '#64748b', marginBottom: '20px' };
const enquiryInputGroup = { width: '100%', textAlign: 'left', marginBottom: '15px' };
const enquiryLabelStyle = { fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '5px' };
const enquiryInputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' };
const enquiryBtnPrimary = { width: '100%', padding: '14px', background: '#11575C', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', transition: '0.2s' };

// --- MODAL STYLES ---
const modalOverlay = {
    position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.95)', 
    backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50,
    animation: 'fadeIn 0.3s ease'
};
const modalCard = {
    background: 'white', width: '90%', maxWidth: '400px', borderRadius: '24px', padding: '40px 30px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)', textAlign: 'center', position: 'relative', border: '1px solid #f1f5f9'
};
const infoIconCircle = {
    width: '60px', height: '60px', borderRadius: '50%', background: '#11575C',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
    boxShadow: '0 4px 12px rgba(17, 87, 92, 0.25)'
};
const understoodBtn = {
    background: '#11575C', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    transition: 'background 0.2s'
};

const contactModalCard = {
    background: 'white', width: '90%', maxWidth: '440px', borderRadius: '24px', padding: '32px 28px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)', position: 'relative', border: '1px solid #f1f5f9'
};
const contactInputStyle = {
    flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px',
    outline: 'none', transition: 'border 0.2s', fontFamily: 'inherit'
};

// Inject Animations & Hover Styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hover-card:hover { border-color: #11575C !important; background: #f0fdfa !important; transform: translateY(-2px); }
    `;
    document.head.appendChild(styleSheet);
}

export default Signup;