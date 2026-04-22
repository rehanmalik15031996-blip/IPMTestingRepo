import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Footer from '../components/Footer';
import HomeCtaContactSections, { HomeAnimaFooter } from '../components/HomeCtaContactSections';
import api from '../config/api';
import { usePreferences } from '../context/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useMediaQuery';
import { SERVICES_SECTION_PATHS } from './ourServices/servicesSectionRoutes';

// --- CountUp Component ---
const CountUp = ({ end, suffix = "" }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const duration = 2000;
        const incrementTime = (duration / end) * 2; 
        const timer = setInterval(() => {
            start += 1;
            setCount(start);
            if (start >= end) clearInterval(timer);
        }, incrementTime);
        return () => clearInterval(timer);
    }, [end]);
    return <span>{count}{suffix}</span>;
};

let homeMapScriptPromise = null;
const loadHomeMapScript = (apiKey) => {
    if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key'));
    if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
    if (window.google?.maps) return Promise.resolve(window.google);

    if (!homeMapScriptPromise) {
        homeMapScriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-google-maps="home"]');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.google));
                existing.addEventListener('error', reject);
                return;
            }
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
            script.async = true;
            script.defer = true;
            script.setAttribute('data-google-maps', 'home');
            script.onload = () => resolve(window.google);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    return homeMapScriptPromise;
};

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
const LANDING_TITLE = 'IPM – International Property Market | Global Real Estate Platform';
const LANDING_DESCRIPTION = 'Discover and manage international property investments. AI-driven tools, portfolio management, and global exposure for agents, agencies, and investors.';

const HERO_INTENTS = ['agents', 'buy', 'rent', 'invest', 'partner', 'enterprise'];
const HERO_INTENT_PROMPT_KEY = {
    agents: 'hero.promptAgents',
    buy: 'hero.promptBuy',
    rent: 'hero.promptRent',
    invest: 'hero.promptInvest',
    partner: 'hero.promptPartner',
    enterprise: 'hero.promptEnterprise',
};
const HERO_INTENT_TAB_KEY = {
    agents: 'hero.tabAgents',
    buy: 'hero.tabBuy',
    rent: 'hero.tabRent',
    invest: 'hero.tabInvest',
    partner: 'hero.tabPartner',
    enterprise: 'hero.tabEnterprise',
};

const JOURNEY_STEPS = [
    { titleKey: 'journeyStrip.step1Title', descKey: 'journeyStrip.step1Desc', dawnTitle: false },
    { titleKey: 'journeyStrip.step2Title', descKey: 'journeyStrip.step2Desc', dawnTitle: false },
    { titleKey: 'journeyStrip.step3Title', descKey: 'journeyStrip.step3Desc', dawnTitle: false },
    { titleKey: 'journeyStrip.step4Title', descKey: 'journeyStrip.step4Desc', dawnTitle: true },
    { titleKey: 'journeyStrip.step5Title', descKey: 'journeyStrip.step5Desc', dawnTitle: true },
    { titleKey: 'journeyStrip.step6Title', descKey: 'journeyStrip.step6Desc', dawnTitle: true },
];

const DARK_FEATURE_AUDIENCES = [
    {
        titleKey: 'darkFeatureSection.audience1Title',
        bodyKey: 'darkFeatureSection.audience1Body',
        border: true,
        servicesTo: SERVICES_SECTION_PATHS.agent,
        servicesCtaKey: 'darkFeatureSection.audience1ServicesCta',
    },
    {
        titleKey: 'darkFeatureSection.audience2Title',
        bodyKey: 'darkFeatureSection.audience2Body',
        border: true,
        servicesTo: SERVICES_SECTION_PATHS.buyRent,
        servicesCtaKey: 'darkFeatureSection.audience2ServicesCta',
    },
    {
        titleKey: 'darkFeatureSection.audience3Title',
        bodyKey: 'darkFeatureSection.audience3Body',
        border: false,
        servicesTo: SERVICES_SECTION_PATHS.enterprise,
        servicesCtaKey: 'darkFeatureSection.audience3ServicesCta',
    },
];

const getLandingJsonLd = () => ({
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': `${BASE_URL}/#organization`,
            name: 'IPM – International Property Market',
            url: BASE_URL,
            description: LANDING_DESCRIPTION,
            logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo-white.png` }
        },
        {
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            url: BASE_URL,
            name: LANDING_TITLE,
            description: LANDING_DESCRIPTION,
            publisher: { '@id': `${BASE_URL}/#organization` }
        }
    ]
});

