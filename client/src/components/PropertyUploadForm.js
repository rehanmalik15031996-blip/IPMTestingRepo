import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../config/api';
import { showNotification } from './NotificationManager';
import GooglePlacesInput from './GooglePlacesInput';
import { getPropertyLimitForUser } from '../utils/planLimits';
import { useIsMobile } from '../hooks/useMediaQuery';
import { currencyOptions, getCurrencyForCountry } from '../i18n/translations';
import { dedupePropertyTitle } from '../utils/propertyTitle';

// Aggressive compression for fast dashboard loads and lower bandwidth. Target ~300KB per image, max 1200px.
const compressImageBase64 = (dataUrl, maxWidth = 1200, maxSizeKB = 300) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return dataUrl;
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;
            if (w > maxWidth || h > maxWidth) {
                if (w > h) {
                    h = (h / w) * maxWidth;
                    w = maxWidth;
                } else {
                    w = (w / h) * maxWidth;
                    h = maxWidth;
                }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            let quality = 0.7;
            const tryBlob = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(dataUrl);
                            return;
                        }
                        if (blob.size <= maxSizeKB * 1024 || quality <= 0.25) {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        } else {
                            quality -= 0.1;
                            tryBlob();
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            tryBlob();
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
};

const REQUIREMENTS_CSV = `country_code,country_name,category,requirement_type,field_name,field_description,is_mandatory,validation_status_options,notes
ZA,South Africa,jurisdiction,statutory_identifier,Erf Number,Property erf/lot number,TRUE,"required,uploaded,verified",Unique cadastral identifier
ZA,South Africa,jurisdiction,statutory_identifier,Title Deed Number,Title deed registration number,TRUE,"required,uploaded,verified",From Deeds Office
ZA,South Africa,jurisdiction,statutory_identifier,Municipal Account Number,Municipal rates account number,TRUE,"required,uploaded,verified",For rates verification
ZA,South Africa,mandatory_docs,upload,Title Deed,Certified copy of title deed,TRUE,"required,uploaded,verified",From Deeds Office
ZA,South Africa,mandatory_docs,upload,Rates Clearance Certificate,Municipal rates clearance,TRUE,"required,uploaded,verified",Must be under 6 months old
ZA,South Africa,mandatory_docs,upload,Electrical Certificate,Electrical compliance certificate (COC),TRUE,"required,uploaded,verified",Mandatory for sale
ZA,South Africa,mandatory_docs,upload,Beetle Certificate,Beetle and wood borer certificate,TRUE,"required,uploaded,verified",Mandatory for properties with wood
ZA,South Africa,legal_docs,upload,FICA Documents,Seller FICA documentation,TRUE,"required,uploaded,verified",ID/proof of address
ZA,South Africa,legal_docs,upload,Building Plans,Approved building plans,TRUE,"required,uploaded,verified",Municipal approved plans
ZA,South Africa,legal_docs,upload,Building Restrictions,Title deed restrictions and servitudes,TRUE,"required,uploaded,verified",Extract from title deed
GB,United Kingdom,jurisdiction,statutory_identifier,Title Number,Land Registry title number,TRUE,"required,uploaded,verified",Unique property identifier
GB,United Kingdom,jurisdiction,statutory_identifier,Property Address UPRN,Unique Property Reference Number,TRUE,"required,uploaded,verified",From local authority
GB,United Kingdom,jurisdiction,statutory_identifier,Council Tax Band,Council tax band classification,TRUE,"required,uploaded,verified",A-H classification
GB,United Kingdom,jurisdiction,statutory_identifier,Tenure Type,Freehold or Leasehold identifier,TRUE,"required,uploaded,verified",Affects legal requirements
GB,United Kingdom,mandatory_docs,upload,Title Register,Official copy of title register,TRUE,"required,uploaded,verified",From Land Registry
GB,United Kingdom,mandatory_docs,upload,Title Plan,Official copy of title plan,TRUE,"required,uploaded,verified",Shows property boundaries
GB,United Kingdom,mandatory_docs,upload,EPC Certificate,Energy Performance Certificate,TRUE,"required,uploaded,verified",Must be valid (10 years)
GB,United Kingdom,mandatory_docs,upload,TA6 Form,Property information form,TRUE,"required,uploaded,verified",Standard seller disclosure
GB,United Kingdom,mandatory_docs,upload,Fittings and Contents Form,TA10 form for fixtures,TRUE,"required,uploaded,verified",What's included in sale
US,United States,jurisdiction,statutory_identifier,APN/Parcel Number,Assessor's Parcel Number,TRUE,"required,uploaded,verified",From county assessor
US,United States,jurisdiction,statutory_identifier,Legal Description,Full legal property description,TRUE,"required,uploaded,verified",Metes and bounds or lot/block
US,United States,jurisdiction,statutory_identifier,Property Tax ID,Tax identification number,TRUE,"required,uploaded,verified",For tax records
US,United States,jurisdiction,statutory_identifier,Zoning Classification,Current zoning designation,TRUE,"required,uploaded,verified",Affects permitted use
US,United States,mandatory_docs,upload,Deed,Current property deed,TRUE,"required,uploaded,verified",Grant deed/warranty deed
US,United States,mandatory_docs,upload,Preliminary Title Report,Title company report,TRUE,"required,uploaded,verified",Shows title status
US,United States,mandatory_docs,upload,Property Disclosure,State-mandated seller disclosure,TRUE,"required,uploaded,verified",Varies by state
US,United States,legal_docs,upload,Property Tax Statement,Recent property tax bill,TRUE,"required,uploaded,verified",Shows current taxes
NL,Netherlands,jurisdiction,statutory_identifier,Cadastral Number,Kadastrale aanduiding,TRUE,"required,uploaded,verified",Unique property identifier
NL,Netherlands,jurisdiction,statutory_identifier,BAG ID,Basisregistraties Adressen en Gebouwen ID,TRUE,"required,uploaded,verified",National building database ID
NL,Netherlands,jurisdiction,statutory_identifier,Municipality Code,Gemeentecode,TRUE,"required,uploaded,verified",Municipal registration
NL,Netherlands,mandatory_docs,upload,Cadastral Extract,Kadastrale uittreksel,TRUE,"required,uploaded,verified",From Kadaster
NL,Netherlands,mandatory_docs,upload,Energy Label,Energielabel certificate,TRUE,"required,uploaded,verified",Mandatory for all properties
NL,Netherlands,mandatory_docs,upload,Measurement Report,NEN 2580 meetrapport,TRUE,"required,uploaded,verified",Official floor area measurement
DE,Germany,jurisdiction,statutory_identifier,Grundbuch Number,Land register number,TRUE,"required,uploaded,verified",Official property register ID
DE,Germany,jurisdiction,statutory_identifier,Flurstück Number,Plot/parcel number,TRUE,"required,uploaded,verified",Cadastral plot identifier
DE,Germany,jurisdiction,statutory_identifier,Gemarkung,Cadastral district,TRUE,"required,uploaded,verified",Geographic district designation
DE,Germany,jurisdiction,statutory_identifier,Tax Number,Steuer-ID for property,TRUE,"required,uploaded,verified",Property tax identification
DE,Germany,mandatory_docs,upload,Grundbuch Extract,Land register extract,TRUE,"required,uploaded,verified",From Grundbuchamt
DE,Germany,mandatory_docs,upload,Energieausweis,Energy performance certificate,TRUE,"required,uploaded,verified",Mandatory since 2009
DE,Germany,mandatory_docs,upload,Flurkarte,Cadastral map,TRUE,"required,uploaded,verified",Official plot map
DE,Germany,mandatory_docs,upload,Building Description,Baubeschreibung,TRUE,"required,uploaded,verified",Detailed building specifications
DE,Germany,mandatory_docs,upload,Floor Plans,Grundrisse,TRUE,"required,uploaded,verified",Official architectural plans
DE,Germany,legal_docs,upload,Property Tax Assessment,Grundsteuerbescheid,TRUE,"required,uploaded,verified",Current property tax notice
AE,United Arab Emirates,jurisdiction,statutory_identifier,Title Deed Number,Oqood/Title deed number,TRUE,"required,uploaded,verified",From Dubai Land Department/ADRE
AE,United Arab Emirates,jurisdiction,statutory_identifier,Plot Number,Makani/Plot number,TRUE,"required,uploaded,verified",Official plot designation
AE,United Arab Emirates,jurisdiction,statutory_identifier,DEWA Premise Number,DEWA account number,TRUE,"required,uploaded,verified",Dubai Electricity & Water Authority
AE,United Arab Emirates,mandatory_docs,upload,Title Deed,Official title deed copy,TRUE,"required,uploaded,verified",From land department
AE,United Arab Emirates,mandatory_docs,upload,NOC from Developer,No objection certificate,TRUE,"required,uploaded,verified",Developer clearance for sale
AE,United Arab Emirates,mandatory_docs,upload,Passport Copy,Seller passport copy,TRUE,"required,uploaded,verified",For identity verification
AE,United Arab Emirates,mandatory_docs,upload,Emirates ID,Seller Emirates ID,TRUE,"required,uploaded,verified",Mandatory identification
AE,United Arab Emirates,mandatory_docs,upload,Service Charges Certificate,Paid service charges clearance,TRUE,"required,uploaded,verified",From property management
AE,United Arab Emirates,mandatory_docs,upload,DEWA Clearance,Utility clearance certificate,TRUE,"required,uploaded,verified",No outstanding bills
AE,United Arab Emirates,legal_docs,upload,MOU/SPA,Sales purchase agreement,TRUE,"required,uploaded,verified",Formal sale contract
ES,Spain,jurisdiction,statutory_identifier,Referencia Catastral,Cadastral reference number,TRUE,"required,uploaded,verified",Unique property identifier
ES,Spain,jurisdiction,statutory_identifier,Registro de la Propiedad,Property registry number,TRUE,"required,uploaded,verified",From property registry office
ES,Spain,jurisdiction,statutory_identifier,NIE/DNI,Tax identification number,TRUE,"required,uploaded,verified",Seller tax ID
ES,Spain,jurisdiction,statutory_identifier,IBI Receipt Number,Property tax receipt reference,TRUE,"required,uploaded,verified",Annual property tax (Impuesto sobre Bienes Inmuebles)
ES,Spain,mandatory_docs,upload,Escritura,Title deed (Escritura Pública),TRUE,"required,uploaded,verified",Notarized property deed
ES,Spain,mandatory_docs,upload,Nota Simple,Registry note,TRUE,"required,uploaded,verified",Property registry extract
ES,Spain,mandatory_docs,upload,Energy Certificate,Certificado de Eficiencia Energética,TRUE,"required,uploaded,verified",Mandatory EPC
ES,Spain,mandatory_docs,upload,IBI Receipt,Property tax receipt,TRUE,"required,uploaded,verified",Last paid IBI receipt
ES,Spain,mandatory_docs,upload,Habitability Certificate,Cédula de Habitabilidad,TRUE,"required,uploaded,verified",Required in certain regions
ES,Spain,legal_docs,upload,Bank Account Details,IBAN for payments,TRUE,"required,uploaded,verified",For deposit and payment processing`;

const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result.map((value) => value.trim());
};

const PROPERTY_REQUIREMENTS = REQUIREMENTS_CSV
    .trim()
    .split('\n')
    .slice(1)
    .map(parseCsvLine)
    .map(([country_code, country_name, category, requirement_type, field_name, field_description, is_mandatory]) => ({
        country_code,
        country_name,
        category,
        requirement_type,
        field_name,
        field_description,
        is_mandatory: String(is_mandatory || '').toUpperCase() === 'TRUE'
    }));

const normalizeCountryName = (countryName) => {
    const name = String(countryName || '').trim().toLowerCase();
    if (name === 'usa' || name === 'u.s.a.' || name === 'u.s.' || name === 'us' || name === 'united states of america' || name === 'united states' || name === 'america') return 'united states';
    if (name === 'uk' || name === 'u.k.' || name === 'gb' || name === 'great britain' || name === 'united kingdom') return 'united kingdom';
    if (name === 'uae' || name === 'u.a.e.' || name === 'united arab emirates' || name === 'dubai' || name === 'ae') return 'united arab emirates';
    if (name === 'za' || name === 'sa' || name === 'south africa' || name === 'rsa') return 'south africa';
    if (name === 'de' || name === 'germany') return 'germany';
    if (name === 'nl' || name === 'netherlands' || name === 'holland') return 'netherlands';
    if (name === 'es' || name === 'spain' || name === 'españa' || name === 'espana') return 'spain';
    if (name === 'it' || name === 'italy' || name === 'italia') return 'italy';
    if (name === 'gr' || name === 'greece') return 'greece';
    if (name === 'br' || name === 'brazil') return 'brazil';
    if (name === 'ca' || name === 'canada') return 'canada';
    if (name === 'au' || name === 'australia') return 'australia';
    if (name === 'nz' || name === 'new zealand') return 'new zealand';
    if (name === 'id' || name === 'indonesia') return 'indonesia';
    if (name === 'mt' || name === 'malta') return 'malta';
    return name;
};

/** Map address country (from location) or stored code (e.g. ZA) to jurisdiction dropdown value. */
const jurisdictionValueFromAddress = (addressCountry) => {
    const n = normalizeCountryName(addressCountry);
    const map = {
        'united states': 'USA',
        'united kingdom': 'UK',
        'united arab emirates': 'UAE',
        'canada': 'Canada',
        'australia': 'Australia',
        'netherlands': 'Netherlands',
        'south africa': 'South Africa',
        'greece': 'Greece',
        'indonesia': 'Indonesia',
        'new zealand': 'New Zealand',
        'brazil': 'Brazil',
        'spain': 'Spain',
        'italy': 'Italy',
        'malta': 'Malta',
        'germany': 'Germany',
        'asia': 'Asia'
    };
    return map[n] || addressCountry || '';
};

const getApplicableDocs = (formData, userRole) => {
    const countryForDocs = formData.jurisdiction?.country || formData.location?.country;
    const normalizedCountry = normalizeCountryName(countryForDocs);
    const isLandOrFarm = (formData.propertyCategory || '').toLowerCase() === 'land' || (formData.propertyCategory || '').toLowerCase() === 'agricultural';
    const countryDocs = PROPERTY_REQUIREMENTS
        .filter((req) => normalizeCountryName(req.country_name) === normalizedCountry)
        .filter((req) => req.category === 'mandatory_docs' || req.category === 'legal_docs')
        .filter((req) => req.field_name !== 'Building Plans')
        .map((req) => ({
            key: `${req.country_code}:${req.field_name}`,
            name: req.field_name,
            required: Boolean(req.is_mandatory),
            target: req.category === 'legal_docs' ? 'legalDocs' : 'mandatoryDocs',
            source: 'country'
        }));

    const isAgencyListing = userRole === 'agency' || userRole === 'agency_agent';
    const isAgentListing = ['agent', 'independent_agent', 'agency_agent', 'agency'].includes(userRole);
    const isRental = formData.listingType === 'for_rent';
    const esgRequiredCountries = ['netherlands'];
    const esgRequired = esgRequiredCountries.includes(normalizedCountry);
    const esgApplicable = esgRequired || Boolean(formData.documents?.esgApplicable);

    const isSoldMandate = (formData.ownership?.mandate || '').toLowerCase().includes('sold');
    // Licence removed from all flows (handled in settings). Levy bills, Property Disclosure, Property Tax Statement dropped per product.
    const baseDocs = [
        { key: 'mandate_form', name: 'Mandate Form', required: isAgencyListing && isSoldMandate, target: 'mandatoryDocs', show: isAgencyListing },
        { key: 'listing_document', name: 'Listing Document', required: isAgentListing, target: 'mandatoryDocs', show: true },
        { key: 'esg_documents', name: 'Sustainability Documents', required: esgRequired, target: 'mandatoryDocs', show: esgApplicable },
        { key: 'rental_agreement', name: 'Rental Agreement', required: false, target: 'mandatoryDocs', show: isRental },
        { key: 'floorplans', name: 'Floorplans', required: false, target: 'mandatoryDocs', show: true },
        { key: 'zoning_documents', name: 'Zoning Documents', required: true, target: 'mandatoryDocs', show: isLandOrFarm }
    ].filter((doc) => doc.show);

    const excludedCountryDocNames = ['Property Disclosure', 'Property Tax Statement'];
    const filteredCountryDocs = countryDocs.filter((d) => !excludedCountryDocNames.includes(d.name));

    return [...baseDocs, ...filteredCountryDocs];
};

const getMissingRequiredDocs = (formData, userRole) => {
    const docs = getApplicableDocs(formData, userRole);
    return docs.filter((doc) => doc.required).filter((doc) => {
        const sourceList = doc.target === 'legalDocs'
            ? (formData.legalDocs || [])
            : (formData.mandatoryDocs || []);
        return !sourceList.some((item) => item.key === doc.key && item.fileUrl);
    });
};

const getDefaultFormData = () => ({
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
        region: '',
        streetAddress: '',
        postalCode: '',
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
        currentValuation: '',
        vatGstInclusive: false,
        estimatedClosingCosts: '',
        transferTaxes: '',
        transferTaxesCoverage: '' // 'included' | 'excluded' — coverage by developer
    },
    availability: {
        status: '',
        availableFrom: ''
    },
    propertySize: {
        unitSystem: 'sqm',
        size: '',
        landSize: '',
        landSizeUnit: 'acres',
        livingArea: '',
        grossFloorArea: '',
        floorLevel: ''
    },
    ownership: {
        mandate: 'Sole Mandate',
        mandateStartDate: '',
        mandateEndDate: '',
        listingVisibility: 'Public Listing',
        ownershipStructure: ''
    },
    jurisdiction: {
        country: '',
        statutoryIdentifiers: {},
        jurisdictionMismatchAcknowledged: false
    },
    documents: {
        esgApplicable: false
    },
    proximity: {
        distanceToInternationalSchool: '',
        distanceToAirport: '',
        publicTransportConnectivity: ''
    },
    mandatoryDocs: [],
    fixtures: {
        utilitySystems: [],
        securityFeatures: [],
        kitchenAppliances: [],
        leisureExternal: [],
        interiorFeatures: [],
        parkingStorage: [],
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
    declarations: {
        agentDeclaration: false,
        complianceAcknowledgment: false,
        imagesConfirmed: false
    },
    developmentId: '',
    developmentUnitGroup: '',
    developmentUnitLabel: '',
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
        mediaRights: {
            hasRights: false,
            accurateRepresentation: false,
            noMisleadingEdits: false
        },
        aiOptimization: false
    },
    residential: {},
    land: {},
    industrial: {},
    office: {},
    commercial: {},
    agricultural: {},
    rentalSpecific: {},
    auctionDetails: {},
    status: 'Draft',
    readinessScore: 0,
    aiSuggestions: [],
    mortgage: {
        hasMortgage: false,
        originalMortgageAmount: '',
        mortgageDate: '',
        term: '',
        outstandingBalance: '',
        monthlyRepayment: ''
    }
});

/** Only fill form fields where current value is empty. Preserves user's step 1–3 choices. */
const deepMergeFillGaps = (current, extracted) => {
    const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0);
    const result = { ...current };
    for (const [k, v] of Object.entries(extracted)) {
        if (v === undefined) continue;
        const cur = result[k];
        if (cur != null && typeof cur === 'object' && !Array.isArray(cur) && typeof v === 'object' && !Array.isArray(v)) {
            result[k] = deepMergeFillGaps(cur, v);
        } else if (isEmpty(cur)) {
            result[k] = v;
        }
    }
    return result;
};

/**
 * Parse top-level price string (e.g. "USD 3122112") into { currency?, purchasePrice? } for seller flow.
 * Only returns `currency` when a 3-letter code is explicit — numeric-only strings do not imply USD (avoids
 * overwriting imported `pricing.currency` e.g. ZAR when `property.price` is just a number).
 */
function parsePriceString(priceStr) {
    if (!priceStr || typeof priceStr !== 'string') return {};
    const trimmed = priceStr.trim();
    const leading = trimmed.match(/^([A-Za-z]{3})\s+([\d.,]+)\s*$/);
    if (leading) {
        const num = parseFloat(leading[2].replace(/,/g, ''));
        if (!isNaN(num)) return { currency: leading[1].toUpperCase(), purchasePrice: num };
    }
    const trailing = trimmed.match(/^([\d.,]+)\s+([A-Za-z]{3})\s*$/);
    if (trailing) {
        const num = parseFloat(trailing[1].replace(/,/g, ''));
        if (!isNaN(num)) return { currency: trailing[2].toUpperCase(), purchasePrice: num };
    }
    const numOnly = parseFloat(trimmed.replace(/[^0-9.]/g, ''));
    if (!isNaN(numOnly)) return { purchasePrice: numOnly };
    return {};
}

/** ISO 4217 for listing pricing when API omits `pricing.currency` (must exist in `currencyOptions`). */
function listingCurrencyFromNormalizedCountry(normalized) {
    if (!normalized) return '';
    const map = {
        'south africa': 'ZAR',
        'united states': 'USD',
        'united kingdom': 'GBP',
        'united arab emirates': 'AED',
        'canada': 'CAD',
        'australia': 'AUD',
        'netherlands': 'EUR',
        'greece': 'EUR',
        'spain': 'EUR',
        'italy': 'EUR',
        'malta': 'EUR',
        'germany': 'EUR',
        'brazil': 'BRL',
        'singapore': 'SGD',
        'hong kong': 'HKD',
        'japan': 'JPY',
        'china': 'CNY',
        'india': 'INR',
        'mexico': 'MXN',
        'saudi arabia': 'SAR',
        'switzerland': 'CHF'
    };
    return map[normalized] || '';
}

/** Join address segments without repeating tokens (e.g. full line in street + same suburb again). */
function mergeLocationPartsForPayload(streetLine, suburb, city, region, country, postalCode) {
    const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const chunks = [];
    const seen = new Set();
    const addPieces = (val) => {
        if (val == null || val === '') return;
        const s = String(val).trim();
        if (!s) return;
        for (const piece of s.split(',').map((p) => p.trim()).filter(Boolean)) {
            const n = norm(piece);
            if (!n || seen.has(n)) continue;
            seen.add(n);
            chunks.push(piece);
        }
    };
    addPieces(streetLine);
    addPieces(suburb);
    addPieces(city);
    addPieces(region);
    addPieces(country);
    addPieces(postalCode);
    return chunks.join(', ');
}

