import React from 'react';
import { Link } from 'react-router-dom';
import ServicesAgentCmaMockupCard from './ServicesAgentCmaMockupCard';
import ServicesFeatureCards from './ServicesFeatureCards';

/** Figma node 80:1301 — Agent + Agency section. */
const imgTargetGroup = '/img/services-icons/target.svg';
const imgGridiconsLineGraph = '/img/services-icons/chart-line.svg';
const imgRobotGroup = '/img/services-icons/robot.svg';
const imgFileGroup = '/img/services-icons/file-text.svg';
const imgWriteGroup = '/img/services-icons/pencil-simple.svg';
const imgBoxiconsMegaphone = '/img/services-icons/megaphone.svg';

/** Pixel layout from Figma 80:1358 — absolute positions inside 517×62.19 */
const TAG_PILLS = [
    {
        nodeId: '80:1359',
        label: 'Lead scoring',
        emphasized: true,
        className: 'left-0 top-0 bottom-[34.6px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1',
    },
    {
        nodeId: '80:1361',
        label: 'Full CRM',
        emphasized: false,
        className:
            'left-[104.53px] top-0 bottom-[34.6px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1',
    },
    {
        nodeId: '80:1363',
        label: 'Global reach',
        emphasized: false,
        className:
            'left-[179.17px] top-0 bottom-[34.6px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1',
    },
    {
        nodeId: '80:1365',
        label: '€0 lead cost',
        emphasized: true,
        className:
            'left-[272.5px] top-0 bottom-[34.6px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1',
    },
    {
        nodeId: '80:1367',
        label: 'CMA builder',
        emphasized: false,
        className:
            'left-[363.38px] top-0 bottom-[34.6px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1',
    },
    {
        nodeId: '80:1369',
        label: 'AI listing copy',
        emphasized: false,
        className:
            'left-0 top-[34.59px] bottom-[0.01px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1',
    },
    {
        nodeId: '80:1371',
        label: 'Virtual staging',
        emphasized: false,
        className:
            'left-[99.94px] top-[34.59px] bottom-[0.01px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1',
    },
    {
        nodeId: '80:1373',
        label: 'IPM Academy',
        emphasized: false,
        className:
            'left-[201.09px] top-[34.59px] bottom-[0.01px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1',
    },
    {
        nodeId: '80:1375',
        label: 'Task Automation',
        emphasized: false,
        className:
            'left-[297px] top-[34.86px] bottom-[-0.26px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1',
    },
    {
        nodeId: '80:1377',
        label: 'MLS showcase',
        emphasized: false,
        className:
            'left-[405px] top-[34.86px] bottom-[-0.26px] border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1',
    },
];

const AGENT_FEATURE_CARDS = [
    {
        nodeId: '80:1310-1',
        iconSrc: imgTargetGroup,
        title: 'Prospect & win new clients',
        description: 'Intelligent prospecting and live market insights.',
    },
    {
        nodeId: '80:1310-2',
        iconSrc: imgGridiconsLineGraph,
        title: 'Unlimited qualified leads — free',
        description: 'Capture organic enquiries from IPM and MLS.',
    },
    {
        nodeId: '80:1310-3',
        iconSrc: imgRobotGroup,
        title: 'Intelligence-powered lead scoring',
        description: 'Every enquiry ranked by intent and quality.',
    },
    {
        nodeId: '80:1310-4',
        iconSrc: imgFileGroup,
        title: 'Branded CMA report builder',
        description: 'Generate polished valuations with your branding.',
    },
    {
        nodeId: '80:1310-5',
        iconSrc: imgWriteGroup,
        title: 'Smart listing copy & virtual staging',
        description: 'AI descriptions and digitally staged visuals.',
    },
    {
        nodeId: '80:1310-6',
        iconSrc: imgBoxiconsMegaphone,
        title: 'MLS showcase + global distribution',
        description: 'Publish to MLS-connected and global buyer networks.',
        isLast: true,
    },
];

function TagPillsFigma() {
    return (
        <div data-node-id="80:1358" className="relative hidden h-[62.19px] w-full min-w-0 max-w-[517px] lg:block">
            {TAG_PILLS.map((p) => (
                <div
                    key={p.nodeId}
                    data-node-id={p.nodeId}
                    className={`absolute flex flex-col items-start rounded-[100px] ${p.className}`}
                >
                    <p className="m-0 whitespace-nowrap font-['Jost',sans-serif] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]">
                        {p.label}
                    </p>
                </div>
            ))}
        </div>
    );
}

