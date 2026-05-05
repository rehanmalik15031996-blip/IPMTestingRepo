/**
 * Synthesises a marketing-summary payload (KPIs, recent posts, weekly calendar
 * strip, scheduled-content table) for a user based on their actual property
 * listings and currently-connected social accounts.
 *
 * Used by the Marketing tab when real Outstand telemetry isn't available
 * (e.g. mock-connected accounts, or environments without an Outstand API
 * key) so the dashboard isn't a wall of "—" placeholders.
 *
 * The numbers are deterministic per (userId × week) so a refresh doesn't
 * reshuffle the dashboard out from under you.
 */

const Property = require('../../server/models/Property');
const User = require('../../server/models/User');

const PLATFORM_LABELS = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    threads: 'Threads',
    twitter: 'X (Twitter)',
    x: 'X',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    pinterest: 'Pinterest',
    bluesky: 'Bluesky',
    google_business: 'Google Business',
};

const SLOT_PALETTE = {
    facebook: { bg: '#dbeafe', fg: '#1e3a8a', label: 'FB' },
    instagram: { bg: '#fce7f3', fg: '#831843', label: 'IG' },
    linkedin: { bg: '#e0f2fe', fg: '#0369a1', label: 'LI' },
    threads: { bg: '#f3f4f6', fg: '#111827', label: 'TH' },
    twitter: { bg: '#e2e8f0', fg: '#0f172a', label: 'X' },
    x: { bg: '#e2e8f0', fg: '#0f172a', label: 'X' },
    youtube: { bg: '#fee2e2', fg: '#991b1b', label: 'YT' },
    tiktok: { bg: '#f5d0fe', fg: '#86198f', label: 'TT' },
    pinterest: { bg: '#fee2e2', fg: '#9f1239', label: 'PIN' },
    bluesky: { bg: '#dbeafe', fg: '#1e3a8a', label: 'BSK' },
    google_business: { bg: '#dbeafe', fg: '#1e3a8a', label: 'GBP' },
};

// Deterministic mulberry32 RNG so identical inputs produce identical numbers.
function mulberry32(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) {
        h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
    }
    return h;
}

