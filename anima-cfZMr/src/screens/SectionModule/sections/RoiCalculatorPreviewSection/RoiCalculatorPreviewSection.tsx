export const RoiCalculatorPreviewSection = (): JSX.Element => {
  const inputCards = [
    {
      label: "PURCHASE PRICE",
      value: "R 2,400,000",
      row: "row-[1_/_2]",
      col: "col-[1_/_2]",
    },
    {
      label: "YOUR DEPOSIT",
      value: "R 480,000",
      row: "row-[1_/_2]",
      col: "col-[2_/_3]",
    },
    {
      label: "MONTHLY RENT",
      value: "R 18,500",
      row: "row-[2_/_3]",
      col: "col-[1_/_2]",
    },
    {
      label: "LOAN TERM",
      value: "20 years",
      row: "row-[2_/_3]",
      col: "col-[2_/_3]",
    },
  ];

  const offMarketListings = [
    {
      title: "Sea Point Apartment",
      subtitle: "Studio · 45m² · +11.2% ROI · IPM 9.4",
      timer: "⏱ 24hr exclusive — ends 09:00 tomorrow",
      showTimer: true,
    },
    {
      title: "Dubai Marina Studio",
      subtitle: "40m² · 9.8% rental yield · AED 720K · IPM 9.6",
      timer: null,
      showTimer: false,
    },
  ];

  return (
    <div className="relative row-[1_/_2] col-[2_/_3] self-center w-full h-fit flex flex-col items-start bg-ipm-grey rounded-[18px] overflow-hidden border border-solid border-[#ffffff1a] shadow-[0px_6px_20px_#1c171014,0px_20px_64px_#1c171024]">
      <div className="flex h-10 items-center gap-[7px] px-3.5 py-0 relative self-stretch w-full bg-[#ffffff08] border-b [border-bottom-style:solid] border-[#ffffff12]">
        <div className="relative w-2 h-2 bg-[#ff5f57] rounded" />
        <div className="bg-[#ffbd2e] relative w-2 h-2 rounded" />
        <div className="bg-[#28c840] relative w-2 h-2 rounded" />
        <div className="flex flex-col min-w-[101.56px] items-center px-[167.72px] py-0 relative flex-1 grow">
          <div className="inline-flex flex-col items-start relative flex-[0_0_auto] ml-[-0.22px] mr-[-0.22px]">
            <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-[#f3f3f3] text-[10px] tracking-[0] leading-4 whitespace-nowrap">
              myIPM — ROI Simulator
            </div>
          </div>
        </div>
      </div>

      <div className="relative self-stretch w-full h-[666px] bg-[#f3f3f3]">
        <div className="flex flex-col w-[calc(100%_-_36px)] items-start absolute top-[17px] left-[18px]">
          <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-black text-[9px] tracking-[0.70px] leading-[14.4px] whitespace-nowrap">
            💰 LIVE ROI CALCULATOR
          </div>
        </div>

        <div className="grid grid-cols-2 grid-rows-[61.19px_61.19px] w-[calc(100%_-_36px)] h-[129px] gap-[7px] absolute top-[42px] left-[18px]">
          {inputCards.map((card) => (
            <div
              key={card.label}
              className={`relative ${card.row} ${card.col} w-full h-fit flex items-start gap-[3px] pt-[9px] pb-2.5 px-3 bg-white rounded-[10px] border-[#ffffff14] flex-col border border-solid`}
            >
              <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-ipm-grey text-[9px] tracking-[0.50px] leading-[14.4px]">
                  {card.label}
                </div>
              </div>
              <div className="flex flex-col items-start pt-0 pb-[0.8px] px-0 relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative flex items-center self-stretch mt-[-1.00px] font-semantic-link font-[number:var(--semantic-link-font-weight)] text-ipm-green text-[length:var(--semantic-link-font-size)] tracking-[var(--semantic-link-letter-spacing)] leading-[var(--semantic-link-line-height)] [font-style:var(--semantic-link-font-style)]">
                  {card.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute w-[calc(100%_-_36px)] top-[182px] left-[18px] h-[98px] flex bg-[#1db88014] rounded-xl border-[#1db88038] flex-col border border-solid">
          <div className="flex ml-[17px] mr-[17px] flex-1 max-h-[15px] relative mt-3.5 flex-col w-[440px] items-center">
            <div className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-green text-[9px] text-center tracking-[0.80px] leading-[14.4px] whitespace-nowrap">
              YOUR MONTHLY PROFIT
            </div>
          </div>

          <div className="flex ml-[17px] mr-[17px] flex-1 max-h-[26px] relative mt-[6.4px] flex-col w-[440px] items-center">
            <div className="relative flex items-center justify-center w-fit mt-[-1.00px] font-playfair-display-regular font-[number:var(--playfair-display-regular-font-weight)] text-ipm-green text-[length:var(--playfair-display-regular-font-size)] text-center tracking-[var(--playfair-display-regular-letter-spacing)] leading-[var(--playfair-display-regular-line-height)] whitespace-nowrap [font-style:var(--playfair-display-regular-font-style)]">
              + R 4,300
            </div>
          </div>

          <div className="flex ml-[17px] mr-[17px] flex-1 max-h-4 relative mt-1 flex-col w-[440px] items-center">
            <p className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-white text-[10px] text-center tracking-[0] leading-4 whitespace-nowrap">
              After bond, levies, rates &amp; management fees
            </p>
          </div>
        </div>

        <div className="flex flex-col w-[calc(100%_-_36px)] items-start absolute top-[289px] left-[18px]">
          <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-regular-upper font-[number:var(--jost-regular-upper-font-weight)] text-[#f5f0e84c] text-[length:var(--jost-regular-upper-font-size)] tracking-[var(--jost-regular-upper-letter-spacing)] leading-[var(--jost-regular-upper-line-height)] whitespace-nowrap [font-style:var(--jost-regular-upper-font-style)]">
            5-YEAR CAPITAL OUTLOOK
          </div>
        </div>

        <div className="absolute w-[calc(100%_-_36px)] top-[313px] left-[18px] h-[93px] overflow-hidden">
          <img
            className="absolute w-[99.99%] h-[94.55%] top-[5.45%] left-0"
            alt="Vector"
            src="/img/vector-19.svg"
          />
          <img
            className="absolute w-[99.99%] h-[94.55%] top-[5.45%] left-0"
            alt="Vector"
            src="/img/vector-20.svg"
          />
          <div className="absolute w-[5.06%] h-[18.26%] top-[85.45%] left-0 [font-family:'Jost',Helvetica] font-normal text-[#ffffff33] text-[11.8px] tracking-[0] leading-[normal]">
            Now
          </div>
          <div className="absolute w-[6.75%] h-[18.26%] top-[85.45%] left-[69.64%] [font-family:'Jost',Helvetica] font-normal text-[#ffffff33] text-[11.8px] tracking-[0] leading-[normal]">
            Year 5
          </div>
          <div className="absolute w-[21.10%] h-[20.41%] top-[-3.55%] left-[62.45%] [font-family:'Poppins',Helvetica] font-bold text-ipm-green text-[12.7px] tracking-[0] leading-[normal]">
            R 3.82M (+59%)
          </div>
          <img
            className="absolute w-0 h-full top-0 left-[98.92%]"
            alt="Vector"
            src="/img/vector-21.svg"
          />
        </div>

        <div className="flex w-[calc(100%_-_36px)] items-start px-3.5 py-2.5 absolute top-[416px] left-[18px] bg-ipm-green rounded-[10px] border-[#b8934a33] flex-col border border-solid">
          <div className="flex items-start gap-1 relative self-stretch w-full flex-[0_0_auto]">
            <div className="relative w-4 h-4 aspect-[1] bg-[url(/img/vector-6.svg)] bg-[100%_100%]">
              <img
                className="absolute w-[87.50%] h-[81.25%] top-[18.75%] left-[12.50%]"
                alt="Vector"
                src="/img/vector-22.svg"
              />
              <img
                className="absolute w-[87.50%] h-[71.88%] top-[28.12%] left-[12.50%]"
                alt="Vector"
                src="/img/vector-23.svg"
              />
              <img
                className="absolute w-[37.50%] h-[71.88%] top-[28.12%] left-[62.50%]"
                alt="Vector"
                src="/img/vector-24.svg"
              />
            </div>
            <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-ipm-orange text-[10px] tracking-[0] leading-4 whitespace-nowrap">
              {" "}
              Annual return: 9.25%
            </div>
          </div>
          <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
            <p className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-grey text-[10px] tracking-[0] leading-4">
              Based on current market data, Cape Town
            </p>
          </div>
        </div>

        <div className="flex flex-col w-[calc(100%_-_36px)] items-start absolute top-[479px] left-[18px]">
          <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-regular-upper font-[number:var(--jost-regular-upper-font-weight)] text-ipm-green text-[length:var(--jost-regular-upper-font-size)] tracking-[var(--jost-regular-upper-letter-spacing)] leading-[var(--jost-regular-upper-line-height)] whitespace-nowrap [font-style:var(--jost-regular-upper-font-style)]">
            ⚡ OFF-MARKET EARLY ACCESS
          </div>
        </div>

        <div className="absolute w-[calc(100%_-_36px)] top-[501px] left-[18px] h-20 flex bg-ipm-green rounded-[10px] border-[#b8a0fa2e] flex-col border border-solid">
          <div className="flex ml-[15px] mr-[15px] flex-1 max-h-[19px] relative mt-[11px] w-[444px] items-center gap-[268.6px] pr-[5.68e-14px] pl-0 py-0">
            <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
              <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-semibold font-[number:var(--jost-semibold-font-weight)] text-[#f8faf9] text-[length:var(--jost-semibold-font-size)] tracking-[var(--jost-semibold-letter-spacing)] leading-[var(--jost-semibold-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-font-style)]">
                Sea Point Apartment
              </div>
            </div>
            <div className="inline-flex flex-col items-start pt-px pb-[2.39px] px-[7px] relative flex-[0_0_auto] mr-[-5.60px] bg-[#b8a0fa1f] rounded">
              <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-[#f8faf9] text-[9px] tracking-[0] leading-[14.4px] whitespace-nowrap">
                OFF-MARKET
              </div>
            </div>
          </div>

          <div className="flex ml-[15px] mr-[15px] flex-1 max-h-4 relative mt-[3.4px] flex-col w-[444px] items-start">
            <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-grey text-[10px] tracking-[0] leading-4 whitespace-nowrap">
              Studio · 45m² · +11.2% ROI · IPM 9.4
            </p>
          </div>

          <div className="flex ml-[15px] mr-[15px] flex-1 max-h-4 relative mt-[3px] flex-col w-[444px] items-start">
            <p className="relative flex items-center w-fit mt-[-1.00px] font-jost-regular font-[number:var(--jost-regular-font-weight)] text-ipm-orange text-[length:var(--jost-regular-font-size)] tracking-[var(--jost-regular-letter-spacing)] leading-[var(--jost-regular-line-height)] whitespace-nowrap [font-style:var(--jost-regular-font-style)]">
              ⏱ 24hr exclusive — ends 09:00 tomorrow
            </p>
          </div>
        </div>

        <div className="flex w-[calc(100%_-_36px)] items-start gap-1 px-3.5 py-2.5 absolute top-[588px] left-[18px] bg-ipm-green rounded-[10px] border-[#b8a0fa2e] flex-col border border-solid">
          <div className="flex items-center justify-between pr-[5.68e-14px] pl-0 py-0 relative self-stretch w-full flex-[0_0_auto]">
            <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
              <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-semibold font-[number:var(--jost-semibold-font-weight)] text-[#f8faf9] text-[length:var(--jost-semibold-font-size)] tracking-[var(--jost-semibold-letter-spacing)] leading-[var(--jost-semibold-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-font-style)]">
                Dubai Marina Studio
              </div>
            </div>
            <div className="pt-px pb-[2.39px] px-[7px] relative flex-[0_0_auto] bg-[#b8a0fa1f] rounded inline-flex flex-col items-start">
              <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-[#f8faf9] text-[9px] tracking-[0] leading-[14.4px] whitespace-nowrap">
                OFF-MARKET
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
            <p className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-grey text-[10px] tracking-[0] leading-4">
              40m² · 9.8% rental yield · AED 720K · IPM 9.6
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
