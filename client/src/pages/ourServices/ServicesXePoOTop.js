import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ServicesSectionModule2o4lm from './ServicesSectionModule2o4lm';
import ServicesFoundingPricing0ScTO from './ServicesFoundingPricing0ScTO';
import ServicesSectionModuleUyVnk from './ServicesSectionModuleUyVnk';
import ServicesSectionHowItWorksB8p91 from './ServicesSectionHowItWorksB8p91';
import ServicesSectionModuleCfZMr from './ServicesSectionModuleCfZMr';
import ServicesSectionModuleDbMG4 from './ServicesSectionModuleDbMG4';
import ServicesSectionModuleCJCHr from './ServicesSectionModuleCJCHr';
import ServicesSectionComparisonJAP3B from './ServicesSectionComparisonJAP3B';
import ServicesSectionIpmScoreNvXMF from './ServicesSectionIpmScoreNvXMF';
import ServicesSectionPricingTYo6r from './ServicesSectionPricingTYo6r';
import ServicesSectionClosing2651 from './ServicesSectionClosing2651';
import { HomeGetInTouchSection, HomeAnimaFooter } from '../../components/HomeCtaContactSections';
import { SERVICES_HASH_TO_ROLE_TAB } from './servicesSectionRoutes';

/** Matches `.news-nav.news-nav--landing` min-height + small gap under bar (Figma / App.css). */
const SERVICES_LANDING_NAV_HEIGHT_PX = 72;
const SERVICES_ROLE_TABS_STICKY_GAP_PX = 6;
const SERVICES_ROLE_TABS_STICKY_TOP = SERVICES_LANDING_NAV_HEIGHT_PX + SERVICES_ROLE_TABS_STICKY_GAP_PX;

/** Figma node 80:1275 — hero section assets. */
const imgSectionHero = '/img/services-icons/hero-texture.svg';
const imgGradient = '/img/services-icons/gradient-mask.svg';

const HERO_RADIAL_GRADIENT_STYLE = {
    backgroundImage:
        "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 1920 582.53\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"none\"><rect x=\"0\" y=\"0\" height=\"100%\" width=\"100%\" fill=\"url(%23grad)\" opacity=\"1\"/><defs><radialGradient id=\"grad\" gradientUnits=\"userSpaceOnUse\" cx=\"0\" cy=\"0\" r=\"10\" gradientTransform=\"matrix(80 0 0 40 1152 116.51)\"><stop stop-color=\"rgba(184,147,74,0.055)\" offset=\"0\"/><stop stop-color=\"rgba(184,147,74,0)\" offset=\"0.6\"/></radialGradient></defs></svg>'), url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 1920 582.53\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"none\"><rect x=\"0\" y=\"0\" height=\"100%\" width=\"100%\" fill=\"url(%23grad)\" opacity=\"1\"/><defs><radialGradient id=\"grad\" gradientUnits=\"userSpaceOnUse\" cx=\"0\" cy=\"0\" r=\"10\" gradientTransform=\"matrix(60 0 0 50 384 466.02)\"><stop stop-color=\"rgba(29,184,128,0.04)\" offset=\"0\"/><stop stop-color=\"rgba(29,184,128,0)\" offset=\"0.55\"/></radialGradient></defs></svg>')",
};

const HERO_MASK_LAYER_STYLE = {
    backgroundImage:
        'linear-gradient(180deg, rgba(184, 147, 74, 0.016) 1.25%, rgba(184, 147, 74, 0) 1.25%), linear-gradient(90deg, rgba(184, 147, 74, 0.016) 1.25%, rgba(184, 147, 74, 0) 1.25%)',
    WebkitMaskImage: `url('${imgGradient}')`,
    maskImage: `url('${imgGradient}')`,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskPosition: '0% 0%',
    maskPosition: '0% 0%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
};

const ROLE_TABS = [
    { label: 'Agent', id: 'agent', dataNodeId: '80:1290', textNodeId: '80:1291', borderRight: true, pad: 'asym' },
    { label: 'Buy', id: 'buy', dataNodeId: '80:1292', textNodeId: '80:1293', borderRight: true, pad: 'asym' },
    { label: 'Rent', id: 'rent', dataNodeId: '196:5', textNodeId: '196:6', borderRight: false, pad: 'sym' },
    { label: 'Investor', id: 'investor', dataNodeId: '80:1294', textNodeId: '80:1295', borderRight: true, pad: 'asym' },
    { label: 'Partner', id: 'partner', dataNodeId: '80:1296', textNodeId: '80:1297', borderRight: true, pad: 'asym' },
    { label: 'Enterprise', id: 'enterprise', dataNodeId: '80:1298', textNodeId: '80:1299', borderRight: false, pad: 'sym' },
];

/** Stakeholder tab → first matching section on the services page (Buy + Rent share one module). */
const ROLE_TAB_SECTION_ID = {
    agent: 'services-section-agent',
    buy: 'services-section-buy-rent',
    rent: 'services-section-buy-rent',
    investor: 'services-section-investor',
    partner: 'services-section-partner',
    enterprise: 'services-section-enterprise',
};

