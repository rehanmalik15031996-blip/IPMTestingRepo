import React from 'react';

const DIVIDER_STYLE = {
    backgroundImage:
        'linear-gradient(90deg, rgba(184, 147, 74, 0) 0%, rgba(184, 147, 74, 0.3) 33.333%, rgba(184, 147, 74, 0.3) 66.667%, rgba(184, 147, 74, 0) 100%)',
};

/**
 * Section — HOW IT WORKS (Figma IPM-Final-Designs 80:2104 + full child tree 80:2105–80:2145).
 */
export default function ServicesSectionHowItWorksB8p91() {
    return (
        <section
            className="relative w-full bg-[#e1e1e1] py-[100px] max-md:py-16"
            aria-labelledby="services-how-it-works-heading"
            data-anima="services-b8p91-how-it-works"
            data-name="Section - HOW IT WORKS"
            data-node-id="80:2104"
        >
            <div
                className="relative mx-auto flex w-full max-w-[1200px] shrink-0 flex-col items-center gap-[56px] px-[clamp(16px,5vw,52px)]"
                data-name="Container"
                data-node-id="80:2105"
            >
                    <div
                        className="relative flex w-full shrink-0 flex-col items-center gap-[14.86px] text-center"
                        data-name="Container"
                        data-node-id="80:2106"
                    >
                        <div
                            className="relative flex w-full shrink-0 flex-col items-center"
                            data-name="Container"
                            data-node-id="80:2107"
                        >
                            <div
                                className="relative flex shrink-0 flex-col justify-center text-center text-[10px] font-semibold uppercase leading-[0] tracking-[2.8px] text-[#6f7f78] [font-family:'Jost',Helvetica] whitespace-nowrap"
                                data-node-id="80:2108"
                            >
                                <p className="m-0 leading-4">How IPM Works</p>
                            </div>
                        </div>
                        <div
                            className="relative flex w-full shrink-0 flex-col items-center"
                            data-name="Heading 2"
                            data-node-id="80:2109"
                        >
                            <h2
                                id="services-how-it-works-heading"
                                className="relative m-0 flex shrink-0 flex-col justify-center text-center text-[0px] font-normal leading-[0] text-[#1a1714] whitespace-nowrap [font-family:'Playfair_Display',Helvetica]"
                                data-node-id="80:2110"
                            >
                                <span className="mb-0 block font-extralight not-italic leading-[45.36px] text-[#1a1714] text-[50px] [font-family:'Poppins',Helvetica]">
                                    Three steps from confused
                                </span>
                                <span className="block italic leading-[45.36px] text-[#1a1714] text-[50px] [font-family:'Playfair_Display',Helvetica]">
                                    to confident.
                                </span>
                            </h2>
                        </div>
                    </div>

                    <div
                        className="relative grid h-auto w-full shrink-0 grid-cols-1 gap-x-[22px] gap-y-[22px] max-md:auto-rows-auto md:h-[378.23px] md:grid-cols-[repeat(3,minmax(0,1fr))] md:grid-rows-[minmax(0,378.23px)]"
                        data-name="Container"
                        data-node-id="80:2111"
                    >
                        <div
                            className="absolute left-[198.58px] right-[198.58px] top-[30px] hidden h-px md:block"
                            data-name="Horizontal Divider"
                            data-node-id="80:2112"
                            style={DIVIDER_STYLE}
                            aria-hidden
                        />

                        <article
                            className="relative col-span-1 row-span-1 h-[378.23px] shrink-0 rounded-[30px] border border-solid border-white bg-white"
                            data-name="Background+Border"
                            data-node-id="80:2113"
                            aria-labelledby="how-step-1-title"
                        >
                            <div
                                className="absolute left-[28px] right-[28.01px] top-[30.14px] flex flex-col items-center pb-[0.8px]"
                                data-name="Container"
                                data-node-id="80:2116"
                            >
                                <div
                                    className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-solid border-[#d6e0db] bg-[#f0f6f4] text-[18px] leading-[0] text-[#10575c]"
                                    data-node-id="80:2117"
                                >
                                    <i className="fas fa-search" aria-hidden="true" />
                                </div>
                            </div>
                            <div
                                className="absolute left-[28px] right-[28.01px] top-[89.14px] flex flex-col items-center"
                                data-name="Container"
                                data-node-id="80:2118"
                            >
                                <div
                                    id="how-step-1-title"
                                    role="heading"
                                    aria-level={3}
                                    className="relative flex shrink-0 flex-col justify-center text-center text-[24px] font-semibold not-italic leading-[0] text-[#10575c] [font-family:'Poppins',Helvetica] whitespace-nowrap"
                                    data-node-id="80:2119"
                                >
                                    <p className="m-0 leading-[normal]">Tell us what you need</p>
                                </div>
                            </div>
                            <div
                                className="absolute left-[28px] right-[28.01px] top-[167.44px] flex flex-col items-center"
                                data-name="Container"
                                data-node-id="80:2120"
                            >
                                <div
                                    className="relative flex w-[257px] max-w-full shrink-0 flex-col justify-center text-center text-[16px] font-light not-italic leading-[0] text-[#060606] [font-family:'Poppins',Helvetica]"
                                    data-node-id="80:2121"
                                >
                                    <p className="m-0 leading-[normal]">
                                        In plain English. A home near good schools, an investment with 10% returns, whatever
                                        your goal, IPM starts there.
                                    </p>
                                </div>
                            </div>
                            <div
                                className="absolute left-[124px] top-[315.14px] flex items-start justify-center rounded-[100px] border border-solid border-[#e1e1e1] bg-white px-[14px] py-[5px] max-md:left-1/2 max-md:max-w-[calc(100%-2rem)] max-md:-translate-x-1/2"
                                data-name="Overlay+Border"
                                data-node-id="80:2122"
                            >
                                <div
                                    className="relative flex shrink-0 flex-col justify-center text-center text-[10px] font-semibold uppercase leading-[0] tracking-[1.5px] text-[#c2c3c3] [font-family:'Jost',Helvetica] whitespace-nowrap"
                                    data-node-id="80:2123"
                                >
                                    <p className="m-0 leading-4">No jargon</p>
                                </div>
                            </div>
                        </article>

                        <article
                            className="relative col-span-1 row-span-1 h-[378.23px] shrink-0 rounded-[30px] border border-solid border-white bg-white"
                            data-name="Background+Border"
                            data-node-id="80:2124"
                            aria-labelledby="how-step-2-title"
                        >
                            <div
                                className="absolute left-[28px] right-[28px] top-[30.14px] flex flex-col items-center pb-[0.8px]"
                                data-name="Container"
                                data-node-id="80:2127"
                            >
                                <div
                                    className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-solid border-[#d6e0db] bg-[#f0f6f4] text-[18px] leading-[0] text-[#10575c]"
                                    data-node-id="80:2128"
                                >
                                    <i className="fas fa-brain" aria-hidden="true" />
                                </div>
                            </div>
                            <div
                                className="absolute left-[28px] right-[28px] top-[89.14px] flex flex-col items-center"
                                data-name="Container"
                                data-node-id="80:2129"
                            >
                                <div
                                    id="how-step-2-title"
                                    role="heading"
                                    aria-level={3}
                                    className="relative flex shrink-0 flex-col justify-center text-center text-[24px] font-semibold not-italic leading-[0] text-[#10575c] [font-family:'Poppins',Helvetica] whitespace-nowrap"
                                    data-node-id="80:2130"
                                >
                                    <p className="m-0 whitespace-pre leading-[normal]">{`IPM Intelligence `}</p>
                                    <p className="m-0 whitespace-pre leading-[normal]">does the heavy lifting</p>
                                </div>
                            </div>
                            <div
                                className="absolute left-[28px] right-[28px] top-[166.96px] flex flex-col items-center"
                                data-name="Container"
                                data-node-id="80:2131"
                            >
                                <div
                                    className="relative flex w-[272px] max-w-full shrink-0 flex-col justify-center text-center text-[16px] font-light not-italic leading-[0] text-[#060606] [font-family:'Poppins',Helvetica]"
                                    data-node-id="80:2132"
                                >
                                    <p className="m-0 leading-[normal]">
                                        IPM analyses millions of data points across four markets, runs the numbers, reads
                                        the documents, and highlights exactly what matters, in seconds.
                                    </p>
                                </div>
                            </div>
                            <div
                                className="absolute left-[106.33px] top-[314.14px] flex items-start justify-center rounded-[100px] border border-solid border-[#e1e1e1] bg-white px-[14px] py-[5px] max-md:left-1/2 max-md:max-w-[calc(100%-2rem)] max-md:-translate-x-1/2"
                                data-name="Overlay+Border"
                                data-node-id="80:2133"
                            >
                                <div
                                    className="relative flex shrink-0 flex-col justify-center text-center text-[10px] font-semibold uppercase leading-[0] tracking-[1.5px] text-[#c2c3c3] [font-family:'Jost',Helvetica] whitespace-nowrap"
                                    data-node-id="80:2134"
                                >
                                    <p className="m-0 leading-4">40+ data points</p>
                                </div>
                            </div>
                        </article>

                        <article
                            className="relative col-span-1 row-span-1 h-[378.23px] shrink-0 rounded-[30px] border border-solid border-white bg-white"
                            data-name="Background+Border"
                            data-node-id="80:2135"
                            aria-labelledby="how-step-3-title"
                        >
                            <div
                                className="absolute left-[28px] right-[28.01px] top-[30.14px] flex flex-col items-center pb-[0.8px]"
                                data-name="Container"
                                data-node-id="80:2138"
                            >
                                <div
                                    className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-solid border-[#d6e0db] bg-[#f0f6f4] text-[18px] leading-[0] text-[#10575c]"
                                    data-node-id="80:2139"
                                >
                                    <i className="fas fa-bullseye" aria-hidden="true" />
                                </div>
                            </div>
                            <div
                                className="absolute left-[28px] right-[28.01px] top-[89.14px] flex flex-col items-center"
                                data-name="Container"
                                data-node-id="80:2140"
                            >
                                <div
                                    id="how-step-3-title"
                                    role="heading"
                                    aria-level={3}
                                    className="relative flex shrink-0 flex-col justify-center text-center text-[24px] font-semibold not-italic leading-[0] text-[#10575c] [font-family:'Poppins',Helvetica] whitespace-nowrap"
                                    data-node-id="80:2141"
                                >
                                    <p className="m-0 leading-[normal]">Decide with certainty</p>
                                </div>
                            </div>
                            <div
                                className="absolute left-[28px] right-[28.01px] top-[167.14px] flex flex-col items-center"
                                data-name="Container"
                                data-node-id="80:2142"
                            >
                                <div
                                    className="relative flex w-[293px] max-w-full shrink-0 flex-col justify-center text-center text-[16px] font-light not-italic leading-[0] text-[#060606] [font-family:'Poppins',Helvetica]"
                                    data-node-id="80:2143"
                                >
                                    <p className="mb-0 mt-0 leading-[normal]">
                                        Every recommendation comes with the data to back it up. No guessing, no confusion,
                                        just clear,
                                    </p>
                                    <p className="m-0 mt-0 leading-[normal]">
                                        actionable insight that helps you act fast and act right.
                                    </p>
                                </div>
                            </div>
                            <div
                                className="absolute left-[92.48px] top-[312.14px] flex items-start justify-center rounded-[100px] border border-solid border-[#e1e1e1] bg-white px-[14px] py-[5px] max-md:left-1/2 max-md:max-w-[calc(100%-2rem)] max-md:-translate-x-1/2"
                                data-name="Overlay+Border"
                                data-node-id="80:2144"
                            >
                                <div
                                    className="relative flex shrink-0 flex-col justify-center text-center text-[10px] font-semibold uppercase leading-[0] tracking-[1.5px] text-[#c2c3c3] [font-family:'Jost',Helvetica] whitespace-nowrap"
                                    data-node-id="80:2145"
                                >
                                    <p className="m-0 leading-4">Always data-backed</p>
                                </div>
                            </div>
                        </article>
                    </div>
            </div>
        </section>
    );
}
