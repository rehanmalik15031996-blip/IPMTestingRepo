import React from 'react';
import { Link } from 'react-router-dom';
import ServicesFeatureCards from './ServicesFeatureCards';

/** Figma node 80:1625 — Investor section icons. */
const imgGlobeHemisphereWest = '/img/services-icons/globe-hemisphere-west.svg';
const imgPresentationChart = '/img/services-icons/presentation-chart.svg';
const imgLightning = '/img/services-icons/lightning.svg';
const imgChartBarHorizontal = '/img/services-icons/chart-bar-horizontal.svg';
const imgChartLineUp = '/img/services-icons/chart-line-up.svg';
const imgVector = '/img/cfZMr/vector-19.svg';
const imgVector1 = '/img/cfZMr/vector-20.svg';
const imgVector2 = '/img/cfZMr/vector-21.svg';
const imgChartLineUpAnnual = '/img/services-icons/chart-line-up-annual.svg';

const INVEST_FEATURE_CARDS = [
    {
        nodeId: '80:1637',
        iconSrc: imgGlobeHemisphereWest,
        title: 'Global investment discovery',
        description: 'Identify high-potential properties with IPM Score.',
    },
    {
        nodeId: '80:1644',
        iconSrc: imgPresentationChart,
        title: 'Live AI ROI & yield simulator',
        description: 'Model purchase price, deposit, rent, and loan term.',
    },
    {
        nodeId: '80:1651',
        iconSrc: imgLightning,
        title: 'Off-market early access',
        description: 'Discover selected properties before open-market release.',
    },
    {
        nodeId: '80:1658',
        iconSrc: imgChartBarHorizontal,
        title: 'Market intelligence dashboards',
        description: 'Track demand signals, pricing trends and opportunities.',
    },
    {
        nodeId: '80:1665',
        iconSrc: imgChartLineUp,
        title: 'Portfolio performance tracking',
        description: 'Monitor income, capital growth and strategy.',
        isLast: true,
    },
];

function Pill({ label, filled, dataNodeId }) {
    return (
        <div
            data-node-id={dataNodeId}
            className={`inline-flex flex-col items-start rounded-[100px] border border-solid border-[#e1e1e1] px-3 pb-[5.59px] pt-1 ${
                filled ? 'bg-[rgba(255,255,255,0.06)]' : 'bg-white'
            }`}
        >
            <p className="m-0 whitespace-nowrap font-['Jost',sans-serif] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]">
                {label}
            </p>
        </div>
    );
}

