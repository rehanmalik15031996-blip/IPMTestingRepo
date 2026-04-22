import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../config/api';
import { showNotification } from '../components/NotificationManager';
import { useIsMobile } from '../hooks/useMediaQuery';
import GooglePlacesInput from '../components/GooglePlacesInput';
import { termsParagraphStyle } from '../content/legalContent';

// Static options for preference step (no API fetch)
const PREFERENCE_COUNTRIES = [
    'South Africa',
    'United Kingdom',
    'United States',
    'Netherlands',
    'Germany',
    'United Arab Emirates',
    'Spain'
];
const PREFERENCE_PROPERTY_TYPES = [
    'Residential',
    'Commercial',
    'Retail',
    'Industrial',
    'Auction',
    'Land',
    'Office',
    'Agricultural'
];
// Preference grid: pool of all images in site-assets/preference-grid/. Each time the grid is shown we randomly pick 9 without replacement.
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const PREFERENCE_IMAGES_POOL = ['1.jpg', '2.jpg', '3.png', '4.jpg', '5.jpg', '6.png', '7.png', '8.png', '9.png', '10.png', '11.png', '12.png', '13.png', '14.png', '15.png'].map((f) => `${PUBLIC_URL}/site-assets/preference-grid/${f}`);
const PREFERENCE_SELECT_COUNT = 5; // user must choose this many

// Single source for all preference tile images (interior + exterior). Exactly 12 items for buyer/tenant step.
// Use Unsplash URLs so all 12 load reliably (no dependency on local public/interior|exterior folders).
const PREFERENCE_TILE_IMAGES = [
    // interior (client/public/interior) – kept for reference; buyer/tenant grid uses buildBuyerPreferencePool() from PREFERENCE_IMAGES_POOL
    { folder: 'interior', filename: 'Desert Modern (The Earthy Boho) The Vibe_ Soft, tactile, and warm. Inspired by high-end retreats in places like Ibiza or Joshua Tree. AI Metadata Tags_ Plaster walls, Arched doorways, Terracotta tiles, Jute rugs, Bouc.png' },
    { folder: 'interior', filename: 'Industrial Loft (The Urban Executive) The Vibe_ Raw, architectural, and moody. Typical of converted warehouse penthouses. AI Metadata Tags_ Exposed brick, Polished concrete, Steel beams, Crittall glass doors, Leather,.png' },
    { folder: 'interior', filename: 'Japandi (The Zen Minimalist) The Vibe_ A blend of Scandinavian functionality and Japanese rustic minimalism. AI Metadata Tags_ Light Oak, Matte Black accents, Low-profile furniture, Slatted wood panels, Paper lanterns.png' },
    { folder: 'interior', filename: 'Maximalist Glamour (The Status Statement) The Vibe_ Bold, expressive, and luxurious. For the buyer who wants a home that feels like a boutique hotel. AI Metadata Tags_ Gold_Brass hardware, Patterned wallpaper, Jewel t.png' },
    { folder: 'interior', filename: 'Modern Heritage (The Timeless Classic) The Vibe_ Respecting historical architecture while layering in contemporary, high-end furniture. AI Metadata Tags_ Wall molding, Herringbone floors, Marble fireplaces, Velvet uph.png' },
    { folder: 'interior', filename: 'Scandinavian (The Airy Family Home) The Vibe_ Maximum light and _Hygge_ (coziness). This is the global standard for modern residential living. AI Metadata Tags_ Bright white walls, Sheepskin, Pale wood, Minimal window.png' },
    // exterior (client/public/exterior) – 6 items to total 12
    { folder: 'exterior', filename: 'Adaptive Reuse _ Industrial (The Urban Loft) The Vibe_ Authentic, historic, and edgy. Perfect for buyers looking for converted city spaces. AI Metadata Tags_ Exposed brickwork, Large factory-style windows, Fire escape.png' },
    { folder: 'exterior', filename: 'Beachfront (The Coastal Escape)_ Focus on wide windows, white sand, and turquoise water.  AI Metadata_ Ocean view, Infinity pool, Large decks, Coastal architecture..png' },
    { folder: 'exterior', filename: 'Classic Traditional (The Timeless Estate) The Vibe_ Stately, symmetrical, and solid. Appeals to buyers looking for permanent family _anchor_ homes. AI Metadata Tags_ Stone masonry, Symmetrical facade, Shingle roofs, D.png' },
    { folder: 'exterior', filename: 'Countryside (The Rural Retreat)_ Focus on greenery, space, and peace.  AI Metadata_ Rolling hills, Large acreage, Private driveway, Pastoral views..png' },
    { folder: 'exterior', filename: 'Modern Contemporary (The Ultra-Luxury).jpeg' },
    { folder: 'exterior', filename: 'Modern Farmhouse (The New Suburban) The Vibe_ A clean, updated take on country living. Extremely popular in current residential developments. AI Metadata Tags_ Gabled roofs, White vertical siding, Black window frames,.png' }
];
const BUYER_VIDEO_FILES = [
    'Calm Interiors.mp4',
    'Cinematic Global Journey.mp4',
    'Cinematic Residential Spaces.mp4',
    'City Apartments.mp4',
    'City Drone footage.mp4',
    'Classical City.mp4',
    'Exterior Architecture.mp4',
    'grok-video-1ec2ea96-a25b-4fb0-91a7-00ded764438f (1).mp4',
    'Interior Mood.mp4',
    'Interior Shot.mp4',
    'Minimalist Interior.mp4',
    'Simple Interior.mp4'
];
const assetUrl = (folder, filename) => `${PUBLIC_URL}/${folder}/${encodeURIComponent(filename)}`;

// Shuffle full pool and show all 15 for preference step (user picks 5)
const buildBuyerPreferencePool = () => {
    const shuffled = [...PREFERENCE_IMAGES_POOL];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.map((url) => ({ id: url, url }));
};

// termsParagraphStyle is imported from ../content/legalContent (used below). TermsOfServiceContent and PRIVACY_POLICY_CONTENT are defined locally for registration modals.

