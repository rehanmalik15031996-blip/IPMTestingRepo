import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import LegalPolicyModals from './LegalPolicyModals';
import { contactPublicFetch } from '../utils/contactPublicFetch';
import './HomeCtaContactSections.css';

const HOME_ANIMA_LOCATION_GROUPS = [
    { region: 'Middle East', countries: ['United Arab Emirates'] },
    { region: 'Europe', countries: ['Netherlands', 'Greece', 'Spain', 'Italy', 'Malta'] },
    { region: 'Africa', countries: ['South Africa'] },
    { region: 'Americas', countries: ['United States', 'Canada', 'Brazil'] },
    { region: 'Pacific', countries: ['Australia', 'New Zealand', 'Indonesia (Bali)'] },
];

const HOME_ANIMA_SOCIAL_LINKS = [
    {
        key: 'instagram',
        label: 'Instagram',
        href: 'https://www.instagram.com/',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16.4 3H7.6A4.6 4.6 0 0 0 3 7.6v8.8A4.6 4.6 0 0 0 7.6 21h8.8a4.6 4.6 0 0 0 4.6-4.6V7.6A4.6 4.6 0 0 0 16.4 3Zm3.1 13.4a3.1 3.1 0 0 1-3.1 3.1H7.6a3.1 3.1 0 0 1-3.1-3.1V7.6a3.1 3.1 0 0 1 3.1-3.1h8.8a3.1 3.1 0 0 1 3.1 3.1v8.8Z" />
                <path d="M12 7.8A4.2 4.2 0 1 0 16.2 12 4.2 4.2 0 0 0 12 7.8Zm0 6.9A2.7 2.7 0 1 1 14.7 12 2.7 2.7 0 0 1 12 14.7Z" />
                <circle cx="16.8" cy="7.2" r="1.1" />
            </svg>
        ),
    },
    {
        key: 'facebook',
        label: 'Facebook',
        href: 'https://www.facebook.com/',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.5 21v-7.6h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.8-.1-1.6-.2-2.4-.2-2.4 0-4 1.5-4 4.1v2.1H8v3h2.4V21h3.1Z" />
            </svg>
        ),
    },
    {
        key: 'tiktok',
        label: 'TikTok',
        href: 'https://www.tiktok.com/',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14.7 3h2.2c.2 1.7 1.2 3.2 2.8 3.9v2.4c-1.2 0-2.4-.4-3.4-1.1v5.2a5.5 5.5 0 1 1-5.5-5.5c.4 0 .8 0 1.2.1v2.5a3.1 3.1 0 1 0 1.6 2.9V3Z" />
            </svg>
        ),
    },
    {
        key: 'linkedin',
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.3 8.5H3.4V21h2.9V8.5ZM4.8 3A1.7 1.7 0 1 0 5 6.4 1.7 1.7 0 0 0 4.8 3Zm16.2 10.4c0-3.1-1.7-5.1-4.4-5.1a3.8 3.8 0 0 0-3.4 1.9V8.5h-2.8V21h2.9v-6.2c0-1.7.9-2.7 2.3-2.7 1.3 0 2.1.9 2.1 2.7V21H21v-7.6Z" />
            </svg>
        ),
    },
    {
        key: 'youtube',
        label: 'YouTube',
        href: 'https://www.youtube.com/',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.6 7.6a2.9 2.9 0 0 0-2-2.1C17.8 5 12 5 12 5s-5.8 0-7.6.5a2.9 2.9 0 0 0-2 2.1A30.6 30.6 0 0 0 2 12a30.6 30.6 0 0 0 .4 4.4 2.9 2.9 0 0 0 2 2.1c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.9 2.9 0 0 0 2-2.1A30.6 30.6 0 0 0 22 12a30.6 30.6 0 0 0-.4-4.4ZM10 15.2V8.8l5.2 3.2L10 15.2Z" />
            </svg>
        ),
    },
];

const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
};

const FOOTER_INFO_MODAL_OVERLAY = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    padding: '20px',
};

const FOOTER_INFO_MODAL_CARD = {
    background: '#fff',
    borderRadius: '12px',
    maxWidth: '640px',
    width: '100%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const FOOTER_INFO_MODAL_HEADER = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
};

const FOOTER_INFO_MODAL_BODY = {
    overflowY: 'auto',
    padding: '18px 20px',
    color: '#334155',
    lineHeight: 1.6,
    fontSize: '14px',
};

