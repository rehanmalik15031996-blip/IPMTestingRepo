/**
 * POST /api/extract-property
 * Body: JSON { files: [ { name: "file.pdf", content: "base64..." } ] }
 * Extracts text from PDF/DOCX, sends to Claude, returns formData matching PropertyUploadForm schema.
 * Env: ANTHROPIC_API_KEY
 */
const { handleCors } = require('../_lib/cors');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-haiku-20241022';

const ALLOWED_EXT = ['.pdf', '.docx', '.doc'];
const MAX_FILE_SIZE_MB = 20;
const MAX_TEXT_LENGTH = 120000;

// Schema template matching client getDefaultFormData() for pre-population
const FORM_SCHEMA_TEMPLATE = {
    listingType: '',
    investmentType: '',
    propertyCategory: '',
    propertyType: '',
    propertyTitle: '',
    shortDescription: '',
    location: {
        country: '',
        city: '',
        suburb: '',
        streetAddress: '',
        hideAddress: false,
        coordinates: { lat: null, lng: null }
    },
    pricing: {
        currency: 'USD',
        askingPrice: '',
        monthlyRental: '',
        startingBid: '',
        bidIncrement: '',
        buyerPremium: '',
        reservationFee: { applicable: false, amount: '' },
        depositRequired: '',
        annualEscalation: '',
        priceBasis: '',
        appraisalDocument: '',
        valuationDocs: [],
        purchasePrice: '',
        purchaseDate: '',
        currentValuation: ''
    },
    availability: { status: '', availableFrom: '' },
    propertySize: { unitSystem: 'sqm', size: '', landSize: '' },
    ownership: { mandate: 'Sole Mandate', listingVisibility: 'Public Listing' },
    jurisdiction: { country: '', statutoryIdentifiers: {} },
    documents: { esgApplicable: false },
    mandatoryDocs: [],
    fixtures: {
        utilitySystems: [],
        securityFeatures: [],
        kitchenAppliances: [],
        leisureExternal: [],
        otherFixtures: ''
    },
    defects: {
        roof: { aware: false, notes: '', documents: [] },
        electrical: { aware: false, notes: '', documents: [] },
        plumbing: { aware: false, notes: '', documents: [] },
        foundation: { aware: false, notes: '', documents: [] },
        additionalNotes: '',
        supportingDocuments: []
    },
    legalDocs: [],
    declarations: { agentDeclaration: false, complianceAcknowledgment: false },
    media: {
        coverImage: '',
        walkthroughVideo: '',
        virtual3DTour: '',
        virtual3DTourFile: '',
        imageGallery: [],
        droneFootage: '',
        floorplans: [],
        constructionProgress: [],
        liveCameraFeed: '',
        captions: { manual: false, aiGenerated: false },
        tags: { manual: [], aiSuggested: [] },
        mediaRights: { hasRights: false, accurateRepresentation: false, noMisleadingEdits: false },
        aiOptimization: false
    },
    residential: { bedrooms: '', bathrooms: '', livingAreaSize: '', parkingSpaces: '' },
    land: {},
    industrial: {},
    office: {},
    commercial: {},
    agricultural: {},
    rentalSpecific: {},
    auctionDetails: {},
    status: 'Draft',
    readinessScore: 0,
    aiSuggestions: []
};

async function extractPdf(buffer) {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return (data && data.text ? data.text : '').trim();
}

async function extractDocx(buffer) {
    const mammoth = require('mammoth');
    const result = await mammoth.convertToHtml({ buffer });
    const html = (result && result.value) ? result.value : '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function extractTextFromFile(name, base64Content) {
    const ext = (name || '').toLowerCase().slice((name || '').lastIndexOf('.'));
    if (!ALLOWED_EXT.includes(ext)) return { name, text: '' };
    const buffer = Buffer.from(base64Content, 'base64');
    if (ext === '.pdf') return { name, text: await extractPdf(buffer) };
    return { name, text: await extractDocx(buffer) };
}

