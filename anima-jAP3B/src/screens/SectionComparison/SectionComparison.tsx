import { FeatureComparisonTableSection } from "./sections/FeatureComparisonTableSection";
import { HeroHeadlineSection } from "./sections/HeroHeadlineSection";

export const SectionComparison = (): JSX.Element => {
  return (
    <div
      className="flex flex-col w-[1920px] items-start px-[360px] py-[100px] relative bg-[url(/img/section-comparison-table.png)] bg-cover bg-[50%_50%]"
      data-model-id="80:2146"
    >
      <div className="flex flex-col max-w-[1200px] items-start gap-[47.51px] px-[52px] py-0 relative w-full flex-[0_0_auto]">
        <HeroHeadlineSection />
        <FeatureComparisonTableSection />
      </div>
    </div>
  );
};
