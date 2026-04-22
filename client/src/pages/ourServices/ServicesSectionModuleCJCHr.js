import React from 'react';
import { Link } from 'react-router-dom';
import ServicesFeatureCards from './ServicesFeatureCards';

/** Figma node 80:1882 — Corporate / Enterprise section icons. */
const imgGlobeHemisphereEast = '/img/services-icons/globe-hemisphere-east.svg';
const imgPlugs = '/img/CJCHr/plugs.svg';
const imgClipboardText = '/img/services-icons/clipboard-text.svg';
const imgWarning = '/img/services-icons/warning.svg';
const imgBuildingOffice = '/img/CJCHr/buildingoffice.svg';
const imgPuzzlePiece = '/img/services-icons/puzzle-piece.svg';

const FEATURE_ROWS = [
    {
        nodeId: '80:1893',
        textWrapNodeId: '80:1896',
        textTopPx: 10.34,
        iconNodeId: '152:556',
        iconSrc: imgGlobeHemisphereEast,
        titleNodeId: '80:1898',
        title: 'Multi-market analytics dashboard',
        bodyNodeId: '80:1899',
        body: 'Track demand, pricing trends and portfolio performance.',
        withBorder: true,
    },
    {
        nodeId: '80:1900',
        textWrapNodeId: '80:1903',
        textTopPx: 10.36,
        iconNodeId: '152:562',
        iconSrc: imgPlugs,
        titleNodeId: '80:1905',
        title: 'Custom API data feeds',
        bodyNodeId: '80:1906',
        body: 'Live transactional data, municipal records and demand signals.',
        withBorder: true,
    },
    {
        nodeId: '80:1907',
        textWrapNodeId: '80:1910',
        textTopPx: 10.38,
        iconNodeId: '152:575',
        iconSrc: imgClipboardText,
        titleNodeId: '80:1912',
        title: 'Institutional reporting',
        bodyNodeId: '80:1913',
        body: 'Automated portfolio reports, risk assessments and acquisition.',
        withBorder: true,
    },
    {
        nodeId: '80:1914',
        textWrapNodeId: '80:1917',
        textTopPx: 10.4,
        iconNodeId: '152:582',
        iconSrc: imgWarning,
        titleNodeId: '80:1919',
        title: 'Risk assessment & compliance',
        bodyNodeId: '80:1920',
        body: 'ESG scoring, volatility alerts and regulatory compliance tracking.',
        withBorder: true,
    },
    {
        nodeId: '80:1921',
        textWrapNodeId: '80:1924',
        textTopPx: 10.42,
        iconNodeId: '152:588',
        iconSrc: imgBuildingOffice,
        titleNodeId: '80:1926',
        title: 'Acquisition advisory',
        bodyNodeId: '80:1927',
        body: 'Guidance and data modelling for large-scale property acquisitions.',
        withBorder: false,
    },
];

const ENTERPRISE_FEATURE_CARDS = FEATURE_ROWS.map((row) => ({
    nodeId: row.nodeId,
    iconSrc: row.iconSrc,
    title: row.title,
    description: row.body,
    isLast: !row.withBorder,
}));

const TAG_PILLS = [
    { nodeId: '80:1934', label: '7 markets live', emphasized: true },
    { nodeId: '80:1936', label: 'Custom API', emphasized: false },
    { nodeId: '80:1938', label: 'Institutional reports', emphasized: false },
    { nodeId: '80:1940', label: 'Risk assessment', emphasized: false },
    { nodeId: '80:1942', label: 'White-label', emphasized: false },
];

/** Figma 80:1984–80:2011 — bar track 304×6px, fill width = score/10 of track (see Overlay 80:1987 + Gradient 80:1988). */
const MARKET_ROWS = [
    { nodeId: '80:1984', barNodeId: '80:1987', fillNodeId: '80:1988', labelNodeId: '80:1986', scoreNodeId: '80:1990', label: 'Dubai, UAE', score: '9.4' },
    { nodeId: '80:1991', barNodeId: '80:1994', fillNodeId: '80:1995', labelNodeId: '80:1993', scoreNodeId: '80:1997', label: 'South Africa', score: '8.8' },
    { nodeId: '80:1998', barNodeId: '80:2001', fillNodeId: '80:2002', labelNodeId: '80:2000', scoreNodeId: '80:2004', label: 'Netherlands', score: '8.2' },
    { nodeId: '80:2005', barNodeId: '80:2008', fillNodeId: '80:2009', labelNodeId: '80:2007', scoreNodeId: '80:2011', label: 'United States', score: '7.9' },
];

