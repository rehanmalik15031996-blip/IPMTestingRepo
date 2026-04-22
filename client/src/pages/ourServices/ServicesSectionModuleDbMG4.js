import React from 'react';
import { Link } from 'react-router-dom';
import ServicesFeatureCards from './ServicesFeatureCards';

/** Figma node 80:1763 — Partner section icons. */
const imgFileText = '/img/partnerSection/file-text.svg';
const imgBank = '/img/partnerSection/bank.svg';
const imgFiles = '/img/partnerSection/files.svg';
const imgPlug = '/img/partnerSection/plug.svg';
const imgBellRinging = '/img/partnerSection/bell-ringing.svg';
const imgCheckCircle = '/img/partnerSection/check-circle.svg';
const imgShareNetwork = '/img/partnerSection/share-network.svg';
const imgPalette = '/img/partnerSection/palette.svg';
const imgPlugList = '/img/partnerSection/plug-feature.svg';
const imgEye = '/img/partnerSection/eye.svg';
const imgLock = '/img/partnerSection/lock.svg';

const TAG_PILLS = [
    { nodeId: '80:1870', label: 'Deal workspaces', left: 0, top: 0, bottom: '34.6px' },
    { nodeId: '80:1872', label: 'White-label', left: 112.2, top: 0, bottom: '34.6px' },
    { nodeId: '80:1874', label: '48h go-live', left: 197.98, top: 0, bottom: '34.6px' },
    { nodeId: '80:1876', label: 'API + widgets', left: 283.2, top: 0, bottom: '34.6px' },
    { nodeId: '80:1878', label: 'Category exclusive', left: 382.09, top: 0, bottom: '34.6px' },
    { nodeId: '80:1880', label: 'Partner dashboard', left: 0, top: 34.59, bottom: '0.01px' },
];

const PARTNER_FEATURE_CARDS = [
    {
        nodeId: '80:1830',
        iconSrc: imgShareNetwork,
        title: 'Transaction collaboration workspaces',
        description: 'Participate directly in property deals through shared workflows.',
    },
    {
        nodeId: '80:1837',
        iconSrc: imgPalette,
        title: 'Full white-label capability',
        description: 'Your logo, your domain, your client experience.',
    },
    {
        nodeId: '80:1844',
        iconSrc: imgPlugList,
        title: 'Plug-and-play API — live in 48 hours',
        description: 'Drop-in widgets and REST API.',
    },
    {
        nodeId: '80:1850',
        iconSrc: imgEye,
        title: 'Strategic partner visibility',
        description: 'Connect with agents, buyers and investors at key moments.',
    },
    {
        nodeId: '80:1857',
        iconSrc: imgLock,
        title: 'Category exclusivity options',
        description: 'Become the only provider shown in your category and region.',
        isLast: true,
    },
];

