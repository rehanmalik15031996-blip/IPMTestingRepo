import React from 'react';

/** Figma node 80:2146 — background from MCP (refresh if URL expires) */
const COMPARISON_SECTION_BG = `${process.env.PUBLIC_URL || ''}/img/jAP3B/section-comparison-table-bg.png`;

const HEADER_LABEL_CLASS =
    "[font-family:'Jost',Helvetica,sans-serif] text-[10.5px] font-semibold uppercase leading-normal tracking-[0.5px] text-[#10575c]";

function FeatureComparisonTableSection() {
    const tableRows = [
        {
            feature: 'Inbound leads from own listings',
            listingPortals: 'Paid per lead',
            crmTools: 'Not included',
            ipmPlatform: '€0  - Every lead, yours',
        },
        {
            feature: 'AI-powered lead scoring',
            listingPortals: '✗',
            crmTools: 'Limited',
            ipmPlatform: '✓ Fully intelligence-driven',
        },
        {
            feature: 'Global buyer reach (60+ countries)',
            listingPortals: 'Some markets',
            crmTools: '✗',
            ipmPlatform: '✓ Live across all markets',
        },
        {
            feature: 'IPM Score & market intelligence',
            listingPortals: '✗',
            crmTools: '✗',
            ipmPlatform: '✓ Exclusive to IPM',
        },
        {
            feature: 'Branded CMA Report Builder',
            listingPortals: '✗',
            crmTools: 'Basic',
            ipmPlatform: '✓ On-demand, fully branded',
        },
        {
            feature: 'Smart Vault document AI',
            listingPortals: '✗',
            crmTools: '✗',
            ipmPlatform: '✓ Included',
        },
        {
            feature: 'Partner collaboration workspace',
            listingPortals: '✗',
            crmTools: '✗',
            ipmPlatform: '✓ Built-in',
        },
        {
            feature: 'ROI & yield simulator',
            listingPortals: '✗',
            crmTools: '✗',
            ipmPlatform: '✓ Real-time AI modelling',
        },
        {
            feature: 'Investor portfolio tracking',
            listingPortals: '✗',
            crmTools: '✗',
            ipmPlatform: '✓ Full module',
        },
        {
            feature: 'White-label / API integration',
            listingPortals: '✗',
            crmTools: 'Limited',
            ipmPlatform: '✓ 48h go-live',
        },
        {
            feature: 'Off-market early access',
            listingPortals: '✗',
            crmTools: '✗',
            ipmPlatform: '✓ 24hr exclusive',
        },
        {
            feature: 'Pricing model',
            listingPortals: 'Per-listing + fees',
            crmTools: 'Per user / month',
            ipmPlatform: 'One subscription. Everything.',
            isLast: true,
        },
    ];

    return (
        <div
            className="w-full overflow-hidden rounded-[16px] border border-solid border-white/90 bg-[rgba(16,87,92,0.55)] shadow-[0px_2px_16px_rgba(28,23,16,0.06),0px_1px_4px_rgba(28,23,16,0.04)]"
            data-name="Table"
            data-node-id="80:2153"
        >
            <table className="w-full table-fixed border-collapse">
                <thead>
                    <tr>
                        <th className={`w-[45%] border-r border-b border-white/90 bg-white px-[18px] pb-[15px] pt-[14px] text-left ${HEADER_LABEL_CLASS}`}>
                            Feature
                        </th>
                        <th className={`w-[20%] border-r border-b border-white/90 bg-white px-[18px] pb-[15px] pt-[14px] text-left ${HEADER_LABEL_CLASS}`}>
                            Listing Portals
                        </th>
                        <th className={`w-[20%] border-r border-b border-white/90 bg-white px-[18px] pb-[15px] pt-[14px] text-left ${HEADER_LABEL_CLASS}`}>
                            CRM Tools
                        </th>
                        <th className={`w-[15%] border-b border-white/90 bg-[#ffc801] px-[18px] pb-[15px] pt-[14px] text-left ${HEADER_LABEL_CLASS} text-[#53420a]`}>
                            IPM Platform
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {tableRows.map((row, idx) => {
                        const isLast = idx === tableRows.length - 1;
                        const rowBorder = isLast ? '' : 'border-b border-white/90';
                        return (
                            <tr key={row.feature}>
                                <td className={`${rowBorder} border-r border-white/90 px-[18px] py-3 text-[13px] font-medium leading-normal text-white`}>
                                    {row.feature}
                                </td>
                                <td className={`${rowBorder} border-r border-white/90 px-[18px] py-3 text-[13px] font-normal leading-normal text-white/70`}>
                                    {row.listingPortals}
                                </td>
                                <td className={`${rowBorder} border-r border-white/90 px-[18px] py-3 text-[13px] font-normal leading-normal text-white/70`}>
                                    {row.crmTools}
                                </td>
                                <td className={`${rowBorder} px-[18px] py-3 text-[13px] font-bold leading-normal text-white`}>
                                    {row.ipmPlatform}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function HeroHeadlineSection() {
    return (
        <div
            className="flex max-w-[580px] flex-col gap-4"
            data-name="Container"
            data-node-id="80:2148"
        >
            <div data-name="Container" data-node-id="80:2149">
                <p
                    className="m-0 [font-family:'Jost',Helvetica,sans-serif] text-[10px] font-semibold uppercase leading-4 tracking-[2.8px] text-white"
                    data-node-id="80:2150"
                >
                    Why IPM vs the Alternatives
                </p>
            </div>
            <div data-name="Heading 2" data-node-id="80:2151">
                <h2
                    id="services-comparison-heading"
                    className="m-0 text-[0px] text-white"
                    data-node-id="80:2152"
                >
                    <span className="mb-0 block [font-family:'Poppins',Helvetica,sans-serif] text-[clamp(2rem,6vw,50px)] font-extralight not-italic leading-[43.2px] text-white sm:leading-[43.2px]">
                        Not a listing site.
                    </span>
                    <span className="mt-0 block [font-family:'Playfair_Display',Georgia,serif] text-[clamp(2rem,6vw,50px)] font-normal italic leading-[50.88px] text-[#ffc801] sm:leading-[50.88px]">
                        An intelligent operating system for property.
                    </span>
                </h2>
            </div>
        </div>
    );
}

/**
 * Figma 80:2146 — comparison headline + table on photo + teal overlay.
 */
export default function ServicesSectionComparisonJAP3B() {
    return (
        <section
            className="relative w-full overflow-hidden py-12 lg:py-[100px]"
            aria-labelledby="services-comparison-heading"
            data-anima="services-jAP3B-comparison"
            data-name="Section - COMPARISON TABLE"
            data-node-id="80:2146"
        >
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <img
                    alt=""
                    className="absolute size-full max-w-none object-cover"
                    src={COMPARISON_SECTION_BG}
                />
                <div className="absolute inset-0 bg-[rgba(0,0,0,0.55)]" />
            </div>

            <div
                className="relative z-[1] mx-auto flex w-full max-w-[1200px] flex-col gap-[47.51px] px-[clamp(16px,5vw,52px)]"
                data-name="Container"
                data-node-id="80:2147"
            >
                <HeroHeadlineSection />
                <FeatureComparisonTableSection />
            </div>
        </section>
    );
}