const Home = () => {
    const { formatPrice, formatArea } = usePreferences();
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const [properties, setProperties] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [heroIntent, setHeroIntent] = useState('buy');
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [hoveredSlideIndex, setHoveredSlideIndex] = useState(null);
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    const homeMapRef = useRef(null);
    const homeMapInstanceRef = useRef(null);
    const homeMarkersRef = useRef([]);
    const revealObserverRef = useRef(null);

    // --- Fetch Properties ---
    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const res = await api.get('/api/properties', { publicRequest: true });
                if (res.data && Array.isArray(res.data)) {
                setProperties(res.data);
                    if (res.data.length === 0) {
                        console.warn("⚠️ No properties found. Database may need seeding. Visit /seed to populate data.");
                    }
                } else {
                    console.error("Invalid response format:", res.data);
                    setProperties([]);
                }
            } catch (err) {
                console.error("Error fetching properties:", err);
                setProperties([]);
            }
        };
        fetchProperties();
    }, []);

    // Reveal sections as user scrolls into view.
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const revealNodes = document.querySelectorAll('.scroll-reveal');
        if (!revealNodes.length) return undefined;

        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            revealNodes.forEach((node) => node.classList.add('is-visible'));
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { root: null, rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
        );

        revealObserverRef.current = observer;
        revealNodes.forEach((node) => observer.observe(node));

        return () => {
            observer.disconnect();
        };
    }, []);

    // --- Home map (with fallback when API key missing or load fails) ---
    const [mapUseFallback, setMapUseFallback] = useState(false);
    useEffect(() => {
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            setMapUseFallback(true);
            return;
        }
        const container = homeMapRef.current;
        if (!container) return;

        let cancelled = false;
        const hoverTimers = new Map();
        // Landmark images (Unsplash) – displayed grayscale inside pins; use stable IDs to avoid 404s
        const pinLocations = [
            { lat: 37.0902, lng: -95.7129, imageUrl: 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=88&h=88&fit=crop' }, // USA
            { lat: 51.5074, lng: -0.1278, imageUrl: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=88&h=88&fit=crop' }, // UK
            { lat: 52.1326, lng: 5.2913, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=88&h=88&fit=crop' }, // Netherlands
            { lat: 51.1657, lng: 10.4515, imageUrl: 'https://images.unsplash.com/photo-1560930950-5cc20e80e077?w=88&h=88&fit=crop' }, // Germany
            { lat: 40.4637, lng: -3.7492, imageUrl: 'https://images.unsplash.com/photo-1583422409516-289a636c7d60?w=88&h=88&fit=crop' }, // Spain
            { lat: 25.2048, lng: 55.2708, imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=88&h=88&fit=crop' }, // UAE
            { lat: -30.5595, lng: 22.9375, imageUrl: 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=88&h=88&fit=crop' }, // South Africa
            { lat: 39.9042, lng: 116.4074, imageUrl: 'https://images.unsplash.com/photo-1508804183071-b4213ecf8a2b?w=88&h=88&fit=crop' }, // China
            { lat: 20.5937, lng: 78.9629, imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=88&h=88&fit=crop' }, // India
            { lat: -25.2744, lng: 133.7751, imageUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=88&h=88&fit=crop' }, // Australia
            { lat: -14.2350, lng: -51.9253, imageUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=88&h=88&fit=crop' }, // Brazil
            { lat: 35.6895, lng: 139.6917, imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=88&h=88&fit=crop' } // Japan
        ];

        loadHomeMapScript(apiKey)
            .then((google) => {
                if (cancelled) return;
                if (!homeMapInstanceRef.current) {
                    homeMapInstanceRef.current = new google.maps.Map(container, {
                        center: { lat: 10, lng: 0 },
                        zoom: 2,
                        minZoom: 2,
                        maxZoom: 2,
                        gestureHandling: 'none',
                        zoomControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                        mapTypeControl: false,
                        clickableIcons: false,
                        styles: [
                            { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
                            { featureType: 'all', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                            { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
                            { featureType: 'road', elementType: 'all', stylers: [{ visibility: 'off' }] },
                            { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
                            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] }
                        ]
                    });
                }

                homeMarkersRef.current.forEach((m) => m.setMap && m.setMap(null));
                homeMarkersRef.current = [];

                function createPinOverlay(position, imageUrl) {
                    const PIN_W = 52;
                    const PIN_H = 64;
                    function PinOverlay() {
                        this.position = position;
                        this.imageUrl = imageUrl;
                        this.div = null;
                    }
                    PinOverlay.prototype = Object.create(google.maps.OverlayView.prototype);
                    PinOverlay.prototype.onAdd = function() {
                        const div = document.createElement('div');
                        div.className = 'home-map-pin';
                        div.innerHTML = '<div class="home-map-pin-inner"><img src="' + this.imageUrl + '" alt="" decoding="async" onerror="this.onerror=null;this.style.display=\'none\';var p=this.parentNode;if(p){p.style.background=\'#cbd5e1\';p.style.backgroundImage=\'none\';}" /></div>';
                        this.div = div;
                        const panes = this.getPanes();
                        if (panes && panes.overlayMouseTarget) panes.overlayMouseTarget.appendChild(div);
                    };
                    PinOverlay.prototype.draw = function() {
                        if (!this.div || !this.position) return;
                        const projection = this.getProjection();
                        if (!projection) return;
                        const point = projection.fromLatLngToDivPixel(new google.maps.LatLng(this.position.lat, this.position.lng));
                        if (!point) return;
                        this.div.style.left = (point.x - PIN_W / 2) + 'px';
                        this.div.style.top = (point.y - PIN_H) + 'px';
                        this.div.style.width = PIN_W + 'px';
                        this.div.style.height = PIN_H + 'px';
                    };
                    PinOverlay.prototype.onRemove = function() {
                        if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
                        this.div = null;
                    };
                    const overlay = new PinOverlay();
                    overlay.setMap(homeMapInstanceRef.current);
                    return overlay;
                }

                pinLocations.forEach((pos) => {
                    const overlay = createPinOverlay({ lat: pos.lat, lng: pos.lng }, pos.imageUrl);
                    homeMarkersRef.current.push(overlay);
                });
            })
            .catch(() => {
                if (!cancelled) setMapUseFallback(true);
            });

        return () => {
            cancelled = true;
            hoverTimers.forEach((timer) => clearInterval(timer));
            hoverTimers.clear();
        };
    }, []);

    // --- Handlers ---
    const handleSearch = (e) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (q) navigate('/collection', { state: { searchQuery: q, heroIntent } });
    };

    const handleFilterClick = () => navigate('/collection', { state: { openFilters: true } });
    const scrollLeft = () => scrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' });
    const scrollRight = () => scrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' });

    // --- Data (titleKey used for translation) ---
    const featuresList = [
        { icon: "fas fa-wand-magic-sparkles", titleKey: "hero.feature1" },
        { icon: "fas fa-chart-line", titleKey: "hero.feature2" },
        { icon: "fas fa-coins", titleKey: "hero.feature3" },
        { icon: "fas fa-sliders-h", title: "Real-time Local Adaptation" },
        { icon: "fas fa-certificate", title: "Verified Sustainability Badges" },
        { icon: "far fa-user", title: "Individualized Interface Experience" },
        { icon: "fas fa-microchip", title: "AI Curated Dashboards" },
        { icon: "fas fa-calculator", title: "Bond & ROI Calculator / Simulator" },
        { icon: "fas fa-home", title: "Live Property Valuations" }
    ];

    // Logged-in agents: go straight to agent dashboard so they never see "old" home/dashboard
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const user = userStr ? (() => { try { return JSON.parse(userStr); } catch (_) { return null; } })() : null;
    const role = (user?.role || '').toLowerCase();
    const isAgent = role === 'agent' || role === 'independent_agent' || role === 'agency_agent';
    if (isAgent) {
        return <Navigate to="/agent-dashboard" replace />;
    }

    const slideContent = [
        { title: "For Buyers", text: "Buyers gain access to real-time data, empowering them to make confident, informed property decisions from anywhere in the world. Our AI-powered search engine intelligently matches you with properties that best suit your needs.", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", badge: "For Buyers", video: "/site-assets/videos/landing-buyers.mp4" },
        { title: "Sellers and Agents", text: "Maximize your returns with precision. Explore a curated collection of high-yield investment opportunities and utilize our Portfolio Growth tools to scale from a single property to an international empire with data-backed insights.", image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", badge: "Agencies", video: "/site-assets/videos/landing-sellers.mp4" },
        { title: "Investors", text: "Maximize your property's value and your team's efficiency. Our all-in-one system empowers you to manage your entire portfolio, track leads with our integrated CRM, and leverage AI-driven valuation tools for global exposure. From Independent Agents to Elite Agencies, scale your operations with a platform built for international success.", image: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80", badge: "Investors", video: "/site-assets/videos/landing-investors.mp4" }
    ];

    return (
        <div style={{ backgroundColor: '#fff', fontFamily: "'Poppins', system-ui, sans-serif" }}>
            <Helmet>
                <title>{LANDING_TITLE}</title>
                <meta name="description" content={LANDING_DESCRIPTION} />
                <meta property="og:title" content={LANDING_TITLE} />
                <meta property="og:description" content={LANDING_DESCRIPTION} />
                <meta property="og:url" content={BASE_URL + '/'} />
                <meta property="og:image" content={BASE_URL + '/logo-white.png'} />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={LANDING_TITLE} />
                <meta name="twitter:description" content={LANDING_DESCRIPTION} />
                <link rel="alternate" type="text/plain" href={`${BASE_URL}/ai.txt`} title="AI-readable site description" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600;1,700&family=IBM+Plex+Serif:ital,wght@1,600&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&family=Jost:wght@400;500;600&family=Poppins:wght@200;300;400;500;600&display=swap" rel="stylesheet" />
                <script type="application/ld+json">{JSON.stringify(getLandingJsonLd())}</script>
            </Helmet>
            <style>{`
                :root { --primary-teal: #11575C; --accent-orange: #ffc801; --text-dark: #1e293b; --text-light: #64748b; --white: #ffffff; }
                
                /* LANDING HERO — Figma HERO_UPDATE (IPM Black #060606, layered bg + gradients, Poppins headline ~275→200) */
                .landing-hero {
                    position: relative;
                    min-height: 100vh;
                    min-height: 100dvh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: clamp(104px, 15vh, 180px) 24px clamp(56px, 10vh, 100px);
                    overflow: hidden;
                    color: #fff;
                    text-align: center;
                    font-family: 'Poppins', system-ui, sans-serif;
                    background: #060606;
                }
                .landing-hero-bg {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    background-color: #060606;
                    background-repeat: no-repeat;
                    background-position: center center;
                    background-size: cover;
                    background-image:
                        linear-gradient(0deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)),
                        url('/landing-hero-main.png');
                }
                @media (max-width: 900px) {
                    .landing-hero-bg { background-position: center 28%; }
                }
                .landing-hero-gradient {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                    pointer-events: none;
                    background:
                        radial-gradient(55% 40% at 60% 35%, rgba(245, 230, 195, 0.1) 0%, rgba(245, 230, 195, 0) 55%),
                        linear-gradient(90deg, rgba(11, 28, 19, 0) 55%, rgba(11, 28, 19, 0.55) 100%),
                        linear-gradient(180deg, rgba(11, 28, 19, 0.18) 0%, rgba(11, 28, 19, 0) 30%, rgba(11, 28, 19, 0) 65%, rgba(11, 28, 19, 0.42) 100%);
                }
                .landing-hero-inner {
                    position: relative;
                    z-index: 2;
                    width: 100%;
                    max-width: 1376px;
                    margin: 0 auto;
                    padding: 0 16px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .landing-hero-narrow {
                    width: 100%;
                    max-width: 1052px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: clamp(20px, 3vh, 32px);
                }
                /* Headline: one line (wrap only on very narrow viewports) */
                .landing-headline {
                    margin: 0 0 clamp(28px, 4.5vh, 52px);
                    padding: 0;
                    width: 100%;
                    max-width: 1376px;
                    min-height: clamp(72px, 14vw, 120px);
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: baseline;
                    justify-content: center;
                    gap: 0.2em 0.35em;
                    text-align: center;
                    box-sizing: border-box;
                }
                .landing-headline-line {
                    display: inline;
                    width: auto;
                    max-width: 100%;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-style: normal;
                    font-weight: 200;
                    font-size: clamp(1.875rem, 5.5vw + 0.5rem, 75px);
                    line-height: clamp(2.125rem, 5.9vw + 0.5rem, 80px);
                    color: #ffffff;
                }
                /* Accent word(s) on same line as first span */
                .landing-headline-line--accent {
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    font-style: italic;
                    font-weight: 500;
                    color: #ffc801;
                    margin-top: 0;
                }
                .landing-headline-dot {
                    font-family: 'IBM Plex Serif', 'Playfair Display', Georgia, serif;
                    font-weight: 600;
                    font-style: italic;
                }
                @media (min-width: 768px) {
                    .landing-headline {
                        flex-wrap: nowrap;
                    }
                }
                .landing-tagline {
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-size: clamp(1rem, 2.2vw, 22px);
                    font-weight: 500;
                    line-height: 1.55;
                    margin: 0;
                    padding: 0 clamp(8px, 3vw, 24px);
                    max-width: 38rem;
                    color: rgba(255, 255, 255, 0.92);
                    text-align: center;
                }
                .landing-hero-search-wrap {
                    width: 100%;
                    margin: 0;
                }
                .landing-hero-search-bar {
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: row;
                    align-items: stretch;
                    width: 100%;
                    min-height: 54px;
                    background: rgba(255, 255, 255, 0.07);
                    border: 1px solid rgba(255, 255, 255, 0.13);
                    border-radius: 14px;
                    overflow: hidden;
                }
                .landing-hero-search-bar .landing-search-input {
                    flex: 1;
                    min-width: 0;
                    border: none;
                    background: transparent;
                    padding: 14px 18px;
                    font-size: 16px;
                    line-height: 24px;
                    font-weight: 300;
                    color: #ffffff;
                    outline: none;
                    font-family: 'Poppins', system-ui, sans-serif;
                }
                .landing-hero-search-bar .landing-search-input::placeholder {
                    color: rgba(255, 255, 255, 0.55);
                    font-weight: 300;
                }
                .landing-hero-search-bar .landing-search-submit {
                    flex-shrink: 0;
                    display: inline-flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 14px 22px 15px;
                    min-width: 107px;
                    border: none;
                    margin: 0;
                    cursor: pointer;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 600;
                    font-size: 13px;
                    line-height: 20px;
                    white-space: nowrap;
                    color: #ffffff;
                    background: #ffc801;
                    transition: filter 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
                }
                .landing-hero-search-bar .landing-search-submit:hover {
                    filter: brightness(1.12);
                    transform: translateY(-1px);
                    box-shadow: 0 10px 20px rgba(255, 200, 1, 0.35);
                }
                .landing-hero-search-bar .landing-search-submit:focus-visible {
                    outline: 2px solid #fff;
                    outline-offset: -2px;
                }
                .landing-hero-tabs-shell {
                    box-sizing: border-box;
                    width: 100%;
                    border: 1px solid rgba(255, 255, 255, 0.24);
                    border-radius: 10px;
                    overflow: hidden;
                    margin-bottom: clamp(24px, 5vh, 48px);
                }
                .landing-search-tabs {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    justify-content: center;
                    align-items: stretch;
                    width: 100%;
                    background: transparent;
                }
                .landing-search-tab {
                    flex: 1 1 0;
                    min-width: 0;
                    padding: 11px 6px;
                    border: none;
                    border-right: 1px solid rgba(255, 255, 255, 0.2);
                    background: transparent;
                    color: rgba(255, 255, 255, 0.88);
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-size: 11.5px;
                    line-height: 17px;
                    font-weight: 600;
                    letter-spacing: 0.2px;
                    text-transform: none;
                    cursor: pointer;
                    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
                    transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
                }
                .landing-search-tab:last-child {
                    border-right: none;
                }
                .landing-search-tab:hover {
                    background: rgba(255, 255, 255, 0.12);
                    color: #ffffff;
                    box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.45);
                }
                .landing-search-tab.active {
                    background: rgba(255, 200, 1, 0.22);
                    color: #fff8da;
                    font-weight: 700;
                    box-shadow: inset 0 -2px 0 rgba(255, 200, 1, 0.9);
                }
                .landing-search-tab:focus-visible {
                    outline: 2px solid #ffffff;
                    outline-offset: -2px;
                    background: rgba(255, 255, 255, 0.14);
                }
                .scroll-reveal {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 560ms ease, transform 560ms ease;
                    will-change: opacity, transform;
                }
                .scroll-reveal.is-visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                @media (prefers-reduced-motion: reduce) {
                    .scroll-reveal,
                    .scroll-reveal.is-visible {
                        opacity: 1;
                        transform: none;
                        transition: none;
                    }
                }

                /* NUMBERS STRIP (Figma: Sisal borders #D0D5C6, labels Poppins Light 16px #C2C3C3, values Playfair 40px) */
                .landing-numbers-strip {
                    background: #ffffff;
                    border-top: 1px solid #d0d5c6;
                    border-bottom: 1px solid #d0d5c6;
                    font-family: 'Poppins', system-ui, sans-serif;
                }
                .landing-numbers-inner {
                    max-width: 1920px;
                    margin: 0 auto;
                    padding: 0 clamp(20px, 21.5vw, 412px);
                }
                .landing-numbers-row {
                    display: flex;
                    align-items: stretch;
                    min-height: 134px;
                }
                .landing-numbers-cell {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    text-align: center;
                    padding: 34px 28px;
                    border-right: 1px solid #d0d5c6;
                    box-sizing: border-box;
                }
                .landing-numbers-cell:last-child {
                    border-right: none;
                }
                .landing-numbers-value {
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: 40px;
                    line-height: 40px;
                    letter-spacing: -0.01em;
                    color: #1a1a1a;
                    margin: 0;
                    min-height: 40px;
                    display: inline-flex;
                    align-items: baseline;
                    justify-content: center;
                    white-space: nowrap;
                }
                .landing-numbers-plus {
                    color: #ffc801;
                    margin-left: 2px;
                    font-size: 0.92em;
                    line-height: 1;
                }
                .landing-numbers-label {
                    font-weight: 300;
                    font-size: 16px;
                    line-height: 1.25;
                    color: #c2c3c3;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    max-width: 220px;
                    margin: 0;
                    min-height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* JOURNEY STRIP (Figma — IPM Green, 6-step track) */
                .landing-journey-strip {
                    box-sizing: border-box;
                    position: relative;
                    width: 100%;
                    background: #10575c;
                    border-top: 1px solid rgba(255, 255, 255, 0.12);
                    padding: clamp(36px, 6vw, 56px) clamp(20px, 18vw, 360px);
                }
                .landing-journey-inner {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 clamp(16px, 5vw, 52px);
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 56px;
                    box-sizing: border-box;
                }
                /* Figma: column gap 14.86px; eyebrow cap 560×16; H2 block 1148×115, 50/75, pr 58 */
                .landing-journey-header {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    padding: 0;
                    gap: 14.86px;
                    width: 100%;
                    max-width: 1090px;
                    align-self: center;
                    flex: none;
                    box-sizing: border-box;
                }
                .landing-journey-eyebrow {
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    width: 100%;
                    max-width: 560px;
                    min-height: 16px;
                    margin: 0;
                    padding: 0;
                    font-family: 'Jost', 'Poppins', system-ui, sans-serif;
                    font-style: normal;
                    font-weight: 600;
                    font-size: 10px;
                    line-height: 16px;
                    letter-spacing: 2.8px;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.4);
                    flex: none;
                    align-self: stretch;
                }
                .landing-journey-heading {
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: center;
                    width: 100%;
                    max-width: 1090px;
                    margin: 0;
                    padding: 0;
                    flex: none;
                    align-self: stretch;
                }
                .landing-journey-heading-line {
                    display: block;
                    width: 100%;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-style: normal;
                    font-weight: 200;
                    font-size: clamp(1.5rem, 4vw, 50px);
                    line-height: 0.907;
                    color: #ffffff;
                }
                .landing-journey-heading-accent {
                    margin-top: 0;
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    color: #ffc801;
                    font-style: italic;
                    font-weight: 500;
                    line-height: 1.07;
                }
                .landing-journey-track {
                    width: 100%;
                    display: grid;
                    grid-template-columns: repeat(6, minmax(0, 1fr));
                    background: rgba(255, 255, 255, 0.07);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    border-radius: 16px;
                    overflow: hidden;
                    box-sizing: border-box;
                }
                .landing-journey-card {
                    padding: 28px 22px 16px 22px;
                    background: rgba(255, 255, 255, 0.12);
                    box-shadow: 0 4px 4px rgba(0, 0, 0, 0.25);
                    border-right: 1px solid rgba(255, 255, 255, 0.06);
                    min-height: 181px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    box-sizing: border-box;
                }
                .landing-journey-card:last-child {
                    border-right: none;
                }
                .landing-journey-card-top {
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: flex-start;
                    width: 100%;
                    margin-bottom: 8px;
                }
                .landing-journey-num {
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: 36px;
                    line-height: 36px;
                    color: #ffc801;
                }
                .landing-journey-arrow {
                    font-family: 'Jost', 'Poppins', system-ui, sans-serif;
                    font-weight: 400;
                    font-size: 11px;
                    line-height: 18px;
                    color: rgba(255, 255, 255, 0.12);
                    margin: 6px 0 0 4px;
                    flex-shrink: 0;
                }
                .landing-journey-card-title {
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: 14.5px;
                    line-height: 18.13px;
                    color: #ffffff;
                    margin: 0 0 6px;
                }
                .landing-journey-card-title--dawn {
                    color: #edf4f0;
                }
                .landing-journey-card-desc {
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 300;
                    font-size: 12px;
                    line-height: 18px;
                    color: #ffffff;
                    margin: 0;
                }
                @media (max-width: 1100px) {
                    .landing-journey-track {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                    .landing-journey-card {
                        border-right: 1px solid rgba(255, 255, 255, 0.06);
                    }
                    .landing-journey-card:nth-child(3n) {
                        border-right: none;
                    }
                    .landing-journey-card:nth-child(n + 4) {
                        border-top: 1px solid rgba(255, 255, 255, 0.06);
                    }
                }
                @media (max-width: 640px) {
                    .landing-journey-strip {
                        padding-left: 16px;
                        padding-right: 16px;
                    }
                    .landing-journey-heading {
                        padding-right: 0;
                        min-height: 0;
                    }
                    .landing-journey-inner {
                        gap: 40px;
                        padding: 0;
                    }
                    .landing-journey-track {
                        display: flex;
                        flex-direction: row;
                        flex-wrap: nowrap;
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                        scroll-snap-type: x mandatory;
                        border-radius: 16px;
                    }
                    .landing-journey-card {
                        flex: 0 0 min(78vw, 220px);
                        scroll-snap-align: start;
                        border-right: 1px solid rgba(255, 255, 255, 0.06);
                        border-top: none;
                        min-height: 120px;
                    }
                    .landing-journey-card:last-child {
                        border-right: none;
                    }
                }

                /* WELCOME SECTION (Figma — white band + dashboard preview) */
                .landing-welcome-section {
                    box-sizing: border-box;
                    position: relative;
                    width: 100%;
                    background: #ffffff;
                    padding: clamp(64px, 8vw, 88px) clamp(20px, 5vw, 412px);
                    display: flex;
                    justify-content: center;
                }
                .landing-welcome-inner {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(280px, 1fr);
                    gap: clamp(36px, 5vw, 64px);
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    min-width: 0;
                }
                .landing-welcome-copy {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 16px;
                    width: 100%;
                    max-width: 532px;
                }
                .landing-welcome-eyebrow {
                    margin: 0;
                    font-family: 'Jost', 'Poppins', system-ui, sans-serif;
                    font-weight: 600;
                    font-size: 10px;
                    line-height: 16px;
                    letter-spacing: 2.8px;
                    text-transform: uppercase;
                    color: #c2c3c3;
                }
                .landing-welcome-heading {
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0;
                    width: 100%;
                }
                .landing-welcome-heading-line {
                    display: block;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 200;
                    font-size: clamp(1.75rem, 4vw, 50px);
                    line-height: 53.5px;
                    color: #1a1714;
                }
                .landing-welcome-heading-accent {
                    font-family: 'Playfair Display', Georgia, serif;
                    font-style: italic;
                    font-weight: 500;
                    font-size: clamp(1.75rem, 4vw, 50px);
                    line-height: 53.5px;
                    color: #1a1714;
                }
                .landing-welcome-body {
                    margin: 0;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 300;
                    font-size: 16px;
                    line-height: normal;
                    color: #060606;
                }
                .landing-welcome-body-gap {
                    margin-top: 9px;
                }
                .landing-welcome-actions {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 14px;
                    padding-top: 10px;
                }
                .landing-welcome-btn-primary {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 13px 26px;
                    min-height: 52px;
                    box-sizing: border-box;
                    background: #10575c;
                    border-radius: 14px;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 600;
                    font-size: 16px;
                    line-height: 24px;
                    color: #ffffff !important;
                    text-decoration: none;
                    transition: filter 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
                }
                .landing-welcome-btn-primary:hover {
                    filter: brightness(1.1);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 22px rgba(16, 87, 92, 0.28);
                    color: #ffffff !important;
                }
                .landing-welcome-btn-secondary {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 14px 21px;
                    min-height: 52px;
                    box-sizing: border-box;
                    border: 1px solid #ddd5c8;
                    border-radius: 14px;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 300;
                    font-size: 16px;
                    line-height: 24px;
                    color: #1a1714;
                    text-decoration: none;
                    background: #fff;
                    transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
                }
                .landing-welcome-btn-secondary:hover {
                    border-color: #a89a86;
                    background: #ffffff;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 18px rgba(26, 23, 20, 0.16);
                    color: #1a1714;
                }
                /* Light “mini platform” preview (Figma WELCOME panel) */
                .landing-welcome-preview {
                    display: flex;
                    flex-direction: row;
                    justify-content: center;
                    align-items: center;
                    padding: 16px;
                    gap: 10px;
                    box-sizing: border-box;
                    width: 100%;
                    max-width: min(580px, 100%);
                    min-width: 0;
                    justify-self: end;
                    background: #ffffff;
                    border-radius: 24px;
                    box-shadow: 0 22px 64px rgba(0, 0, 0, 0.16);
                    overflow: hidden;
                }
                .lw-frame {
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    border-radius: 18px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    background: #fff;
                }
                .lw-chrome {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 5px;
                    padding: 8px 11px;
                    background: #c2c3c3;
                    border: none;
                    border-radius: 8px 8px 0 0;
                    box-sizing: border-box;
                }
                .lw-chrome-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }
                .lw-chrome-dot--r { background: #ff5f57; }
                .lw-chrome-dot--y { background: #ffc801; }
                .lw-chrome-dot--g { background: #28c840; }
                .lw-chrome-url {
                    flex: 1;
                    min-width: 0;
                    margin-left: 8px;
                    padding: 3px 10px;
                    background: rgba(255, 255, 255, 0.04);
                    border-radius: 4px;
                    font-family: 'Jost', 'Poppins', Helvetica, sans-serif;
                    font-weight: 400;
                    font-size: 11px;
                    line-height: 18px;
                    color: #78736d;
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .lw-body {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 12px;
                    padding: 14px;
                    background: #e1e1e1;
                    border: none;
                    border-radius: 0 0 8px 8px;
                    box-sizing: border-box;
                    min-width: 0;
                    overflow-x: hidden;
                }
                .lw-header-section {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    position: relative;
                }
                .lw-middle-section {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .lw-crm-section {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                }
                .lw-portfolio-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    position: relative;
                }
                .lw-greet {
                    margin: 0;
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    font-style: italic;
                    font-weight: 400;
                    font-size: 17px;
                    line-height: 21px;
                    color: #1a1a14;
                }
                .lw-kpi-row {
                    display: flex;
                    flex-direction: row;
                    align-items: stretch;
                    gap: 16px;
                    filter: drop-shadow(1px 3px 3px rgba(0, 0, 0, 0.1));
                }
                .lw-kpi-pair {
                    display: flex;
                    flex-direction: row;
                    gap: 8px;
                    flex: 1;
                    min-width: 0;
                }
                .lw-mini-card {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 2px;
                    padding: 10px 9px;
                    background: #ffffff;
                    border: none;
                    border-radius: 7px;
                    min-height: 90px;
                    box-sizing: border-box;
                }
                .lw-mini-card i {
                    font-size: 22px;
                    color: #10575c;
                    margin-bottom: 4px;
                }
                .lw-listing-icon {
                    width: 32px;
                    height: 28px;
                    margin-bottom: 4px;
                }
                .lw-crown-icon {
                    width: 30px;
                    height: 24px;
                    margin-bottom: 4px;
                }
                .lw-mini-val {
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: 20px;
                    line-height: 20px;
                    color: #060606;
                }
                .lw-mini-label {
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 10px;
                    line-height: 14px;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    color: #78736d;
                }
                .lw-revenue {
                    position: relative;
                    flex: 1 0 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 7px;
                    background: #ffffff;
                    border: none;
                    border-radius: 7px;
                    box-sizing: border-box;
                }
                .lw-rev-zero {
                    position: absolute;
                    left: 38.48%;
                    top: 10px;
                    padding: 5px 10px;
                    background: #ffc801;
                    border-radius: 8px;
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: 14px;
                    line-height: 1;
                    color: #000000;
                    box-shadow: 0 16px 32px rgba(12, 12, 13, 0.1), 0 4px 4px rgba(12, 12, 13, 0.05);
                    z-index: 2;
                }
                .lw-rev-zero::after {
                    content: '';
                    position: absolute;
                    bottom: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 6px solid #ffc801;
                }
                .lw-donut {
                    position: relative;
                    width: 37px;
                    height: 41px;
                    display: inline-grid;
                    place-items: start;
                }
                .lw-donut img {
                    grid-area: 1 / 1;
                    width: 69px;
                    height: 67px;
                    margin-left: -16px;
                    margin-top: -7px;
                    display: block;
                    max-width: none;
                }
                .lw-donut-label {
                    grid-area: 1 / 1;
                    margin-left: 15px;
                    margin-top: 16px;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-size: 7px;
                    font-weight: 400;
                    color: #000;
                    text-align: center;
                    white-space: nowrap;
                }
                .lw-rev-amount {
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: 16px;
                    line-height: 16px;
                    color: #1a1714;
                    margin: 0;
                }
                .lw-rev-label {
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 8px;
                    line-height: normal;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    color: #78736d;
                    text-align: center;
                }
                .lw-section-title {
                    margin: 0;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 13px;
                    line-height: 15px;
                    color: #060606;
                }
                .lw-crm-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .lw-crm-row {
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    padding: 5px 8px;
                    background: #ffffff;
                    border: none;
                    border-radius: 6px;
                }
                .lw-crm-title {
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 13px;
                    line-height: 15px;
                    color: #060606;
                }
                .lw-crm-meta {
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 300;
                    font-size: 10px;
                    line-height: 12px;
                    color: #78736d;
                }
                .lw-pill-teal {
                    flex-shrink: 0;
                    padding: 1px 6px;
                    border-radius: 4px;
                    background: #10575c;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 12px;
                    line-height: 15px;
                    color: #e1e1e1;
                }
                .lw-pill-red {
                    flex-shrink: 0;
                    padding: 1px 6px;
                    border-radius: 4px;
                    background: #a4260e;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 12px;
                    line-height: 15px;
                    color: #e1e1e1;
                }
                .lw-portfolio-head {
                    margin: 0 0 10px;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 700;
                    font-size: 15px;
                    line-height: 1.2;
                    letter-spacing: -0.02em;
                    color: #060606;
                }
                .lw-map-stack {
                    position: relative;
                    width: 100%;
                    min-width: 0;
                }
                /* Portfolio map toolbar — light gray pill track, white inner pills (Figma-style) */
                .lw-map-stack > .lw-toolbar {
                    position: absolute;
                    left: 12px;
                    right: 12px;
                    top: 8px;
                    z-index: 5;
                    margin: 0;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 4px 7px 4px 6px;
                    background: #e6e6e6;
                    border: 1px solid rgba(0, 0, 0, 0.06);
                    border-radius: 999px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    -webkit-backdrop-filter: none;
                    backdrop-filter: none;
                }
                .lw-toolbar {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    align-items: center;
                    justify-content: space-between;
                    padding: 3px 6px;
                    background: rgba(255, 255, 255, 0.2);
                    -webkit-backdrop-filter: blur(10px);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    box-shadow: 0 10px 33px rgba(44, 47, 47, 0.2);
                }
                .lw-tool-group {
                    display: flex;
                    flex-wrap: nowrap;
                    align-items: center;
                    gap: 6px;
                }
                .lw-map-stack .lw-tool-group {
                    gap: 6px;
                    flex-shrink: 0;
                }
                .lw-tool-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 2px 8px;
                    height: 22px;
                    background: #ffffff;
                    border: none;
                    border-radius: 11px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 9px;
                    line-height: normal;
                    color: #3d5449;
                    white-space: nowrap;
                }
                .lw-map-stack .lw-tool-btn {
                    height: auto;
                    min-height: 24px;
                    padding: 4px 9px;
                    gap: 5px;
                    border-radius: 999px;
                    border: 1px solid rgba(0, 0, 0, 0.06);
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
                    font-size: 8.5px;
                    font-weight: 600;
                    color: #10575c;
                }
                .lw-tool-icon {
                    width: 11px;
                    height: 11px;
                    flex-shrink: 0;
                    display: block;
                }
                .lw-map-stack .lw-tool-btn .lw-tool-icon {
                    width: 10px;
                    height: 10px;
                }
                .lw-tool-search {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 2px 8px;
                    background: #ffffff;
                    border: none;
                    border-radius: 11px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 400;
                    font-size: 9px;
                    line-height: normal;
                    color: #10575c;
                    flex: 1;
                    min-width: 0;
                    white-space: nowrap;
                }
                .lw-map-stack .lw-tool-search {
                    min-height: 24px;
                    padding: 4px 10px 4px 9px;
                    border-radius: 999px;
                    border: 1px solid rgba(0, 0, 0, 0.06);
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
                    font-size: 8.5px;
                    font-weight: 400;
                    overflow: hidden;
                }
                .lw-map-stack .lw-tool-search-label {
                    min-width: 0;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .lw-tool-search .lw-tool-icon {
                    width: 10px;
                    height: 10px;
                }
                .lw-map-stack .lw-tool-search .lw-tool-icon {
                    width: 10px;
                    height: 10px;
                    flex-shrink: 0;
                }
                .lw-map-wrap {
                    container-type: inline-size;
                    container-name: lw-map;
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    max-width: 100%;
                    margin-left: 0;
                    margin-right: 0;
                    aspect-ratio: 434 / 216;
                    overflow: hidden;
                    border-radius: 8px;
                }
                .lw-map {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 434px;
                    height: 242.234px;
                    transform-origin: 0 0;
                    transform: scale(calc(100cqi / 434));
                    overflow: hidden;
                }
                @supports not (width: 1cqi) {
                    .lw-map-wrap {
                        overflow-x: auto;
                        overflow-y: hidden;
                        -webkit-overflow-scrolling: touch;
                    }
                    .lw-map {
                        transform: none;
                        position: relative;
                        left: 0;
                    }
                }
                .lw-map-bg {
                    position: absolute;
                    width: 434px;
                    height: 242.234px;
                    overflow: hidden;
                    border-radius: 0;
                    background-color: #10575c;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .lw-map-bg img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center center;
                    display: block;
                }
                .lw-prop-card {
                    position: absolute;
                    background: rgba(255,255,255,0.75);
                    border: none;
                    border-radius: 5.3px;
                    overflow: hidden;
                    box-shadow: 0 2.65px 8.84px rgba(44,47,47,0.2);
                    z-index: 3;
                    font-family: 'Poppins', sans-serif;
                    backdrop-filter: blur(2.65px);
                }
                .lw-prop-img { width:100%; aspect-ratio:313/236; position:relative; overflow:hidden; border-radius:2px 2px 0 0; box-shadow:0 1.3px 4.4px rgba(0,0,0,0.25); }
                .lw-prop-img img { width:100%; height:100%; object-fit:cover; display:block; }
                .lw-prop-active { position:absolute; top:2px; left:2px; padding:1px 2.7px; background:#10575c; border-radius:1.6px; font-size:1.87px; font-weight:700; letter-spacing:0.21px; text-transform:uppercase; color:#fff; }
                .lw-prop-body { padding:0 4.3px 5.3px; }
                .lw-prop-view-btn { display:block; width:100%; padding:2.9px 0; background:#10575c; border:0.27px solid #04342c; border-radius:2.4px; font-family:'DM Sans',sans-serif; font-size:2.4px; font-weight:600; color:#fff; text-align:center; margin-bottom:1.6px; box-sizing:border-box; }
                .lw-prop-price { font-family:'Poppins',sans-serif; font-size:2.94px; font-weight:500; color:#0d1f18; margin:0 0 1.6px; }
                .lw-prop-addr { font-family:'DM Sans',sans-serif; font-size:1.87px; font-weight:400; color:#3d5449; margin:0 0 1.6px; }
                .lw-prop-type-badge { position:absolute; right:4.3px; bottom:26px; padding:1.3px 2.7px; background:#e1e1e1; border:0.27px solid #e1e1e1; border-radius:1.6px; font-family:'Poppins',sans-serif; font-size:1.6px; font-weight:600; color:#3d5449; }
                .lw-prop-stats { display:flex; border-top:0.27px solid #edf4f0; border-bottom:0.27px solid #edf4f0; padding:0.27px 0; }
                .lw-prop-stat { flex:1; text-align:center; border-right:0.27px solid #edf4f0; }
                .lw-prop-stat:last-child { border-right:none; }
                .lw-prop-stat-val { font-family:'DM Mono',monospace; font-size:1.87px; font-weight:500; color:#0d1f18; display:block; line-height:4.4px; }
                .lw-prop-stat-label { font-family:'DM Sans',sans-serif; font-size:1.87px; font-weight:500; color:#7a9a8c; display:block; }
                .lw-prop-agent { display:flex; align-items:center; gap:2.1px; margin-top:1.6px; padding-top:1.6px; }
                .lw-prop-agent-avatar { width:9.09px; height:6.68px; border-radius:2.67px; background:#10575c; display:flex; align-items:center; justify-content:center; font-size:1.87px; font-weight:700; color:#fff; flex-shrink:0; }
                .lw-prop-agent-name { font-family:'DM Sans',sans-serif; font-size:1.87px; font-weight:700; color:#0d1f18; }
                .lw-prop-agent-role { font-family:'DM Sans',sans-serif; font-size:1.87px; font-weight:400; color:#7a9a8c; }
                .lw-prop-agent-online { margin-left:auto; font-family:'DM Sans',sans-serif; font-size:1.87px; color:#ffc801; font-weight:700; display:flex; align-items:center; gap:1.07px; }
                .lw-prop-agent-online::before { content:''; width:1.6px; height:1.6px; border-radius:50%; background:#ffc801; }

                .lw-detail-card {
                    position: absolute;
                    border: none;
                    border-radius: 2.86px;
                    overflow: hidden;
                    box-shadow: 0 1.63px 6.53px rgba(4,52,44,0.18);
                    z-index: 3;
                    font-family: 'Poppins', sans-serif;
                    color: #fff;
                    backdrop-filter: blur(1.5px);
                    background: rgba(255,255,255,0.65);
                }
                .lw-detail-top { display:flex; justify-content:space-between; align-items:center; padding:2.45px 2.86px; background:rgba(16,87,92,0.75); }
                .lw-detail-db-badge { padding:0.6px 1.84px; background:#e1e1e1; border-radius:4.08px; font-family:'DM Sans',sans-serif; font-size:2.04px; font-weight:700; color:#a4260e; letter-spacing:0.12px; text-transform:uppercase; }
                .lw-detail-close { width:5.31px; height:5.31px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.12); border-radius:1.23px; font-size:2.86px; color:rgba(255,255,255,0.7); }
                .lw-detail-score-row { display:flex; align-items:flex-end; gap:2.45px; padding:0 2.86px 2.86px; background:rgba(16,87,92,0.75); }
                .lw-detail-score-num { font-family:'DM Mono',monospace; font-size:10.61px; font-weight:400; line-height:10.61px; color:#fff; }
                .lw-detail-hot { padding:0.61px 1.63px; background:#e1e1e1; border-radius:1.23px; font-family:'DM Sans',sans-serif; font-size:2.04px; font-weight:700; color:#a4260e; letter-spacing:0.12px; text-transform:uppercase; }
                .lw-detail-score-label { font-family:'DM Sans',sans-serif; font-size:2.25px; color:#ffc801; font-weight:500; margin-top:0.82px; }
                .lw-detail-body { padding:3.27px 3px 3.67px; background:linear-gradient(to bottom,rgba(255,255,255,0.65),rgba(244,244,244,0.65)); backdrop-filter:blur(1.5px); box-shadow:0 2.65px 8.84px rgba(0,0,0,0.2); }
                .lw-detail-addr { font-family:'Playfair Display',serif; font-size:3.27px; font-weight:700; color:#0f1a16; margin:0; }
                .lw-detail-sub { font-family:'DM Sans',sans-serif; font-size:2.45px; font-weight:400; color:#7a9a8c; margin:0.61px 0 0; }
                .lw-detail-vals { display:grid; grid-template-columns:1fr 1fr; gap:2.45px; padding:2.25px 0; }
                .lw-detail-val-group { display:flex; flex-direction:column; gap:0.61px; }
                .lw-detail-val-head { font-family:'DM Sans',sans-serif; font-size:1.94px; font-weight:700; color:#7a9a8c; text-transform:uppercase; letter-spacing:0.19px; }
                .lw-detail-val-text { font-family:'DM Sans',sans-serif; font-size:2.76px; font-weight:600; color:#0f1a16; }
                .lw-detail-hr { border:none; height:0.2px; background:#d0ddd8; margin:0 0 0; }
                .lw-detail-specs { display:flex; gap:0; padding-top:2.25px; }
                .lw-detail-spec { flex:1; background:#fff; border-radius:1.63px; padding:1.23px 2.04px; text-align:center; }
                .lw-detail-spec-val { font-family:'DM Sans',sans-serif; font-size:2.45px; font-weight:600; color:#04342c; display:block; }
                .lw-detail-spec-label { font-family:'DM Sans',sans-serif; font-size:1.94px; font-weight:500; color:#7a9a8c; display:block; }
                .lw-detail-actions { display:flex; gap:1px; padding:0 3.27px 3.27px; background:linear-gradient(to right,rgba(255,255,255,0.09),rgba(244,244,244,0.3)); backdrop-filter:blur(1.5px); box-shadow:0 2.65px 8.84px rgba(0,0,0,0.2); }
                .lw-detail-btn { flex:1; padding:2.04px 0; border-radius:1.84px; font-family:'DM Sans',sans-serif; font-size:2.55px; font-weight:600; text-align:center; background:#e1e1e1; border:0.2px solid #d0ddd8; color:#04342c; display:flex; align-items:center; justify-content:center; }
                .lw-detail-btn--primary { background:#10575c; border:none; color:#fff; }
                .lw-bottom-bar {
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                    padding: 9px 25px;
                    margin-top: -16px;
                    background: #10575c;
                    border: none;
                    border-radius: 0 0 8px 8px;
                    -webkit-backdrop-filter: blur(7px);
                    backdrop-filter: blur(7px);
                    box-sizing: border-box;
                }
                .lw-bottom-title {
                    margin: 0;
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: 19px;
                    line-height: 24px;
                    color: #edf4f0;
                }
                .lw-bottom-sub {
                    margin: 0;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 13px;
                    line-height: 18px;
                    color: #d4af6a;
                }
                @media (max-width: 900px) {
                    .landing-welcome-inner {
                        grid-template-columns: 1fr;
                    }
                    .landing-welcome-copy {
                        max-width: 100%;
                    }
                    .landing-welcome-preview {
                        max-width: 100%;
                        justify-self: stretch;
                    }
                    .lw-kpi-row {
                        flex-direction: column;
                    }
                    .lw-kpi-pair {
                        width: 100%;
                    }
                }

                /* WHY CHOOSE IPM — section header (Figma 67-708) */
                .why-ipm-section {
                    background: #ffffff;
                    padding: clamp(56px, 7vh, 84px) clamp(20px, 5vw, 360px);
                    width: 100%;
                    box-sizing: border-box;
                }
                .why-ipm-inner {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 clamp(16px, 5vw, 52px);
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 15px;
                }
                .why-ipm-eyebrow {
                    margin: 0;
                    font-family: 'Jost', 'Poppins', system-ui, sans-serif;
                    font-weight: 600;
                    font-size: 10px;
                    line-height: 16px;
                    letter-spacing: 2.8px;
                    text-transform: uppercase;
                    color: #78736d;
                }
                .why-ipm-heading {
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                }
                .why-ipm-heading-line {
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 200;
                    font-size: clamp(28px, 4vw, 50px);
                    line-height: 48.4px;
                    color: #1a1714;
                }
                .why-ipm-heading-accent {
                    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
                    font-style: italic;
                    font-weight: 400;
                    font-size: clamp(30px, 4.2vw, 52px);
                    line-height: 52px;
                    letter-spacing: -1px;
                    color: #ffc801;
                }
                @media (max-width: 768px) {
                    .why-ipm-section {
                        padding: 60px 20px;
                    }
                    .why-ipm-heading-line {
                        line-height: 1.1;
                    }
                    .why-ipm-heading-accent {
                        line-height: 1.1;
                    }
                }

                /* WHY CHOOSE IPM — sub-heading (Figma 50-198) */
                .wc-subhead {
                    margin: 20px 0 0;
                    font-family: 'Playfair Display', Georgia, serif;
                    font-weight: 600;
                    font-size: clamp(28px, 4.2vw, 54.4px);
                    line-height: 1.1;
                    letter-spacing: -0.816px;
                    color: #111110;
                }
                .wc-subhead em {
                    font-family: 'Playfair Display', Georgia, serif;
                    font-weight: 600;
                    font-style: italic;
                    color: #04342c;
                }

                /* BENTO GRID LAYOUT */
                .wc-grid-wrap {
                    max-width: 1200px;
                    margin: 28px auto 0;
                    padding: 0 clamp(16px, 5vw, 52px);
                    width: 100%;
                    box-sizing: border-box;
                }
                @media (min-width: 961px) {
                    .why-ipm-section {
                        display: flex;
                        flex-direction: column;
                    }
                    .wc-grid-wrap {
                        padding-right: clamp(12px, 2vw, 24px);
                    }
                }
                .wc-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    grid-template-rows: auto auto auto auto auto;
                    gap: 12px;
                    width: 100%;
                }
                .wc-card {
                    border-radius: 20px;
                    overflow: hidden;
                    position: relative;
                    box-sizing: border-box;
                }
                .wc-eyebrow {
                    margin: 0;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 500;
                    font-size: 9.5px;
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                    line-height: normal;
                    color: #10575c;
                }
                .wc-card-title {
                    margin: 0;
                    font-family: 'Playfair Display', Georgia, serif;
                    font-weight: 600;
                }
                .wc-card-title em {
                    font-family: 'Playfair Display', Georgia, serif;
                    font-weight: 600;
                    font-style: italic;
                }
                .wc-card-desc {
                    margin: 0;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 400;
                    line-height: 1.72;
                }
                .wc-pill {
                    display: inline-block;
                    padding: 3px 10px;
                    border-radius: 100px;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 500;
                    font-size: 9px;
                    letter-spacing: 0.54px;
                    text-transform: uppercase;
                    line-height: normal;
                    background: rgba(16, 87, 92, 0.1);
                    border: 1px solid rgba(16, 87, 92, 0.24);
                    color: #10575c;
                }

                /* C1: FREE LEADS — mint/golden card */
                .wc-c1 {
                    grid-column: 1;
                    grid-row: 1 / 3;
                    background: rgba(255, 200, 1, 0.7);
                    border: 1px solid #ffc801;
                    padding: 33px 39px 23px;
                    display: flex;
                    flex-direction: column;
                    gap: 35px;
                    min-height: 500px;
                }
                .wc-c1-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(4, 52, 44, 0.07);
                    border: 1px solid rgba(4, 52, 44, 0.12);
                    border-radius: 100px;
                    padding: 5px 13px 5px 9px;
                }
                .wc-c1-badge-dot {
                    width: 6px;
                    height: 6px;
                    background: #065c4f;
                    border-radius: 3px;
                    flex-shrink: 0;
                }
                .wc-c1-badge span {
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 500;
                    font-size: 9.5px;
                    letter-spacing: 0.95px;
                    text-transform: uppercase;
                    color: #065c4f;
                }
                .wc-c1-price {
                    margin: 12px 0 0;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 700;
                    font-size: 86.4px;
                    line-height: 1;
                    letter-spacing: -2.59px;
                    color: #04342c;
                }
                .wc-c1-subtitle {
                    margin: 8px 0 0;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 600;
                    font-size: 14.5px;
                    color: #065c4f;
                }
                .wc-c1-desc {
                    margin: 8px 0 0;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 400;
                    font-size: 13px;
                    line-height: 22.36px;
                    color: rgba(4, 52, 44, 0.55);
                    max-width: 280px;
                }
                .wc-c1-table {
                    background: rgba(255, 255, 255, 0.55);
                    backdrop-filter: blur(2px);
                    border: 1px solid rgba(255, 255, 255, 0.7);
                    border-radius: 14px;
                    overflow: hidden;
                }
                .wc-c1-table-header {
                    display: flex;
                    justify-content: space-between;
                    padding: 9px 16px 10px;
                    background: rgba(255, 255, 255, 0.4);
                    border-bottom: 1px solid rgba(4, 52, 44, 0.07);
                }
                .wc-c1-table-header span {
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 500;
                    font-size: 8.5px;
                    letter-spacing: 1.36px;
                    text-transform: uppercase;
                    color: rgba(4, 52, 44, 0.4);
                }
                .wc-c1-table-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 16px;
                    border-bottom: 1px solid rgba(4, 52, 44, 0.05);
                }
                .wc-c1-table-row:last-child { border-bottom: none; }
                .wc-c1-table-row .wc-c1-label {
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 500;
                    font-size: 12.5px;
                    color: rgba(4, 52, 44, 0.65);
                }
                .wc-c1-table-row .wc-c1-value {
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 500;
                    font-size: 11px;
                }
                .wc-c1-value-free {
                    background: rgba(4, 52, 44, 0.1);
                    padding: 2px 10px;
                    border-radius: 100px;
                    color: #065c4f;
                }
                .wc-c1-value-strike {
                    color: rgba(4, 52, 44, 0.28);
                    text-decoration: line-through;
                }

                /* C2: NOT A LISTING SITE — dark card with comparison table */
                .wc-c2 {
                    grid-column: 2 / 4;
                    grid-row: 1;
                    background: #04342c;
                    padding: 34px 30px 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    min-height: 402px;
                }
                .wc-c2 .wc-eyebrow { color: #ffc801; letter-spacing: 1.71px; }
                .wc-c2 .wc-card-title {
                    font-size: clamp(17px, 1.8vw, 23px);
                    line-height: 1.25;
                    color: #f2ede0;
                    margin-top: 8px;
                }
                .wc-c2 .wc-card-desc {
                    font-size: 13px;
                    color: rgba(237, 232, 220, 0.72);
                    line-height: 1.45;
                    margin-top: 4px;
                }
                .wc-c1 > div:first-child,
                .wc-c5 > div:first-child,
                .wc-c6 > div:first-child,
                .wc-c8-left {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .wc-comp-table {
                    margin-top: auto;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    background: transparent;
                }
                .wc-comp-v2 {
                    margin-top: auto;
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0 6px;
                    table-layout: fixed;
                }
                .wc-comp-v2 thead th {
                    background: rgba(244, 248, 247, 0.95);
                    color: #356d70;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-size: 8px;
                    font-weight: 700;
                    letter-spacing: 0.95px;
                    text-transform: uppercase;
                    text-align: left;
                    padding: 9px 10px;
                    border: none;
                }
                .wc-comp-v2 thead th:first-child {
                    border-radius: 10px 0 0 10px;
                    padding-left: 12px;
                }
                .wc-comp-v2 thead th:last-child {
                    border-radius: 0 10px 10px 0;
                    background: #ffc801;
                    color: #53420a;
                }
                .wc-comp-v2 tbody td {
                    background: rgba(13, 91, 95, 0.44);
                    color: rgba(233, 241, 237, 0.72);
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-size: 11px;
                    padding: 9px 10px;
                    border: none;
                }
                .wc-comp-v2 tbody td:first-child {
                    color: rgba(242, 237, 224, 0.94);
                    font-weight: 500;
                    text-align: left;
                    padding-left: 12px;
                    border-radius: 10px 0 0 10px;
                }
                .wc-comp-v2 tbody td:last-child {
                    color: #eef9f4;
                    font-size: 11.5px;
                    font-weight: 600;
                    background: rgba(16, 87, 92, 0.7);
                    border-radius: 0 10px 10px 0;
                }
                .wc-comp-v2 td.wc-comp-v2-dash {
                    color: rgba(242, 237, 224, 0.45);
                }
                .wc-comp-table-row {
                    display: grid;
                    grid-template-columns: minmax(0, 1.6fr) minmax(90px, 0.85fr) minmax(90px, 0.85fr) minmax(140px, 1fr);
                    align-items: stretch;
                    column-gap: 6px;
                }
                .wc-comp-table-row.wc-comp-header {
                    background: transparent;
                }
                .wc-comp-table-row.wc-comp-header span {
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 700;
                    font-size: 8px;
                    letter-spacing: 0.95px;
                    text-transform: uppercase;
                    color: #356d70;
                    padding: 9px 10px;
                    text-align: center;
                    background: rgba(244, 248, 247, 0.95);
                    border: none;
                    border-radius: 10px;
                }
                .wc-comp-table-row.wc-comp-header span:first-child {
                    text-align: left;
                    padding-left: 12px;
                }
                .wc-comp-cell {
                    padding: 9px 10px;
                    text-align: center;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-size: 11.5px;
                    box-sizing: border-box;
                    border: none;
                    border-radius: 10px;
                    background: rgba(13, 91, 95, 0.44);
                }
                .wc-comp-cell:first-child {
                    text-align: left;
                    padding-left: 12px;
                    color: rgba(242, 237, 224, 0.94);
                    font-weight: 500;
                }
                .wc-comp-cell-portal,
                .wc-comp-cell-crm {
                    width: 98px;
                    color: rgba(233, 241, 237, 0.72);
                    font-size: 11px;
                }
                .wc-comp-cell-ipm {
                    color: #eef9f4;
                    font-size: 11.5px;
                    font-weight: 600;
                    text-align: left;
                    white-space: normal;
                    background: rgba(16, 87, 92, 0.7);
                }
                .wc-comp-cell-dash {
                    color: rgba(242, 237, 224, 0.45);
                }
                .wc-comp-header .wc-comp-cell-ipm {
                    color: #53420a;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 700;
                    font-size: 8px;
                    letter-spacing: 0.95px;
                    text-transform: uppercase;
                    text-align: left;
                    background: #ffc801;
                }
                .wc-comp-table-row:last-child {
                    border-bottom: none;
                }

                /* C5: ROI SIMULATION — dark forest card */
                .wc-c5 {
                    grid-column: 1;
                    grid-row: 3;
                    background: #04342c;
                    padding: 28px 32px 21px;
                    display: flex;
                    flex-direction: column;
                    min-height: 373px;
                }
                .wc-c5 .wc-eyebrow { color: rgba(255, 200, 1, 0.8); }
                .wc-c5 .wc-card-title {
                    font-size: 21.6px;
                    line-height: 27px;
                    color: #ede8dc;
                    margin-top: 12px;
                }
                .wc-c5 .wc-card-title em { color: rgba(255, 200, 1, 0.75); }
                .wc-c5 .wc-card-desc {
                    font-size: 12.5px;
                    line-height: 21.5px;
                    color: rgba(237, 232, 220, 0.38);
                    margin-top: 8px;
                }
                .wc-c5-stat {
                    display: flex;
                    align-items: baseline;
                    gap: 3px;
                    margin-top: 19px;
                    color: #ede8dc;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 700;
                }
                .wc-c5-stat-num {
                    font-size: 64px;
                    line-height: 1;
                    letter-spacing: -1.92px;
                }
                .wc-c5-stat-pct {
                    font-size: 27.2px;
                    letter-spacing: -0.27px;
                }
                .wc-c5-tags {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    margin-top: 7px;
                }
                .wc-c5-tags .wc-pill {
                    background: rgba(255, 200, 1, 0.14);
                    border: 1px solid rgba(255, 200, 1, 0.4);
                    color: #ffc801;
                    font-size: 9.5px;
                    letter-spacing: 0.76px;
                }
                .wc-c5-tags .wc-c5-proj {
                    font-family: 'DM Sans', sans-serif;
                    font-size: 11.5px;
                    color: rgba(237, 232, 220, 0.3);
                }
                .wc-c5-bars {
                    display: flex;
                    align-items: flex-end;
                    gap: 4px;
                    height: 53px;
                    margin-top: 8px;
                }
                .wc-c5-bar {
                    flex: 1;
                    border-radius: 4px 4px 0 0;
                    background: rgba(255, 255, 255, 0.1);
                }
                .wc-c5-bar-active {
                    background: rgba(255, 200, 1, 0.8);
                }

                /* C6: HIERARCHY — white card */
                .wc-c6 {
                    grid-column: 2;
                    grid-row: 2 / 4;
                    background: #fff;
                    border: 1px solid rgba(16, 87, 92, 0.16);
                    padding: 32px 33px 37px;
                    display: flex;
                    flex-direction: column;
                    gap: 30px;
                    min-height: 465px;
                }
                .wc-c6 .wc-eyebrow { color: #10575c; }
                .wc-c6 .wc-card-title {
                    font-size: 21.6px;
                    line-height: 27px;
                    color: #111110;
                    margin-top: 12px;
                }
                .wc-c6 .wc-card-title em { color: #065c4f; }
                .wc-c6 .wc-card-desc {
                    font-size: 13px;
                    line-height: 22.36px;
                    color: #6e6e68;
                    margin-top: 8px;
                }
                .wc-c6-levels {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .wc-c6-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 9px 12px;
                    border-radius: 9px;
                    overflow: hidden;
                }
                .wc-c6-row-dark {
                    background: #04342c;
                }
                .wc-c6-row-dark .wc-c6-label {
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 600;
                    font-size: 12.5px;
                    color: #fff;
                }
                .wc-c6-row-dark .wc-pill {
                    background: rgba(255, 200, 1, 0.16);
                    border-color: rgba(255, 200, 1, 0.35);
                    color: #ffc801;
                }
                .wc-c6-row-light {
                    background: #f0f5f3;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                }
                .wc-c6-row-light .wc-c6-label {
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 600;
                    font-size: 12.5px;
                    color: #3a3a36;
                }
                .wc-c6-row-light .wc-pill {
                    background: rgba(16, 87, 92, 0.08);
                    border: 1px solid rgba(16, 87, 92, 0.2);
                    color: #10575c;
                }
                .wc-c6-investor {
                    background: #04342c;
                    border: 1px solid rgba(255, 200, 1, 0.46);
                }
                .wc-c6-investor .wc-c6-label {
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 600;
                    font-size: 12.5px;
                    color: #fff;
                }
                .wc-c6-investor .wc-pill {
                    background: rgba(255, 200, 1, 0.16);
                    border-color: rgba(255, 200, 1, 0.38);
                    color: #ffc801;
                }

                /* C4: STAGING AI — grey-green card */
                .wc-c4 {
                    grid-column: 3;
                    grid-row: 2 / 4;
                    background: #6b7268;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    min-height: 472px;
                }
                .wc-c4-header {
                    padding: 28px 20px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .wc-c4 .wc-eyebrow { color: #ffc801; }
                .wc-c4 .wc-card-title {
                    font-size: 19.2px;
                    line-height: 24.58px;
                    color: #ede8dc;
                }
                .wc-c4 .wc-card-title em { color: #10575c; }
                .wc-c4-tabs {
                    display: flex;
                    gap: 6px;
                    padding: 0 16px 14px;
                }
                .wc-c4-tab {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 14px 7px 10px;
                    border-radius: 100px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: rgba(255, 255, 255, 0.1);
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 500;
                    font-size: 9.5px;
                    letter-spacing: 0.95px;
                    text-transform: uppercase;
                    color: #ede8dc;
                    cursor: pointer;
                }
                .wc-c4-tab-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 2.5px;
                    background: #10575c;
                    box-shadow: 0 0 5px #1abba3;
                }
                .wc-c4-tab-inactive {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.12);
                    color: rgba(237, 232, 220, 0.38);
                }
                .wc-c4-tab-inactive .wc-c4-tab-dot {
                    background: rgba(237, 232, 220, 0.3);
                    box-shadow: none;
                }
                .wc-c4-visual {
                    flex: 1;
                    min-height: 180px;
                    overflow: hidden;
                    position: relative;
                }
                .wc-c4-footer {
                    padding: 10px 20px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .wc-c4-footer-caption {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    padding: 10px 0 4px;
                }
                .wc-c4-footer-caption img {
                    width: 8px;
                    height: 8px;
                }
                .wc-c4-footer-caption span {
                    font-family: 'DM Sans', sans-serif;
                    font-style: italic;
                    font-size: 10px;
                    color: rgba(255, 255, 255, 0.8);
                }
                .wc-c4-footer p {
                    margin: 0;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 11.5px;
                    line-height: 18.4px;
                    color: rgba(255, 255, 255, 0.8);
                }

                /* C8: AUTOMATED TASKS — white card */
                .wc-c8 {
                    grid-column: 1 / 3;
                    grid-row: 4;
                    background: #fff;
                    border: 1px solid rgba(16, 87, 92, 0.16);
                    padding: 37px 19px 37px 19px;
                    display: flex;
                    min-height: 321px;
                }
                .wc-c8-left {
                    flex: 0 0 47%;
                    position: relative;
                }
                .wc-c8-right {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding-left: 20px;
                }
                .wc-c8 .wc-eyebrow { color: #10575c; }
                .wc-c8 .wc-card-title {
                    font-size: 21.6px;
                    line-height: 27px;
                    color: #111110;
                    margin-top: 12px;
                }
                .wc-c8 .wc-card-title em { color: #065c4f; }
                .wc-c8 .wc-card-desc {
                    font-size: 13px;
                    line-height: 22.36px;
                    color: #6e6e68;
                    margin-top: 8px;
                }
                .wc-c8-stat {
                    display: flex;
                    align-items: baseline;
                    gap: 4px;
                    margin-top: 12px;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 700;
                    color: #04342c;
                }
                .wc-c8-stat-num {
                    font-size: 73.6px;
                    line-height: 1;
                    letter-spacing: -2.94px;
                }
                .wc-c8-stat-pct {
                    font-size: 22.4px;
                    letter-spacing: -0.45px;
                }
                .wc-c8-stat-label {
                    margin-top: 4px;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 600;
                    font-size: 12px;
                    color: #6e6e68;
                }
                .wc-c8-task-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 13px;
                    background: #f0f5f3;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    border-radius: 9px;
                }
                .wc-c8-task-icon {
                    width: 20px;
                    height: 20px;
                    border-radius: 6px;
                    background: #04342c;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .wc-c8-task-icon img {
                    width: 10px;
                    height: 10px;
                }
                .wc-c8-task-text {
                    flex: 1;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 500;
                    font-size: 12px;
                    color: #3a3a36;
                }
                .wc-c8-task-badge {
                    padding: 3px 9px;
                    border-radius: 100px;
                    background: #ffc801;
                    border: 1px solid #d8a900;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 600;
                    font-size: 11px;
                    line-height: 1.2;
                    color: #04342c;
                    white-space: nowrap;
                }

                /* C3: PIPELINE — white card with bar chart */
                .wc-c3 {
                    grid-column: 3;
                    grid-row: 4;
                    background: #fff;
                    border: 1px solid rgba(16, 87, 92, 0.16);
                    padding: 24px 35px;
                    display: flex;
                    flex-direction: column;
                    min-height: 319px;
                }
                .wc-c3 .wc-eyebrow { color: #10575c; }
                .wc-c3 .wc-card-title {
                    font-size: 23.2px;
                    line-height: 29px;
                    color: #111110;
                    margin-top: 4px;
                }
                .wc-c3 .wc-card-title em { color: #065c4f; }
                .wc-c3 .wc-card-desc {
                    font-size: 13px;
                    line-height: 22.36px;
                    color: #6e6e68;
                    margin-top: 8px;
                }
                .wc-c3-chart {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 6px;
                    margin-top: auto;
                    padding-top: 16px;
                }
                .wc-c3-col {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .wc-c3-bar-wrap {
                    width: 100%;
                    height: 76px;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                }
                .wc-c3-bar {
                    width: 100%;
                    border-radius: 6px 6px 0 0;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    padding-bottom: 6px;
                    box-sizing: border-box;
                }
                .wc-c3-bar span {
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 700;
                    font-size: 12px;
                    color: #04342c;
                }
                .wc-c3-bar-teal { background: #10575c; }
                .wc-c3-bar-teal span { color: #fff; }
                .wc-c3-bar-forest { background: #04342c; }
                .wc-c3-bar-forest span { color: #fff; }
                .wc-c3-bar-grey { background: #f0f5f3; }
                .wc-c3-bar-gold { background: rgba(196, 154, 60, 0.22); }
                .wc-c3-label {
                    margin-top: 6px;
                    font-family: 'Poppins', system-ui, sans-serif;
                    font-weight: 500;
                    font-size: 8.5px;
                    letter-spacing: 0.85px;
                    text-transform: uppercase;
                    color: #aaa;
                    text-align: center;
                }
                .wc-c3-footnote {
                    margin-top: 8px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 10.5px;
                    color: #adadaa;
                }
                .wc-c3-footnote strong {
                    font-weight: 600;
                    color: #065c4f;
                }

                /* C7: PARTNER CTA — full-width golden card */
                .wc-c7 {
                    grid-column: 1 / 4;
                    grid-row: 5;
                    background: rgba(255, 200, 1, 0.36);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    padding: 39px 51px;
                    display: flex;
                    align-items: center;
                    gap: 28px;
                    min-height: 120px;
                }
                .wc-c7-left {
                    display: flex;
                    align-items: center;
                    gap: 32px;
                    flex: 1;
                }
                .wc-c7-stat {
                    flex-shrink: 0;
                    width: 110px;
                }
                .wc-c7-stat .wc-eyebrow { color: #d4922a; }
                .wc-c7-stat-num {
                    margin: 2px 0 0;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 700;
                    font-size: 60.8px;
                    line-height: 1;
                    letter-spacing: -1.82px;
                    color: #04342c;
                }
                .wc-c7-divider {
                    width: 1px;
                    height: 50px;
                    background: rgba(0, 0, 0, 0.08);
                    flex-shrink: 0;
                }
                .wc-c7-copy {
                    flex: 1;
                    max-width: 454px;
                }
                .wc-c7-copy h4 {
                    margin: 0;
                    font-family: 'Playfair Display', Georgia, serif;
                    font-weight: 600;
                    font-size: 20px;
                    line-height: 26px;
                    color: #111110;
                }
                .wc-c7-copy p {
                    margin: 5px 0 0;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 13px;
                    line-height: 21.84px;
                    color: #6e6e68;
                }
                .wc-c7-btn {
                    display: inline-flex;
                    align-items: center;
                    padding: 13px 26px;
                    border-radius: 100px;
                    background: #04342c;
                    color: #f2ede0;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 600;
                    font-size: 13px;
                    text-decoration: none;
                    white-space: nowrap;
                    flex-shrink: 0;
                    border: none;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .wc-c7-btn:hover { background: #065c4f; }

                /* BENTO GRID — responsive */
                @media (max-width: 960px) {
                    .wc-grid {
                        grid-template-columns: repeat(2, 1fr);
                        grid-template-rows: auto;
                    }
                    .wc-c1 { grid-column: 1; grid-row: auto; }
                    .wc-c2 { grid-column: 1 / 3; grid-row: auto; }
                    .wc-c5 { grid-column: 1; grid-row: auto; }
                    .wc-c6 { grid-column: 2; grid-row: auto; }
                    .wc-c4 { grid-column: 1 / 3; grid-row: auto; }
                    .wc-c8 { grid-column: 1 / 3; grid-row: auto; }
                    .wc-c3 { grid-column: 1 / 3; grid-row: auto; }
                    .wc-c7 { grid-column: 1 / 3; grid-row: auto; }
                }
                @media (max-width: 640px) {
                    .wc-grid {
                        grid-template-columns: 1fr;
                    }
                    .wc-c1, .wc-c2, .wc-c3, .wc-c4,
                    .wc-c5, .wc-c6, .wc-c7, .wc-c8 {
                        grid-column: 1;
                        grid-row: auto;
                    }
                    .wc-c7 {
                        flex-direction: column;
                        align-items: flex-start;
                        padding: 28px 24px;
                    }
                    .wc-c7-left {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 16px;
                    }
                    .wc-c7-divider {
                        width: 50px;
                        height: 1px;
                    }
                    .wc-c8 {
                        flex-direction: column;
                    }
                    .wc-c8-right {
                        padding-left: 0;
                        padding-top: 20px;
                    }
                }

                /* DARK FEATURE — Anima design on IPM site (responsive, Figma asset) */
                #home-dark-feature {
                    --ipm-green: rgba(16, 87, 92, 1);
                    --ipm-orange: rgba(255, 178, 27, 1);
                    --ipm-grey: rgba(194, 195, 195, 1);
                    --IPM-poppins-light-copy-font-family: 'Poppins', Helvetica, sans-serif;
                    --IPM-poppins-light-copy-font-weight: 300;
                    --IPM-poppins-light-copy-font-size: 16px;
                    --IPM-poppins-light-copy-letter-spacing: 0px;
                    --IPM-poppins-light-copy-line-height: normal;
                    --IPM-poppins-light-copy-font-style: normal;
                    --IPM-poppins-semibold-copy-font-family: 'Poppins', Helvetica, sans-serif;
                    --IPM-poppins-semibold-copy-font-weight: 600;
                    --IPM-poppins-semibold-copy-font-size: 16px;
                    --IPM-poppins-semibold-copy-letter-spacing: 0px;
                    --IPM-poppins-semibold-copy-line-height: normal;
                    --IPM-poppins-semibold-copy-font-style: normal;
                    --IPM-poppins-light-heading-font-family: 'Poppins', Helvetica, sans-serif;
                    --IPM-poppins-light-heading-font-weight: 200;
                    --IPM-poppins-light-heading-font-size: clamp(32px, 2.62vw, 50px);
                    --IPM-poppins-light-heading-letter-spacing: 0px;
                    --IPM-poppins-light-heading-line-height: normal;
                    --IPM-poppins-light-heading-font-style: normal;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    max-width: 100%;
                    background-color: var(--ipm-grey);
                    overflow-x: hidden;
                    box-sizing: border-box;
                }
                #home-dark-feature .container {
                    display: grid;
                    grid-template-columns: 1fr;
                    align-items: stretch;
                    width: 100%;
                    max-width: 100%;
                    margin: 0 auto;
                    background-color: var(--ipm-grey);
                    box-sizing: border-box;
                }
                @media (min-width: 961px) {
                    #home-dark-feature .container {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        grid-template-rows: auto;
                        align-items: stretch;
                    }
                }
                #home-dark-feature .df-visual {
                    position: relative;
                    width: 100%;
                    min-height: min(22rem, 60vh);
                    height: auto;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }
                @media (min-width: 961px) {
                    #home-dark-feature .df-visual {
                        height: 100%;
                        min-height: 0;
                    }
                }
                #home-dark-feature .df-visual-bg {
                    position: absolute;
                    inset: 0;
                    background-color: #0a0a0a;
                    background-image: url('/img/image-container.png');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                }
                #home-dark-feature .df-visual-bg::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.3);
                    pointer-events: none;
                }
                #home-dark-feature .df-visual-inner {
                    position: relative;
                    z-index: 1;
                    flex: 1 1 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    min-height: 0;
                    height: 100%;
                    padding: 14px 12px 16px;
                    box-sizing: border-box;
                }
                @media (min-width: 961px) {
                    #home-dark-feature .df-visual-inner {
                        padding: 20px 16px 18px;
                        gap: 12px;
                    }
                }
                #home-dark-feature .df-top-row {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    align-items: stretch;
                    flex-shrink: 0;
                }
                @media (min-width: 520px) {
                    #home-dark-feature .df-top-row {
                        flex-direction: row;
                        flex-wrap: wrap;
                        align-items: center;
                        justify-content: space-between;
                    }
                }
                #home-dark-feature .df-brand-title {
                    font-family: 'Poppins', sans-serif;
                    font-weight: 700;
                    font-size: 22px;
                    line-height: 1.1;
                    color: #fff;
                    margin: 0;
                }
                #home-dark-feature .df-brand-accent {
                    font-family: 'Playfair Display', Georgia, serif;
                    font-style: italic;
                    font-weight: 400;
                    font-size: 26px;
                    line-height: 1.1;
                    color: #ffc801;
                    margin: 4px 0 0;
                }
                #home-dark-feature .df-search {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    width: 100%;
                    min-width: 0;
                    max-width: 42rem;
                    padding: 15px 22px;
                    border-radius: 999px;
                    border: 1px solid rgba(255, 255, 255, 0.22);
                    background: rgba(255, 255, 255, 0.08);
                    color: rgba(255, 255, 255, 0.72);
                    font-family: 'Poppins', sans-serif;
                    font-size: 14px;
                }
                @media (min-width: 961px) {
                    #home-dark-feature .df-search {
                        max-width: 42rem;
                    }
                }
                #home-dark-feature .df-search span {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                #home-dark-feature .df-search i {
                    color: rgba(255, 255, 255, 0.85);
                    font-size: 11px;
                    flex-shrink: 0;
                }
                #home-dark-feature .df-cards {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 9px;
                    flex: 0 0 auto;
                    min-height: 0;
                    align-content: end;
                    align-items: stretch;
                    margin-top: auto;
                }
                @media (min-width: 961px) {
                    #home-dark-feature .df-cards {
                        grid-template-columns: 185fr 169fr 169fr 317fr;
                    }
                }
                #home-dark-feature .df-metrics-col {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    align-self: stretch;
                }
                #home-dark-feature .df-panel {
                    padding: 12px;
                    border-radius: 9px;
                    background: rgba(255, 255, 255, 0.3);
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                    box-shadow: 0 5px 16px rgba(44, 47, 47, 0.2);
                    box-sizing: border-box;
                    min-width: 0;
                    color: #fff;
                }
                #home-dark-feature .df-panel--metric {
                    flex: 1 1 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                #home-dark-feature .df-metric-row {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 6px;
                }
                #home-dark-feature .df-metric-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    min-width: 0;
                }
                #home-dark-feature .df-metric-label {
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 600;
                    font-size: 11px;
                    color: #fff;
                    line-height: 1.0;
                }
                #home-dark-feature .df-metric-sub {
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 400;
                    font-size: 6px;
                    color: rgba(255, 255, 255, 0.85);
                    line-height: 1.28;
                }
                #home-dark-feature .df-metric-val {
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 600;
                    font-size: 18px;
                    color: #fff;
                    line-height: 1.2;
                    flex-shrink: 0;
                }
                #home-dark-feature .df-pill-white {
                    display: inline-block;
                    padding: 4px 7px;
                    border-radius: 999px;
                    background: #fff;
                    font-family: 'Poppins', sans-serif;
                    font-size: 7px;
                    font-weight: 600;
                    color: rgba(16, 87, 92, 0.5);
                    line-height: 1.4;
                    align-self: flex-start;
                }
                #home-dark-feature .df-pill-white--sm {
                    font-size: 7px;
                    font-weight: 500;
                    padding: 2px 8px;
                }
                #home-dark-feature .df-panel-title {
                    margin: 0 0 2px;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 600;
                    font-size: 11px;
                    color: #fff;
                    line-height: 1.0;
                }
                #home-dark-feature .df-panel-title--flush {
                    margin: 0;
                }
                #home-dark-feature .df-panel-sub {
                    margin: 0 0 8px;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 400;
                    font-size: 6px;
                    line-height: 1.28;
                    color: rgba(255, 255, 255, 0.85);
                }
                #home-dark-feature .df-panel-sub--flush {
                    margin: 2px 0 0;
                }
                #home-dark-feature .df-panel--confidence {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 12px;
                    overflow: hidden;
                    min-height: 0;
                }
                #home-dark-feature .df-conf-heading {
                    margin-bottom: 0;
                    width: 100%;
                }
                #home-dark-feature .df-conf-heading .df-panel-title {
                    margin: 0 0 4px;
                }
                #home-dark-feature .df-conf-heading .df-panel-sub {
                    margin: 0;
                }
                #home-dark-feature .df-gauge-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                    margin-bottom: 0;
                    width: fit-content;
                    max-width: 100%;
                }
                /* Match Figma node 388:94 — arc frame 75.153×38.041px; never stretch (SVG had preserveAspectRatio="none") */
                #home-dark-feature .df-gauge-img {
                    width: min(75.153px, 100%);
                    height: auto;
                    aspect-ratio: 75.1533 / 38.041;
                    object-fit: contain;
                    flex-shrink: 0;
                    display: block;
                }
                #home-dark-feature .df-gauge-label {
                    margin-top: -2px;
                    font-family: 'Poppins', sans-serif;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0;
                }
                #home-dark-feature .df-gauge-pct {
                    font-size: 14px;
                    font-weight: 600;
                    color: #f8faf9;
                    line-height: 1;
                }
                #home-dark-feature .df-gauge-txt {
                    font-size: 9px;
                    font-weight: 400;
                    color: #f8faf9;
                    line-height: 1;
                    margin-top: 2px;
                }
                #home-dark-feature .df-feat-row {
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                    margin-top: 0;
                    margin-bottom: 0;
                    width: 100%;
                }
                #home-dark-feature .df-feat-row:last-child {
                    margin-bottom: 0;
                }
                #home-dark-feature .df-feat-row i {
                    color: rgba(255, 255, 255, 0.85);
                    font-size: 12px;
                    margin-top: 1px;
                    flex-shrink: 0;
                }
                #home-dark-feature .df-feat-icon {
                    width: 15px;
                    height: 15px;
                    flex-shrink: 0;
                    margin-top: 0;
                }
                #home-dark-feature .df-feat-t {
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                    font-size: 8px;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.85);
                    line-height: 1.4;
                }
                #home-dark-feature .df-feat-d {
                    margin: 2px 0 0;
                    font-family: 'Poppins', sans-serif;
                    font-size: 6px;
                    font-weight: 400;
                    color: rgba(255, 255, 255, 0.85);
                    line-height: 1.28;
                }
                #home-dark-feature .df-panel.df-panel--future {
                    padding: 12px;
                    height: auto;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                    min-height: 0;
                }
                #home-dark-feature .df-panel.df-panel--future .df-future-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    gap: 6px;
                    margin-bottom: 10px;
                }
                #home-dark-feature .df-panel.df-panel--future .df-future-media {
                    --df-future-score-inset: 6px;
                    width: 100%;
                    aspect-ratio: 144 / 108;
                    border-radius: 4px;
                    overflow: hidden;
                    border: none;
                    background: transparent;
                    position: relative;
                    margin: 0;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
                }
                #home-dark-feature .df-panel.df-panel--future .df-future-thumb-img {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center;
                    display: block;
                }
                /* Inside .df-future-media (Figma 388 — badge sits on photo, clipped to rounded frame) */
                #home-dark-feature .df-future-score-overlay {
                    position: absolute;
                    top: 8%;
                    right: 4px;
                    z-index: 3;
                    text-align: center;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    line-height: 1.15;
                    pointer-events: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    max-width: calc(100% - 8px);
                }
                #home-dark-feature .df-score-circle {
                    position: relative;
                    width: 54px;
                    height: 54px;
                }
                #home-dark-feature .df-score-bg {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    display: block;
                }
                #home-dark-feature .df-score-ring-img {
                    position: absolute;
                    top: 6px;
                    left: 6px;
                    width: 43px;
                    height: 36px;
                    display: block;
                }
                #home-dark-feature .df-score-inner {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    padding-top: 2px;
                    box-sizing: border-box;
                }
                #home-dark-feature .df-future-score-val {
                    font-size: 8px;
                    font-weight: 700;
                    color: #060606;
                    line-height: 1;
                    text-align: center;
                }
                #home-dark-feature .df-future-score-caption {
                    /* Tuck label just under the “87” (same horizontal center as .df-score-circle) */
                    margin-top: -22px;
                    width: 100%;
                    max-width: 54px;
                    margin-left: auto;
                    margin-right: auto;
                    font-size: 7px;
                    font-weight: 400;
                    color: #060606;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    line-height: 1;
                    position: relative;
                    z-index: 1;
                    text-align: center;
                }
                #home-dark-feature .df-score-label-ipm {
                    font-weight: 400;
                    font-size: 7px;
                    color: #060606;
                }
                #home-dark-feature .df-score-label-score {
                    font-weight: 600;
                    font-size: 7px;
                    color: #060606;
                }
                #home-dark-feature .df-panel--future .df-prop-blurb,
                #home-dark-feature .df-panel--future .df-view-now {
                    margin-bottom: 0;
                }
                #home-dark-feature .df-panel--future .df-prop-blurb {
                    margin-top: 10px;
                }
                #home-dark-feature .df-prop-blurb {
                    margin: 6px 0 8px;
                    font-family: 'Poppins', sans-serif;
                    font-size: 9px;
                    font-weight: 400;
                    color: rgba(255, 255, 255, 0.85);
                    line-height: 1.35;
                }
                #home-dark-feature .df-view-now {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-family: 'Poppins', sans-serif;
                    font-size: 8px;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.85);
                    margin: auto 0 0;
                }
                #home-dark-feature .df-view-now i {
                    color: rgba(255, 255, 255, 0.85);
                    font-size: 8px;
                }
                #home-dark-feature .df-view-now-caret {
                    width: 6px;
                    height: 10px;
                    display: inline-block;
                    vertical-align: middle;
                }
                #home-dark-feature .df-panel--return {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    padding: 18px 18px 14px;
                    border: 0.6px solid rgba(255, 255, 255, 0.2);
                    border-radius: 14px;
                    background: rgba(255, 255, 255, 0.3);
                    backdrop-filter: blur(7px);
                    -webkit-backdrop-filter: blur(7px);
                    box-shadow: 0 7px 24px rgba(44, 47, 47, 0.06);
                    overflow: hidden;
                    min-height: 0;
                }
                #home-dark-feature .df-return-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 2px;
                }
                #home-dark-feature .df-return-head-right {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                #home-dark-feature .df-return-icon {
                    color: #fff;
                    font-size: 10px;
                }
                #home-dark-feature .df-return-icon-img {
                    width: 14px;
                    height: 12px;
                }
                #home-dark-feature .df-return-main {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 2px;
                }
                #home-dark-feature .df-big-pct {
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                    font-size: 18px;
                    font-weight: 400;
                    color: #fff;
                    line-height: 1.2;
                }
                #home-dark-feature .df-gain {
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                    font-size: 8px;
                    font-weight: 600;
                    color: #fff;
                    white-space: nowrap;
                }
                #home-dark-feature .df-bar-row {
                    display: flex;
                    height: auto;
                    border-radius: 0;
                    overflow: visible;
                    gap: 1px;
                    margin-bottom: 6px;
                }
                #home-dark-feature .df-bar-a {
                    flex: 11.2;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 3px 17px;
                    border-radius: 999px 0 0 999px;
                    background: linear-gradient(90deg, #c2c3c3, #fff);
                    font-family: 'Poppins', sans-serif;
                    font-size: 8px;
                    font-weight: 600;
                }
                #home-dark-feature .df-bar-a .df-bar-label {
                    color: #fff;
                }
                #home-dark-feature .df-bar-a .df-bar-amount {
                    color: #c2c3c3;
                }
                #home-dark-feature .df-bar-b {
                    flex: 7.2;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 3px 17px;
                    border-radius: 0 999px 999px 0;
                    background: #c2c3c3;
                    font-family: 'Poppins', sans-serif;
                    font-size: 8px;
                    font-weight: 600;
                    color: #fff;
                }
                #home-dark-feature .df-bar-legend {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 6px;
                    font-family: 'Poppins', sans-serif;
                    font-size: 8px;
                    font-weight: 400;
                    color: #fff;
                }
                #home-dark-feature .df-legend-item {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                #home-dark-feature .df-legend-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }
                #home-dark-feature .df-legend-dot--growth {
                    background: linear-gradient(135deg, #c2c3c3, #e8e8e8);
                }
                #home-dark-feature .df-legend-dot--rental {
                    background: #c2c3c3;
                }
                #home-dark-feature .df-legend-dot-img {
                    width: 11px;
                    height: 11px;
                    flex-shrink: 0;
                }
                #home-dark-feature .df-chart-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 4px;
                }
                #home-dark-feature .df-chart-cap {
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                    font-size: 9px;
                    font-weight: 400;
                    color: rgba(255, 255, 255, 0.85);
                }
                #home-dark-feature .df-chart-area {
                    position: relative;
                    width: 100%;
                    flex: 1 1 0;
                    min-height: 56px;
                    height: 56px;
                    overflow: visible;
                    margin-bottom: 2px;
                    border-radius: 6px;
                }
                #home-dark-feature .df-trend-svg {
                    width: 100%;
                    height: 100%;
                    display: block;
                    overflow: visible;
                }
                #home-dark-feature .df-trend-line {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.92);
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                #home-dark-feature .df-trend-dot {
                    fill: rgba(225, 225, 225, 0.98);
                    stroke: rgba(255, 255, 255, 0.45);
                    stroke-width: 0.75;
                }
                #home-dark-feature .df-chart-months {
                    display: flex;
                    justify-content: space-between;
                    font-family: 'Poppins', sans-serif;
                    font-size: 4px;
                    font-weight: 600;
                    color: #fff;
                    text-transform: uppercase;
                    padding: 0 3px;
                }
                #home-dark-feature .div {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0;
                    width: 100%;
                    box-sizing: border-box;
                    padding: 2.5rem 1.5rem 3rem 2rem;
                    background-color: var(--ipm-green);
                }
                @media (min-width: 961px) {
                    #home-dark-feature .div {
                        padding: clamp(40px, 4.19vw, 80px) clamp(32px, 3.35vw, 64px) clamp(40px, 4.19vw, 80px) clamp(36px, 3.77vw, 72px);
                        min-height: 0;
                        height: auto;
                        justify-content: center;
                    }
                }
                #home-dark-feature .df-eyebrow {
                    font-family: 'Jost', 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 10px;
                    letter-spacing: 2.2px;
                    line-height: 16px;
                    color: #10575c;
                    text-transform: uppercase;
                    white-space: nowrap;
                    margin-bottom: clamp(14px, 1.36vw, 26px);
                }
                #home-dark-feature .one-subscription-the {
                    margin: 0 0 clamp(6px, 0.63vw, 12px);
                    max-width: 100%;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 400;
                    color: transparent;
                    font-size: clamp(1.75rem, 4vw, 50px);
                    line-height: 50.88px;
                    letter-spacing: 0;
                }
                #home-dark-feature .text-wrapper {
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 200;
                    color: #ffffff;
                    font-style: normal;
                    letter-spacing: 0;
                    line-height: 50.88px;
                    font-size: clamp(1.75rem, 4vw, 50px);
                }
                #home-dark-feature .span {
                    font-family: 'Playfair Display', Georgia, serif;
                    font-style: italic;
                    font-weight: 400;
                    color: #ffc801;
                    line-height: 50.88px;
                    font-size: clamp(1.75rem, 4vw, 50px);
                    display: block;
                }
                #home-dark-feature .p.df-lead {
                    margin: 0 0 clamp(16px, 1.57vw, 30px);
                    width: 100%;
                    max-width: 100%;
                    overflow-wrap: break-word;
                    word-wrap: break-word;
                    font-family: var(--IPM-poppins-light-copy-font-family);
                    font-weight: var(--IPM-poppins-light-copy-font-weight);
                    color: #ffffff;
                    font-size: var(--IPM-poppins-light-copy-font-size);
                    letter-spacing: var(--IPM-poppins-light-copy-letter-spacing);
                    line-height: normal;
                    font-style: var(--IPM-poppins-light-copy-font-style);
                }
                #home-dark-feature .df-features {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    width: 100%;
                    align-self: stretch;
                    margin-bottom: 36px;
                }
                #home-dark-feature .df-feature {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    padding-bottom: 15px;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                }
                #home-dark-feature .df-feature--border {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
                }
                #home-dark-feature .df-feature-title {
                    font-family: var(--IPM-poppins-semibold-copy-font-family);
                    font-weight: var(--IPM-poppins-semibold-copy-font-weight);
                    color: #ffffff;
                    font-size: var(--IPM-poppins-semibold-copy-font-size);
                    letter-spacing: var(--IPM-poppins-semibold-copy-letter-spacing);
                    line-height: normal;
                    font-style: var(--IPM-poppins-semibold-copy-font-style);
                }
                #home-dark-feature .df-feature-body {
                    margin: 0;
                    width: 100%;
                    max-width: 100%;
                    overflow-wrap: break-word;
                    font-family: var(--IPM-poppins-light-copy-font-family);
                    font-weight: var(--IPM-poppins-light-copy-font-weight);
                    color: #ffffff;
                    font-size: var(--IPM-poppins-light-copy-font-size);
                    letter-spacing: var(--IPM-poppins-light-copy-letter-spacing);
                    line-height: normal;
                    font-style: var(--IPM-poppins-light-copy-font-style);
                }
                #home-dark-feature .df-feature-services-link {
                    margin-top: 10px;
                    align-self: flex-start;
                    font-family: var(--IPM-poppins-semibold-copy-font-family);
                    font-weight: 600;
                    font-size: 15px;
                    color: #ffc801;
                    text-decoration: none;
                    line-height: normal;
                }
                #home-dark-feature .df-feature-services-link:hover {
                    text-decoration: underline;
                }
                #home-dark-feature .container-9 {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: flex-start;
                    gap: 12px;
                    width: 100%;
                }
                #home-dark-feature .link {
                    display: inline-flex;
                    align-items: center;
                    padding: 13px 28px;
                    background-color: var(--ipm-orange);
                    border-radius: 14px;
                    text-decoration: none;
                    border: none;
                    cursor: pointer;
                    color: inherit;
                }
                #home-dark-feature .text-wrapper-4 {
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 700;
                    color: #ffffff;
                    font-size: 16px;
                    letter-spacing: 0;
                    line-height: normal;
                    font-style: normal;
                }
                #home-dark-feature .link-2 {
                    display: inline-flex;
                    align-items: center;
                    padding: 14px 21px;
                    border-radius: 14px;
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    text-decoration: none;
                    cursor: pointer;
                    color: inherit;
                    box-sizing: border-box;
                }
                #home-dark-feature .text-wrapper-5 {
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    color: rgba(245, 240, 232, 0.68);
                    font-size: 16px;
                    letter-spacing: 0;
                    line-height: normal;
                    font-style: normal;
                }
                #home-dark-feature .link:hover {
                    filter: brightness(1.05);
                }
                #home-dark-feature .link-2:hover {
                    background: rgba(255, 255, 255, 0.06);
                }
                /* SERVICE CARDS BAND — Anima SectionService (9Ohay) */
                #home-service-cards {
                    position: relative;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    background-color: #1a1714;
                    background-image: url('/img/section-service-cards.jpg');
                    background-size: cover;
                    background-position: 50% 50%;
                    padding: 64px 24px 80px;
                }
                @media (min-width: 961px) {
                    #home-service-cards {
                        padding: 100px min(360px, 11vw) 100px;
                    }
                }
                #home-service-cards .home-service-cards-inner {
                    max-width: min(100%, 75rem);
                    margin: 0 auto;
                    padding: 0 min(52px, 5vw);
                    box-sizing: border-box;
                }
                #home-service-cards .home-service-cards-head {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 24px;
                }
                @media (min-width: 640px) {
                    #home-service-cards .home-service-cards-head {
                        flex-direction: row;
                        flex-wrap: wrap;
                        align-items: flex-end;
                        justify-content: space-between;
                        gap: 24px 32px;
                    }
                }
                #home-service-cards .home-service-cards-copy {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 15px;
                    min-width: 0;
                    flex: 1 1 auto;
                }
                #home-service-cards .home-service-cards-eyebrow {
                    margin: 0;
                    font-family: 'Jost', 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 10px;
                    letter-spacing: 2.8px;
                    line-height: 16px;
                    color: #e1e1e1;
                    text-transform: uppercase;
                }
                #home-service-cards .home-service-cards-heading {
                    margin: 0;
                    max-width: 100%;
                    color: #1a1714;
                    font-size: 50px;
                    line-height: 50px;
                    letter-spacing: 0;
                }
                #home-service-cards .home-service-cards-heading-line1 {
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 200;
                    font-size: clamp(28px, 5vw, 50px);
                    line-height: 1.05;
                    letter-spacing: 0;
                    color: #ffffff;
                    font-style: normal;
                }
                #home-service-cards .home-service-cards-heading-line2 {
                    font-family: 'Playfair Display', Georgia, serif;
                    font-style: italic;
                    font-weight: 400;
                    font-size: clamp(28px, 5vw, 50px);
                    line-height: 1.07;
                    letter-spacing: 0;
                    color: #ffffff;
                    display: inline-block;
                    margin-top: 0.08em;
                }
                #home-service-cards .home-service-cards-link {
                    font-family: 'Jost', 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 13px;
                    line-height: 20.8px;
                    letter-spacing: 0;
                    color: #4a3f32;
                    text-decoration: none;
                    white-space: nowrap;
                    flex-shrink: 0;
                    padding-bottom: 2px;
                }
                #home-service-cards .home-service-cards-link:hover {
                    color: #5c4e3e;
                    text-decoration: underline;
                    text-underline-offset: 3px;
                }
                #home-service-cards .home-service-cards-link:focus-visible {
                    outline: 2px solid #ffc801;
                    outline-offset: 4px;
                }

                /* WHO IT'S FOR — Property Journey Cards */
                #home-pillars {
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    position: relative;
                    background-color: #232222;
                    background-image: url('/site-assets/section-service-cards.jpg');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    padding: 100px clamp(20px, 5vw, 360px);
                }
                #home-pillars::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: rgba(35, 34, 34, 0.5);
                    pointer-events: none;
                }
                #home-pillars > * {
                    position: relative;
                    z-index: 1;
                }
                
                #home-pillars .pillars-inner {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 52px;
                    box-sizing: border-box;
                }
                #home-pillars .pillars-eyebrow {
                    margin: 0 0 15px;
                    font-family: 'Jost', 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 10px;
                    letter-spacing: 2.8px;
                    line-height: 16px;
                    color: #e1e1e1;
                    text-transform: uppercase;
                }
                #home-pillars .pillars-heading {
                    margin: 0;
                    font-size: clamp(32px, 4.5vw, 50px);
                    line-height: 1;
                    letter-spacing: 0;
                    color: #ffffff;
                }
                #home-pillars .pillars-heading-line1 {
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 200;
                    font-size: clamp(32px, 4.5vw, 50px);
                    line-height: 45.36px;
                    color: #ffffff;
                    display: block;
                }
                #home-pillars .pillars-heading em {
                    font-family: 'Playfair Display', Georgia, serif;
                    font-style: italic;
                    font-weight: 400;
                    font-size: clamp(32px, 4.5vw, 50px);
                    line-height: 53.5px;
                    color: #ffffff;
                    display: block;
                }
                #home-pillars .pillars-head-row {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 24px;
                }
                @media (min-width: 640px) {
                    #home-pillars .pillars-head-row {
                        flex-direction: row;
                        align-items: flex-end;
                        justify-content: space-between;
                        gap: 32px;
                    }
                }
                #home-pillars .pillars-link {
                    display: inline-block;
                    font-family: 'Jost', 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 13px;
                    line-height: 20.8px;
                    color: #4a3f32;
                    text-decoration: none;
                    white-space: nowrap;
                    flex-shrink: 0;
                    transition: color 0.2s;
                }
                #home-pillars .pillars-link:hover {
                    color: #fff;
                }
                #home-pillars .pillars-grid {
                    margin-top: 40px;
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 22px;
                }
                @media (min-width: 700px) {
                    #home-pillars .pillars-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (min-width: 960px) {
                    #home-pillars .pillars-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }
                /* Figma node 46:14 — glass cards (design uses solid white; we use frosted glass on photo bg) */
                #home-pillars .pj-card {
                    background: rgba(255, 255, 255, 0.14);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 18px;
                    border: 1px solid rgba(255, 255, 255, 0.28);
                    box-shadow: 0 2px 14px rgba(4, 52, 44, 0.09), 0 1px 3px rgba(0, 0, 0, 0.05);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
                }
                #home-pillars .pj-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(255, 255, 255, 0.4);
                    box-shadow: 0 14px 40px rgba(4, 52, 44, 0.12), 0 4px 10px rgba(0, 0, 0, 0.06);
                }
                /* Figma 46:15 — CARD 1: solid hero on top, frosted glass body only (matches pillar cards) */
                #home-pillars .pj-figma-46-15 {
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    width: 100%;
                    min-width: 0;
                    overflow: hidden;
                    position: relative;
                    isolation: isolate;
                    border-radius: 18px;
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.28);
                    box-shadow: 0 2px 14px rgba(4, 52, 44, 0.09), 0 1px 3px rgba(0, 0, 0, 0.05);
                    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
                }
                #home-pillars .pj-figma-46-15:hover {
                    transform: translateY(-4px);
                    border-color: rgba(255, 255, 255, 0.4);
                    box-shadow: 0 14px 40px rgba(4, 52, 44, 0.12), 0 4px 10px rgba(0, 0, 0, 0.06);
                }
                #home-pillars .pj-figma-46-15-top {
                    container-type: inline-size;
                    container-name: pj-figma-hero-top;
                    position: relative;
                    height: 210px;
                    flex-shrink: 0;
                    overflow: hidden;
                    background: #e8e8e8;
                    z-index: 2;
                }
                /* Grey strip over the image’s left edge only — img stays full box so cover/position don’t rescale */
                #home-pillars .pj-figma-46-15-top::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 10px;
                    background: #e8e8e8;
                    z-index: 2;
                    pointer-events: none;
                }
                /* Horizontal squeeze (24px total), anchored on the right — right screen edge unchanged */
                #home-pillars .pj-figma-46-15-hero-img {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    display: block;
                    object-fit: cover;
                    object-position: 76% 14%;
                    z-index: 1;
                    transform-origin: right center;
                    transform: scaleX(calc((100cqw - 24px) / 100cqw));
                }
                #home-pillars .pj-figma-46-15-body {
                    position: relative;
                    z-index: 1;
                    padding: 20px 20px 22px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    flex: 1;
                    background: rgba(255, 255, 255, 0.07);
                    border-top: 1px solid rgba(255, 255, 255, 0.18);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }
                #home-pillars .pj-figma-46-15-title {
                    margin: 0 0 8px;
                    font-family: 'Playfair Display', Georgia, serif;
                    font-weight: 600;
                    font-size: 19px;
                    line-height: 23.75px;
                    color: #fff;
                }
                #home-pillars .pj-figma-46-15-desc {
                    margin: 0 0 16px;
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 400;
                    font-size: 13px;
                    line-height: 21.45px;
                    color: rgba(255, 255, 255, 0.88);
                }
                #home-pillars .pj-figma-46-15-desc p {
                    margin: 0;
                    text-wrap: pretty;
                }
                #home-pillars .pj-figma-46-15-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-bottom: 17px;
                }
                #home-pillars .pj-figma-46-15-tag {
                    display: inline-flex;
                    align-items: center;
                    padding: 5px 11px;
                    border-radius: 20px;
                    background: rgba(255, 255, 255, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.22);
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 11px;
                    line-height: 1;
                    color: #fff;
                    box-sizing: border-box;
                }
                #home-pillars .pj-figma-46-15-rule {
                    width: 100%;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.22);
                    margin-top: auto;
                    margin-bottom: 15px;
                }
                #home-pillars .pj-figma-46-15-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding-bottom: 3px;
                    border-bottom: 1px solid #ffc801;
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 13px;
                    line-height: 1;
                    color: #fff;
                    text-decoration: none;
                    width: fit-content;
                    margin-top: 0;
                    transition: color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
                }
                #home-pillars .pj-figma-46-15-link:hover {
                    color: #ffc801;
                    border-bottom-color: #fff1b0;
                    transform: translateX(2px);
                }
                #home-pillars .pj-figma-46-15-link img {
                    width: 13px;
                    height: 13px;
                    flex-shrink: 0;
                    display: block;
                    filter: brightness(0) invert(1);
                }
                #home-pillars .pj-card-visual {
                    height: 210px;
                    overflow: hidden;
                    position: relative;
                    flex-shrink: 0;
                    background: rgba(255, 255, 255, 0.07);
                    backdrop-filter: blur(22px);
                    -webkit-backdrop-filter: blur(22px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
                }
                #home-pillars .pj-card-visual--stack {
                    display: flex;
                    flex-direction: column;
                }
                #home-pillars .pj-card-visual--neutral-base {
                    background: rgba(255, 255, 255, 0.06);
                }
                #home-pillars .pj-card-badge {
                    position: absolute;
                    top: 8px;
                    right: 10px;
                    z-index: 2;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    background: rgba(4, 52, 44, 0.62);
                    border: 1px solid rgba(212, 146, 42, 0.45);
                    border-radius: 30px;
                    padding: 6px 11px;
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 9.5px;
                    letter-spacing: 1.235px;
                    text-transform: uppercase;
                    color: #ffc801;
                    line-height: 1;
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
                }
                /* Photo hero: backdrop-filter picks up warm tones from the image and skews the green */
                #home-pillars .pj-figma-46-15-top .pj-card-badge {
                    z-index: 3;
                    backdrop-filter: none;
                    -webkit-backdrop-filter: none;
                    background: rgba(4, 52, 44, 0.92);
                }
                #home-pillars .pj-card-body {
                    padding: 20px 20px 22px;
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    background: rgba(255, 255, 255, 0.07);
                    border-top: 1px solid rgba(255, 255, 255, 0.18);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }
                #home-pillars .pj-card-title {
                    margin: 0 0 8px;
                    font-family: 'Playfair Display', Georgia, serif;
                    font-weight: 600;
                    font-size: 19px;
                    line-height: 1.25;
                    color: #fff;
                }
                #home-pillars .pj-card-desc {
                    margin: 0 0 16px;
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 400;
                    font-size: 13px;
                    line-height: 21.45px;
                    color: #fff;
                }
                #home-pillars .pj-card-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-bottom: 17px;
                }
                #home-pillars .pj-pill {
                    display: inline-flex;
                    align-items: center;
                    min-height: 24px;
                    padding: 5px 11px;
                    border-radius: 20px;
                    background: rgba(255, 255, 255, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.22);
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 11px;
                    color: #fff;
                    line-height: 1;
                    box-sizing: border-box;
                }
                #home-pillars .pj-card-divider {
                    width: 100%;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.22);
                    margin-top: auto;
                    margin-bottom: 15px;
                }
                #home-pillars .pj-card-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 13px;
                    color: #fff;
                    text-decoration: none;
                    border-bottom: 1px solid #ffc801;
                    padding-bottom: 3px;
                    line-height: 1;
                    margin-top: 0;
                    width: fit-content;
                    transition: color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
                }
                #home-pillars .pj-card-link:hover {
                    color: #ffc801;
                    border-bottom-color: #fff1b0;
                    transform: translateX(2px);
                }
                #home-pillars .pj-card-link svg {
                    width: 13px;
                    height: 13px;
                    flex-shrink: 0;
                }

                /* Card 2: Smart Vault AI visual — glass panel, IPM type */
                #home-pillars .pj-visual-vault {
                    flex: 1;
                    min-height: 0;
                    margin: 6px 10px 10px;
                    box-sizing: border-box;
                    padding: 12px 14px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: rgba(4, 52, 44, 0.38);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
                }
                #home-pillars .pj-vv-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }
                #home-pillars .pj-vv-header-title {
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 700;
                    font-size: 7.5px;
                    color: rgba(255, 255, 255, 0.82);
                    letter-spacing: 0.45px;
                }
                #home-pillars .pj-vv-live {
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 700;
                    font-size: 7.5px;
                    color: #ffc801;
                }
                #home-pillars .pj-vv-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 6px;
                    padding: 8px 6px;
                    border-left: 3px solid transparent;
                    margin-bottom: 2px;
                    border-radius: 0 4px 4px 0;
                    background: rgba(255, 255, 255, 0.1);
                }
                #home-pillars .pj-vv-row--ok {
                    border-left-color: #3ecf8e;
                }
                #home-pillars .pj-vv-row--warn {
                    border-left-color: #ffc801;
                }
                #home-pillars .pj-vv-row--danger {
                    border-left-color: #a4260e;
                }
                #home-pillars .pj-vv-icon {
                    font-size: 8px;
                    line-height: 1;
                    flex-shrink: 0;
                    width: 10px;
                    text-align: center;
                }
                #home-pillars .pj-vv-text {
                    flex: 1;
                }
                #home-pillars .pj-vv-text-main {
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 8px;
                    color: rgba(255, 255, 255, 0.95);
                    line-height: 1.35;
                }
                #home-pillars .pj-vv-text-sub {
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 400;
                    font-size: 7px;
                    color: rgba(255, 255, 255, 0.52);
                    line-height: 1.35;
                    margin-top: 1px;
                }
                #home-pillars .pj-vv-text-sub--warn {
                    color: rgba(255, 200, 1, 0.8);
                }
                #home-pillars .pj-vv-text-sub--danger {
                    color: rgba(164, 38, 14, 0.8);
                }
                #home-pillars .pj-vv-footer {
                    margin-top: auto;
                    display: flex;
                    gap: 12px;
                    padding: 5px 6px;
                    background: rgba(255, 255, 255, 0.12);
                    border-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }
                #home-pillars .pj-vv-footer span {
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-size: 7px;
                    font-weight: 500;
                }
                #home-pillars .pj-vv-footer .stat-ok { color: #fff; }
                #home-pillars .pj-vv-footer .stat-warn { color: #ffc801; }
                #home-pillars .pj-vv-footer .stat-danger { color: #ff6b4a; }

                /* Card 3: IPM Score visual — glass panel */
                #home-pillars .pj-visual-score {
                    flex: 1;
                    min-height: 0;
                    margin: 6px 10px 10px;
                    box-sizing: border-box;
                    padding: 14px 16px 10px;
                    display: flex;
                    flex-direction: column;
                    background: rgba(4, 52, 44, 0.36);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
                }
                #home-pillars .pj-score-value {
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 300;
                    font-size: 52px;
                    color: #fff;
                    line-height: 1;
                    margin-bottom: 2px;
                    letter-spacing: -0.02em;
                }
                #home-pillars .pj-score-label {
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 700;
                    font-size: 8px;
                    color: #ffc801;
                    margin-bottom: 6px;
                    letter-spacing: 0.06em;
                }
                #home-pillars .pj-score-verdict {
                    display: inline-flex;
                    align-items: center;
                    background: rgba(255, 200, 1, 0.14);
                    border: 1px solid rgba(255, 200, 1, 0.35);
                    border-radius: 20px;
                    padding: 3px 10px;
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 700;
                    font-size: 7.5px;
                    color: #ffc801;
                    width: fit-content;
                    margin-bottom: 14px;
                }
                #home-pillars .pj-score-bars {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    border-top: 1px solid rgba(255, 255, 255, 0.14);
                    padding-top: 10px;
                    flex: 1;
                }
                #home-pillars .pj-score-bar-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                #home-pillars .pj-score-bar-label {
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 8px;
                    color: rgba(255, 255, 255, 0.78);
                    width: 52px;
                    flex-shrink: 0;
                }
                #home-pillars .pj-score-bar-track {
                    flex: 1;
                    height: 7px;
                    background: rgba(255, 255, 255, 0.12);
                    border-radius: 4px;
                    overflow: hidden;
                }
                #home-pillars .pj-score-bar-fill {
                    height: 100%;
                    border-radius: 4px;
                    background: linear-gradient(90deg, #ffc801, #ffc801);
                }
                #home-pillars .pj-score-bar-fill--green {
                    background: linear-gradient(90deg, #10575c, #2dcfa0);
                }
                #home-pillars .pj-score-bar-num {
                    font-family: 'DM Sans', 'Poppins', Helvetica, sans-serif;
                    font-weight: 700;
                    font-size: 8px;
                    width: 22px;
                    text-align: right;
                    flex-shrink: 0;
                }
                #home-pillars .pj-score-bar-num--gold { color: #ffc801; }
                #home-pillars .pj-score-bar-num--green { color: #5ee9c5; }
                #home-pillars .pj-score-bar-num--dgreen { color: #3ecf8e; }

                /* FOUR PILLARS — IPM Ecosystem */
                #home-four-pillars {
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    background: #ffffff;
                    padding: 72px 20px;
                }
                @media (min-width: 961px) {
                    #home-four-pillars {
                        padding: 100px 20px;
                    }
                }
                #home-four-pillars .fp-inner {
                    width: 100%;
                    max-width: 1080px;
                    margin: 0 auto;
                    box-sizing: border-box;
                }
                #home-four-pillars .fp-eyebrow {
                    margin: 0 0 14px;
                    font-family: 'Jost', 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 10px;
                    letter-spacing: 2.8px;
                    line-height: 16px;
                    color: #e1e1e1;
                    text-transform: uppercase;
                }
                #home-four-pillars .fp-heading {
                    margin: 0;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 200;
                    font-size: clamp(28px, 5vw, 50px);
                    line-height: 0.95;
                    letter-spacing: 0;
                    color: #1a1714;
                }
                #home-four-pillars .fp-heading em {
                    display: block;
                    font-family: 'Playfair Display', Georgia, serif;
                    font-style: italic;
                    font-weight: 400;
                    font-size: clamp(26px, 4.5vw, 44px);
                    color: #ffc801;
                    margin-top: 4px;
                }
                #home-four-pillars .fp-sub {
                    margin: 18px 0 0;
                    max-width: 520px;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 300;
                    font-size: 16px;
                    line-height: 1.55;
                    letter-spacing: 0;
                    color: #78736d;
                }
                #home-four-pillars .fp-grid {
                    margin-top: 60px;
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 3px;
                }
                @media (min-width: 860px) {
                    #home-four-pillars .fp-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                #home-four-pillars .fp-card {
                    position: relative;
                    border-radius: 20px;
                    background: rgba(225, 225, 225, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    padding: 26px 42px 30px;
                    box-sizing: border-box;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    min-height: 345px;
                }
                @media (max-width: 600px) {
                    #home-four-pillars .fp-card {
                        padding: 20px 24px 24px;
                        min-height: 280px;
                    }
                }
                #home-four-pillars .fp-card-no {
                    font-family: 'Playfair Display', Georgia, serif;
                    font-weight: 400;
                    font-size: clamp(40px, 5vw, 68px);
                    line-height: 1;
                    letter-spacing: -2px;
                    color: #ffffff;
                    margin: 0 0 10px;
                }
                #home-four-pillars .fp-card-title {
                    margin: 0 0 20px;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: clamp(18px, 2vw, 24px);
                    line-height: 1.2;
                    color: #10575c;
                }
                #home-four-pillars .fp-card-desc {
                    margin: 0 0 auto;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 300;
                    font-size: 16px;
                    line-height: 1.55;
                    color: #060606;
                    max-width: 460px;
                }
                #home-four-pillars .fp-card-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 7px;
                    align-items: center;
                    margin-top: 24px;
                }
                #home-four-pillars .fp-card-tags--global {
                    gap: 8px;
                }
                #home-four-pillars .fp-pill {
                    display: inline-flex;
                    align-items: center;
                    height: 28px;
                    padding: 4px 13px;
                    border-radius: 100px;
                    background: #ffffff;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    color: #c2c3c3;
                    font-family: 'Jost', 'Poppins', Helvetica, sans-serif;
                    font-weight: 500;
                    font-size: 11px;
                    line-height: 1.6;
                    box-sizing: border-box;
                }
                #home-four-pillars .fp-pill--alt {
                    border-color: rgba(255, 255, 255, 0.8);
                }
                @media (min-width: 860px) {
                    #home-four-pillars .fp-card-tags--global {
                        flex-wrap: nowrap;
                    }
                }

                /* Anima SectionPlatform (JZxsw) — between pillars and CTA */
                #home-section-platform {
                    background: #10575c;
                    border: 1px solid #000000;
                    padding: 100px clamp(20px, 5vw, 360px);
                    box-sizing: border-box;
                }
                #home-section-platform .home-section-platform-inner {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 52px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    gap: 56px;
                }
                #home-section-platform .home-section-platform-eyebrow {
                    margin: 0 0 15px;
                    font-family: 'Jost', 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 10px;
                    letter-spacing: 2.8px;
                    line-height: 16px;
                    text-transform: uppercase;
                    color: #e1e1e1;
                }
                #home-section-platform .home-section-platform-headline {
                    margin: 0 0 18px;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 200;
                    font-size: clamp(28px, 4vw, 50px);
                    line-height: 45.36px;
                    letter-spacing: 0;
                    color: #ffffff;
                }
                #home-section-platform .home-section-platform-headline .home-section-platform-accent {
                    font-family: 'Playfair Display', Georgia, serif;
                    font-style: italic;
                    font-weight: 400;
                    color: #ffc801;
                    line-height: 45.36px;
                }
                #home-section-platform .home-section-platform-lead {
                    margin: 0;
                    max-width: 560px;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 300;
                    font-size: 16px;
                    line-height: normal;
                    letter-spacing: 0;
                    color: #ffffff;
                }
                #home-section-platform .home-section-platform-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 18px;
                }
                @media (min-width: 900px) {
                    #home-section-platform .home-section-platform-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        grid-auto-rows: minmax(240px, auto);
                    }
                    #home-section-platform .home-platform-card--row1 {
                        min-height: 292px;
                    }
                    #home-section-platform .home-platform-card--row2 {
                        min-height: 270px;
                    }
                }
                #home-section-platform .home-platform-card {
                    position: relative;
                    background: #ffffff;
                    border-radius: 22px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    padding: 29px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }
                #home-section-platform .home-platform-card-title {
                    margin: 0 0 10px;
                    padding-top: 82px;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 600;
                    font-size: 24px;
                    line-height: normal;
                    letter-spacing: 0;
                    color: #10575c;
                }
                #home-section-platform .home-platform-card-desc {
                    margin: 0;
                    font-family: 'Poppins', Helvetica, sans-serif;
                    font-weight: 300;
                    font-size: 16px;
                    line-height: normal;
                    letter-spacing: 0;
                    color: #78736d;
                    max-width: 320px;
                }
                #home-section-platform .home-platform-icon-box {
                    position: absolute;
                    top: 44px;
                    left: 28px;
                    width: 44px;
                    height: 43px;
                    border-radius: 10px;
                    border: 1px solid #c2c3c3;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                }
                #home-section-platform .home-platform-card--vault .home-platform-icon-box {
                    top: 40px;
                }
                #home-section-platform .home-platform-card-icon {
                    display: block;
                    width: 22px;
                    height: 22px;
                    flex: none;
                    object-fit: contain;
                }

                /* SECTIONS */
                .hero-search { background: rgba(255, 255, 255, 0.95); padding: 8px 10px 8px 25px; border-radius: 50px; display: flex; align-items: center; width: 100%; max-width: 700px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                .hero-search-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 2px solid var(--primary-teal); color: var(--primary-teal); font-size: 1.2rem; }
                .search-input { border: none; background: transparent; outline: none; flex: 1; font-size: 1rem; color: #333; padding: 10px; }
                .search-actions { display: flex; gap: 10px; }
                .action-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; border: none; }
                .action-icon:hover { transform: scale(1.1); }
                .ai-icon { background: var(--primary-teal); color: white; }
                .map-icon { background: var(--accent-orange); color: white; }
                .features-container { max-width: 1300px; margin: 80px auto; padding: 0 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                .feature-card { background: white; border: 1px solid #f0f0f0; border-radius: 16px; padding: 25px; display: flex; align-items: center; gap: 20px; transition: 0.3s; cursor: pointer; }
                .feature-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(17, 87, 92, 0.1); border-color: var(--accent-orange); }
                .icon-circle { width: 50px; height: 50px; background-color: #f0fdfa; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-teal); font-size: 1.2rem; flex-shrink: 0; transition: 0.3s; }
                .feature-card:hover .icon-circle { background-color: #fff7ed; color: var(--accent-orange); transform: scale(1.1); }
                .feature-text { font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: var(--primary-teal); }
                .stats-container { max-width: 1200px; margin: 0 auto 100px; padding: 0 20px; display: flex; justify-content: space-between; text-align: center; }
                .stat-number { font-size: 3.5rem; font-weight: 900; color: var(--primary-teal); margin-bottom: 10px; }
                .stat-label { font-size: 0.9rem; font-weight: 600; color: #333; text-transform: uppercase; opacity: 0.8; }
                .carousel-section { position: relative; max-width: 1400px; margin: 0 auto 100px; height: 500px; display: flex; overflow: hidden; padding: 0 20px; }
                .slide { width: 100%; height: 100%; display: grid; grid-template-columns: 1fr 1.5fr auto; gap: 30px; opacity: 0; transition: opacity 0.5s ease; position: absolute; }
                .slide.active { opacity: 1; position: relative; z-index: 10; }
                .slide-content { display: flex; flex-direction: column; justify-content: center; }
                .slide-label { color: var(--primary-teal); font-weight: 800; font-size: 2rem; margin-bottom: 20px; }
                .slide-text { font-size: 1.1rem; line-height: 1.8; color: var(--text-light); }
                .slide-image-container { position: relative; width: 100%; height: 100%; border-radius: 24px; overflow: hidden; }
                .slide-image { width: 100%; height: 100%; object-fit: cover; }
                .slide-video { width: 100%; height: 100%; object-fit: cover; }
                .slide-badge { position: absolute; bottom: 20px; left: 20px; background: white; padding: 10px 20px; border-radius: 30px; font-weight: bold; color: var(--primary-teal); }
                .slide-sidebar { display: flex; align-items: center; height: 100%; }
                .nav-tiles { 
                    display: flex; 
                    flex-direction: column; 
                    height: 100%; 
                    width: 120px;
                    background: var(--primary-teal);
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(17, 87, 92, 0.3);
                }
                .nav-tile { 
                    background: var(--primary-teal); 
                    color: white; 
                    padding: 0;
                    border: none;
                    font-weight: 600; 
                    font-size: 0.95rem; 
                    cursor: pointer; 
                    transition: all 0.3s ease; 
                    text-align: center;
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
                }
                .nav-tile:last-child {
                    border-bottom: none;
                }
                .nav-tile:hover { 
                    background: #166534; 
                    transform: scale(1.05);
                }
                .nav-tile.active { 
                    background: var(--accent-orange); 
                    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.2);
                }
                .nav-tile.active::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    background: white;
                }
                .world-map-section { max-width: 1400px; margin: 0 auto 100px; padding: 0 20px; text-align: center; }
                .map-container { position: relative; width: 100%; max-width: 1000px; margin: 0 auto; height: 420px; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; background: #f8fafc; }
                .map-canvas { width: 100%; height: 100%; }
                .featured-properties { padding: 80px 20px; background-color: #fff; text-align: center; }
                .premium-btn { display: inline-block; background-color: var(--accent-orange); color: white; padding: 15px 40px; border-radius: 50px; font-weight: 700; margin-bottom: 40px; text-decoration: none; }
                .properties-wrapper { max-width: 1300px; margin: 0 auto; position: relative; padding: 0 60px; }
                .property-card { border-radius: 24px; overflow: hidden; text-align: left; transition: 0.3s; background: #fff; border: 1px solid #eee; min-width: 350px; cursor: pointer; }
                .property-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
                .card-image-wrapper { position: relative; height: 250px; }
                .card-image { width: 100%; height: 100%; object-fit: cover; }
                .card-badge { position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.95); padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 0.75rem; color: var(--primary-teal); }
                .card-content { padding: 20px; }
                .prop-title { font-size: 1.2rem; font-weight: 800; color: #333; margin: 10px 0; }
                .scroll-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 50px; height: 50px; background: rgba(0,0,0,0.8); color: white; border: none; border-radius: 50%; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; }
                .scroll-btn.left { left: 0; }
                .scroll-btn.right { right: 0; }

                /* ✅ MARQUEE & EXPERTS CSS */
                .marquee-section { padding: 80px 0; text-align: center; overflow: hidden; }
                .partners-headline { border: 1px solid #e2e8f0; display: inline-block; padding: 12px 40px; border-radius: 50px; color: var(--text-light); font-weight: 600; margin-bottom: 50px; font-size: 1.1rem; }
                
                .marquee-track { display: flex; gap: 40px; width: max-content; animation: scroll-left 40s linear infinite; padding: 20px 0; }
                .marquee-track:hover { animation-play-state: paused; }

                .partner-circle { width: 180px; height: 180px; background: #f8fafc; border-radius: 15%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #cbd5e1; flex-shrink: 0; font-size: 0.9rem; text-transform: uppercase; }
                
                .expert-card { text-align: left; min-width: 320px; flex-shrink: 0; cursor: pointer; }
                .expert-img { width: 100%; height: 420px; object-fit: cover; border-radius: 24px; margin-bottom: 20px; transition: 0.3s; }
                .expert-card:hover .expert-img { transform: scale(1.02); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
                .expert-name { font-size: 1.4rem; font-weight: 800; color: var(--text-dark); margin-bottom: 5px; }
                .expert-role { font-size: 0.95rem; color: var(--text-light); font-weight: 500; }

                @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(calc(-50% - 20px)); } }

                /* Ad banner: scroll right-to-left, click -> signup */
                .ad-banner-section { padding: 24px 0; background: #11575C; overflow: hidden; }
                .ad-banner-link { display: block; text-decoration: none; color: inherit; cursor: pointer; }
                .ad-banner-track { display: flex; gap: 24px; width: max-content; animation: ad-banner-scroll 35s linear infinite; padding: 8px 0; }
                .ad-banner-track:hover { animation-play-state: paused; }
                .ad-banner-tile { flex-shrink: 0; min-width: 280px; padding: 20px 28px; background: #11575C; border: 2px solid rgba(255,255,255,0.35); border-radius: 12px; color: #fff; font-weight: 700; font-size: 1.05rem; text-align: center; display: flex; align-items: center; justify-content: center; transition: background 0.2s, border-color 0.2s; }
                .ad-banner-tile:hover { background: #0e4a4e; border-color: rgba(255,255,255,0.55); }
                @keyframes ad-banner-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(calc(-50% - 12px)); } }
                
                /* RESPONSIVE */
                @media (max-width: 1024px) {
                    .features-container { grid-template-columns: repeat(2, 1fr); }
                    .stats-container { flex-direction: column; gap: 40px; }
                    .slide { grid-template-columns: 1fr; }
                    .slide-sidebar { display: none; }
                }
                @media (max-width: 768px) {
                    .ad-banner-tile { min-width: 220px; padding: 14px 20px; font-size: 0.95rem; }
                    .landing-hero { padding: 92px 16px 40px; justify-content: center; }
                    .landing-hero-inner { padding: 0 12px; width: 100%; max-width: 100%; }
                    .landing-hero-narrow { width: 100%; max-width: 100%; min-width: 0; }
                    .landing-headline {
                        min-height: 0;
                        margin-bottom: 22px;
                        width: 100%;
                        gap: 0.16em 0.24em;
                    }
                    .landing-headline-line {
                        font-size: clamp(1.58rem, 7.2vw, 2.55rem);
                        line-height: 1.18;
                        white-space: normal;
                        overflow-wrap: anywhere;
                        word-break: break-word;
                    }
                    .landing-hero-bg { background-position: center 22%; }
                    .landing-tagline {
                        line-height: 1.5;
                        padding: 0 4px;
                        max-width: 100%;
                        overflow-wrap: anywhere;
                    }
                    .landing-hero-search-bar { flex-direction: column; min-height: 0; border-radius: 14px; }
                    .landing-hero-search-bar .landing-search-input {
                        padding: 16px 18px;
                        width: 100%;
                        max-width: 100%;
                        box-sizing: border-box;
                    }
                    .landing-hero-search-bar .landing-search-submit {
                        width: 100%;
                        min-width: 0;
                        padding: 16px 20px;
                        border-radius: 0;
                        white-space: normal;
                    }
                    .landing-search-tabs { flex-wrap: wrap; }
                    .landing-search-tab {
                        flex: 1 1 33.33%;
                        min-width: 30%;
                        border-right: 1px solid rgba(255, 255, 255, 0.08);
                        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                        font-size: 10px;
                        padding: 10px 4px;
                    }
                    .landing-search-tab:nth-child(3n) { border-right: none; }
                    .landing-hero-tabs-shell { border-radius: 10px; }
                    .landing-numbers-inner { padding: 0 16px; }
                    .landing-numbers-row { flex-direction: column; min-height: 0; }
                    .landing-numbers-cell {
                        border-right: none;
                        border-bottom: 1px solid #d0d5c6;
                        padding: 28px 20px;
                    }
                    .landing-numbers-cell:last-child { border-bottom: none; }
                    .landing-numbers-value { font-size: 32px; line-height: 32px; min-height: 32px; }
                    .landing-numbers-label { font-size: 14px; max-width: 280px; min-height: 36px; }
                    .hero-section .hero-content h1 { font-size: 1.8rem; margin-bottom: 20px; }
                    .features-container { grid-template-columns: 1fr; }
                    .carousel-section { height: auto !important; min-height: 600px; }
                    .slide { grid-template-columns: 1fr !important; grid-template-rows: auto 1fr; gap: 16px; }
                    .slide.active { position: relative; }
                    .slide-content { order: 1; }
                    .slide-label { font-size: 1.4rem !important; margin-bottom: 12px !important; }
                    .slide-text { font-size: 0.95rem !important; }
                    .slide-image-container { order: 2; min-height: 250px; border-radius: 16px; }
                    .slide-sidebar { display: none !important; }
                    .slide-badge { bottom: 12px; left: 12px; padding: 8px 16px; font-size: 0.85rem; }
                    .map-container { height: 280px; }
                    .featured-properties { padding: 40px 16px; }
                    .marquee-section { padding: 40px 0; }
                    .nav-tiles { width: 90px; }
                    .expert-card { min-width: 260px; }
                    .expert-img { height: 300px; }
                    .partner-circle { width: 140px; height: 140px; font-size: 0.8rem; }
                    .property-card { min-width: 280px !important; }
                    .wc-card,
                    .wc-c1, .wc-c2, .wc-c3, .wc-c4,
                    .wc-c5, .wc-c6, .wc-c7, .wc-c8 {
                        min-width: 0;
                        max-width: 100%;
                    }
                    .wc-card-title,
                    .wc-card-desc,
                    .landing-welcome-heading-line,
                    .landing-journey-heading-line,
                    .why-ipm-heading-line,
                    .why-ipm-heading-accent {
                        overflow-wrap: anywhere;
                        word-break: break-word;
                    }
                }
                @media (max-width: 480px) {
                    .landing-hero {
                        padding: 86px 12px 30px;
                    }
                    .landing-hero-inner {
                        padding: 0 8px;
                    }
                    .landing-headline {
                        margin-bottom: 18px;
                    }
                    .landing-headline-line {
                        font-size: clamp(1.45rem, 8.1vw, 2.1rem);
                    }
                    .landing-tagline {
                        font-size: 0.95rem;
                    }
                    .landing-search-tab {
                        font-size: 9px;
                        padding: 9px 4px;
                    }
                }
            `}</style>

            {/* --- LANDING HERO (mockup: full-bleed image, search + intent tabs) --- */}
            <section className="landing-hero" aria-label="Welcome">
                <div className="landing-hero-bg" role="presentation" />
                <div className="landing-hero-gradient" aria-hidden />
                <div className="landing-hero-inner">
                    <h1 className="landing-headline">
                        <span className="landing-headline-line">{t('hero.landingTitle1')}</span>
                        <span className="landing-headline-line landing-headline-line--accent">
                            {t('hero.landingTitle2').replace(/\.$/, '')}
                            <span className="landing-headline-dot">.</span>
                        </span>
                    </h1>
                    <div className="landing-hero-narrow">
                        <p className="landing-tagline">{t('hero.landingTagline')}</p>
                        <div className="landing-hero-search-wrap">
                            <form onSubmit={handleSearch} className="landing-hero-search-bar">
                                <input
                                    type="text"
                                    className="landing-search-input"
                                    placeholder={t(HERO_INTENT_PROMPT_KEY[heroIntent])}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    aria-label={t(HERO_INTENT_PROMPT_KEY[heroIntent])}
                                />
                                <button type="submit" className="landing-search-submit">
                                    {t('hero.searchCta')} <span aria-hidden>→</span>
                                </button>
                            </form>
                        </div>
                        <div className="landing-hero-tabs-shell">
                            <div className="landing-search-tabs" role="tablist" aria-label="Search intent">
                                {HERO_INTENTS.map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={heroIntent === key}
                                        className={`landing-search-tab ${heroIntent === key ? 'active' : ''}`}
                                        onClick={() => setHeroIntent(key)}
                                    >
                                        {t(HERO_INTENT_TAB_KEY[key])}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- NUMBERS STRIP --- */}
            <section className="landing-numbers-strip scroll-reveal" aria-label={t('hero.numbersStripAria')}>
                <div className="landing-numbers-inner">
                    <div className="landing-numbers-row">
                        <div className="landing-numbers-cell">
                            <p className="landing-numbers-value">
                                10<span className="landing-numbers-plus">+</span>
                            </p>
                            <p className="landing-numbers-label">{t('hero.numbersSegmentLabel')}</p>
                        </div>
                        <div className="landing-numbers-cell">
                            <p className="landing-numbers-value">
                                100<span className="landing-numbers-plus">+</span>
                            </p>
                            <p className="landing-numbers-label">{t('hero.numbersSolutionsLabel')}</p>
                        </div>
                        <div className="landing-numbers-cell">
                            <p className="landing-numbers-value">{t('hero.numbersAllValue')}</p>
                            <p className="landing-numbers-label">{t('hero.numbersMarketsLabel')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- JOURNEY STRIP --- */}
            <section className="landing-journey-strip scroll-reveal" aria-label={t('journeyStrip.aria')}>
                <div className="landing-journey-inner">
                    <header className="landing-journey-header">
                        <p className="landing-journey-eyebrow">{t('journeyStrip.eyebrow')}</p>
                        <h2 className="landing-journey-heading">
                            <span className="landing-journey-heading-line">{t('journeyStrip.headingLead')}</span>
                            <span className="landing-journey-heading-line landing-journey-heading-accent">{t('journeyStrip.headingAccent')}</span>
                        </h2>
                    </header>
                    <div className="landing-journey-track">
                        {JOURNEY_STEPS.map((step, index) => (
                            <article key={step.titleKey} className="landing-journey-card">
                                <div className="landing-journey-card-top">
                                    <span className="landing-journey-num">{index + 1}</span>
                                </div>
                                <h3
                                    className={
                                        step.dawnTitle
                                            ? 'landing-journey-card-title landing-journey-card-title--dawn'
                                            : 'landing-journey-card-title'
                                    }
                                >
                                    {t(step.titleKey)}
                                </h3>
                                <p className="landing-journey-card-desc">{t(step.descKey)}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- WELCOME SECTION --- */}
            <section className="landing-welcome-section scroll-reveal" aria-label={t('welcomeSection.aria')}>
                <div className="landing-welcome-inner">
                    <div className="landing-welcome-copy">
                        <p className="landing-welcome-eyebrow">{t('welcomeSection.eyebrow')}</p>
                        <h2 className="landing-welcome-heading">
                            <span className="landing-welcome-heading-line">{t('welcomeSection.headingLead')}</span>
                            <span className="landing-welcome-heading-line landing-welcome-heading-accent">{t('welcomeSection.headingAccent')}</span>
                        </h2>
                        <p className="landing-welcome-body">{t('welcomeSection.body1')}</p>
                        <p className="landing-welcome-body landing-welcome-body-gap">{t('welcomeSection.body2')}</p>
                        <div className="landing-welcome-actions">
                            <Link to={SERVICES_SECTION_PATHS.agent} className="landing-welcome-btn-primary">
                                {t('welcomeSection.ctaExplore')} <span aria-hidden>→</span>
                            </Link>
                            <Link to="/pricing" className="landing-welcome-btn-secondary">
                                {t('welcomeSection.ctaPricing')}
                            </Link>
                        </div>
                    </div>
                    <div className="landing-welcome-preview" aria-hidden="true">
                        <div className="lw-frame">
                            <div className="lw-chrome">
                                <span className="lw-chrome-dot lw-chrome-dot--r" />
                                <span className="lw-chrome-dot lw-chrome-dot--y" />
                                <span className="lw-chrome-dot lw-chrome-dot--g" />
                                <div className="lw-chrome-url">app.ipm.com — Agency Dashboard</div>
                            </div>
                            <div className="lw-body">
                              <div className="lw-header-section">
                                <p className="lw-greet">Good morning, Anna.</p>
                                <div className="lw-kpi-row">
                                    <div className="lw-kpi-pair">
                                        <div className="lw-mini-card">
                                            <svg className="lw-listing-icon" viewBox="0 0 40 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                                <rect x="0" y="2" width="18" height="3" rx="1.5" fill="#10575c"/>
                                                <rect x="0" y="10" width="18" height="3" rx="1.5" fill="#10575c"/>
                                                <rect x="0" y="18" width="18" height="3" rx="1.5" fill="#10575c"/>
                                                <path d="M30 4l2.5 5.5H38l-4.5 3.5 1.8 5.5L30 15l-5.3 3.5 1.8-5.5L22 9.5h5.5L30 4z" stroke="#10575c" strokeWidth="2" fill="none" strokeLinejoin="round"/>
                                            </svg>
                                            <span className="lw-mini-val">82</span>
                                            <span className="lw-mini-label">Listings</span>
                                        </div>
                                        <div className="lw-mini-card">
                                            <svg className="lw-crown-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                                <path d="M6.8396 24.9999H25.1621C25.3972 25 25.6248 24.9172 25.805 24.7661C25.9851 24.615 26.1062 24.4052 26.1471 24.1737L28.9846 11.1737C29.0202 10.9597 28.9854 10.74 28.8852 10.5477C28.7851 10.3553 28.6251 10.2007 28.4295 10.1071C28.2338 10.0136 28.013 9.98622 27.8004 10.0291C27.5878 10.072 27.3949 10.1828 27.2508 10.3449L22.0008 15.9999L16.9083 4.58117C16.8282 4.40798 16.7001 4.26135 16.5393 4.15859C16.3785 4.05583 16.1917 4.00122 16.0008 4.00122C15.81 4.00122 15.6232 4.05583 15.4624 4.15859C15.3015 4.26135 15.1735 4.40798 15.0933 4.58117L10.0008 15.9999L4.75085 10.3449C4.60706 10.1805 4.41337 10.0676 4.1994 10.0237C3.98543 9.97967 3.76295 10.007 3.56595 10.1013C3.36895 10.1957 3.20828 10.352 3.10849 10.5463C3.0087 10.7407 2.97528 10.9623 3.01335 11.1774L5.85085 24.1774C5.8926 24.4089 6.01462 24.6183 6.19545 24.7687C6.37629 24.9191 6.60437 25.001 6.8396 24.9999Z" stroke="#10575C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                            </svg>
                                            <span className="lw-mini-val">421</span>
                                            <span className="lw-mini-label">Leads</span>
                                        </div>
                                    </div>
                                    <div className="lw-revenue">
                                        <div className="lw-donut">
                                            <img src="/site-assets/revenue-donut.svg" alt="71% donut" />
                                            <span className="lw-donut-label">71%</span>
                                        </div>
                                        <span className="lw-rev-amount">€3,2 M</span>
                                        <span className="lw-rev-label">TOTAL REVENUE GENERATED</span>
                                    </div>
                                </div>
                                <span className="lw-rev-zero">€0</span>
                              </div>
                              <div className="lw-middle-section">
                                <div className="lw-crm-section">
                                <p className="lw-section-title">CRM &amp; Automation</p>
                                <div className="lw-crm-list">
                                    <div className="lw-crm-row">
                                        <div>
                                            <div className="lw-crm-title">Viewing Confirmation</div>
                                            <div className="lw-crm-meta">3-bed · Cascais · €480k</div>
                                        </div>
                                        <span className="lw-pill-teal">ACTIVE</span>
                                    </div>
                                    <div className="lw-crm-row">
                                        <div>
                                            <div className="lw-crm-title">Score Spike Alert</div>
                                            <div className="lw-crm-meta">Villa · Marbella · €1.2M</div>
                                        </div>
                                        <span className="lw-pill-red">Alert</span>
                                    </div>
                                    <div className="lw-crm-row">
                                        <div>
                                            <div className="lw-crm-title">Follow Up</div>
                                            <div className="lw-crm-meta">Off-market · Cape Town · R18M</div>
                                        </div>
                                        <span className="lw-pill-teal">NEW 77</span>
                                    </div>
                                </div>
                                </div>
                                <div className="lw-portfolio-section">
                                <p className="lw-portfolio-head">Portfolio View</p>
                                <div className="lw-map-stack">
                                <div className="lw-toolbar">
                                    <span className="lw-tool-search">
                                        <img src="/site-assets/lw-icon-search.svg" alt="" className="lw-tool-icon" />
                                        <span className="lw-tool-search-label">Search by address, city or postcode…</span>
                                    </span>
                                    <div className="lw-tool-group">
                                        <span className="lw-tool-btn">
                                            <img src="/site-assets/lw-icon-crosshair.svg" alt="" className="lw-tool-icon" />
                                            Radius
                                        </span>
                                        <span className="lw-tool-btn">
                                            <img src="/site-assets/lw-icon-mappin.svg" alt="" className="lw-tool-icon" />
                                            Heatmap
                                        </span>
                                        <span className="lw-tool-btn">
                                            <img src="/site-assets/lw-icon-comps.svg" alt="" className="lw-tool-icon" />
                                            Comps
                                        </span>
                                    </div>
                                </div>
                                <div className="lw-map-wrap">
                                <div className="lw-map">
                                    <div className="lw-map-bg">
                                        <img src="/site-assets/welcome-world-map.png" alt="World map" />
                                    </div>

                                    {/* Pins — exact Figma px positions */}
                                    <img src="/site-assets/lw-pin-green.svg" alt="" style={{ position:'absolute', left:126.59, top:13.83, width:8.41, height:8.41 }} />
                                    <img src="/site-assets/lw-pin-green.svg" alt="" style={{ position:'absolute', left:146.78, top:17.81, width:8.41, height:8.41 }} />
                                    <img src="/site-assets/lw-pin-gold.svg"  alt="" style={{ position:'absolute', left:262.42, top:30.87, width:8.41, height:8.41 }} />
                                    <img src="/site-assets/lw-pin-green.svg" alt="" style={{ position:'absolute', left:274.2,  top:42.64, width:8.41, height:8.41 }} />
                                    <img src="/site-assets/lw-pin-green.svg" alt="" style={{ position:'absolute', left:112.71, top:71.24, width:8.41, height:8.41 }} />
                                    <img src="/site-assets/lw-pin-gold.svg"  alt="" style={{ position:'absolute', left:348.21, top:100.64,width:8.41, height:8.41 }} />
                                    <img src="/site-assets/lw-pin-red.svg"   alt="" style={{ position:'absolute', left:312.88, top:200.77,width:8.41, height:8.41 }} />

                                    {/* Status legend background */}
                                    <div style={{ position:'absolute', left:23.66, top:177.88, width:84.681, height:64.757, background:'#e1e1e1', borderRadius:'6.72px 6.72px 0 0' }}>
                                        <p style={{ fontFamily:"'Poppins',sans-serif", fontWeight:600, fontSize:6.45, color:'#000', margin:'3px 0 2px 7.5px' }}>Status</p>
                                        <div style={{ display:'flex', alignItems:'center', gap:5, margin:'0 0 1px 7.5px' }}>
                                            <img src="/site-assets/lw-pin-green.svg" alt="" style={{ width:6.23, height:6.23 }} />
                                            <span style={{ fontFamily:"'Poppins',sans-serif", fontWeight:300, fontSize:6, color:'#000' }}>Prospect</span>
                                        </div>
                                        <div style={{ display:'flex', alignItems:'center', gap:5, margin:'0 0 1px 7.5px' }}>
                                            <img src="/site-assets/lw-pin-gold.svg" alt="" style={{ width:6.23, height:6.23 }} />
                                            <span style={{ fontFamily:"'Poppins',sans-serif", fontWeight:300, fontSize:6, color:'#000' }}>Listed</span>
                                        </div>
                                        <div style={{ display:'flex', alignItems:'center', gap:5, margin:'0 0 1px 7.5px' }}>
                                            <span style={{ width:6.23, height:6.23, borderRadius:'50%', background:'#ffc801', flexShrink:0 }} />
                                            <span style={{ fontFamily:"'Poppins',sans-serif", fontWeight:300, fontSize:6, color:'#000' }}>Under Offer</span>
                                        </div>
                                        <div style={{ display:'flex', alignItems:'center', gap:5, margin:'0 0 1px 7.5px' }}>
                                            <img src="/site-assets/lw-pin-red.svg" alt="" style={{ width:6.23, height:6.23 }} />
                                            <span style={{ fontFamily:"'Poppins',sans-serif", fontWeight:300, fontSize:6, color:'#000' }}>Sold</span>
                                        </div>
                                    </div>

                                    {/* €2M tag — left=103px, top=40.04px */}
                                    <div style={{ position:'absolute', left:103, top:40.04 }}>
                                        <img src="/site-assets/lw-tag-eur.svg" alt="" style={{ display:'block', width:37, height:29.98 }} />
                                        <span style={{ position:'absolute', left:5, top:3, fontFamily:"'Poppins',sans-serif", fontSize:10, fontWeight:400, lineHeight:'12.8px', color:'#1a1714', whiteSpace:'nowrap' }}>€2M</span>
                                    </div>

                                    {/* AED 1.54M tag — left=335.6px, top=68.53px */}
                                    <div style={{ position:'absolute', left:335.6, top:68.53 }}>
                                        <img src="/site-assets/lw-tag-aed.svg" alt="" style={{ display:'block', width:60.38, height:30.91 }} />
                                        <span style={{ position:'absolute', left:6.38, top:2.51, fontFamily:"'Poppins',sans-serif", fontSize:10, fontWeight:400, lineHeight:'12.8px', color:'#fff', whiteSpace:'nowrap' }}>AED 1.54M</span>
                                    </div>

                                    {/* R18M tag — left=302px, top=169.65px */}
                                    <div style={{ position:'absolute', left:302, top:169.65 }}>
                                        <img src="/site-assets/lw-tag-r18m.svg" alt="" style={{ display:'block', width:43.59, height:31.13 }} />
                                        <span style={{ position:'absolute', left:9, top:3.4, fontFamily:"'Poppins',sans-serif", fontSize:10, fontWeight:400, lineHeight:'12.8px', color:'#fff', whiteSpace:'nowrap' }}>R18M</span>
                                    </div>

                                    {/* Property listing card — left=41, top=69.04-51=18.04 (map-relative) */}
                                    <div className="lw-prop-card" style={{ left:41, top:18.04, width:59 }}>
                                        <div className="lw-prop-img">
                                            <img src="/site-assets/lw-property-thumb.jpg" alt="London property" />
                                            <span className="lw-prop-active">ACTIVE</span>
                                        </div>
                                        <div className="lw-prop-body">
                                            <div className="lw-prop-view-btn">View Listing</div>
                                            <p className="lw-prop-price">£380,000</p>
                                            <p className="lw-prop-addr">📍 3 Battersea Rise, London SW11</p>
                                            <span className="lw-prop-type-badge">Residential</span>
                                            <div className="lw-prop-stats">
                                                <div className="lw-prop-stat"><span className="lw-prop-stat-val">2</span><span className="lw-prop-stat-label">Beds</span></div>
                                                <div className="lw-prop-stat"><span className="lw-prop-stat-val">1</span><span className="lw-prop-stat-label">Baths</span></div>
                                                <div className="lw-prop-stat"><span className="lw-prop-stat-val">880</span><span className="lw-prop-stat-label">sq ft</span></div>
                                                <div className="lw-prop-stat"><span className="lw-prop-stat-val">9</span><span className="lw-prop-stat-label">Leads</span></div>
                                                <div className="lw-prop-stat"><span className="lw-prop-stat-val">12d</span><span className="lw-prop-stat-label">Listed</span></div>
                                            </div>
                                            <div className="lw-prop-agent">
                                                <span className="lw-prop-agent-avatar">HJ</span>
                                                <div>
                                                    <div className="lw-prop-agent-name">Helen Jona</div>
                                                    <div className="lw-prop-agent-role">Assigned Agent</div>
                                                </div>
                                                <span className="lw-prop-agent-online">Online</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detail card — left=249, top=180.04-51=129.04 (map-relative) */}
                                    <div className="lw-detail-card" style={{ left:249, top:129.04, width:50 }}>
                                        <div className="lw-detail-top">
                                            <span className="lw-detail-db-badge">+ Not in Database</span>
                                            <span className="lw-detail-close">✕</span>
                                        </div>
                                        <div className="lw-detail-score-row">
                                            <span className="lw-detail-score-num">89</span>
                                            <div>
                                                <span className="lw-detail-hot">HOT TIER</span>
                                                <div className="lw-detail-score-label">Heat Score</div>
                                            </div>
                                        </div>
                                        <div className="lw-detail-body">
                                            <p className="lw-detail-addr">22 Wierda Road</p>
                                            <p className="lw-detail-sub">Wierda Valley · 5.3yr hold</p>
                                            <div className="lw-detail-vals">
                                                <div className="lw-detail-val-group">
                                                    <span className="lw-detail-val-head">Last Sold</span>
                                                    <span className="lw-detail-val-text">Nov 2020</span>
                                                </div>
                                                <div className="lw-detail-val-group">
                                                    <span className="lw-detail-val-head">Est. Value</span>
                                                    <span className="lw-detail-val-text">R19M</span>
                                                </div>
                                            </div>
                                            <hr className="lw-detail-hr" />
                                            <div className="lw-detail-specs">
                                                <div className="lw-detail-spec"><span className="lw-detail-spec-val">410m²</span><span className="lw-detail-spec-label">Size</span></div>
                                                <div className="lw-detail-spec"><span className="lw-detail-spec-val">4 Bed</span><span className="lw-detail-spec-label">Config</span></div>
                                                <div className="lw-detail-spec"><span className="lw-detail-spec-val">3 Bath</span><span className="lw-detail-spec-label">Config</span></div>
                                            </div>
                                        </div>
                                        <div className="lw-detail-actions">
                                            <span className="lw-detail-btn">📞 Call</span>
                                            <span className="lw-detail-btn">💬 SMS</span>
                                            <span className="lw-detail-btn lw-detail-btn--primary">＋ Pipeline</span>
                                        </div>
                                    </div>
                                </div>
                                </div>
                                </div>
                                </div>
                              </div>
                                <div className="lw-bottom-bar">
                                    <p className="lw-bottom-title">Intelligence-Driven</p>
                                    <p className="lw-bottom-sub">4 Markets Active</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- DARK FEATURE — coded glass dashboard (Anima layout) + i18n --- */}
            <section id="home-dark-feature" className="section-DARK-FEATURE scroll-reveal" aria-labelledby="df-heading">
                <div className="container">
                    <div className="df-visual" role="region" aria-label={t('darkFeatureSection.aria')}>
                        <div className="df-visual-bg" aria-hidden />
                        <div className="df-visual-inner">
                            <div className="df-top-row">
                                <div>
                                    <p className="df-brand-title">{t('darkFeatureSection.investorTitle')}</p>
                                    <p className="df-brand-accent">{t('darkFeatureSection.investorAccent')}</p>
                                </div>
                                <div className="df-search">
                                    <i className="fa-solid fa-magnifying-glass" aria-hidden />
                                    <span>{t('darkFeatureSection.searchPlaceholder')}</span>
                                    <i className="fa-solid fa-microphone" aria-hidden />
                                    <i className="fa-solid fa-map-location-dot" aria-hidden />
                                </div>
                            </div>
                            <div className="df-cards">
                                    <div className="df-metrics-col">
                                        <div className="df-panel df-panel--metric">
                                            <div className="df-metric-row">
                                                <div className="df-metric-info">
                                                    <p className="df-metric-label">{t('darkFeatureSection.rentalYieldTitle')}</p>
                                                    <p className="df-metric-sub">{t('darkFeatureSection.rentalYieldSub')}</p>
                                                </div>
                                                <p className="df-metric-val">6.4%</p>
                                            </div>
                                            <span className="df-pill-white">{t('darkFeatureSection.rentalYieldBadge')}</span>
                                        </div>
                                        <div className="df-panel df-panel--metric">
                                            <div className="df-metric-row">
                                                <div className="df-metric-info">
                                                    <p className="df-metric-label">{t('darkFeatureSection.domTitle')}</p>
                                                    <p className="df-metric-sub">{t('darkFeatureSection.domSub')}</p>
                                                </div>
                                                <p className="df-metric-val">40</p>
                                            </div>
                                            <span className="df-pill-white">{t('darkFeatureSection.domBadge')}</span>
                                        </div>
                                        <div className="df-panel df-panel--metric">
                                            <div className="df-metric-row">
                                                <div className="df-metric-info">
                                                    <p className="df-metric-label">{t('darkFeatureSection.energyTitle')}</p>
                                                    <p className="df-metric-sub">{t('darkFeatureSection.energySub')}</p>
                                                </div>
                                                <p className="df-metric-val">A</p>
                                            </div>
                                            <span className="df-pill-white">{t('darkFeatureSection.energyBadge')}</span>
                                        </div>
                                    </div>
                                    <div className="df-panel df-panel--confidence">
                                        <div className="df-conf-heading">
                                            <p className="df-panel-title">{t('darkFeatureSection.confidenceTitle')}</p>
                                            <p className="df-panel-sub">{t('darkFeatureSection.confidenceSub')}</p>
                                        </div>
                                        <div className="df-gauge-wrap">
                                            <img className="df-gauge-img" src="/img/df-gauge-arc.svg" alt="" aria-hidden />
                                            <div className="df-gauge-label">
                                                <span className="df-gauge-pct">76%</span>
                                                <span className="df-gauge-txt">{t('darkFeatureSection.confidenceScore')}</span>
                                            </div>
                                        </div>
                                        <div className="df-feat-row">
                                            <img className="df-feat-icon" src="/img/df-icon-house.svg" alt="" aria-hidden="true" />
                                            <div>
                                                <p className="df-feat-t">{t('darkFeatureSection.feat1Title')}</p>
                                                <p className="df-feat-d">{t('darkFeatureSection.feat1Desc')}</p>
                                            </div>
                                        </div>
                                        <div className="df-feat-row">
                                            <img className="df-feat-icon" src="/img/df-icon-sparkle.svg" alt="" aria-hidden="true" />
                                            <div>
                                                <p className="df-feat-t">{t('darkFeatureSection.feat2Title')}</p>
                                                <p className="df-feat-d">{t('darkFeatureSection.feat2Desc')}</p>
                                            </div>
                                        </div>
                                        <div className="df-feat-row">
                                            <img className="df-feat-icon" src="/img/df-icon-arrow-up.svg" alt="" aria-hidden="true" />
                                            <div>
                                                <p className="df-feat-t">{t('darkFeatureSection.feat3Title')}</p>
                                                <p className="df-feat-d">{t('darkFeatureSection.feat3Desc')}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="df-panel df-panel--future">
                                        <div className="df-future-head">
                                            <div>
                                                <p className="df-panel-title df-panel-title--flush">{t('darkFeatureSection.futureTitle')}</p>
                                                <p className="df-panel-sub df-panel-sub--flush">{t('darkFeatureSection.futureSub')}</p>
                                            </div>
                                        </div>
                                        <div className="df-future-media">
                                            <img
                                                className="df-future-thumb-img"
                                                src="/img/df-future-house.jpg"
                                                alt=""
                                            />
                                            <div
                                                className="df-future-score-overlay"
                                                aria-label={`${t('darkFeatureSection.ipmScore')} 87`}
                                            >
                                                <div className="df-score-circle">
                                                    <img className="df-score-bg" src="/img/df-score-circle.svg" alt="" aria-hidden="true" />
                                                    <img className="df-score-ring-img" src="/img/df-score-ring.svg" alt="" aria-hidden="true" />
                                                    <div className="df-score-inner">
                                                        <span className="df-future-score-val">87</span>
                                                    </div>
                                                </div>
                                                <div className="df-future-score-caption">
                                                    <span className="df-score-label-ipm">IPM</span>
                                                    <span className="df-score-label-score">Score</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="df-prop-blurb">{t('darkFeatureSection.propertyBlurb')}</p>
                                        <p className="df-view-now">
                                            {t('darkFeatureSection.viewNow')}{' '}
                                            <img className="df-view-now-caret" src="/img/df-caret-right.svg" alt="" aria-hidden="true" />
                                        </p>
                                    </div>
                                    <div className="df-panel df-panel--return">
                                        <div className="df-return-head">
                                            <p className="df-panel-title df-panel-title--flush">{t('darkFeatureSection.totalReturn')}</p>
                                            <div className="df-return-head-right">
                                                <span className="df-pill-white df-pill-white--sm">{t('darkFeatureSection.annualizedYtd')}</span>
                                                <img className="df-return-icon-img" src="/img/df-trend-icon.svg" alt="" aria-hidden="true" />
                                            </div>
                                        </div>
                                        <div className="df-return-main">
                                            <p className="df-big-pct">18.4%</p>
                                            <p className="df-gain">{t('darkFeatureSection.returnGain')}</p>
                                        </div>
                                        <div className="df-bar-row">
                                            <div className="df-bar-a">
                                                <span className="df-bar-label">11.2%</span>
                                                <span className="df-bar-amount">{t('darkFeatureSection.barLeftAmount')}</span>
                                            </div>
                                            <div className="df-bar-b">
                                                <span className="df-bar-label">7.2%</span>
                                                <span className="df-bar-amount">{t('darkFeatureSection.barRightAmount')}</span>
                                            </div>
                                        </div>
                                        <div className="df-bar-legend">
                                            <span className="df-legend-item">
                                                <img className="df-legend-dot-img" src="/img/df-dot-growth.svg" alt="" aria-hidden="true" />
                                                {t('darkFeatureSection.capGrowth')}
                                            </span>
                                            <span className="df-legend-item">
                                                <img className="df-legend-dot-img" src="/img/df-dot-rental.svg" alt="" aria-hidden="true" />
                                                {t('darkFeatureSection.netRental')}
                                            </span>
                                        </div>
                                        <div className="df-chart-header">
                                            <p className="df-chart-cap">{t('darkFeatureSection.trajectory')}</p>
                                            <span className="df-pill-white df-pill-white--sm">{t('darkFeatureSection.months12')}</span>
                                        </div>
                                        <div className="df-chart-area" aria-hidden>
                                            <svg
                                                className="df-trend-svg"
                                                viewBox="0 0 280 44"
                                                preserveAspectRatio="xMidYMax meet"
                                                focusable="false"
                                            >
                                                <polyline
                                                    className="df-trend-line"
                                                    points="14,30 77,30 140,30 203,17 266,5"
                                                />
                                                <circle className="df-trend-dot" cx="14" cy="30" r="3.5" />
                                                <circle className="df-trend-dot" cx="77" cy="30" r="3.5" />
                                                <circle className="df-trend-dot" cx="140" cy="30" r="3.5" />
                                                <circle className="df-trend-dot" cx="203" cy="17" r="3.5" />
                                                <circle className="df-trend-dot" cx="266" cy="5" r="4" />
                                            </svg>
                                        </div>
                                        <div className="df-chart-months">
                                            <span>JAN</span><span>APR</span><span>JUL</span><span>OCT</span><span>DEC</span>
                                        </div>
                                    </div>
                            </div>
                        </div>
                    </div>
                    <div className="div">
                        <div className="df-eyebrow">{t('darkFeatureSection.eyebrow')}</div>
                        <p className="one-subscription-the" id="df-heading">
                            <span className="text-wrapper">
                                {t('darkFeatureSection.headingLine1')}
                                <br />
                            </span>
                            <span className="span">{t('darkFeatureSection.headingLine2')}</span>
                        </p>
                        <p className="p df-lead">{t('darkFeatureSection.lead')}</p>
                        <div className="df-features">
                            {DARK_FEATURE_AUDIENCES.map((row, i) => (
                                <div
                                    key={i}
                                    className={`df-feature${row.border ? ' df-feature--border' : ''}`}
                                >
                                    <div className="df-feature-title">{t(row.titleKey)}</div>
                                    <p className="df-feature-body">{t(row.bodyKey)}</p>
                                    <Link
                                        to={row.servicesTo}
                                        className="df-feature-services-link"
                                    >
                                        {t(row.servicesCtaKey)}
                                    </Link>
                                </div>
                            ))}
                        </div>
                        <div className="container-9">
                            <Link to="/our-services" className="link">
                                <span className="text-wrapper-4">
                                    {t('darkFeatureSection.ctaPlatform')} →
                                </span>
                            </Link>
                            <Link to="/pricing" className="link-2">
                                <span className="text-wrapper-5">{t('darkFeatureSection.ctaPricing')}</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- WHY CHOOSE IPM — full section (Figma 67-708 + 50-198) --- */}
            <section className="why-ipm-section scroll-reveal">
                <div className="why-ipm-inner">
                    <p className="why-ipm-eyebrow">Why Choose IPM</p>
                    <h2 className="why-ipm-heading">
                        <span className="why-ipm-heading-line">Where Smart Property Meets</span>
                        <span className="why-ipm-heading-accent">Global Intelligence.</span>
                    </h2>
                </div>

                <div className="wc-grid-wrap">
                    <div className="wc-grid">

                        {/* C1: FREE LEADS — $0 pricing card */}
                        <div className="wc-card wc-c1">
                            <div>
                                <div className="wc-c1-badge">
                                    <span className="wc-c1-badge-dot" />
                                    <span>Always Free</span>
                                </div>
                                <p className="wc-c1-price">€0</p>
                                <p className="wc-c1-subtitle">cost per lead from your own listings</p>
                                <p className="wc-c1-desc">
                                    Every portal charges you to re-access leads your own listings generated.
                                    IPM doesn&apos;t. Your leads come back to you — automatically, forever.
                                </p>
                            </div>
                            <div className="wc-c1-table">
                                <div className="wc-c1-table-header">
                                    <span>Lead source</span>
                                    <span>Cost to agent</span>
                                </div>
                                <div className="wc-c1-table-row">
                                    <span className="wc-c1-label">Own listing leads</span>
                                    <span className="wc-c1-value wc-c1-value-free">Free — always</span>
                                </div>
                                <div className="wc-c1-table-row">
                                    <span className="wc-c1-label">Portal listing upgrade</span>
                                    <span className="wc-c1-value wc-c1-value-strike">R850 / mo</span>
                                </div>
                                <div className="wc-c1-table-row">
                                    <span className="wc-c1-label">CRM lead capture</span>
                                    <span className="wc-c1-value wc-c1-value-strike">Per user fee</span>
                                </div>
                                <div className="wc-c1-table-row">
                                    <span className="wc-c1-label">IPM inbound leads</span>
                                    <span className="wc-c1-value wc-c1-value-free">Included</span>
                                </div>
                            </div>
                        </div>

                        {/* C2: NOT A LISTING SITE — dark comparison table */}
                        <div className="wc-card wc-c2">
                            <p className="wc-eyebrow">Not a listing site</p>
                            <h3 className="wc-card-title">
                                An intelligent operating system<br />for property.
                            </h3>
                            <p className="wc-card-desc">
                                Why IPM vs the alternatives.
                            </p>
                            <table className="wc-comp-v2" role="table" aria-label="IPM comparison table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>Feature</th>
                                        <th style={{ width: '20%' }}>Listing Portals</th>
                                        <th style={{ width: '20%' }}>CRM Tools</th>
                                        <th style={{ width: '20%' }}>IPM Platform</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        ['Inbound leads from own listings', 'Paid per lead', 'Not included', '€0 - Every lead, yours'],
                                        ['AI-powered lead scoring', 'X', 'Limited', '✓ Fully intelligence-driven'],
                                        ['Global buyer reach (60+ countries)', 'Some markets', 'X', '✓ Live across all markets'],
                                        ['IPM Score & market intelligence', 'X', 'X', '✓ Exclusive to IPM'],
                                        ['Branded CMA Report Builder', 'X', 'Basic', '✓ On-demand, fully branded'],
                                        ['Smart Vault document AI', 'X', 'X', '✓ Included'],
                                        ['Partner collaboration workspace', 'X', 'X', '✓ Built-in'],
                                        ['ROI & yield simulator', 'X', 'X', '✓ Real-time AI modelling'],
                                        ['Investor portfolio tracking', 'X', 'X', '✓ Full module'],
                                        ['White-label / API integration', 'X', 'Limited', '✓ 48h go-live'],
                                        ['Off-market early access', 'X', 'X', '✓ 24hr exclusive'],
                                        ['Pricing model', 'Per-listing + fees', 'Per user / month', 'One subscription. Everything.'],
                                    ].map(([feature, portal, crm, ipm]) => (
                                        <tr key={feature}>
                                            <td>{feature}</td>
                                            <td>{portal}</td>
                                            <td className={crm === '—' ? 'wc-comp-v2-dash' : ''}>{crm}</td>
                                            <td>{ipm}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* C5: ROI SIMULATION — dark forest */}
                        <div className="wc-card wc-c5">
                            <div>
                                <p className="wc-eyebrow">Investor Intelligence</p>
                                <h3 className="wc-card-title">
                                    Model the return<br />before committing<br /><em>a cent.</em>
                                </h3>
                                <p className="wc-card-desc">
                                    Simulate yield, growth and net return. Adjust bond rate,
                                    occupancy and horizon in real time.
                                </p>
                            </div>
                            <div className="wc-c5-stat">
                                <span className="wc-c5-stat-num">8.4</span>
                                <span className="wc-c5-stat-pct">%</span>
                            </div>
                            <div className="wc-c5-tags">
                                <span className="wc-pill">Net yield</span>
                                <span className="wc-c5-proj">5-yr projection</span>
                            </div>
                            <div className="wc-c5-bars">
                                <div className="wc-c5-bar" style={{height:28}} />
                                <div className="wc-c5-bar" style={{height:34}} />
                                <div className="wc-c5-bar wc-c5-bar-active" style={{height:44}} />
                                <div className="wc-c5-bar" style={{height:30}} />
                                <div className="wc-c5-bar" style={{height:38}} />
                                <div className="wc-c5-bar" style={{height:34}} />
                            </div>
                        </div>

                        {/* C6: HIERARCHY — white card */}
                        <div className="wc-card wc-c6">
                            <div>
                                <p className="wc-eyebrow">Command Structure</p>
                                <h3 className="wc-card-title">
                                    Every level of your<br />business. <em>One view.</em>
                                </h3>
                                <p className="wc-card-desc">
                                    Enterprise, branch, agent and investor — each with their own
                                    command centre, with full visibility flowing up.
                                </p>
                            </div>
                            <div className="wc-c6-levels">
                                <div className="wc-c6-row wc-c6-row-dark">
                                    <span className="wc-c6-label">Enterprise</span>
                                    <span className="wc-pill">Full portfolio</span>
                                </div>
                                <div className="wc-c6-row wc-c6-row-light" style={{marginLeft:10}}>
                                    <span className="wc-c6-label">↳ Branch / Agency</span>
                                    <span className="wc-pill">Team view</span>
                                </div>
                                <div className="wc-c6-row wc-c6-row-light" style={{marginLeft:20}}>
                                    <span className="wc-c6-label">↳ Agent</span>
                                    <span className="wc-pill">My listings</span>
                                </div>
                            </div>
                            <div className="wc-c6-row wc-c6-investor">
                                <span className="wc-c6-label">Investor</span>
                                <span className="wc-pill">Portfolio ROI</span>
                            </div>
                        </div>

                        {/* C4: STAGING AI — grey-green card */}
                        <div className="wc-card wc-c4">
                            <div className="wc-c4-header">
                                <p className="wc-eyebrow">Visual AI · Staging · Rendering</p>
                                <h3 className="wc-card-title">
                                    Floor plan, empty room,<br />or just a <em>prompt —</em><br />rendered instantly.
                                </h3>
                            </div>
                            <div className="wc-c4-tabs">
                                <button className="wc-c4-tab" type="button">
                                    <span className="wc-c4-tab-dot" />
                                    Floor Plan → Building
                                </button>
                                <button className="wc-c4-tab wc-c4-tab-inactive" type="button">
                                    <span className="wc-c4-tab-dot" />
                                    AI Room Staging
                                </button>
                            </div>
                            <div className="wc-c4-visual">
                                <img src="/site-assets/wc-arch-viz.jpg" alt="AI architectural visualization — floor plan to photorealistic render" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                            </div>
                            <div className="wc-c4-footer">
                                <div className="wc-c4-footer-caption">
                                    <img src="/site-assets/wc-icon-diamond.svg" alt="" />
                                    <span>IPM Visual AI — photorealistic renders from any property input</span>
                                </div>
                                <p>
                                    Upload a floor plan and get a photorealistic render. Stage an
                                    empty room in seconds. Let buyers type their vision and watch it
                                    come to life.
                                </p>
                            </div>
                        </div>

                        {/* C8: AUTOMATED TASKS — 90% card */}
                        <div className="wc-card wc-c8">
                            <div className="wc-c8-left">
                                <p className="wc-eyebrow">Intelligent Automation</p>
                                <h3 className="wc-card-title">
                                    Admin done.<br />Agents <em>back selling.</em>
                                </h3>
                                <p className="wc-card-desc">
                                    Every routine task — follow-ups, reports, matching,
                                    reminders — runs automatically. Your team does the
                                    work that closes deals.
                                </p>
                                <div className="wc-c8-stat">
                                    <span className="wc-c8-stat-num">90</span>
                                    <span className="wc-c8-stat-pct">%</span>
                                </div>
                                <p className="wc-c8-stat-label">of admin time saved per agent, per week</p>
                            </div>
                            <div className="wc-c8-right">
                                {[
                                    ['Lead follow-up sequences', 'Auto-sent'],
                                    ['Buyer–property matching', 'Instant'],
                                    ['Viewing confirmations & reminders', 'Auto-sent'],
                                    ['CMA & market reports', 'Generated'],
                                    ['Pipeline stage updates', 'Auto-moved'],
                                ].map(([task, badge]) => (
                                    <div className="wc-c8-task-row" key={task}>
                                        <div className="wc-c8-task-icon">
                                            <img src="/site-assets/wc-icon-check.svg" alt="" />
                                        </div>
                                        <span className="wc-c8-task-text">{task}</span>
                                        <span className="wc-c8-task-badge">{badge}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* C3: PIPELINE — bar chart card */}
                        <div className="wc-card wc-c3">
                            <p className="wc-eyebrow">Active Pipeline</p>
                            <h3 className="wc-card-title">
                                Prospect before the<br />listing goes <em>live.</em>
                            </h3>
                            <p className="wc-card-desc">
                                Identify serious buyers and motivated sellers before
                                a property hits the market.
                            </p>
                            <div className="wc-c3-chart">
                                <div className="wc-c3-col">
                                    <div className="wc-c3-bar-wrap">
                                        <div className="wc-c3-bar wc-c3-bar-grey" style={{height:46}}><span>24</span></div>
                                    </div>
                                    <span className="wc-c3-label">Watch</span>
                                </div>
                                <div className="wc-c3-col">
                                    <div className="wc-c3-bar-wrap">
                                        <div className="wc-c3-bar wc-c3-bar-gold" style={{height:60}}><span>11</span></div>
                                    </div>
                                    <span className="wc-c3-label">Engage</span>
                                </div>
                                <div className="wc-c3-col">
                                    <div className="wc-c3-bar-wrap">
                                        <div className="wc-c3-bar wc-c3-bar-teal" style={{height:76}}><span>4</span></div>
                                    </div>
                                    <span className="wc-c3-label">Hot</span>
                                </div>
                                <div className="wc-c3-col">
                                    <div className="wc-c3-bar-wrap">
                                        <div className="wc-c3-bar wc-c3-bar-forest" style={{height:30}}><span>1</span></div>
                                    </div>
                                    <span className="wc-c3-label">Offer</span>
                                </div>
                            </div>
                            <p className="wc-c3-footnote">
                                * <strong>Active pipeline</strong> updated in real-time
                            </p>
                        </div>

                        {/* C7: PARTNER CTA — full-width golden */}
                        <div className="wc-card wc-c7">
                            <div className="wc-c7-left">
                                <div className="wc-c7-stat">
                                    <p className="wc-eyebrow">Partner Go-Live</p>
                                    <p className="wc-c7-stat-num">48h</p>
                                </div>
                                <div className="wc-c7-divider" />
                                <div className="wc-c7-copy">
                                    <h4>White-Label. API. Live in 48 Hours.</h4>
                                    <p>
                                        Bond originators, attorneys, developers and enterprise clients embed IPM
                                        directly into their workflow via plug-and-play API. Full white-label, category
                                        exclusivity, zero dev overhead.
                                    </p>
                                </div>
                            </div>
                            <Link to={SERVICES_SECTION_PATHS.partner} className="wc-c7-btn">
                                Partner Solutions →
                            </Link>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- WHO IT'S FOR — PROPERTY JOURNEY CARDS --- */}
            <section id="home-pillars" className="scroll-reveal" aria-labelledby="pillars-heading">
                <div className="pillars-inner">
                    <div className="pillars-head-row">
                        <div className="pillars-head-left">
                            <p className="pillars-eyebrow">Who It's For</p>
                            <h2 className="pillars-heading" id="pillars-heading">
                                <span className="pillars-heading-line1">Your Property Journey</span>
                                <em>is Calling.</em>
                            </h2>
                        </div>
                        <Link to="/our-services" className="pillars-link">
                            View full services →
                        </Link>
                    </div>

                    <div className="pillars-grid">
                        {/* Figma 46:15 — CARD 1 Smart Search (exported assets in /public/img) */}
                        <div className="pj-figma-46-15" data-node-id="46:15">
                            <div className="pj-figma-46-15-top" data-node-id="46:16">
                                <img
                                    className="pj-figma-46-15-hero-img"
                                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80"
                                    alt="Clean business analytics dashboard on a laptop"
                                    width={1920}
                                    height={1080}
                                    loading="lazy"
                                    decoding="async"
                                    data-node-id="47:194"
                                />
                                <span className="pj-card-badge" data-node-id="46:49">
                                    Smart Search
                                </span>
                            </div>
                            <div className="pj-figma-46-15-body" data-node-id="46:53">
                                <h3 className="pj-figma-46-15-title" data-node-id="46:55">
                                    Find Property With Confidence
                                </h3>
                                <div className="pj-figma-46-15-desc" data-node-id="46:59">
                                    <p data-node-id="46:60">
                                        Natural language search, real market pricing and the IPM Score on every listing. Know exactly what you&apos;re buying before you offer.
                                    </p>
                                </div>
                                <div className="pj-figma-46-15-tags" data-node-id="46:63">
                                    <span className="pj-figma-46-15-tag" data-node-id="46:64">IPM Score</span>
                                    <span className="pj-figma-46-15-tag" data-node-id="46:68">AI Search</span>
                                    <span className="pj-figma-46-15-tag" data-node-id="46:70">Pricing data</span>
                                </div>
                                <div className="pj-figma-46-15-rule" data-node-id="46:73" />
                                <Link
                                    to={SERVICES_SECTION_PATHS.buyRent}
                                    className="pj-figma-46-15-link"
                                    data-node-id="46:74"
                                >
                                    Explore Buyer Tools
                                    <img
                                        src={`${process.env.PUBLIC_URL || ''}/img/figma-46-15-link-arrow.svg`}
                                        alt=""
                                        width={13}
                                        height={13}
                                        aria-hidden
                                        data-node-id="46:76"
                                    />
                                </Link>
                            </div>
                        </div>

                        {/* CARD 2 — Smart Vault AI (Figma 46:79) */}
                        <div className="pj-card">
                            <div className="pj-card-visual pj-card-visual--stack pj-card-visual--neutral-base">
                                <span className="pj-card-badge">Smart Vault AI</span>
                                <div className="pj-visual-vault">
                                    <div className="pj-vv-header">
                                        <span className="pj-vv-header-title">OFFER TO PURCHASE · INTELLIGENT REVIEW</span>
                                        <span className="pj-vv-live">AI Live</span>
                                    </div>
                                    <div className="pj-vv-row pj-vv-row--ok">
                                        <span className="pj-vv-icon" style={{color:'#3ecf8e'}}>✓</span>
                                        <div className="pj-vv-text">
                                            <div className="pj-vv-text-main">Occupation date: 1 Mar 2026</div>
                                            <div className="pj-vv-text-sub">Standard clause — no risk</div>
                                        </div>
                                    </div>
                                    <div className="pj-vv-row pj-vv-row--warn">
                                        <span className="pj-vv-icon" style={{color:'#ffc801'}}>⚠</span>
                                        <div className="pj-vv-text">
                                            <div className="pj-vv-text-main">Penalty clause — R 45,000 at risk</div>
                                            <div className="pj-vv-text-sub pj-vv-text-sub--warn">Review before signing</div>
                                        </div>
                                    </div>
                                    <div className="pj-vv-row pj-vv-row--ok">
                                        <span className="pj-vv-icon" style={{color:'#3ecf8e'}}>✓</span>
                                        <div className="pj-vv-text">
                                            <div className="pj-vv-text-main">Fixtures included: stove, dishwasher</div>
                                            <div className="pj-vv-text-sub">Confirmed in inventory list</div>
                                        </div>
                                    </div>
                                    <div className="pj-vv-row pj-vv-row--danger">
                                        <span className="pj-vv-icon" style={{color:'#a4260e'}}>✗</span>
                                        <div className="pj-vv-text">
                                            <div className="pj-vv-text-main">Voetstoots clause — ask your agent</div>
                                            <div className="pj-vv-text-sub pj-vv-text-sub--danger">High risk · seller not liable for defects</div>
                                        </div>
                                    </div>
                                    <div className="pj-vv-footer">
                                        <span className="stat-ok">28 clauses reviewed</span>
                                        <span className="stat-warn">2 flagged</span>
                                        <span className="stat-danger">1 high risk</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pj-card-body">
                                <h3 className="pj-card-title">Understand Every Clause</h3>
                                <p className="pj-card-desc">
                                    Upload any contract and Smart Vault AI reads and flags every clause and risk in plain language — no legal jargon, no surprises.
                                </p>
                                <div className="pj-card-tags">
                                    <span className="pj-pill">AI document reader</span>
                                    <span className="pj-pill">Risk flagging</span>
                                    <span className="pj-pill">Plain language</span>
                                </div>
                                <div className="pj-card-divider" />
                                <Link to={SERVICES_SECTION_PATHS.buyRent} className="pj-card-link">
                                    Explore Smart Vault
                                    <svg viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M1 6.5h10.5M7.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </Link>
                            </div>
                        </div>

                        {/* CARD 3 — IPM Score */}
                        <div className="pj-card">
                            <div className="pj-card-visual pj-card-visual--stack">
                                <span className="pj-card-badge">IPM Score</span>
                                <div className="pj-visual-score">
                                    <div className="pj-score-value">8.8</div>
                                    <div className="pj-score-label">IPM SCORE</div>
                                    <div className="pj-score-verdict">Strong Buy · Top 12%</div>
                                    <div className="pj-score-bars">
                                        <div className="pj-score-bar-row">
                                            <span className="pj-score-bar-label">Location</span>
                                            <div className="pj-score-bar-track"><div className="pj-score-bar-fill" style={{width:'90%'}} /></div>
                                            <span className="pj-score-bar-num pj-score-bar-num--gold">9.0</span>
                                        </div>
                                        <div className="pj-score-bar-row">
                                            <span className="pj-score-bar-label">Price Fair</span>
                                            <div className="pj-score-bar-track"><div className="pj-score-bar-fill--green pj-score-bar-fill" style={{width:'83%'}} /></div>
                                            <span className="pj-score-bar-num pj-score-bar-num--green">8.3</span>
                                        </div>
                                        <div className="pj-score-bar-row">
                                            <span className="pj-score-bar-label">Growth</span>
                                            <div className="pj-score-bar-track"><div className="pj-score-bar-fill--green pj-score-bar-fill" style={{width:'86%'}} /></div>
                                            <span className="pj-score-bar-num pj-score-bar-num--dgreen">8.6</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pj-card-body">
                                <h3 className="pj-card-title">Know If a Price Is Fair</h3>
                                <p className="pj-card-desc">
                                    Every property gets an IPM Score from 1–10 based on 40+ data points. Compare homes honestly, not just by price.
                                </p>
                                <div className="pj-card-tags">
                                    <span className="pj-pill">40+ data points</span>
                                    <span className="pj-pill">Fair price verdict</span>
                                    <span className="pj-pill">3D walkthroughs</span>
                                </div>
                                <div className="pj-card-divider" />
                                <Link to={SERVICES_SECTION_PATHS.buyRent} className="pj-card-link">
                                    Explore Buyer Tools
                                    <svg viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M1 6.5h10.5M7.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOUR PILLARS — IPM ECOSYSTEM --- */}
            <section id="home-four-pillars" className="scroll-reveal" aria-labelledby="four-pillars-heading">
                <div className="fp-inner">
                    <p className="fp-eyebrow">THE IPM ECOSYSTEM</p>
                    <h2 className="fp-heading" id="four-pillars-heading">
                        Four Pillars.
                        <em>One Platform.</em>
                    </h2>
                    <p className="fp-sub">
                        We believe the property market should be connected, intelligent and globally
                        accessible — for every professional and participant involved.
                    </p>

                    <div className="fp-grid">
                        <div className="fp-card">
                            <div className="fp-card-no">01</div>
                            <div className="fp-card-title">Integration</div>
                            <p className="fp-card-desc">
                                Everything works together in one environment. Listings, leads, deals and
                                documents, agents, buyers, investors and partners sharing the same intelligent
                                platform.
                            </p>
                            <div className="fp-card-tags">
                                <span className="fp-pill">Listings</span>
                                <span className="fp-pill">Deal Flow</span>
                                <span className="fp-pill">Smart CRM</span>
                                <span className="fp-pill">Messaging</span>
                                <span className="fp-pill">Live Market Insights</span>
                            </div>
                        </div>

                        <div className="fp-card">
                            <div className="fp-card-no">02</div>
                            <div className="fp-card-title">Intelligence</div>
                            <p className="fp-card-desc">
                                AI-powered matching, IPM Score on every property, Smart Vault document AI and
                                portfolio analytics, surfacing the right opportunity at the right moment.
                            </p>
                            <div className="fp-card-tags">
                                <span className="fp-pill fp-pill--alt">IPM Score</span>
                                <span className="fp-pill fp-pill--alt">AI Matching</span>
                                <span className="fp-pill fp-pill--alt">Smart Vault</span>
                                <span className="fp-pill fp-pill--alt">ROI Simulator</span>
                            </div>
                        </div>

                        <div className="fp-card">
                            <div className="fp-card-no">03</div>
                            <div className="fp-card-title">Global Reach</div>
                            <p className="fp-card-desc">
                                Active across all Global Markets, connecting international buyers, investors and
                                local expertise seamlessly across borders.
                            </p>
                            <div className="fp-card-tags fp-card-tags--global">
                                <span className="fp-pill">Global</span>
                                <span className="fp-pill fp-pill--alt">Cross-Border</span>
                                <span className="fp-pill fp-pill--alt">Investors</span>
                                <span className="fp-pill fp-pill--alt">Multi-Market</span>
                            </div>
                        </div>

                        <div className="fp-card">
                            <div className="fp-card-no">04</div>
                            <div className="fp-card-title">Collaboration</div>
                            <p className="fp-card-desc">
                                Transaction workspaces for attorneys, brokers, financiers and developers, with
                                mandatory content confirmation before finalising.
                            </p>
                            <div className="fp-card-tags">
                                <span className="fp-pill fp-pill--alt">Deal Workspaces</span>
                                <span className="fp-pill fp-pill--alt">Content Confirmation</span>
                                <span className="fp-pill fp-pill--alt">API + White-label</span>
                                <span className="fp-pill fp-pill--alt">48h Go-Live</span>
                                <span className="fp-pill fp-pill--alt">Enterprise</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- ANIMA SECTION PLATFORM (JZxsw) --- */}
            <section id="home-section-platform" className="scroll-reveal" aria-labelledby="home-section-platform-heading">
                <div className="home-section-platform-inner">
                    <div className="home-section-platform-intro">
                        <p className="home-section-platform-eyebrow">PLATFORM CAPABILITIES</p>
                        <h2 className="home-section-platform-headline" id="home-section-platform-heading">
                            Everything runs on one
                            <br />
                            <span className="home-section-platform-accent">intelligence layer.</span>
                        </h2>
                        <p className="home-section-platform-lead">
                            Six core capabilities powering every stakeholder module — built once, accessible
                            everywhere, updated continuously.
                        </p>
                    </div>
                    <div className="home-section-platform-grid">
                        <article className="home-platform-card home-platform-card--row1">
                            <div className="home-platform-icon-box" aria-hidden>
                                <img
                                    className="home-platform-card-icon"
                                    src="/img/home-platform-icon-ipm-score.svg"
                                    alt=""
                                    width={22}
                                    height={22}
                                />
                            </div>
                            <h3 className="home-platform-card-title">IPM Score Engine</h3>
                            <p className="home-platform-card-desc">
                                40+ data points synthesised into one trusted property score. Location, yield,
                                growth, infrastructure, all weighted and ranked automatically.
                            </p>
                        </article>
                        <article className="home-platform-card home-platform-card--row1">
                            <div className="home-platform-icon-box" aria-hidden>
                                <img
                                    className="home-platform-card-icon"
                                    src="/img/home-platform-icon-realtime.svg"
                                    alt=""
                                    width={22}
                                    height={22}
                                />
                            </div>
                            <h3 className="home-platform-card-title">Real-Time Data</h3>
                            <p className="home-platform-card-desc">
                                Live transactional data, market insights, and demand signals refreshed
                                continuously across all worldwide markets.
                            </p>
                        </article>
                        <article className="home-platform-card home-platform-card--row1">
                            <div className="home-platform-icon-box" aria-hidden>
                                <img
                                    className="home-platform-card-icon"
                                    src="/img/home-platform-icon-matching.svg"
                                    alt=""
                                    width={22}
                                    height={22}
                                />
                            </div>
                            <h3 className="home-platform-card-title">Intelligence Matching</h3>
                            <p className="home-platform-card-desc">
                                Search by intent, not keyword. IPM reads what buyers, investors and agents actually
                                mean — and surfaces the results that prove it.
                            </p>
                        </article>
                        <article className="home-platform-card home-platform-card--row2">
                            <div className="home-platform-icon-box" aria-hidden>
                                <img
                                    className="home-platform-card-icon"
                                    src="/img/home-platform-icon-whitelabel.svg"
                                    alt=""
                                    width={22}
                                    height={22}
                                />
                            </div>
                            <h3 className="home-platform-card-title">White-Label Ready</h3>
                            <p className="home-platform-card-desc">
                                Full brand customisation for partners. Your logo, your domain, your client
                                experience, powered invisibly by IPM infrastructure.
                            </p>
                        </article>
                        <article className="home-platform-card home-platform-card--row2">
                            <div className="home-platform-icon-box" aria-hidden>
                                <img
                                    className="home-platform-card-icon"
                                    src="/img/home-platform-icon-api.svg"
                                    alt=""
                                    width={22}
                                    height={22}
                                />
                            </div>
                            <h3 className="home-platform-card-title">Plug-and-Play API</h3>
                            <p className="home-platform-card-desc">
                                IPM connects seamlessly with your existing tools and software. No IT team, no
                                technical setup required.
                            </p>
                        </article>
                        <article className="home-platform-card home-platform-card--row2 home-platform-card--vault">
                            <div className="home-platform-icon-box" aria-hidden>
                                <img
                                    className="home-platform-card-icon"
                                    src="/img/home-platform-icon-vault.svg"
                                    alt=""
                                    width={22}
                                    height={22}
                                />
                            </div>
                            <h3 className="home-platform-card-title">Smart Vault</h3>
                            <p className="home-platform-card-desc">
                                AI-powered document intelligence that stores and explains contracts, leases and
                                compliance documents in plain language.
                            </p>
                        </article>
                    </div>
                </div>
            </section>

            <HomeCtaContactSections />
            <HomeAnimaFooter />
        </div>
    );
};

export default Home;
