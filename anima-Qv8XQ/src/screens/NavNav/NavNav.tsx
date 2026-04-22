import { useState } from "react";

const navItems = [
  { label: "Home", active: false },
  { label: "Services", active: true },
  { label: "Pricing", active: false },
  { label: "IPM News", active: false },
  { label: "Locations", active: false },
];

export const NavNav = (): JSX.Element => {
  const [activeNav, setActiveNav] = useState("Services");

  return (
    <nav
      className="flex w-[1920px] h-[72px] items-center justify-center px-[52px] py-0 relative bg-ipm-green border-b [border-bottom-style:solid] border-[#ffffff0f]"
      data-model-id="80:2701"
    >
      <div className="flex max-w-[1200px] w-[1200px] items-center relative">
        <div className="items-baseline gap-0.5 inline-flex relative flex-[0_0_auto]">
          <span className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Playfair_Display',Helvetica] font-normal text-[#edf4f0] text-[22px] tracking-[0.50px] leading-[35.2px] whitespace-nowrap">
            IPM
          </span>
          <span className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Playfair_Display',Helvetica] font-normal text-[#b8934a] text-[22px] tracking-[0] leading-[35.2px] whitespace-nowrap">
            .
          </span>
        </div>

        <div className="relative flex-1 min-w-[409.39px] grow h-[25.59px]">
          <div className="inline-flex items-start justify-center gap-0.5 absolute top-[-3px] right-0">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="inline-flex flex-col items-start relative self-stretch flex-[0_0_auto]"
              >
                <button
                  onClick={() => setActiveNav(item.label)}
                  className={`inline-flex items-start px-[17px] py-1.5 relative flex-[0_0_auto] rounded-lg ${
                    activeNav === item.label ? "bg-[#ffffff0d]" : ""
                  }`}
                >
                  <span
                    className={`relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-[13px] tracking-[0.20px] leading-[20.8px] whitespace-nowrap ${
                      activeNav === item.label
                        ? "text-[#edf4f0]"
                        : "text-[#ffffff8c]"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="inline-flex items-center gap-2.5 relative flex-[0_0_auto]">
          <button className="flex-col items-start px-5 py-2 rounded-[10px] border border-solid border-[#ffffff24] inline-flex relative flex-[0_0_auto]">
            <span className="relative flex items-center w-fit [font-family:'Jost',Helvetica] font-normal text-[#ffffffb2] text-[13px] tracking-[0] leading-[20.8px] whitespace-nowrap">
              Sign Up
            </span>
          </button>

          <button className="flex-col items-start px-6 py-[9px] bg-ipm-orange rounded-[10px] inline-flex relative flex-[0_0_auto]">
            <span className="relative flex items-center w-fit mt-[-1.00px] font-semantic-link font-[number:var(--semantic-link-font-weight)] text-white text-[length:var(--semantic-link-font-size)] tracking-[var(--semantic-link-letter-spacing)] leading-[var(--semantic-link-line-height)] whitespace-nowrap [font-style:var(--semantic-link-font-style)]">
              myIPM →
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};
