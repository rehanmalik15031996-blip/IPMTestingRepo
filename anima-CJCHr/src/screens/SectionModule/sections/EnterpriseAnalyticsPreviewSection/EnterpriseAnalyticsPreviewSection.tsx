export const EnterpriseAnalyticsPreviewSection = (): JSX.Element => {
  const marketData = [
    { region: "Dubai, UAE", width: "94.00%", score: "9.4" },
    { region: "South Africa", width: "88.00%", score: "8.8" },
    { region: "Netherlands", width: "82.00%", score: "8.2" },
    { region: "United States", width: "79.00%", score: "7.9" },
  ];

  const statsData = [
    { value: "R 4.2B", label: "PORTFOLIO VALUE" },
    { value: "+12.4%", label: "YOY GROWTH" },
    { value: "340", label: "UNDER MGMT" },
  ];

  return (
    <div className="relative row-[1_/_2] col-[2_/_3] self-center w-full h-fit flex flex-col items-start bg-ipm-light-grey rounded-[18px] overflow-hidden border border-solid border-ipm-grey shadow-[0px_6px_20px_#1c171014,0px_20px_64px_#1c171024]">
      <div className="flex h-10 items-center gap-[7px] px-3.5 py-0 relative self-stretch w-full bg-ipm-light-grey border-b [border-bottom-style:solid] border-ipm-grey">
        <div className="relative w-2 h-2 bg-[#ff5f57] rounded" />
        <div className="relative w-2 h-2 bg-[#ffbd2e] rounded" />
        <div className="relative w-2 h-2 bg-[#28c840] rounded" />

        <div className="flex flex-col w-[294.81px] items-center px-[66.86px] py-0 relative">
          <div className="inline-flex flex-col items-start relative flex-[0_0_auto] ml-[-0.45px] mr-[-0.45px]">
            <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-[#78736d] text-[10px] tracking-[0] leading-4 whitespace-nowrap">
              enterprise.ipm.com/portfolio/analytics
            </div>
          </div>
        </div>

        <div className="flex flex-col w-[135.19px] items-end pl-[66.86px] pr-0 py-0 relative">
          <div className="inline-flex items-center justify-center pt-px pb-[2.39px] px-[7px] flex-[0_0_auto] ml-[-2.67px] bg-[#60a5fa1f] rounded border border-solid border-ipm-grey flex-col relative">
            <div className="relative flex items-center w-fit [font-family:'Jost',Helvetica] font-bold text-ipm-green text-[9px] tracking-[0] leading-[14.4px] whitespace-nowrap">
              ENTERPRISE
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-4 p-6 relative self-stretch w-full flex-[0_0_auto] bg-[#f3f3f3]">
        <div className="flex w-[474px] items-center justify-between pr-[5.68e-14px] pl-0 py-0 relative flex-[0_0_auto] mr-[-12.00px]">
          <div className="inline-flex flex-col items-start gap-[3px] relative flex-[0_0_auto]">
            <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
              <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-black text-[9px] tracking-[0.70px] leading-[14.4px] whitespace-nowrap">
                GLOBAL PORTFOLIO OVERVIEW — Q4 2025
              </p>
            </div>

            <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
              <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-ipm-black text-sm tracking-[0] leading-[22.4px] whitespace-nowrap">
                Enterprise Analytics
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 relative flex-[0_0_auto]">
            <div className="relative w-1.5 h-1.5 bg-ipm-orange rounded-[3px]" />
            <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
              <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-black text-[10px] tracking-[0] leading-4 whitespace-nowrap">
                7 markets live
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-[55.39px] items-center gap-2 relative self-stretch w-full shadow-[1px_3px_3px_#0000001a]">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="flex items-start gap-0.5 p-2.5 flex-1 grow bg-white rounded-[10px] border border-solid border-[#ffffff12] flex-col relative"
            >
              <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative flex items-center self-stretch mt-[-1.00px] font-playfair-display-regular font-[number:var(--playfair-display-regular-font-weight)] text-ipm-green text-[length:var(--playfair-display-regular-font-size)] tracking-[var(--playfair-display-regular-letter-spacing)] leading-[var(--playfair-display-regular-line-height)] [font-style:var(--playfair-display-regular-font-style)]">
                  {stat.value}
                </div>
              </div>

              <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                <div className="flex items-center self-stretch text-ipm-grey text-[9px] tracking-[0.50px] leading-[14.4px] relative mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col w-[474px] items-start relative flex-[0_0_auto] mr-[-12.00px]">
          <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-black text-[9px] tracking-[0.70px] leading-[14.4px] whitespace-nowrap">
            MARKET DEMAND INDEX — BY REGION
          </p>
        </div>

        {marketData.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2.5 relative self-stretch w-full flex-[0_0_auto]"
          >
            <div className="flex flex-col w-[110px] items-start pt-0 pb-[0.59px] px-0 relative">
              <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-green text-[11px] tracking-[0] leading-[17.6px] whitespace-nowrap">
                {item.region}
              </div>
            </div>

            <div className="relative flex-1 grow h-1.5 bg-white rounded-[100px] overflow-hidden">
              <div
                className="h-full rounded-[100px] bg-[linear-gradient(90deg,rgba(16,87,92,1)_0%,rgba(255,200,2,1)_100%)]"
                style={{ width: item.width }}
              />
            </div>

            <div className="flex flex-col w-7 items-end pt-0 pb-[0.59px] px-0 relative">
              <div className="relative flex items-center justify-end w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-ipm-green text-[11px] text-right tracking-[0] leading-[17.6px] whitespace-nowrap">
                {item.score}
              </div>
            </div>
          </div>
        ))}

        <div className="flex w-[474px] items-start gap-0.5 pt-[9px] pb-2.5 px-3.5 flex-[0_0_auto] mr-[-12.00px] bg-ipm-grey rounded-[10px] flex-col relative">
          <div className="flex items-start relative self-stretch w-full flex-[0_0_auto]">
            <div className="relative w-4 h-4 aspect-[1] bg-[url(/img/vector-3.svg)] bg-[100%_100%]">
              <img
                className="absolute w-[96.86%] h-[93.74%] top-[6.26%] left-[3.14%]"
                alt="Vector stroke"
                src="/img/vector-stroke.svg"
              />
            </div>

            <p className="relative flex items-center w-fit mt-[-1.00px] font-jost-bold font-[number:var(--jost-bold-font-weight)] text-ipm-green text-[length:var(--jost-bold-font-size)] tracking-[var(--jost-bold-letter-spacing)] leading-[var(--jost-bold-line-height)] whitespace-nowrap [font-style:var(--jost-bold-font-style)]">
              {" "}
              Custom API Data Feed Active
            </p>
          </div>

          <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
            <p className="relative flex items-center self-stretch mt-[-1.00px] font-jost-regular font-[number:var(--jost-regular-font-weight)] text-ipm-green text-[length:var(--jost-regular-font-size)] tracking-[var(--jost-regular-letter-spacing)] leading-[var(--jost-regular-line-height)] [font-style:var(--jost-regular-font-style)]">
              Live data flowing to 3 connected systems · GDPR compliant
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
