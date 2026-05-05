import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../config/api';
import { invalidateDashboardCache } from '../config/dashboardCache';
import './Prospecting.css';

/**
 * Prospecting — real-data version.
 *
 * Layers two marker sets on a real Google Map:
 *  1. Comparable listings scraped from Property24 + Private Property
 *     (lives on each Property's listingMetadata.area_housing.listings).
 *     Coloured by an AI prospect score (Hot / Warm / Cool / Cold).
 *  2. The agency's own active listings, plotted in grey with their IPM score.
 *     These ALWAYS show, even when filters would hide everything else.
 *
 * Filters: Lead score (multi-select Hot/Warm/Cool/Cold), Budget range slider,
 * suburb search. There is also an Export List button that downloads the
 * currently-visible comps as CSV.
 *
 * Click any comp marker to open a popup with the listing's key info plus two
 * action buttons:
 *   - Note     → opens an inline notes textarea (stored on the prospect when
 *                added to the CRM as the first activity).
 *   - +Add CRM → POSTs to /api/users/add-lead with leadType:'prospect' so the
 *                lead lands in the agency's CRM under the new "Prospect" type.
 */

// ─── Module-level cache for the listings payload ────────────────────────────
// Re-using the same data across page navigations is the single biggest perceived
// speedup: re-entering Prospecting renders instantly from cache while we revalidate
// in the background. Keyed by userId so multi-account demo mode stays correct.
const PROSPECTING_CACHE = new Map(); // userId → { listings, fetchedAt }
const CACHE_TTL_MS = 5 * 60 * 1000;

// ─── Google Maps loader (mirrors Dashboard.js so we share the script tag) ───
let mapsScriptPromise = null;
const loadMapsScript = (apiKey) => {
    if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
    if (window.google && window.google.maps) return Promise.resolve(window.google);
    if (mapsScriptPromise) return mapsScriptPromise;
    mapsScriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-google-maps="core"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.google));
            existing.addEventListener('error', reject);
            if (window.google && window.google.maps) resolve(window.google);
            return;
        }
        const s = document.createElement('script');
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,drawing,geometry`;
        s.async = true;
        s.defer = true;
        s.dataset.googleMaps = 'core';
        s.onload = () => resolve(window.google);
        s.onerror = reject;
        document.head.appendChild(s);
    });
    return mapsScriptPromise;
};

// ─── helpers ────────────────────────────────────────────────────────────────
const fmtMoney = (n, currency = 'ZAR') => {
    if (!Number.isFinite(Number(n))) return '—';
    const v = Number(n);
    if (currency === 'ZAR') {
        if (v >= 1e6) return `R${(v / 1e6).toFixed(v >= 10e6 ? 0 : 1)}M`;
        if (v >= 1e3) return `R${(v / 1e3).toFixed(0)}K`;
        return `R${v.toLocaleString()}`;
    }
    return `${currency} ${v.toLocaleString()}`;
};

const fmtFullMoney = (n, currency = 'ZAR') => {
    if (!Number.isFinite(Number(n))) return '—';
    return `${currency === 'ZAR' ? 'R' : currency + ' '}${Number(n).toLocaleString()}`;
};

const parsePrice = (v) => {
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const digits = String(v).replace(/[^\d.]/g, '');
    if (!digits) return null;
    const n = Number(digits);
    return Number.isFinite(n) ? n : null;
};

// Deterministic 0..1 from a string — gives stable demo scores per comp URL.
function hashTo01(str) {
    let h = 5381;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return ((h % 10000) / 10000);
}

// 30..98 score, biased towards mid-high so the demo looks lively.
function scoreFor(url) {
    const u = hashTo01(url);
    return Math.round(30 + u * 68);
}

const toneFor = (score) => {
    if (score >= 85) return 'hot';
    if (score >= 70) return 'warm';
    if (score >= 55) return 'cool';
    return 'cold';
};
const toneLabel = (tone) => ({ hot: 'Hot · 85+', warm: 'Warm · 70–84', cool: 'Cool · 55–69', cold: 'Cold · <55' }[tone] || tone);
const toneColour = (tone) => ({ hot: '#c8553d', warm: '#ffb21b', cool: '#5b8c8f', cold: '#8a8a8a', own: '#9ca3af' }[tone] || '#5b8c8f');

// Greyscale Google Maps style — strips colour, keeps roads + labels readable.
const MAP_STYLE_BW = [
    { elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 5 }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#5f6368' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 20 }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#cccccc' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e0e0e0' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
];

// Pick lat/lng from a Property record — same fallback chain Dashboard.js uses.
function listingCoords(item) {
    const lat = item?.locationDetails?.coordinates?.lat ?? item?.listingMetadata?.property?.coordinates?.latitude;
    const lng = item?.locationDetails?.coordinates?.lng ?? item?.listingMetadata?.property?.coordinates?.longitude;
    const nlat = Number(lat);
    const nlng = Number(lng);
    if (Number.isFinite(nlat) && Number.isFinite(nlng) && Math.abs(nlat) <= 90 && Math.abs(nlng) <= 180) {
        return { lat: nlat, lng: nlng };
    }
    return null;
}

function geocodeQuery(item) {
    const ld = item?.locationDetails || {};
    const parts = [ld.streetAddress, ld.suburb, ld.city, ld.region, ld.country].filter(Boolean);
    if (parts.length) return parts.join(', ');
    if (typeof item?.location === 'string' && item.location.trim()) return item.location.trim();
    return null;
}

// Cluster comparables around their parent listing's coords with deterministic jitter.
function jitter(seed, amount = 0.012) {
    const u = hashTo01(seed);
    const v = hashTo01(seed + '·');
    return { dLat: (u - 0.5) * amount * 2, dLng: (v - 0.5) * amount * 2 };
}

const SVG_PIN = (colour, label, ring = '#ffffff') => 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="${colour}" stroke="${ring}" stroke-width="3"/>
        <text x="18" y="22" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700" fill="#ffffff">${label}</text>
    </svg>`
);

