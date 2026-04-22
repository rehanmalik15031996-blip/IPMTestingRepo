import React from 'react';
import { Link } from 'react-router-dom';

/** Figma node 80:2651 — closing section background. */
const imgSectionClosing = '/img/services-icons/closing-texture.svg';

const CLOSING_RADIAL_GRADIENT_STYLE = {
    backgroundImage:
        "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 1920 631.05\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"none\"><rect x=\"0\" y=\"0\" height=\"100%\" width=\"100%\" fill=\"url(%23grad)\" opacity=\"1\"/><defs><radialGradient id=\"grad\" gradientUnits=\"userSpaceOnUse\" cx=\"0\" cy=\"0\" r=\"10\" gradientTransform=\"matrix(80 0 0 40 960 315.52)\"><stop stop-color=\"rgba(184,147,74,0.05)\" offset=\"0\"/><stop stop-color=\"rgba(184,147,74,0)\" offset=\"0.65\"/></radialGradient></defs></svg>')",
};

/**
 * Section — CLOSING (Figma 80:2651). Placed before Get in Touch on Services.
 */
export default function ServicesSectionClosing2651() {
    return (
        <section
            className="relative flex w-full flex-col items-center bg-ipm-green px-[clamp(16px,5vw,52px)] py-12 lg:py-[100px]"
            data-name="Section - CLOSING"
            data-node-id="80:2651"
            data-anima="services-closing-2651"
            aria-labelledby="services-closing-2651-heading"
        >
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <img alt="" className="absolute size-full max-w-none object-cover opacity-20" src={imgSectionClosing} />
                <div className="absolute inset-0" style={CLOSING_RADIAL_GRADIENT_STYLE} />
            </div>

            <div
                className="relative z-[1] flex w-full max-w-[660px] flex-col items-center text-center"
                data-name="Container"
                data-node-id="80:2653"
            >
                <div className="flex w-full flex-col items-center" data-name="Container" data-node-id="80:2654">
                    <p
                        className="m-0 whitespace-nowrap text-center font-['Jost',sans-serif] text-[10px] font-semibold uppercase leading-4 tracking-[2.8px] text-white"
                        data-node-id="80:2655"
                    >
                        Ready to Begin
                    </p>
                </div>

                <h2
                    id="services-closing-2651-heading"
                    className="mt-8 m-0 w-full max-w-[560px] text-center font-['Playfair_Display',serif] text-[clamp(2rem,6vw,52px)] font-normal leading-[1.06] text-white [&_*]:font-['Playfair_Display',serif]"
                    data-name="Heading 2"
                    data-node-id="80:2656"
                >
                    <span className="block not-italic" data-node-id="80:2657">
                        Not a listing site.
                    </span>
                    <span className="mt-1 block not-italic" data-node-id="80:2658">
                        <span className="text-white not-italic">An </span>
                        <span className="italic text-[#ffc801]" data-name="Emphasis" data-node-id="80:2659">
                            <span data-node-id="80:2660">intelligent operating</span>
                        </span>
                    </span>
                    <span className="block not-italic">
                        <span className="italic text-[#ffc801]" data-node-id="80:2661">
                            system
                        </span>
                        <span className="text-[#edf4f0] not-italic" data-node-id="80:2662">
                            {' '}
                            for property.
                        </span>
                    </span>
                </h2>

                <div
                    className="mt-8 flex w-full max-w-[500px] flex-col items-center px-4 sm:px-10"
                    data-name="Container"
                    data-node-id="80:2663"
                >
                    <p
                        className="m-0 text-center font-['Poppins',sans-serif] text-base font-light not-italic leading-normal text-white"
                        data-node-id="80:2664"
                    >
                        IPM uses intelligent systems to simplify complex property decisions, automate repetitive
                        workflows and surface opportunities across global markets.
                    </p>
                </div>

                <div
                    className="mt-8 flex w-full flex-col items-center justify-center gap-3.5 sm:flex-row"
                    data-name="Container"
                    data-node-id="80:2665"
                >
                    <Link
                        to="/signup"
                        className="inline-flex items-center justify-center rounded-2xl bg-[#ffc801] px-8 py-3.5 no-underline font-['Poppins',sans-serif] text-base font-semibold not-italic text-[#060606]"
                        data-name="Link"
                        data-node-id="80:2666"
                    >
                        <span data-node-id="80:2667">Get Started Free →</span>
                    </Link>
                    <a
                        href="#home-section-contact"
                        className="inline-flex items-center justify-center rounded-2xl border border-solid border-[rgba(255,255,255,0.16)] bg-transparent px-[27px] py-[15px] no-underline font-['Poppins',sans-serif] text-base font-light not-italic text-white"
                        data-name="Link"
                        data-node-id="80:2668"
                    >
                        <span data-node-id="80:2669">Talk to the Team</span>
                    </a>
                </div>

                <div className="mt-6 flex w-full flex-col items-center" data-name="Container" data-node-id="80:2670">
                    <p
                        className="m-0 whitespace-pre text-center font-['Jost',sans-serif] text-[11.5px] font-normal leading-[18.4px] tracking-[0.3px] text-[rgba(245,240,232,0.25)]"
                        data-node-id="80:2671"
                    >
                        No credit card required  ·  Free trial available  ·  Cancel anytime
                    </p>
                </div>
            </div>
        </section>
    );
}
