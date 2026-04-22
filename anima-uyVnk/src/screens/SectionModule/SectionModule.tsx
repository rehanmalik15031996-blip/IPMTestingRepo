import { BuyerValuePropositionSection } from "./sections/BuyerValuePropositionSection";
import { PropertySearchPreviewSection } from "./sections/PropertySearchPreviewSection";

export const SectionModule = (): JSX.Element => {
  return (
    <div
      className="flex flex-col w-[1920px] items-start px-[412px] py-0 relative bg-white"
      data-model-id="80:1478"
    >
      <div className="grid grid-cols-2 grid-rows-[772.34px] h-[972.34px] gap-[72px] px-0 py-[100px]">
        <PropertySearchPreviewSection />
        <BuyerValuePropositionSection />
      </div>
    </div>
  );
};
