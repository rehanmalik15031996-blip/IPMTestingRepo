import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import api from '../config/api';
import { showNotification } from './NotificationManager';

/**
 * Inputs the user fills in when flipping a listing to "Under Negotiation".
 * Drives the snapshot we persist on Property.negotiationDetails and copy
 * onto the auto-created sales pipeline deal.
 *
 * value: {
 *   otpDecision: 'later' | 'vault' | 'upload',
 *   otpFileId, otpFileName,
 *   probabilityOfSale: 0–100,
 *   commissionRatePct: 0–100,
 *   commissionParties: [...],
 * }
 */
const PARTY_TYPES = [
    { id: 'listing_agent', label: 'Listing Agent', allowsInternal: true, allowsExternal: false },
    { id: 'co_listing_agent', label: 'Co-Listing Agent', allowsInternal: true, allowsExternal: true },
    { id: 'selling_agent', label: 'Selling Agent (buyer side)', allowsInternal: true, allowsExternal: true },
    { id: 'referral_agent', label: 'Referral Agent', allowsInternal: true, allowsExternal: true },
    { id: 'conveyancer', label: 'Conveyancer / Attorney', allowsInternal: false, allowsExternal: true },
    { id: 'bond_originator', label: 'Bond Originator', allowsInternal: false, allowsExternal: true },
    { id: 'other', label: 'Other Partner', allowsInternal: false, allowsExternal: true },
];

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' };
const sectionStyle = { marginTop: '18px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0' };
const sectionTitleStyle = { fontSize: '13px', fontWeight: 700, color: '#11575C', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px 0' };
const radioRowStyle = { display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' };
const radioOptionStyle = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer' };
const subtleHint = { fontSize: '11px', color: '#94a3b8', marginTop: '6px' };

function newPartyId() { return `party_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function blankParty(extra = {}) {
    return {
        id: newPartyId(),
        partyType: 'listing_agent',
        source: 'internal',
        agentId: null,
        name: '',
        firmName: '',
        sharePct: 0,
        notes: '',
        ...extra,
    };
}

function NegotiationFieldsSection({ userId, agentOptions, defaultListingAgentId, defaultListingAgentName, propertyId, propertyTitle, value, onChange }) {
    const v = value || {};
    const otpDecision = v.otpDecision || (v.otpFileId ? 'vault' : 'later');
    const probability = v.probabilityOfSale ?? '';
    const commissionRate = v.commissionRatePct ?? '';
    const parties = Array.isArray(v.commissionParties) ? v.commissionParties : [];

    const [vaultFiles, setVaultFiles] = useState([]);
    const [vaultLoading, setVaultLoading] = useState(false);
    const [vaultLoaded, setVaultLoaded] = useState(false);
    const [vaultError, setVaultError] = useState('');
    // Guard so we only fire the vault GET once per mount even though state
    // changes (vaultLoading, vaultLoaded) cause the effect to re-evaluate.
    const vaultRequestedRef = useRef(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const dropzoneRef = useRef(null);

    const patch = useCallback((next) => {
        onChange({ ...v, ...next });
    }, [v, onChange]);

    // Lazy-load vault files only when the user picks "Select from vault".
    // We use slim=1 so the server skips the giant base64 `path` field — without
    // that strip the response is multi-MB and the dropdown appears to hang.
    // Note: we deliberately do NOT depend on vaultLoading/vaultLoaded — the
    // ref-based guard prevents double-fires while keeping the in-flight
    // request alive when state flips during fetch (otherwise the cleanup
    // function cancels the response we just asked for).
    useEffect(() => {
        if (otpDecision !== 'vault' || vaultRequestedRef.current || !userId) return;
        vaultRequestedRef.current = true;
        setVaultLoading(true);
        setVaultError('');
        api.get(`/api/vault?userId=${encodeURIComponent(userId)}&slim=1`, { timeout: 15000 })
            .then((res) => {
                const list = Array.isArray(res.data) ? res.data : (res.data?.files || []);
                // We only show non-image documents (PDFs, contracts, etc.)
                const docs = list.filter((f) => {
                    const t = (f.type || f.mimeType || '').toLowerCase();
                    return !t.startsWith('image/');
                });
                setVaultFiles(docs);
                setVaultLoaded(true);
            })
            .catch((err) => {
                setVaultFiles([]);
                setVaultError(err?.code === 'ECONNABORTED' ? 'Vault took too long to load.' : 'Could not load vault.');
                setVaultLoaded(true);
                vaultRequestedRef.current = false; // allow a retry on next render
            })
            .finally(() => setVaultLoading(false));
    }, [otpDecision, userId]);

    // Seed a default listing-agent commission party the first time the user opens the section.
    useEffect(() => {
        if (parties.length === 0 && (defaultListingAgentId || defaultListingAgentName)) {
            patch({
                commissionParties: [blankParty({
                    partyType: 'listing_agent',
                    source: 'internal',
                    agentId: defaultListingAgentId || null,
                    name: defaultListingAgentName || '',
                    sharePct: 100,
                })],
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totalShare = useMemo(() => parties.reduce((sum, p) => sum + (Number(p.sharePct) || 0), 0), [parties]);
    const shareIsValid = Math.abs(totalShare - 100) < 0.01 || parties.length === 0;

    const handleFiles = useCallback(async (fileList) => {
        const file = fileList && fileList[0];
        if (!file || !userId) return;
        setUploading(true);
        try {
            const reader = new FileReader();
            const fileData = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const res = await api.post('/api/vault', {
                userId,
                name: file.name,
                fileData,
                size: file.size,
                type: file.type,
                folder: 'Property Files',
                documentType: 'OTP',
                ...(propertyId && { propertyId }),
                ...(propertyTitle && { propertyTitle }),
            });
            const saved = res.data || {};
            patch({
                otpDecision: 'upload',
                otpFileId: saved._id || saved.id || null,
                otpFileName: saved.name || file.name,
            });
            showNotification('OTP uploaded to vault.', 'success');
        } catch (err) {
            showNotification(err.response?.data?.message || 'Upload failed.', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [userId, patch]);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzoneRef.current) dropzoneRef.current.style.background = '';
        if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzoneRef.current) dropzoneRef.current.style.background = '#f0fdfa';
    }, []);

    const onDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzoneRef.current) dropzoneRef.current.style.background = '';
    }, []);

    const updateParty = (id, patchFields) => {
        patch({ commissionParties: parties.map((p) => p.id === id ? { ...p, ...patchFields } : p) });
    };
    const removeParty = (id) => {
        patch({ commissionParties: parties.filter((p) => p.id !== id) });
    };
    const addParty = () => {
        patch({ commissionParties: [...parties, blankParty({ partyType: 'co_listing_agent', source: 'internal', sharePct: 0 })] });
    };

    return (
        <>
            {/* --- OTP --- */}
            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Offer to Purchase (OTP)</h3>
                <div style={radioRowStyle}>
                    <label style={radioOptionStyle}>
                        <input type="radio" name="otp-decision" checked={otpDecision === 'later'} onChange={() => patch({ otpDecision: 'later', otpFileId: null, otpFileName: null })} style={{ accentColor: '#11575C' }} />
                        Add later
                    </label>
                    <label style={radioOptionStyle}>
                        <input type="radio" name="otp-decision" checked={otpDecision === 'vault'} onChange={() => patch({ otpDecision: 'vault' })} style={{ accentColor: '#11575C' }} />
                        Select from Vault
                    </label>
                    <label style={radioOptionStyle}>
                        <input type="radio" name="otp-decision" checked={otpDecision === 'upload'} onChange={() => patch({ otpDecision: 'upload' })} style={{ accentColor: '#11575C' }} />
                        Upload new
                    </label>
                </div>

                {otpDecision === 'vault' && (
                    <>
                        <select
                            value={v.otpFileId || ''}
                            onChange={(e) => {
                                const f = vaultFiles.find((x) => String(x._id || x.id) === e.target.value);
                                patch({ otpFileId: e.target.value || null, otpFileName: f?.name || null });
                            }}
                            style={{ ...inputStyle, padding: '10px 12px' }}
                        >
                            <option value="">{vaultLoading ? 'Loading vault…' : 'Choose a file from your vault'}</option>
                            {vaultFiles.map((f) => (
                                <option key={f._id || f.id} value={f._id || f.id}>
                                    {f.name}{f.folder ? ` · ${f.folder}` : ''}
                                </option>
                            ))}
                        </select>
                        {vaultError && (
                            <p style={{ ...subtleHint, color: '#b91c1c' }}>{vaultError} Try "Upload new" instead.</p>
                        )}
                        {!vaultLoading && !vaultError && vaultFiles.length === 0 && vaultLoaded && (
                            <p style={subtleHint}>No documents in your vault yet — upload a new file instead.</p>
                        )}
                    </>
                )}

                {otpDecision === 'upload' && (
                    <div
                        ref={dropzoneRef}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed #94a3b8',
                            borderRadius: '10px',
                            padding: '18px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            color: '#475569',
                            fontSize: '13px',
                            transition: 'background 120ms',
                        }}
                    >
                        {uploading ? 'Uploading…' : v.otpFileName ? (
                            <>
                                <strong style={{ color: '#11575C' }}>{v.otpFileName}</strong>
                                <div style={subtleHint}>Click or drop a new file to replace.</div>
                            </>
                        ) : (
                            <>
                                <strong>Drop OTP here</strong> or click to browse
                                <div style={subtleHint}>Saved to your Vault → "Property Files".</div>
                            </>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            style={{ display: 'none' }}
                            accept=".pdf,.doc,.docx,.txt,application/pdf"
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                    </div>
                )}
            </div>

            {/* --- Probability of sale --- */}
            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Probability of Sale</h3>
                <label style={labelStyle}>Likelihood this deal closes (%)</label>
                <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    placeholder="e.g. 75"
                    value={probability}
                    onChange={(e) => {
                        const raw = e.target.value;
                        const n = raw === '' ? null : Math.min(100, Math.max(0, Number(raw)));
                        patch({ probabilityOfSale: n });
                    }}
                    style={inputStyle}
                />
                <p style={subtleHint}>Used in pipeline-weighted forecast on the Sales dashboard.</p>
            </div>

            {/* --- Commission structure --- */}
            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Commission Structure</h3>
                <label style={labelStyle}>Total commission on sale price (%)</label>
                <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.25"
                    placeholder="e.g. 5"
                    value={commissionRate}
                    onChange={(e) => {
                        const raw = e.target.value;
                        const n = raw === '' ? null : Math.max(0, Number(raw));
                        patch({ commissionRatePct: n });
                    }}
                    style={inputStyle}
                />
                <p style={subtleHint}>South African commercial deals typically sit at 5–7% +VAT.</p>

                <div style={{ marginTop: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Parties splitting the commission</span>
                        <button
                            type="button"
                            onClick={addParty}
                            style={{ background: '#11575C', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                            + Add party
                        </button>
                    </div>

                    {parties.length === 0 && (
                        <p style={subtleHint}>Add at least one party (e.g. listing agent at 100%).</p>
                    )}

                    {parties.map((p) => {
                        const meta = PARTY_TYPES.find((t) => t.id === p.partyType) || PARTY_TYPES[0];
                        return (
                            <div key={p.id} style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '10px',
                                marginBottom: '8px',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 90px 28px',
                                gap: '8px',
                                alignItems: 'end',
                            }}>
                                <div>
                                    <label style={labelStyle}>Role</label>
                                    <select
                                        value={p.partyType}
                                        onChange={(e) => {
                                            const nextMeta = PARTY_TYPES.find((t) => t.id === e.target.value);
                                            const nextSource = nextMeta && !nextMeta.allowsInternal ? 'external' : (p.source || 'internal');
                                            updateParty(p.id, { partyType: e.target.value, source: nextSource });
                                        }}
                                        style={{ ...inputStyle, padding: '8px 10px' }}
                                    >
                                        {PARTY_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Who</label>
                                    {meta.allowsInternal && meta.allowsExternal && (
                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                                            <button type="button" onClick={() => updateParty(p.id, { source: 'internal' })} style={pillStyle(p.source === 'internal')}>Internal</button>
                                            <button type="button" onClick={() => updateParty(p.id, { source: 'external' })} style={pillStyle(p.source === 'external')}>External</button>
                                        </div>
                                    )}
                                    {meta.allowsInternal && p.source === 'internal' ? (
                                        <select
                                            value={p.agentId || ''}
                                            onChange={(e) => {
                                                const opt = (agentOptions || []).find((a) => String(a.id) === e.target.value);
                                                updateParty(p.id, { agentId: e.target.value || null, name: opt?.name || '' });
                                            }}
                                            style={{ ...inputStyle, padding: '8px 10px' }}
                                        >
                                            <option value="">Select agent…</option>
                                            {(agentOptions || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                placeholder="Name"
                                                value={p.name || ''}
                                                onChange={(e) => updateParty(p.id, { name: e.target.value })}
                                                style={{ ...inputStyle, padding: '8px 10px', marginBottom: '6px' }}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Firm / Company (optional)"
                                                value={p.firmName || ''}
                                                onChange={(e) => updateParty(p.id, { firmName: e.target.value })}
                                                style={{ ...inputStyle, padding: '8px 10px' }}
                                            />
                                        </>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Share %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={p.sharePct ?? 0}
                                        onChange={(e) => updateParty(p.id, { sharePct: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        style={{ ...inputStyle, padding: '8px 10px' }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeParty(p.id)}
                                    title="Remove party"
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                                >×</button>
                            </div>
                        );
                    })}

                    {parties.length > 0 && (
                        <div style={{
                            marginTop: '6px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: shareIsValid ? '#ecfdf5' : '#fef2f2',
                            color: shareIsValid ? '#047857' : '#b91c1c',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}>
                            <span>Total share</span>
                            <span>{totalShare.toFixed(2)}% {shareIsValid ? '✓' : '— must equal 100%'}</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function pillStyle(active) {
    return {
        flex: 1,
        padding: '6px 8px',
        borderRadius: '6px',
        border: active ? '1px solid #11575C' : '1px solid #e2e8f0',
        background: active ? '#e0f2f1' : 'white',
        color: active ? '#11575C' : '#64748b',
        fontSize: '11px',
        fontWeight: 600,
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    };
}

export default NegotiationFieldsSection;