function ServicesHeroSegment({ tab, isActive, onClick }) {
    const outer = [
        'relative shrink-0',
        tab.borderRight ? 'border-r border-solid border-[rgba(255,255,255,0.08)]' : '',
        isActive ? 'bg-[rgba(184,147,74,0.16)]' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const innerPad =
        tab.pad === 'asym' ? 'pl-[28px] pr-[29px] py-3' : 'px-[28px] py-3';

    return (
        <button
            type="button"
            data-node-id={tab.dataNodeId}
            onClick={onClick}
            className={`${outer} m-0 cursor-pointer border-0 bg-transparent p-0 text-inherit`}
        >
            <div className={`relative flex flex-col items-center justify-center ${innerPad}`}>
                <span
                    data-node-id={tab.textNodeId}
                    className={[
                        'relative flex shrink-0 justify-center text-center text-base whitespace-nowrap [font-family:\'Poppins\',sans-serif] not-italic leading-normal',
                        isActive ? 'font-semibold text-[#ffc801]' : 'font-light text-white',
                    ].join(' ')}
                >
                    {tab.label}
                </span>
            </div>
        </button>
    );
}

/**
 * Services page top: hero (Figma node 80:1275). Site nav is App.js landing bar (same as home).
 */
const ServicesXePoOTop = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('agent');
    const [roleTabsPinned, setRoleTabsPinned] = useState(false);
    const [roleTabsBarHeight, setRoleTabsBarHeight] = useState(0);
    const roleTabsSentinelRef = useRef(null);
    const roleTabsBarRef = useRef(null);

    useEffect(() => {
        const el = roleTabsSentinelRef.current;
        if (!el) return undefined;
        const rootMargin = `-${SERVICES_ROLE_TABS_STICKY_TOP}px 0px 0px 0px`;
        const obs = new IntersectionObserver(
            ([entry]) => {
                setRoleTabsPinned(!entry.isIntersecting);
            },
            { root: null, rootMargin, threshold: 0 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    useLayoutEffect(() => {
        const bar = roleTabsBarRef.current;
        if (!bar) return undefined;
        const measure = () => setRoleTabsBarHeight(bar.offsetHeight);
        measure();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        ro?.observe(bar);
        window.addEventListener('resize', measure);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [activeTab, roleTabsPinned]);

    const scrollToStakeholderSection = useCallback(
        (tabId, behavior = 'smooth') => {
            const sectionId = ROLE_TAB_SECTION_ID[tabId];
            if (!sectionId) return;
            const el = document.getElementById(sectionId);
            if (!el) return;
            const tabBarH = roleTabsBarHeight > 0 ? roleTabsBarHeight : 48;
            const offset =
                SERVICES_LANDING_NAV_HEIGHT_PX + SERVICES_ROLE_TABS_STICKY_GAP_PX + tabBarH;
            const top = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: Math.max(0, top), behavior });
        },
        [roleTabsBarHeight]
    );

    useEffect(() => {
        if (location.pathname !== '/our-services') return undefined;
        const fragment = (location.hash || '').replace(/^#/, '');
        const tabId = SERVICES_HASH_TO_ROLE_TAB[fragment];
        if (!tabId) return undefined;
        setActiveTab(tabId);
        const id = window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => scrollToStakeholderSection(tabId, 'auto'));
        });
        return () => window.cancelAnimationFrame(id);
    }, [location.hash, location.pathname, roleTabsBarHeight, scrollToStakeholderSection]);

    useEffect(() => {
        if (location.pathname !== '/our-services') return undefined;
        const fragment = (location.hash || '').replace(/^#/, '');
        if (fragment !== 'home-section-contact') return undefined;
        const id = window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                const el = document.getElementById('home-section-contact');
                if (!el) return;
                const top =
                    el.getBoundingClientRect().top + window.scrollY - SERVICES_LANDING_NAV_HEIGHT_PX;
                window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
            });
        });
        return () => window.cancelAnimationFrame(id);
    }, [location.hash, location.pathname]);

    const handleRoleTabSelect = useCallback(
        (tabId) => {
            setActiveTab(tabId);
            requestAnimationFrame(() => scrollToStakeholderSection(tabId, 'smooth'));
        },
        [scrollToStakeholderSection]
    );

    return (
        <>
            <div className="w-full overflow-x-hidden bg-ipm-green" data-anima="services-q8-nav-tqo-hero">
                <section
                    data-node-id="80:1275"
                    className="relative flex w-full flex-col items-start border border-solid border-[rgba(0,0,0,0.2)] px-[clamp(16px,5vw,52px)] pt-[140px] pb-20 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
                    aria-labelledby="services-hero-heading"
                >
                    <div className="pointer-events-none absolute inset-0" aria-hidden>
                        <img alt="" className="absolute size-full max-w-none object-cover" src={imgSectionHero} />
                        <div className="absolute inset-0 bg-[rgba(0,0,0,0.35)]" />
                    </div>

                    <div
                        data-node-id="80:1276"
                        aria-hidden
                        className="pointer-events-none absolute inset-[-1px]"
                        style={HERO_RADIAL_GRADIENT_STYLE}
                    />

                    <div data-node-id="80:1277" className="pointer-events-none absolute inset-[-1px]" aria-hidden>
                        <div
                            data-node-id="80:1279"
                            className="absolute inset-0 [mask-composite:intersect] [-webkit-mask-composite:source-in]"
                            style={HERO_MASK_LAYER_STYLE}
                        />
                    </div>

                    <div
                        data-node-id="80:1280"
                        className="relative z-[1] mx-auto flex w-full max-w-[800px] shrink-0 flex-col items-center pb-16 pt-0 sm:pb-20 md:pb-24"
                    >
                        <div
                            data-node-id="80:1281"
                            className="flex w-full items-center justify-center gap-0"
                        >
                            <div data-node-id="80:1283" className="relative flex shrink-0 flex-col items-center">
                                <p
                                    data-node-id="80:1284"
                                    className="m-0 whitespace-nowrap text-center font-['Jost',sans-serif] text-[10px] font-semibold uppercase leading-4 tracking-[2.5px] text-white"
                                >
                                    The IPM Ecosystem
                                </p>
                            </div>
                        </div>

                        <div
                            data-node-id="80:1285"
                            className="mt-[31px] flex w-full flex-col items-center text-center"
                        >
                            <h1
                                id="services-hero-heading"
                                data-node-id="80:1286"
                                className="m-0 w-full max-w-[900px] whitespace-normal text-[0px] text-[#f5f0e8]"
                            >
                                <span className="mb-0 block font-['Poppins',sans-serif] text-[clamp(2.5rem,8vw,76px)] font-extralight not-italic leading-[77.52px] text-white">
                                    One Platform.
                                </span>
                                <span className="block font-['Playfair_Display',serif] text-[clamp(2.5rem,8vw,76px)] font-normal italic leading-[77.52px] text-[#ffc801]">
                                    Every Real Estate Service.
                                </span>
                            </h1>
                        </div>

                        <div
                            data-node-id="80:1287"
                            className="mt-3 flex w-full max-w-[560px] flex-col items-center text-center md:mt-4"
                        >
                            <p
                                data-node-id="80:1288"
                                className="m-0 font-['Jost',sans-serif] text-[17px] font-normal leading-[30.26px] text-white"
                            >
                                <span className="mb-0 block whitespace-normal sm:whitespace-nowrap">
                                    Built by industry leaders to support the entire real estate lifecycle for
                                </span>
                                <span className="block whitespace-normal sm:whitespace-nowrap">
                                    every stakeholder, at every stage, in every market.
                                </span>
                            </p>
                        </div>

                        <div className="mt-8 flex w-full flex-col items-center sm:mt-10 md:mt-12">
                            <div
                                ref={roleTabsSentinelRef}
                                className="pointer-events-none h-0 w-full shrink-0"
                                aria-hidden
                            />
                            <div
                                ref={roleTabsBarRef}
                                data-node-id="80:1289"
                                className={[
                                    'mx-auto z-[9999] flex w-fit max-w-full flex-wrap items-start justify-center overflow-clip rounded-[14px] border border-solid border-[rgba(255,255,255,0.14)] bg-[#10575c]/95 p-px shadow-[0_4px_24px_rgba(0,0,0,0.18)] backdrop-blur-md md:flex-nowrap',
                                    roleTabsPinned
                                        ? 'fixed inset-x-0 top-[calc(72px+6px)] mx-auto w-fit'
                                        : 'relative',
                                ].join(' ')}
                            >
                                {ROLE_TABS.map((tab) => (
                                    <ServicesHeroSegment
                                        key={tab.id}
                                        tab={tab}
                                        isActive={activeTab === tab.id}
                                        onClick={() => handleRoleTabSelect(tab.id)}
                                    />
                                ))}
                            </div>
                            {roleTabsPinned && roleTabsBarHeight > 0 ? (
                                <div
                                    className="w-full shrink-0"
                                    style={{ height: roleTabsBarHeight }}
                                    aria-hidden
                                />
                            ) : null}
                        </div>
                    </div>
                </section>
            </div>
            <ServicesSectionModule2o4lm />
            <ServicesFoundingPricing0ScTO />
            <ServicesSectionModuleUyVnk />
            <ServicesSectionHowItWorksB8p91 />
            <ServicesSectionModuleCfZMr />
            <ServicesSectionModuleDbMG4 />
            <ServicesSectionModuleCJCHr />
            <ServicesSectionComparisonJAP3B />
            <ServicesSectionIpmScoreNvXMF />
            <ServicesSectionPricingTYo6r />
            <ServicesSectionClosing2651 />
            <HomeGetInTouchSection idPrefix="services" />
            <HomeAnimaFooter idPrefix="services" />
        </>
    );
};

export default ServicesXePoOTop;
