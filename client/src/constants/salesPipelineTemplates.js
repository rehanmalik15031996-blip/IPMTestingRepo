/**
 * Industry-standard Sales pipeline templates for commercial / industrial
 * property sales (South Africa). Each template defines the ordered stages
 * a deal moves through from initial negotiation to registration.
 *
 * The agency picks one of these on first use of the Sales tab. They can
 * also build a fully custom pipeline. The chosen template is persisted on
 * the user as `agencyStats.salesConfig.{ template, pipelineStages }`.
 */

const stage = (id, title, order, color, hint) => ({ id, title, order, color, hint });

export const SALES_PIPELINE_TEMPLATES = {
    'industrial-sale-sa': {
        id: 'industrial-sale-sa',
        label: 'Industrial / Warehouse Sale (South Africa)',
        description: 'Best for industrial, warehouse and logistics property sales — covers SA conveyancing & deeds-office workflow.',
        recommended: true,
        stages: [
            stage('negotiation',         'Negotiation',          0, '#f59e0b', 'Active price + terms negotiation'),
            stage('loi',                 'LOI / Heads of Terms', 1, '#eab308', 'Non-binding intent agreed'),
            stage('due_diligence',       'Due Diligence',        2, '#0ea5e9', 'Inspections, zoning, environmental'),
            stage('bond_approval',       'Bond Approval',        3, '#3b82f6', 'Buyer financing / bond commitment'),
            stage('sale_agreement',      'Sale Agreement Signed',4, '#6366f1', 'Binding offer accepted in writing'),
            stage('conveyancing',        'Conveyancing',         5, '#8b5cf6', 'Attorneys preparing transfer docs'),
            stage('lodgement',           'Lodged at Deeds Office', 6, '#a855f7', 'Docs lodged for examination'),
            stage('registration',        'Registered',           7, '#10b981', 'Transfer registered, keys handed over'),
            stage('won',                 'Closed — Won',         8, '#16a34a', 'Commission paid, deal closed'),
            stage('lost',                'Closed — Lost',        9, '#ef4444', 'Deal fell through'),
        ],
    },
    'commercial-sale-sa': {
        id: 'commercial-sale-sa',
        label: 'Commercial Sale — Office / Retail / Mixed-Use',
        description: 'General commercial property sale flow — same SA conveyancing process, slightly different DD scope.',
        recommended: false,
        stages: [
            stage('negotiation',         'Negotiation',          0, '#f59e0b', 'Active price + terms negotiation'),
            stage('loi',                 'LOI / Heads of Terms', 1, '#eab308', 'Non-binding intent agreed'),
            stage('due_diligence',       'Due Diligence',        2, '#0ea5e9', 'Tenant schedule, leases, condition reports'),
            stage('bond_approval',       'Financing Cleared',    3, '#3b82f6', 'Buyer financing locked in'),
            stage('sale_agreement',      'Sale Agreement Signed',4, '#6366f1', 'Binding offer accepted in writing'),
            stage('conveyancing',        'Conveyancing',         5, '#8b5cf6', 'Attorneys preparing transfer docs'),
            stage('registration',        'Registered',           6, '#10b981', 'Transfer registered, keys handed over'),
            stage('won',                 'Closed — Won',         7, '#16a34a', 'Commission paid, deal closed'),
            stage('lost',                'Closed — Lost',        8, '#ef4444', 'Deal fell through'),
        ],
    },
    'commercial-lease': {
        id: 'commercial-lease',
        label: 'Commercial Lease',
        description: 'For long-term commercial leasing — heads of terms through tenant fit-out.',
        recommended: false,
        stages: [
            stage('negotiation',         'Negotiation',          0, '#f59e0b', 'Rent + terms negotiation'),
            stage('heads_of_terms',      'Heads of Terms',       1, '#eab308', 'Key commercial terms agreed'),
            stage('lease_drafted',       'Lease Drafted',        2, '#0ea5e9', 'Legal drafting in progress'),
            stage('lease_signed',        'Lease Signed',         3, '#6366f1', 'Binding lease executed'),
            stage('fit_out',             'Tenant Fit-Out',       4, '#8b5cf6', 'Tenant taking occupation'),
            stage('lease_active',        'Lease Active',         5, '#10b981', 'Rent commenced, deal closed'),
            stage('lost',                'Closed — Lost',        6, '#ef4444', 'Tenant withdrew or rejected'),
        ],
    },
    'custom': {
        id: 'custom',
        label: 'Build my own',
        description: 'Start with one stage and add the rest yourself. Best if your firm uses a unique workflow.',
        recommended: false,
        stages: [
            stage('negotiation', 'Negotiation', 0, '#f59e0b', 'Starting stage — every new deal lands here'),
            stage('won',         'Closed — Won', 1, '#16a34a', 'Final stage — deal closed successfully'),
            stage('lost',        'Closed — Lost', 2, '#ef4444', 'Final stage — deal did not close'),
        ],
    },
};

/** Resolves the active stage list for an agency: configured pipeline → industrial template default. */
export function getEffectivePipelineStages(salesConfig) {
    if (salesConfig && Array.isArray(salesConfig.pipelineStages) && salesConfig.pipelineStages.length > 0) {
        return [...salesConfig.pipelineStages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return SALES_PIPELINE_TEMPLATES['industrial-sale-sa'].stages;
}

/** Default starting stage for any new deal — first stage of the active pipeline. */
export function getInitialStageId(salesConfig) {
    return getEffectivePipelineStages(salesConfig)[0]?.id || 'negotiation';
}
