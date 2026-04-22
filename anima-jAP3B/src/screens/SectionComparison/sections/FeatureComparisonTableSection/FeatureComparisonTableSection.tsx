export const FeatureComparisonTableSection = (): JSX.Element => {
  const tableRows = [
    {
      feature: "Inbound leads from own listings",
      listingPortals: "Paid per lead",
      crmTools: "Not included",
      ipmPlatform: "$0\u00a0\u00a0- Every lead, yours",
    },
    {
      feature: "AI-powered lead scoring",
      listingPortals: "✗",
      crmTools: "Limited",
      ipmPlatform: "✓ Fully intelligence-driven",
    },
    {
      feature: "Global buyer reach (60+ countries)",
      listingPortals: "Some markets",
      crmTools: "✗",
      ipmPlatform: "✓ Live across all markets",
    },
    {
      feature: "IPM Score™ & market intelligence",
      listingPortals: "✗",
      crmTools: "✗",
      ipmPlatform: "✓ Exclusive to IPM",
    },
    {
      feature: "Branded CMA Report Builder",
      listingPortals: "✗",
      crmTools: "Basic",
      ipmPlatform: "✓ On-demand, fully branded",
    },
    {
      feature: "Smart Vault document AI",
      listingPortals: "✗",
      crmTools: "✗",
      ipmPlatform: "✓ Included",
    },
    {
      feature: "Partner collaboration workspace",
      listingPortals: "✗",
      crmTools: "✗",
      ipmPlatform: "✓ Built-in",
    },
    {
      feature: "ROI & yield simulator",
      listingPortals: "✗",
      crmTools: "✗",
      ipmPlatform: "✓ Real-time AI modelling",
    },
    {
      feature: "Investor portfolio tracking",
      listingPortals: "✗",
      crmTools: "✗",
      ipmPlatform: "✓ Full module",
    },
    {
      feature: "White-label / API integration",
      listingPortals: "✗",
      crmTools: "Limited",
      ipmPlatform: "✓ 48h go-live",
    },
    {
      feature: "Off-market early access",
      listingPortals: "✗",
      crmTools: "✗",
      ipmPlatform: "✓ 24hr exclusive",
    },
    {
      feature: "Pricing model",
      listingPortals: "Per-listing + fees",
      crmTools: "Per user / month",
      ipmPlatform: "One subscription. Everything.",
      isLast: true,
    },
  ];

  return (
    <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto] bg-[#ffffff01] rounded-[22px] overflow-hidden border border-solid border-white shadow-[0px_1px_4px_#1c17100a,0px_2px_16px_#1c17100f]">
      <div className="flex items-start justify-center relative self-stretch w-full flex-[0_0_auto]">
        <div className="flex flex-col w-[408.27px] items-start px-[18px] py-3.5 relative ml-[-0.50px] bg-white border-b [border-bottom-style:solid] border-ipm-green">
          <div className="relative flex items-center w-fit mt-[-1.00px] font-semantic-cell-upper font-[number:var(--semantic-cell-upper-font-weight)] text-ipm-green text-[length:var(--semantic-cell-upper-font-size)] tracking-[var(--semantic-cell-upper-letter-spacing)] leading-[var(--semantic-cell-upper-line-height)] [font-style:var(--semantic-cell-upper-font-style)]">
            FEATURE
          </div>
        </div>

        <div className="w-[224.58px] bg-white border-ipm-green flex flex-col items-start px-[18px] py-3.5 relative border-b [border-bottom-style:solid]">
          <div className="relative flex items-center w-fit mt-[-1.00px] font-semantic-cell-upper font-[number:var(--semantic-cell-upper-font-weight)] text-ipm-green text-[length:var(--semantic-cell-upper-font-size)] tracking-[var(--semantic-cell-upper-letter-spacing)] leading-[var(--semantic-cell-upper-line-height)] [font-style:var(--semantic-cell-upper-font-style)]">
            LISTING PORTALS
          </div>
        </div>

        <div className="w-[222.64px] bg-white border-ipm-green flex flex-col items-start px-[18px] py-3.5 relative border-b [border-bottom-style:solid]">
          <div className="relative flex items-center w-fit mt-[-1.00px] font-semantic-cell-upper font-[number:var(--semantic-cell-upper-font-weight)] text-ipm-green text-[length:var(--semantic-cell-upper-font-size)] tracking-[var(--semantic-cell-upper-letter-spacing)] leading-[var(--semantic-cell-upper-line-height)] [font-style:var(--semantic-cell-upper-font-style)]">
            CRM TOOLS
          </div>
        </div>

        <div className="w-[239.52px] mr-[-0.50px] bg-ipm-yellow flex flex-col items-start px-[18px] py-3.5 relative border-b [border-bottom-style:solid] border-ipm-yellow">
          <div className="relative flex items-center w-fit mt-[-1.00px] font-semantic-cell-upper font-[number:var(--semantic-cell-upper-font-weight)] text-ipm-green text-[length:var(--semantic-cell-upper-font-size)] tracking-[var(--semantic-cell-upper-letter-spacing)] leading-[var(--semantic-cell-upper-line-height)] [font-style:var(--semantic-cell-upper-font-style)]">
            IPM PLATFORM
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
        {tableRows.map((row, index) => (
          <div
            key={index}
            className="flex items-start justify-center relative self-stretch w-full flex-[0_0_auto]"
          >
            <div
              className={`flex flex-col w-[408.27px] items-start px-[18px] ${row.isLast ? "py-[12.5px]" : "py-3"} relative ml-[-0.50px] ${!row.isLast ? "border-b [border-bottom-style:solid] border-white" : ""}`}
            >
              <div className="relative flex items-center w-fit mt-[-1.00px] font-semantic-button font-[number:var(--semantic-button-font-weight)] text-white text-[length:var(--semantic-button-font-size)] tracking-[var(--semantic-button-letter-spacing)] leading-[var(--semantic-button-line-height)] [font-style:var(--semantic-button-font-style)]">
                {row.feature}
              </div>
            </div>

            <div
              className={`w-[224.58px] px-[18px] ${row.isLast ? "py-[12.5px]" : "py-3"} ${!row.isLast ? "border-b [border-bottom-style:solid] border-white" : ""} opacity-55 flex flex-col items-start relative`}
            >
              <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-white text-[13px] tracking-[0] leading-[normal]">
                {row.listingPortals}
              </div>
            </div>

            <div
              className={`w-[222.64px] px-[18px] ${row.isLast ? "py-[12.5px]" : "py-3"} ${!row.isLast ? "border-b [border-bottom-style:solid] border-white" : ""} opacity-55 flex flex-col items-start relative`}
            >
              <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-white text-[13px] tracking-[0] leading-[normal]">
                {row.crmTools}
              </div>
            </div>

            <div
              className={`w-[239.52px] pl-[17px] pr-4 ${row.isLast ? "py-[12.5px]" : "py-3"} mr-[-0.50px] bg-[#0b1c130a] ${!row.isLast ? "border-b [border-bottom-style:solid]" : ""} border-l-2 [border-left-style:solid] border-white flex flex-col items-start relative`}
            >
              <div className="relative flex items-center w-fit mt-[-2.00px] font-semantic-data font-[number:var(--semantic-data-font-weight)] text-white text-[length:var(--semantic-data-font-size)] tracking-[var(--semantic-data-letter-spacing)] leading-[var(--semantic-data-line-height)] [font-style:var(--semantic-data-font-style)]">
                {row.ipmPlatform}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