const FOOTER_INFO_MODAL_CLOSE = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '4px 8px',
};

function makePid(idPrefix) {
    const idRoot = idPrefix === 'home' ? 'home' : idPrefix;
    return (suffix) => `${idRoot}-${suffix}`;
}

/** GET IN TOUCH + inquiry form (home landing). */
export function HomeGetInTouchSection({ idPrefix = 'home' }) {
    const [contactInquiryForm, setContactInquiryForm] = useState(emptyForm);
    const [contactSubmitting, setContactSubmitting] = useState(false);
    const pid = makePid(idPrefix);

    const handleContactInquiryChange = (e) => {
        const { name, value } = e.target;
        setContactInquiryForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleContactInquirySubmit = async (e) => {
        e.preventDefault();
        if (contactSubmitting) return;
        setContactSubmitting(true);
        try {
            await contactPublicFetch.postInquiry({
                firstName: contactInquiryForm.firstName.trim(),
                lastName: contactInquiryForm.lastName.trim(),
                email: contactInquiryForm.email.trim(),
                phone: contactInquiryForm.phone.trim(),
                message: contactInquiryForm.message.trim(),
                enquiryType: 'Website — Get in touch',
            });
            setContactInquiryForm(emptyForm);
            setContactSubmitting(false);
            alert("Thank you. Your enquiry has been sent — we'll get back to you soon.");
        } catch (err) {
            console.error(err);
            setContactSubmitting(false);
            alert(err.response?.data?.message || 'Something went wrong. Please try again.');
        }
    };

    return (
        <section id="home-section-contact" aria-labelledby={pid('section-contact-heading')}>
            <div className="home-section-contact-inner">
                <div className="home-contact-layout">
                    <div className="home-contact-copy">
                        <p className="home-contact-eyebrow">GET IN TOUCH</p>
                        <h2 className="home-contact-title" id={pid('section-contact-heading')}>
                            Have Questions or Ready to Take the Next Step?
                        </h2>
                        <p className="home-contact-lead">
                            Whether you&apos;re looking to buy, sell or invest, our team is here to guide you
                            through every stage of the property journey.
                        </p>
                    </div>
                    <div>
                        <form className="home-contact-form" onSubmit={handleContactInquirySubmit}>
                            <div className="home-contact-form-grid">
                                <div className="home-contact-input-wrap">
                                    <input
                                        type="text"
                                        name="firstName"
                                        id={pid('contact-firstName')}
                                        placeholder="First Name"
                                        value={contactInquiryForm.firstName}
                                        onChange={handleContactInquiryChange}
                                        autoComplete="given-name"
                                        required
                                    />
                                </div>
                                <div className="home-contact-input-wrap">
                                    <input
                                        type="text"
                                        name="lastName"
                                        id={pid('contact-lastName')}
                                        placeholder="Last Name"
                                        value={contactInquiryForm.lastName}
                                        onChange={handleContactInquiryChange}
                                        autoComplete="family-name"
                                        required
                                    />
                                </div>
                                <div className="home-contact-input-wrap home-contact-field--full">
                                    <input
                                        type="email"
                                        name="email"
                                        id={pid('contact-email')}
                                        placeholder="E-mail Address"
                                        value={contactInquiryForm.email}
                                        onChange={handleContactInquiryChange}
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                                <div className="home-contact-input-wrap home-contact-field--full">
                                    <input
                                        type="tel"
                                        name="phone"
                                        id={pid('contact-phone')}
                                        placeholder="Phone Number"
                                        value={contactInquiryForm.phone}
                                        onChange={handleContactInquiryChange}
                                        autoComplete="tel"
                                        required
                                    />
                                </div>
                                <div className="home-contact-input-wrap home-contact-input-wrap--tall home-contact-field--full">
                                    <textarea
                                        name="message"
                                        id={pid('contact-message')}
                                        placeholder="What can we help you with?"
                                        rows={3}
                                        value={contactInquiryForm.message}
                                        onChange={handleContactInquiryChange}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="home-contact-submit" disabled={contactSubmitting}>
                                {contactSubmitting ? 'Sending…' : 'Send an Inquiry →'}
                            </button>
                            <p className="home-contact-disclaimer">
                                Your data is protected and never shared. GDPR compliant.
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}

/** Black footer bar: Resources, Search, Locations, IPM (home landing). */
export function HomeAnimaFooter({ idPrefix = 'home' }) {
    const sectionId = idPrefix === 'home' ? 'home-anima-footer' : `${idPrefix}-anima-footer`;
    const isMobile = useIsMobile();
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);

    return (
        <section id={sectionId} className="home-anima-footer-root" aria-label="Footer">
            <div className="home-anima-footer-inner">
                <div className="home-anima-footer-grid">
                    <div className="home-anima-brand">
                        <div className="home-anima-logo" aria-label="IPM">
                            <img src="/logo-white.png" alt="IPM logo" className="home-anima-logo-img" />
                            <span className="home-anima-logo-wordmark">IPM</span>
                        </div>
                        <p className="home-anima-tagline">
                            The intelligence-driven global property platform connecting agents, buyers, investors
                            and partners in one integrated ecosystem.
                        </p>
                        <div className="home-anima-social">
                            {HOME_ANIMA_SOCIAL_LINKS.map((social) => (
                                <a
                                    key={social.key}
                                    className={`home-anima-social-pill home-anima-social-pill--${social.key}`}
                                    href={social.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={social.label}
                                    title={social.label}
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="home-anima-col-title">RESOURCES</p>
                        <div className="home-anima-links">
                            {[
                                'Calculators',
                                'Property Guides',
                                'Pricing Guides',
                                'Tier Guides',
                                'API Documentation',
                                'IPM Score Explained',
                                'IPM Academy',
                            ].map((l) => (
                                <div key={l} className="home-anima-link">
                                    {l}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="home-anima-col-title">SEARCH</p>
                        <div className="home-anima-links">
                            {[
                                'Homes for Sale',
                                'Homes for Rent',
                                'Commercial',
                                'Find an Agent',
                                'New Developments',
                            ].map((l) => (
                                <div key={l} className="home-anima-link">
                                    {l}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="home-anima-col-title">LOCATIONS</p>
                        <div className="home-anima-links">
                            {HOME_ANIMA_LOCATION_GROUPS.map(({ region, countries }) => (
                                <details key={region} className="home-anima-location-group">
                                    <summary className="home-anima-link home-anima-location-summary">{region}</summary>
                                    <div className="home-anima-location-list">
                                        {countries.map((country) => (
                                            <div key={country} className="home-anima-link home-anima-location-item">
                                                {country}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="home-anima-col-title">IPM</p>
                        <div className="home-anima-links">
                            {['About', 'Newsletter', 'Partner Program', 'Press / Media', 'Contact Us', 'Careers'].map((l) => (
                                l === 'About' || l === 'Contact Us' ? (
                                    <button
                                        key={l}
                                        type="button"
                                        className="home-anima-link home-anima-link--action"
                                        onClick={() => (l === 'About' ? setShowAboutModal(true) : setShowContactModal(true))}
                                    >
                                        {l}
                                    </button>
                                ) : (
                                    <div key={l} className="home-anima-link">
                                        {l}
                                    </div>
                                )
                            ))}
                            {[
                                'Instagram',
                                'Facebook',
                                'TikTok',
                                'LinkedIn',
                                'YouTube',
                            ].map((l) => (
                                <div key={l} className="home-anima-link">
                                    {l}
                                </div>
                            ))}
                            <button
                                type="button"
                                className="home-anima-link home-anima-link--action"
                                onClick={() => setShowTermsModal(true)}
                            >
                                Terms of Service
                            </button>
                            <button
                                type="button"
                                className="home-anima-link home-anima-link--action"
                                onClick={() => setShowPrivacyModal(true)}
                            >
                                Privacy
                            </button>
                        </div>
                    </div>
                </div>

                <div className="home-anima-legal">
                    <small>© 2026 International Property Market. All rights reserved.</small>
                    <div className="home-anima-compliance-badges" aria-label="Compliance">
                        <small className="home-anima-legal-muted">GDPR Compliant</small>
                        <small className="home-anima-legal-muted">POPIA Compliant</small>
                    </div>
                    <div className="home-anima-legal-links">
                        <button type="button" className="home-anima-legal-link" onClick={() => setShowTermsModal(true)}>
                            Terms
                        </button>
                        <button type="button" className="home-anima-legal-link" onClick={() => setShowPrivacyModal(true)}>
                            Privacy
                        </button>
                    </div>
                </div>
            </div>
            <LegalPolicyModals
                showTermsModal={showTermsModal}
                setShowTermsModal={setShowTermsModal}
                showPrivacyModal={showPrivacyModal}
                setShowPrivacyModal={setShowPrivacyModal}
                isMobile={isMobile}
            />
            {showAboutModal && (
                <div style={FOOTER_INFO_MODAL_OVERLAY} onClick={() => setShowAboutModal(false)} role="presentation">
                    <div style={FOOTER_INFO_MODAL_CARD} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="About IPM">
                        <div style={FOOTER_INFO_MODAL_HEADER}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>About IPM</h3>
                            <button type="button" style={FOOTER_INFO_MODAL_CLOSE} onClick={() => setShowAboutModal(false)} aria-label="Close">
                                <i className="fas fa-times" />
                            </button>
                        </div>
                        <div style={FOOTER_INFO_MODAL_BODY}>
                            <p style={{ marginTop: 0 }}>
                                International Property Market B.V. is a global property technology platform that connects
                                buyers, sellers, investors, agents, and partners in one intelligence-driven ecosystem.
                            </p>
                            <p>
                                We combine advanced automation, market analytics, and cross-border collaboration tools to
                                help users discover, evaluate, and transact with confidence.
                            </p>
                            <p style={{ marginBottom: 0 }}>
                                <strong>Legal company name:</strong> International Property Market B.V.<br />
                                <strong>KvK number:</strong> 98220136
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {showContactModal && (
                <div style={FOOTER_INFO_MODAL_OVERLAY} onClick={() => setShowContactModal(false)} role="presentation">
                    <div style={FOOTER_INFO_MODAL_CARD} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Contact IPM">
                        <div style={FOOTER_INFO_MODAL_HEADER}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>Contact IPM</h3>
                            <button type="button" style={FOOTER_INFO_MODAL_CLOSE} onClick={() => setShowContactModal(false)} aria-label="Close">
                                <i className="fas fa-times" />
                            </button>
                        </div>
                        <div style={FOOTER_INFO_MODAL_BODY}>
                            <p style={{ marginTop: 0 }}><strong>Email:</strong> enquiries@internationalpropertymarket.com</p>
                            <p><strong>Phone:</strong> +971 50 123 4567</p>
                            <p><strong>Address:</strong> Dubai Internet City, UAE</p>
                            <p style={{ marginBottom: 0 }}>
                                For general enquiries, partnerships, or platform support, reach out using the contact details
                                above or use the Get in Touch form on this page.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function ReadyToBeginCta({ idPrefix = 'home', ctaPrimaryTo = '/our-services', ctaPrimaryLabel = 'Explore All Services →' }) {
    const pid = makePid(idPrefix);
    const ctaBg = `${process.env.PUBLIC_URL || ''}/img/section-cta.jpg`;

    return (
        <section
            id="home-section-cta"
            aria-labelledby={pid('section-cta-heading')}
            style={{ backgroundImage: `url("${ctaBg}")` }}
        >
            <div className="home-section-cta-inner">
                <p className="home-section-cta-eyebrow">READY TO BEGIN</p>
                <h2 className="home-section-cta-headline" id={pid('section-cta-heading')}>
                    Turn your real estate
                    <br />
                    goals into <span className="home-section-cta-accent">Reality.</span>
                </h2>
                <p className="home-section-cta-copy">
                    Whether you&apos;re looking to buy, sell or invest — our team and platform are here to guide you
                    every step of the way across all global markets.
                </p>
                <p className="home-section-cta-cardfree" role="note" aria-label="No credit card required for sign up">
                    No credit card required
                </p>
                <div className="home-section-cta-actions">
                    <Link to={ctaPrimaryTo} className="home-section-cta-btn home-section-cta-btn--primary">
                        {ctaPrimaryLabel}
                    </Link>
                    <a href="#home-section-contact" className="home-section-cta-btn home-section-cta-btn--outline">
                        Talk to the Team
                    </a>
                </div>
                <p className="home-section-cta-note">
                    Free trial available · Cancel anytime
                </p>
            </div>
        </section>
    );
}

/**
 * Home only: “READY TO BEGIN” CTA + GET IN TOUCH. Use {@link HomeAnimaFooter} after this on the home page.
 */
export default function HomeCtaContactSections({
    ctaPrimaryTo = '/our-services',
    ctaPrimaryLabel = 'Explore All Services →',
    idPrefix = 'home',
}) {
    return (
        <>
            <ReadyToBeginCta
                idPrefix={idPrefix}
                ctaPrimaryTo={ctaPrimaryTo}
                ctaPrimaryLabel={ctaPrimaryLabel}
            />
            <HomeGetInTouchSection idPrefix={idPrefix} />
        </>
    );
}
