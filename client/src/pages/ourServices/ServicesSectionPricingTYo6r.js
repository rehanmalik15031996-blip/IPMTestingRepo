import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';

const PRICING_AUDIENCE_TABS = [
    { id: 'investors', label: 'Investors + Buyers' },
    { id: 'agents', label: 'Agents + Agencies' },
    { id: 'partners', label: 'Partners' },
];

const muted = 'text-[#78736d]';
const dark = 'text-[#1a1714]';
const featureText = `[font-family:'Poppins',Helvetica] text-[13px] font-normal leading-[1.45]`;
const btnBase =
    'mt-auto flex w-full items-center justify-center rounded-2xl px-3 py-3.5 text-center no-underline transition-opacity hover:opacity-90 [font-family:\'Poppins\',Helvetica] text-sm font-medium leading-snug';

function CheckRow({ children, variant, greenText = 'white' }) {
    const textCls =
        variant === 'green'
            ? greenText === 'muted'
                ? `${featureText} text-ipm-light-grey`
                : `${featureText} text-white`
            : `${featureText} text-ipm-black`;
    return (
        <div className="flex items-start gap-2 py-1.5">
            <span
                className="mt-0.5 shrink-0 [font-family:'Jost',Helvetica] text-sm font-bold leading-none text-ipm-yellow"
                aria-hidden
            >
                ✓
            </span>
            <span className={textCls}>{children}</span>
        </div>
    );
}

function PopularBadge() {
    return (
        <div className="absolute left-1/2 top-0 z-[1] -translate-x-1/2 rounded-b-[10px] bg-white px-3.5 pb-1 pt-0.5">
            <span className="whitespace-nowrap [font-family:'Jost',Helvetica] text-[9px] font-bold uppercase leading-4 tracking-[1.6px] text-ipm-green">
                MOST POPULAR
            </span>
        </div>
    );
}

function TierLabel({ children, green }) {
    return (
        <p
            className={`m-0 [font-family:'Jost',Helvetica] text-[10px] font-semibold uppercase leading-4 tracking-[2.8px] ${
                green ? 'text-[#f5f0e873]' : 'text-ipm-light-grey'
            }`}
        >
            {children}
        </p>
    );
}

function PriceBlock({ amount, suffix, green }) {
    return (
        <div className="mt-2 flex flex-wrap items-end gap-0.5">
            <span
                className={`[font-family:'Playfair_Display',Helvetica] text-[44px] font-normal leading-none tracking-[-1px] ${
                    green ? 'text-ipm-yellow' : dark
                }`}
            >
                {amount}
            </span>
            <span
                className={`mb-1 [font-family:'Jost',Helvetica] text-[15px] font-normal leading-none tracking-[-1px] ${
                    green ? 'text-[#f5f0e866]' : 'text-ipm-black'
                }`}
            >
                {suffix}
            </span>
        </div>
    );
}

function Subline({ children, green }) {
    return (
        <p
            className={`mt-4 pb-1 [font-family:'Jost',Helvetica] text-xs font-normal leading-[1.35] ${
                green ? 'text-[#f5f0e873]' : 'text-ipm-black'
            }`}
        >
            {children}
        </p>
    );
}

function PricingIntroSection() {
    return (
        <div className="mx-auto flex max-w-[540px] flex-col items-center text-center">
            <p
                className={`m-0 [font-family:'Jost',Helvetica] text-[10px] font-semibold uppercase leading-4 tracking-[2.8px] ${muted}`}
            >
                TRANSPARENT PRICING
            </p>
            <h2
                id="services-pricing-tyo-heading"
                className={`mt-4 [font-family:'Poppins',Helvetica] text-[clamp(1.75rem,4vw,3.125rem)] font-extralight leading-[1.05] tracking-0 ${dark}`}
            >
                Choose the level of
                <br />
                <span className="[font-family:'Playfair_Display',Helvetica] font-normal italic leading-[1.05]">
                    insight you need.
                </span>
            </h2>
            <p className={`mt-4 max-w-xl [font-family:'Poppins',Helvetica] text-[15px] font-light leading-[1.65] ${muted}`}>
                Need something more tailored? We can build access around your portfolio and goals.
            </p>
        </div>
    );
}

