export const PortfolioIntelligenceSection = (): JSX.Element => {
  const featureItems = [
    {
      id: 1,
      iconBg: "bg-[url(/img/vector.svg)]",
      iconBgStyle: true,
      iconImages: [
        {
          className:
            "absolute w-[87.50%] h-[87.50%] top-[12.50%] left-[12.50%]",
          alt: "Vector",
          src: "/img/vector-5.svg",
        },
        {
          className:
            "absolute w-[43.73%] h-[43.75%] top-[56.25%] left-[56.27%]",
          alt: "Vector",
          src: "/img/vector-1.svg",
        },
        {
          className:
            "absolute w-[80.27%] h-[80.47%] top-[19.53%] left-[19.73%]",
          alt: "Vector",
          src: "/img/vector-2-2.svg",
        },
      ],
      iconImg: null,
      contentWidth: "w-[639px]",
      contentGap: "gap-px",
      title: "Multi-market analytics dashboard",
      description: "Track demand, pricing trends and portfolio performance.",
      hasBorder: true,
    },
    {
      id: 2,
      iconBg: null,
      iconBgStyle: false,
      iconImages: [],
      iconImg: { alt: "Plugs", src: "/img/plugs.svg" },
      contentWidth: "w-[625px]",
      contentGap: "gap-[0.99px]",
      title: "Custom API data feeds",
      description:
        "Live transactional data, municipal records and demand signals.",
      hasBorder: true,
    },
    {
      id: 3,
      iconBg: "bg-[url(/img/image.svg)]",
      iconBgStyle: true,
      iconImages: [
        {
          className:
            "absolute w-[62.50%] h-[40.62%] top-[59.38%] left-[37.50%]",
          alt: "Vector",
          src: "/img/vector-4.svg",
        },
        {
          className:
            "absolute w-[62.50%] h-[53.12%] top-[46.88%] left-[37.50%]",
          alt: "Vector",
          src: "/img/vector-4.svg",
        },
        {
          className:
            "absolute w-[81.25%] h-[84.38%] top-[15.62%] left-[18.75%]",
          alt: "Vector",
          src: "/img/vector-5-2.svg",
        },
        {
          className: "absolute w-[65.62%] h-[90.62%] top-[9.38%] left-[34.38%]",
          alt: "Vector",
          src: "/img/vector-6.svg",
        },
      ],
      iconImg: null,
      contentWidth: "w-[565px]",
      contentGap: "gap-px",
      title: "Institutional reporting",
      description:
        "Automated portfolio reports, risk assessments and acquisition.",
      hasBorder: true,
    },
    {
      id: 4,
      iconBg: "bg-[url(/img/vector-2.svg)]",
      iconBgStyle: true,
      iconImages: [
        {
          className: "absolute w-[90.62%] h-[87.50%] top-[12.50%] left-[9.38%]",
          alt: "Vector",
          src: "/img/vector-7.svg",
        },
        {
          className:
            "absolute w-[50.00%] h-[59.38%] top-[40.62%] left-[50.00%]",
          alt: "Vector",
          src: "/img/vector-8.svg",
        },
        {
          className:
            "absolute w-[54.69%] h-[34.38%] top-[65.62%] left-[45.31%]",
          alt: "Vector",
          src: "/img/vector-9.svg",
        },
      ],
      iconImg: null,
      contentWidth: "w-[587px]",
      contentGap: "gap-px",
      title: "Risk assessment & compliance",
      description:
        "ESG scoring, volatility alerts and regulatory compliance tracking.",
      hasBorder: true,
    },
    {
      id: 5,
      iconBg: null,
      iconBgStyle: false,
      iconImages: [],
      iconImg: { alt: "Building office", src: "/img/buildingoffice.svg" },
      contentWidth: "w-[628px]",
      contentGap: "gap-px",
      title: "Acquisition advisory",
      description:
        "Guidance and data modelling for large-scale property acquisitions.",
      hasBorder: false,
    },
  ];

  const tagItems = [
    { label: "7 markets live", bg: "bg-white" },
    { label: "Custom API", bg: "bg-[#ffffff0f]" },
    { label: "Institutional reports", bg: "bg-[#ffffff0f]" },
    { label: "Risk assessment", bg: "bg-[#ffffff0f]" },
    { label: "White-label", bg: "bg-[#ffffff0f]" },
  ];

  return (
    <div className="relative row-[1_/_2] col-[1_/_2] self-center w-full h-[672.77px]">
      <div className="inline-flex items-center gap-2.5 absolute top-0 left-0">
        <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-ipm-grey text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-upper-font-style)]">
          CORPORATE
        </div>
      </div>

      <div className="flex flex-col w-full items-start absolute top-9 left-0">
        <p className="w-fit text-ipm-black text-[50px] tracking-[0] leading-[50px] relative mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal">
          <span className="font-[number:var(--IPM-poppins-light-heading-font-weight)] text-[#060606] font-IPM-poppins-light-heading [font-style:var(--IPM-poppins-light-heading-font-style)] tracking-[var(--IPM-poppins-light-heading-letter-spacing)] leading-[var(--IPM-poppins-light-heading-line-height)] text-[length:var(--IPM-poppins-light-heading-font-size)]">
            Portfolio intelligence
            <br />
          </span>

          <span className="[font-family:'Playfair_Display',Helvetica] italic text-[#060606] leading-[47px]">
            at institutional scale.
          </span>
        </p>
      </div>

      <div className="flex flex-col w-full items-start pt-0 pb-[0.62px] px-0 absolute top-[148px] left-0">
        <p className="relative flex items-center w-[564px] mt-[-1.00px] mr-[-52.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
          Multi-market analytics, institutional reporting, and custom data feeds
          for agency enterprises and investment organisations.
        </p>
      </div>

      <div className="flex flex-col w-full items-start absolute top-[228px] left-0">
        {featureItems.map((item) => (
          <div
            key={item.id}
            className={`relative self-stretch w-full ${item.hasBorder ? "h-[64.98px] border-b [border-bottom-style:solid] border-[#ffffff0f]" : "h-[63.98px]"}`}
          >
            {item.iconImg ? (
              <img
                className="absolute top-[11px] left-0 w-6 h-6 aspect-[1]"
                alt={item.iconImg.alt}
                src={item.iconImg.src}
              />
            ) : (
              <div
                className={`absolute top-[11px] left-0 w-6 h-6 aspect-[1] ${item.iconBg} bg-[100%_100%]`}
              >
                {item.iconImages.map((img, idx) => (
                  <img
                    key={idx}
                    className={img.className}
                    alt={img.alt}
                    src={img.src}
                  />
                ))}
              </div>
            )}

            <div
              className={`flex flex-col ${item.contentWidth} items-start ${item.contentGap} absolute top-2.5 left-[45px]`}
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

      <div className="flex flex-wrap w-full items-start gap-[0px_12px] absolute top-[578px] left-0">
        <div className="inline-flex items-center pt-[13.5px] pb-[14.09px] px-[26px] relative self-stretch flex-[0_0_auto] bg-ipm-green rounded-2xl">
          <p className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-copy font-[number:var(--IPM-poppins-semibold-copy-font-weight)] text-white text-[length:var(--IPM-poppins-semibold-copy-font-size)] tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] leading-[var(--IPM-poppins-semibold-copy-line-height)] [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
            Talk to the Team →
          </p>
        </div>

        <div className="inline-flex items-center pt-[12.5px] pb-[13.09px] px-5 relative self-stretch flex-[0_0_auto] rounded-2xl border border-solid border-ipm-light-grey">
          <div className="relative flex items-center w-fit font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-grey text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
            View&nbsp;&nbsp;Pricing
          </div>
        </div>
      </div>

      <div className="flex flex-wrap w-full items-start gap-[0px_7px] absolute top-[645px] left-0">
        {tagItems.map((tag, index) => (
          <div
            key={index}
            className={`inline-flex flex-col items-start pt-[3px] pb-[4.59px] px-[11px] relative self-stretch flex-[0_0_auto] ${tag.bg} rounded-[100px] border border-solid border-ipm-light-grey`}
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
