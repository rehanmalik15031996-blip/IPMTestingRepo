import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { showNotification } from './NotificationManager';
import GooglePlacesInput from './GooglePlacesInput';
import { sanitizeAgencyBranchDisplay } from '../utils/display';

const stepContainer = { display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch', width: '100%', textAlign: 'left' };
const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' };
const btnPrimary = { width: '100%', padding: '14px', background: '#11575C', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '15px' };
const backBtn = { background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' };
const termsCheckboxLabel = { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', marginBottom: '12px', textAlign: 'left' };
const termsCheckboxInput = { marginTop: '3px', flexShrink: 0 };
const sectionTitle = { fontSize: '14px', fontWeight: '700', color: '#11575C', marginBottom: '10px', marginTop: '16px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' };
const checkboxRow = { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px' };
const checkboxLabel = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' };

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

// Parse Google Place address_components into street, suburb, city, country
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

// Doc 11.2 — Seller-specific
const defaultSellerDetails = () => ({
    propertyAddress: '', propertyStreet: '', propertySuburb: '', propertyCity: '', propertyCountry: '',
    propertyType: '', bedrooms: '', bathrooms: '', erfSizeM2: '', floorSizeM2: '',
    askingPrice: '', reasonForSelling: '', occupationStatus: '', urgency: '',
    outstandingBond: false, outstandingBondAmount: '', mandateType: '', mandateStart: '', mandateExpiry: '', commissionPct: ''
});

// Doc 11.3 — Buyer-specific
const defaultBuyerDetails = () => ({
    buyerType: '', budgetMin: '', budgetMax: '', financeType: '', preApprovalStatus: '',
    preApprovalAmount: '', preApprovalExpiry: '', minBedrooms: '', minBathrooms: '', minFloorSizeM2: '',
    propertyTypePreference: '', locationPreferences: '', mustHaveFeatures: '', urgency: '',
    currentLivingSituation: '', mustSellFirst: false
});

// Doc 11.4 — Investor-specific
const defaultInvestorDetails = () => ({
    investmentStrategy: [], targetYieldPct: '', targetRoiPct: '', holdPeriod: '',
    capitalAvailable: '', dealSizeMin: '', dealSizeMax: '', financeType: '', entityType: '',
    portfolioSize: '', portfolioValue: '', existingAssetClasses: [], complianceStatus: '', communicationFrequency: ''
});

const AddNewLeadModal = ({ isOpen, onClose, onSuccess, userId, user, onOpenAddAgent }) => {
    const [step, setStep] = useState(1);
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
        propertyOfInterest: '',
        propertyId: '',
        assignedAgentId: '',
        buyerDetails: defaultBuyerDetails(),
        sellerDetails: defaultSellerDetails(),
        investorDetails: defaultInvestorDetails()
    });
    const [consentRegister, setConsentRegister] = useState(false);
    const [consentContact, setConsentContact] = useState(false);
    const isAgency = (user?.role || '').toLowerCase() === 'agency';

    useEffect(() => {
        if (!isOpen || !userId) return;
        setStep(1);
        setFormData({
            leadType: 'buyer',
            firstName: '',
            lastName: '',
            email: '',
            mobile: '',
            whatsapp: '',
            preferredContact: '',
            leadSource: '',
            propertyOfInterest: '',
            propertyId: '',
            assignedAgentId: (user?.role || '').toLowerCase() === 'agency' ? userId : '',
            buyerDetails: defaultBuyerDetails(),
            sellerDetails: defaultSellerDetails(),
            investorDetails: defaultInvestorDetails()
        });
        setConsentRegister(false);
        setConsentContact(false);
        const fetchData = async () => {
            try {
                const res = await api.get(`/api/users/${userId}?type=dashboard`);
                const list = res.data?.data || res.data?.agentProperties || res.data?.portfolio || [];
                setProperties(Array.isArray(list) ? list : []);
                const topAgents = res.data?.stats?.topAgents || res.data?.agentStats?.topAgents || [];
                setAgents(Array.isArray(topAgents) ? topAgents : []);
            } catch (e) {
                setProperties([]);
                setAgents([]);
            }
        };
        fetchData();
    }, [isOpen, userId, user?.role]);

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

    const canProceedStep1 = formData.firstName?.trim() && formData.lastName?.trim() && formData.email?.trim() && (formData.mobile || '').trim();
    const canSubmitStep2 = true;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const name = `${(formData.firstName || '').trim()} ${(formData.lastName || '').trim()}`.trim();
            const leadPayload = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                name,
                email: formData.email.trim(),
                mobile: (formData.mobile || '').trim(),
                whatsapp: (formData.whatsapp || '').trim() || undefined,
                preferredContact: (formData.preferredContact || '').trim() || undefined,
                leadSource: (formData.leadSource || '').trim() || undefined,
                propertyOfInterest: (formData.propertyOfInterest || '').trim() || undefined,
                propertyId: (formData.propertyId || '').trim() || undefined,
                propertyTitle: (formData.propertyOfInterest || '').trim() || undefined,
                source: formData.leadSource || 'Inquiry',
                assignedAgentId: (formData.assignedAgentId || (isAgency ? userId : '')).toString().trim() || undefined,
                status: 'new',
                leadType: formData.leadType || 'buyer',
                buyerDetails: formData.leadType === 'buyer' ? formData.buyerDetails : undefined,
                sellerDetails: formData.leadType === 'seller' ? formData.sellerDetails : undefined,
                investorDetails: formData.leadType === 'investor' ? formData.investorDetails : undefined
            };
            const res = await api.post('/api/add-lead', { userId, lead: leadPayload });
            showNotification('Lead added successfully.', 'success');
            const list = res.data && Array.isArray(res.data.crmLeads) ? res.data.crmLeads : null;
            onSuccess && onSuccess(list);
            onClose();
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to add lead.';
            const isAuthError = err.response?.status === 401;
            showNotification(isAuthError ? 'Session expired. Please log in again and try adding the lead.' : msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const b = formData.buyerDetails;
    const s = formData.sellerDetails;

    return (
        <div
            data-tour="add-lead-modal"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
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
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#11575C' }}>Add New Lead</h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }} aria-label="Close">&times;</button>
                </div>

                {step === 1 && (
                    <div style={stepContainer}>
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
                                                next.sellerDetails = {
                                                    ...prev.sellerDetails,
                                                    propertyAddress: formatted || prev.sellerDetails.propertyAddress,
                                                    ...parsed
                                                };
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

                        {formData.leadType === 'investor' && (() => {
                            const inv = formData.investorDetails;
                            return (
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
                            );
                        })()}

                        <div style={sectionTitle}>Assignment</div>
                        <div>
                            <label style={labelStyle}>Property of interest (optional)</label>
                            <select
                                name="propertyId"
                                value={formData.propertyId}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    const p = properties.find((x) => (x.details?._id || x._id) === id);
                                    const title = p ? (p.propertyTitle || p.title || 'Untitled') : '';
                                    setFormData({ ...formData, propertyId: id, propertyOfInterest: title });
                                }}
                                style={inputStyle}
                            >
                                <option value="">— None / Not linked yet —</option>
                                {properties.map((p) => {
                                    const title = p.propertyTitle || p.title || 'Untitled';
                                    const id = p.details?._id || p._id;
                                    return <option key={id || title} value={id || ''}>{title}</option>;
                                })}
                            </select>
                        </div>
                        {isAgency && (
                            <div style={{ marginBottom: '4px' }}>
                                <label style={labelStyle}>Assign to</label>
                                <select
                                    name="assignedAgentId"
                                    value={formData.assignedAgentId || userId}
                                    onChange={(e) => {
                                        if (e.target.value === '__add_agent__') { onOpenAddAgent && onOpenAddAgent(); return; }
                                        setFormData({ ...formData, assignedAgentId: e.target.value });
                                    }}
                                    style={inputStyle}
                                >
                                    <option value={userId}>{user?.name || 'Agency'} (Agency)</option>
                                    {(agents || []).filter((a) => (a._id || a.id)).map((a) => (
                                        <option key={a._id || a.id} value={a._id || a.id}>
                                            {a.name || a.email || 'Agent'}
                                            {sanitizeAgencyBranchDisplay(a.branch) ? ` (${sanitizeAgencyBranchDisplay(a.branch)})` : ''}
                                        </option>
                                    ))}
                                    <option value="__add_agent__">+ Add Agent</option>
                                </select>
                                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', marginBottom: 0 }}>This lead will be assigned to the selected agency or agent.</p>
                            </div>
                        )}
                        <button type="button" style={{ ...btnPrimary, opacity: canProceedStep1 ? 1 : 0.6, cursor: canProceedStep1 ? 'pointer' : 'not-allowed' }} onClick={() => setStep(2)} disabled={!canProceedStep1}>
                            Next: Lead Consent
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div style={stepContainer}>
                        <button type="button" style={backBtn} onClick={() => setStep(1)}>
                            <i className="fas fa-arrow-left"></i> Back
                        </button>
                        <label style={termsCheckboxLabel}>
                            <input type="checkbox" checked={consentRegister} onChange={(e) => setConsentRegister(e.target.checked)} style={termsCheckboxInput} />
                            <span>I hereby acknowledge that I have the consent of the individual to register them as a lead on the IPM platform.</span>
                        </label>
                        <label style={termsCheckboxLabel}>
                            <input type="checkbox" checked={consentContact} onChange={(e) => setConsentContact(e.target.checked)} style={termsCheckboxInput} />
                            <span>I hereby consent that the individual may be contacted by IPM or on behalf of IPM in relation to this lead and the property of interest, in accordance with applicable data protection and marketing laws.</span>
                        </label>
                        <button
                            type="button"
                            style={{ ...btnPrimary, opacity: canSubmitStep2 ? 1 : 0.6, cursor: canSubmitStep2 ? 'pointer' : 'not-allowed' }}
                            onClick={handleSubmit}
                            disabled={loading || !canSubmitStep2}
                        >
                            {loading ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddNewLeadModal;
