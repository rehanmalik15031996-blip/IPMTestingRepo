import React from 'react';
import { Helmet } from 'react-helmet-async';
import ServicesXePoOTop from './ourServices/ServicesXePoOTop';
import HomeFigmaTopbar from '../components/HomeFigmaTopbar';
import '../components/HomeLandingHeroFigma.css';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
const SERVICES_TITLE = 'Our Services | IPM – International Property Market';
const SERVICES_DESCRIPTION =
    'Unified AI-driven platform for global real estate: one data core, automated workflows, CRM, listings, and multi-market exposure for agencies, agents, and investors.';

const getServicesJsonLd = () => ({
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'WebPage',
            '@id': `${BASE_URL}/our-services#webpage`,
            url: `${BASE_URL}/our-services`,
            name: SERVICES_TITLE,
            description: SERVICES_DESCRIPTION,
            isPartOf: { '@type': 'WebSite', url: BASE_URL, name: 'IPM – International Property Market' },
        },
        {
            '@type': 'Service',
            name: 'IPM real estate platform',
            description: SERVICES_DESCRIPTION,
            provider: { '@type': 'Organization', name: 'IPM – International Property Market', url: BASE_URL },
            areaServed: 'Worldwide',
            serviceType: 'Real estate technology, CRM, listing management, AI-driven property insights',
        },
    ],
});

/**
 * Services page — Anima Qv8XQ (nav) + TqoFB (hero), then more sections as needed.
 */
const OurServices = () => {
    return (
        <>
            <Helmet>
                <title>{SERVICES_TITLE}</title>
                <meta name="description" content={SERVICES_DESCRIPTION} />
                <meta property="og:title" content={SERVICES_TITLE} />
                <meta property="og:description" content={SERVICES_DESCRIPTION} />
                <meta property="og:url" content={`${BASE_URL}/our-services`} />
                <meta property="og:image" content={`${BASE_URL}/logo-white.png`} />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={SERVICES_TITLE} />
                <meta name="twitter:description" content={SERVICES_DESCRIPTION} />
                <script type="application/ld+json">{JSON.stringify(getServicesJsonLd())}</script>
            </Helmet>
            <HomeFigmaTopbar darkMode />
            <ServicesXePoOTop />
        </>
    );
};

export default OurServices;
