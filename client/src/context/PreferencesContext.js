import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import i18n from 'i18next';
import api from '../config/api';

const STORAGE_KEY = 'ipm_user_preferences';

const defaultPrefs = {
  language: 'en',
  currency: 'USD',
  units: 'sqft',
  /** 'gross' = price is the price (e.g. Dubai); 'net' = tax/fees not included (e.g. Spain, US) */
  priceDisplayMode: 'gross',
};

// Exchange rates: 1 USD = this many units of the currency (e.g. 1 USD = 0.92 EUR). Approximate for display.
const CURRENCY_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CHF: 0.88,
  AED: 3.67,
  SAR: 3.75,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 149,
  CNY: 7.24,
  INR: 83,
  ZAR: 18.5,
  MXN: 17.1,
  BRL: 4.97,
  SGD: 1.34,
  HKD: 7.82,
};

/** Convert amount from source currency to target currency (via USD). */
export function convertCurrency(amount, fromCurrency, toCurrency) {
  const from = CURRENCY_RATES[fromCurrency] || 1;
  const to = CURRENCY_RATES[toCurrency] || 1;
  if (!amount || isNaN(amount)) return 0;
  return (Number(amount) / from) * to;
}

const RTL_LANGS = new Set(['ar', 'he', 'ur', 'fa']);

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [prefs, setPrefsState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultPrefs, ...parsed };
      }
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.preferences) {
        return { ...defaultPrefs, ...user.preferences, language: defaultPrefs.language };
      }
    } catch (e) { /* ignore */ }
    return defaultPrefs;
  });

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.preferences) {
        setPrefsState((p) => ({
          ...p,
          currency: user.preferences.currency || p.currency,
          units: user.preferences.units || p.units,
          priceDisplayMode: user.preferences.priceDisplayMode || p.priceDisplayMode,
        }));
      }
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) { /* ignore */ }
  }, [prefs]);

  const syncTimer = useRef(null);
  const persistToServer = useCallback((updated) => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user._id) return;
        const serverPrefs = { currency: updated.currency, units: updated.units, priceDisplayMode: updated.priceDisplayMode };
        api.put(`/api/users/${user._id}`, { preferences: serverPrefs }).then((res) => {
          if (res.data?.user) {
            const existing = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...existing, preferences: res.data.user.preferences }));
          }
        }).catch(() => {});
      } catch (e) { /* ignore */ }
    }, 800);
  }, []);

  const setLanguage = useCallback((lang) => {
    setPrefsState((p) => ({ ...p, language: lang }));
    i18n.changeLanguage(lang);
    // Apply RTL direction to the document for right-to-left languages
    if (typeof document !== 'undefined') {
      document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
    // Drive Google Translate via cookie + page reload — by far the most reliable approach.
    // Google's TranslateElement reads the googtrans cookie on initial load and translates
    // the entire DOM (including SPA re-renders later via MutationObserver). Trying to
    // trigger it via a `change` event on the hidden <select> is fragile and sometimes silently fails.
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const host = window.location.hostname;
        if (lang === 'en') {
          // Clear the Google Translate cookie so we go back to English on reload
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${host};`;
        } else {
          const GOOGLE_LANG_MAP = {
            zh: 'zh-CN', en: 'en', es: 'es', fr: 'fr', ar: 'ar',
            de: 'de', nl: 'nl', pt: 'pt', it: 'it', ja: 'ja',
            tr: 'tr', ru: 'ru', hi: 'hi',
          };
          const googleLang = GOOGLE_LANG_MAP[lang] || lang;
          document.cookie = `googtrans=/en/${googleLang}; path=/;`;
          document.cookie = `googtrans=/en/${googleLang}; path=/; domain=${host};`;
        }
        // One clean reload — Google Translate kicks in instantly on the next page load,
        // including all dashboards, signup flows, dynamic content, etc.
        window.location.reload();
      } catch (e) {
        // Fallback: at least try the in-page widget approach
        if (typeof window.__ipmApplyGoogleTranslate === 'function') {
          window.__ipmApplyGoogleTranslate(lang);
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setCurrency = useCallback((curr) => {
    setPrefsState((p) => {
      const next = { ...p, currency: curr };
      persistToServer(next);
      return next;
    });
  }, [persistToServer]);
  const setUnits = useCallback((u) => {
    setPrefsState((p) => {
      const next = { ...p, units: u };
      persistToServer(next);
      return next;
    });
  }, [persistToServer]);
  const setPriceDisplayMode = useCallback((mode) => {
    setPrefsState((p) => {
      const next = { ...p, priceDisplayMode: mode === 'net' ? 'net' : 'gross' };
      persistToServer(next);
      return next;
    });
  }, [persistToServer]);

  const lang = prefs.language || 'en';

  // Apply RTL direction on every language change (incl. first mount).
  // The Google Translate cookie set in setLanguage drives all DOM translation on subsequent
  // page loads via Google's TranslateElement, so no extra trigger is needed here.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const currency = prefs.currency || 'USD';
  const units = prefs.units || 'sqft';
  const priceDisplayMode = prefs.priceDisplayMode || 'gross';

  const getPriceValue = useCallback((priceStr) => {
    if (!priceStr) return 0;
    const str = String(priceStr).toLowerCase().split('|')[0];
    const multiplier = str.includes('m') ? 1000000 : str.includes('k') ? 1000 : 1;
    const val = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(val) ? 0 : val * multiplier;
  }, []);

  /**
   * @param {string|number} priceStrOrNumber
   * @param {{ fromCurrency?: string }} [opts] - Currency the amount is stored in (defaults USD). PropData listings use ZAR in pricing.currency.
   */
  const formatPrice = useCallback((priceStrOrNumber, opts = {}) => {
    const num = typeof priceStrOrNumber === 'number'
      ? priceStrOrNumber
      : getPriceValue(priceStrOrNumber);
    if (num === 0) return '—';
    const fromCurrency = opts.fromCurrency || 'USD';
    const converted = convertCurrency(num, fromCurrency, currency);
    const localeMap = {
      en: 'en-US', es: 'es-ES', fr: 'fr-FR', ar: 'ar-AE',
      de: 'de-DE', nl: 'nl-NL', pt: 'pt-PT', it: 'it-IT',
      zh: 'zh-CN', ja: 'ja-JP', tr: 'tr-TR', ru: 'ru-RU', hi: 'hi-IN',
    };
    const formatter = new Intl.NumberFormat(localeMap[lang] || 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(converted);
  }, [currency, lang, getPriceValue]);

  /**
   * @param {{ inputUnit?: 'sqft' | 'sqm', metric?: boolean }} [opts] - Pass inputUnit: 'sqm' when the number is already square metres (PropData import).
   */
  const formatArea = useCallback((value, opts = {}) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
    const inputIsSqm = opts.inputUnit === 'sqm' || opts.metric;
    if (inputIsSqm) {
      if (units === 'sqm') {
        return `${Math.round(num).toLocaleString()} ${i18n.t('common.sqm')}`;
      }
      const sqft = num * 10.764;
      return `${Math.round(sqft).toLocaleString()} ${i18n.t('common.sqft')}`;
    }
    if (units === 'sqm') {
      const sqm = num / 10.764;
      return `${Math.round(sqm).toLocaleString()} ${i18n.t('common.sqm')}`;
    }
    return `${Math.round(num).toLocaleString()} ${i18n.t('common.sqft')}`;
  }, [units]);

  /** Convert amount in source currency to user's preferred currency. */
  const convertToPreferredCurrency = useCallback((amount, fromCurrency) => {
    return convertCurrency(amount, fromCurrency || 'USD', currency);
  }, [currency]);

  /** Format a number (already in preferred currency) as compact asset value e.g. "USD 2.1M", "EUR 44.3K". */
  const formatAssetValueCompact = useCallback((valueInPreferredCurrency) => {
    const v = Number(valueInPreferredCurrency) || 0;
    if (v === 0) return '—';
    const cur = currency || 'USD';
    let compact = v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toLocaleString();
    return `${cur} ${compact}`;
  }, [currency]);

  /** When priceDisplayMode is 'net', return " (ex. tax)" for transparency; otherwise "". */
  const getPriceDisplaySuffix = useCallback(() => (priceDisplayMode === 'net' ? ' (ex. tax)' : ''), [priceDisplayMode]);

  const value = {
    language: lang,
    currency,
    units,
    priceDisplayMode,
    setLanguage,
    setCurrency,
    setUnits,
    setPriceDisplayMode,
    formatPrice,
    formatArea,
    getPriceValue,
    convertToPreferredCurrency,
    formatAssetValueCompact,
    getPriceDisplaySuffix,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