function FeatureList() {
    return (
        <div data-node-id="80:1892" className="flex w-full flex-col items-start">
            {FEATURE_ROWS.map((row) => (
                <div
                    key={row.nodeId}
                    data-node-id={row.nodeId}
                    className={`relative w-full shrink-0 ${
                        row.withBorder ? 'h-[64.98px] border-b border-solid border-[rgba(255,255,255,0.06)]' : 'h-[63.98px]'
                    }`}
                >
                    <div data-node-id={row.iconNodeId} className="absolute left-0 top-[11px] size-6">
                        <img alt="" className="pointer-events-none block size-full max-w-none" src={row.iconSrc} />
                    </div>
                    <div
                        data-node-id={row.textWrapNodeId}
                        style={{ top: `${row.textTopPx}px` }}
                        className="absolute left-[45px] flex w-[min(100%,639px)] flex-col items-start gap-px"
                    >
                        <div className="flex w-full flex-col items-start pb-[0.8px]">
                            <p
                                data-node-id={row.titleNodeId}
                                className="m-0 font-['Poppins',sans-serif] text-base font-semibold not-italic leading-normal text-[#060606]"
                            >
                                {row.title}
                            </p>
                        </div>
                        <p
                            data-node-id={row.bodyNodeId}
                            className="m-0 font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                        >
                            {row.body}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TagPillsFlow() {
    return (
        <div data-node-id="80:1933" className="mt-3 flex w-full flex-wrap items-start gap-x-[7px] gap-y-2">
            {TAG_PILLS.map((p) => (
                <div
                    key={p.nodeId}
                    data-node-id={p.nodeId}
                    className={`inline-flex flex-col items-start rounded-[100px] border border-solid border-[#e1e1e1] px-3 pb-[5.59px] pt-1 ${
                        p.emphasized ? 'bg-white' : 'bg-[rgba(255,255,255,0.06)]'
                    }`}
                >
                    <p className="m-0 whitespace-nowrap font-['Jost',sans-serif] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]">
                        {p.label}
                    </p>
                </div>
            ))}
        </div>
    );
}

function TagPillsFigma() {
    return (
        <div data-node-id="80:1933" className="relative h-[27.59px] w-full">
            {TAG_PILLS.map((p, i) => {
                const left = i === 0 ? 0 : i === 1 ? 98 : i === 2 ? 186 : i === 3 ? 310 : 418;
                return (
                    <div
                        key={p.nodeId}
                        data-node-id={p.nodeId}
                        style={{ left: `${left}px` }}
                        className={`absolute top-0 inline-flex flex-col items-start rounded-[100px] border border-solid border-[#e1e1e1] px-3 pb-[5.59px] pt-1 ${
                            p.emphasized ? 'bg-white' : 'bg-[rgba(255,255,255,0.06)]'
                        }`}
                    >
                        <p className="m-0 whitespace-nowrap font-['Jost',sans-serif] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]">
                            {p.label}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

function EnterpriseAnalyticsMockup() {
    return (
        <div
            data-name="Enterprise analytics mockup"
            data-node-id="80:1944"
            className="relative flex w-full max-w-[512px] shrink-0 flex-col items-start overflow-clip rounded-[18px] border border-solid border-ipm-light-grey bg-ipm-light-grey/40 p-px shadow-[0px_20px_64px_0px_rgba(28,23,16,0.14),0px_6px_20px_0px_rgba(28,23,16,0.08)] lg:mx-0 lg:max-w-none"
        >
            <div
                data-node-id="80:1945"
                className="relative h-10 w-full shrink-0 border-b border-solid border-ipm-light-grey bg-ipm-light-grey"
            >
                <div className="flex size-full items-center gap-[7px] px-[14px] pb-px">
                    <div data-node-id="80:1946" className="size-2 shrink-0 rounded bg-[#ff5f57]" />
                    <div data-node-id="80:1947" className="size-2 shrink-0 rounded bg-[#ffc801]" />
                    <div data-node-id="80:1948" className="size-2 shrink-0 rounded bg-[#28c840]" />
                    <div data-node-id="80:1949" className="relative min-w-0 shrink-0" style={{ width: '294.809px' }}>
                        <div className="flex flex-col items-center px-[66.404px]">
                            <p
                                data-node-id="80:1951"
                                className="m-0 whitespace-nowrap font-['Jost',sans-serif] text-[10px] font-normal leading-4 text-[#78736d]"
                            >
                                enterprise.ipm.com/portfolio/analytics
                            </p>
                        </div>
                    </div>
                    <div className="ml-auto flex min-w-0 shrink-0 justify-end" style={{ width: '135.189px' }}>
                        <div
                            data-node-id="80:1953"
                            className="inline-flex flex-col items-center justify-center rounded border border-solid border-[#c2c3c3] bg-[rgba(96,165,250,0.12)] px-2 pb-[3.39px] pt-0.5"
                        >
                            <p
                                data-node-id="80:1954"
                                className="m-0 whitespace-nowrap font-['Jost',sans-serif] text-[9px] font-bold leading-[14.4px] text-[#10575c]"
                            >
                                ENTERPRISE
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div data-node-id="80:1955" className="relative w-full shrink-0 bg-[#f4f4f4]">
                <div className="flex w-full flex-col items-start gap-4 p-6">
                    <div data-node-id="80:1956" className="flex w-full max-w-[474px] items-center justify-between">
                        <div data-node-id="80:1957" className="flex w-[204px] shrink-0 flex-col gap-[3px] items-start">
                            <div data-node-id="80:1958" className="flex w-full flex-col items-start">
                                <p
                                    data-node-id="80:1959"
                                    className="m-0 font-['Poppins',sans-serif] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.7px] text-[#060606]"
                                >
                                    Global Portfolio Overview — Q4 2025
                                </p>
                            </div>
                            <div data-node-id="80:1960" className="flex w-full flex-col items-start">
                                <p
                                    data-node-id="80:1961"
                                    className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-sm font-semibold not-italic leading-[22.4px] text-[#060606]"
                                >
                                    Enterprise Analytics
                                </p>
                            </div>
                        </div>
                        <div data-node-id="80:1962" className="flex shrink-0 items-center gap-1.5">
                            <div data-node-id="80:1963" className="size-1.5 shrink-0 rounded-[3px] bg-[#ffc801]" />
                            <p
                                data-node-id="80:1965"
                                className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-[10px] font-normal leading-4 text-[#060606]"
                            >
                                7 markets live
                            </p>
                        </div>
                    </div>

                    <div
                        data-node-id="80:1966"
                        className="flex h-[55.39px] w-full items-center gap-2 shadow-[1px_3px_3px_rgba(0,0,0,0.1)]"
                    >
                        {[
                            { node: '80:1967', val: '80:1969', lab: '80:1971', v: 'R 4.2B', l: 'Portfolio value' },
                            { node: '80:1972', val: '80:1974', lab: '80:1976', v: '+12.4%', l: 'YoY growth' },
                            { node: '80:1977', val: '80:1979', lab: '80:1981', v: '340', l: 'Under mgmt' },
                        ].map((c) => (
                            <div
                                key={c.node}
                                data-node-id={c.node}
                                className="flex min-h-px min-w-px flex-1 flex-col items-start gap-0.5 rounded-[10px] border border-solid border-[rgba(255,255,255,0.07)] bg-white p-[11px]"
                            >
                                <p
                                    data-node-id={c.val}
                                    className="m-0 w-full font-['Playfair_Display',serif] text-base font-normal leading-4 text-[#10575c]"
                                >
                                    {c.v}
                                </p>
                                <p
                                    data-node-id={c.lab}
                                    className="m-0 w-full font-['Poppins',sans-serif] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.5px] text-[#c2c3c3]"
                                >
                                    {c.l}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div data-node-id="80:1982" className="flex w-full max-w-[474px] flex-col items-start">
                        <p
                            data-node-id="80:1983"
                            className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.7px] text-[#060606]"
                        >
                            Market Demand Index — By Region
                        </p>
                    </div>

                    <div className="flex w-full max-w-[462px] flex-col gap-4">
                        {MARKET_ROWS.map((r) => {
                            const fillPct = Math.round(parseFloat(r.score) * 10);
                            return (
                                <div
                                    key={r.nodeId}
                                    data-node-id={r.nodeId}
                                    className="flex w-full items-center gap-[10px]"
                                >
                                    <div className="flex w-[110px] shrink-0 flex-col items-start pb-[0.59px]">
                                        <p
                                            data-node-id={r.labelNodeId}
                                            className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-[11px] font-normal leading-[17.6px] text-[#10575c]"
                                        >
                                            {r.label}
                                        </p>
                                    </div>
                                    <div
                                        data-node-id={r.barNodeId}
                                        className="relative h-[6px] min-h-[6px] min-w-[120px] flex-1 overflow-hidden rounded-[100px] bg-white shadow-[inset_0_0_0_1px_rgba(6,6,6,0.06)]"
                                    >
                                        <div
                                            data-node-id={r.fillNodeId}
                                            className="absolute left-0 top-0 h-full rounded-[100px]"
                                            style={{
                                                width: `${Number.isFinite(fillPct) ? fillPct : 0}%`,
                                                background: 'linear-gradient(90deg, #10575c 0%, #ffc801 100%)',
                                            }}
                                        />
                                    </div>
                                    <div className="flex w-[28px] shrink-0 flex-col items-end pb-[0.59px]">
                                        <p
                                            data-node-id={r.scoreNodeId}
                                            className="m-0 whitespace-nowrap text-right font-['Poppins',sans-serif] text-[11px] font-bold not-italic leading-[17.6px] text-[#10575c]"
                                        >
                                            {r.score}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div
                        data-node-id="80:2012"
                        className="flex w-full max-w-[474px] shrink-0 flex-col gap-0.5 rounded-[10px] bg-[#c2c3c3] px-[14px] pb-2.5 pt-[9px]"
                    >
                        <div data-node-id="80:2013" className="relative w-full">
                            <div className="flex w-full items-start">
                                <div data-node-id="371:116" className="relative size-4 shrink-0">
                                    <img alt="" className="pointer-events-none block size-full max-w-none" src={imgPuzzlePiece} />
                                </div>
                                <p
                                    data-node-id="80:2014"
                                    className="m-0 font-['Jost',sans-serif] text-[9.5px] font-bold leading-[15.2px] text-[#10575c]"
                                >
                                    Custom API Data Feed Active
                                </p>
                            </div>
                        </div>
                        <div data-node-id="80:2015" className="relative w-full">
                            <p
                                data-node-id="80:2016"
                                className="m-0 w-full font-['Jost',sans-serif] text-[9.5px] font-normal leading-[15.2px] text-[#10575c]"
                            >
                                Live data flowing to 3 connected systems · GDPR compliant
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ServicesSectionModuleCJCHr() {
    return (
        <section
            id="services-section-enterprise"
            className="w-full bg-white"
            aria-labelledby="services-corporate-module-heading"
            data-name="Section - MODULE 5: CORPORATE / ENTERPRISE"
            data-node-id="80:1882"
            data-anima="services-CJCHr-section-module"
        >
            <h2 id="services-corporate-module-heading" className="sr-only">
                Enterprise portfolio analytics and corporate tools
            </h2>
            <div
                data-node-id="80:1883"
                className="mx-auto grid w-full max-w-[1248px] grid-cols-1 gap-x-[72px] gap-y-[72px] px-[clamp(16px,5vw,52px)] py-[100px] lg:grid-cols-2 lg:items-center"
            >
                <div
                    data-node-id="80:1884"
                    className="relative w-full min-h-0 justify-self-stretch lg:h-[720px] lg:min-h-[720px]"
                >
                    <div className="flex flex-col gap-8 lg:hidden">
                        <div data-node-id="80:1885" className="flex items-center gap-0">
                            <p
                                data-node-id="80:1887"
                                className="m-0 font-['Jost',sans-serif] text-[10px] font-semibold uppercase leading-4 tracking-[2px] text-[#c2c3c3]"
                            >
                                Corporate
                            </p>
                        </div>
                        <div data-node-id="80:1888" className="text-[0px]">
                            <p className="m-0 mb-0 font-['Poppins',sans-serif] text-[clamp(2rem,6vw,50px)] font-extralight not-italic leading-[47px] text-[#060606]">
                                Portfolio intelligence
                            </p>
                            <p className="m-0 font-['Playfair_Display',serif] text-[clamp(2rem,6vw,50px)] font-normal italic leading-[47px] text-[#060606]">
                                at institutional scale.
                            </p>
                        </div>
                        <p
                            data-node-id="80:1891"
                            className="m-0 font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                        >
                            Multi-market analytics, institutional reporting, and custom data feeds for agency enterprises and
                            investment organisations.
                        </p>
                        <ServicesFeatureCards dataNodeId="80:1892-cards-mobile" items={ENTERPRISE_FEATURE_CARDS} />
                        <div data-node-id="80:1928" className="mt-10 flex min-h-[51.59px] flex-wrap items-start gap-3">
                            <a
                                data-node-id="80:1929"
                                href="#home-section-contact"
                                className="inline-flex items-stretch rounded-2xl bg-[#10575c] px-[26px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1930"
                                    className="font-['Poppins',sans-serif] text-base font-semibold leading-normal text-white"
                                    style={{ fontVariationSettings: "'CTGR' 0, 'wdth' 100, 'wght' 700" }}
                                >
                                    Talk to the Team →
                                </span>
                            </a>
                            <Link
                                data-node-id="80:1931"
                                to="/pricing"
                                className="inline-flex items-stretch rounded-2xl border border-solid border-[#e1e1e1] px-[21px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1932"
                                    className="whitespace-pre font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#c2c3c3]"
                                >
                                    {'View  Pricing'}
                                </span>
                            </Link>
                        </div>
                        <TagPillsFlow />
                    </div>

                    <div className="hidden lg:contents">
                        <div data-node-id="80:1885" className="absolute left-0 top-[-0.5px] flex items-center gap-0">
                            <p
                                data-node-id="80:1887"
                                className="m-0 font-['Jost',sans-serif] text-[10px] font-semibold uppercase leading-4 tracking-[2px] text-[#c2c3c3]"
                            >
                                Corporate
                            </p>
                        </div>
                        <div data-node-id="80:1888" className="absolute left-0 right-0 top-9 flex flex-col items-start">
                            <div data-node-id="80:1889" className="text-[0px]">
                                <p className="m-0 mb-0 font-['Poppins',sans-serif] text-[50px] font-extralight not-italic leading-[47px] text-[#060606]">
                                    Portfolio intelligence
                                </p>
                                <p className="m-0 font-['Playfair_Display',serif] text-[50px] font-normal italic leading-[47px] text-[#060606]">
                                    at institutional scale.
                                </p>
                            </div>
                        </div>
                        <div data-node-id="80:1890" className="absolute left-0 right-0 top-[148.04px] flex flex-col items-start pb-[0.625px]">
                            <p
                                data-node-id="80:1891"
                                className="m-0 max-w-[564px] font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                            >
                                Multi-market analytics, institutional reporting, and custom data feeds for agency enterprises and
                                investment organisations.
                            </p>
                        </div>
                        <div
                            data-node-id="80:1892"
                            className="absolute left-0 right-0 top-[227.66px] flex w-full flex-col items-start"
                        >
                            <ServicesFeatureCards dataNodeId="80:1892-cards-desktop" items={ENTERPRISE_FEATURE_CARDS} />
                        </div>
                        <div
                            data-node-id="80:1928"
                            className="absolute left-0 right-0 top-[614px] flex h-[51.59px] flex-wrap items-start gap-3"
                        >
                            <a
                                data-node-id="80:1929"
                                href="#home-section-contact"
                                className="inline-flex items-stretch rounded-2xl bg-[#10575c] px-[26px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1930"
                                    className="font-['Poppins',sans-serif] text-base font-semibold leading-normal text-white"
                                    style={{ fontVariationSettings: "'CTGR' 0, 'wdth' 100, 'wght' 700" }}
                                >
                                    Talk to the Team →
                                </span>
                            </a>
                            <Link
                                data-node-id="80:1931"
                                to="/pricing"
                                className="inline-flex items-stretch rounded-2xl border border-solid border-[#e1e1e1] px-[21px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1932"
                                    className="whitespace-pre font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#c2c3c3]"
                                >
                                    {'View  Pricing'}
                                </span>
                            </Link>
                        </div>
                        <div className="absolute left-0 right-0 top-[688px]">
                            <TagPillsFigma />
                        </div>
                    </div>
                </div>

                <div className="flex w-full justify-center lg:min-h-[440.75px] lg:justify-end lg:self-center">
                    <EnterpriseAnalyticsMockup />
                </div>
            </div>
        </section>
    );
}
