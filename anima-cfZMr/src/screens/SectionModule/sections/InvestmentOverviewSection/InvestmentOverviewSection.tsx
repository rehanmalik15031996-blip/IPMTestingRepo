const featureItems = [
  {
    iconBg: "bg-[url(/img/vector.svg)]",
    iconImages: [
      {
        className: "absolute w-[87.50%] h-[87.50%] top-[12.50%] left-[12.50%]",
        alt: "Vector",
        src: "/img/vector-9.svg",
      },
      {
        className: "absolute w-[70.36%] h-[86.65%] top-[13.35%] left-[29.64%]",
        alt: "Vector",
        src: "/img/vector-1.svg",
      },
      {
        className: "absolute w-[78.37%] h-[79.21%] top-[20.79%] left-[21.63%]",
        alt: "Vector",
        src: "/img/vector-2-2.svg",
      },
      {
        className: "absolute w-[56.25%] h-[46.88%] top-[53.12%] left-[43.75%]",
        alt: "Vector",
        src: "/img/vector-3-2.svg",
      },
    ],
    title: "Global investment discovery",
    description:
      "Identify high-potential properties with IPM Score™ on every result.",
    hasBorder: true,
    gapClass: "gap-px",
  },
  {
    iconBg: "bg-[url(/img/image.svg)]",
    iconImages: [
      {
        className: "absolute w-[87.50%] h-[81.25%] top-[18.75%] left-[12.50%]",
        alt: "Vector",
        src: "/img/vector-4.svg",
      },
      {
        className: "absolute w-[37.50%] h-[28.12%] top-[71.88%] left-[62.50%]",
        alt: "Vector",
        src: "/img/vector-5-2.svg",
      },
      {
        className: "absolute w-[75.00%] h-[28.12%] top-[71.88%] left-[25.00%]",
        alt: "Vector",
        src: "/img/vector-6-2.svg",
      },
      {
        className: "absolute w-[62.50%] h-[53.12%] top-[46.88%] left-[37.50%]",
        alt: "Vector",
        src: "/img/vector-7.svg",
      },
      {
        className: "absolute w-[50.00%] h-[59.38%] top-[40.62%] left-[50.00%]",
        alt: "Vector",
        src: "/img/vector-8.svg",
      },
      {
        className: "absolute w-[37.50%] h-[65.62%] top-[34.38%] left-[62.50%]",
        alt: "Vector",
        src: "/img/vector-9-2.svg",
      },
      {
        className: "absolute w-[50.00%] h-[90.62%] top-[9.38%] left-[50.00%]",
        alt: "Vector",
        src: "/img/vector-10.svg",
      },
    ],
    title: "Live AI ROI & yield simulator",
    description: "Model scenarios: purchase price, deposit, rent, loan term .",
    hasBorder: true,
    gapClass: "gap-px",
  },
  {
    iconBg: "bg-[url(/img/vector-2.svg)]",
    iconImages: [
      {
        className: "flex-1 w-[15px]",
        alt: "Vector",
        src: "/img/vector-11.svg",
      },
    ],
    iconFlex: true,
    title: "Off-market early access",
    description: "Discover selected properties before they reach the market.",
    hasBorder: true,
    gapClass: "gap-px",
  },
  {
    iconBg: "bg-[url(/img/vector-3.svg)]",
    iconImages: [
      {
        className: "absolute w-[81.25%] h-[84.38%] top-[15.62%] left-[18.75%]",
        alt: "Vector",
        src: "/img/vector-12.svg",
      },
      {
        className: "absolute w-[81.25%] h-[78.12%] top-[21.88%] left-[18.75%]",
        alt: "Vector",
        src: "/img/vector-13.svg",
      },
      {
        className: "absolute w-[81.25%] h-[59.38%] top-[40.62%] left-[18.75%]",
        alt: "Vector",
        src: "/img/vector-14.svg",
      },
      {
        className: "absolute w-[81.25%] h-[40.62%] top-[59.38%] left-[18.75%]",
        alt: "Vector",
        src: "/img/vector-15.svg",
      },
    ],
    title: "Market intelligence dashboards",
    description:
      "Track demand signals, pricing trends and emerging investments",
    hasBorder: true,
    gapClass: "gap-[0.99px]",
  },
  {
    iconBg: "bg-[url(/img/vector-5.svg)]",
    iconImages: [
      {
        className: "absolute w-[87.50%] h-[81.25%] top-[18.75%] left-[12.50%]",
        alt: "Vector",
        src: "/img/vector-16.svg",
      },
      {
        className: "absolute w-[87.50%] h-[71.88%] top-[28.12%] left-[12.50%]",
        alt: "Vector",
        src: "/img/vector-17.svg",
      },
      {
        className: "absolute w-[37.50%] h-[71.88%] top-[28.12%] left-[62.50%]",
        alt: "Vector",
        src: "/img/vector-18.svg",
      },
    ],
    title: "Portfolio performance tracking",
    description: "Monitor income, capital growth and strategy.",
    hasBorder: false,
    gapClass: "gap-px",
  },
];