const mapPropertyToFormData = (property) => {
    const defaults = getDefaultFormData();
    if (!property) return defaults;

    const pricingObj = property.pricing || {};
    const pricingFromApi = { ...defaults.pricing, ...pricingObj };
    const hasExplicitPricingCurrency =
        Object.prototype.hasOwnProperty.call(pricingObj, 'currency') &&
        pricingObj.currency != null &&
        String(pricingObj.currency).trim() !== '';
    const hasPurchasePrice = pricingFromApi.purchasePrice != null && pricingFromApi.purchasePrice !== '';
    let currencySetFromPriceString = false;
    if (!hasPurchasePrice && property.price) {
        const parsed = parsePriceString(property.price);
        if (parsed.currency) {
            pricingFromApi.currency = parsed.currency;
            currencySetFromPriceString = true;
        }
        if (parsed.purchasePrice != null) pricingFromApi.purchasePrice = parsed.purchasePrice;
    }

    const ld = { ...(property.locationDetails || {}) };
    const locationForForm = {
        ...defaults.location,
        ...(property.location && !property.locationDetails ? { streetAddress: property.location } : {}),
        ...ld,
    };
    /** Prefer API `location` when it is the full imported line; else street-only + structured fields. */
    const primaryLine =
        (property.location && String(property.location).trim()) ||
        (locationForForm.streetAddress && String(locationForForm.streetAddress).trim()) ||
        '';
    const displayStreet = mergeLocationPartsForPayload(
        primaryLine,
        locationForForm.suburb,
        locationForForm.city,
        locationForForm.region,
        locationForForm.country,
        locationForForm.postalCode
    );

    if (!hasExplicitPricingCurrency && !currencySetFromPriceString) {
        const countryRaw =
            property.jurisdiction?.country ||
            locationForForm.country ||
            ld.country ||
            '';
        const inferred = listingCurrencyFromNormalizedCountry(normalizeCountryName(countryRaw));
        if (inferred) pricingFromApi.currency = inferred;
    }

    return {
        ...defaults,
        listingType: property.listingType || defaults.listingType,
        propertyCategory: property.propertyCategory || defaults.propertyCategory,
        propertyType: property.propertyType || property.type || defaults.propertyType,
        investmentType: property.investmentType || defaults.investmentType,
        propertyTitle: property.title || defaults.propertyTitle,
        shortDescription: property.description || defaults.shortDescription,
        location: {
            ...locationForForm,
            streetAddress: displayStreet || locationForForm.streetAddress || '',
        },
        pricing: pricingFromApi,
        availability: { ...defaults.availability, ...(property.availability || {}) },
        propertySize: { ...defaults.propertySize, ...(property.propertySize || {}) },
        ownership: { ...defaults.ownership, ...(property.ownership || {}) },
        jurisdiction: (() => {
            const rawJur = property.jurisdiction?.country;
            const rawLoc = ld.country || locationForForm.country;
            let pick =
                (rawJur != null && String(rawJur).trim()) ||
                (rawLoc != null && String(rawLoc).trim()) ||
                '';
            if (!pick && displayStreet) {
                const parts = displayStreet.split(',').map((p) => p.trim()).filter(Boolean);
                for (let i = parts.length - 1; i >= 0; i -= 1) {
                    if (jurisdictionValueFromAddress(parts[i])) {
                        pick = parts[i];
                        break;
                    }
                }
            }
            const resolved =
                (pick && (jurisdictionValueFromAddress(pick) || String(pick).trim())) ||
                defaults.jurisdiction.country ||
                '';
            return {
                ...defaults.jurisdiction,
                ...(property.jurisdiction || {}),
                country: resolved,
            };
        })(),
        documents: { ...defaults.documents, ...(property.documents || {}) },
        mandatoryDocs: property.mandatoryDocs || defaults.mandatoryDocs,
        legalDocs: property.legalDocs || defaults.legalDocs,
        fixtures: { ...defaults.fixtures, ...(property.fixtures || {}) },
        defects: { ...defaults.defects, ...(property.defects || {}) },
        media: { ...defaults.media, ...(property.media || {}) },
        residential: property.residential || defaults.residential,
        land: property.land || defaults.land,
        industrial: property.industrial || defaults.industrial,
        office: property.office || defaults.office,
        commercial: property.commercial || defaults.commercial,
        agricultural: property.agricultural || defaults.agricultural,
        rentalSpecific: property.rentalSpecific || defaults.rentalSpecific,
        auctionDetails: property.auctionDetails || defaults.auctionDetails,
        mortgage: { ...defaults.mortgage, ...(property.mortgage || {}) },
        declarations: { ...defaults.declarations, ...(property.declarations || {}) },
        status: property.status || defaults.status,
        readinessScore: property.readinessScore || defaults.readinessScore,
        aiSuggestions: property.aiSuggestions || defaults.aiSuggestions,
        developmentId: property.developmentId || defaults.developmentId,
        developmentUnitGroup: property.developmentUnitGroup || defaults.developmentUnitGroup,
        developmentUnitLabel: property.developmentUnitLabel || defaults.developmentUnitLabel
    };
};

const STEP_TITLES = [
    'Select Listing Type',
    'Property Type',
    'Property Location',
    'Upload Documents',
    'Pricing & Availability',
    'Listing Details',
    'Jurisdiction & Regulatory',
    'Fixtures & Fittings',
    'Defects Disclosure',
    'Legal Documents',
    'Media & Images',
    'Category-Specific',
    'Listing Summary'
];

const SELLER_STEP_TITLES = [
    'Select Investment Type',
    'Property Type',
    'Property Location',
    'Upload Documents',
    'Purchase Price & Valuation',
    'Mortgage',
    'Media & Images',
    'Category-Specific'
];

const SELLER_UPLOAD_DOCS = [
    { key: 'floorplans', name: 'Floorplans', required: false, target: 'mandatoryDocs' },
    { key: 'deed', name: 'Deed', required: false, target: 'mandatoryDocs' },
    { key: 'title_report', name: 'Preliminary Title Report', required: false, target: 'mandatoryDocs' }
];

