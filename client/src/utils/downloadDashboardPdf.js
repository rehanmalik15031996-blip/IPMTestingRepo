import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const BRAND_RGB = { r: 16, g: 87, b: 92 }; // #10575c
const CAPTURE_BG = '#f8fafc';

const BREAK_SELECTORS = [
    'section',
    'article',
    'table',
    'canvas',
    '.recharts-wrapper',
    '.recharts-responsive-container',
    '[class*="card"]',
    '[class*="Card"]',
    '[class*="Chart"]',
    '[class*="chart"]',
    '[class*="section"]',
    '[class*="Section"]',
    '[class*="panel"]',
    '[class*="Panel"]',
    '[class*="grid"]',
    '[class*="Grid"]',
    '[class*="row"]',
    '[class*="Row"]',
    '[class*="container"]',
    "[data-pdf-section]",
].join(", ");

/**
 * @param {Element} el
 * @param {Element} root
 * @returns {{ top: number, bottom: number }}
 */
function getYRangeInRoot(el, root) {
    const r = root.getBoundingClientRect();
    const c = el.getBoundingClientRect();
    const st = root.scrollTop || 0;
    const top = c.top - r.top + st;
    const bottom = c.bottom - r.top + st;
    return { top, bottom };
}

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

/**
 * Block / section / chart edges in **DOM** y-space (0 … scrollHeight), while layout is unclipped.
 * @param {HTMLElement} root
 * @param {number} sh
 * @returns {number[]}
 */
function collectBreakLinesDom(root, sh) {
    const ySet = new Set([0, sh]);
    let nodes;
    try {
        nodes = root.querySelectorAll(BREAK_SELECTORS);
    } catch {
        nodes = [];
    }
    nodes.forEach((el) => {
        if (!el || el === root) return;
        if (!root.contains(el)) return;
        const { top, bottom } = getYRangeInRoot(el, root);
        ySet.add(clamp(top, 0, sh));
        ySet.add(clamp(bottom, 0, sh));
    });
    return [...ySet]
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
}

/**
 * @param {number[]} breaksDom
 * @param {number} sh
 * @param {number} ch
 * @returns {number[]}
 */
function domBreaksToCanvas(breaksDom, sh, ch) {
    if (!sh || sh <= 0) return [0, ch];
    return breaksDom.map((y) => (y / sh) * ch);
}

/**
 * @param {number} ch
 * @param {number} pageCapPx
 * @param {number[]} breaks
 */
function computeSlices(ch, pageCapPx, breaks) {
    const sorted = [...new Set(breaks)].filter((b) => b >= 0 && b <= ch).sort((a, b) => a - b);
    const slices = [];
    let y = 0;
    while (y < ch) {
        const maxEnd = Math.min(y + pageCapPx, ch);
        if (maxEnd >= ch) {
            slices.push({ y0: y, h: ch - y });
            break;
        }
        const inRange = sorted.filter((b) => b > y && b <= maxEnd);
        let end;
        if (inRange.length) {
            end = Math.max(...inRange);
        } else {
            const nextB = sorted.find((b) => b > y);
            if (nextB != null && nextB - y <= pageCapPx) {
                end = nextB;
            } else {
                end = maxEnd;
            }
        }
        if (end <= y) {
            end = Math.min(ch, y + Math.max(1, Math.min(pageCapPx, ch - y)));
        }
        const h = end - y;
        if (h <= 0) {
            end = Math.min(ch, y + 1);
        }
        slices.push({ y0: y, h: end - y });
        y = end;
    }
    return slices;
}

function getCaptureElement() {
    const main = document.querySelector(".dashboard-main");
    if (main) return main;
    const container = document.querySelector(".dashboard-container");
    if (!container) return null;
    const m = container.querySelector("main");
    if (m) return m;
    const aside = container.querySelector("aside");
    for (const child of Array.from(container.children)) {
        if (child === aside) continue;
        if (String(child.tagName).toLowerCase() === "aside") continue;
        if (child.classList?.contains("sidebar-dark")) continue;
        return child;
    }
    return null;
}

function saveStyle(el, prop) {
    return el.style.getPropertyValue(prop) || null;
}

function isDashboardLoading(captureEl) {
    if (!captureEl) return false;
    if (captureEl.querySelector(".logo-loading")) return true;
    if (document.querySelector(".dashboard-main .logo-loading")) return true;
    if (captureEl.getAttribute("data-dashboard-loading") === "true") return true;
    return false;
}

function isEffectivelyEmpty(captureEl) {
    const h = captureEl.scrollHeight || 0;
    if (h < 20) return true;
    if (captureEl.querySelector(".logo-loading")) return true;
    const onlyEmpty =
        !captureEl.textContent ||
        !String(captureEl.textContent).replace(/\s/g, "");
    if (onlyEmpty && h < 80) return true;
    return false;
}

/**
 * @param {jsPDF} doc
 * @param {number} pageW
 */
function drawHeader(doc, pageW) {
    const m = 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    doc.text("Powered by IPM · International Property Market", m, 12);
    doc.setDrawColor(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b);
    doc.setLineWidth(0.3);
    doc.line(m, 15, pageW - m, 15);
    doc.setTextColor(0, 0, 0);
}

/**
 * @param {jsPDF} doc
 * @param {number} pageIndex1
 * @param {number} totalPages
 * @param {string} dateStr
 * @param {number} pageW
 * @param {number} pageH
 */
