export const AgentValuePropositionSection = (): JSX.Element => {
  const featureItems = [
    {
      id: 1,
      iconContent: (
        <div className="absolute top-[11px] left-0 w-6 h-6 aspect-[1]">
          <div className="relative w-[83.33%] h-[90.89%] top-[8.33%] left-[8.33%]">
            <img
              className="absolute w-[49.62%] h-[3.07%] top-[96.93%] left-[50.38%]"
              alt="Vector"
              src="/img/vector.svg"
            />
            <img
              className="absolute w-full h-full top-0 left-0"
              alt="Vector"
              src="/img/image.svg"
            />
          </div>
        </div>
      ),
      title: "Prospect & win new clients",
      description: "Intelligent prospecting and live market insights.",
      hasBorder: true,
      gapClass: "gap-px",
    },
    {
      id: 2,
      iconContent: (
        <div className="absolute top-[11px] left-0 w-6 h-6 flex aspect-[1]">
          <img
            className="flex-1 w-[18px]"
            alt="Vector"
            src="/img/vector-1.svg"
          />
        </div>
      ),
      title: "Unlimited qualified leads — free",
      description:
        "Capture unlimited organic enquiries directly through IPM, or MLS.",
      hasBorder: true,
      gapClass: "gap-[0.99px]",
    },
    {
      id: 3,
      iconContent: (
        <div className="absolute top-[11px] left-0 w-6 h-6 aspect-[1]">
          <div className="relative w-[83.33%] h-[91.67%] top-[4.17%] left-[8.33%]">
            <img
              className="absolute w-full h-[63.64%] top-[36.36%] left-0"
              alt="Vector"
              src="/img/vector-2.svg"
            />
            <img
              className="absolute w-[60.00%] h-full top-0 left-[40.00%]"
              alt="Vector"
              src="/img/vector-3.svg"
            />
            <img
              className="absolute w-[65.00%] h-[81.82%] top-[18.18%] left-[35.00%]"
              alt="Vector"
              src="/img/vector-4.svg"
            />
          </div>
        </div>
      ),
      title: "Intelligence-powered lead scoring",
      description: "Every enquiry ranked by intent and quality.",
      hasBorder: true,
      gapClass: "gap-px",
    },
    {
      id: 4,
      iconContent: (
        <div className="absolute top-[11px] left-0 w-6 h-6 aspect-[1]">
          <div className="relative w-[66.67%] h-[83.33%] top-[8.33%] left-[16.67%] flex bg-[url(/img/vector-5.svg)] bg-[100%_100%]">
            <img
              className="flex-1 w-1.5"
              alt="Vector"
              src="/img/vector-6.svg"
            />
          </div>
        </div>
      ),
      title: "Branded CMA Report Builder",
      description:
        "Generate professional market valuations with your branding.",
      hasBorder: true,
      gapClass: "gap-px",
    },
    {
      id: 5,
      iconContent: (
        <div className="absolute top-[11px] left-0 w-6 h-6 aspect-[1]">
          <div className="relative w-[82.50%] h-[82.50%] top-[8.13%] left-[11.09%] flex bg-[url(/img/vector-7.svg)] bg-[100%_100%]">
            <img
              className="flex-1 w-[4.24px]"
              alt="Vector"
              src="/img/vector-8.svg"
            />
          </div>
        </div>
      ),
      title: "Smart listing copy & virtual staging",
      description:
        "Intelligence property descriptions and digitally staged photos",
      hasBorder: true,
      gapClass: "gap-px",
    },
    {
      id: 6,
      iconContent: (
        <div className="absolute top-[11px] left-0 w-6 h-6 flex aspect-[1]">
          <img
            className="flex-1 w-[19.97px]"
            alt="Vector"
            src="/img/vector-9.svg"
          />
        </div>
      ),
      title: "Market listings globally",
      description: "Expose properties to international buyers and investors.",
      hasBorder: false,
      gapClass: "gap-px",
    },
  ];

  const tagsRowOne = [
    { label: "Lead scoring", bg: "bg-[#ffffff1f]", left: "left-0" },
    { label: "Full CRM", bg: "bg-[#ffffff0f]", left: "left-[105px]" },
    { label: "Global reach", bg: "bg-[#ffffff0f]", left: "left-[179px]" },
    { label: "$0 lead cost", bg: "bg-[#ffffff1f]", left: "left-[272px]" },
    { label: "CMA builder", bg: "bg-[#ffffff0f]", left: "left-[363px]" },
  ];

  const tagsRowTwo = [
    { label: "AI listing copy", bg: "bg-[#ffffff0f]", left: "left-0" },
    { label: "Virtual staging", bg: "bg-[#ffffff0f]", left: "left-[100px]" },
    { label: "IPM Academy", bg: "bg-[#ffffff0f]", left: "left-[201px]" },
    { label: "Task Automation", bg: "bg-[#ffffff0f]", left: "left-[297px]" },
    { label: "Marketing suite", bg: "bg-[#ffffff0f]", left: "left-[405px]" },
  ];

  return (
    <div className="relative row-[1_/_2] col-[1_/_2] self-center w-full h-[800.09px]">
      <div className="inline-flex items-center gap-2.5 absolute top-0 left-0">
        <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-ipm-grey text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-upper-font-style)]">
          AGENT + AGENCY
        </div>
      </div>

      <div className="flex flex-col w-full items-start absolute top-9 left-0">
        <p className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-black text-[50px] tracking-[0] leading-[50px]">
          <span className="font-[number:var(--IPM-poppins-light-heading-font-weight)] text-[#060606] font-IPM-poppins-light-heading [font-style:var(--IPM-poppins-light-heading-font-style)] tracking-[var(--IPM-poppins-light-heading-letter-spacing)] leading-[var(--IPM-poppins-light-heading-line-height)] text-[length:var(--IPM-poppins-light-heading-font-size)]">
            Stop juggling tools.
            <br />
          </span>
          <span className="[font-family:'Playfair_Display',Helvetica] italic text-[#060606] leading-[47px]">
            Start winning clients.
          </span>
        </p>
      </div>

      <div className="flex flex-col w-full items-start absolute top-[152px] left-0">
        <p className="relative flex items-center self-stretch mt-[-1.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
          Run your entire real estate business from one intelligent platform. No
          more switching between listing management system, CRMs, portals and
          spreadsheets. Every lead your listings generate is free.
        </p>
      </div>

      <div className="flex flex-col w-full items-start absolute top-[255px] left-0">
        {featureItems.map((item) => (
          <div
            key={item.id}
            className={`relative self-stretch w-full ${item.hasBorder ? "h-[64.98px] border-b [border-bottom-style:solid] border-ipm-light-grey" : "h-[63.98px]"}`}
          >
            {item.iconContent}
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

      <div className="flex flex-wrap w-full items-start gap-[0px_12px] absolute top-[670px] left-0">
        <div className="inline-flex items-center pt-[13.5px] pb-[14.09px] px-[26px] relative self-stretch flex-[0_0_auto] bg-ipm-green rounded-2xl">
          <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-copy font-[number:var(--IPM-poppins-semibold-copy-font-weight)] text-white text-[length:var(--IPM-poppins-semibold-copy-font-size)] tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] leading-[var(--IPM-poppins-semibold-copy-line-height)] [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
            Explore Agent Tools →
          </div>
        </div>

        <div className="inline-flex items-center pt-[12.5px] pb-[13.09px] px-5 relative self-stretch flex-[0_0_auto] rounded-2xl border border-solid border-ipm-light-grey">
          <div className="relative flex items-center w-fit font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
            View Pricing
          </div>
        </div>
      </div>

      <div className="absolute w-full top-[738px] left-0 h-[62px]">
        {tagsRowOne.map((tag) => (
          <div
            key={tag.label}
            className={`h-[calc(100%_-_35px)] pt-[3px] pb-[4.59px] px-[11px] absolute top-0 ${tag.left} ${tag.bg} rounded-[100px] border border-solid border-ipm-light-grey inline-flex flex-col items-start`}
          >
            <div className="relative flex items-center w-fit font-jost-medium font-[number:var(--jost-medium-font-weight)] text-ipm-light-grey text-[length:var(--jost-medium-font-size)] tracking-[var(--jost-medium-letter-spacing)] leading-[var(--jost-medium-line-height)] whitespace-nowrap [font-style:var(--jost-medium-font-style)]">
              {tag.label}
            </div>
          </div>
        ))}

        {tagsRowTwo.map((tag) => (
          <div
            key={tag.label}
            className={`inline-flex flex-col h-[calc(100%_-_35px)] items-start pt-[3px] pb-[4.59px] px-[11px] absolute top-[35px] ${tag.left} ${tag.bg} rounded-[100px] border border-solid border-ipm-light-grey`}
          >
            <div className="relative flex items-center w-fit font-jost-medium font-[number:var(--jost-medium-font-weight)] text-ipm-light-grey text-[length:var(--jost-medium-font-size)] tracking-[var(--jost-medium-letter-spacing)] leading-[var(--jost-medium-line-height)] whitespace-nowrap [font-style:var(--jost-medium-font-style)]">
              {tag.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
