import React from 'react';
import { Helmet } from 'react-helmet-async';
import ServicesSectionPricingTYo6r from './ourServices/ServicesSectionPricingTYo6r';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
const PRICING_TITLE = 'Pricing | IPM – International Property Market';
const PRICING_DESCRIPTION =
    'Transparent plans for investors, buyers, agents, agencies, and partners — aligned with the IPM platform on Our Services.';

const getPricingJsonLd = () => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${BASE_URL}/pricing#webpage`,
    url: `${BASE_URL}/pricing`,
    name: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
    isPartOf: { '@type': 'WebSite', url: BASE_URL, name: 'IPM – International Property Market' },
});

/**
 * Standalone pricing route — same tier UI as the Our Services pricing section (ServicesSectionPricingTYo6r).
 * Top nav matches Home and Our Services (landing bar) via App.js `isLandingNav`.
 */
const Pricing = () => {
    return (
        <>
            <Helmet>
                <title>{PRICING_TITLE}</title>
                <meta name="description" content={PRICING_DESCRIPTION} />
                <meta property="og:title" content={PRICING_TITLE} />
                <meta property="og:description" content={PRICING_DESCRIPTION} />
                <meta property="og:url" content={`${BASE_URL}/pricing`} />
                <meta property="og:type" content="website" />
                <script type="application/ld+json">{JSON.stringify(getPricingJsonLd())}</script>
            </Helmet>
            {/* Clears fixed landing nav (72px); layout-home has no content padding, same as Home / Our Services */}
            <div className="w-full pt-[72px]">
                <ServicesSectionPricingTYo6r getInTouchTo="/our-services#home-section-contact" />
            </div>
        </>
    );
};

export default Pricing;