function TagPillsFlow() {
    const row1 = TAG_PILLS.slice(0, 5);
    const row2 = TAG_PILLS.slice(5);
    return (
        <div data-node-id="80:1358" className="flex w-full flex-col gap-2 lg:hidden">
            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                {row1.map((p) => (
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
            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                {row2.map((p) => (
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
        </div>
    );
}

export default function ServicesSectionModule2o4lm() {
    return (
        <section
            id="services-section-agent"
            className="w-full bg-white"
            aria-labelledby="services-module-agents-heading"
            data-name="Section - MODULE 1: AGENTS"
            data-node-id="80:1300"
            data-anima="services-80-1300-module-agents"
        >
            <h2 id="services-module-agents-heading" className="sr-only">
                Agent and agency platform capabilities
            </h2>
            <div
                data-node-id="80:1301"
                className="mx-auto grid w-full max-w-[1248px] grid-cols-1 gap-x-[72px] gap-y-[72px] px-[clamp(16px,5vw,52px)] py-[100px] lg:grid-cols-2 lg:items-center"
            >
                <div
                    data-node-id="80:1302"
                    className="relative w-full min-h-0 justify-self-stretch lg:h-[800.09px] lg:min-h-[800.09px]"
                >
                    {/* Mobile / tablet: stacked */}
                    <div className="flex flex-col gap-8 lg:hidden">
                        <div data-node-id="80:1303" className="flex items-center gap-0">
                            <p
                                data-node-id="80:1305"
                                className="m-0 font-['Jost',sans-serif] text-[10px] font-semibold uppercase leading-4 tracking-[2px] text-[#c2c3c3]"
                            >
                                Agent + AgencY
                            </p>
                        </div>
                        <div data-node-id="80:1306">
                            <div data-node-id="80:1307" className="text-[0px]">
                                <p className="m-0 mb-0 font-['Poppins',sans-serif] text-[clamp(2rem,6vw,50px)] font-extralight not-italic leading-[47px] text-[#060606]">
                                    Stop juggling tools.
                                </p>
                                <p className="m-0 font-['Playfair_Display',serif] text-[clamp(2rem,6vw,50px)] font-normal italic leading-[47px] text-[#060606]">
                                    Start winning clients.
                                </p>
                            </div>
                        </div>
                        <div data-node-id="80:1308" className="w-full">
                            <p
                                data-node-id="80:1309"
                                className="m-0 font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                            >
                                Run your entire real estate business from one intelligent platform. No more switching between
                                listing management system, CRMs, portals and spreadsheets. Every lead your listings generate is
                                free.
                            </p>
                        </div>
                        <ServicesFeatureCards dataNodeId="80:1310" items={AGENT_FEATURE_CARDS} />
                        <div data-node-id="80:1353" className="flex min-h-[51.59px] flex-wrap items-start gap-x-3 gap-y-2">
                            <Link
                                data-node-id="80:1354"
                                to="/signup"
                                className="inline-flex items-stretch rounded-2xl bg-[#10575c] px-[26px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1355"
                                    className="font-['Poppins',sans-serif] text-base font-semibold leading-normal text-white"
                                    style={{ fontVariationSettings: "'CTGR' 0, 'wdth' 100, 'wght' 700" }}
                                >
                                    Explore Agent Tools →
                                </span>
                            </Link>
                            <Link
                                data-node-id="80:1356"
                                to="/pricing"
                                className="inline-flex items-stretch rounded-2xl border border-solid border-[#e1e1e1] px-[21px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1357"
                                    className="font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                                >
                                    View Pricing
                                </span>
                            </Link>
                        </div>
                        <TagPillsFlow />
                    </div>

                    {/* Desktop: Figma absolute Y positions */}
                    <div className="hidden lg:contents">
                        <div data-node-id="80:1303" className="absolute left-0 top-[-0.5px] flex items-center gap-0">
                            <p
                                data-node-id="80:1305"
                                className="m-0 font-['Jost',sans-serif] text-[10px] font-semibold uppercase leading-4 tracking-[2px] text-[#c2c3c3]"
                            >
                                Agent + AgencY
                            </p>
                        </div>
                        <div
                            data-node-id="80:1306"
                            className="absolute left-0 right-[-0.5px] top-[36px] flex flex-col items-start"
                        >
                            <div data-node-id="80:1307" className="text-[0px]">
                                <p className="m-0 mb-0 font-['Poppins',sans-serif] text-[50px] font-extralight not-italic leading-[47px] text-[#060606]">
                                    Stop juggling tools.
                                </p>
                                <p className="m-0 font-['Playfair_Display',serif] text-[50px] font-normal italic leading-[47px] text-[#060606]">
                                    Start winning clients.
                                </p>
                            </div>
                        </div>
                        <div data-node-id="80:1308" className="absolute left-0 right-[-0.5px] top-[151.91px] w-full">
                            <p
                                data-node-id="80:1309"
                                className="m-0 font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                            >
                                Run your entire real estate business from one intelligent platform. No more switching between
                                listing management system, CRMs, portals and spreadsheets. Every lead your listings generate is
                                free.
                            </p>
                        </div>
                        <div
                            data-node-id="80:1310"
                            className="absolute left-0 right-[-0.5px] top-[255.41px] flex w-full flex-col items-start"
                        >
                            <ServicesFeatureCards dataNodeId="80:1310" items={AGENT_FEATURE_CARDS} />
                        </div>
                        <div
                            data-node-id="80:1353"
                            className="absolute left-0 right-[-0.5px] top-[710.32px] flex h-[51.59px] flex-wrap items-start gap-x-3 gap-y-0"
                        >
                            <Link
                                data-node-id="80:1354"
                                to="/signup"
                                className="inline-flex items-stretch rounded-2xl bg-[#10575c] px-[26px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1355"
                                    className="font-['Poppins',sans-serif] text-base font-semibold leading-normal text-white"
                                    style={{ fontVariationSettings: "'CTGR' 0, 'wdth' 100, 'wght' 700" }}
                                >
                                    Explore Agent Tools →
                                </span>
                            </Link>
                            <Link
                                data-node-id="80:1356"
                                to="/pricing"
                                className="inline-flex items-stretch rounded-2xl border border-solid border-[#e1e1e1] px-[21px] pb-[14.09px] pt-[13.5px] no-underline"
                            >
                                <span
                                    data-node-id="80:1357"
                                    className="font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-[#060606]"
                                >
                                    View Pricing
                                </span>
                            </Link>
                        </div>
                        <div className="absolute left-0 right-[-0.5px] top-[777.91px]">
                            <TagPillsFigma />
                        </div>
                    </div>
                </div>

                <div className="flex w-full justify-center lg:min-h-[728px] lg:justify-end lg:self-center">
                    <ServicesAgentCmaMockupCard />
                </div>
            </div>
        </section>
    );
}
