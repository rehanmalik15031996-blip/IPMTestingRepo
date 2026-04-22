import { useState } from "react";

const tabs = [
  { label: "Agent", id: "agent" },
  { label: "Buy", id: "buy" },
  { label: "Rent", id: "rent" },
  { label: "Investor", id: "investor" },
  { label: "Partner", id: "partner" },
  { label: "Enterprise", id: "enterprise" },
];

export const SectionHero = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState("agent");

  return (
    <div
      className="flex flex-col w-[1920px] items-start pt-[140px] pb-20 px-[560px] relative border border-solid border-[#00000033] bg-[url(/img/section-hero.png)] bg-cover bg-[50%_50%]"
      data-model-id="80:1275"
    >
      <div className="absolute w-full h-full top-0 left-0 [background:radial-gradient(50%_50%_at_38%_72%,rgba(184,147,74,0.05)_0%,rgba(184,147,74,0)_60%),radial-gradient(50%_50%_at_98%_33%,rgba(29,184,128,0.04)_0%,rgba(29,184,128,0)_55%)]" />

      <img
        className="absolute w-full h-full top-0 left-0 object-cover"
        alt="Mask group"
        src="/img/mask-group.svg"
      />

      <div className="relative max-w-[800px] w-full h-[362.53px]">
        <div className="inline-flex items-center gap-2.5 absolute top-0 left-[309px]">
          <div className="inline-flex flex-col items-center relative flex-[0_0_auto]">
            <div className="relative flex items-center justify-center w-fit mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-white text-[length:var(--jost-semibold-upper-font-size)] text-center tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-upper-font-style)]">
              THE IPM ECOSYSTEM
            </div>
          </div>
        </div>

        <div className="flex flex-col w-full items-center absolute top-[47px] left-0">
          <p className="relative w-fit mt-[-1.00px] ml-[-20.50px] mr-[-20.50px] [font-family:'Poppins',Helvetica] font-normal text-transparent text-[76px] text-center tracking-[0] leading-[76px]">
            <span className="font-extralight text-white">
              One Platform.
              <br />
            </span>

            <span className="font-semantic-heading-1 [font-style:var(--semantic-heading-1-font-style)] text-[#ffc802] leading-[var(--semantic-heading-1-line-height)] font-[number:var(--semantic-heading-1-font-weight)] tracking-[var(--semantic-heading-1-letter-spacing)] text-[length:var(--semantic-heading-1-font-size)]">
              Every Real Estate Service.
            </span>
          </p>
        </div>

        <div className="flex flex-col max-w-[560px] w-[calc(100%_-_240px)] items-center absolute top-[213px] left-[120px]">
          <p className="relative w-fit mt-[-1.00px] font-jost-regular font-[number:var(--jost-regular-font-weight)] text-white text-[length:var(--jost-regular-font-size)] text-center tracking-[var(--jost-regular-letter-spacing)] leading-[var(--jost-regular-line-height)] [font-style:var(--jost-regular-font-style)]">
            Built by industry leaders to support the entire real estate
            lifecycle for
            <br />
            every stakeholder, at every stage, in every market.
          </p>
        </div>

        <div className="inline-flex items-start absolute top-[318px] left-[calc(50.00%_-_327px)] bg-[#ffffff0f] rounded-[14px] overflow-hidden border border-solid border-[#ffffff1a]">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const isLastTab = index === tabs.length - 1;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "all-[unset] box-border inline-flex flex-col items-center justify-center px-7 py-3 relative flex-[0_0_auto] cursor-pointer",
                  isActive ? "bg-[#b8934a29]" : "",
                  !isLastTab
                    ? "border-r [border-right-style:solid] border-[#ffffff14]"
                    : "",
                ].join(" ")}
              >
                <div
                  className={[
                    "relative flex items-center justify-center w-fit mt-[-1.00px] text-center",
                    isActive
                      ? "font-IPM-poppins-semibold-copy font-[number:var(--IPM-poppins-semibold-copy-font-weight)] text-ipm-yellow text-[length:var(--IPM-poppins-semibold-copy-font-size)] tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] leading-[var(--IPM-poppins-semibold-copy-line-height)] [font-style:var(--IPM-poppins-semibold-copy-font-style)]"
                      : "font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-white text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]",
                  ].join(" ")}
                >
                  {tab.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
