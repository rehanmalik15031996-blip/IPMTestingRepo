import { EnterpriseAnalyticsPreviewSection } from "./sections/EnterpriseAnalyticsPreviewSection";
import { PortfolioIntelligenceSection } from "./sections/PortfolioIntelligenceSection";

export const SectionModule = (): JSX.Element => {
  return (
    <div
      className="flex flex-col w-[1920px] items-start px-[412px] py-0 relative bg-white"
      data-model-id="80:1882"
    >
      <div className="grid grid-cols-2 grid-rows-[672.77px] h-[872.77px] gap-[72px] px-0 py-[100px]">
        <PortfolioIntelligenceSection />
        <EnterpriseAnalyticsPreviewSection />
      </div>
    </div>
  );
};
