import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../config/api';
import { getDashboardCache, setDashboardCache, invalidateDashboardCache } from '../config/dashboardCache';
import { showNotification } from '../components/NotificationManager';
import AddNewLeadModal from '../components/AddNewLeadModal';
import LeadDetailPopup from '../components/LeadDetailPopup';
import EditLeadModal from '../components/EditLeadModal';
import AddAgentModal from '../components/AddAgentModal';
import LogoLoading from '../components/LogoLoading';
import { LEAD_STATUSES, DEFAULT_PIPELINE_STAGES, normalizeLeadStatus } from '../constants/leadStatuses';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getCachedMetadataForLead } from '../utils/crmCmaCache';
import { dedupePropertyTitle } from '../utils/propertyTitle';
import { sanitizeAgencyBranchDisplay } from '../utils/display';

const CRM_AUTOMATION_STORAGE_KEY = (uid) => `crm_automation_rules_${uid || 'anon'}`;

const AUTOMATION_TRIGGERS = [
    { value: 'enter_stage', label: 'Enter stage' },
    { value: 'leave_stage', label: 'Leave stage' },
    { value: 'days_in_stage', label: 'Days in stage' }
];

// Stage-specific automation actions (options shown in the "Action" dropdown per phase)
const STAGE_AUTOMATION_ACTIONS = {
    new: [
        { value: 'welcome_email', label: 'Welcome email' },
        { value: 'welcome_sms', label: 'Welcome SMS' },
        { value: 'welcome_whatsapp', label: 'Welcome WhatsApp' }
    ],
    contacted: [
        { value: 'follow_up_email', label: 'Follow-up email' },
        { value: 'follow_up_sms', label: 'Follow-up SMS' },
        { value: 'intro_call_reminder', label: 'Intro call reminder' }
    ],
    qualified: [
        { value: 'qualified_confirmation_email', label: 'Qualified confirmation email' },
        { value: 'next_steps_email', label: 'Next steps email' },
        { value: 'property_matches_sms', label: 'Property matches SMS' }
    ],
    viewing_scheduled: [
        { value: 'viewing_booked_email', label: 'Viewing booked email', askPropertyDateTime: true },
        { value: 'viewing_reminder_email', label: 'Reminder email (days before viewing)', daysBefore: true },
        { value: 'viewing_reminder_sms', label: 'Reminder SMS (days before viewing)', daysBefore: true },
        { value: 'viewing_reminder_whatsapp', label: 'Reminder WhatsApp (days before viewing)', daysBefore: true }
    ],
    viewing_completed: [
        { value: 'thank_you_email', label: 'Thank you email' },
        { value: 'feedback_request_email', label: 'Feedback request email' },
        { value: 'next_steps_email', label: 'Next steps email' }
    ],
    negotiation: [
        { value: 'offer_submitted_email', label: 'Offer submitted email' },
        { value: 'negotiation_update_sms', label: 'Negotiation update SMS' }
    ],
    under_contract: [
        { value: 'contract_signed_email', label: 'Contract signed email' },
        { value: 'conveyancing_reminder', label: 'Conveyancing reminder (days before)', daysBefore: true }
    ],
    won: [
        { value: 'congratulations_email', label: 'Congratulations email' },
        { value: 'handover_details_email', label: 'Handover details email' }
    ],
    lost: [
        { value: 'sorry_we_missed_you_email', label: 'Sorry we missed you email' },
        { value: 'keep_in_touch_email', label: 'Keep in touch email' }
    ],
    on_hold: [
        { value: 'on_hold_check_in_email', label: 'On hold check-in email' },
        { value: 'on_hold_reminder_days', label: 'Check-in reminder (days in stage)', daysBefore: true }
    ]
};

// Fallback for any stage not in the map (e.g. future stages)
const DEFAULT_STAGE_ACTIONS = [
    { value: 'send_email', label: 'Send email' },
    { value: 'send_sms', label: 'Send SMS' },
    { value: 'send_whatsapp', label: 'Send WhatsApp' }
];

// When lead LEAVES a stage, only generic actions make sense (no "welcome" or stage-entry actions)
const LEAVE_STAGE_ACTIONS = DEFAULT_STAGE_ACTIONS;

// When lead has been IN stage for X days (days_in_stage), show reminder/follow-up actions only (no welcome/entry)
const DAYS_IN_STAGE_ACTIONS = {
    new: [
        { value: 'send_email', label: 'Reminder to contact (email)' },
        { value: 'send_sms', label: 'Reminder to contact (SMS)' }
    ],
    contacted: [
        { value: 'follow_up_email', label: 'Follow-up email' },
        { value: 'follow_up_sms', label: 'Follow-up SMS' },
        { value: 'intro_call_reminder', label: 'Intro call reminder' }
    ],
    qualified: [
        { value: 'next_steps_email', label: 'Next steps email' },
        { value: 'property_matches_sms', label: 'Property matches SMS' }
    ],
    viewing_scheduled: [
        { value: 'viewing_reminder_email', label: 'Reminder email (days before viewing)', daysBefore: true },
        { value: 'viewing_reminder_sms', label: 'Reminder SMS (days before viewing)', daysBefore: true },
        { value: 'viewing_reminder_whatsapp', label: 'Reminder WhatsApp (days before viewing)', daysBefore: true }
    ],
    viewing_completed: [
        { value: 'thank_you_email', label: 'Thank you email' },
        { value: 'feedback_request_email', label: 'Feedback request email' },
        { value: 'next_steps_email', label: 'Next steps email' }
    ],
    negotiation: [
        { value: 'negotiation_update_sms', label: 'Negotiation update SMS' }
    ],
    under_contract: [
        { value: 'conveyancing_reminder', label: 'Conveyancing reminder (days before)', daysBefore: true }
    ],
    won: [
        { value: 'handover_details_email', label: 'Handover details email' }
    ],
    lost: [
        { value: 'keep_in_touch_email', label: 'Keep in touch email' }
    ],
    on_hold: [
        { value: 'on_hold_check_in_email', label: 'On hold check-in email' },
        { value: 'on_hold_reminder_days', label: 'Check-in reminder (days in stage)', daysBefore: true }
    ]
};

/** Returns actions valid for this stage + trigger. Enter = entry actions; Leave = generic only; Days in stage = reminder/follow-up only. */
function getActionsForStageAndTrigger(stageId, trigger) {
    if (trigger === 'leave_stage') return LEAVE_STAGE_ACTIONS;
    if (trigger === 'days_in_stage') return DAYS_IN_STAGE_ACTIONS[stageId] || DEFAULT_STAGE_ACTIONS;
    return STAGE_AUTOMATION_ACTIONS[stageId] || DEFAULT_STAGE_ACTIONS;
}

function getActionsForStage(stageId) {
    return STAGE_AUTOMATION_ACTIONS[stageId] || DEFAULT_STAGE_ACTIONS;
}

function getActionLabelForStage(stageId, actionValue) {
    const actions = getActionsForStage(stageId);
    let found = actions.find((a) => a.value === actionValue);
    if (!found) found = DEFAULT_STAGE_ACTIONS.find((a) => a.value === actionValue);
    return found ? found.label : actionValue || '—';
}

/** Resolve action label for a rule (uses trigger so "days in stage" / "leave" actions show correct label). */
function getActionLabelForStageAndTrigger(stageId, trigger, actionValue) {
    const actions = getActionsForStageAndTrigger(stageId, trigger);
    const found = actions.find((a) => a.value === actionValue);
    return found ? found.label : getActionLabelForStage(stageId, actionValue);
}

const formatBudgetDisplay = (val, currency) => {
    if (!val || val === '—') return '—';
    const str = String(val).replace(/,/g, '');
    const num = parseFloat(str);
    if (!isNaN(num) && /^[\d.]+$/.test(str.trim())) {
        const prefix = currency || 'ZAR';
        return `${prefix} ${Math.round(num).toLocaleString('en-ZA')}`;
    }
    return val;
};