const PropertyUploadForm = ({ isOpen, onClose, onSuccess, initialData = null, propertyId = null, agencyAgentOptions = null, defaultAssignToId = null, onOpenAddAgent = null }) => {
    const isMobile = useIsMobile();
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userRole = user?.role?.toLowerCase();
    const isEditMode = Boolean(propertyId);
    const isSellerFlow = ['seller', 'buyer', 'investor', 'landlord'].includes(userRole);
    const isAgencyContext = userRole === 'agency' && Array.isArray(agencyAgentOptions) && agencyAgentOptions.length > 0;
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState(() => mapPropertyToFormData(initialData));
    const [assignToAgentId, setAssignToAgentId] = useState(() => (defaultAssignToId != null ? defaultAssignToId : (initialData && initialData.agentId != null ? initialData.agentId : user?._id)) || null);
    const [extractingFromDocs, setExtractingFromDocs] = useState(false);
    const [extractionPreview, setExtractionPreview] = useState(null);
    const [showLegalOwnershipPopup, setShowLegalOwnershipPopup] = useState(false);
    const [listingMetadata, setListingMetadata] = useState(initialData?.listingMetadata || null);
    const [showListingMetadataModal, setShowListingMetadataModal] = useState(false);
    const [metadataLoadSteps, setMetadataLoadSteps] = useState([]); // { label, status: 'pending'|'loading'|'done'|'error' }
    const [metadataLoadComplete, setMetadataLoadComplete] = useState(false); // true when we can show Continue
    /** When false, closing the enrichment modal stays on Property Location (manual "Rerun AI data"). */
    const [metadataModalShouldAdvanceStep, setMetadataModalShouldAdvanceStep] = useState(true);
    const missingRequiredDocs = getMissingRequiredDocs(formData, userRole);
    const stepContentRef = useRef(null);
    const lastInitializedForRef = useRef(null);
    const [developmentsList, setDevelopmentsList] = useState([]);
    const [showCreateDevModal, setShowCreateDevModal] = useState(false);
    const [newDevForm, setNewDevForm] = useState({ title: '', location: '', completion: '', description: '' });
    const [createDevSubmitting, setCreateDevSubmitting] = useState(false);

    const refetchDevelopments = useCallback(() => {
        if (!user?._id) return;
        const q = userRole === 'agency' ? `agencyId=${encodeURIComponent(user._id)}` : `agentId=${encodeURIComponent(user._id)}`;
        return api.get(`/api/developments?${q}`).then((r) => {
            if (r.data && Array.isArray(r.data)) {
                setDevelopmentsList(r.data.filter((d) => d.source === 'development' && d._id));
            }
        });
    }, [user?._id, userRole]);

    useEffect(() => {
        refetchDevelopments().catch(() => {});
    }, [refetchDevelopments]);

    const LISTING_METADATA_URL = process.env.REACT_APP_LISTING_METADATA_URL || 'https://get-listing-metadata-541421913321.europe-west4.run.app';

    const METADATA_LOAD_STEP_LABELS = [
        'Initializing enrichment pipeline',
        'Syncing with property intelligence networks',
        'Synthesizing valuation & market signals',
        'Complete'
    ];

    const setMetadataStep = (stepIndex, status) => {
        setMetadataLoadSteps((prev) => {
            const next = prev.map((s, i) => (i === stepIndex ? { ...s, status } : s));
            return next;
        });
    };

    const generateRequestId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };

    const isRentalInvestment = (formData.investmentType === 'long_term_rentals' || formData.investmentType === 'short_term_rentals');
    const isDevelopment = (formData.propertyCategory || '').toLowerCase() === 'development';
    const agencyStepList = isDevelopment ? [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 13] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13];
    const totalSteps = isSellerFlow ? (isRentalInvestment ? 9 : 8) : agencyStepList.length;
    const stepTitles = isSellerFlow
        ? (isRentalInvestment ? [...SELLER_STEP_TITLES.slice(0, 4), 'Rental Details', ...SELLER_STEP_TITLES.slice(4)] : SELLER_STEP_TITLES)
        : agencyStepList.map((stepNum) => STEP_TITLES[stepNum - 1]);
    const actualStep = isSellerFlow ? currentStep : agencyStepList[currentStep - 1];

    useEffect(() => {
        if (!initialData) {
            lastInitializedForRef.current = null;
            return;
        }
        const next = mapPropertyToFormData(initialData);
        const editKey = propertyId ? `${propertyId}` : 'new';
        const alreadyInitialized = lastInitializedForRef.current === editKey;

        if (!propertyId || !user?._id) {
            setFormData(next);
            setListingMetadata(initialData?.listingMetadata || null);
            if (!alreadyInitialized) {
                setCurrentStep(1);
                setErrors({});
                lastInitializedForRef.current = editKey;
            }
            return;
        }
        api.get('/api/vault', { params: { userId: user._id, propertyId } })
            .then((res) => {
                const raw = res.data;
                const files = Array.isArray(raw) ? raw : (raw?.files || []);
                const docKeys = SELLER_UPLOAD_DOCS.map((d) => d.key);
                const byKey = {};
                files.forEach((f) => {
                    if (f.documentType && docKeys.includes(f.documentType)) {
                        byKey[f.documentType] = f;
                    }
                });
                files.forEach((f) => {
                    if (f.documentType) return;
                    const name = (f.name || '').trim();
                    for (const doc of SELLER_UPLOAD_DOCS) {
                        if (name.endsWith(' - ' + doc.name) && !byKey[doc.key]) {
                            byKey[doc.key] = f;
                            break;
                        }
                    }
                });
                const existing = next.mandatoryDocs || [];
                let merged = existing.map((d) => {
                    const v = d.key && byKey[d.key];
                    if (v) return { ...d, fileUrl: `vault:${v._id}`, name: v.name || d.name };
                    return d;
                });
                docKeys.forEach((key) => {
                    if (byKey[key] && !merged.some((m) => m.key === key)) {
                        merged.push({ key, name: byKey[key].name, fileUrl: `vault:${byKey[key]._id}`, required: false, uploaded: true });
                    }
                });
                setFormData({ ...next, mandatoryDocs: merged });
                setListingMetadata(initialData.listingMetadata || null);
            })
            .catch(() => setFormData(next))
            .finally(() => {
                if (!alreadyInitialized) {
                    setCurrentStep(1);
                    setErrors({});
                    lastInitializedForRef.current = editKey;
                }
            });
    }, [initialData, propertyId, user?._id]);

    useEffect(() => {
        if (!isOpen) lastInitializedForRef.current = null;
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && isAgencyContext) {
            const next = defaultAssignToId != null ? defaultAssignToId : (initialData && initialData.agentId != null ? initialData.agentId : user?._id);
            setAssignToAgentId(next || null);
        }
    }, [isOpen, isAgencyContext, defaultAssignToId, initialData?.agentId, user?._id]);

    // When entering jurisdiction step (7), default jurisdiction to property address country
    useEffect(() => {
        if (!isSellerFlow && currentStep === 7 && formData.location?.country && !formData.jurisdiction?.country) {
            const mapped = jurisdictionValueFromAddress(formData.location.country);
            if (mapped) {
                setFormData(prev => ({
                    ...prev,
                    jurisdiction: { ...prev.jurisdiction, country: mapped, jurisdictionMismatchAcknowledged: false }
                }));
            }
        }
    }, [currentStep, formData.location?.country, formData.jurisdiction?.country, isSellerFlow]);

    const handleInputChange = (path, value) => {
        setFormData(prev => {
            const keys = path.split('.');
            const newData = { ...prev };
            let current = newData;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                const existing = current[key];
                current[key] = (existing && typeof existing === 'object' && !Array.isArray(existing))
                    ? { ...existing }
                    : {};
                current = current[key];
            }
            current[keys[keys.length - 1]] = value;
            return newData;
        });
    };

    const handleExtractFromDocuments = async () => {
        const allowedExt = ['.pdf', '.doc', '.docx'];
        const collect = (list) => (list || []).filter((d) => d.fileUrl && typeof d.fileUrl === 'string' && d.fileUrl.startsWith('data:')).filter((d) => {
            const name = (d.name || '').toLowerCase();
            return allowedExt.some((ext) => name.endsWith(ext));
        });
        const fromMandatory = collect(formData.mandatoryDocs || []);
        const fromLegal = collect(formData.legalDocs || []);
        const all = [...fromMandatory, ...fromLegal];
        if (all.length === 0) {
            showNotification('Upload at least one PDF or Word document above, then click "Extract form data".', 'warning');
            return;
        }
        const files = all.map((d) => {
            const base64 = d.fileUrl.indexOf(',') >= 0 ? d.fileUrl.split(',')[1] : d.fileUrl;
            return { name: d.name || 'document.pdf', content: base64 };
        });
        setExtractingFromDocs(true);
        try {
            const res = await api.post('/api/extract-property', { files });
            const extracted = res.data && res.data.formData;
            if (!extracted) {
                showNotification('No form data returned from extraction.', 'error');
                return;
            }
            setExtractionPreview(extracted);
            showNotification('Review the extracted data below, then apply or cancel.', 'success');
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.error || err.message;
            showNotification(msg || 'Extraction failed. Try again or fill the form manually.', 'error');
        } finally {
            setExtractingFromDocs(false);
        }
    };

    const handleApplyExtraction = () => {
        if (!extractionPreview) return;
        setFormData((prev) => deepMergeFillGaps(prev, extractionPreview));
        setExtractionPreview(null);
        showNotification('Form pre-filled from your documents. Review and edit as needed.', 'success');
    };

    const handleCancelExtraction = () => {
        setExtractionPreview(null);
    };

    // Pre-fill jurisdiction from address only when jurisdiction is not yet set (do not overwrite user selection)
    useEffect(() => {
        const locationCountry = formData.location?.country;
        const currentJurisdiction = formData.jurisdiction?.country;
        if (!locationCountry) return;
        if (currentJurisdiction !== undefined && currentJurisdiction !== '') return;
        const mapped = jurisdictionValueFromAddress(locationCountry) || locationCountry;
        setFormData(prev => ({
            ...prev,
            jurisdiction: {
                ...prev.jurisdiction,
                country: mapped
            }
        }));
    }, [formData.location?.country, formData.jurisdiction?.country]);

    const validateStep = (step) => {
        const newErrors = {};
        const stepToValidate = isSellerFlow ? step : step;

        if (isSellerFlow) {
            if (step === 1 && !formData.investmentType) {
                newErrors.investmentType = 'Please select an investment type';
            }
            if (step === 2 && !formData.propertyCategory) {
                newErrors.propertyCategory = 'Please select a property category';
            }
            if (step === 3) {
                const addressText = formData.location.streetAddress || '';
                const fallbackParts = addressText ? addressText.split(',').map((p) => p.trim()).filter(Boolean) : [];
                const fallbackCountry = fallbackParts.length >= 1 ? fallbackParts[fallbackParts.length - 1] : '';
                const fallbackCity = fallbackParts.length >= 3 ? fallbackParts[fallbackParts.length - 3] : (fallbackParts.length >= 2 ? fallbackParts[fallbackParts.length - 2] : '');
                const normalizedCountry = formData.location.country || fallbackCountry || '';
                const normalizedCity = formData.location.city || fallbackCity || '';
                if (normalizedCountry !== formData.location.country || normalizedCity !== formData.location.city) {
                    const autoCurrency = getCurrencyForCountry(normalizedCountry);
                    setFormData(prev => ({
                        ...prev,
                        location: { ...prev.location, country: normalizedCountry, city: normalizedCity },
                        pricing: { ...prev.pricing, currency: prev.pricing?.currency && prev.pricing.currency !== 'USD' ? prev.pricing.currency : autoCurrency },
                    }));
                }
                if (!normalizedCountry) newErrors.locationCountry = 'Country is required';
                if (!normalizedCity) newErrors.locationCity = 'City is required';
                if (!formData.location.streetAddress) newErrors.locationAddress = 'Street address is required';
            }
            const isRentalStep = step === 5 && (formData.investmentType === 'long_term_rentals' || formData.investmentType === 'short_term_rentals');
            if (isRentalStep && !formData.pricing?.monthlyRental) {
                newErrors.monthlyRental = 'Monthly rent is required';
            }
            const isMortgageStepNonRental = step === 6 && !(formData.investmentType === 'long_term_rentals' || formData.investmentType === 'short_term_rentals');
            const isMortgageStepRental = step === 7 && (formData.investmentType === 'long_term_rentals' || formData.investmentType === 'short_term_rentals');
            if (isMortgageStepNonRental || isMortgageStepRental) {
                if (formData.mortgage?.hasMortgage) {
                    if (!formData.mortgage.originalMortgageAmount) newErrors.originalMortgageAmount = 'Original mortgage amount is required';
                    if (!formData.mortgage.mortgageDate) newErrors.mortgageDate = 'Mortgage date is required';
                    if (!formData.mortgage.term) newErrors.term = 'Term is required';
                    if (!formData.mortgage.outstandingBalance && formData.mortgage.outstandingBalance !== 0) newErrors.outstandingBalance = 'Outstanding balance is required';
                    if (!formData.mortgage.monthlyRepayment && formData.mortgage.monthlyRepayment !== 0) newErrors.monthlyRepayment = 'Monthly repayment is required';
                }
            }
            setErrors(newErrors);
            return Object.keys(newErrors).length === 0;
        }

        if (step === 1 && !formData.listingType) {
            newErrors.listingType = 'Please select a listing type';
        }
        
        if (step === 2 && !formData.propertyCategory) {
            newErrors.propertyCategory = 'Please select a property category';
        }
        
        if (step === 3) {
            const addressText = formData.location.streetAddress || '';
            const fallbackParts = addressText
                ? addressText.split(',').map((p) => p.trim()).filter(Boolean)
                : [];
            const fallbackCountry = fallbackParts.length >= 1 ? fallbackParts[fallbackParts.length - 1] : '';
            const fallbackCity = fallbackParts.length >= 3
                ? fallbackParts[fallbackParts.length - 3]
                : (fallbackParts.length >= 2 ? fallbackParts[fallbackParts.length - 2] : '');

            const normalizedCountry = formData.location.country || fallbackCountry || '';
            const normalizedCity = formData.location.city || fallbackCity || '';

            if (normalizedCountry !== formData.location.country || normalizedCity !== formData.location.city) {
                const autoCurrency = getCurrencyForCountry(normalizedCountry);
                setFormData(prev => ({
                    ...prev,
                    location: {
                        ...prev.location,
                        country: normalizedCountry,
                        city: normalizedCity
                    },
                    pricing: { ...prev.pricing, currency: prev.pricing?.currency && prev.pricing.currency !== 'USD' ? prev.pricing.currency : autoCurrency }
                }));
            }

            if (!normalizedCountry) newErrors.locationCountry = 'Country is required';
            if (!normalizedCity) newErrors.locationCity = 'City is required';
            if (!formData.location.streetAddress) newErrors.locationAddress = 'Street address is required';
        }

        if (step === 4) {
            // Do not block progression; required docs are enforced at publish time.
        }
        
        if (step === 5) {
            if (formData.listingType === 'for_rent' && !formData.pricing.monthlyRental) {
                newErrors.monthlyRental = 'Monthly rental is required';
            }
            if (formData.listingType === 'for_auction' && !formData.pricing.startingBid) {
                newErrors.startingBid = 'Starting bid is required';
            }
        }
        
        if (step === 6 && !formData.propertySize.size) {
            newErrors.propertySize = 'Property size is required';
        }

        if (step === 7) {
            const addressCountry = normalizeCountryName(formData.location?.country);
            const selectedJurisdiction = normalizeCountryName(formData.jurisdiction?.country);
            const jurisdictionMismatch = addressCountry && selectedJurisdiction && addressCountry !== selectedJurisdiction;
            if (jurisdictionMismatch && !formData.jurisdiction?.jurisdictionMismatchAcknowledged) {
                newErrors.jurisdictionMismatch = 'Please confirm that you want to proceed with a jurisdiction that does not match the property address.';
            }
        }

        if (step === 10) {
            if (!formData.declarations?.agentDeclaration || !formData.declarations?.complianceAcknowledgment) {
                newErrors.declarations = 'Please tick both declaration boxes to proceed, or save as draft.';
            }
        }

        if (step === 11) {
            if (!formData.declarations?.imagesConfirmed) {
                newErrors.imagesConfirmed = 'Please confirm that you have uploaded/selected the required images to proceed, or save as draft.';
            }
        }

        if (step === 13) {
            if (!formData.propertyTitle) newErrors.propertyTitle = 'Property title is required';
            if (!formData.shortDescription) newErrors.shortDescription = 'Short description is required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRequestClose = () => {
        const shouldClose = window.confirm('Are you sure you want to exit? Your progress will be lost.');
        if (shouldClose) onClose();
    };

    // Normalize GCF response: UI expects listingMetadata with top-level metadata, property, valuation. Accept either flat or nested (e.g. response.data).
    const normalizeListingMetadataResponse = (raw) => {
        if (!raw || raw.error) return undefined;
        const hasUseful = (o) => o && (o.metadata != null || o.property != null || o.valuation != null);
        if (hasUseful(raw)) return raw;
        if (raw.data && hasUseful(raw.data)) return raw.data;
        if (raw.result && hasUseful(raw.result)) return raw.result;
        if (raw.body && hasUseful(raw.body)) return raw.body;
        return undefined;
    };

    const fetchListingMetadataBlocking = (addressString, advanceAfterModalClose = true) => {
        const requestedAddress = addressString.trim();
        if (!requestedAddress) return;
        setMetadataModalShouldAdvanceStep(!!advanceAfterModalClose);
        const requestId = generateRequestId();
        const countryHint = (formData.location?.country || '').trim();
        // Pass the property category so the metadata service can pull
        // category-appropriate comparable listings (warehouses for industrial,
        // shops for retail, houses for residential, etc.).
        const categoryHint = (formData.propertyCategory || formData.category || formData.listingType || '').toString().trim();

        setShowListingMetadataModal(true);
        setMetadataLoadComplete(false);
        setMetadataLoadSteps(METADATA_LOAD_STEP_LABELS.map((label) => ({ label, status: 'pending' })));
        setMetadataStep(0, 'done');
        setMetadataStep(2, 'loading');
        const stagger = setTimeout(() => setMetadataStep(1, 'done'), 220);

        fetch(LISTING_METADATA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address: requestedAddress,
                requestId,
                ...(countryHint ? { country: countryHint } : {}),
                ...(categoryHint ? { category: categoryHint } : {})
            })
        })
            .then(async (res) => {
                if (!res.ok) {
                    let detail = res.statusText || `HTTP ${res.status}`;
                    try {
                        const t = await res.text();
                        if (t) detail = t.length <= 400 ? `${detail}: ${t}` : `${detail}: ${t.slice(0, 400)}…`;
                    } catch (_) {}
                    throw new Error(detail);
                }
                return res.json();
            })
            .then((data) => {
                if (!data || data.error) {
                    console.warn('[listingMetadata] Rejected: no data or data.error', data?.error);
                    setMetadataStep(2, 'error');
                    setMetadataStep(3, 'done');
                    setMetadataLoadComplete(true);
                    return;
                }
                const payload = normalizeListingMetadataResponse(data);
                if (!payload) {
                    console.warn('[listingMetadata] Rejected: no usable metadata in response. Top-level keys:', data ? Object.keys(data) : []);
                    setMetadataStep(2, 'error');
                    setMetadataStep(3, 'done');
                    setMetadataLoadComplete(true);
                    return;
                }
                if (requestId != null) payload.requestId = requestId;
                setListingMetadata(payload);
                setMetadataStep(2, 'done');
                setMetadataStep(3, 'done');
                setMetadataLoadComplete(true);
            })
            .catch((err) => {
                setMetadataStep(0, 'done');
                setMetadataStep(1, 'done');
                setMetadataStep(2, 'error');
                setMetadataStep(3, 'done');
                setMetadataLoadComplete(true);
                console.warn('[listingMetadata] Fetch failed (network or parse):', err);
            });
    };

    const handleNext = () => {
        if (!validateStep(actualStep)) {
            showNotification('Please complete the required fields or confirm the jurisdiction mismatch to continue.', 'error');
            return;
        }
        if (currentStep === 3) {
            const isDevelopment = (formData.propertyCategory || '').toLowerCase() === 'development';
            if (!isDevelopment) {
                const loc = formData.location || {};
                const addressParts = [loc.streetAddress, loc.suburb, loc.city, loc.country].filter(Boolean);
                const addressString = addressParts.join(', ');
                if (addressString) {
                    fetchListingMetadataBlocking(addressString, true);
                    return;
                }
            }
        }
            if (currentStep < totalSteps) {
                setCurrentStep(currentStep + 1);
                setErrors({});
            }
    };

    const closeListingMetadataModalAndContinue = () => {
        const shouldAdvance = metadataModalShouldAdvanceStep;
        setShowListingMetadataModal(false);
        setMetadataLoadSteps([]);
        setMetadataLoadComplete(false);
        if (shouldAdvance && currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
            setErrors({});
        }
    };

    const handleRerunAiListingMetadata = () => {
        if (isDevelopment) {
            showNotification('AI listing insights use a full street address. They are not run for development projects.', 'info');
            return;
        }
        const loc = formData.location || {};
        const addressParts = [loc.streetAddress, loc.suburb, loc.city, loc.country].filter(Boolean);
        const addressString = addressParts.join(', ').trim();
        if (!addressString) {
            showNotification('Enter or select a location first, then rerun AI data.', 'error');
            return;
        }
        fetchListingMetadataBlocking(addressString, false);
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async (saveAsDraft = false) => {
        // Check property limits for sellers and agents
        const user = JSON.parse(localStorage.getItem('user'));
        const userRole = user?.role?.toLowerCase();
        
        if (!isEditMode && ['seller', 'buyer', 'investor', 'landlord', 'agent', 'independent_agent', 'agency_agent'].includes(userRole)) {
            try {
                const propertiesRes = await api.get('/api/properties');
                const userProperties = propertiesRes.data.filter(p => p.agentId === user._id || p.userId === user._id);
                const limit = getPropertyLimitForUser(user);
                if (userProperties.length >= limit) {
                    showNotification(`You can have up to ${limit} ${limit === 1 ? 'property' : 'properties'} on your plan. Delete one to add another.`, 'error');
                    return;
                }
            } catch (err) {
                console.error('Error checking property limits:', err);
                showNotification('Error checking property limit. Please try again.', 'error');
                return;
            }
        }
        if (!isSellerFlow && !validateStep(actualStep) && !saveAsDraft) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

            const missingRequiredDocs = getMissingRequiredDocs(formData, userRole);
            const shouldForceDraft = !isSellerFlow && missingRequiredDocs.length > 0;
        if (!saveAsDraft && shouldForceDraft) {
            showNotification('Upload required documents (e.g. Listing Document) before publishing.', 'error');
            return;
        }
            const shouldSaveAsDraft = isSellerFlow ? false : (saveAsDraft || shouldForceDraft);
            if (!user || !user._id) {
                showNotification('Please log in to upload properties', 'error');
                return;
            }

        // Optimistic close: assume success and close immediately; run API + vault in background
        showNotification(saveAsDraft || shouldForceDraft ? 'Saving draft…' : 'Publishing…', 'info');
        setCurrentStep(1);
        setFormData(getDefaultFormData());
        setErrors({});
        onClose();

        (async function submitInBackground() {
            try {
            const locationString =
                mergeLocationPartsForPayload(
                    formData.location?.streetAddress,
                    formData.location?.suburb,
                    formData.location?.city,
                    formData.location?.region,
                    formData.location?.country,
                    formData.location?.postalCode
                ) || 'Location not specified';

            // Submit with whatever metadata we have now; if a fetch is still in flight we'll patch the property when it completes (see after res.data below)
            const metadataToSubmit = listingMetadata;

            // Determine price for display
            let priceValue = '0';
            if (isSellerFlow) {
                const purchasePrice = formData.pricing.purchasePrice;
                const currency = formData.pricing.currency || 'USD';
                priceValue = purchasePrice ? `${currency} ${purchasePrice}` : '0';
            } else if (formData.listingType === 'for_sale' && formData.pricing.askingPrice) {
                priceValue = formData.pricing.currency + ' ' + formData.pricing.askingPrice;
            } else if (formData.listingType === 'for_rent' && formData.pricing.monthlyRental) {
                priceValue = formData.pricing.currency + ' ' + formData.pricing.monthlyRental + '/month';
            } else if (formData.listingType === 'for_auction' && formData.pricing.startingBid) {
                priceValue = formData.pricing.currency + ' ' + formData.pricing.startingBid + ' (Starting Bid)';
            }

            // Compress images to avoid 413 Payload Too Large (server body size limit)
            let compressedCover = formData.media.coverImage || '';
            if (compressedCover && compressedCover.startsWith('data:')) {
                compressedCover = await compressImageBase64(compressedCover);
            }
            const gallery = formData.media.imageGallery || [];
            const compressedGallery = [];
            for (let i = 0; i < Math.min(gallery.length, 20); i++) {
                const item = gallery[i];
                if (item && typeof item === 'string' && item.startsWith('data:')) {
                    compressedGallery.push(await compressImageBase64(item));
                } else {
                    compressedGallery.push(item);
                }
            }
            const mediaForPayload = {
                ...formData.media,
                coverImage: compressedCover,
                imageGallery: compressedGallery
            };
            // Don't send huge base64 in initial request (saved to vault after create)
            mediaForPayload.floorplans = [];
            mediaForPayload.virtual3DTourFile = '';
            const mandatoryDocsForPayload = (formData.mandatoryDocs || []).map((d) => {
                const keepUrl = d.fileUrl && String(d.fileUrl).startsWith('vault:');
                return { ...d, fileUrl: keepUrl ? d.fileUrl : '' };
            });
            const legalDocsForPayload = (formData.legalDocs || []).map((d) => ({ ...d, fileUrl: '' }));
            const defectsForPayload = formData.defects ? { ...formData.defects } : {};
            if (defectsForPayload.roof) defectsForPayload.roof = { ...defectsForPayload.roof, documents: [] };
            if (defectsForPayload.electrical) defectsForPayload.electrical = { ...defectsForPayload.electrical, documents: [] };
            if (defectsForPayload.plumbing) defectsForPayload.plumbing = { ...defectsForPayload.plumbing, documents: [] };
            if (defectsForPayload.foundation) defectsForPayload.foundation = { ...defectsForPayload.foundation, documents: [] };
            if (defectsForPayload.supportingDocuments) defectsForPayload.supportingDocuments = [];

            // Build complete property data object (with compressed/stripped media and docs)
            const propertyData = {
                title: formData.propertyTitle || 'Untitled Property',
                description: formData.shortDescription || '',
                location: locationString || 'Location not specified',
                price: priceValue,
                imageUrl: compressedCover,
                agentId: isAgencyContext && assignToAgentId != null ? assignToAgentId : ((initialData && initialData.agentId != null) ? initialData.agentId : user._id),
                status: shouldSaveAsDraft ? 'Draft' : (formData.status || 'Draft'),
                isFeatured: false,
                listingType: formData.listingType || formData.propertyCategory || 'Residential',
                investmentType: formData.investmentType || '',
                propertyCategory: formData.propertyCategory,
                type: formData.propertyType,
                locationDetails: formData.location,
                pricing: isSellerFlow ? { ...formData.pricing, priceBasis: formData.pricing.priceBasis || 'Current Property Valuation' } : formData.pricing,
                availability: formData.availability,
                propertySize: formData.propertySize,
                ownership: formData.ownership,
                jurisdiction: formData.jurisdiction,
                mortgage: formData.mortgage?.hasMortgage ? {
                    hasMortgage: true,
                    originalMortgageAmount: formData.mortgage.originalMortgageAmount ? Number(formData.mortgage.originalMortgageAmount) : undefined,
                    mortgageDate: formData.mortgage.mortgageDate || undefined,
                    term: formData.mortgage.term || undefined,
                    outstandingBalance: formData.mortgage.outstandingBalance !== '' && formData.mortgage.outstandingBalance != null ? Number(formData.mortgage.outstandingBalance) : undefined,
                    monthlyRepayment: formData.mortgage.monthlyRepayment !== '' && formData.mortgage.monthlyRepayment != null ? Number(formData.mortgage.monthlyRepayment) : undefined
                } : { hasMortgage: false },
                mandatoryDocs: mandatoryDocsForPayload,
                legalDocs: legalDocsForPayload,
                fixtures: formData.fixtures,
                defects: defectsForPayload,
                media: mediaForPayload,
                residential: formData.residential || {},
                land: formData.land || {},
                industrial: formData.industrial || {},
                office: formData.office || {},
                commercial: formData.commercial || {},
                agricultural: formData.agricultural || {},
                rentalSpecific: formData.rentalSpecific || {},
                auctionDetails: formData.auctionDetails || {},
                declarations: formData.declarations,
                specs: {
                    beds: formData.residential?.bedrooms || 0,
                    baths: formData.residential?.bathrooms || 0,
                    sqft: formData.residential?.livingAreaSize || formData.propertySize?.size || 0
                },
                listingMetadata: metadataToSubmit ?? listingMetadata ?? undefined,
                developmentId: formData.developmentId || undefined,
                developmentUnitGroup: (formData.developmentUnitGroup || '').trim() || undefined,
                developmentUnitLabel: (formData.developmentUnitLabel || '').trim() || undefined
            };

            console.log('📤 Submitting property data (compressed media)...');

            let res;
            if (isEditMode) {
                res = await api.put(`/api/properties/${encodeURIComponent(propertyId)}`, propertyData);
            } else {
                res = await api.post('/api/properties', propertyData);
            }
            
            if (res.data) {
                // Listing metadata is now loaded in the step-3 modal before continuing, so it is included in propertyData when present.
                // Save to vault only on CREATE. On EDIT we never save to vault — existing images/docs
                // are already in the vault (or stored on the property); re-saving would create duplicates.
                let filesToSave = [];
                if (!isEditMode) {
                    const isNewUploadBase64 = (value) => typeof value === 'string' && value.startsWith('data:');
                    const propertyIdForVault = res.data._id;
                const propertyTitle = formData.propertyTitle || 'Untitled Property';
                
                    const saveFileToVault = async (fileData, fileName, fileType, folder, documentType) => {
                    try {
                        const fileRes = await api.post('/api/vault', {
                            userId: user._id,
                            name: fileName,
                            fileData: fileData,
                                size: fileData.length,
                            type: fileType,
                            folder: folder || 'Property Docs',
                                propertyId: propertyIdForVault,
                                propertyTitle: propertyTitle,
                                documentType: documentType || undefined
                        });
                        return fileRes.data;
                    } catch (err) {
                        console.error('Error saving file to vault:', err);
                        return null;
                    }
                };

                    if (formData.media.coverImage && isNewUploadBase64(formData.media.coverImage)) {
                    const coverFile = await saveFileToVault(
                        formData.media.coverImage,
                        `${propertyTitle} - Cover Image.jpg`,
                        'image/jpeg',
                        'Property Docs'
                    );
                    if (coverFile) filesToSave.push(coverFile);
                }

                if (formData.media.imageGallery && formData.media.imageGallery.length > 0) {
                    for (let i = 0; i < formData.media.imageGallery.length; i++) {
                            const item = formData.media.imageGallery[i];
                            if (item && isNewUploadBase64(item)) {
                        const galleryFile = await saveFileToVault(
                                    item,
                            `${propertyTitle} - Gallery Image ${i + 1}.jpg`,
                            'image/jpeg',
                            'Property Docs'
                        );
                        if (galleryFile) filesToSave.push(galleryFile);
                            }
                    }
                }

                if (formData.media.floorplans && formData.media.floorplans.length > 0) {
                    for (let i = 0; i < formData.media.floorplans.length; i++) {
                            const item = formData.media.floorplans[i];
                            if (item && isNewUploadBase64(item)) {
                        const floorplanFile = await saveFileToVault(
                                    item,
                            `${propertyTitle} - Floorplan ${i + 1}.pdf`,
                            'application/pdf',
                            'Property Docs'
                        );
                        if (floorplanFile) filesToSave.push(floorplanFile);
                            }
                    }
                }

                    if (formData.media.virtual3DTourFile && isNewUploadBase64(formData.media.virtual3DTourFile)) {
                    const tourFile = await saveFileToVault(
                        formData.media.virtual3DTourFile,
                        `${propertyTitle} - Virtual Tour`,
                        'video/mp4',
                        'Property Docs'
                    );
                    if (tourFile) filesToSave.push(tourFile);
                }

                if (formData.mandatoryDocs && formData.mandatoryDocs.length > 0) {
                    for (let i = 0; i < formData.mandatoryDocs.length; i++) {
                            const fileUrl = formData.mandatoryDocs[i]?.fileUrl;
                            if (fileUrl && isNewUploadBase64(fileUrl)) {
                            const docFile = await saveFileToVault(
                                    fileUrl,
                                `${propertyTitle} - ${formData.mandatoryDocs[i].name || 'Document ' + (i + 1)}`,
                                'application/pdf',
                                    'Property Docs',
                                    formData.mandatoryDocs[i].key
                            );
                            if (docFile) filesToSave.push(docFile);
                        }
                    }
                }

                if (formData.legalDocs && formData.legalDocs.length > 0) {
                    for (let i = 0; i < formData.legalDocs.length; i++) {
                            const fileUrl = formData.legalDocs[i]?.fileUrl;
                            if (fileUrl && isNewUploadBase64(fileUrl)) {
                            const legalFile = await saveFileToVault(
                                    fileUrl,
                                `${propertyTitle} - ${formData.legalDocs[i].name || 'Legal Doc ' + (i + 1)}`,
                                'application/pdf',
                                'Property Docs'
                            );
                            if (legalFile) filesToSave.push(legalFile);
                        }
                    }
                }

                const defectCategories = ['roof', 'electrical', 'plumbing', 'foundation'];
                for (const category of defectCategories) {
                        if (formData.defects?.[category]?.documents?.length > 0) {
                        for (let idx = 0; idx < formData.defects[category].documents.length; idx++) {
                            const doc = formData.defects[category].documents[idx];
                                if (doc && isNewUploadBase64(doc)) {
                                const defectFile = await saveFileToVault(
                                    doc,
                                    `${propertyTitle} - ${category} Defect Doc ${idx + 1}.pdf`,
                                    'application/pdf',
                                    'Property Docs'
                                );
                                if (defectFile) filesToSave.push(defectFile);
                            }
                        }
                    }
                }
                    if (formData.defects?.supportingDocuments?.length > 0) {
                    for (let idx = 0; idx < formData.defects.supportingDocuments.length; idx++) {
                        const doc = formData.defects.supportingDocuments[idx];
                            const fileUrl = doc?.fileUrl;
                            if (fileUrl && isNewUploadBase64(fileUrl)) {
                            const supportingFile = await saveFileToVault(
                                    fileUrl,
                                `${propertyTitle} - ${doc.name || `Supporting Document ${idx + 1}`}`,
                                'application/pdf',
                                'Property Docs'
                            );
                            if (supportingFile) filesToSave.push(supportingFile);
                        }
                    }
                }
                
                if (filesToSave.length > 0) {
                    showNotification(`${filesToSave.length} file(s) saved to vault`, 'success');
                    }
                }
                
                const actionLabel = isEditMode ? 'updated' : 'uploaded';
                const successMessage = shouldSaveAsDraft
                    ? (shouldForceDraft
                        ? `Missing required documents. Property ${actionLabel} and saved as draft.`
                        : `Property ${actionLabel} as draft successfully!`)
                    : `Property ${actionLabel} and published successfully!`;
                showNotification(successMessage, shouldForceDraft ? 'warning' : 'success');
                onSuccess && onSuccess(res.data);
            }
        } catch (err) {
            console.error('❌ Error uploading property:', err);
            if (err.response?.status === 413 || (err.message && String(err.message).includes('413'))) {
                showNotification('Property data is too large. Use smaller images or fewer photos and try again.', 'error');
            } else {
                const d = err.response?.data;
                const msg = (typeof d?.message === 'string' ? d.message : null) || (typeof d?.error === 'string' ? d.error : null) || (d?.error?.message) || err.message;
                const errorMessage = typeof msg === 'string' ? msg : 'Failed to upload property';
                showNotification(errorMessage, 'error');
            }
        }
        })();
    };

    // Scroll step content to top when modal opens or step changes so form always starts at top
    useEffect(() => {
        if (isOpen && stepContentRef.current) stepContentRef.current.scrollTop = 0;
    }, [isOpen, currentStep]);

    const handleCreateDevelopment = () => {
        const { title, location, completion, description } = newDevForm;
        if (!title.trim() || !location.trim() || !completion.trim() || !description.trim()) {
            showNotification('Please fill in all required development fields.', 'error');
            return;
        }
        setCreateDevSubmitting(true);
        const payload = {
            title: title.trim(),
            location: location.trim(),
            completion: completion.trim(),
            description: description.trim(),
            agentId: user?._id,
            agencyId: (userRole === 'agency' ? user?._id : user?.agencyId) || undefined
        };
        api.post('/api/developments', payload)
            .then((res) => {
                const newId = res.data?._id;
                if (newId) {
                    handleInputChange('developmentId', newId);
                    refetchDevelopments().then(() => {
                        setShowCreateDevModal(false);
                        setNewDevForm({ title: '', location: '', completion: '', description: '' });
                        showNotification('Development created. You can now add units and link them to it.', 'success');
                    });
                }
            })
            .catch((err) => {
                const msg = err.response?.data?.message || err.message || 'Failed to create development';
                showNotification(msg, 'error');
            })
            .finally(() => setCreateDevSubmitting(false));
    };

    if (!isOpen) return null;

    return (
        <div style={modalOverlay} data-tour="add-listing-modal">
            <div style={modalContent} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={modalHeader}>
                    <h2 style={{ margin: 0, color: '#11575C' }}>{isEditMode ? 'Edit Property' : 'Upload Property'}</h2>
                    <button onClick={handleRequestClose} style={closeButton}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Body: step content; show quick-jump index only when editing (hidden on mobile) */}
                <div style={{ ...modalBody, flexDirection: isMobile ? 'column' : 'row' }}>
                    {isEditMode && !isMobile && (
                        <nav style={quickJumpGuide}>
                            <div style={quickJumpTitle}>Sections</div>
                            {stepTitles.map((title, index) => {
                                const stepNum = index + 1;
                                const isActive = currentStep === stepNum;
                                return (
                                    <button
                                        key={stepNum}
                                        type="button"
                                        onClick={() => setCurrentStep(stepNum)}
                                        style={{
                                            ...quickJumpItem,
                                            ...(isActive ? quickJumpItemActive : {})
                                        }}
                                    >
                                        {stepNum}. {title}
                                    </button>
                                );
                            })}
                        </nav>
                    )}
                    <div style={stepContentWrapper}>
                        <div style={progressBar}>
                            <div style={{ ...progressFill, width: `${(currentStep / totalSteps) * 100}%` }}></div>
                        </div>
                        <div ref={stepContentRef} style={{ ...stepContent, padding: isMobile ? '16px' : '30px' }}>
                            {isAgencyContext && currentStep === 1 && (
                                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Assign to</label>
                                    <select
                                        value={assignToAgentId || ''}
                                        onChange={(e) => {
                                            if (e.target.value === '__add_agent__') { onOpenAddAgent && onOpenAddAgent(); return; }
                                            setAssignToAgentId(e.target.value || null);
                                        }}
                                        style={{ width: '100%', maxWidth: '400px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px', background: '#fff', color: '#1e293b' }}
                                    >
                                        {agencyAgentOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                                        ))}
                                        {onOpenAddAgent && <option value="__add_agent__">+ Add Agent</option>}
                                    </select>
                                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', marginBottom: 0 }}>This property will be assigned to the selected agency or agent.</p>
                                </div>
                            )}
                            {isSellerFlow ? (
                                <>
                                    {currentStep === 1 && <Step1InvestmentType formData={formData} onChange={handleInputChange} errors={errors} />}
                                    {currentStep === 2 && <Step2PropertyType formData={formData} onChange={handleInputChange} errors={errors} developmentsList={developmentsList} onOpenCreateDevelopment={() => setShowCreateDevModal(true)} />}
                                    {currentStep === 3 && (
                                        <Step3PropertyIdentification
                                            formData={formData}
                                            onChange={handleInputChange}
                                            errors={errors}
                                            onRerunAiData={handleRerunAiListingMetadata}
                                            aiEnrichmentBusy={showListingMetadataModal}
                                        />
                                    )}
                                    {currentStep === 4 && <Step4SellerDocuments formData={formData} onChange={handleInputChange} onExtractFromDocuments={handleExtractFromDocuments} extractingFromDocs={extractingFromDocs} />}
                                    {currentStep === 5 && isRentalInvestment && <StepRentalDetails formData={formData} onChange={handleInputChange} errors={errors} />}
                                    {currentStep === 5 && !isRentalInvestment && <Step5SellerPricing formData={formData} onChange={handleInputChange} errors={errors} />}
                                    {currentStep === 6 && isRentalInvestment && <Step5SellerPricing formData={formData} onChange={handleInputChange} errors={errors} />}
                                    {currentStep === 6 && !isRentalInvestment && <StepMortgage formData={formData} onChange={handleInputChange} errors={errors} />}
                                    {currentStep === 7 && isRentalInvestment && <StepMortgage formData={formData} onChange={handleInputChange} errors={errors} />}
                                    {currentStep === 7 && !isRentalInvestment && <Step11Media formData={formData} onChange={handleInputChange} />}
                                    {currentStep === 8 && isRentalInvestment && <Step11Media formData={formData} onChange={handleInputChange} />}
                                    {currentStep === 8 && !isRentalInvestment && <Step12CategorySpecific formData={formData} onChange={handleInputChange} />}
                                    {currentStep === 9 && isRentalInvestment && <Step12CategorySpecific formData={formData} onChange={handleInputChange} />}
                                </>
                            ) : (
                                <>
                                    {actualStep === 1 && <Step1ListingType formData={formData} onChange={handleInputChange} errors={errors} />}
                                    {actualStep === 2 && <Step2PropertyType formData={formData} onChange={handleInputChange} errors={errors} developmentsList={developmentsList} onOpenCreateDevelopment={() => setShowCreateDevModal(true)} />}
                                    {actualStep === 3 && (
                                        <Step3PropertyIdentification
                                            formData={formData}
                                            onChange={handleInputChange}
                                            errors={errors}
                                            onRerunAiData={handleRerunAiListingMetadata}
                                            aiEnrichmentBusy={showListingMetadataModal}
                                        />
                                    )}
                                    {actualStep === 4 && <Step4UploadDocuments formData={formData} onChange={handleInputChange} errors={errors} userRole={userRole} onExtractFromDocuments={handleExtractFromDocuments} extractingFromDocs={extractingFromDocs} extractionPreview={extractionPreview} onApplyExtraction={handleApplyExtraction} onCancelExtraction={handleCancelExtraction} />}
                                    {actualStep === 5 && <Step4PricingAvailability formData={formData} onChange={handleInputChange} errors={errors} />}
                                    {actualStep === 6 && <Step5ListingDetails formData={formData} onChange={handleInputChange} />}
                                    {actualStep === 7 && <Step6Jurisdiction formData={formData} onChange={handleInputChange} userRole={userRole} />}
                                    {actualStep === 8 && <Step8Fixtures formData={formData} onChange={handleInputChange} />}
                                    {actualStep === 9 && <Step9Defects formData={formData} onChange={handleInputChange} />}
                                    {actualStep === 10 && <Step10LegalDocs formData={formData} onChange={handleInputChange} errors={errors} />}
                                    {actualStep === 11 && <Step11Media formData={formData} onChange={handleInputChange} errors={errors} />}
                                    {actualStep === 13 && <Step13ListingSummary formData={formData} listingMetadata={listingMetadata} onChange={handleInputChange} errors={errors} missingRequiredDocs={missingRequiredDocs} />}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation: Previous, Save (centered), Continue */}
                <div style={modalFooter}>
                    {currentStep > 1 ? (
                        <button onClick={handlePrevious} style={secondaryButton}>
                            <i className="fas fa-arrow-left"></i> Previous
                        </button>
                    ) : (
                        <div />
                    )}
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: '140px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {isSellerFlow ? (
                            <>
                                <button
                                    onClick={() => {
                                        if (!formData.legalOwnerConfirmed) setShowLegalOwnershipPopup(true);
                                        else handleSubmit(false);
                                    }}
                                    style={currentStep >= totalSteps ? primaryButton : secondaryButton}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save property'}
                                </button>
                                {currentStep < totalSteps ? (
                                    currentStep === 4 ? (
                                    <button onClick={handleNext} style={primaryButton} disabled={loading}>
                                        {loading ? 'Loading...' : 'Continue'} <i className="fas fa-arrow-right"></i>
                                    </button>
                                    ) : (
                                        <button onClick={handleNext} style={primaryButton} disabled={loading}>
                                            {loading ? 'Loading...' : 'Continue'} <i className="fas fa-arrow-right"></i>
                                </button>
                                    )
                                ) : (
                                    <div />
                                )}
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleSubmit(true)}
                                    style={currentStep === totalSteps && missingRequiredDocs.length > 0 ? primaryButton : secondaryButton}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save as Draft'}
                                </button>
                                {currentStep < totalSteps ? (
                                    currentStep === 4 ? (
                                    <button onClick={handleNext} style={primaryButton} disabled={loading}>
                                        {loading ? 'Loading...' : 'Continue'} <i className="fas fa-arrow-right"></i>
                                    </button>
                                    ) : (
                                        <button onClick={handleNext} style={primaryButton} disabled={loading}>
                                            {loading ? 'Loading...' : 'Continue'} <i className="fas fa-arrow-right"></i>
                                        </button>
                                    )
                                ) : (
                                    <button
                                        onClick={() => handleSubmit(false)}
                                        style={missingRequiredDocs.length > 0 ? { ...secondaryButton, opacity: 0.7, cursor: 'not-allowed' } : primaryButton}
                                        disabled={loading || missingRequiredDocs.length > 0}
                                    >
                                        {loading ? 'Publishing...' : <><i className="fas fa-check"></i> Publish</>}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Listing metadata loading modal (step 3 → 4): wait for GCF response */}
            {showListingMetadataModal && (
                <div style={{ ...modalOverlay, position: 'absolute', zIndex: 25 }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ ...modalContent, maxWidth: '440px', padding: '28px 32px' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 24px', fontSize: '18px', color: '#11575C', padding: 0 }}>Enriching your listing</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: 1.5, padding: 0 }}>
                            Running multi-source intelligence and valuation synthesis for this address. This may take a moment.
                        </p>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                            {metadataLoadSteps.map((step, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: 14, color: step.status === 'error' ? '#b91c1c' : '#334155' }}>
                                    {step.status === 'done' && <span style={{ color: '#059669', fontWeight: 700 }}>✓</span>}
                                    {step.status === 'loading' && <i className="fas fa-circle-notch fa-spin" style={{ fontSize: 14, color: '#11575C', width: 14, display: 'inline-block' }} aria-hidden />}
                                    {step.status === 'error' && <span style={{ color: '#b91c1c', fontWeight: 700 }}>✕</span>}
                                    {step.status === 'pending' && <span style={{ width: 14, height: 14, border: '1px solid #94a3b8', borderRadius: '50%', flexShrink: 0 }} />}
                                    <span>{step.label}</span>
                                </li>
                            ))}
                        </ul>
                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                style={{ ...primaryButton, opacity: metadataLoadComplete ? 1 : 0.6, cursor: metadataLoadComplete ? 'pointer' : 'not-allowed' }}
                                disabled={!metadataLoadComplete}
                                onClick={closeListingMetadataModalAndContinue}
                            >
                                {metadataModalShouldAdvanceStep ? 'Continue' : 'Done'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create development (light flow) when adding a unit and no development exists yet */}
            {showCreateDevModal && (
                <div style={{ ...modalOverlay, position: 'absolute', zIndex: 25 }} onClick={() => setShowCreateDevModal(false)}>
                    <div style={{ ...modalContent, maxWidth: '480px', padding: '24px 28px' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#11575C', padding: 0 }}>Create development</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.4, padding: 0 }}>Create the project first, then you can link units to it and set group (e.g. Type A) and label.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Title *</label>
                            <input type="text" placeholder="e.g. Marina Heights" value={newDevForm.title} onChange={(e) => setNewDevForm((f) => ({ ...f, title: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Location *</label>
                            <GooglePlacesInput
                                name="location"
                                value={newDevForm.location}
                                onChange={(e) => setNewDevForm((f) => ({ ...f, location: e.target.value }))}
                                onPlaceSelected={(formatted) => setNewDevForm((f) => ({ ...f, location: formatted }))}
                                placeholder="e.g. Dubai Marina, UAE"
                                inputStyle={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
                            />
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Completion date *</label>
                            <input type="date" value={newDevForm.completion} onChange={(e) => setNewDevForm((f) => ({ ...f, completion: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Description *</label>
                            <textarea placeholder="Short description of the development" value={newDevForm.description} onChange={(e) => setNewDevForm((f) => ({ ...f, description: e.target.value }))} rows={3} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                            <button type="button" style={secondaryButton} onClick={() => setShowCreateDevModal(false)}>Cancel</button>
                            <button type="button" style={primaryButton} disabled={createDevSubmitting} onClick={handleCreateDevelopment}>
                                {createDevSubmitting ? 'Creating...' : 'Create development'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Legal ownership confirmation popup (seller/buyer/investor) when saving */}
            {showLegalOwnershipPopup && isSellerFlow && (
                <div style={{ ...modalOverlay, position: 'absolute', zIndex: 20 }} onClick={() => setShowLegalOwnershipPopup(false)}>
                    <div style={{ ...modalContent, maxWidth: '420px', padding: '28px 32px' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#11575C', padding: 0 }}>Confirm Legal Ownership</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: 1.5, padding: 0 }}>You must confirm that you are the legal owner of the property you are submitting in order to save it.</p>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: '#1f3a3d', marginBottom: '24px', padding: 0 }}>
                            <input
                                type="checkbox"
                                checked={Boolean(formData.legalOwnerConfirmed)}
                                onChange={(e) => handleInputChange('legalOwnerConfirmed', e.target.checked)}
                                style={{ width: '20px', height: '20px', accentColor: '#11575C' }}
                            />
                            <span>I confirm I am the legal owner of the property I am submitting.</span>
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: 0 }}>
                            <button type="button" style={secondaryButton} onClick={() => setShowLegalOwnershipPopup(false)}>Cancel</button>
                            <button
                                type="button"
                                style={primaryButton}
                                disabled={!formData.legalOwnerConfirmed}
                                onClick={() => { setShowLegalOwnershipPopup(false); handleSubmit(false); }}
                            >
                                Confirm & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Step 1 (Seller/Buyer/Investor): Select Investment Type
const Step1InvestmentType = ({ formData, onChange, errors = {} }) => {
    const options = [
        { value: 'primary_home', label: 'Primary Home', icon: 'fa-home' },
        { value: 'holiday_real_estate', label: 'Holiday Real Estate', icon: 'fa-umbrella-beach' },
        { value: 'long_term_rentals', label: 'Long Term Rentals', icon: 'fa-calendar-check' },
        { value: 'short_term_rentals', label: 'Short Term Rentals', icon: 'fa-calendar-day' }
    ];

    return (
        <div>
            <h3 style={stepTitle}>Select Investment Type</h3>
            <p style={stepDescription}>Choose how you use or intend to use this property</p>
            <div style={optionGrid}>
                {options.map(option => (
                    <div
                        key={option.value}
                        onClick={() => onChange('investmentType', option.value)}
                        style={{
                            ...optionCard,
                            borderColor: formData.investmentType === option.value ? '#11575C' : '#e2e8f0',
                            background: formData.investmentType === option.value ? '#f0fdf4' : 'white'
                        }}
                    >
                        <i className={`fas ${option.icon}`} style={{ fontSize: '32px', color: '#11575C', marginBottom: '10px' }}></i>
                        <div style={{ fontWeight: '600', color: '#11575C' }}>{option.label}</div>
                    </div>
                ))}
            </div>
            {errors.investmentType && <span style={errorText}>{errors.investmentType}</span>}
        </div>
    );
};

// Step 1 (Agent): Listing Type Selection
const Step1ListingType = ({ formData, onChange, errors = {} }) => {
    const options = [
        { value: 'for_sale', label: 'For Sale', icon: 'fa-tag' },
        { value: 'for_rent', label: 'For Rent', icon: 'fa-calendar-alt' },
        { value: 'for_auction', label: 'For Auction', icon: 'fa-gavel' }
    ];

    return (
        <div>
            <h3 style={stepTitle}>Select Listing Type</h3>
            <p style={stepDescription}>Choose how you want to list this property</p>
            <div style={optionGrid}>
                {options.map(option => (
                    <div
                        key={option.value}
                        onClick={() => onChange('listingType', option.value)}
                        style={{
                            ...optionCard,
                            borderColor: formData.listingType === option.value ? '#11575C' : '#e2e8f0',
                            background: formData.listingType === option.value ? '#f0fdf4' : 'white'
                        }}
                    >
                        <i className={`fas ${option.icon}`} style={{ fontSize: '32px', color: '#11575C', marginBottom: '10px' }}></i>
                        <div style={{ fontWeight: '600', color: '#11575C' }}>{option.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Step 2: Property Type Selection
const Step2PropertyType = ({ formData, onChange, errors = {}, developmentsList = [], onOpenCreateDevelopment }) => {
    const categories = [
        { value: 'Residential', label: 'Residential', icon: 'fa-home' },
        { value: 'Commercial', label: 'Commercial', icon: 'fa-building' },
        { value: 'Retail', label: 'Retail', icon: 'fa-store' },
        { value: 'Industrial', label: 'Industrial', icon: 'fa-industry' },
        { value: 'Land', label: 'Land', icon: 'fa-map' },
        { value: 'Office', label: 'Office', icon: 'fa-briefcase' },
        { value: 'Agricultural', label: 'Agricultural', icon: 'fa-seedling' },
        { value: 'Development', label: 'Development', icon: 'fa-city' }
    ];

    const residentialTypes = ['House', 'Villa', 'Apartment', 'Townhouse', 'Penthouse'];
    const officeTypes = ['Traditional Office', 'Shared Office'];
    const agriculturalTypes = ['Freehold', 'Leasehold', 'Crown Lease / State Lease', 'Agricultural Holding', 'Primary Production Land', 'Agribusiness Facility', 'Smallholding'];
    const landTypes = ['Residential', 'Primary Production', 'Commercial / Mixed-Use', 'Industrial (Light/Heavy)', 'Recreational / Conservation Land'];
    const industrialTypes = ['Logistics', 'Manufacturing Facility', 'Flex Space', 'Cold Storage', 'Data Center', 'Truck Terminal / Logistics Park'];
    const retailTypes = ['High Street / Street Retail', 'Neighborhood / Convenience Center', 'Regional Shopping Mall', 'Power Center', 'Retail Park / Out-of-Town', 'Lifestyle Center', 'Mixed-Use'];
    const commercialTypes = ['Office Building', 'Hospitality', 'Leisure', 'Alternative'];
    const developmentTypes = ['New Build', 'Off-Plan', 'Mixed-Use Development', 'Residential Development', 'Commercial Development'];

    return (
        <div>
            <h3 style={stepTitle}>What type of property is this?</h3>
            <p style={stepDescription}>Select the property category</p>
            <div style={optionGrid}>
                {categories.map(cat => (
                    <div
                        key={cat.value}
                        onClick={() => { onChange('propertyCategory', cat.value); onChange('propertyType', ''); }}
                        style={{
                            ...optionCard,
                            borderColor: formData.propertyCategory === cat.value ? '#11575C' : '#e2e8f0',
                            background: formData.propertyCategory === cat.value ? '#f0fdf4' : 'white'
                        }}
                    >
                        <i className={`fas ${cat.icon}`} style={{ fontSize: '32px', color: '#11575C', marginBottom: '10px' }}></i>
                        <div style={{ fontWeight: '600', color: '#11575C' }}>{cat.label}</div>
                    </div>
                ))}
            </div>

            {/* Show sub-types if Residential or Office selected */}
            {formData.propertyCategory === 'Residential' && (
                <div style={{ marginTop: '30px' }}>
                    <h4 style={subStepTitle}>Select Property Type</h4>
                    <div style={optionGrid}>
                        {residentialTypes.map(type => (
                            <div
                                key={type}
                                onClick={() => onChange('propertyType', type)}
                                style={{
                                    ...optionCard,
                                    borderColor: formData.propertyType === type ? '#11575C' : '#e2e8f0',
                                    background: formData.propertyType === type ? '#f0fdf4' : 'white',
                                    padding: '15px'
                                }}
                            >
                                {type}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {formData.propertyCategory === 'Office' && (
                <div style={{ marginTop: '30px' }}>
                    <h4 style={subStepTitle}>Select Office Type</h4>
                    <div style={optionGrid}>
                        {officeTypes.map(type => (
                            <div
                                key={type}
                                onClick={() => onChange('propertyType', type)}
                                style={{
                                    ...optionCard,
                                    borderColor: formData.propertyType === type ? '#11575C' : '#e2e8f0',
                                    background: formData.propertyType === type ? '#f0fdf4' : 'white',
                                    padding: '15px'
                                }}
                            >
                                {type}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {formData.propertyCategory === 'Agricultural' && (
                <div style={{ marginTop: '30px' }}>
                    <h4 style={subStepTitle}>Select Agricultural Type</h4>
                    <div style={optionGrid}>
                        {agriculturalTypes.map(type => (
                            <div
                                key={type}
                                onClick={() => onChange('propertyType', type)}
                                style={{
                                    ...optionCard,
                                    borderColor: formData.propertyType === type ? '#11575C' : '#e2e8f0',
                                    background: formData.propertyType === type ? '#f0fdf4' : 'white',
                                    padding: '15px'
                                }}
                            >
                                {type}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {formData.propertyCategory === 'Land' && (
                <div style={{ marginTop: '30px' }}>
                    <h4 style={subStepTitle}>Select Land Type</h4>
                    <div style={optionGrid}>
                        {landTypes.map(type => (
                            <div
                                key={type}
                                onClick={() => onChange('propertyType', type)}
                                style={{
                                    ...optionCard,
                                    borderColor: formData.propertyType === type ? '#11575C' : '#e2e8f0',
                                    background: formData.propertyType === type ? '#f0fdf4' : 'white',
                                    padding: '15px'
                                }}
                            >
                                {type}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {formData.propertyCategory === 'Industrial' && (
                <div style={{ marginTop: '30px' }}>
                    <h4 style={subStepTitle}>Select Industrial Type</h4>
                    <div style={optionGrid}>
                        {industrialTypes.map(type => (
                            <div
                                key={type}
                                onClick={() => onChange('propertyType', type)}
                                style={{
                                    ...optionCard,
                                    borderColor: formData.propertyType === type ? '#11575C' : '#e2e8f0',
                                    background: formData.propertyType === type ? '#f0fdf4' : 'white',
                                    padding: '15px'
                                }}
                            >
                                {type}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {formData.propertyCategory === 'Retail' && (
                <div style={{ marginTop: '30px' }}>
                    <h4 style={subStepTitle}>Select Retail Type</h4>
                    <div style={optionGrid}>
                        {retailTypes.map(type => (
                            <div
                                key={type}
                                onClick={() => onChange('propertyType', type)}
                                style={{
                                    ...optionCard,
                                    borderColor: formData.propertyType === type ? '#11575C' : '#e2e8f0',
                                    background: formData.propertyType === type ? '#f0fdf4' : 'white',
                                    padding: '15px'
                                }}
                            >
                                {type}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {formData.propertyCategory === 'Commercial' && (
                <div style={{ marginTop: '30px' }}>
                    <h4 style={subStepTitle}>Select Commercial Type</h4>
                    <div style={optionGrid}>
                        {commercialTypes.map(type => (
                            <div
                                key={type}
                                onClick={() => onChange('propertyType', type)}
                                style={{
                                    ...optionCard,
                                    borderColor: formData.propertyType === type ? '#11575C' : '#e2e8f0',
                                    background: formData.propertyType === type ? '#f0fdf4' : 'white',
                                    padding: '15px'
                                }}
                            >
                                {type}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {formData.propertyCategory === 'Development' && (
                <div style={{ marginTop: '30px' }}>
                    <h4 style={subStepTitle}>Select Development Type</h4>
                    <div style={optionGrid}>
                        {developmentTypes.map(type => (
                            <div
                                key={type}
                                onClick={() => onChange('propertyType', type)}
                                style={{
                                    ...optionCard,
                                    borderColor: formData.propertyType === type ? '#11575C' : '#e2e8f0',
                                    background: formData.propertyType === type ? '#f0fdf4' : 'white',
                                    padding: '15px'
                                }}
                            >
                                {type}
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ ...subStepTitle, marginBottom: 12 }}>Link to development project (optional)</h4>
                        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Create a development first (use the dropdown or button below), then add units and link them by group (e.g. Type A) and label.</p>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>Development</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                            <select
                                value={formData.developmentId === '__create__' ? '' : (formData.developmentId || '')}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '__create__') {
                                        onOpenCreateDevelopment && onOpenCreateDevelopment();
                                        onChange('developmentId', '');
                                    } else {
                                        onChange('developmentId', v || '');
                                    }
                                }}
                                style={{ flex: '1 1 200px', minWidth: 0, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
                            >
                                <option value="">None</option>
                                {onOpenCreateDevelopment && <option value="__create__">+ Create new development...</option>}
                                {developmentsList.map((d) => (
                                    <option key={d._id} value={d._id}>{d.title} {d.location ? ` — ${d.location}` : ''}</option>
                                ))}
                            </select>
                            {onOpenCreateDevelopment && (
                                <button type="button" onClick={onOpenCreateDevelopment} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #11575C', background: '#f0fdfa', color: '#11575C', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    + Create new development
                                </button>
                            )}
                        </div>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>Unit group (e.g. Type A, 2-Bed)</label>
                        <input type="text" placeholder="Type A" value={formData.developmentUnitGroup || ''} onChange={(e) => onChange('developmentUnitGroup', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>Unit label (e.g. Unit 401, Tower A-12)</label>
                        <input type="text" placeholder="Unit 401" value={formData.developmentUnitLabel || ''} onChange={(e) => onChange('developmentUnitLabel', e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

// Step 3: Property Location
const Step3PropertyIdentification = ({ formData, onChange, errors = {}, onRerunAiData, aiEnrichmentBusy = false }) => {
    const applyAddress = (formatted, place) => {
        const components = place?.address_components || [];
        const findType = (type) => components.find((c) => c.types?.includes(type))?.long_name || '';
        const findAny = (types) => {
            for (const type of types) {
                const value = findType(type);
                if (value) return value;
            }
            return '';
        };

        const streetNumber = findType('street_number');
        const route = findType('route');
        const streetAddress = formatted || `${streetNumber} ${route}`.trim();

        const city = findAny(['locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_1']);
        const suburb = findAny(['sublocality', 'neighborhood', 'sublocality_level_1']);
        const country = findType('country');

        const fallbackParts = formatted
            ? formatted.split(',').map((p) => p.trim()).filter(Boolean)
            : [];
        const fallbackCountry = fallbackParts.length >= 1 ? fallbackParts[fallbackParts.length - 1] : '';
        const fallbackCity = fallbackParts.length >= 3
            ? fallbackParts[fallbackParts.length - 3]
            : (fallbackParts.length >= 2 ? fallbackParts[fallbackParts.length - 2] : '');

        const resolvedCountry = country || fallbackCountry || '';
        onChange('location.country', resolvedCountry);
        onChange('location.city', city || fallbackCity || '');
        onChange('location.suburb', suburb || '');
        onChange('location.streetAddress', streetAddress || formatted || '');
        const autoCurrency = getCurrencyForCountry(resolvedCountry);
        onChange('pricing.currency', autoCurrency);
    };

    return (
        <div>
            <h3 style={stepTitle}>Property Location</h3>
            <div style={formSection}>
                <label style={labelStyle}>Location *</label>
                <GooglePlacesInput
                    name="locationFull"
                    value={formData.location.streetAddress}
                    onChange={(e) => onChange('location.streetAddress', e.target.value)}
                    onPlaceSelected={applyAddress}
                    placeholder="Street, City, Country, Postal Code"
                    inputStyle={errors.locationAddress ? inputStyleError : inputStyle}
                />
                {(errors.locationCountry || errors.locationCity || errors.locationAddress) && (
                    <span style={errorText}>
                        {errors.locationAddress || errors.locationCity || errors.locationCountry}
                    </span>
                )}
                {typeof onRerunAiData === 'function' && (
                    <div style={{ marginTop: '18px' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748b', lineHeight: 1.45 }}>
                            Adjust the address or pick a place from autocomplete, then refresh AI valuation and market signals if needed.
                        </p>
                        <button
                            type="button"
                            onClick={onRerunAiData}
                            disabled={aiEnrichmentBusy}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid #11575C',
                                background: aiEnrichmentBusy ? '#e2e8f0' : '#f0fdfa',
                                color: '#11575C',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: aiEnrichmentBusy ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {aiEnrichmentBusy ? (
                                <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 8 }} aria-hidden /> Working…</>
                            ) : (
                                <><i className="fas fa-magic" style={{ marginRight: 8 }} aria-hidden /> Rerun AI data</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Step 4: Upload Documents
const Step4UploadDocuments = ({ formData, onChange, errors = {}, userRole, onExtractFromDocuments, extractingFromDocs, extractionPreview, onApplyExtraction, onCancelExtraction }) => {
    const applicableDocs = getApplicableDocs(formData, userRole);
    const missingRequired = getMissingRequiredDocs(formData, userRole);

    const uploadFile = (doc, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const entry = {
                key: doc.key,
                name: file.name,
                fileUrl: event.target.result,
                required: doc.required,
                uploaded: true
            };
            const targetKey = doc.target;
            const current = targetKey === 'legalDocs' ? (formData.legalDocs || []) : (formData.mandatoryDocs || []);
            const next = [...current.filter((d) => d.key !== doc.key), entry];
            onChange(targetKey, next);
        };
        reader.readAsDataURL(file);
    };

    const handleFileInput = (doc, files) => {
        if (!files || files.length === 0) return;
        uploadFile(doc, files[0]);
    };

    const removeDoc = (doc) => {
        const targetKey = doc.target;
        const current = targetKey === 'legalDocs' ? (formData.legalDocs || []) : (formData.mandatoryDocs || []);
        onChange(targetKey, current.filter((d) => d.key !== doc.key));
    };

    const getUploadedDoc = (doc) => {
        const list = doc.target === 'legalDocs' ? (formData.legalDocs || []) : (formData.mandatoryDocs || []);
        return list.find((d) => d.key === doc.key);
    };

    return (
        <div>
            <h3 style={stepTitle}>Upload Documents</h3>
            <p style={stepDescription}>
                Upload required documents based on your country and listing type. Required documents update automatically by property jurisdiction.
            </p>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                For missing required documents, check official government portals or ask your agent for templates (e.g. Energy Label, Cadastral Extract) for your country.
            </p>
            <div style={formSection}>
                <label style={checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={Boolean(formData.documents?.esgApplicable)}
                        onChange={(e) => onChange('documents.esgApplicable', e.target.checked)}
                    />
                    Sustainability Documents apply to this listing
                </label>
            </div>
            {missingRequired.length > 0 && (
                <div style={{ marginBottom: '10px', fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                    Missing required documents can be uploaded later, but the listing will stay in Draft until all required documents are uploaded.
                </div>
            )}
            {applicableDocs.length === 0 ? (
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '13px' }}>
                    Select an address to load country-specific requirements.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px' }}>
                    {applicableDocs.map((doc) => {
                        const uploaded = getUploadedDoc(doc);
                        const inputId = `doc-${doc.key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                        return (
                            <div key={doc.key} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937' }}>
                                        {doc.name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {uploaded && (
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '999px' }}>
                                                Verified
                                            </span>
                                        )}
                                    {doc.required && (
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '999px' }}>
                                            Required
                                        </span>
                                    )}
                                    </div>
                                </div>
                                <label
                                    htmlFor={inputId}
                                    style={{
                                        marginTop: '10px',
                                        border: '1px dashed #cbd5e1',
                                        borderRadius: '10px',
                                        padding: '14px',
                                        display: 'block',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: '#f8fafc',
                                        fontSize: '12px',
                                        color: '#64748b'
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        handleFileInput(doc, e.dataTransfer.files);
                                    }}
                                >
                                    Drag & drop or click to upload
                                    <input
                                        id={inputId}
                                        type="file"
                                        accept=".pdf,.doc,.docx,image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileInput(doc, e.target.files)}
                                    />
                                </label>
                                {uploaded && (
                                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                            <i className="fas fa-file"></i>
                                            <span style={{ wordBreak: 'break-word' }}>{uploaded.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeDoc(doc)}
                                            style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '12px', alignSelf: 'flex-end' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {extractionPreview && onApplyExtraction && onCancelExtraction && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#854d0e', marginBottom: '8px' }}>
                        <i className="fas fa-clipboard-check" style={{ marginRight: '8px' }}></i>
                        Review extraction
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#713f12' }}>
                        Verify the data extracted from your documents before applying to the form.
                    </p>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px', padding: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#475569' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {JSON.stringify(extractionPreview, null, 2).slice(0, 2000)}
                            {JSON.stringify(extractionPreview).length > 2000 ? '…' : ''}
                        </pre>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={onApplyExtraction} style={{ padding: '8px 16px', background: '#166534', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                            Apply to form
                        </button>
                        <button type="button" onClick={onCancelExtraction} style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Step 4 (Seller/Buyer/Investor): Upload Documents (levy, floorplans, deed, title report, tax statement; + Rental Agreement for long/short term rental)
const Step4SellerDocuments = ({ formData, onChange, onExtractFromDocuments, extractingFromDocs }) => {
    const isRental = formData.investmentType === 'long_term_rentals' || formData.investmentType === 'short_term_rentals';
    const uploadDocs = [...SELLER_UPLOAD_DOCS, ...(isRental ? [{ key: 'rental_agreement', name: 'Rental Agreement', required: false, target: 'mandatoryDocs' }] : [])];

    const uploadFile = (doc, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const entry = { key: doc.key, name: file.name, fileUrl: e.target.result, required: doc.required, uploaded: true };
            const current = formData.mandatoryDocs || [];
            onChange('mandatoryDocs', [...current.filter((d) => d.key !== doc.key), entry]);
        };
        reader.readAsDataURL(file);
    };
    const removeDoc = (doc) => {
        const current = (formData.mandatoryDocs || []).filter((d) => d.key !== doc.key);
        onChange('mandatoryDocs', current);
    };
    const getUploaded = (doc) => (formData.mandatoryDocs || []).find((d) => d.key === doc.key);

    return (
        <div>
            <h3 style={stepTitle}>Upload Documents</h3>
            <p style={stepDescription}>Floorplans, deed, preliminary title report{isRental ? ', and rental agreement' : ''}.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                {uploadDocs.map((doc) => {
                    const uploaded = getUploaded(doc);
                    const inputId = `seller-doc-${doc.key}`;
                    return (
                        <div key={doc.key} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', background: '#fff' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937' }}>{doc.name}</div>
                            <label
                                htmlFor={inputId}
                                style={{ marginTop: '10px', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '14px', display: 'block', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', fontSize: '12px', color: '#64748b' }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) uploadFile(doc, e.dataTransfer.files[0]); }}
                            >
                                Drag & drop or click to upload
                                <input id={inputId} type="file" accept=".pdf,.doc,.docx,image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && uploadFile(doc, e.target.files[0])} />
                            </label>
                            {uploaded && (
                                <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ wordBreak: 'break-word' }}>{uploaded.name}</span>
                                    <span style={{ display: 'flex', gap: '8px' }}>
                                        <button type="button" onClick={() => removeDoc(doc)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>Remove</button>
                                        <span style={{ color: '#94a3b8' }}>·</span>
                                        <label style={{ cursor: 'pointer', color: '#11575C', fontSize: '12px', textDecoration: 'underline', margin: 0 }}>
                                            Replace
                                            <input type="file" accept=".pdf,.doc,.docx,image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && uploadFile(doc, e.target.files[0])} />
                                        </label>
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Step 5 (Seller/Buyer/Investor) – only when long/short term rental: Lease terms, dates, monthly rent
const StepRentalDetails = ({ formData, onChange, errors = {} }) => {
    return (
        <div>
            <h3 style={stepTitle}>Rental Details</h3>
            <p style={stepDescription}>Lease terms, dates, and monthly rent for this rental property.</p>
            <div style={formSection}>
                <label style={labelStyle}>Monthly Rent *</label>
                <input
                    type="number"
                    placeholder="Monthly rent amount"
                    value={formData.pricing.monthlyRental ?? ''}
                    onChange={(e) => onChange('pricing.monthlyRental', e.target.value)}
                    style={errors.monthlyRental ? inputStyleError : inputStyle}
                />
                {errors.monthlyRental && <span style={errorText}>{errors.monthlyRental}</span>}
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Lease Term</label>
                <select
                    value={formData.rentalSpecific?.leaseTerm ?? ''}
                    onChange={(e) => onChange('rentalSpecific.leaseTerm', e.target.value)}
                    style={inputStyle}
                >
                    <option value="">Select...</option>
                    <option value="6 months">6 months</option>
                    <option value="12 months">12 months</option>
                    <option value="24 months">24 months</option>
                    <option value="36 months">36 months</option>
                </select>
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Lease Start Date</label>
                <input
                    type="date"
                    value={formData.rentalSpecific?.leaseStartDate ?? ''}
                    onChange={(e) => onChange('rentalSpecific.leaseStartDate', e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Lease End Date</label>
                <input
                    type="date"
                    value={formData.rentalSpecific?.leaseEndDate ?? ''}
                    onChange={(e) => onChange('rentalSpecific.leaseEndDate', e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Annual Escalation (%)</label>
                <input
                    type="text"
                    placeholder="e.g. 3"
                    value={formData.pricing.annualEscalation ?? ''}
                    onChange={(e) => onChange('pricing.annualEscalation', e.target.value)}
                    style={inputStyle}
                />
            </div>
        </div>
    );
};

// Step 5 (Seller/Buyer/Investor): Purchase Price & Current Property Valuation (or Step 6 when rental)
const Step5SellerPricing = ({ formData, onChange, errors = {} }) => {
    return (
        <div>
            <h3 style={stepTitle}>Purchase Price & Valuation</h3>
            <p style={stepDescription}>Purchase price, date, and current property valuation.</p>
            <div style={formSection}>
                <label style={labelStyle}>Currency</label>
                <select value={formData.pricing.currency} onChange={(e) => onChange('pricing.currency', e.target.value)} style={inputStyle}>
                    {currencyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Purchase Price</label>
                <input
                    type="number"
                    placeholder="Purchase price"
                    value={formData.pricing.purchasePrice}
                    onChange={(e) => onChange('pricing.purchasePrice', e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Purchase Date</label>
                <input
                    type="date"
                    value={formData.pricing.purchaseDate}
                    onChange={(e) => onChange('pricing.purchaseDate', e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Current Property Valuation</label>
                <input
                    type="number"
                    placeholder="Valuation amount"
                    value={formData.pricing.currentValuation}
                    onChange={(e) => onChange('pricing.currentValuation', e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Valuation / Appraisal Document</label>
                <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    style={inputStyle}
                    onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            onChange('pricing.appraisalDocument', event.target.result);
                        };
                        reader.readAsDataURL(file);
                    }}
                />
                {formData.pricing.appraisalDocument && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                        Valuation document uploaded
                    </div>
                )}
            </div>
        </div>
    );
};

// Mortgage step (seller/buyer/investor/landlord only): optional mortgage details
const StepMortgage = ({ formData, onChange, errors = {} }) => {
    const hasMortgage = Boolean(formData.mortgage?.hasMortgage);
    const disabledStyle = { opacity: 0.6, pointerEvents: 'none' };
    const sectionStyle = hasMortgage ? {} : disabledStyle;

    return (
        <div>
            <h3 style={stepTitle}>Mortgage</h3>
            <p style={stepDescription}>If this property has a mortgage linked to it, tick the box below and fill in the details.</p>
            <div style={formSection}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: '#1f3a3d' }}>
                    <input
                        type="checkbox"
                        checked={hasMortgage}
                        onChange={(e) => onChange('mortgage.hasMortgage', e.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: '#11575C' }}
                    />
                    <span>I have a mortgage linked to this property</span>
                </label>
            </div>
            <div style={sectionStyle}>
                <div style={formSection}>
                    <label style={labelStyle}>Original mortgage amount</label>
                    <input
                        type="number"
                        placeholder="e.g. 250000"
                        value={formData.mortgage?.originalMortgageAmount ?? ''}
                        onChange={(e) => onChange('mortgage.originalMortgageAmount', e.target.value)}
                        style={errors.originalMortgageAmount ? inputStyleError : inputStyle}
                    />
                    {errors.originalMortgageAmount && <span style={errorText}>{errors.originalMortgageAmount}</span>}
                </div>
                <div style={formSection}>
                    <label style={labelStyle}>Mortgage date</label>
                    <input
                        type="date"
                        value={formData.mortgage?.mortgageDate ?? ''}
                        onChange={(e) => onChange('mortgage.mortgageDate', e.target.value)}
                        style={errors.mortgageDate ? inputStyleError : inputStyle}
                    />
                    {errors.mortgageDate && <span style={errorText}>{errors.mortgageDate}</span>}
                </div>
                <div style={formSection}>
                    <label style={labelStyle}>Term</label>
                    <input
                        type="text"
                        placeholder="e.g. 20 years"
                        value={formData.mortgage?.term ?? ''}
                        onChange={(e) => onChange('mortgage.term', e.target.value)}
                        style={errors.term ? inputStyleError : inputStyle}
                    />
                    {errors.term && <span style={errorText}>{errors.term}</span>}
                </div>
                <div style={formSection}>
                    <label style={labelStyle}>Outstanding balance</label>
                    <input
                        type="number"
                        placeholder="e.g. 180000"
                        value={formData.mortgage?.outstandingBalance ?? ''}
                        onChange={(e) => onChange('mortgage.outstandingBalance', e.target.value)}
                        style={errors.outstandingBalance ? inputStyleError : inputStyle}
                    />
                    {errors.outstandingBalance && <span style={errorText}>{errors.outstandingBalance}</span>}
                </div>
                <div style={formSection}>
                    <label style={labelStyle}>Monthly repayment</label>
                    <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={formData.mortgage?.monthlyRepayment ?? ''}
                        onChange={(e) => onChange('mortgage.monthlyRepayment', e.target.value)}
                        style={errors.monthlyRepayment ? inputStyleError : inputStyle}
                    />
                    {errors.monthlyRepayment && <span style={errorText}>{errors.monthlyRepayment}</span>}
                </div>
            </div>
        </div>
    );
};

// Step 8 (Seller/Buyer/Investor): Confirm legal ownership – required to save
const Step8LegalOwnership = ({ formData, onChange }) => {
    return (
        <div>
            <h3 style={stepTitle}>Confirm Legal Ownership</h3>
            <p style={stepDescription}>You must confirm that you are the legal owner of the property you are submitting in order to save it.</p>
            <div style={formSection}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: '#1f3a3d' }}>
                    <input
                        type="checkbox"
                        checked={Boolean(formData.legalOwnerConfirmed)}
                        onChange={(e) => onChange('legalOwnerConfirmed', e.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: '#11575C' }}
                    />
                    <span>I confirm I am the legal owner of the property I am submitting.</span>
                </label>
            </div>
        </div>
    );
};

// Step 5 (Agent): Pricing & Availability (varies by listing type)
const Step4PricingAvailability = ({ formData, onChange, errors = {} }) => {
    const isSale = formData.listingType === 'for_sale';
    const isRent = formData.listingType === 'for_rent';
    const isAuction = formData.listingType === 'for_auction';

    return (
        <div>
            <h3 style={stepTitle}>Pricing & Availability</h3>
            
            {isSale && (
                <>
                    <div style={formSection}>
                        <label style={labelStyle}>Currency *</label>
                        <select
                            value={formData.pricing.currency}
                            onChange={(e) => onChange('pricing.currency', e.target.value)}
                            style={inputStyle}
                        >
                            {currencyOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Estimated Closing Costs</label>
                        <input
                            type="text"
                            placeholder="e.g. Stamp Duty, Notary fees — amount or description"
                            value={formData.pricing.estimatedClosingCosts ?? ''}
                            onChange={(e) => onChange('pricing.estimatedClosingCosts', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Transfer taxes</label>
                        <input
                            type="text"
                            placeholder="e.g. amount or percentage"
                            value={formData.pricing.transferTaxes ?? ''}
                            onChange={(e) => onChange('pricing.transferTaxes', e.target.value)}
                            style={inputStyle}
                        />
                        <label style={{ ...labelStyle, marginTop: 8, marginBottom: 4 }}>Coverage by developer</label>
                        <select
                            value={formData.pricing.transferTaxesCoverage ?? ''}
                            onChange={(e) => onChange('pricing.transferTaxesCoverage', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">Select...</option>
                            <option value="included">Included</option>
                            <option value="excluded">Excluded</option>
                        </select>
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>VAT / GST Inclusive</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={!!formData.pricing.vatGstInclusive}
                                onChange={(e) => onChange('pricing.vatGstInclusive', e.target.checked)}
                            />
                            Price is VAT/GST inclusive
                        </label>
                    </div>
                </>
            )}

            {isRent && (
                <>
                    <div style={formSection}>
                        <label style={labelStyle}>Currency *</label>
                        <select
                            value={formData.pricing.currency}
                            onChange={(e) => onChange('pricing.currency', e.target.value)}
                            style={inputStyle}
                        >
                            {currencyOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Monthly Rental *</label>
                        <input
                            type="number"
                            placeholder="Rental: Monthly Rental"
                            value={formData.pricing.monthlyRental}
                            onChange={(e) => onChange('pricing.monthlyRental', e.target.value)}
                            style={errors.monthlyRental ? inputStyleError : inputStyle}
                        />
                        {errors.monthlyRental && <span style={errorText}>{errors.monthlyRental}</span>}
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Preferred Lease Duration</label>
                        <select
                            value={formData.rentalSpecific?.leaseTerm}
                            onChange={(e) => onChange('rentalSpecific.leaseTerm', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">Select...</option>
                            <option value="6 months">6 months</option>
                            <option value="12 months">12 months</option>
                            <option value="24 months">24 months</option>
                            <option value="36 months">36 months</option>
                        </select>
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Annual Escalation (%)</label>
                        <input
                            type="text"
                            placeholder="Annual rental escalation"
                            value={formData.pricing.annualEscalation}
                            onChange={(e) => onChange('pricing.annualEscalation', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </>
            )}

            {isAuction && (
                <>
                    <div style={formSection}>
                        <label style={labelStyle}>Currency *</label>
                        <select
                            value={formData.pricing.currency}
                            onChange={(e) => onChange('pricing.currency', e.target.value)}
                            style={inputStyle}
                        >
                            {currencyOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Starting Bid *</label>
                        <input
                            type="number"
                            placeholder="Auction: Starting Bid"
                            value={formData.pricing.startingBid}
                            onChange={(e) => onChange('pricing.startingBid', e.target.value)}
                            style={errors.startingBid ? inputStyleError : inputStyle}
                        />
                        {errors.startingBid && <span style={errorText}>{errors.startingBid}</span>}
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Bid Increment</label>
                        <input
                            type="number"
                            placeholder="Minimum bid increase"
                            value={formData.pricing.bidIncrement}
                            onChange={(e) => onChange('pricing.bidIncrement', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Buyer's Premium (%)</label>
                        <input
                            type="number"
                            placeholder="Buyer's premium"
                            value={formData.pricing.buyerPremium}
                            onChange={(e) => onChange('pricing.buyerPremium', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </>
            )}

            <div style={formSection}>
                <label style={labelStyle}>Availability Status</label>
                <select
                    value={formData.availability.status}
                    onChange={(e) => onChange('availability.status', e.target.value)}
                    style={inputStyle}
                >
                    <option value="">Select...</option>
                    <option value="Available now">Available now</option>
                    <option value="Under construction / Off-plan">Under construction / Off-plan</option>
                    <option value="Available from">Available from</option>
                    <option value="Off-Market">Off-Market</option>
                </select>
            </div>

            {formData.availability.status === 'Available from' && (
                <div style={formSection}>
                    <label style={labelStyle}>Available From Date</label>
                    <input
                        type="date"
                        value={formData.availability.availableFrom}
                        onChange={(e) => onChange('availability.availableFrom', e.target.value)}
                        style={inputStyle}
                    />
                </div>
            )}
        </div>
    );
};

// Step 5: Listing Details
const Step5ListingDetails = ({ formData, onChange }) => {
    return (
        <div>
            <h3 style={stepTitle}>Listing Details</h3>
            <div style={formSection}>
                <label style={labelStyle}>Property Size *</label>
                <div style={formGrid}>
                    <select
                        value={formData.propertySize.unitSystem}
                        onChange={(e) => onChange('propertySize.unitSystem', e.target.value)}
                        style={inputStyle}
                    >
                        <option value="sqm">sqm</option>
                        <option value="sqft">sqft</option>
                        <option value="acres">acres</option>
                        <option value="hectares">hectares</option>
                    </select>
                    <input
                        type="number"
                        placeholder="Property Size"
                        value={formData.propertySize.size}
                        onChange={(e) => onChange('propertySize.size', e.target.value)}
                        style={inputStyle}
                    />
                </div>
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Living Area (internal)</label>
                <input
                    type="number"
                    placeholder="Living area in same unit"
                    value={formData.propertySize.livingArea ?? ''}
                    onChange={(e) => onChange('propertySize.livingArea', e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Gross Floor Area (incl. balconies/walls)</label>
                <input
                    type="number"
                    placeholder="Gross floor area in same unit"
                    value={formData.propertySize.grossFloorArea ?? ''}
                    onChange={(e) => onChange('propertySize.grossFloorArea', e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Land Size (if applicable){(formData.propertyCategory === 'Land' || formData.propertyCategory === 'Agricultural') ? ' — unit' : ''}</label>
                {(formData.propertyCategory === 'Land' || formData.propertyCategory === 'Agricultural') ? (
                    <div style={formGrid}>
                        <select
                            value={formData.propertySize.landSizeUnit || 'acres'}
                            onChange={(e) => onChange('propertySize.landSizeUnit', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="acres">acres</option>
                            <option value="hectares">hectares</option>
                        </select>
                <input
                    type="number"
                    placeholder="Land size"
                    value={formData.propertySize.landSize}
                    onChange={(e) => onChange('propertySize.landSize', e.target.value)}
                    style={inputStyle}
                />
            </div>
                ) : (
                    <input
                        type="number"
                        placeholder="Land size"
                        value={formData.propertySize.landSize}
                        onChange={(e) => onChange('propertySize.landSize', e.target.value)}
                        style={inputStyle}
                    />
                )}
            </div>
            {(formData.propertyCategory === 'Land' || formData.propertyCategory === 'Agricultural') && (
                <div style={formSection}>
                    <label style={labelStyle}>Zoning Classification</label>
                    <select
                        value={formData.land?.zoningClassification ?? formData.agricultural?.zoningClassification ?? ''}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (formData.propertyCategory === 'Land') onChange('land.zoningClassification', v);
                            else onChange('agricultural.zoningClassification', v);
                        }}
                        style={inputStyle}
                    >
                        <option value="">— Select —</option>
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Mixed-Use">Mixed-Use</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Agricultural">Agricultural</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            )}
            <div style={formSection}>
                <label style={labelStyle}>Ownership Mandate *</label>
                <select
                    value={formData.ownership.mandate}
                    onChange={(e) => onChange('ownership.mandate', e.target.value)}
                    style={inputStyle}
                >
                    <option value="Sole Mandate">Sole Mandate</option>
                    <option value="Sold Mandate">Sold Mandate</option>
                    <option value="Open Mandate">Open Mandate</option>
                    <option value="Joint Mandate">Joint Mandate</option>
                </select>
            </div>
            {(formData.ownership.mandate === 'Sole Mandate' || formData.ownership.mandate === 'Sold Mandate') && (
                <>
                    <div style={formSection}>
                        <label style={labelStyle}>Mandate Start Date</label>
                        <input
                            type="date"
                            value={formData.ownership.mandateStartDate || ''}
                            onChange={(e) => onChange('ownership.mandateStartDate', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Mandate End Date</label>
                        <input
                            type="date"
                            value={formData.ownership.mandateEndDate || ''}
                            onChange={(e) => onChange('ownership.mandateEndDate', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </>
            )}
            <div style={formSection}>
                <label style={labelStyle}>Ownership Structure</label>
                <select
                    value={formData.ownership.ownershipStructure || ''}
                    onChange={(e) => onChange('ownership.ownershipStructure', e.target.value)}
                    style={inputStyle}
                >
                    <option value="">— Select —</option>
                    <option value="Freehold">Freehold</option>
                    <option value="Leasehold">Leasehold</option>
                    <option value="Commonhold">Commonhold</option>
                    <option value="Share of Freehold">Share of Freehold</option>
                </select>
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Listing Visibility *</label>
                <select
                    value={formData.ownership.listingVisibility}
                    onChange={(e) => onChange('ownership.listingVisibility', e.target.value)}
                    style={inputStyle}
                >
                    <option value="Public Listing">Public Listing</option>
                    <option value="Verified buyers only">Verified buyers only</option>
                    <option value="Off-market / private">Off-market / private</option>
                </select>
            </div>
        </div>
    );
};

// Step 6: Jurisdiction & Regulatory Context
const Step6Jurisdiction = ({ formData, onChange, userRole }) => {
    const addressCountry = formData.location?.country;
    const selectedJurisdiction = formData.jurisdiction?.country;
    const normalizedAddress = normalizeCountryName(addressCountry);
    const normalizedJurisdiction = normalizeCountryName(selectedJurisdiction);
    const jurisdictionMismatch = Boolean(addressCountry && selectedJurisdiction && normalizedAddress !== normalizedJurisdiction);
    const displayJurisdictionValue = selectedJurisdiction || jurisdictionValueFromAddress(addressCountry) || '';

    const applicableDocs = getApplicableDocs(formData, userRole);
    const requiredDocs = applicableDocs.filter((doc) => doc.required);
    const optionalDocs = applicableDocs.filter((doc) => !doc.required);
    const isUploaded = (doc) => {
        const list = doc.target === 'legalDocs' ? (formData.legalDocs || []) : (formData.mandatoryDocs || []);
        return list.some((item) => item.key === doc.key && item.fileUrl);
    };
    const getUploadedDoc = (doc) => {
        const list = doc.target === 'legalDocs' ? (formData.legalDocs || []) : (formData.mandatoryDocs || []);
        return list.find((item) => item.key === doc.key && item.fileUrl);
    };
    const uploadFile = (doc, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const entry = {
                key: doc.key,
                name: file.name,
                fileUrl: event.target.result,
                required: doc.required,
                uploaded: true
            };
            const targetKey = doc.target;
            const current = targetKey === 'legalDocs' ? (formData.legalDocs || []) : (formData.mandatoryDocs || []);
            const next = [...current.filter((d) => d.key !== doc.key), entry];
            onChange(targetKey, next);
        };
        reader.readAsDataURL(file);
    };
    const removeDoc = (doc) => {
        const targetKey = doc.target;
        const current = targetKey === 'legalDocs' ? (formData.legalDocs || []) : (formData.mandatoryDocs || []);
        onChange(targetKey, current.filter((d) => d.key !== doc.key));
    };

    return (
        <div>
            <h3 style={stepTitle}>Jurisdiction & Regulatory Context</h3>
            <div style={formSection}>
                <label style={labelStyle}>Property Jurisdiction *</label>
                <select
                    value={displayJurisdictionValue}
                    onChange={(e) => {
                        const value = e.target.value;
                        onChange('jurisdiction.country', value);
                        if (value && normalizeCountryName(value) === normalizedAddress) {
                            onChange('jurisdiction.jurisdictionMismatchAcknowledged', false);
                        }
                    }}
                    style={inputStyle}
                >
                    <option value="">Select Country</option>
                    <option value="UAE">UAE</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="South Africa">South Africa</option>
                    <option value="Greece">Greece</option>
                    <option value="Indonesia">Indonesia</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Brazil">Brazil</option>
                    <option value="Spain">Spain</option>
                    <option value="Italy">Italy</option>
                    <option value="Malta">Malta</option>
                    <option value="Germany">Germany</option>
                    <option value="Asia">Asia</option>
                </select>
            </div>
            {jurisdictionMismatch && (
                <div style={{ ...formSection, padding: '16px', background: '#fef3c7', border: '1px solid #ffc801', borderRadius: '10px', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#b45309' }}>
                        Jurisdiction does not match the property address
                    </p>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#92400e' }}>
                        The selected jurisdiction ({selectedJurisdiction}) is different from the country in the property address ({addressCountry}). Required documents have been updated for the selected jurisdiction. If you intend to proceed with this jurisdiction, please confirm below.
                    </p>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#78350f' }}>
                        <input
                            type="checkbox"
                            checked={!!formData.jurisdiction?.jurisdictionMismatchAcknowledged}
                            onChange={(e) => onChange('jurisdiction.jurisdictionMismatchAcknowledged', e.target.checked)}
                            style={{ marginTop: '3px', flexShrink: 0 }}
                        />
                        <span>I confirm that the jurisdiction does not match the property address and I want to proceed with the selected jurisdiction.</span>
                    </label>
                </div>
            )}
            <div style={formSection}>
                <label style={labelStyle}>Statutory Property Identifiers</label>
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Required Documents by Jurisdiction</label>
                {requiredDocs.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>No required documents found for this country.</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                        {requiredDocs.map((doc) => (
                            <div key={doc.key} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', background: '#fff' }}>
                                <div style={{ fontWeight: 600, fontSize: '12px' }}>{doc.name}</div>
                                {isUploaded(doc) ? (
                                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#16a34a' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                            <i className="fas fa-file"></i>
                                            <span style={{ wordBreak: 'break-word' }}>{getUploadedDoc(doc)?.name || 'Uploaded'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeDoc(doc)}
                                            style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '11px', alignSelf: 'flex-end' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <label style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#b45309', cursor: 'pointer' }}>
                                        <span style={{ fontWeight: 700 }}>+</span> Add
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => uploadFile(doc, e.target.files[0])}
                                        />
                                    </label>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Additional Documents</label>
                {optionalDocs.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>No optional documents for this country.</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                        {optionalDocs.map((doc) => (
                            <div key={doc.key} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', background: '#fff' }}>
                                <div style={{ fontWeight: 600, fontSize: '12px' }}>{doc.name}</div>
                                {isUploaded(doc) ? (
                                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#16a34a' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                            <i className="fas fa-file"></i>
                                            <span style={{ wordBreak: 'break-word' }}>{getUploadedDoc(doc)?.name || 'Uploaded'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeDoc(doc)}
                                            style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '11px', alignSelf: 'flex-end' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <label style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>
                                        <span style={{ fontWeight: 700 }}>+</span> Add
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => uploadFile(doc, e.target.files[0])}
                                        />
                                    </label>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const FIXTURE_OPTIONS = {
    utilitySystems: [
        'HVAC', 'Electrical', 'Plumbing', 'Gas', 'Water', 'Solar', 'Generator',
        'Septic System', 'Fire Sprinklers', 'Elevator', 'Boiler', 'Radiant Heating',
        'Central Air Conditioning', 'Desalination Plant', 'Greywater Recycling',
        'Solar Battery Storage', 'EV Charging Points', 'Heat Pump'
    ],
    securityFeatures: [
        'Alarm System', 'CCTV', 'Access Control', 'Security Guards', 'Intercom',
        'Video Doorbell', 'Smart Locks', 'Motion Sensors', 'Safe Room',
        'Biometric Access', '24/7 Concierge / Security Guard'
    ],
    kitchenAppliances: [
        'Refrigerator', 'Freezer', 'Dishwasher', 'Oven', 'Microwave', 'Cooktop',
        'Range Hood', 'Wine Cooler', 'Garbage Disposal', 'Water Purifier',
        'Wine Cellar', 'Outdoor Kitchen'
    ],
    leisureExternal: [
        'Pool', 'Garden', 'Patio', 'BBQ Area', 'Outdoor Kitchen', 'Deck', 'Balcony',
        'Fire Pit', 'Pergola', 'Jacuzzi', 'Sauna', 'Tennis Court', 'Playground'
    ],
    interiorFeatures: [
        'Fireplace', 'Built-in Wardrobes', 'Walk-in Closets', 'Central Air',
        'Smart Home System', 'Hardwood Floors', 'Home Office', 'Library', 'Basement',
        'Attic', 'Laundry Room', 'Sound System', 'Home Cinema'
    ],
    parkingStorage: [
        'Garage', 'Carport', 'Covered Parking', 'Driveway', 'Storage Room',
        'Bicycle Storage', 'EV Charging', 'Workshop'
    ]
};

// Step 8: Fixtures & Fittings Declaration
const Step8Fixtures = ({ formData, onChange }) => {
    const [openKey, setOpenKey] = useState(null);
    const toggleSelection = (category, value) => {
        const current = formData.fixtures[category] || [];
        const next = current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value];
        onChange(`fixtures.${category}`, next);
    };

    return (
        <div>
            <h3 style={stepTitle}>Fixtures & Fittings Declaration</h3>
            <div style={formSection}>
                <label style={labelStyle}>Floor Level</label>
                <input
                    type="text"
                    placeholder="e.g. Ground, 1st, 2nd (international standards vary: US 1st = UK Ground)"
                    value={formData.propertySize?.floorLevel ?? ''}
                    onChange={(e) => onChange('propertySize.floorLevel', e.target.value)}
                    style={inputStyle}
                />
            </div>
            {Object.entries(FIXTURE_OPTIONS).map(([key, options]) => (
                <div key={key} style={formSection}>
                    <label style={labelStyle}>{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <button
                        type="button"
                        onClick={() => setOpenKey(openKey === key ? null : key)}
                        style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', background: '#fff' }}
                    >
                        {(formData.fixtures[key] || []).length > 0
                            ? `${(formData.fixtures[key] || []).length} selected`
                            : 'Select fixtures'}
                    </button>
                    {openKey === key && (
                        <div style={{ marginTop: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', maxHeight: '220px', overflowY: 'auto', background: '#fff' }}>
                            {options.map((option) => (
                                <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '4px 0' }}>
                                    <input
                                        type="checkbox"
                                        checked={(formData.fixtures[key] || []).includes(option)}
                                        onChange={() => toggleSelection(key, option)}
                                    />
                                    {option}
                                </label>
                            ))}
                        </div>
                    )}
                    {(formData.fixtures[key] || []).length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(formData.fixtures[key] || []).map((item) => (
                                <span key={item} style={{ fontSize: '11px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '999px' }}>
                                    {item}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            <div style={formSection}>
                <label style={labelStyle}>Other Fixtures</label>
                <textarea
                    placeholder="Document any other fixtures or fittings not included above"
                    value={formData.fixtures.otherFixtures}
                    onChange={(e) => onChange('fixtures.otherFixtures', e.target.value)}
                    style={{...inputStyle, minHeight: '80px'}}
                />
            </div>

        </div>
    );
};

// Step 9: Property Condition & Defect Disclosure
const Step9Defects = ({ formData, onChange }) => {
    const defectCategories = ['roof', 'electrical', 'plumbing', 'foundation'];

    const removeDefectDoc = (category, index) => {
        const currentDocs = formData.defects[category]?.documents || [];
        const nextDocs = currentDocs.filter((_, i) => i !== index);
        onChange(`defects.${category}.documents`, nextDocs);
    };
    const handleSupportingUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const filePromises = files.map((file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    resolve({
                        key: `supporting-${file.name}-${Date.now()}`,
                        name: file.name,
                        fileUrl: event.target.result
                    });
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(filePromises).then((uploadedFiles) => {
            const validFiles = uploadedFiles.filter((f) => f !== null);
            const currentDocs = formData.defects.supportingDocuments || [];
            onChange('defects.supportingDocuments', [...currentDocs, ...validFiles]);
        });
    };
    const removeSupportingDoc = (docKey) => {
        const currentDocs = formData.defects.supportingDocuments || [];
        onChange('defects.supportingDocuments', currentDocs.filter((doc) => doc.key !== docKey));
    };

    return (
        <div>
            <h3 style={stepTitle}>Property Condition & Defect Disclosure</h3>
            <p style={stepDescription}>Are you aware of any defects in the following areas?</p>
            {defectCategories.map(category => (
                <div key={category} style={formSection}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
                        <input
                            type="checkbox"
                            checked={formData.defects[category]?.aware || false}
                            onChange={(e) => onChange(`defects.${category}.aware`, e.target.checked)}
                        />
                        <label style={{...labelStyle, margin:0, textTransform:'capitalize'}}>{category}</label>
                    </div>
                    {formData.defects[category]?.aware && (
                        <>
                            <textarea
                                placeholder={`Additional notes about ${category} defects`}
                                value={formData.defects[category]?.notes || ''}
                                onChange={(e) => onChange(`defects.${category}.notes`, e.target.value)}
                                style={{...inputStyle, minHeight: '60px', marginTop:'5px'}}
                            />
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,image/*"
                                style={{...inputStyle, marginTop:'5px'}}
                                onChange={(e) => {
                                    const files = Array.from(e.target.files);
                                    if (files.length === 0) return;

                                    const filePromises = files.map((file) => {
                                        return new Promise((resolve) => {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                resolve(event.target.result); // Base64 data URL
                                            };
                                            reader.onerror = () => resolve(null);
                                            reader.readAsDataURL(file);
                                        });
                                    });

                                    Promise.all(filePromises).then((uploadedFiles) => {
                                        const validFiles = uploadedFiles.filter(f => f !== null);
                                        const currentDocs = formData.defects[category]?.documents || [];
                                        onChange(`defects.${category}.documents`, [...currentDocs, ...validFiles]);
                                    });
                                }}
                            />
                            {formData.defects[category]?.documents && formData.defects[category].documents.length > 0 && (
                                <div style={{marginTop:'8px', display:'flex', flexDirection:'column', gap:'6px'}}>
                                    {formData.defects[category].documents.map((doc, idx) => (
                                        <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc', padding:'6px 10px', borderRadius:'8px', fontSize:'11px', color:'#64748b'}}>
                                            <span><i className="fas fa-file"></i> File {idx + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeDefectDoc(category, idx)}
                                                style={{border:'none', background:'transparent', color:'#ef4444', cursor:'pointer', fontSize:'11px'}}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            ))}
            <div style={formSection}>
                <label style={labelStyle}>Additional Notes</label>
                <textarea
                    placeholder="Any other defect disclosures"
                    value={formData.defects.additionalNotes}
                    onChange={(e) => onChange('defects.additionalNotes', e.target.value)}
                    style={{...inputStyle, minHeight: '80px'}}
                />
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Supporting documents and Quotes</label>
                <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,image/*"
                    style={inputStyle}
                    onChange={handleSupportingUpload}
                />
                {formData.defects.supportingDocuments && formData.defects.supportingDocuments.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {formData.defects.supportingDocuments.map((doc) => (
                            <div key={doc.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', color: '#64748b' }}>
                                <span><i className="fas fa-file"></i> {doc.name || 'Supporting Document'}</span>
                                <button
                                    type="button"
                                    onClick={() => removeSupportingDoc(doc.key)}
                                    style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Step 10: Legal & Due Diligence Declarations
const Step10LegalDocs = ({ formData, onChange, errors = {} }) => {
    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const filePromises = files.map((file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    resolve({
                        key: `legal-${file.name}-${Date.now()}`,
                        name: file.name,
                        fileUrl: event.target.result,
                        required: false,
                        uploaded: true,
                        verified: false
                    });
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(filePromises).then((uploadedFiles) => {
            const validFiles = uploadedFiles.filter(f => f !== null);
            const currentDocs = formData.legalDocs || [];
            onChange('legalDocs', [...currentDocs, ...validFiles]);
        });
    };

    const removeDoc = (docKey) => {
        const currentDocs = formData.legalDocs || [];
        onChange('legalDocs', currentDocs.filter((doc) => doc.key !== docKey));
    };
    return (
        <div>
            <h3 style={stepTitle}>Legal & Due Diligence Declarations</h3>
            <div style={formSection}>
                <label style={labelStyle}>Uploaded Documents</label>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                    Documents collected earlier are shown below. You can add or remove additional legal documents.
                </div>
                <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,image/*"
                    style={inputStyle}
                    onChange={handleFileUpload}
                />
                {(formData.legalDocs?.length || formData.mandatoryDocs?.length) ? (
                    <div style={{marginTop:'10px', fontSize:'12px', color:'#64748b'}}>
                        {(formData.legalDocs?.length || 0) + (formData.mandatoryDocs?.length || 0)} document(s) uploaded
                        <div style={{marginTop:'6px', display: 'flex', flexDirection: 'column', gap: '6px'}}>
                            {(formData.legalDocs || []).map((doc) => (
                                <div key={doc.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px' }}>
                                    <span><i className="fas fa-file"></i> {doc.name}</span>
                                    <button type="button" onClick={() => removeDoc(doc.key)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{marginTop:'10px', fontSize:'12px', color:'#94a3b8'}}>No documents uploaded yet.</div>
                )}
            </div>
            <div style={formSection}>
                <label style={checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={formData.declarations.agentDeclaration}
                        onChange={(e) => onChange('declarations.agentDeclaration', e.target.checked)}
                    />
                    I confirm that the information provided is accurate and complies with local regulations.
                </label>
            </div>
            <div style={formSection}>
                <label style={checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={formData.declarations.complianceAcknowledgment}
                        onChange={(e) => onChange('declarations.complianceAcknowledgment', e.target.checked)}
                    />
                    I understand that incomplete or misleading disclosures may result in listing removal.
                </label>
            </div>
            {errors.declarations && <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>{errors.declarations}</div>}
        </div>
    );
};

// Step 11: Primary Property Images
const Step11Media = ({ formData, onChange, errors = {} }) => {
    const handleImageUpload = (field, file) => {
        if (!file) return;
        
        // Compress image if too large
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxWidth = 1200;
                const maxHeight = 1200;
                
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    } else {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                onChange(field, compressedDataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleMultipleImages = (field, files) => {
        const imageArray = [];
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageArray.push(event.target.result);
                if (index === files.length - 1) {
                    onChange(field, [...(formData.media[field.replace('media.', '')] || []), ...imageArray]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    return (
        <div>
            <h3 style={stepTitle}>Primary Property Images</h3>
            <div style={formSection}>
                <label style={labelStyle}>Cover Image *</label>
                <p style={{fontSize:'12px', color:'#64748b', marginBottom:'10px'}}>
                    This image appears in search results and previews
                </p>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                        if (e.target.files[0]) {
                            handleImageUpload('media.coverImage', e.target.files[0]);
                        }
                    }}
                    style={inputStyle}
                />
                {formData.media.coverImage && (
                    <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                        <img
                            src={formData.media.coverImage}
                            alt="Cover preview"
                            style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <button
                            type="button"
                            onClick={() => onChange('media.coverImage', '')}
                            style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                fontSize: 16,
                                lineHeight: 1,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                            }}
                            title="Remove cover image"
                            aria-label="Remove cover image"
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Image Gallery</label>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                        if (e.target.files.length > 0) {
                            handleMultipleImages('media.imageGallery', e.target.files);
                        }
                    }}
                    style={inputStyle}
                />
                {formData.media.imageGallery && formData.media.imageGallery.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '10px' }}>
                        {formData.media.imageGallery.map((img, idx) => (
                            <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                                <img src={img} alt={`Gallery ${idx + 1}`} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = (formData.media.imageGallery || []).filter((_, i) => i !== idx);
                                        onChange('media.imageGallery', next);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: 'rgba(0,0,0,0.6)',
                                        color: '#fff',
                                        fontSize: 14,
                                        lineHeight: 1,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0
                                    }}
                                    title="Remove image"
                                    aria-label={`Remove image ${idx + 1}`}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Floorplans (uploaded earlier)</label>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {(() => {
                        const floorplanDoc = (formData.mandatoryDocs || []).find((doc) => doc.key === 'floorplans');
                        return floorplanDoc ? `Uploaded: ${floorplanDoc.name}` : 'No floorplans uploaded yet';
                    })()}
                </div>
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Virtual Tour (URL)</label>
                <input
                    type="url"
                    placeholder="https://..."
                    value={formData.media.virtual3DTour || ''}
                    onChange={(e) => onChange('media.virtual3DTour', e.target.value)}
                    style={inputStyle}
                />
            </div>
            <div style={formSection}>
                <label style={labelStyle}>Virtual Tour File (optional)</label>
                <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            onChange('media.virtual3DTourFile', event.target.result);
                        };
                        reader.readAsDataURL(file);
                    }}
                    style={inputStyle}
                />
                {formData.media.virtual3DTourFile && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                        Virtual tour file uploaded
                    </div>
                )}
            </div>
            <div style={formSection}>
                <label style={checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={formData.media.mediaRights.hasRights}
                        onChange={(e) => onChange('media.mediaRights.hasRights', e.target.checked)}
                    />
                    I confirm I have the right to upload and publish this media.
                </label>
            </div>
            <div style={formSection}>
                <label style={checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={!!formData.declarations?.imagesConfirmed}
                        onChange={(e) => onChange('declarations.imagesConfirmed', e.target.checked)}
                    />
                    I confirm that I have uploaded/selected the required images (cover image and any gallery images).
                </label>
            </div>
            {errors.imagesConfirmed && <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>{errors.imagesConfirmed}</div>}
        </div>
    );
};

// Step 12: Category-Specific Information
const Step12CategorySpecific = ({ formData, onChange }) => {
    const category = formData.propertyCategory;

    if (category === 'Residential') {
        return (
            <div>
                <h3 style={stepTitle}>Residential Property Details</h3>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Bedrooms</label>
                        <input
                            type="number"
                            value={formData.residential?.bedrooms || ''}
                            onChange={(e) => onChange('residential.bedrooms', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Bathrooms</label>
                        <input
                            type="number"
                            value={formData.residential?.bathrooms || ''}
                            onChange={(e) => onChange('residential.bathrooms', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Living Area Size</label>
                        <input
                            type="number"
                            value={formData.residential?.livingAreaSize || ''}
                            onChange={(e) => onChange('residential.livingAreaSize', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Parking Spaces</label>
                        <input
                            type="number"
                            value={formData.residential?.parkingSpaces || ''}
                            onChange={(e) => onChange('residential.parkingSpaces', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (category === 'Land') {
        return (
            <div>
                <h3 style={stepTitle}>Land Property Details</h3>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Net Developable Area</label>
                        <input
                            type="number"
                            placeholder="Area suitable for development"
                            value={formData.land?.netDevelopableArea || ''}
                            onChange={(e) => onChange('land.netDevelopableArea', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Zoning</label>
                        <input
                            type="text"
                            placeholder="Zoning classification"
                            value={formData.land?.zoning || ''}
                            onChange={(e) => onChange('land.zoning', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Permitted Development Density</label>
                        <input
                            type="text"
                            placeholder="Permitted development density"
                            value={formData.land?.permittedDensity || ''}
                            onChange={(e) => onChange('land.permittedDensity', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Water Rights Status</label>
                        <select
                            value={formData.land?.waterRightsStatus || ''}
                            onChange={(e) => onChange('land.waterRightsStatus', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">Select...</option>
                            <option value="Full Rights">Full Rights</option>
                            <option value="Partial Rights">Partial Rights</option>
                            <option value="No Rights">No Rights</option>
                        </select>
                    </div>
                </div>
                <div style={formSection}>
                    <label style={labelStyle}>Land Features</label>
                    <textarea
                        placeholder="Describe notable features of the land"
                        value={formData.land?.landFeatures || ''}
                        onChange={(e) => onChange('land.landFeatures', e.target.value)}
                        style={{...inputStyle, minHeight: '80px'}}
                    />
                </div>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Perc Test Status</label>
                        <select
                            value={formData.land?.percTestStatus || ''}
                            onChange={(e) => onChange('land.percTestStatus', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">Select...</option>
                            <option value="Passed">Passed</option>
                            <option value="Failed">Failed</option>
                            <option value="Not Tested">Not Tested</option>
                        </select>
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Slope Category</label>
                        <select
                            value={formData.land?.slopeCategory || ''}
                            onChange={(e) => onChange('land.slopeCategory', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">Select...</option>
                            <option value="Flat">Flat</option>
                            <option value="Gentle">Gentle</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Steep">Steep</option>
                        </select>
                    </div>
                </div>
                <div style={formSection}>
                    <label style={labelStyle}>Utilities & Infrastructure</label>
                    <div style={formGrid}>
                        <div>
                            <label style={labelStyle}>Sewer Proximity (meters)</label>
                            <input
                                type="number"
                                placeholder="Distance to nearest sewer"
                                value={formData.land?.utilities?.sewerProximity || ''}
                                onChange={(e) => onChange('land.utilities.sewerProximity', e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Power Line Access</label>
                            <select
                                value={formData.land?.utilities?.powerLineAccess?.available ? 'yes' : formData.land?.utilities?.powerLineAccess?.available === false ? 'no' : ''}
                                onChange={(e) => onChange('land.utilities.powerLineAccess.available', e.target.value === 'yes')}
                                style={inputStyle}
                            >
                                <option value="">Select...</option>
                                <option value="yes">Available</option>
                                <option value="no">Not Available</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Flood Zone</label>
                            <select
                                value={formData.land?.utilities?.floodZone || ''}
                                onChange={(e) => onChange('land.utilities.floodZone', e.target.value)}
                                style={inputStyle}
                            >
                                <option value="">Select...</option>
                                <option value="None">None</option>
                                <option value="Low Risk">Low Risk</option>
                                <option value="Moderate Risk">Moderate Risk</option>
                                <option value="High Risk">High Risk</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (category === 'Industrial') {
        return (
            <div>
                <h3 style={stepTitle}>Industrial Property Details</h3>
                <div style={formSection}>
                    <label style={labelStyle}>Build Status</label>
                    <select
                        value={formData.industrial?.buildStatus || ''}
                        onChange={(e) => onChange('industrial.buildStatus', e.target.value)}
                        style={inputStyle}
                    >
                        <option value="">Select...</option>
                        <option value="Completed">Completed</option>
                        <option value="Under Construction">Under Construction</option>
                        <option value="Shell Only">Shell Only</option>
                    </select>
                </div>
                <h4 style={subStepTitle}>Structural Specifications</h4>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Clear Height</label>
                        <input
                            type="text"
                            placeholder="Clear height"
                            value={formData.industrial?.structuralSpecs?.clearHeight || ''}
                            onChange={(e) => onChange('industrial.structuralSpecs.clearHeight', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Floor Slab Strength (PSI)</label>
                        <input
                            type="text"
                            placeholder="PSI"
                            value={formData.industrial?.structuralSpecs?.floorSlabStrength || ''}
                            onChange={(e) => onChange('industrial.structuralSpecs.floorSlabStrength', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Column Spacing</label>
                        <input
                            type="text"
                            placeholder="Column spacing"
                            value={formData.industrial?.structuralSpecs?.columnSpacing || ''}
                            onChange={(e) => onChange('industrial.structuralSpecs.columnSpacing', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <h4 style={subStepTitle}>Access & Loading Infrastructure</h4>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Number of Dock Doors</label>
                        <input
                            type="number"
                            value={formData.industrial?.accessLoading?.dockDoors || ''}
                            onChange={(e) => onChange('industrial.accessLoading.dockDoors', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Dock Leveler Capacity</label>
                        <input
                            type="text"
                            placeholder="Capacity"
                            value={formData.industrial?.accessLoading?.dockLevelerCapacity || ''}
                            onChange={(e) => onChange('industrial.accessLoading.dockLevelerCapacity', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <div style={formSection}>
                    <label style={checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={formData.industrial?.accessLoading?.driveInRamps || false}
                            onChange={(e) => onChange('industrial.accessLoading.driveInRamps', e.target.checked)}
                        />
                        Drive-in Ramps
                    </label>
                </div>
                <h4 style={subStepTitle}>Utilities & Site Services</h4>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Power Amperage Available</label>
                        <input
                            type="text"
                            placeholder="Amperage"
                            value={formData.industrial?.utilities?.powerAmperage || ''}
                            onChange={(e) => onChange('industrial.utilities.powerAmperage', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Site Area</label>
                        <input
                            type="text"
                            placeholder="Site area"
                            value={formData.industrial?.utilities?.siteArea || ''}
                            onChange={(e) => onChange('industrial.utilities.siteArea', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <h4 style={subStepTitle}>Specialized Capabilities</h4>
                <div style={formSection}>
                    <label style={checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={formData.industrial?.specialized?.temperatureControlled || false}
                            onChange={(e) => onChange('industrial.specialized.temperatureControlled', e.target.checked)}
                        />
                        Temperature Controlled Facility
                    </label>
                    {formData.industrial?.specialized?.temperatureControlled && (
                        <input
                            type="text"
                            placeholder="Temperature range"
                            value={formData.industrial?.specialized?.temperatureRange || ''}
                            onChange={(e) => onChange('industrial.specialized.temperatureRange', e.target.value)}
                            style={{...inputStyle, marginTop:'10px'}}
                        />
                    )}
                </div>
                <h4 style={subStepTitle}>Property Features</h4>
                <div style={checkboxGrid}>
                    <label style={checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={formData.industrial?.features?.security24hr || false}
                            onChange={(e) => onChange('industrial.features.security24hr', e.target.checked)}
                        />
                        24-hour security
                    </label>
                    <label style={checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={formData.industrial?.features?.fireSuppression || false}
                            onChange={(e) => onChange('industrial.features.fireSuppression', e.target.checked)}
                        />
                        Fire suppression system
                    </label>
                    <label style={checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={formData.industrial?.features?.onSiteOffices || false}
                            onChange={(e) => onChange('industrial.features.onSiteOffices', e.target.checked)}
                        />
                        On-site offices
                    </label>
                    <label style={checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={formData.industrial?.features?.gatedFencedYard || false}
                            onChange={(e) => onChange('industrial.features.gatedFencedYard', e.target.checked)}
                        />
                        Gated / Fenced Yard
                    </label>
                </div>
            </div>
        );
    }

    if (category === 'Office') {
        return (
            <div>
                <h3 style={stepTitle}>Office Property Details</h3>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Office Type</label>
                        <select
                            value={formData.office?.officeType || ''}
                            onChange={(e) => onChange('office.officeType', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">Select...</option>
                            <option value="Traditional Office">Traditional Office</option>
                            <option value="Shared Office">Shared Office</option>
                        </select>
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Office Grade</label>
                        <input
                            type="text"
                            placeholder="Office grade"
                            value={formData.office?.officeGrade || ''}
                            onChange={(e) => onChange('office.officeGrade', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Percentage Rent (%)</label>
                        <input
                            type="number"
                            placeholder="Percentage rent"
                            value={formData.office?.percentageRent || ''}
                            onChange={(e) => onChange('office.percentageRent', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Fit-Out Category</label>
                        <input
                            type="text"
                            placeholder="Fit-out category"
                            value={formData.office?.fitOutCategory || ''}
                            onChange={(e) => onChange('office.fitOutCategory', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <h4 style={subStepTitle}>Tenancy & Occupancy</h4>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Anchor Tenant Name</label>
                        <input
                            type="text"
                            placeholder="Anchor tenant"
                            value={formData.office?.tenancy?.anchorTenantName || ''}
                            onChange={(e) => onChange('office.tenancy.anchorTenantName', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Main Tenant Name</label>
                        <input
                            type="text"
                            placeholder="Main tenant"
                            value={formData.office?.tenancy?.mainTenantName || ''}
                            onChange={(e) => onChange('office.tenancy.mainTenantName', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <h4 style={subStepTitle}>Leasing & Commercial Terms</h4>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Base Rent</label>
                        <input
                            type="text"
                            placeholder="Base rent"
                            value={formData.office?.leasing?.baseRent || ''}
                            onChange={(e) => onChange('office.leasing.baseRent', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Annual Rental Income</label>
                        <input
                            type="number"
                            placeholder="Annual rental income"
                            value={formData.office?.leasing?.annualRentalIncome || ''}
                            onChange={(e) => onChange('office.leasing.annualRentalIncome', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>WALT (Weighted Average Lease Term)</label>
                        <input
                            type="number"
                            placeholder="WALT in months"
                            value={formData.office?.leasing?.walt || ''}
                            onChange={(e) => onChange('office.leasing.walt', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>TI Allowance</label>
                        <input
                            type="number"
                            placeholder="Tenant Improvement Allowance"
                            value={formData.office?.leasing?.tiAllowance || ''}
                            onChange={(e) => onChange('office.leasing.tiAllowance', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <h4 style={subStepTitle}>Size & Capacity</h4>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Gross Leasable Area (GLA)</label>
                        <input
                            type="number"
                            placeholder="GLA in sqm"
                            value={formData.office?.sizeCapacity?.gla || ''}
                            onChange={(e) => onChange('office.sizeCapacity.gla', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Desk Capacity (Shared Office)</label>
                        <input
                            type="number"
                            placeholder="Total desk capacity"
                            value={formData.office?.sizeCapacity?.deskCapacity || ''}
                            onChange={(e) => onChange('office.sizeCapacity.deskCapacity', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <h4 style={subStepTitle}>Access, Visibility & Logistics</h4>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Parking Ratio</label>
                        <input
                            type="number"
                            placeholder="Spaces per 1,000 sqm"
                            value={formData.office?.accessVisibility?.parkingRatio || ''}
                            onChange={(e) => onChange('office.accessVisibility.parkingRatio', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Main Frontage Length</label>
                        <input
                            type="text"
                            placeholder="Frontage length"
                            value={formData.office?.accessVisibility?.mainFrontageLength || ''}
                            onChange={(e) => onChange('office.accessVisibility.mainFrontageLength', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (category === 'Commercial' || category === 'Retail') {
        return (
            <div>
                <h3 style={stepTitle}>{category} Property Details</h3>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Retail Type</label>
                        <input
                            type="text"
                            placeholder="Retail type"
                            value={formData.commercial?.retailType || ''}
                            onChange={(e) => onChange('commercial.retailType', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Square Footage</label>
                        <input
                            type="number"
                            placeholder="Square footage"
                            value={formData.commercial?.squareFootage || ''}
                            onChange={(e) => onChange('commercial.squareFootage', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <h4 style={subStepTitle}>Lease Terms</h4>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Base Rent</label>
                        <input
                            type="number"
                            placeholder="Base rent"
                            value={formData.commercial?.leaseTerms?.baseRent || ''}
                            onChange={(e) => onChange('commercial.leaseTerms.baseRent', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Percentage Rent (%)</label>
                        <input
                            type="number"
                            placeholder="Percentage rent"
                            value={formData.commercial?.leaseTerms?.percentageRent || ''}
                            onChange={(e) => onChange('commercial.leaseTerms.percentageRent', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Lease Duration</label>
                        <input
                            type="text"
                            placeholder="Lease duration"
                            value={formData.commercial?.leaseTerms?.leaseDuration || ''}
                            onChange={(e) => onChange('commercial.leaseTerms.leaseDuration', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <h4 style={subStepTitle}>Tenant Information</h4>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Current Tenant</label>
                        <input
                            type="text"
                            placeholder="Current tenant name"
                            value={formData.commercial?.tenantInfo?.currentTenant || ''}
                            onChange={(e) => onChange('commercial.tenantInfo.currentTenant', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Lease Expiry Date</label>
                        <input
                            type="date"
                            value={formData.commercial?.tenantInfo?.leaseExpiry || ''}
                            onChange={(e) => onChange('commercial.tenantInfo.leaseExpiry', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (category === 'Agricultural') {
        return (
            <div>
                <h3 style={stepTitle}>Agricultural Property Details</h3>
                <div style={formGrid}>
                    <div style={formSection}>
                        <label style={labelStyle}>Land Use</label>
                        <select
                            value={formData.agricultural?.landUse || ''}
                            onChange={(e) => onChange('agricultural.landUse', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">Select...</option>
                            <option value="Farming">Farming</option>
                            <option value="Livestock">Livestock</option>
                            <option value="Crops">Crops</option>
                            <option value="Mixed Use">Mixed Use</option>
                        </select>
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Acreage</label>
                        <input
                            type="number"
                            placeholder="Total acreage"
                            value={formData.agricultural?.acreage || ''}
                            onChange={(e) => onChange('agricultural.acreage', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Water Rights</label>
                        <select
                            value={formData.agricultural?.waterRights || ''}
                            onChange={(e) => onChange('agricultural.waterRights', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">Select...</option>
                            <option value="Full Rights">Full Rights</option>
                            <option value="Partial Rights">Partial Rights</option>
                            <option value="No Rights">No Rights</option>
                        </select>
                    </div>
                    <div style={formSection}>
                        <label style={labelStyle}>Soil Type</label>
                        <input
                            type="text"
                            placeholder="Soil type"
                            value={formData.agricultural?.soilType || ''}
                            onChange={(e) => onChange('agricultural.soilType', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <div style={formSection}>
                    <label style={checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={formData.agricultural?.irrigation || false}
                            onChange={(e) => onChange('agricultural.irrigation', e.target.checked)}
                        />
                        Irrigation Available
                    </label>
                </div>
                <div style={formSection}>
                    <label style={labelStyle}>Zoning</label>
                    <input
                        type="text"
                        placeholder="Zoning classification"
                        value={formData.agricultural?.zoning || ''}
                        onChange={(e) => onChange('agricultural.zoning', e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div style={formSection}>
                    <label style={labelStyle}>Improvements</label>
                    <textarea
                        placeholder="List buildings, barns, and other improvements"
                        value={formData.agricultural?.improvements || ''}
                        onChange={(e) => onChange('agricultural.improvements', e.target.value)}
                        style={{...inputStyle, minHeight: '80px'}}
                    />
                </div>
            </div>
        );
    }

    // Default: Show generic message
    return (
        <div>
            <h3 style={stepTitle}>Additional Information</h3>
            <p style={stepDescription}>
                Please complete the previous steps to see category-specific fields.
            </p>
        </div>
    );
};

// Step 13: Listing Summary
const Step13ListingSummary = ({ formData, listingMetadata = null, onChange, errors = {}, missingRequiredDocs = [] }) => {
    const [generating, setGenerating] = useState(false);

    const buildContextForLLM = () => {
        const sections = [];
        const push = (label, ...values) => {
            const v = values.filter(Boolean).join(' ');
            if (v) sections.push(`${label}\n${v}`);
        };
        const loc = formData.location || {};
        const addressParts = [loc.streetAddress, loc.suburb, loc.city, loc.country].filter(Boolean);
        push('LOCATION', addressParts.length ? addressParts.join(', ') : '', loc.coordinates ? `Coordinates: ${loc.coordinates.lat}, ${loc.coordinates.lng}` : '');

        const listingType = (formData.listingType || formData.propertyCategory || '').replace(/_/g, ' ');
        const propType = (formData.type || formData.propertyType || '').replace(/_/g, ' ');
        push('LISTING & PROPERTY TYPE', listingType && `Listing: ${listingType}`, propType && `Property type: ${propType}`);

        const pricing = formData.pricing || {};
        const curr = pricing.currency || 'USD';
        const priceParts = [];
        if (pricing.askingPrice != null && pricing.askingPrice !== '') priceParts.push(`Asking price: ${curr} ${Number(pricing.askingPrice).toLocaleString()}`);
        if (pricing.monthlyRental != null && pricing.monthlyRental !== '') priceParts.push(`Monthly rental: ${curr} ${Number(pricing.monthlyRental).toLocaleString()}`);
        if (pricing.startingBid != null && pricing.startingBid !== '') priceParts.push(`Starting bid: ${curr} ${Number(pricing.startingBid).toLocaleString()}`);
        if (pricing.purchasePrice != null && pricing.purchasePrice !== '') priceParts.push(`Purchase price: ${curr} ${Number(pricing.purchasePrice).toLocaleString()}`);
        if (pricing.currentValuation != null && pricing.currentValuation !== '') priceParts.push(`Current valuation: ${curr} ${Number(pricing.currentValuation).toLocaleString()}`);
        if (pricing.priceBasis) priceParts.push(`Price basis: ${pricing.priceBasis}`);
        if (pricing.annualEscalation) priceParts.push(`Annual escalation: ${pricing.annualEscalation}`);
        if (pricing.depositRequired != null) priceParts.push(`Deposit: ${curr} ${pricing.depositRequired}`);
        push('PRICING', priceParts.join('. '));

        const size = formData.propertySize || {};
        const sizeUnit = size.unitSystem === 'sqft' ? ' sq ft' : (size.unitSystem === 'sqm' ? ' m²' : '');
        const sizeParts = [];
        if (size.size != null && size.size !== '') sizeParts.push(`Living/internal: ${Number(size.size).toLocaleString()}${sizeUnit || ' m²'}`);
        if (size.landSize != null && size.landSize !== '') sizeParts.push(`Land: ${Number(size.landSize).toLocaleString()} ${size.unitSystem || 'm²'}`);
        push('SIZE', sizeParts.join('. '));

        const res = formData.residential || {};
        const layoutParts = [];
        if (res.bedrooms != null && res.bedrooms !== '') layoutParts.push(`${res.bedrooms} bedroom(s)`);
        if (res.bathrooms != null && res.bathrooms !== '') layoutParts.push(`${res.bathrooms} bathroom(s)`);
        if (res.livingAreaSize != null && res.livingAreaSize !== '') layoutParts.push(`Living area: ${res.livingAreaSize}${size.unitSystem === 'sqft' ? ' sq ft' : ' m²'}`);
        if (res.landLotSize != null && res.landLotSize !== '') layoutParts.push(`Lot: ${res.landLotSize}`);
        if (res.parkingSpaces != null && res.parkingSpaces !== '') layoutParts.push(`Parking: ${res.parkingSpaces}`);
        if (res.estateGatedCommunity) layoutParts.push('Estate/gated community');
        if (res.communityInfo) layoutParts.push(`Community: ${res.communityInfo}`);
        if (res.epcEnergyRating) layoutParts.push(`EPC: ${res.epcEnergyRating}`);
        if (res.greenEnergyFeatures && res.greenEnergyFeatures.length) layoutParts.push(`Green features: ${res.greenEnergyFeatures.join(', ')}`);
        if (res.bodyCorporateFee?.applicable && res.bodyCorporateFee?.monthlyAmount != null) layoutParts.push(`Levies: ${curr} ${res.bodyCorporateFee.monthlyAmount}/month`);
        push('LAYOUT & RESIDENTIAL', layoutParts.join('. '));
        if (res.propertyFeatures && res.propertyFeatures.length) push('PROPERTY FEATURES (use these)', res.propertyFeatures.join(', '));

        const fix = formData.fixtures || {};
        const fixtureParts = [];
        if (fix.utilitySystems && fix.utilitySystems.length) fixtureParts.push(`Utilities: ${fix.utilitySystems.join(', ')}`);
        if (fix.securityFeatures && fix.securityFeatures.length) fixtureParts.push(`Security: ${fix.securityFeatures.join(', ')}`);
        if (fix.kitchenAppliances && fix.kitchenAppliances.length) fixtureParts.push(`Kitchen: ${fix.kitchenAppliances.join(', ')}`);
        if (fix.leisureExternal && fix.leisureExternal.length) fixtureParts.push(`Leisure/outdoor: ${fix.leisureExternal.join(', ')}`);
        if (fix.otherFixtures) fixtureParts.push(fix.otherFixtures);
        push('FIXTURES & AMENITIES', fixtureParts.join('. '));

        const avail = formData.availability || {};
        if (avail.availableFrom || avail.status) push('AVAILABILITY', avail.availableFrom ? `Available from: ${avail.availableFrom}` : '', avail.status || '');

        if (formData.commercial && Object.keys(formData.commercial).length) {
            const c = formData.commercial;
            const commParts = [];
            if (c.officeType) commParts.push(`Office type: ${c.officeType}`);
            if (c.officeGrade) commParts.push(`Grade: ${c.officeGrade}`);
            if (c.baseRent) commParts.push(`Base rent: ${c.baseRent}`);
            if (c.percentageRent != null) commParts.push(`Percentage rent: ${c.percentageRent}%`);
            push('COMMERCIAL', commParts.join('. '));
        }
        if (formData.land && (formData.land.zoning || formData.land.landFeatures)) push('LAND', formData.land.zoning ? `Zoning: ${formData.land.zoning}` : '', formData.land.landFeatures || '');
        if (formData.industrial && formData.industrial.buildStatus) push('INDUSTRIAL', `Build: ${formData.industrial.buildStatus}`);

        const defects = formData.defects || {};
        if (defects.additionalNotes) push('ADDITIONAL NOTES (include if relevant)', defects.additionalNotes);

        if (listingMetadata) {
            const raw = listingMetadata;
            const m = (raw?.metadata != null || raw?.property != null) ? raw : (raw?.data || raw?.result || {});
            const property = m.property || {};
            const valuation = m.valuation || {};
            const neighborhood = m.neighborhood || {};
            const market = m.market_data || {};
            if (property.formatted_address) push('CANONICAL ADDRESS', property.formatted_address);
            const ch = property.characteristics || {};
            const metaParts = [];
            if (ch.year_built != null) metaParts.push(`Year built: ${ch.year_built}`);
            if (ch.square_feet != null) metaParts.push(`Square feet: ${Number(ch.square_feet).toLocaleString()}`);
            if (ch.lot_size_sqft != null) metaParts.push(`Lot: ${Number(ch.lot_size_sqft).toLocaleString()} sq ft`);
            if (metaParts.length) push('ENRICHED METADATA', metaParts.join('. '));
            if (valuation.current_estimate?.value != null || valuation.current_estimate?.value_usd != null) {
                const v = valuation.current_estimate.value_usd ?? valuation.current_estimate.value;
                const c = valuation.current_estimate.currency || 'USD';
                push('VALUATION', `${c} ${Number(v).toLocaleString()}`);
            }
            if (neighborhood.name) push('NEIGHBORHOOD', neighborhood.name);
            if (neighborhood.description) push('AREA DESCRIPTION', neighborhood.description);
            if (market.status) push('MARKET', String(market.status).replace(/_/g, ' '));
        }
        return sections.join('\n\n');
    };

    const buildAutoSummary = async () => {
        const isDevelopment = (formData.propertyCategory || '').toLowerCase() === 'development';
        const type = (formData.propertyType || formData.propertyCategory || (isDevelopment ? 'Development' : 'Property')).trim();
        const typeLower = type.toLowerCase();
        const street = (formData.location?.streetAddress || '').trim();
        const suburb = (formData.location?.suburb || '').trim();
        const city = (formData.location?.city || '').trim();
        const country = (formData.location?.country || '').trim();
        const rawParts = [street, suburb, city, country].filter(Boolean);
        let addressLine = rawParts.join(', ');
        const cityCountrySuffix = [city, country].filter(Boolean).join(', ');
        if (cityCountrySuffix && addressLine.endsWith(', ' + cityCountrySuffix)) {
            addressLine = addressLine.slice(0, addressLine.length - (', ' + cityCountrySuffix).length).trim();
        }
        if (!addressLine && cityCountrySuffix) addressLine = cityCountrySuffix;
        if (addressLine && city && country && !addressLine.includes(city)) addressLine = [addressLine, city, country].filter(Boolean).join(', ');
        addressLine = dedupePropertyTitle(addressLine);

        const beds = formData.residential?.bedrooms;
        const baths = formData.residential?.bathrooms;
        const sizeNum = formData.propertySize?.size;
        const sizeUnit = formData.propertySize?.unitSystem || 'sqm';
        const size = sizeNum != null && sizeNum !== '' ? `${Number(sizeNum).toLocaleString()} ${sizeUnit}` : '';
        const priceVal = formData.pricing?.askingPrice;
        const currency = (formData.pricing?.currency || 'USD').trim();
        const price = priceVal != null && priceVal !== '' ? `${currency} ${Number(priceVal).toLocaleString()}` : '';
        const listingType = (formData.listingType || '').replace(/_/g, ' ').trim();
        const availStatus = (formData.availability?.status || '').replace(/_/g, ' ');
        const availableFrom = (formData.availability?.availableFrom || '').trim();

        let fallbackTitle;
        let fallbackSummary;

        if (isDevelopment) {
            const displayType = 'Development';
            const locDisplay = addressLine || [city, country].filter(Boolean).join(', ') || 'Prime location';
            if (street && city) {
                fallbackTitle = `${displayType} at ${street}, ${city}${country && country !== city ? `, ${country}` : ''}`;
            } else {
                fallbackTitle = locDisplay ? `${displayType} — ${locDisplay}` : `${displayType} in ${city || country || 'Prime Location'}`;
            }
            const descParts = [];
            descParts.push('This development offers a strong combination of location and potential.');
            if (addressLine) descParts.push(`Situated at ${addressLine}.`);
            if (availStatus) descParts.push(`Availability: ${availStatus}.`);
            if (availableFrom) descParts.push(`Available from ${availableFrom}.`);
            if (listingType && price) descParts.push(`Listed ${listingType} at ${price}.`);
            else if (price) descParts.push(`From ${price}.`);
            if (size) descParts.push(`Units from ${size}.`);
            fallbackSummary = descParts.filter(Boolean).join(' ');
        } else if (listingMetadata) {
            const raw = listingMetadata;
            const m = (raw?.metadata != null || raw?.property != null) ? raw : (raw?.data || raw?.result || {});
            const property = m.property || {};
            const valuation = m.valuation || {};
            const neighborhood = m.neighborhood || {};
            const ch = property.characteristics || {};
            const metaType = (property.property_type || type).toString().replace(/_/g, ' ');
            const metaTypeLower = metaType.toLowerCase();
            const fmtAddr = dedupePropertyTitle((property.formatted_address || '').trim());
            const locDisplay = fmtAddr || addressLine;
            const metaBeds = ch.bedrooms ?? beds;
            const metaBaths = ch.bathrooms ?? baths;
            const metaSqft = ch.square_feet ?? ch.square_meters != null ? Math.round(Number(ch.square_meters) * 10.764) : null;
            const metaSize = metaSqft != null ? `${Number(metaSqft).toLocaleString()} sq ft` : (size || (ch.square_meters != null ? `${ch.square_meters} m²` : ''));
            const yearBuilt = ch.year_built;
            const lotSqft = ch.lot_size_sqft ?? ch.lot_size_sqm != null ? Math.round(Number(ch.lot_size_sqm) * 10.764) : null;
            const neighborhoodName = (neighborhood.name || '').trim();
            const valEst = valuation.current_estimate?.value ?? valuation.current_estimate?.value_usd;
            const valCurr = valuation.current_estimate?.currency || 'USD';
            const valStr = valEst != null ? `${valCurr} ${Number(valEst).toLocaleString()}` : '';

            if (street && city) {
                fallbackTitle = `${metaType} at ${street}, ${city}${country && country !== city ? `, ${country}` : ''}`;
            } else if (locDisplay) {
                const shortAddr = fmtAddr || (city ? `${city}${country && country !== city ? `, ${country}` : ''}` : addressLine);
                fallbackTitle = shortAddr ? `${metaType} — ${shortAddr}` : `${metaType} in ${city || country || 'Prime Location'}`;
            } else {
                fallbackTitle = neighborhoodName ? `${metaType} in ${neighborhoodName}` : metaType;
            }

            const descParts = [];
            descParts.push(`This ${metaTypeLower} offers a strong combination of location and space.`);
            if (locDisplay) descParts.push(`Situated at ${locDisplay}.`);
            if (listingType && price) descParts.push(`Listed ${listingType} at ${price}.`);
            else if (price) descParts.push(`Asking price: ${price}.`);
            const spaceBits = [];
            if (metaBeds != null) spaceBits.push(`${metaBeds} bedroom${Number(metaBeds) !== 1 ? 's' : ''}`);
            if (metaBaths != null) spaceBits.push(`${metaBaths} bathroom${Number(metaBaths) !== 1 ? 's' : ''}`);
            if (metaSize) spaceBits.push(metaSize);
            if (yearBuilt != null) spaceBits.push(`built ${yearBuilt}`);
            if (lotSqft != null) spaceBits.push(`lot ${Number(lotSqft).toLocaleString()} sq ft`);
            if (spaceBits.length) descParts.push(`The property features ${spaceBits.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`);
            if (neighborhoodName) descParts.push(`${neighborhoodName} provides a desirable setting.`);
            if (valStr && valStr !== price) descParts.push(`Valuation data indicates ${valStr}.`);
            fallbackSummary = descParts.filter(Boolean).join(' ');
        }

        if (!fallbackTitle || !fallbackSummary) {
            fallbackTitle = fallbackTitle || (street ? `${type} at ${street}${city ? `, ${city}` : ''}` : city ? `${type} in ${city}${country && country !== city ? `, ${country}` : ''}` : addressLine ? `${type} — ${addressLine}` : type);
        const openers = [
            `This inviting ${typeLower} stands out with a strong sense of place and practical appeal.`,
            `A distinctive ${typeLower} that combines location and liveability.`,
            `Ideally situated and ready to enjoy, this ${typeLower} offers a compelling package.`,
            `From its setting to its layout, this ${typeLower} is designed to appeal.`
        ];
        const opener = openers[Math.floor(Math.random() * openers.length)];
            const locationSentence = addressLine ? `It is located at ${addressLine}.` : '';
            const priceSentence = listingType && price ? `Offered as a ${listingType} listing at ${price}.` : price ? `Asking price: ${price}.` : listingType ? `Listed as ${listingType}.` : '';
        const spaceParts = [];
        if (beds != null && beds !== '') spaceParts.push(`${beds} bedroom${Number(beds) !== 1 ? 's' : ''}`);
        if (baths != null && baths !== '') spaceParts.push(`${baths} bathroom${Number(baths) !== 1 ? 's' : ''}`);
        if (size) spaceParts.push(`${size} of space`);
            const spaceSentence = spaceParts.length ? `The layout includes ${spaceParts.join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : '';
            const featureHint = (beds != null || baths != null || size) ? ' View the full listing for details and to arrange a viewing.' : '';
            fallbackSummary = fallbackSummary || [opener, locationSentence, priceSentence, spaceSentence, featureHint].filter(Boolean).join(' ').trim() || opener;
        }

        if (listingMetadata || addressLine || type) {
            setGenerating(true);
            try {
                const context = buildContextForLLM();
                const { data } = await api.post('/api/properties/generate-description', { context });
                if (data?.propertyTitle || data?.shortDescription) {
                    if (data.propertyTitle) onChange('propertyTitle', dedupePropertyTitle(data.propertyTitle));
                    if (data.shortDescription) onChange('shortDescription', dedupePropertyTitle(data.shortDescription));
                    setGenerating(false);
                    return;
                }
            } catch (err) {
                console.warn('AI title/summary generation failed, using template:', err);
            } finally {
                setGenerating(false);
            }
        }

        onChange('propertyTitle', dedupePropertyTitle(fallbackTitle || formData.propertyTitle));
        onChange('shortDescription', dedupePropertyTitle(fallbackSummary));
    };
    return (
        <div>
            <h3 style={stepTitle}>Listing Summary</h3>
            <div style={formSection}>
                <label style={labelStyle}>Property Title *</label>
                <input
                    type="text"
                    placeholder="Insert Listing headline"
                    value={formData.propertyTitle}
                    onChange={(e) => onChange('propertyTitle', e.target.value)}
                    style={errors.propertyTitle ? inputStyleError : inputStyle}
                />
                {errors.propertyTitle && <span style={errorText}>{errors.propertyTitle}</span>}
            </div>

            <div style={formSection}>
                <label style={labelStyle}>Short Description *</label>
                <textarea
                    placeholder="Insert Brief Overview"
                    value={formData.shortDescription}
                    onChange={(e) => onChange('shortDescription', e.target.value)}
                    style={{...(errors.shortDescription ? inputStyleError : inputStyle), minHeight: '100px', resize: 'vertical'}}
                />
                {errors.shortDescription && <span style={errorText}>{errors.shortDescription}</span>}
                <button
                    type="button"
                    disabled={generating}
                    onClick={() => buildAutoSummary()}
                    style={{ ...primaryButton, background: '#ffc801', color: '#1f2937', marginTop: '12px', opacity: generating ? 0.8 : 1 }}
                >
                    {generating ? 'Generating…' : 'Use AI to generate Title and Summary'}
                </button>
            </div>
            {missingRequiredDocs.length > 0 && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '12px', color: '#92400e' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px' }}>Required documents missing (publish disabled):</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {missingRequiredDocs.map((doc) => (
                            <span key={doc.key} style={{ background: '#fff7ed', padding: '4px 8px', borderRadius: '999px' }}>
                                {doc.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Styles
const modalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9000,
    padding: '20px'
};

const modalContent = {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '1100px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden'
};

const modalBody = {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    overflow: 'hidden'
};

const quickJumpGuide = {
    width: '220px',
    minWidth: '220px',
    padding: '16px 0 16px 16px',
    borderRight: '1px solid #e2e8f0',
    background: '#fafafa',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
};

const quickJumpTitle = {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '0 12px 8px',
    marginBottom: '4px',
    borderBottom: '1px solid #e2e8f0'
};

const quickJumpItem = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 12px',
    border: 'none',
    borderRadius: '8px',
    background: 'transparent',
    fontSize: '13px',
    color: '#475569',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s'
};

const quickJumpItemActive = {
    background: 'rgba(17, 87, 92, 0.1)',
    color: '#11575C',
    fontWeight: '600'
};

const stepContentWrapper = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden'
};

const modalHeader = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderBottom: '1px solid #e2e8f0'
};

const closeButton = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '5px 10px'
};

const progressBar = {
    width: '100%',
    height: '4px',
    background: '#e2e8f0',
    position: 'relative'
};

const progressFill = {
    height: '100%',
    background: '#11575C',
    transition: 'width 0.3s ease'
};

const stepIndicator = {
    padding: '10px 30px',
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '600'
};

const stepContent = {
    flex: 1,
    padding: '30px',
    overflowY: 'auto',
    background: '#f8fafc'
};

const modalFooter = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderTop: '1px solid #e2e8f0',
    gap: '10px'
};

const primaryButton = {
    background: '#11575C',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    transition: 'all 0.2s',
    opacity: 1
};

primaryButton[':hover'] = {
    background: '#11575C',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(17, 87, 92, 0.3)'
};

primaryButton[':disabled'] = {
    opacity: 0.6,
    cursor: 'not-allowed'
};

const secondaryButton = {
    background: '#f1f5f9',
    color: '#334155',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
};

const stepTitle = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#11575C',
    marginBottom: '10px'
};

const stepDescription = {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '30px'
};

const subStepTitle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '15px'
};

const optionGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px'
};

const optionCard = {
    padding: '30px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'white'
};

optionCard[':hover'] = {
    borderColor: '#11575C',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(17, 87, 92, 0.1)'
};

const formSection = {
    marginBottom: '25px'
};

const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '8px'
};

const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Poppins', sans-serif",
    transition: 'border-color 0.2s'
};

const inputStyleError = {
    ...inputStyle,
    borderColor: '#dc2626'
};

const formGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px'
};

const checkboxGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
};

const checkboxLabel = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#334155',
    cursor: 'pointer'
};

const errorText = {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block'
};

export default PropertyUploadForm;

