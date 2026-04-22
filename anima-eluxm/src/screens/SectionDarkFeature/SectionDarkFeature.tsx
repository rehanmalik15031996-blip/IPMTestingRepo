export const SectionDarkFeature = (): JSX.Element => {
  const featureItems = [
    {
      title: "Agents & Agencies",
      description:
        "Prospect smarter, list faster and close with confidence. AI-powered lead scoring, $0 lead cost, CMA Builder, \nvirtual staging and a full CRM — everything to win mandates and grow your real estate business successfully.",
      hasBorder: true,
    },
    {
      title: "Buyers, Renters & Investors",
      description:
        "Find the right property with natural language search and an IPM Score™ on every result. \nModel rental yield, analyse market data and close confidently with Smart Vault AI reviewing every clause.",
      hasBorder: true,
    },
    {
      title: "Enterprise Partners & Corporates",
      description:
        "Connect your agency franchise, corporate portfolio or referral network to the IPM ecosystem. \nWhite-label tools, deal collaboration workspaces, global reach and enterprise analytics in one place.",
      hasBorder: false,
    },
  ];

  return (
    <div
      className="flex w-full max-w-full flex-col items-start overflow-x-hidden bg-ipm-grey"
      data-model-id="67:357"
    >
      <div className="mx-auto grid w-full max-w-full grid-cols-1 bg-[#0000008c] lg:grid-cols-2 lg:min-h-[min(46.25rem,90dvh)]">
        <img
          className="col-span-1 row-span-1 min-h-[17.5rem] w-full object-cover object-center lg:min-h-[min(46.25rem,90dvh)] lg:h-full"
          alt="Image container"
          src="/img/image-container.png"
        />

        <div className="col-span-1 row-span-1 flex w-full min-h-0 flex-col items-start justify-center gap-5 bg-ipm-green px-6 py-10 pl-8 sm:px-10 sm:py-12 lg:min-h-[min(46.25rem,90dvh)] lg:gap-6 lg:pl-[72px] lg:pr-16 lg:py-20">
          <div className="inline-flex w-fit flex-col items-start">
            <div className="relative flex w-fit items-center whitespace-nowrap text-[10px] font-semibold leading-4 tracking-[2.2px] text-white [font-family:'Jost',Helvetica]">
              AN IPM EXCLUSIVE
            </div>
          </div>

          <div className="flex w-full flex-col items-start">
            <p className="relative w-full max-w-full text-[50px] font-normal leading-[50px] tracking-[0] text-transparent [font-family:'Poppins',Helvetica] max-lg:text-[clamp(1.75rem,5vw,2.5rem)] max-lg:leading-tight">
              <span className="font-[number:var(--IPM-poppins-light-heading-font-weight)] font-IPM-poppins-light-heading text-[length:var(--IPM-poppins-light-heading-font-size)] leading-[var(--IPM-poppins-light-heading-line-height)] tracking-[var(--IPM-poppins-light-heading-letter-spacing)] text-white [font-style:var(--IPM-poppins-light-heading-font-style)]">
                One Subscription.
                <br />
              </span>

              <span className="text-[50px] italic leading-[50.9px] text-[#ffc802] [font-family:'Playfair Display',Helvetica] max-lg:text-[clamp(1.75rem,5vw,2.5rem)] max-lg:leading-tight">
                The entire property journey.
              </span>
            </p>
          </div>

          <div className="relative w-full max-w-full">
            <p className="relative w-full max-w-full whitespace-normal break-words font-IPM-poppins-light-copy text-[length:var(--IPM-poppins-light-copy-font-size)] font-[number:var(--IPM-poppins-light-copy-font-weight)] leading-[var(--IPM-poppins-light-copy-line-height)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] text-white [font-style:var(--IPM-poppins-light-copy-font-style)]">
              IPM serves every stakeholder in the property lifecycle — from
              agents and agencies winning more mandates, to buyers finding the
              right property with AI-powered clarity, investors modelling
              real-time yield, and enterprise partners scaling across global
              markets.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3.5">
            {featureItems.map((item, index) => (
              <div
                key={index}
                className={`flex w-full max-w-full flex-col gap-0.5 pb-3.5 ${item.hasBorder ? "border-b border-solid border-[#ffffff12]" : ""}`}
              >
                <div className="font-IPM-poppins-semibold-copy text-[length:var(--IPM-poppins-semibold-copy-font-size)] font-[number:var(--IPM-poppins-semibold-copy-font-weight)] leading-[var(--IPM-poppins-semibold-copy-line-height)] tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] text-white [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
                  {item.title}
                </div>
                <p className="w-full max-w-full whitespace-normal break-words font-IPM-poppins-light-copy text-[length:var(--IPM-poppins-light-copy-font-size)] font-[number:var(--IPM-poppins-light-copy-font-weight)] leading-[var(--IPM-poppins-light-copy-line-height)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] text-white [font-style:var(--IPM-poppins-light-copy-font-style)]">
                  {item.description.split("\n").map((line, i, arr) => (
                    <span key={i}>
                      {line}
                      {i < arr.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>

          <div className="flex w-full flex-wrap items-start gap-x-3 gap-y-3">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center rounded-[14px] bg-ipm-orange px-7 py-[13px]"
            >
              <div className="relative flex w-fit items-center font-IPM-poppins-semibold-copy text-[length:var(--IPM-poppins-semibold-copy-font-size)] font-[number:var(--IPM-poppins-semibold-copy-font-weight)] leading-[var(--IPM-poppins-semibold-copy-line-height)] tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] text-white [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
                Explore Full Platform →
              </div>
            </button>

            <button
              type="button"
              className="inline-flex cursor-pointer items-center rounded-[14px] border border-solid border-[#ffffff29] px-5 py-[13px]"
            >
              <div className="relative flex w-fit items-center font-IPM-poppins-semibold-copy text-[length:var(--IPM-poppins-semibold-copy-font-size)] font-[number:var(--IPM-poppins-semibold-copy-font-weight)] leading-[var(--IPM-poppins-semibold-copy-line-height)] tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] text-[#f5f0e8ad] [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
                View Pricing
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex w-full max-w-full flex-col items-start bg-white px-6 py-16 sm:px-10 md:px-16 lg:px-24 lg:py-[100px] xl:px-[360px]">
        <div className="relative flex w-full max-w-[min(100%,75rem)] flex-col items-start gap-[60px] px-0 py-0 sm:px-[52px]">
          <div className="flex w-full flex-col items-start gap-[15.19px]">
            <div className="flex w-full flex-col items-start">
              <div className="relative flex w-full items-center self-stretch font-jost-semibold-upper text-[length:var(--jost-semibold-upper-font-size)] font-[number:var(--jost-semibold-upper-font-weight)] leading-[var(--jost-semibold-upper-line-height)] tracking-[var(--jost-semibold-upper-letter-spacing)] text-[#78736d] [font-style:var(--jost-semibold-upper-font-style)]">
                WHY CHOOSE IPM
              </div>
            </div>

            <div className="flex w-full flex-col items-start pb-[0.58px] pt-0">
              <p className="relative w-full max-w-full self-stretch text-[50px] font-normal leading-[50px] text-transparent [font-family:'Poppins',Helvetica] max-lg:text-[clamp(1.75rem,5vw,2.5rem)] max-lg:leading-tight">
                <span className="font-[number:var(--IPM-poppins-light-heading-font-weight)] font-IPM-poppins-light-heading text-[length:var(--IPM-poppins-light-heading-font-size)] leading-[var(--IPM-poppins-light-heading-line-height)] tracking-[var(--IPM-poppins-light-heading-letter-spacing)] text-[#1a1714] [font-style:var(--IPM-poppins-light-heading-font-style)]">
                  Where Smart Property Meets
                  <br />
                </span>

                <span className="text-[52px] italic leading-[52px] tracking-[-0.52px] text-[#ffc802] [font-family:'Playfair Display',Helvetica] max-lg:text-[clamp(1.85rem,5vw,2.6rem)] max-lg:leading-tight">
                  Global Intelligence.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
