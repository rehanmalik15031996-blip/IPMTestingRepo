export const HeroHeadlineSection = (): JSX.Element => {
  return (
    <div className="max-w-[580px] w-[580px] gap-4 flex flex-col items-start relative flex-[0_0_auto]">
      <div className="self-stretch w-full flex flex-col items-start relative flex-[0_0_auto]">
        <p className="relative flex items-center self-stretch mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-white text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] [font-style:var(--jost-semibold-upper-font-style)]">
          WHY IPM VS THE ALTERNATIVES
        </p>
      </div>

      <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
        <p className="relative w-[1093px] mt-[-1.00px] mr-[-513.00px] [font-family:'Poppins',Helvetica] font-normal text-transparent text-[50px] tracking-[0] leading-[50px]">
          <span className="font-[number:var(--IPM-poppins-light-heading-font-weight)] text-white font-IPM-poppins-light-heading [font-style:var(--IPM-poppins-light-heading-font-style)] tracking-[var(--IPM-poppins-light-heading-letter-spacing)] leading-[var(--IPM-poppins-light-heading-line-height)] text-[length:var(--IPM-poppins-light-heading-font-size)]">
            Not a listing site.
            <br />
          </span>

          <span className="[font-family:'Playfair_Display',Helvetica] italic text-[#ffc802] leading-[50.9px]">
            An intelligent operating system for property.
          </span>
        </p>
      </div>
    </div>
  );
};
