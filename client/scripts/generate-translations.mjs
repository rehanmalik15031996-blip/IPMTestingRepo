/**
 * Auto-translation script for IPM
 * Generates JSON translation files for all missing languages using Google Translate (free, no API key).
 * Usage: node scripts/generate-translations.mjs
 * Requires Node 18+ (uses built-in fetch).
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Source strings (English) ────────────────────────────────────────────────
const EN = {
  'nav.home': 'Home',
  'nav.ipmNews': 'IPM News',
  'nav.ipmAcademy': 'IPM Academy',
  'nav.myIpmNews': 'My IPM News',
  'nav.newProperties': 'New Properties',
  'nav.logIn': 'Log into my IPM',
  'nav.signUp': 'Sign Up',
  'nav.dashboard': 'Dashboard',
  'nav.settings': 'Settings',
  'nav.collection': 'Collection',
  'nav.logout': 'Logout',
  'nav.language': 'Language',
  'nav.currency': 'Currency',
  'nav.units': 'Units',
  'nav.preferences': 'Preferences',
  'nav.services': 'Services',
  'nav.ourServices': 'Our Services',
  'nav.pricing': 'Pricing',
  'nav.myIpm': 'MyIPM',
  'nav.openMenu': 'Open menu',
  'nav.closeMenu': 'Close menu',
  'common.price': 'Price',
  'common.area': 'Area',
  'common.sqft': 'sqft',
  'common.sqm': 'sq m',
  'common.beds': 'Beds',
  'common.baths': 'Baths',
  'common.forSale': 'For Sale',
  'hero.search': 'Search by location, property type...',
  'hero.find': 'Find your perfect property',
  'collection.matchScore': 'Match Score',
  'collection.priceLow': 'Price: Low',
  'collection.priceHigh': 'Price: High',
  'collection.maxPrice': 'Max Price',
  'collection.all': 'All',
  'saved.savedListings': 'Saved Listings',
  'saved.title': 'Saved Collection',
  'saved.subtitle': 'Manage your shortlisted opportunities',
  'property.estMonthly': 'EST. MONTHLY',
  'property.bedsBaths': 'Beds, Baths',
  'property.price': 'Price',
  'property.area': 'Property Area',
  'footer.rights': 'All rights reserved.',
  'hero.titleLine1': 'Redefined standard for',
  'hero.titleLine2': 'intelligence-driven real estate',
  'hero.landingTitle1': 'The Real Estate Market,',
  'hero.landingTitle2': 'Reinvented.',
  'hero.landingTagline': 'One platform for agents, buyers, investors, and partners — global reach, real data, seamless collaboration.',
  'hero.searchCta': 'Search',
  'hero.tabAgents': 'Agents',
  'hero.tabBuy': 'Buy',
  'hero.tabRent': 'Rent',
  'hero.tabInvest': 'Invest',
  'hero.tabPartner': 'Partner',
  'hero.tabEnterprise': 'Enterprise',
  'hero.promptAgents': 'Example: Off-market villas my clients would love in Marbella or Dubai…',
  'hero.promptBuy': 'Example: 3-bed family home near good schools, under €800k in Lisbon…',
  'hero.promptRent': 'Example: Furnished 2-bed near metro, long lease, max €2,500/mo…',
  'hero.promptInvest': 'Example: Stable rental yield 7%+, Europe or UAE, €500k ticket…',
  'hero.promptPartner': 'Example: Co-listing luxury waterfront with verified international buyers…',
  'hero.promptEnterprise': 'Example: Scale my agency across multiple markets from one platform…',
  'hero.numbersStripAria': 'Platform metrics',
  'hero.numbersSegmentLabel': 'Client Segments Served',
  'hero.numbersSolutionsLabel': 'Platform Solutions',
  'hero.numbersMarketsLabel': 'Global Markets',
  'hero.numbersAllValue': 'All',
  'journeyStrip.aria': 'Property journey stages',
  'journeyStrip.eyebrow': 'One Subscription · The Entire Property Journey',
  'journeyStrip.headingLead': 'Every stage. Every stakeholder.',
  'journeyStrip.headingAccent': 'One platform.',
  'journeyStrip.step1Title': 'Property Discovery',
  'journeyStrip.step1Desc': 'Find opportunities across markets with intelligent precision',
  'journeyStrip.step2Title': 'Market Intelligence',
  'journeyStrip.step2Desc': 'Assess value, demand and growth with real data',
  'journeyStrip.step3Title': 'Opportunity Matching',
  'journeyStrip.step3Desc': 'Connect the right buyer, investor or agent',
  'journeyStrip.step4Title': 'Deal Collaboration',
  'journeyStrip.step4Desc': 'All parties in one shared workspace',
  'journeyStrip.step5Title': 'Property Management',
  'journeyStrip.step5Desc': 'Listings, assets and docs in one platform',
  'journeyStrip.step6Title': 'Portfolio Insights',
  'journeyStrip.step6Desc': 'Track performance and long-term value',
  'welcomeSection.aria': 'Welcome to IPM',
  'welcomeSection.eyebrow': 'Welcome to IPM',
  'welcomeSection.headingLead': 'A Historic Standard,',
  'welcomeSection.headingAccent': 'Reinvented.',
  'welcomeSection.body1': 'Pairing the precision of data with the personal experience of the real estate industry, IPM invites you into a connected, intelligent and globally accessible property experience.',
  'welcomeSection.body2': 'Founded by experienced real estate leaders, IPM was intentionally designed as an integrated ecosystem, connecting insight, collaboration and global reach in one platform.',
  'welcomeSection.ctaExplore': 'Explore the Platform',
  'welcomeSection.ctaPricing': 'View Pricing',
  'darkFeatureSection.aria': 'IPM investor solutions and platform overview',
  'darkFeatureSection.investorTitle': 'IPM Investor',
  'darkFeatureSection.investorAccent': 'Solutions',
  'darkFeatureSection.searchPlaceholder': 'Describe your ideal next investment',
  'darkFeatureSection.rentalYieldTitle': 'Rental Yield',
  'darkFeatureSection.rentalYieldSub': 'Annual Yield Estimate',
  'darkFeatureSection.rentalYieldBadge': 'Above market avg.',
  'darkFeatureSection.domTitle': 'Days on Market',
  'darkFeatureSection.domSub': 'Average days before sale',
  'darkFeatureSection.domBadge': 'Fast-moving area',
  'darkFeatureSection.energyTitle': 'Energy Rating',
  'darkFeatureSection.energySub': 'Building energy performance',
  'darkFeatureSection.energyBadge': 'Top-tier performance',
  'darkFeatureSection.confidenceTitle': 'Investment Confidence',
  'darkFeatureSection.confidenceSub': 'Composite signal score from market, rental & location data.',
  'darkFeatureSection.confidenceScore': 'Confidence Score',
  'darkFeatureSection.feat1Title': 'Strong Expat Demand',
  'darkFeatureSection.feat1Desc': 'Dubai Hills popular with high-income expats & remote workers.',
  'darkFeatureSection.feat2Title': 'Premium New Build',
  'darkFeatureSection.feat2Desc': '2023 completion — no maintenance backlog, modern ESG spec.',
  'darkFeatureSection.feat3Title': 'Consistent Appreciation',
  'darkFeatureSection.feat3Desc': '+18% over 5 years with ongoing infrastructure investment.',
  'darkFeatureSection.futureTitle': 'Future Prospects',
  'darkFeatureSection.futureSub': 'In Your Area',
  'darkFeatureSection.propertyBlurb': 'Contemporary, modern property with all of the premium features that fit your portfolio.',
  'darkFeatureSection.viewNow': 'View Now',
  'darkFeatureSection.ipmScore': 'IPM Score',
  'darkFeatureSection.pvScore': 'PV Score',
  'darkFeatureSection.scoreOutOf': '/ 100',
  'darkFeatureSection.barLeftAmount': '€28,800',
  'darkFeatureSection.barRightAmount': '€16,700',
  'darkFeatureSection.totalReturn': 'Total Return',
  'darkFeatureSection.annualizedYtd': 'Annualized (YTD)',
  'darkFeatureSection.returnGain': 'Total estimated gain: €24,500',
  'darkFeatureSection.capGrowth': 'Capital Growth',
  'darkFeatureSection.netRental': 'Net Rental Yield',
  'darkFeatureSection.trajectory': 'Annualized trajectory & Yield growth',
  'darkFeatureSection.months12': '12 Months',
  'darkFeatureSection.eyebrow': 'An IPM Exclusive',
  'darkFeatureSection.heading': 'One Subscription. The entire property journey.',
  'darkFeatureSection.headingLine1': 'One Subscription.',
  'darkFeatureSection.headingLine2': 'The entire property journey.',
  'darkFeatureSection.lead': 'IPM serves every stakeholder in the property lifecycle — from agents and agencies winning more mandates, to buyers finding the right property with AI-powered clarity, investors modelling real-time yield, and enterprise partners scaling across global markets.',
  'darkFeatureSection.audience1Title': 'Agents & Agencies',
  'darkFeatureSection.audience1Body': 'Prospect smarter, list faster and close with confidence. AI-powered lead scoring, €0 lead cost, CMA Builder, virtual staging and a full CRM — everything to win mandates and grow your real estate business successfully.',
  'darkFeatureSection.audience2Title': 'Buyers, Renters & Investors',
  'darkFeatureSection.audience2Body': 'Find the right property with natural language search and an IPM Score on every result. Model rental yield, analyse market data and close confidently with Smart Vault AI reviewing every clause.',
  'darkFeatureSection.audience3Title': 'Enterprise Partners & Corporates',
  'darkFeatureSection.audience3Body': 'Connect your agency franchise, corporate portfolio or referral network to the IPM ecosystem. White-label tools, deal collaboration workspaces, global reach and enterprise analytics in one place.',
  'darkFeatureSection.audience1ServicesCta': 'Explore agent & agency tools →',
  'darkFeatureSection.audience2ServicesCta': 'Explore buyer & renter tools →',
  'darkFeatureSection.audience3ServicesCta': 'Explore enterprise & partner solutions →',
  'darkFeatureSection.ctaPlatform': 'Explore Full Platform',
  'darkFeatureSection.ctaPricing': 'View Pricing',
  'serviceCardsSection.eyebrow': "WHO IT'S FOR",
  'serviceCardsSection.headingLine1': 'Your Property Journey',
  'serviceCardsSection.headingLine2': 'is Calling.',
  'serviceCardsSection.cta': 'View full services →',
  'hero.placeholder': 'Describe your ideal property...',
  'hero.feature1': 'Hyper Personalized AI Tailored For You',
  'hero.feature2': 'Market Analytics & Live News',
  'hero.feature3': 'One Platform For All Stakeholders',
  'hero.stats1': 'Of Tasks Automated For Agents',
  'hero.stats2': 'Improvement In Property Research',
  'hero.stats3': 'Projected Returns On Capital Improvements',
  'hero.slideBuyers': 'Buyers',
  'hero.slideInvestors': 'Investors',
  'hero.slideSellers': 'Agencies',
  'footer.getInTouch': 'Get in touch',
  'footer.intro': 'Have questions? Pick a date below to schedule a call.',
  'footer.firstName': 'First Name',
  'footer.lastName': 'Last Name',
  'footer.email': 'E-mail',
  'footer.phone': 'Phone',
  'footer.helpPlaceholder': 'What can we help you with?',
  'footer.submit': 'Submit',
  'common.loading': 'Loading...',
  'common.view': 'View',
  'common.viewProperty': 'View property',
  'common.address': 'Address',
  'common.location': 'Location',
  'common.any': 'Any',
  'common.bedrooms': 'Bedrooms',
  'common.resetAll': 'Reset All',
  'common.clearFilters': 'Clear Filters',
  'common.pleaseLogin': 'Please login to save.',
  'collection.resultsFor': 'Results for',
  'collection.bestMatches': "We've found the best matches just for you!",
  'collection.hideFilters': 'Hide Filters',
  'collection.specifyFilters': 'Specify more filters',
  'collection.sortBy': 'Sort by',
  'collection.locations': 'Locations',
  'collection.noPropertiesFound': 'No properties found.',
  'collection.matchScoreLabel': 'Match Score',
  'saved.viewDetails': 'View Details',
  'saved.noSavedYet': 'No saved properties yet',
  'saved.browseCollection': 'Browse Collection',
  'saved.comingSoon': 'View and manage all your Saved properties on one easy place',
  'saved.allTypes': 'All Types',
  'login.welcomeBack': 'Welcome Back.',
  'login.welcomeSub': 'Your portfolio performance, analytics, and global market trends are waiting.',
  'login.backToHome': 'Back to Home',
  'login.logIn': 'Log In',
  'login.enterCredentials': 'Enter your credentials to access your dashboard.',
  'login.emailAddress': 'Email Address',
  'login.password': 'Password',
  'login.forgot': 'Forgot?',
  'login.authenticating': 'Authenticating...',
  'login.newToIpm': 'New to IPM?',
  'login.createAccount': 'Create an account',
  'sidebar.myDashboard': 'My Dashboard',
  'sidebar.myPortfolio': 'My Portfolio',
  'sidebar.savedProperties': 'Saved Properties',
  'sidebar.listingManagement': 'Listing Management',
  'sidebar.agents': 'Agents',
  'sidebar.myVault': 'My Vault',
  'sidebar.settings': 'Settings',
  'sidebar.addListing': 'Add Listing',
  'newDev.title': 'New Developments',
  'newDev.filterBy': 'Filter by',
  'newDev.country': 'Country',
  'newDev.viewDevelopment': 'View Development',
  'newDev.from': 'From',
  'newDev.estimatedYield': 'Estimated yield',
  'newDev.noDevelopments': 'No developments found in',
  'listing.view': 'View',
  'listing.edit': 'Edit',
  'listing.delete': 'Delete',
  'listing.priceActions': 'Price + Actions',
  'listing.available': 'Available',
  'listing.featured': 'Featured',
  'listing.sold': 'Sold',
  'listing.noListings': "You haven't added any properties yet.",
  'sidebar.crm': 'CRM',
  'sidebar.marketing': 'Marketing',
  'sidebar.askAi': 'ASK IPM AI',
  'about.title': 'About IPM',
  'about.mission': 'Our Mission',
  'contact.getInTouch': 'Get in touch',
  'contact.formIntro': 'Fill out the form and our team will get back to you within 24 hours.',
  'contact.name': 'Name',
  'contact.email': 'Email',
  'contact.message': 'Message',
  'contact.sendMessage': 'Send Message',
  'news.loading': 'Loading Articles...',
  'news.latestPosts': 'Latest Posts',
  'news.sortBy': 'Sort by',
  'news.minRead': 'Min read',
  'newsDetail.loading': 'Loading Article...',
  'newsDetail.notFound': 'Article not found.',
  'newsDetail.backToNews': '← Back to News',
};

// ── Languages to generate ────────────────────────────────────────────────────
const TARGET_LANGUAGES = ['de', 'nl', 'pt', 'it', 'zh', 'ja', 'tr', 'ru', 'hi'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateText(text, targetLang, retries = 3) {
  // Keys that should NEVER be translated (brand names, codes, symbols)
  const skipPatterns = [/^IPM/, /^CRM$/, /^CMA/, /^ESG/, /^YTD/, /^€/, /^←/];
  if (skipPatterns.some((p) => p.test(text))) return text;

  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Google returns nested arrays; join all sentence fragments
      return data[0].map((item) => item[0]).join('');
    } catch (err) {
      if (attempt === retries) {
        console.warn(`  ⚠ Could not translate "${text}" → ${targetLang}: ${err.message}`);
        return text; // fallback to English
      }
      await sleep(500 * attempt);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const localesDir = join(__dirname, '..', 'src', 'i18n', 'locales');
  mkdirSync(localesDir, { recursive: true });

  const entries = Object.entries(EN);
  const total = entries.length;

  for (const lang of TARGET_LANGUAGES) {
    console.log(`\n🌐  Translating to ${lang} (${total} keys)…`);
    const result = {};

    for (let i = 0; i < entries.length; i++) {
      const [key, text] = entries[i];
      result[key] = await translateText(text, lang);
      process.stdout.write(`\r  ${i + 1}/${total}`);
      await sleep(80); // ~80 ms between requests — stays well under rate limit
    }

    const outPath = join(localesDir, `${lang}.json`);
    writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`\n  ✓ Saved ${lang}.json`);
    await sleep(400); // brief pause between languages
  }

  console.log('\n✅  All translations generated in client/src/i18n/locales/');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
