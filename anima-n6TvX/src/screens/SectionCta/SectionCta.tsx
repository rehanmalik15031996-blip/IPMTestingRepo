export const SectionCta = (): JSX.Element => {
  return (
    <div
      className="flex flex-col h-[636px] items-start px-[630px] py-[120px] relative overflow-hidden bg-[url(/img/section-cta.jpg)] bg-cover bg-[50%_50%]"
      data-model-id="67:995"
    >
      <div className="absolute w-full h-full top-0 left-0 [background:radial-gradient(50%_50%_at_50%_50%,rgba(184,147,74,0.05)_0%,rgba(184,147,74,0)_65%)]" />

      <div className="flex flex-col max-w-[660px] items-center gap-[11.1px] relative w-full flex-[0_0_auto] mb-[-0.10px]">
        <div className="flex-col self-stretch w-full flex items-center relative flex-[0_0_auto]">
          <div className="relative flex items-center justify-center w-fit mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-white text-[length:var(--jost-semibold-upper-font-size)] text-center tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-upper-font-style)]">
            READY TO BEGIN
          </div>
        </div>

        <div className="flex-col self-stretch w-full flex items-center relative flex-[0_0_auto]">
          <p className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-transparent text-[50px] text-center tracking-[0] leading-[50px]">
            <span className="font-[number:var(--IPM-poppins-light-heading-font-weight)] text-[#edf4f0] font-IPM-poppins-light-heading [font-style:var(--IPM-poppins-light-heading-font-style)] tracking-[var(--IPM-poppins-light-heading-letter-spacing)] leading-[var(--IPM-poppins-light-heading-line-height)] text-[length:var(--IPM-poppins-light-heading-font-size)]">
              Turn your real estate
              <br />
              goals into
            </span>

            <span className="[font-family:'Playfair_Display',Helvetica] text-[#edf4f0] text-[54px] leading-[57.2px]">
              &nbsp;
            </span>

            <span className="font-semantic-heading-2 [font-style:var(--semantic-heading-2-font-style)] text-[#ffc802] text-[length:var(--semantic-heading-2-font-size)] leading-[var(--semantic-heading-2-line-height)] font-[number:var(--semantic-heading-2-font-weight)] tracking-[var(--semantic-heading-2-letter-spacing)]">
              Reality.
            </span>
          </p>
        </div>

        <div className="flex-col max-w-[480px] w-[480px] pt-[6.9px] pb-0 px-0 flex items-center relative flex-[0_0_auto]">
          <p className="relative w-fit mt-[-1.00px] ml-[-31.50px] mr-[-31.50px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-white text-[length:var(--IPM-poppins-light-copy-font-size)] text-center tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
            Whether you&#39;re looking to buy, sell or invest — our team and
            platform
            <br />
            are here to guide you every step of the way across all global
            <br />
            markets.
          </p>
        </div>

        <div className="flex-wrap justify-center gap-[0px_14.01px] pt-[28.9px] pb-0 px-0 self-stretch w-full flex items-center relative flex-[0_0_auto]">
          <button className="inline-flex items-center justify-center px-[34px] py-[15px] relative flex-[0_0_auto] bg-white rounded-[14px] cursor-pointer hover:bg-gray-100 transition-colors">
            <span className="relative flex items-center justify-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-copy font-[number:var(--IPM-poppins-semibold-copy-font-weight)] text-ipm-green text-[length:var(--IPM-poppins-semibold-copy-font-size)] text-center tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] leading-[var(--IPM-poppins-semibold-copy-line-height)] [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
              Explore All Services →
            </span>
          </button>

          <button className="inline-flex items-center justify-center px-[26px] py-[15px] relative flex-[0_0_auto] rounded-[14px] border border-solid border-[#ffffffcc] cursor-pointer hover:bg-white/10 transition-colors">
            <span className="relative flex items-center justify-center w-fit font-IPM-poppins-semibold-copy font-[number:var(--IPM-poppins-semibold-copy-font-weight)] text-white text-[length:var(--IPM-poppins-semibold-copy-font-size)] text-center tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] leading-[var(--IPM-poppins-semibold-copy-line-height)] [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
              Talk to the Team
            </span>
          </button>
        </div>

        <div className="flex-col pt-[4.9px] pb-0 px-0 self-stretch w-full flex items-center relative flex-[0_0_auto]">
          <p className="relative flex items-center justify-center w-fit mt-[-1.00px] font-jost-regular font-[number:var(--jost-regular-font-weight)] text-[#f5f0e842] text-[length:var(--jost-regular-font-size)] text-center tracking-[var(--jost-regular-letter-spacing)] leading-[var(--jost-regular-line-height)] whitespace-nowrap [font-style:var(--jost-regular-font-style)]">
            No credit card required · Free trial available · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
};
