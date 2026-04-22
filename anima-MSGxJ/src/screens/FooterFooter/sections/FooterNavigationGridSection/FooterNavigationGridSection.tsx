export const FooterNavigationGridSection = (): JSX.Element => {
  const socialLinks = ["IG", "FB", "TK", "LI", "YT"];

  const resourceLinks = [
    "Calculators",
    "Property Guides",
    "Pricing Guides",
    "Tier Guides",
    "IPM Academy",
  ];

  const searchLinks = [
    "Homes for Sale",
    "Homes for Rent",
    "Commercial",
    "Find an Agent",
    "New Developments",
  ];

  const locationLinks = [
    "Dubai, UAE",
    "Netherlands",
    "South Africa",
    "United States",
  ];

  const ipmLinks = [
    "About",
    "Newsletter",
    "Contact Us",
    "Careers",
    "Terms of Service",
    "Privacy",
  ];

  const renderNavLinks = (links: string[]) =>
    links.map((link) => (
      <div
        key={link}
        className="flex flex-col items-start pt-[3px] pb-[1.59px] px-0 relative self-stretch w-full flex-[0_0_auto]"
      >
        <div className="flex w-full items-start relative self-stretch flex-[0_0_auto]">
          <div className="relative flex items-center flex-1 mt-[-1.00px] font-semantic-link font-[number:var(--semantic-link-font-weight)] text-white text-[length:var(--semantic-link-font-size)] tracking-[var(--semantic-link-letter-spacing)] leading-[var(--semantic-link-line-height)] [font-style:var(--semantic-link-font-style)]">
            {link}
          </div>
        </div>
      </div>
    ));

  return (
    <div className="grid grid-cols-[minmax(0,2.20fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] grid-rows-[239.56px] h-fit gap-12">
      <div className="relative row-[1_/_2] col-[1_/_2] w-[320.77px] h-fit flex flex-col items-start gap-[9px] pt-0 pb-[54.93px] px-0">
        <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
          <p className="relative flex items-center self-stretch mt-[-1.00px] font-IPM-poppins-semibold-subheading font-[number:var(--IPM-poppins-semibold-subheading-font-weight)] text-transparent text-[length:var(--IPM-poppins-semibold-subheading-font-size)] tracking-[var(--IPM-poppins-semibold-subheading-letter-spacing)] leading-[var(--IPM-poppins-semibold-subheading-line-height)] [font-style:var(--IPM-poppins-semibold-subheading-font-style)]">
            <span className="text-[#edf4f0] font-IPM-poppins-semibold-subheading [font-style:var(--IPM-poppins-semibold-subheading-font-style)] font-[number:var(--IPM-poppins-semibold-subheading-font-weight)] tracking-[var(--IPM-poppins-semibold-subheading-letter-spacing)] leading-[var(--IPM-poppins-semibold-subheading-line-height)] text-[length:var(--IPM-poppins-semibold-subheading-font-size)]">
              IPM
            </span>
            <span className="text-[#b8934a] font-IPM-poppins-semibold-subheading [font-style:var(--IPM-poppins-semibold-subheading-font-style)] font-[number:var(--IPM-poppins-semibold-subheading-font-weight)] tracking-[var(--IPM-poppins-semibold-subheading-letter-spacing)] leading-[var(--IPM-poppins-semibold-subheading-line-height)] text-[length:var(--IPM-poppins-semibold-subheading-font-size)]">
              .
            </span>
          </p>
        </div>

        <div className="flex flex-col max-w-[215px] w-[215px] items-start relative flex-[0_0_auto]">
          <p className="relative w-fit mt-[-1.00px] font-jost-light font-[number:var(--jost-light-font-weight)] text-white text-[length:var(--jost-light-font-size)] tracking-[var(--jost-light-letter-spacing)] leading-[var(--jost-light-line-height)] [font-style:var(--jost-light-font-style)]">
            The intelligence-driven global property
            <br />
            platform connecting agents, buyers,
            <br />
            investors and partners in one integrated
            <br />
            ecosystem.
          </p>
        </div>

        <div className="flex items-start gap-2 pt-[9px] pb-0 px-0 relative self-stretch w-full flex-[0_0_auto]">
          {socialLinks.map((social) => (
            <div
              key={social}
              className="flex w-8 h-8 items-center justify-center pt-[6.5px] pb-[7.5px] px-0 relative bg-[#ffffff0d] rounded-lg border border-solid border-[#ffffff17]"
            >
              <div className="relative flex items-center justify-center w-fit font-jost-semibold font-[number:var(--jost-semibold-font-weight)] text-[#f5f0e857] text-[length:var(--jost-semibold-font-size)] text-center tracking-[var(--jost-semibold-letter-spacing)] leading-[var(--jost-semibold-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-font-style)]">
                {social}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative row-[1_/_2] col-[2_/_3] w-full h-fit flex flex-col items-start gap-4 pt-0 pb-[43.59px] px-0">
        <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
          <div className="relative flex items-center self-stretch mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-ipm-yellow text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] [font-style:var(--jost-semibold-upper-font-style)]">
            RESOURCES
          </div>
        </div>
        <div className="flex flex-col items-start gap-[9px] relative self-stretch w-full flex-[0_0_auto]">
          {renderNavLinks(resourceLinks)}
        </div>
      </div>

      <div className="relative row-[1_/_2] col-[3_/_4] w-full h-fit flex flex-col items-start gap-4 pt-0 pb-[43.59px] px-0">
        <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
          <div className="relative flex items-center self-stretch mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-ipm-yellow text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] [font-style:var(--jost-semibold-upper-font-style)]">
            SEARCH
          </div>
        </div>
        <div className="flex flex-col items-start gap-[9px] relative self-stretch w-full flex-[0_0_auto]">
          {renderNavLinks(searchLinks)}
        </div>
      </div>

      <div className="relative row-[1_/_2] col-[4_/_5] w-full h-fit flex flex-col items-start gap-4 pt-0 pb-[78.18px] px-0">
        <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
          <div className="relative flex items-center self-stretch mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-ipm-yellow text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] [font-style:var(--jost-semibold-upper-font-style)]">
            LOCATIONS
          </div>
        </div>
        <div className="flex flex-col items-start gap-[9px] relative self-stretch w-full flex-[0_0_auto]">
          {renderNavLinks(locationLinks)}
        </div>
      </div>

      <div className="relative row-[1_/_2] col-[5_/_6] w-full h-fit flex flex-col items-start gap-4 pt-0 pb-[9px] px-0">
        <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
          <div className="self-stretch font-[number:var(--jost-semibold-upper-font-weight)] text-ipm-yellow text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] relative flex items-center mt-[-1.00px] font-jost-semibold-upper [font-style:var(--jost-semibold-upper-font-style)]">
            IPM
          </div>
        </div>
        <div className="flex flex-col items-start gap-[9px] relative self-stretch w-full flex-[0_0_auto]">
          {renderNavLinks(ipmLinks)}
        </div>
      </div>
    </div>
  );
};
