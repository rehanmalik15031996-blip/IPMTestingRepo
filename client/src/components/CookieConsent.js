import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'ipm_cookie_consent';
const GA_ID = 'G-VESJC0EX65';
export const COOKIE_CONSENT_EVENT = 'ipm-cookie-consent-changed';
const CONSENT_ACCEPTED = 'accepted';
const CONSENT_REJECTED = 'rejected';

export function getCookieConsentChoice() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (_) {
    return null;
  }
}

export function hasAnalyticsConsent() {
  return getCookieConsentChoice() === CONSENT_ACCEPTED;
}

function notifyConsentChanged(value) {
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { value } }));
}

function clearAnalyticsCookies() {
  // Remove common analytics cookies for current domain and top-level domain.
  const domains = [window.location.hostname];
  const hostParts = window.location.hostname.split('.');
  if (hostParts.length > 2) {
    domains.push(`.${hostParts.slice(-2).join('.')}`);
  }
  const cookieNames = ['_ga', '_gid', '_gat', '_ga_VESJC0EX65'];
  for (const domain of domains) {
    for (const name of cookieNames) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}; SameSite=Lax`;
    }
  }
}

function loadGoogleAnalytics() {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getCookieConsentChoice();
    setMounted(true);
    if (stored === CONSENT_ACCEPTED) {
      loadGoogleAnalytics();
      setVisible(false);
    } else if (stored === CONSENT_REJECTED) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, CONSENT_ACCEPTED);
    loadGoogleAnalytics();
    notifyConsentChanged(CONSENT_ACCEPTED);
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(STORAGE_KEY, CONSENT_REJECTED);
    clearAnalyticsCookies();
    notifyConsentChanged(CONSENT_REJECTED);
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#1f3a3d',
        color: '#fff',
        padding: '16px 20px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
        zIndex: 10000,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        fontFamily: "'Inter', sans-serif",
        fontSize: '14px',
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0, flex: '1 1 280px', maxWidth: '560px' }}>
        We only use essential cookies by default. Optional analytics cookies are enabled only if you accept. You can reject non-essential cookies and still use the website. See our{' '}
        <Link to="/privacy" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>
          Privacy Policy
        </Link>
        .
      </p>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={reject}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reject non-essential
        </button>
        <button
          type="button"
          onClick={accept}
          style={{
            padding: '10px 18px',
            background: '#11575C',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Accept analytics
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
