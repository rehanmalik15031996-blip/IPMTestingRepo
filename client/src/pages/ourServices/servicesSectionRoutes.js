/**
 * Deep-link paths and hash → role-tab mapping for /our-services stakeholder sections.
 * Section element IDs live on each module’s root <section>.
 */
export const SERVICES_SECTION_PATHS = {
    agent: '/our-services#services-section-agent',
    buyRent: '/our-services#services-section-buy-rent',
    investor: '/our-services#services-section-investor',
    partner: '/our-services#services-section-partner',
    enterprise: '/our-services#services-section-enterprise',
};

/** Fragment (without #) → ServicesXePoOTop role tab id */
export const SERVICES_HASH_TO_ROLE_TAB = {
    'services-section-agent': 'agent',
    'services-section-buy-rent': 'buy',
    'services-section-investor': 'investor',
    'services-section-partner': 'partner',
    'services-section-enterprise': 'enterprise',
};