// Terms of Service (Individuals) – local copy kept for registration modals (shared content used in Footer) – "Privacy Policy" is a clickable link (yellow highlight)
const TermsOfServiceContent = ({ onOpenPrivacy }) => (
    <div style={termsParagraphStyle}>
        <p><strong>TERMS OF SERVICE – International Property Market Platform</strong></p>
        <p><strong>Introduction.</strong> International Property Market B.V., registered with the Dutch Trade Register under number 98220136, (“IPM”) offers an online platform for real estate owners, buyers, tenants, investors, brokers, agents and service providers (the “Platform”). These terms (the “Terms”) govern your access to, and use of, the Platform and the services offered throughout the Platform. Please read these Terms carefully. If you do not agree to these Terms, do not use the Platform.</p>
        <p>By creating an account, accessing, or using the Platform, you ("User" or "you") acknowledge that you have read, understood, and agree to be bound by these Terms, our <button type="button" onClick={onOpenPrivacy} style={{ background: 'rgba(255, 200, 1, 0.35)', border: 'none', padding: '0 2px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600', color: '#1e293b' }}>Privacy Policy</button>, and any additional terms and conditions that may apply to specific features of the Platform and services offered. If you are using the Platform on behalf of a company, you represent that you have the authority to bind such company to these terms. To use the Platform, you must: be at least 18 years of age; have the legal capacity to enter into binding contracts; and comply with all applicable laws and regulations.</p>
        <p><strong>Account registration.</strong> You must create an account to access certain features of the Platform available to property owners and property buyers and tenants. You agree to provide accurate, complete, and current information during registration and to update such information to keep it accurate and current. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account or any other breach of security. We are not liable for any loss or damage arising from your failure to protect your account credentials. We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason, including but not limited to violation of these Terms, fraudulent activity, or provision of false information.</p>
        <p><strong>Services.</strong> The Platform provides a comprehensive suite of services for real estate owners as well as buyers and tenants, subject to your applicable subscription as set forth on our subscription page. We reserve the right to modify, suspend, or discontinue any aspect of the Platform or any specific service at any time, with or without notice. Different services and features may be available based on your subscription tier. We are not liable to you or any third party for any modification, suspension, or discontinuance of a service. Certain of our services may be subject to specific terms and conditions as stated, which are deemed accepted by using the services.</p>
        <p>Leads provided to you through the Platform are provided on an as-available basis. We do not guarantee the quality, quantity, or conversion rate of any leads. You must respect the privacy rights of individuals and obtain appropriate consent for communications. You may not resell, redistribute, or share leads with third parties without our express written consent. We are not responsible for the accuracy of lead information or whether leads result in actual transactions.</p>
        <p>Some of our services utilize AI systems. Our AI systems are designed with appropriate human oversight and risk mitigation measures. However, AI-generated content may contain inaccuracies and should be verified before use. You maintain sole responsibility for decisions made based on AI outputs or AI guidance. AI guidance should not replace consultation with qualified professionals such as attorneys, accountants, or licensed appraisers. AI-powered property recommendations are based on algorithms and data that may not be complete, accurate, or current. You must conduct your own due diligence on all properties, including inspections, appraisals and title searches through consultation with real estate professionals, including those on our Platform. Property information, pricing, availability, and descriptions may change without notice and should be independently verified. We do not guarantee that recommended properties will be available, accurately described, or suitable for purchase or investment. We are not a party to any real estate transactions and do not act as an agent, broker, or representative.</p>
        <p><strong>Subscription plans and service tiers.</strong> The Platform offers various subscription plans with different features, usage limits, and pricing. The specific services, features, and limitations applicable to each subscription tier are set forth on our subscription page. By subscribing to a particular plan, you agree to the terms, limitations, and pricing associated with that plan. We reserve the right to modify subscription plans, features, and pricing with reasonable notice to existing subscribers.</p>
        <p><strong>User responsibilities and prohibited conduct.</strong> You agree to comply with all applicable laws, regulations, and industry standards. You represent and warrant that all information you provide through the Platform is accurate, current, complete, and not misleading. You must have proper authorization to list any property on the Platform and possess all necessary rights to use any content you upload. You acknowledge and agree that: you are solely responsible for all investment and/or purchase decisions you make; you understand the risks associated with real estate investment, including potential losses; you will conduct appropriate due diligence before making any real estate purchase or investment; you will consult with qualified professionals as appropriate; and the Platform's services are tools to assist you, but do not replace professional advice or your own judgment.</p>
        <p>You agree not to: post false, inaccurate, misleading, defamatory, or fraudulent information; upload content that infringes intellectual property rights of others; use the Platform for any illegal or unauthorized purpose; resell, redistribute, or share leads, off-market listings, or proprietary data with third parties; breach confidentiality obligations; attempt to gain unauthorized access to the Platform or other user accounts; interfere with or disrupt the Platform; use automated systems to extract data beyond authorized use; transmit viruses or harmful code; harass, abuse, or harm other users; or impersonate any person or entity. You may not copy, modify, translate, publish, broadcast, or display any data from the Platform; reverse engineer or create derivative works of the Platform; or crawl, scrape or cache any content from the Platform.</p>
        <p><strong>Content and intellectual property.</strong> You retain all ownership rights to the content you submit to the Platform. By uploading User Content, you grant us a worldwide, non-exclusive, royalty-free, transferable, sublicensable license to use, reproduce, modify, adapt, publish, display, and distribute such content in connection with operating and promoting the Platform. The Platform, including its design, features, functionality, APIs, AI algorithms, and all content not submitted by users, is owned by us or our licensors and is protected by copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Platform without our express written permission.</p>
        <p><strong>Privacy and Data Protection.</strong> Your use of the Platform is subject to our <button type="button" onClick={onOpenPrivacy} style={{ background: 'rgba(255, 200, 1, 0.35)', border: 'none', padding: '0 2px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600', color: '#1e293b' }}>Privacy Policy</button>. By using the Platform, you consent to our collection and use of your information as described in the Privacy Policy. You may provide sensitive financial information; we implement commercially reasonable security measures, but no system is completely secure. You are responsible for determining what information you share and for implementing appropriate security practices.</p>
        <p><strong>Fees and payment.</strong> Access to our services requires payment of subscription fees according to the plan you select. Payment is due in accordance with your billing cycle. You authorize us to charge your designated payment method. Subscriptions automatically renew unless you cancel. All fees are non-refundable unless otherwise stated or required by law. Fees are exclusive of applicable taxes. We reserve the right to change fees with reasonable notice.</p>
        <p><strong>Disclaimers &amp; liability.</strong> The Platform and all services are provided "as is" and "as available" without warranties of any kind. We do not warrant that the Platform will be uninterrupted, error-free, or secure. The Platform does not provide legal, financial, tax, or professional real estate advice. We are not responsible for the accuracy of user content, third-party content, property listings, or market data. Real estate investments involve substantial risks. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.</p>
        <p><strong>Indemnification.</strong> You agree to indemnify, defend, and hold harmless IPM, its affiliates, officers, directors, employees and licensors from and against any claims, liabilities, damages, losses, costs, or expenses arising from your use of the Platform, your User Content, your investment decisions, your violation of these Terms, or your violation of any rights of third parties or applicable laws.</p>
        <p><strong>Termination.</strong> You may terminate your account at any time. We may suspend or terminate your account at any time, with or without cause. Upon termination, all licenses cease, you lose access to services, and we may delete your data in accordance with our policies. Provisions that by their nature should survive termination shall survive.</p>
        <p><strong>Miscellaneous.</strong> These terms may be revised by IPM at any time; you will be notified when you next login. You cannot transfer your rights or obligations without our prior written consent. Dutch law applies. Any dispute shall be submitted to the competent court in Amsterdam, the Netherlands.</p>
        <p>Contact: enquiries@internationalpropertymarket.com</p>
    </div>
);

// General Terms of Use – from IPM document (also references Privacy Policy)
const GENERAL_TERMS_CONTENT = (
    <div style={termsParagraphStyle}>
        <p><strong>GENERAL TERMS OF USE – International Property Market Platform</strong></p>
        <p><strong>Introduction.</strong> International Property Market B.V. (“IPM”) offers an online platform for real estate owners, buyers, tenants, investors, brokers, agents and service providers (the “Platform”). These terms (the “Terms”) govern your access to, and use of, the Platform and the services offered throughout the Platform. Please read these Terms carefully. If you do not agree to these Terms, do not use the Platform.</p>
        <p>By accessing or using the Platform, you ("User" or "you") acknowledge that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, and any additional terms and conditions that may apply to specific features of the Platform and services offered. To use the Platform, you must be at least 18 years of age. Users must create an account to access certain features of the Platform, depending on subscription plan, set forth on our subscription page. By subscribing to a particular plan, you agree to the terms, limitations, and pricing associated with that plan. We reserve the right to modify subscription plans, features, and pricing with reasonable notice to existing subscribers.</p>
        <p><strong>User responsibilities and prohibited conduct.</strong> Users shall maintain professional standards in all interactions through the Platform. Users shall not: use the Platform for any illegal or unauthorized purpose; resell or redistribute any data from the Platform with third parties; attempt to gain unauthorized access to the Platform, APIs, or other user accounts; interfere with or disrupt the Platform or servers; use automated systems to extract data beyond authorized API usage; exceed API rate limits or abuse API access; transmit viruses, malware, or other harmful code; harass, abuse, spam, or harm other users; copy, modify, translate, publish, broadcast, or display any data from the Platform; reverse engineer or create derivative works of the Platform; or crawl, scrape or cache any content from the Platform.</p>
        <p><strong>Intellectual property.</strong> The Platform, including its design, features, functionality, APIs, market data, algorithms, and all content, is owned by us, our licensors or our users and is protected by copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Platform without our express written permission. If you believe that content on the Platform infringes your copyright, please contact us at enquiries@internationalpropertymarket.com.</p>
        <p><strong>Privacy and Data Protection.</strong> Your use of the Platform is subject to our Privacy Policy, which describes how we collect, use, and protect your personal information. By using the Platform, you consent to our collection and use of your information as described in the Privacy Policy.</p>
        <p><strong>Liability.</strong> The Platform and all services are provided "as is" and "as available" without warranties of any kind. To the maximum extent permitted by law, we shall not be liable for any damage as a result of your use of the Platform.</p>
        <p><strong>Indemnification.</strong> Users agree to indemnify, defend, and hold harmless IPM, its affiliates, officers, directors, employees and licensors from and against any claims, liabilities, damages, losses, costs, or expenses arising from your use of the Platform; your violation of these Terms; your violation of any rights of third parties; or your violation of any applicable laws or regulations.</p>
        <p><strong>Miscellaneous.</strong> These terms may be revised by IPM at any time. You cannot transfer your rights or obligations without our prior written consent. Dutch law applies. Any dispute shall be submitted to the competent court in Amsterdam, the Netherlands.</p>
        <p>Contact: enquiries@internationalpropertymarket.com</p>
    </div>
);