function RoiSimulatorMockup() {
    return (
        <div
            data-node-id="80:1690"
            className="relative flex w-full max-w-[563px] shrink-0 flex-col items-start overflow-clip rounded-[18px] border border-solid border-ipm-light-grey bg-ipm-light-grey/40 p-px shadow-[0px_20px_64px_0px_rgba(28,23,16,0.14),0px_6px_20px_0px_rgba(28,23,16,0.08)] lg:max-w-none"
        >
            <div
                data-node-id="80:1691"
                className="relative h-10 w-full shrink-0 border-b border-solid border-ipm-light-grey bg-ipm-light-grey"
            >
                <div className="flex size-full items-center gap-[7px] px-3.5 pb-px">
                    <div className="size-2 shrink-0 rounded bg-[#ff5f57]" />
                    <div className="size-2 shrink-0 rounded bg-[#ffc801]" />
                    <div className="size-2 shrink-0 rounded bg-[#28c840]" />
                    <div className="relative min-h-px min-w-[101.56px] flex-1">
                        <div className="flex w-full flex-col items-center px-[clamp(12px,8vw,168px)]">
                            <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[10px] font-normal leading-4 text-ipm-grey">
                                myIPM — ROI Simulator
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div
                data-node-id="80:1698"
                className="relative w-full min-h-[680px] shrink-0 bg-ipm-light-grey/40 lg:min-h-[666px]"
            >
                <div className="relative size-full min-h-[680px] lg:min-h-[666px]">
                    <div data-node-id="80:1699" className="absolute left-[18px] right-[18px] top-[17px]">
                        <p className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[9px] font-normal not-italic uppercase leading-[14.4px] tracking-[0.7px] text-ipm-black">
                            💰 Live ROI Calculator
                        </p>
                    </div>

                    <div
                        data-node-id="80:1701"
                        className="absolute left-[18px] right-[18px] top-[42.39px] grid h-[129.38px] grid-cols-2 grid-rows-[61.19px_61.19px] gap-[7px]"
                    >
                        {[
                            ['Purchase Price', 'R 2,400,000', '80:1702', 'col-start-1 row-start-1'],
                            ['Your Deposit', 'R 480,000', '80:1707', 'col-start-2 row-start-1'],
                            ['Monthly Rent', 'R 18,500', '80:1712', 'col-start-1 row-start-2'],
                            ['Loan Term', '20 years', '80:1717', 'col-start-2 row-start-2'],
                        ].map(([label, value, nid, gridArea]) => (
                            <div
                                key={nid}
                                data-node-id={nid}
                                className={`flex flex-col items-start gap-3 rounded-[10px] border border-solid border-ipm-light-grey bg-white px-[13px] pb-[11px] pt-2.5 ${gridArea}`}
                            >
                                <p className="m-0 w-full [font-family:'Jost',Helvetica] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.5px] text-ipm-grey">
                                    {label}
                                </p>
                                <p className="m-0 w-full pb-[0.8px] [font-family:'Jost',Helvetica] text-[13px] font-semibold leading-[20.8px] text-ipm-green">
                                    {value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div
                        data-node-id="80:1722"
                        className="absolute left-[18px] right-[18px] top-[181.77px] h-[98.39px] rounded-xl border border-solid border-ipm-green/25 bg-ipm-green/10"
                    >
                        <div data-node-id="80:1723" className="absolute left-4 right-4 top-[13px] flex flex-col items-center">
                            <p className="m-0 whitespace-nowrap text-center [font-family:'Poppins',Helvetica] text-[9px] font-normal not-italic uppercase leading-[14.4px] tracking-[0.8px] text-ipm-green">
                                Your monthly profit
                            </p>
                        </div>
                        <div data-node-id="80:1725" className="absolute left-4 right-4 top-[34.39px] flex flex-col items-center">
                            <p className="m-0 whitespace-nowrap text-center [font-family:'Playfair_Display',serif] text-[26px] font-normal leading-[26px] text-ipm-green">
                                + R 4,300
                            </p>
                        </div>
                        <div data-node-id="80:1727" className="absolute left-4 right-4 top-[64.39px] flex flex-col items-center">
                            <p className="m-0 whitespace-nowrap text-center [font-family:'Poppins',Helvetica] text-[10px] font-normal not-italic leading-4 text-ipm-grey">
                                After bond, levies, rates & management fees
                            </p>
                        </div>
                    </div>

                    <div data-node-id="80:1729" className="absolute left-[18px] right-[18px] top-[289.16px]">
                        <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.7px] text-ipm-grey/50">
                            5-year capital outlook
                        </p>
                    </div>

                    <div
                        data-node-id="80:1731"
                        className="absolute left-[18px] right-[18px] top-[312.55px] h-[93.094px] overflow-clip"
                    >
                        <div className="absolute inset-[5.45%_0.01%_9.09%_0.01%] opacity-100">
                            <div className="absolute inset-[-1.6%_-0.27%]">
                                <img alt="" className="block size-full max-w-none" src={imgVector} />
                            </div>
                        </div>
                        <div className="absolute inset-[5.45%_0.01%_0_0.01%] opacity-100">
                            <img alt="" className="absolute block size-full max-w-none" src={imgVector1} />
                        </div>
                        <p
                            data-node-id="80:1734"
                            className="absolute [font-family:'Jost',Helvetica] text-[11.848px] font-normal leading-normal text-ipm-grey/40 [inset:85.45%_94.22%_-3.72%_0.72%] whitespace-nowrap"
                        >
                            Now
                        </p>
                        <p
                            data-node-id="80:1735"
                            className="absolute [font-family:'Jost',Helvetica] text-[11.848px] font-normal leading-normal text-ipm-grey/40 [inset:85.45%_23.61%_-3.72%_69.64%] whitespace-nowrap"
                        >
                            Year 5
                        </p>
                        <p
                            data-node-id="80:1736"
                            className="absolute [font-family:'Poppins',Helvetica] text-[12.695px] font-bold not-italic leading-normal text-ipm-green [inset:-3.55%_16.46%_83.14%_62.45%] whitespace-nowrap"
                        >
                            R 3.82M (+59%)
                        </p>
                        <div data-node-id="80:1737" className="absolute inset-[0_-1.06%_89.09%_98.92%] opacity-100">
                            <img alt="" className="absolute block size-full max-w-none" src={imgVector2} />
                        </div>
                    </div>

                    <div
                        data-node-id="80:1738"
                        className="absolute left-[18px] right-[18px] top-[415.64px] flex flex-col items-start rounded-[10px] border border-solid border-ipm-yellow/30 bg-ipm-green px-[15px] py-[11px]"
                    >
                        <div data-node-id="80:1739" className="relative w-full shrink-0">
                            <div className="relative flex w-full items-start gap-1">
                                <div className="relative size-4 shrink-0" aria-hidden>
                                    <img alt="" className="absolute block size-full max-w-none" src={imgChartLineUpAnnual} />
                                </div>
                                <p
                                    data-node-id="80:1740"
                                    className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[10px] font-bold not-italic leading-4 text-ipm-orange"
                                >
                                    {' Annual return: 9.25%'}
                                </p>
                            </div>
                        </div>
                        <div data-node-id="80:1741" className="relative w-full shrink-0">
                            <p className="m-0 w-full [font-family:'Poppins',Helvetica] text-[10px] font-normal not-italic leading-4 text-ipm-light-grey/80">
                                Based on current market data, Cape Town
                            </p>
                        </div>
                    </div>

                    <div data-node-id="80:1743" className="absolute left-[18px] right-[18px] top-[478.64px]">
                        <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[9px] font-normal uppercase leading-[14.4px] tracking-[0.7px] text-ipm-green">
                            ⚡ Off-Market Early Access
                        </p>
                    </div>

                    <div
                        data-node-id="80:1745"
                        className="absolute left-[18px] right-[18px] top-[501.03px] h-[79.58px] rounded-[10px] border border-solid border-white/20 bg-ipm-green"
                    >
                        <div
                            data-node-id="80:1746"
                            className="absolute left-3.5 right-3.5 top-2.5 flex items-center justify-between gap-2"
                        >
                            <p
                                data-node-id="80:1748"
                                className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11.5px] font-semibold leading-[18.4px] text-white"
                            >
                                Sea Point Apartment
                            </p>
                            <div
                                data-node-id="80:1749"
                                className="flex shrink-0 flex-col items-start rounded bg-white/10 px-[7px] pb-[2.39px] pt-px"
                            >
                                <p
                                    data-node-id="80:1750"
                                    className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[9px] font-bold not-italic leading-[14.4px] text-white"
                                >
                                    OFF-MARKET
                                </p>
                            </div>
                        </div>
                        <div data-node-id="80:1751" className="absolute left-3.5 right-3.5 top-[32.39px]">
                            <p
                                data-node-id="80:1752"
                                className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[10px] font-normal not-italic leading-4 text-ipm-light-grey/80"
                            >
                                Studio · 45m² · +11.2% ROI · IPM 9.4
                            </p>
                        </div>
                        <div data-node-id="80:1753" className="absolute left-3.5 right-3.5 top-[51.39px]">
                            <p
                                data-node-id="80:1754"
                                className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[9.5px] font-normal leading-[15.2px] text-ipm-orange"
                            >
                                ⏱ 24hr exclusive — ends 09:00 tomorrow
                            </p>
                        </div>
                    </div>

                    <div
                        data-node-id="80:1755"
                        className="absolute left-[18px] right-[18px] top-[587.61px] flex flex-col items-start gap-1 rounded-[10px] border border-solid border-white/20 bg-ipm-green px-[15px] py-[11px]"
                    >
                        <div data-node-id="80:1756" className="relative w-full shrink-0">
                            <div className="relative flex w-full items-center justify-between gap-2">
                                <p
                                    data-node-id="80:1758"
                                    className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11.5px] font-semibold leading-[18.4px] text-white"
                                >
                                    Dubai Marina Studio
                                </p>
                                <div
                                    data-node-id="80:1759"
                                    className="flex shrink-0 flex-col items-start rounded bg-white/10 px-[7px] pb-[2.39px] pt-px"
                                >
                                    <p
                                        data-node-id="80:1760"
                                        className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[9px] font-bold not-italic leading-[14.4px] text-white"
                                    >
                                        OFF-MARKET
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div data-node-id="80:1761" className="relative w-full shrink-0">
                            <p
                                data-node-id="80:1762"
                                className="m-0 w-full [font-family:'Poppins',Helvetica] text-[10px] font-normal not-italic leading-4 text-ipm-light-grey/80"
                            >
                                40m² · 9.8% rental yield · AED 720K · IPM 9.6
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Section MODULE 3: INVESTORS — Figma node 80:1625 (structure + tokens from get_design_context).
 */
export default function ServicesSectionModuleCfZMr() {
    return (
        <section
            id="services-section-investor"
            className="w-full bg-white"
            aria-labelledby="services-invest-module-heading"
            data-anima="services-cfZMr-section-module"
            data-node-id="80:1625"
        >
            <h2 id="services-invest-module-heading" className="sr-only">
                Investor tools and ROI simulator
            </h2>
            <div
                data-node-id="80:1626"
                className="mx-auto grid w-full max-w-[1248px] grid-cols-1 gap-x-[72px] gap-y-[56px] px-[clamp(16px,5vw,52px)] py-[84px] lg:grid-cols-2 lg:items-center"
            >
                <div data-node-id="80:1627" className="relative w-full max-w-[563px] justify-self-start lg:min-h-0">
                    <div data-node-id="80:1628" className="flex items-center gap-0">
                        <p
                            data-node-id="80:1630"
                            className="m-0 font-['Jost',sans-serif] text-[10px] font-semibold uppercase leading-4 tracking-[2px] text-[#c2c3c3]"
                        >
                            Invest
                        </p>
                    </div>

                    <div data-node-id="80:1631" className="mt-9 flex flex-col items-start leading-none text-[#060606]">
                        <p
                            data-node-id="80:1632"
                            className="m-0 font-['Poppins',sans-serif] text-[clamp(2rem,6vw,50px)] font-extralight not-italic leading-normal"
                        >
                            Evaluate opportunities{' '}
                        </p>
                        <p
                            data-node-id="80:1633"
                            className="m-0 font-['Playfair_Display',serif] text-[clamp(2rem,6vw,50px)] font-normal italic leading-[47px]"
                        >
                            with intelligence.
                        </p>
                    </div>

                    <div data-node-id="80:1634" className="mt-6 w-full pb-[0.625px]">
                        <p
                            data-node-id="80:1635"
                            className="m-0 font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                        >
                            Global investment discovery, instant ROI & yield analysis, live market dashboards and early
                            access to off-market properties — all in one intelligent environment.
                        </p>
                    </div>

                    <div data-node-id="80:1636" className="mt-8 flex flex-col items-start">
                        <ServicesFeatureCards dataNodeId="80:1636-cards" items={INVEST_FEATURE_CARDS} />
                    </div>

                    <div
                        data-node-id="80:1672"
                        className="mt-8 flex h-[51.59px] flex-wrap items-start gap-x-3 gap-y-0"
                    >
                        <Link
                            data-node-id="80:1673"
                            to="/signup"
                            className="inline-flex items-stretch rounded-2xl bg-[#10575c] px-[26px] pb-[14.09px] pt-[13.5px] no-underline"
                        >
                            <span
                                data-node-id="80:1674"
                                className="font-['Poppins',sans-serif] text-base font-semibold leading-normal text-white"
                            >
                                Explore Investor Tools →
                            </span>
                        </Link>
                        <Link
                            data-node-id="80:1675"
                            to="/pricing"
                            className="inline-flex items-stretch rounded-2xl border border-solid border-[#e1e1e1] px-[21px] pb-[14.09px] pt-[13.5px] no-underline"
                        >
                            <span
                                data-node-id="80:1676"
                                className="font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#c2c3c3]"
                            >
                                View Pricing
                            </span>
                        </Link>
                    </div>

                    <div data-node-id="80:1677" className="mt-4 flex w-full min-h-[62.19px] flex-col gap-2">
                        <div className="flex flex-wrap items-start gap-x-2 gap-y-2">
                            <Pill dataNodeId="80:1678" label="60+ markets" filled />
                            <Pill dataNodeId="80:1680" label="ROI simulator" filled={false} />
                            <Pill dataNodeId="80:1682" label="Early access" filled={false} />
                            <Pill dataNodeId="80:1684" label="Portfolio tracking" filled />
                            <Pill dataNodeId="80:1686" label="ESG badges" filled />
                        </div>
                        <div className="flex flex-wrap items-start gap-x-2 gap-y-2">
                            <Pill dataNodeId="80:1688" label="Bond calculator" filled />
                            <Pill dataNodeId="350:2" label="AI Virtual Staging " filled />
                        </div>
                    </div>
                </div>

                <div className="flex w-full justify-center lg:justify-end">
                    <RoiSimulatorMockup />
                </div>
            </div>
        </section>
    );
}
