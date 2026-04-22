import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { showNotification } from './NotificationManager';
import GooglePlacesInput from './GooglePlacesInput';
import { LEAD_STATUSES } from '../constants/leadStatuses';
import { sanitizeAgencyBranchDisplay } from '../utils/display';

const stepContainer = { display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch', width: '100%', textAlign: 'left' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' };
const btnPrimary = { padding: '12px 24px', background: '#11575C', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '15px' };
const btnSecondary = { padding: '12px 24px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '15px' };
const sectionTitle = { fontSize: '14px', fontWeight: '700', color: '#11575C', marginBottom: '10px', marginTop: '16px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' };
const checkboxRow = { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px' };
const checkboxLabel = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' };
const termsCheckboxInput = { marginTop: '3px', flexShrink: 0 };

const LEAD_SOURCE_OPTIONS = [
    { value: '', label: '— Select —' },
    { value: 'referral', label: 'Referral' },
    { value: 'portal', label: 'Portal' },
    { value: 'cold_call', label: 'Cold call' },
    { value: 'open_day', label: 'Open day' },
    { value: 'social', label: 'Social' },
    { value: 'database', label: 'Database' },
    { value: 'other', label: 'Other' }
];

const PREFERRED_CONTACT_OPTIONS = [
    { value: '', label: '— Select —' },
    { value: 'call', label: 'Call' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Email' }
];

const URGENCY_OPTIONS = [
    { value: '', label: '— Select —' },
    { value: '30_days', label: '30 days' },
    { value: '60_days', label: '60 days' },
    { value: '90_days', label: '90 days' },
    { value: '6_months', label: '6 months' },
    { value: 'flexible', label: 'Flexible' },
    { value: 'browsing', label: 'Browsing' }
];

const parseAddressComponents = (place) => {
    const components = place?.address_components || [];
    const get = (type) => (components.find((c) => c.types.includes(type))?.long_name || '');
    const streetNumber = get('street_number');
    const route = get('route');
    const locality = get('locality');
    const admin2 = get('administrative_area_level_2');
    const admin1 = get('administrative_area_level_1');
    const country = get('country');
    return {
        propertyStreet: [streetNumber, route].filter(Boolean).join(' ') || (place?.formatted_address || '').split(',')[0]?.trim() || '',
        propertySuburb: locality || admin2 || '',
        propertyCity: locality || admin1 || '',
        propertyCountry: country || ''
    };
};

const defaultSellerDetails = () => ({
    propertyAddress: '', propertyStreet: '', propertySuburb: '', propertyCity: '', propertyCountry: '',
    propertyType: '', bedrooms: '', bathrooms: '', erfSizeM2: '', floorSizeM2: '',
    askingPrice: '', reasonForSelling: '', occupationStatus: '', urgency: '',
    outstandingBond: false, outstandingBondAmount: '', mandateType: '', mandateStart: '', mandateExpiry: '', commissionPct: ''
});

const defaultBuyerDetails = () => ({
    buyerType: '', budgetMin: '', budgetMax: '', financeType: '', preApprovalStatus: '',
    preApprovalAmount: '', preApprovalExpiry: '', minBedrooms: '', minBathrooms: '', minFloorSizeM2: '',
    propertyTypePreference: '', locationPreferences: '', mustHaveFeatures: '', urgency: '',
    currentLivingSituation: '', mustSellFirst: false
});

const defaultInvestorDetails = () => ({
    investmentStrategy: [], targetYieldPct: '', targetRoiPct: '', holdPeriod: '',
    capitalAvailable: '', dealSizeMin: '', dealSizeMax: '', financeType: '', entityType: '',
    portfolioSize: '', portfolioValue: '', existingAssetClasses: [], complianceStatus: '', communicationFrequency: ''
});

function parseNameToFirstLast(name) {
    const s = (name || '').trim();
    if (!s) return { firstName: '', lastName: '' };
    const i = s.indexOf(' ');
    if (i <= 0) return { firstName: s, lastName: '' };
    return { firstName: s.slice(0, i).trim(), lastName: s.slice(i).trim() };
}

const EditLeadModal = ({ isOpen, onClose, onSuccess, userId, user, lead, leadIndex, properties: propsProperties, agents: propsAgents, onOpenAddAgent, pipelineStages }) => {
    const statusOptions = Array.isArray(pipelineStages) && pipelineStages.length > 0 ? pipelineStages : LEAD_STATUSES;
    const [loading, setLoading] = useState(false);
    const [properties, setProperties] = useState([]);
    const [agents, setAgents] = useState([]);
    const [formData, setFormData] = useState({
        leadType: 'buyer',
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        whatsapp: '',
        preferredContact: '',
        leadSource: '',
        status: 'new',
        statusChangeReason: '',
        propertyOfInterest: '',
        propertyId: '',
        assignedAgentId: '',
        buyerDetails: defaultBuyerDetails(),
        sellerDetails: defaultSellerDetails(),
        investorDetails: defaultInvestorDetails()
    });
    const isAgency = (user?.role || '').toLowerCase() === 'agency';
    const isAgencyAgent = (user?.role || '').toLowerCase() === 'agency_agent';
    const showTransfer = (isAgency || isAgencyAgent) && agents.length > 0;

    useEffect(() => {
        if (!isOpen || !userId) return;
        if (Array.isArray(propsProperties)) {
            setProperties(propsProperties);
        } else {
            api.get(`/api/users/${userId}?type=dashboard`).then((res) => {
                const list = res.data?.data || res.data?.portfolio || [];
                setProperties(Array.isArray(list) ? list : []);
            }).catch(() => setProperties([]));
        }
    }, [isOpen, userId, propsProperties]);

    useEffect(() => {
        if (!isOpen) return;
        if (Array.isArray(propsAgents) && propsAgents.length > 0) {
            setAgents(propsAgents);
        } else if (isAgencyAgent && user?.agencyId) {
            api.get(`/api/users/${user.agencyId}?type=dashboard`).then((res) => {
                const topAgents = res.data?.stats?.topAgents || res.data?.agentStats?.topAgents || [];
                setAgents(Array.isArray(topAgents) ? topAgents : []);
            }).catch(() => setAgents([]));
        } else {
            setAgents(Array.isArray(propsAgents) ? propsAgents : []);
        }
    }, [isOpen, isAgencyAgent, user?.agencyId, propsAgents]);

    useEffect(() => {
        if (!isOpen || !lead) return;
        const { firstName, lastName } = parseNameToFirstLast(lead.name);
        const firstTitle = lead.linkedProperties?.[0]?.title || lead.propertyOfInterest || '';
        const firstId = lead.linkedProperties?.[0]?.id || '';
        const currentStatus = (lead.status || 'new').toString().toLowerCase();
        const validStatus = statusOptions.some((s) => s.id === currentStatus) ? currentStatus : (statusOptions[0]?.id || 'new');
        const leadType = (lead.leadType === 'seller' || lead.leadType === 'investor') ? lead.leadType : 'buyer';
        setFormData({
            leadType,
            firstName: firstName || (lead.firstName || ''),
            lastName: lastName || (lead.lastName || ''),
            email: lead.email || '',
            mobile: lead.mobile || '',
            whatsapp: lead.whatsapp || '',
            preferredContact: lead.preferredContact || '',
            leadSource: lead.leadSource || lead.source || '',
            status: validStatus,
            statusChangeReason: '',
            propertyOfInterest: firstTitle,
            propertyId: firstId || (firstTitle ? '__current__' : ''),
            assignedAgentId: lead.assignedAgentId != null ? String(lead.assignedAgentId) : (isAgency ? userId : ''),
            buyerDetails: { ...defaultBuyerDetails(), ...(lead.buyerDetails || {}) },
            sellerDetails: { ...defaultSellerDetails(), ...(lead.sellerDetails || {}) },
            investorDetails: { ...defaultInvestorDetails(), ...(lead.investorDetails || {}) }
        });
    }, [isOpen, lead, isAgency, userId]);

    useEffect(() => {
        if (!isOpen || !lead || !properties.length) return;
        const firstId = lead.linkedProperties?.[0]?.id || '';
        const idInList = properties.some((p) => String(p.details?._id || p._id) === String(firstId));
        setFormData((prev) => {
            if (prev.propertyId === firstId && !idInList) return { ...prev, propertyId: '__current__' };
            return prev;
        });
    }, [isOpen, lead, properties]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const setBuyerDetail = (key, value) => {
        setFormData(prev => ({ ...prev, buyerDetails: { ...prev.buyerDetails, [key]: value } }));
    };
    const setSellerDetail = (key, value) => {
        setFormData(prev => ({ ...prev, sellerDetails: { ...prev.sellerDetails, [key]: value } }));
    };
    const setInvestorDetail = (key, value) => {
        setFormData(prev => ({ ...prev, investorDetails: { ...prev.investorDetails, [key]: value } }));
    };
    const toggleInvestorArray = (key, value) => {
        setFormData(prev => {
            const arr = prev.investorDetails[key] || [];
            const next = arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value];
            return { ...prev, investorDetails: { ...prev.investorDetails, [key]: next } };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim() || !(formData.mobile || '').trim()) {
            showNotification('First name, surname, email and phone number are required.', 'error');
            return;
        }
        setLoading(true);
        try {
            const name = `${(formData.firstName || '').trim()} ${(formData.lastName || '').trim()}`.trim();
            const effectivePropertyId = formData.propertyId === '__current__' ? undefined : (formData.propertyId || '').trim() || undefined;
            const effectivePropertyOfInterest = formData.propertyId === '' ? '' : (formData.propertyId === '__current__' ? (formData.propertyOfInterest || '').trim() : (formData.propertyOfInterest || '').trim()) || undefined;
            const leadPayload = {
                name,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                mobile: (formData.mobile || '').trim(),
                whatsapp: (formData.whatsapp || '').trim() || undefined,
                preferredContact: (formData.preferredContact || '').trim() || undefined,
                leadSource: (formData.leadSource || '').trim() || undefined,
                leadType: formData.leadType || 'buyer',
                buyerDetails: formData.leadType === 'buyer' ? formData.buyerDetails : undefined,
                sellerDetails: formData.leadType === 'seller' ? formData.sellerDetails : undefined,
                investorDetails: formData.leadType === 'investor' ? formData.investorDetails : undefined,
                status: formData.status || 'new',
                propertyOfInterest: formData.propertyId === '' ? '' : effectivePropertyOfInterest,
                propertyId: formData.propertyId === '' ? '' : effectivePropertyId,
                propertyTitle: effectivePropertyOfInterest,
                assignedAgentId: (formData.assignedAgentId || (isAgency ? userId : '')).toString().trim() || undefined
            };
            if ((formData.status === 'lost' || formData.status === 'on_hold') && (formData.statusChangeReason || '').trim()) {
                leadPayload.statusChangeReason = formData.statusChangeReason.trim();
            }
            const payload = {
                userId,
                index: (lead?.id || lead?._id) ? undefined : leadIndex,
                leadId: lead?.id || lead?._id || undefined,
                lead: leadPayload
            };
            const res = await api.put('/api/update-lead', payload);
            showNotification('Lead updated successfully.', 'success');
            onSuccess && onSuccess(res.data?.lead, res.data?.crmLeads);
            onClose();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to update lead.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const b = formData.buyerDetails;
    const s = formData.sellerDetails;
    const inv = formData.investorDetails;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1200,
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: '16px',
                    maxWidth: '520px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    padding: '28px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#11575C' }}>Edit lead</h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }} aria-label="Close">&times;</button>
                </div>
                <form onSubmit={handleSubmit} style={stepContainer}>
                    <div>
                        <label style={labelStyle}>Lead type</label>
                        <select name="leadType" value={formData.leadType} onChange={handleChange} style={inputStyle}>
                            <option value="buyer">Buyer</option>
                            <option value="seller">Seller</option>
                            <option value="investor">Investor</option>
                        </select>
                    </div>
                    <div style={sectionTitle}>Contact (required)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={labelStyle}>First name *</label>
                            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First name" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Surname *</label>
                            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last name" style={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Email *</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@example.com" style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Phone number *</label>
                        <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="+1 234 567 8900" style={inputStyle} />
                    </div>
                    <div style={sectionTitle}>Optional contact & source</div>
                    <div>
                        <label style={labelStyle}>WhatsApp</label>
                        <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="WhatsApp number" style={inputStyle} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={labelStyle}>Preferred contact</label>
                            <select name="preferredContact" value={formData.preferredContact} onChange={handleChange} style={inputStyle}>
                                {PREFERRED_CONTACT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Lead source</label>
                            <select name="leadSource" value={formData.leadSource} onChange={handleChange} style={inputStyle}>
                                {LEAD_SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {formData.leadType === 'seller' && (
                        <>
                            <div style={sectionTitle}>Seller / listing details (optional)</div>
                            <div>
                                <label style={labelStyle}>Property address</label>
                                <GooglePlacesInput
                                    value={s.propertyAddress}
                                    onChange={(e) => setSellerDetail('propertyAddress', e.target.value)}
                                    onPlaceSelected={(formatted, place) => {
                                        const parsed = place ? parseAddressComponents(place) : {};
                                        setFormData((prev) => {
                                            const next = { ...prev };
                                            next.sellerDetails = { ...prev.sellerDetails, propertyAddress: formatted || prev.sellerDetails.propertyAddress, ...parsed };
                                            return next;
                                        });
                                    }}
                                    placeholder="Start typing street, suburb, city or country..."
                                    inputStyle={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Property type</label>
                                <select value={s.propertyType} onChange={(e) => setSellerDetail('propertyType', e.target.value)} style={inputStyle}>
                                    <option value="">— Select —</option>
                                    <option value="house">House</option>
                                    <option value="apartment">Apartment</option>
                                    <option value="commercial">Commercial</option>
                                    <option value="land">Land</option>
                                    <option value="development">Development</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Bedrooms</label>
                                    <input type="text" value={s.bedrooms} onChange={(e) => setSellerDetail('bedrooms', e.target.value)} placeholder="—" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Bathrooms</label>
                                    <input type="text" value={s.bathrooms} onChange={(e) => setSellerDetail('bathrooms', e.target.value)} placeholder="—" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Floor size (m²)</label>
                                    <input type="text" value={s.floorSizeM2} onChange={(e) => setSellerDetail('floorSizeM2', e.target.value)} placeholder="—" style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Erf / lot size (m²)</label>
                                    <input type="text" value={s.erfSizeM2} onChange={(e) => setSellerDetail('erfSizeM2', e.target.value)} placeholder="—" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Asking price</label>
                                    <input type="text" value={s.askingPrice} onChange={(e) => setSellerDetail('askingPrice', e.target.value)} placeholder="Currency amount" style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Reason for selling</label>
                                    <select value={s.reasonForSelling} onChange={(e) => setSellerDetail('reasonForSelling', e.target.value)} style={inputStyle}>
                                        <option value="">— Select —</option>
                                        <option value="relocation">Relocation</option>
                                        <option value="downsizing">Downsizing</option>
                                        <option value="upsizing">Upsizing</option>
                                        <option value="financial">Financial</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Occupation status</label>
                                    <select value={s.occupationStatus} onChange={(e) => setSellerDetail('occupationStatus', e.target.value)} style={inputStyle}>
                                        <option value="">— Select —</option>
                                        <option value="owner-occupied">Owner-occupied</option>
                                        <option value="tenanted">Tenanted</option>
                                        <option value="vacant">Vacant</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Urgency</label>
                                    <select value={s.urgency} onChange={(e) => setSellerDetail('urgency', e.target.value)} style={inputStyle}>
                                        {URGENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Mandate type</label>
                                    <select value={s.mandateType} onChange={(e) => setSellerDetail('mandateType', e.target.value)} style={inputStyle}>
                                        <option value="">— Select —</option>
                                        <option value="sole">Sole</option>
                                        <option value="open">Open</option>
                                        <option value="not_discussed">Not discussed</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Mandate start</label>
                                    <input type="date" value={s.mandateStart} onChange={(e) => setSellerDetail('mandateStart', e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Mandate expiry</label>
                                    <input type="date" value={s.mandateExpiry} onChange={(e) => setSellerDetail('mandateExpiry', e.target.value)} style={inputStyle} />
                                </div>
                            </div>
                            <div style={checkboxRow}>
                                <label style={checkboxLabel}>
                                    <input type="checkbox" checked={!!s.outstandingBond} onChange={(e) => setSellerDetail('outstandingBond', e.target.checked)} style={termsCheckboxInput} />
                                    <span>Outstanding bond</span>
                                </label>
                                {s.outstandingBond && (
                                    <input type="text" value={s.outstandingBondAmount} onChange={(e) => setSellerDetail('outstandingBondAmount', e.target.value)} placeholder="Amount" style={{ ...inputStyle, width: '120px' }} />
                                )}
                            </div>
                            <div>
                                <label style={labelStyle}>Commission %</label>
                                <input type="text" value={s.commissionPct} onChange={(e) => setSellerDetail('commissionPct', e.target.value)} placeholder="e.g. 5" style={inputStyle} />
                            </div>
                        </>
                    )}

                    {formData.leadType === 'buyer' && (
                        <>
                            <div style={sectionTitle}>Buyer details (optional)</div>
                            <div>
                                <label style={labelStyle}>Buyer type</label>
                                <select value={b.buyerType} onChange={(e) => setBuyerDetail('buyerType', e.target.value)} style={inputStyle}>
                                    <option value="">— Select —</option>
                                    <option value="first_time">First-time buyer</option>
                                    <option value="upsizing">Upsizing</option>
                                    <option value="downsizing">Downsizing</option>
                                    <option value="relocation">Relocation</option>
                                    <option value="cash">Cash buyer</option>
                                    <option value="second_home">Second home</option>
                                    <option value="investment">Investment</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Budget min</label>
                                    <input type="text" value={b.budgetMin} onChange={(e) => setBuyerDetail('budgetMin', e.target.value)} placeholder="Currency" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Budget max</label>
                                    <input type="text" value={b.budgetMax} onChange={(e) => setBuyerDetail('budgetMax', e.target.value)} placeholder="Currency" style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Finance type</label>
                                    <select value={b.financeType} onChange={(e) => setBuyerDetail('financeType', e.target.value)} style={inputStyle}>
                                        <option value="">— Select —</option>
                                        <option value="cash">Cash</option>
                                        <option value="bond">Bond</option>
                                        <option value="bridging">Bridging</option>
                                        <option value="combination">Combination</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Pre-approval status</label>
                                    <select value={b.preApprovalStatus} onChange={(e) => setBuyerDetail('preApprovalStatus', e.target.value)} style={inputStyle}>
                                        <option value="">— Select —</option>
                                        <option value="yes">Yes</option>
                                        <option value="in_process">In process</option>
                                        <option value="not_yet">Not yet</option>
                                    </select>
                                </div>
                            </div>
                            {(b.preApprovalStatus === 'yes' || b.preApprovalStatus === 'in_process') && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Pre-approval amount</label>
                                        <input type="text" value={b.preApprovalAmount} onChange={(e) => setBuyerDetail('preApprovalAmount', e.target.value)} placeholder="Currency" style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Pre-approval expiry</label>
                                        <input type="date" value={b.preApprovalExpiry} onChange={(e) => setBuyerDetail('preApprovalExpiry', e.target.value)} style={inputStyle} />
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Min bedrooms</label>
                                    <input type="text" value={b.minBedrooms} onChange={(e) => setBuyerDetail('minBedrooms', e.target.value)} placeholder="—" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Min bathrooms</label>
                                    <input type="text" value={b.minBathrooms} onChange={(e) => setBuyerDetail('minBathrooms', e.target.value)} placeholder="—" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Min floor size (m²)</label>
                                    <input type="text" value={b.minFloorSizeM2} onChange={(e) => setBuyerDetail('minFloorSizeM2', e.target.value)} placeholder="—" style={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Property type preference</label>
                                <input type="text" value={b.propertyTypePreference} onChange={(e) => setBuyerDetail('propertyTypePreference', e.target.value)} placeholder="e.g. house, apartment" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Location preferences</label>
                                <input type="text" value={b.locationPreferences} onChange={(e) => setBuyerDetail('locationPreferences', e.target.value)} placeholder="Suburbs, cities" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Must-have features</label>
                                <input type="text" value={b.mustHaveFeatures} onChange={(e) => setBuyerDetail('mustHaveFeatures', e.target.value)} placeholder="Optional" style={inputStyle} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Urgency</label>
                                    <select value={b.urgency} onChange={(e) => setBuyerDetail('urgency', e.target.value)} style={inputStyle}>
                                        {URGENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Current living situation</label>
                                    <select value={b.currentLivingSituation} onChange={(e) => setBuyerDetail('currentLivingSituation', e.target.value)} style={inputStyle}>
                                        <option value="">— Select —</option>
                                        <option value="renting">Renting</option>
                                        <option value="own_property">Own property</option>
                                        <option value="with_family">With family</option>
                                    </select>
                                </div>
                            </div>
                            <div style={checkboxRow}>
                                <label style={checkboxLabel}>
                                    <input type="checkbox" checked={!!b.mustSellFirst} onChange={(e) => setBuyerDetail('mustSellFirst', e.target.checked)} style={termsCheckboxInput} />
                                    <span>Must sell current property first</span>
                                </label>
                            </div>
                        </>
                    )}

                    {formData.leadType === 'investor' && (
                        <>
                            <div style={sectionTitle}>Investor details (optional)</div>
                            <div>
                                <label style={labelStyle}>Investment strategy</label>
                                <div style={checkboxRow}>
                                    {['buy_to_let', 'fix_flip', 'off_plan', 'commercial', 'mixed', 'development', 'land'].map((val) => (
                                        <label key={val} style={checkboxLabel}>
                                            <input type="checkbox" checked={(inv.investmentStrategy || []).includes(val)} onChange={() => toggleInvestorArray('investmentStrategy', val)} style={termsCheckboxInput} />
                                            <span>{val.replace(/_/g, ' ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Target yield %</label>
                                    <input type="text" value={inv.targetYieldPct} onChange={(e) => setInvestorDetail('targetYieldPct', e.target.value)} placeholder="—" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Target ROI %</label>
                                    <input type="text" value={inv.targetRoiPct} onChange={(e) => setInvestorDetail('targetRoiPct', e.target.value)} placeholder="—" style={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Hold period</label>
                                <select value={inv.holdPeriod} onChange={(e) => setInvestorDetail('holdPeriod', e.target.value)} style={inputStyle}>
                                    <option value="">— Select —</option>
                                    <option value="short">Short</option>
                                    <option value="medium">Medium</option>
                                    <option value="long">Long</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Capital available</label>
                                    <input type="text" value={inv.capitalAvailable} onChange={(e) => setInvestorDetail('capitalAvailable', e.target.value)} placeholder="Currency" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Deal size min – max</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="text" value={inv.dealSizeMin} onChange={(e) => setInvestorDetail('dealSizeMin', e.target.value)} placeholder="Min" style={{ ...inputStyle, flex: 1 }} />
                                        <input type="text" value={inv.dealSizeMax} onChange={(e) => setInvestorDetail('dealSizeMax', e.target.value)} placeholder="Max" style={{ ...inputStyle, flex: 1 }} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Finance type</label>
                                    <select value={inv.financeType} onChange={(e) => setInvestorDetail('financeType', e.target.value)} style={inputStyle}>
                                        <option value="">— Select —</option>
                                        <option value="cash">Cash</option>
                                        <option value="leveraged">Leveraged</option>
                                        <option value="fund">Fund</option>
                                        <option value="jv">JV</option>
                                        <option value="combination">Combination</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Entity type</label>
                                    <select value={inv.entityType} onChange={(e) => setInvestorDetail('entityType', e.target.value)} style={inputStyle}>
                                        <option value="">— Select —</option>
                                        <option value="personal">Personal</option>
                                        <option value="pty">Pty</option>
                                        <option value="trust">Trust</option>
                                        <option value="fund">Fund</option>
                                        <option value="foreign">Foreign</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Portfolio size (# properties)</label>
                                    <input type="text" value={inv.portfolioSize} onChange={(e) => setInvestorDetail('portfolioSize', e.target.value)} placeholder="—" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Portfolio value</label>
                                    <input type="text" value={inv.portfolioValue} onChange={(e) => setInvestorDetail('portfolioValue', e.target.value)} placeholder="Currency" style={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Existing asset classes</label>
                                <div style={checkboxRow}>
                                    {['residential', 'commercial', 'land', 'mixed'].map((val) => (
                                        <label key={val} style={checkboxLabel}>
                                            <input type="checkbox" checked={(inv.existingAssetClasses || []).includes(val)} onChange={() => toggleInvestorArray('existingAssetClasses', val)} style={termsCheckboxInput} />
                                            <span>{val}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Compliance status</label>
                                    <select value={inv.complianceStatus} onChange={(e) => setInvestorDetail('complianceStatus', e.target.value)} style={inputStyle}>
                                        <option value="">— Select —</option>
                                        <option value="not_started">Not started</option>
                                        <option value="in_progress">In progress</option>
                                        <option value="verified">Verified</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Communication frequency</label>
                                    <select value={inv.communicationFrequency} onChange={(e) => setInvestorDetail('communicationFrequency', e.target.value)} style={inputStyle}>
                                        <option value="">— Select —</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <div style={sectionTitle}>Pipeline & assignment</div>
                    <div>
                        <label style={labelStyle}>Pipeline stage</label>
                        <select name="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                            {statusOptions.map((s) => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                    </div>
                    {(formData.status === 'lost' || formData.status === 'on_hold') && (
                        <div>
                            <label style={labelStyle}>Reason for {formData.status === 'lost' ? 'Lost' : 'On hold'}</label>
                            <textarea
                                name="statusChangeReason"
                                value={formData.statusChangeReason}
                                onChange={(e) => setFormData({ ...formData, statusChangeReason: e.target.value })}
                                placeholder="e.g. Budget no longer available..."
                                rows={2}
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>
                    )}
                    <div>
                        <label style={labelStyle}>Property of interest (optional)</label>
                        <select
                            name="propertyId"
                            value={(() => {
                                const id = formData.propertyId;
                                if (id === '' || id === '__current__') return id;
                                const inList = properties.some((p) => String(p.details?._id || p._id) === String(id));
                                return inList ? id : (formData.propertyOfInterest ? '__current__' : '');
                            })()}
                            onChange={(e) => {
                                const id = e.target.value;
                                if (id === '') {
                                    setFormData({ ...formData, propertyId: '', propertyOfInterest: '' });
                                    return;
                                }
                                if (id === '__current__') {
                                    setFormData({ ...formData, propertyId: '__current__' });
                                    return;
                                }
                                const p = properties.find((x) => String(x.details?._id || x._id) === String(id));
                                setFormData({ ...formData, propertyId: id, propertyOfInterest: p ? (p.propertyTitle || p.title || 'Untitled') : '' });
                            }}
                            style={inputStyle}
                        >
                            <option value="">— None —</option>
                            {(lead?.linkedProperties?.[0]?.title || lead?.propertyOfInterest || formData.propertyOfInterest) && (
                                <option value="__current__">Current: {(lead?.linkedProperties?.[0]?.title || lead?.propertyOfInterest || formData.propertyOfInterest || '').slice(0, 50)}{((lead?.linkedProperties?.[0]?.title || lead?.propertyOfInterest || formData.propertyOfInterest || '').length > 50) ? '…' : ''}</option>
                            )}
                            {properties.map((p) => {
                                const title = p.propertyTitle || p.title || 'Untitled';
                                const id = p.details?._id || p._id;
                                return <option key={id || title} value={id || ''}>{title}</option>;
                            })}
                        </select>
                    </div>
                    {showTransfer && (
                        <div>
                            <label style={labelStyle}>Assign to agent</label>
                            <select
                                name="assignedAgentId"
                                value={formData.assignedAgentId}
                                onChange={(e) => {
                                    if (e.target.value === '__add_agent__') { onOpenAddAgent && onOpenAddAgent(); return; }
                                    setFormData({ ...formData, assignedAgentId: e.target.value });
                                }}
                                style={inputStyle}
                            >
                                <option value="">— Unassigned —</option>
                                <option value={userId}>{user?.name || 'Agency'} (Agency)</option>
                                {agents.filter((a) => (a._id || a.id)).map((a) => (
                                    <option key={a._id || a.id} value={a._id || a.id}>
                                        {a.name || a.email || 'Agent'}
                                        {sanitizeAgencyBranchDisplay(a.branch) ? ` (${sanitizeAgencyBranchDisplay(a.branch)})` : ''}
                                    </option>
                                ))}
                                <option value="__add_agent__">+ Add Agent</option>
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button type="button" style={btnSecondary} onClick={onClose}>Cancel</button>
                        <button type="submit" style={btnPrimary} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditLeadModal;
