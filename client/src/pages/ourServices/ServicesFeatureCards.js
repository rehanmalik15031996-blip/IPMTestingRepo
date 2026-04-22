import React from 'react';

function ServicesFeatureCard({ item }) {
    return (
        <article
            data-node-id={item.nodeId}
            className={`relative flex w-full shrink-0 items-center gap-3 rounded-[14px] border border-solid border-[#d6e0db] bg-[linear-gradient(180deg,#f8fbfa_0%,#f1f6f4_100%)] px-3 py-2 ${
                item.isLast ? 'min-h-[63.98px]' : 'min-h-[64.98px]'
            }`}
        >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-solid border-[#cfe0d9] bg-[#eaf3ef]">
                <img alt="" className="block size-5 max-w-none" src={item.iconSrc} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="m-0 font-['Poppins',sans-serif] text-[15px] font-semibold leading-[1.2] text-[#10575c]">
                    {item.title}
                </p>
                <p className="m-0 font-['Poppins',sans-serif] text-[13px] font-normal leading-[1.25] text-[#4a5f58]">
                    {item.description}
                </p>
            </div>
        </article>
    );
}

export default function ServicesFeatureCards({ items, dataNodeId }) {
    return (
        <div data-node-id={dataNodeId} className="flex w-full flex-col items-start gap-2">
            {items.map((item) => (
                <ServicesFeatureCard key={item.nodeId} item={item} />
            ))}
        </div>
    );
}