// Privacy Policy (referenced in both ToS and General Terms)
const PRIVACY_POLICY_CONTENT = (
    <div style={termsParagraphStyle}>
        <p><strong>PRIVACY POLICY – International Property Market</strong></p>
        <p>Your use of the Platform is subject to this Privacy Policy. International Property Market B.V. (“IPM”) collects, uses, and protects your personal information in connection with the Platform and the services offered.</p>
        <p>By using the Platform, you consent to our collection and use of your information as described herein. We may collect information you provide (e.g. account registration, profile, property data, preferences), usage data, device information, and cookies. We use this information to operate and improve the Platform, to provide and personalize services, to communicate with you, and to comply with legal obligations.</p>
        <p>We implement commercially reasonable security measures to protect your data. No system is completely secure; you are responsible for maintaining the confidentiality of your account credentials and for implementing appropriate security practices. We may share information with service providers, affiliates, or as required by law. We do not sell your personal information to third parties for their marketing purposes.</p>
        <p>You may have rights to access, correct, delete, or port your data depending on your jurisdiction. To exercise these rights or for any privacy-related questions, contact us at enquiries@internationalpropertymarket.com.</p>
        <p>We may update this Privacy Policy from time to time; we will notify you of material changes. Continued use of the Platform after changes constitutes acceptance of the updated Privacy Policy.</p>
        <p>Contact: enquiries@internationalpropertymarket.com</p>
    </div>
);

