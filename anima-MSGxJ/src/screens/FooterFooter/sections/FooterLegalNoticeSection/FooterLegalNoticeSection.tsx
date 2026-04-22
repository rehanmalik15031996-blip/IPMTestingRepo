export const FooterLegalNoticeSection = (): JSX.Element => {
  const legalLinks = [{ label: "Terms" }, { label: "Privacy" }];

  return (
    <div className="flex flex-wrap items-center gap-[0px_272.3px] pt-[19px] pb-0 px-0 relative self-stretch w-full flex-[0_0_auto] border-t [border-top-style:solid] border-[#ffffff0f]">
      <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
        <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-ipm-light-grey text-xs tracking-[0] leading-[19.2px] whitespace-nowrap">
          © 2026 International Property Market. All rights reserved.
        </p>
      </div>

      <div className="inline-flex flex-col items-start pt-0 pb-[0.59px] px-0 relative flex-[0_0_auto]">
        <p className="relative flex items-center w-fit mt-[-1.00px] font-jost-regular font-[number:var(--jost-regular-font-weight)] text-ipm-light-grey text-[length:var(--jost-regular-font-size)] tracking-[var(--jost-regular-letter-spacing)] leading-[var(--jost-regular-line-height)] whitespace-nowrap [font-style:var(--jost-regular-font-style)]">
          {" "}
          GDPR Compliant · No Data Shared
        </p>
      </div>

      <div className="inline-flex items-start gap-[22px] relative flex-[0_0_auto]">
        {legalLinks.map((link) => (
          <div
            key={link.label}
            className="inline-flex flex-col items-start relative self-stretch flex-[0_0_auto]"
          >
            <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-[#f5f0e838] text-xs tracking-[0] leading-[19.2px] whitespace-nowrap">
              {link.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