function TagPillsFlow() {
    return (
        <div data-node-id="80:1869" className="flex w-full flex-wrap items-start gap-x-[6.2px] gap-y-2">
            {TAG_PILLS.map((p) => (
                <div
                    key={p.nodeId}
                    data-node-id={p.nodeId}
                    className="inline-flex flex-col items-start rounded-[100px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1"
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
        <div data-node-id="80:1869" className="relative h-[62.19px] w-full">
            {TAG_PILLS.map((p) => (
                <div
                    key={p.nodeId}
                    data-node-id={p.nodeId}
                    style={{ left: `${p.left}px`, top: `${p.top}px`, bottom: p.bottom }}
                    className="absolute inline-flex flex-col items-start rounded-[100px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1"
                >
                    <p className="m-0 whitespace-nowrap font-['Jost',sans-serif] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]">
                        {p.label}
                    </p>
                </div>
            ))}
        </div>
    );
}

function PartnerWorkspaceMockup() {
    return (
        <div
            data-name="Partner API + Workspace mockup"
            data-node-id="80:1765"
            className="flex w-full max-w-[512px] shrink-0 flex-col items-start overflow-clip rounded-[18px] border border-solid border-ipm-light-grey bg-[#f4f4f4] shadow-[0px_6px_20px_rgba(28,23,16,0.08),0px_20px_64px_rgba(28,23,16,0.14)] lg:mx-0 lg:max-w-none"
        >
            <div
                data-node-id="80:1766"
                className="flex h-10 w-full shrink-0 items-center gap-[7px] border-b border-solid border-ipm-grey/25 bg-ipm-light-grey px-[14px] pb-px"
            >
                <div data-node-id="80:1767" className="size-2 shrink-0 rounded bg-[#ff5f57]" />
                <div data-node-id="80:1768" className="size-2 shrink-0 rounded bg-[#ffc801]" />
                <div data-node-id="80:1769" className="size-2 shrink-0 rounded bg-[#28c840]" />
                <div data-node-id="80:1770" className="flex min-h-px min-w-0 flex-1 justify-center px-[156.297px]">
                    <p
                        data-node-id="80:1772"
                        className="m-0 truncate whitespace-nowrap [font-family:'Jost',Helvetica] text-[10px] font-normal leading-4 text-ipm-grey"
                    >
                        partners.ipm.com/dashboard
                    </p>
                </div>
            </div>
            <div data-node-id="80:1773" className="relative w-full shrink-0 px-[18px] pb-[17px] pt-[17px]">
                <div data-node-id="80:1774" className="flex flex-col items-start">
                    <p
                        data-node-id="80:1775"
                        className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.7px] text-ipm-green"
                    >
                        Partner Dashboard — BondFirst Finance
                    </p>
                </div>

                <div
                    data-node-id="80:1776"
                    className="mt-[10.39px] grid h-[56.39px] w-full grid-cols-3 gap-2"
                >
                    <div
                        data-node-id="80:1777"
                        className="flex flex-col items-start gap-0.5 rounded-[10px] bg-ipm-light-grey p-[10px] shadow-[1px_3px_3px_rgba(0,0,0,0.1)]"
                    >
                        <p
                            data-node-id="80:1779"
                            className="m-0 w-full [font-family:'Playfair_Display',serif] text-[17px] font-normal leading-[17px] text-ipm-green"
                        >
                            421
                        </p>
                        <p
                            data-node-id="80:1781"
                            className="m-0 w-full [font-family:'Jost',Helvetica] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.5px] text-ipm-grey"
                        >
                            Leads sent
                        </p>
                    </div>
                    <div
                        data-node-id="80:1782"
                        className="flex flex-col items-start gap-0.5 rounded-[10px] bg-ipm-light-grey p-[10px] shadow-[1px_3px_3px_rgba(0,0,0,0.1)]"
                    >
                        <p
                            data-node-id="80:1784"
                            className="m-0 w-full [font-family:'Playfair_Display',serif] text-[17px] font-normal leading-[17px] text-ipm-green"
                        >
                            84%
                        </p>
                        <p
                            data-node-id="80:1786"
                            className="m-0 w-full [font-family:'Jost',Helvetica] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.5px] text-ipm-grey"
                        >
                            Pre-qual rate
                        </p>
                    </div>
                    <div
                        data-node-id="80:1787"
                        className="flex flex-col items-start gap-0.5 rounded-[10px] bg-ipm-light-grey px-[10px] pb-3 pt-[10px] shadow-[1px_3px_3px_rgba(0,0,0,0.1)]"
                    >
                        <p
                            data-node-id="80:1789"
                            className="m-0 w-full [font-family:'Playfair_Display',serif] text-[15px] font-normal leading-[15px] text-ipm-green"
                        >
                            R 127M
                        </p>
                        <p
                            data-node-id="80:1791"
                            className="m-0 w-full [font-family:'Jost',Helvetica] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.5px] text-ipm-grey"
                        >
                            Bond value
                        </p>
                    </div>
                </div>

                <div data-node-id="80:1792" className="mt-2.5 flex flex-col items-start pt-px">
                    <p
                        data-node-id="80:1793"
                        className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.7px] text-ipm-green"
                    >
                        Deal Workspace — Constantia Heights
                    </p>
                </div>

                <div
                    data-node-id="80:1794"
                    className="mt-[8.39px] flex w-full flex-col items-center gap-[3px] rounded-xl bg-white px-4 py-[14px]"
                >
                    <div
                        data-node-id="80:1795"
                        className="flex w-full items-center justify-between border-0 border-b border-solid border-ipm-grey pb-[7px] pt-[6px]"
                    >
                        <div data-node-id="80:1796" className="flex items-start" data-name="Frame 14">
                            <div data-node-id="371:39" className="relative size-4 shrink-0">
                                <img alt="" className="pointer-events-none block size-full max-w-none" src={imgFileText} />
                            </div>
                            <p
                                data-node-id="80:1797"
                                className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-xs font-normal not-italic leading-[19.2px] text-ipm-black"
                            >
                                {' Sale Agreement'}
                            </p>
                        </div>
                        <div
                            data-node-id="80:1798"
                            className="rounded bg-ipm-green/10 px-[9px] pb-[3.39px] pt-0.5"
                        >
                            <p
                                data-node-id="80:1799"
                                className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[9px] font-bold leading-[14.4px] text-ipm-green"
                            >
                                Signed
                            </p>
                        </div>
                    </div>
                    <div
                        data-node-id="80:1800"
                        className="flex w-full items-start justify-between border-0 border-b border-solid border-ipm-grey pb-[7px] pt-[6px]"
                    >
                        <div data-node-id="80:1801" className="flex items-center">
                            <div data-node-id="371:47" className="relative size-4 shrink-0">
                                <img alt="" className="pointer-events-none block size-full max-w-none" src={imgBank} />
                            </div>
                            <p
                                data-node-id="80:1802"
                                className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-xs font-normal not-italic leading-[19.2px] text-ipm-black"
                            >
                                {' Bond Application'}
                            </p>
                        </div>
                        <div
                            data-node-id="80:1803"
                            className="rounded bg-ipm-yellow/20 px-[9px] pb-[3.39px] pt-0.5"
                        >
                            <p
                                data-node-id="80:1804"
                                className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[9px] font-bold leading-[14.4px] text-ipm-orange"
                            >
                                In Review
                            </p>
                        </div>
                    </div>
                    <div
                        data-node-id="80:1805"
                        className="flex w-full items-center justify-between border-0 border-b border-solid border-ipm-grey pb-[7px] pt-[6px]"
                    >
                        <div data-node-id="80:1806" className="flex items-center">
                            <div data-node-id="371:57" className="relative size-4 shrink-0">
                                <img alt="" className="pointer-events-none block size-full max-w-none" src={imgFiles} />
                            </div>
                            <p
                                data-node-id="80:1807"
                                className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-xs font-normal not-italic leading-[19.2px] text-ipm-black"
                            >
                                {' Transfer Docs'}
                            </p>
                        </div>
                        <div
                            data-node-id="80:1808"
                            className="rounded bg-ipm-light-grey/60 px-[9px] pb-[3.39px] pt-0.5"
                        >
                            <p
                                data-node-id="80:1809"
                                className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[9px] font-bold leading-[14.4px] text-ipm-grey"
                            >
                                Draft
                            </p>
                        </div>
                    </div>
                    <div
                        data-node-id="80:1810"
                        className="flex w-full flex-col items-start rounded-lg bg-ipm-green/10 px-3 py-2"
                    >
                        <p
                            data-node-id="80:1811"
                            className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[11px] font-normal leading-[17.6px] text-ipm-green"
                            style={{ fontVariationSettings: "'CTGR' 0, 'wdth' 100, 'wght' 400" }}
                        >
                            ✓ All 5 parties connected · No email chains
                        </p>
                    </div>
                </div>

                <div data-node-id="80:1812" className="mt-[10.6px] flex items-start gap-1">
                    <div data-node-id="371:92" className="relative size-4 shrink-0">
                        <img alt="" className="pointer-events-none block size-full max-w-none" src={imgPlug} />
                    </div>
                    <p
                        data-node-id="80:1813"
                        className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.7px] text-ipm-grey"
                    >
                        {' Plug-and-Play Widget — Live in 48h'}
                    </p>
                </div>

                <div
                    data-node-id="80:1814"
                    className="mt-[7.39px] rounded-[10px] border border-solid border-white/15 bg-ipm-green px-[17px] py-[15px]"
                >
                    <div data-node-id="80:1815" className="text-[0px] whitespace-pre-wrap">
                        <p className="m-0 mb-0 [font-family:'Poppins',Helvetica] text-[11px] font-normal leading-[19.8px] text-ipm-light-grey/50">
                            {'// Drop into any listing page'}
                        </p>
                        <p className="m-0 mb-0 [font-family:'Poppins',Helvetica] text-[11px] leading-[19.8px]">
                            <span className="text-ipm-light-grey">{`<script`}</span>
                            <span className="text-white/25"> </span>
                            <span className="text-ipm-yellow">src</span>
                            <span className="text-ipm-light-grey">=</span>
                            <span className="text-ipm-orange">&quot;cdn.ipm.com/bond-widget.js&quot;</span>
                            <span className="text-ipm-light-grey">{`></script>`}</span>
                        </p>
                        <p className="m-0 mb-0 [font-family:'Poppins',Helvetica] text-[11px] leading-[19.8px] text-ipm-light-grey">
                            {`<ipm-bond-widget`}
                        </p>
                        <p className="m-0 mb-0 [font-family:'Poppins',Helvetica] text-[11px] leading-[19.8px]">
                            <span className="text-white/25">{'\u00a0\u00a0'}</span>
                            <span className="text-ipm-yellow">partner-id</span>
                            <span className="text-ipm-light-grey">=</span>
                            <span className="text-ipm-orange">&quot;BF-42819&quot;</span>
                        </p>
                        <p className="m-0 mb-0 [font-family:'Poppins',Helvetica] text-[11px] leading-[19.8px]">
                            <span className="text-white/25">{'\u00a0\u00a0'}</span>
                            <span className="text-ipm-yellow">listing-id</span>
                            <span className="text-ipm-light-grey">=</span>
                            <span className="text-ipm-orange">&quot;{'{{listing.id}}'}&quot;</span>
                        </p>
                        <p className="m-0 [font-family:'Poppins',Helvetica] text-[11px] leading-[19.8px] text-ipm-light-grey">
                            {`></ipm-bond-widget>`}
                        </p>
                    </div>
                </div>

                <div data-node-id="80:1816" className="mt-[11.78px] flex h-[39px] w-full items-start justify-center gap-2">
                    <div
                        data-node-id="80:1817"
                        className="flex min-h-px min-w-0 flex-1 items-start gap-1 rounded-[9px] border border-solid border-ipm-green/20 bg-ipm-green/10 px-[13px] py-[10px]"
                    >
                        <div data-node-id="371:100" className="relative size-4 shrink-0">
                            <img alt="" className="pointer-events-none block size-full max-w-none" src={imgBellRinging} />
                        </div>
                        <p
                            data-node-id="80:1818"
                            className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[11.5px] font-semibold not-italic leading-[18.4px] text-ipm-green"
                        >
                            {' 12 new leads today'}
                        </p>
                    </div>
                    <div
                        data-node-id="80:1819"
                        className="flex min-h-px min-w-0 flex-1 items-start rounded-[9px] border border-solid border-ipm-orange/30 bg-ipm-yellow/20 px-[13px] py-[10px]"
                    >
                        <div data-node-id="371:107" className="relative size-4 shrink-0">
                            <img alt="" className="pointer-events-none block size-full max-w-none" src={imgCheckCircle} />
                        </div>
                        <p
                            data-node-id="80:1820"
                            className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[11.5px] font-semibold not-italic leading-[18.4px] text-ipm-orange"
                        >
                            {' 3 approvals pending'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureList() {
    return (
        <div data-node-id="80:1829" className="flex w-full flex-col items-start">
            <div data-node-id="80:1830" className="relative h-[64.98px] w-full shrink-0">
                <div data-node-id="152:455" className="absolute left-0 top-[11px] size-6">
                    <img alt="" className="pointer-events-none block size-full max-w-none" src={imgShareNetwork} />
                </div>
                <div data-node-id="80:1833" className="absolute left-[45px] top-2.5 flex flex-col items-start gap-px">
                    <div data-node-id="80:1834" className="flex w-full flex-col items-start pb-[0.8px]">
                        <p
                            data-node-id="80:1835"
                            className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-base font-semibold not-italic leading-normal text-[#060606]"
                        >
                            Transaction collaboration workspaces
                        </p>
                    </div>
                    <p
                        data-node-id="80:1836"
                        className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                    >
                        Participate directly in property deals through shared workflows.
                    </p>
                </div>
            </div>
            <div data-node-id="80:1837" className="relative h-[64.98px] w-full shrink-0">
                <div data-node-id="152:463" className="absolute left-0 top-[11px] size-6">
                    <img alt="" className="pointer-events-none block size-full max-w-none" src={imgPalette} />
                </div>
                <div data-node-id="80:1840" className="absolute left-[45px] top-2.5 flex flex-col items-start gap-px">
                    <div data-node-id="80:1841" className="flex w-full flex-col items-start pb-[0.8px]">
                        <p
                            data-node-id="80:1842"
                            className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-base font-semibold not-italic leading-normal text-[#060606]"
                        >
                            Full white-label capability
                        </p>
                    </div>
                    <p
                        data-node-id="80:1843"
                        className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                    >
                        Your logo, your domain, your client experience .
                    </p>
                </div>
            </div>
            <div
                data-node-id="80:1844"
                className="relative flex w-full shrink-0 items-start gap-[13px] pb-3 pt-[11px]"
            >
                <div data-node-id="152:471" className="relative size-6 shrink-0">
                    <img alt="" className="pointer-events-none block size-full max-w-none" src={imgPlugList} />
                </div>
                <div data-node-id="80:1847" className="flex flex-col gap-[0.995px] pr-[38.56px] text-base not-italic leading-normal text-[#060606]">
                    <p data-node-id="80:1848" className="m-0 font-['Poppins',sans-serif] font-semibold">
                        Plug-and-play API — live in 48 hours
                    </p>
                    <p data-node-id="80:1849" className="m-0 font-['Poppins',sans-serif] font-light">
                        {'Drop-in widgets and REST API. '}
                    </p>
                </div>
            </div>
            <div data-node-id="80:1850" className="relative h-[64.98px] w-full shrink-0">
                <div data-node-id="152:479" className="absolute left-0 top-[11px] size-6">
                    <img alt="" className="pointer-events-none block size-full max-w-none" src={imgEye} />
                </div>
                <div data-node-id="80:1853" className="absolute left-[45px] top-2.5 flex flex-col items-start gap-px">
                    <div data-node-id="80:1854" className="flex w-full flex-col items-start pb-[0.8px]">
                        <p
                            data-node-id="80:1855"
                            className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-base font-semibold not-italic leading-normal text-[#060606]"
                        >
                            Strategic partner visibility
                        </p>
                    </div>
                    <p
                        data-node-id="80:1856"
                        className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                    >
                        Connect with agents, buyers and investors at key moments.
                    </p>
                </div>
            </div>
            <div data-node-id="80:1857" className="relative h-[63.98px] w-full shrink-0">
                <div data-node-id="152:484" className="absolute left-0 top-[11px] size-6">
                    <img alt="" className="pointer-events-none block size-full max-w-none" src={imgLock} />
                </div>
                <div data-node-id="80:1860" className="absolute left-[45px] top-2.5 flex flex-col items-start gap-px">
                    <div data-node-id="80:1861" className="flex w-full flex-col items-start pb-[0.8px]">
                        <p
                            data-node-id="80:1862"
                            className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-base font-semibold not-italic leading-normal text-[#060606]"
                        >
                            Category exclusivity options
                        </p>
                    </div>
                    <p
                        data-node-id="80:1863"
                        className="m-0 whitespace-nowrap font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                    >
                        Become the only provider shown in your category and region.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ServicesSectionModuleDbMG4() {
    return (
        <section
            id="services-section-partner"
            className="w-full bg-[#e1e1e1]"
            aria-labelledby="services-partner-module-heading"
            data-name="Section - MODULE 4: PARTNERS"
            data-node-id="80:1763"
            data-anima="services-dbMG4-section-module"
        >
            <h2 id="services-partner-module-heading" className="sr-only">
                Partner integrations and collaboration workspace
            </h2>
            <div
                data-node-id="80:1764"
                className="mx-auto grid w-full max-w-[1248px] grid-cols-1 gap-x-[72px] gap-y-[72px] px-[clamp(16px,5vw,52px)] py-[100px] lg:grid-cols-2 lg:items-start"
            >
                <div
                    data-name="Copy"
                    data-node-id="80:1821"
                    className="relative w-full min-h-0 justify-self-stretch lg:h-[754.3px] lg:min-h-[754.3px]"
                >
                    {/* Figma 80:1821 Copy — vertical rhythm from metadata y positions */}
                    <div className="flex flex-col lg:hidden">
                        <div data-node-id="80:1822" className="flex items-center gap-0">
                            <p
                                data-node-id="80:1824"
                                className="m-0 font-['Jost',sans-serif] text-[10px] font-semibold uppercase leading-4 tracking-[2px] text-white"
                            >
                                Partner
                            </p>
                        </div>
                        <div data-node-id="80:1825" className="mt-[20.5px] text-[0px]">
                            <p className="m-0 mb-0 font-['Poppins',sans-serif] text-[clamp(2rem,6vw,50px)] font-extralight not-italic leading-[47px] text-[#1a1714]">
                                In the deal
                            </p>
                            <p className="m-0 font-['Playfair_Display',serif] text-[clamp(2rem,6vw,50px)] font-normal italic leading-[47px] text-[#1a1714]">
                                from day one.
                            </p>
                        </div>
                        <p
                            data-node-id="80:1828"
                            className="m-0 mt-[22px] max-w-[554px] font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                        >
                            Attorneys, bond originators and conveyancers collaborate directly inside every transaction — from day
                            one, in the same workspace. No email chains.{' '}
                        </p>
                        <div data-node-id="80:1829" className="mt-[20.4px]">
                            <ServicesFeatureCards dataNodeId="80:1829-cards-mobile" items={PARTNER_FEATURE_CARDS} />
                        </div>
                        <div
                            data-node-id="80:1864"
                            className="mt-[38.2px] flex min-h-[51.59px] flex-wrap items-start gap-3"
                        >
                            <Link
                                data-node-id="80:1865"
                                to="/partner-signup"
                                className="inline-flex items-stretch rounded-2xl bg-[#10575c] px-[26px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1866"
                                    className="font-['Poppins',sans-serif] text-base font-semibold leading-normal text-white"
                                    style={{ fontVariationSettings: "'CTGR' 0, 'wdth' 100, 'wght' 700" }}
                                >
                                    Explore Partner Solutions →
                                </span>
                            </Link>
                            <Link
                                data-node-id="80:1867"
                                to="/pricing"
                                className="inline-flex items-stretch rounded-2xl border border-solid border-white px-[21px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1868"
                                    className="font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#1a1714]"
                                >
                                    View Pricing
                                </span>
                            </Link>
                        </div>
                        <div className="mt-4">
                            <TagPillsFlow />
                        </div>
                    </div>

                    <div className="hidden min-h-0 flex-col lg:flex lg:h-[754.3px] lg:min-h-[754.3px]">
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                            <div data-node-id="80:1822" className="shrink-0">
                                <p
                                    data-node-id="80:1824"
                                    className="m-0 font-['Jost',sans-serif] text-[10px] font-semibold uppercase leading-4 tracking-[2px] text-white"
                                >
                                    Partner
                                </p>
                            </div>
                            <div data-node-id="80:1825" className="shrink-0 pt-5">
                                <div data-node-id="80:1826" className="text-[0px]">
                                    <p className="m-0 mb-0 font-['Poppins',sans-serif] text-[50px] font-extralight not-italic leading-[47px] text-[#1a1714]">
                                        In the deal
                                    </p>
                                    <p className="m-0 font-['Playfair_Display',serif] text-[50px] font-normal italic leading-[47px] text-[#1a1714]">
                                        from day one.
                                    </p>
                                </div>
                            </div>
                            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center py-2">
                                <div
                                    data-node-id="80:1828"
                                    className="max-w-[554px] font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                                >
                                    <p className="m-0">
                                        Attorneys, bond originators and conveyancers collaborate directly inside every
                                        transaction — from day one, in the same workspace. No email chains.{' '}
                                    </p>
                                </div>
                            </div>
                            <div data-node-id="80:1829" className="flex w-full min-w-0 shrink-0 flex-col items-start">
                                <ServicesFeatureCards dataNodeId="80:1829-cards-desktop" items={PARTNER_FEATURE_CARDS} />
                            </div>
                        </div>
                        <div
                            data-node-id="80:1864"
                            className="mt-[38.2px] flex h-[51.59px] min-w-0 shrink-0 flex-wrap items-start gap-3"
                        >
                            <Link
                                data-node-id="80:1865"
                                to="/partner-signup"
                                className="inline-flex items-stretch rounded-2xl bg-[#10575c] px-[26px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1866"
                                    className="font-['Poppins',sans-serif] text-base font-semibold leading-normal text-white"
                                    style={{ fontVariationSettings: "'CTGR' 0, 'wdth' 100, 'wght' 700" }}
                                >
                                    Explore Partner Solutions →
                                </span>
                            </Link>
                            <Link
                                data-node-id="80:1867"
                                to="/pricing"
                                className="inline-flex items-stretch rounded-2xl border border-solid border-white px-[21px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1868"
                                    className="font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#1a1714]"
                                >
                                    View Pricing
                                </span>
                            </Link>
                        </div>
                        <div className="mt-4 shrink-0">
                            <TagPillsFigma />
                        </div>
                    </div>
                </div>

                <div className="flex w-full justify-center lg:mt-[78.398px] lg:min-h-[597.5px] lg:justify-end lg:self-start">
                    <PartnerWorkspaceMockup />
                </div>
            </div>
        </section>
    );
}
