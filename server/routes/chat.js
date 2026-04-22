/**
 * POST /api/chat — Gemini-powered multi-intent chat for Express.
 * Supports: property search, neighborhood briefs, area comparison,
 * listing summary, how-to guides, and generic real-estate chat.
 * Falls back to Anthropic Claude if no Gemini key is configured.
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Property = require('../models/Property');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = process.env.GEMINI_CHAT_MODEL
    ? [process.env.GEMINI_CHAT_MODEL.trim()]
    : ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

const ANTHROPIC_CHAT_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_CHAT_MODEL = 'claude-3-5-haiku-20241022';

const DISCLAIMER =
    '\n\n---\nIPM AI provides general information only. It is not financial, legal, or tax advice. Verify facts locally before making decisions.';

/* ────────────────────────────────────────────
   HOW-TO GUIDES — static step-by-step content
   ──────────────────────────────────────────── */

function buildGuideUrl(req, path) {
    const base = getPublicSiteOrigin(req);
    return base ? `${base}${path}` : path;
}

function getHowToGuides(req) {
    return {
        addAgent: {
            title: 'How to Add an Agent',
            steps: [
                `1. Open Agents — Click "Agents" in the sidebar to manage your team.`,
                `   ${buildGuideUrl(req, '/agents')}`,
                `2. Agents Page — You're now on the Agents page where you can see all your agents.`,
                `3. Click "Add New Agent" — Click the button at the top to open the agent invite form.`,
                `4. Fill in Agent Details — Enter the agent's first name, last name, email, and select a branch. Then click "Add Agent" to send the invite.`,
                `5. The system sends an invitation email/OTP to the agent.`,
                `6. Once the agent accepts and verifies, they appear under your agency roster.`,
                `\nTip: You can also invite agents from the Enterprise dashboard via the top-bar Add > Invite Agent button.`,
                `\nFor an interactive on-screen walkthrough, click "How To" in the sidebar footer.`,
            ],
        },
        addLead: {
            title: 'How to Add a Lead',
            steps: [
                `1. Open CRM — Click "My CRM" or "CRM" in the sidebar to manage your leads.`,
                `   ${buildGuideUrl(req, '/crm')}`,
                `2. CRM Page — You're now on the CRM page where you can see your lead pipeline.`,
                `3. Click "Add New Lead" — Click the button at the top to open the lead creation form.`,
                `4. Fill in Lead Details — Select the lead type (Buyer, Seller, Investor, or Tenant), add their contact details, and assign an agent if needed.`,
                `5. Click "Next: Lead Consent" to proceed through the consent step.`,
                `6. Complete and save — the lead now appears in your CRM pipeline.`,
                `\nTip: You can drag leads between pipeline stages to track progress. Use the CMA Report tool at ${buildGuideUrl(req, '/crm/cma-report')} to generate comparative market analysis for your leads.`,
                `\nFor an interactive on-screen walkthrough, click "How To" in the sidebar footer.`,
            ],
        },
        addListing: {
            title: 'How to Add a Listing',
            steps: [
                `1. Open Listing Management — Click "Listing Management" in the sidebar to manage your properties.`,
                `   ${buildGuideUrl(req, '/listing-management')}`,
                `2. Listing Management Page — You're now on the page where all your properties are listed.`,
                `3. Click "Add Property" — Click the button at the top to open the property upload form.`,
                `4. Upload Your Property — Fill in the property details: title, location, pricing, photos, and any documents.`,
                `5. The system can auto-extract data from uploaded listing documents (AI-powered).`,
                `6. Set the listing status to "Published" to make it live on the site.`,
                `7. Click "Save" — your listing is now searchable by buyers and investors.`,
                `\nTip: Featured listings get extra visibility. You can edit your listing any time from your dashboard or the Listing Management page.`,
                `\nFor an interactive on-screen walkthrough, click "How To" in the sidebar footer.`,
            ],
        },
    };
}

