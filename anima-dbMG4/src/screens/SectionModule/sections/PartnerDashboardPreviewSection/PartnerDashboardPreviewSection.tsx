export const PartnerDashboardPreviewSection = (): JSX.Element => {
  const statsData = [
    { value: "421", label: "LEADS SENT" },
    { value: "84%", label: "PRE-QUAL RATE" },
    { value: "R 127M", label: "BOND VALUE" },
  ];

  const dealItems = [
    {
      icon: (
        <div className="relative w-4 h-4 aspect-[1] bg-[url(/img/vector-7.svg)] bg-[100%_100%]">
          <img
            className="absolute w-[84.38%] h-[90.62%] top-[9.38%] left-[15.62%]"
            alt="Vector stroke"
            src="/img/vector-stroke.svg"
          />
          <img
            className="absolute w-[43.75%] h-[90.62%] top-[9.38%] left-[56.25%]"
            alt="Vector stroke"
            src="/img/vector-stroke-1.svg"
          />
          <img
            className="absolute w-[65.62%] h-[50.00%] top-[50.00%] left-[34.38%]"
            alt="Vector stroke"
            src="/img/vector-stroke-3.svg"
          />
          <img
            className="absolute w-[65.62%] h-[37.50%] top-[62.50%] left-[34.38%]"
            alt="Vector stroke"
            src="/img/vector-stroke-3.svg"
          />
        </div>
      ),
      label: "Sale Agreement",
      badgeText: "Signed",
      badgeBg: "bg-[#1db8801a]",
      badgeBorder: "border-[#1db88033]",
      badgeText2: "text-[#1db880]",
    },
    {
      icon: (
        <div className="relative w-4 h-4 aspect-[1] bg-[url(/img/vector-8.svg)] bg-[100%_100%]">
          <img
            className="absolute w-[93.75%] h-[90.62%] top-[9.38%] left-[6.25%]"
            alt="Vector stroke"
            src="/img/vector-stroke-4.svg"
          />
          <img
            className="absolute w-[81.25%] h-[65.62%] top-[34.38%] left-[18.75%]"
            alt="Vector stroke"
            src="/img/vector-stroke-8.svg"
          />
          <img
            className="absolute w-[62.50%] h-[65.62%] top-[34.38%] left-[37.50%]"
            alt="Vector stroke"
            src="/img/vector-stroke-8.svg"
          />
          <img
            className="absolute w-[43.75%] h-[65.62%] top-[34.38%] left-[56.25%]"
            alt="Vector stroke"
            src="/img/vector-stroke-8.svg"
          />
          <img
            className="absolute w-[25.00%] h-[65.62%] top-[34.38%] left-[75.00%]"
            alt="Vector stroke"
            src="/img/vector-stroke-8.svg"
          />
          <img
            className="absolute w-[90.62%] h-[34.38%] top-[65.62%] left-[9.38%]"
            alt="Vector stroke"
            src="/img/vector-stroke-9.svg"
          />
          <img
            className="absolute w-[96.88%] h-[21.88%] top-[78.12%] left-[3.12%]"
            alt="Vector stroke"
            src="/img/vector-stroke-10.svg"
          />
        </div>
      ),
      label: "Bond Application",
      badgeText: "In Review",
      badgeBg: "bg-[#b8934a1f]",
      badgeBorder: "border-[#b8934a4c]",
      badgeText2: "text-[#b8934a]",
    },
    {
      icon: (
        <div className="relative w-4 h-4 aspect-[1] bg-[url(/img/vector-9.svg)] bg-[100%_100%]">
          <img
            className="absolute w-[84.38%] h-[78.12%] top-[21.88%] left-[15.62%]"
            alt="Vector stroke"
            src="/img/vector-stroke-11.svg"
          />
          <img
            className="absolute w-[71.88%] h-[90.62%] top-[9.38%] left-[28.12%]"
            alt="Vector stroke"
            src="/img/vector-stroke-12.svg"
          />
          <img
            className="absolute w-[68.75%] h-[43.75%] top-[56.25%] left-[31.25%]"
            alt="Vector stroke"
            src="/img/vector-stroke-14.svg"
          />
          <img
            className="absolute w-[68.75%] h-[31.25%] top-[68.75%] left-[31.25%]"
            alt="Vector stroke"
            src="/img/vector-stroke-14.svg"
          />
        </div>
      ),
      label: "Transfer Docs",
      badgeText: "Draft",
      badgeBg: "bg-[#f3f3f3]",
      badgeBorder: "border-ipm-grey",
      badgeText2: "text-ipm-grey",
    },
  ];

  return (
    <div className="relative row-[1_/_2] col-[2_/_3] self-center w-full h-fit flex flex-col items-start bg-[#f3f3f3] rounded-[18px] overflow-hidden border border-solid border-ipm-grey shadow-[0px_6px_20px_#1c171014,0px_20px_64px_#1c171024]">
      <div className="flex h-10 items-center gap-[7px] px-3.5 py-0 relative self-stretch w-full bg-ipm-grey border-b [border-bottom-style:solid] border-[#ffffff0d]">
        <div className="relative w-2 h-2 bg-[#ff5f57] rounded" />
        <div className="relative w-2 h-2 bg-[#ffbd2e] rounded" />
        <div className="relative w-2 h-2 bg-[#28c840] rounded" />
        <div className="flex flex-col min-w-[124.39px] items-center px-[156.3px] py-0 relative flex-1 grow">
          <div className="inline-flex flex-col items-start relative flex-[0_0_auto] ml-[-0.30px] mr-[-0.30px]">
            <div className="relative flex items-center w-fit mt-[-1.00px] font-jost-regular font-[number:var(--jost-regular-font-weight)] text-white text-[length:var(--jost-regular-font-size)] tracking-[var(--jost-regular-letter-spacing)] leading-[var(--jost-regular-line-height)] whitespace-nowrap [font-style:var(--jost-regular-font-style)]">
              partners.ipm.com/dashboard
            </div>
          </div>
        </div>
      </div>

      <div className="relative self-stretch w-full h-[555.5px]">
        <div className="flex flex-col w-[calc(100%_-_36px)] items-start absolute top-[17px] left-[18px]">
          <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-ipm-green text-[9px] tracking-[0.70px] leading-[14.4px] whitespace-nowrap">
            PARTNER DASHBOARD — BONDFIRST FINANCE
          </p>
        </div>

        <div className="grid grid-cols-3 grid-rows-[56.39px] w-[calc(100%_-_36px)] h-14 gap-2 absolute top-[42px] left-[18px]">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="relative w-full h-fit flex flex-col items-start gap-0.5 p-2.5 bg-ipm-light-grey rounded-[10px] shadow-[1px_3px_3px_#0000001a]"
            >
              <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative flex items-center self-stretch mt-[-1.00px] [font-family:'Playfair_Display',Helvetica] font-normal text-ipm-green text-[17px] tracking-[0] leading-[17px]">
                  {stat.value}
                </div>
              </div>
              <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative flex items-center self-stretch mt-[-1.00px] font-jost-regular-upper font-[number:var(--jost-regular-upper-font-weight)] text-ipm-grey text-[length:var(--jost-regular-upper-font-size)] tracking-[var(--jost-regular-upper-letter-spacing)] leading-[var(--jost-regular-upper-line-height)] [font-style:var(--jost-regular-upper-font-style)]">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col w-[calc(100%_-_36px)] items-start pt-px pb-0 px-0 absolute top-[109px] left-[18px]">
          <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Jost',Helvetica] font-normal text-ipm-green text-[9px] tracking-[0.70px] leading-[14.4px] whitespace-nowrap">
            DEAL WORKSPACE — CONSTANTIA HEIGHTS
          </p>
        </div>

        <div className="flex flex-col w-[calc(100%_-_36px)] items-center gap-[3px] px-4 py-3.5 absolute top-[133px] left-[18px] bg-white rounded-xl border border-solid border-ipm-light-grey">
          {dealItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between px-0 py-1.5 relative self-stretch w-full flex-[0_0_auto] border-b [border-bottom-style:solid] border-ipm-grey ${index === 0 ? "items-center" : ""}`}
            >
              <div className="inline-flex items-center relative flex-[0_0_auto]">
                {item.icon}
                <div className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-[#1a1714] text-xs tracking-[0] leading-[19.2px] whitespace-nowrap">
                  {" "}
                  {item.label}
                </div>
              </div>
              <div
                className={`inline-flex flex-col items-start pt-px pb-[2.39px] px-2 relative flex-[0_0_auto] ${item.badgeBg} rounded border border-solid ${item.badgeBorder}`}
              >
                <div
                  className={`relative flex items-center w-fit font-jost-bold font-[number:var(--jost-bold-font-weight)] ${item.badgeText2} text-[length:var(--jost-bold-font-size)] tracking-[var(--jost-bold-letter-spacing)] leading-[var(--jost-bold-line-height)] whitespace-nowrap [font-style:var(--jost-bold-font-style)]`}
                >
                  {item.badgeText}
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-col items-start px-3 py-2 relative self-stretch w-full flex-[0_0_auto] bg-[#1db88012] rounded-lg">
            <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-[#04342c] text-[11px] tracking-[0] leading-[17.6px] whitespace-nowrap">
              ✓ All 5 parties connected · No email chains
            </p>
          </div>
        </div>

        <div className="flex w-[calc(100%_-_36px)] items-start gap-1 absolute top-[315px] left-[18px]">
          <div className="relative w-4 h-4 aspect-[1] bg-[url(/img/vector-10.svg)] bg-[100%_100%]">
            <img
              className="absolute w-[46.88%] h-[93.75%] top-[6.25%] left-[53.12%]"
              alt="Vector stroke"
              src="/img/vector-stroke-16.svg"
            />
            <img
              className="absolute w-[28.12%] h-[75.00%] top-[25.00%] left-[71.88%]"
              alt="Vector stroke"
              src="/img/vector-stroke-16.svg"
            />
            <img
              className="absolute w-[59.38%] h-[90.62%] top-[9.38%] left-[40.62%]"
              alt="Vector stroke"
              src="/img/vector-stroke-17.svg"
            />
            <img
              className="absolute w-[81.25%] h-[85.94%] top-[14.06%] left-[18.75%]"
              alt="Vector stroke"
              src="/img/vector-stroke-18.svg"
            />
            <img
              className="absolute w-[90.62%] h-[37.01%] top-[62.99%] left-[9.38%]"
              alt="Vector stroke"
              src="/img/vector-stroke-19.svg"
            />
          </div>
          <p className="relative flex items-center w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-ipm-grey text-[9px] tracking-[0.70px] leading-[14.4px] whitespace-nowrap">
            {" "}
            PLUG-AND-PLAY WIDGET — LIVE IN 48H
          </p>
        </div>

        <div className="flex flex-col w-[calc(100%_-_36px)] items-start px-4 py-3.5 absolute top-[338px] left-[18px] bg-ipm-green rounded-[10px] border border-solid border-[#ffffff14]">
          <p className="relative w-fit [font-family:'Poppins',Helvetica] font-normal text-transparent text-[11px] tracking-[0] leading-[19.8px]">
            <span className="text-[#ffffff47]">
              // Drop into any listing page
              <br />
            </span>
            <span className="text-fuchsia-400">&lt;script</span>
            <span className="text-[#1c1710]">&nbsp;</span>
            <span className="text-[#1db880]">src</span>
            <span className="text-[#1a1714]">=</span>
            <span className="text-[#d4af6a]">
              &#34;cdn.ipm.com/bond-widget.js&#34;
            </span>
            <span className="text-fuchsia-400">
              &gt;&lt;/script&gt;
              <br />
              &lt;ipm-bond-widget
              <br />
            </span>
            <span className="text-[#1c1710]">{"  "}</span>
            <span className="text-[#1db880]">partner-id</span>
            <span className="text-[#1a1714]">=</span>
            <span className="text-[#d4af6a]">
              &#34;BF-42819&#34;
              <br />
            </span>
            <span className="text-[#1c1710]">{"  "}</span>
            <span className="text-[#1db880]">listing-id</span>
            <span className="text-[#1a1714]">=</span>
            <span className="text-[#d4af6a]">
              &#34;{"{"}
              {"{"}listing.id{"}"}
              {"}"}&#34;
              <br />
            </span>
            <span className="text-fuchsia-400">
              &gt;&lt;/ipm-bond-widget&gt;
            </span>
          </p>
        </div>

        <div className="flex w-[calc(100%_-_36px)] items-start justify-center gap-2 absolute top-[499px] left-[18px]">
          <div className="flex gap-1 px-3 py-[9px] relative flex-1 self-stretch grow bg-[#1db88012] rounded-[9px] border-[#1db8802e] items-start border border-solid">
            <div className="relative w-4 h-4 aspect-[1] bg-[url(/img/vector-5.svg)] bg-[100%_100%]">
              <img
                className="absolute w-[65.62%] h-[28.12%] top-[71.88%] left-[34.38%]"
                alt="Vector stroke"
                src="/img/vector-stroke-20.svg"
              />
              <img
                className="absolute w-[31.25%] h-[93.75%] top-[6.25%] left-[68.75%]"
                alt="Vector stroke"
                src="/img/vector-stroke-21.svg"
              />
              <img
                className="absolute w-[89.17%] h-[93.75%] top-[6.25%] left-[10.83%]"
                alt="Vector stroke"
                src="/img/vector-stroke-22.svg"
              />
              <img
                className="absolute w-[87.48%] h-[87.50%] top-[12.50%] left-[12.52%]"
                alt="Vector stroke"
                src="/img/vector-stroke-23.svg"
              />
            </div>
            <p className="relative flex items-center w-fit [font-family:'Poppins',Helvetica] font-semibold text-[#1db880] text-[11.5px] tracking-[0] leading-[18.4px] whitespace-nowrap">
              {" "}
              12 new leads today
            </p>
          </div>

          <div className="flex px-3 py-[9px] relative flex-1 self-stretch grow bg-[#b8934a1f] rounded-[9px] border-[#b8934a4c] items-start border border-solid">
            <div className="relative w-4 h-4 aspect-[1] bg-[url(/img/vector-6.svg)] bg-[100%_100%]">
              <img
                className="absolute w-[68.75%] h-[62.50%] top-[37.50%] left-[31.25%]"
                alt="Vector stroke"
                src="/img/vector-stroke-24.svg"
              />
              <img
                className="absolute w-[90.62%] h-[90.62%] top-[9.38%] left-[9.38%]"
                alt="Vector stroke"
                src="/img/vector-stroke-25.svg"
              />
            </div>
            <div className="relative flex items-center w-fit [font-family:'Poppins',Helvetica] font-semibold text-[#b8934a] text-[11.5px] tracking-[0] leading-[18.4px] whitespace-nowrap">
              {" "}
              3 approvals pending
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
