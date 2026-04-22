import { FooterLegalNoticeSection } from "./sections/FooterLegalNoticeSection";
import { FooterNavigationGridSection } from "./sections/FooterNavigationGridSection";

export const FooterFooter = (): JSX.Element => {
  return (
    <div
      className="flex flex-col items-start pt-[52px] pb-7 px-[360px] relative bg-ipm-black border-t [border-top-style:solid] border-[#ffffff0f]"
      data-model-id="67:1049"
    >
      <div className="flex flex-col max-w-[1200px] items-start gap-[44.01px] px-[52px] py-0 relative w-full flex-[0_0_auto]">
        <FooterNavigationGridSection />
        <FooterLegalNoticeSection />
      </div>
    </div>
  );
};
