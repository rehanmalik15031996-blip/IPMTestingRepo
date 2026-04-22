import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import api from '../config/api';
import { useIsMobile } from '../hooks/useMediaQuery';
import { usePreferences } from '../context/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import html2pdf from 'html2pdf.js';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
const DEFAULT_MAP_CENTER = [55.2708, 25.2048];
const DEFAULT_MAP_ZOOM = 14;
const DEFAULT_MAP_PITCH = 45;
const DEFAULT_MAP_BEARING = -17;

// Constants outside component to avoid recreation on every render
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DEFAULT_AGENT_PHOTO = 'https://ui-avatars.com/api/?name=Agent&background=11575C&color=fff&size=200';

const isDevelopment = (p) => String(p?.propertyCategory || '').toLowerCase() === 'development';

/** Listing amounts: PropData stores ZAR in price / pricing; prefs formatter assumed USD without this. */
function propertyPriceFormatOpts(prop) {
    const from = prop?.pricing?.currency || (prop?.importSource === 'propdata' ? 'ZAR' : 'USD');
    return { fromCurrency: from };
}

function propertyAreaIsMetric(prop) {
    const u = (prop?.propertySize?.unitSystem || '').toLowerCase();
    return u.includes('m') || u.includes('²') || u === 'sqm' || prop?.importSource === 'propdata';
}

/** Numeric listing price for calculators: prefer structured asking price, then parse display string (e.g. 3.5m). */
function parseListingPriceToNumber(prop) {
    if (!prop) return 0;
    const ask = prop.pricing?.askingPrice;
    if (ask != null && ask !== '') {
        const n = Number(ask);
        if (Number.isFinite(n) && n > 0) return n;
    }
    const rawStr = String(prop.price || '').replace(/[^0-9.]/g, '');
    const rawPrice = parseFloat(rawStr);
    if (!Number.isFinite(rawPrice)) return 0;
    const lower = String(prop.price || '').toLowerCase();
    const multiplier = lower.includes('m') ? 1000000 : 1;
    if (rawPrice >= 1e6) return rawPrice;
    return rawPrice * multiplier;
}

function listingRegionFromProp(prop) {
    const countryRaw = (prop?.locationDetails?.country || prop?.location || '').toString().toLowerCase().trim();
    if (/south\s*africa|^za$|^rsa$|^sa\b/.test(countryRaw)) return 'ZA';
    if (/uae|dubai|united\s*arab\s*emirates|emirates/.test(countryRaw)) return 'UAE';
    if (/netherlands|holland|^nl$|the\s*netherlands/.test(countryRaw)) return 'NL';
    return 'generic';
}

/** Full SA bond suite (tabs) — show when country/currency/address clearly ZA, even if country field is missing. */
function wantsZaBondFinanceSuite(prop) {
    if (!prop) return false;
    if (listingRegionFromProp(prop) === 'ZA') return true;
    const cur = String(prop.pricing?.currency || '').toUpperCase();
    if (cur === 'ZAR') return true;
    const blob = `${prop.locationDetails?.country || ''} ${prop.locationDetails?.city || ''} ${prop.locationDetails?.suburb || ''} ${prop.location || ''}`.toLowerCase();
    if (/south\s*africa|\brsa\b|\bcape town\b|\bjohannesburg\b|\bsandton\b|\bdurban\b|\bpretoria\b|\bstellenbosch\b|\bport elizabeth\b|\bgqeberha\b|\bgauteng\b|\bkwazulu\b|\bwestern cape\b|\beastern cape\b|\bfree state\b|\bpolokwane\b|\bbloemfontein\b/.test(blob)) return true;
    return false;
}

const PROPERTY_CALC_LABELS = {
    ZA: {
        title: 'Bond repayment',
        resultLabel: 'Monthly bond repayment',
        purchaseLabel: 'Purchase price',
        depositPctLabel: 'Deposit (%)',
        depositAmtLabel: 'Deposit (optional)',
        loanLabel: 'Loan amount',
        totalRepayLabel: 'Total repayment',
        totalInterestLabel: 'Total interest',
        termLabel: 'Loan term',
        rateLabel: 'Interest rate',
        hint: 'Indicative estimates. Transfer duty uses SARS natural-person brackets (Apr 2025). Attorney, deeds and bond fees vary. VAT sales and bank rules differ.',
    },
    UAE: {
        title: 'Mortgage calculator',
        resultLabel: 'Monthly repayment',
        purchaseLabel: 'Purchase price',
        depositPctLabel: 'Deposit (%)',
        depositAmtLabel: 'Deposit amount',
        loanLabel: 'Loan amount',
        totalRepayLabel: 'Total repayment',
        totalInterestLabel: 'Total interest',
        termLabel: 'Loan term',
        rateLabel: 'Interest rate (% p.a.)',
        hint: 'Indicative only — standard amortising loan. Excludes bank fees, insurance, and extra charges. Final terms are set by your lender.',
    },
    NL: {
        title: 'Hypotheekberekening',
        resultLabel: 'Geschatte maandlast',
        purchaseLabel: 'Koopsom',
        depositPctLabel: 'Aanbetaling (%)',
        depositAmtLabel: 'Aanbetaling (bedrag)',
        loanLabel: 'Leenbedrag',
        totalRepayLabel: 'Totaal terug te betalen',
        totalInterestLabel: 'Totale rente',
        termLabel: 'Looptijd',
        rateLabel: 'Rentepercentage (% p.j.)',
        hint: 'Alleen indicatief — annuïteitenlening. Verzekeringen, kosten en voorwaarden wijken per aanbieder af.',
    },
    generic: {
        title: 'Mortgage calculator',
        resultLabel: 'Monthly repayment',
        purchaseLabel: 'Purchase price',
        depositPctLabel: 'Deposit (%)',
        depositAmtLabel: 'Deposit amount',
        loanLabel: 'Loan amount',
        totalRepayLabel: 'Total repayment',
        totalInterestLabel: 'Total interest',
        termLabel: 'Loan term',
        rateLabel: 'Interest rate (% p.a.)',
        hint: 'Indicative only — standard amortising loan. Excludes fees and insurance. Terms depend on your lender.',
    },
};

const BOND_DEFAULTS_BY_REGION = {
    ZA: { downPayment: 10, interestRate: 10.25, loanTerm: 20 },
    UAE: { downPayment: 20, interestRate: 4.5, loanTerm: 25 },
    NL: { downPayment: 20, interestRate: 3.8, loanTerm: 30 },
    generic: { downPayment: 20, interestRate: 5.5, loanTerm: 30 },
};

/** SARS transfer duty — natural persons, brackets from 1 Apr 2025 (indicative; VAT-only sales differ). */
function calculateSarsTransferDutyZA2025(value) {
    const v = Math.max(0, Number(value) || 0);
    if (v <= 1_210_000) return 0;
    if (v <= 1_663_800) return Math.round((v - 1_210_000) * 0.03);
    if (v <= 2_329_300) return Math.round(13_614 + (v - 1_663_800) * 0.06);
    if (v <= 2_994_800) return Math.round(53_544 + (v - 2_329_300) * 0.08);
    if (v <= 13_310_000) return Math.round(106_784 + (v - 2_994_800) * 0.11);
    return Math.round(1_241_456 + (v - 13_310_000) * 0.13);
}

/** Detailed bond + transfer line items (estimates; calibrated near common SA calculator outputs ~R1m). */
function zaBondTransferDetailedEstimate(purchasePrice, loanAmount) {
    const p = Math.max(0, Number(purchasePrice) || 0);
    const l = Math.max(0, Number(loanAmount) || 0);
    const transferDuty = calculateSarsTransferDutyZA2025(p);
    const bondRegistrationCosts = Math.round(l * 0.02825);
    const bankInitiationFee = Math.round(l * 0.0060382);
    const deedsOfficeLevy = 1464;
    const bondPostageFees = 1900;
    const bondSubtotal = bondRegistrationCosts + bankInitiationFee + deedsOfficeLevy + bondPostageFees;

    const propertyTransferCosts = Math.round(p * 0.028244);
    const deedsOfficeLevyTransfer = deedsOfficeLevy;
    const transferPostageFees = 2740;
    const transferSubtotal = propertyTransferCosts + deedsOfficeLevyTransfer + transferDuty + transferPostageFees;

    return {
        transferDuty,
        bondRegistrationCosts,
        bankInitiationFee,
        deedsOfficeLevy,
        bondPostageFees,
        bondSubtotal,
        propertyTransferCosts,
        deedsOfficeLevyTransfer,
        transferPostageFees,
        transferSubtotal,
        totalOnceOff: bondSubtotal + transferSubtotal,
    };
}

/** Max loan principal for a fixed instalment (annuity). */
function zaPrincipalFromMonthlyPayment(monthlyPayment, annualRatePct, loanTermYears) {
    const pay = Math.max(0, Number(monthlyPayment) || 0);
    const n = Math.max(1, Math.round(Number(loanTermYears) * 12));
    const r = (Number(annualRatePct) || 0) / 100 / 12;
    if (pay <= 0) return 0;
    if (r <= 0) return pay * n;
    const pow = Math.pow(1 + r, n);
    return Math.max(0, pay * ((pow - 1) / (r * pow)));
}

function zaAmortizeMonthsAndInterest(initialBalance, annualRatePct, monthlyInstalment, maxMonths = 600) {
    let bal = Math.max(0, Number(initialBalance) || 0);
    const pay = Math.max(0, Number(monthlyInstalment) || 0);
    const i = (Number(annualRatePct) || 0) / 100 / 12;
    let totalInterest = 0;
    let months = 0;
    if (bal <= 0 || pay <= 0) return { months: 0, totalInterest: 0, totalPaid: 0, unpaid: false };
    while (bal > 0.02 && months < maxMonths) {
        const interest = bal * i;
        const toPrinc = pay - interest;
        if (toPrinc <= 0) return { months, totalInterest, totalPaid: months * pay, unpaid: true };
        totalInterest += interest;
        bal -= toPrinc;
        months++;
    }
    return { months, totalInterest, totalPaid: months * pay, unpaid: false };
}

function zaFormatYearsMonths(totalMonths) {
    const m = Math.max(0, Math.round(Number(totalMonths) || 0));
    const y = Math.floor(m / 12);
    const mo = m % 12;
    return `${y} years ${mo} months`;
}

function formatListingArea(prop, formatAreaFn) {
    const raw = prop?.propertySize?.size ?? prop?.residential?.livingAreaSize ?? prop?.specs?.sqft;
    if (raw == null || raw === '' || raw === '—') return '—';
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(n)) return String(raw);
    return formatAreaFn(n, propertyAreaIsMetric(prop) ? { inputUnit: 'sqm' } : {});
}

function safeParseUser() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

