import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../config/api';
import { showNotification } from '../components/NotificationManager';
import NegotiationFieldsSection from '../components/NegotiationFieldsSection';
import { SALES_PIPELINE_TEMPLATES, getEffectivePipelineStages } from '../constants/salesPipelineTemplates';
import { getSalesCache, setSalesCache, invalidateSalesCache, takeSalesInvalidated } from '../config/salesCache';

/**
 * Sales pipeline kanban — separate from CRM. Deals are auto-created by the
 * backend when a listing's Property Status flips to "Under Negotiation"
 * (see server/utils/salesPipelineSync.js). Agencies can also add deals
 * manually here.
 *
 * Design intent: same look-and-feel as the CRM kanban so the team learns it
 * once. Columns = pipeline stages from agency.salesConfig.pipelineStages
 * (or the chosen template). Drag-and-drop moves a deal between stages.
 */

function fmtMoney(n, currency = 'ZAR') {
    if (n == null || isNaN(Number(n))) return '—';
    const v = Number(n);
    if (currency === 'ZAR') return `ZAR ${v.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
    return `${currency} ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return ''; }
}

function ageDays(d) {
    if (!d) return null;
    try {
        const diff = Date.now() - new Date(d).getTime();
        return Math.max(0, Math.floor(diff / 86400000));
    } catch { return null; }
}

