/**
 * Patch dashboard hardening keys into the 9 auto-generated language JSON files.
 * Translates English source via Google Translate's free endpoint, then injects.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TARGET_LANGUAGES = ['de', 'nl', 'pt', 'it', 'zh', 'ja', 'tr', 'ru', 'hi'];

// English source for new keys (must match en block in translations.js)
const NEW_KEYS = {
  'sidebar.pipeline': 'Pipeline',
  'sidebar.ipmPartners': 'IPM Partners',
  'sidebar.prospecting': 'Prospecting',
  'sidebar.myCrm': 'My CRM',
  'sidebar.sales': 'Sales',
  'sidebar.franchisesBranches': 'Franchises & Branches',
  'sidebar.performanceBy': 'Performance by',
  'sidebar.country': 'Country',
  'sidebar.franchise': 'Franchise',
  'sidebar.branch': 'Branch',
  'sidebar.royaltyEngine': 'Royalty Engine',
  'sidebar.compliance': 'Compliance',
  'sidebar.portalSyndication': 'Portal Syndication',
  'sidebar.vault': 'Vault',
  'sidebar.howTo': 'How To',
  'sidebar.tier': 'Tier:',
  'sidebar.ipmScoreLabel': 'IPM Score:',
  'sidebar.enterprise': 'Enterprise',
  'sidebar.logoutTitle': 'Log out?',
  'sidebar.logoutConfirm': 'Are you sure you want to log out of your account?',
  'sidebar.cancel': 'Cancel',
  'sidebar.logoutAction': 'Log out',
  'role.investor': 'Buyer / Investor',
  'role.seller': 'Seller',
  'role.tenant': 'Tenant',
  'role.agency': 'Agency Manager',
  'role.agent': 'Real Estate Agent',
  'role.independentAgent': 'Independent Agent',
  'role.agencyAgent': 'Agency Agent',
  'role.bondOriginator': 'Bond Originator',
  'role.conveyancer': 'Conveyancer',
  'role.marketingPartner': 'Marketing Partner',
  'role.user': 'User',
  'dashboard.goodDay': 'Good day',
  'dashboard.quickActions': 'Quick Actions',
  'dashboard.myProperties': 'My Properties',
  'dashboard.propertiesInPortfolio': 'Properties in portfolio',
  'dashboard.netWorth': 'Net Worth (USD)',
  'dashboard.addPropertiesValue': 'Add properties to display value',
  'dashboard.activePropertiesByRegion': 'Active Properties by Region',
  'dashboard.portfolioReturns': 'Portfolio Returns',
  'dashboard.noPortfolioYet': 'No portfolio items yet',
  'dashboard.addToPortfolio': 'Add properties to your portfolio to view returns.',
  'dashboard.mySafeDigitalPath': 'My Safe Digital Path',
  'dashboard.documents': 'Documents',
  'dashboard.addDocuments': 'Add documents',
  'dashboard.marketTrends': 'Market Trends',
  'dashboard.marketTrendsBlurb': 'Charts: 12-month trend. Growth rate refers to last year.',
  'dashboard.marketTrendsEmpty': 'No trends are available yet for your markets. Add countries to your portfolio or your preferences to display trends here.',
  'dashboard.newsFeeds': 'News Feeds',
  'dashboard.newsFeedsEmpty': 'No news yet for your markets.',
  'dashboard.myPerformance': 'My Performance',
  'dashboard.dealsInPipeline': 'You have {{count}} deals in the pipeline.',
  'dashboard.activeListings': 'Active Listings:',
  'dashboard.appointments': 'Appointments:',
  'dashboard.leadsInCrm': 'Leads in CRM:',
  'enterprise.performanceByCountry': 'Performance by Country',
  'enterprise.performanceByFranchise': 'Performance by Franchise',
  'enterprise.performanceByBranch': 'Performance by Branch',
  'enterprise.useTheSidebar': 'Use the sidebar to switch between Country, Franchise, and Branch views.',
  'enterprise.franchises': 'Franchises',
  'enterprise.branches': 'Branches',
  'enterprise.activeAgents': 'Active Agents',
  'enterprise.gtvMtd': 'GTV (MTD)',
  'enterprise.activeListings': 'Active Listings',
  'enterprise.provinceGtv': 'Province GTV',
  'enterprise.franchisePerformance': 'Franchise Performance',
  'enterprise.branchPerformance': 'Branch Performance',
  'enterprise.markets': 'markets',
  'enterprise.market': 'market',
  'enterprise.noDataYet': 'No data yet.',
  'enterprise.acrossNetwork': 'Across network',
  'enterprise.active': 'Active',
  'enterprise.revenueToDate': 'Revenue to date',
  'enterprise.branchLeaderBoard': 'Branch Leader Board',
  'enterprise.commissionEngine': 'Commission Engine',
  'enterprise.noFranchisesYet': 'No franchises yet.',
  'enterprise.noBranchesYet': 'No branches yet.',
  'enterprise.noActiveAgentsYet': 'No active agents yet.',
  'enterprise.listingDistribution': 'Listing Distribution',
  'enterprise.reportingHierarchy': 'Reporting Hierarchy',
  'enterprise.agentRoster': 'Agent Roster',
  'enterprise.agents': 'Agents',
  'enterprise.leads': 'Leads',
  'enterprise.gtv': 'GTV',
  'enterprise.sold': 'Sold',
  'enterprise.drillIn': 'Drill In',
  'enterprise.royaltiesDue': 'Royalties Due',
  'enterprise.commissionDue': 'Commission Due (MTD)',
  'enterprise.branchAgents': 'Branch Agents',
  'enterprise.pipelineLeads': 'Pipeline Leads',
  'enterprise.networkTotal': 'Network total',
  'enterprise.ofGtv': 'of GTV',
  'enterprise.loadingPerformance': 'Loading performance data...',
  'enterprise.last30d': 'last 30d',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function translateText(text, targetLang, retries = 3) {
  // Skip patterns: brand names, currencies, etc.
  const skipPatterns = [/^IPM/, /^CRM$/, /^GTV/, /^USD$/, /^€/, /^MTD/];
  if (skipPatterns.some((p) => p.test(text))) return text;
  // Preserve placeholders by extracting/restoring around the API call
  const placeholders = [];
  let safeText = text.replace(/\{\{(\w+)\}\}/g, (m) => {
    placeholders.push(m);
    return `__P${placeholders.length - 1}__`;
  });
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(safeText)}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('http ' + res.status);
      const json = await res.json();
      let translated = (json[0] || []).map(seg => seg[0]).join('');
      // Restore placeholders
      placeholders.forEach((ph, i) => {
        translated = translated.replace(`__P${i}__`, ph).replace(`__ p${i} __`, ph).replace(new RegExp(`__\\s*P\\s*${i}\\s*__`, 'i'), ph);
      });
      return translated;
    } catch (e) {
      if (attempt === retries - 1) {
        console.warn(`  ! failed to translate "${text.slice(0, 40)}" → ${targetLang}: ${e.message}`);
        return text;
      }
      await sleep(500 * (attempt + 1));
    }
  }
  return text;
}

async function main() {
  const localesDir = join(__dirname, '..', 'src', 'i18n', 'locales');
  for (const lang of TARGET_LANGUAGES) {
    const fpath = join(localesDir, `${lang}.json`);
    let bundle;
    try {
      bundle = JSON.parse(readFileSync(fpath, 'utf8'));
    } catch (e) {
      console.warn(`  ! cannot read ${fpath}, skipping`);
      continue;
    }
    console.log(`\n── Patching ${lang}.json (${Object.keys(NEW_KEYS).length} keys) ──`);
    let added = 0;
    for (const [key, source] of Object.entries(NEW_KEYS)) {
      if (bundle[key]) continue; // already exists
      const translated = await translateText(source, lang);
      bundle[key] = translated;
      added++;
      await sleep(70);
    }
    writeFileSync(fpath, JSON.stringify(bundle, null, 2), 'utf8');
    console.log(`  ✓ ${added} new keys added`);
  }
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
