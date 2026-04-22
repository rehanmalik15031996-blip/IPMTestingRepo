import React from 'react';

const I = '/img/NvXMF';

function PropertySummarySection() {
    const checklistItems = [
        { text: 'Updates as the market changes — always current' },
        { text: 'Available on every property in our network' },
        { text: '40+ data points synthesised into one trusted score' },
    ];

    return (
        <div className="relative flex w-full max-w-xl flex-col items-start gap-[15px] self-center xl:max-w-none">
            <p className="m-0 [font-family:'Jost',Helvetica] text-[10px] font-semibold uppercase leading-4 tracking-[2.5px] text-ipm-grey">
                THE IPM SCORE
            </p>

            <h2
                id="services-ipm-score-heading"
                className="m-0 max-w-[520px] [font-family:'Poppins',Helvetica] text-[clamp(1.75rem,4.5vw,3.125rem)] font-extralight leading-[1.05] tracking-0 text-ipm-black"
            >
                One number that
                <br />
                explains{' '}
                <span className="[font-family:'Playfair_Display',Helvetica] font-normal not-italic leading-[1.05]">
                    everything
                    <br />
                    about a property.
                </span>
            </h2>

            <p className="m-0 max-w-[540px] [font-family:'Poppins',Helvetica] text-[15px] font-light leading-[1.65] tracking-0 text-ipm-black">
                Every property gets an IPM Score. Calculated from 40+ real data points, location,
                schools, safety, growth, value, so you can compare property honestly, not just by
                price.
            </p>

            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 pt-2">
                {checklistItems.map((item) => (
                    <li
                        key={item.text}
                        className="flex items-center gap-2.5 [font-family:'Poppins',Helvetica] text-[15px] font-light leading-[1.55] text-ipm-grey"
                    >
                        <span
                            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[11px] border border-solid border-ipm-light-grey bg-white [font-family:'Jost',Helvetica] text-[13px] text-ipm-grey"
                            aria-hidden
                        >
                            ✓
                        </span>
                        {item.text}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function PropertyScorecardSection() {
    /** Figma node 80:2045 — one 24×24 stroke icon per row (MapPin, Backpack, TrendUp, etc.). */
    const scorecardItems = [
        {
            label: 'Location Quality',
            score: '9.2 / 10',
            percentage: '92.00%',
            iconSrc: `${I}/ipm-score-map-pin.svg`,
        },
        {
            label: 'Schools Nearby',
            score: '8.8 / 10',
            percentage: '88.00%',
            iconSrc: `${I}/ipm-score-backpack.svg`,
        },
        {
            label: 'Growth Outlook',
            score: '8.5 / 10',
            percentage: '85.00%',
            iconSrc: `${I}/ipm-score-trend-up.svg`,
        },
        {
            label: 'Safety Rating',
            score: '8.0 / 10',
            percentage: '80.00%',
            iconSrc: `${I}/ipm-score-shield-check.svg`,
        },
        {
            label: 'Value vs Market',
            score: '9.4 / 10',
            percentage: '94.00%',
            iconSrc: `${I}/ipm-score-money-wavy.svg`,
        },
        {
            label: 'Transport Links',
            score: '7.8 / 10',
            percentage: '78.00%',
            iconSrc: `${I}/ipm-score-car-profile.svg`,
        },
    ];

    return (
        <div className="relative flex w-full max-w-[597px] flex-col items-center gap-2.5 self-center rounded-[22px] border border-solid border-ipm-grey bg-white px-4 py-7 shadow-[0px_2px_12px_#1c17100f,0px_8px_40px_#1c17101a] sm:px-6">
            <p className="m-0 [font-family:'Poppins',Helvetica] text-[10px] font-semibold leading-4 tracking-[2px] text-ipm-grey">
                LIVE EXAMPLE — 14 VINEYARD ROAD, CAPE TOWN
            </p>

            {scorecardItems.map((item) => (
                <div
                    key={item.label}
                    className="flex w-full flex-col gap-[5px] rounded-xl bg-white px-4 py-3.5 shadow-[1px_3px_3px_#0000001a]"
                >
                    <div className="flex w-full items-center justify-between gap-3">
                        <div className="inline-flex flex-[0_0_auto] items-center gap-1">
                            <div className="relative h-6 w-6 shrink-0" aria-hidden>
                                <img
                                    className="absolute inset-0 block h-full w-full max-w-none"
                                    alt=""
                                    src={item.iconSrc}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                            <span className="[font-family:'Poppins',Helvetica] text-[12.5px] font-normal leading-5 tracking-0 text-[#4a3f32] sm:whitespace-nowrap">
                                {item.label}
                            </span>
                        </div>

                        <div
                            className="shrink-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[15px] font-bold leading-5 text-[#b8934a]"
                            aria-label={`Score ${item.score}`}
                        >
                            {item.score}
                        </div>
                    </div>

                    <div
                        className="relative h-1 w-full overflow-hidden rounded-[100px] bg-[#ddd5c8]"
                        role="presentation"
                    >
                        <div
                            className="h-full rounded-[100px] bg-[linear-gradient(90deg,rgba(16,87,92,1)_0%,rgba(255,200,1,1)_100%)]"
                            style={{ width: item.percentage }}
                        />
                    </div>
                </div>
            ))}

            <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-[14px] border border-solid border-[#2a4f37] bg-ipm-green px-4 py-4 sm:px-5">
                <div className="flex min-w-0 flex-col gap-[3px]">
                    <span className="[font-family:'Poppins',Helvetica] text-[10px] font-semibold leading-4 tracking-[1.8px] text-ipm-light-grey">
                        IPM SCORE
                    </span>
                    <p className="m-0 [font-family:'Poppins',Helvetica] text-xs font-normal leading-[1.35] text-ipm-grey">
                        Strong buy — top 12% in this area
                    </p>
                </div>
                <div
                    className="[font-family:'Playfair_Display',Helvetica] text-[clamp(2rem,5vw,2.75rem)] font-normal leading-none text-ipm-light-grey"
                    aria-hidden
                >
                    8.8
                </div>
            </div>
        </div>
    );
}

/**
 * AnimaPackage-React-NvXMF — IPM Score explainer + live example scorecard.
 */
export default function ServicesSectionIpmScoreNvXMF() {
    return (
        <section
            className="w-full bg-white py-12 lg:py-[100px]"
            aria-labelledby="services-ipm-score-heading"
            data-anima="services-NvXMF-ipm-score"
        >
            <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-start gap-10 px-[clamp(16px,5vw,52px)] xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-[72px]">
                <PropertySummarySection />
                <PropertyScorecardSection />
            </div>
        </section>
    );
}