/* ────────────────────────────────────────────
   FAQ — from HelpCenter knowledge base
   ──────────────────────────────────────────── */

const FAQS = [
    { q: 'How do I start investing with IPM?', a: 'Create an account and complete the identity verification (KYC) process. Once verified, browse the "Premium Global Collection" of AI-vetted properties. Select a property, choose your investment amount, and purchase fractional shares instantly using the secure payment gateway.' },
    { q: 'What is the minimum investment amount?', a: 'You can start investing with as little as 500 AED (or equivalent in USD/EUR). This allows you to build a diversified portfolio across multiple global markets without needing large capital.' },
    { q: 'How are returns calculated and paid?', a: 'Returns come from two sources: Monthly Rental Income and Capital Appreciation. Rental income is distributed to your digital wallet monthly. Capital appreciation is realized when you sell your shares on the secondary market or when the property is sold after a fixed term.' },
    { q: 'Is my data and investment secure?', a: 'Yes — bank-grade encryption protects all personal data. Every property transaction is recorded on a private blockchain ledger, providing immutable proof of ownership.' },
    { q: 'Can I sell my property shares anytime?', a: 'Yes. IPM features a secondary marketplace where you can list your shares for sale to other investors on the platform, providing liquidity that traditional real estate investment lacks.' },
];

function isFaqIntent(message) {
    const m = String(message || '').toLowerCase();
    if (/\b(faqs?|frequently\s*asked|common\s*questions|help\s*center)\b/i.test(m)) return true;
    if (/\b(minimum\s*investment|investment\s*amount|how\s*are\s*returns|sell\s*my\s*shares|data\s*secure|start\s*investing)\b/i.test(m)) return true;
    for (const f of FAQS) {
        const keywords = f.q.toLowerCase().replace(/[?]/g, '').split(/\s+/).filter(w => w.length > 3);
        const hits = keywords.filter(kw => m.includes(kw));
        if (hits.length >= 3) return true;
    }
    return false;
}

function findFaqAnswer(message) {
    const m = String(message || '').toLowerCase();
    let bestMatch = null;
    let bestScore = 0;
    for (const f of FAQS) {
        const keywords = f.q.toLowerCase().replace(/[?]/g, '').split(/\s+/).filter(w => w.length > 3);
        const hits = keywords.filter(kw => m.includes(kw));
        if (hits.length > bestScore) { bestScore = hits.length; bestMatch = f; }
    }
    if (bestMatch && bestScore >= 2) return `Q: ${bestMatch.q}\n\n${bestMatch.a}`;
    return null;
}

function formatAllFaqs(req) {
    const lines = FAQS.map((f, i) => `${i + 1}. ${f.q}\n   ${f.a}`);
    return `Frequently Asked Questions\n${'—'.repeat(30)}\n\n${lines.join('\n\n')}\n\nFor more help, visit the Help Center: ${buildGuideUrl(req, '/help')}`;
}

function isHowToIntent(message) {
    const m = String(message || '').toLowerCase();
    return /\b(how\s*(to|do\s*i)|guide|walkthrough|step.?by.?step|tutorial|help\s*me)\b/i.test(m)
        && /\b(add|create|invite|register|new|submit|post|upload)\b/i.test(m)
        && /\b(agent|lead|listing|property|franchise|branch)\b/i.test(m);
}

function isHowToMenuIntent(message) {
    const m = String(message || '').toLowerCase();
    if (/\b(how.?to\s*guides?|all\s*guides?|what\s*can\s*you\s*(help|guide)|show\s*me\s*guides?|available\s*guides?|step.?by.?step\s*guides?)\b/i.test(m)) return true;
    if (/\b(help|guide|walkthrough|how\s*to)\b/i.test(m) && !/\b(agent|lead|listing|property|franchise|branch)\b/i.test(m)) return true;
    return false;
}

