import React from 'react';
import { Link } from 'react-router-dom';

/**
 * FOUNDING + PRICING — structure and styles from Figma IPM-Final-Designs node 80:2684.
 * Interactive frames are `Link`; heading uses semantic h2 (Figma used a div + p).
 */
export default function ServicesFoundingPricing0ScTO() {
    return (
        <section
            className="relative w-full"
            aria-labelledby="founding-pricing-heading"
            data-anima="services-0ScTO-founding-pricing"
        >
            <div
                className="relative grid size-full w-full grid-cols-[minmax(0,1fr)_143.05px] gap-x-[60px] gap-y-[60px] border-b border-t border-solid border-[rgba(196,154,60,0.2)] bg-[#10575c] px-[60px] py-[57px]"
                data-name="FOUNDING + PRICING"
                data-node-id="80:2684"
            >
                <div
                    className="relative col-1 row-1 shrink-0 justify-self-stretch self-center"
                    data-name="Container"
                    data-node-id="80:2685"
                >
                    <div className="relative flex w-full flex-col items-start gap-[10px] border-0 border-solid border-transparent bg-clip-padding">
                        <div
                            className="relative flex w-full shrink-0 flex-col items-start"
                            data-name="Heading 3"
                            data-node-id="80:2686"
                        >
                            <h2
                                id="founding-pricing-heading"
                                className="relative m-0 flex w-full shrink-0 flex-col justify-center text-[30px] font-bold leading-[0] text-[#f5f0e8] [font-family:'Playfair_Display',Helvetica]"
                                data-node-id="80:2687"
                            >
                                <span className="leading-[normal]">
                                    <span className="[font-family:'Poppins',Helvetica] font-light not-italic leading-[normal]">
                                        {`Founding Agency Programme — `}
                                    </span>
                                    <span className="[font-family:'Playfair_Display',Helvetica] text-[#ffc801] font-normal italic leading-[normal]">
                                        Limited spots available
                                    </span>
                                </span>
                            </h2>
                        </div>

                        <div
                            className="relative flex w-full shrink-0 flex-col items-start"
                            data-name="Container"
                            data-node-id="80:2688"
                        >
                            <div
                                className="relative flex w-full shrink-0 flex-col justify-center text-[16px] font-light not-italic leading-[0] text-white [font-family:'Poppins',Helvetica]"
                                data-node-id="80:2689"
                            >
                                <p className="m-0 leading-[normal]">
                                    Lock in founding pricing, get featured placement at launch, and co-market with IPM as your partner.
                                </p>
                            </div>
                        </div>

                        <div
                            className="relative flex w-full shrink-0 flex-wrap content-start items-start gap-x-[14px] gap-y-0 pt-[10px]"
                            data-name="Container"
                            data-node-id="80:2690"
                        >
                            <Link
                                to="/signup"
                                className="relative flex shrink-0 items-center justify-center rounded-[9px] bg-[#ffc801] px-[28px] py-[15px] no-underline"
                                data-name="Button"
                                data-node-id="80:2691"
                            >
                                <span
                                    className="relative flex shrink-0 flex-col justify-center text-center text-[16px] font-semibold leading-[0] tracking-[0.28px] text-[#04342c] whitespace-nowrap [font-family:'Poppins',Helvetica]"
                                    data-node-id="80:2692"
                                >
                                    <span className="leading-[normal]">Claim Founding Spot →</span>
                                </span>
                            </Link>
                            <Link
                                to="/pricing"
                                className="relative flex shrink-0 items-center justify-center rounded-[9px] border border-solid border-[rgba(245,240,232,0.25)] px-[25px] py-[15px] no-underline"
                                data-name="Button"
                                data-node-id="80:2693"
                            >
                                <span
                                    className="relative flex shrink-0 flex-col justify-center text-center text-[16px] font-light not-italic leading-[0] text-[#edf4f0] whitespace-nowrap [font-family:'Poppins',Helvetica]"
                                    data-node-id="80:2694"
                                >
                                    <span className="leading-[normal]">See All Pricing</span>
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
