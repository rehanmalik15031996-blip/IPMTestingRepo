import React from 'react';
import { Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import HomeLandingHeroFigma from '../components/HomeLandingHeroFigma';
import HomeFeaturesFigma from '../components/HomeFeaturesFigma';
import HomeServicesCtaBand from '../components/HomeServicesCtaBand';
import HomeCarouselFigma from '../components/HomeCarouselFigma';
import HomeStatsFigma from '../components/HomeStatsFigma';
import HomeStakeholdersFigma from '../components/HomeStakeholdersFigma';
import HomeWhyFigma from '../components/HomeWhyFigma';
import HomeGetInTouchFigma from '../components/HomeGetInTouchFigma';
import { HomeAnimaFooter } from '../components/HomeCtaContactSections';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
const LANDING_TITLE = 'IPM – International Property Market | Global Real Estate Platform';
const LANDING_DESCRIPTION =
  'Discover and manage international property investments. AI-driven tools, portfolio management, and global exposure for agents, agencies, and investors.';

const getLandingJsonLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'IPM – International Property Market',
      url: BASE_URL,
      description: LANDING_DESCRIPTION,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo-white.png` },
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: LANDING_TITLE,
      description: LANDING_DESCRIPTION,
      publisher: { '@id': `${BASE_URL}/#organization` },
    },
  ],
});

/**
 * Landing page — incremental rebuild from Figma.
 * Agents are sent straight to the dashboard (existing behavior).
 */
const Home = () => {
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr
    ? (() => {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      })()
    : null;
  const role = (user?.role || '').toLowerCase();
  const isAgent = role === 'agent' || role === 'independent_agent' || role === 'agency_agent';
  if (isAgent) {
    return <Navigate to="/agent-dashboard" replace />;
  }

  return (
    <div style={{ backgroundColor: '#060606', fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <Helmet>
        <title>{LANDING_TITLE}</title>
        <meta name="description" content={LANDING_DESCRIPTION} />
        <meta property="og:title" content={LANDING_TITLE} />
        <meta property="og:description" content={LANDING_DESCRIPTION} />
        <meta property="og:url" content={`${BASE_URL}/`} />
        <meta property="og:image" content={`${BASE_URL}/logo-white.png`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={LANDING_TITLE} />
        <meta name="twitter:description" content={LANDING_DESCRIPTION} />
        <link rel="alternate" type="text/plain" href={`${BASE_URL}/ai.txt`} title="AI-readable site description" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Poppins:wght@100;200;300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json">{JSON.stringify(getLandingJsonLd())}</script>
      </Helmet>

      <HomeLandingHeroFigma />
      <HomeFeaturesFigma />
      <HomeServicesCtaBand />
      <HomeCarouselFigma />
      <HomeStatsFigma />
      <HomeStakeholdersFigma />
      <HomeWhyFigma />
      <HomeGetInTouchFigma />
      <HomeAnimaFooter />
    </div>
  );
};

export default Home;
