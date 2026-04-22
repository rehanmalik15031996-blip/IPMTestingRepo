export const BuyerValuePropositionSection = (): JSX.Element => {
  const features = [
    {
      iconBg: "bg-[url(/img/vector.svg)]",
      iconImages: [
        {
          className:
            "absolute w-[87.50%] h-[87.50%] top-[12.50%] left-[12.50%]",
          alt: "Vector",
          src: "/img/vector-6.svg",
        },
        {
          className:
            "absolute w-[34.16%] h-[34.15%] top-[65.85%] left-[65.84%]",
          alt: "Vector",
          src: "/img/vector-1.svg",
        },
      ],
      title: "Smart natural language search",
      description: "Search using lifestyle preferences and location insights.",
      hasBorder: true,
      gapClass: "gap-px",
    },
    {
      iconBg: "bg-[url(/img/image.svg)]",
      iconImages: [
        {
          className: "absolute w-[90.62%] h-[78.12%] top-[21.88%] left-[9.38%]",
          alt: "Vector",
          src: "/img/vector-2-2.svg",
        },
        {
          className:
            "absolute w-[34.38%] h-[78.12%] top-[21.88%] left-[65.62%]",
          alt: "Vector",
          src: "/img/vector-3-2.svg",
        },
      ],
      title: "Neighbourhood & market intelligence",
      description: "Understand area trends, amenities and pricing signals.",
      hasBorder: true,
      gapClass: "gap-px",
    },
    {
      iconBg: "bg-[url(/img/vector-2.svg)]",
      iconImages: [
        {
          className:
            "absolute w-[84.38%] h-[84.38%] top-[15.62%] left-[15.62%]",
          alt: "Vector",
          src: "/img/vector-4-2.svg",
        },
        {
          className:
            "absolute w-[71.88%] h-[71.88%] top-[28.12%] left-[28.12%]",
          alt: "Vector",
          src: "/img/vector-5-2.svg",
        },
      ],
      title: "Pricing transparency & IPM Score™",
      description: "Compare properties with real market data.",
      hasBorder: true,
      gapClass: "gap-px",
    },
    {
      iconBg: "bg-[url(/img/vector-3.svg)]",
      iconImages: [
        {
          className:
            "absolute w-[57.81%] h-[53.12%] top-[46.88%] left-[42.19%]",
          alt: "Vector",
          src: "/img/vector-6-2.svg",
        },
        {
          className:
            "absolute w-[50.00%] h-[37.50%] top-[62.50%] left-[50.00%]",
          alt: "Vector",
          src: "/img/vector-7.svg",
        },
        {
          className:
            "absolute w-[84.38%] h-[65.62%] top-[34.38%] left-[15.62%]",
          alt: "Vector",
          src: "/img/vector-8.svg",
        },
        {
          className: "absolute w-[65.62%] h-[93.75%] top-[6.25%] left-[34.38%]",
          alt: "Vector",
          src: "/img/vector-9.svg",
        },
      ],
      title: "Smart Vault — AI document reader",
      description: "Upload contracts; receive plain-language explanations.",
      hasBorder: true,
      gapClass: "gap-[0.99px]",
    },
    {
      iconBg: "bg-[url(/img/vector-4.svg)]",
      iconImages: [
        {
          className:
            "absolute w-[28.12%] h-[81.25%] top-[18.75%] left-[71.88%]",
          alt: "Vector",
          src: "/img/vector-10.svg",
        },
        {
          className:
            "absolute w-[87.50%] h-[34.38%] top-[65.62%] left-[12.50%]",
          alt: "Vector",
          src: "/img/vector-11.svg",
        },
        {
          className:
            "absolute w-[28.12%] h-[34.38%] top-[65.62%] left-[71.88%]",
          alt: "Vector",
          src: "/img/vector-12.svg",
        },
        {
          className:
            "absolute w-[87.50%] h-[81.25%] top-[18.75%] left-[12.50%]",
          alt: "Vector",
          src: "/img/vector-13.svg",
        },
        {
          className:
            "absolute w-[71.88%] h-[75.00%] top-[25.00%] left-[28.12%]",
          alt: "Vector",
          src: "/img/vector-14.svg",
        },
        {
          className:
            "absolute w-[71.88%] h-[62.50%] top-[37.50%] left-[28.12%]",
          alt: "Vector",
          src: "/img/vector-15.svg",
        },
        {
          className:
            "absolute w-[50.00%] h-[50.00%] top-[50.00%] left-[50.00%]",
          alt: "Vector",
          src: "/img/vector-16.svg",
        },
      ],
      title: "3D virtual walkthroughs",
      description: "Explore properties from anywhere in the world.",
      hasBorder: true,
      gapClass: "gap-px",
    },
    {
      iconBg: "bg-[url(/img/vector-5.svg)]",
      iconImages: [
        {
          className: "absolute w-[90.62%] h-[87.50%] top-[12.50%] left-[9.38%]",
          alt: "Vector",
          src: "/img/vector-17.svg",
        },
        {
          className:
            "absolute w-[78.12%] h-[62.50%] top-[37.50%] left-[21.88%]",
          alt: "Vector",
          src: "/img/vector-21.svg",
        },
        {
          className:
            "absolute w-[59.38%] h-[62.50%] top-[37.50%] left-[40.62%]",
          alt: "Vector",
          src: "/img/vector-21.svg",
        },
        {
          className:
            "absolute w-[40.62%] h-[62.50%] top-[37.50%] left-[59.38%]",
          alt: "Vector",
          src: "/img/vector-21.svg",
        },
        {
          className:
            "absolute w-[21.88%] h-[62.50%] top-[37.50%] left-[78.12%]",
          alt: "Vector",
          src: "/img/vector-21.svg",
        },
        {
          className:
            "absolute w-[87.50%] h-[31.25%] top-[68.75%] left-[12.50%]",
          alt: "Vector",
          src: "/img/vector-22.svg",
        },
        {
          className: "absolute w-[93.75%] h-[18.75%] top-[81.25%] left-[6.25%]",
          alt: "Vector",
          src: "/img/vector-23.svg",
        },
      ],
      title: "Mortgage pre-qualification",
      description: "Know your budget before you search.",
      hasBorder: false,
      gapClass: "gap-[0.99px]",
    },
  ];

  const tagRowTop = [
    {
      label: "ROI Insights",
      top: "top-0",
      left: "left-0",
      width: "w-[78px]",
      hasFixedWidth: true,
    },
    {
      label: "IPM Score™",
      top: "top-0",
      left: "left-[83px]",
      width: "",
      hasFixedWidth: false,
    },
    {
      label: "Smart Vault AI",
      top: "top-0",
      left: "left-[170px]",
      width: "",
      hasFixedWidth: false,
    },
    {
      label: "3D walkthroughs",
      top: "top-0",
      left: "left-[267px]",
      width: "",
      hasFixedWidth: false,
    },
    {
      label: "Mortgage pre-qual",
      top: "top-0",
      left: "left-[376px]",
      width: "",
      hasFixedWidth: false,
    },
  ];

  const tagRowBottom = [
    {
      label: "Comparison tool",
      top: "top-[35px]",
      left: "left-0",
      width: "",
      hasFixedWidth: false,
    },
    {
      label: "Intelligence search",
      top: "top-[35px]",
      left: "left-[108px]",
      width: "",
      hasFixedWidth: false,
    },
    {
      label: "Live Market Insights",
      top: "top-[35px]",
      left: "left-[227px]",
      width: "",
      hasFixedWidth: false,
    },
    {
      label: "Live Market Insights",
      top: "top-[35px]",
      left: "left-[352px]",
      width: "",
      hasFixedWidth: false,
    },
  ];

  return (
    <div className="relative row-[1_/_2] col-[1_/_2] self-center w-full h-[772.34px]">
      <div className="inline-flex items-center gap-2.5 absolute top-0 left-0">
        <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-ipm-grey text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-upper-font-style)]">
          BUY + RENT
        </div>
      </div>

      <div className="flex flex-col w-full items-start absolute top-9 left-0">
        <p className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-black text-[50px] tracking-[0] leading-[50px]">
          <span className="font-[number:var(--IPM-poppins-light-heading-font-weight)] font-IPM-poppins-light-heading [font-style:var(--IPM-poppins-light-heading-font-style)] tracking-[var(--IPM-poppins-light-heading-letter-spacing)] leading-[var(--IPM-poppins-light-heading-line-height)] text-[length:var(--IPM-poppins-light-heading-font-size)]">
            Find property with
            <br />
          </span>
          <span className="[font-family:'Playfair_Display',Helvetica] italic leading-[47px]">
            clarity and confidence.
          </span>
        </p>
      </div>

      <div className="flex flex-col w-full items-start pt-0 pb-[0.62px] px-0 absolute top-[155px] left-0">
        <p className="relative flex items-center w-[576px] mt-[-1.00px] mr-[-64.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
          Search in your language and currency preferences, understand what a
          fair price looks like, and navigate every step with data driven
          clarity.
        </p>
      </div>

      <div className="flex flex-col w-full items-start absolute top-[228px] left-0">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`relative self-stretch w-full ${feature.hasBorder ? "h-[64.98px] border-b [border-bottom-style:solid] border-ipm-light-grey" : "h-[63.98px]"}`}
          >
            <div
              className={`absolute top-[11px] left-0 w-6 h-6 aspect-[1] ${feature.iconBg} bg-[100%_100%]`}
            >
              {feature.iconImages.map((img, imgIndex) => (
                <img
                  key={imgIndex}
                  className={img.className}
                  alt={img.alt}
                  src={img.src}
                />
              ))}
            </div>

            <div
              className={`inline-flex flex-col items-start ${feature.gapClass} absolute top-2.5 left-[45px]`}
            >
              <div className="flex flex-col items-start pt-0 pb-[0.8px] px-0 relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-copy font-[number:var(--IPM-poppins-semibold-copy-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-semibold-copy-font-size)] tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] leading-[var(--IPM-poppins-semibold-copy-line-height)] [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
                  {feature.title}
                </div>
              </div>
              <p className="relative flex items-center w-fit font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap w-full items-start gap-[0px_12px] absolute top-[643px] left-0">
        <div className="inline-flex items-center pt-[13.5px] pb-[14.09px] px-[26px] relative self-stretch flex-[0_0_auto] bg-ipm-green rounded-2xl">
          <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-copy font-[number:var(--IPM-poppins-semibold-copy-font-weight)] text-white text-[length:var(--IPM-poppins-semibold-copy-font-size)] tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] leading-[var(--IPM-poppins-semibold-copy-line-height)] [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
            Explore Buyer Tools →
          </div>
        </div>

        <div className="inline-flex items-center pt-[12.5px] pb-[13.09px] px-5 relative self-stretch flex-[0_0_auto] rounded-2xl border border-solid border-ipm-light-grey">
          <div className="relative flex items-center w-fit font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
            View Pricing
          </div>
        </div>
      </div>

      <div className="absolute w-full top-[710px] left-0 h-[62px]">
        {tagRowTop.map((tag, index) =>
          tag.hasFixedWidth ? (
            <div
              key={index}
              className={`flex ${tag.width} h-[calc(100%_-_34px)] ${tag.top} ${tag.left} flex-col items-start pt-[3px] pb-[4.59px] px-[11px] absolute bg-white rounded-[100px] border border-solid border-ipm-light-grey`}
            >
              <div className="relative flex items-center w-fit mr-[-4.00px] font-jost-medium font-[number:var(--jost-medium-font-weight)] text-ipm-grey text-[length:var(--jost-medium-font-size)] tracking-[var(--jost-medium-letter-spacing)] leading-[var(--jost-medium-line-height)] whitespace-nowrap [font-style:var(--jost-medium-font-style)]">
                {tag.label}
              </div>
            </div>
          ) : (
            <div
              key={index}
              className={`inline-flex h-[calc(100%_-_35px)] ${tag.top} ${tag.left} flex-col items-start pt-[3px] pb-[4.59px] px-[11px] absolute bg-white rounded-[100px] border border-solid border-ipm-light-grey`}
            >
              <div className="relative flex items-center w-fit font-jost-medium font-[number:var(--jost-medium-font-weight)] text-ipm-grey text-[length:var(--jost-medium-font-size)] tracking-[var(--jost-medium-letter-spacing)] leading-[var(--jost-medium-line-height)] whitespace-nowrap [font-style:var(--jost-medium-font-style)]">
                {tag.label}
              </div>
            </div>
          ),
        )}

        {tagRowBottom.map((tag, index) => (
          <div
            key={index}
            className={`inline-flex h-[calc(100%_-_35px)] ${tag.top} ${tag.left} flex-col items-start pt-[3px] pb-[4.59px] px-[11px] absolute bg-white rounded-[100px] border border-solid border-ipm-light-grey`}
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
