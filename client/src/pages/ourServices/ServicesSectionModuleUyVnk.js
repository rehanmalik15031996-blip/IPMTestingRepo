import React from 'react';
import { Link } from 'react-router-dom';
import ServicesFeatureCards from './ServicesFeatureCards';

/** Figma node 80:1479 — Buyer section icons. */
const IMG_MAGNIFYING_GLASS = '/img/services-icons/magnifying-glass.svg';
const IMG_TREND_UP = '/img/services-icons/trend-up.svg';
const IMG_TAG = '/img/services-icons/tag.svg';
const IMG_LOCK_KEY = '/img/services-icons/lock-key.svg';
const IMG_CUBE_FOCUS = '/img/services-icons/cube-focus.svg';
const IMG_BANK = '/img/services-icons/bank.svg';

/** 80:1480 — Smart Search + Smart Vault mockup (full subtree) */
function SmartSearchSmartVaultMockup() {
    return (
        <div
            className="relative flex h-[700px] w-full max-w-[512px] shrink-0 flex-col overflow-clip rounded-[18px] border border-solid border-ipm-light-grey bg-ipm-light-grey/40 p-px shadow-[0px_20px_64px_0px_rgba(28,23,16,0.14),0px_6px_20px_0px_rgba(28,23,16,0.08)] lg:max-w-none"
            data-name="Smart Search + Smart Vault mockup"
            data-node-id="80:1480"
        >
            <div
                className="relative h-10 w-full shrink-0 border-b border-solid border-ipm-light-grey bg-ipm-light-grey"
                data-name="Background+HorizontalBorder"
                data-node-id="80:1481"
            >
                <div className="flex size-full items-center gap-[7px] px-3.5 pb-px">
                    <div className="size-2 shrink-0 rounded bg-[#ff5f57]" data-name="Background" data-node-id="80:1482" />
                    <div className="size-2 shrink-0 rounded bg-[#ffc801]" data-name="Background" data-node-id="80:1483" />
                    <div className="size-2 shrink-0 rounded bg-[#28c840]" data-name="Background" data-node-id="80:1484" />
                    <div className="relative min-h-px min-w-[68.59px] flex-1" data-name="Margin" data-node-id="80:1485">
                        <div className="flex w-full flex-col items-center px-[184.203px]">
                            <div className="relative flex shrink-0 flex-col items-start" data-name="Container" data-node-id="80:1486">
                                <p
                                    className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[10px] font-normal leading-4 text-ipm-grey"
                                    data-node-id="80:1487"
                                >
                                    internationalpropertymarket.com/search
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative w-full shrink-0" data-name="Container" data-node-id="80:1488">
                <div className="flex w-full flex-col gap-[10px] p-[18px]">
                    <div
                        className="flex w-full shrink-0 items-center gap-2 rounded-[10px] border border-solid border-ipm-grey bg-white/10 px-[15px] pb-3 pt-[11px]"
                        data-name="Background+Border"
                        data-node-id="80:1489"
                    >
                        <div className="opacity-50" data-name="Container" data-node-id="80:1490">
                            <p
                                className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[13px] font-normal leading-[20.8px] text-ipm-black"
                                data-node-id="80:1491"
                            >
                                🔍
                            </p>
                        </div>
                        <div className="relative min-h-px min-w-px flex-1" data-name="Container" data-node-id="80:1492">
                            <p
                                className="m-0 w-full [font-family:'Poppins',Helvetica] text-[12.5px] font-normal leading-5 text-ipm-grey"
                                data-node-id="80:1493"
                            >
                                3-bed near good schools, Cape Town, under R 3.5M
                            </p>
                        </div>
                        <div
                            className="relative shrink-0 rounded border border-solid border-ipm-grey bg-ipm-light-grey"
                            data-name="Overlay+Border"
                            data-node-id="80:1494"
                        >
                            <div className="flex flex-col items-center justify-center px-2 pb-[3.39px] pt-0.5">
                                <p
                                    className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[9px] font-bold leading-[14.4px] text-ipm-grey"
                                    data-node-id="80:1495"
                                >
                                    AI
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative flex w-full shrink-0 flex-col items-start" data-name="Container" data-node-id="80:1496">
                        <p
                            className="m-0 w-full [font-family:'Poppins',Helvetica] text-[10px] font-normal leading-4 text-ipm-grey"
                            data-node-id="80:1497"
                        >
                            12 results — sorted by best match for you
                        </p>
                    </div>

                    <div
                        className="relative flex w-full shrink-0 items-center justify-between rounded-[10px] bg-ipm-light-grey px-3.5 pb-3 pt-[11px]"
                        data-name="Property result 1"
                        data-node-id="80:1498"
                    >
                        <div className="relative w-[195px] shrink-0" data-name="Container" data-node-id="80:1499">
                            <div className="flex flex-col items-start gap-0 pb-px">
                                <div className="relative w-full shrink-0 pb-[0.8px]" data-name="Container" data-node-id="80:1500">
                                    <p
                                        className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[13px] font-semibold leading-[20.8px] text-ipm-black"
                                        data-node-id="80:1501"
                                    >
                                        Constantia Heights
                                    </p>
                                </div>
                                <div className="relative w-full shrink-0 pb-[0.59px]" data-name="Container" data-node-id="80:1502">
                                    <p
                                        className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11px] font-normal leading-[17.6px] text-ipm-grey"
                                        data-node-id="80:1503"
                                    >
                                        3 bed · 2 bath · 218m² · Cape Town
                                    </p>
                                </div>
                                <div
                                    className="relative flex w-full shrink-0 items-end gap-[5px] pt-[5px]"
                                    data-name="Container"
                                    data-node-id="80:1504"
                                >
                                    <div
                                        className="relative flex h-[20.39px] shrink-0 flex-col items-center justify-center rounded border border-ipm-green/25 bg-ipm-green/10 px-2 pb-[3.39px] pt-0.5"
                                        data-name="Overlay+Border"
                                        data-node-id="80:1505"
                                    >
                                        <p
                                            className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[9px] font-bold leading-[14.4px] text-ipm-green"
                                            data-node-id="80:1506"
                                        >
                                            BEST MATCH
                                        </p>
                                    </div>
                                    <div
                                        className="relative flex h-[20.39px] shrink-0 flex-col items-start rounded border border-ipm-orange/30 bg-ipm-yellow/20 px-2 pb-[3.39px] pt-0.5"
                                        data-name="Overlay+Border"
                                        data-node-id="80:1507"
                                    >
                                        <p
                                            className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[9px] font-bold leading-[14.4px] text-ipm-grey"
                                            data-node-id="80:1508"
                                        >
                                            IPM 9.1
                                        </p>
                                    </div>
                                    <div className="flex flex-row items-end self-stretch">
                                        <div className="relative flex h-full flex-col items-start" data-name="Container" data-node-id="80:1509">
                                            <p
                                                className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[9px] font-normal leading-[14.4px] text-ipm-grey"
                                                data-node-id="80:1510"
                                            >
                                                🏫 Top schools
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative shrink-0" data-name="Container" data-node-id="80:1511">
                            <div className="relative flex flex-col items-center justify-center">
                                <div className="relative flex shrink-0 flex-col items-end pb-[0.8px]" data-name="Container" data-node-id="80:1512">
                                    <p
                                        className="m-0 whitespace-nowrap text-right [font-family:'Poppins',Helvetica] text-[13px] font-bold leading-[20.8px] text-ipm-black"
                                        data-node-id="80:1513"
                                    >
                                        R 3.2M
                                    </p>
                                </div>
                                <div className="relative flex shrink-0 flex-col items-start justify-center" data-name="Container" data-node-id="80:1514">
                                    <p
                                        className="m-0 whitespace-nowrap text-right [font-family:'Poppins',Helvetica] text-[10px] font-semibold leading-4 text-ipm-green"
                                        data-node-id="80:1515"
                                    >
                                        Fair price ✓
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="relative flex w-full shrink-0 items-center gap-[287.7px] rounded-[10px] bg-ipm-light-grey px-3.5 pb-2.5 pt-2"
                        data-name="Property result 2"
                        data-node-id="80:1516"
                    >
                        <div className="relative w-[115px] shrink-0" data-name="Container" data-node-id="80:1517">
                            <div className="flex flex-col items-start gap-0 pb-px">
                                <div className="relative w-full shrink-0" data-name="Container" data-node-id="80:1518">
                                    <p
                                        className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[12.5px] font-semibold leading-5 text-ipm-black"
                                        data-node-id="80:1519"
                                    >
                                        Kenilworth Village
                                    </p>
                                </div>
                                <div className="relative w-full shrink-0 pb-[0.59px]" data-name="Container" data-node-id="80:1520">
                                    <p
                                        className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[11px] font-normal leading-[17.6px] text-ipm-grey"
                                        data-node-id="80:1521"
                                    >
                                        3 bed · 2 bath · 185m²
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="relative shrink-0" data-name="Container" data-node-id="80:1522">
                            <div className="relative flex flex-col items-start">
                                <div className="relative flex shrink-0 flex-col items-end" data-name="Container" data-node-id="80:1523">
                                    <p
                                        className="m-0 whitespace-nowrap text-right [font-family:'Poppins',Helvetica] text-[12.5px] font-bold leading-5 text-ipm-black"
                                        data-node-id="80:1524"
                                    >
                                        R 2.95M
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="relative flex w-full shrink-0 flex-col items-start gap-2 rounded-xl border border-solid border-ipm-green bg-ipm-green px-4 pb-3.5 pt-[15px]"
                        data-name="Smart Vault"
                        data-node-id="80:1525"
                    >
                        <div className="relative w-full shrink-0" data-name="Container" data-node-id="80:1526">
                            <p
                                className="m-0 w-full uppercase tracking-[1.5px] [font-family:'Poppins',Helvetica] text-[9px] font-semibold leading-[14.4px] text-ipm-light-grey"
                                data-node-id="80:1527"
                            >
                                🔒 Smart Vault — Offer to Purchase
                            </p>
                        </div>

                        <div
                            className="relative w-full shrink-0 rounded-[10px] border border-solid border-ipm-green/20 bg-ipm-green/5"
                            data-name="Overlay+Border"
                            data-node-id="80:1528"
                        >
                            <div className="relative flex w-full items-start gap-2.5 px-[13px] py-2.5">
                                <div className="relative h-[21px] w-5 shrink-0" data-name="Margin" data-node-id="80:1529">
                                    <div className="relative size-full pt-px">
                                        <div
                                            className="relative flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-ipm-green/15 pb-[2.5px] pt-[1.5px]"
                                            data-name="Overlay"
                                            data-node-id="80:1530"
                                        >
                                            <p
                                                className="m-0 whitespace-nowrap text-center [font-family:'Jost',Helvetica] text-[10px] font-normal leading-4 text-white"
                                                data-node-id="80:1531"
                                            >
                                                ✓
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <p
                                    className="m-0 text-[11px] leading-[16.5px] text-ipm-light-grey/80"
                                    data-node-id="80:1532"
                                >
                                    <span className="[font-family:'Poppins',Helvetica] font-normal">Occupation date:</span>
                                    <span className="[font-family:'Jost',Helvetica] font-normal"> </span>
                                    <span className="[font-family:'Poppins',Helvetica] font-bold">1 March 2026</span>
                                    <span className="[font-family:'Jost',Helvetica] font-normal"> </span>
                                    <span className="[font-family:'Poppins',Helvetica] font-normal">— 6 weeks away</span>
                                </p>
                            </div>
                        </div>

                        <div
                            className="relative w-full shrink-0 rounded-[10px] bg-white/10"
                            data-name="Overlay+Border"
                            data-node-id="80:1533"
                        >
                            <div className="relative flex w-full items-start gap-2.5 px-3 pb-[9px] pt-2">
                                <div className="relative h-[21px] w-5 shrink-0" data-name="Margin" data-node-id="80:1534">
                                    <div className="relative size-full pt-px">
                                        <div
                                            className="relative flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-ipm-orange/15 pb-[2.5px] pt-[1.5px]"
                                            data-name="Overlay"
                                            data-node-id="80:1535"
                                        >
                                            <p
                                                className="m-0 whitespace-nowrap text-center [font-family:'Jost',Helvetica] text-[10px] font-normal leading-4 text-ipm-orange"
                                                data-node-id="80:1536"
                                            >
                                                ⚠
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <p
                                    className="m-0 whitespace-nowrap text-[11px] leading-[16.5px] text-ipm-orange [font-family:'Poppins',Helvetica]"
                                    data-node-id="80:1537"
                                >
                                    <span className="font-normal">Penalty clause —</span>
                                    <span className="font-bold"> R 45,000 at risk if deal falls through</span>
                                </p>
                            </div>
                        </div>

                        <div
                            className="relative w-full shrink-0 rounded-[10px] border border-solid border-ipm-green/20 bg-ipm-green/5"
                            data-name="Overlay+Border"
                            data-node-id="80:1538"
                        >
                            <div className="relative flex w-full items-start gap-2.5 px-[13px] pb-2.5 pt-[9px]">
                                <div className="relative h-[21px] w-5 shrink-0" data-name="Margin" data-node-id="80:1539">
                                    <div className="relative size-full pt-px">
                                        <div
                                            className="relative flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-ipm-green/15 pb-[2.5px] pt-[1.5px]"
                                            data-name="Overlay"
                                            data-node-id="80:1540"
                                        >
                                            <p
                                                className="m-0 whitespace-nowrap text-center [font-family:'Jost',Helvetica] text-[10px] font-normal leading-4 text-white"
                                                data-node-id="80:1541"
                                            >
                                                ✓
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <p
                                    className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[11px] font-normal leading-[16.5px] text-ipm-light-grey/80"
                                    data-node-id="80:1542"
                                >
                                    Fixtures included: stove, dishwasher, curtains
                                </p>
                            </div>
                        </div>

                        <div
                            className="relative w-full shrink-0 rounded-[10px] bg-white/10"
                            data-name="Overlay+Border"
                            data-node-id="80:1543"
                        >
                            <div className="relative flex w-full items-start gap-2.5 px-3 py-2">
                                <div className="relative h-[21px] w-5 shrink-0" data-name="Margin" data-node-id="80:1544">
                                    <div className="relative size-full pt-px">
                                        <div
                                            className="relative flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-ipm-orange/15 pb-[2.5px] pt-[1.5px]"
                                            data-name="Overlay"
                                            data-node-id="80:1545"
                                        >
                                            <p
                                                className="m-0 whitespace-nowrap text-center [font-family:'Jost',Helvetica] text-[10px] font-normal leading-4 text-ipm-orange"
                                                data-node-id="80:1546"
                                            >
                                                ⚠
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <p
                                    className="m-0 whitespace-nowrap [font-family:'Poppins',Helvetica] text-[11px] font-normal leading-[16.5px] text-ipm-orange"
                                    data-node-id="80:1547"
                                >
                                    Voetstoots clause present — ask your agent
                                </p>
                            </div>
                        </div>

                        <div className="relative w-full shrink-0 pb-[0.59px]" data-name="Container" data-node-id="80:1548">
                            <p
                                className="m-0 w-full [font-family:'Poppins',Helvetica] text-[11px] font-normal leading-[17.6px] text-ipm-light-grey"
                                data-node-id="80:1549"
                            >
                                AI reviewed 28 clauses · 2 flagged for your attention
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const LIST_ITEMS = [
    {
        item: '80:1559',
        icon: '152:254',
        src: IMG_MAGNIFYING_GLASS,
        name: 'MagnifyingGlass',
        top: 'top-[11.35px]',
        container: '80:1562',
        strong: '80:1563',
        title: '80:1564',
        desc: '80:1565',
        titleText: 'Smart natural language search',
        descText: 'Search using lifestyle preferences and location insights.',
        gap: 'gap-px',
    },
    {
        item: '80:1566',
        icon: '152:259',
        src: IMG_TREND_UP,
        name: 'TrendUp',
        top: 'top-[11.37px]',
        container: '80:1569',
        strong: '80:1570',
        title: '80:1571',
        desc: '80:1572',
        titleText: 'Neighbourhood & market intelligence',
        descText: 'Understand area trends, amenities and pricing signals.',
        gap: 'gap-px',
    },
    {
        item: '80:1573',
        icon: '152:264',
        src: IMG_TAG,
        name: 'Tag',
        top: 'top-[11.39px]',
        container: '80:1576',
        strong: '80:1577',
        title: '80:1578',
        desc: '80:1579',
        titleText: 'Pricing transparency and IPM Score',
        descText: 'Compare properties with real market data.',
        gap: 'gap-px',
    },
    {
        item: '80:1580',
        icon: '152:269',
        src: IMG_LOCK_KEY,
        name: 'LockKey',
        top: 'top-[11.41px]',
        container: '80:1583',
        strong: '80:1584',
        title: '80:1585',
        desc: '80:1586',
        titleText: 'Smart Vault — AI document reader',
        descText: 'Upload contracts; receive plain-language explanations.',
        gap: 'gap-[0.99px]',
    },
    {
        item: '80:1587',
        icon: '152:276',
        src: IMG_CUBE_FOCUS,
        name: 'CubeFocus',
        top: 'top-[11.43px]',
        container: '80:1590',
        strong: '80:1591',
        title: '80:1592',
        desc: '80:1593',
        titleText: '3D virtual walkthroughs',
        descText: 'Explore properties from anywhere in the world.',
        gap: 'gap-px',
    },
    {
        item: '80:1594',
        icon: '152:286',
        src: IMG_BANK,
        name: 'Bank',
        top: 'top-[11.45px]',
        container: '80:1597',
        strong: '80:1598',
        title: '80:1599',
        desc: '80:1600',
        titleText: 'Mortgage pre-qualification',
        descText: 'Know your budget before you search.',
        gap: 'gap-[0.99px]',
        last: true,
    },
];

const BUY_FEATURE_CARDS = LIST_ITEMS.map((row) => ({
    nodeId: row.item,
    iconSrc: row.src,
    title: row.titleText,
    description: row.descText,
    isLast: row.last,
}));

/** 80:1550 Copy + absolute children (Figma) */
function BuyerCopyDesktop() {
    return (
        <div
            className="relative hidden h-[772.34px] w-full max-w-[512px] shrink-0 lg:block"
            data-name="Copy"
            data-node-id="80:1550"
        >
            <div
                className="absolute left-0 top-[-0.5px] flex items-center gap-0"
                data-name="Container"
                data-node-id="80:1551"
            >
                <p
                    className="m-0 whitespace-nowrap uppercase tracking-[2px] [font-family:'Jost',Helvetica] text-[10px] font-semibold leading-4 text-[#c2c3c3]"
                    data-node-id="80:1553"
                >
                    Buy + Rent
                </p>
            </div>

            <div className="absolute left-0 right-0 top-9 flex flex-col items-start" data-name="Heading 2" data-node-id="80:1554">
                <h2
                    id="services-buyer-module-heading"
                    className="m-0 whitespace-nowrap text-[#060606]"
                    data-node-id="80:1555"
                >
                    <span className="mb-0 block [font-family:'Poppins',Helvetica] text-[50px] font-extralight not-italic leading-[47px]">
                        Find property with
                    </span>
                    <span className="block [font-family:'Playfair_Display',Helvetica] text-[50px] font-normal italic leading-[47px]">
                        clarity and confidence.
                    </span>
                </h2>
            </div>

            <div
                className="absolute left-0 right-0 top-[155.02px] flex flex-col items-start pb-[0.625px]"
                data-name="Container"
                data-node-id="80:1556"
            >
                <p
                    className="m-0 w-full max-w-[576px] [font-family:'Poppins',Helvetica] text-base font-light leading-normal text-[#060606]"
                    data-node-id="80:1557"
                >
                    Search in your language and currency preferences, understand what a fair price looks like, and navigate every step
                    with data driven clarity.
                </p>
            </div>

            <div className="absolute left-0 right-0 top-[227.65px] flex flex-col items-start" data-name="List" data-node-id="80:1558">
                <ServicesFeatureCards dataNodeId="80:1558-cards" items={BUY_FEATURE_CARDS} />
            </div>

            <div
                className="absolute left-0 right-0 top-[682.56px] flex h-[51.59px] flex-wrap items-start gap-x-3 gap-y-0"
                data-name="Container"
                data-node-id="80:1601"
            >
                <Link
                    to="/signup"
                    className="relative flex shrink-0 items-stretch self-stretch rounded-2xl bg-[#10575c] px-[26px] pb-[14.09px] pt-[13.5px] no-underline"
                    data-name="Link"
                    data-node-id="80:1602"
                >
                    <span
                        className="flex flex-col justify-center whitespace-nowrap text-base text-white [font-family:'Poppins',Helvetica] font-semibold leading-normal"
                        data-node-id="80:1603"
                    >
                        Explore Buyer Tools →
                    </span>
                </Link>
                <Link
                    to="/pricing"
                    className="relative flex shrink-0 items-stretch self-stretch rounded-2xl border border-solid border-[#e1e1e1] px-[21px] pb-[14.09px] pt-[13.5px] no-underline"
                    data-name="Link"
                    data-node-id="80:1604"
                >
                    <span
                        className="flex flex-col justify-center whitespace-nowrap [font-family:'Poppins',Helvetica] text-base font-light leading-normal text-[#060606]"
                        data-node-id="80:1605"
                    >
                        View Pricing
                    </span>
                </Link>
            </div>

            <div className="absolute left-0 right-0 top-[750.15px] h-[62.19px]" data-name="Container" data-node-id="80:1606">
                <div className="absolute bottom-[0.08px] left-[108px] top-[34.52px] flex flex-col items-start rounded-full border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1" data-name="Background+Border" data-node-id="80:1607">
                    <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]" data-node-id="80:1608">
                        Intelligence search
                    </p>
                </div>
                <div className="absolute bottom-[34.6px] left-[83.27px] top-0 flex flex-col items-start rounded-full border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1" data-name="Background+Border" data-node-id="80:1609">
                    <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]" data-node-id="80:1610">
                        IPM Score
                    </p>
                </div>
                <div className="absolute bottom-[34.6px] left-[169.66px] top-0 flex flex-col items-start rounded-full border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1" data-name="Background+Border" data-node-id="80:1611">
                    <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]" data-node-id="80:1612">
                        Smart Vault AI
                    </p>
                </div>
                <div className="absolute bottom-[34.6px] left-[267.33px] top-0 flex flex-col items-start rounded-full border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1" data-name="Background+Border" data-node-id="80:1613">
                    <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]" data-node-id="80:1614">
                        3D walkthroughs
                    </p>
                </div>
                <div className="absolute bottom-[34.6px] left-[376.38px] top-0 flex flex-col items-start rounded-full border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1" data-name="Background+Border" data-node-id="80:1615">
                    <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]" data-node-id="80:1616">
                        Mortgage pre-qual
                    </p>
                </div>
                <div className="absolute bottom-0 left-0 top-[34.6px] flex flex-col items-start rounded-full border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1" data-name="Background+Border" data-node-id="80:1617">
                    <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]" data-node-id="80:1618">
                        Comparison tool
                    </p>
                </div>
                <div className="absolute bottom-[34.67px] left-0 top-[-0.48px] flex w-[78px] flex-col items-start rounded-full border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1" data-name="Background+Border" data-node-id="80:1619">
                    <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]" data-node-id="80:1620">
                        ROI Insights
                    </p>
                </div>
                <div className="absolute bottom-[0.08px] left-[227px] top-[34.52px] flex flex-col items-start rounded-full border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1" data-name="Background+Border" data-node-id="80:1621">
                    <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]" data-node-id="80:1622">
                        Live Market Insights
                    </p>
                </div>
                <div className="absolute bottom-[0.08px] left-[352px] top-[34.52px] flex flex-col items-start rounded-full border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1" data-name="Background+Border" data-node-id="80:1623">
                    <p className="m-0 whitespace-nowrap [font-family:'Jost',Helvetica] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]" data-node-id="80:1624">
                        Live Market Insights
                    </p>
                </div>
            </div>
        </div>
    );
}

