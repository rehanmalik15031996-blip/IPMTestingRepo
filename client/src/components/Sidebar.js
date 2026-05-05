import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '../context/SidebarContext';
import FloatingBugsFeedback from './FloatingBugsFeedback';
import FloatingChat from './FloatingChat';
import { getDemoState, exitDemoMode } from './DemoModeBar';

const Sidebar = () => {
    const { mobileOpen, setMobileOpen } = useSidebar();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname === path ? 'active' : '';

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = () => {
        if (getDemoState()) {
            exitDemoMode();
            navigate('/admin');
            return;
        }
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const role = user?.role || 'investor';
    const partnerType = user?.partnerType || '';
    const userName = user?.name || 'Guest';
    const userInitial = userName && userName.charAt ? userName.charAt(0).toUpperCase() : 'U';
    const userPhoto = user?.photo || null;

    const roleDisplay = {
        investor: 'Buyer / Investor',
        buyer: 'Buyer / Investor',
        seller: 'Seller',
        tenant: 'Tenant',
        agency: 'Agency Manager',
        agent: 'Real Estate Agent',
        independent_agent: 'Independent Agent',
        agency_agent: 'Agency Agent',
        partner: partnerType === 'bond_originator' ? 'Bond Originator' : partnerType === 'conveyancer' ? 'Conveyancer' : 'Marketing Partner',
        enterprise: 'Enterprise',
    };

    const sidebarRoleLabel = () => roleDisplay[role] || role;

    const dashboardPath = (role === 'agent' || role === 'independent_agent' || role === 'agency_agent')
        ? '/agent-dashboard'
        : '/dashboard';

    const enterprisePerfPaths = ['/enterprise/performance-country', '/enterprise/performance-franchise', '/enterprise/performance-branch', '/enterprise/performance'];
    const enterprisePerfActive = enterprisePerfPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + '?')) || (location.pathname === '/enterprise/performance' && location.search.includes('view='));
    const [enterprisePerfOpen, setEnterprisePerfOpen] = useState(() => enterprisePerfActive);

    useEffect(() => {
        if (enterprisePerfActive) setEnterprisePerfOpen(true);
    }, [enterprisePerfActive]);

    return (
        <>
            {mobileOpen && (
                <div
                    className="sidebar-mobile-overlay"
                    onClick={() => setMobileOpen(false)}
                    onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
                    role="button"
                    tabIndex={0}
                    aria-label="Close menu"
                />
            )}
            <aside className={`sidebar-dark ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
                <button
                    type="button"
                    className="sidebar-close-btn"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                >
                    <i className="fas fa-times" />
                </button>

            {/* USER CARD / ENTERPRISE BRAND */}
            {role === 'enterprise' ? (
                <div className="sb-enterprise-brand">
                    <div className="sb-enterprise-logo">
                        <i className="fas fa-building" />
                    </div>
                    <div className="sb-enterprise-info">
                        <h4>{user?.agencyName || user?.name || 'Enterprise'}</h4>
                        <span>Enterprise</span>
                    </div>
                </div>
            ) : (
                <>
                    <div className="sb-user-card">
                        <div
                            className="sb-avatar-circle"
                            style={userPhoto ? { backgroundImage: `url(${userPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                        >
                            {!userPhoto && userInitial}
                        </div>
                        <div className="sb-user-info">
                            <h4>{userName}</h4>
                            <span>{sidebarRoleLabel()}</span>
                        </div>
                    </div>
                    {/* Tier + IPM Score are agent-level KPIs — hide for agency principals
                        until we have an agency-wide score. Still shown for everyone else. */}
                    {role !== 'agency' && (
                        <div className="sb-stat-pills">
                            <div className="sb-stat-pill">
                                <span className="sb-stat-label">Tier:</span>
                                <span className="sb-stat-value">{user?.agentTier || user?.subscriptionTier || user?.subscriptionPlan || '—'}</span>
                            </div>
                            <div className="sb-stat-pill">
                                <span className="sb-stat-label">IPM Score:</span>
                                <span className="sb-stat-value">{user?.agentScore != null ? String(user.agentScore) : (user?.ipmScore != null && user?.ipmScore !== '' ? String(user.ipmScore) : '—')}</span>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* NAVIGATION */}
            <nav className="sb-nav">

                {/* PARTNER: Bond Originator */}
                {role === 'partner' && partnerType === 'bond_originator' && (
                    <>
                        <Link to="/bond-originator" className={`sb-link ${isActive('/bond-originator')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-home"></i> My Dashboard
                        </Link>
                        <Link to="/bond-originator/pipeline" className={`sb-link ${isActive('/bond-originator/pipeline')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-stream"></i> Pipeline
                        </Link>
                        <Link to="/bond-originator/crm" className={`sb-link ${isActive('/bond-originator/crm')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-address-book"></i> CRM
                        </Link>
                        <Link to="/bond-originator/partners" className={`sb-link ${isActive('/bond-originator/partners')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-handshake"></i> IPM Partners
                        </Link>
                        <Link to="/bond-originator/vault" className={`sb-link ${isActive('/bond-originator/vault')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-lock"></i> {t('sidebar.myVault')}
                        </Link>
                        <Link to="/marketing" className={`sb-link ${isActive('/marketing')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-bullhorn"></i> {t('sidebar.marketing')}
                        </Link>
                    </>
                )}

                {/* PARTNER: Conveyancer */}
                {role === 'partner' && partnerType === 'conveyancer' && (
                    <>
                        <Link to="/conveyancer" className={`sb-link ${isActive('/conveyancer')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-home"></i> My Dashboard
                        </Link>
                        <Link to="/conveyancer/pipeline" className={`sb-link ${isActive('/conveyancer/pipeline')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-stream"></i> Pipeline
                        </Link>
                        <Link to="/conveyancer/crm" className={`sb-link ${isActive('/conveyancer/crm')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-address-book"></i> CRM
                        </Link>
                        <Link to="/conveyancer/partners" className={`sb-link ${isActive('/conveyancer/partners')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-handshake"></i> IPM Partners
                        </Link>
                        <Link to="/conveyancer/vault" className={`sb-link ${isActive('/conveyancer/vault')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-lock"></i> {t('sidebar.myVault')}
                        </Link>
                        <Link to="/marketing" className={`sb-link ${isActive('/marketing')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-bullhorn"></i> {t('sidebar.marketing')}
                        </Link>
                    </>
                )}

                {/* PARTNER: Marketing (not bond/conveyancer — those have it above) */}
                {role === 'partner' && partnerType !== 'bond_originator' && partnerType !== 'conveyancer' && (
                    <Link to="/marketing" className={`sb-link ${isActive('/marketing')}`} onClick={() => setMobileOpen(false)}>
                        <i className="fas fa-bullhorn"></i> {t('sidebar.marketing')}
                    </Link>
                )}

                {/* Dashboard (all except tenant and partner) */}
                {role !== 'tenant' && role !== 'partner' && (
                    <Link to={role === 'enterprise' ? '/enterprise-dashboard' : dashboardPath} className={`sb-link ${isActive(role === 'enterprise' ? '/enterprise-dashboard' : dashboardPath)}`} onClick={() => setMobileOpen(false)}>
                        <i className="fas fa-home"></i> {t('sidebar.myDashboard')}
                    </Link>
                )}

                {/* Admin: Marketing */}
                {role === 'admin' && (
                    <Link to="/admin/marketing" className={`sb-link ${isActive('/admin/marketing')}`} onClick={() => setMobileOpen(false)}>
                        <i className="fas fa-bullhorn"></i> Marketing
                    </Link>
                )}

                {/* INDEPENDENT AGENT & AGENCY AGENT — mirror the agency sidebar so
                    agents see the same tabs as their agency, just filtered to
                    their own listings / leads / deals. */}
                {(role === 'independent_agent' || role === 'agency_agent') && (
                    <>
                        <Link to="/prospecting" className={`sb-link ${isActive('/prospecting')}`} onClick={() => setMobileOpen(false)} data-tour="sidebar-prospecting">
                            <i className="fas fa-bullseye"></i> Prospecting
                        </Link>
                        <Link to="/listing-management" className={`sb-link ${isActive('/listing-management')}`} onClick={() => setMobileOpen(false)} data-tour="sidebar-listings">
                            <i className="fas fa-list"></i> {t('sidebar.listingManagement')}
                        </Link>
                        <Link to="/crm" className={`sb-link ${isActive('/crm')}`} onClick={() => setMobileOpen(false)} data-tour="sidebar-crm">
                            <i className="fas fa-address-book"></i> My CRM
                        </Link>
                        <Link to="/marketing" className={`sb-link ${isActive('/marketing')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-bullhorn"></i> {t('sidebar.marketing')}
                        </Link>
                        <Link to="/sales" className={`sb-link ${isActive('/sales')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-chart-line" style={{ opacity: 0.7 }}></i> Sales
                        </Link>
                    </>
                )}

                {/* TENANT */}
                {role === 'tenant' && (
                    <Link to="/saved" className={`sb-link ${isActive('/saved')}`} onClick={() => setMobileOpen(false)}>
                        <i className="fas fa-bookmark"></i> {t('sidebar.savedProperties')}
                    </Link>
                )}

                {/* BUYER, INVESTOR, SELLER */}
                {(role === 'investor' || role === 'buyer' || role === 'seller') && (
                    <>
                        <Link to="/portfolio" className={`sb-link ${isActive('/portfolio')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-folder"></i> {t('sidebar.myPortfolio')}
                        </Link>
                        <Link to="/saved" className={`sb-link ${isActive('/saved')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-bookmark"></i> {t('sidebar.savedProperties')}
                        </Link>
                    </>
                )}

                {/* AGENT (sole) */}
                {role === 'agent' && (
                    <>
                        <Link to="/portfolio" className={`sb-link ${isActive('/portfolio')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-folder"></i> {t('sidebar.myPortfolio')}
                        </Link>
                        <Link to="/marketing" className={`sb-link ${isActive('/marketing')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-bullhorn"></i> {t('sidebar.marketing')}
                        </Link>
                    </>
                )}

                {/* AGENCY LINKS */}
                {role === 'agency' && (
                    <>
                        <Link to="/prospecting" className={`sb-link ${isActive('/prospecting')}`} onClick={() => setMobileOpen(false)} data-tour="sidebar-prospecting">
                            <i className="fas fa-bullseye"></i> Prospecting
                        </Link>
                        <Link to="/listing-management" className={`sb-link ${isActive('/listing-management')}`} onClick={() => setMobileOpen(false)} data-tour="sidebar-listings">
                            <i className="fas fa-list"></i> {t('sidebar.listingManagement')}
                        </Link>
                        <Link to="/agents" className={`sb-link ${isActive('/agents')}`} onClick={() => setMobileOpen(false)} data-tour="sidebar-agents">
                            <i className="fas fa-users"></i> {t('sidebar.agents')}
                        </Link>
                        <Link to="/crm" className={`sb-link ${isActive('/crm')}`} onClick={() => setMobileOpen(false)} data-tour="sidebar-crm">
                            <i className="fas fa-address-book"></i> {t('sidebar.crm')}
                        </Link>
                        <Link to="/marketing" className={`sb-link ${isActive('/marketing')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-bullhorn"></i> {t('sidebar.marketing')}
                        </Link>
                    </>
                )}

                {/* Agency / franchise: sales pipeline (deals automatically appear here when a listing is set to "Under Negotiation") */}
                {role === 'agency' && (
                    <Link to="/sales" className={`sb-link ${isActive('/sales')}`} onClick={() => setMobileOpen(false)}>
                        <i className="fas fa-chart-line" style={{ opacity: 0.7 }}></i> Sales
                    </Link>
                )}

                {/* ENTERPRISE LINKS */}
                {role === 'enterprise' && (
                    <>
                        <Link to="/enterprise/agencies" className={`sb-link ${isActive('/enterprise/agencies')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-city"></i> Franchises &amp; Branches
                        </Link>
                        {/* Performance accordion */}
                        <div className="sb-enterprise-perf">
                            <button
                                type="button"
                                className={`sb-enterprise-perf-toggle${enterprisePerfOpen ? ' is-open' : ''}${enterprisePerfActive ? ' has-active-child' : ''}`}
                                aria-expanded={enterprisePerfOpen}
                                onClick={() => setEnterprisePerfOpen((o) => !o)}
                            >
                                <span>Performance by</span>
                                <i className="fas fa-chevron-down sb-enterprise-perf-chevron" aria-hidden />
                            </button>
                            {enterprisePerfOpen && (
                                <div className="sb-enterprise-perf-panel">
                                    <Link to="/enterprise/performance-country" className={`sb-link sb-enterprise-perf-sub ${location.pathname === '/enterprise/performance-country' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                                        <i className="fas fa-globe" /> Country
                                    </Link>
                                    <Link to="/enterprise/performance-franchise" className={`sb-link sb-enterprise-perf-sub ${location.pathname === '/enterprise/performance-franchise' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                                        <i className="fas fa-sitemap" /> Franchise
                                    </Link>
                                    <Link to="/enterprise/performance-branch" className={`sb-link sb-enterprise-perf-sub ${location.pathname === '/enterprise/performance-branch' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                                        <i className="fas fa-code-branch" /> Branch
                                    </Link>
                                </div>
                            )}
                        </div>
                        <Link to="/enterprise/royalty-engine" className={`sb-link ${isActive('/enterprise/royalty-engine')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-coins"></i> Royalty Engine
                        </Link>
                        <Link to="/enterprise/compliance-report" className={`sb-link ${isActive('/enterprise/compliance-report')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-shield-alt"></i> Compliance
                        </Link>
                        <Link to="/enterprise/portal-syndication" className={`sb-link ${isActive('/enterprise/portal-syndication')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-share-alt"></i> Portal Syndication
                        </Link>
                        <Link to="/enterprise/marketing" className={`sb-link ${isActive('/enterprise/marketing')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-bullhorn"></i> Marketing
                        </Link>
                        <Link to="/enterprise/vault" className={`sb-link ${isActive('/enterprise/vault')}`} onClick={() => setMobileOpen(false)}>
                            <i className="fas fa-lock"></i> Vault
                        </Link>
                    </>
                )}

                {/* Vault (All except Tenant, Partner, and Enterprise — enterprise has its own) */}
                {role !== 'tenant' && role !== 'partner' && role !== 'enterprise' && (
                    <Link to="/vault" className={`sb-link ${isActive('/vault')}`} onClick={() => setMobileOpen(false)}>
                        <i className="fas fa-lock"></i> {t('sidebar.myVault')}
                    </Link>
                )}

            </nav>

            {/* FOOTER */}
            <div className="sb-footer">
                <div className="sb-footer-icons" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Link to="/settings" className="sb-footer-icon-btn" title={t('sidebar.settings')} aria-label={t('sidebar.settings')} onClick={() => setMobileOpen(false)}>
                        <i className="fas fa-cog" />
                    </Link>
                    <FloatingBugsFeedback variant="sidebar" />
                    <FloatingChat variant="sidebar" />
                    <button
                        type="button"
                        className="sb-footer-icon-btn"
                        title={t('nav.logout')}
                        aria-label={t('nav.logout')}
                        onClick={() => setShowLogoutConfirm(true)}
                        style={{ color: '#E53E3E' }}
                    >
                        <i className="fas fa-sign-out-alt" />
                    </button>
                </div>
                {showLogoutConfirm && (
                    <>
                        <div onClick={() => setShowLogoutConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 9998 }} />
                        <div style={{
                            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            background: '#fff', borderRadius: 12, padding: '24px 28px', zIndex: 9999,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: 300, textAlign: 'center',
                            fontFamily: "'Poppins', sans-serif",
                        }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                                <i className="fas fa-sign-out-alt" style={{ fontSize: 20, color: '#E53E3E' }} />
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 6 }}>Log out?</div>
                            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: '19px' }}>Are you sure you want to log out of your account?</div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setShowLogoutConfirm(false)} style={{
                                    flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #D1D5DB',
                                    background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                }}>Cancel</button>
                                <button onClick={handleLogout} style={{
                                    flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                                    background: '#E53E3E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                }}>Log out</button>
                            </div>
                        </div>
                    </>
                )}
                <button
                    type="button"
                    className="sb-settings-link"
                    data-tour="how-to-trigger"
                    onClick={(e) => {
                        const evt = new CustomEvent('open-howto-menu', { detail: { anchor: e.currentTarget.getBoundingClientRect() } });
                        window.dispatchEvent(evt);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit' }}
                >
                    <i className="fas fa-question-circle"></i> How To
                </button>
            </div>
        </aside>
        </>
    );
};

export default Sidebar;
