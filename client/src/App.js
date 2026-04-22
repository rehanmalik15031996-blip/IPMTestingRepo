import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
    BrowserRouter as Router, 
    Routes, 
    Route, 
    Navigate, 
    useLocation,
    Link 
} from 'react-router-dom';
import './App.css';
import api from './config/api';
import ScrollToTop from './components/ScrollToTop';
import { useNotification } from './components/NotificationManager';
import NavSettingsDropdown from './components/NavSettingsDropdown';
import CookieConsent, { hasAnalyticsConsent, COOKIE_CONSENT_EVENT } from './components/CookieConsent';
import { SpeedInsights } from '@vercel/speed-insights/react';
import LogoLoading from './components/LogoLoading';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import GuidedTour from './components/GuidedTour';
import MobileFAB from './components/MobileFAB';
import DashboardSplitTopBar from './components/DashboardSplitTopBar';
import { PropdataImportProvider } from './context/PropdataImportContext';
import { useTranslation } from 'react-i18next';

// Critical-path pages loaded eagerly (home, login, signup – first paint)
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Lazy-loaded pages – only loaded when navigated to (Dashboard is heavy: recharts, maps, legacy)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AgencyRegistration = lazy(() => import('./pages/AgencyRegistration'));
const Collection = lazy(() => import('./pages/Collection'));
const Property = lazy(() => import('./pages/Property'));
const Profile = lazy(() => import('./pages/Profile'));
const Pricing = lazy(() => import('./pages/Pricing'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const NewDevelopments = lazy(() => import('./pages/NewDevelopments'));
const Saved = lazy(() => import('./pages/Saved'));
const IndependentAgentRegistration = lazy(() => import('./pages/IndependentAgentRegistration'));
const AgencyAgentInviteRegistration = lazy(() => import('./pages/AgencyAgentInviteRegistration'));
const PartnerRegistration = lazy(() => import('./pages/PartnerRegistration'));
const MyAds = lazy(() => import('./pages/MyAds'));
const About = lazy(() => import('./pages/About'));
const OurServices = lazy(() => import('./pages/OurServices'));
const ClientRegistration = lazy(() => import('./pages/ClientRegistration'));
const Careers = lazy(() => import('./pages/Careers'));
const Legal = lazy(() => import('./pages/Legal'));
const Privacy = lazy(() => import('./pages/Privacy'));
const AddListing = lazy(() => import('./pages/AddListing'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const Contact = lazy(() => import('./pages/Contact'));
const Vault = lazy(() => import('./pages/Vault'));
const Agents = lazy(() => import('./pages/Agents'));
const CRM = lazy(() => import('./pages/CRM'));
const SellerCMAReport = lazy(() => import('./pages/SellerCMAReport'));
const ListingManagement = lazy(() => import('./pages/ListingManagement'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const News = lazy(() => import('./pages/News'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminMarketing = lazy(() => import('./pages/AdminMarketing'));
const EnterpriseRegistration = lazy(() => import('./pages/EnterpriseRegistration'));
const EnterpriseDashboard = lazy(() => import('./pages/EnterpriseDashboard'));
const EnterpriseAgencies = lazy(() => import('./pages/EnterpriseAgencies'));
const EnterpriseInvites = lazy(() => import('./pages/EnterpriseInvites'));
const EnterprisePerformance = lazy(() => import('./pages/EnterprisePerformance'));
const EnterprisePortalSyndication = lazy(() => import('./pages/EnterprisePortalSyndication'));
const OutstandOAuthCallback = lazy(() => import('./pages/OutstandOAuthCallback'));
const ConveyancerDashboard = lazy(() => import('./pages/ConveyancerDashboard'));
const BondOriginatorDashboard = lazy(() => import('./pages/BondOriginatorDashboard'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const SeedDatabase = lazy(() => import('./pages/SeedDatabase'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const RegistrationSuccess = lazy(() => import('./pages/RegistrationSuccess'));

// Minimal loading fallback for lazy-loaded routes
const PageLoader = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LogoLoading message="Loading..." style={{ minHeight: '60vh' }} />
    </div>
);

// Roles that require a completed subscription (plan selected + payment where applicable) before using the app
const SUBSCRIPTION_REQUIRED_ROLES = ['buyer', 'seller', 'investor', 'agency', 'independent_agent', 'agent'];
// When subscription is incomplete, allow settings + auth flows AND all dashboard routes so sidebar nav works (user can still see a banner to complete payment)
const DASHBOARD_PATHS = ['/dashboard', '/portfolio', '/saved', '/vault', '/agency-dashboard', '/agent-dashboard', '/listing-management', '/agents', '/crm', '/marketing', '/admin', '/add-listing', '/news', '/my-ads', '/enterprise/agencies', '/enterprise/invites', '/enterprise-dashboard', '/bond-originator', '/conveyancer'];
const ALLOWED_WHEN_INCOMPLETE = ['/settings', '/client-signup', '/agency-signup', '/independent-agent-signup', '/registration/success', '/login', ...DASHBOARD_PATHS];

/** Local-only: set in client/.env.development.local — pairs with server DEV_BYPASS_AUTH */
const REACT_DEV_BYPASS_AUTH = process.env.REACT_APP_DEV_BYPASS_AUTH === 'true';

function isSubscriptionIncomplete(user) {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    if (!SUBSCRIPTION_REQUIRED_ROLES.includes(role)) return false;
    // agency_agent: often no plan on user (agency pays); allow through
    if (role === 'agency_agent') return false;
    const hasStripe = !!user.stripeSubscriptionId;
    if (hasStripe) return false;
    const plan = (user.subscriptionPlan || '').trim();
    const status = (user.subscriptionStatus || '').toLowerCase();
    const pendingPayment = status === 'pending_payment';
    if (!plan || plan === '—') return true;
    if (pendingPayment) return true;
    return false;
}

// 1. Protected Route
const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const path = location.pathname || '';
    const [devBypassReady, setDevBypassReady] = useState(() => {
        if (!REACT_DEV_BYPASS_AUTH) return true;
        try {
            const u = JSON.parse(localStorage.getItem('user') || 'null');
            return !!(u && u.token === '__IPM_DEV_BYPASS__' && u._id);
        } catch {
            return false;
        }
    });
    const [devBypassError, setDevBypassError] = useState(null);

    useEffect(() => {
        if (!REACT_DEV_BYPASS_AUTH || devBypassReady) return undefined;
        let cancelled = false;
        fetch('/api/auth/dev-whoami')
            .then(async (r) => {
                const text = await r.text();
                let data = null;
                if (text) {
                    try {
                        data = JSON.parse(text);
                    } catch {
                        throw new Error(
                            `Non-JSON response (${r.status}). Is the API running on port 5001 and the client proxy correct? Body: ${text.slice(0, 120)}`
                        );
                    }
                }
                return { ok: r.ok, data, status: r.status };
            })
            .then(({ ok, data, status }) => {
                if (cancelled) return;
                if (!ok || !data || !data._id) {
                    throw new Error(
                        data?.message ||
                            (status === 404
                                ? 'Dev bypass disabled on API (add DEV_BYPASS_AUTH=true to .env and restart).'
                                : `Dev bypass failed (HTTP ${status})`)
                    );
                }
                localStorage.setItem('user', JSON.stringify(data));
                setDevBypassReady(true);
            })
            .catch((e) => {
                if (!cancelled) setDevBypassError(e.message || 'Dev bypass failed');
            });
        return () => {
            cancelled = true;
        };
    }, [devBypassReady]);

    if (REACT_DEV_BYPASS_AUTH && devBypassError) {
        return (
            <div style={{ padding: 40, maxWidth: 480, margin: '0 auto', fontFamily: 'system-ui' }}>
                <h1 style={{ fontSize: 20 }}>Dev bypass failed</h1>
                <p style={{ color: '#64748b' }}>{devBypassError}</p>
                <p style={{ fontSize: 14, color: '#94a3b8' }}>
                    Add <code>DEV_BYPASS_AUTH=true</code> to your API <code>.env</code>, restart the server, and ensure
                    MongoDB has at least one user with role <code>agency</code> (or set <code>DEV_BYPASS_AGENCY_ID</code>
                    ).
                </p>
            </div>
        );
    }

    if (REACT_DEV_BYPASS_AUTH && !devBypassReady) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <LogoLoading message="Dev bypass: loading test agency…" style={{ minHeight: '40vh' }} />
            </div>
        );
    }

    const userStr = localStorage.getItem('user');
    const user = userStr ? (() => { try { return JSON.parse(userStr); } catch (_) { return null; } })() : null;
    if (!user) return <Navigate to="/login" />;
    const skipSubscriptionGate = REACT_DEV_BYPASS_AUTH && user.token === '__IPM_DEV_BYPASS__';
    if (
        !skipSubscriptionGate &&
        isSubscriptionIncomplete(user) &&
        !ALLOWED_WHEN_INCOMPLETE.some((p) => path === p || path.startsWith(p + '?') || path.startsWith(p + '/'))
    ) {
        return <Navigate to="/settings?tab=subscription" replace />;
    }
    return children;
};

// 2. The Layout Component (Navbar + Footer)
const LayoutInner = ({ children }) => {
    const location = useLocation();
    const { NotificationContainer } = useNotification();
    const { t } = useTranslation();
    const { setMobileOpen } = useSidebar();
    
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [navSearchQuery, setNavSearchQuery] = useState('');
    const [leadSearchResults, setLeadSearchResults] = useState([]);
    const [leadSearchMessage, setLeadSearchMessage] = useState('');
    const [leadSearchSmartMatchError, setLeadSearchSmartMatchError] = useState('');
    const [leadSearchError, setLeadSearchError] = useState('');
    const [leadSearchLoading, setLeadSearchLoading] = useState(false);
    const [showLeadSearchPopup, setShowLeadSearchPopup] = useState(false);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(() => hasAnalyticsConsent());
    
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    const handleLogout = () => {
        localStorage.removeItem('user');
        window.location.href = '/'; 
    };

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
        setShowUserMenu(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleConsentChanged = (event) => {
            const nextValue = event?.detail?.value === 'accepted';
            setAnalyticsEnabled(nextValue);
        };
        window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChanged);
        return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChanged);
    }, []);

    // Hide nav + footer only on auth/registration full-screen flows
    const hideNav = ['/login', '/signup', '/forgot-password', '/agency-signup', '/enterprise-signup', '/independent-agent-signup', '/agency-agent-invite', '/client-signup', '/partner-signup'];
    const showPublicLayout = !hideNav.includes(location.pathname);

    // Dashboard-style pages: show solid top nav in flow (no overlay); sidebar starts below nav
    const dashboardLayoutPaths = ['/dashboard', '/portfolio', '/saved', '/vault', '/agency-dashboard', '/agent-dashboard', '/listing-management', '/agents', '/crm', '/crm/cma-report', '/settings', '/add-listing', '/marketing', '/admin', '/admin/marketing', '/news', '/enterprise/agencies', '/enterprise/invites', '/enterprise/performance', '/enterprise/royalty-engine', '/enterprise/syndication', '/enterprise-dashboard', '/enterprise/performance-country', '/enterprise/performance-franchise', '/enterprise/performance-branch', '/enterprise/compliance-report', '/enterprise/portal-syndication', '/enterprise/marketing', '/enterprise/vault', '/bond-originator', '/bond-originator-dashboard', '/conveyancer', '/partner-dashboard'];
    const isDashboardLayout = dashboardLayoutPaths.includes(location.pathname) || location.pathname.startsWith('/bond-originator') || location.pathname.startsWith('/conveyancer') || location.pathname.startsWith('/partner/') || location.pathname.startsWith('/enterprise/');
    // Home, Services, Pricing: same fixed landing bar + same layout shell as home/services (layout-home).
    const isLandingNav = ['/', '/our-services', '/pricing'].includes(location.pathname);
    const isLayoutHome = ['/', '/our-services', '/pricing'].includes(location.pathname);
    const navClass = showPublicLayout ? (isLandingNav ? 'news-nav news-nav--landing' : 'news-nav news-nav--hero') : 'news-nav news-nav--solid';
    const isAgentOrAgency = user && ['agency', 'agency_agent', 'independent_agent', 'agent'].includes(String(user.role).toLowerCase());

    const handleLeadSearch = (e) => {
        e.preventDefault();
        const q = navSearchQuery.trim();
        if (!q || !user?._id) return;
        setLeadSearchLoading(true);
        setShowLeadSearchPopup(true);
        setLeadSearchResults([]);
        setLeadSearchMessage('');
        setLeadSearchError('');
        setLeadSearchSmartMatchError('');
        api.get('/api/properties/search-for-leads', { params: { q, userId: user._id, _: Date.now() } })
            .then((res) => {
                setLeadSearchResults(res.data.results || []);
                setLeadSearchMessage(res.data.message || '');
                setLeadSearchSmartMatchError(res.data.smartMatchError || '');
                setLeadSearchError('');
                setLeadSearchLoading(false);
            })
            .catch((err) => {
                const msg = err.response?.data?.error || err.message || 'Search failed. Please try again.';
                setLeadSearchResults([]);
                setLeadSearchMessage('');
                setLeadSearchSmartMatchError('');
                setLeadSearchError(msg);
                setLeadSearchLoading(false);
            });
    };

    return (
        <>
            <NotificationContainer />
            <CookieConsent />
            {analyticsEnabled && <SpeedInsights />}
            {/* Split dashboard top bar (teal brand strip + white actions) — all dashboard routes */}
            {isDashboardLayout && user && (
                <DashboardSplitTopBar
                    user={user}
                    searchValue={navSearchQuery}
                    onSearchChange={setNavSearchQuery}
                    onLeadSearchSubmit={handleLeadSearch}
                    isAgentOrAgency={!!isAgentOrAgency}
                />
            )}

            {/* --- NAVBAR (hidden for dashboard layouts — they use DashboardSplitTopBar) --- */}
            {showPublicLayout && !isDashboardLayout && (
                <nav className={navClass}>
                    {isLandingNav ? (
                        <div className="nav-landing-inner">
                            <div className="nav-landing-brand">
                                <Link to="/" className="nav-landing-logo-link">
                                    <img src="/logo-white.png" alt="IPM" className="nav-landing-logo-img" />
                                    <span className="logo-text-white">IPM</span>
                                </Link>
                            </div>
                            <div className="nav-landing-center" aria-label="Main navigation">
                                <Link
                                    to="/"
                                    className={[
                                        'nav-landing-link',
                                        location.pathname === '/' ? 'nav-landing-link--active' : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                    aria-current={location.pathname === '/' ? 'page' : undefined}
                                >
                                    {t('nav.home')}
                                </Link>
                                <Link
                                    to="/our-services"
                                    className={[
                                        'nav-landing-link',
                                        location.pathname === '/our-services' ? 'nav-landing-link--active' : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                    aria-current={location.pathname === '/our-services' ? 'page' : undefined}
                                >
                                    Services
                                </Link>
                                <Link
                                    to="/pricing"
                                    className={[
                                        'nav-landing-link',
                                        location.pathname === '/pricing' ? 'nav-landing-link--active' : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                    aria-current={location.pathname === '/pricing' ? 'page' : undefined}
                                >
                                    Pricing
                                </Link>
                                <Link
                                    to="/our-services#services-section-agent"
                                    className="nav-landing-link"
                                >
                                    {t('nav.ipmAcademy')}
                                </Link>
                                {user && (
                                    <Link to="/news" className="nav-landing-link">
                                        {t('nav.myIpmNews')}
                                    </Link>
                                )}
                            </div>
                            <div className="nav-landing-trailing">
                                {user && <NavSettingsDropdown />}
                                {user ? (
                                    <div
                                        className="user-dropdown-wrapper"
                                        style={{ position: 'relative' }}
                                        onMouseEnter={() => setShowUserMenu(true)}
                                        onMouseLeave={() => setShowUserMenu(false)}
                                    >
                                        <div className="user-profile-pill" role="button" aria-haspopup="true" aria-expanded={showUserMenu}>
                                            <div className="user-avatar-circle">
                                                {user.name && user.name.charAt ? user.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <span className="user-name-text">{user.name || 'User'}</span>
                                            <i className={`fas fa-chevron-down ${showUserMenu ? 'fa-rotate-180' : ''}`} style={{ fontSize: '12px', transition: '0.3s' }}></i>
                                        </div>
                                        {showUserMenu && (
                                            <div className="user-dropdown-menu">
                                                <Link
                                                    to={user && user.role && (user.role.toLowerCase() === 'agent' || user.role.toLowerCase() === 'independent_agent' || user.role.toLowerCase() === 'agency_agent') ? '/agent-dashboard' : '/dashboard'}
                                                    className="dropdown-item"
                                                >
                                                    <i className="fas fa-columns"></i> {t('nav.dashboard')}
                                                </Link>
                                                <Link to="/settings" className="dropdown-item">
                                                    <i className="fas fa-cog"></i> {t('nav.settings')}
                                                </Link>
                                                <div className="dropdown-divider"></div>
                                                <button onClick={handleLogout} className="dropdown-item logout-item">
                                                    <i className="fas fa-sign-out-alt"></i> {t('nav.logout')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <Link to="/signup" className="nav-landing-btn-signup">
                                            {t('nav.signUp')}
                                        </Link>
                                        <Link to="/login" className="nav-landing-btn-myipm">
                                            myIPM <span aria-hidden>→</span>
                                        </Link>
                                    </>
                                )}
                                <button
                                    type="button"
                                    className="nav-mobile-toggle"
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                                >
                                    <i className={mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'} />
                                </button>
                            </div>
                        </div>
                    ) : (
                    <>
                    {/* LEFT: Hamburger (mobile, dashboard only) + Logo + IPM */}
                    <div className="nav-left" style={{ display: 'flex', alignItems: 'center' }}>
                        {isDashboardLayout && (
                            <button
                                type="button"
                                className="sidebar-hamburger"
                                onClick={() => setMobileOpen(true)}
                                aria-label="Open sidebar"
                            >
                                <i className="fas fa-bars" />
                            </button>
                        )}
                        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            <>
                                <img src="/logo-white.png" alt="IPM" className="nav-logo-img" />
                                <div className="logo-text-white">IPM</div>
                            </>
                        </Link>
                    </div>

                    {/* CENTER (logged in only, never on landing page): Search bar (active for agents/agencies) + icons */}
                    {user && !isLandingNav && (
                        <div className="nav-center-logged" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', maxWidth: '560px', margin: '0 24px', justifyContent: 'center' }}>
                            {isAgentOrAgency ? (
                                <form onSubmit={handleLeadSearch} style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: '400px', height: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', padding: '0 14px', gap: '10px' }}>
                                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#0d9488', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className="fas fa-search" style={{ color: 'white', fontSize: 12 }} />
                                    </span>
                                    <input
                                        type="text"
                                        value={navSearchQuery}
                                        onChange={(e) => setNavSearchQuery(e.target.value)}
                                        placeholder="Find properties for your leads"
                                        aria-label="Search properties for your leads"
                                        style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: '#fff', fontSize: 14, outline: 'none' }}
                                    />
                                </form>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: '400px', height: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', padding: '0 14px', opacity: 0.85, pointerEvents: 'none', cursor: 'default' }}>
                                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#0d9488', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>
                                        <i className="fas fa-search" style={{ color: 'white', fontSize: 12 }} />
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Describe your ideal next investment</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <span className="nav-icon-circle nav-icon-circle--teal" title="Voice search" aria-hidden><i className="fas fa-microphone" /></span>
                                <span className="nav-icon-circle nav-icon-circle--orange" title="Map" aria-hidden><i className="fas fa-map" /></span>
                                <span className="nav-icon-circle nav-icon-circle--muted" title="Notifications" aria-hidden><i className="fas fa-bell" /></span>
                                <span className="nav-icon-circle nav-icon-circle--muted" title="Messages" aria-hidden><i className="far fa-envelope" /></span>
                            </div>
                        </div>
                    )}

                    {/* RIGHT: Desktop actions + Mobile hamburger */}
                    <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {user && <NavSettingsDropdown />}
                        {!isLandingNav && (
                            <>
                                <Link to="/our-services" className="btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fas fa-briefcase"></i> Our Services
                                </Link>
                                {user && (
                                    <Link to="/news" className="btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="far fa-newspaper"></i> {t('nav.myIpmNews')}
                                    </Link>
                                )}
                            </>
                        )}

                        <Link to="/new-developments" className="btn-outline" style={{ display: 'none', textDecoration: 'none', alignItems: 'center', gap: '8px' }}>
                            <i className="far fa-building"></i> {t('nav.newProperties')}
                        </Link>

                        {/* USER PROFILE DROPDOWN (desktop): hover to open, leave to close */}
                        {user ? (
                            <div
                                className="user-dropdown-wrapper"
                                style={{ position: 'relative' }}
                                onMouseEnter={() => setShowUserMenu(true)}
                                onMouseLeave={() => setShowUserMenu(false)}
                            >
                                <div className="user-profile-pill" role="button" aria-haspopup="true" aria-expanded={showUserMenu}>
                                    <div className="user-avatar-circle">
                                        {user.name && user.name.charAt ? user.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <span className="user-name-text">{user.name || 'User'}</span>
                                    <i className={`fas fa-chevron-down ${showUserMenu ? 'fa-rotate-180' : ''}`} style={{ fontSize: '12px', transition: '0.3s' }}></i>
                                </div>

                                {showUserMenu && (
                                    <div className="user-dropdown-menu">
                                        <Link
                                            to={user && user.role && (user.role.toLowerCase() === 'agent' || user.role.toLowerCase() === 'independent_agent' || user.role.toLowerCase() === 'agency_agent') ? '/agent-dashboard' : '/dashboard'}
                                            className="dropdown-item"
                                        >
                                            <i className="fas fa-columns"></i> {t('nav.dashboard')}
                                        </Link>
                                        <Link to="/settings" className="dropdown-item">
                                            <i className="fas fa-cog"></i> {t('nav.settings')}
                                        </Link>
                                        <div className="dropdown-divider"></div>
                                        <button onClick={handleLogout} className="dropdown-item logout-item">
                                            <i className="fas fa-sign-out-alt"></i> {t('nav.logout')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <i className="fas fa-sign-in-alt"></i> {t('nav.logIn')}
                                </Link>
                                <Link to="/signup" className="btn-filled" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {t('nav.signUp')}
                                </Link>
                            </>
                        )}

                        {/* Mobile hamburger toggle (shown via CSS on small screens) */}
                        <button
                            type="button"
                            className="nav-mobile-toggle"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        >
                            <i className={mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'} />
                        </button>
                    </div>
                    </>
                    )}
                </nav>
            )}

            {/* Lead search results popup (agents/agencies) */}
            {showLeadSearchPopup && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Property search results"
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '80px', padding: '80px 16px 24px' }}
                    onClick={() => setShowLeadSearchPopup(false)}
                >
                    <div
                        style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxWidth: '520px', width: '100%', maxHeight: 'calc(100vh - 120px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#11575C' }}>Properties for your search</h3>
                            <button type="button" onClick={() => setShowLeadSearchPopup(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' }} aria-label="Close"><i className="fas fa-times" /></button>
                        </div>
                        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
                            {leadSearchLoading ? (
                                <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 8 }} /> Searching your listings…</p>
                            ) : leadSearchResults.length === 0 ? (
                                <>
                                    {leadSearchError && (
                                        <p style={{ margin: '0 0 12px 0', padding: '10px 12px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#b91c1c' }}>{leadSearchError}</p>
                                    )}
                                    {!leadSearchError && <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>No matching properties. Try different keywords.</p>}
                                </>
                            ) : (
                                <>
                                    {leadSearchSmartMatchError && (
                                        <p style={{ margin: '0 0 12px 0', padding: '12px 14px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#b91c1c', border: '1px solid #fecaca' }}>
                                            <strong>Smart matching failed — error:</strong><br />
                                            <span style={{ wordBreak: 'break-word' }}>{leadSearchSmartMatchError}</span>
                                        </p>
                                    )}
                                    {leadSearchError && !leadSearchSmartMatchError && (
                                        <p style={{ margin: '0 0 12px 0', padding: '10px 12px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#b91c1c' }}>{leadSearchError}</p>
                                    )}
                                    {leadSearchMessage && (
                                        <p style={{ margin: '0 0 12px 0', padding: '8px 12px', background: '#f0fdfa', borderRadius: 8, fontSize: 12, color: '#0f766e' }}>{leadSearchMessage}</p>
                                    )}
                                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                    {leadSearchResults.map((r, i) => {
                                        const p = r.property || r;
                                        const score = typeof r.score === 'number' ? r.score : null;
                                        const reason = (r.reason && String(r.reason).trim()) || null;
                                        return (
                                            <li key={p._id || i} style={{ marginBottom: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, marginBottom: 4 }}>{p.title || 'Untitled'}</div>
                                                        <div style={{ fontSize: 12, color: '#64748b' }}>{p.location || p.price || ''}</div>
                                                        {reason && <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>{reason}</div>}
                                                    </div>
                                                    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#11575C', background: 'rgba(17,87,92,0.12)', padding: '4px 8px', borderRadius: '8px' }}>{score != null ? `${score}% match` : '—'}</span>
                                                </div>
                                                <Link to={{ pathname: `/property/${p._id}`, state: { fromSearch: true, searchMatch: { score: score ?? undefined, reason: reason ?? undefined } } }} style={{ display: 'inline-block', marginTop: 8, fontSize: 13, fontWeight: 600, color: '#11575C', textDecoration: 'none' }} onClick={() => setShowLeadSearchPopup(false)}>View property →</Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile nav menu overlay (public pages, not dashboard) */}
            {showPublicLayout && !isDashboardLayout && (
                <div className={`nav-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
                    {user && <NavSettingsDropdown />}
                    {user ? (
                        <>
                            <Link to={user.role && (user.role.toLowerCase() === 'agent' || user.role.toLowerCase() === 'independent_agent' || user.role.toLowerCase() === 'agency_agent') ? '/agent-dashboard' : '/dashboard'}>
                                <i className="fas fa-columns"></i> {t('nav.dashboard')}
                            </Link>
                            <Link to="/settings">
                                <i className="fas fa-cog"></i> {t('nav.settings')}
                            </Link>
                            <Link to="/">
                                <i className="fas fa-home"></i> {t('nav.home')}
                            </Link>
                            <Link to="/our-services">
                                <i className="fas fa-briefcase"></i> Our Services
                            </Link>
                            <Link to="/pricing">
                                <i className="fas fa-tag"></i> Pricing
                            </Link>
                            <Link to="/our-services#services-section-agent">
                                <i className="fas fa-graduation-cap"></i> {t('nav.ipmAcademy')}
                            </Link>
                            <Link to="/news">
                                <i className="far fa-newspaper"></i> {t('nav.myIpmNews')}
                            </Link>
                            <div className="mobile-menu-divider" />
                            <button onClick={handleLogout}>
                                <i className="fas fa-sign-out-alt"></i> {t('nav.logout')}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/">
                                <i className="fas fa-home"></i> {t('nav.home')}
                            </Link>
                            <Link to="/our-services">
                                <i className="fas fa-briefcase"></i> Our Services
                            </Link>
                            <Link to="/pricing">
                                <i className="fas fa-tag"></i> Pricing
                            </Link>
                            <Link to="/our-services#services-section-agent">
                                <i className="fas fa-graduation-cap"></i> {t('nav.ipmAcademy')}
                            </Link>
                            <Link to="/login">
                                <i className="fas fa-sign-in-alt"></i> {t('nav.logIn')}
                            </Link>
                            <Link to="/signup">
                                <i className="fas fa-user-plus"></i> {t('nav.signUp')}
                            </Link>
                        </>
                    )}
                </div>
            )}

            {/* --- PAGE CONTENT (wrapper for dashboard layout so sidebar sits below nav) --- */}
            <div className={[
                'layout-content',
                isDashboardLayout ? 'layout-dashboard-shell' : '',
                showPublicLayout && !isDashboardLayout ? 'layout-with-nav' : '',
                isLayoutHome ? 'layout-home' : '',
            ].filter(Boolean).join(' ')}>
                {children}
            </div>

            {isDashboardLayout && <GuidedTour />}
            <MobileFAB />
        </>
    );
};

const Layout = ({ children }) => {
    const location = useLocation();
    const dashboardLayoutPaths = ['/dashboard', '/portfolio', '/saved', '/vault', '/agency-dashboard', '/agent-dashboard', '/listing-management', '/agents', '/crm', '/crm/cma-report', '/settings', '/add-listing', '/marketing', '/admin', '/admin/marketing', '/news', '/enterprise/agencies', '/enterprise/invites', '/enterprise/performance', '/enterprise/royalty-engine', '/enterprise/syndication', '/enterprise-dashboard', '/enterprise/performance-country', '/enterprise/performance-franchise', '/enterprise/performance-branch', '/enterprise/compliance-report', '/enterprise/portal-syndication', '/enterprise/marketing', '/enterprise/vault', '/bond-originator', '/bond-originator-dashboard', '/conveyancer', '/partner-dashboard'];
    const isDashboardLayout = dashboardLayoutPaths.includes(location.pathname) || location.pathname.startsWith('/bond-originator') || location.pathname.startsWith('/conveyancer') || location.pathname.startsWith('/partner/') || location.pathname.startsWith('/enterprise/');
    const content = <LayoutInner>{children}</LayoutInner>;
    return isDashboardLayout ? <SidebarProvider>{content}</SidebarProvider> : content;
};

function App() {
  return (
    <Router>
        <PropdataImportProvider>
        <Layout>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/collection" element={<Collection />} />
                <Route path="/marketing" element={<ProtectedRoute><AdminMarketing /></ProtectedRoute>} />
                <Route path="/outstand/oauth-callback" element={<ProtectedRoute><OutstandOAuthCallback /></ProtectedRoute>} />
                <Route path="/new-developments" element={<NewDevelopments />} />
                <Route path="/about" element={<About />} />
                <Route path="/our-services" element={<OurServices />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/add-listing" element={<AddListing />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/news/:id" element={<NewsDetail />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/client-signup" element={<ClientRegistration />} />
                <Route path="/registration/success" element={<RegistrationSuccess />} />
                <Route path="/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
                <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
                <Route path="/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
                <Route path="/crm/cma-report" element={<ProtectedRoute><SellerCMAReport /></ProtectedRoute>} />
                <Route path="/agency-signup" element={<AgencyRegistration />} />
                <Route path="/enterprise-signup" element={<EnterpriseRegistration />} />

                {/* Enterprise routes */}
                <Route path="/enterprise-dashboard" element={<ProtectedRoute><EnterpriseDashboard activeTab="dashboard" /></ProtectedRoute>} />
                <Route path="/enterprise/performance-country" element={<ProtectedRoute><EnterpriseDashboard activeTab="country" /></ProtectedRoute>} />
                <Route path="/enterprise/performance-franchise" element={<ProtectedRoute><EnterpriseDashboard activeTab="franchise" /></ProtectedRoute>} />
                <Route path="/enterprise/performance-branch" element={<ProtectedRoute><EnterpriseDashboard activeTab="branch" /></ProtectedRoute>} />
                <Route path="/enterprise/royalty-engine" element={<ProtectedRoute><EnterpriseDashboard activeTab="royalty" /></ProtectedRoute>} />
                <Route path="/enterprise/compliance-report" element={<ProtectedRoute><EnterpriseDashboard activeTab="compliance" /></ProtectedRoute>} />
                <Route path="/enterprise/portal-syndication" element={<ProtectedRoute><EnterpriseDashboard activeTab="portal" /></ProtectedRoute>} />
                <Route path="/enterprise/marketing" element={<ProtectedRoute><EnterpriseDashboard activeTab="marketing" /></ProtectedRoute>} />
                <Route path="/enterprise/vault" element={<ProtectedRoute><EnterpriseDashboard activeTab="vault" /></ProtectedRoute>} />
                <Route path="/enterprise/agencies" element={<ProtectedRoute><EnterpriseAgencies /></ProtectedRoute>} />
                <Route path="/enterprise/invites" element={<ProtectedRoute><EnterpriseInvites /></ProtectedRoute>} />
                <Route path="/enterprise/performance" element={<ProtectedRoute><EnterprisePerformance /></ProtectedRoute>} />
                <Route path="/enterprise/syndication" element={<ProtectedRoute><EnterprisePortalSyndication /></ProtectedRoute>} />

                {/* Partner (Conveyancer) routes */}
                <Route path="/partner-dashboard" element={<ProtectedRoute><PartnerDashboard activeTab="dashboard" /></ProtectedRoute>} />
                <Route path="/partner/pipeline" element={<ProtectedRoute><PartnerDashboard activeTab="pipeline" /></ProtectedRoute>} />
                <Route path="/partner/crm" element={<ProtectedRoute><PartnerDashboard activeTab="crm" /></ProtectedRoute>} />
                <Route path="/partner/partners" element={<ProtectedRoute><PartnerDashboard activeTab="partners" /></ProtectedRoute>} />
                <Route path="/partner/vault" element={<ProtectedRoute><PartnerDashboard activeTab="vault" /></ProtectedRoute>} />
                <Route path="/partner/advertising" element={<ProtectedRoute><PartnerDashboard activeTab="advertising" /></ProtectedRoute>} />
                <Route path="/conveyancer" element={<ProtectedRoute><ConveyancerDashboard /></ProtectedRoute>} />
                <Route path="/conveyancer/*" element={<ProtectedRoute><ConveyancerDashboard /></ProtectedRoute>} />

                {/* Bond Originator routes */}
                <Route path="/bond-originator-dashboard" element={<ProtectedRoute><BondOriginatorDashboard activeTab="dashboard" /></ProtectedRoute>} />
                <Route path="/bond-originator/pipeline" element={<ProtectedRoute><BondOriginatorDashboard activeTab="pipeline" /></ProtectedRoute>} />
                <Route path="/bond-originator/crm" element={<ProtectedRoute><BondOriginatorDashboard activeTab="crm" /></ProtectedRoute>} />
                <Route path="/bond-originator/partners" element={<ProtectedRoute><BondOriginatorDashboard activeTab="partners" /></ProtectedRoute>} />
                <Route path="/bond-originator/vault" element={<ProtectedRoute><BondOriginatorDashboard activeTab="vault" /></ProtectedRoute>} />
                <Route path="/bond-originator/advertising" element={<ProtectedRoute><BondOriginatorDashboard activeTab="advertising" /></ProtectedRoute>} />
                <Route path="/bond-originator" element={<ProtectedRoute><BondOriginatorDashboard activeTab="dashboard" /></ProtectedRoute>} />
                <Route path="/bond-originator/*" element={<ProtectedRoute><BondOriginatorDashboard /></ProtectedRoute>} />

                {/* Legacy agency dashboard URL redirects to the main dashboard route below. */}
                <Route path="/agency-dashboard" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
                <Route path='/agent-dashboard' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/listing-management" element={<ProtectedRoute><ListingManagement /></ProtectedRoute>} />
                <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
                <Route path="/property/:id" element={<Property />} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/admin/marketing" element={<ProtectedRoute><AdminMarketing /></ProtectedRoute>} />
                <Route path="/independent-agent-signup" element={<IndependentAgentRegistration />} />
                <Route path="/agency-agent-invite" element={<AgencyAgentInviteRegistration />} />
                <Route path="/partner-signup" element={<PartnerRegistration />} />

                {/* Private Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/my-ads" element={<ProtectedRoute><MyAds /></ProtectedRoute>} />
                <Route path="/saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
                
                {/* Seed Database Route (Public) */}
                <Route path="/seed" element={<SeedDatabase />} />
            </Routes>
            </Suspense>
        </Layout>
        </PropdataImportProvider>
    </Router>
  );
}

export default App;