const CRM = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user?._id != null ? String(user._id) : undefined;
    const isAgency = (user?.role || '').toLowerCase() === 'agency';
    const isMobile = useIsMobile();
    const [leads, setLeads] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddLeadModal, setShowAddLeadModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [editingLead, setEditingLead] = useState(null);
    const [dragOverColId, setDragOverColId] = useState(null);
    const [agentFilter, setAgentFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [leadTypeFilter, setLeadTypeFilter] = useState('');
    const [showBulkTransferModal, setShowBulkTransferModal] = useState(false);
    const [bulkTransferFrom, setBulkTransferFrom] = useState('');
    const [bulkTransferTo, setBulkTransferTo] = useState('');
    const [bulkTransferLoading, setBulkTransferLoading] = useState(false);
    const [statusReasonModal, setStatusReasonModal] = useState(null);
    const [statusReasonText, setStatusReasonText] = useState('');
    const [viewingScheduledModal, setViewingScheduledModal] = useState(null);
    const [viewingProperty, setViewingProperty] = useState('');
    const [viewingDate, setViewingDate] = useState('');
    const [viewingTime, setViewingTime] = useState('');
    const [showAddAgentModal, setShowAddAgentModal] = useState(false);
    const [automationModalStage, setAutomationModalStage] = useState(null);
    const [automationRulesByStage, setAutomationRulesByStage] = useState({});
    const [leadMatchesModal, setLeadMatchesModal] = useState(null);
    const [leadMatchesLoading, setLeadMatchesLoading] = useState(false);
    const [leadMatchesModalSelectedIds, setLeadMatchesModalSelectedIds] = useState(new Set());
    const [newRuleForm, setNewRuleForm] = useState({
        trigger: 'enter_stage',
        triggerDays: '',
        action: '',
        daysBefore: '',
        property: '',
        scheduleDate: '',
        scheduleTime: ''
    });
    const [pipelineStages, setPipelineStages] = useState(null);
    const [pipelineConfigLoaded, setPipelineConfigLoaded] = useState(false);
    const [activityChannels, setActivityChannels] = useState(null);
    const [showPipelineSettings, setShowPipelineSettings] = useState(false);
    const dragLeadRef = useRef(null);

    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        if (searchParams.get('action') === 'addLead') {
            setShowAddLeadModal(true);
            searchParams.delete('action');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    // Load agency CRM config (custom pipeline stages + activity channels)
    useEffect(() => {
        if (!userId || !isAgency) return;
        (async () => {
            try {
                const res = await api.get('/api/agency/migration/crm-config');
                const cfg = res.data?.crmConfig;
                if (Array.isArray(cfg?.pipelineStages) && cfg.pipelineStages.length > 0) {
                    setPipelineStages(cfg.pipelineStages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
                }
                if (Array.isArray(cfg?.activityChannels) && cfg.activityChannels.length > 0) {
                    setActivityChannels(cfg.activityChannels);
                }
            } catch (_) { /* fallback to defaults */ }
            setPipelineConfigLoaded(true);
        })();
    }, [userId, isAgency]);

    // Load automation rules from localStorage
    useEffect(() => {
        if (!userId) return;
        try {
            const raw = localStorage.getItem(CRM_AUTOMATION_STORAGE_KEY(userId));
            const parsed = raw ? JSON.parse(raw) : {};
            setAutomationRulesByStage(typeof parsed === 'object' && parsed !== null ? parsed : {});
        } catch (_) {
            setAutomationRulesByStage({});
        }
    }, [userId]);

    const persistAutomationRules = useCallback((rules) => {
        if (!userId) return;
        try {
            localStorage.setItem(CRM_AUTOMATION_STORAGE_KEY(userId), JSON.stringify(rules));
        } catch (_) {}
    }, [userId]);

    const addAutomationRule = useCallback((stageId, rule) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setAutomationRulesByStage((prev) => {
            const next = { ...prev, [stageId]: [...(prev[stageId] || []), { ...rule, id }] };
            persistAutomationRules(next);
            return next;
        });
        const firstAction = getActionsForStage(stageId)[0];
        setNewRuleForm({
            trigger: 'enter_stage',
            triggerDays: '',
            action: firstAction?.value || '',
            daysBefore: '',
            property: '',
            scheduleDate: '',
            scheduleTime: ''
        });
    }, [persistAutomationRules]);

    const removeAutomationRule = useCallback((stageId, ruleId) => {
        setAutomationRulesByStage((prev) => {
            const list = (prev[stageId] || []).filter((r) => r.id !== ruleId);
            const next = { ...prev, [stageId]: list };
            persistAutomationRules(next);
            return next;
        });
    }, [persistAutomationRules]);

    const fetchLeads = useCallback(async (bypassCache = false, options = {}) => {
        const { preserveNonEmpty = false, minLength } = options;
        if (!userId) return;
        try {
            if (!bypassCache) {
                const cached = getDashboardCache(userId);
                if (cached) {
                    const source = cached.agentStats || cached.stats;
                    setLeads(source?.crmLeads || []);
                    if (isAgency) setAgents(cached.stats?.topAgents || cached.agentStats?.topAgents || []);
                    setLoading(false);
                    return;
                }
            }

            const url = bypassCache
                ? `/api/users/${userId}?type=dashboard&_=${Date.now()}`
                : `/api/users/${userId}?type=dashboard`;
            const res = await api.get(url);
            setDashboardCache(userId, res.data);
            const source = res.data.agentStats || res.data.stats;
            const nextLeads = source?.crmLeads || [];
            if (preserveNonEmpty && nextLeads.length === 0) {
                return;
            }
            if (minLength != null && nextLeads.length < minLength) {
                return;
            }
            setLeads(nextLeads);
            setSelectedLead((prev) => {
                if (!prev) return null;
                const found = nextLeads.find((l) =>
                    (prev.id && l.id && String(prev.id) === String(l.id)) ||
                    ((prev.email || '').trim().toLowerCase() === (l.email || '').trim().toLowerCase() && (prev.name || '').trim().toLowerCase() === (l.name || '').trim().toLowerCase())
                );
                return found || prev;
            });
            if (isAgency) setAgents(res.data.stats?.topAgents || res.data.agentStats?.topAgents || []);
        } catch (err) {
            console.error("CRM fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [userId, isAgency]);

    // Agencies: use their custom stages (blank if none configured). Agents: always use defaults.
    const columns = isAgency ? (pipelineStages || []) : DEFAULT_PIPELINE_STAGES;
    const hasNoPipeline = isAgency && pipelineConfigLoaded && columns.length === 0;
    const normStatus = useCallback((status) => normalizeLeadStatus(status, columns.length > 0 ? columns : DEFAULT_PIPELINE_STAGES), [columns]);

    const filteredLeads = useMemo(() => {
        let list = leads;
        if (isAgency && agentFilter) {
            list = list.filter((l) => String(l.assignedAgentId || '') === agentFilter);
        }
        const q = (searchQuery || '').trim().toLowerCase();
        if (q) {
            list = list.filter((l) => {
                const name = (l.name || '').toLowerCase();
                const email = (l.email || '').toLowerCase();
                const mobile = (l.mobile || '').toLowerCase();
                return name.includes(q) || email.includes(q) || mobile.includes(q);
            });
        }
        if (leadTypeFilter) {
            list = list.filter((l) => (l.leadType || 'buyer') === leadTypeFilter);
        }
        return list;
    }, [leads, isAgency, agentFilter, searchQuery, leadTypeFilter]);

    useEffect(() => {
        // Agents: bypass cache so newly assigned leads from agency show up immediately
        fetchLeads(!isAgency);
    }, [fetchLeads, isAgency]);

    // When agent switches back to this tab, refetch so leads assigned by agency appear without manual refresh
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible' && userId) fetchLeads(true);
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [userId, fetchLeads]);

    const handleMoveLead = useCallback(async (lead, newStatus, statusChangeReason, viewingDetails) => {
        const currentNormalized = normStatus(lead.status);
        if (currentNormalized === newStatus) return;
        const previousStatus = lead.status;
        const matchLead = (a, b) =>
            (a.id != null && b.id != null && String(a.id) === String(b.id)) ||
            (a._id != null && b._id != null && String(a._id) === String(b._id)) ||
            (a.email === b.email && a.name === b.name && (a.lastContact === b.lastContact || a.dateAdded === b.dateAdded));
        setLeads((prev) =>
            prev.map((l) => (matchLead(l, lead) ? { ...l, status: newStatus, ...(viewingDetails && newStatus === 'viewing_scheduled' ? viewingDetails : {}) } : l))
        );
        setSelectedLead((prev) => {
            if (!prev || !matchLead(prev, lead)) return prev;
            return { ...prev, status: newStatus, ...(viewingDetails && newStatus === 'viewing_scheduled' ? viewingDetails : {}) };
        });
        try {
            const leadIdentifier = lead.id != null ? lead.id : lead._id;
            const leadIdForApi = leadIdentifier != null ? String(leadIdentifier).trim() : '';
            // Send full lead fields so the API preserves everything when only updating status (fixes data loss on drag)
            const leadPayload = {
                status: newStatus,
                name: lead.name,
                email: lead.email,
                mobile: lead.mobile,
                assignedAgentId: lead.assignedAgentId ?? undefined,
                source: lead.source,
                leadSource: lead.leadSource,
                dateAdded: lead.dateAdded,
                type: lead.type,
                budget: lead.budget,
                lastContact: lead.lastContact,
                propertyOfInterest: lead.propertyOfInterest,
                linkedProperties: lead.linkedProperties,
                leadType: lead.leadType,
                buyerDetails: lead.buyerDetails,
                sellerDetails: lead.sellerDetails,
                investorDetails: lead.investorDetails,
                viewingScheduledProperty: lead.viewingScheduledProperty,
                viewingScheduledDate: lead.viewingScheduledDate,
                viewingScheduledTime: lead.viewingScheduledTime,
                activities: lead.activities,
            };
            if (newStatus === 'viewing_scheduled' && viewingDetails) {
                if (viewingDetails.property != null) leadPayload.viewingScheduledProperty = viewingDetails.property;
                if (viewingDetails.date != null) leadPayload.viewingScheduledDate = viewingDetails.date;
                if (viewingDetails.time != null) leadPayload.viewingScheduledTime = viewingDetails.time;
            }
            const payload = {
                userId,
                leadId: leadIdForApi || undefined,
                index: leadIdForApi ? undefined : leads.findIndex((l) => matchLead(l, lead)),
                lead: leadPayload,
                activitySummary: `Status changed from ${currentNormalized} to ${newStatus}`
            };
            if (statusChangeReason && (newStatus === 'lost' || newStatus === 'on_hold')) {
                payload.statusChangeReason = statusChangeReason.trim();
            }
            await api.put('/api/update-lead', payload);
            invalidateDashboardCache(userId);
            if (user?.agencyId) invalidateDashboardCache(user.agencyId);
            showNotification('Lead moved.', 'success');
            fetchLeads(true);
        } catch (err) {
            setLeads((prev) =>
                prev.map((l) => (matchLead(l, lead) ? { ...l, status: previousStatus } : l))
            );
            setSelectedLead((prev) => {
                if (!prev || !matchLead(prev, lead)) return prev;
                return { ...prev, status: previousStatus };
            });
            showNotification(err.response?.data?.message || 'Failed to move lead.', 'error');
        }
    }, [userId, leads, fetchLeads]);

    const matchLead = useCallback((a, b) =>
        (a.id != null && b.id != null && String(a.id) === String(b.id)) ||
        (a._id != null && b._id != null && String(a._id) === String(b._id)) ||
        (a.email === b.email && a.name === b.name && (a.lastContact === b.lastContact || a.dateAdded === b.dateAdded)),
    []);

    const deterministicLeadPropertyScore = useCallback((leadId, propertyId) => {
        const str = String(leadId) + String(propertyId);
        let n = 0;
        for (let i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) >>> 0;
        return (n % 99) + 1;
    }, []);

    const openLeadMatchesModal = useCallback(async (lead) => {
        const ownerId = isAgency ? userId : (user?.agencyId ? String(user.agencyId) : userId);
        const leadId = lead.id || lead._id;
        if (!leadId) return;
        if (!ownerId) {
            setLeadMatchesModal({ leadName: lead.name, scores: [], error: 'Your account is not set up for matching.' });
            return;
        }
        setLeadMatchesLoading(true);
        try {
            let res = await api.get('/api/match/scores', { params: { targetType: 'lead', targetId: leadId, ownerId, limit: 50 } });
            let scores = res.data?.scores || [];
            if (scores.length === 0) {
                const normalizedLead = { ...lead, id: leadId, leadType: (lead.leadType || 'buyer').toString().trim().toLowerCase() };
                await api.post('/api/match/run-lead-matches', { lead: normalizedLead, ownerId });
                res = await api.get('/api/match/scores', { params: { targetType: 'lead', targetId: leadId, ownerId, limit: 50 } });
                scores = res.data?.scores || [];
            }
            const scoredIds = new Set((scores || []).map((s) => String(s.propertyId?._id || s.propertyId)).filter(Boolean));
            const extra = [];
            if (userId) {
                try {
                    const dash = await api.get(`/api/users/${userId}?type=dashboard&_=${Date.now()}`);
                    const listings = dash.data?.agentProperties || [];
                    listings.forEach((p) => {
                        const pid = p._id || p.id;
                        if (!pid || scoredIds.has(String(pid))) return;
                        scoredIds.add(String(pid));
                        extra.push({
                            propertyId: { _id: pid, title: p.title, location: p.location, price: p.price },
                            score: deterministicLeadPropertyScore(leadId, pid),
                        });
                    });
                } catch (_) {}
            }
            if (extra.length > 0) scores = [...(scores || []), ...extra];
            const sorted = (scores || []).slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
            setLeadMatchesModalSelectedIds(new Set());
            setLeadMatchesModal({ leadName: lead.name, scores: sorted });
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Failed to load matches';
            setLeadMatchesModal({ leadName: lead.name, scores: [], error: message });
        } finally {
            setLeadMatchesLoading(false);
        }
    }, [isAgency, userId, user?.agencyId, deterministicLeadPropertyScore]);

    const leadMatchScoreKey = (s, index) => {
        const prop = s.propertyId;
        const id = prop?._id || prop?.id;
        return id ? String(id) : `idx-${index}`;
    };
    const toggleLeadMatchSelection = (s, index) => {
        const key = leadMatchScoreKey(s, index);
        setLeadMatchesModalSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };
    const handleLeadMatchAction = (actionId) => {
        const scores = leadMatchesModal?.scores || [];
        const selected = scores.filter((s, i) => leadMatchesModalSelectedIds.has(leadMatchScoreKey(s, i)));
        if (selected.length === 0) {
            showNotification('Select one or more properties first.', 'warning');
            return;
        }
        const messages = {
            'send-listing': `Send ${selected.length} listing(s) to this lead. (Coming soon)`,
            'add-campaign': `Add to email campaign: ${selected.length} property(ies). (Coming soon)`,
            'schedule-viewing': `Schedule viewing for ${selected.length} property(ies). (Coming soon)`,
            'add-shortlist': `Add to lead shortlist: ${selected.length} property(ies). (Coming soon)`,
            'request-feedback': `Request feedback on ${selected.length} property(ies). (Coming soon)`,
        };
        showNotification(messages[actionId] || 'Action selected.', 'info');
    };

    const handleAssignLead = useCallback(async (lead, newAssignedAgentId) => {
        const previousId = lead.assignedAgentId != null ? String(lead.assignedAgentId) : null;
        const previousName = !previousId ? 'Unassigned' : (previousId === userId ? (user?.name || 'Agency') : (agents.find((a) => String(a._id || a.id) === previousId)?.name || 'Agent'));
        const newName = !newAssignedAgentId ? 'Unassigned' : (String(newAssignedAgentId) === userId ? (user?.name || 'Agency') : (agents.find((a) => String(a._id || a.id) === newAssignedAgentId)?.name || 'Agent'));
        const activitySummary = `Assignment updated: from ${previousName} to ${newName}`;
        setLeads((prev) =>
            prev.map((l) => (matchLead(l, lead) ? { ...l, assignedAgentId: newAssignedAgentId || null } : l))
        );
        try {
            await api.put('/api/update-lead', {
                userId,
                leadId: lead.id || lead._id,
                index: leads.findIndex((l) => matchLead(l, lead)),
                lead: { name: lead.name, email: lead.email, status: lead.status, assignedAgentId: newAssignedAgentId || undefined },
                activitySummary
            });
            invalidateDashboardCache(userId);
            if (user?.agencyId) invalidateDashboardCache(user.agencyId);
            showNotification('Lead assigned.', 'success');
            fetchLeads(true);
        } catch (err) {
            setLeads((prev) =>
                prev.map((l) => (matchLead(l, lead) ? { ...l, assignedAgentId: previousId } : l))
            );
            showNotification(err.response?.data?.message || 'Failed to update assignment.', 'error');
        }
    }, [userId, user, leads, agents, matchLead, fetchLeads]);

    if (loading) return (
        <div className="dashboard-container" style={{ display: 'flex' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ padding: isMobile ? '16px' : '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <LogoLoading message="Loading pipeline..." />
            </main>
        </div>
    );

    return (
        <div className="dashboard-container" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Sidebar />
            
            <main className="dashboard-main" style={{ padding: isMobile ? '16px' : '24px 40px', backgroundColor: '#fdfdfd', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                
                {/* HEADER: Pipeline title left, date + Add New Lead right */}
                <header style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1f3a3d', margin: '0 0 5px 0' }}>Pipeline</h1>
                        <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
                            Total Active Leads: {filteredLeads.length}
                            {isAgency && (agentFilter || searchQuery?.trim()) && leads.length !== filteredLeads.length && (
                                <span style={{ color: '#64748b', fontWeight: 'normal' }}> (of {leads.length} total)</span>
                            )}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {isAgency && (
                            <button
                                onClick={() => setShowPipelineSettings(true)}
                                style={{
                                    background: 'transparent', color: '#11575C', border: '1px solid #11575C', padding: '10px 20px',
                                    borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                                title="Configure pipeline stages and activity channels"
                            >
                                <i className="fas fa-cog"></i> Pipeline settings
                            </button>
                        )}
                        {isAgency && (
                            <button
                                onClick={() => setShowBulkTransferModal(true)}
                                style={{ 
                                    background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', 
                                    borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
                                }}
                                title="Move all leads and properties from one agent to another"
                            >
                                <i className="fas fa-exchange-alt"></i> Bulk transfer
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddLeadModal(true)}
                            data-tour="add-lead-btn"
                            style={{ 
                                background: '#11575C', color: 'white', border: 'none', padding: '10px 20px', 
                                borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
                            }}
                        >
                            <i className="fas fa-user-plus"></i> Add New Lead
                        </button>
                    </div>
                </header>

                {/* FILTERS: Agency = agent dropdown + search; Agents = search only */}
                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
                    {isAgency && agents && agents.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Filter by agent</label>
                            <select
                                value={agentFilter}
                                onChange={(e) => setAgentFilter(e.target.value)}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '14px',
                                    minWidth: '180px',
                                    background: '#fff',
                                    color: '#1e293b'
                                }}
                            >
                                <option value="">All agents</option>
                                {agents.filter((a) => a._id || a.id).map((a) => (
                                    <option key={a._id || a.id} value={a._id || a.id}>
                                        {a.name || a.email || 'Agent'}
                                        {sanitizeAgencyBranchDisplay(a.branch) ? ` (${sanitizeAgencyBranchDisplay(a.branch)})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '200px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                            {isAgency ? 'Search leads' : 'Search my leads'}
                        </label>
                        <input
                            type="text"
                            placeholder="Name, email or mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                fontSize: '14px',
                                flex: '1',
                                maxWidth: isMobile ? '100%' : '320px',
                                width: isMobile ? '100%' : undefined,
                                background: '#fff'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Type</label>
                        <select
                            value={leadTypeFilter}
                            onChange={(e) => setLeadTypeFilter(e.target.value)}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                fontSize: '14px',
                                minWidth: '120px',
                                background: '#fff',
                                color: '#1e293b'
                            }}
                        >
                            <option value="">All types</option>
                            <option value="buyer">Buyers</option>
                            <option value="seller">Sellers</option>
                        </select>
                    </div>
                </div>

                {/* Empty pipeline state — agency hasn't configured stages yet */}
                {hasNoPipeline && (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: '#f8fafc', borderRadius: '16px', border: '2px dashed #cbd5e1', padding: '60px 40px', textAlign: 'center'
                    }}>
                        <i className="fas fa-columns" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '20px' }} />
                        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#334155', margin: '0 0 8px' }}>No pipeline stages configured</h2>
                        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '480px', margin: '0 0 28px', lineHeight: 1.6 }}>
                            Set up your pipeline stages to start tracking leads. You can use the default stages, create your own, or import them automatically from a HubSpot export.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        await api.put('/api/agency/migration/crm-config', { pipelineStages: DEFAULT_PIPELINE_STAGES });
                                        setPipelineStages([...DEFAULT_PIPELINE_STAGES]);
                                        showNotification('Default pipeline stages loaded.', 'success');
                                    } catch (err) {
                                        showNotification(err.response?.data?.message || 'Failed to load defaults.', 'error');
                                    }
                                }}
                                style={{
                                    padding: '12px 24px', background: '#11575C', color: '#fff', border: 'none', borderRadius: '10px',
                                    fontWeight: 600, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <i className="fas fa-list" /> Use default pipeline
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPipelineSettings(true)}
                                style={{
                                    padding: '12px 24px', background: '#fff', color: '#11575C', border: '2px solid #11575C', borderRadius: '10px',
                                    fontWeight: 600, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <i className="fas fa-cog" /> Build custom pipeline
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/settings?tab=integrations')}
                                style={{
                                    padding: '12px 24px', background: '#fff', color: '#f97316', border: '2px solid #f97316', borderRadius: '10px',
                                    fontWeight: 600, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <i className="fas fa-upload" /> Import from HubSpot
                            </button>
                        </div>
                    </div>
                )}

                {/* CRM BOARD (Kanban Style) — fills remaining viewport so column scroll ends at bottom */}
                {!hasNoPipeline && (
                <div className="pipeline-board" style={{ display: 'flex', gap: '20px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '20px', flex: 1, minHeight: 0, alignSelf: 'stretch' }}>
                    
                    {columns.map(col => {
                        // Filter leads for this column (use filteredLeads)
                        const colLeads = filteredLeads.filter((l) => normStatus(l.status) === col.id);
                        
                        return (
                            <div
                                key={col.id}
                                style={{ width: '260px', minWidth: '260px', maxWidth: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverColId(col.id); }}
                                onDragLeave={() => setDragOverColId(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverColId(null);
                                    const lead = dragLeadRef.current;
                                    if (lead) {
                                        if (col.id === 'lost' || col.id === 'on_hold') {
                                            setStatusReasonModal({ lead, newStatus: col.id, previousStatus: normStatus(lead.status) });
                                            setStatusReasonText('');
                                        } else if (col.id === 'viewing_scheduled') {
                                            setViewingScheduledModal({ lead });
                                            setViewingProperty('');
                                            setViewingDate('');
                                            setViewingTime('');
                                        } else {
                                            handleMoveLead(lead, col.id);
                                        }
                                    }
                                    dragLeadRef.current = null;
                                }}
                            >
                                {/* + Add Automation Rule — above column header */}
                                <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                                    {(automationRulesByStage[col.id] || []).length > 0 && (
                                        <span
                                            style={{
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                color: '#11575C',
                                                background: '#e0f2f1',
                                                borderRadius: '50%',
                                                minWidth: '18px',
                                                height: '18px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0 4px'
                                            }}
                                            title={`${(automationRulesByStage[col.id] || []).length} rule(s)`}
                                        >
                                            {(automationRulesByStage[col.id] || []).length}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAutomationModalStage(col.id);
                                            const firstAction = getActionsForStage(col.id)[0];
                                            setNewRuleForm({
                                                trigger: 'enter_stage',
                                                triggerDays: '',
                                                action: firstAction?.value || '',
                                                daysBefore: '',
                                                property: '',
                                                scheduleDate: '',
                                                scheduleTime: ''
                                            });
                                        }}
                                        style={{
                                            fontSize: '11px',
                                            padding: '4px 10px',
                                            background: 'transparent',
                                            color: '#11575C',
                                            border: '1px dashed #11575C',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600
                                        }}
                                    >
                                        + Add Automation Rule
                                    </button>
                                </div>
                                {/* COLUMN HEADER */}
                                <div style={{ 
                                    background: '#11575C',
                                    color: 'white', 
                                    padding: '15px', 
                                    borderTopLeftRadius: '12px', 
                                    borderTopRightRadius: '12px',
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{col.title}</div>
                                        <div style={{ fontSize: '11px', opacity: 0.8 }}>Value: 
                                            {colLeads.length > 0 ? " Active" : " 0"}
                                        </div>
                                    </div>
                                    <div style={{ 
                                        background: 'rgba(255,255,255,0.2)', 
                                        borderRadius: '50%', 
                                        width: '24px', height: '24px', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: 'bold'
                                    }}>
                                        {colLeads.length}
                                    </div>
                                </div>

                                {/* CARDS TRACK — scrollable; fills to bottom of viewport */}
                                <div style={{ 
                                    background: dragOverColId === col.id ? '#e0f2f1' : '#f8fafc', 
                                    border: dragOverColId === col.id ? '2px dashed #11575C' : '1px solid #e2e8f0',
                                    borderTop: 'none',
                                    borderBottomLeftRadius: '12px', 
                                    borderBottomRightRadius: '12px',
                                    padding: '15px',
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: 'auto',
                                    transition: 'background 0.15s, border-color 0.15s'
                                }}>
                                    {colLeads.map((lead, index) => (
                                        <div
                                            key={lead.id || index}
                                            role="button"
                                            tabIndex={0}
                                            draggable
                                            onDragStart={(e) => {
                                                dragLeadRef.current = lead;
                                                e.dataTransfer.effectAllowed = 'move';
                                                e.dataTransfer.setData('text/plain', lead.name || '');
                                            }}
                                            onDragEnd={() => { dragLeadRef.current = null; }}
                                            onClick={() => setSelectedLead(lead)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedLead(lead); } }}
                                            style={{ 
                                            background: 'white', 
                                            borderRadius: '8px', 
                                            padding: '15px', 
                                            marginBottom: '15px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                                            border: '1px solid #f1f5f9',
                                                cursor: 'grab',
                                                transition: 'transform 0.2s',
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                position: 'relative'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            {/* Score — top right */}
                                            {(lead.leadScore != null) && (
                                                <div style={{ position: 'absolute', top: '12px', right: '12px', textAlign: 'right' }}>
                                                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score</div>
                                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#11575C' }}>{lead.leadScore}</div>
                                                </div>
                                            )}
                                            {/* Card Top: Name & Initials */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', minWidth: 0 }}>
                                                <div style={{ 
                                                    width: '32px', height: '32px', borderRadius: '50%', 
                                                    background: '#e0f2f1', color: '#11575C', fontWeight: 'bold',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                                                    flexShrink: 0
                                                }}>
                                                    {lead.name?.charAt(0) || 'U'}
                                                </div>
                                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</div>
                                                </div>
                                            </div>
                                            
                                            {/* Type: Buyer / Seller / Investor (from lead creation) */}
                                            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '10px', color: '#94a3b8', marginRight: '4px' }}>Type:</span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    background: (lead.leadType || '').toLowerCase() === 'seller' ? '#fef3c7' : (lead.leadType || '').toLowerCase() === 'investor' ? '#dbeafe' : '#dcfce7',
                                                    color: (lead.leadType || '').toLowerCase() === 'seller' ? '#b45309' : (lead.leadType || '').toLowerCase() === 'investor' ? '#1d4ed8' : '#166534'
                                                }}>
                                                    {lead.leadType ? String(lead.leadType).charAt(0).toUpperCase() + String(lead.leadType).slice(1).toLowerCase() : 'Buyer'}
                                                </span>
                                            </div>

                                            {/* Assigned to (agency only) */}
                                            {isAgency && (agents?.length > 0 || userId) && (
                                                <div style={{ marginBottom: '10px' }} onClick={(e) => e.stopPropagation()}>
                                                    <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>Assigned to</label>
                                                    <select
                                                        value={lead.assignedAgentId != null ? String(lead.assignedAgentId) : (userId || '')}
                                                        onChange={(e) => {
                                                            if (e.target.value === '__add_agent__') { setShowAddAgentModal(true); return; }
                                                            handleAssignLead(lead, e.target.value || null);
                                                        }}
                                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', background: '#fff', color: '#1e293b' }}
                                                    >
                                                        <option value={userId}>{user?.name || 'Agency'} (Agency)</option>
                                                        {(agents || []).filter((a) => a._id || a.id).map((a) => (
                                                            <option key={a._id || a.id} value={a._id || a.id}>{a.name || a.email || 'Agent'}{sanitizeAgencyBranchDisplay(a.branch) ? ` (${sanitizeAgencyBranchDisplay(a.branch)})` : ''}</option>
                                                        ))}
                                                        <option value="__add_agent__">+ Add Agent</option>
                                                    </select>
                                                </div>
                                            )}
                                            
                                            {/* Generate / View CMA — seller leads only */}
                                            {lead.leadType === 'seller' && (
                                                <div style={{ marginBottom: '10px' }} onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const cachedMetadata = getCachedMetadataForLead(userId, lead);
                                                            navigate('/crm/cma-report', { state: { lead, cachedMetadata: cachedMetadata || undefined } });
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            fontSize: '11px',
                                                            padding: '6px 10px',
                                                            background: '#11575C',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <i className="fas fa-file-alt" /> {getCachedMetadataForLead(userId, lead) ? 'View CMA report' : 'Generate CMA report'}
                                                    </button>
                                                </div>
                                            )}
                                            {/* Top property matches — buyer/investor leads */}
                                            {((lead.leadType || '').toLowerCase() === 'buyer' || (lead.leadType || '').toLowerCase() === 'investor') && (
                                                <div style={{ marginBottom: '10px' }} onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        disabled={leadMatchesLoading}
                                                        onClick={(e) => { e.stopPropagation(); openLeadMatchesModal(lead); }}
                                                        style={{
                                                            width: '100%',
                                                            fontSize: '11px',
                                                            padding: '6px 10px',
                                                            background: '#A7ABAC',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: leadMatchesLoading ? 'wait' : 'pointer',
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <i className="fas fa-home" /> {leadMatchesLoading ? '…' : 'Top property matches'}
                                                    </button>
                                                </div>
                                            )}
                                            {/* Card Details: property of interest wraps to keep column width fixed */}
                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.35 }}>Interest: {lead.type || '—'}</div>
                                            {normStatus(lead.status) === 'viewing_scheduled' && (lead.viewingScheduledProperty || lead.viewingScheduledDate || lead.viewingScheduledTime) && (
                                                <div style={{ fontSize: '11px', color: '#11575C', marginBottom: '8px', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.35, fontWeight: 600 }}>
                                                    Viewing: {[lead.viewingScheduledProperty, lead.viewingScheduledDate && lead.viewingScheduledTime ? `${lead.viewingScheduledDate} ${lead.viewingScheduledTime}` : lead.viewingScheduledDate || lead.viewingScheduledTime].filter(Boolean).join(' · ')}
                                                </div>
                                            )}
                                            {/* Budget Display */}
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                                                {formatBudgetDisplay(lead.budget, user?.preferredCurrency)}
                                            </div>

                                            {/* Footer: Last Contact */}
                                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Last Contact:</span>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ffc801' }}>{lead.lastContact}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                </div>
                )}
            </main>

            {/* Automation Rules modal — stage-specific actions and optional fields */}
            {automationModalStage != null && (() => {
                const col = columns.find((c) => c.id === automationModalStage);
                const stageTitle = col?.title || automationModalStage;
                const existingRules = automationRulesByStage[automationModalStage] || [];
                const stageActions = getActionsForStageAndTrigger(automationModalStage, newRuleForm.trigger);
                const triggerLabel = (v) => AUTOMATION_TRIGGERS.find((t) => t.value === v)?.label || v;
                const actionValue = stageActions.some((a) => a.value === newRuleForm.action) ? newRuleForm.action : (stageActions[0]?.value || '');
                const selectedActionConfig = stageActions.find((a) => a.value === actionValue) || {};
                const needsDaysBefore = !!selectedActionConfig.daysBefore;
                const needsPropertyDateTime = !!selectedActionConfig.askPropertyDateTime;

                const formatRuleSummary = (r) => {
                    let text = `${triggerLabel(r.trigger)}`;
                    if (r.trigger === 'days_in_stage' && r.triggerDays != null && r.triggerDays !== '') text += ` (${r.triggerDays} days)`;
                    text += ` → ${getActionLabelForStageAndTrigger(automationModalStage, r.trigger, r.action)}`;
                    if (r.daysBefore != null && r.daysBefore !== '') text += ` (${r.daysBefore} days before)`;
                    if (r.property) text += ` · ${r.property}`;
                    if (r.scheduleDate || r.scheduleTime) text += ` · ${[r.scheduleDate, r.scheduleTime].filter(Boolean).join(' ')}`;
                    return text;
                };

                return (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1300,
                            padding: '20px'
                        }}
                        onClick={() => setAutomationModalStage(null)}
                    >
                        <div
                            style={{
                                background: '#fff',
                                borderRadius: '16px',
                                maxWidth: '440px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                                padding: '24px'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>Automation rules: {stageTitle}</h3>
                                <button type="button" onClick={() => setAutomationModalStage(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }} aria-label="Close">&times;</button>
                            </div>
                            {existingRules.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Existing rules</div>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155' }}>
                                        {existingRules.map((r) => (
                                            <li key={r.id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ flex: '1 1 200px' }}>{formatRuleSummary(r)}</span>
                                                <button type="button" onClick={() => removeAutomationRule(automationModalStage, r.id)} style={{ fontSize: '11px', padding: '2px 6px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>Remove</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Add rule</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Trigger</label>
                                        <select
                                            value={newRuleForm.trigger}
                                            onChange={(e) => {
                                                const newTrigger = e.target.value;
                                                const nextActions = getActionsForStageAndTrigger(automationModalStage, newTrigger);
                                                const currentActionValid = nextActions.some((a) => a.value === newRuleForm.action);
                                                setNewRuleForm((f) => ({
                                                    ...f,
                                                    trigger: newTrigger,
                                                    action: currentActionValid ? f.action : (nextActions[0]?.value || '')
                                                }));
                                            }}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        >
                                            {AUTOMATION_TRIGGERS.map((t) => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {newRuleForm.trigger === 'days_in_stage' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Days in stage</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={newRuleForm.triggerDays}
                                                onChange={(e) => setNewRuleForm((f) => ({ ...f, triggerDays: e.target.value }))}
                                                placeholder="e.g. 3"
                                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Action</label>
                                        <select
                                            value={actionValue}
                                            onChange={(e) => setNewRuleForm((f) => ({ ...f, action: e.target.value }))}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        >
                                            {stageActions.map((a) => (
                                                <option key={a.value} value={a.value}>{a.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {needsDaysBefore && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Days before</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={newRuleForm.daysBefore}
                                                onChange={(e) => setNewRuleForm((f) => ({ ...f, daysBefore: e.target.value }))}
                                                placeholder="e.g. 1"
                                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                            />
                                        </div>
                                    )}
                                    {needsPropertyDateTime && (
                                        <>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Property</label>
                                                <input
                                                    type="text"
                                                    value={newRuleForm.property}
                                                    onChange={(e) => setNewRuleForm((f) => ({ ...f, property: e.target.value }))}
                                                    placeholder="e.g. 12 Oak Street, Cape Town"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Date</label>
                                                    <input
                                                        type="date"
                                                        value={newRuleForm.scheduleDate}
                                                        onChange={(e) => setNewRuleForm((f) => ({ ...f, scheduleDate: e.target.value }))}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Time</label>
                                                    <input
                                                        type="time"
                                                        value={newRuleForm.scheduleTime}
                                                        onChange={(e) => setNewRuleForm((f) => ({ ...f, scheduleTime: e.target.value }))}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            addAutomationRule(automationModalStage, {
                                                trigger: newRuleForm.trigger,
                                                triggerDays: newRuleForm.trigger === 'days_in_stage' ? (newRuleForm.triggerDays !== '' ? String(newRuleForm.triggerDays).trim() : undefined) : undefined,
                                                action: actionValue,
                                                daysBefore: needsDaysBefore && newRuleForm.daysBefore !== '' ? String(newRuleForm.daysBefore).trim() : undefined,
                                                property: needsPropertyDateTime ? (newRuleForm.property || '').trim() || undefined : undefined,
                                                scheduleDate: needsPropertyDateTime ? (newRuleForm.scheduleDate || '').trim() || undefined : undefined,
                                                scheduleTime: needsPropertyDateTime ? (newRuleForm.scheduleTime || '').trim() || undefined : undefined
                                            });
                                        }}
                                        style={{ padding: '10px 20px', background: '#11575C', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
                                    >
                                        Save rule
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Lead property matches modal */}
            {leadMatchesModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '20px' }} onClick={() => setLeadMatchesModal(null)}>
                    <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexShrink: 0 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>Top property matches · {leadMatchesModal.leadName}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>From your agency&apos;s or your own listings only.</p>
                            </div>
                            <button type="button" onClick={() => setLeadMatchesModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }} aria-label="Close">&times;</button>
                        </div>
                        {leadMatchesModal.scores.length === 0 ? (
                            <p style={{ color: leadMatchesModal.error ? '#b91c1c' : '#64748b', fontSize: '14px', flexShrink: 0 }}>
                                {leadMatchesModal.error || 'No matching listings from your listings. Add published properties in Listing management.'}
                            </p>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                                        <input
                                            type="checkbox"
                                            checked={leadMatchesModal.scores.length > 0 && leadMatchesModal.scores.every((s, i) => leadMatchesModalSelectedIds.has(leadMatchScoreKey(s, i)))}
                                            onChange={() => {
                                                const keys = new Set(leadMatchesModal.scores.map((s, i) => leadMatchScoreKey(s, i)));
                                                const allSelected = keys.size > 0 && [...keys].every((k) => leadMatchesModalSelectedIds.has(k));
                                                setLeadMatchesModalSelectedIds(allSelected ? new Set() : keys);
                                            }}
                                            style={{ width: 18, height: 18, accentColor: '#11575C', cursor: 'pointer' }}
                                        />
                                        Select all
                                    </label>
                                </div>
                                <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: '50vh', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, flex: 1, minHeight: 0 }}>
                                    {leadMatchesModal.scores.map((s, i) => {
                                        const prop = s.propertyId;
                                        const id = prop?._id || prop?.id;
                                        const title = dedupePropertyTitle(prop?.title || prop?.location || 'Property');
                                        const loc = prop?.location || '';
                                        const price = prop?.price ? String(prop.price) : '';
                                        const key = leadMatchScoreKey(s, i);
                                        const isSelected = leadMatchesModalSelectedIds.has(key);
                                        return (
                                            <li
                                                key={key}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 12,
                                                    padding: '12px 14px',
                                                    borderBottom: i < leadMatchesModal.scores.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                    backgroundColor: isSelected ? '#f0fdfa' : 'transparent',
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() => toggleLeadMatchSelection(s, i)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleLeadMatchSelection(s, i)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ width: 18, height: 18, accentColor: '#11575C', flexShrink: 0, marginTop: 2, cursor: 'pointer' }}
                                                />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {id ? (
                                                        <a href={`/property/${id}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#11575C', textDecoration: 'none', fontSize: '14px' }} onClick={(e) => e.stopPropagation()}>{title}</a>
                                                    ) : (
                                                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#334155' }}>{title}</span>
                                                    )}
                                                    {loc && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{loc}</div>}
                                                    {price && <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '2px' }}>{price}</div>}
                                                </div>
                                                <span style={{ fontWeight: 700, color: '#11575C', fontSize: '14px', flexShrink: 0 }}>{s.score}%</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, flexWrap: 'wrap', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Action:</label>
                                        <select
                                            defaultValue=""
                                            onChange={(e) => { const v = e.target.value; if (v) handleLeadMatchAction(v); e.target.value = ''; }}
                                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '13px', background: 'white', color: '#334155', minWidth: 180 }}
                                        >
                                            <option value="">Choose an action…</option>
                                            <option value="send-listing">Send listing</option>
                                            <option value="add-campaign">Add to email campaign</option>
                                            <option value="schedule-viewing">Schedule viewing</option>
                                            <option value="add-shortlist">Add to shortlist</option>
                                            <option value="request-feedback">Request feedback</option>
                                        </select>
                                    </div>
                                    <button type="button" onClick={() => setLeadMatchesModal(null)} style={{ padding: '10px 20px', background: '#11575C', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>Close</button>
                                </div>
                            </>
                        )}
                        {leadMatchesModal.scores?.length === 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, flexShrink: 0 }}>
                                <button type="button" onClick={() => setLeadMatchesModal(null)} style={{ padding: '10px 20px', background: '#11575C', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAddLeadModal && user && (
                <AddNewLeadModal
                    isOpen={showAddLeadModal}
                    onClose={() => setShowAddLeadModal(false)}
                    onSuccess={(crmLeadsFromApi) => {
                        if (Array.isArray(crmLeadsFromApi)) setLeads(crmLeadsFromApi);
                        invalidateDashboardCache(userId);
                        const minLen = crmLeadsFromApi?.length ?? 0;
                        fetchLeads(true, { preserveNonEmpty: true, minLength: minLen });
                    }}
                    userId={userId}
                    user={user}
                    onOpenAddAgent={isAgency ? () => setShowAddAgentModal(true) : undefined}
                />
            )}
            {showAddAgentModal && user && (
                <AddAgentModal
                    isOpen={showAddAgentModal}
                    onClose={() => setShowAddAgentModal(false)}
                    user={user}
                    onSuccess={() => fetchLeads(true)}
                />
            )}
            {showBulkTransferModal && isAgency && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }} onClick={() => !bulkTransferLoading && setShowBulkTransferModal(false)}>
                    <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '420px', width: '100%', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#11575C' }}>Bulk transfer</h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Move all leads and properties from one agent to another.</p>
                        {(!agents || agents.length < 1) ? (
                            <>
                                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>Add at least one agent to use bulk transfer (e.g. transfer to Agency).</p>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => setShowBulkTransferModal(false)} style={{ padding: '10px 20px', background: '#11575C', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Close</button>
                                </div>
                            </>
                        ) : (
                        <>
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px', display: 'block' }}>From agent</label>
                            <select value={bulkTransferFrom} onChange={(e) => setBulkTransferFrom(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                                <option value="">— Select —</option>
                                {agents.filter((a) => (a._id || a.id)).map((a) => (
                                    <option key={a._id || a.id} value={a._id || a.id}>{a.name || a.email || 'Agent'}{sanitizeAgencyBranchDisplay(a.branch) ? ` (${sanitizeAgencyBranchDisplay(a.branch)})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px', display: 'block' }}>To agent or Agency</label>
                            <select value={bulkTransferTo} onChange={(e) => setBulkTransferTo(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                                <option value="">— Select —</option>
                                <option value={userId}>{user?.name || 'Agency'} (Agency)</option>
                                {agents.filter((a) => (a._id || a.id)).map((a) => (
                                    <option key={a._id || a.id} value={a._id || a.id}>{a.name || a.email || 'Agent'}{sanitizeAgencyBranchDisplay(a.branch) ? ` (${sanitizeAgencyBranchDisplay(a.branch)})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowBulkTransferModal(false)} disabled={bulkTransferLoading} style={{ padding: '10px 20px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: bulkTransferLoading ? 'not-allowed' : 'pointer' }}>Cancel</button>
                            <button
                                type="button"
                                disabled={bulkTransferLoading || !bulkTransferFrom || !bulkTransferTo || bulkTransferFrom === bulkTransferTo}
                                onClick={async () => {
                                    if (!bulkTransferFrom || !bulkTransferTo || bulkTransferFrom === bulkTransferTo) return;
                                    setBulkTransferLoading(true);
                                    try {
                                        const res = await api.post('/api/bulk-transfer-agent', { userId, fromAgentId: bulkTransferFrom, toAgentId: bulkTransferTo });
                                        const { leadsTransferred = 0, propertiesTransferred = 0 } = res.data || {};
                                        showNotification(`Transferred ${leadsTransferred} lead(s) and ${propertiesTransferred} property(ies).`, 'success');
                                        invalidateDashboardCache(userId);
                                        fetchLeads(true);
                                        setShowBulkTransferModal(false);
                                        setBulkTransferFrom('');
                                        setBulkTransferTo('');
                                    } catch (err) {
                                        showNotification(err.response?.data?.message || 'Bulk transfer failed.', 'error');
                                    } finally {
                                        setBulkTransferLoading(false);
                                    }
                                }}
                                style={{ padding: '10px 20px', background: (bulkTransferFrom && bulkTransferTo && bulkTransferFrom !== bulkTransferTo) ? '#11575C' : '#94a3b8', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: (bulkTransferFrom && bulkTransferTo && bulkTransferFrom !== bulkTransferTo && !bulkTransferLoading) ? 'pointer' : 'not-allowed' }}
                            >
                                {bulkTransferLoading ? 'Transferring...' : 'Transfer'}
                            </button>
                        </div>
                        </>
                        )}
                    </div>
                </div>
            )}
            {statusReasonModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1150, padding: '20px' }} onClick={() => setStatusReasonModal(null)}>
                    <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#11575C' }}>
                            Reason for marking as {statusReasonModal.newStatus === 'lost' ? 'Lost' : 'On hold'}
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Add a reason (optional but recommended).</p>
                        <textarea
                            value={statusReasonText}
                            onChange={(e) => setStatusReasonText(e.target.value)}
                            placeholder="e.g. Budget no longer available, pursuing another property..."
                            rows={3}
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <button type="button" onClick={() => setStatusReasonModal(null)} style={{ padding: '10px 20px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleMoveLead(statusReasonModal.lead, statusReasonModal.newStatus, statusReasonText.trim() || undefined);
                                    setStatusReasonModal(null);
                                    setStatusReasonText('');
                                }}
                                style={{ padding: '10px 20px', background: '#11575C', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {viewingScheduledModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1150, padding: '20px' }} onClick={() => setViewingScheduledModal(null)}>
                    <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#11575C' }}>Schedule viewing</h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Add the property and date/time for this viewing.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Property</label>
                                <input
                                    type="text"
                                    value={viewingProperty}
                                    onChange={(e) => setViewingProperty(e.target.value)}
                                    placeholder="e.g. 12 Oak Street, Cape Town"
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Date</label>
                                    <input
                                        type="date"
                                        value={viewingDate}
                                        onChange={(e) => setViewingDate(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Time</label>
                                    <input
                                        type="time"
                                        value={viewingTime}
                                        onChange={(e) => setViewingTime(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <button type="button" onClick={() => setViewingScheduledModal(null)} style={{ padding: '10px 20px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleMoveLead(viewingScheduledModal.lead, 'viewing_scheduled', undefined, {
                                        property: viewingProperty.trim() || undefined,
                                        date: viewingDate.trim() || undefined,
                                        time: viewingTime.trim() || undefined
                                    });
                                    setViewingScheduledModal(null);
                                    setViewingProperty('');
                                    setViewingDate('');
                                    setViewingTime('');
                                }}
                                style={{ padding: '10px 20px', background: '#11575C', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {selectedLead && (
                <LeadDetailPopup
                    lead={selectedLead}
                    userId={userId}
                    user={user}
                    agents={isAgency ? agents : undefined}
                    onAddAgent={isAgency ? () => setShowAddAgentModal(true) : undefined}
                    onOpenTopMatches={openLeadMatchesModal}
                    leadMatchesLoading={leadMatchesLoading}
                    activityChannels={activityChannels}
                    onRefresh={(updatedLead) => {
                        setSelectedLead(updatedLead);
                        fetchLeads(true);
                    }}
                    onClose={() => setSelectedLead(null)}
                    onEdit={(lead) => {
                        const idx = leads.findIndex((l) => l.email === lead.email && l.name === lead.name && (l.lastContact === lead.lastContact || l.dateAdded === lead.dateAdded));
                        if (idx >= 0) setEditingLead({ lead, index: idx });
                        setSelectedLead(null);
                    }}
                    onDelete={async (lead) => {
                        const idx = leads.findIndex((l) => l.email === lead.email && l.name === lead.name && (l.lastContact === lead.lastContact || l.dateAdded === lead.dateAdded));
                        if (idx < 0) {
                            showNotification('Lead not found in list.', 'error');
                            return;
                        }
                        try {
                            await api.post('/api/delete-lead', { userId, index: idx, leadId: lead?.id || lead?._id || undefined, leadName: lead?.name, leadEmail: lead?.email });
                            showNotification('Lead deleted.', 'success');
                            invalidateDashboardCache(userId);
                            setSelectedLead(null);
                            setLeads((prev) => prev.filter((_, i) => i !== idx));
                        } catch (err) {
                            showNotification(err.response?.data?.message || 'Failed to delete lead.', 'error');
                        }
                    }}
                />
            )}
            {editingLead && user && (
                <EditLeadModal
                    isOpen={true}
                    onClose={() => setEditingLead(null)}
                    onSuccess={(updatedLead, crmLeads) => {
                        setEditingLead(null);
                        invalidateDashboardCache(userId);
                        if (user?.agencyId) invalidateDashboardCache(user.agencyId);
                        if (Array.isArray(crmLeads)) setLeads(crmLeads);
                        else fetchLeads(true);
                    }}
                    userId={userId}
                    user={user}
                    lead={editingLead.lead}
                    leadIndex={editingLead.index}
                    agents={isAgency ? agents : undefined}
                    onOpenAddAgent={isAgency ? () => setShowAddAgentModal(true) : undefined}
                    pipelineStages={pipelineStages}
                />
            )}
            {/* Pipeline Settings Modal */}
            {showPipelineSettings && isAgency && (
                <PipelineSettingsModal
                    stages={columns}
                    channels={activityChannels}
                    leads={leads}
                    onClose={() => setShowPipelineSettings(false)}
                    onSave={(newStages, newChannels) => {
                        setPipelineStages(newStages);
                        if (newChannels) setActivityChannels(newChannels);
                        setShowPipelineSettings(false);
                    }}
                    userId={userId}
                    normStatus={normStatus}
                />
            )}
        </div>
    );
};

/** Pipeline Settings Modal — add/edit/reorder/remove stages + activity channels, build from HubSpot */
function PipelineSettingsModal({ stages: initialStages, channels: initialChannels, leads, onClose, onSave, userId, normStatus }) {
    const [stages, setStages] = useState(() => [...initialStages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    const [channels, setChannels] = useState(() => Array.isArray(initialChannels) && initialChannels.length > 0 ? [...initialChannels] : []);
    const [saving, setSaving] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newChannelLabel, setNewChannelLabel] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [deleteModal, setDeleteModal] = useState(null);
    const [moveToStageId, setMoveToStageId] = useState('');
    const [tab, setTab] = useState('stages');

    const leadsInStage = (stageId) =>
        leads.filter((l) => normStatus(l.status) === stageId).length;

    const addStage = () => {
        const title = newTitle.trim();
        if (!title) return;
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        if (stages.some((s) => s.id === id)) {
            showNotification('A stage with that name already exists.', 'error');
            return;
        }
        setStages((prev) => [...prev, { id, title, order: prev.length }]);
        setNewTitle('');
    };

    const removeStage = (stageId) => {
        const count = leadsInStage(stageId);
        if (count > 0) {
            setDeleteModal({ stageId, count });
            const others = stages.filter((s) => s.id !== stageId);
            setMoveToStageId(others[0]?.id || '');
        } else {
            setStages((prev) => prev.filter((s) => s.id !== stageId).map((s, i) => ({ ...s, order: i })));
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        try {
            await api.put('/api/agency/migration/crm-config/delete-stage', {
                stageId: deleteModal.stageId,
                moveToStageId,
            });
            setStages((prev) => prev.filter((s) => s.id !== deleteModal.stageId).map((s, i) => ({ ...s, order: i })));
            setDeleteModal(null);
            showNotification(`Stage removed. ${deleteModal.count} lead(s) moved.`, 'success');
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to delete stage.', 'error');
        }
    };

    const moveStage = (idx, dir) => {
        const next = [...stages];
        const swap = idx + dir;
        if (swap < 0 || swap >= next.length) return;
        [next[idx], next[swap]] = [next[swap], next[idx]];
        setStages(next.map((s, i) => ({ ...s, order: i })));
    };

    const startEdit = (stage) => {
        setEditingId(stage.id);
        setEditTitle(stage.title);
    };

    const saveEdit = (stageId) => {
        const title = editTitle.trim();
        if (!title) return;
        const newId = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        setStages((prev) => prev.map((s) =>
            s.id === stageId ? { ...s, id: newId, title } : s
        ));
        setEditingId(null);
    };

    const addChannel = () => {
        const label = newChannelLabel.trim();
        if (!label) return;
        const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        if (channels.some((c) => c.value === value)) {
            showNotification('That channel already exists.', 'error');
            return;
        }
        setChannels((prev) => [...prev, { value, label }]);
        setNewChannelLabel('');
    };

    const removeChannel = (value) => {
        setChannels((prev) => prev.filter((c) => c.value !== value));
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const payload = { pipelineStages: stages };
            if (channels.length > 0) payload.activityChannels = channels;
            const res = await api.put('/api/agency/migration/crm-config', payload);
            if (res.data?.success) {
                onSave(stages, channels.length > 0 ? channels : null);
                showNotification('Pipeline config saved.', 'success');
            }
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to save config.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400, padding: '20px' };
    const modalBox = { background: '#fff', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '24px' };
    const tabBtn = (active) => ({
        padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '13px',
        background: active ? '#11575C' : '#f1f5f9', color: active ? '#fff' : '#475569',
    });
    const stageRow = { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '6px' };

    return (
        <div style={modalOverlay} onClick={onClose}>
            <div style={modalBox} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', color: '#11575C' }}>Pipeline settings</h3>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', color: '#64748b', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <button type="button" style={tabBtn(tab === 'stages')} onClick={() => setTab('stages')}>Pipeline stages</button>
                    <button type="button" style={tabBtn(tab === 'channels')} onClick={() => setTab('channels')}>Activity channels</button>
                    <button type="button" style={tabBtn(tab === 'hubspot')} onClick={() => setTab('hubspot')}>Build from HubSpot</button>
                </div>

                {tab === 'stages' && (
                    <>
                        <div style={{ marginBottom: '16px' }}>
                            {stages.map((stage, idx) => (
                                <div key={stage.id} style={stageRow}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <button type="button" onClick={() => moveStage(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: '10px', padding: 0 }}>&#9650;</button>
                                        <button type="button" onClick={() => moveStage(idx, 1)} disabled={idx === stages.length - 1} style={{ background: 'none', border: 'none', cursor: idx === stages.length - 1 ? 'default' : 'pointer', opacity: idx === stages.length - 1 ? 0.3 : 1, fontSize: '10px', padding: 0 }}>&#9660;</button>
                                    </div>
                                    <span style={{ width: '20px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</span>
                                    {editingId === stage.id ? (
                                        <>
                                            <input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(stage.id); if (e.key === 'Escape') setEditingId(null); }}
                                                style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                autoFocus
                                            />
                                            <button type="button" onClick={() => saveEdit(stage.id)} style={{ background: '#11575C', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>OK</button>
                                            <button type="button" onClick={() => setEditingId(null)} style={{ background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{stage.title}</span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{leadsInStage(stage.id)} leads</span>
                                            <button type="button" onClick={() => startEdit(stage)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#0ea5e9' }} title="Rename"><i className="fas fa-pen" /></button>
                                            <button type="button" onClick={() => removeStage(stage.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }} title="Remove"><i className="fas fa-trash" /></button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addStage(); }}
                                placeholder="New stage name..."
                                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                            />
                            <button type="button" onClick={addStage} disabled={!newTitle.trim()} style={{ background: '#11575C', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', opacity: newTitle.trim() ? 1 : 0.5 }}>+ Add stage</button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={saveConfig} disabled={saving || stages.length === 0} style={{ padding: '10px 20px', background: '#11575C', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: saving || stages.length === 0 ? 0.5 : 1 }}>
                                {saving ? 'Saving...' : 'Save pipeline'}
                            </button>
                        </div>
                    </>
                )}

                {tab === 'channels' && (
                    <>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                            Activity channels are the options agents see when adding notes to a lead (e.g. Email, Phone call, WhatsApp).
                        </p>
                        <div style={{ marginBottom: '16px' }}>
                            {channels.map((ch) => (
                                <div key={ch.value} style={{ ...stageRow, justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{ch.label}</span>
                                    <button type="button" onClick={() => removeChannel(ch.value)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }} title="Remove"><i className="fas fa-trash" /></button>
                                </div>
                            ))}
                            {channels.length === 0 && (
                                <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No custom channels. Default channels (Email, Phone, Meeting, WhatsApp, SMS, Other) will be used.</p>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                            <input
                                value={newChannelLabel}
                                onChange={(e) => setNewChannelLabel(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addChannel(); }}
                                placeholder="New channel name..."
                                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                            />
                            <button type="button" onClick={addChannel} disabled={!newChannelLabel.trim()} style={{ background: '#11575C', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', opacity: newChannelLabel.trim() ? 1 : 0.5 }}>+ Add</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={saveConfig} disabled={saving} style={{ padding: '10px 20px', background: '#11575C', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
                                {saving ? 'Saving...' : 'Save config'}
                            </button>
                        </div>
                    </>
                )}

                {tab === 'hubspot' && (
                    <>
                        <div style={{ background: '#fffbeb', border: '1px solid #ffc801', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: '15px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fas fa-magic" /> Auto-configured from HubSpot imports
                            </h4>
                            <p style={{ fontSize: '13px', color: '#78350f', margin: '0 0 12px', lineHeight: 1.6 }}>
                                Your pipeline stages and activity channels are <strong>automatically built</strong> each time you upload a HubSpot export in <strong>Settings &gt; Integrations</strong>. The system analyzes the lifecycle stages, lead statuses, and deal stages in your file and creates a bespoke pipeline for your agency.
                            </p>
                            <p style={{ fontSize: '13px', color: '#78350f', margin: '0 0 16px', lineHeight: 1.6 }}>
                                Upload a new file anytime — your pipeline config will be refreshed automatically. You can then fine-tune the stages here in the <strong>Pipeline stages</strong> tab.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    window.location.href = '/settings?tab=integrations';
                                }}
                                style={{ padding: '10px 20px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <i className="fas fa-cog" /> Go to Settings &amp; Integrations
                            </button>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
                            <strong>How it works:</strong>
                            <ol style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                                <li>Go to <strong>Settings &gt; Integrations &gt; HubSpot</strong></li>
                                <li>Upload your contacts export (and optionally deals)</li>
                                <li>Your leads are imported <em>and</em> your pipeline stages are auto-configured</li>
                                <li>Come back here to reorder, rename, or add/remove stages</li>
                            </ol>
                        </div>
                    </>
                )}

                {/* Delete stage with move modal */}
                {deleteModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: '20px' }} onClick={() => setDeleteModal(null)}>
                        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
                            <h4 style={{ margin: '0 0 8px', color: '#b91c1c', fontSize: '16px' }}>Delete stage</h4>
                            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
                                This stage has <strong>{deleteModal.count}</strong> lead{deleteModal.count === 1 ? '' : 's'}. Where should they be moved?
                            </p>
                            <select
                                value={moveToStageId}
                                onChange={(e) => setMoveToStageId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', marginBottom: '16px' }}
                            >
                                {stages.filter((s) => s.id !== deleteModal.stageId).map((s) => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setDeleteModal(null)} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="button" onClick={confirmDelete} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Delete &amp; move leads</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CRM;