const ClientRegistration = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    
    const role = location.state?.role || 'buyer';
    const fromLandlordRental = !!location.state?.fromLandlordRental; 

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Form Data State
    const [formData, setFormData] = useState({
        email: '',
        otp: '',
        password: '',
        plan: '',
        firstName: '',
        lastName: '',
        city: '', // This will store the location
        selectedCities: [], // Used for countries in preference step
        selectedTypes: [],
        selectedProperties: [], // Array of image indices (0-11) for investor preference selection
        preferredInterior: [], // Buyer: selected interior filenames
        preferredExterior: [], // Buyer: selected exterior filenames
        preferredVideos: []    // Buyer: selected video filenames
    });

    const [otpSent, setOtpSent] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0); // seconds until Resend is active (60 after send)
    const [locating, setLocating] = useState(false); // State for location spinner
    const [showPropertyModal, setShowPropertyModal] = useState(false);
    const [showBuyerPreferenceModal, setShowBuyerPreferenceModal] = useState(false);
    const [buyerPreferenceGridItems, setBuyerPreferenceGridItems] = useState([]); // 15 { id, url } for preference step (buyer/tenant/investor)
    const [showPassword, setShowPassword] = useState(false);
    const [planTermsAccepted, setPlanTermsAccepted] = useState({ Basic: { terms: false, generalTerms: false }, Premium: { terms: false, generalTerms: false } });
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showGeneralTermsModal, setShowGeneralTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    
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

    const toggleSelection = (listName, item) => {
        setFormData(prev => {
            const list = prev[listName];
            if (list.includes(item)) {
                return { ...prev, [listName]: list.filter(i => i !== item) }; 
            }
            return { ...prev, [listName]: [...list, item] }; 
        });
    };

    // Open image preference modal (12 reference images, no API)
    const openImagePreferenceModal = () => {
        setShowPropertyModal(true);
    };

    const toggleImageSelection = (imageIndex) => {
        setFormData(prev => {
            const selected = prev.selectedProperties || [];
            if (selected.includes(imageIndex)) {
                return { ...prev, selectedProperties: selected.filter(i => i !== imageIndex) };
            } else if (selected.length < PREFERENCE_SELECT_COUNT) {
                return { ...prev, selectedProperties: [...selected, imageIndex] };
            } else {
                showNotification(`You can only select up to ${PREFERENCE_SELECT_COUNT} images`, 'warning');
                return prev;
            }
        });
    };

    // Reset image selection
    const resetPropertySelection = () => {
        setFormData(prev => ({ ...prev, selectedProperties: [] }));
    };

    // When entering step 4 (picture step), init grid for buyer/tenant/investor
    useEffect(() => {
        if (step === 4 && (role === 'buyer' || role === 'tenant' || role === 'investor')) {
            setBuyerPreferenceGridItems(buildBuyerPreferencePool());
        }
    }, [step, role]);

    // OTP resend countdown: decrement every second when otpSent and cooldown > 0
    useEffect(() => {
        if (!otpSent || resendCooldown <= 0) return;
        const t = setInterval(() => setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
        return () => clearInterval(t);
    }, [otpSent, resendCooldown]);

    const toggleBuyerPreferenceGrid = (id) => {
        setFormData((prev) => {
            const list = prev.preferredInterior || [];
            if (list.includes(id)) {
                return { ...prev, preferredInterior: list.filter((f) => f !== id) };
            }
            if (list.length >= PREFERENCE_SELECT_COUNT) return prev;
            return { ...prev, preferredInterior: [...list, id] };
        });
    };

    const toggleInvestorPreferenceGrid = (id) => {
        setFormData((prev) => {
            const list = prev.selectedProperties || [];
            if (list.includes(id)) {
                return { ...prev, selectedProperties: list.filter((f) => f !== id) };
            }
            if (list.length >= PREFERENCE_SELECT_COUNT) return prev;
            return { ...prev, selectedProperties: [...list, id] };
        });
    };

    // Continue after image selection
    const continueAfterPropertySelection = () => {
        if (formData.selectedProperties.length === 0) {
            showNotification('Please select at least one image to continue', 'warning');
            return;
        }
        setShowPropertyModal(false);
    };

// ✅ NEW: Smart Location Detection (Fast Fallback)
    const detectLocation = () => {
                if (!navigator.geolocation) {
                    showNotification("Geolocation is not supported by your browser.", 'warning');
                    return;
                }

        setLocating(true);

        // Common success handler
        const onSuccess = async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                // Use BigDataCloud (Faster & more reliable for client-side than OSM)
                const res = await api.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                
                const city = res.data.city || res.data.locality || "";
                const country = res.data.countryName || "";
                
                if (city) {
                    setFormData(prev => ({ ...prev, city: `${city}, ${country}` }));
                } else {
                    showNotification("Location found, but city name could not be resolved. Please try the button again.", 'warning');
                }
            } catch (err) {
                console.error("Geocoding Error", err);
                showNotification("Could not resolve location. Please try the button again.", 'error');
            } finally {
                setLocating(false);
            }
        };

        // Error handler
        const onError = (err) => {
            setLocating(false);
            if (err.code === 1) {
                alert("❌ Permission Denied. Please allow location access in your browser settings.");
            } else if (err.code === 2) {
                alert("⚠️ Position Unavailable. Check your network connection.");
            } else if (err.code === 3) {
                alert("⏳ Timeout. Could not find your location. Please try again.");
            } else {
                alert("Unknown location error.");
            }
        };

        // 1. Try FAST mode first (Low Accuracy / Wi-Fi based)
        // This is much faster and rarely times out
        navigator.geolocation.getCurrentPosition(onSuccess, (err) => {
            console.warn("Fast location failed, trying high accuracy...", err);
            
            // 2. If Fast mode fails, try High Accuracy (GPS) with longer timeout
            navigator.geolocation.getCurrentPosition(onSuccess, onError, {
                enableHighAccuracy: true,
                timeout: 15000, 
                maximumAge: 0
            });
            
        }, {
            enableHighAccuracy: false, // Key change: Prefer speed over precision
            timeout: 5000,
            maximumAge: Infinity
        });
    };

    // Step 1: OTP Logic (Real API) - show OTP box immediately, send in background
    const sendOtp = async () => {
        if (!formData.email) {
            showNotification('Please enter your email address', 'error');
            return;
        }
        if (!isPasswordValid) {
            showNotification('Please use a stronger password before sending OTP.', 'error');
            return;
        }
        setOtpSent(true); // Show OTP box immediately; user waits for email
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
                userType: role
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

    // Plan selection (now after preferences / profile): save plan and submit (pass plan so it's used immediately)
    const selectPlan = (planName) => {
        setFormData(prev => ({ ...prev, plan: planName }));
        submitFinalData(planName);
    };

    // Step 2 (Personal Details) submit: go to step 3 (Plan for seller, Preferences for buyer/investor)
    const handleProfileSubmit = (e) => {
        e.preventDefault();
        setStep(3);
    };

    // Final Submit to Backend (planOverride used when coming from Plan step so state is current)
    const submitFinalData = async (planOverride) => {
        setLoading(true);
        const effectivePlan = planOverride != null ? planOverride : formData.plan;
        try {
            if (!formData.email || !formData.email.trim()) {
                console.error('❌ Validation failed: Email is missing or empty', formData);
                showNotification('Email is required. Please go back to step 1 and enter your email.', 'error');
                setLoading(false);
                return;
            }
            if (!formData.firstName || !formData.firstName.trim() || !formData.lastName || !formData.lastName.trim()) {
                showNotification('First name and last name are required', 'error');
                setLoading(false);
                return;
            }
            if (!formData.password || !formData.password.trim()) {
                showNotification('Password is required', 'error');
                setLoading(false);
                return;
            }

            const data = new FormData();
            // Ensure email is trimmed and lowercase
            const emailValue = formData.email.trim().toLowerCase();
            data.append('email', emailValue);
            data.append('name', `${formData.firstName.trim()} ${formData.lastName.trim()}`);
            data.append('location', (formData.city || '').trim()); // ✅ Sends detected location to DB
            data.append('plan', effectivePlan || 'Standard');
            data.append('role', role);
            data.append('password', formData.password); 

            if (role !== 'seller') {
                data.append('cities', JSON.stringify(formData.selectedCities || []));
                data.append('propertyTypes', JSON.stringify(formData.selectedTypes || []));
                data.append('selectedProperties', JSON.stringify(formData.selectedProperties || []));
            }
            if (role === 'buyer' || role === 'tenant') {
                data.append('preferredInterior', JSON.stringify(formData.preferredInterior || []));
                data.append('preferredExterior', JSON.stringify(formData.preferredExterior || []));
                data.append('preferredVideos', JSON.stringify(formData.preferredVideos || []));
            }

            // Debug: Log what we're sending
            console.log('📤 Submitting registration:', {
                email: formData.email,
                name: `${formData.firstName} ${formData.lastName}`,
                role: role,
                hasPassword: !!formData.password,
                hasLocation: !!formData.city,
                hasPlan: !!formData.plan,
                citiesCount: formData.selectedCities?.length || 0,
                typesCount: formData.selectedTypes?.length || 0
            });

            // Debug: Log FormData contents
            console.log('📋 FormData contents:');
            for (let pair of data.entries()) {
                console.log(`  ${pair[0]}: ${pair[1]}`);
            }

            const res = await api.post('/api/auth/register-agency', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log('✅ Registration response:', res.data);

            if (res.data && res.data.success && res.data.user) {
                if (res.data.stripeRedirect && (effectivePlan === 'Basic' || effectivePlan === 'Premium')) {
                    try {
                        const checkoutRes = await api.post('/api/stripe-create-checkout', {
                            plan: effectivePlan,
                            userId: res.data.user._id,
                            role: role
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
                        const msg = checkoutErr.response?.data?.message || checkoutErr.message || 'Could not start payment. Please try again.';
                        showNotification(msg, 'error');
                    }
                    setLoading(false);
                    return;
                }
                localStorage.setItem('user', JSON.stringify(res.data.user));
                setLoading(false);
                setStep(role === 'seller' ? 4 : 6);
            } else if (res.data && res.data.user) {
                // Handle case where success field might be missing but user exists
                localStorage.setItem('user', JSON.stringify(res.data.user));
                setLoading(false);
                setStep(role === 'seller' ? 4 : 6);
            } else {
                throw new Error(res.data?.message || 'Registration failed - invalid response');
            }

        } catch (err) {
            console.error('❌ Registration error:', err);
            console.error('Error response:', err.response?.data);
            
            // Handle 413 error specifically
            if (err.response?.status === 413 || err.message?.includes('413') || err.message?.includes('Content Too Large')) {
                showNotification('Request too large. Please try again.', 'error');
            } else {
                const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Registration failed. Please try again.';
                showNotification(errorMsg, 'error');
            }
            setLoading(false);
        }
    };

    // --- RENDER STEPS ---

    const renderStep1 = () => (
        <div style={stepContainer}>
            <button
                type="button"
                style={{ ...backBtn, alignSelf: 'flex-start', marginBottom: '8px' }}
                onClick={() => navigate('/signup', { state: { step: 'role-selection' } })}
            >
                <i className="fas fa-arrow-left"></i> Back to change account type
            </button>
            <div style={iconCircle}><i className="fas fa-user-lock"></i></div>
            <h2>Create {role.charAt(0).toUpperCase() + role.slice(1)} Account</h2>
            <p style={subText}>Verify your email to secure your account.</p>
            
            <div style={inputGroup}>
                <label style={labelStyle}>Email</label>
                <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    style={inputStyle} 
                    readOnly={otpSent}
                    placeholder="you@example.com"
                />
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
                <div style={{...passwordRule, ...(passwordChecks.minLength ? passwordRuleOk : passwordRuleBad)}}>
                    <i className={`fas ${passwordChecks.minLength ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    At least 8 characters
                </div>
                <div style={{...passwordRule, ...(passwordChecks.hasUpper ? passwordRuleOk : passwordRuleBad)}}>
                    <i className={`fas ${passwordChecks.hasUpper ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    One uppercase letter
                </div>
                <div style={{...passwordRule, ...(passwordChecks.hasLower ? passwordRuleOk : passwordRuleBad)}}>
                    <i className={`fas ${passwordChecks.hasLower ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    One lowercase letter
                </div>
                <div style={{...passwordRule, ...(passwordChecks.hasNumber ? passwordRuleOk : passwordRuleBad)}}>
                    <i className={`fas ${passwordChecks.hasNumber ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    One number
                </div>
                <div style={{...passwordRule, ...(passwordChecks.hasSpecial ? passwordRuleOk : passwordRuleBad)}}>
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
                <div style={{width:'100%', marginTop:'15px', animation:'fadeIn 0.5s'}}>
                    {loading && <p style={{fontSize:'12px', color:'#64748b', marginBottom:'8px'}}>Sending code to your email…</p>}
                    <input type="text" name="otp" value={formData.otp} onChange={handleChange} placeholder="Enter 4-digit OTP code" style={inputStyle} maxLength="4" />
                    <p style={{fontSize:'12px', color:'#64748b', marginTop:'10px'}}>
                        Didn&apos;t receive the code?{' '}
                        {resendCooldown > 0 ? (
                            <span style={{color:'#94a3b8'}}>Resend in {resendCooldown}s</span>
                        ) : (
                            <button type="button" onClick={sendOtp} disabled={loading} style={{background:'none', border:'none', padding:0, color:'#11575C', textDecoration:'underline', cursor: loading ? 'not-allowed' : 'pointer', fontSize:'12px'}}>Resend</button>
                        )}
                    </p>
                    <button onClick={verifyOtp} style={{...btnPrimary, marginTop:'15px'}}>Verify</button>
                </div>
            )}
            <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#64748b' }}>
                Already have an account? <Link to="/login" style={{ color: '#11575C', fontWeight: '600', textDecoration: 'none' }}>Login</Link>
                {' · '}
                <Link to="/forgot-password" style={{ color: '#11575C', fontWeight: '600', textDecoration: 'none' }}>Forgot password?</Link>
            </p>
        </div>
    );

    // Step 2: Personal Details (then Preferences for buyer/investor, or Plan for seller)
    const renderStep2 = () => (
        <div style={stepContainer}>
            <h2>Personal Details</h2>
            <p style={subText}>Let's build your profile.</p>
            <form onSubmit={handleProfileSubmit} style={{width:'100%'}}>
                <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                    <div style={{flex:1}}>
                        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" required style={inputStyle} />
                    </div>
                    <div style={{flex:1}}>
                        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" required style={inputStyle} />
                    </div>
                </div>
                
                <div style={{marginBottom:'15px', position:'relative'}}>
                    <label style={labelStyle}><i className="fas fa-map-marker-alt" style={{marginRight:'8px', color:'#11575C'}}></i>Address</label>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <GooglePlacesInput
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            onPlaceSelected={(formatted) => setFormData(prev => ({ ...prev, city: formatted }))}
                            placeholder="Street, City, Country, Postal Code"
                            inputStyle={{...inputStyle, flex:1, background: '#f8fafc'}}
                        />
                        <button type="button" onClick={detectLocation} style={locBtnStyle} disabled={locating} title="Use current location">
                            {locating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-map-marker-alt"></i>}
                        </button>
                    </div>
                </div>

                <button type="submit" style={{...btnPrimary, marginTop:'10px'}}>Next Step</button>
            </form>
            <button style={backBtn} onClick={() => setStep(1)}>
                <i className="fas fa-arrow-left"></i> Back
            </button>
        </div>
    );

    // Three plans for seller/buyer/investor – same layout, fits one screen (constraints from pricing table)
    const PLAN_OPTIONS = [
        {
            id: 'Basic',
            title: 'Basic',
            constraint: '1 Property',
            strikePrice: '€19',
            dueToday: true,
            earlyReg: true,
            features: [
                'Detailed ESG Compliance & Reporting',
                'Single-Asset Optimization',
                'Market Intelligence: Real-time analytics and AI-driven property matching',
                'Investment Tools: Live AI Investment Simulator and ROI insights via Smart Vault',
                'Intuitive Search: Conversational AI Data Assistant for complex market queries'
            ],
            cta: 'Select Plan & Finish'
        },
        {
            id: 'Premium',
            title: 'Premium',
            constraint: '5 Properties',
            strikePrice: '€139',
            dueToday: true,
            earlyReg: true,
            features: [
                'Everything in Basic, plus tools for aggressive growth',
                'Portfolio Scale: Manage and track up to 5 properties with real-time performance syncing',
                'Income Type Management: Track diverse revenue streams (Long-term rentals, Short-term stays, Commercial leases, ROI dividends)',
                'Priority Access: Exclusive early-access to off-market property listings',
                'IPM Intelligence: Hyper-localized, real-time market data and local volatility alerts',
                'Strategic Learning: Full access to the IPM Academy for advanced investment training',
                'Multi-Asset Assessment: Comparative reports benchmarking your properties against the regional market',
                'Smart Vault + AI Extraction: Secure storage with AI extraction from lease agreements and financial statements for instant ROI projections'
            ],
            cta: 'Select Plan & Finish'
        },
        {
            id: 'Custom',
            title: 'Custom',
            constraint: 'Institutional / Agency',
            strikePrice: null,
            dueToday: false,
            earlyReg: false,
            features: ['Large-scale funds and agencies requiring bespoke data and account management'],
            cta: 'Contact us'
        }
    ];

    const BUYER_FREE_PLAN = { id: 'Free', title: 'Free', constraint: '0 Properties', strikePrice: '€0', disabled: true, comingSoon: true, features: ['Saved tab only: bookmark properties for later'], cta: 'Coming soon' };
    const TENANT_COMING_SOON_PLAN = { id: 'TenantComingSoon', title: 'Tenant', constraint: null, disabled: true, comingSoon: true, message: "We'll alert you when we're ready for tenants.", cta: '' };

    const renderPlanStep = (isSeller) => {
        const options = role === 'buyer' ? [BUYER_FREE_PLAN, ...PLAN_OPTIONS] : (role === 'tenant' ? [TENANT_COMING_SOON_PLAN] : PLAN_OPTIONS);
        return (
        <div style={stepContainer}>
            <h2>Select a Plan</h2>
            <p style={subText}>{role === 'tenant' ? "Tenant signup isn't available yet." : 'Unlock premium market insights.'}</p>
            <div style={planGrid}>
                {options.map((plan) => (
                    <div key={plan.id} style={{ ...planCard, ...(plan.disabled ? { opacity: 0.85, borderColor: '#cbd5e1' } : {}) }}>
                        <h3 style={planCardTitle}>{plan.title}</h3>
                        {plan.constraint && (
                            <div style={constraintHighlight}>{plan.constraint}</div>
                        )}
                        {plan.message && (
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', textAlign: 'center' }}>{plan.message}</p>
                        )}
                        {!plan.disabled && plan.strikePrice ? (
                            <div style={planStrikeRow}>
                                <span style={planStrike}>{plan.strikePrice}</span>
                                <span style={planMo}>/mo</span>
                            </div>
                        ) : plan.disabled && plan.strikePrice ? (
                            <div style={{ ...planStrikeRow, color: '#94a3b8' }}><span style={planStrike}>{plan.strikePrice}</span><span style={planMo}>/mo</span></div>
                        ) : !plan.disabled && (
                            plan.id === 'Custom' ? <div style={planInquire}>Inquire for pricing</div> : null
                        )}
                        {!plan.disabled && plan.dueToday && (
                            <div style={planDueToday}>€0.00 due today</div>
                        )}
                        {!plan.disabled && plan.earlyReg && (
                            <div style={planEarlyReg}>Early registration gets you February and March for free!</div>
                        )}
                        {plan.features && plan.features.length > 0 && (
                            <ul style={planFeatureList}>
                                {plan.features.map((f, i) => (
                                    <li key={i}><i className="fas fa-check" style={{ color: '#166534', marginRight: '6px' }}></i>{f}</li>
                                ))}
                            </ul>
                        )}
                        <div style={planCardFooter}>
                            {plan.disabled ? (
                                <div style={{ padding: '10px', background: '#fef3c7', color: '#b45309', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>Coming soon</div>
                            ) : plan.id !== 'Custom' && (
                                <>
                                    <label style={termsCheckboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={planTermsAccepted[plan.id]?.terms || false}
                                            onChange={(e) => setPlanTermsAccepted(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], terms: e.target.checked } }))}
                                            style={termsCheckboxInput}
                                        />
                                        <span>I accept the <button type="button" style={termsLinkBtn} onClick={() => setShowTermsModal(true)}>Terms of Service</button> (see <button type="button" style={termsLinkBtnHighlight} onClick={() => setShowPrivacyModal(true)}>Privacy Policy</button>).</span>
                                    </label>
                                    {isSeller && !fromLandlordRental && (
                                        <label style={termsCheckboxLabel}>
                                            <input
                                                type="checkbox"
                                                checked={planTermsAccepted[plan.id]?.generalTerms || false}
                                                onChange={(e) => setPlanTermsAccepted(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], generalTerms: e.target.checked } }))}
                                                style={termsCheckboxInput}
                                            />
                                            <span>I accept the <button type="button" style={termsLinkBtn} onClick={() => setShowGeneralTermsModal(true)}>General Terms of Use</button> (this document also contains the <button type="button" style={termsLinkBtnHighlight} onClick={() => setShowPrivacyModal(true)}>Privacy Policy</button>).</span>
                                        </label>
                                    )}
                                </>
                            )}
                            {!plan.disabled && (plan.id === 'Custom' ? (
                                <a href="mailto:contact@ipm.com" style={{ ...btnPrimary, marginTop: '10px', textAlign: 'center', textDecoration: 'none', display: 'block' }}>{plan.cta}</a>
                            ) : (
                                <button
                                    style={{ ...btnPrimary, marginTop: '10px', opacity: (planTermsAccepted[plan.id]?.terms && (isSeller && !fromLandlordRental ? planTermsAccepted[plan.id]?.generalTerms : true)) ? 1 : 0.6, cursor: (planTermsAccepted[plan.id]?.terms && (isSeller && !fromLandlordRental ? planTermsAccepted[plan.id]?.generalTerms : true)) ? 'pointer' : 'not-allowed' }}
                                    onClick={() => selectPlan(plan.id)}
                                    disabled={loading || !planTermsAccepted[plan.id]?.terms || (isSeller && !fromLandlordRental && !planTermsAccepted[plan.id]?.generalTerms)}
                                >
                                    {loading ? 'Finalizing...' : (isSeller ? plan.cta : 'Select Plan & Complete Registration')}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <button style={backBtn} onClick={() => setStep(isSeller ? 2 : 4)}>
                <i className="fas fa-arrow-left"></i> Back
            </button>
            {showTermsModal && (
                <div style={termsModalOverlay} onClick={() => setShowTermsModal(false)}>
                    <div style={termsModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={termsModalHeader}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>Terms of Service</h3>
                            <button type="button" style={termsModalClose} onClick={() => setShowTermsModal(false)} aria-label="Close"><i className="fas fa-times"></i></button>
                        </div>
                        <div style={termsModalBody}>
                            <TermsOfServiceContent onOpenPrivacy={() => { setShowTermsModal(false); setShowPrivacyModal(true); }} />
                        </div>
                        <div style={termsModalFooter}>
                            <button type="button" style={btnPrimary} onClick={() => setShowTermsModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
            {showGeneralTermsModal && (
                <div style={termsModalOverlay} onClick={() => setShowGeneralTermsModal(false)}>
                    <div style={termsModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={termsModalHeader}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>General Terms of Use</h3>
                            <button type="button" style={termsModalClose} onClick={() => setShowGeneralTermsModal(false)} aria-label="Close"><i className="fas fa-times"></i></button>
                        </div>
                        <div style={termsModalBody}>
                            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#334155', marginBottom: '12px' }}>This document also contains our <button type="button" style={termsLinkBtnHighlight} onClick={() => { setShowGeneralTermsModal(false); setShowPrivacyModal(true); }}>Privacy Policy</button> (click to open).</p>
                            {GENERAL_TERMS_CONTENT}
                        </div>
                        <div style={termsModalFooter}>
                            <button type="button" style={btnPrimary} onClick={() => setShowGeneralTermsModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
            {showPrivacyModal && (
                <div style={termsModalOverlay} onClick={() => setShowPrivacyModal(false)}>
                    <div style={termsModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={termsModalHeader}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>Privacy Policy</h3>
                            <button type="button" style={termsModalClose} onClick={() => setShowPrivacyModal(false)} aria-label="Close"><i className="fas fa-times"></i></button>
                        </div>
                        <div style={termsModalBody}>
                            {PRIVACY_POLICY_CONTENT}
                        </div>
                        <div style={termsModalFooter}>
                            <button type="button" style={btnPrimary} onClick={() => setShowPrivacyModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    };

    // Step 3: For seller = Plan; for buyer/investor = Preferences
    const renderStep3 = () => {
        if (role === 'seller') {
            return renderPlanStep(true);
        }
        // Buyer / Tenant: Preferences – countries, property types (no bottom buttons); pictures are next step
        if (role === 'buyer' || role === 'tenant') {
            return (
                <div style={stepContainer}>
                    <h2>Preferences</h2>
                    <p style={subText}>Tell us what you like: countries, property types, and your style.</p>
                    <div style={{textAlign:'left', width:'100%', marginBottom:'20px'}}>
                        <label style={labelStyle}>Countries that I am interested in</label>
                        <div style={tagContainer}>
                            {PREFERENCE_COUNTRIES.map(c => (
                                <div key={c} onClick={() => toggleSelection('selectedCities', c)} style={formData.selectedCities.includes(c) ? tagActive : tag}>{c}</div>
                            ))}
                        </div>
                    </div>
                    <div style={{textAlign:'left', width:'100%', marginBottom:'20px'}}>
                        <label style={labelStyle}>Property Types</label>
                        <div style={tagContainer}>
                            {PREFERENCE_PROPERTY_TYPES.map(t => (
                                <div key={t} onClick={() => toggleSelection('selectedTypes', t)} style={formData.selectedTypes.includes(t) ? tagActive : tag}>{t}</div>
                            ))}
                        </div>
                    </div>
                    <button onClick={() => setStep(4)} style={{...btnPrimary, marginTop:'16px'}}>Next: choose style preferences</button>
                    <button style={backBtn} onClick={() => setStep(2)}>
                        <i className="fas fa-arrow-left"></i> Back
                    </button>
                </div>
            );
        }
        // Investor: Preferences – same: countries, property types; images next step
        return (
            <div style={stepContainer}>
                <h2>Preferences</h2>
                <p style={subText}>Customize your property feed.</p>
                <div style={{textAlign:'left', width:'100%', marginBottom:'20px'}}>
                    <label style={labelStyle}>Countries that I am interested in</label>
                    <div style={tagContainer}>
                        {PREFERENCE_COUNTRIES.map(c => (
                            <div key={c} onClick={() => toggleSelection('selectedCities', c)} style={formData.selectedCities.includes(c) ? tagActive : tag}>{c}</div>
                        ))}
                    </div>
                </div>
                <div style={{textAlign:'left', width:'100%', marginBottom:'20px'}}>
                    <label style={labelStyle}>Property Types</label>
                    <div style={tagContainer}>
                        {PREFERENCE_PROPERTY_TYPES.map(t => (
                            <div key={t} onClick={() => toggleSelection('selectedTypes', t)} style={formData.selectedTypes.includes(t) ? tagActive : tag}>{t}</div>
                        ))}
                    </div>
                </div>
                <button onClick={() => setStep(4)} style={{...btnPrimary, marginTop:'20px'}}>Next: choose favourite images</button>
                <button style={backBtn} onClick={() => setStep(2)}>
                    <i className="fas fa-arrow-left"></i> Back
                </button>
            </div>
        );
    };

    // Step 4: Plan (buyer/investor only – after preferences)
    // Step 4: Picture preferences (buyer/tenant = style grid; investor = same). Fits in viewport, no scroll.
    const pictureStepContainerStyle = { ...stepContainer, flex: 1, minHeight: 0, maxHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' };
    const pictureGridWrapStyle = { flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column', alignSelf: 'stretch' };
    const pictureGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gap: 'clamp(6px, 1.5vw, 12px)', flex: 1, minHeight: 0, width: '100%', maxWidth: '920px', margin: '0 auto', padding: '0 8px' };
    const pictureCardStyle = { ...buyerPreferenceCard, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' };
    const pictureThumbStyle = { ...buyerPreferenceThumb, flex: 1, minHeight: 0, height: '100%' };

    const renderPictureStep = () => {
        if (role === 'buyer' || role === 'tenant') {
            const preferred = formData.preferredInterior || [];
            return (
                <div style={pictureStepContainerStyle}>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: 'clamp(18px, 4vw, 22px)' }}>Select your preferences</h2>
                    <p style={{ ...subText, marginBottom: '8px' }}>Choose {PREFERENCE_SELECT_COUNT} images you like ({buyerPreferenceGridItems.length} styles).</p>
                    <div style={pictureGridWrapStyle}>
                        <div style={pictureGridStyle}>
                        {buyerPreferenceGridItems.map(({ id, url }) => {
                            const isSelected = preferred.includes(id);
                            return (
                                <div
                                    key={id}
                                    onClick={() => toggleBuyerPreferenceGrid(id)}
                                    style={{ ...pictureCardStyle, border: isSelected ? '3px solid #11575C' : '1px solid #e2e8f0' }}
                                >
                                    {isSelected && <div style={selectedBadge}><i className="fas fa-check"></i></div>}
                                    <div style={pictureThumbStyle}>
                                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                    {preferred.length > 0 && <p style={{ fontSize: '13px', color: '#166534', marginBottom: '6px', flexShrink: 0 }}>{preferred.length} of {PREFERENCE_SELECT_COUNT} selected</p>}
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '920px' }}>
                        <button onClick={() => setStep(5)} style={{ ...btnPrimary, opacity: preferred.length === PREFERENCE_SELECT_COUNT ? 1 : 0.5, cursor: preferred.length === PREFERENCE_SELECT_COUNT ? 'pointer' : 'not-allowed' }} disabled={preferred.length !== PREFERENCE_SELECT_COUNT}>
                            Continue to Plan
                        </button>
                        <button style={backBtn} onClick={() => setStep(3)}><i className="fas fa-arrow-left"></i> Back</button>
                    </div>
                </div>
            );
        }
        // Investor: same grid
        const preferred = formData.selectedProperties || [];
        return (
            <div style={pictureStepContainerStyle}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: 'clamp(18px, 4vw, 22px)' }}>Select your preferences</h2>
                <p style={{ ...subText, marginBottom: '8px' }}>Choose {PREFERENCE_SELECT_COUNT} images you like ({buyerPreferenceGridItems.length} styles).</p>
                <div style={pictureGridWrapStyle}>
                    <div style={pictureGridStyle}>
                        {buyerPreferenceGridItems.map(({ id, url }) => {
                            const isSelected = preferred.includes(id);
                            return (
                                <div
                                    key={id}
                                    onClick={() => toggleInvestorPreferenceGrid(id)}
                                    style={{ ...pictureCardStyle, border: isSelected ? '3px solid #11575C' : '1px solid #e2e8f0' }}
                                >
                                    {isSelected && <div style={selectedBadge}><i className="fas fa-check"></i></div>}
                                    <div style={pictureThumbStyle}>
                                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {preferred.length > 0 && <p style={{ fontSize: '13px', color: '#166534', marginBottom: '6px', flexShrink: 0 }}>{preferred.length} of {PREFERENCE_SELECT_COUNT} selected</p>}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '920px' }}>
                    <button onClick={() => setStep(5)} style={{ ...btnPrimary, opacity: preferred.length === PREFERENCE_SELECT_COUNT ? 1 : 0.5, cursor: preferred.length === PREFERENCE_SELECT_COUNT ? 'pointer' : 'not-allowed' }} disabled={preferred.length !== PREFERENCE_SELECT_COUNT}>
                        Continue to Plan
                    </button>
                    <button style={backBtn} onClick={() => setStep(3)}><i className="fas fa-arrow-left"></i> Back</button>
                </div>
            </div>
        );
    };

    const renderStep4 = () => renderPlanStep(false);

    const renderStep5 = () => (
        <div style={stepContainer}>
             <div style={{...iconCircle, background:'#dcfce7', color:'#166534'}}><i className="fas fa-check"></i></div>
             <h2>Welcome Aboard!</h2>
             <p style={subText}>Your account has been created successfully.</p>
             <button style={btnPrimary} onClick={() => { window.location.href = '/dashboard'; }}>Go to Dashboard</button>
        </div>
    );

    const isPlanStep = (step === 3 && role === 'seller') || (step === 5 && (role === 'buyer' || role === 'tenant' || role === 'investor'));
        return (
        <div style={pageContainer}>
            <div className="auth-visual-side" style={{ ...visualSide, display: isMobile ? 'none' : 'flex' }}>
                <div style={overlay}>
                    <h1 style={{fontSize:'2.5em'}}>Your Journey Begins.</h1>
                    <p style={{opacity:0.8}}>Setting up account as: <strong>{role.toUpperCase()}</strong></p>
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
                <div style={{
                    ...formWrapper,
                    maxWidth: ((step === 3 && (role === 'seller' || role === 'buyer' || role === 'tenant')) || step === 4 || step === 5) ? '920px' : formWrapper.maxWidth,
                    ...((step === 4 && (role === 'buyer' || role === 'tenant' || role === 'investor')) ? { height: '100vh', maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {})
                }}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && (role === 'seller' ? renderStep5() : renderPictureStep())}
                    {step === 5 && renderStep4()}
                    {step === 6 && renderStep5()}
                </div>
            </div>

            {/* Image preference selection modal (15 images, select 5) */}
            {showPropertyModal && (
                <div style={modalOverlay}>
                    <div style={propertyModalContent}>
                        <div style={propertyModalHeader}>
                            <h2 style={{margin: 0, fontSize: '24px', color: '#11575C'}}>Choose your favourite images</h2>
                            <button onClick={() => setShowPropertyModal(false)} style={closeButton}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div style={propertyModalBanner}>
                            <p style={{margin: 0, fontSize: '14px', color: '#11575C', fontWeight: '600'}}>
                                Select {PREFERENCE_SELECT_COUNT} images you like the most to personalize your experience
                            </p>
                            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                                <button onClick={resetPropertySelection} style={resetButton}>
                                    Reset Selection
                                </button>
                                <button 
                                    onClick={continueAfterPropertySelection} 
                                    style={{
                                        ...continueButton,
                                        opacity: formData.selectedProperties.length === 0 ? 0.5 : 1,
                                        cursor: formData.selectedProperties.length === 0 ? 'not-allowed' : 'pointer'
                                    }}
                                    disabled={formData.selectedProperties.length === 0}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>

                        <div style={propertyGrid}>
                            {PREFERENCE_IMAGES_POOL.map((imgUrl, index) => {
                                const isSelected = formData.selectedProperties.includes(index);
                                const canSelect = formData.selectedProperties.length < PREFERENCE_SELECT_COUNT || isSelected;
                                return (
                                    <div 
                                        key={index}
                                        onClick={() => canSelect && toggleImageSelection(index)}
                                        style={{
                                            ...propertyCard,
                                            border: isSelected ? '3px solid #11575C' : '1px solid #e2e8f0',
                                            opacity: canSelect ? 1 : 0.5,
                                            cursor: canSelect ? 'pointer' : 'not-allowed',
                                            position: 'relative'
                                        }}
                                    >
                                        {isSelected && (
                                            <div style={selectedBadge}>
                                                <i className="fas fa-check"></i>
                                            </div>
                                        )}
                                        <div style={{
                                            width: '100%',
                                            flex: 1,
                                            minHeight: 0,
                                            backgroundImage: `url('${imgUrl}')`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            borderRadius: '8px'
                                        }}></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// --- STYLES ---
const pageContainer = { display: 'flex', height: '100vh', width: '100%', fontFamily: "'Inter', sans-serif" };
const visualSide = { flex: 1, background: "url('/site-assets/signup-left/client-registration.jpg') center/cover no-repeat", position: 'relative' }; 
const overlay = { position: 'absolute', inset: 0, background: 'rgba(17, 87, 92, 0.8)', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: 'white' };
const formSide = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#fff', minHeight: 0 };
const formWrapper = { width: '100%', maxWidth: '450px', padding: '40px' };

const stepContainer = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'fadeIn 0.5s ease', width: '100%' };
const iconCircle = { width: '60px', height: '60px', background: '#f0fdfa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#11575C', marginBottom: '15px' };
const subText = { color: '#64748b', marginBottom: '20px' };
const inputGroup = { width: '100%', textAlign: 'left', marginBottom: '15px' };
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline:'none', fontSize:'14px' };
const btnPrimary = { width: '100%', padding: '14px', background: '#11575C', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize:'15px', transition:'0.2s' };
const backBtn = { background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' };
const togglePasswordBtn = { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: '14px' };
const passwordChecklist = { width: '100%', textAlign: 'left', marginTop: '-5px', marginBottom: '15px', fontSize: '12px' };
const passwordRule = { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' };
const passwordRuleOk = { color: '#166534' };
const passwordRuleBad = { color: '#dc2626' };

const promoBanner = { background: '#fff7ed', color: '#c2410c', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', width: '100%' };
const planGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', width: '100%', maxWidth: '920px', marginBottom: '8px' };
const planCard = { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0, flex: 1 };
const planCardFooter = { marginTop: 'auto', width: '100%', paddingTop: '12px' };
const termsCheckboxLabel = { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '4px', fontSize: '11px', color: '#475569', cursor: 'pointer', marginBottom: '8px', textAlign: 'left' };
const termsCheckboxInput = { marginTop: '2px', flexShrink: 0 };
const constraintHighlight = { background: 'rgba(17, 87, 92, 0.12)', color: '#11575C', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: 'inline-block' };
const termsLinkBtn = { background: 'none', border: 'none', padding: 0, color: '#11575C', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600', fontSize: 'inherit' };
const termsLinkBtnHighlight = { background: 'rgba(255, 200, 1, 0.35)', border: 'none', padding: '0 2px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600', color: '#1e293b', fontSize: 'inherit' };
const termsModalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' };
const termsModalContent = { background: '#fff', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const termsModalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' };
const termsModalClose = { background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' };
const termsModalBody = { overflowY: 'auto', padding: '20px', flex: 1, minHeight: 0 };
const termsModalFooter = { padding: '12px 20px', borderTop: '1px solid #e2e8f0' };
const planCardTitle = { fontSize: '16px', fontWeight: '700', color: '#334155', margin: '0 0 8px' };
const planStrikeRow = { marginBottom: '4px' };
const planStrike = { textDecoration: 'line-through', color: '#94a3b8', marginRight: '4px', fontSize: '15px' };
const planMo = { fontSize: '12px', color: '#64748b' };
const planInquire = { fontSize: '14px', color: '#11575C', fontWeight: '600', marginBottom: '8px' };
const planDueToday = { fontSize: '12px', color: '#166534', fontWeight: 'bold', marginBottom: '2px' };
const planEarlyReg = { fontSize: '11px', color: '#166534', marginBottom: '10px', lineHeight: 1.3 };
const planFeatureList = { textAlign: 'left', fontSize: '11px', color: '#64748b', lineHeight: 1.6, listStyle: 'none', padding: 0, margin: 0, width: '100%' };
const planCardActive = { width: '100%', border: '2px solid #11575C', borderRadius: '12px', padding: '20px', background: '#f0fdfa' };
const planTitle = { fontSize: '18px', fontWeight: '700', color: '#334155' };
const planPrice = { fontSize: '24px', fontWeight: '800', color: '#11575C', margin: '10px 0' };

// Location Button Style
const locBtnStyle = { padding: '12px 15px', borderRadius: '8px', border: '1px solid #11575C', background: '#fff', color: '#11575C', cursor: 'pointer', fontSize: '16px', transition: '0.2s' };

const tagContainer = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' };
const tag = { padding: '8px 16px', borderRadius: '50px', background: '#f1f5f9', color: '#64748b', fontSize: '13px', cursor: 'pointer', border: '1px solid #e2e8f0' };
const tagActive = { ...tag, background: '#11575C', color: 'white', borderColor: '#11575C' };

// Property Selection Modal Styles
const modalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
};

const propertyModalContent = {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '1200px',
    height: '90vh',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
};

const propertyModalHeader = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0
};

const closeButton = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '5px 10px'
};

const propertyModalBanner = {
    background: '#f0fdfa',
    border: '1px solid #11575C',
    padding: '10px 20px',
    textAlign: 'center',
    flexShrink: 0
};

const resetButton = {
    padding: '10px 20px',
    background: 'white',
    border: '2px solid #11575C',
    color: '#11575C',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
};

const continueButton = {
    padding: '10px 20px',
    background: '#11575C',
    border: 'none',
    color: 'white',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
};

const propertyGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: 'repeat(4, 1fr)',
    gap: 'clamp(6px, 1.2vw, 12px)',
    padding: 'clamp(8px, 2vw, 16px)',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden'
};

const propertyCard = {
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    minHeight: 0,
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
};

const selectedBadge = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: '#11575C',
    color: 'white',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
};

// Buyer preference modal: responsive to screen size
const buyerPreferenceModalContent = {
    background: 'white',
    borderRadius: '16px',
    width: 'min(96vw, 1100px)',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden'
};
const buyerPreferenceModalBody = {
    flex: 1,
    overflow: 'auto',
    padding: 'clamp(12px, 3vw, 24px)',
    minHeight: 0
};
const buyerPreferenceGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 22vw), 1fr))',
    gap: 'clamp(10px, 2vw, 20px)'
};
const buyerPreferenceGrid4x4 = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '12px',
    width: '100%',
    maxWidth: '920px',
    minWidth: '280px'
};
const buyerPreferenceGrid3x3 = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
    width: '100%',
    maxWidth: '920px',
    minWidth: '280px'
};
const buyerPreferenceCard = {
    cursor: 'pointer',
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    minWidth: 0
};
const buyerPreferenceThumb = {
    width: '100%',
    aspectRatio: '4/3',
    minHeight: '80px',
    borderRadius: '8px',
    flexShrink: 0,
    background: '#e2e8f0',
    overflow: 'hidden'
};
const buyerPreferenceLabel = {
    padding: 'clamp(6px, 1.5vw, 10px)',
    fontSize: 'clamp(10px, 1.8vw, 12px)',
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
};
const buyerPreferenceModalFooter = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'clamp(12px, 2.5vw, 20px)',
    borderTop: '1px solid #e2e8f0',
    flexShrink: 0
};

// Animation
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(styleSheet);
}

export default ClientRegistration;

