import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NavSettingsDropdown from './NavSettingsDropdown';

/**
 * Reusable Figma-style top navigation bar.
 *
 * Extracted from HomeLandingHeroFigma so other public pages (Services,
 * Pricing) can render the same bar with the same glassmorphism, logo,
 * routing, and mobile drawer.
 *
 * Props:
 *   darkMode (boolean, default false)
 *     When true, the bar renders in the "dark-text" variant (white-translucent
 *     glass background, IPM-green text and icons). The home hero passes
 *     `darkMode={scrollPastHero}` so the bar flips as the user scrolls past
 *     the video. Pages without a dark-photo hero (Services, Pricing) pass
 *     `darkMode` as `true` so the bar is immediately legible on white.
 */
function readUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function HomeFigmaTopbar({ darkMode = false }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [user, setUser] = useState(() => readUser());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const refreshUser = () => setUser(readUser());
    refreshUser();
    window.addEventListener('storage', refreshUser);
    window.addEventListener('focus', refreshUser);
    document.addEventListener('visibilitychange', refreshUser);
    return () => {
      window.removeEventListener('storage', refreshUser);
      window.removeEventListener('focus', refreshUser);
      document.removeEventListener('visibilitychange', refreshUser);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowUserMenu(false);
    setUser(readUser());
  }, [location.pathname, location.key]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const dashPath =
    user &&
    user.role &&
    ['agent', 'independent_agent', 'agency_agent'].includes(String(user.role).toLowerCase())
      ? '/agent-dashboard'
      : '/dashboard';

  const barLinkClass = (path, extra = '') => {
    const active = location.pathname === path;
    return ['home-figma__bar-link', active ? 'home-figma__bar-link--active' : '', extra]
      .filter(Boolean)
      .join(' ');
  };

  const DrawerSection = () => (
    <>
      {user && <NavSettingsDropdown />}
      {user ? (
        <>
          <Link to={dashPath} onClick={() => setMobileOpen(false)}>
            <i className="fas fa-columns" /> {t('nav.dashboard')}
          </Link>
          <Link to="/settings" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-cog" /> {t('nav.settings')}
          </Link>
          <Link to="/" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-home" /> {t('nav.home')}
          </Link>
          <Link to="/our-services" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-briefcase" /> Our Services
          </Link>
          <Link to="/pricing" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-tag" /> Pricing
          </Link>
          <Link to="/our-services#services-section-agent" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-graduation-cap" /> {t('nav.ipmAcademy')}
          </Link>
          <div className="mobile-menu-divider" />
          <button type="button" onClick={() => { handleLogout(); setMobileOpen(false); }}>
            <i className="fas fa-sign-out-alt" /> {t('nav.logout')}
          </button>
        </>
      ) : (
        <>
          <Link to="/" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-home" /> {t('nav.home')}
          </Link>
          <Link to="/our-services" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-briefcase" /> Our Services
          </Link>
          <Link to="/pricing" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-tag" /> Pricing
          </Link>
          <Link to="/our-services#services-section-agent" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-graduation-cap" /> {t('nav.ipmAcademy')}
          </Link>
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-sign-in-alt" /> {t('nav.logIn')}
          </Link>
          <Link to="/signup" onClick={() => setMobileOpen(false)}>
            <i className="fas fa-user-plus" /> {t('nav.signUp')}
          </Link>
        </>
      )}
    </>
  );

  return (
    <>
      <header className={`home-figma__topbar ${darkMode ? 'home-figma__topbar--dark' : ''}`}>
        <div className="home-figma__topbar-inner">
          <div className="home-figma__brand">
            <Link to="/" className="home-figma__logo-link" aria-label="IPM home">
              <img src="/logo-white.png" alt="" className="home-figma__logo-img" />
            </Link>
          </div>

          <div className="home-figma__topbar-end">
            <nav className="home-figma__bar-cluster" aria-label="Primary">
              <div className="home-figma__gear-slot">
                <NavSettingsDropdown />
              </div>

              <Link to="/our-services" className={barLinkClass('/our-services')}>
                Services
              </Link>
              <Link to="/pricing" className={barLinkClass('/pricing')}>
                Pricing
              </Link>

              {!user && (
                <Link to="/signup" className={barLinkClass('/signup')}>
                  SignUp
                </Link>
              )}

              {!user ? (
                <Link to="/login" className="home-figma__cta-myipm">
                  MyIPM
                </Link>
              ) : (
                <div
                  className="home-figma__user-wrap"
                  onMouseEnter={() => setShowUserMenu(true)}
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <button type="button" className="home-figma__user-pill" aria-expanded={showUserMenu}>
                    <span className="home-figma__avatar">
                      {user.name && user.name.charAt ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                    <span className="home-figma__user-name">{user.name || 'Account'}</span>
                    <i className={`fas fa-chevron-down ${showUserMenu ? 'fa-rotate-180' : ''}`} style={{ fontSize: 10 }} />
                  </button>
                  {showUserMenu && (
                    <div className="home-figma__dropdown">
                      <Link to={dashPath}>
                        <i className="fas fa-columns" /> {t('nav.dashboard')}
                      </Link>
                      <Link to="/settings">
                        <i className="fas fa-cog" /> {t('nav.settings')}
                      </Link>
                      <div className="mobile-menu-divider" style={{ margin: '4px 0' }} />
                      <button type="button" className="logout-item" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt" /> {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                className="home-figma__menu-toggle"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? (
                  <span className="home-figma__menu-close" aria-hidden />
                ) : (
                  <span className="home-figma__menu-bars" aria-hidden>
                    <span className="home-figma__menu-bar" />
                    <span className="home-figma__menu-bar" />
                    <span className="home-figma__menu-bar" />
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div
        className={`home-figma-drawer-overlay ${mobileOpen ? 'open' : ''}`}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />

      <div className={`home-figma-drawer ${mobileOpen ? 'open' : ''}`} role="dialog" aria-modal="true">
        <DrawerSection />
      </div>
    </>
  );
}
