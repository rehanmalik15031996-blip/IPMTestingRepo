/**
 * Default pipeline statuses — used when an agency hasn't configured custom stages.
 * id is stored on the lead; title is used for column headers.
 */
export const DEFAULT_PIPELINE_STAGES = [
    { id: 'new', title: 'New', order: 0 },
    { id: 'contacted', title: 'Contacted', order: 1 },
    { id: 'qualified', title: 'Qualified', order: 2 },
    { id: 'viewing_scheduled', title: 'Viewing scheduled', order: 3 },
    { id: 'viewing_completed', title: 'Viewing completed', order: 4 },
    { id: 'negotiation', title: 'Negotiation', order: 5 },
    { id: 'under_contract', title: 'Under contract', order: 6 },
    { id: 'won', title: 'Won', order: 7 },
    { id: 'lost', title: 'Lost', order: 8 },
    { id: 'on_hold', title: 'On hold', order: 9 }
];

/** @deprecated Use DEFAULT_PIPELINE_STAGES instead; kept for backward compatibility */
export const LEAD_STATUSES = DEFAULT_PIPELINE_STAGES;

export const DEFAULT_ACTIVITY_CHANNELS = [
    { value: '', label: 'Select channel' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone call' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'sms', label: 'SMS' },
    { value: 'other', label: 'Other' }
];

/**
 * Map HubSpot lifecycle stages, lead statuses, and deal stage labels to IPM lead status ids.
 * Falls through to direct match or 'new' if unrecognized.
 */
const HUBSPOT_STATUS_MAP = {
    // HubSpot lifecycle stages
    subscriber: 'new',
    lead: 'new',
    marketingqualifiedlead: 'qualified',
    salesqualifiedlead: 'qualified',
    opportunity: 'negotiation',
    customer: 'won',
    evangelist: 'won',
    other: 'new',
    // HubSpot lead statuses
    'new': 'new',
    'open': 'new',
    'in progress': 'contacted',
    'open deal': 'negotiation',
    'unqualified': 'lost',
    'attempted to contact': 'contacted',
    'connected': 'contacted',
    'bad timing': 'on_hold',
    // HubSpot deal stage labels
    'appointment scheduled': 'viewing_scheduled',
    'qualified to buy': 'qualified',
    'presentation scheduled': 'viewing_scheduled',
    'decision maker bought-in': 'negotiation',
    'contract sent': 'under_contract',
    'closed won': 'won',
    'closed lost': 'lost',
    // Legacy IPM aliases
    negotiating: 'negotiation',
    closed: 'won',
    hubspot: 'new',
};

/**
 * Normalize legacy, HubSpot, or mixed-case status to a known stage id.
 * When customStages is provided, matches against those first (agency-specific).
 * Falls back to DEFAULT_PIPELINE_STAGES + HUBSPOT_STATUS_MAP.
 */
export function normalizeLeadStatus(status, customStages) {
    if (!status || typeof status !== 'string') return 'new';
    const s = status.trim().toLowerCase();
    const underscored = s.replace(/\s+/g, '_');
    const stages = Array.isArray(customStages) && customStages.length > 0 ? customStages : DEFAULT_PIPELINE_STAGES;

    if (stages.some((col) => col.id === s)) return s;
    if (stages.some((col) => col.id === underscored)) return underscored;

    if (HUBSPOT_STATUS_MAP[s]) {
        const mapped = HUBSPOT_STATUS_MAP[s];
        if (stages.some((col) => col.id === mapped)) return mapped;
    }

    // If the status doesn't match any configured stage, put it in the first stage
    return stages[0]?.id || 'new';
}