function PricingAudienceSelector({ activeId, onChange, labelledBy }) {
    return (
        <div className="flex w-full flex-col items-center gap-3">
            <p
                id={labelledBy}
                className={`m-0 [font-family:'Jost',Helvetica] text-[10px] font-semibold uppercase leading-4 tracking-[2.8px] ${muted}`}
            >
                Options
            </p>
            <div className="flex w-full justify-center">
                <div
                    role="tablist"
                    aria-labelledby={labelledBy}
                    className="flex max-w-full flex-nowrap gap-0.5 overflow-x-auto rounded-full border border-solid border-ipm-light-grey bg-[#f5f4f2] p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-[720px] sm:w-full [&::-webkit-scrollbar]:hidden"
                >
                    {PRICING_AUDIENCE_TABS.map((tab) => {
                        const selected = activeId === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                id={`pricing-audience-tab-${tab.id}`}
                                aria-selected={selected}
                                aria-controls={`pricing-audience-panel-${tab.id}`}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => onChange(tab.id)}
                                className={[
                                    'min-h-[44px] min-w-[min(100%,158px)] shrink-0 rounded-full border-0 px-3 py-2.5 text-center transition-colors sm:min-w-0 sm:flex-1 sm:px-4 sm:py-3',
                                    'cursor-pointer [font-family:\'Poppins\',Helvetica] text-[11px] font-normal leading-snug sm:text-[13px]',
                                    selected
                                        ? 'bg-white font-semibold text-ipm-green shadow-[0_1px_3px_rgba(28,23,16,0.08)]'
                                        : 'text-[#78736d] hover:text-ipm-green/90',
                                ].join(' ')}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function InvestorBuyerPricingSection() {
    const basicFeatures = [
        'Single-asset optimisation',
        'Market intelligence + AI property matching',
        'Smart Vault document AI',
        'Live AI ROI investment simulator',
        'Conversational AI data assistant',
    ];

    const customFeatures = [
        'Large-scale funds and agencies',
        'Bespoke data and account management',
        'Personalised account manager',
    ];

    return (
        <div className="grid w-full grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
                {/* BASIC */}
                <div className="relative flex min-h-[480px] flex-col rounded-[30px] border border-solid border-ipm-light-grey bg-white p-8 pt-10 shadow-[0px_1px_4px_#1c17100a,0px_2px_16px_#1c17100f]">
                    <TierLabel>BASIC</TierLabel>
                    <PriceBlock amount="€19" suffix="/mo" />
                    <Subline>Ideal for individual buyer</Subline>
                    <div className="mt-4 flex flex-1 flex-col">
                        {basicFeatures.map((feature) => (
                            <CheckRow key={feature}>{feature}</CheckRow>
                        ))}
                    </div>
                    <Link to="/signup" className={`${btnBase} border border-solid border-ipm-light-grey text-[#1a1714]`}>
                        Get Started →
                    </Link>
                </div>

                {/* PREMIUM */}
                <div className="relative flex min-h-[480px] flex-col rounded-[30px] border border-solid border-transparent bg-ipm-green p-8 pt-10 shadow-[0px_6px_20px_#1c171014,0px_20px_64px_#1c171024]">
                    <PopularBadge />
                    <TierLabel green>PREMIUM</TierLabel>
                    <PriceBlock amount="€139" suffix="/mo" green />
                    <Subline green>Ideal for portfolio growth</Subline>
                    <div className="mt-4 flex flex-1 flex-col">
                        <div className="py-1.5">
                            <span className={`${featureText} text-white`}>Everything in Basic, plus:</span>
                        </div>
                        <CheckRow variant="green">Track up to 5 properties simultaneously</CheckRow>
                        <div className="flex items-start gap-2 py-1.5">
                            <span
                                className="mt-0.5 shrink-0 [font-family:'Jost',Helvetica] text-sm font-bold leading-none text-ipm-yellow"
                                aria-hidden
                            >
                                ✓
                            </span>
                            <span className={`${featureText} text-white`}>
                                Income type management (LTR / STR /
                                <br />
                                commercial)
                            </span>
                        </div>
                        <CheckRow variant="green">Exclusive off-market early access — 24hr</CheckRow>
                        <CheckRow variant="green">Hyper-localised market data + volatility alerts</CheckRow>
                        <CheckRow variant="green">Full IPM Academy access</CheckRow>
                    </div>
                    <Link to="/signup" className={`${btnBase} bg-white text-ipm-green`}>
                        Get Started →
                    </Link>
                </div>

                {/* CUSTOM */}
                <div className="relative flex min-h-[480px] flex-col rounded-[30px] border border-solid border-ipm-light-grey bg-white p-8 pt-10 shadow-[0px_1px_4px_#1c17100a,0px_2px_16px_#1c17100f] md:col-span-2 xl:col-span-1">
                    <TierLabel>CUSTOM</TierLabel>
                    <div className="mt-2 [font-family:'Playfair_Display',Helvetica] text-[44px] font-normal leading-none tracking-[-1px] text-ipm-black">
                        Bespoke
                    </div>
                    <Subline>Ideal for institutional / agency</Subline>
                    <div className="mt-4 flex flex-1 flex-col">
                        {customFeatures.map((feature) => (
                            <CheckRow key={feature}>{feature}</CheckRow>
                        ))}
                    </div>
                    <Link to="/contact" className={`${btnBase} border border-solid border-ipm-light-grey text-ipm-black`}>
                        Contact us →
                    </Link>
                </div>
        </div>
    );
}

const AGENCY_ELITE_TIERS = [
    { key: '10-100', users: 10, listings: 100, price: 980 },
    { key: '15-150', users: 15, listings: 150, price: 1470 },
    { key: '20-200', users: 20, listings: 200, price: 1960 },
    { key: '25-250', users: 25, listings: 250, price: 2450 },
];

function AgentAgencyPricingSection() {
    const [selectedTier, setSelectedTier] = useState('10-100');
    const tier = AGENCY_ELITE_TIERS.find((t) => t.key === selectedTier) || AGENCY_ELITE_TIERS[0];

    const basicFeatures = [
        'Up to 10 listings (pay per additional)',
        'Full Smart CRM & client management',
        'Unlimited property enquiries',
        '5 IPM-verified leads monthly',
        'CMA Report Builder — 10 per month',
        'Marketing Suite',
    ];

    const premiumFeatures = [
        'Everything in Basic, scaled for teams',
        `Up to ${tier.users} users with role-based access`,
        `Up to ${tier.listings} listings simultaneously`,
        '10 IPM-verified leads per agent/user',
        'Unlimited CMA reports + AI listing copy',
        'Agency Management Dashboard',
    ];

    const enterpriseFeatures = [
        'Everything in Premium, plus:',
        '500+ users & listings',
        'Personalised account manager',
        'Custom API integrations',
        'White-labelling available',
    ];

    return (
        <div className="grid w-full grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
                <div className="relative flex min-h-[460px] flex-col rounded-[30px] border border-solid border-ipm-light-grey bg-white p-8 pt-10 shadow-[0px_1px_4px_#1c17100a,0px_2px_16px_#1c17100f]">
                    <TierLabel>BASIC</TierLabel>
                    <PriceBlock amount="€79" suffix="/mo" />
                    <Subline>Ideal for independent professional</Subline>
                    <div className="mt-4 flex flex-1 flex-col">
                        {basicFeatures.slice(0, 4).map((feature) => (
                            <CheckRow key={feature}>{feature}</CheckRow>
                        ))}
                        <CheckRow>{basicFeatures[4]}</CheckRow>
                        <div className="mt-8">
                            <CheckRow>{basicFeatures[5]}</CheckRow>
                        </div>
                    </div>
                    <Link to="/signup" className={`${btnBase} border border-solid border-ipm-light-grey text-ipm-black`}>
                        Get Started →
                    </Link>
                </div>

                <div className="relative flex min-h-[460px] flex-col rounded-[30px] border border-solid border-transparent bg-ipm-green p-8 pt-10 shadow-[0px_6px_20px_#1c171014,0px_20px_64px_#1c171024]">
                    <PopularBadge />
                    <TierLabel green>PREMIUM</TierLabel>
                    <PriceBlock amount={`€${tier.price.toLocaleString()}`} suffix="/mo" green />
                    <Subline green>Ideal for Agency Elite</Subline>
                    <div className="mt-3 mb-4">
                        <select
                            value={selectedTier}
                            onChange={(e) => setSelectedTier(e.target.value)}
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-[13px] text-white backdrop-blur-sm outline-none transition-colors hover:bg-white/15 focus:bg-white/15 [font-family:'Poppins',Helvetica]"
                        >
                            {AGENCY_ELITE_TIERS.map((t) => (
                                <option key={t.key} value={t.key} className="text-ipm-green bg-white">
                                    {t.users} Users, {t.listings} Listings — €{t.price.toLocaleString()}/mo
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-1 flex-col">
                        {premiumFeatures.map((feature) => (
                            <CheckRow key={feature} variant="green" greenText="muted">
                                {feature}
                            </CheckRow>
                        ))}
                    </div>
                    <Link to="/signup" className={`${btnBase} bg-white text-ipm-green`}>
                        Get Started →
                    </Link>
                </div>

                <div className="relative flex min-h-[460px] flex-col rounded-[30px] border border-solid border-ipm-light-grey bg-white p-8 pt-10 shadow-[0px_1px_4px_#1c17100a,0px_2px_16px_#1c17100f] md:col-span-2 xl:col-span-1">
                    <TierLabel>ENTERPRISE</TierLabel>
                    <PriceBlock amount="€4,250" suffix="/mo" />
                    <Subline>Ideal for enterprise</Subline>
                    <div className="mt-4 flex flex-1 flex-col">
                        {enterpriseFeatures.map((feature) => (
                            <CheckRow key={feature}>{feature}</CheckRow>
                        ))}
                    </div>
                    <Link to="/enterprise-signup" className={`${btnBase} border border-solid border-ipm-light-grey text-ipm-black`}>
                        Get Started →
                    </Link>
                </div>
        </div>
    );
}

function PartnerProgramPricingSection() {
    const basicFeatures = ['Non-exclusive shared space', 'Rotating placement in local pool'];

    const premiumFeatures = ['Category exclusive — only provider shown', 'Priority placement in all categories'];

    const strategicFeatures = [
        'Newsletter features + joint training',
        'Verified Partner status in AI assistant',
        'IPM Academy webinars + co-branding',
    ];

    return (
        <div className="grid w-full grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
                <div className="relative flex min-h-[380px] flex-col rounded-[30px] border border-solid border-ipm-light-grey bg-white p-8 pt-10 shadow-[0px_1px_4px_#1c17100a,0px_2px_16px_#1c17100f]">
                    <TierLabel>BASIC</TierLabel>
                    <PriceBlock amount="€250" suffix="/mo" />
                    <Subline>Ideal for Community Partner</Subline>
                    <div className="mt-4 flex flex-1 flex-col">
                        {basicFeatures.map((feature) => (
                            <CheckRow key={feature}>{feature}</CheckRow>
                        ))}
                    </div>
                    <Link to="/signup" className={`${btnBase} border border-solid border-ipm-light-grey text-[#1a1714]`}>
                        Get Started →
                    </Link>
                </div>

                <div className="relative flex min-h-[380px] flex-col rounded-[30px] border border-solid border-transparent bg-ipm-green p-8 pt-10 shadow-[0px_6px_20px_#1c171014,0px_20px_64px_#1c171024]">
                    <PopularBadge />
                    <TierLabel green>PREMIUM</TierLabel>
                    <PriceBlock amount="€750" suffix="/mo" green />
                    <Subline green>Ideal for Regional Authority</Subline>
                    <div className="mt-4 flex flex-1 flex-col">
                        {premiumFeatures.map((feature) => (
                            <CheckRow key={feature} variant="green" greenText="muted">
                                {feature}
                            </CheckRow>
                        ))}
                    </div>
                    <Link to="/signup" className={`${btnBase} bg-white text-ipm-green`}>
                        Get Started →
                    </Link>
                </div>

                <div className="relative flex min-h-[380px] flex-col rounded-[30px] border border-solid border-ipm-light-grey bg-white p-8 pt-10 shadow-[0px_1px_4px_#1c17100a,0px_2px_16px_#1c17100f] md:col-span-2 xl:col-span-1">
                    <TierLabel>STRATEGIC GROWTH</TierLabel>
                    <div className="mt-2 flex flex-wrap items-end gap-0.5">
                        <span className="[font-family:'Playfair_Display',Helvetica] text-[44px] font-normal leading-none tracking-[-1px] text-[#1a1714]">
                            €1,500
                        </span>
                        <span className="mb-1 [font-family:'Jost',Helvetica] text-[15px] font-normal text-ipm-black">
                            /mo
                        </span>
                    </div>
                    <Subline>Ideal for strategic partner</Subline>
                    <div className="mt-4 flex flex-1 flex-col">
                        {strategicFeatures.map((feature) => (
                            <CheckRow key={feature}>{feature}</CheckRow>
                        ))}
                    </div>
                    <Link to="/contact" className={`${btnBase} border border-solid border-ipm-light-grey text-[#1a1714]`}>
                        Contact us →
                    </Link>
                </div>
        </div>
    );
}

/**
 * AnimaPackage-React-TYo6r — Transparent pricing tiers (investors, agents, partners).
 * @param {string} [getInTouchTo='#home-section-contact'] — In-page hash on Our Services; use `/our-services#home-section-contact` on standalone /pricing.
 */
export default function ServicesSectionPricingTYo6r({ getInTouchTo = '#home-section-contact' }) {
    const [audience, setAudience] = useState('investors');
    const optionsLabelId = useId();

    return (
        <section
            className="w-full bg-ipm-light-grey py-12 lg:py-[100px]"
            aria-labelledby="services-pricing-tyo-heading"
            data-anima="services-TYo6r-pricing"
        >
            <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-[clamp(16px,5vw,52px)] lg:gap-14">
                <PricingIntroSection />
                <PricingAudienceSelector
                    activeId={audience}
                    onChange={setAudience}
                    labelledBy={optionsLabelId}
                />

                <div className="w-full">
                    {audience === 'investors' && (
                        <div
                            id="pricing-audience-panel-investors"
                            role="tabpanel"
                            aria-labelledby="pricing-audience-tab-investors"
                        >
                            <InvestorBuyerPricingSection />
                        </div>
                    )}
                    {audience === 'agents' && (
                        <div
                            id="pricing-audience-panel-agents"
                            role="tabpanel"
                            aria-labelledby="pricing-audience-tab-agents"
                        >
                            <AgentAgencyPricingSection />
                        </div>
                    )}
                    {audience === 'partners' && (
                        <div
                            id="pricing-audience-panel-partners"
                            role="tabpanel"
                            aria-labelledby="pricing-audience-tab-partners"
                        >
                            <PartnerProgramPricingSection />
                        </div>
                    )}
                </div>

                <p className="m-0 text-center [font-family:'Jost',Helvetica] text-sm font-normal leading-[1.4]">
                    <span className={`italic ${muted}`}>Need something more tailored? </span>
                    {getInTouchTo.startsWith('#') ? (
                        <a
                            href={getInTouchTo}
                            className="font-medium italic text-[#4a3f32] no-underline hover:underline"
                        >
                            Talk to our team →
                        </a>
                    ) : (
                        <Link to={getInTouchTo} className="font-medium italic text-[#4a3f32] no-underline hover:underline">
                            Talk to our team →
                        </Link>
                    )}
                </p>
            </div>
        </section>
    );
}