function drawFooter(doc, pageIndex1, totalPages, dateStr, pageW, pageH) {
    const m = 10;
    const y = pageH - 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${pageIndex1} of ${totalPages}`, m, y);
    doc.text(dateStr, pageW - m, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
}

/**
 * @param {string} fileSlug
 */
function downloadEmptyBrandedPdf(fileSlug) {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    drawHeader(doc, pageW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("No dashboard content to export yet.", 10, 28);
    drawFooter(doc, 1, 1, dateStr, pageW, pageH);
    doc.save(`IPM-Dashboard-${fileSlug}.pdf`);
}

/**
 * @param {string} fileSlug
 */
function downloadMessagePdf(fileSlug, line1, line2) {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    drawHeader(doc, pageW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(line1, 10, 28, { maxWidth: pageW - 20 });
    if (line2) {
        doc.text(line2, 10, 36, { maxWidth: pageW - 20 });
    }
    drawFooter(doc, 1, 1, dateStr, pageW, pageH);
    doc.save(`IPM-Dashboard-${fileSlug}.pdf`);
}

/**
 * @param {HTMLCanvasElement} source
 * @param {number} y0
 * @param {number} h
 * @returns {string}
 */
function sliceCanvasDataUrl(source, y0, h) {
    const c = document.createElement("canvas");
    c.width = source.width;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return source.toDataURL("image/png", 0.92);
    ctx.drawImage(source, 0, y0, source.width, h, 0, 0, source.width, h);
    return c.toDataURL("image/png", 0.92);
}

/**
 * Full-height dashboard capture as a branded, paginated PDF.
 * Uses DOM “natural boundaries” to choose slice positions, then maps them to the captured canvas.
 */
export default async function downloadDashboardPdf() {
    if (typeof window === "undefined" || typeof document === "undefined") {
        throw new Error("PDF export is only available in the browser.");
    }

    const fileSlug = new Date().toISOString().slice(0, 10);
    const captureEl = getCaptureElement();

    if (!captureEl) {
        downloadMessagePdf(
            fileSlug,
            "Could not find the dashboard content area (expected .dashboard-main or main inside .dashboard-container).",
            "Open a dashboard page and try again."
        );
        return;
    }

    if (isDashboardLoading(captureEl)) {
        throw new Error(
            "The dashboard is still loading. Please wait a moment and try again."
        );
    }

    if (isEffectivelyEmpty(captureEl)) {
        downloadEmptyBrandedPdf(fileSlug);
        return;
    }

    const previous = {
        overflow: saveStyle(captureEl, "overflow"),
        height: saveStyle(captureEl, "height"),
        minHeight: saveStyle(captureEl, "min-height"),
        maxHeight: saveStyle(captureEl, "max-height"),
    };

    let expandedScrollHeight = 0;
    let breaksDom = [];
    let canvas;

    try {
        captureEl.style.overflow = "visible";
        captureEl.style.height = "auto";
        captureEl.style.minHeight = "0";
        captureEl.style.maxHeight = "none";
        if (typeof captureEl.scrollTo === "function") {
            captureEl.scrollTo(0, 0);
        } else {
            captureEl.scrollTop = 0;
        }
        window.scrollTo(0, 0);

        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        expandedScrollHeight = captureEl.scrollHeight || 1;
        breaksDom = collectBreakLinesDom(captureEl, expandedScrollHeight);

        if (document.fonts && document.fonts.ready) {
            try {
                await document.fonts.ready;
            } catch {
                /* ignore */
            }
        }

        canvas = await html2canvas(captureEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: CAPTURE_BG,
            logging: false,
            allowTaint: false,
        });
    } catch (e) {
        const msg = e && e.message ? String(e.message) : "Unknown error";
        throw new Error(`Could not capture the dashboard: ${msg}`);
    } finally {
        if (previous.overflow != null) {
            captureEl.style.overflow = previous.overflow;
        } else {
            captureEl.style.removeProperty("overflow");
        }
        if (previous.height != null) {
            captureEl.style.height = previous.height;
        } else {
            captureEl.style.removeProperty("height");
        }
        if (previous.minHeight != null) {
            captureEl.style.minHeight = previous.minHeight;
        } else {
            captureEl.style.removeProperty("min-height");
        }
        if (previous.maxHeight != null) {
            captureEl.style.maxHeight = previous.maxHeight;
        } else {
            captureEl.style.removeProperty("max-height");
        }
    }

    if (!canvas || canvas.width < 2 || canvas.height < 2) {
        downloadEmptyBrandedPdf(fileSlug);
        return;
    }

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWmm = pageW - margin * 2; // 190 on A4
    const headerBottomMm = 18;
    const footerGapMm = 9;
    const imgTopMm = headerBottomMm;
    const maxImgH_mm = pageH - imgTopMm - footerGapMm;
    const pageCapPx = maxImgH_mm * (canvas.width / contentWmm);

    const breaks = domBreaksToCanvas(
        breaksDom,
        expandedScrollHeight,
        canvas.height
    );
    const slices = computeSlices(canvas.height, pageCapPx, breaks);

    const dateStr = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    const total = slices.length;

    slices.forEach((sl, i) => {
        if (i > 0) doc.addPage();
        const dataUrl = sliceCanvasDataUrl(canvas, sl.y0, sl.h);
        const sliceHmm = (sl.h * contentWmm) / canvas.width;
        drawHeader(doc, pageW);
        doc.addImage(
            dataUrl,
            "PNG",
            margin,
            imgTopMm,
            contentWmm,
            Math.min(sliceHmm, maxImgH_mm)
        );
        drawFooter(doc, i + 1, total, dateStr, pageW, pageH);
    });

    doc.save(`IPM-Dashboard-${fileSlug}.pdf`);
}
