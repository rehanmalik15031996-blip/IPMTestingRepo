export const FoundingPricing = (): JSX.Element => {
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)] grid-rows-[138px] w-[1923px] h-[252px] gap-[60px] px-[60px] py-14 relative bg-ipm-green border-t [border-top-style:solid] border-b [border-bottom-style:solid] border-[#c49a3c33]"
      data-model-id="80:2684"
    >
      <div className="relative row-[1_/_2] col-[1_/_2] self-center w-full h-fit flex flex-col items-start gap-2.5">
        <div className="flex-col flex items-start relative self-stretch w-full flex-[0_0_auto]">
          <p className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-transparent text-3xl tracking-[0] leading-[normal]">
            <span className="font-light text-[#f5f0e8]">
              Founding Agency Programme —{" "}
            </span>
            <span className="[font-family:'Playfair_Display',Helvetica] italic text-[#ffc802]">
              Limited spots available
            </span>
          </p>
        </div>

        <div className="flex-col flex items-start relative self-stretch w-full flex-[0_0_auto]">
          <p className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-light text-white text-base tracking-[0] leading-[normal]">
            Lock in founding pricing, get featured placement at launch, and
            co-market with IPM as your partner.
          </p>
        </div>

        <div className="flex-wrap gap-[0px_14px] pt-2.5 pb-0 px-0 flex items-start relative self-stretch w-full flex-[0_0_auto]">
          <button className="all-[unset] box-border inline-flex items-center justify-center px-7 py-[15px] relative flex-[0_0_auto] bg-ipm-orange rounded-[9px] cursor-pointer">
            <div className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-[#04342c] text-base text-center tracking-[0.28px] leading-[normal]">
              Claim Founding Spot →
            </div>
          </button>

          <button className="all-[unset] box-border inline-flex items-center justify-center px-6 py-3.5 relative flex-[0_0_auto] rounded-[9px] border border-solid border-[#f5f0e840] cursor-pointer">
            <div className="relative flex items-center justify-center w-fit [font-family:'Poppins',Helvetica] font-light text-[#edf4f0] text-base text-center tracking-[0] leading-[normal]">
              See All Pricing
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
