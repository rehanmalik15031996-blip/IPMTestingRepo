import React, { useState, useRef, useEffect } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { languageOptions, currencyOptions, unitOptions } from '../i18n/translations';
import './NavSettingsDropdown.css';

export default function NavSettingsDropdown() {
  const [open, setOpen] = useState(false);
  const { language, currency, units, setLanguage, setCurrency, setUnits } = usePreferences();
  const { t } = useTranslation();
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="nav-settings-wrapper" ref={containerRef}>
      <button
        type="button"
        className="nav-settings-trigger"
        onClick={() => setOpen((o) => !o)}
        title={t('nav.preferences')}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <i className="fas fa-cog" aria-hidden="true"></i>
      </button>
      {open && (
        <div className="nav-settings-dropdown">
          <div className="nav-settings-section">
            <div className="nav-settings-label">{t('nav.language')}</div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="nav-settings-select"
            >
              {languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="nav-settings-divider" />
          <div className="nav-settings-section">
            <div className="nav-settings-label">{t('nav.currency')}</div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="nav-settings-select"
            >
              {currencyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="nav-settings-divider" />
          <div className="nav-settings-section">
            <div className="nav-settings-label">{t('nav.units')}</div>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="nav-settings-select"
            >
              {unitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