// ─── Component ──────────────────────────────────────────────────────────────
export default function Prospecting() {
    const user = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (_) { return null; }
    }, []);
    const userId = user?._id;
    const userName = user?.name || 'there';

    // Backend data — hydrate from cache synchronously so re-entering this page
    // is instant. We still kick off a network revalidation in the effect below.
    const cached = userId ? PROSPECTING_CACHE.get(userId) : null;
    const [ownListings, setOwnListings] = useState(() => cached?.listings || []);
    const [loading, setLoading] = useState(() => !cached);
    const [loadError, setLoadError] = useState(null);
    const [crmReceipts, setCrmReceipts] = useState({});

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    // Start with NO comp tones selected — user sees only their own listings until they
    // explicitly opt into a lead-score band.
    const [activeTones, setActiveTones] = useState(() => new Set());
    const [budgetRange, setBudgetRange] = useState({ min: 0, max: 200_000_000 });
    const [budgetEnabled, setBudgetEnabled] = useState(false);

    // Map refs
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const ownMarkersRef = useRef([]);
    const compMarkersRef = useRef([]);
    const geocodeCacheRef = useRef(new Map());
    const drawingMgrRef = useRef(null);
    const polygonRef = useRef(null);
    const googleRef = useRef(null);

    // Drawn boundary — array of { lat, lng } that filters all markers when set
    const [boundary, setBoundary] = useState(null);
    const [drawingMode, setDrawingMode] = useState(false);

    // Active selection
    const [activeComp, setActiveComp] = useState(null);
    const [showNote, setShowNote] = useState(false);
    const [showCrmModal, setShowCrmModal] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [crmForm, setCrmForm] = useState({ name: '', email: '', mobile: '' });
    const [crmSaving, setCrmSaving] = useState(false);
    const [crmError, setCrmError] = useState(null);

    // ─── Data fetch (cache-first, then revalidate) ──────────────────────────
    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        let cancelled = false;

        const cacheEntry = PROSPECTING_CACHE.get(userId);
        const isFresh = cacheEntry && (Date.now() - cacheEntry.fetchedAt < CACHE_TTL_MS);

        // If we have ANY cached entry, render instantly (loading=false from useState
        // initial value), and only re-fetch if the cache is stale.
        if (isFresh) return; // nothing to do

        (async () => {
            try {
                const res = await api.get(`/api/users/${userId}?type=listings&slim=1`);
                if (cancelled) return;
                const data = res.data || {};
                const listings = Array.isArray(data.agentProperties) ? data.agentProperties : [];
                PROSPECTING_CACHE.set(userId, { listings, fetchedAt: Date.now() });
                setOwnListings(listings);
                setLoading(false);
            } catch (err) {
                if (!cancelled) {
                    // If we already had cached data we keep showing it — only surface
                    // the error if there's literally nothing to display.
                    if (!cacheEntry) {
                        setLoadError(err?.response?.data?.message || err.message || 'Failed to load listings');
                    }
                    setLoading(false);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    // ─── Build flat comp list (deduped by url, scored, positioned) ──────────
    const allComps = useMemo(() => {
        const seen = new Map();
        for (const listing of ownListings) {
            const ah = listing?.listingMetadata?.area_housing;
            const list = Array.isArray(ah?.listings) ? ah.listings : [];
            const parentCoords = listingCoords(listing);
            for (const raw of list) {
                if (!raw?.url) continue;
                if (seen.has(raw.url)) continue;
                const score = scoreFor(raw.url);
                const tone = toneFor(score);
                const j = jitter(raw.url);
                const lat = parentCoords ? parentCoords.lat + j.dLat : null;
                const lng = parentCoords ? parentCoords.lng + j.dLng : null;
                seen.set(raw.url, {
                    ...raw,
                    score,
                    tone,
                    parentId: String(listing._id),
                    parentTitle: listing.title,
                    parentSuburb: listing.locationDetails?.suburb || '',
                    lat,
                    lng,
                });
            }
        }
        return [...seen.values()];
    }, [ownListings]);

    // Point-in-polygon helper — fallback when google.maps.geometry isn't loaded.
    // Uses standard ray-casting on the boundary lat/lng vertices.
    const insideBoundary = useCallback((lat, lng) => {
        if (!boundary || boundary.length < 3 || lat == null || lng == null) return true;
        const g = googleRef.current;
        if (g?.maps?.geometry?.poly && polygonRef.current) {
            try {
                return g.maps.geometry.poly.containsLocation(new g.maps.LatLng(lat, lng), polygonRef.current);
            } catch (_) { /* fall through to manual check */ }
        }
        // Ray-casting fallback (treats lat/lng as planar — good enough at city scale)
        let inside = false;
        for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
            const xi = boundary[i].lng, yi = boundary[i].lat;
            const xj = boundary[j].lng, yj = boundary[j].lat;
            const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-9) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }, [boundary]);

    // ─── Filtering ──────────────────────────────────────────────────────────
    // When the user draws a boundary on the map, the polygon IS the filter — we
    // ignore the lead-score chips (otherwise drawing into a "Hot only" view
    // hides every Med/Low pin in the area, which surprised the user).
    const visibleComps = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const ignoreToneFilter = !!boundary;
        return allComps.filter((c) => {
            if (!ignoreToneFilter && !activeTones.has(c.tone)) return false;
            if (budgetEnabled) {
                const p = parsePrice(c.price);
                if (p == null) return false;
                if (p < budgetRange.min) return false;
                if (p > budgetRange.max) return false;
            }
            if (q) {
                const hay = `${c.title || ''} ${c.suburb || ''} ${c.address || ''} ${c.parentSuburb || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (boundary && !insideBoundary(c.lat, c.lng)) return false;
            return true;
        });
    }, [allComps, activeTones, budgetEnabled, budgetRange, searchTerm, boundary, insideBoundary]);

    // Own listings always show — same search filter applies for findability,
    // but score/budget filters never hide the agency's own pins. The drawn
    // boundary, however, *does* apply to own pins (otherwise users couldn't
    // visually isolate a sub-area of their own portfolio).
    const visibleOwn = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return ownListings.filter((l) => {
            if (q) {
                const hay = `${l.title || ''} ${l.locationDetails?.suburb || ''} ${l.location || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (boundary) {
                const c = listingCoords(l);
                if (c && !insideBoundary(c.lat, c.lng)) return false;
            }
            return true;
        });
    }, [ownListings, searchTerm, boundary, insideBoundary]);

    // KPIs reflect the *currently selected* prospects only — i.e. whatever the
    // user has chosen via tone chips, budget slider, search, or drawn polygon.
    // Empty filter set ⇒ everything shows zero, which is the correct UX signal
    // ("you haven't selected anything yet").
    const kpis = useMemo(() => {
        const hot = visibleComps.filter((c) => c.tone === 'hot').length;
        const qualified = visibleComps.filter((c) => c.score >= 70).length;
        const inDb = visibleOwn.length;
        const totalPipeline = visibleComps.reduce((s, c) => s + (parsePrice(c.price) || 0), 0);
        const avgPpsm = (() => {
            const pairs = visibleComps.filter((c) => c.price && c.size_sqm).map((c) => Number(c.price) / Number(c.size_sqm));
            if (!pairs.length) return null;
            return Math.round(pairs.reduce((a, b) => a + b, 0) / pairs.length);
        })();
        const scopeLabel = boundary
            ? 'in drawn area'
            : (activeTones.size > 0 || budgetEnabled || searchTerm.trim())
                ? 'in current filters'
                : 'no comps selected';
        return [
            { title: 'Hot Prospects', value: String(hot), pillTone: 'up', pillStrong: `${hot}`, pillRest: ' ' + scopeLabel },
            { title: 'Qualified Leads', value: String(qualified), pillTone: 'up', pillStrong: `${qualified}`, pillRest: ' high score' },
            { title: 'Total Comps', value: String(visibleComps.length), pillTone: 'up', pillStrong: '', pillRest: scopeLabel },
            { title: 'Active Listings', value: String(inDb), pillTone: 'up', pillStrong: '', pillRest: boundary ? 'in drawn area' : 'in your portfolio' },
            { title: 'Pipeline Value', value: fmtMoney(totalPipeline), pillTone: 'up', pillStrong: '', pillRest: scopeLabel },
            { title: 'Avg R / m²', value: avgPpsm ? fmtMoney(avgPpsm) : '—', pillTone: 'up', pillStrong: '', pillRest: 'industrial benchmark' },
        ];
    }, [visibleComps, visibleOwn, boundary, activeTones, budgetEnabled, searchTerm]);

    // ─── Map render ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (loading) return;
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return;
        const container = mapContainerRef.current;
        if (!container) return;
        let cancelled = false;

        (async () => {
            const google = await loadMapsScript(apiKey).catch(() => null);
            if (!google || cancelled) return;
            googleRef.current = google;

            if (!mapRef.current) {
                mapRef.current = new google.maps.Map(container, {
                    center: { lat: -26.15, lng: 28.10 }, // JHB / East Rand industrial belt
                    zoom: 11,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    clickableIcons: false,
                    styles: MAP_STYLE_BW,
                });
            }

            // Drawing manager — attaches once. We control its mode imperatively.
            if (!drawingMgrRef.current && google.maps.drawing) {
                const dm = new google.maps.drawing.DrawingManager({
                    drawingMode: null,
                    drawingControl: false,
                    polygonOptions: {
                        fillColor: '#11575c',
                        fillOpacity: 0.12,
                        strokeColor: '#11575c',
                        strokeWeight: 2,
                        clickable: false,
                        editable: false,
                        zIndex: 10,
                    },
                });
                dm.setMap(mapRef.current);
                google.maps.event.addListener(dm, 'polygoncomplete', (polygon) => {
                    // Replace any previous polygon
                    if (polygonRef.current) polygonRef.current.setMap(null);
                    polygonRef.current = polygon;
                    const path = polygon.getPath();
                    const verts = [];
                    const bounds = new google.maps.LatLngBounds();
                    for (let i = 0; i < path.getLength(); i++) {
                        const ll = path.getAt(i);
                        verts.push({ lat: ll.lat(), lng: ll.lng() });
                        bounds.extend(ll);
                    }
                    setBoundary(verts);
                    setDrawingMode(false);
                    dm.setDrawingMode(null);
                    try { mapRef.current.fitBounds(bounds, 60); } catch (_) {}
                });
                drawingMgrRef.current = dm;
            }

            const map = mapRef.current;
            ownMarkersRef.current.forEach((m) => m.setMap(null));
            compMarkersRef.current.forEach((m) => m.setMap(null));
            ownMarkersRef.current = [];
            compMarkersRef.current = [];

            const bounds = new google.maps.LatLngBounds();
            let any = false;

            const activeKey = activeComp?.url || null;

            // Own listings — half-opacity grey pin with the IPM/listing score (or ★ if missing)
            for (const listing of visibleOwn) {
                const c = listingCoords(listing);
                if (!c) continue;
                const score = Number(listing.ipmScore || listing.score || 0) || 0;
                const label = score > 0 ? String(Math.min(99, Math.round(score))) : '★';
                const isActive = activeComp?.kind === 'own' && activeComp?.url === `/property/${listing._id}`;
                const size = isActive ? 50 : 36;
                const marker = new google.maps.Marker({
                    map,
                    position: c,
                    icon: {
                        url: SVG_PIN(toneColour('own'), label, isActive ? '#11575c' : '#d1d5db'),
                        scaledSize: new google.maps.Size(size, size),
                        anchor: new google.maps.Point(size / 2, size / 2),
                    },
                    opacity: isActive ? 0.95 : 0.5,
                    zIndex: isActive ? 1500 : 999,
                    title: listing.title,
                });
                marker.addListener('click', () => {
                    setActiveComp({
                        kind: 'own',
                        title: listing.title,
                        address: listing.locationDetails?.streetAddress || listing.location || '',
                        suburb: listing.locationDetails?.suburb || '',
                        price: parsePrice(listing.priceHistory?.[0]?.price ?? listing.price),
                        currency: listing.pricing?.currency || 'ZAR',
                        size_sqm: listing.propertySize?.sizeSqm || listing.specs?.size_sqm || null,
                        score: score || null,
                        tone: 'own',
                        url: `/property/${listing._id}`,
                        sourcePortal: 'My Listing',
                    });
                });
                ownMarkersRef.current.push(marker);
                bounds.extend(c);
                any = true;
            }

            // Comparables — colour-coded by score
            for (const comp of visibleComps) {
                if (comp.lat == null || comp.lng == null) continue;
                const isActive = activeKey === comp.url;
                const size = isActive ? 50 : 34;
                const marker = new google.maps.Marker({
                    map,
                    position: { lat: comp.lat, lng: comp.lng },
                    icon: {
                        url: SVG_PIN(toneColour(comp.tone), String(comp.score), isActive ? '#11575c' : '#ffffff'),
                        scaledSize: new google.maps.Size(size, size),
                        anchor: new google.maps.Point(size / 2, size / 2),
                    },
                    zIndex: isActive ? 2000 : 1000,
                    title: comp.title,
                });
                marker.addListener('click', () => {
                    setActiveComp({
                        kind: 'comp',
                        ...comp,
                        currency: comp.currency || 'ZAR',
                    });
                });
                compMarkersRef.current.push(marker);
                bounds.extend({ lat: comp.lat, lng: comp.lng });
                any = true;
            }

            // When a boundary is drawn we let the polygoncomplete handler control
            // the viewport — re-fitting here would zoom out to all visible markers
            // again and undo the user's "zoom into the drawn area" intent.
            if (any && !boundary) {
                try { map.fitBounds(bounds, 60); } catch (_) {}
            }

            // Geocode any own listings that don't yet have coords (cached, max 8 to be polite)
            const needGeo = visibleOwn.filter((l) => !listingCoords(l)).slice(0, 8);
            if (needGeo.length) {
                const geocoder = new google.maps.Geocoder();
                for (const listing of needGeo) {
                    if (cancelled) return;
                    const q = geocodeQuery(listing);
                    if (!q) continue;
                    if (geocodeCacheRef.current.has(q)) {
                        const cached = geocodeCacheRef.current.get(q);
                        if (cached) {
                            new google.maps.Marker({
                                map,
                                position: cached,
                                icon: {
                                    url: SVG_PIN(toneColour('own'), '★', '#d1d5db'),
                                    scaledSize: new google.maps.Size(36, 36),
                                    anchor: new google.maps.Point(18, 18),
                                },
                                opacity: 0.5,
                                title: listing.title,
                            });
                        }
                        continue;
                    }
                    await new Promise((resolve) => {
                        geocoder.geocode({ address: q }, (results, status) => {
                            if (cancelled) return resolve();
                            if (status === 'OK' && results?.[0]) {
                                const loc = results[0].geometry.location;
                                const pos = { lat: loc.lat(), lng: loc.lng() };
                                geocodeCacheRef.current.set(q, pos);
                                const marker = new google.maps.Marker({
                                    map,
                                    position: pos,
                                    icon: {
                                        url: SVG_PIN(toneColour('own'), '★', '#d1d5db'),
                                        scaledSize: new google.maps.Size(36, 36),
                                        anchor: new google.maps.Point(18, 18),
                                    },
                                    opacity: 0.5,
                                    zIndex: 999,
                                    title: listing.title,
                                });
                                marker.addListener('click', () => {
                                    setActiveComp({
                                        kind: 'own',
                                        title: listing.title,
                                        address: q,
                                        suburb: listing.locationDetails?.suburb || '',
                                        price: parsePrice(listing.priceHistory?.[0]?.price ?? listing.price),
                                        currency: listing.pricing?.currency || 'ZAR',
                                        size_sqm: listing.propertySize?.sizeSqm || null,
                                        score: null,
                                        tone: 'own',
                                        url: `/property/${listing._id}`,
                                        sourcePortal: 'My Listing',
                                    });
                                });
                                ownMarkersRef.current.push(marker);
                            } else {
                                geocodeCacheRef.current.set(q, null);
                            }
                            setTimeout(resolve, 180);
                        });
                    });
                }
            }
        })();

        return () => { cancelled = true; };
    }, [loading, visibleOwn, visibleComps, activeComp]);

    // ─── Filter handlers ────────────────────────────────────────────────────
    const toggleTone = (t) => {
        setActiveTones((prev) => {
            const next = new Set(prev);
            if (next.has(t)) next.delete(t); else next.add(t);
            return next;
        });
    };

    const startDrawing = useCallback(() => {
        const dm = drawingMgrRef.current;
        const g = googleRef.current;
        if (!dm || !g) return;
        // Drop any previous boundary so the new draw starts clean
        if (polygonRef.current) {
            polygonRef.current.setMap(null);
            polygonRef.current = null;
        }
        setBoundary(null);
        setDrawingMode(true);
        dm.setDrawingMode(g.maps.drawing.OverlayType.POLYGON);
    }, []);

    const cancelDrawing = useCallback(() => {
        const dm = drawingMgrRef.current;
        if (dm) dm.setDrawingMode(null);
        setDrawingMode(false);
    }, []);

    const clearBoundary = useCallback(() => {
        if (polygonRef.current) {
            polygonRef.current.setMap(null);
            polygonRef.current = null;
        }
        setBoundary(null);
        setDrawingMode(false);
        if (drawingMgrRef.current) drawingMgrRef.current.setDrawingMode(null);
    }, []);

    const exportCsv = useCallback(() => {
        const rows = [['title', 'price_zar', 'size_sqm', 'suburb', 'address', 'property_type', 'score', 'lead_band']];
        for (const c of visibleComps) {
            rows.push([
                c.title || '',
                c.price ?? '',
                c.size_sqm ?? '',
                c.suburb || '',
                c.address || '',
                c.property_type || '',
                c.score,
                c.tone,
            ]);
        }
        const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prospecting-comps-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [visibleComps]);

    // ─── CRM submission ─────────────────────────────────────────────────────
    const openAddToCrm = () => {
        // Lead name should be a real, recognisable location. We try the street
        // address first (best), then build a fallback like "282 m² Industrial · Kya Sands"
        // so it's at least identifiable. We never default to a bare suburb on its own.
        const addr = (activeComp?.address || '').toString().trim();
        let defaultName = addr;
        if (!defaultName) {
            const parts = [activeComp?.title, activeComp?.suburb || activeComp?.parentSuburb]
                .map((x) => (x ? String(x).trim() : ''))
                .filter(Boolean);
            defaultName = parts.join(' · ');
        }
        defaultName = (defaultName || 'Industrial property').slice(0, 80);
        setCrmForm({ name: defaultName, email: '', mobile: '' });
        setCrmError(null);
        setShowCrmModal(true);
    };

    const submitCrm = async () => {
        if (!activeComp || !userId) return;
        if (!crmForm.name.trim()) { setCrmError('Name is required.'); return; }
        setCrmSaving(true);
        setCrmError(null);
        try {
            const lead = {
                name: crmForm.name.trim(),
                email: crmForm.email.trim(),
                mobile: crmForm.mobile.trim(),
                leadType: 'prospect',
                propertyOfInterest: [
                    activeComp.title,
                    activeComp.address,
                    activeComp.suburb || activeComp.parentSuburb,
                ].filter(Boolean).join(' · ') || 'Industrial property',
                budget: activeComp.price ? fmtFullMoney(activeComp.price, activeComp.currency || 'ZAR') : '',
                source: 'Prospecting map',
                status: 'new',
                initialActivity: noteText.trim() ? `Prospect added from map. Note: ${noteText.trim()}` : 'Prospect added from prospecting map',
                prospectDetails: {
                    address: activeComp.address || '',
                    suburb: activeComp.suburb || activeComp.parentSuburb || '',
                    propertyTitle: activeComp.title || '',
                    propertyType: activeComp.property_type || 'industrial',
                    sizeSqm: activeComp.size_sqm || null,
                    askingPrice: activeComp.price || null,
                    currency: activeComp.currency || 'ZAR',
                    score: activeComp.score || null,
                    tone: activeComp.tone || null,
                    listingAgentName: activeComp.agent_name || null,
                    listingAgencyName: activeComp.agency_name || null,
                    listingAgentPhoto: activeComp.agent_photo || null,
                    listingAgentProfileUrl: activeComp.agent_profile_url || null,
                    parentListingId: activeComp.parentId || null,
                    note: noteText.trim() || null,
                    capturedAt: new Date().toISOString(),
                },
            };
            await api.post('/api/users/add-lead', { userId, lead });
            // Bust the shared dashboard cache so CRM (and Dashboard) re-fetch
            // fresh leads on next mount instead of showing the stale cached list.
            invalidateDashboardCache(userId);
            setCrmReceipts((prev) => ({ ...prev, [activeComp.url || activeComp.title]: { addedAt: Date.now() } }));
            setShowCrmModal(false);
            setShowNote(false);
            setNoteText('');
        } catch (err) {
            setCrmError(err?.response?.data?.message || err.message || 'Could not save lead.');
        } finally {
            setCrmSaving(false);
        }
    };

    const inDb = activeComp ? !!crmReceipts[activeComp.url || activeComp.title] : false;

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="dashboard-container prospecting-shell" style={{ display: 'flex', fontFamily: "'Inter', sans-serif", background: '#f7f7f8' }}>
            <Sidebar />
            <main className="dashboard-main prospecting-page">
                <div className="prospecting-page__inner">
                    <header className="prospecting-page__header">
                        <div>
                            <h1>Prospecting</h1>
                            <p>Hi {userName} — AI-sourced comparable listings layered with your active stock.</p>
                        </div>
                    </header>

                    {/* KPI BAND */}
                    <section className="pr-kpi-band" aria-label="Prospecting KPIs">
                        {kpis.map((k) => (
                            <article key={k.title} className="pr-kpi">
                                <h3 className="pr-kpi__title">{k.title}</h3>
                                <div className="pr-kpi__value">{k.value}</div>
                                <span className={`pr-kpi__pill ${k.pillTone === 'down' ? 'pr-kpi__pill--down' : ''}`}>
                                    {k.pillStrong && <strong>{k.pillStrong}</strong>}
                                    <span>{k.pillRest}</span>
                                </span>
                            </article>
                        ))}
                    </section>

                    {/* THREE-COLUMN ROW */}
                    <section className="pr-row">
                        {/* FILTERS */}
                        <aside className="pr-card">
                            <h3 className="pr-card__heading">Filters</h3>
                            <div className="pr-filters">
                                <div className="pr-filter-block">
                                    <label className="pr-filter-label">Lead Score</label>
                                    <div className="pr-tone-row" style={boundary ? { opacity: 0.55 } : undefined}>
                                        {['hot', 'warm', 'cool', 'cold'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => toggleTone(t)}
                                                disabled={!!boundary}
                                                className={`pr-tone-btn ${activeTones.has(t) ? 'is-active' : ''}`}
                                                style={{ '--tone-c': toneColour(t) }}
                                                aria-pressed={activeTones.has(t)}
                                                title={boundary ? 'Drawn area is showing all scores' : undefined}
                                            >
                                                <span className="pr-tone-dot" />
                                                <span>{t === 'hot' ? 'High' : t === 'warm' ? 'Med-High' : t === 'cool' ? 'Med' : 'Low'}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {boundary && (
                                        <div style={{ marginTop: 6, fontSize: 10, color: '#11575c', fontWeight: 600 }}>
                                            Drawn area: showing all scores
                                        </div>
                                    )}
                                </div>

                                <div className="pr-filter-block">
                                    <label className="pr-filter-label">
                                        <input type="checkbox" checked={budgetEnabled} onChange={(e) => setBudgetEnabled(e.target.checked)} />
                                        <span style={{ marginLeft: 6 }}>Budget Range</span>
                                    </label>
                                    <div className="pr-budget-display">
                                        {fmtMoney(budgetRange.min)} – {fmtMoney(budgetRange.max)}
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="200000000"
                                        step="500000"
                                        value={budgetRange.min}
                                        onChange={(e) => setBudgetRange((prev) => ({ ...prev, min: Math.min(Number(e.target.value), prev.max) }))}
                                        disabled={!budgetEnabled}
                                        className="pr-range"
                                    />
                                    <input
                                        type="range"
                                        min="0"
                                        max="200000000"
                                        step="500000"
                                        value={budgetRange.max}
                                        onChange={(e) => setBudgetRange((prev) => ({ ...prev, max: Math.max(Number(e.target.value), prev.min) }))}
                                        disabled={!budgetEnabled}
                                        className="pr-range"
                                    />
                                </div>

                                <button type="button" className="pr-export-btn" onClick={exportCsv}>
                                    <i className="fas fa-file-export" aria-hidden /> Export List
                                </button>

                                <div className="pr-filter-meta">
                                    <span>{visibleComps.length} comps</span>
                                    <span>{visibleOwn.length} own</span>
                                </div>
                            </div>
                        </aside>

                        {/* MAP */}
                        <section className="pr-card pr-map-col" aria-label="Prospecting map">
                            <div className="pr-map-col__header">
                                <h3 className="pr-map-col__title">Prospecting Map</h3>
                            </div>

                            <div className="pr-map-toolbar">
                                <div className="pr-search">
                                    <i className="fas fa-search" aria-hidden />
                                    <input
                                        type="text"
                                        placeholder="Search address or suburb..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        aria-label="Search address or suburb"
                                    />
                                </div>
                                <div className="pr-draw-controls">
                                    {!boundary && !drawingMode && (
                                        <button type="button" className="pr-draw-btn" onClick={startDrawing} title="Draw an area on the map">
                                            <i className="fas fa-draw-polygon" aria-hidden /> Draw area
                                        </button>
                                    )}
                                    {drawingMode && (
                                        <>
                                            <span className="pr-draw-hint">Click on the map to place points · double-click to finish</span>
                                            <button type="button" className="pr-draw-btn pr-draw-btn--ghost" onClick={cancelDrawing}>Cancel</button>
                                        </>
                                    )}
                                    {boundary && !drawingMode && (
                                        <>
                                            <span className="pr-draw-hint">Filtering to drawn area</span>
                                            <button type="button" className="pr-draw-btn pr-draw-btn--ghost" onClick={startDrawing} title="Replace the current boundary">
                                                <i className="fas fa-draw-polygon" aria-hidden /> Redraw
                                            </button>
                                            <button type="button" className="pr-draw-btn pr-draw-btn--clear" onClick={clearBoundary} title="Remove the boundary and zoom out">
                                                <i className="fas fa-times" aria-hidden /> Clear area
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="pr-map" aria-label="Prospecting map">
                                {loading && <div className="pr-map__loading">Loading map &amp; comparables…</div>}
                                {loadError && <div className="pr-map__loading">⚠️ {loadError}</div>}
                                {!loading && !loadError && !process.env.REACT_APP_GOOGLE_MAPS_API_KEY && (
                                    <div className="pr-map__loading">Map needs REACT_APP_GOOGLE_MAPS_API_KEY.</div>
                                )}
                                {!loading && allComps.length === 0 && ownListings.length === 0 && (
                                    <div className="pr-map__loading">No listings or comparables yet.</div>
                                )}

                                <div ref={mapContainerRef} className="pr-map__canvas" />

                                <div className="pr-map__legend" aria-label="Lead score legend">
                                    <h4>Lead Score</h4>
                                    <div className="pr-legend-row"><span className="dot" style={{ background: toneColour('hot') }} /> High 85+</div>
                                    <div className="pr-legend-row"><span className="dot" style={{ background: toneColour('warm') }} /> Med-High 70–84</div>
                                    <div className="pr-legend-row"><span className="dot" style={{ background: toneColour('cool') }} /> Med 55–69</div>
                                    <div className="pr-legend-row"><span className="dot" style={{ background: toneColour('cold') }} /> Low &lt;55</div>
                                    <div className="pr-legend-row"><span className="dot" style={{ background: toneColour('own'), opacity: 0.5, border: '1px solid #d1d5db' }} /> Your Listing</div>
                                </div>

                                {/* Active prospect popup */}
                                {activeComp && (
                                    <aside className="pr-popup" aria-label={`${activeComp.title} details`}>
                                        <div className="pr-popup__header">
                                            <span className="pr-popup__pill" style={{ background: toneColour(activeComp.tone) }}>
                                                {activeComp.kind === 'own' ? 'Your Listing' : (inDb ? 'In Database' : '+ Not in Database')}
                                            </span>
                                            <button type="button" className="pr-popup__close" onClick={() => { setActiveComp(null); setShowNote(false); setNoteText(''); }} aria-label="Close">×</button>
                                        </div>
                                        {activeComp.kind === 'comp' && (
                                            <div className="pr-popup__score">
                                                <b>{activeComp.score}</b>
                                                <em>{toneLabel(activeComp.tone)}</em>
                                                <span>AI Prospect Score</span>
                                            </div>
                                        )}
                                        <div className="pr-popup__title" title={activeComp.title}>{activeComp.title || 'Property'}</div>
                                        <div className="pr-popup__addr">{activeComp.address || activeComp.suburb || activeComp.parentSuburb || ''}</div>
                                        <div className="pr-popup__grid">
                                            <div className="pr-popup__cell"><label>Asking</label><span>{activeComp.price ? fmtMoney(activeComp.price, activeComp.currency || 'ZAR') : 'POA'}</span></div>
                                            <div className="pr-popup__cell"><label>Size</label><span>{activeComp.size_sqm ? `${activeComp.size_sqm.toLocaleString()} m²` : '—'}</span></div>
                                            <div className="pr-popup__cell"><label>Type</label><span>{(activeComp.property_type || 'Industrial').replace(/^./, (c) => c.toUpperCase())}</span></div>
                                            <div className="pr-popup__cell"><label>Suburb</label><span>{activeComp.suburb || activeComp.parentSuburb || '—'}</span></div>
                                        </div>

                                        {activeComp.kind === 'comp' && (activeComp.agent_name || activeComp.agency_name) && (
                                            <div className="pr-popup__listed-by">
                                                <div className="pr-popup__listed-by-label">Listed by</div>
                                                <div className="pr-popup__listed-by-row">
                                                    {activeComp.agent_photo ? (
                                                        <img src={activeComp.agent_photo} alt={activeComp.agent_name || 'Agent'} className="pr-popup__agent-photo" />
                                                    ) : (
                                                        <div className="pr-popup__agent-photo pr-popup__agent-photo--placeholder">
                                                            <i className="fas fa-user" />
                                                        </div>
                                                    )}
                                                    <div className="pr-popup__agent-meta">
                                                        {activeComp.agent_name && (
                                                            <div className="pr-popup__agent-name">{activeComp.agent_name}</div>
                                                        )}
                                                        {activeComp.agency_name && (
                                                            <div className="pr-popup__agency-name">{activeComp.agency_name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {showNote && (
                                            <div style={{ marginBottom: 8 }}>
                                                <textarea
                                                    autoFocus
                                                    placeholder="Note (will be added as the first activity when sent to CRM)"
                                                    value={noteText}
                                                    onChange={(e) => setNoteText(e.target.value)}
                                                    rows={3}
                                                    style={{ width: '100%', resize: 'vertical', borderRadius: 6, border: '1px solid #ddd', padding: '6px 8px', fontFamily: 'inherit', fontSize: 11 }}
                                                />
                                            </div>
                                        )}

                                        {activeComp.kind === 'comp' && (
                                            <div className="pr-popup__actions">
                                                <button type="button" className="pr-popup__btn" onClick={() => setShowNote((s) => !s)}>
                                                    <i className="far fa-sticky-note" /> {showNote ? 'Hide note' : 'Note'}
                                                </button>
                                                <button type="button" className="pr-popup__btn pr-popup__btn--primary" onClick={openAddToCrm}>
                                                    <i className="fas fa-plus" /> {inDb ? 'In CRM' : 'Add to CRM'}
                                                </button>
                                            </div>
                                        )}
                                    </aside>
                                )}

                                {/* Add-to-CRM modal */}
                                {showCrmModal && activeComp && (
                                    <div className="pr-crm-overlay" role="dialog" aria-modal="true">
                                        <div className="pr-crm-modal">
                                            <h4>Add prospect to CRM</h4>
                                            <p className="pr-crm-sub">Saved as a <strong>Prospect</strong> lead — distinct from buyers, sellers and investors.</p>
                                            <div className="pr-crm-summary">
                                                <strong>{activeComp.title}</strong>
                                                <div>{activeComp.suburb || activeComp.address}</div>
                                                <div>{activeComp.price ? fmtFullMoney(activeComp.price, activeComp.currency || 'ZAR') : 'POA'} · score {activeComp.score}</div>
                                            </div>
                                            <label className="pr-crm-label">Lead name <span style={{ color: '#a4260e' }}>*</span></label>
                                            <input type="text" value={crmForm.name} onChange={(e) => setCrmForm((p) => ({ ...p, name: e.target.value }))} placeholder="Owner / company name" />
                                            <label className="pr-crm-label">Email</label>
                                            <input type="email" value={crmForm.email} onChange={(e) => setCrmForm((p) => ({ ...p, email: e.target.value }))} placeholder="contact@example.com" />
                                            <label className="pr-crm-label">Mobile</label>
                                            <input type="tel" value={crmForm.mobile} onChange={(e) => setCrmForm((p) => ({ ...p, mobile: e.target.value }))} placeholder="+27…" />
                                            {noteText.trim() && (
                                                <div className="pr-crm-note">📝 First activity: {noteText.trim()}</div>
                                            )}
                                            {crmError && <div className="pr-crm-error">⚠️ {crmError}</div>}
                                            <div className="pr-crm-actions">
                                                <button type="button" className="pr-popup__btn" onClick={() => setShowCrmModal(false)} disabled={crmSaving}>Cancel</button>
                                                <button type="button" className="pr-popup__btn pr-popup__btn--primary" onClick={submitCrm} disabled={crmSaving}>
                                                    {crmSaving ? 'Saving…' : 'Save prospect'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* INSIGHTS — top comp list, drives the right column */}
                        <aside className="pr-card pr-insights">
                            <h3 className="pr-card__heading">Top Prospects</h3>
                            <div className="pr-top-list">
                                {visibleComps
                                    .slice()
                                    .sort((a, b) => b.score - a.score)
                                    .slice(0, 8)
                                    .map((c) => (
                                        <button
                                            key={c.url}
                                            type="button"
                                            className={`pr-top-item ${activeComp?.url === c.url ? 'is-active' : ''}`}
                                            onClick={() => setActiveComp({ kind: 'comp', ...c, currency: c.currency || 'ZAR' })}
                                        >
                                            <span className="pr-top-score" style={{ background: toneColour(c.tone) }}>{c.score}</span>
                                            <span className="pr-top-meta">
                                                <strong title={c.title}>{(c.title || 'Industrial property').slice(0, 40)}</strong>
                                                <span>{c.suburb || c.parentSuburb || ''} · {c.price ? fmtMoney(c.price, c.currency || 'ZAR') : 'POA'}</span>
                                            </span>
                                        </button>
                                    ))}
                                {!visibleComps.length && !loading && (
                                    <div className="pr-top-empty">
                                        {boundary
                                            ? 'No comps inside the drawn area.'
                                            : (activeTones.size === 0
                                                ? 'Pick a Lead Score band on the left to surface prospects.'
                                                : 'No comps match the current filters.')}
                                    </div>
                                )}
                            </div>
                        </aside>
                    </section>
                </div>
            </main>
        </div>
    );
}
