import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './i18n/translations';

const STORAGE_KEY = 'ipm_user_preferences';

function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.language) return parsed.language;
    }
  } catch (e) { /* ignore */ }
  return 'en';
}

const resources = {
  en: { translation: translations.en },
  es: { translation: translations.es },
  fr: { translation: translations.fr },
  ar: { translation: translations.ar },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });

// Keep i18n in sync with stored preferences when they change elsewhere (e.g. multiple tabs)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const p = JSON.parse(e.newValue);
        if (p.language && p.language !== i18n.language) i18n.changeLanguage(p.language);
      } catch (_) {}
    }
  });
}

export default i18n;