function detectGuideType(message) {
    const m = String(message || '').toLowerCase();
    if (/\b(agent|invite\s*agent)\b/i.test(m) && !/\b(lead|listing)\b/i.test(m)) return 'addAgent';
    if (/\b(lead|prospect|client|contact)\b/i.test(m) && !/\b(listing|agent)\b/i.test(m)) return 'addLead';
    if (/\b(listing|property|post|upload)\b/i.test(m)) return 'addListing';
    return null;
}

function formatGuide(guide) {
    return `${guide.title}\n${'—'.repeat(30)}\n\n${guide.steps.join('\n')}`;
}

function formatGuideMenu(req) {
    return `IPM How-To Guides & Help\n${'—'.repeat(30)}\n\n` +
        `Here are the step-by-step guides I can walk you through:\n\n` +
        `1. Add an Agent — invite agents to your agency\n` +
        `2. Add a Lead — create and manage sales leads in your CRM\n` +
        `3. Add a Listing — publish a property on IPM\n\n` +
        `I can also answer FAQs about investing, returns, security, and more.\n\n` +
        `Just ask! Examples:\n` +
        `  "How do I add a listing?"\n` +
        `  "Guide me to add a lead"\n` +
        `  "What is the minimum investment?"\n` +
        `  "Show me FAQs"\n\n` +
        `For interactive on-screen walkthroughs, click "How To" in the sidebar footer.\n` +
        `Visit the full Help Center: ${buildGuideUrl(req, '/help')}`;
}

function getPublicSiteOrigin(req) {
    const fromEnv = (process.env.FRONTEND_ORIGIN || process.env.CLIENT_URL || '').replace(/\/$/, '');
    if (fromEnv) return fromEnv;
    const origin = req.headers?.origin || req.headers?.referer || '';
    if (origin) {
        try { const u = new URL(origin); return `${u.protocol}//${u.host}`; } catch (_) { return origin.replace(/\/$/, ''); }
    }
    return '';
}

function propertyViewUrl(req, id) {
    const base = getPublicSiteOrigin(req);
    return base ? `${base}/property/${id}` : `/property/${id}`;
}

function cleanupLocation(input) {
    if (!input || typeof input !== 'string') return null;
    let out = input.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/^(?:for|in|at)\s+/i, '');
    out = out.replace(/\b(please|thanks|thank you|brief|overview|summary)\b[\s\S]*$/i, '').trim();
    if (out.length < 2) return null;
    return out.length > 80 ? out.slice(0, 80).trim() : out;
}