export default function Sales() {
    let storedUser = null;
    try { storedUser = JSON.parse(localStorage.getItem('user') || 'null'); } catch (_) { storedUser = null; }
    const role = (storedUser?.role || localStorage.getItem('role') || '').toLowerCase();
    const userId = storedUser?._id ? String(storedUser._id) : localStorage.getItem('userId');

    // Hydrate from cache synchronously so re-entering the page is instant.
    // The effect below will revalidate in the background.
    const cached = userId ? getSalesCache(userId) : null;
    const [loading, setLoading] = useState(() => !cached);
    const [salesConfig, setSalesConfig] = useState(() => cached?.salesConfig || null);
    const [deals, setDeals] = useState(() => cached?.deals || []);
    const [agents, setAgents] = useState(() => cached?.agents || []);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [showStageEditor, setShowStageEditor] = useState(false);
    const [draggedDealId, setDraggedDealId] = useState(null);
    const [dragOverStageId, setDragOverStageId] = useState(null);
    const [activeDeal, setActiveDeal] = useState(null);
    const [showAddDeal, setShowAddDeal] = useState(false);
    const [automationModalStage, setAutomationModalStage] = useState(null);
    // Filters
    const [agentFilter, setAgentFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const dragRef = useRef(null);

    const isAgency = role === 'agency';
    const isAgencyAgent = role === 'agency_agent';
    const isIndependentAgent = role === 'independent_agent' || role === 'agent';
    const canAccess = isAgency || isAgencyAgent || isIndependentAgent;
    // Only the agency (or sole agent on their own pipeline) can edit stage
    // configuration. Agency agents see a read-only board scoped to their
    // assigned deals.
    const canManagePipeline = isAgency || isIndependentAgent;

    // ---------------- Data load (cache-first, then revalidate) ----------------
    const fetchAll = useCallback(async ({ background } = { background: false }) => {
        if (!canAccess || !userId) return;
        try {
            const [cfgRes, dealsRes, dashRes] = await Promise.all([
                api.get('/api/agency/sales-config'),
                api.get('/api/agency/sales-deals'),
                api.get(`/api/users/${userId}?type=dashboard`),
            ]);
            const cfg = cfgRes.data?.salesConfig || {};
            const dealsList = Array.isArray(dealsRes.data?.deals) ? dealsRes.data.deals : [];
            const agentsList = dashRes.data?.stats?.topAgents || dashRes.data?.agentStats?.topAgents || [];
            setSalesConfig(cfg);
            setDeals(dealsList);
            setAgents(agentsList);
            setSalesCache(userId, { salesConfig: cfg, deals: dealsList, agents: agentsList });
            // Only prompt the template picker for owners — agency agents
            // inherit whatever their agency has configured.
            if (canManagePipeline && !cfg.template && (!cfg.pipelineStages || cfg.pipelineStages.length === 0)) {
                setShowTemplatePicker(true);
            }
        } catch (err) {
            if (!background) console.warn('Sales load failed:', err?.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [canAccess, canManagePipeline, userId]);

    useEffect(() => {
        if (!canAccess) { setLoading(false); return; }
        // Always revalidate on mount — but if we already have cache the
        // user sees data immediately while the network call refreshes in
        // the background. If a sibling page invalidated the cache we
        // treat this as a forced refetch.
        const wasInvalidated = takeSalesInvalidated();
        const haveCache = !!getSalesCache(userId);
        fetchAll({ background: haveCache && !wasInvalidated });
    }, [canAccess, userId, fetchAll]);

    // Refetch when the tab becomes visible again — picks up deals created
    // by status flips that happened on other tabs / the listings page.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            if (takeSalesInvalidated() || !getSalesCache(userId)) {
                fetchAll({ background: true });
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [userId, fetchAll]);

    const stages = useMemo(() => getEffectivePipelineStages(salesConfig), [salesConfig]);
    const automationRulesByStage = useMemo(() => salesConfig?.automationRules || {}, [salesConfig]);

    // Apply filters before bucketing into stages
    const filteredDeals = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return deals.filter((d) => {
            if (agentFilter && String(d.assignedAgentId || '') !== String(agentFilter)) return false;
            if (typeFilter && String(d.propertyType || '').toLowerCase() !== typeFilter) return false;
            if (q) {
                const haystack = [
                    d.propertyTitle, d.propertyAddress, d.propertySuburb,
                    d.buyerName, d.buyerEmail, d.buyerMobile, d.assignedAgentName,
                ].filter(Boolean).join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [deals, agentFilter, typeFilter, searchQuery]);

    const dealsByStage = useMemo(() => {
        const map = new Map(stages.map((s) => [s.id, []]));
        for (const d of filteredDeals) {
            if (!map.has(d.stageId)) map.set(d.stageId, []);
            map.get(d.stageId).push(d);
        }
        return map;
    }, [filteredDeals, stages]);

    const totals = useMemo(() => {
        const open = filteredDeals.filter((d) => d.stageId !== 'won' && d.stageId !== 'lost');
        const won = filteredDeals.filter((d) => d.stageId === 'won');
        const sumOpen = open.reduce((acc, d) => acc + (Number(d.askingPrice) || Number(d.offerPrice) || 0), 0);
        const sumWon = won.reduce((acc, d) => acc + (Number(d.offerPrice) || Number(d.askingPrice) || 0), 0);
        return { openCount: open.length, wonCount: won.length, totalCount: filteredDeals.length, sumOpen, sumWon };
    }, [filteredDeals]);

    // ---------------- Pipeline template ----------------
    const applyTemplate = useCallback(async (templateId) => {
        const tpl = SALES_PIPELINE_TEMPLATES[templateId];
        if (!tpl) return;
        try {
            const { data } = await api.put('/api/agency/sales-config', {
                template: templateId,
                pipelineStages: tpl.stages,
            });
            setSalesConfig(data.salesConfig);
            setShowTemplatePicker(false);
            showNotification(`Pipeline set to "${tpl.label}".`, 'success');
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to set pipeline.', 'error');
        }
    }, []);

    // ---------------- Drag / drop ----------------
    const onDragStart = useCallback((deal) => {
        setDraggedDealId(deal.id);
        dragRef.current = deal;
    }, []);
    const onDragEnd = useCallback(() => {
        setDraggedDealId(null);
        setDragOverStageId(null);
        dragRef.current = null;
    }, []);
    const onDropOnStage = useCallback(async (stageId) => {
        const deal = dragRef.current;
        if (!deal || deal.stageId === stageId) { onDragEnd(); return; }
        const prev = deals;
        setDeals(prev.map((d) => (d.id === deal.id ? { ...d, stageId } : d)));
        onDragEnd();
        try {
            const { data } = await api.put('/api/agency/sales-deals', { dealId: deal.id, updates: { stageId } });
            // Replace local copy with the server's authoritative version so
            // the freshly-logged activity becomes visible without a reload.
            setDeals((curr) => curr.map((d) => (d.id === deal.id ? data.deal : d)));
            if (activeDeal?.id === deal.id) setActiveDeal(data.deal);
        } catch (err) {
            setDeals(prev);
            showNotification(err.response?.data?.message || 'Failed to move deal.', 'error');
        }
    }, [deals, onDragEnd, activeDeal]);

    // ---------------- Deal mutations ----------------
    const updateDeal = useCallback(async (dealId, updates) => {
        const prev = deals;
        setDeals(prev.map((d) => (d.id === dealId ? { ...d, ...updates } : d)));
        try {
            const { data } = await api.put('/api/agency/sales-deals', { dealId, updates });
            setDeals((curr) => curr.map((d) => (d.id === dealId ? data.deal : d)));
            if (activeDeal?.id === dealId) setActiveDeal(data.deal);
        } catch (err) {
            setDeals(prev);
            showNotification(err.response?.data?.message || 'Failed to update deal.', 'error');
        }
    }, [deals, activeDeal]);

    const deleteDeal = useCallback(async (dealId) => {
        if (!window.confirm('Remove this deal from the pipeline?')) return;
        const prev = deals;
        setDeals(prev.filter((d) => d.id !== dealId));
        if (activeDeal?.id === dealId) setActiveDeal(null);
        try {
            await api.delete('/api/agency/sales-deals', { data: { dealId } });
        } catch (err) {
            setDeals(prev);
            showNotification(err.response?.data?.message || 'Failed to remove deal.', 'error');
        }
    }, [deals, activeDeal]);

    const createDeal = useCallback(async (payload) => {
        try {
            const { data } = await api.post('/api/agency/sales-deals', payload);
            setDeals((curr) => [...curr, data.deal]);
            setShowAddDeal(false);
            showNotification('Deal added.', 'success');
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to add deal.', 'error');
        }
    }, []);

    const saveAutomationRules = useCallback(async (stageId, rules) => {
        const nextRulesByStage = { ...automationRulesByStage, [stageId]: rules };
        try {
            const { data } = await api.put('/api/agency/sales-config', { automationRules: nextRulesByStage });
            setSalesConfig(data.salesConfig);
            showNotification('Automation rules saved.', 'success');
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to save rules.', 'error');
        }
    }, [automationRulesByStage]);

    // ---------------- Render ----------------
    if (!canAccess) {
        return (
            <div className="dashboard-container" style={{ display: 'flex' }}>
                <Sidebar />
                <main className="dashboard-main" style={{ padding: '24px 40px' }}>
                    <h1 style={{ color: '#11575C' }}>Sales pipeline</h1>
                    <p style={{ color: '#64748b' }}>The Sales pipeline is available for agency and agent accounts.</p>
                </main>
            </div>
        );
    }

    const subtitleParts = [`${totals.openCount} open deal${totals.openCount === 1 ? '' : 's'}`];
    if (totals.sumOpen > 0) subtitleParts.push(`${fmtMoney(totals.sumOpen)} in pipeline`);
    if (totals.wonCount > 0) subtitleParts.push(`${totals.wonCount} closed-won`);

    return (
        <div className="dashboard-container" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ padding: '24px 40px', backgroundColor: '#fdfdfd', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                {/* HEADER: matches CRM exactly — title left, action buttons right */}
                <header style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1f3a3d', margin: '0 0 5px 0' }}>Sales Pipeline</h1>
                        <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
                            {subtitleParts.join(' · ')}
                            {salesConfig?.template && (
                                <span style={{ marginLeft: 10, padding: '2px 10px', background: '#e0f2f1', color: '#11575C', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                                    {SALES_PIPELINE_TEMPLATES[salesConfig.template]?.label || 'Custom pipeline'}
                                </span>
                            )}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {canManagePipeline && (
                            <button
                                onClick={() => setShowStageEditor(true)}
                                style={{
                                    background: 'transparent', color: '#11575C', border: '1px solid #11575C', padding: '10px 20px',
                                    borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                                title="Edit pipeline stages or pick a different template"
                            >
                                <i className="fas fa-cog"></i> Pipeline settings
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddDeal(true)}
                            style={{
                                background: '#11575C', color: 'white', border: 'none', padding: '10px 20px',
                                borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            <i className="fas fa-plus"></i> New deal
                        </button>
                    </div>
                </header>

                {/* FILTERS — same shape as CRM (agent dropdown + search + type).
                    The agent dropdown only makes sense for the agency principal
                    or a sole agent (who manages everyone they assign); agency
                    agents already see only their own deals. */}
                <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
                    {isAgency && agents && agents.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Filter by agent</label>
                            <select
                                value={agentFilter}
                                onChange={(e) => setAgentFilter(e.target.value)}
                                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', minWidth: '180px', background: '#fff', color: '#1e293b' }}
                            >
                                <option value="">All agents</option>
                                {agents.filter((a) => a._id || a.id).map((a) => (
                                    <option key={a._id || a.id} value={a._id || a.id}>{a.name || a.email || 'Agent'}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '200px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Search deals</label>
                        <input
                            type="text"
                            placeholder="Property, address or buyer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', flex: '1', maxWidth: '320px', background: '#fff' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Type</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', minWidth: '140px', background: '#fff', color: '#1e293b' }}
                        >
                            <option value="">All types</option>
                            <option value="industrial">Industrial</option>
                            <option value="warehouse">Warehouse</option>
                            <option value="commercial">Commercial</option>
                            <option value="retail">Retail</option>
                            <option value="land">Land</option>
                            <option value="mixed">Mixed-use</option>
                        </select>
                    </div>
                </div>

                {/* Helper hint — auto-promotion explainer */}
                <p style={{ margin: '0 0 18px', fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
                    Deals are added automatically when a listing's status changes to <strong style={{ color: '#475569' }}>Under Negotiation</strong>.
                </p>

                {/* BODY */}
                {loading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading sales pipeline…</div>
                ) : showTemplatePicker ? (
                    <TemplatePicker onPick={applyTemplate} onSkip={() => setShowTemplatePicker(false)} />
                ) : (
                    <div className="pipeline-board" style={{ display: 'flex', gap: '20px', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '20px', flex: 1, minHeight: 0, alignSelf: 'stretch' }}>
                        {stages.map((stage) => {
                            const colDeals = dealsByStage.get(stage.id) || [];
                            const colSum = colDeals.reduce((acc, d) => acc + (Number(d.askingPrice) || Number(d.offerPrice) || 0), 0);
                            const isOver = dragOverStageId === stage.id;
                            return (
                                <div
                                    key={stage.id}
                                    style={{ width: '260px', minWidth: '260px', maxWidth: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStageId(stage.id); }}
                                    onDragLeave={() => setDragOverStageId(null)}
                                    onDrop={(e) => { e.preventDefault(); setDragOverStageId(null); onDropOnStage(stage.id); }}
                                >
                                    {/* + Add Automation Rule (CRM-parity) */}
                                    <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                                        {(automationRulesByStage[stage.id] || []).length > 0 && (
                                            <span
                                                title={`${(automationRulesByStage[stage.id] || []).length} rule(s)`}
                                                style={{
                                                    fontSize: '10px', fontWeight: 700, color: '#11575C',
                                                    background: '#e0f2f1', borderRadius: '50%',
                                                    minWidth: '18px', height: '18px',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                                                }}
                                            >
                                                {(automationRulesByStage[stage.id] || []).length}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setAutomationModalStage(stage.id)}
                                            style={{
                                                fontSize: '11px', padding: '4px 10px', background: 'transparent',
                                                color: '#11575C', border: '1px dashed #11575C', borderRadius: '6px',
                                                cursor: 'pointer', fontWeight: 600,
                                            }}
                                        >
                                            + Add Automation Rule
                                        </button>
                                    </div>
                                    {/* COLUMN HEADER (identical to CRM) */}
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
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage.title}</div>
                                            <div style={{ fontSize: '11px', opacity: 0.8 }}>Value: {colSum > 0 ? fmtMoney(colSum) : '—'}</div>
                                        </div>
                                        <span style={{
                                            fontSize: '13px', fontWeight: 700, color: '#11575C',
                                            background: '#fff', borderRadius: '50%',
                                            minWidth: '26px', height: '26px', padding: '0 6px',
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        }}>{colDeals.length}</span>
                                    </div>

                                    {/* COLUMN BODY */}
                                    <div style={{
                                        flex: 1, minHeight: 0, overflowY: 'auto',
                                        padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '10px',
                                        background: isOver ? '#e6f4f4' : '#f4f6f8',
                                        borderBottomLeftRadius: '12px',
                                        borderBottomRightRadius: '12px',
                                    }}>
                                        {colDeals.length === 0 && (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: '14px 6px' }}>
                                                Drop deals here
                                            </div>
                                        )}
                                        {colDeals.map((deal) => (
                                            <DealCard
                                                key={deal.id}
                                                deal={deal}
                                                isDragging={draggedDealId === deal.id}
                                                onDragStart={() => onDragStart(deal)}
                                                onDragEnd={onDragEnd}
                                                onClick={() => setActiveDeal(deal)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Modals */}
                {showStageEditor && (
                    <StageEditor
                        salesConfig={salesConfig}
                        onClose={() => setShowStageEditor(false)}
                        onChangeTemplate={() => { setShowStageEditor(false); setShowTemplatePicker(true); }}
                        onSave={async (stagesNext) => {
                            try {
                                const { data } = await api.put('/api/agency/sales-config', { template: 'custom', pipelineStages: stagesNext });
                                setSalesConfig(data.salesConfig);
                                setShowStageEditor(false);
                                showNotification('Pipeline stages updated.', 'success');
                            } catch (err) {
                                showNotification(err.response?.data?.message || 'Save failed.', 'error');
                            }
                        }}
                    />
                )}

                {showAddDeal && (
                    <AddDealModal
                        stages={stages}
                        onClose={() => setShowAddDeal(false)}
                        onCreate={createDeal}
                    />
                )}

                {activeDeal && (
                    <DealDetailModal
                        deal={activeDeal}
                        stages={stages}
                        agents={agents}
                        userId={userId}
                        onClose={() => setActiveDeal(null)}
                        onUpdate={(updates) => updateDeal(activeDeal.id, updates)}
                        onDelete={() => deleteDeal(activeDeal.id)}
                    />
                )}

                {automationModalStage && (
                    <AutomationRulesModal
                        stage={stages.find((s) => s.id === automationModalStage)}
                        existingRules={automationRulesByStage[automationModalStage] || []}
                        agents={agents}
                        onClose={() => setAutomationModalStage(null)}
                        onSave={(rules) => saveAutomationRules(automationModalStage, rules)}
                    />
                )}
            </main>
        </div>
    );
}

// ============== Sub-components ==============

function DealCard({ deal, isDragging, onDragStart, onDragEnd, onClick }) {
    const age = ageDays(deal.createdAt);
    const isAuto = deal.source === 'auto-status-change';
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onClick}
            style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                padding: 10,
                cursor: 'grab',
                opacity: isDragging ? 0.45 : 1,
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                userSelect: 'none',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                    {deal.propertyTitle || 'Untitled deal'}
                </span>
                {isAuto && (
                    <span title="Auto-created from listing status change" style={{
                        flexShrink: 0, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                        background: '#e0f2f1', color: '#11575C', textTransform: 'uppercase', letterSpacing: 0.3,
                    }}>auto</span>
                )}
            </div>
            {(deal.propertyAddress || deal.propertySuburb) && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {[deal.propertyAddress, deal.propertySuburb].filter(Boolean).join(', ')}
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                    {fmtMoney(deal.askingPrice || deal.offerPrice, deal.currency)}
                </span>
                {age != null && (
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{age}d in pipeline</span>
                )}
            </div>
            {(deal.buyerName || deal.assignedAgentName) && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#475569', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {deal.buyerName && <span><i className="fas fa-user" style={{ width: 12, opacity: 0.6 }} /> {deal.buyerName}</span>}
                    {deal.assignedAgentName && <span><i className="fas fa-user-tie" style={{ width: 12, opacity: 0.6 }} /> {deal.assignedAgentName}</span>}
                </div>
            )}
        </div>
    );
}

function TemplatePicker({ onPick, onSkip }) {
    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
                <h2 style={{ color: '#11575C', fontSize: 20, marginBottom: 6 }}>Choose your sales pipeline</h2>
                <p style={{ color: '#64748b', fontSize: 13, marginTop: 0, marginBottom: 22 }}>
                    Pick a template that matches the deals your agency typically closes. You can fully customise the stages later.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                    {Object.values(SALES_PIPELINE_TEMPLATES).map((tpl) => (
                        <button
                            key={tpl.id}
                            onClick={() => onPick(tpl.id)}
                            style={{
                                textAlign: 'left', padding: 16, background: '#fff', border: tpl.recommended ? '2px solid #11575C' : '1px solid #e2e8f0',
                                borderRadius: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8,
                                transition: 'transform .12s ease, box-shadow .12s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,23,42,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: '#11575C' }}>{tpl.label}</span>
                                {tpl.recommended && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#11575C', padding: '2px 8px', borderRadius: 999 }}>RECOMMENDED</span>}
                            </div>
                            <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{tpl.description}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                {tpl.stages.map((s) => (
                                    <span key={s.id} style={{
                                        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                                        background: '#f1f5f9', color: '#475569',
                                    }}>{s.title}</span>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
                    <button onClick={onSkip} style={{ background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                        Skip for now (keep current setup)
                    </button>
                </div>
            </div>
        </div>
    );
}

function StageEditor({ salesConfig, onClose, onSave, onChangeTemplate }) {
    const [stages, setStages] = useState(() => {
        const list = salesConfig?.pipelineStages || getEffectivePipelineStages(salesConfig);
        return list.map((s, i) => ({ ...s, order: i }));
    });

    const updateStage = (idx, patch) => setStages((curr) => curr.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
    const removeStage = (idx) => setStages((curr) => curr.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
    const moveStage = (idx, dir) => {
        setStages((curr) => {
            const next = [...curr];
            const target = idx + dir;
            if (target < 0 || target >= next.length) return curr;
            [next[idx], next[target]] = [next[target], next[idx]];
            return next.map((s, i) => ({ ...s, order: i }));
        });
    };
    const addStage = () => setStages((curr) => [...curr, { id: `stage_${Date.now()}`, title: 'New stage', order: curr.length }]);

    return (
        <div style={modalOverlay} onClick={onClose}>
            <div style={{ ...modalCard, width: 520 }} onClick={(e) => e.stopPropagation()}>
                <h2 style={modalTitle}>Edit pipeline stages</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>
                    Reorder, rename or remove stages. Want a fresh start? <button onClick={onChangeTemplate} style={linkBtn}>Pick a template</button>.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                    {stages.map((s, i) => (
                        <div key={s.id || i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 8, alignItems: 'center', padding: '6px 4px', borderBottom: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{i + 1}</span>
                            <input value={s.title} onChange={(e) => updateStage(i, { title: e.target.value })} style={inputSm} />
                            <div style={{ display: 'flex', gap: 2 }}>
                                <button onClick={() => moveStage(i, -1)} style={iconBtn} title="Move up"><i className="fas fa-chevron-up" /></button>
                                <button onClick={() => moveStage(i, 1)} style={iconBtn} title="Move down"><i className="fas fa-chevron-down" /></button>
                                <button onClick={() => removeStage(i)} style={{ ...iconBtn, color: '#dc2626' }} title="Remove"><i className="fas fa-trash" /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={addStage} style={{ ...btnSecondary, marginTop: 12 }}>
                    <i className="fas fa-plus" /> Add stage
                </button>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button onClick={onClose} style={btnGhost}>Cancel</button>
                    <button onClick={() => onSave(stages)} style={btnPrimary}>Save pipeline</button>
                </div>
            </div>
        </div>
    );
}

function AddDealModal({ stages, onClose, onCreate }) {
    const [form, setForm] = useState({
        propertyTitle: '', propertyAddress: '', propertySuburb: '', propertyType: 'industrial',
        askingPrice: '', currency: 'ZAR', sizeSqm: '',
        buyerName: '', buyerEmail: '', buyerMobile: '',
        stageId: stages[0]?.id || 'negotiation', notes: '',
    });
    const set = (k, v) => setForm((curr) => ({ ...curr, [k]: v }));

    return (
        <div style={modalOverlay} onClick={onClose}>
            <div style={{ ...modalCard, width: 560 }} onClick={(e) => e.stopPropagation()}>
                <h2 style={modalTitle}>Add deal manually</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>
                    Use this for off-market deals or inherited pipelines. Listings flipped to <em>Under Negotiation</em> appear here automatically.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field label="Property title" full><input value={form.propertyTitle} onChange={(e) => set('propertyTitle', e.target.value)} style={input} placeholder="e.g. Warehouse — 2,400m²" /></Field>
                    <Field label="Address" full><input value={form.propertyAddress} onChange={(e) => set('propertyAddress', e.target.value)} style={input} /></Field>
                    <Field label="Suburb"><input value={form.propertySuburb} onChange={(e) => set('propertySuburb', e.target.value)} style={input} /></Field>
                    <Field label="Property type"><select value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)} style={input}>
                        <option value="industrial">Industrial / warehouse</option>
                        <option value="commercial">Commercial / office</option>
                        <option value="retail">Retail</option>
                        <option value="land">Land / development</option>
                        <option value="mixed">Mixed-use</option>
                    </select></Field>
                    <Field label="Asking price (ZAR)"><input type="number" value={form.askingPrice} onChange={(e) => set('askingPrice', e.target.value)} style={input} placeholder="e.g. 12500000" /></Field>
                    <Field label="Size (m²)"><input type="number" value={form.sizeSqm} onChange={(e) => set('sizeSqm', e.target.value)} style={input} /></Field>
                    <Field label="Buyer name"><input value={form.buyerName} onChange={(e) => set('buyerName', e.target.value)} style={input} /></Field>
                    <Field label="Buyer email"><input type="email" value={form.buyerEmail} onChange={(e) => set('buyerEmail', e.target.value)} style={input} /></Field>
                    <Field label="Buyer mobile"><input type="tel" value={form.buyerMobile} onChange={(e) => set('buyerMobile', e.target.value)} style={input} /></Field>
                    <Field label="Starting stage"><select value={form.stageId} onChange={(e) => set('stageId', e.target.value)} style={input}>
                        {stages.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select></Field>
                    <Field label="Notes" full><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ ...input, minHeight: 64, resize: 'vertical' }} /></Field>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button onClick={onClose} style={btnGhost}>Cancel</button>
                    <button onClick={() => onCreate(form)} style={btnPrimary} disabled={!form.propertyTitle.trim()}>Add deal</button>
                </div>
            </div>
        </div>
    );
}

function DealDetailModal({ deal, stages, agents, userId, onClose, onUpdate, onDelete }) {
    const [notes, setNotes] = useState(deal.notes || '');
    const [activityNote, setActivityNote] = useState('');
    const isAuto = deal.source === 'auto-status-change';

    return (
        <div style={modalOverlay} onClick={onClose}>
            <div style={{ ...modalCard, width: 640 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                        <h2 style={{ ...modalTitle, marginBottom: 4 }}>{deal.propertyTitle || 'Deal'}</h2>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                            {[deal.propertyAddress, deal.propertySuburb].filter(Boolean).join(', ') || 'No address'}
                        </div>
                    </div>
                    {isAuto && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: '#fef3c7', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                            auto-created
                        </span>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0' }}>
                    <DetailRow label="Asking">{fmtMoney(deal.askingPrice, deal.currency)}</DetailRow>
                    <DetailRow label="Offer">{fmtMoney(deal.offerPrice, deal.currency)}</DetailRow>
                    <DetailRow label="Size">{deal.sizeSqm ? `${deal.sizeSqm.toLocaleString()} m²` : '—'}</DetailRow>
                    <DetailRow label="Type">{deal.propertyType || '—'}</DetailRow>
                    <DetailRow label="Listing agent">{deal.assignedAgentName || '—'}</DetailRow>
                    <DetailRow label="Buyer">{deal.buyerName || '—'}</DetailRow>
                    <DetailRow label="Created">{fmtDate(deal.createdAt)}</DetailRow>
                    <DetailRow label="Last updated">{fmtDate(deal.updatedAt)}</DetailRow>
                </div>

                <NegotiationSnapshot deal={deal} agents={agents} userId={userId} onSave={onUpdate} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Stage:</span>
                    <select value={deal.stageId} onChange={(e) => onUpdate({ stageId: e.target.value })} style={{ ...input, width: 'auto' }}>
                        {stages.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                </div>

                <Field label="Notes" full>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => { if (notes !== deal.notes) onUpdate({ notes }); }}
                        style={{ ...input, minHeight: 70, resize: 'vertical' }}
                    />
                </Field>

                <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Activity log</div>
                    <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, background: '#f8fafc' }}>
                        {(deal.activities || []).slice().reverse().map((a) => (
                            <div key={a.actionId} style={{ fontSize: 11, color: '#475569', padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                                <span style={{ color: '#94a3b8' }}>{fmtDate(a.datetime)} · </span>{a.activity}
                                {a.changedBy?.name && <span style={{ color: '#94a3b8' }}> · {a.changedBy.name}</span>}
                            </div>
                        ))}
                        {(!deal.activities || deal.activities.length === 0) && <div style={{ fontSize: 11, color: '#94a3b8' }}>No activity yet.</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <input value={activityNote} onChange={(e) => setActivityNote(e.target.value)} placeholder="Add a quick note…" style={input} />
                        <button
                            onClick={() => { if (activityNote.trim()) { onUpdate({ activityNote: activityNote.trim() }); setActivityNote(''); } }}
                            style={btnSecondary}
                        ><i className="fas fa-paper-plane" /></button>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
                    <button onClick={onDelete} style={{ ...btnGhost, color: '#dc2626' }}>
                        <i className="fas fa-trash" /> Remove deal
                    </button>
                    <button onClick={onClose} style={btnPrimary}>Done</button>
                </div>
            </div>
        </div>
    );
}

function AutomationRulesModal({ stage, existingRules, agents, onClose, onSave }) {
    const [rules, setRules] = useState(() => existingRules.map((r) => ({ ...r })));
    const [draft, setDraft] = useState({
        trigger: 'enter_stage',     // 'enter_stage' | 'days_in_stage'
        triggerDays: '',
        action: 'notify_agent',     // 'notify_agent' | 'create_task' | 'add_note' | 'send_email'
        actionTarget: '',           // for notify_agent: agentId; for send_email: address
        actionPayload: '',          // task description / note text / email subject
    });

    const stageTitle = stage?.title || 'this stage';

    const setDraftField = (k, v) => setDraft((curr) => ({ ...curr, [k]: v }));

    const addRule = () => {
        if (!draft.action) return;
        const rule = {
            id: `rule_${Date.now()}`,
            trigger: draft.trigger,
            triggerDays: draft.trigger === 'days_in_stage' ? Number(draft.triggerDays) || 1 : null,
            action: draft.action,
            actionTarget: draft.actionTarget || null,
            actionPayload: draft.actionPayload || null,
            createdAt: new Date().toISOString(),
        };
        setRules((curr) => [...curr, rule]);
        setDraft({ trigger: 'enter_stage', triggerDays: '', action: 'notify_agent', actionTarget: '', actionPayload: '' });
    };

    const removeRule = (id) => setRules((curr) => curr.filter((r) => r.id !== id));

    const summary = (r) => {
        const trig = r.trigger === 'days_in_stage'
            ? `After ${r.triggerDays} day${r.triggerDays === 1 ? '' : 's'} in ${stageTitle}`
            : `When entering ${stageTitle}`;
        let act = '';
        switch (r.action) {
            case 'notify_agent':
                act = `notify ${r.actionTarget ? (agents.find((a) => String(a._id || a.id) === String(r.actionTarget))?.name || 'agent') : 'assigned agent'}`;
                break;
            case 'create_task':
                act = `create task: "${r.actionPayload || 'follow up'}"`;
                break;
            case 'add_note':
                act = `add note: "${r.actionPayload || ''}"`;
                break;
            case 'send_email':
                act = `email ${r.actionTarget || 'the buyer'}`;
                break;
            default: act = r.action;
        }
        return `${trig} → ${act}`;
    };

    const showTarget = draft.action === 'notify_agent' || draft.action === 'send_email';
    const showPayload = draft.action === 'create_task' || draft.action === 'add_note' || draft.action === 'send_email';

    return (
        <div style={modalOverlay} onClick={onClose}>
            <div style={{ ...modalCard, width: 520 }} onClick={(e) => e.stopPropagation()}>
                <h2 style={modalTitle}>Automation rules — {stageTitle}</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>
                    Trigger an action automatically when a deal hits this stage. Rules apply to every deal — manual or auto-created.
                </p>

                {rules.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Existing rules</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {rules.map((r) => (
                                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 12, color: '#0f172a' }}>{summary(r)}</span>
                                    <button onClick={() => removeRule(r.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }} title="Remove">
                                        <i className="fas fa-trash" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Add a rule</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <Field label="When">
                            <select value={draft.trigger} onChange={(e) => setDraftField('trigger', e.target.value)} style={input}>
                                <option value="enter_stage">Deal enters {stageTitle}</option>
                                <option value="days_in_stage">Deal sits in {stageTitle} for N days</option>
                            </select>
                        </Field>
                        {draft.trigger === 'days_in_stage' && (
                            <Field label="Days threshold">
                                <input type="number" min="1" value={draft.triggerDays} onChange={(e) => setDraftField('triggerDays', e.target.value)} style={input} placeholder="e.g. 7" />
                            </Field>
                        )}
                        <Field label="Then">
                            <select value={draft.action} onChange={(e) => setDraftField('action', e.target.value)} style={input}>
                                <option value="notify_agent">Notify an agent</option>
                                <option value="create_task">Create a task</option>
                                <option value="add_note">Add a note to the deal</option>
                                <option value="send_email">Send an email</option>
                            </select>
                        </Field>
                        {draft.action === 'notify_agent' && (
                            <Field label="Notify">
                                <select value={draft.actionTarget} onChange={(e) => setDraftField('actionTarget', e.target.value)} style={input}>
                                    <option value="">Assigned agent</option>
                                    {agents.filter((a) => a._id || a.id).map((a) => (
                                        <option key={a._id || a.id} value={a._id || a.id}>{a.name || a.email || 'Agent'}</option>
                                    ))}
                                </select>
                            </Field>
                        )}
                        {draft.action === 'send_email' && (
                            <Field label="Email recipient">
                                <input value={draft.actionTarget} onChange={(e) => setDraftField('actionTarget', e.target.value)} style={input} placeholder="email@example.com or {buyerEmail}" />
                            </Field>
                        )}
                        {showPayload && (
                            <Field label={draft.action === 'create_task' ? 'Task description' : draft.action === 'add_note' ? 'Note text' : 'Email subject'} full>
                                <input value={draft.actionPayload} onChange={(e) => setDraftField('actionPayload', e.target.value)} style={input} />
                            </Field>
                        )}
                        {!showPayload && !showTarget && (
                            <div /> // spacer to keep grid aligned
                        )}
                    </div>
                    <button onClick={addRule} style={{ ...btnSecondary, marginTop: 12 }}>
                        <i className="fas fa-plus" /> Add rule
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                    <button onClick={onClose} style={btnGhost}>Cancel</button>
                    <button onClick={() => { onSave(rules); onClose(); }} style={btnPrimary}>Save rules</button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, full, children }) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: full ? '1 / -1' : 'auto' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{label}</span>
            {children}
        </label>
    );
}

function DetailRow({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 10px', background: '#f8fafc', borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{children}</span>
        </div>
    );
}

// Renders the OTP / probability / commission snapshot captured at the moment
// the listing was flipped to "Under Negotiation". Hidden when none of the
// fields exist (older deals from before the snapshot existed).
const PARTY_TYPE_LABELS = {
    listing_agent: 'Listing Agent',
    co_listing_agent: 'Co-Listing Agent',
    selling_agent: 'Selling Agent',
    referral_agent: 'Referral Agent',
    conveyancer: 'Conveyancer',
    bond_originator: 'Bond Originator',
    other: 'Partner',
};
function NegotiationSnapshot({ deal, agents, userId, onSave }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(null);

    const parties = Array.isArray(deal.commissionParties) ? deal.commissionParties : [];
    const hasAny = deal.otpFileName || deal.probabilityOfSale != null || deal.commissionRatePct != null || parties.length > 0;
    const totalShare = parties.reduce((acc, p) => acc + (Number(p.sharePct) || 0), 0);
    const askingOrOffer = Number(deal.offerPrice) || Number(deal.askingPrice) || 0;
    const totalCommission = (Number(deal.commissionRatePct) || 0) / 100 * askingOrOffer;
    const currency = deal.currency || 'ZAR';

    const startEditing = () => {
        setDraft({
            otpDecision: deal.otpFileId ? 'vault' : 'later',
            otpFileId: deal.otpFileId || null,
            otpFileName: deal.otpFileName || null,
            probabilityOfSale: deal.probabilityOfSale ?? null,
            commissionRatePct: deal.commissionRatePct ?? null,
            commissionParties: parties.map((p) => ({ ...p })),
        });
        setEditing(true);
    };

    const saveEdits = () => {
        if (!draft) return;
        const cleanParties = (draft.commissionParties || [])
            .filter((p) => p && (p.name || p.agentId || p.firmName))
            .map((p) => ({
                id: p.id,
                partyType: p.partyType,
                source: p.source || 'internal',
                agentId: p.source === 'internal' ? (p.agentId || null) : null,
                name: p.name || '',
                firmName: p.source === 'external' ? (p.firmName || null) : null,
                sharePct: Number(p.sharePct) || 0,
                notes: p.notes || null,
            }));
        onSave({
            otpFileId: draft.otpFileId || null,
            otpFileName: draft.otpFileName || null,
            probabilityOfSale: draft.probabilityOfSale ?? null,
            commissionRatePct: draft.commissionRatePct ?? null,
            commissionParties: cleanParties,
        });
        setEditing(false);
    };

    const cancelEdits = () => {
        setDraft(null);
        setEditing(false);
    };

    // The internal-agent dropdown expects {id, name} — flatten dashboard agents.
    const agentOptions = (agents || []).map((a) => ({
        id: String(a._id || a.id),
        name: a.name || a.email || 'Agent',
    })).filter((a) => a.id);

    return (
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fafbfd' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#11575C', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Negotiation details
                </div>
                {!editing && (
                    <button
                        type="button"
                        onClick={startEditing}
                        style={{ background: 'transparent', color: '#11575C', border: '1px solid #11575C', padding: '4px 10px', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
                    >
                        <i className="fas fa-pen" style={{ marginRight: 4 }} /> {hasAny ? 'Edit' : 'Add'}
                    </button>
                )}
            </div>

            {!editing && !hasAny && (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No negotiation details captured yet — click "Add" to record OTP, probability and commission split.</div>
            )}

            {!editing && hasAny && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: parties.length ? 10 : 0 }}>
                        <DetailRow label="Probability">{deal.probabilityOfSale != null ? `${deal.probabilityOfSale}%` : '—'}</DetailRow>
                        <DetailRow label="Commission rate">{deal.commissionRatePct != null ? `${deal.commissionRatePct}%` : '—'}</DetailRow>
                        <DetailRow label="OTP">{deal.otpFileName || (deal.otpFileId ? 'On file' : 'To follow')}</DetailRow>
                    </div>
                    {parties.length > 0 && (
                        <>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                                Commission split{totalCommission ? ` · ${fmtMoney(totalCommission, currency)} pool` : ''}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {parties.map((p) => {
                                    const role = PARTY_TYPE_LABELS[p.partyType] || 'Party';
                                    const who = p.name || (p.firmName || 'Unnamed');
                                    const fromShare = (Number(p.sharePct) || 0) / 100 * totalCommission;
                                    return (
                                        <div key={p.id || `${role}-${who}`} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 70px 90px', gap: 8, alignItems: 'center', fontSize: 12, padding: '4px 8px', background: 'white', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                            <span style={{ color: '#64748b' }}>{role}</span>
                                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                                {who}{p.firmName && p.name ? ` · ${p.firmName}` : ''}
                                                <span style={{ marginLeft: 6, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>{p.source || 'internal'}</span>
                                            </span>
                                            <span style={{ textAlign: 'right', color: '#475569' }}>{(p.sharePct ?? 0)}%</span>
                                            <span style={{ textAlign: 'right', color: '#11575C', fontWeight: 600 }}>{totalCommission ? fmtMoney(fromShare, currency) : '—'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {Math.abs(totalShare - 100) > 0.01 && (
                                <div style={{ marginTop: 6, fontSize: 11, color: '#b91c1c' }}>
                                    Shares total {totalShare.toFixed(2)}% — review the commission split.
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {editing && draft && (
                <>
                    <NegotiationFieldsSection
                        userId={userId}
                        agentOptions={agentOptions}
                        defaultListingAgentId={deal.assignedAgentId || null}
                        defaultListingAgentName={deal.assignedAgentName || ''}
                        propertyId={deal.propertyId || null}
                        propertyTitle={deal.propertyTitle || null}
                        value={draft}
                        onChange={setDraft}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                        <button type="button" onClick={cancelEdits} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                        <button type="button" onClick={saveEdits} style={{ background: '#11575C', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Save details</button>
                    </div>
                </>
            )}
        </div>
    );
}

// ============== Inline styles ==============
const btnPrimary = {
    background: '#11575C', color: '#fff', border: 'none',
    padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
};
const btnSecondary = {
    background: '#fff', color: '#11575C', border: '1px solid #11575C',
    padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
};
const btnGhost = {
    background: '#f1f5f9', color: '#475569', border: 'none',
    padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const linkBtn = {
    background: 'none', border: 'none', color: '#11575C', cursor: 'pointer',
    fontWeight: 600, padding: 0, textDecoration: 'underline',
};
const iconBtn = {
    background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6,
    padding: '4px 6px', fontSize: 11, color: '#475569', cursor: 'pointer',
};
const input = {
    padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, color: '#0f172a', background: '#fff', width: '100%', boxSizing: 'border-box',
};
const inputSm = { ...input, padding: '6px 10px', fontSize: 12 };
const modalOverlay = {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
};
const modalCard = {
    background: '#fff', borderRadius: 14, padding: 22, width: 'auto',
    maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 50px rgba(15,23,42,0.25)',
};
const modalTitle = { color: '#11575C', margin: '0 0 14px', fontSize: 18, fontWeight: 700 };
