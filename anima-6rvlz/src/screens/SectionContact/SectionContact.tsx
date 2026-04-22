import { useState } from "react";

export const SectionContact = (): JSX.Element => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <div
      className="flex-col items-start px-[412px] py-20 bg-ipm-light-grey border-t [border-top-style:solid] border-ipm-light-grey flex relative"
      data-model-id="67:1011"
    >
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] grid-rows-[346.55px] h-[346.55px] gap-20">
        <div className="relative row-[1_/_2] col-[1_/_2] [align-self:start] w-full h-[346.55px]">
          <div className="flex flex-col w-full items-start absolute top-0 left-0">
            <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-semibold-upper font-[number:var(--jost-semibold-upper-font-weight)] text-[#78736d] text-[length:var(--jost-semibold-upper-font-size)] tracking-[var(--jost-semibold-upper-letter-spacing)] leading-[var(--jost-semibold-upper-line-height)] whitespace-nowrap [font-style:var(--jost-semibold-upper-font-style)]">
              GET IN TOUCH
            </div>
          </div>

          <div className="flex flex-col w-full items-start absolute top-[31px] left-0">
            <p className="relative flex items-center w-[421px] mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-ipm-green text-3xl tracking-[0] leading-[normal]">
              Have Questions or Ready to Take the Next Step?
            </p>
          </div>

          <div className="flex flex-col w-full items-start absolute top-[137px] -left-px">
            <p className="relative flex items-center w-[469px] mt-[-1.00px] mr-[-47.67px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-[#78736d] text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
              Whether you&#39;re looking to buy, sell or invest, our team is
              here to guide you through every stage of the property journey.
            </p>
          </div>
        </div>

        <div className="relative row-[1_/_2] col-[2_/_3] [align-self:start] w-full h-fit flex flex-col items-start gap-1">
          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col items-start gap-1"
          >
            <div className="grid grid-cols-2 grid-rows-[48px_48px_48px_88px] h-[262px] gap-2.5 w-full">
              <div className="row-[1_/_2] col-[1_/_2] w-full h-fit flex-col items-start px-4 py-[13px] bg-white rounded-[10px] overflow-hidden border border-solid border-[#ddd5c8] flex relative">
                <input
                  className="self-stretch w-full opacity-65 relative border-[none] [background:none] mt-[-1.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-grey text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)] p-0 focus:outline-none"
                  placeholder="First Name"
                  type="text"
                  name="firstName"
                  id="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  autoComplete="given-name"
                />
              </div>

              <div className="row-[1_/_2] col-[2_/_3] relative w-full h-fit flex flex-col items-start px-4 py-[13px] bg-white rounded-[10px] overflow-hidden border border-solid border-[#ddd5c8]">
                <input
                  className="self-stretch w-full opacity-65 relative border-[none] [background:none] mt-[-1.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-grey text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)] p-0 focus:outline-none"
                  placeholder="Last Name"
                  type="text"
                  name="lastName"
                  id="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  autoComplete="family-name"
                />
              </div>

              <div className="row-[2_/_3] col-[1_/_3] relative w-full h-fit flex flex-col items-start px-4 py-[13px] bg-white rounded-[10px] overflow-hidden border border-solid border-[#ddd5c8]">
                <input
                  className="self-stretch w-full opacity-65 relative border-[none] [background:none] mt-[-1.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-grey text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)] p-0 focus:outline-none"
                  placeholder="E-mail Address"
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div className="row-[3_/_4] col-[1_/_3] relative w-full h-fit flex flex-col items-start px-4 py-[13px] bg-white rounded-[10px] overflow-hidden border border-solid border-[#ddd5c8]">
                <input
                  className="self-stretch w-full opacity-65 relative border-[none] [background:none] mt-[-1.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-grey text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)] p-0 focus:outline-none"
                  placeholder="Phone Number"
                  type="tel"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>

              <div className="row-[4_/_5] col-[1_/_3] w-full min-h-[88px] h-fit flex-col items-start pt-[13px] pb-[53px] px-4 bg-white rounded-[10px] overflow-scroll border border-solid border-[#ddd5c8] flex relative">
                <textarea
                  className="self-stretch w-full opacity-65 relative border-[none] [background:none] mt-[-1.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-ipm-grey text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)] p-0 resize-none focus:outline-none"
                  placeholder="What can we help you with?"
                  name="message"
                  id="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={1}
                />
              </div>
            </div>

            <button
              type="submit"
              className="all-[unset] box-border items-center justify-center pt-3.5 pb-[15px] px-3.5 self-stretch w-full flex-[0_0_auto] bg-ipm-green rounded-[14px] flex relative cursor-pointer"
            >
              <div className="relative flex items-center justify-center w-fit mt-[-1.00px] font-IPM-poppins-semibold-copy font-[number:var(--IPM-poppins-semibold-copy-font-weight)] text-white text-[length:var(--IPM-poppins-semibold-copy-font-size)] text-center tracking-[var(--IPM-poppins-semibold-copy-letter-spacing)] leading-[var(--IPM-poppins-semibold-copy-line-height)] [font-style:var(--IPM-poppins-semibold-copy-font-style)]">
                Send an Inquiry →
              </div>
            </button>
          </form>

          <div className="flex flex-col items-start pt-[5px] pb-[0.59px] px-0 relative self-stretch w-full flex-[0_0_auto]">
            <p className="relative flex items-center self-stretch mt-[-1.00px] font-IPM-poppins-light-copy font-[number:var(--IPM-poppins-light-copy-font-weight)] text-white text-[length:var(--IPM-poppins-light-copy-font-size)] tracking-[var(--IPM-poppins-light-copy-letter-spacing)] leading-[var(--IPM-poppins-light-copy-line-height)] [font-style:var(--IPM-poppins-light-copy-font-style)]">
              --Your data is protected and never shared. GDPR compliant.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
