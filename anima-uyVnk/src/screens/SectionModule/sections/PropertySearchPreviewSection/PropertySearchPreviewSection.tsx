export const PropertySearchPreviewSection = (): JSX.Element => {
  const smartVaultItems = [
    {
      type: "success",
      content: (
        <p className="relative flex items-center w-fit [font-family:'Poppins',Helvetica] font-normal text-[#f5f0e8b2] text-[11px] tracking-[0] leading-[16.5px] whitespace-nowrap">
          <span className="[font-family:'Poppins',Helvetica] font-normal text-[#f5f0e8b2] text-[11px] tracking-[0] leading-[16.5px]">
            Occupation date:
          </span>
          <span className="font-jost-regular [font-style:var(--jost-regular-font-style)] font-[number:var(--jost-regular-font-weight)] tracking-[var(--jost-regular-letter-spacing)] leading-[var(--jost-regular-line-height)] text-[length:var(--jost-regular-font-size)]">
            &nbsp;
          </span>
          <span className="font-bold">1 March 2026</span>
          <span className="font-jost-regular [font-style:var(--jost-regular-font-style)] font-[number:var(--jost-regular-font-weight)] tracking-[var(--jost-regular-letter-spacing)] leading-[var(--jost-regular-line-height)] text-[length:var(--jost-regular-font-size)]">
            &nbsp;
          </span>
          <span className="[font-family:'Poppins',Helvetica] font-normal text-[#f5f0e8b2] text-[11px] tracking-[0] leading-[16.5px]">
            — 6 weeks away
          </span>
        </p>
      ),
      bgClass: "bg-[#1db8800f]",
      borderClass: "border border-solid border-[#1db8802e]",
      iconBg: "bg-[#1db88026]",
      iconColor: "text-[#1db880]",
      iconChar: "✓",
      paddingClass: "px-3 py-[9px]",
    },
    {
      type: "warning",
      content: (
        <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-orange text-[11px] tracking-[0] leading-[16.5px] whitespace-nowrap">
          <span className="[font-family:'Poppins',Helvetica] font-normal text-[#ffb21b] text-[11px] tracking-[0] leading-[16.5px]">
            Penalty clause —
          </span>
          <span className="font-bold">
            {" "}
            R 45,000 at risk if deal falls through
          </span>
        </p>
      ),
      bgClass: "bg-[#ffffff0d]",
      borderClass: "",
      iconBg: "bg-[#ef44441f]",
      iconColor: "text-red-400",
      iconChar: "!",
      paddingClass: "pt-2 pb-[9px] px-3",
    },
    {
      type: "success",
      content: (
        <p className="relative flex items-center w-fit [font-family:'Poppins',Helvetica] font-normal text-[#f5f0e8b2] text-[11px] tracking-[0] leading-[16.5px] whitespace-nowrap">
          Fixtures included: stove, dishwasher, curtains
        </p>
      ),
      bgClass: "bg-[#1db8800f]",
      borderClass: "border border-solid border-[#1db8802e]",
      iconBg: "bg-[#1db88026]",
      iconColor: "text-[#1db880]",
      iconChar: "✓",
      paddingClass: "pt-2 pb-[9px] px-3",
    },
    {
      type: "warning",
      content: (
        <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-orange text-[11px] tracking-[0] leading-[16.5px] whitespace-nowrap">
          Voetstoots clause present — ask your agent
        </p>
      ),
      bgClass: "bg-[#ffffff0d]",
      borderClass: "",
      iconBg: "bg-[#ef44441f]",
      iconColor: "text-red-400",
      iconChar: "!",
      paddingClass: "px-3 py-2",
    },
  ];

  return (
    <div className="relative row-[1_/_2] col-[2_/_3] justify-self-end self-center w-full h-[700px] flex flex-col items-start bg-[#f3f3f3] rounded-[18px] overflow-hidden border border-solid border-ipm-light-grey shadow-[0px_6px_20px_#1c171014,0px_20px_64px_#1c171024]">
      <div className="flex h-10 items-center gap-[7px] px-3.5 py-0 relative self-stretch w-full bg-ipm-light-grey border-b [border-bottom-style:solid] border-ipm-light-grey">
        <div className="relative w-2 h-2 bg-[#ff5f57] rounded" />
        <div className="relative w-2 h-2 bg-[#ffbd2e] rounded" />
        <div className="relative w-2 h-2 bg-[#28c840] rounded" />
        <div className="flex flex-col min-w-[68.59px] items-center px-[184.2px] py-0 relative flex-1 grow">
          <div className="inline-flex flex-col items-start relative flex-[0_0_auto] ml-[-0.20px] mr-[-0.20px]">
            <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-[#78736d] text-[10px] tracking-[0] leading-4 whitespace-nowrap">
              ipm.com/search
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2.5 p-[18px] relative self-stretch w-full flex-[0_0_auto]">
        <div className="flex items-center gap-2 pt-2.5 pb-[11px] px-3.5 relative self-stretch w-full flex-[0_0_auto] bg-[#ffffff12] rounded-[10px] border border-solid border-ipm-grey">
          <div className="inline-flex flex-col items-start pt-0 pb-[0.8px] px-0 relative flex-[0_0_auto] opacity-50">
            <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-[#1a1714] text-[13px] tracking-[0] leading-[20.8px] whitespace-nowrap">
              🔍
            </div>
          </div>

          <div className="flex flex-col items-start relative flex-1 grow">
            <p className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-[#78736d] text-[12.5px] tracking-[0] leading-5">
              3-bed near good schools, Cape Town, under R 3.5M
            </p>
          </div>

          <div className="inline-flex flex-col pt-px pb-[2.39px] px-[7px] flex-[0_0_auto] bg-ipm-light-grey rounded border border-solid border-ipm-grey items-center justify-center relative">
            <div className="relative flex items-center w-fit [font-family:'Poppins',Helvetica] font-bold text-ipm-grey text-[9px] tracking-[0] leading-[14.4px] whitespace-nowrap">
              AI
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
          <p className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-grey text-[10px] tracking-[0] leading-4">
            12 results — sorted by best match for you
          </p>
        </div>

        <div className="justify-between pt-[11px] pb-3 px-3.5 flex items-center relative self-stretch w-full flex-[0_0_auto] bg-ipm-light-grey rounded-[10px]">
          <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
            <div className="flex flex-col items-start pt-0 pb-[0.8px] px-0 relative self-stretch w-full flex-[0_0_auto]">
              <div className="relative flex items-center w-fit mt-[-1.00px] font-semantic-link font-[number:var(--semantic-link-font-weight)] text-[#1a1714] text-[length:var(--semantic-link-font-size)] tracking-[var(--semantic-link-letter-spacing)] leading-[var(--semantic-link-line-height)] whitespace-nowrap [font-style:var(--semantic-link-font-style)]">
                Constantia Heights
              </div>
            </div>

            <div className="flex flex-col items-start pt-0 pb-[0.59px] px-0 relative self-stretch w-full flex-[0_0_auto] -mt-px">
              <p className="[font-family:'Jost',Helvetica] relative flex items-center w-fit mt-[-1.00px] font-normal text-[#78736d] text-[11px] tracking-[0] leading-[17.6px] whitespace-nowrap">
                3 bed · 2 bath · 218m² · Cape Town
              </p>
            </div>

            <div className="flex items-end gap-[5px] pt-[5px] pb-0 px-0 relative self-stretch w-full flex-[0_0_auto] -mt-px">
              <div className="inline-flex flex-col h-[20.39px] items-center justify-center pt-px pb-[2.39px] px-[7px] bg-[#1db88014] rounded border border-solid border-[#1db88038] relative flex-[0_0_auto]">
                <div className="relative flex items-center w-fit [font-family:'Poppins',Helvetica] font-bold text-[#1db880] text-[9px] tracking-[0] leading-[14.4px] whitespace-nowrap">
                  BEST MATCH
                </div>
              </div>

              <div className="inline-flex flex-col h-[20.39px] items-start pt-px pb-[2.39px] px-[7px] bg-[#b8934a1f] rounded border border-solid border-[#b8934a4c] relative flex-[0_0_auto]">
                <div className="[font-family:'Poppins',Helvetica] font-bold text-[9px] leading-[14.4px] relative flex items-center w-fit text-ipm-grey tracking-[0] whitespace-nowrap">
                  IPM 9.1
                </div>
              </div>

              <div className="inline-flex flex-col items-start relative self-stretch flex-[0_0_auto]">
                <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-[#78736d] text-[9px] tracking-[0] leading-[14.4px] whitespace-nowrap">
                  🏫 Top schools
                </div>
              </div>
            </div>
          </div>

          <div className="inline-flex flex-col items-center justify-center gap-[1.81e-13px] relative flex-[0_0_auto]">
            <div className="inline-flex flex-col items-end pt-0 pb-[0.8px] px-0 relative flex-[0_0_auto]">
              <div className="relative flex items-center justify-end w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-[#1a1714] text-[13px] text-right tracking-[0] leading-[20.8px] whitespace-nowrap">
                R 3.2M
              </div>
            </div>

            <div className="inline-flex flex-col items-start justify-center relative flex-[0_0_auto]">
              <div className="relative flex items-center justify-end w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-[#1db880] text-[10px] text-right tracking-[0] leading-4 whitespace-nowrap">
                Fair price ✓
              </div>
            </div>
          </div>
        </div>

        <div className="gap-[287.7px] pt-2 pb-2.5 px-3.5 flex items-center relative self-stretch w-full flex-[0_0_auto] bg-ipm-light-grey rounded-[10px]">
          <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
            <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
              <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-[#1a1714] text-[12.5px] tracking-[0] leading-5 whitespace-nowrap">
                Kenilworth Village
              </div>
            </div>

            <div className="flex flex-col items-start pt-0 pb-[0.59px] px-0 relative self-stretch w-full flex-[0_0_auto] -mt-px">
              <p className="[font-family:'Poppins',Helvetica] relative flex items-center w-fit mt-[-1.00px] font-normal text-[#78736d] text-[11px] tracking-[0] leading-[17.6px] whitespace-nowrap">
                3 bed · 2 bath · 185m²
              </p>
            </div>
          </div>

          <div className="inline-flex flex-col items-start relative flex-[0_0_auto] mr-[-5.70px]">
            <div className="inline-flex flex-col items-end relative flex-[0_0_auto]">
              <div className="relative flex items-center justify-end w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-[#1a1714] text-[12.5px] text-right tracking-[0] leading-5 whitespace-nowrap">
                R 2.95M
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 pt-3.5 pb-[13px] px-[15px] relative self-stretch w-full flex-[0_0_auto] bg-ipm-green rounded-xl border border-solid border-ipm-green">
          <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
            <p className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-ipm-light-grey text-[9px] tracking-[1.50px] leading-[14.4px]">
              🔒 SMART VAULT — OFFER TO PURCHASE
            </p>
          </div>

          {smartVaultItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-start gap-2.5 ${item.paddingClass} self-stretch w-full ${item.bgClass} rounded-[10px] ${item.borderClass} relative flex-[0_0_auto]`}
            >
              <div className="flex flex-col w-5 h-[21px] items-start pt-px pb-0 px-0 relative">
                <div
                  className={`flex w-5 h-5 items-center justify-center pt-[1.5px] pb-[2.5px] px-0 relative ${item.iconBg} rounded-[10px]`}
                >
                  <div
                    className={`relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal ${item.iconColor} text-[10px] text-center tracking-[0] leading-4 whitespace-nowrap`}
                  >
                    {item.iconChar}
                  </div>
                </div>
              </div>
              {item.content}
            </div>
          ))}

          <div className="flex flex-col items-start pt-0 pb-[0.59px] px-0 relative self-stretch w-full flex-[0_0_auto]">
            <p className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-[#1db880] text-[11px] tracking-[0] leading-[17.6px]">
              AI reviewed 28 clauses · 2 flagged for your attention
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
