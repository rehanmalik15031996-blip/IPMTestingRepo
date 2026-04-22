import React from 'react';

const stroke24 = '#1A1714';
const stroke16 = '#1A1714';

function SvgRoot({ title, children, ...rest }) {
    return (
        <svg role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} {...rest}>
            {title ? <title>{title}</title> : null}
            {children}
        </svg>
    );
}

/** List column — 24×24, stroke ~1.5 on 24 viewBox (Figma node 152:455 etc.) */
export function PartnerIconShareNetwork(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <circle cx="7" cy="7" r="2.25" stroke={stroke24} strokeWidth="1.5" />
            <circle cx="17" cy="7" r="2.25" stroke={stroke24} strokeWidth="1.5" />
            <circle cx="12" cy="17" r="2.25" stroke={stroke24} strokeWidth="1.5" />
            <path
                d="M8.6 8.4 10.8 14.2M15.4 8.4 13.2 14.2"
                stroke={stroke24}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </SvgRoot>
    );
}

export function PartnerIconPalette(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M12 2.75C7.5 2.75 4 5.9 4 9.75c0 2 1.15 3.75 3 4.9.45.28.75.75.75 1.3V16c0 .55.45 1 1 1h1.25c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H9.25c-.55 0-1-.45-1-1v-.05c0-.95-.5-1.85-1.35-2.35C5.9 12.2 5 11.05 5 9.75c0-3.2 3-5.75 7-5.75s7 2.55 7 5.75c0 1-.55 1.85-1.5 2.55-.3.2-.5.55-.5.9v1.05c0 .55-.45 1-1 1h-.7c-.28 0-.5.22-.5.5s.22.5.5.5H16c1.1 0 2-.9 2-2v-1.05c0-.35.15-.7.4-.95 1.4-1.1 2.1-2.65 2.1-4.55 0-3.85-3.5-7-8-7Z"
                stroke={stroke24}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <circle cx="9" cy="8" r="1.1" fill={stroke24} />
            <circle cx="12" cy="6.5" r="1.1" fill={stroke24} />
            <circle cx="15" cy="8" r="1.1" fill={stroke24} />
        </SvgRoot>
    );
}

export function PartnerIconPlug(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M9 2v4M15 2v4M7 8h10v5a5 5 0 0 1-10 0V8Z"
                stroke={stroke24}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 18v4" stroke={stroke24} strokeWidth="1.5" strokeLinecap="round" />
        </SvgRoot>
    );
}

export function PartnerIconEye(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                stroke={stroke24}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.5" stroke={stroke24} strokeWidth="1.5" />
        </SvgRoot>
    );
}

export function PartnerIconLock(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <rect x="5" y="10" width="14" height="11" rx="2" stroke={stroke24} strokeWidth="1.5" />
            <path
                d="M8 10V7a4 4 0 0 1 8 0v3"
                stroke={stroke24}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <circle cx="12" cy="15" r="1.25" fill={stroke24} />
        </SvgRoot>
    );
}

/** Mockup row icons — 16×16 visual (viewBox 24, scaled via class size-4) */
export function PartnerIconFileText(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M14 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8l-6-6Z"
                stroke={stroke16}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path d="M14 2v6h6M10 13h8M10 17h6" stroke={stroke16} strokeWidth="1.5" strokeLinecap="round" />
        </SvgRoot>
    );
}

export function PartnerIconBank(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M3 10h18L12 4 3 10Zm0 0v10M21 10v10M7 10v10M17 10v10M7 20h10"
                stroke={stroke16}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </SvgRoot>
    );
}

export function PartnerIconFiles(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M14 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8l-6-6Z"
                stroke={stroke16}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path d="M14 2v6h6" stroke={stroke16} strokeWidth="1.5" strokeLinejoin="round" />
            <path
                d="M6 18H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1"
                stroke={stroke16}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </SvgRoot>
    );
}

export function PartnerIconPlugSmall(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M9 3v3M15 3v3M7 9h10v4.5a4.5 4.5 0 0 1-9 0V9Z"
                stroke={stroke16}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 17.5V21" stroke={stroke16} strokeWidth="1.5" strokeLinecap="round" />
        </SvgRoot>
    );
}

/** Bell — stroke matches success pill text #1DB880 */
export function PartnerIconBellRinging(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M10 21h4M6.5 9a5.5 5.5 0 0 1 11 0c0 5.5 2 7 2 7H4.5s2-1.5 2-7ZM4 3l2 2M20 3l-2 2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </SvgRoot>
    );
}

/** Check circle — stroke matches pending pill text #B8934A */
export function PartnerIconCheckCircle(props) {
    return (
        <SvgRoot viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8.5 12.5 11 15l5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </SvgRoot>
    );
}
