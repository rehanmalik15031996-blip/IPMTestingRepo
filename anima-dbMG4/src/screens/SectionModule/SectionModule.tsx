import { PartnerDashboardPreviewSection } from "./sections/PartnerDashboardPreviewSection";
import { PartnerValuePropositionSection } from "./sections/PartnerValuePropositionSection";

export const SectionModule = (): JSX.Element => {
  return (
    <div
      className="flex flex-col w-[1920px] items-start px-[412px] py-0 relative bg-ipm-light-grey"
      data-model-id="80:1763"
    >
      <div className="grid grid-cols-2 grid-rows-[754.30px] h-[954.3px] gap-[72px] px-0 py-[100px]">
        <PartnerDashboardPreviewSection />
        <PartnerValuePropositionSection />
      </div>
    </div>
  );
};