/** Stacked layout &lt; lg (same content, fluid type) */
function BuyerCopyMobile() {
    return (
        <div className="flex w-full max-w-[512px] flex-col lg:hidden">
            <p className="m-0 uppercase tracking-[2px] [font-family:'Jost',Helvetica] text-[10px] font-semibold leading-4 text-[#c2c3c3]">
                Buy + Rent
            </p>
            <h2 className="mt-9 mb-0 text-[#060606]">
                <span className="block [font-family:'Poppins',Helvetica] text-[clamp(2rem,8vw,3.125rem)] font-extralight not-italic leading-tight">
                    Find property with
                </span>
                <span className="mt-0 block [font-family:'Playfair_Display',Helvetica] text-[clamp(2rem,8vw,3.125rem)] font-normal italic leading-tight">
                    clarity and confidence.
                </span>
            </h2>
            <p className="mt-6 m-0 [font-family:'Poppins',Helvetica] text-base font-light leading-normal text-[#060606]">
                Search in your language and currency preferences, understand what a fair price looks like, and navigate every step with
                data driven clarity.
            </p>
            <div className="mt-8 flex flex-col">
                <ServicesFeatureCards dataNodeId="80:1558-cards-mobile" items={BUY_FEATURE_CARDS} />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
                <Link
                    to="/signup"
                    className="inline-flex items-center rounded-2xl bg-[#10575c] px-[26px] pb-[14.09px] pt-[13.5px] no-underline [font-family:'Poppins',Helvetica] text-base font-semibold text-white"
                >
                    Explore Buyer Tools →
                </Link>
                <Link
                    to="/pricing"
                    className="inline-flex items-center rounded-2xl border border-solid border-[#e1e1e1] px-[21px] pb-[14.09px] pt-[13.5px] no-underline [font-family:'Poppins',Helvetica] text-base font-light text-[#060606]"
                >
                    View Pricing
                </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
                {[
                    'ROI Insights',
                    'IPM Score',
                    'Smart Vault AI',
                    '3D walkthroughs',
                    'Mortgage pre-qual',
                    'Comparison tool',
                    'Intelligence search',
                    'Live Market Insights',
                    'Live Market Insights',
                ].map((label, i) => (
                    <span
                        key={`${label}-${i}`}
                        className="inline-flex rounded-full border border-solid border-[#e1e1e1] bg-white px-3 pb-[5.59px] pt-1 [font-family:'Jost',Helvetica] text-[11px] font-medium leading-[17.6px] text-[#c2c3c3]"
                    >
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
}

/**
 * Figma 80:1478 — full-bleed section; content width matches MODULE 1 (agents) & MODULE 3 (investors): 1248px max.
 * Figma 80:1479 — two-column grid, gap 72, py 100; copy col 1, mockup col 2 (same pattern as 80:1301 / 80:1626).
 */
export default function ServicesSectionModuleUyVnk() {
    return (
        <section
            id="services-section-buy-rent"
            className="w-full border-t border-solid border-[#e1e1e1] bg-white"
            aria-labelledby="services-buyer-module-heading"
            data-anima="services-uyVnk-section-module"
            data-name="Section - MODULE 2: BUYERS"
            data-node-id="80:1478"
        >
            <div
                className="mx-auto grid w-full max-w-[1248px] grid-cols-1 gap-x-[72px] gap-y-[72px] px-[clamp(16px,5vw,52px)] py-[100px] lg:grid-cols-2 lg:items-center"
                data-name="Container"
                data-node-id="80:1479"
            >
                <div className="min-w-0 justify-self-stretch">
                    <BuyerCopyMobile />
                    <BuyerCopyDesktop />
                </div>
                <div className="flex w-full justify-center lg:min-h-[700px] lg:justify-end lg:self-center">
                    <SmartSearchSmartVaultMockup />
                </div>
            </div>
        </section>
    );
}