function extractNeighborhoodLocation(message) {
    if (!message) return null;
    const m = message.trim();
    let match = m.match(/neighbou?rhood\s*brief\s*[:\-]\s*([\s\S]{2,80})/i);
    if (match?.[1]) return cleanupLocation(match[1]);
    match = m.match(/neighbou?rhood\s*(?:brief|overview|summary)\s*(?:for|about|of)\s*([\s\S]{2,80})/i);
    if (match?.[1]) return cleanupLocation(match[1]);
    match = m.match(/\b(?:in|at)\s+["'`]?\s*([\s\S]{2,80}?)\s*["'`]?(?:[.?!]|$)/i);
    if (match?.[1]) return cleanupLocation(match[1]);
    return null;
}

function isNeighborhoodBriefIntent(message) {
    if (!message) return false;
    const m = message.toLowerCase();
    const explicit = /neighbou?rhood\s*brief/i.test(m);
    const asksBrief = /(neighbou?rhood|community|district|suburb|area)\s*(brief|overview|summary|tell me|give me)?/i.test(m);
    const hasBriefLike = /(brief|overview|summary)/i.test(m);
    return explicit || (asksBrief && hasBriefLike);
}

function extractComparePair(message) {
    const match = message.trim().match(/compare\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+)/i);
    if (!match) return null;
    const a = cleanupLocation(match[1]);
    const b = cleanupLocation(match[2]);
    return (a && b) ? { a, b } : null;
}

function isCompareIntent(message) {
    return /^compare\s+/i.test(message.trim()) && extractComparePair(message) != null;
}

function extractPropertySearchQuery(message) {
    const m = message.trim();
    let q = m.replace(/^(?:find|search|show me|show|looking for|list)\s+(?:me\s+)?(?:some\s+)?(?:published\s+)?(?:properties|property|listings|homes|houses)\s*(?:in|near|around|for)?\s*/i, '').trim();
    if (!q || q === m) { const inMatch = m.match(/(?:properties|property|listings|homes|houses)\s+in\s+(.+)/i); if (inMatch) q = inMatch[1].trim(); }
    if (!q || q === m) { const afterIn = m.match(/\s+in\s+(.+)/i); if (afterIn) q = afterIn[1].trim(); }
    return (!q || q.length < 2) ? null : q.slice(0, 120);
}

function stripBedroomAndFilterClauses(text) {
    if (!text) return '';
    return text.replace(/\s+with\s+\d[\s\S]*$/i, '').replace(/\s+that\s+have\s+[\s\S]*$/i, '').replace(/\s+having\s+\d[\s\S]*$/i, '').replace(/\s+where\s+[\s\S]*$/i, '').trim();
}

function stripBedroomPhrasesFromMessage(message) {
    return String(message || '').replace(/\s+with\s+\d[\s\S]*$/i, '').replace(/\s+that\s+have\s+\d[\s\S]*$/i, '').trim();
}

function extractMinBedrooms(message) {
    const m = String(message || '').toLowerCase();
    let x;
    if ((x = m.match(/(\d+)\s*or\s+more/))) return parseInt(x[1], 10);
    if ((x = m.match(/at\s+least\s+(\d+)/))) return parseInt(x[1], 10);
    if ((x = m.match(/minimum\s+(?:of\s+)?(\d+)/))) return parseInt(x[1], 10);
    if ((x = m.match(/more\s+than\s+(\d+)\s*(?:bed|bedroom|beds|br)\b/))) return parseInt(x[1], 10) + 1;
    if ((x = m.match(/(\d+)\s*\+\s*(?:bed|bedroom|beds|br)?/))) return parseInt(x[1], 10);
    if ((x = m.match(/\b(\d+)\s*(?:bed|bedroom|bedrooms|br)\b/))) return parseInt(x[1], 10);
    return null;
}

function extractInLocationPhrase(message) {
    const base = stripBedroomPhrasesFromMessage(message);
    let m = base.match(/\b(?:in|at)\s+([A-Za-z][A-Za-z0-9\s,.''-]{1,50}?)(?:\s*$|,?\s+with\b|,?\s+that\b|,?\s+near\b|,?\s+for\b)/i);
    if (m) return m[1].trim().replace(/,+$/g, '').trim();
    const tail = base.match(/\b(?:in|at)\s+([A-Za-z][A-Za-z0-9\s,.''-]{1,50})$/i);
    if (tail) return tail[1].trim().replace(/,+$/g, '').trim();
    return null;
}

const UAE_LOCATION_TERMS = ['UAE', 'U.A.E.', 'United Arab Emirates', 'Emirates', 'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah', 'Ras Al Khaimah', 'RAK', 'Umm Al Quwain'];

function expandLocationTerms(phrase) {
    const raw = String(phrase || '').trim().replace(/\s+/g, ' ');
    if (!raw) return [];
    const p = raw.toLowerCase();
    if (p === 'uae' || p === 'the uae' || p === 'united arab emirates' || p.includes('united arab emirates') || (/\buae\b/.test(p) && p.length <= 32)) return UAE_LOCATION_TERMS.slice();
    return [raw];
}

function wantsHousesNotFlats(message) {
    const m = String(message || '').toLowerCase();
    return /\b(houses?|homes)\b/.test(m) && !/\b(apartments?|flats?|condos?|studios?)\b/.test(m);
}

function bedroomTitleRegex(minB) {
    if (minB == null || minB < 1) return null;
    const parts = [];
    for (let k = minB; k <= 20; k++) parts.push(k);
    return new RegExp(`\\b(${parts.join('|')})\\s*(?:bed\\s*room|bed\\s*rooms|bedroom|bedrooms|bed|br)\\b`, 'i');
}

function buildPublicListingVisibilityFilter() {
    return { $or: [{ status: 'Published' }, { websiteStatus: 'Published' }, { websiteStatus: 'Featured' }] };
}

function buildLocationOrCondition(terms) {
    const clauses = [];
    const seen = new Set();
    for (const t of terms) {
        if (!t) continue;
        const key = t.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const r = new RegExp(escaped, 'i');
        clauses.push({ location: r }, { 'locationDetails.country': r }, { 'locationDetails.city': r }, { 'locationDetails.suburb': r }, { title: r }, { description: r }, { 'jurisdiction.country': r });
    }
    return clauses.length ? { $or: clauses } : null;
}

function isPropertySearchIntent(message) {
    const m = message.trim();
    const lower = m.toLowerCase();
    if (lower.length < 4) return false;
    if (/^compare\s+/i.test(m)) return false;
    if (isNeighborhoodBriefIntent(m)) return false;
    if (isHowToIntent(m) || isHowToMenuIntent(m)) return false;
    if (/\b(properties|listings|homes|houses)\s+in\s+\S+/i.test(lower)) return true;
    if (/\b(find|search|show)\b/i.test(lower) && /\b(properties|listings|property|homes|houses|house)\b/i.test(lower)) return true;
    if (/\blooking for\b/i.test(lower) && /\b(property|home|house|apartment|listing)\b/i.test(lower)) return true;
    if (/\b(what('?s)?|any|available)\b/i.test(lower) && /\b(in|near|around)\b/i.test(lower) && /\b(properties|listings|homes|houses|apartments?)\b/i.test(lower)) return true;
    if (/\b(property|properties|listings?|homes?|houses?|apartments?)\s+(in|near|around)\s+\S+/i.test(lower)) return true;
    return false;
}

function extractMongoId(message) {
    const fromPath = message.match(/\/property\/([a-f0-9]{24})\b/i);
    if (fromPath) return fromPath[1];
    const hex = message.match(/\b([a-f0-9]{24})\b/i);
    return hex ? hex[1] : null;
}

function isSummarizeListingIntent(message) {
    if (!extractMongoId(message)) return false;
    return /\b(summarize|summary|describe|overview|tell me about)\b/.test(message.toLowerCase());
}

function formatHistoryForPrompt(history) {
    if (!Array.isArray(history) || !history.length) return '';
    const lines = history.slice(-16).map((h) => {
        const role = h.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${String(h.text || '').trim().slice(0, 2000)}`;
    });
    return `Prior conversation (most recent last):\n${lines.join('\n')}\n`;
}

async function callGeminiText(models, prompt, { temperature = 0.2, maxOutputTokens = 700 } = {}) {
    const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured');
    let lastErr;
    for (const model of models) {
        try {
            const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens } }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) { lastErr = new Error(data?.error?.message || `Gemini failed (${response.status})`); continue; }
            const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
            if (!text) { lastErr = new Error('No text in Gemini response'); continue; }
            return text;
        } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Gemini request failed');
}

async function callClaudeChat(message, history) {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    const messages = [];
    if (Array.isArray(history)) {
        history.slice(-16).forEach((h) => {
            messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: String(h.text || '').slice(0, 2000) });
        });
    }
    messages.push({ role: 'user', content: message });
    const response = await fetch(ANTHROPIC_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: CLAUDE_CHAT_MODEL, max_tokens: 1024, system: 'You are a helpful AI assistant for the International Property Market (IPM) platform. Answer concisely about real estate, property investments, market trends, and ESG. Be professional and accurate.', messages }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || response.statusText);
    return (data?.content?.[0]?.text || '').trim() || 'No response.';
}

async function callGeminiNeighborhoodBrief(location) {
    const prompt = `You are a real estate neighborhood research assistant for the International Property Market (IPM) platform.

Write a Neighborhood Brief for: ${location}

Use this structure (plain text, headings included):
Snapshot:
Lifestyle & walkability:
Schools/parks/health:
Transit/commute:
Environmental/ESG:
Investment outlook:
Next steps:

Keep it concise (about 180-220 words). Use publicly available knowledge.`;
    return await callGeminiText(GEMINI_MODELS, prompt, { temperature: 0.2, maxOutputTokens: 650 });
}

async function callGeminiCompareAreas(a, b) {
    const prompt = `You are a real estate analyst for IPM. Compare two areas for a buyer/investor.

Area A: ${a}
Area B: ${b}

Output sections:
Overview
Lifestyle & amenities
Schools & family
Transit & commute
Investment outlook
Trade-offs (bullet list)
Verdict (2-3 sentences)

Keep under 280 words. Use publicly available knowledge.`;
    return await callGeminiText(GEMINI_MODELS, prompt, { temperature: 0.25, maxOutputTokens: 800 });
}

async function callGeminiListingSummary(propertyLean, historyBlock) {
    const safe = { title: propertyLean.title, location: propertyLean.location, price: propertyLean.price, listingType: propertyLean.listingType, status: propertyLean.status, description: (propertyLean.description || '').slice(0, 4000), propertyCategory: propertyLean.propertyCategory, type: propertyLean.type };
    const prompt = `${historyBlock}
Summarize this listing for an investor and a homebuyer in two short subsections (Investor angle / Buyer angle). Be factual; do not invent features not implied by the data.

Listing JSON:
${JSON.stringify(safe, null, 2)}`;
    return await callGeminiText(GEMINI_MODELS, prompt, { temperature: 0.25, maxOutputTokens: 700 });
}

async function callGeminiGenericChat(message, historyBlock) {
    const prompt = `${historyBlock}
You are a helpful AI assistant for the International Property Market (IPM) platform.
Answer concisely and professionally about real estate, property investments, market trends, and ESG.
If the user asks for something outside real estate, still help but keep it short and safe.

You can also help users with the platform itself. If they seem to need guidance, mention these available features:
How-To Guides (step-by-step walkthroughs):
- "How do I add an agent?" — invite agents to your agency (sidebar → Agents → Add New Agent)
- "How do I add a lead?" — create CRM leads (sidebar → CRM → Add New Lead)
- "How do I add a listing?" — publish properties (sidebar → Listing Management → Add Property)
- "Show me all guides" — see all available guides
FAQs: investing, minimum amounts, returns, security, selling shares — ask "Show me FAQs"
Property Search: "Show me properties in [any location]" — finds published listings with direct links
Interactive Tours: The sidebar has a "How To" button that launches on-screen guided walkthroughs highlighting actual buttons
Help Center: Full FAQ page at /help

User message:
${String(message || '').trim()}`;
    return await callGeminiText(GEMINI_MODELS, prompt, { temperature: 0.3, maxOutputTokens: 900 });
}

async function searchPublishedProperties(message, req, limit = 12) {
    const minBed = extractMinBedrooms(message);
    const housesOnly = wantsHousesNotFlats(message);
    let locPhrase = extractInLocationPhrase(message);
    if (locPhrase) locPhrase = stripBedroomAndFilterClauses(locPhrase);
    if (!locPhrase) { let q = extractPropertySearchQuery(message); q = stripBedroomAndFilterClauses(q || ''); if (q && q.length >= 2) locPhrase = q; }

    const locationTerms = locPhrase ? expandLocationTerms(locPhrase) : [];
    const andParts = [buildPublicListingVisibilityFilter()];

    if (minBed != null) {
        const titleRe = bedroomTitleRegex(minBed);
        const bedOr = [{ 'residential.bedrooms': { $gte: minBed } }, { 'specs.beds': { $gte: minBed } }];
        if (titleRe) bedOr.push({ title: titleRe });
        andParts.push({ $or: bedOr });
    }

    const locCond = buildLocationOrCondition(locationTerms);
    if (locCond) andParts.push(locCond);

    if (housesOnly) {
        andParts.push({ $or: [{ type: /villa|house|townhouse|detached|semi|bungalow|duplex|famil|mansion|estate|maisonette|home/i }, { title: /villa|house|townhouse|detached|bungalow|duplex|famil|mansion|estate|maisonette/i }] });
        andParts.push({ $nor: [{ type: /apartment|flat|studio/i }, { title: /\b(apartment|flat|studio)\b/i }] });
    }

    const filterBits = [];
    if (locPhrase) filterBits.push(locationTerms.length > 3 ? `${locPhrase} (and synonyms)` : locPhrase);
    if (minBed != null) filterBits.push(`${minBed}+ bedrooms`);
    if (housesOnly) filterBits.push('houses only');

    let rows;
    if (andParts.length === 1) {
        const fallbackQ = extractPropertySearchQuery(message);
        if (!fallbackQ) return { properties: [], filterLabel: 'your search' };
        const regex = new RegExp(String(fallbackQ).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        rows = await Property.find({ $and: [buildPublicListingVisibilityFilter(), { $or: [{ title: regex }, { location: regex }, { type: regex }, { 'locationDetails.city': regex }, { 'locationDetails.country': regex }] }] }).sort({ createdAt: -1 }).limit(limit).lean();
        return { properties: rows, filterLabel: `"${fallbackQ}"` };
    }

    rows = await Property.find({ $and: andParts }).sort({ createdAt: -1 }).limit(limit).lean();

    if (!rows.length && housesOnly) {
        const relaxed = andParts.filter((p) => !(p.$nor || (p.$or && p.$or.some((x) => x?.type))));
        rows = await Property.find({ $and: relaxed }).sort({ createdAt: -1 }).limit(limit).lean();
    }
    if (!rows.length && minBed != null) {
        const relaxed = andParts.filter((p) => !(p.$or && p.$or.some((x) => x?.['residential.bedrooms'] || x?.['specs.beds'])));
        rows = await Property.find({ $and: relaxed }).sort({ createdAt: -1 }).limit(limit).lean();
    }

    const filterLabel = filterBits.length ? filterBits.join('; ') : extractPropertySearchQuery(message) || 'your criteria';
    return { properties: rows, filterLabel };
}

function buildPropertySearchReply(req, properties, filterLabel) {
    if (!properties.length) return `No public listings matched (${filterLabel}). Try broader keywords or another area.`;
    const lines = properties.map((p, i) => {
        const url = propertyViewUrl(req, String(p._id));
        const title = (p.title || 'Listing').trim();
        const loc = (p.location || '').trim();
        const price = (p.price || '').trim();
        const beds = p.residential?.bedrooms;
        const bedStr = beds != null ? ` — ${beds} bed` : '';
        return `${i + 1}. ${title}${loc ? ` — ${loc}` : ''}${price ? ` — ${price}` : ''}${bedStr}\n   View more: ${url}`;
    });
    return `Here are up to ${properties.length} public listing(s) matching ${filterLabel}:\n\n${lines.join('\n\n')}`;
}

function hasGeminiKey() {
    return !!(process.env.GEMINI_API_KEY || '').trim();
}

function hasClaudeKey() {
    return !!(process.env.ANTHROPIC_API_KEY || '').trim();
}

router.post('/', async (req, res) => {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Message required' });

    const historyArr = Array.isArray(history) ? history : [];
    const historyBlock = formatHistoryForPrompt(historyArr);
    const appendDisclaimer = (text) => `${String(text || '').trim()}${DISCLAIMER}`;
    const useGemini = hasGeminiKey();
    const useClaude = hasClaudeKey();

    if (!useGemini && !useClaude) {
        return res.status(503).json({ reply: '', error: 'Chat not configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY in your .env file.' });
    }

    try {
        // How-to guides — instant, no AI call needed
        if (isHowToIntent(message)) {
            const guideType = detectGuideType(message);
            if (guideType) {
                const guides = getHowToGuides(req);
                return res.json({ reply: formatGuide(guides[guideType]) });
            }
            return res.json({ reply: formatGuideMenu(req) });
        }
        if (isHowToMenuIntent(message)) {
            return res.json({ reply: formatGuideMenu(req) });
        }

        // FAQ — instant answers from HelpCenter knowledge base
        if (isFaqIntent(message)) {
            const specific = findFaqAnswer(message);
            if (specific) return res.json({ reply: specific });
            return res.json({ reply: formatAllFaqs(req) });
        }

        // Property search works with MongoDB regardless of AI provider
        if (isPropertySearchIntent(message)) {
            const looseQ = extractPropertySearchQuery(message);
            const hasSignal = extractInLocationPhrase(message) || extractMinBedrooms(message) != null || wantsHousesNotFlats(message) || (looseQ && looseQ.length >= 2);
            if (!hasSignal) return res.json({ reply: appendDisclaimer('What should I search for? Example: `Show me houses in UAE with 5 or more bedrooms`.') });
            const { properties, filterLabel } = await searchPublishedProperties(message, req, 12);
            return res.json({ reply: appendDisclaimer(buildPropertySearchReply(req, properties, filterLabel)) });
        }

        // Listing summarize works with MongoDB + any AI provider
        if (isSummarizeListingIntent(message)) {
            const id = extractMongoId(message);
            if (!id) return res.json({ reply: appendDisclaimer('Paste a listing link or property ID to summarize.') });
            const prop = await Property.findById(id).lean();
            if (!prop) return res.json({ reply: appendDisclaimer('That property was not found.') });
            if (useGemini) {
                const summary = await callGeminiListingSummary(prop, historyBlock);
                return res.json({ reply: appendDisclaimer(`${summary}\n\nView full listing: ${propertyViewUrl(req, id)}`) });
            }
        }

        // Gemini-powered intents (neighborhood brief, compare, generic chat)
        if (useGemini) {
            if (isCompareIntent(message)) {
                const pair = extractComparePair(message);
                const reply = await callGeminiCompareAreas(pair.a, pair.b);
                return res.json({ reply: appendDisclaimer(reply) });
            }
            if (isNeighborhoodBriefIntent(message)) {
                const location = extractNeighborhoodLocation(message);
                if (!location) return res.json({ reply: appendDisclaimer('Which neighborhood or city should I cover? Try: `Neighborhood brief: Dubai Marina`.') });
                const reply = await callGeminiNeighborhoodBrief(location);
                return res.json({ reply: appendDisclaimer(reply) });
            }
            const reply = await callGeminiGenericChat(message, historyBlock);
            return res.json({ reply: appendDisclaimer(reply) });
        }

        // Claude fallback for generic chat
        if (useClaude) {
            const reply = await callClaudeChat(message, historyArr);
            return res.json({ reply: appendDisclaimer(reply) });
        }
    } catch (err) {
        console.error('Chat error:', err);
        // If Gemini failed, try Claude as fallback
        if (useGemini && useClaude) {
            try {
                const reply = await callClaudeChat(message, historyArr);
                return res.json({ reply: appendDisclaimer(reply) });
            } catch (fallbackErr) {
                console.error('Claude fallback also failed:', fallbackErr);
            }
        }
        return res.status(500).json({ error: err?.message || 'Server error', reply: '' });
    }
});

module.exports = router;
