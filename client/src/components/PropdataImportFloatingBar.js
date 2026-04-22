import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePropdataImport } from '../context/PropdataImportContext';

/**
 * Compact fixed progress for PropData XLSX import — survives navigation away from Settings.
 */
function isAgencyRole() {
    try {
        return String(JSON.parse(localStorage.getItem('user') || '{}').role || '').toLowerCase() === 'agency';
    } catch {
        return false;
    }
}

export default function PropdataImportFloatingBar() {
    const { propdataJobId, propdataJobStatus, propdataImportPhaseUi } = usePropdataImport();

    const visible =
        isAgencyRole() &&
        propdataJobId &&
        (propdataImportPhaseUi === 'running' || propdataImportPhaseUi === 'done_ok' || propdataImportPhaseUi === 'done_err');

    const phases = propdataJobStatus?.phases || [];
    const done = !!propdataJobStatus?.done;
    const errMsg = propdataJobStatus?.error;

    const headline = useMemo(() => {
        if (propdataImportPhaseUi === 'done_ok') return 'Import complete';
        if (propdataImportPhaseUi === 'done_err') return 'Import finished with issues';
        if (!phases.length) return 'PropData import…';
        const running = phases.find((p) => p.status === 'running');
        if (running) return running.title || 'Import…';
        const pend = phases.find((p) => p.status === 'pending');
        return pend ? pend.title : 'PropData import…';
    }, [phases, propdataImportPhaseUi]);

    const aggregatePct = useMemo(() => {
        if (!phases.length) return done ? 100 : 8;
        const weights = phases.filter((p) => p.status !== 'skipped');
        if (!weights.length) return 100;
        let sum = 0;
        let n = 0;
        for (const p of weights) {
            const t = Math.max(1, p.total || 1);
            const c = Math.min(p.current || 0, t);
            sum += c / t;
            n += 1;
        }
        return Math.round((sum / n) * 100);
    }, [phases, done]);

    if (!visible) return null;

    const brand = '#11575C';
    const isErr = propdataImportPhaseUi === 'done_err' || !!errMsg;

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed',
                top: '68px',
                right: '14px',
                zIndex: 100020,
                width: 'min(300px, calc(100vw - 28px))',
                padding: '10px 12px',
                borderRadius: '10px',
                background: '#fff',
                border: `1px solid ${isErr ? '#fecaca' : '#e2e8f0'}`,
                boxShadow: '0 10px 28px rgba(15, 23, 42, 0.12)',
                fontSize: '12px',
                lineHeight: 1.35,
                color: '#334155',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, color: brand, fontSize: '12px' }}>{headline}</div>
                <Link to="/settings?tab=integrations" style={{ color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap', textDecoration: 'underline' }}>
                    Details
                </Link>
            </div>
            <div style={{ height: '4px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden', marginBottom: '8px' }}>
                <div
                    style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(aggregatePct, done ? 100 : 6))}%`,
                        borderRadius: '3px',
                        background: isErr ? '#dc2626' : brand,
                        transition: 'width 0.35s ease',
                    }}
                />
            </div>
            <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                {phases.length === 0 && !done && (
                    <div style={{ color: '#64748b', fontSize: '11px' }}>Starting job…</div>
                )}
                {phases.map((ph) => {
                    const skip = ph.status === 'skipped';
                    const pct = ph.total > 0 ? Math.min(100, Math.round((ph.current / ph.total) * 100)) : ph.status === 'done' ? 100 : 0;
                    if (skip) return null;
                    return (
                        <div key={ph.key} style={{ marginBottom: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', fontSize: '11px' }}>
                                <span style={{ color: '#475569' }}>{ph.title}</span>
                                <span style={{ color: '#94a3b8' }}>
                                    {ph.status === 'done' ? '✓' : ph.total > 0 ? `${pct}%` : ph.status === 'running' ? '…' : ''}
                                </span>
                            </div>
                            {ph.detail ? (
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{ph.detail}</div>
                            ) : null}
                        </div>
                    );
                })}
                {errMsg && propdataImportPhaseUi !== 'idle' ? (
                    <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '4px' }}>{errMsg}</div>
                ) : null}
            </div>
        </div>
    );
}
