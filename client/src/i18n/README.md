# Website translations (react-i18next)

The language selected in the **nav bar settings** (gear icon → Language) applies **automatically across the whole website** using **react-i18next**.

## How it works

- **i18n.js** initializes i18next with translations from `translations.js` and the stored language from localStorage.
- Changing the language in the nav dropdown calls `i18n.changeLanguage(lang)`, so every component using `useTranslation()` re-renders with the new language.
- **PreferencesContext** still stores language/currency/units and syncs language with i18next (setLanguage updates both).

## Current coverage

- **Nav bar**: IPM News, Log in, Sign Up, Dashboard, Settings, Logout, Preferences, Language, Currency, Units
- **Home**: Hero title, search placeholder, first 3 feature cards, stats labels, slide labels (Buyers / Investors / Sellers)
- **Footer**: Get in touch, intro text, form placeholders, Submit button
- **Collection, Saved, Property, Listing Management, New Developments**: Price/area/labels

## Adding more translations

1. Add the key and all language strings in `translations.js` (en, es, fr, ar).
2. In your component: `import { useTranslation } from 'react-i18next';` then `const { t } = useTranslation();` and use `t('your.key')` for the text.
