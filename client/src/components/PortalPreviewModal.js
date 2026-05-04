import React, { useMemo, useState } from 'react';

/**
 * PortalPreviewModal
 *
 * Visual mock-up preview of a listing as it would appear on Property24
 * and Private Property (South Africa). Pulls real listing data (title,
 * images, price, beds/baths, suburb, agent, etc.) and renders it in
 * portal-styled mock pages so users can sanity-check what their ad will
 * look like before the live syndication API is connected.
 *
 * The mocks are intentionally faithful to each portal's actual layout
 * (header chrome, breadcrumb, hero gallery, stats row, description,
 * agent card) but clearly labelled as a preview — no calls are made
 * to either portal.
 */
export default function PortalPreviewModal({ isOpen, onClose, item, user }) {
    const [tab, setTab] = useState('property24');

    const data = useMemo(() => normalizeListing(item, user), [item, user]);

    if (!isOpen || !item) return null;

    return (
        <div style={overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Portal preview">
            <div style={shell} onClick={(e) => e.stopPropagation()}>
                {/* Header bar */}
                <div style={headerBar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <i className="fas fa-globe" style={{ color: '#11575C' }} />
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Portal preview</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>How this listing will appear once syndication goes live.</div>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} style={closeBtn} aria-label="Close">
                        <i className="fas fa-times" />
                    </button>
                </div>

                {/* Coming-soon banner */}
                <div style={comingSoonBanner}>
                    <i className="fas fa-info-circle" style={{ marginRight: 6, color: '#b45309' }} />
                    <span>
                        Preview only. Property24 and Private Property syndication APIs are
                        being finalised — listings are not pushed to either portal yet.
                    </span>
                </div>

                {/* Tabs */}
                <div style={tabsBar}>
                    <button
                        type="button"
                        onClick={() => setTab('property24')}
                        style={{ ...tabBtn, ...(tab === 'property24' ? tabBtnActiveP24 : {}) }}
                    >
                        <span style={{ ...portalDot, background: '#C8102E' }} />
                        Property24
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('privateproperty')}
                        style={{ ...tabBtn, ...(tab === 'privateproperty' ? tabBtnActivePP : {}) }}
                    >
                        <span style={{ ...portalDot, background: '#0a2540' }} />
                        Private Property
                    </button>
                </div>

                {/* Body */}
                <div style={body}>
                    {tab === 'property24' ? (
                        <Property24Preview data={data} />
                    ) : (
                        <PrivatePropertyPreview data={data} />
                    )}
                </div>

                {/* Footer */}
                <div style={footerBar}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                        Source data pulled from this listing in IPM. Edits in IPM will
                        re-flow into the portal automatically once connected.
                    </span>
                    <button type="button" style={primaryBtn} onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

/* --------------------------------------------------------------------- */
/* Listing → portal-friendly data                                        */
/* --------------------------------------------------------------------- */

function normalizeListing(item, user) {
    if (!item) return {};

    const beds = item.specs?.beds ?? item.residential?.bedrooms ?? 0;
    const baths = item.specs?.baths ?? item.residential?.bathrooms ?? 0;
    const garages = item.specs?.garages ?? item.specs?.parking ?? item.residential?.garages ?? item.residential?.parking ?? 0;
    const erfSize = item.propertySize?.erf ?? item.land?.erfSize ?? item.specs?.erf ?? null;
    const floorSizeRaw = item.propertySize?.size ?? item.residential?.livingAreaSize ?? item.specs?.sqft ?? null;
    const floorUnit = (item.propertySize?.unitSystem || '').toLowerCase();
    const isMetric = floorUnit.includes('m') || floorUnit.includes('²') || floorUnit === 'sqm' || item.importSource === 'propdata';

    const street = item.locationDetails?.streetAddress || '';
    const suburb = item.locationDetails?.suburb || '';
    const city = item.locationDetails?.city || '';
    const province = item.locationDetails?.provinceState || item.locationDetails?.province || '';
    const country = item.locationDetails?.country || '';

    const heroImage = item.imageUrl || item.media?.coverImage || '';
    const gallery = (item.media?.imageGallery && Array.isArray(item.media.imageGallery))
        ? item.media.imageGallery.filter(Boolean)
        : [];
    const allImages = (heroImage ? [heroImage] : []).concat(gallery);
    const placeholder = 'https://images.unsplash.com/photo-1600596542815-2a4d9fdb2243?auto=format&fit=crop&w=1400&q=80';
    const images = allImages.length > 0 ? allImages : [placeholder];

    const propertyType = item.propertyType || guessTypeFromTitle(item.title) || 'House';
    const transaction = (item.transactionType || item.listingType || 'sale').toLowerCase();
    const isRental = transaction.includes('rent');

    const titleSummary = `${beds || ''} Bedroom ${propertyType}`.trim();

    const currency = item.pricing?.currency || (item.importSource === 'propdata' ? 'ZAR' : 'ZAR');
    const price = formatZAR(item.price, currency);

    const agentName = item.agentName || user?.name || 'Listing Agent';
    const agencyName = item.agencyName || user?.agencyName || user?.companyName || (user?.role === 'agency' ? user?.name : '') || 'Independent';
    const agentPhone = item.agentPhone || user?.phone || user?.mobile || '+27 ___ ___ ____';
    const agentEmail = item.agentEmail || user?.email || 'agent@example.co.za';

    const description = item.description
        || item.listingDescription
        || 'Property description will appear here. Add a compelling description in the listing editor to make this preview look its best.';

    const isPriceReduced = !!item.priceReduced;
    const isFeatured = !!item.isFeatured;

    return {
        title: item.title || 'Untitled property',
        titleSummary,
        propertyType,
        beds, baths, garages,
        erfSize,
        floorSize: floorSizeRaw,
        floorMetric: isMetric,
        street, suburb, city, province, country,
        images,
        price,
        priceRaw: item.price,
        isRental,
        agentName, agencyName, agentPhone, agentEmail,
        description,
        isPriceReduced,
        isFeatured,
        reference: item.referenceCode || item.listingMetadata?.propdata?.refCode || `IPM-${String(item._id || '').slice(-7).toUpperCase()}`,
    };
}

function guessTypeFromTitle(title) {
    if (!title) return null;
    const t = String(title).toLowerCase();
    if (t.includes('apartment') || t.includes('flat')) return 'Apartment';
    if (t.includes('townhouse')) return 'Townhouse';
    if (t.includes('cluster')) return 'Cluster';
    if (t.includes('farm')) return 'Farm';
    if (t.includes('vacant') || t.includes('land') || t.includes('plot')) return 'Vacant Land';
    if (t.includes('commercial')) return 'Commercial Property';
    return 'House';
}

function formatZAR(value, currency) {
    if (value == null || value === '') return 'POA';
    const num = Number(String(value).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(num) || num <= 0) return 'POA';
    const symbol = currency === 'ZAR' ? 'R' : (currency || 'R');
    const formatted = num.toLocaleString('en-ZA', { maximumFractionDigits: 0 }).replace(/,/g, ' ');
    return `${symbol} ${formatted}`;
}

function formatArea(value, isMetric) {
    if (value == null || value === '') return '—';
    const num = Number(String(value).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(num) || num <= 0) return '—';
    const display = num.toLocaleString('en-ZA', { maximumFractionDigits: 0 }).replace(/,/g, ' ');
    return `${display} ${isMetric ? 'm²' : 'sqft'}`;
}

/* --------------------------------------------------------------------- */
/* Property24 preview                                                    */
/* --------------------------------------------------------------------- */

function Property24Preview({ data }) {
    const [activeImg, setActiveImg] = useState(0);
    const transactionLabel = data.isRental ? 'to rent' : 'for sale';

    return (
        <div style={p24Frame}>
            {/* Top brand bar */}
            <div style={p24TopBar}>
                <div style={p24Logo}>
                    <span style={{ color: '#fff', fontWeight: 800, letterSpacing: 0.4, fontSize: 15 }}>PROPERTY</span>
                    <span style={{ background: '#fff', color: '#C8102E', fontWeight: 800, padding: '2px 6px', borderRadius: 3, marginLeft: 4, fontSize: 13 }}>24</span>
                </div>
                <div style={p24NavLinks}>
                    {['Buy', 'Rent', 'Sold Prices', 'New Developments', 'Find Agent', 'Advice'].map((l) => (
                        <span key={l} style={p24NavLink}>{l}</span>
                    ))}
                </div>
            </div>

            {/* Breadcrumb */}
            <div style={p24Breadcrumb}>
                <span>Property {transactionLabel}</span>
                <i className="fas fa-chevron-right" style={p24Crumb} />
                <span>{data.province || 'Province'}</span>
                <i className="fas fa-chevron-right" style={p24Crumb} />
                <span>{data.city || 'City'}</span>
                <i className="fas fa-chevron-right" style={p24Crumb} />
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{data.suburb || 'Suburb'}</span>
            </div>

            {/* Title row */}
            <div style={p24TitleRow}>
                <div>
                    <h1 style={p24Title}>
                        {data.beds ? `${data.beds} Bedroom ` : ''}{data.propertyType} {transactionLabel} in {data.suburb || data.city || 'South Africa'}
                    </h1>
                    <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>
                        {[data.street, data.suburb, data.city].filter(Boolean).join(', ')}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={p24Price}>{data.price}{data.isRental ? <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}> p/m</span> : null}</div>
                    {data.isPriceReduced && (
                        <div style={p24ReducedTag}><i className="fas fa-tag" style={{ marginRight: 4 }} />Price Reduced</div>
                    )}
                </div>
            </div>

            {/* Gallery */}
            <div style={p24Gallery}>
                <img
                    src={data.images[activeImg] || data.images[0]}
                    alt="Property"
                    style={p24HeroImg}
                />
                {data.isFeatured && <div style={p24FeaturedBadge}>FEATURED</div>}
                <div style={p24PhotoCount}>
                    <i className="fas fa-camera" style={{ marginRight: 6 }} />
                    {data.images.length} photo{data.images.length === 1 ? '' : 's'}
                </div>
            </div>
            {data.images.length > 1 && (
                <div style={p24Thumbs}>
                    {data.images.slice(0, 6).map((src, i) => (
                        <img
                            key={i}
                            src={src}
                            alt=""
                            onClick={() => setActiveImg(i)}
                            style={{
                                ...p24Thumb,
                                outline: i === activeImg ? '2px solid #C8102E' : '1px solid #e2e8f0',
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Body grid */}
            <div style={p24BodyGrid}>
                {/* Left column */}
                <div>
                    {/* Stats strip */}
                    <div style={p24Stats}>
                        <Stat icon="fa-bed" value={data.beds} label="Beds" />
                        <Stat icon="fa-bath" value={data.baths} label="Baths" />
                        <Stat icon="fa-car" value={data.garages} label="Parking" />
                        <Stat icon="fa-ruler-combined" value={formatArea(data.floorSize, data.floorMetric)} label="Floor" />
                        {data.erfSize ? <Stat icon="fa-tree" value={formatArea(data.erfSize, true)} label="Erf" /> : null}
                    </div>

                    {/* Description */}
                    <h3 style={p24SectionH}>Description</h3>
                    <p style={p24Body}>{data.description}</p>

                    {/* Property details */}
                    <h3 style={p24SectionH}>Property Overview</h3>
                    <div style={p24DetailGrid}>
                        <DetailRow label="Listing Number" value={data.reference} />
                        <DetailRow label="Type of Property" value={data.propertyType} />
                        <DetailRow label="Listing Date" value={new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })} />
                        {data.erfSize ? <DetailRow label="Erf Size" value={formatArea(data.erfSize, true)} /> : null}
                        {data.floorSize ? <DetailRow label="Floor Size" value={formatArea(data.floorSize, data.floorMetric)} /> : null}
                        {data.beds ? <DetailRow label="Bedrooms" value={data.beds} /> : null}
                        {data.baths ? <DetailRow label="Bathrooms" value={data.baths} /> : null}
                        {data.garages ? <DetailRow label="Parking" value={data.garages} /> : null}
                    </div>
                </div>

                {/* Right column — agent card */}
                <aside style={p24AgentCard}>
                    <div style={p24AgentHead}>
                        <div style={p24Avatar}>{(data.agentName || 'A').slice(0, 1).toUpperCase()}</div>
                        <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{data.agentName}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{data.agencyName}</div>
                        </div>
                    </div>

                    <div style={{ height: 1, background: '#e2e8f0', margin: '12px 0' }} />

                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Send Enquiry</div>
                    <div style={p24FormStack}>
                        <input style={p24Input} placeholder="Full Name" disabled />
                        <input style={p24Input} placeholder="Email Address" disabled />
                        <input style={p24Input} placeholder="Contact Number" disabled />
                        <textarea style={{ ...p24Input, minHeight: 60, resize: 'none' }} placeholder={`Hi, I'm interested in this property...`} disabled />
                        <button style={p24EnquireBtn} type="button" disabled>
                            <i className="fas fa-envelope" style={{ marginRight: 6 }} />Email Agent
                        </button>
                        <button style={p24CallBtn} type="button" disabled>
                            <i className="fas fa-phone" style={{ marginRight: 6 }} />Show Number
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}

const Stat = ({ icon, value, label }) => (
    <div style={statCell}>
        <i className={`fas ${icon}`} style={{ color: '#C8102E', fontSize: 16 }} />
        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, marginTop: 4 }}>{value || '—'}</div>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
);

const DetailRow = ({ label, value }) => (
    <div style={detailRowStyle}>
        <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
        <span style={{ color: '#0f172a', fontSize: 12, fontWeight: 600 }}>{value || '—'}</span>
    </div>
);

/* --------------------------------------------------------------------- */
/* Private Property preview                                              */
/* --------------------------------------------------------------------- */

function PrivatePropertyPreview({ data }) {
    const [activeImg, setActiveImg] = useState(0);
    const transactionLabel = data.isRental ? 'To Rent' : 'For Sale';

    return (
        <div style={ppFrame}>
            {/* Top utility strip */}
            <div style={ppUtilityBar}>
                <span>Sign In</span>
                <span>·</span>
                <span>Saved Searches</span>
                <span>·</span>
                <span>List Your Property</span>
            </div>
            {/* Brand bar */}
            <div style={ppBrandBar}>
                <div style={ppLogo}>
                    <span style={{ color: '#0a2540', fontWeight: 800, fontSize: 17, letterSpacing: -0.4 }}>Private</span>
                    <span style={{ color: '#0a2540', fontWeight: 800, fontSize: 17, letterSpacing: -0.4, marginLeft: 4 }}>Property</span>
                    <span style={{ background: '#E8472C', width: 6, height: 6, borderRadius: '50%', marginLeft: 4, marginTop: 7 }} />
                </div>
                <div style={ppNavTabs}>
                    {['For Sale', 'To Rent', 'Commercial', 'Farms', 'On Show', 'New Developments', 'Advice'].map((l) => (
                        <span key={l} style={{ ...ppNavTab, ...(l === transactionLabel ? ppNavTabActive : {}) }}>{l}</span>
                    ))}
                </div>
            </div>

            {/* Breadcrumb */}
            <div style={ppBreadcrumb}>
                <span>Home</span>
                <span style={{ margin: '0 6px', color: '#94a3b8' }}>›</span>
                <span>Property {transactionLabel}</span>
                <span style={{ margin: '0 6px', color: '#94a3b8' }}>›</span>
                <span>{data.province || 'Province'}</span>
                <span style={{ margin: '0 6px', color: '#94a3b8' }}>›</span>
                <span>{data.city || 'City'}</span>
                <span style={{ margin: '0 6px', color: '#94a3b8' }}>›</span>
                <span style={{ color: '#0a2540', fontWeight: 600 }}>{data.suburb || 'Suburb'}</span>
            </div>

            {/* Hero gallery with overlay */}
            <div style={ppGallery}>
                <img
                    src={data.images[activeImg] || data.images[0]}
                    alt="Property"
                    style={ppHeroImg}
                />
                {data.isFeatured && <div style={ppNewBadge}>FEATURED</div>}
                {data.isPriceReduced && <div style={{ ...ppNewBadge, top: 50, background: '#ffc801', color: '#1a1a1a' }}>REDUCED</div>}
                <div style={ppPhotoCount}>
                    <i className="far fa-images" style={{ marginRight: 6 }} />
                    {data.images.length} photo{data.images.length === 1 ? '' : 's'}
                </div>
                <div style={ppPriceOverlay}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{data.price}{data.isRental ? <span style={{ fontSize: 11, fontWeight: 500 }}> /month</span> : null}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{data.titleSummary} · {data.suburb || data.city}</div>
                </div>
            </div>
            {data.images.length > 1 && (
                <div style={ppThumbs}>
                    {data.images.slice(0, 6).map((src, i) => (
                        <img
                            key={i}
                            src={src}
                            alt=""
                            onClick={() => setActiveImg(i)}
                            style={{
                                ...ppThumb,
                                outline: i === activeImg ? '2px solid #0a2540' : '1px solid #e2e8f0',
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Body grid */}
            <div style={ppBodyGrid}>
                <div>
                    {/* Title block */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <h1 style={ppTitle}>
                            {data.beds ? `${data.beds} Bedroom ` : ''}{data.propertyType} {transactionLabel} in {data.suburb || data.city || 'South Africa'}
                        </h1>
                        <button type="button" style={ppFavBtn} disabled>
                            <i className="far fa-heart" style={{ marginRight: 4 }} /> Save
                        </button>
                    </div>
                    <div style={{ color: '#475569', fontSize: 12, marginTop: 2, marginBottom: 14 }}>
                        Web Reference: {data.reference}
                    </div>

                    {/* Stats pill row */}
                    <div style={ppStatsPills}>
                        <PPStat icon="fa-bed" value={data.beds} label="Bedrooms" />
                        <PPStat icon="fa-bath" value={data.baths} label="Bathrooms" />
                        <PPStat icon="fa-car" value={data.garages} label="Garages" />
                        {data.floorSize ? <PPStat icon="fa-ruler-combined" value={formatArea(data.floorSize, data.floorMetric)} label="Floor" /> : null}
                        {data.erfSize ? <PPStat icon="fa-tree" value={formatArea(data.erfSize, true)} label="Erf" /> : null}
                    </div>

                    {/* Tabs row (visual only) */}
                    <div style={ppSectionTabs}>
                        <span style={{ ...ppSectionTab, ...ppSectionTabActive }}>Description</span>
                        <span style={ppSectionTab}>Features</span>
                        <span style={ppSectionTab}>Map &amp; Suburb</span>
                        <span style={ppSectionTab}>Bond Calculator</span>
                    </div>

                    <p style={ppBody}>{data.description}</p>

                    <h3 style={ppSectionH}>Property Details</h3>
                    <div style={ppDetailGrid}>
                        <DetailRow label="Listing Type" value={transactionLabel} />
                        <DetailRow label="Property Type" value={data.propertyType} />
                        <DetailRow label="Web Reference" value={data.reference} />
                        {data.erfSize ? <DetailRow label="Erf Size" value={formatArea(data.erfSize, true)} /> : null}
                        {data.floorSize ? <DetailRow label="Floor Size" value={formatArea(data.floorSize, data.floorMetric)} /> : null}
                        {data.beds ? <DetailRow label="Bedrooms" value={data.beds} /> : null}
                        {data.baths ? <DetailRow label="Bathrooms" value={data.baths} /> : null}
                        {data.garages ? <DetailRow label="Garages" value={data.garages} /> : null}
                    </div>
                </div>

                {/* Right column — agent card */}
                <aside style={ppAgentCard}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Contact the agent
                    </div>
                    <div style={ppAgentHead}>
                        <div style={ppAvatar}>{(data.agentName || 'A').slice(0, 1).toUpperCase()}</div>
                        <div>
                            <div style={{ fontWeight: 700, color: '#0a2540', fontSize: 13 }}>{data.agentName}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{data.agencyName}</div>
                        </div>
                    </div>

                    <button style={ppCallBtn} type="button" disabled>
                        <i className="fas fa-phone-alt" style={{ marginRight: 6 }} /> Show Contact Number
                    </button>

                    <div style={{ height: 1, background: '#e2e8f0', margin: '12px 0' }} />

                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0a2540', marginBottom: 8 }}>Get more info</div>
                    <div style={p24FormStack}>
                        <input style={ppInput} placeholder="Your Name" disabled />
                        <input style={ppInput} placeholder="Email" disabled />
                        <input style={ppInput} placeholder="Phone" disabled />
                        <textarea style={{ ...ppInput, minHeight: 60, resize: 'none' }} placeholder="I'd like to know more..." disabled />
                        <button style={ppEnquireBtn} type="button" disabled>
                            Email Agent
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}

const PPStat = ({ icon, value, label }) => (
    <div style={ppStatPill}>
        <i className={`fas ${icon}`} style={{ color: '#0a2540' }} />
        <span style={{ fontWeight: 700, color: '#0a2540' }}>{value || '—'}</span>
        <span style={{ color: '#64748b', fontSize: 11 }}>{label}</span>
    </div>
);

/* --------------------------------------------------------------------- */
/* Styles                                                                */
/* --------------------------------------------------------------------- */

const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1200,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    fontFamily: "'Inter', 'Poppins', sans-serif",
};

const shell = {
    background: '#fff', borderRadius: 14, width: 'min(1080px, 100%)',
    maxHeight: '94vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 30px 80px rgba(0,0,0,0.35)', overflow: 'hidden',
};

const headerBar = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
};

const closeBtn = {
    background: '#f1f5f9', border: 'none', width: 32, height: 32,
    borderRadius: '50%', cursor: 'pointer', color: '#475569',
};

const comingSoonBanner = {
    background: '#FEF3C7', color: '#92400E', padding: '8px 18px',
    fontSize: 12, borderBottom: '1px solid #fde68a', flexShrink: 0,
};

const tabsBar = {
    display: 'flex', gap: 6, padding: '10px 18px', borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc', flexShrink: 0,
};

const tabBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 999,
    fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer',
};
const tabBtnActiveP24 = { borderColor: '#C8102E', color: '#C8102E', background: '#fff5f6', boxShadow: '0 0 0 1px #C8102E inset' };
const tabBtnActivePP = { borderColor: '#0a2540', color: '#0a2540', background: '#eef2f7', boxShadow: '0 0 0 1px #0a2540 inset' };
const portalDot = { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' };

const body = { flex: 1, overflowY: 'auto', background: '#f1f5f9', padding: 16 };

const footerBar = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: '12px 18px', borderTop: '1px solid #e2e8f0', flexShrink: 0, background: '#fff',
};

const primaryBtn = {
    background: '#11575C', color: '#fff', border: 'none', padding: '8px 18px',
    borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
};

/* Property24 styles */
const p24Frame = { background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' };
const p24TopBar = {
    background: '#C8102E', color: '#fff', padding: '10px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const p24Logo = { display: 'flex', alignItems: 'center' };
const p24NavLinks = { display: 'flex', gap: 14, fontSize: 11, fontWeight: 600 };
const p24NavLink = { color: '#fff', opacity: 0.9 };
const p24Breadcrumb = {
    padding: '8px 16px', fontSize: 11, color: '#64748b',
    borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
};
const p24Crumb = { fontSize: 8, color: '#94a3b8' };
const p24TitleRow = {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 16, padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
};
const p24Title = { fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 };
const p24Price = { fontSize: 22, fontWeight: 800, color: '#C8102E' };
const p24ReducedTag = {
    display: 'inline-block', marginTop: 4, background: '#fee2e2', color: '#991b1b',
    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.04em',
};
const p24Gallery = { position: 'relative', background: '#0f172a' };
const p24HeroImg = { width: '100%', height: 320, objectFit: 'cover', display: 'block' };
const p24FeaturedBadge = {
    position: 'absolute', top: 12, left: 12, background: '#C8102E', color: '#fff',
    fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 3, letterSpacing: '0.06em',
};
const p24PhotoCount = {
    position: 'absolute', bottom: 12, right: 12, background: 'rgba(15,23,42,0.7)', color: '#fff',
    fontSize: 11, padding: '4px 10px', borderRadius: 999,
};
const p24Thumbs = { display: 'flex', gap: 6, padding: 8, background: '#0f172a', overflowX: 'auto' };
const p24Thumb = { width: 90, height: 60, objectFit: 'cover', borderRadius: 3, cursor: 'pointer', flexShrink: 0 };
const p24BodyGrid = {
    display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 16, padding: 16,
};
const p24Stats = {
    display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8,
    background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16,
};
const statCell = { textAlign: 'center', padding: 6 };
const p24SectionH = {
    fontSize: 13, color: '#0f172a', fontWeight: 700, margin: '12px 0 8px',
    paddingBottom: 6, borderBottom: '2px solid #C8102E', display: 'inline-block',
};
const p24Body = { fontSize: 12.5, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 };
const p24DetailGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginTop: 8 };
const detailRowStyle = {
    display: 'flex', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid #f1f5f9',
};
const p24AgentCard = {
    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, alignSelf: 'start',
};
const p24AgentHead = { display: 'flex', alignItems: 'center', gap: 10 };
const p24Avatar = {
    width: 40, height: 40, borderRadius: '50%', background: '#C8102E', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16,
};
const p24FormStack = { display: 'flex', flexDirection: 'column', gap: 6 };
const p24Input = {
    border: '1px solid #cbd5e1', borderRadius: 4, padding: '7px 10px',
    fontSize: 11, color: '#475569', background: '#fff',
};
const p24EnquireBtn = {
    background: '#C8102E', color: '#fff', border: 'none', padding: '9px 12px',
    borderRadius: 4, fontWeight: 700, fontSize: 12, cursor: 'not-allowed',
};
const p24CallBtn = {
    background: '#fff', color: '#C8102E', border: '1px solid #C8102E',
    padding: '8px 12px', borderRadius: 4, fontWeight: 700, fontSize: 12, cursor: 'not-allowed',
};

/* Private Property styles */
const ppFrame = { background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' };
const ppUtilityBar = {
    background: '#0a2540', color: '#cbd5e1', fontSize: 10, padding: '6px 16px',
    display: 'flex', gap: 8, justifyContent: 'flex-end',
};
const ppBrandBar = {
    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
};
const ppLogo = { display: 'flex', alignItems: 'flex-start' };
const ppNavTabs = { display: 'flex', gap: 16, fontSize: 12, fontWeight: 600, color: '#475569' };
const ppNavTab = { paddingBottom: 4, borderBottom: '2px solid transparent' };
const ppNavTabActive = { color: '#0a2540', borderBottom: '2px solid #E8472C' };
const ppBreadcrumb = {
    padding: '10px 16px', fontSize: 11, color: '#64748b',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
};
const ppGallery = { position: 'relative', background: '#0a2540' };
const ppHeroImg = { width: '100%', height: 360, objectFit: 'cover', display: 'block' };
const ppNewBadge = {
    position: 'absolute', top: 14, left: 14, background: '#E8472C', color: '#fff',
    fontSize: 10, fontWeight: 800, padding: '5px 10px', borderRadius: 3, letterSpacing: '0.06em',
};
const ppPhotoCount = {
    position: 'absolute', top: 14, right: 14, background: 'rgba(10,37,64,0.75)', color: '#fff',
    fontSize: 11, padding: '4px 10px', borderRadius: 999,
};
const ppPriceOverlay = {
    position: 'absolute', bottom: 16, left: 16, color: '#fff',
    background: 'rgba(10,37,64,0.78)', padding: '10px 16px', borderRadius: 6,
};
const ppThumbs = { display: 'flex', gap: 6, padding: 8, background: '#f8fafc', overflowX: 'auto' };
const ppThumb = { width: 90, height: 60, objectFit: 'cover', borderRadius: 3, cursor: 'pointer', flexShrink: 0 };
const ppBodyGrid = {
    display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 290px', gap: 16, padding: 16,
};
const ppTitle = { fontSize: 18, fontWeight: 700, color: '#0a2540', margin: 0, lineHeight: 1.3 };
const ppFavBtn = {
    background: '#fff', border: '1px solid #e2e8f0', color: '#475569',
    fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
};
const ppStatsPills = {
    display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14,
};
const ppStatPill = {
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
    background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: 999,
};
const ppSectionTabs = {
    display: 'flex', gap: 18, borderBottom: '1px solid #e2e8f0', marginBottom: 12,
};
const ppSectionTab = {
    fontSize: 12, color: '#64748b', fontWeight: 600, padding: '8px 0',
    borderBottom: '2px solid transparent',
};
const ppSectionTabActive = { color: '#0a2540', borderBottom: '2px solid #E8472C' };
const ppBody = { fontSize: 12.5, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 };
const ppSectionH = { fontSize: 13, color: '#0a2540', fontWeight: 700, margin: '16px 0 8px' };
const ppDetailGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginTop: 8 };
const ppAgentCard = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, alignSelf: 'start',
};
const ppAgentHead = { display: 'flex', alignItems: 'center', gap: 10 };
const ppAvatar = {
    width: 40, height: 40, borderRadius: '50%', background: '#0a2540', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16,
};
const ppCallBtn = {
    width: '100%', background: '#0a2540', color: '#fff', border: 'none', padding: '10px 12px',
    borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'not-allowed', marginTop: 12,
};
const ppInput = {
    border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px',
    fontSize: 11, color: '#475569', background: '#f8fafc',
};
const ppEnquireBtn = {
    background: '#E8472C', color: '#fff', border: 'none', padding: '9px 12px',
    borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'not-allowed',
};
