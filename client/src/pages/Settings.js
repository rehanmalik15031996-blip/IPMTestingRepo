import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import SettingsIntegrations from '../components/SettingsIntegrations';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../config/api';
import { usePreferences } from '../context/PreferencesContext';
import { currencyOptions, unitOptions } from '../i18n/translations';

const SETTINGS_TABS = ['profile', 'security', 'notifications', 'integrations', 'subscription'];

/** Merge API user with stored user so token and agencyId are not lost (API does not return token). */
const mergeUserIntoStorage = (apiUser) => {
    const existing = JSON.parse(localStorage.getItem('user') || '{}');
    const merged = { ...existing, ...apiUser };
    if (existing.token != null) merged.token = existing.token;
    if (merged.agencyId == null && existing.agencyId != null) merged.agencyId = existing.agencyId;
    localStorage.setItem('user', JSON.stringify(merged));
    return merged;
};

const Settings = () => {
    const [searchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState(() => {
        const t = tabFromUrl && tabFromUrl.toLowerCase();
        return t && SETTINGS_TABS.includes(t) ? t : 'profile';
    });
    const fileInputRef = useRef(null);
    useEffect(() => {
        const t = tabFromUrl && tabFromUrl.toLowerCase();
        if (t && SETTINGS_TABS.includes(t)) {
            if (t === 'integrations') {
                try {
                    const r = String(JSON.parse(localStorage.getItem('user') || '{}').role || '').toLowerCase();
                    if (r !== 'agency') {
                        setActiveTab('profile');
                        return;
                    }
                } catch (e) {
                    setActiveTab('profile');
                    return;
                }
            }
            setActiveTab(t);
        }
    }, [tabFromUrl]);

    const { priceDisplayMode, setPriceDisplayMode, currency, setCurrency, units, setUnits } = usePreferences();

    const isAgencyUser = (() => {
        try {
            return String(JSON.parse(localStorage.getItem('user') || '{}').role || '').toLowerCase() === 'agency';
        } catch (e) {
            return false;
        }
    })();

    const settingsTabLabels = isAgencyUser
        ? ['Profile', 'Security', 'Notifications', 'Integrations', 'Subscription']
        : ['Profile', 'Security', 'Notifications', 'Subscription'];
    
    // Default / Initial State
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        location: '',
        bio: '',
        photo: null,
        monthlyRevenueTarget: '',
        notifyOffMarket: false,
        notifyShareWithAgencies: false,
        realEstateLicenceDocument: null,
        realEstateLicenceFileName: ''
    });

    const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
    const [subscriptionUser, setSubscriptionUser] = useState(null); // latest user for Subscription tab

    // Load initial data
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) {
            setSubscriptionUser(storedUser);
            setProfileData(prev => ({
                ...prev,
                ...storedUser,
                monthlyRevenueTarget: storedUser.monthlyRevenueTarget != null ? String(storedUser.monthlyRevenueTarget) : '',
                notifyOffMarket: !!storedUser.notifyOffMarket,
                notifyShareWithAgencies: !!storedUser.notifyShareWithAgencies,
                realEstateLicenceDocument: storedUser.realEstateLicenceDocument || null,
                realEstateLicenceFileName: storedUser.realEstateLicenceFileName || ''
            }));
        }
    }, []);

    // When Subscription tab is active, refetch user and auto-sync with Stripe if needed (no manual "link" step)
    useEffect(() => {
        if (activeTab !== 'subscription') return;
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (!storedUser?._id) return;
        api.get(`/api/users/${storedUser._id}`)
            .then((res) => {
                if (!res.data?.user) return;
                let u = res.data.user;
                if (!u.stripeCustomerId && u.email) {
                    return api.post('/api/stripe-link-customer', { userId: u._id }).then((syncRes) => {
                        if (syncRes.data?.user) {
                            u = mergeUserIntoStorage(syncRes.data.user);
                        }
                        setSubscriptionUser(u);
                    }).catch(() => {
                        setSubscriptionUser(u);
                    });
                }
                mergeUserIntoStorage(u);
                setSubscriptionUser(u);
            })
            .catch(() => {});
    }, [activeTab]);

    // --- HANDLERS ---
    const handlePhotoClick = () => fileInputRef.current.click();

    // Compress image to reduce payload size (avoids API body limit / "error updating")
    const compressPhoto = (dataUrl, maxWidth = 600, quality = 0.85) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                try {
                    resolve(canvas.toDataURL('image/jpeg', quality));
                } catch (_) {
                    resolve(dataUrl);
                }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) return alert("Image too large (Max 10MB)");
            const reader = new FileReader();
            reader.onloadend = async () => {
                const dataUrl = reader.result;
                const compressed = await compressPhoto(dataUrl);
                setProfileData(prev => ({ ...prev, photo: compressed }));
            };
            reader.readAsDataURL(file);
        }
    };

    // ✅ UPDATED: SAVE PROFILE TO DATABASE
    const handleProfileSave = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));

        try {
            // 1. Send Update to Backend
            const res = await api.put(`/api/users/${user._id}`, {
                name: profileData.name,
                email: profileData.email,
                phone: profileData.phone,
                location: profileData.location,
                bio: profileData.bio,
                photo: profileData.photo,
                monthlyRevenueTarget: profileData.monthlyRevenueTarget === '' ? null : (parseFloat(profileData.monthlyRevenueTarget) || null),
                notifyOffMarket: profileData.notifyOffMarket,
                notifyShareWithAgencies: profileData.notifyShareWithAgencies,
                ...(profileData.realEstateLicenceDocument && { realEstateLicenceDocument: profileData.realEstateLicenceDocument, realEstateLicenceFileName: profileData.realEstateLicenceFileName })
            });

            if (res.data.success) {
                mergeUserIntoStorage(res.data.user);
                alert("Profile Saved to Database!");
                window.location.reload();
            }

        } catch (err) {
            console.error("Error updating profile:", err);
            const msg = err.response?.data?.message || err.message || "Failed to update profile. Please try again.";
            alert(msg);
        }
    };

    // ✅ PASSWORD SAVE (Keep as is)
    const handlePasswordSave = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));

        if (passData.new !== passData.confirm) return alert("New passwords do not match!");
        if (passData.new.length < 6) return alert("Password too short.");

        try {
            const res = await api.put(`/api/users/${user._id}`, {
                action: 'change-password',
                oldPassword: passData.current,
                newPassword: passData.new
            });
            if (res.data.success) {
                alert("Password Changed Successfully!");
                setPassData({ current: '', new: '', confirm: '' });
            }
        } catch (err) {
            alert(err.response?.data?.message || "Error changing password");
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: '280px', padding: '40px', backgroundColor: '#f8f9fa', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <h1 style={{ color: '#1f3a3d', fontSize: '32px', fontWeight: '800', marginBottom: '10px', flexShrink: 0 }}>Settings</h1>
                
                {/* TABS */}
                <div style={{ display: 'flex', gap: isMobile ? '8px' : '20px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', marginBottom: '30px', flexShrink: 0 }}>
                    {settingsTabLabels.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{ padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === tab.toLowerCase() ? '3px solid #11575C' : 'transparent', fontWeight: activeTab === tab.toLowerCase() ? 'bold' : 'normal', color: activeTab === tab.toLowerCase() ? '#11575C' : '#64748b' }}>{tab}</button>
                    ))}
                </div>

                <div style={{ background: 'white', borderRadius: '16px', padding: '40px', maxWidth: activeTab === 'integrations' ? '960px' : '800px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileSave}>
                            {/* Photo Section */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: profileData.photo ? `url(${profileData.photo}) center/cover` : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', color: '#cbd5e1', border: '1px solid #e2e8f0' }}>
                                    {!profileData.photo && profileData.name?.charAt(0).toUpperCase()}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
                                <button type="button" onClick={handlePhotoClick} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Change Photo</button>
                            </div>

                            {/* Inputs */}
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div><label style={labelStyle}>Full Name</label><input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Email Address</label><input type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Phone</label><input type="text" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} style={inputStyle} /></div>
                                <div><label style={labelStyle}>Location</label><input type="text" value={profileData.location} onChange={e => setProfileData({...profileData, location: e.target.value})} style={inputStyle} /></div>
                            </div>
                            <div style={{ marginBottom: '30px' }}><label style={labelStyle}>Bio</label><textarea rows="3" value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} style={inputStyle}></textarea></div>
                            {(() => {
                                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                                const role = (storedUser.role || '').toLowerCase();
                                const isAgent = role === 'independent_agent' || role === 'agency_agent' || role === 'agency';
                                if (!isAgent) return null;
                                return (
                                    <>
                                        <div style={{ marginBottom: '20px' }}>
                                            <label style={labelStyle}>Monthly sales target (value)</label>
                                            <input type="number" min="0" step="1" value={profileData.monthlyRevenueTarget} onChange={e => setProfileData({ ...profileData, monthlyRevenueTarget: e.target.value })} style={inputStyle} placeholder="e.g. 50000" />
                                            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>Used for the &quot;% of monthly sales target&quot; on your dashboard.</span>
                                        </div>
                                        {(role === 'independent_agent' || role === 'agency_agent') && (
                                            <div style={{ marginBottom: '20px' }}>
                                                <label style={labelStyle}>Real Estate Licence Document</label>
                                                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Required for listing properties. Upload a PDF or image of your licence.</p>
                                                <input
                                                    type="file"
                                                    accept=".pdf,image/*"
                                                    style={inputStyle}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const reader = new FileReader();
                                                        reader.onload = () => setProfileData(prev => ({ ...prev, realEstateLicenceDocument: reader.result, realEstateLicenceFileName: file.name }));
                                                        reader.readAsDataURL(file);
                                                    }}
                                                />
                                                {(profileData.realEstateLicenceDocument || profileData.realEstateLicenceFileName) && (
                                                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#166534' }}>
                                                        <i className="fas fa-check-circle" style={{ marginRight: '6px' }} /> {profileData.realEstateLicenceFileName || 'Licence document uploaded'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                            <div style={{ marginBottom: '24px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 16px', color: '#1f3a3d', fontSize: '15px', fontWeight: 700 }}>Currency & Units</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>Display Currency</label>
                                        <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                            {currencyOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>All values across dashboards will display in this currency.</span>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Area Units</label>
                                        <select value={units} onChange={e => setUnits(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                                            {unitOptions.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                        </select>
                                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>Property sizes will display in this unit.</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>Price display (tax/fees transparency)</label>
                                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>In some countries (e.g. Dubai) the price is the price. In others (e.g. Spain, US) taxes and closing costs (e.g. 10–15%) apply. Choose how you want prices shown.</p>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="radio" name="priceDisplay" checked={priceDisplayMode === 'gross'} onChange={() => setPriceDisplayMode('gross')} style={{ accentColor: '#11575C' }} />
                                        <span>Gross Price (tax/fees included)</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="radio" name="priceDisplay" checked={priceDisplayMode === 'net'} onChange={() => setPriceDisplayMode('net')} style={{ accentColor: '#11575C' }} />
                                        <span>Net of Taxes (tax/fees not included)</span>
                                    </label>
                                </div>
                            </div>
                            <button type="submit" style={saveBtnStyle}>Save Changes</button>
                        </form>
                    )}

                    {activeTab === 'security' && (
                        <form onSubmit={handlePasswordSave}>
                            <h3 style={{marginTop:0}}>Change Password</h3>
                            <input type="password" placeholder="Current Password" value={passData.current} onChange={e => setPassData({...passData, current: e.target.value})} style={{...inputStyle, marginBottom:'15px'}} />
                            <input type="password" placeholder="New Password" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} style={{...inputStyle, marginBottom:'15px'}} />
                            <input type="password" placeholder="Confirm New Password" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} style={{...inputStyle, marginBottom:'15px'}} />
                            <button type="submit" style={saveBtnStyle}>Update Password</button>
                        </form>
                    )}
                    
                    {activeTab === 'subscription' && (() => {
                        const user = subscriptionUser || JSON.parse(localStorage.getItem('user') || '{}');
                        const plan = user.subscriptionPlan || '—';
                        const planOption = user.subscriptionPlanOption;
                        const rawStatus = user.subscriptionStatus || '—';
                        const status = typeof rawStatus === 'string' ? rawStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : rawStatus;
                        const hasStripeSubscription = !!user.stripeSubscriptionId;
                        const isPendingPayment = (rawStatus || '').toLowerCase() === 'pending_payment' && !user.stripeCustomerId;
                        const role = (user.role || '').toLowerCase();
                        const isBuyerSellerInvestor = ['buyer', 'seller', 'investor'].includes(role);
                        const isAgency = role === 'agency';
                        const isAgent = ['independent_agent', 'agency_agent', 'agent'].includes(role);

                        const BUYER_PLANS = [
                            { id: 'Basic', title: 'Basic', price: '€19/mo' },
                            { id: 'Premium', title: 'Premium', price: '€139/mo' },
                            { id: 'Custom', title: 'Custom', price: 'Contact us', contactOnly: true }
                        ];
                        const AGENCY_PLANS = [
                            { id: 'Premium', title: 'Premium', planOption: '10-100', price: '€980/mo' },
                            { id: 'Premium', title: 'Premium', planOption: '15-150', price: '€1,470/mo' },
                            { id: 'Premium', title: 'Premium', planOption: '20-200', price: '€1,960/mo' },
                            { id: 'Premium', title: 'Premium', planOption: '25-250', price: '€2,450/mo' },
                            { id: 'Custom', title: 'Custom', price: 'Contact us', contactOnly: true }
                        ];
                        const AGENT_PLANS = [
                            { id: 'Basic', title: 'Basic', price: '€59/mo' },
                            { id: 'Custom', title: 'Custom', price: 'Contact us', contactOnly: true }
                        ];

                        const plansForRole = isBuyerSellerInvestor ? BUYER_PLANS : isAgency ? AGENCY_PLANS : isAgent ? AGENT_PLANS : BUYER_PLANS;

                        const isCurrentPlan = (p) => p.id === plan && (p.planOption == null ? !planOption : p.planOption === planOption);
                        const isCanceled = (rawStatus || '').toLowerCase() === 'canceled';
                        const canCompleteCheckout = isPendingPayment && user._id && plan && plan !== 'Custom' && plan !== '—';

                        const handleSwitchPlan = async (p) => {
                            if (p.contactOnly) {
                                window.location.href = 'mailto:contact@ipm.com?subject=Subscription change';
                                return;
                            }
                            if (isCurrentPlan(p)) return;
                            try {
                                const body = { userId: user._id, plan: p.id };
                                if (p.planOption) body.planOption = p.planOption;
                                const res = await api.post('/api/stripe-change-plan', body);
                                if (res.data?.user) {
                                    setSubscriptionUser(mergeUserIntoStorage(res.data.user));
                                }
                                alert(res.data?.message || 'Plan updated.');
                            } catch (err) {
                                alert(err.response?.data?.message || 'Could not change plan.');
                            }
                        };

                        const handleCancel = () => {
                            if (!window.confirm('Cancel your subscription? You will keep access until the end of the current billing period.')) return;
                            api.post('/api/stripe-cancel-subscription', { userId: user._id })
                                .then((res) => {
                                    if (res.data?.user) {
                                        setSubscriptionUser(mergeUserIntoStorage(res.data.user));
                                    }
                                    alert(res.data?.message || 'Subscription canceled.');
                                })
                                .catch((err) => alert(err.response?.data?.message || 'Could not cancel.'));
                        };

                        return (
                        <div>
                            <h3 style={{ marginTop: 0, color: '#1f3a3d' }}>Subscription</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Current plan</div>
                                    <div style={{ fontWeight: '600', color: '#334155' }}>{plan}{planOption ? ` (${planOption})` : ''}</div>
                                </div>
                                <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Status</div>
                                    <div style={{ fontWeight: '600', color: '#334155' }}>{status}</div>
                                </div>
                            </div>

                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                                {isBuyerSellerInvestor && 'Plans for buyers, sellers & investors.'}
                                {isAgency && 'Plans for agencies.'}
                                {isAgent && 'Plans for agents.'}
                                {!isBuyerSellerInvestor && !isAgency && !isAgent && 'Available plans.'}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                {plansForRole.map((p) => (
                                    <div key={p.id + (p.planOption || '')} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? '12px' : undefined, padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: isCurrentPlan(p) ? '#f0fdfa' : '#fff' }}>
                                        <div>
                                            <span style={{ fontWeight: '600', color: '#334155' }}>{p.title}{p.planOption ? ` — ${p.planOption}` : ''}</span>
                                            <span style={{ marginLeft: '8px', fontSize: '13px', color: '#64748b' }}>{p.price}</span>
                                            {isCurrentPlan(p) && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#11575C', fontWeight: '600' }}>Current</span>}
                                        </div>
                                        {!p.contactOnly && (
                                            <button
                                                type="button"
                                                style={{ ...saveBtnStyle, padding: '8px 16px', fontSize: '13px' }}
                                                onClick={() => handleSwitchPlan(p)}
                                                disabled={isCurrentPlan(p) && !isCanceled}
                                            >
                                                {isCurrentPlan(p) && !isCanceled ? 'Current' : isCanceled ? 'Reactivate with this plan' : 'Switch to this plan'}
                                            </button>
                                        )}
                                        {p.contactOnly && (
                                            <a href="mailto:contact@ipm.com" style={{ fontSize: '13px', color: '#11575C', fontWeight: '600' }}>Contact us</a>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {hasStripeSubscription && rawStatus !== 'canceled' && (
                                <button type="button" onClick={handleCancel} style={{ ...saveBtnStyle, background: '#991b1b', marginTop: '8px' }}>
                                    Cancel subscription
                                </button>
                            )}

                            {!hasStripeSubscription && canCompleteCheckout && (
                                <>
                                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>Your plan is not active yet. Complete payment to start your subscription.</p>
                                    <button
                                        type="button"
                                        style={saveBtnStyle}
                                        onClick={async () => {
                                            try {
                                                const body = { plan, userId: user._id, role: role === 'agency_agent' ? 'agent' : role };
                                                if (role === 'agency' && plan === 'Premium' && planOption) body.planOption = planOption;
                                                const res = await api.post('/api/stripe-create-checkout', body);
                                                if (res.data?.url) window.location.href = res.data.url;
                                                else alert('Could not start checkout.');
                                            } catch (err) {
                                                alert(err.response?.data?.message || 'Could not start checkout.');
                                            }
                                        }}
                                    >
                                        Complete payment
                                    </button>
                                </>
                            )}

                            {!hasStripeSubscription && !canCompleteCheckout && !isPendingPayment && (
                                <p style={{ color: '#64748b', fontSize: '14px' }}>Subscribe when you sign up or choose a plan above and complete payment.</p>
                            )}
                        </div>
                        );
                    })()}

                    {activeTab === 'integrations' && isAgencyUser && (
                        <SettingsIntegrations isMobile={isMobile} />
                    )}

                    {activeTab === 'notifications' && (
                        <div>
                            <h3 style={{ marginTop: 0, color: '#1f3a3d' }}>Email Notifications</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                                {['New Property Alerts', 'Meeting Reminders', 'Marketing Newsletters', 'Account Security Alerts'].map(item => (
                                    <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                                        <span style={{ fontWeight: '600', color: '#334155' }}>{item}</span>
                                        <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#11575C' }} />
                                    </div>
                                ))}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#334155' }}>Exclusive access to off market homes</span>
                                    <input type="checkbox" checked={!!profileData.notifyOffMarket} onChange={e => setProfileData(prev => ({ ...prev, notifyOffMarket: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: '#11575C' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#334155' }}>That you have your information shared with agencies for them to contact you</span>
                                    <input type="checkbox" checked={!!profileData.notifyShareWithAgencies} onChange={e => setProfileData(prev => ({ ...prev, notifyShareWithAgencies: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: '#11575C' }} />
                                </div>
                            </div>
                            <button style={saveBtnStyle} onClick={async () => {
                                const user = JSON.parse(localStorage.getItem('user'));
                                if (!user) return;
                                try {
                                    const res = await api.put(`/api/users/${user._id}`, { notifyOffMarket: profileData.notifyOffMarket, notifyShareWithAgencies: profileData.notifyShareWithAgencies });
                                    if (res.data?.user) mergeUserIntoStorage(res.data.user);
                                    alert('Preferences Saved');
                                } catch (err) {
                                    alert(err.response?.data?.message || 'Failed to save preferences');
                                }
                            }}>Save Preferences</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#334155' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' };
const saveBtnStyle = { background: '#11575C', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' };

export default Settings;