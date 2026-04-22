export const CmaReportPreviewSection = (): JSX.Element => {
  const statsData = [
    { value: "R 3.2M", label: "EST. VALUE" },
    { value: "8.7", label: "IPM SCORE™" },
    { value: "6", label: "COMPARABLES" },
  ];

  const salesData = [
    { label: "SALE 1", price: "R 3.1M", daysAgo: "142 days ago" },
    { label: "SALE 2", price: "R 3.05M", daysAgo: "89 days ago" },
    { label: "SALE 3", price: "R 2.88M", daysAgo: "201 days ago" },
  ];

  const metricsData = [
    { label: "Vs Market Avg", width: "72.00%", value: "72" },
    { label: "IPM Score™", width: "87.00%", value: "87" },
  ];

  const leadsData = [
    {
      name: "M. Rodrigues",
      details: "3-bed · Cascais · €480k",
      badgeText: "HOT",
      badgeBg: "bg-[#ff505024]",
      badgeTextColor: "text-[#ff8080]",
      score: "94",
      scoreColor: "text-[#1db880]",
      borderColor: "border-ipm-light-grey",
    },
    {
      name: "S. Van Wyk",
      details: "Villa · Marbella · €1.2M",
      badgeText: "WARM",
      badgeBg: "bg-[#b8934a1f]",
      badgeTextColor: "text-[#d4af6a]",
      score: "81",
      scoreColor: "text-[#d4af6a]",
      borderColor: "border-ipm-grey",
    },
  ];

  return (
    <div className="relative row-[1_/_2] col-[2_/_3] self-center w-full h-[728px] flex flex-col items-start bg-white rounded-[18px] overflow-hidden border border-solid border-ipm-grey shadow-[0px_6px_20px_#1c171014,0px_20px_64px_#1c171024]">
      <div className="flex h-10 items-center gap-[7px] px-3.5 py-0 relative self-stretch w-full bg-ipm-light-grey border-b [border-bottom-style:solid] border-ipm-light-grey">
        <div className="relative w-2 h-2 bg-[#ff5f57] rounded" />
        <div className="relative w-2 h-2 bg-[#ffbd2e] rounded" />
        <div className="relative w-2 h-2 bg-[#28c840] rounded" />

        <div className="flex flex-col w-[311.22px] items-center px-[83.88px] py-0 relative">
          <div className="inline-flex flex-col items-start relative flex-[0_0_auto] ml-[-17.26px] mr-[-17.26px]">
            <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-[#78736d] text-[10px] tracking-[0] leading-4 whitespace-nowrap">
              app.ipm.com/agency/cma-builder
            </div>
          </div>
        </div>

        <div className="flex flex-col w-[118.75px] items-end pl-[83.88px] pr-0 py-0 relative">
          <div className="inline-flex flex-col items-start pt-px pb-[2.39px] px-[7px] relative flex-[0_0_auto] ml-[-1.12px] bg-[#1db8801f] rounded border border-solid border-[#1db88040]">
            <div className="relative flex items-center w-fit font-jost-bold font-[number:var(--jost-bold-font-weight)] text-[#1db880] text-[length:var(--jost-bold-font-size)] tracking-[var(--jost-bold-letter-spacing)] leading-[var(--jost-bold-line-height)] whitespace-nowrap [font-style:var(--jost-bold-font-style)]">
              LIVE
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-4 px-[18px] py-[17px] relative self-stretch w-full flex-[0_0_auto]">
        <div className="flex flex-col w-[479px] items-start relative flex-[0_0_auto] mr-[-0.50px]">
          <div className="relative flex items-center w-fit mt-[-1.00px] font-playfair-display-italic font-[number:var(--playfair-display-italic-font-weight)] [font-style:var(--playfair-display-italic-font-style)] text-ipm-black text-[length:var(--playfair-display-italic-font-size)] tracking-[var(--playfair-display-italic-letter-spacing)] leading-[var(--playfair-display-italic-line-height)] whitespace-nowrap">
            CMA Report Builder
          </div>
        </div>

        <div className="grid grid-cols-3 grid-rows-[58.39px] w-[479px] h-[58.39px] gap-2">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="relative w-full h-fit flex flex-col items-center gap-0.5 p-2.5 bg-[#f3f3f3] rounded-[10px] border border-solid border-[#ffffff12] shadow-[1px_3px_3px_#0000001a]"
            >
              <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative flex items-center self-stretch mt-[-1.00px] font-playfair-display-regular font-[number:var(--playfair-display-regular-font-weight)] text-ipm-black text-[length:var(--playfair-display-regular-font-size)] tracking-[var(--playfair-display-regular-letter-spacing)] leading-[var(--playfair-display-regular-line-height)] [font-style:var(--playfair-display-regular-font-style)]">
                  {stat.value}
                </div>
              </div>
              <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-grey text-[9px] tracking-[0.50px] leading-[14.4px]">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col w-[479px] items-start relative flex-[0_0_auto] mr-[-0.50px]">
          <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-[#f5f0e84c] text-[9px] tracking-[0.70px] leading-[14.4px] whitespace-nowrap">
            COMPARABLE SALES — LAST 90 DAYS
          </p>
        </div>

        <div className="grid grid-cols-3 grid-rows-[69.97px] w-[479px] h-[69.97px] gap-1.5">
          {salesData.map((sale, index) => (
            <div
              key={index}
              className="relative w-full h-[69.97px] bg-[#f3f3f3] rounded-lg border border-solid border-[#ffffff12]"
            >
              <div className="flex flex-col w-[calc(100%_-_22px)] items-center absolute top-2 left-[11px]">
                <div className="relative flex items-center justify-center w-fit mt-[-1.00px] font-jost-regular-upper font-[number:var(--jost-regular-upper-font-weight)] text-[#f5f0e861] text-[length:var(--jost-regular-upper-font-size)] text-center tracking-[var(--jost-regular-upper-letter-spacing)] leading-[var(--jost-regular-upper-line-height)] whitespace-nowrap [font-style:var(--jost-regular-upper-font-style)]">
                  {sale.label}
                </div>
              </div>
              <div className="flex flex-col w-[calc(100%_-_22px)] items-center absolute top-[26px] left-[11px]">
                <div className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-ipm-green text-xs text-center tracking-[0] leading-[19.2px] whitespace-nowrap">
                  {sale.price}
                </div>
              </div>
              <div className="flex flex-col w-[calc(100%_-_22px)] items-center absolute top-[46px] left-[11px]">
                <div className="relative flex items-center justify-center w-fit mt-[-1.00px] font-jost-regular font-[number:var(--jost-regular-font-weight)] text-[#f5f0e84c] text-[length:var(--jost-regular-font-size)] text-center tracking-[var(--jost-regular-letter-spacing)] leading-[var(--jost-regular-line-height)] whitespace-nowrap [font-style:var(--jost-regular-font-style)]">
                  {sale.daysAgo}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col w-[479px] items-start gap-1 relative flex-[0_0_auto] mr-[-0.50px]">
          {metricsData.map((metric, index) => (
            <div
              key={index}
              className="flex items-center gap-2 relative self-stretch w-full flex-[0_0_auto]"
            >
              <div className="flex flex-col w-[100px] items-start relative">
                <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-black text-[10px] tracking-[0] leading-4 whitespace-nowrap">
                  {metric.label}
                </div>
              </div>
              <div className="relative flex-1 grow h-[3px] bg-[#ffffff0f] rounded-[100px] overflow-hidden">
                <div
                  className="h-full rounded-[100px] bg-[linear-gradient(90deg,rgba(29,184,128,1)_0%,rgba(134,239,172,1)_100%)]"
                  style={{ width: metric.width }}
                />
              </div>
              <div className="flex flex-col w-5 items-end relative">
                <div className="relative flex items-center justify-end w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-[#1db880] text-[10px] text-right tracking-[0] leading-4 whitespace-nowrap">
                  {metric.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex w-[479px] items-center justify-between pt-[9px] pb-2.5 px-3.5 relative flex-[0_0_auto] mr-[-0.50px] bg-ipm-light-grey rounded-[10px] border border-solid border-ipm-grey">
          <div className="inline-flex flex-col items-start gap-0.5 relative flex-[0_0_auto]">
            <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
              <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-grey text-[9px] tracking-[0.70px] leading-[14.4px] whitespace-nowrap">
                REPORT READY
              </div>
            </div>
            <div className="flex flex-col items-start pt-0 pb-[0.8px] px-0 relative self-stretch w-full flex-[0_0_auto]">
              <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-ipm-green text-[13px] tracking-[0] leading-[20.8px] whitespace-nowrap">
                Branded PDF — 8 seconds
              </p>
            </div>
          </div>
          <div className="inline-flex flex-col items-center justify-center px-[9px] py-1 relative flex-[0_0_auto] bg-ipm-green rounded-md">
            <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-white text-[9px] tracking-[0] leading-[14.4px] whitespace-nowrap">
              YOUR BRAND
            </div>
          </div>
        </div>

        <div className="flex flex-col w-[479px] items-start relative flex-[0_0_auto] mr-[-0.50px]">
          <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-grey text-[9px] tracking-[0.70px] leading-[14.4px] whitespace-nowrap">
            HOT LEADS RIGHT NOW
          </div>
        </div>

        {leadsData.map((lead, index) => (
          <div
            key={index}
            className={`flex w-[479px] items-center justify-between pt-[5px] pb-1.5 px-0 relative flex-[0_0_auto] mr-[-0.50px] border-b [border-bottom-style:solid] ${lead.borderColor}`}
          >
            <div className="inline-flex flex-col items-start gap-[1.46e-13px] relative flex-[0_0_auto]">
              <div className="flex flex-col items-start pt-0 pb-[0.59px] px-0 relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-ipm-black text-[11px] tracking-[0] leading-[17.6px] whitespace-nowrap">
                  {lead.name}
                </div>
              </div>
              <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-grey text-[10px] tracking-[0] leading-4 whitespace-nowrap">
                  {lead.details}
                </p>
              </div>
            </div>

            <div
              className={`pt-px pb-[2.39px] px-[7px] relative flex-[0_0_auto] ${lead.badgeBg} rounded inline-flex flex-col items-start`}
            >
              <div
                className={`relative flex items-center w-fit mt-[-1.00px] font-jost-bold font-[number:var(--jost-bold-font-weight)] ${lead.badgeTextColor} text-[length:var(--jost-bold-font-size)] tracking-[var(--jost-bold-letter-spacing)] leading-[var(--jost-bold-line-height)] whitespace-nowrap [font-style:var(--jost-bold-font-style)]`}
              >
                {lead.badgeText}
              </div>
            </div>

            <div className="inline-flex flex-col items-start pt-0 pb-[0.59px] px-0 relative flex-[0_0_auto]">
              <div
                className={`w-fit [font-family:'Poppins',Helvetica] font-bold ${lead.scoreColor} text-[11px] leading-[17.6px] whitespace-nowrap relative flex items-center mt-[-1.00px] tracking-[0]`}
              >
                {lead.score}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