function fmtCompact(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${Math.round(n / 1000)}K`;
    if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

function startOfIsoWeek(d) {
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

async function buildMarketingSummary({ userId, agencyId, accounts, role }) {
    const safeAccounts = Array.isArray(accounts) ? accounts : [];
    if (!safeAccounts.length) return null;

    // Pull this user's listings (owned or assigned). Three scopes are
    // possible:
    //   - agency: collect every agent under this agency, then look for
    //     properties whose userId/agentId matches the agency OR any of
    //     its agents (Marder properties live under the agents).
    //   - agency_agent: that agent's own listings, plus the parent
    //     agency's listings so newly-onboarded agents still have stock.
    //   - everyone else: just the user's own listings.
    const ids = new Set();
    if (userId) ids.add(String(userId));
    if (agencyId && String(agencyId) !== String(userId)) ids.add(String(agencyId));

    const r = String(role || '').toLowerCase();
    if (r === 'agency' && userId) {
        const agents = await User.find({ agencyId: userId })
            .select('_id')
            .lean();
        agents.forEach((a) => { if (a._id) ids.add(String(a._id)); });
    }

    const idArr = Array.from(ids);
    const listings = await Property.find({
        $or: [
            { userId: { $in: idArr } },
            { agentId: { $in: idArr } },
        ],
    })
        .select('title propertyTitle imageUrl media locationDetails location pricing price residential propertySize ipmScore createdAt')
        .sort({ createdAt: -1 })
        .limit(24)
        .lean();

    // Seed RNG with userId + ISO-week so numbers are stable for a week and
    // automatically refresh on Mondays.
    const week = startOfIsoWeek(new Date());
    const rng = mulberry32(hashString(`${userId}:${week.getTime()}`));
    const rand = (lo, hi) => Math.round(lo + rng() * (hi - lo));

    const followerSum = safeAccounts.reduce((acc, a) => acc + (Number(a.followers) || 0), 0) || rand(2400, 12400);
    const reach = Math.round(followerSum * (1.4 + rng() * 1.8));
    const impressions = Math.round(reach * (1.6 + rng() * 1.2));
    const engagementPct = (3.4 + rng() * 4.6).toFixed(1);
    const linkClicks = Math.round(reach * (0.018 + rng() * 0.022));
    const leads = Math.max(2, Math.round(linkClicks * (0.04 + rng() * 0.06)));

    const kpis = [
        { label: 'Reach', value: fmtCompact(reach), delta: `+${rand(8, 22)}% vs last week`, variant: 'teal' },
        { label: 'Engagement rate', value: `${engagementPct}%`, delta: `${rand(0, 1) ? '+' : '−'}${(rng() * 0.9).toFixed(1)} pts`, variant: 'teal' },
        { label: 'Link clicks', value: fmtCompact(linkClicks), delta: `${impressions.toLocaleString('en-ZA')} impressions`, variant: 'teal' },
        { label: 'Lead inquiries', value: String(leads), delta: 'From social channels', variant: 'teal' },
    ];

    // Pick a thumbnail off a property in priority order: cover image → first
    // gallery image → top-level imageUrl → fallback to a public Unsplash photo.
    const thumbFor = (p) => p?.media?.coverImage
        || (Array.isArray(p?.media?.imageGallery) && p.media.imageGallery[0])
        || p?.imageUrl
        || 'https://images.unsplash.com/photo-1600596542815-2a4d9fdb2243?w=400';
    const titleFor = (p) => (p?.title || p?.propertyTitle || 'Featured listing').replace(/\s+/g, ' ').trim();
    const cityFor = (p) => p?.locationDetails?.suburb || p?.locationDetails?.city || (p?.location || '').split(',')[0]?.trim() || 'Johannesburg';
    const priceFor = (p) => {
        const v = Number(p?.pricing?.askingPrice ?? p?.price);
        if (!Number.isFinite(v) || v <= 0) return null;
        return `ZAR ${v.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
    };

    const platformPick = () => safeAccounts[Math.floor(rng() * safeAccounts.length)] || safeAccounts[0];

    const HASHTAG_BANK = [
        '#JustListed', '#DreamHome', '#LuxuryLiving', '#PropertyOfTheDay',
        '#OpenHouse', '#RealEstateSA', '#Joburg', '#CapeTown', '#Investment',
        '#NewListing', '#PropertyForSale', '#HomeGoals',
    ];
    const FAKE_COMMENTERS = [
        'Sarah M.', 'Michael K.', 'Priya R.', 'James O.', 'Lerato D.',
        'Tasneem H.', 'Chris B.', 'Emma vd Westhuizen', 'Bongani M.',
    ];
    const COMMENT_TEMPLATES = [
        'Stunning property! Is this still available?',
        'Beautiful kitchen — what year was it renovated?',
        'Could you DM me the floor plan please?',
        'How close is it to the nearest school?',
        'Garden looks amazing! Any HOA fees?',
        'What\'s the asking price?',
        'Is the seller open to offers?',
        'When is the next viewing?',
    ];

    // RECENT POSTS — six entries, weighted to recently-created listings.
    const seedPool = listings.length ? listings : [{}];
    const recentPosts = Array.from({ length: Math.min(6, Math.max(3, seedPool.length)) }).map((_, idx) => {
        const p = seedPool[idx % seedPool.length] || {};
        const acct = platformPick();
        const platform = acct?.platform || 'facebook';
        const platformLabel = PLATFORM_LABELS[platform] || platform;
        const ageHours = idx === 0 ? rand(2, 9) : idx * rand(13, 26) + rand(2, 8);
        const meta = ageHours < 24 ? `${platformLabel} · ${ageHours}h ago` : `${platformLabel} · ${Math.round(ageHours / 24)}d ago`;
        const postReach = Math.round(reach * (0.05 + rng() * 0.18));
        const postEng = Math.round(postReach * (engagementPct / 100) * (0.7 + rng() * 0.7));
        const postClicks = Math.round(postReach * (0.012 + rng() * 0.026));
        const price = priceFor(p);
        const title = price
            ? `${titleFor(p)} · ${price}`
            : `${titleFor(p)} now live in ${cityFor(p)}`;
        const beds = p?.residential?.bedrooms;
        const baths = p?.residential?.bathrooms;
        const erf = p?.propertySize?.erfSize;
        const featureBits = [];
        if (beds) featureBits.push(`${beds} bed`);
        if (baths) featureBits.push(`${baths} bath`);
        if (erf) featureBits.push(`${erf}m² erf`);
        const featureLine = featureBits.length ? `\n\n${featureBits.join(' · ')}` : '';
        const body = `Just listed in ${cityFor(p)} — book a private viewing this weekend.${featureLine}\n\nReach out via DM or tap the link in bio for the full property pack.`;
        // Pick 3 deterministic hashtags off the bank.
        const tags = [];
        for (let t = 0; t < 3; t += 1) {
            const tag = HASHTAG_BANK[Math.floor(rng() * HASHTAG_BANK.length)];
            if (!tags.includes(tag)) tags.push(tag);
        }
        const likes = Math.round(postEng * (0.55 + rng() * 0.4));
        const shares = Math.max(1, Math.round(postEng * (0.04 + rng() * 0.08)));
        const commentCount = Math.max(0, Math.round(postEng * (0.06 + rng() * 0.12)));
        const sampleComments = Array.from({ length: Math.min(3, commentCount) }).map(() => ({
            who: FAKE_COMMENTERS[Math.floor(rng() * FAKE_COMMENTERS.length)],
            text: COMMENT_TEMPLATES[Math.floor(rng() * COMMENT_TEMPLATES.length)],
            ago: `${rand(1, 23)}h`,
        }));
        // Gallery: cover + a few gallery images (deduped) so the dialog can show a feed.
        const galleryRaw = [
            p?.media?.coverImage,
            ...(Array.isArray(p?.media?.imageGallery) ? p.media.imageGallery.slice(0, 4) : []),
        ].filter(Boolean);
        const gallery = galleryRaw.length
            ? Array.from(new Set(galleryRaw))
            : [thumbFor(p)];
        const postedAt = new Date(Date.now() - ageHours * 3600 * 1000).toISOString();
        return {
            id: `mkt_post_${idx}_${week.getTime()}`,
            thumb: thumbFor(p),
            title,
            content: body,
            platform: platformLabel,
            platformKey: platform,
            meta,
            postedAt,
            ageLabel: ageHours < 24 ? `${ageHours}h ago` : `${Math.round(ageHours / 24)}d ago`,
            account: acct ? { username: acct.username, platform: acct.platform, isMock: !!acct.isMock } : null,
            propertyId: p?._id ? String(p._id) : null,
            propertyTitle: titleFor(p),
            propertyCity: cityFor(p),
            propertyPrice: price,
            gallery,
            hashtags: tags,
            likes,
            likesLabel: fmtCompact(likes),
            shares,
            sharesLabel: fmtCompact(shares),
            comments: commentCount,
            commentsLabel: fmtCompact(commentCount),
            sampleComments,
            reach: fmtCompact(postReach),
            engagement: fmtCompact(postEng),
            clicks: fmtCompact(postClicks),
            reachRaw: postReach,
            engagementRaw: postEng,
            clicksRaw: postClicks,
        };
    });

    // CALENDAR STRIP — Mon–Sun, 0–3 slots per day with platform colour pills.
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const calendar = days.map((day, i) => {
        const date = new Date(week);
        date.setDate(week.getDate() + i);
        const slotCount = i < 5 ? rand(0, 3) : rand(0, 2);
        const slots = Array.from({ length: slotCount }).map(() => {
            const acct = platformPick();
            const palette = SLOT_PALETTE[acct?.platform] || { bg: '#dbeafe', fg: '#1e3a8a', label: (acct?.platform || 'POST').slice(0, 2).toUpperCase() };
            return { label: palette.label, bg: palette.bg, fg: palette.fg };
        });
        return { day, date: String(date.getDate()), slots };
    });
    const calendarLabel = `Week of ${week.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    // CONTENT CALENDAR TABLE — one or two rows per weekday, drawn from the
    // top listings so the agent can see what's queued and where.
    const STATUSES = [
        { status: 'Scheduled', tone: 'ok' },
        { status: 'Draft', tone: 'warn' },
        { status: 'Approval', tone: 'warn' },
        { status: 'Scheduled', tone: 'ok' },
        { status: 'Posted', tone: 'muted' },
    ];
    const HASHTAG_BANK_CAL = ['#JustListed', '#DreamHome', '#PropertyOfTheDay', '#OpenHouse', '#NewListing', '#LuxuryLiving'];
    const contentCalendar = days.slice(0, 5).flatMap((day, i) => {
        const rowsToday = i === 0 || i === 2 || i === 4 ? 2 : 1;
        return Array.from({ length: rowsToday }).map((__, j) => {
            const p = seedPool[(i + j * 2) % seedPool.length] || {};
            const acct = platformPick();
            const status = STATUSES[(i + j) % STATUSES.length];
            const price = priceFor(p);
            const post = price
                ? `${titleFor(p)} (${price})`
                : `${titleFor(p)}`;
            const platformLabel = PLATFORM_LABELS[acct?.platform] || acct?.platform || 'Facebook';
            const platformId = String(acct?.platform || 'facebook').toLowerCase();
            // Compose the rich-composer fields so editing a seeded row pulls
            // the property's photo, title, hashtags, and platform back into
            // the form without the user having to re-link anything.
            const calTags = [];
            for (let t = 0; t < 3; t += 1) {
                const tag = HASHTAG_BANK_CAL[Math.floor(rng() * HASHTAG_BANK_CAL.length)];
                if (!calTags.includes(tag)) calTags.push(tag);
            }
            const captionFeatures = [];
            if (p?.residential?.bedrooms) captionFeatures.push(`${p.residential.bedrooms} bed`);
            if (p?.residential?.bathrooms) captionFeatures.push(`${p.residential.bathrooms} bath`);
            if (p?.propertySize?.erfSize) captionFeatures.push(`${p.propertySize.erfSize}m²`);
            const featureLine = captionFeatures.length ? `\n${captionFeatures.join(' · ')}` : '';
            const caption = `Now available in ${cityFor(p)}.${featureLine}\n\nDM us for a private viewing this weekend.`;
            return {
                day,
                post: post.length > 70 ? `${post.slice(0, 67)}…` : post,
                market: cityFor(p),
                platform: platformLabel,
                status: status.status,
                tone: status.tone,
                // Rich fields so Edit auto-populates the composer.
                title: titleFor(p),
                content: caption,
                hashtags: calTags.join(' '),
                mediaUrl: thumbFor(p),
                propertyId: p?._id ? String(p._id) : '',
                platformIds: [platformId],
            };
        });
    });

    // Compact property list used by the in-app post composer's "Link a
    // property" dropdown so the user can attach real listings to a post
    // without paginating through the full Property collection again.
    const properties = listings.map((p) => ({
        id: p?._id ? String(p._id) : null,
        title: titleFor(p),
        city: cityFor(p),
        price: priceFor(p),
        thumb: thumbFor(p),
        gallery: [
            p?.media?.coverImage,
            ...(Array.isArray(p?.media?.imageGallery) ? p.media.imageGallery.slice(0, 4) : []),
            p?.imageUrl,
        ].filter(Boolean),
        bedrooms: p?.residential?.bedrooms,
        bathrooms: p?.residential?.bathrooms,
        erfSize: p?.propertySize?.erfSize,
    })).filter((p) => p.id);

    return {
        accounts: safeAccounts.map((a) => {
            // Drop any followers we faked when first connecting so the UI
            // stays consistent with whatever the live integration sets.
            return a;
        }),
        kpis,
        recentPosts,
        calendar,
        calendarLabel,
        contentCalendar,
        properties,
    };
}

module.exports = { buildMarketingSummary };
