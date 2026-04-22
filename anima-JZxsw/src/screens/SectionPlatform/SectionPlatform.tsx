export const SectionPlatform = (): JSX.Element => {
  const topCards = [
    {
      id: "ipm-score",
      title: "IPM Score™ Engine",
      description:
        "40+ data points synthesised into one trusted property score. Location, yield, growth, infrastructure, all weighted and ranked automatically.",
      iconSrc: "/img/background-border.svg",
      iconAlt: "Background border",
      iconType: "img",
      descriptionWidth: "w-[296px]",
      descriptionMargin: "mr-[-1.67px]",
      descriptionClass: "",
      topOffset: "top-[143px]",
    },
    {
      id: "real-time-data",
      title: "Real-Time Data",
      description:
        "Live transactional data, market insights, and demand signals refreshed continuously across all worldwide markets.",
      iconType: "custom",
      iconContent: (
        <div className="flex w-11 h-[43px] items-center justify-center pt-px pb-0 px-0 absolute top-[45px] left-[29px] bg-white rounded-[10px] border border-solid border-ipm-grey">
          <div className="relative w-[22px] h-[22px]">
            <img
              className="absolute w-[99.09%] h-[80.91%] top-[19.09%] left-0"
              alt="Vector"
              src="/img/vector.svg"
            />
          </div>
        </div>
      ),
      descriptionWidth: "w-[295px]",
      descriptionMargin: "mr-[-0.67px]",
      descriptionClass: "flex items-center",
      topOffset: "top-[143px]",
    },
    {
      id: "intelligence-matching",
      title: "Intelligence Matching",
      description:
        "Search by intent, not keyword. IPM reads what buyers, investors and agents actually mean — and surfaces the results that prove it.",
      iconSrc: "/img/background-border-1.svg",
      iconAlt: "Background border",
      iconType: "img",
      descriptionWidth: "w-[295px]",
      descriptionMargin: "mr-[-0.66px]",
      descriptionClass: "flex items-center",
      topOffset: "top-36",
      descriptionPadding: "pt-0 pb-[0.88px] px-0",
    },
  ];

  const bottomCards = [
    {
      id: "white-label",
      title: "White-Label Ready",
      description:
        "Full brand customisation for partners. Your logo, your domain, your client experience, powered invisibly by IPM infrastructure.",
      iconType: "custom",
      iconContent: (
        <div className="flex w-11 h-[43px] items-center justify-center pt-px pb-0 px-0 absolute top-[45px] left-[29px] bg-white rounded-[10px] border border-solid border-ipm-grey">
          <div className="relative w-[22px] h-[22px]">
            <img
              className="absolute w-[92.28%] h-[92.27%] top-[7.73%] left-[7.72%]"
              alt="Vector"
              src="/img/vector-1.svg"
            />
            <img
              className="absolute w-[74.09%] h-[69.54%] top-[30.46%] left-[25.91%]"
              alt="Vector"
              src="/img/vector-2.svg"
            />
          </div>
        </div>
      ),
      descriptionWidth: "w-[308px]",
      descriptionMargin: "mr-[-13.67px]",
      descriptionClass: "",
      topOffset: "top-[143px]",
      height: "h-[269.83px]",
    },
    {
      id: "plug-and-play",
      title: "Plug-and-Play API",
      description:
        "IPM connects seamlessly with your existing tools and software. No IT team, no technical setup required.",
      iconType: "custom",
      iconContent: (
        <div className="flex w-11 h-[43px] items-center justify-center pt-px pb-0 px-0 absolute top-[45px] left-[29px] bg-white rounded-[10px] border border-solid border-ipm-grey">
          <div className="relative w-[22px] h-[22px]">
            <img
              className="absolute w-[85.68%] h-[81.13%] top-[18.87%] left-[14.32%]"
              alt="Vector"
              src="/img/vector-3.svg"
            />
            <img
              className="absolute w-[40.23%] h-[81.13%] top-[18.87%] left-[59.77%]"
              alt="Vector"
              src="/img/vector-4.svg"
            />
            <img
              className="absolute w-[56.37%] h-[56.37%] top-[43.63%] left-[43.63%]"
              alt="Vector"
              src="/img/vector-5.svg"
            />
          </div>
        </div>
      ),
      descriptionWidth: "w-[295px]",
      descriptionMargin: "mr-[-0.67px]",
      descriptionClass: "flex items-center",
      topOffset: "top-[143px]",
      height: "h-[269.83px]",
    },
    {
      id: "smart-vault",
      title: "Smart Vault",
      description:
        "AI-powered document intelligence that stores and explains contracts, leases and compliance documents in plain language.",
      iconType: "custom",
      iconContent: (
        <div className="flex w-11 h-[43px] items-center justify-center pt-px pb-0 px-0 absolute top-[41px] left-[29px] bg-white rounded-[10px] border border-solid border-ipm-grey">
          <div className="relative w-[22px] h-[22px]">
            <img
              className="absolute w-[90.00%] h-[92.27%] top-[7.73%] left-[10.00%]"
              alt="Vector"
              src="/img/vector-6.svg"
            />
            <img
              className="absolute w-[66.36%] h-[66.36%] top-[33.64%] left-[33.64%]"
              alt="Vector"
              src="/img/vector-7.svg"
            />
            <img
              className="absolute w-[55.45%] h-[55.46%] top-[44.54%] left-[44.55%]"
              alt="Vector"
              src="/img/vector-8.svg"
            />
          </div>
        </div>
      ),
      descriptionWidth: "w-[295px]",
      descriptionMargin: "mr-[-0.66px]",
      descriptionClass: "flex items-center",
      topOffset: "top-[143px]",
      height: "h-[269.83px]",
    },
  ];

  return (
    <div
      className="flex flex-col items-start px-[360px] py-[100px] relative bg-ipm-green border border-solid border-black"
      data-model-id="67:890"
    >
      <div className="flex flex-col max-w-[1200px] items-start gap-[56.01px] px-[52px] py-0 relative w-full flex-[0_0_auto]">
        <div className="relative max-w-[560px] w-[560px] h-[190.09px]">
          <div className="flex flex-col w-full items-start absolute top-0 left-0">
            <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-ipm-light-grey text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-upper-font-style)]">
              PLATFORM CAPABILITIES
            </div>
          </div>

          <div className="flex flex-col w-full items-start pt-0 pb-[0.54px] px-0 absolute top-[31px] left-0">
            <p className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-transparent text-[50px] tracking-[0] leading-[50px]">
              <span className="font-[number:var(--IPM-poppins-light-heading-font-weight)] text-white font-IPM-poppins-light-heading [font-style:var(--IPM-poppins-light-heading-font-style)] tracking-[var(--IPM-poppins-light-heading-letter-spacing)] leading-[var(--IPM-poppins-light-heading-line-height)] text-[length:var(--IPM-poppins-light-heading-font-size)]">
                Everything runs on one
                <br />
              </span>

              <span className="[font-family:'Playfair_Display',Helvetica] italic text-[#ffc802] leading-[45.4px]">
                intelligence layer.
              </span>
            </p>
          </div>

          <div className="flex flex-col w-full items-start absolute top-[136px] left-0">
            <p className="relative w-fit mt-[-1.00px] mr-[-79.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-white text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
              Six core capabilities powering every stakeholder module — built
              once, accessible
              <br />
              everywhere, updated continuously.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 grid-rows-[292.58px_269.83px] h-[580.41px] gap-[18px]">
          {/* Row 1 */}
          <div className="relative row-[1_/_2] col-[1_/_2] w-full h-[292.58px] bg-white rounded-[22px] overflow-hidden border border-solid border-[#ffffff1f]">
            <div className="flex flex-col w-[calc(100%_-_57px)] items-start pt-px pb-0 px-0 absolute top-[107px] left-[29px]">
              <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-subheading font-[number:var(--IPM-poppins-semibold-subheading-font-weight)] text-ipm-green text-[length:var(--IPM-poppins-semibold-subheading-font-size)] tracking-[var(--IPM-poppins-semibold-subheading-letter-spacing)] leading-[var(--IPM-poppins-semibold-subheading-line-height)] [font-style:var(--IPM-poppins-semibold-subheading-font-style)]">
                IPM Score™ Engine
              </div>
            </div>

            <div className="flex flex-col w-[calc(100%_-_57px)] items-start absolute top-[143px] left-[29px]">
              <p className="relative w-[296px] mt-[-1.00px] mr-[-1.67px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-[#78736d] text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
                40+ data points synthesised into one trusted property score.
                Location, yield, growth, infrastructure, all
                <br />
                weighted and ranked automatically.
              </p>
            </div>

            <img
              className="absolute top-[45px] left-[29px] w-11 h-[43px]"
              alt="Background border"
              src="/img/background-border.svg"
            />
          </div>

          <div className="relative row-[1_/_2] col-[2_/_3] w-full h-[292.58px] bg-white rounded-[22px] overflow-hidden border border-solid border-[#ffffff1f]">
            <div className="flex flex-col w-[calc(100%_-_57px)] items-start pt-px pb-0 px-0 absolute top-[107px] left-[29px]">
              <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-subheading font-[number:var(--IPM-poppins-semibold-subheading-font-weight)] text-ipm-green text-[length:var(--IPM-poppins-semibold-subheading-font-size)] tracking-[var(--IPM-poppins-semibold-subheading-letter-spacing)] leading-[var(--IPM-poppins-semibold-subheading-line-height)] [font-style:var(--IPM-poppins-semibold-subheading-font-style)]">
                Real-Time Data
              </div>
            </div>

            <div className="flex flex-col w-[calc(100%_-_57px)] items-start absolute top-[143px] left-[29px]">
              <p className="relative flex items-center w-[295px] mt-[-1.00px] mr-[-0.67px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-[#78736d] text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
                Live transactional data, market insights, and demand signals
                refreshed continuously across all worldwide markets.
              </p>
            </div>

            <div className="flex w-11 h-[43px] items-center justify-center pt-px pb-0 px-0 absolute top-[45px] left-[29px] bg-white rounded-[10px] border border-solid border-ipm-grey">
              <div className="relative w-[22px] h-[22px]">
                <img
                  className="absolute w-[99.09%] h-[80.91%] top-[19.09%] left-0"
                  alt="Vector"
                  src="/img/vector.svg"
                />
              </div>
            </div>
          </div>

          <div className="relative row-[1_/_2] col-[3_/_4] w-full h-[292.58px] bg-white rounded-[22px] overflow-hidden border border-solid border-[#ffffff1f]">
            <div className="flex flex-col w-[calc(100%_-_57px)] items-start pt-px pb-0 px-0 absolute top-[107px] left-[29px]">
              <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-subheading font-[number:var(--IPM-poppins-semibold-subheading-font-weight)] text-ipm-green text-[length:var(--IPM-poppins-semibold-subheading-font-size)] tracking-[var(--IPM-poppins-semibold-subheading-letter-spacing)] leading-[var(--IPM-poppins-semibold-subheading-line-height)] [font-style:var(--IPM-poppins-semibold-subheading-font-style)]">
                Intelligence Matching
              </div>
            </div>

            <div className="flex flex-col w-[calc(100%_-_57px)] items-start pt-0 pb-[0.88px] px-0 absolute top-36 left-[29px]">
              <p className="relative flex items-center w-[295px] mt-[-1.00px] mr-[-0.66px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-[#78736d] text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
                Search by intent, not keyword. IPM reads what buyers, investors
                and agents actually mean — and surfaces the results that prove
                it.
              </p>
            </div>

            <img
              className="absolute top-[45px] left-[29px] w-11 h-[43px]"
              alt="Background border"
              src="/img/background-border-1.svg"
            />
          </div>

          {/* Row 2 */}
          <div className="relative row-[2_/_3] col-[1_/_2] w-full h-[269.83px] bg-white rounded-[22px] overflow-hidden border border-solid border-[#ffffff1f]">
            <div className="flex flex-col w-[calc(100%_-_57px)] items-start pt-px pb-0 px-0 absolute top-[107px] left-[29px]">
              <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-subheading font-[number:var(--IPM-poppins-semibold-subheading-font-weight)] text-ipm-green text-[length:var(--IPM-poppins-semibold-subheading-font-size)] tracking-[var(--IPM-poppins-semibold-subheading-letter-spacing)] leading-[var(--IPM-poppins-semibold-subheading-line-height)] [font-style:var(--IPM-poppins-semibold-subheading-font-style)]">
                White-Label Ready
              </div>
            </div>

            <div className="flex flex-col w-[calc(100%_-_57px)] items-start absolute top-[143px] left-[29px]">
              <p className="relative w-[308px] mt-[-1.00px] mr-[-13.67px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-[#78736d] text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
                Full brand customisation for partners. Your logo, your domain,
                your client experience, powered invisibly
                <br />
                by IPM infrastructure.
              </p>
            </div>

            <div className="flex w-11 h-[43px] items-center justify-center pt-px pb-0 px-0 absolute top-[45px] left-[29px] bg-white rounded-[10px] border border-solid border-ipm-grey">
              <div className="relative w-[22px] h-[22px]">
                <img
                  className="absolute w-[92.28%] h-[92.27%] top-[7.73%] left-[7.72%]"
                  alt="Vector"
                  src="/img/vector-1.svg"
                />

                <img
                  className="absolute w-[74.09%] h-[69.54%] top-[30.46%] left-[25.91%]"
                  alt="Vector"
                  src="/img/vector-2.svg"
                />
              </div>
            </div>
          </div>

          <div className="relative row-[2_/_3] col-[2_/_3] w-full h-[269.83px] bg-white rounded-[22px] overflow-hidden border border-solid border-[#ffffff1f]">
            <div className="flex flex-col w-[calc(100%_-_57px)] items-start pt-px pb-0 px-0 absolute top-[107px] left-[29px]">
              <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-subheading font-[number:var(--IPM-poppins-semibold-subheading-font-weight)] text-ipm-green text-[length:var(--IPM-poppins-semibold-subheading-font-size)] tracking-[var(--IPM-poppins-semibold-subheading-letter-spacing)] leading-[var(--IPM-poppins-semibold-subheading-line-height)] [font-style:var(--IPM-poppins-semibold-subheading-font-style)]">
                Plug-and-Play API
              </div>
            </div>

            <div className="flex flex-col w-[calc(100%_-_57px)] items-start absolute top-[143px] left-[29px]">
              <p className="relative flex items-center w-[295px] mt-[-1.00px] mr-[-0.67px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-[#78736d] text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
                IPM connects seamlessly with your existing tools and software.
                No IT team, no technical setup required.
              </p>
            </div>

            <div className="flex w-11 h-[43px] items-center justify-center pt-px pb-0 px-0 absolute top-[45px] left-[29px] bg-white rounded-[10px] border border-solid border-ipm-grey">
              <div className="relative w-[22px] h-[22px]">
                <img
                  className="absolute w-[85.68%] h-[81.13%] top-[18.87%] left-[14.32%]"
                  alt="Vector"
                  src="/img/vector-3.svg"
                />

                <img
                  className="absolute w-[40.23%] h-[81.13%] top-[18.87%] left-[59.77%]"
                  alt="Vector"
                  src="/img/vector-4.svg"
                />

                <img
                  className="absolute w-[56.37%] h-[56.37%] top-[43.63%] left-[43.63%]"
                  alt="Vector"
                  src="/img/vector-5.svg"
                />
              </div>
            </div>
          </div>

          <div className="relative row-[2_/_3] col-[3_/_4] w-full h-[269.83px] bg-white rounded-[22px] overflow-hidden border border-solid border-[#ffffff1f]">
            <div className="flex flex-col w-[calc(100%_-_57px)] items-start pt-px pb-0 px-0 absolute top-[107px] left-[29px]">
              <div className="relative flex items-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-subheading font-[number:var(--IPM-poppins-semibold-subheading-font-weight)] text-ipm-green text-[length:var(--IPM-poppins-semibold-subheading-font-size)] tracking-[var(--IPM-poppins-semibold-subheading-letter-spacing)] leading-[var(--IPM-poppins-semibold-subheading-line-height)] [font-style:var(--IPM-poppins-semibold-subheading-font-style)]">
                Smart Vault
              </div>
            </div>

            <div className="flex flex-col w-[calc(100%_-_57px)] items-start absolute top-[143px] left-[29px]">
              <p className="relative flex items-center w-[295px] mt-[-1.00px] mr-[-0.66px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-[#78736d] text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
                AI-powered document intelligence that stores and explains
                contracts, leases and compliance documents in plain language.
              </p>
            </div>

            <div className="flex w-11 h-[43px] items-center justify-center pt-px pb-0 px-0 absolute top-[41px] left-[29px] bg-white rounded-[10px] border border-solid border-ipm-grey">
              <div className="relative w-[22px] h-[22px]">
                <img
                  className="absolute w-[90.00%] h-[92.27%] top-[7.73%] left-[10.00%]"
                  alt="Vector"
                  src="/img/vector-6.svg"
                />

                <img
                  className="absolute w-[66.36%] h-[66.36%] top-[33.64%] left-[33.64%]"
                  alt="Vector"
                  src="/img/vector-7.svg"
                />

                <img
                  className="absolute w-[55.45%] h-[55.46%] top-[44.54%] left-[44.55%]"
                  alt="Vector"
                  src="/img/vector-8.svg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