function deepMerge(base, override) {
    const out = { ...base };
    for (const [k, v] of Object.entries(override)) {
        if (v === undefined) continue;
        if (v === '' || (Array.isArray(v) && v.length === 0)) continue;
        const b = out[k];
        if (b != null && typeof b === 'object' && !Array.isArray(b) && typeof v === 'object' && !Array.isArray(v)) {
            out[k] = deepMerge(b, v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ error: 'Missing ANTHROPIC_API_KEY' });
    }

    let files = [];
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        files = Array.isArray(body.files) ? body.files : [];
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const valid = files.filter((f) => f && f.name && f.content);
    if (valid.length === 0) {
        return res.status(400).json({ error: 'At least one file (PDF/DOCX) required in body.files' });
    }

    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    for (const f of valid) {
        const ext = (f.name || '').toLowerCase().slice((f.name || '').lastIndexOf('.'));
        if (!ALLOWED_EXT.includes(ext)) {
            return res.status(400).json({ error: `Only PDF/DOCX allowed. Got: ${f.name}` });
        }
        const size = (f.content || '').length;
        if (size > maxBytes) {
            return res.status(400).json({ error: `File too large: ${f.name} (max ${MAX_FILE_SIZE_MB}MB)` });
        }
    }

    try {
        const extracted = await Promise.all(
            valid.map((f) => extractTextFromFile(f.name, f.content))
        );
        const combined = extracted
            .map(({ name, text }) => `[Document: ${name}]\n${(text || '').slice(0, 20000)}`)
            .join('\n\n---\n\n');
        const textForPrompt = combined.slice(0, MAX_TEXT_LENGTH);

        const schemaStr = JSON.stringify(FORM_SCHEMA_TEMPLATE, null, 2);
        const prompt = `You are an expert at understanding property documents and filling structured forms. Your task is to:

1. UNDERSTAND THE SCHEMA: Read the JSON schema below. Each key has a meaning (e.g. location = where the property is, pricing = amounts and currency, residential = beds/baths/parking for homes, investmentType = primary_home, holiday_real_estate, long_term_rentals, short_term_rentals). You must output valid JSON that matches this exact structure.

2. UNDERSTAND THE DOCUMENTS: Read all the document content. Documents may be listing forms, CMAs, condition reports, fixtures lists, deeds, title reports, tax statements, etc. They can refer to the same property. Use full context: combine information from multiple documents, resolve contradictions by preferring the most specific or recent source, and infer meaning from context (e.g. "to let" → for_rent, "for sale" → for_sale, "auction" → for_auction).

3. FILL THE SCHEMA BY CONTEXT:
   - Map addresses, names, and numbers to the correct schema fields even if wording differs (e.g. "Erf 102" → jurisdiction.statutoryIdentifiers, "R 2.7m" or "2 700 000" → pricing.askingPrice or pricing.purchasePrice).
   - Infer currency from location: if country is South Africa / SA / ZA or the doc mentions Rand or "R" for money, use pricing.currency "ZAR". If USA/US/United States or "$", use "USD". Otherwise infer from context.
   - Infer listing type from context: sale, rent, auction, or combined.
   - For residential: bedrooms, bathrooms, livingAreaSize, parkingSpaces from any section that states them (tables, bullet points, or prose).
   - Use the exact schema key names and nesting. Leave strings as "" and arrays as [] only when the information is truly not present or inferable.

Allowed values where applicable:
- listingType: one of ["for_sale","for_rent","for_auction"]
- investmentType: one of ["primary_home","holiday_real_estate","long_term_rentals","short_term_rentals"] (only if clearly indicated)
- propertyCategory: one of ["Residential","Commercial","Land","Office","Industrial","Agricultural","Development"] (schema also allows "Retail")
- ownership.mandate: "Sole Mandate" | "Open Mandate" | "Joint Mandate"
- ownership.listingVisibility: "Public Listing" | "Verified buyers only" | "Off-market / private"
- propertySize.unitSystem: "sqm" | "sqft" | "acres" | "hectares"
- Numbers as strings (e.g. "3" for bedrooms). location.coordinates.lat/lng: number or null. defects.*.aware: boolean.

Schema structure (output valid JSON only, no markdown):
${schemaStr}

Documents content:
${textForPrompt}

Return a single JSON object that matches the schema structure above, with every field filled from document context where possible. Output only the JSON object, no explanation.`;

        const claudeRes = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: CLAUDE_MODEL,
                max_tokens: 8192,
                system: 'You are an expert at extracting structured property data from documents. Reply with valid JSON only, no markdown code fences or explanation.',
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!claudeRes.ok) {
            const errText = await claudeRes.text();
            console.error('[extract-property] Claude API error', claudeRes.status, errText);
            return res.status(502).json({ error: 'AI extraction failed', detail: errText.slice(0, 300) });
        }
        const claudeData = await claudeRes.json();
        const textFromResponse = (claudeData?.content?.[0]?.text || '').trim();
        let raw = textFromResponse;
        if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '');
        }
        const parsed = JSON.parse(raw);
        const merged = deepMerge(FORM_SCHEMA_TEMPLATE, parsed);

        return res.status(200).json({ formData: merged });
    } catch (e) {
        const message = e && e.message ? e.message : String(e);
        console.error('Extract property error:', message);
        return res.status(500).json({ error: 'Extraction failed', detail: message });
    }
};
