import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { PreferencesProvider } from './context/PreferencesContext';
import { HelmetProvider } from 'react-helmet-async';
import reportWebVitals from './reportWebVitals';

const rootElement = document.getElementById('root');

const tree = (
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <PreferencesProvider>
          <App />
        </PreferencesProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// react-snap pre-renders public marketing routes at build time and writes
// fully-populated HTML into each route's index.html. When the browser loads
// one of those snapshots, the root element already has children, so we
// hydrate instead of re-rendering (which would otherwise discard the
// snapshot and trigger a flash of empty content for SEO crawlers /
// real users).
if (rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootElement, tree);
} else {
  ReactDOM.createRoot(rootElement).render(tree);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