const tagItems = [
  { label: "60+ markets", bg: "bg-[#ffffff0f]", top: "top-0", left: "left-0" },
  { label: "ROI simulator", bg: "bg-white", top: "top-0", left: "left-[92px]" },
  { label: "Early access", bg: "bg-white", top: "top-0", left: "left-[189px]" },
  {
    label: "Portfolio tracking",
    bg: "bg-[#ffffff0f]",
    top: "top-0",
    left: "left-[278px]",
  },
  {
    label: "ESG badges",
    bg: "bg-[#ffffff0f]",
    top: "top-0",
    left: "left-[392px]",
  },
  {
    label: "Bond calculator",
    bg: "bg-[#ffffff0f]",
    top: "top-[35px]",
    left: "left-0",
  },
  {
    label: "AI Virtual Staging",
    bg: "bg-[#ffffff0f]",
    top: "top-[35px]",
    left: "left-[104px]",
  },
];

export const InvestmentOverviewSection = (): JSX.Element => {
  return (
    <div className="relative row-[1_/_2] col-[1_/_2] justify-self-start self-center w-[563px] h-[802px]">
      <div className="inline-flex items-center gap-2.5 absolute top-0 left-0">
        <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-ipm-grey text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-upper-font-style)]">
          INVEST
        </div>
      </div>

      <div className="flex flex-col w-full items-start absolute top-9 left-0">
        <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-light-heading font-[number:var(--IPM-poppins-light-heading-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-light-heading-font-size)] tracking-[var(--IPM-poppins-light-heading-letter-spacing)] leading-[var(--IPM-poppins-light-heading-line-height)] [font-style:var(--IPM-poppins-light-heading-font-style)]">
          Evaluate opportunities
        </div>

        <div className="relative flex items-center w-fit mt-[-0.84px] [font-family:'Playfair_Display',Helvetica] font-normal italic text-ipm-black text-[50px] tracking-[0] leading-[47px] whitespace-nowrap">
          with intelligence.
        </div>
      </div>

      <div className="flex flex-col w-full items-start pt-0 pb-[0.62px] px-0 absolute top-[194px] left-0">
        <p className="self-stretch font-[number:var(--IPM-poppins-light-copy-font-weight)] relative flex items-center mt-[-1.00px] font-IPM-poppins-light-copy text-ipm-black text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
          Global investment discovery, instant ROI &amp; yield analysis, live
          market dashboards and early access to off-market properties — all in
          one intelligent environment.
        </p>
      </div>

      <div className="flex flex-col w-full items-start absolute top-[311px] left-0">
        {featureItems.map((item, index) => (
          <div
            key={index}
            className={`relative self-stretch w-full ${item.hasBorder ? "h-[64.98px] border-b [border-bottom-style:solid] border-[#ffffff0f]" : "h-[63.98px]"}`}
          >
            <div
              className={`absolute top-[11px] left-0 w-6 h-6 ${item.iconFlex ? "flex" : ""} aspect-[1] ${item.iconBg} bg-[100%_100%]`}
            >
              {item.iconImages.map((img, imgIndex) => (
                <img
                  key={imgIndex}
                  className={img.className}
                  alt={img.alt}
                  src={img.src}
                />
              ))}
            </div>

            <div
              className={`inline-flex flex-col items-start ${item.gapClass} absolute top-2.5 left-[45px]`}
            >
              <div className="flex flex-col items-start pt-0 pb-[0.8px] px-0 relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-copy font-[number:var(--IPM-poppins-semibold-copy-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-semibold-copy-font-size)] tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] leading-[var(--IPM-poppins-semibold-copy-line-height)] [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
                  {item.title}
                </div>
              </div>

              <p className="relative flex items-center w-fit font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap w-full items-start gap-[0px_12px] absolute top-[672px] left-0">
        <div className="inline-flex items-center pt-[13.5px] pb-[14.09px] px-[26px] relative self-stretch flex-[0_0_auto] bg-ipm-green rounded-2xl">
          <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-copy font-[number:var(--IPM-poppins-semibold-copy-font-weight)] text-white text-[length:var(--IPM-poppins-semibold-copy-font-size)] tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] leading-[var(--IPM-poppins-semibold-copy-line-height)] [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
            Explore Investor Tools →
          </div>
        </div>

        <div className="inline-flex items-center pt-[12.5px] pb-[13.09px] px-5 relative self-stretch flex-[0_0_auto] rounded-2xl border border-solid border-ipm-light-grey">
          <div className="relative flex items-center w-fit font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-grey text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
            View Pricing
          </div>
        </div>
      </div>

      <div className="absolute w-full top-[739px] left-0 h-[62px]">
        {tagItems.map((tag, index) => (
          <div
            key={index}
            className={`inline-flex h-[calc(100%_-_35px)] items-start pt-[3px] pb-[4.59px] px-[11px] absolute ${tag.top} ${tag.left} ${tag.bg} rounded-[100px] border-ipm-light-grey flex-col border border-solid`}
          >
            <div className="relative flex items-center w-fit font-jost-medium font-[number:var(--jost-medium-font-weight)] text-ipm-grey text-[length:var(--jost-medium-font-size)] tracking-[var(--jost-medium-letter-spacing)] leading-[var(--jost-medium-line-height)] whitespace-nowrap [font-style:var(--jost-medium-font-style)]">
              {tag.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
