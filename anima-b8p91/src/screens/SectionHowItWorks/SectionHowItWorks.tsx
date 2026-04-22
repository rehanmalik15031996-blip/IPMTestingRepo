export const SectionHowItWorks = (): JSX.Element => {
  const steps = [
    {
      emoji: "🔍",
      title: "Tell us what you need",
      description:
        "In plain English. A home near good schools, an investment with 10% returns, whatever your goal, IPM starts there.",
      tag: "NO JARGON",
      tagLeft: "left-[125px]",
      tagTop: "top-[316px]",
      descWidth: "w-[257px]",
      col: "col-[1_/_2]",
    },
    {
      emoji: "⚡",
      title: (
        <>
          IPM Intelligence <br />
          does the heavy lifting
        </>
      ),
      description:
        "IPM analyses millions of data points across four markets, runs the numbers, reads the documents, and highlights exactly what matters, in seconds.",
      tag: "40+ DATA POINTS",
      tagLeft: "left-[107px]",
      tagTop: "top-[315px]",
      descWidth: "w-[272px]",
      col: "col-[2_/_3]",
    },
    {
      emoji: "🎯",
      title: "Decide with certainty",
      description: (
        <>
          Every recommendation comes with the data to back it up. No guessing,
          no confusion, just clear,
          <br />
          actionable insight that helps you act fast and act right.
        </>
      ),
      tag: "ALWAYS DATA-BACKED",
      tagLeft: "left-[93px]",
      tagTop: "top-[313px]",
      descWidth: "w-[293px]",
      col: "col-[3_/_4]",
    },
  ];

  return (
    <div
      className="flex flex-col w-[1920px] items-start px-[360px] py-[100px] relative bg-ipm-light-grey"
      data-model-id="80:2104"
    >
      <div className="flex flex-col max-w-[1200px] items-center gap-14 px-[52px] py-0 relative w-full flex-[0_0_auto] shadow-[0px_10px_10px_#0000001a]">
        <div className="flex flex-col max-w-[480px] w-[480px] items-start gap-[14.86px] relative flex-[0_0_auto]">
          <div className="flex flex-col items-center relative self-stretch w-full flex-[0_0_auto]">
            <div className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-semibold text-white text-[10px] text-center tracking-[2.80px] leading-4 whitespace-nowrap">
              HOW IPM WORKS
            </div>
          </div>

          <div className="flex flex-col items-center relative self-stretch w-full flex-[0_0_auto]">
            <p className="relative w-fit mt-[-1.00px] ml-[-89.50px] mr-[-89.50px] [font-family:'Poppins',Helvetica] font-normal text-[#1a1714] text-[50px] text-center tracking-[0] leading-[50px]">
              <span className="font-[number:var(--IPM-poppins-light-heading-font-weight)] font-IPM-poppins-light-heading [font-style:var(--IPM-poppins-light-heading-font-style)] tracking-[var(--IPM-poppins-light-heading-letter-spacing)] leading-[var(--IPM-poppins-light-heading-line-height)] text-[length:var(--IPM-poppins-light-heading-font-size)]">
                Three steps from confused
                <br />
              </span>

              <span className="[font-family:'Playfair_Display',Helvetica] italic leading-[45.4px]">
                to confident.
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 grid-rows-[378.23px] h-[378.23px] gap-[22px]">
          <div className="absolute w-[calc(100%_-_397px)] top-[30px] left-[199px] h-px bg-[linear-gradient(90deg,rgba(184,147,74,0)_0%,rgba(184,147,74,0.3)_33%,rgba(184,147,74,0.3)_67%,rgba(184,147,74,0)_100%)]" />

          {steps.map((step, index) => (
            <div
              key={index}
              className={`${step.col} relative row-[1_/_2] w-full h-[378.23px] bg-white rounded-[30px] border border-solid`}
            >
              <div className="flex flex-col w-[calc(100%_-_58px)] items-center pt-0 pb-[0.8px] px-0 absolute top-[31px] left-[29px]">
                <div className="relative flex items-center justify-center w-fit mt-[-1.00px] font-jost-regular font-[number:var(--jost-regular-font-weight)] text-[#1a1714] text-[length:var(--jost-regular-font-size)] text-center tracking-[var(--jost-regular-letter-spacing)] leading-[var(--jost-regular-line-height)] whitespace-nowrap [font-style:var(--jost-regular-font-style)]">
                  {step.emoji}
                </div>
              </div>

              <div className="flex flex-col w-[calc(100%_-_58px)] items-center absolute top-[90px] left-[29px]">
                <p className="relative flex items-center justify-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-subheading font-[number:var(--IPM-poppins-semibold-subheading-font-weight)] text-ipm-green text-[length:var(--IPM-poppins-semibold-subheading-font-size)] text-center tracking-[var(--IPM-poppins-semibold-subheading-letter-spacing)] leading-[var(--IPM-poppins-semibold-subheading-line-height)] [font-style:var(--IPM-poppins-semibold-subheading-font-style)]">
                  {step.title}
                </p>
              </div>

              <div className="flex flex-col w-[calc(100%_-_58px)] items-center absolute top-[168px] left-[29px]">
                <p
                  className={`relative flex items-center justify-center ${step.descWidth} mt-[-1.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-black text-[length:var(--IPM-poppins-light-copy-font-size)] text-center tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]`}
                >
                  {step.description}
                </p>
              </div>

              <div
                className={`${step.tagTop} ${step.tagLeft} inline-flex items-start justify-center px-[13px] py-1 absolute bg-white rounded-[100px] border border-solid border-ipm-light-grey`}
              >
                <div className="relative flex items-center justify-center w-fit font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-ipm-grey text-[length:var(--jost-semibold-upper-font-size)] text-center tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-upper-font-style)]">
                  {step.tag}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