const Property = () => {
    const isMobile = useIsMobile();
    const user = safeParseUser();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const fromSearch = location.state?.fromSearch === true;
    const searchMatch = location.state?.searchMatch || null;
    const { formatPrice, formatArea, getPriceDisplaySuffix } = usePreferences();
    const { t } = useTranslation();

    // --- STATE ---
    const [prop, setProp] = useState(null);
    const [propError, setPropError] = useState(null); // 'not_found' | 'failed' | null
    const [expandedAccordion, setExpandedAccordion] = useState('desc');
    const [activeModal, setActiveModal] = useState(null);
    const [isSaved, setIsSaved] = useState(false); 
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [virtualTourModalOpen, setVirtualTourModalOpen] = useState(false);
    const [bondCalcOpen, setBondCalcOpen] = useState(false); 

    // --- SCHEDULER STATE (Form & Calendar) ---
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '', message: ''
    });
    const [meetingType, setMeetingType] = useState('In Person');
    
    // Calendar Logic
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [selectedDate, setSelectedDate] = useState(null);     
    const [selectedTime, setSelectedTime] = useState('');
    const [showTimeDropdown, setShowTimeDropdown] = useState(false);
    const [bookedTimes, setBookedTimes] = useState([]);         

    // --- CALCULATOR STATE ---
    const [calcData, setCalcData] = useState({
        price: 0, downPayment: 20, interestRate: 4.5, loanTerm: 30, depositRand: 0,
    });
    const [zaBondCostBreakdownOpen, setZaBondCostBreakdownOpen] = useState(false);
    const [zaSuiteTab, setZaSuiteTab] = useState('repayment');
    const [zaAffordGross, setZaAffordGross] = useState(0);
    const [zaAffordNet, setZaAffordNet] = useState(0);
    const [zaAffordExpenses, setZaAffordExpenses] = useState(0);
    const [zaAddDebt, setZaAddDebt] = useState(0);
    const [zaAddPayment, setZaAddPayment] = useState(0);
    const [zaAddExtraMonthly, setZaAddExtraMonthly] = useState(0);
    const [zaAddOnceOff, setZaAddOnceOff] = useState(0);
    const [zaBtPurchase, setZaBtPurchase] = useState(0);
    const [zaBtLoan, setZaBtLoan] = useState(0);
    const [monthlyPayment, setMonthlyPayment] = useState(0);

    // --- AMENITIES STATE ---
    const [localAmenities, setLocalAmenities] = useState([]);

    // --- MAP (Mapbox) ---
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const popupRef = useRef(null);
    const buildingHighlightRef = useRef(false);
    const pdfContentRef = useRef(null);
    const galleryThumbStripRef = useRef(null);
    const [mapCoords, setMapCoords] = useState(null); // [lng, lat] when resolved (from prop or geocode) 

    // --- DATA FETCHING ---
    const userId = user?._id;
    // Scroll to top and reset gallery index when property view opens or property id changes
    useEffect(() => {
        if (typeof window.history.scrollRestoration !== 'undefined') window.history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        setGalleryIndex(0);
    }, [id]);

    // Scroll to top again after property data has loaded (catches late layout shifts from map/images)
    useEffect(() => {
        if (!prop?._id) return;
        const scroll = () => { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; };
        scroll();
        const raf = requestAnimationFrame(() => requestAnimationFrame(scroll));
        const t1 = setTimeout(scroll, 150);
        const t2 = setTimeout(scroll, 500);
        return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
    }, [prop?._id]);

    useEffect(() => {
        let cancelled = false;
        setPropError(null);
        const fetchData = async () => {
            try {
                const resProp = await api.get('/api/properties', {
                    params: { id, _t: Date.now() },
                    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
                });
                if (cancelled) return;
                const propData = resProp.data;
                if (!propData || !propData._id) {
                    if (!cancelled) setPropError('not_found');
                    return;
                }
                const savedPromise = userId ? api.get(`/api/users/${userId}?type=saved`) : Promise.resolve(null);
                const resSaved = await savedPromise;
                if (cancelled) return;

                setProp(propData);

                const loc = propData.location?.toLowerCase() || "";
                const meta = propData.listingMetadata;
                let amenities = [
                    { name: 'International Academy', dist: '1.2 mi', type: 'Education' },
                    { name: 'City Center Mall', dist: '2.5 mi', type: 'Shopping' },
                    { name: 'General Hospital', dist: '3.0 mi', type: 'Healthcare' }
                ];
                if (meta?.amenities?.nearby?.length) {
                    amenities = meta.amenities.nearby.slice(0, 8).map((a) => ({
                        name: a.name,
                        dist: `${(a.distance_km * 0.621371).toFixed(1)} mi`,
                        type: (a.type || '').replace(/_/g, ' ')
                    }));
                } else if (loc.includes('dubai')) {
                    amenities = [
                        { name: 'GEMS Wellington Academy', dist: '1.2 mi', type: 'Education' },
                        { name: 'Dubai Hills Mall', dist: '1.8 mi', type: 'Shopping' },
                        { name: 'King\'s College Hospital', dist: '2.5 mi', type: 'Healthcare' },
                        { name: 'Dubai Hills Golf Club', dist: '0.5 mi', type: 'Leisure' }
                    ];
                }
                setLocalAmenities(amenities);

                const region = listingRegionFromProp(propData);
                const zaStyleListing = wantsZaBondFinanceSuite(propData);
                const bondDefaults = BOND_DEFAULTS_BY_REGION[zaStyleListing ? 'ZA' : region];
                const parsedPrice = parseListingPriceToNumber(propData);
                setCalcData((prev) => {
                    const next = {
                        ...prev,
                        ...bondDefaults,
                        ...(parsedPrice > 0 ? { price: parsedPrice } : {}),
                    };
                    const p = next.price;
                    next.depositRand = parsedPrice > 0
                        ? Math.round(p * (next.downPayment / 100))
                        : prev.depositRand;
                    return next;
                });

                if (resSaved?.data && resSaved.data.map(p => p._id).includes(id)) setIsSaved(true);
            } catch (err) {
                if (!cancelled) {
                    console.error(err);
                    const status = err.response?.status;
                    setPropError(status === 404 ? 'not_found' : 'failed');
                }
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [id, userId]);

    // Resolve map center: from prop coords or geocode address
    useEffect(() => {
        if (!prop) return;
        let lat = prop.locationDetails?.coordinates?.lat ?? prop.listingMetadata?.property?.coordinates?.latitude;
        let lng = prop.locationDetails?.coordinates?.lng ?? prop.listingMetadata?.property?.coordinates?.longitude;
        if (lat != null && lng != null) {
            if (lng < 0 && lat > 0 && lat <= 90 && lng >= -90) {
                [lat, lng] = [lng, lat];
            }
            setMapCoords([lng, lat]);
            return;
        }
        const address = (prop.location || prop.locationDetails?.streetAddress || '').trim();
        if (!address || !MAPBOX_TOKEN) {
            setMapCoords(DEFAULT_MAP_CENTER);
            return;
        }
        let cancelled = false;
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`)
            .then((res) => res.json())
            .then((data) => {
                if (cancelled || !data.features?.length) {
                    if (!cancelled) setMapCoords(DEFAULT_MAP_CENTER);
                    return;
                }
                const [lng2, lat2] = data.features[0].center;
                setMapCoords([lng2, lat2]);
            })
            .catch(() => { if (!cancelled) setMapCoords(DEFAULT_MAP_CENTER); });
        return () => { cancelled = true; };
    }, [prop?._id]);

    // When listing has no insights yet, poll for a short time in case they're being added in the background
    useEffect(() => {
        if (!prop || prop.listingMetadata) return;
        const POLL_INTERVAL_MS = 15000;
        const POLL_UNTIL_MS = 120000;
        const start = Date.now();
        const t = setInterval(async () => {
            if (Date.now() - start > POLL_UNTIL_MS) {
                clearInterval(t);
                return;
            }
            try {
                const res = await api.get('/api/properties', { params: { id, _t: Date.now() } });
                if (res.data?.listingMetadata) {
                    setProp(prev => prev ? { ...prev, listingMetadata: res.data.listingMetadata } : prev);
                    clearInterval(t);
                }
            } catch (e) { /* ignore */ }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(t);
    }, [id, prop?.listingMetadata]);

    // Gallery images (must be before lightbox useEffect which uses allImages)
    const allImages = !prop ? [] : (() => {
        const hero = prop.imageUrl || prop.media?.coverImage || '';
        const galleryRest = (prop.media?.imageGallery && Array.isArray(prop.media.imageGallery)) ? prop.media.imageGallery.filter(Boolean) : [];
        const combined = (hero ? [hero] : []).concat(galleryRest);
        const seen = new Set();
        return combined.filter((url) => { if (seen.has(url)) return false; seen.add(url); return true; });
    })();

    // Lightbox keyboard: Left / Right / Escape; lock body scroll
    useEffect(() => {
        if (!lightboxOpen) {
            document.body.style.overflow = '';
            return;
        }
        document.body.style.overflow = 'hidden';
        if (allImages.length === 0) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setLightboxOpen(false);
            if (e.key === 'ArrowLeft') setLightboxIndex((prev) => (prev <= 0 ? allImages.length - 1 : prev - 1));
            if (e.key === 'ArrowRight') setLightboxIndex((prev) => (prev >= allImages.length - 1 ? 0 : prev + 1));
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
        };
    }, [lightboxOpen, allImages.length]);

    useEffect(() => {
        if (allImages.length < 2 || !galleryThumbStripRef.current) return;
        const btn = galleryThumbStripRef.current.querySelector(`button[data-gallery-index="${galleryIndex}"]`);
        btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [galleryIndex, allImages.length]);

    // Mapbox map init: greyscale, 3D, single marker + popup with image
    useEffect(() => {
        if (!MAPBOX_TOKEN || !prop || !mapContainerRef.current) return;
        let lat = prop.locationDetails?.coordinates?.lat ?? prop.listingMetadata?.property?.coordinates?.latitude;
        let lng = prop.locationDetails?.coordinates?.lng ?? prop.listingMetadata?.property?.coordinates?.longitude;
        if (lat != null && lng != null && lng < 0 && lat > 0 && lat <= 90 && lng >= -90) {
            [lat, lng] = [lng, lat];
        }
        const center = (lat != null && lng != null) ? [lng, lat] : (mapCoords || DEFAULT_MAP_CENTER);

        if (!mapRef.current) {
            mapboxgl.accessToken = MAPBOX_TOKEN;
            const map = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/standard',
                center,
                zoom: DEFAULT_MAP_ZOOM,
                pitch: DEFAULT_MAP_PITCH,
                bearing: DEFAULT_MAP_BEARING,
            });
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            mapRef.current = map;
        } else {
            mapRef.current.setCenter(center);
            mapRef.current.setZoom(DEFAULT_MAP_ZOOM);
            mapRef.current.setPitch(DEFAULT_MAP_PITCH);
            mapRef.current.setBearing(DEFAULT_MAP_BEARING);
        }

        markerRef.current?.remove();
        popupRef.current?.remove();

        const el = document.createElement('div');
        el.className = 'mapbox-marker-house';
        el.style.cssText = 'cursor:pointer;display:flex;align-items:center;justify-content:center;width:48px;height:48px;background:#11575C;border:3px solid #fff;border-radius:50%;box-shadow:0 4px 14px rgba(17,87,92,0.45);';
        el.innerHTML = '<span style="font-size:24px;line-height:1;">🏠</span>';
        el.setAttribute('aria-label', 'Property location');

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat(center).addTo(mapRef.current);
        markerRef.current = marker;

        const popup = new mapboxgl.Popup({
            offset: 12,
            closeButton: true,
            maxWidth: '180px',
            anchor: 'left'
        }).setLngLat(center);
        const mainImg = allImages[0] || prop.imageUrl || '';
        const priceStr = formatPrice(prop.price, propertyPriceFormatOpts(prop)) + getPriceDisplaySuffix();
        const beds = prop.specs?.beds ?? prop.residential?.bedrooms ?? '—';
        const baths = prop.specs?.baths ?? prop.residential?.bathrooms ?? '—';
        const sqft = prop.propertySize?.size ?? prop.residential?.livingAreaSize ?? prop.specs?.sqft ?? '—';
        const addressStr = prop.locationDetails?.streetAddress || prop.location || '';
        const sqftStr = typeof sqft === 'number' ? formatArea(sqft, propertyAreaIsMetric(prop) ? { inputUnit: 'sqm' } : {}) : sqft;
        const showSpecs = !isDevelopment(prop);
        const card = document.createElement('div');
        card.style.cssText = 'width:160px;max-width:100%;box-sizing:border-box;';
        card.innerHTML = `
          <div style="width:100%;height:52px;background:#e2e8f0;border-radius:6px 6px 0 0;overflow:hidden;flex-shrink:0">
            ${mainImg ? `<img src="${mainImg}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;max-width:100%" />` : ''}
          </div>
          <div style="padding:6px 8px">
            <div style="font-size:12px;font-weight:700;color:#11575C;margin-bottom:2px">${priceStr}</div>
            ${showSpecs ? `<div style="font-size:10px;color:#64748b">${beds} ${t('common.beds')}, ${baths} ${t('common.baths')}, ${sqftStr}</div>` : ''}
          </div>
        `;
        popup.setDOMContent(card);
        popup.addTo(mapRef.current);
        popupRef.current = popup;

        // Keep map centered on property so the marker is always visible (no pan that could push it off-screen)
        const HIGHLIGHT_SOURCE_ID = 'property-building-highlight';
        const HIGHLIGHT_LAYER_ID = 'property-building-highlight-layer';
        const YELLOW = '#ffc801';

        const removeHighlight = () => {
            try {
                if (mapRef.current?.getLayer(HIGHLIGHT_LAYER_ID)) mapRef.current.removeLayer(HIGHLIGHT_LAYER_ID);
                if (mapRef.current?.getSource(HIGHLIGHT_SOURCE_ID)) mapRef.current.removeSource(HIGHLIGHT_SOURCE_ID);
            } catch (_) {}
            buildingHighlightRef.current = false;
        };

        const tryHighlightBuilding = () => {
            const map = mapRef.current;
            if (!map) return;
            removeHighlight();
            try {
                const point = map.project(center);
                const bbox = [[point.x - 25, point.y - 25], [point.x + 25, point.y + 25]];
                const features = map.queryRenderedFeatures(bbox, { layers: [] });
                let feat = features.find((f) => f.layer.type === 'fill-extrusion' && (f.layer.id || '').toLowerCase().includes('building'));
                if (!feat) feat = features.find((f) => f.layer.type === 'fill-extrusion');
                if (!feat?.geometry) return;
                const height = (feat.properties && (feat.properties.height ?? feat.properties.render_height ?? feat.properties.min_height)) ?? 15;
                const geojson = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: feat.geometry, properties: { height: Number(height) || 15 } }] };
                if (map.getSource(HIGHLIGHT_SOURCE_ID)) map.removeSource(HIGHLIGHT_SOURCE_ID);
                map.addSource(HIGHLIGHT_SOURCE_ID, { type: 'geojson', data: geojson });
                map.addLayer({
                    id: HIGHLIGHT_LAYER_ID,
                    type: 'fill-extrusion',
                    source: HIGHLIGHT_SOURCE_ID,
                    paint: {
                        'fill-extrusion-color': YELLOW,
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': 0,
                        'fill-extrusion-opacity': 0.85
                    }
                }, undefined);
                buildingHighlightRef.current = true;
            } catch (_) {}
        };

        if (!mapRef.current) return;
        if (mapRef.current.loaded()) {
            setTimeout(tryHighlightBuilding, 350);
        } else {
            mapRef.current.once('idle', () => setTimeout(tryHighlightBuilding, 200));
        }

        return () => {
            removeHighlight();
            markerRef.current?.remove();
            popupRef.current?.remove();
        };
    }, [prop?._id, mapCoords, formatPrice, formatArea, getPriceDisplaySuffix, t]);

    // Destroy map on unmount
    useEffect(() => () => {
        popupRef.current?.remove();
        markerRef.current?.remove();
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    }, []);

    // Check Availability
    useEffect(() => {
        const fetchAvailability = async () => {
            if (!selectedDate) return;
            const dateString = `${monthNames[currentDate.getMonth()]} ${selectedDate}, ${currentDate.getFullYear()}`;
            try {
                const res = await api.get(`/api/contact?type=meetings&date=${dateString}&agentName=${agentName}`);
                setBookedTimes(res.data); 
            } catch (err) { console.error(err); }
        };
        fetchAvailability();
    }, [selectedDate, currentDate]);

    // Calculator Logic (capital + interest / annuity, same basis as typical bond calculators)
    useEffect(() => {
        const price = Math.max(0, Number(calcData.price) || 0);
        const dr = Number(calcData.depositRand);
        const depositR = Number.isFinite(dr) && dr >= 0 ? Math.min(dr, price) : 0;
        const principal = price - depositR;
        const monthlyRate = (Number(calcData.interestRate) || 0) / 100 / 12;
        const numberOfPayments = Math.max(1, Math.round((Number(calcData.loanTerm) || 1) * 12));
        if (principal <= 0) {
            setMonthlyPayment(0);
            return;
        }
        if (monthlyRate <= 0) setMonthlyPayment(principal / numberOfPayments);
        else {
            const top = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
            const bottom = Math.pow(1 + monthlyRate, numberOfPayments) - 1;
            if (bottom <= 0) setMonthlyPayment(0);
            else setMonthlyPayment(principal * (top / bottom));
        }
    }, [calcData]);

    // --- HANDLERS ---
    const handleSave = async () => {
        if (!user) return alert("Please login to save properties.");
        try {
            const action = isSaved ? 'unsave' : 'save';
            await api.put(`/api/users/${user._id}?propertyId=${id}`, { action });
            setIsSaved(!isSaved);
        } catch (err) { alert("Error updating save status."); }
    };

    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleBondDepositRandChange = (e) => {
        const amt = Math.max(0, Number(e.target.value) || 0);
        setCalcData((prev) => {
            const price = Math.max(0, Number(prev.price) || 0);
            const capped = Math.min(amt, price);
            const pct = price > 0 ? (capped / price) * 100 : 0;
            return { ...prev, depositRand: capped, downPayment: Math.round(pct * 100) / 100 };
        });
    };

    const handleBondPriceChange = (e) => {
        const newPrice = Math.max(0, Number(e.target.value) || 0);
        setCalcData((prev) => {
            const pct = Number(prev.downPayment) || 0;
            return {
                ...prev,
                price: newPrice,
                depositRand: Math.round(newPrice * (pct / 100)),
            };
        });
    };

    const handleBondDownPaymentPctChange = (e) => {
        const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
        setCalcData((prev) => {
            const price = Math.max(0, Number(prev.price) || 0);
            return { ...prev, downPayment: pct, depositRand: Math.round(price * (pct / 100)) };
        });
    };

    const changeMonth = (direction) => {
        const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + direction));
        setCurrentDate(new Date(newDate));
        setSelectedDate(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime) return alert("Please select a date and time.");
        
        try {
            const dateStr = `${monthNames[currentDate.getMonth()]} ${selectedDate}, ${currentDate.getFullYear()}`;
            await api.post('/api/contact?type=meetings', {
                ...formData, meetingType, date: dateStr, time: selectedTime, propertyTitle: prop.title, agentName
            });
            alert("Meeting Scheduled!");
            setFormData({ firstName: '', lastName: '', email: '', phone: '', message: '' });
            setSelectedDate(null);
            setSelectedTime('');
        } catch (err) { alert("Failed to schedule."); }
    };

    const handleDownloadPdf = () => {
        const el = pdfContentRef.current;
        if (!el) return;
        const filename = `property-${prop._id || id || 'download'}.pdf`;
        // html2pdf/html2canvas does not capture position:fixed/absolute elements (blank PDF). Clone into an in-flow node for capture.
        const clone = el.cloneNode(true);
        clone.style.cssText = 'position:relative;left:0;top:0;width:210mm;min-height:400px;max-width:100%;background:white;padding:24px;font-family:\'Inter\',sans-serif;color:#333;font-size:12px;z-index:99999;box-sizing:border-box;margin-top:-9999px;';
        document.body.appendChild(clone);
        window.scrollTo(0, 0);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                html2pdf().set({
                    margin: 12,
                    filename,
                    image: { type: 'jpeg', quality: 0.92 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                }).from(clone).save()
                    .then(() => { document.body.removeChild(clone); })
                    .catch(() => { document.body.removeChild(clone); });
            });
        });
    };

    // Render Calendar Grid
    const renderMiniCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date(); today.setHours(0,0,0,0);
        const days = [];
        
        ['SUN','MON','TUE','WED','THU','FRI','SAT'].forEach(d => days.push(<span key={`h-${d}`} style={{fontSize:'10px', fontWeight:'700', color:'#94a3b8', textAlign:'center'}}>{d}</span>));
        for (let i = 0; i < firstDay; i++) days.push(<span key={`empty-${i}`}></span>);

        for (let d = 1; d <= daysInMonth; d++) {
            const thisDate = new Date(year, month, d);
            const isPast = thisDate < today;
            const isSelected = d === selectedDate;
            
            days.push(
                <span 
                    key={d} 
                    onClick={() => !isPast && setSelectedDate(d)}
                    style={{
                        textAlign: 'center', padding: '8px 0', fontSize:'13px', cursor: isPast ? 'default' : 'pointer',
                        background: isSelected ? '#1f2937' : 'transparent', color: isSelected ? 'white' : (isPast ? '#e2e8f0' : '#334155'),
                        borderRadius: '4px', fontWeight: isSelected ? 'bold' : 'normal'
                    }}
                >
                    {d}
                </span>
            );
        }
        return days;
    };

    const allTimeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
    
    if (propError) {
        return (
            <div style={{ padding: '50px 20px', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
                <h2 style={{ color: '#11575C', marginBottom: 8 }}>
                    {propError === 'not_found' ? 'Property not found' : 'Something went wrong'}
                </h2>
                <p style={{ color: '#555', marginBottom: 24 }}>
                    {propError === 'not_found'
                        ? 'This property may have been removed or the link is incorrect.'
                        : 'We couldn\'t load this property. Please try again or go back to the listings.'}
                </p>
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    style={{
                        background: '#11575C', color: '#fff', border: 'none', padding: '10px 24px',
                        borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 16
                    }}
                >
                    Go to Home
                </button>
            </div>
        );
    }
    if (!prop) return <div style={{padding:'50px', textAlign:'center'}}>Loading...</div>;
    const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(prop.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

    const agent = prop.agentId && typeof prop.agentId === 'object' ? prop.agentId : null;
    const agentName = agent?.name || 'Property Agent';
    const agentEmail = agent?.email || '';
    const agentPhone = agent?.phone || '';
    const agentPhoto = agent?.photo || DEFAULT_AGENT_PHOTO;
    const agencyName = agent?.agencyName || '';

    // Dedupe title: remove trailing duplicate "City, Country" (e.g. "...Hesperia, CA, USA, Hesperia")
    const displayTitle = (() => {
        const title = (prop.title || '').trim();
        const loc = prop.locationDetails || {};
        const city = loc.city || '';
        const country = loc.country || '';
        const suffix = [city, country].filter(Boolean).join(', ');
        if (!suffix) return title || 'Untitled Property';
        const trailing = ', ' + suffix;
        if (title.endsWith(trailing)) return title.slice(0, -trailing.length).trim();
        if (city && title.endsWith(', ' + city)) return title.slice(0, -(', ' + city).length).trim();
        return title || 'Untitled Property';
    })();

    const headerAddress = (() => {
        const street = (prop.locationDetails?.streetAddress || '').replace(/^house at\s+/i, '').trim();
        const suburb = (prop.locationDetails?.suburb || '').trim();
        const city = (prop.locationDetails?.city || '').trim();
        const parts = [street, suburb, city].filter(Boolean);
        const unique = parts.filter((p, i) => parts.findIndex(q => q.toLowerCase() === p.toLowerCase()) === i);
        return unique.join(', ') || (prop.location || '').split(',')[0]?.trim() || '—';
    })();

    const mainImage = (allImages[galleryIndex] || allImages[0] || prop?.imageUrl) || '';

    const virtualTourUrl = (prop.media?.virtual3DTour || '').trim();
    const hasVirtualTour = virtualTourUrl.length > 0;

    const isForSale = (prop.listingType || '').toLowerCase() === 'for_sale';
    const calcCountry = listingRegionFromProp(prop);
    const calcConfig = PROPERTY_CALC_LABELS[calcCountry];
    const zaFinanceSuite = wantsZaBondFinanceSuite(prop);
    const bondSuiteLabels = zaFinanceSuite ? PROPERTY_CALC_LABELS.ZA : calcConfig;

    // Description: use actual property description (AI or user), fallback to static tab content
    const defaultTabContent = {
        desc: "Located in the highly sought-after Dubai Hills Estate, this contemporary villa represents a compelling investment opportunity. The property features a well-designed open-plan layout with floor-to-ceiling glazing, maximising natural light and enhancing indoor-outdoor living.",
        neighborhood: "A vibrant community with access to parks, schools, and retail hubs, ensuring convenience at your doorstep.",
        trends: "Property values in this area have seen consistent growth of ~8% annually, making it a solid investment choice.",
        esg: "Energy-efficient design with sustainable materials and smart cooling systems meeting modern ESG standards.",
        lifestyle: "This location offers a balanced lifestyle with proximity to recreational facilities, dining, cultural attractions, and green spaces that promote well-being and an active outdoor lifestyle."
    };

    const meta = prop.listingMetadata;
    const metaRoot = (meta && (meta.metadata != null || meta.property != null || meta.valuation != null)) ? meta : (meta?.data || meta?.result || {});
    const metaMeta = metaRoot.metadata || {};
    const metaNeighborhood = metaRoot.neighborhood || {};
    const metaValuation = metaRoot.valuation || {};
    const metaMarket = metaRoot.market_data || {};
    const metaInvestment = metaRoot.investment_metrics || {};
    const metaMarketIntel = metaRoot.market_intelligence || {};
    const metaEnvironmental = metaRoot.environmental_data || {};
    const metaEsg = metaRoot.esg_analysis || {};
    const fmtNum = (n, curr) => (n != null && n !== '' ? (curr ? `${curr} ${Number(n).toLocaleString()}` : Number(n).toLocaleString()) : null);
    // Enrichment returns percentages as decimals (0.453) or already as % (45.3). Only ×100 when |n| ≤ 1.5 so we don't show 4530% for 45.3%.
    const formatPct = (n) => {
        if (n == null || n === '') return null;
        const x = Number(n);
        const pct = Math.abs(x) <= 1.5 && x !== 0 ? x * 100 : x;
        return `${pct >= 0 ? '' : '-'}${Math.abs(pct).toFixed(1)}%`;
    };
    const pctDec = (n) => (formatPct(n) ?? '—');
    // Property ROI for calculator: rental yield from insights or (annual rent / price) when available
    const propertyRoiPct = (() => {
        if (metaInvestment.rental_yield != null) return formatPct(metaInvestment.rental_yield);
        const monthly = metaMarket.rent_estimate?.monthly;
        const price = prop?.price;
        if (price && monthly != null) return formatPct((Number(monthly) * 12) / Number(price));
        return null;
    })();

    const priceFmtOpts = propertyPriceFormatOpts(prop);
    const bondFmtOpts = zaFinanceSuite ? { fromCurrency: 'ZAR' } : priceFmtOpts;
    const bondPrice = Math.max(0, Number(calcData.price) || 0);
    const depositR = Math.max(0, Math.min(Number(calcData.depositRand) || 0, bondPrice));
    const bondDpPct = bondPrice > 0 ? (depositR / bondPrice) * 100 : 0;
    const bondLoanPrincipal = bondPrice - depositR;
    const bondTermYears = Math.max(1, Number(calcData.loanTerm) || 1);
    const bondNumPayments = bondTermYears * 12;
    const bondTotalRepayment = bondLoanPrincipal > 0 && monthlyPayment > 0 && Number.isFinite(monthlyPayment)
        ? monthlyPayment * bondNumPayments
        : 0;
    const bondTotalInterest = bondTotalRepayment > 0 ? Math.max(0, bondTotalRepayment - bondLoanPrincipal) : 0;
    const fmtBondMoney = (n) => (n > 0 && Number.isFinite(n) ? formatPrice(Math.round(n), bondFmtOpts) : '—');
    const bondTermOptions = [5, 10, 15, 20, 25, 30];

    const zaRepayCostDetail = zaFinanceSuite ? zaBondTransferDetailedEstimate(bondPrice, bondLoanPrincipal) : null;
    const zaTransferDuty = zaRepayCostDetail?.transferDuty ?? 0;
    const zaBondRegistrationCost = zaRepayCostDetail?.bondSubtotal ?? 0;
    const zaPropertyTransferTotal = zaRepayCostDetail?.transferSubtotal ?? 0;
    const zaOnceOffTotal = zaFinanceSuite ? depositR + (zaRepayCostDetail?.totalOnceOff ?? 0) : 0;
    const zaGrossIncomeRequired = zaFinanceSuite && monthlyPayment > 0 && Number.isFinite(monthlyPayment)
        ? monthlyPayment / 0.30
        : 0;

    const fmtZaRand = (n) => {
        const x = Math.round(Number(n) || 0);
        if (!Number.isFinite(x) || x < 0) return '—';
        return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(x);
    };

    const zaAffordGrossN = Math.max(0, Number(zaAffordGross) || 0);
    const zaAffordNetN = Math.max(0, Number(zaAffordNet) || 0);
    const zaAffordExpN = Math.max(0, Number(zaAffordExpenses) || 0);
    const zaAffordMaxInstalment = zaFinanceSuite
        ? Math.min(zaAffordGrossN * 0.30, Math.max(0, zaAffordNetN - zaAffordExpN))
        : 0;
    const zaAffordLoanAmount = zaFinanceSuite
        ? zaPrincipalFromMonthlyPayment(zaAffordMaxInstalment, calcData.interestRate, calcData.loanTerm)
        : 0;

    const zaAddBal = Math.max(0, Number(zaAddDebt) || 0);
    const zaAddPay = Math.max(0, Number(zaAddPayment) || 0);
    const zaAddExtra = Math.max(0, Number(zaAddExtraMonthly) || 0);
    const zaAddOnceN = Math.max(0, Number(zaAddOnceOff) || 0);
    const zaAddRate = Number(calcData.interestRate) || 0;
    const zaAddBaseline = zaFinanceSuite && zaAddBal > 0 && zaAddPay > 0
        ? zaAmortizeMonthsAndInterest(zaAddBal, zaAddRate, zaAddPay)
        : { months: 0, totalInterest: 0, totalPaid: 0, unpaid: false };
    const zaAddWithExtra = zaFinanceSuite && zaAddBal > 0 && zaAddPay + zaAddExtra > 0
        ? zaAmortizeMonthsAndInterest(Math.max(0, zaAddBal - zaAddOnceN), zaAddRate, zaAddPay + zaAddExtra)
        : { months: 0, totalInterest: 0, totalPaid: 0, unpaid: false };
    const zaAddInterestSaved = zaFinanceSuite && !zaAddBaseline.unpaid && !zaAddWithExtra.unpaid
        ? Math.max(0, zaAddBaseline.totalInterest - zaAddWithExtra.totalInterest)
        : 0;
    const zaAddMonthsSaved = zaFinanceSuite && !zaAddBaseline.unpaid && !zaAddWithExtra.unpaid
        ? Math.max(0, zaAddBaseline.months - zaAddWithExtra.months)
        : 0;

    const zaBtPurchaseN = Math.max(0, Number(zaBtPurchase) || 0);
    const zaBtLoanN = Math.max(0, Number(zaBtLoan) || 0);
    const zaBtDetail = zaFinanceSuite ? zaBondTransferDetailedEstimate(zaBtPurchaseN, zaBtLoanN) : null;

    const ipmSuiteTabs = [
        { id: 'repayment', label: 'Bond repayment' },
        { id: 'affordability', label: 'Affordability' },
        { id: 'additional', label: 'Extra payment' },
        { id: 'bondTransfer', label: 'Bond & transfer' },
    ];

    const closeBondCalc = () => {
        setBondCalcOpen(false);
        setZaBondCostBreakdownOpen(false);
        setZaSuiteTab('repayment');
    };

    const selectZaSuiteTab = (tabId) => {
        if (tabId === 'affordability' && zaAffordGross === 0 && zaAffordNet === 0 && zaGrossIncomeRequired > 0) {
            const s = Math.round(zaGrossIncomeRequired);
            setZaAffordGross(s);
            setZaAffordNet(s);
        }
        if (tabId === 'additional') {
            setZaAddDebt(bondLoanPrincipal);
            setZaAddPayment(monthlyPayment > 0 ? Math.round(monthlyPayment * 1000) / 1000 : 0);
            setZaAddExtraMonthly(0);
            setZaAddOnceOff(0);
        }
        if (tabId === 'bondTransfer') {
            setZaBtPurchase(bondPrice);
            setZaBtLoan(bondLoanPrincipal);
        }
        setZaSuiteTab(tabId);
    };

    let neighborhoodText = defaultTabContent.neighborhood;
    if (metaNeighborhood.name || metaNeighborhood.demographics || metaNeighborhood.mobility || metaNeighborhood.schools?.length) {
        const parts = [];
        if (metaNeighborhood.name) parts.push(`${metaNeighborhood.name} offers a strong sense of community.`);
        if (metaNeighborhood.demographics?.median_income != null) parts.push(`Median household income in the area is around ${fmtNum(metaNeighborhood.demographics.median_income, metaMeta.currency || '')}.`);
        if (metaNeighborhood.mobility?.walkability_score != null || metaNeighborhood.mobility?.transit_score != null) {
            const w = metaNeighborhood.mobility.walkability_score ?? '—';
            const t = metaNeighborhood.mobility.transit_score ?? '—';
            parts.push(`Walkability score: ${w}/100; transit score: ${t}/100.`);
        }
        if (metaNeighborhood.safety?.rating) parts.push(`Safety rating: ${String(metaNeighborhood.safety.rating).replace(/_/g, ' ')}.`);
        if (metaNeighborhood.schools?.length > 0) parts.push(`Nearby schools include ${metaNeighborhood.schools.slice(0, 3).map((s) => s.name).filter(Boolean).join(', ')}.`);
        if (metaMarket.neighborhood_median_price != null) parts.push(`Neighborhood median price: ${fmtNum(metaMarket.neighborhood_median_price, metaMeta.currency)}.`);
        if (parts.length) neighborhoodText = parts.join(' ');
    }

    let trendsText = defaultTabContent.trends;
    if (metaValuation.current_estimate?.value != null || metaValuation.current_estimate?.value_usd != null || metaMarket.price_trend_12m != null || metaInvestment.appreciation_1y != null || metaInvestment.appreciation_5y != null) {
        const parts = [];
        const v = metaValuation.current_estimate?.value ?? metaValuation.current_estimate?.value_usd;
        const c = metaValuation.current_estimate?.currency || 'USD';
        if (v != null) parts.push(`Current valuation estimate: ${c} ${Number(v).toLocaleString()}.`);
        if (metaValuation.price_per_sqft != null) parts.push(`Price per sq ft: ${fmtNum(metaValuation.price_per_sqft, c)}.`);
        if (metaMarket.price_trend_12m != null) parts.push(`12‑month price trend: ${pctDec(metaMarket.price_trend_12m)}.`);
        if (metaInvestment.appreciation_1y != null) parts.push(`1‑year appreciation: ${pctDec(metaInvestment.appreciation_1y)}.`);
        if (metaInvestment.appreciation_5y != null) parts.push(`5‑year appreciation: ${pctDec(metaInvestment.appreciation_5y)}.`);
        if (metaMarketIntel.market_cycle?.phase) parts.push(`Market cycle: ${String(metaMarketIntel.market_cycle.phase).replace(/_/g, ' ')}.`);
        if (metaMarketIntel.market_cycle?.commentary) parts.push(metaMarketIntel.market_cycle.commentary);
        if (parts.length) trendsText = parts.join(' ');
    }

    let esgText = defaultTabContent.esg;
    if (metaEsg.overall_esg_score != null || metaEnvironmental.climate_risk || metaEnvironmental.air_quality || metaEnvironmental.sustainability) {
        const parts = [];
        if (metaEsg.overall_esg_score != null) parts.push(`ESG score: ${metaEsg.overall_esg_score}/100.`);
        if (metaEsg.environmental_score?.energy_efficiency_rating) parts.push(`Energy efficiency: ${metaEsg.environmental_score.energy_efficiency_rating}.`);
        if (metaEnvironmental.climate_risk?.flood_risk) parts.push(`Flood risk: ${String(metaEnvironmental.climate_risk.flood_risk).replace(/_/g, ' ')}.`);
        if (metaEnvironmental.climate_risk?.overall_risk_score != null) parts.push(`Climate risk score: ${metaEnvironmental.climate_risk.overall_risk_score}/10.`);
        if (metaEnvironmental.air_quality?.rating) parts.push(`Air quality: ${metaEnvironmental.air_quality.rating}.`);
        if (metaEnvironmental.sustainability?.solar_potential) parts.push(`Solar potential: ${metaEnvironmental.sustainability.solar_potential}.`);
        if (parts.length) esgText = parts.join(' ');
    }

    const tabContent = {
        desc: (prop.description && prop.description.trim()) ? prop.description.trim() : defaultTabContent.desc,
        neighborhood: neighborhoodText,
        trends: trendsText,
        esg: esgText,
        lifestyle: defaultTabContent.lifestyle
    };

    return (
        <div style={{ backgroundColor: 'white', fontFamily: "'Inter', sans-serif", color: '#333' }}>
            {/* PDF export content: in viewport but invisible so html2canvas can capture it (off-screen causes empty PDF) */}
            <div ref={pdfContentRef} style={{ position: 'fixed', left: 0, top: 0, width: '210mm', minHeight: '400px', maxWidth: '100%', zIndex: -1, opacity: 0, pointerEvents: 'none', background: 'white', padding: 24, fontFamily: "'Inter', sans-serif", color: '#333', fontSize: 12 }}>
                <h1 style={{ margin: '0 0 8px', fontSize: 18, color: '#11575C' }}>{headerAddress}</h1>
                <p style={{ margin: '0 0 16px', color: '#64748b', fontWeight: 600 }}>{formatPrice(prop.price, propertyPriceFormatOpts(prop))}{getPriceDisplaySuffix()}{!isDevelopment(prop) && ` · ${prop.specs?.beds ?? prop.residential?.bedrooms ?? '—'} ${t('common.beds')}, ${prop.specs?.baths ?? prop.residential?.bathrooms ?? '—'} ${t('common.baths')}, ${formatListingArea(prop, formatArea)}`}</p>
                {mainImage && <img src={mainImage} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 20, display: 'block' }} crossOrigin="anonymous" />}
                <h2 style={{ margin: '0 0 8px', fontSize: 14, color: '#11575C', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>Property Description</h2>
                <p style={{ margin: '0 0 20px', lineHeight: 1.5 }}>{tabContent.desc}</p>
                <h2 style={{ margin: '0 0 8px', fontSize: 14, color: '#11575C', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>The Neighbourhood</h2>
                <p style={{ margin: '0 0 20px', lineHeight: 1.5 }}>{tabContent.neighborhood}</p>
                <h2 style={{ margin: '0 0 8px', fontSize: 14, color: '#11575C', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>Property Value Trend</h2>
                <p style={{ margin: '0 0 20px', lineHeight: 1.5 }}>{tabContent.trends}</p>
                <h2 style={{ margin: '0 0 8px', fontSize: 14, color: '#11575C', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>ESG Information</h2>
                <p style={{ margin: '0 0 20px', lineHeight: 1.5 }}>{tabContent.esg}</p>
                <h2 style={{ margin: '0 0 8px', fontSize: 14, color: '#11575C', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>Nearby Amenities</h2>
                <ul style={{ margin: '0 0 20px', paddingLeft: 20, lineHeight: 1.6 }}>{localAmenities.length ? localAmenities.map((item, i) => <li key={i}>{item.name} – {item.dist} ({item.type})</li>) : <li>—</li>}</ul>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Generated from IPM property listing. Location: {prop.location || headerAddress}</p>
            </div>

            <div style={{ ...container, padding: isMobile ? '16px 12px' : '40px 20px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                <button type="button" onClick={() => navigate('/listing-management')} style={backToDashboardBtn}>
                    <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i> Back to Listings
                </button>
                {/* 1. ONE LINE: address only (no "house at"), price, beds/baths/sq ft (hidden for developments) */}
                <div style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px', fontSize: isMobile ? 12 : 14, color: '#11575C', fontWeight: 600 }}>
                    <span>{headerAddress}</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 400, fontSize: 10 }}>·</span>
                    <span>{formatPrice(prop.price, propertyPriceFormatOpts(prop))}{getPriceDisplaySuffix()}</span>
                    {!isDevelopment(prop) && (
                        <>
                            <span style={{ color: '#cbd5e1', fontWeight: 400, fontSize: 10 }}>·</span>
                            <span><i className="fas fa-bed" style={{ marginRight: 2, opacity: 0.9, fontSize: 11 }}></i>{prop.specs?.beds ?? prop.residential?.bedrooms ?? 4} {t('common.beds').toUpperCase()}</span>
                            <span style={{ color: '#cbd5e1', fontWeight: 400, fontSize: 10 }}>·</span>
                            <span><i className="fas fa-bath" style={{ marginRight: 2, opacity: 0.9, fontSize: 11 }}></i>{prop.specs?.baths ?? prop.residential?.bathrooms ?? 5} {t('common.baths').toUpperCase()}</span>
                            <span style={{ color: '#cbd5e1', fontWeight: 400, fontSize: 10 }}>·</span>
                            <span><i className="fas fa-ruler-combined" style={{ marginRight: 2, opacity: 0.9, fontSize: 11 }}></i>{formatListingArea(prop, formatArea)}</span>
                        </>
                    )}
                </div>
                {(prop.status === 'Sold' && (prop.salePrice != null || prop.saleDate)) && (
                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#64748b' }}>
                        {prop.salePrice != null && <span style={{ fontWeight: 600, color: '#11575C' }}>Sale price: {formatPrice(String(prop.salePrice), propertyPriceFormatOpts(prop))}</span>}
                        {prop.salePrice != null && prop.saleDate && ' · '}
                        {prop.saleDate && <span>Date of sale: {new Date(prop.saleDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
                    </div>
                )}
                {(prop.status === 'Under Offer' && (prop.offerPrice != null || prop.offerDate)) && (
                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#64748b' }}>
                        {prop.offerPrice != null && <span style={{ fontWeight: 600, color: '#11575C' }}>Offer price: {formatPrice(String(prop.offerPrice), propertyPriceFormatOpts(prop))}</span>}
                        {prop.offerPrice != null && prop.offerDate && ' · '}
                        {prop.offerDate && <span>Date of offer: {new Date(prop.offerDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
                    </div>
                )}

                {/* 2. GALLERY: Full-width carousel hero + horizontal thumbnail strip */}
                <div style={gallerySection}>
                    <div style={{ position: 'relative', height: isMobile ? '280px' : '420px' }}>
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => allImages.length > 0 && (setLightboxIndex(galleryIndex), setLightboxOpen(true))}
                            onKeyDown={(e) => e.key === 'Enter' && allImages.length > 0 && (setLightboxIndex(galleryIndex), setLightboxOpen(true))}
                            style={{ ...galleryHero, width: '100%', height: '100%', backgroundImage: mainImage ? `linear-gradient(180deg, rgba(31,58,61,0.25) 0%, rgba(31,58,61,0.35) 100%), url('${mainImage}')` : undefined, cursor: allImages.length ? 'pointer' : 'default' }}
                            aria-label="Open photo gallery"
                        >
                            <span style={pillTag}>{prop.status === 'Sold' ? 'Sold' : prop.status === 'Under Offer' ? 'Under Offer' : prop.status === 'Draft' ? 'Draft' : prop.status === 'Unavailable' ? 'Unavailable' : prop.isFeatured ? 'Featured' : (prop.status === 'Published' ? 'Published' : prop.status || 'For Investment')}</span>
                            {allImages.length > 1 && <span style={galleryCounterPill}>{galleryIndex + 1} / {allImages.length}</span>}
                            {allImages.length > 0 && <span style={galleryExpandHint}><i className="fas fa-expand" /> Click to view gallery</span>}
                        </div>
                        {allImages.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setGalleryIndex((prev) => (prev <= 0 ? allImages.length - 1 : prev - 1)); }}
                                    aria-label="Previous image"
                                    style={{ ...galleryArrow, left: 12 }}
                                >
                                    <i className="fas fa-chevron-left" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setGalleryIndex((prev) => (prev >= allImages.length - 1 ? 0 : prev + 1)); }}
                                    aria-label="Next image"
                                    style={{ ...galleryArrow, right: 12 }}
                                >
                                    <i className="fas fa-chevron-right" />
                                </button>
                            </>
                        )}
                    </div>
                    {allImages.length > 1 && (
                        <div ref={galleryThumbStripRef} style={thumbnailStripWrap} aria-label="Photo thumbnails">
                            <div style={thumbnailStrip}>
                                {allImages.map((img, i) => (
                                    <button
                                        type="button"
                                        key={`${img}-${i}`}
                                        data-gallery-index={i}
                                        onClick={(e) => { e.stopPropagation(); setGalleryIndex(i); }}
                                        style={{ ...thumbnailStripBtn, ...(galleryIndex === i ? thumbnailStripBtnActive : {}) }}
                                        aria-label={`Show image ${i + 1}`}
                                        aria-current={galleryIndex === i ? 'true' : undefined}
                                    >
                                        <span style={{ ...thumbnailStripThumb, backgroundImage: `linear-gradient(180deg, rgba(31,58,61,0.25) 0%, rgba(31,58,61,0.35) 100%), url('${img}')` }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {fromSearch && searchMatch && (
                        <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, letterSpacing: '0.5px' }}>SEARCH MATCH: {typeof searchMatch.score === 'number' ? `${searchMatch.score}%` : '—'}</div>
                            {searchMatch.reason && <p style={{ margin: 0, fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{searchMatch.reason}</p>}
                        </div>
                    )}
                </div>
                {lightboxOpen && allImages.length > 0 && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Image gallery lightbox"
                        style={lightboxOverlay}
                        onClick={() => setLightboxOpen(false)}
                    >
                        <button type="button" style={lightboxClose} onClick={() => setLightboxOpen(false)} aria-label="Close gallery">&times;</button>
                        <button type="button" style={lightboxPrev} onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev <= 0 ? allImages.length - 1 : prev - 1)); }} aria-label="Previous image">&lsaquo;</button>
                        <div style={lightboxContent} onClick={(e) => e.stopPropagation()}>
                            <img src={allImages[lightboxIndex]} alt="" style={lightboxImage} draggable={false} />
                            <div style={lightboxCounter}>{lightboxIndex + 1} / {allImages.length}</div>
                        </div>
                        <button type="button" style={lightboxNext} onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev >= allImages.length - 1 ? 0 : prev + 1)); }} aria-label="Next image">&rsaquo;</button>
                    </div>
                )}

                {/* 3. ACTION BAR – full width, left group and ROI at right border */}
                <div style={actionBar}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px 20px' }}>
                        {(prop.media?.walkthroughVideo || '').trim() && (
                            <button type="button" style={circleIconBtn} onClick={() => window.open(prop.media.walkthroughVideo, '_blank')} title="Watch walkthrough video"><i className="fas fa-play-circle"></i></button>
                        )}
                        {(prop.media?.floorplans?.length > 0) && (
                            <button type="button" style={circleIconBtn} onClick={() => window.open(prop.media.floorplans[0], '_blank')} title="View floor plans"><i className="fas fa-ruler-combined"></i></button>
                        )}
                        {hasVirtualTour && (
                            <button type="button" style={circleIconBtn} onClick={() => setVirtualTourModalOpen(true)} title="View 360° virtual tour"><i className="fas fa-street-view"></i></button>
                        )}
                        <button style={pillActionBtnDisabled} disabled><i className={isSaved ? "fas fa-heart" : "far fa-heart"}></i> {isSaved ? 'Saved' : 'Save property'}</button>
                        <button type="button" style={pillActionBtnDisabled} disabled><i className="fas fa-share-alt"></i> Share this property</button>
                        <button type="button" style={pillActionBtnDisabled} disabled><i className="fas fa-download"></i> Download</button>
                    </div>
                    {isForSale && (
                        <button type="button" style={{ ...calcBtn, flexShrink: 0 }} onClick={() => setBondCalcOpen(!bondCalcOpen)} aria-expanded={bondCalcOpen}>
                            {zaFinanceSuite ? 'BOND CALCULATOR' : 'LOAN CALCULATOR'}
                        </button>
                    )}
                </div>

                {/* 3b. BOND CALCULATOR POPUP (for-sale only) */}
                {isForSale && bondCalcOpen && (
                    <div style={modalOverlay} onClick={closeBondCalc} role="dialog" aria-modal="true" aria-label={zaFinanceSuite ? 'IPM home loan tools' : calcConfig.title}>
                        <div
                            style={{
                                ...calcModal,
                                maxWidth: zaFinanceSuite ? 940 : 560,
                                padding: zaFinanceSuite ? 0 : undefined,
                                width: zaFinanceSuite ? 'min(97vw, 940px)' : undefined,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button type="button" style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b', lineHeight: 1, zIndex: 5 }} onClick={closeBondCalc} aria-label="Close">&times;</button>

                            {zaFinanceSuite ? (
                                <>
                                    <div style={ipmSuiteTabBar}>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end', padding: '4px 12px 0' }}>
                                            {ipmSuiteTabs.map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    onClick={() => selectZaSuiteTab(tab.id)}
                                                    style={zaSuiteTab === tab.id ? ipmSuiteTabActive : ipmSuiteTabRest}
                                                >
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ padding: '18px 24px 28px', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                            <span style={ipmSuiteKicker}>IPM finance lab</span>
                                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#94a3b8' }} />
                                            <span style={{ fontSize: 13, color: '#64748b' }}>South Africa · illustrative only</span>
                                        </div>
                                        <p style={{ ...calcSectionSub, marginTop: 0, marginBottom: propertyRoiPct != null ? 10 : 14 }}>{bondSuiteLabels.hint}</p>
                                        {propertyRoiPct != null && (
                                            <p style={{ fontSize: 14, color: '#11575C', fontWeight: 600, marginBottom: 14 }}>Estimated ROI (rental yield): {propertyRoiPct}</p>
                                        )}

                                        {zaSuiteTab === 'repayment' && (
                                        <div style={{ ...ipmCalcShell, flexDirection: isMobile ? 'column' : 'row' }}>
                                            <div style={{ ...ipmCalcColLeft, borderRight: isMobile ? 'none' : '1px solid rgba(17,87,92,0.12)' }}>
                                                <h4 style={ipmCalcHeadingLeft}>Monthly instalment from purchase details</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-purchase">Purchase price</label>
                                                        <div style={bondZaInputWrap}>
                                                            <span style={bondZaPrefix}>R</span>
                                                            <input id="za-purchase" type="number" min="0" step="1000" value={bondPrice || ''} onChange={handleBondPriceChange} style={bondZaInputField} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-deposit">Deposit (optional)</label>
                                                        <div style={bondZaInputWrap}>
                                                            <span style={bondZaPrefix}>R</span>
                                                            <input id="za-deposit" type="number" min="0" step="1000" value={calcData.depositRand} onChange={handleBondDepositRandChange} style={bondZaInputField} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-rate">Interest rate</label>
                                                        <div style={bondZaInputWrap}>
                                                            <input id="za-rate" type="number" min="0" step="0.05" value={calcData.interestRate} onChange={e => setCalcData((prev) => ({ ...prev, interestRate: Number(e.target.value) || 0 }))} style={bondZaInputField} />
                                                            <span style={bondZaSuffix}>%</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-term">Loan term</label>
                                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                            <select id="za-term" value={calcData.loanTerm} onChange={e => setCalcData((prev) => ({ ...prev, loanTerm: Number(e.target.value) || 20 }))} style={{ ...calcSelect, flex: 1 }}>
                                                                {(bondTermOptions.includes(calcData.loanTerm) ? bondTermOptions : [...bondTermOptions, calcData.loanTerm].sort((a, b) => a - b)).map((y) => (
                                                                    <option key={y} value={y}>{y} years</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ ...ipmCalcColRight, borderLeft: isMobile ? 'none' : '4px solid rgba(17, 87, 92, 0.22)' }}>
                                                <div style={{ marginBottom: 22 }}>
                                                    <div style={bondZaResultMuted}>{bondSuiteLabels.resultLabel}</div>
                                                    <div style={ipmCalcHero}>{isNaN(monthlyPayment) || monthlyPayment <= 0 ? '—' : fmtZaRand(monthlyPayment)}</div>
                                                </div>
                                                <div style={{ marginBottom: 22 }}>
                                                    <div style={bondZaResultMuted}>Once-off costs (incl. deposit)</div>
                                                    <div style={ipmCalcHero}>{fmtZaRand(zaOnceOffTotal)}</div>
                                                    <div style={{ marginTop: 14, fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>Deposit</span><span style={{ fontWeight: 600 }}>{fmtZaRand(depositR)}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>Bond registration (est.)</span><span style={{ fontWeight: 600 }}>{fmtZaRand(zaBondRegistrationCost)}</span></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }} title="Includes transfer duty (if applicable) and estimated conveyancing.">
                                                            <span>Property transfer (est.) <i className="fas fa-info-circle" style={{ color: '#11575C', opacity: 0.5, fontSize: 13, marginLeft: 4 }} aria-hidden /></span>
                                                            <span style={{ fontWeight: 600 }}>{fmtZaRand(zaPropertyTransferTotal)}</span>
                                                        </div>
                                                    </div>
                                                    <button type="button" style={ipmCalcTextLink} onClick={() => selectZaSuiteTab('bondTransfer')}>
                                                        Open detailed bond &amp; transfer breakdown →
                                                    </button>
                                                    {zaBondCostBreakdownOpen && zaRepayCostDetail && (
                                                        <div style={{ marginTop: 12, padding: 12, background: '#f0fdfa', borderRadius: 12, fontSize: 13, color: '#334155', lineHeight: 1.65, border: '1px solid rgba(17,87,92,0.15)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Transfer duty (SARS)</span><strong>{fmtZaRand(zaRepayCostDetail.transferDuty)}</strong></div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Transfer fees (excl. duty)</span><strong>{fmtZaRand(zaRepayCostDetail.propertyTransferCosts + zaRepayCostDetail.deedsOfficeLevyTransfer + zaRepayCostDetail.transferPostageFees)}</strong></div>
                                                        </div>
                                                    )}
                                                    <button type="button" style={{ ...ipmCalcTextLink, marginTop: 8 }} onClick={() => setZaBondCostBreakdownOpen(!zaBondCostBreakdownOpen)}>
                                                        {zaBondCostBreakdownOpen ? 'Hide quick duty &amp; fee split' : 'Quick duty &amp; fee split'}
                                                    </button>
                                                </div>
                                                <div style={{ paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                                                    <div style={bondZaResultMuted}>Gross income benchmark (÷30%)</div>
                                                    <div style={ipmCalcHero}>{zaGrossIncomeRequired > 0 ? fmtZaRand(zaGrossIncomeRequired) : '—'}</div>
                                                    <p style={{ fontSize: 12, color: '#6b7280', margin: '8px 0 0' }}>Rough check only — lenders use scoring, stress rates, and policies of their own.</p>
                                                    <button type="button" style={ipmCalcTextLink} onClick={() => selectZaSuiteTab('affordability')}>Try the affordability workspace →</button>
                                                </div>
                                            </div>
                                        </div>
                                        )}

                                        {zaSuiteTab === 'affordability' && (
                                        <div style={{ ...ipmCalcShell, flexDirection: isMobile ? 'column' : 'row' }}>
                                            <div style={{ ...ipmCalcColLeft, borderRight: isMobile ? 'none' : '1px solid rgba(17,87,92,0.12)' }}>
                                                <h4 style={ipmCalcHeadingLeft}>How much could you borrow?</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-aff-gross">Gross monthly income</label>
                                                        <div style={bondZaInputWrap}><span style={bondZaPrefix}>R</span><input id="za-aff-gross" type="number" min="0" step="100" value={zaAffordGross || ''} onChange={e => setZaAffordGross(Number(e.target.value) || 0)} style={bondZaInputField} /></div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-aff-net">Net monthly income</label>
                                                        <div style={bondZaInputWrap}><span style={bondZaPrefix}>R</span><input id="za-aff-net" type="number" min="0" step="100" value={zaAffordNet || ''} onChange={e => setZaAffordNet(Number(e.target.value) || 0)} style={bondZaInputField} /></div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-aff-exp">Monthly expenses</label>
                                                        <div style={bondZaInputWrap}><span style={bondZaPrefix}>R</span><input id="za-aff-exp" type="number" min="0" step="100" value={zaAffordExpenses || ''} onChange={e => setZaAffordExpenses(Number(e.target.value) || 0)} style={bondZaInputField} /></div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-aff-rate">Interest rate</label>
                                                        <div style={bondZaInputWrap}><input id="za-aff-rate" type="number" min="0" step="0.05" value={calcData.interestRate} onChange={e => setCalcData((prev) => ({ ...prev, interestRate: Number(e.target.value) || 0 }))} style={bondZaInputField} /><span style={bondZaSuffix}>%</span></div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-aff-term">Loan term</label>
                                                        <select id="za-aff-term" value={calcData.loanTerm} onChange={e => setCalcData((prev) => ({ ...prev, loanTerm: Number(e.target.value) || 20 }))} style={calcSelect}>
                                                            {(bondTermOptions.includes(calcData.loanTerm) ? bondTermOptions : [...bondTermOptions, calcData.loanTerm].sort((a, b) => a - b)).map((y) => (
                                                                <option key={y} value={y}>{y} years</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ ...ipmCalcColRight, borderLeft: isMobile ? 'none' : '4px solid rgba(17, 87, 92, 0.22)' }}>
                                                <div style={{ marginBottom: 20 }}>
                                                    <div style={bondZaResultMuted}>Indicative loan amount</div>
                                                    <div style={ipmCalcHero}>{zaAffordMaxInstalment > 0 ? fmtZaRand(zaAffordLoanAmount) : '—'}</div>
                                                </div>
                                                <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
                                                    <div style={bondZaResultMuted}>Instalment at that ceiling</div>
                                                    <div style={ipmCalcHero}>{zaAffordMaxInstalment > 0 ? fmtZaRand(zaAffordMaxInstalment) : '—'}</div>
                                                </div>
                                                <div style={ipmInfoPanel}>
                                                    <div style={ipmInfoPanelTitle}>How we approximate this</div>
                                                    <p style={ipmInfoPanelP}>We take the lower of (1) 30% of gross income and (2) net income minus expenses. That instalment is turned into a loan amount using your rate and term — similar in spirit to public tools like <a href="https://www.property24.com/calculators/affordability" target="_blank" rel="noopener noreferrer" style={{ color: '#11575C' }}>Property24 affordability</a>, but with IPM presentation.</p>
                                                    <p style={ipmInfoPanelP}>Credit profile, interest loading, and affordability stress tests are not modeled here.</p>
                                                </div>
                                            </div>
                                        </div>
                                        )}

                                        {zaSuiteTab === 'additional' && (
                                        <div style={{ ...ipmCalcShell, flexDirection: isMobile ? 'column' : 'row' }}>
                                            <div style={{ ...ipmCalcColLeft, borderRight: isMobile ? 'none' : '1px solid rgba(17,87,92,0.12)' }}>
                                                <h4 style={ipmCalcHeadingLeft}>Extra payments on an existing bond</h4>
                                                <p style={{ fontSize: 13, color: '#64748b', margin: '-8px 0 8px' }}>We amortise month‑by‑month (same idea as <a href="https://www.property24.com/calculators/additionalpayment" target="_blank" rel="noopener noreferrer" style={{ color: '#11575C' }}>additional payment</a> calculators).</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-add-debt">Current bond balance</label>
                                                        <div style={bondZaInputWrap}><span style={bondZaPrefix}>R</span><input id="za-add-debt" type="number" min="0" step="1000" value={zaAddDebt || ''} onChange={e => setZaAddDebt(Number(e.target.value) || 0)} style={bondZaInputField} /></div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-add-pay">Current monthly instalment</label>
                                                        <div style={bondZaInputWrap}><span style={bondZaPrefix}>R</span><input id="za-add-pay" type="number" min="0" step="10" value={zaAddPayment || ''} onChange={e => setZaAddPayment(Number(e.target.value) || 0)} style={bondZaInputField} /></div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-add-extra">Additional monthly payment</label>
                                                        <div style={bondZaInputWrap}><span style={bondZaPrefix}>R</span><input id="za-add-extra" type="number" min="0" step="100" value={zaAddExtraMonthly || ''} onChange={e => setZaAddExtraMonthly(Number(e.target.value) || 0)} style={bondZaInputField} /></div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-add-once">Once-off lump sum (now)</label>
                                                        <div style={bondZaInputWrap}><span style={bondZaPrefix}>R</span><input id="za-add-once" type="number" min="0" step="1000" value={zaAddOnceOff || ''} onChange={e => setZaAddOnceOff(Number(e.target.value) || 0)} style={bondZaInputField} /></div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-add-rate">Interest rate</label>
                                                        <div style={bondZaInputWrap}><input id="za-add-rate" type="number" min="0" step="0.05" value={calcData.interestRate} onChange={e => setCalcData((prev) => ({ ...prev, interestRate: Number(e.target.value) || 0 }))} style={bondZaInputField} /><span style={bondZaSuffix}>%</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ ...ipmCalcColRight, borderLeft: isMobile ? 'none' : '4px solid rgba(17, 87, 92, 0.22)' }}>
                                                <div style={{ marginBottom: 16 }}>
                                                    <div style={bondZaResultMuted}>Interest saved (illustrative)</div>
                                                    <div style={ipmCalcHero}>{fmtZaRand(zaAddInterestSaved)}</div>
                                                </div>
                                                <div style={{ marginBottom: 20 }}>
                                                    <div style={bondZaResultMuted}>Time shaved off the loan</div>
                                                    <div style={{ ...ipmCalcHero, fontSize: 22 }}>{zaFormatYearsMonths(zaAddMonthsSaved)}</div>
                                                </div>
                                                {(zaAddBaseline.unpaid || zaAddWithExtra.unpaid) && (
                                                    <p style={{ color: '#b45309', fontSize: 13 }}>Instalment may be too low to cover interest at this rate — increase payment or lower rate.</p>
                                                )}
                                                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.65 }}>
                                                    <div style={ipmSubSectionTitle}>With extra payments</div>
                                                    <div style={ipmMiniRow}><span>Monthly instalment</span><strong>{fmtZaRand(zaAddPay + zaAddExtra)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Total interest</span><strong>{fmtZaRand(zaAddWithExtra.totalInterest)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Total paid to bank</span><strong>{fmtZaRand(zaAddWithExtra.totalPaid)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Pay-off time</span><strong>{zaFormatYearsMonths(zaAddWithExtra.months)}</strong></div>
                                                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '14px 0' }} />
                                                    <div style={ipmSubSectionTitle}>Without extra payments</div>
                                                    <div style={ipmMiniRow}><span>Monthly instalment</span><strong>{fmtZaRand(zaAddPay)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Total interest</span><strong>{fmtZaRand(zaAddBaseline.totalInterest)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Total paid to bank</span><strong>{fmtZaRand(zaAddBaseline.totalPaid)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Pay-off time</span><strong>{zaFormatYearsMonths(zaAddBaseline.months)}</strong></div>
                                                </div>
                                            </div>
                                        </div>
                                        )}

                                        {zaSuiteTab === 'bondTransfer' && zaBtDetail && (
                                        <div style={{ ...ipmCalcShell, flexDirection: isMobile ? 'column' : 'row' }}>
                                            <div style={{ ...ipmCalcColLeft, borderRight: isMobile ? 'none' : '1px solid rgba(17,87,92,0.12)' }}>
                                                <h4 style={ipmCalcHeadingLeft}>Once-off bond &amp; transfer costs</h4>
                                                <p style={{ fontSize: 13, color: '#64748b', margin: '-8px 0 8px' }}>Structured like <a href="https://www.property24.com/calculators/bondcosts" target="_blank" rel="noopener noreferrer" style={{ color: '#11575C' }}>bond cost breakdowns</a>; figures are estimates.</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-bt-purchase">Purchase price</label>
                                                        <div style={bondZaInputWrap}><span style={bondZaPrefix}>R</span><input id="za-bt-purchase" type="number" min="0" step="1000" value={zaBtPurchase || ''} onChange={e => setZaBtPurchase(Number(e.target.value) || 0)} style={bondZaInputField} /></div>
                                                    </div>
                                                    <div>
                                                        <label style={bondZaLabel} htmlFor="za-bt-loan">Loan amount</label>
                                                        <div style={bondZaInputWrap}><span style={bondZaPrefix}>R</span><input id="za-bt-loan" type="number" min="0" step="1000" value={zaBtLoan || ''} onChange={e => setZaBtLoan(Number(e.target.value) || 0)} style={bondZaInputField} /></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ ...ipmCalcColRight, borderLeft: isMobile ? 'none' : '4px solid rgba(17, 87, 92, 0.22)' }}>
                                                <div style={{ textAlign: isMobile ? 'left' : 'center', marginBottom: 8 }}>
                                                    <div style={bondZaResultMuted}>Total bond &amp; transfer (est.)</div>
                                                    <div style={ipmCalcHero}>{fmtZaRand(zaBtDetail.totalOnceOff)}</div>
                                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Illustrative tariff — Aug 2025-style fee mix</div>
                                                </div>
                                                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                                                    <div style={{ ...ipmSubSectionTitle, color: '#11575C', fontSize: 15 }}>Bond registration · {fmtZaRand(zaBtDetail.bondSubtotal)}</div>
                                                    <div style={ipmMiniRow}><span>Bond attorney &amp; reg. costs</span><strong>{fmtZaRand(zaBtDetail.bondRegistrationCosts)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Bank initiation fee (est.)</span><strong>{fmtZaRand(zaBtDetail.bankInitiationFee)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Deeds office levy</span><strong>{fmtZaRand(zaBtDetail.deedsOfficeLevy)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Postage &amp; misc.</span><strong>{fmtZaRand(zaBtDetail.bondPostageFees)}</strong></div>
                                                </div>
                                                <div style={{ marginTop: 18 }}>
                                                    <div style={{ ...ipmSubSectionTitle, color: '#11575C', fontSize: 15 }}>Property transfer · {fmtZaRand(zaBtDetail.transferSubtotal)}</div>
                                                    <div style={ipmMiniRow}><span>Transfer attorney fees (est.)</span><strong>{fmtZaRand(zaBtDetail.propertyTransferCosts)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Deeds office levy</span><strong>{fmtZaRand(zaBtDetail.deedsOfficeLevyTransfer)}</strong></div>
                                                    <div style={ipmMiniRow} title="Natural person brackets; VAT properties differ."><span>Transfer duty (SARS)</span><strong>{fmtZaRand(zaBtDetail.transferDuty)}</strong></div>
                                                    <div style={ipmMiniRow}><span>Postage &amp; misc.</span><strong>{fmtZaRand(zaBtDetail.transferPostageFees)}</strong></div>
                                                </div>
                                            </div>
                                        </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ padding: '28px 30px 30px' }}>
                                        <h3 style={{ ...sectionTitle, marginTop: 0 }}>{calcConfig.title}</h3>
                                        <p style={calcSectionSub}>{calcConfig.hint}</p>
                                        {propertyRoiPct != null && (
                                            <p style={{ fontSize: 14, color: '#11575C', fontWeight: 600, marginBottom: 12 }}>Estimated ROI (rental yield): {propertyRoiPct}</p>
                                        )}
                                        <div style={{ ...calcCard, maxWidth: '100%' }}>
                                            <div style={calcResult}>
                                                <span style={calcResultLabel}>{calcConfig.resultLabel}</span>
                                                <span style={calcResultValue}>{isNaN(monthlyPayment) || monthlyPayment <= 0 ? '—' : fmtBondMoney(monthlyPayment)} <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>/ month</span></span>
                                            </div>
                                            <div style={{ ...calcStatsRow, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
                                                <div style={calcStat}>
                                                    <div style={calcStatLabel}>{calcConfig.loanLabel}</div>
                                                    <div style={calcStatValue}>{fmtBondMoney(bondLoanPrincipal)}</div>
                                                </div>
                                                <div style={calcStat}>
                                                    <div style={calcStatLabel}>{calcConfig.totalRepayLabel}</div>
                                                    <div style={calcStatValue}>{fmtBondMoney(bondTotalRepayment)}</div>
                                                </div>
                                                <div style={calcStat}>
                                                    <div style={calcStatLabel}>{calcConfig.totalInterestLabel}</div>
                                                    <div style={calcStatValue}>{fmtBondMoney(bondTotalInterest)}</div>
                                                </div>
                                            </div>
                                            <div style={calcDivider} />
                                            <div style={{ ...calcGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                                                <div style={calcRow}>
                                                    <label style={calcLabel} htmlFor="bond-purchase-price">{calcConfig.purchaseLabel}</label>
                                                    <input id="bond-purchase-price" type="number" min="0" step="1000" value={calcData.price || ''} onChange={handleBondPriceChange} style={calcInput} />
                                                </div>
                                                <div style={calcRow}>
                                                    <label style={calcLabel} htmlFor="bond-deposit-pct">{calcConfig.depositPctLabel}</label>
                                                    <input id="bond-deposit-pct" type="number" min="0" max="100" step="0.5" value={calcData.downPayment} onChange={handleBondDownPaymentPctChange} style={calcInput} />
                                                </div>
                                                <div style={calcRow}>
                                                    <label style={calcLabel} htmlFor="bond-deposit-amt">{calcConfig.depositAmtLabel}</label>
                                                    <input id="bond-deposit-amt" type="number" min="0" step="1000" value={bondPrice <= 0 ? '' : Math.round(depositR)} onChange={handleBondDepositRandChange} style={calcInput} />
                                                </div>
                                                <div style={calcRow}>
                                                    <label style={calcLabel} htmlFor="bond-rate">{calcConfig.rateLabel}</label>
                                                    <input id="bond-rate" type="number" min="0" step="0.05" value={calcData.interestRate} onChange={e => setCalcData((prev) => ({ ...prev, interestRate: Number(e.target.value) || 0 }))} style={calcInput} />
                                                </div>
                                                <div style={{ ...calcRow, gridColumn: isMobile ? undefined : '1 / -1' }}>
                                                    <label style={calcLabel} htmlFor="bond-term">{calcConfig.termLabel}</label>
                                                    <select id="bond-term" value={calcData.loanTerm} onChange={e => setCalcData((prev) => ({ ...prev, loanTerm: Number(e.target.value) || 20 }))} style={calcSelect}>
                                                        {(bondTermOptions.includes(calcData.loanTerm) ? bondTermOptions : [...bondTermOptions, calcData.loanTerm].sort((a, b) => a - b)).map((y) => (
                                                            <option key={y} value={y}>{y} {calcCountry === 'NL' ? 'jaar' : 'years'}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. INFO TABS — text left, mini-dashboard centre, vertical tab bar right */}
                {(() => {
                    const TEAL = '#11575C';
                    const TEAL_LIGHT = '#1a6e74';
                    const FOREST = '#04342c';
                    const GOLD = '#ffc801';
                    const GOLD_DEEP = '#d4a017';
                    const TXT = '#1f2937';
                    const TXT2 = '#64748b';
                    const SURFACE = '#f8f9fa';

                    const panels = [
                        { key: 'desc', label: 'Property Description' },
                        { key: 'neighborhood', label: 'The Neighbourhood' },
                        { key: 'trends', label: 'Property Value Trend' },
                        { key: 'esg', label: 'ESG Information' },
                        { key: 'lifestyle', label: 'Lifestyle Index' },
                    ];
                    const active = panels.find(p => p.key === expandedAccordion) || panels[0];
                    const activeText = tabContent[active.key] || defaultTabContent[active.key] || '';
                    const activeTitle = active.label;

                    const cur = metaMeta.currency || prop.pricing?.currency || 'AED';
                    const askingPrice = prop.price ?? metaValuation.current_estimate?.value ?? 4800000;
                    const rentalYield = metaInvestment.rental_yield != null ? (Math.abs(Number(metaInvestment.rental_yield)) <= 1.5 ? (Number(metaInvestment.rental_yield) * 100).toFixed(1) : Number(metaInvestment.rental_yield).toFixed(1)) : '6.4';
                    const appreciation5y = metaInvestment.appreciation_5y != null ? pctDec(metaInvestment.appreciation_5y) : '+18%';
                    const daysOnMarket = metaMarket.days_on_market ?? 42;
                    const priceTrend12m = metaMarket.price_trend_12m != null ? pctDec(metaMarket.price_trend_12m) : '+5.2%';
                    const pricePerSqm = metaValuation.price_per_sqft != null ? Math.round(Number(metaValuation.price_per_sqft)) : 2650;

                    const walkScore = metaNeighborhood.mobility?.walkability_score ?? 72;
                    const transitScore = metaNeighborhood.mobility?.transit_score ?? 58;
                    const safetyRating = metaNeighborhood.safety?.rating ? String(metaNeighborhood.safety.rating).replace(/_/g, ' ') : 'Low Crime';
                    const medianIncome = metaNeighborhood.demographics?.median_income;
                    const schoolCount = metaNeighborhood.schools?.length ?? 5;
                    const parkCount = metaNeighborhood.amenities?.parks ?? 3;

                    const esgScore = metaEsg.overall_esg_score ?? 76;
                    const energyRating = metaEsg.environmental_score?.energy_efficiency_rating ?? 'A';
                    const floodRisk = metaEnvironmental.climate_risk?.flood_risk ? String(metaEnvironmental.climate_risk.flood_risk).replace(/_/g, ' ') : 'Low';
                    const airQuality = metaEnvironmental.air_quality?.rating ?? 'Good';
                    const solarPotential = metaEnvironmental.sustainability?.solar_potential ?? 'High';
                    const climateRisk = metaEnvironmental.climate_risk?.overall_risk_score ?? 2.1;
                    const devGovernance = 8.4;

                    const occupancy = 74;
                    const avgRent = metaMarket.rent_estimate?.monthly ?? 27000;
                    const vacancyRate = 12;

                    const _db = { borderTop: `3px solid ${TEAL}`, background: '#fff', borderRadius: 10, padding: '10px 12px', flex: '1 1 0%', minWidth: 0 };
                    const _dbLabel = { fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: TXT2, textTransform: 'uppercase', margin: '0 0 4px' };
                    const _dbValue = { fontSize: 18, fontWeight: 800, color: TXT, margin: '0 0 2px', lineHeight: 1.2 };
                    const _dbSub = { fontSize: 10, color: TXT2, margin: 0, lineHeight: 1.3 };
                    const _dbTag = { fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, display: 'inline-block', marginTop: 4 };
                    const _dbTagTeal = { ..._dbTag, background: 'rgba(17,87,92,0.1)', color: FOREST };
                    const _dbTagGold = { ..._dbTag, background: 'rgba(255,200,1,0.15)', color: GOLD_DEEP };
                    const _dbHighlight = { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 };
                    const _dbDot = (c) => ({ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, marginTop: 3 });

                    const DonutMini = ({ pct, size = 60, stroke = 6, color = TEAL, label, bg = '#e2e8f0' }) => {
                        const r = (size - stroke) / 2;
                        const circ = 2 * Math.PI * r;
                        const offset = circ - (pct / 100) * circ;
                        return (
                            <div style={{ textAlign: 'center' }}>
                                <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
                                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke}/>
                                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                                        strokeDasharray={circ} strokeDashoffset={offset}
                                        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
                                        style={{ transition: 'stroke-dashoffset 0.6s ease' }}/>
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
                                        style={{ fontSize: size * 0.24, fontWeight: 800, fill: TXT }}>{pct}%</text>
                                </svg>
                                {label && <p style={{ fontSize: 9, color: TXT2, margin: '3px 0 0', fontWeight: 600 }}>{label}</p>}
                            </div>
                        );
                    };

                    const BarMini = ({ value, max, color = TEAL, label }) => (
                        <div style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TXT2, marginBottom: 2 }}>
                                <span>{label}</span><span style={{ fontWeight: 700, color: TXT }}>{value}</span>
                            </div>
                            <div style={{ height: 5, background: SURFACE, borderRadius: 3 }}>
                                <div style={{ height: '100%', width: `${Math.min(100, (Number(String(value).replace(/[^0-9.]/g,'')) / max) * 100)}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                            </div>
                        </div>
                    );

                    const MonthBars = ({ data, color = TEAL }) => {
                        const maxVal = Math.max(...data.map(d => d.v));
                        return (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 45 }}>
                                {data.map((d, i) => (
                                    <div key={i} style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: '100%', height: Math.max(4, (d.v / maxVal) * 38), background: i === new Date().getMonth() ? GOLD : color, borderRadius: 2, transition: 'height 0.4s ease' }} />
                                        <span style={{ fontSize: 7, color: TXT2, marginTop: 2 }}>{d.m}</span>
                                    </div>
                                ))}
                            </div>
                        );
                    };

                    const SpiderChart = ({ dims, propScores, areaScores, size = 140 }) => {
                        const pad = 28;
                        const full = size + pad * 2;
                        const cx = full / 2, cy = full / 2, r = size * 0.44;
                        const n = dims.length;
                        const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
                        const point = (i, v) => {
                            const a = angle(i);
                            const d = (v / 100) * r;
                            return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
                        };
                        const poly = (scores) => scores.map((v, i) => point(i, v).join(',')).join(' ');
                        const gridLevels = [25, 50, 75, 100];
                        return (
                            <svg width="100%" viewBox={`0 0 ${full} ${full}`} style={{ display: 'block', margin: '0 auto', maxHeight: size }}>
                                {gridLevels.map(lv => (
                                    <polygon key={lv} points={dims.map((_, i) => point(i, lv).join(',')).join(' ')}
                                        fill="none" stroke="#e2e8f0" strokeWidth={0.5} />
                                ))}
                                {dims.map((_, i) => {
                                    const [x, y] = point(i, 100);
                                    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />;
                                })}
                                <polygon points={poly(areaScores)} fill="rgba(255,200,1,0.15)" stroke={GOLD} strokeWidth={1.5} />
                                <polygon points={poly(propScores)} fill="rgba(17,87,92,0.15)" stroke={TEAL} strokeWidth={1.5} />
                                {dims.map((d, i) => {
                                    const [x, y] = point(i, 125);
                                    return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central"
                                        style={{ fontSize: 9, fill: TXT2, fontWeight: 600 }}>{d}</text>;
                                })}
                            </svg>
                        );
                    };

                    const rentData = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => ({
                        m, v: Math.round((avgRent ?? 27000) * (0.85 + Math.sin(i / 2) * 0.15 + Math.random() * 0.05))
                    }));

                    const spiderDims = ['Price Value', 'Rental Yield', 'Appreciation', 'Safety', 'Lifestyle', 'ESG Score'];
                    const spiderProp = [82, 75, 70, 85, 72, esgScore];
                    const spiderArea = [65, 60, 55, 70, 68, 60];

                    const renderDashboard = (key) => {
                        if (key === 'desc') {
                            return (
                                <>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ ..._db, borderTopColor: TEAL }}>
                                            <p style={_dbLabel}>Asking Price</p>
                                            <p style={_dbValue}>{cur} {askingPrice >= 1e6 ? `${(askingPrice / 1e6).toFixed(1)}M` : Number(askingPrice).toLocaleString()}</p>
                                            <p style={_dbSub}>{prop.propertyType || 'Property'}</p>
                                        </div>
                                        <div style={{ ..._db, borderTopColor: GOLD }}>
                                            <p style={_dbLabel}>Rental Yield</p>
                                            <p style={_dbValue}>{rentalYield}%</p>
                                            <p style={_dbSub}>Annual estimate</p>
                                            <span style={_dbTagTeal}>&#9650; Market avg</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ ..._db, borderTopColor: TEAL_LIGHT }}>
                                            <p style={_dbLabel}>5-Year Growth</p>
                                            <p style={_dbValue}>{appreciation5y}</p>
                                            <p style={_dbSub}>Historical appreciation</p>
                                            <span style={_dbTagTeal}>&#9650; Steady growth</span>
                                        </div>
                                        <div style={{ ..._db, borderTopColor: GOLD_DEEP }}>
                                            <p style={_dbLabel}>Days on Market</p>
                                            <p style={_dbValue}>{daysOnMarket}</p>
                                            <p style={_dbSub}>Avg. days before sale</p>
                                            <span style={_dbTagGold}>Fast-moving area</span>
                                        </div>
                                    </div>
                                    <div style={_db}>
                                        <p style={_dbLabel}>Investment Confidence</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                                            <DonutMini pct={76} size={58} stroke={5} color={TEAL} bg="rgba(17,87,92,0.1)" label="Confidence" />
                                            <div style={{ flex: 1 }}>
                                                <div style={_dbHighlight}>
                                                    <div style={_dbDot(TEAL)} />
                                                    <div><p style={{ fontSize: 10, fontWeight: 700, color: TXT, margin: 0 }}>Strong Demand</p><p style={{ fontSize: 9, color: TXT2, margin: 0 }}>Popular with high-income buyers</p></div>
                                                </div>
                                                <div style={_dbHighlight}>
                                                    <div style={_dbDot(GOLD)} />
                                                    <div><p style={{ fontSize: 10, fontWeight: 700, color: TXT, margin: 0 }}>Premium Build</p><p style={{ fontSize: 9, color: TXT2, margin: 0 }}>Modern spec, no maintenance backlog</p></div>
                                                </div>
                                                <div style={_dbHighlight}>
                                                    <div style={_dbDot(TEAL_LIGHT)} />
                                                    <div><p style={{ fontSize: 10, fontWeight: 700, color: TXT, margin: 0 }}>Consistent Appreciation</p><p style={{ fontSize: 9, color: TXT2, margin: 0 }}>{appreciation5y} over 5 years</p></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        }

                        if (key === 'neighborhood') {
                            return (
                                <>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={_db}>
                                            <p style={_dbLabel}>Walk Score</p>
                                            <p style={_dbValue}>{walkScore}<span style={{ fontSize: 11, color: TXT2 }}>/100</span></p>
                                        </div>
                                        <div style={_db}>
                                            <p style={_dbLabel}>Transit Score</p>
                                            <p style={_dbValue}>{transitScore}<span style={{ fontSize: 11, color: TXT2 }}>/100</span></p>
                                        </div>
                                    </div>
                                    <div style={_db}>
                                        <p style={{ ..._dbLabel, marginBottom: 4 }}>This Property vs. Area Average</p>
                                        <SpiderChart dims={spiderDims} propScores={spiderProp} areaScores={spiderArea} size={160} />
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 2 }}>
                                            <span style={{ fontSize: 8, color: TEAL, fontWeight: 600 }}>&#9632; This Property</span>
                                            <span style={{ fontSize: 8, color: GOLD, fontWeight: 600 }}>&#9632; Area Avg</span>
                                        </div>
                                    </div>
                                    <div style={{ ..._db, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <p style={{ ..._dbLabel, marginBottom: 2 }}>Area Profile</p>
                                        <BarMini label="Safety" value={safetyRating === 'Low Crime' ? '85' : '70'} max={100} color={TEAL} />
                                        <BarMini label="Schools Nearby" value={String(schoolCount)} max={10} color={TEAL_LIGHT} />
                                        <BarMini label="Parks & Green" value={String(parkCount)} max={8} color={GOLD} />
                                        {medianIncome != null && <BarMini label="Median Income" value={fmtNum(medianIncome, cur)} max={medianIncome * 1.5} color={GOLD_DEEP} />}
                                        <p style={_dbSub}>Based on local data &amp; comparable areas</p>
                                    </div>
                                </>
                            );
                        }

                        if (key === 'trends') {
                            return (
                                <>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ ..._db, borderTopColor: TEAL }}>
                                            <p style={_dbLabel}>12-Month Trend</p>
                                            <p style={_dbValue}>{priceTrend12m}</p>
                                            <span style={_dbTagTeal}>&#9650; Growing</span>
                                        </div>
                                        <div style={{ ..._db, borderTopColor: GOLD }}>
                                            <p style={_dbLabel}>Price / m&sup2;</p>
                                            <p style={_dbValue}>{cur} {pricePerSqm.toLocaleString()}</p>
                                            <p style={_dbSub}>Based on recent transactions</p>
                                            <span style={_dbTagGold}>Comparable comps</span>
                                        </div>
                                    </div>
                                    <div style={_db}>
                                        <p style={_dbLabel}>Investment Confidence</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                                            <DonutMini pct={76} size={62} stroke={5} color={TEAL} bg="rgba(17,87,92,0.1)" label="Confidence Score" />
                                            <div style={{ flex: 1 }}>
                                                <div style={_dbHighlight}>
                                                    <div style={_dbDot(TEAL)} />
                                                    <div><p style={{ fontSize: 10, fontWeight: 700, color: TXT, margin: 0 }}>Strong Demand</p><p style={{ fontSize: 9, color: TXT2, margin: 0 }}>Popular with high-income buyers &amp; expats</p></div>
                                                </div>
                                                <div style={_dbHighlight}>
                                                    <div style={_dbDot(GOLD)} />
                                                    <div><p style={{ fontSize: 10, fontWeight: 700, color: TXT, margin: 0 }}>Premium New Build</p><p style={{ fontSize: 9, color: TXT2, margin: 0 }}>No maintenance backlog, modern ESG spec</p></div>
                                                </div>
                                                <div style={_dbHighlight}>
                                                    <div style={_dbDot(TEAL_LIGHT)} />
                                                    <div><p style={{ fontSize: 10, fontWeight: 700, color: TXT, margin: 0 }}>Consistent Appreciation</p><p style={{ fontSize: 9, color: TXT2, margin: 0 }}>{appreciation5y} over 5 years with infrastructure investment</p></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={_db}>
                                        <p style={{ ..._dbLabel, marginBottom: 2 }}>Price Forecast</p>
                                        <p style={{ fontSize: 9, color: TXT2, margin: '0 0 6px' }}>Low / Mid / High {cur} scenarios</p>
                                        {[
                                            { label: 'Current', lo: null, hi: null, price: `${cur} ${askingPrice >= 1e6 ? `${(askingPrice / 1e6).toFixed(1)}M` : Number(askingPrice).toLocaleString()} listed` },
                                            { label: '12 Months', lo: (askingPrice * 1.02 / 1e6).toFixed(1), hi: (askingPrice * 1.11 / 1e6).toFixed(1), price: `${(askingPrice * 1.02 / 1e6).toFixed(1)}M – ${(askingPrice * 1.06 / 1e6).toFixed(1)}M – ${(askingPrice * 1.11 / 1e6).toFixed(1)}M` },
                                            { label: '36 Months', lo: (askingPrice * 1.08 / 1e6).toFixed(1), hi: (askingPrice * 1.27 / 1e6).toFixed(1), price: `${(askingPrice * 1.08 / 1e6).toFixed(1)}M – ${(askingPrice * 1.19 / 1e6).toFixed(1)}M – ${(askingPrice * 1.27 / 1e6).toFixed(1)}M` },
                                        ].map((row, ri) => (
                                            <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                                <span style={{ fontSize: 9, color: TXT2, fontWeight: 600, width: 56, flexShrink: 0 }}>{row.label}</span>
                                                <div style={{ flex: 1, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${TEAL} 0%, ${GOLD} 100%)`, opacity: ri === 0 ? 0.4 : 0.7 + ri * 0.1 }} />
                                                <span style={{ fontSize: 8, color: TXT, fontWeight: 600, whiteSpace: 'nowrap' }}>{row.price}</span>
                                            </div>
                                        ))}
                                        <p style={{ ..._dbSub, marginTop: 4 }}>Not financial advice. Based on market conditions &amp; comparable sales.</p>
                                    </div>
                                    <div style={_db}>
                                        <p style={{ ..._dbLabel, marginBottom: 6 }}>Monthly Rental Income Estimate</p>
                                        <MonthBars data={rentData} />
                                        <p style={{ ..._dbSub, marginTop: 6 }}>Projected income based on comparable {prop.locationDetails?.city || 'area'} data</p>
                                    </div>
                                </>
                            );
                        }

                        if (key === 'esg') {
                            return (
                                <>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ ..._db, borderTopColor: TEAL }}>
                                            <p style={_dbLabel}>Energy Rating</p>
                                            <p style={{ ..._dbValue, fontSize: 26, color: TEAL }}>{energyRating}</p>
                                            <p style={_dbSub}>Building efficiency</p>
                                            <span style={_dbTagTeal}>Top tier</span>
                                        </div>
                                        <div style={{ ..._db, borderTopColor: GOLD }}>
                                            <p style={_dbLabel}>Dev. Governance</p>
                                            <p style={_dbValue}>{devGovernance}<span style={{ fontSize: 11, color: TXT2 }}>/10</span></p>
                                            <p style={_dbSub}>Compliance record</p>
                                            <span style={_dbTagGold}>Trusted developer</span>
                                        </div>
                                    </div>
                                    <div style={_db}>
                                        <p style={_dbLabel}>ESG Score</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                                            <DonutMini pct={esgScore} size={58} stroke={5} color={TEAL} bg="rgba(17,87,92,0.1)" label="Overall" />
                                            <div style={{ flex: 1 }}>
                                                <BarMini label="Environmental" value="82" max={100} color={TEAL} />
                                                <BarMini label="Social" value="71" max={100} color={GOLD} />
                                                <BarMini label="Governance" value="78" max={100} color={TEAL_LIGHT} />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ ..._db, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <p style={{ ..._dbLabel, marginBottom: 2 }}>Environmental Metrics</p>
                                        <BarMini label="Flood Risk" value={floodRisk === 'Low' ? '15' : '45'} max={100} color={TEAL} />
                                        <BarMini label="Air Quality" value={airQuality === 'Good' ? '82' : '60'} max={100} color={TEAL_LIGHT} />
                                        <BarMini label="Solar Potential" value={solarPotential === 'High' ? '88' : '55'} max={100} color={GOLD} />
                                        <BarMini label="Climate Risk" value={String(climateRisk)} max={10} color={GOLD_DEEP} />
                                    </div>
                                </>
                            );
                        }

                        if (key === 'lifestyle') {
                            return (
                                <>
                                    <div style={_db}>
                                        <p style={_dbLabel}>Rental Performance</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                                            <DonutMini pct={occupancy} size={58} stroke={5} color={TEAL} bg="rgba(17,87,92,0.1)" label="Occupancy" />
                                            <div style={{ flex: 1 }}>
                                                <BarMini label="Avg Monthly Rent" value={`${cur} ${(avgRent / 1000).toFixed(0)}k`} max={avgRent * 1.5 / 1000} color={TEAL} />
                                                <BarMini label="Vacancy Rate" value={`${vacancyRate}%`} max={100} color={GOLD} />
                                                <div style={{ background: 'rgba(17,87,92,0.06)', borderRadius: 6, padding: '5px 8px', marginTop: 4 }}>
                                                    <p style={{ fontSize: 9, fontWeight: 700, color: TEAL, margin: 0 }}>Short-Term Rentals</p>
                                                    <p style={{ fontSize: 9, color: TXT2, margin: 0 }}>Permitted · High expat demand</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ ..._db, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <p style={{ ..._dbLabel, marginBottom: 2 }}>Lifestyle Scores</p>
                                        <BarMini label="Dining & Entertainment" value="82" max={100} color={GOLD} />
                                        <BarMini label="Recreation & Fitness" value="78" max={100} color={TEAL} />
                                        <BarMini label="Green Spaces" value="71" max={100} color={TEAL_LIGHT} />
                                        <BarMini label="Cultural Access" value="65" max={100} color={GOLD_DEEP} />
                                    </div>
                                    <div style={_db}>
                                        <p style={{ ..._dbLabel, marginBottom: 6 }}>Monthly Rental Income Estimate</p>
                                        <MonthBars data={rentData} />
                                        <p style={{ ..._dbSub, marginTop: 6 }}>Based on comparable {prop.locationDetails?.city || 'area'} data</p>
                                    </div>
                                    <p style={{ ..._dbSub, textAlign: 'center', padding: '4px 0 0' }}>Not financial advice. Based on market conditions.</p>
                                </>
                            );
                        }
                        return null;
                    };

                    return (
                        <div style={infoTabsCard}>
                            {/* Left — text content */}
                            <div style={infoTabsTextCol}>
                                <h3 style={infoTabsTitle}>{activeTitle}</h3>
                                <div style={infoTabsDescWrap}>
                                    <p style={infoTabsDesc}>{activeText}</p>
                                </div>
                            </div>
                            {/* Centre — scrollable mini dashboard */}
                            <div style={infoTabsDashCol}>
                                <div style={infoTabsDashScroll}>
                                    {renderDashboard(active.key)}
                                </div>
                            </div>
                            {/* Right — vertical tab buttons */}
                            <div style={infoTabsBarCol}>
                                {panels.map((p, idx) => {
                                    const isActive = expandedAccordion === p.key;
                                    return (
                                        <button
                                            key={p.key}
                                            type="button"
                                            onClick={() => setExpandedAccordion(p.key)}
                                            style={{
                                                ...infoTabBtn,
                                                color: isActive ? '#ffc801' : '#11575C',
                                                ...(idx === 0 ? { borderLeft: 'none' } : {}),
                                            }}
                                            aria-selected={isActive}
                                        >
                                            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                                                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            <span style={infoTabBtnText}>{p.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* 5. AMENITIES & MAP */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 24, marginBottom: 20, height: isMobile ? 'auto' : INFO_TABS_HEIGHT }}>
                    <div style={amenitiesCard}>
                        <h3 style={sectionTitle}>Nearby Amenities</h3>
                        <div style={amenitiesList}>
                            {localAmenities.map((item, i) => (
                                <div key={i} style={{ marginBottom: 14 }}>
                                    <div style={{ fontWeight: 700, color: '#11575C' }}>{item.name} <span style={{ color: '#0f172a', fontWeight: 600 }}>— {item.dist}</span></div>
                                    <div style={{ fontSize: 13, color: '#64748b' }}>{item.type}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={mapVisual}>
                        {MAPBOX_TOKEN ? (
                            <div style={{ width: '100%', height: '100%' }}>
                                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: 16, filter: 'grayscale(100%) contrast(0.95)' }} />
                            </div>
                        ) : (
                            <>
                                <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0, opacity: 0.8, filter: 'grayscale(100%)' }} src={mapEmbedUrl} allowFullScreen title="Map"></iframe>
                                <div style={floatPinCard}><img src={prop.imageUrl} alt="Pin" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} /><div><div style={{ fontWeight: 'bold' }}>{formatPrice(prop.price, propertyPriceFormatOpts(prop))}{getPriceDisplaySuffix()}</div>{!isDevelopment(prop) && <div style={{ fontSize: 11 }}>{prop.specs?.beds} {t('common.beds')}, {prop.specs?.baths} {t('common.baths')}</div>}</div></div>
                            </>
                        )}
                    </div>
                </div>


                    </div>

                        </div>

            {/* ── AGENT CONTACT FORM ── */}
            <div style={contactSectionWrap}>
                <div style={contactSectionInner}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 28, alignItems: 'stretch' }}>
                        {/* LEFT — Floating agent card */}
                        <div style={contactAgentFloatCard}>
                            <div style={contactAgentImgRing}>
                                <img
                                    src={agentPhoto}
                                    alt={agentName}
                                    style={contactAgentImg}
                                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AGENT_PHOTO; }}
                                />
                            </div>
                            <h4 style={contactAgentName}>{agentName}</h4>
                            <p style={contactAgentRole}>Property Consultant</p>
                            {agencyName && (
                                <p style={contactAgentDetail}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6, flexShrink: 0 }}><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" fill="#64748b"/></svg>
                                    {agencyName}
                                </p>
                            )}
                            {agentPhone && (
                                <p style={{ ...contactAgentDetail, whiteSpace: 'nowrap' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6, flexShrink: 0 }}><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" fill="#64748b"/></svg>
                                    {agentPhone}
                                </p>
                            )}
                            {agentEmail && (
                                <p style={{ ...contactAgentDetail, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6, flexShrink: 0 }}><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#64748b"/></svg>
                                    <a href={`mailto:${agentEmail}`} style={{ color: '#11575C', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agentEmail}</a>
                                </p>
                            )}
                        </div>

                        {/* RIGHT — Form + Calendar */}
                    <form onSubmit={handleSubmit} style={{ ...contactCard, flex: '1 1 0%', gridTemplateColumns: isMobile ? '1fr' : '1fr 240px' }}>
                        <div style={contactFormCol}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <input name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First Name" required style={contactInput} />
                                <input name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last Name" required style={contactInput} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="E-mail" required style={contactInput} />
                                <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="Phone" style={contactInput} />
                            </div>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                placeholder="Is there any additional information you would like the agent to know, or anything you would like us to prepare ahead of our meeting?"
                                rows={3}
                                style={contactTextarea}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                                <div style={contactToggleWrap}>
                                    <button type="button" onClick={() => setMeetingType('In Person')} style={meetingType === 'In Person' ? contactToggleActive : contactToggleInactive}>In Person</button>
                                    <button type="button" onClick={() => setMeetingType('Via Video Chat')} style={meetingType === 'Via Video Chat' ? contactToggleActive : contactToggleInactive}>Via Video Chat</button>
                                </div>
                                <button type="submit" style={contactSubmitBtn}>Schedule a meeting</button>
                            </div>
                        </div>

                        {/* RIGHT — Calendar */}
                        <div style={contactCalCol}>
                            <div style={contactCalCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <button type="button" onClick={() => changeMonth(-1)} style={contactCalNav}>&lsaquo;</button>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{monthNames[currentDate.getMonth()]}</span>
                                    <button type="button" onClick={() => changeMonth(1)} style={contactCalNav}>&rsaquo;</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center', fontSize: 11 }}>
                                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                        <div key={d} style={{ fontWeight: 700, color: '#64748b', padding: '2px 0' }}>{d}</div>
                                    ))}
                                    {(() => {
                                        const year = currentDate.getFullYear();
                                        const month = currentDate.getMonth();
                                        const firstDay = new Date(year, month, 1).getDay();
                                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                                        const prevDays = new Date(year, month, 0).getDate();
                                        const cells = [];
                                        for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false });
                                        for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
                                        const remaining = 42 - cells.length;
                                        for (let i = 1; i <= remaining; i++) cells.push({ day: i, current: false });
                                        return cells.map((c, i) => {
                                            const isSelected = c.current && c.day === selectedDate;
                                            const isToday = c.current && c.day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => c.current && setSelectedDate(c.day)}
                                                    style={{
                                                        padding: '3px 0',
                                                        borderRadius: '50%',
                                                        fontSize: 11,
                                                        cursor: c.current ? 'pointer' : 'default',
                                                        background: isSelected ? '#11575C' : 'transparent',
                                                        color: isSelected ? '#fff' : c.current ? '#0f172a' : '#cbd5e1',
                                                        fontWeight: isToday ? 800 : 400,
                                                        border: isToday && !isSelected ? '2px solid #11575C' : '2px solid transparent',
                                                        transition: 'all .15s',
                                                    }}
                                                >{c.day}</div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                            {/* Time picker */}
                            <div style={{ position: 'relative', marginTop: 8 }}>
                                <button type="button" onClick={() => setShowTimeDropdown(!showTimeDropdown)} style={contactTimeBtn}>
                                    <span>{selectedTime || 'Select a time'}</span>
                                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                                {showTimeDropdown && (
                                    <div style={contactTimeDropdown}>
                                        {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'].map(t => {
                                            const isBooked = bookedTimes.includes(t);
                                            return (
                                                <div
                                                    key={t}
                                                    onClick={() => { if (!isBooked) { setSelectedTime(t); setShowTimeDropdown(false); } }}
                                                    style={{
                                                        padding: '8px 14px',
                                                        cursor: isBooked ? 'not-allowed' : 'pointer',
                                                        background: selectedTime === t ? '#f1f5f9' : 'transparent',
                                                        color: isBooked ? '#cbd5e1' : '#0f172a',
                                                        textDecoration: isBooked ? 'line-through' : 'none',
                                                        fontSize: 13,
                                                    }}
                                                >{t}{isBooked ? ' (booked)' : ''}</div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                    </div>
                </div>
            </div>

            {/* Virtual Tour full-screen modal */}
            {virtualTourModalOpen && hasVirtualTour && (
                <div style={modalOverlay} onClick={() => setVirtualTourModalOpen(false)} role="dialog" aria-modal="true" aria-label="360° virtual tour">
                    <button type="button" style={{ ...lightboxClose, top: 16, right: 16, zIndex: 10003 }} onClick={() => setVirtualTourModalOpen(false)} aria-label="Close">&times;</button>
                    <div style={virtualTourModalContent} onClick={(e) => e.stopPropagation()}>
                        <iframe src={virtualTourUrl} title="360° virtual tour" style={virtualTourModalIframe} allowFullScreen allow="fullscreen; vr; xr; accelerometer; gyroscope" />
                    </div>
                </div>
            )}

        </div>
    );
};

// --- STYLES ---
const container = { maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' };
const backToDashboardBtn = { display: 'inline-flex', alignItems: 'center', marginBottom: '16px', padding: '8px 16px', background: 'transparent', border: '1px solid #11575C', color: '#11575C', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
const headerRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' };
const titleStyle = { color: '#0f3a3e', margin: 0, fontSize: '28px' };
const priceStyle = { color: '#64748b', margin: 0, fontSize: '24px', fontWeight: '400' };
const specsRow = { display: 'flex', gap: '20px', color: '#64748b', fontSize: '12px', fontWeight: 'bold', alignItems: 'center' };

const gallerySection = { marginBottom: '24px' };
const galleryHero = { width: '100%', height: '450px', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '12px', position: 'relative', outline: 'none' };
const galleryCounterPill = { position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.65)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, zIndex: 2, pointerEvents: 'none' };
const galleryExpandHint = { position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' };
const galleryArrow = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', color: '#11575C', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 2 };
const thumbnailStripWrap = { overflowX: 'auto', overflowY: 'hidden', marginTop: '12px', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' };
const thumbnailStrip = { display: 'flex', gap: '10px', minWidth: 'min-content', paddingRight: '8px' };
const thumbnailStripBtn = { flexShrink: 0, width: '80px', height: '60px', padding: 0, border: '2px solid transparent', borderRadius: '8px', cursor: 'pointer', background: 'none', overflow: 'hidden' };
const thumbnailStripBtnActive = { borderColor: '#11575C', boxShadow: '0 0 0 1px #11575C' };
const thumbnailStripThumb = { display: 'block', width: '100%', height: '100%', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '6px' };
const pillTag = { position: 'absolute', top: '20px', left: '20px', background: 'white', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: '#11575C' };
const lightboxOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', boxSizing: 'border-box' };
const lightboxClose = { position: 'fixed', top: '16px', right: '20px', width: '44px', height: '44px', border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '28px', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 10002 };
const lightboxPrev = { position: 'fixed', left: '20px', top: '50%', transform: 'translateY(-50%)', width: '48px', height: '48px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '32px', cursor: 'pointer', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 10002 };
const lightboxNext = { position: 'fixed', right: '20px', top: '50%', transform: 'translateY(-50%)', width: '48px', height: '48px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '32px', cursor: 'pointer', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 10002 };
const lightboxContent = { maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10001 };
const lightboxImage = { maxWidth: '100%', maxHeight: '80vh', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: '8px' };
const lightboxCounter = { color: 'rgba(255,255,255,0.9)', fontSize: '14px', marginTop: '12px' };

const matchCard = { position: 'absolute', bottom: '20px', right: '20px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', width: '320px', zIndex: 10 };
const matchHeader = { borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', color: '#11575C', fontWeight: '600' };
const checklist = { listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', color: '#0f3a3e', lineHeight: '1.8' };
const checkIcon = { color: '#11575C', marginRight: '8px' };

const virtualTourSection = { marginBottom: '48px' };
const virtualTourEmbedWrap = { position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#0f172a', aspectRatio: '16 / 9', maxHeight: '500px' };
const virtualTourIframe = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' };
const virtualTourFullscreenBtn = { marginTop: '12px', padding: '10px 20px', background: '#11575C', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' };
const virtualTourModalContent = { width: '95vw', height: '90vh', maxWidth: '1400px', background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative', zIndex: 2001 };
const virtualTourModalIframe = { width: '100%', height: '100%', border: 'none' };

const actionBar = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '40px', width: '100%' };
const circleIconBtn = { width: '40px', height: '40px', borderRadius: '50%', background: '#11575C', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const pillActionBtn = { background: 'white', border: '1px solid #ddd', borderRadius: '20px', padding: '8px 20px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' };
const pillActionBtnDisabled = { ...pillActionBtn, opacity: 0.6, cursor: 'not-allowed', color: '#94a3b8' };
const calcBtn = { background: '#ffc801', border: 'none', borderRadius: '20px', padding: '10px 25px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' };
const calcBtnDisabled = { ...calcBtn, opacity: 0.6, cursor: 'not-allowed', background: '#d1d5db', color: '#6b7280' };

const calcSection = { marginBottom: '48px' };
const calcSectionSub = { color: '#64748b', fontSize: '14px', marginTop: '-8px', marginBottom: '16px' };
const calcCard = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', maxWidth: '480px' };
const calcGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' };
const calcRow = { marginBottom: 0 };
const calcLabel = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' };
const calcInput = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px', boxSizing: 'border-box' };
const calcResult = { padding: '18px', background: '#fff', border: '2px solid #11575C', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' };
const calcResultLabel = { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' };
const calcResultValue = { fontSize: '26px', fontWeight: 700, color: '#11575C' };
const calcStatsRow = { display: 'grid', gap: '12px', marginBottom: '16px' };
const calcStat = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' };
const calcStatLabel = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' };
const calcStatValue = { fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 };
const calcSelect = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px', boxSizing: 'border-box', background: '#fff', cursor: 'pointer' };
const calcDivider = { height: 1, background: '#e2e8f0', margin: '4px 0 16px' };

const ipmSuiteTabBar = {
    background: 'linear-gradient(90deg, rgba(17,87,92,0.07) 0%, rgba(255,200,1,0.08) 100%)',
    borderBottom: '1px solid rgba(17, 87, 92, 0.12)',
    padding: '12px 12px 0',
};
const ipmSuiteTabActive = {
    background: '#11575C',
    color: '#fff',
    border: 'none',
    borderRadius: '12px 12px 0 0',
    fontWeight: 700,
    fontSize: 13,
    padding: '12px 16px',
    cursor: 'pointer',
    boxShadow: '0 -2px 12px rgba(17, 87, 92, 0.15)',
};
const ipmSuiteTabRest = {
    background: 'transparent',
    color: '#475569',
    border: 'none',
    borderRadius: '12px 12px 0 0',
    fontWeight: 600,
    fontSize: 13,
    padding: '12px 14px',
    cursor: 'pointer',
};
const ipmSuiteKicker = { fontSize: 12, fontWeight: 800, color: '#11575C', letterSpacing: '0.08em', textTransform: 'uppercase' };
const ipmCalcShell = {
    display: 'flex',
    borderRadius: 20,
    overflow: 'hidden',
    border: '2px solid rgba(17, 87, 92, 0.14)',
    boxShadow: '0 14px 40px rgba(17, 87, 92, 0.1)',
};
const ipmCalcColLeft = {
    flex: 1,
    background: 'linear-gradient(165deg, #ecfdf5 0%, #f8fafc 55%, #e0f2fe 100%)',
    padding: '28px 24px',
    minWidth: 0,
};
const ipmCalcColRight = {
    flex: 1,
    background: '#fff',
    padding: '28px 24px',
    minWidth: 0,
};
const ipmCalcHeadingLeft = { margin: '0 0 20px', fontSize: 18, fontWeight: 800, color: '#11575C', lineHeight: 1.25 };
const ipmCalcHero = { fontSize: 28, fontWeight: 800, color: '#11575C', letterSpacing: '-0.02em', lineHeight: 1.15 };
const ipmCalcTextLink = {
    background: 'none',
    border: 'none',
    color: '#11575C',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    padding: '8px 0 0',
    textAlign: 'left',
};
const ipmInfoPanel = {
    padding: 16,
    borderRadius: 14,
    border: '2px solid rgba(17, 87, 92, 0.25)',
    background: 'linear-gradient(135deg, #f0fdfa 0%, #fff 100%)',
};
const ipmInfoPanelTitle = { fontSize: 15, fontWeight: 800, color: '#11575C', marginBottom: 10 };
const ipmInfoPanelP = { fontSize: 13, color: '#475569', lineHeight: 1.65, margin: '0 0 10px' };
const ipmSubSectionTitle = { fontWeight: 700, color: '#334155', marginBottom: 10, fontSize: 14 };
const ipmMiniRow = { display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: 14 };
const bondZaLabel = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 };
const bondZaInputWrap = { display: 'flex', alignItems: 'stretch', borderRadius: 10, border: '1px solid #d1d5db', overflow: 'hidden', background: '#fff' };
const bondZaPrefix = { display: 'flex', alignItems: 'center', padding: '0 14px', background: 'rgba(17, 87, 92, 0.12)', color: '#11575C', fontWeight: 700, fontSize: 15 };
const bondZaSuffix = { display: 'flex', alignItems: 'center', padding: '0 14px', background: 'rgba(17, 87, 92, 0.12)', color: '#11575C', fontWeight: 600, fontSize: 15 };
const bondZaInputField = { flex: 1, border: 'none', padding: '12px 14px', fontSize: 16, minWidth: 0, boxSizing: 'border-box', outline: 'none' };
const bondZaResultMuted = { fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 6 };

const sectionTitle = { color: '#11575C', marginBottom: '15px' };
const descText = { color: '#64748b', lineHeight: '1.6', fontSize: '14px', textAlign: 'justify' };
// Info tabs — horizontal card with vertical tab bar
const INFO_TABS_HEIGHT = 480;
const infoTabsCard = {
    display: 'flex', flexDirection: 'row', borderRadius: 20, overflow: 'hidden',
    border: 'none', background: '#f3f3f3', marginBottom: 60,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)', height: INFO_TABS_HEIGHT,
};
const infoTabsTextCol = {
    flex: '1 1 0%', padding: '28px 24px 28px 28px', display: 'flex', flexDirection: 'column',
    justifyContent: 'flex-start', minWidth: 0, background: '#f3f3f3',
};
const infoTabsTitle = {
    fontSize: 20, fontWeight: 700, color: '#11575C', margin: '0 0 14px', lineHeight: 1.3,
    flexShrink: 0,
};
const infoTabsDescWrap = {
    flex: '1 1 0%', overflowY: 'auto', minHeight: 0,
};
const infoTabsDesc = {
    color: '#64748b', fontSize: 14, lineHeight: 1.7, textAlign: 'justify', margin: 0,
};
const infoTabsDashCol = {
    flex: `0 0 ${INFO_TABS_HEIGHT + 20}px`, padding: '10px 12px 6px', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
};
const infoTabsDashScroll = {
    flex: '1 1 0%', overflowY: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8,
};
const infoTabsBarCol = {
    display: 'flex', flexDirection: 'row', flexShrink: 0,
};
const infoTabBtn = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
    padding: '20px 8px 20px', border: 'none', cursor: 'pointer', width: 56,
    background: '#f3f3f3', borderLeft: '1px solid #e2e8f0',
    fontFamily: "'Inter', sans-serif", transition: 'color .2s',
};
const infoTabBtnText = {
    writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)',
    fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    whiteSpace: 'nowrap', marginTop: 'auto',
};

const amenitiesCard = {
    flex: '1 1 0%', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px',
    background: '#fff', display: 'flex', flexDirection: 'column', minWidth: 0,
};
const amenitiesList = { fontSize: 14, color: '#333', flex: '1 1 0%', overflowY: 'auto' };
const metaCard = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 };
const metaCardTitle = { color: '#11575C', fontSize: 14, fontWeight: 700, marginBottom: 10, marginTop: 0 };
const priceChartWrap = { width: '100%', minHeight: 280 };
const priceChartTooltip = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '13px', color: '#334155' };
const metaCardText = { color: '#334155', fontSize: 14, margin: '0 0 6px', lineHeight: 1.4 };
const metaCardMuted = { color: '#64748b', fontSize: 13, margin: '0 0 4px', lineHeight: 1.4 };
const metaPill = { background: '#e0f2fe', color: '#0c4a6e', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 };
const MAP_WIDTH = INFO_TABS_HEIGHT + 5 * 56;
const mapVisual = { flex: `0 0 ${MAP_WIDTH}px`, height: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative', background: '#e2e8f0' };
const floatPinCard = { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '10px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' };

// AGENT CONTACT SECTION
const contactSectionWrap = {
    width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginTop: 0, padding: '60px 0',
    background: 'linear-gradient(135deg, #0a3d40 0%, #11575C 40%, #1a6b70 100%)',
    position: 'relative', overflow: 'hidden',
};
const contactSectionInner = { maxWidth: 1200, margin: '0 auto', padding: '0 20px' };
const contactCard = {
    display: 'grid', gap: 30, padding: 32, borderRadius: 20,
    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
};
const contactAgentFloatCard = {
    flex: '0 0 240px', background: '#fff', borderRadius: 20, padding: '32px 24px',
    textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)', alignSelf: 'stretch',
};
const contactAgentImgRing = {
    width: 110, height: 110, borderRadius: '50%', padding: 4,
    background: 'linear-gradient(135deg, #ffc801 0%, #ffc801 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
};
const contactAgentImg = { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' };
const contactAgentName = { margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: '#0f3a3e' };
const contactAgentRole = { margin: '0 0 14px', fontSize: 13, color: '#64748b', fontWeight: 500 };
const contactAgentDetail = {
    display: 'flex', alignItems: 'center', fontSize: 13, color: '#475569', margin: '0 0 8px',
    lineHeight: 1.4, wordBreak: 'break-word',
};
const contactFormCol = { padding: '0 8px' };
const contactInput = {
    width: '100%', padding: '13px 18px', borderRadius: 25, border: '1px solid #fff',
    background: '#f3f3f3', fontSize: 13, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color .2s', fontFamily: 'inherit', color: '#334155',
};
const contactTextarea = {
    ...contactInput, borderRadius: 16, resize: 'vertical', minHeight: 110, lineHeight: 1.5,
};
const contactToggleWrap = {
    background: '#f3f3f3', borderRadius: 25, border: '1px solid #fff',
    display: 'inline-flex', padding: 2,
};
const contactToggleInactive = {
    background: 'transparent', border: 'none', padding: '9px 18px', fontSize: 12,
    borderRadius: 22, cursor: 'pointer', color: '#64748b', fontFamily: 'inherit', fontWeight: 500,
};
const contactToggleActive = {
    ...contactToggleInactive, background: '#ffc801', color: '#0f172a', fontWeight: 700,
};
const contactSubmitBtn = {
    background: '#11575C', color: '#fff', border: 'none', padding: '12px 28px',
    borderRadius: 25, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    transition: 'background .2s',
};
const contactCalCol = { display: 'flex', flexDirection: 'column' };
const contactCalCard = {
    background: '#fff', padding: 12, borderRadius: 14, border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};
const contactCalNav = {
    background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#11575C',
    padding: '0 6px', fontWeight: 700, lineHeight: 1,
};
const contactTimeBtn = {
    width: '100%', padding: '8px 14px', borderRadius: 22, border: '1px solid #e2e8f0',
    background: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex',
    justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', color: '#475569',
};
const contactTimeDropdown = {
    position: 'absolute', bottom: '100%', left: 0, width: '100%', background: '#fff',
    border: '1px solid #e2e8f0', borderRadius: 10, zIndex: 10, maxHeight: 160,
    overflowY: 'auto', boxShadow: '0 -4px 12px rgba(0,0,0,0.08)', marginBottom: 4,
};

// Modal
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' };
const closeBtn = { position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' };
const calcModal = { background: 'white', padding: '30px', borderRadius: '16px', width: '400px', position: 'relative' };
const calcResultBox = { background: '#f3f4f6', padding: '20px', borderRadius: '12px', textAlign: 'center', marginTop: '20px' };

export default Property;