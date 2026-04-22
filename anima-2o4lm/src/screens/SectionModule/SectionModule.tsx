import { AgentValuePropositionSection } from "./sections/AgentValuePropositionSection";
import { CmaReportPreviewSection } from "./sections/CmaReportPreviewSection";

export const SectionModule = (): JSX.Element => {
  return (
    <div
      className="flex flex-col w-[1929px] items-start px-[412px] py-0 relative bg-white"
      data-model-id="80:1300"
    >
      <div className="grid grid-cols-2 grid-rows-[800.09px] h-[1000.09px] gap-[72px] px-0 py-[100px]">
        <AgentValuePropositionSection />
        <CmaReportPreviewSection />
      </div>
    </div>
  );
};
