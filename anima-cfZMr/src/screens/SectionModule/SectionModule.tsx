import { InvestmentOverviewSection } from "./sections/InvestmentOverviewSection";
import { RoiCalculatorPreviewSection } from "./sections/RoiCalculatorPreviewSection";

export const SectionModule = (): JSX.Element => {
  return (
    <div
      className="flex flex-col w-[1920px] items-start px-[412px] py-0 relative bg-white"
      data-model-id="80:1625"
    >
      <div className="grid grid-cols-2 grid-rows-[801.52px] h-[1001.52px] gap-[72px] px-0 py-[100px]">
        <InvestmentOverviewSection />
        <RoiCalculatorPreviewSection />
      </div>
    </div>
  );
};
