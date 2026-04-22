import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { useIsMobile } from '../hooks/useMediaQuery';

function nameParts(fullName) {
  if (!fullName || typeof fullName !== 'string') return { name: '', surname: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { name: parts[0] || '', surname: '' };
  return { name: parts[0], surname: parts.slice(1).join(' ') };
}

const BATCH_SIZE = 25;
const CACHE_KEY = 'admin_bootstrap_cache';
const CACHE_TTL_MS = 20 * 1000;
const MAIN_ADMIN_EMAIL = 'admin@internationalpropertymarket.com';
const isMainAdmin = (u) => u && (u.email || '').toLowerCase().trim() === MAIN_ADMIN_EMAIL;

// Brand palette
const brand = {
  schoolBusYellow: '#FFC801',
  amberFlame: '#FFB11A',
  amberGlow: '#FFA62B',
  bloodRed: '#851B0B',
  oxidizedIron: '#A4260D',
  darkTeal: '#11575C',
  silver: '#A7ABAC',
  alabasterGrey: '#DADADA',
};

const styles = {
  contentBox: { background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  tabBar: { display: 'flex', gap: '4px', marginBottom: '16px' },
  tab: { padding: '12px 20px', border: 'none', background: brand.alabasterGrey, fontWeight: '600', cursor: 'pointer', borderRadius: '8px 8px 0 0', color: '#374151' },
  tabActive: { padding: '12px 20px', border: 'none', background: '#fff', color: brand.darkTeal, fontWeight: '600', cursor: 'pointer', borderRadius: '8px 8px 0 0', borderBottom: `2px solid ${brand.darkTeal}` },
  search: { width: '100%', maxWidth: 320, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${brand.alabasterGrey}`, marginBottom: '16px', fontSize: '14px', boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: brand.alabasterGrey },
  th: { textAlign: 'left', background: brand.alabasterGrey, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px' },
  td: { padding: '10px 8px' },
  tr: { borderBottom: `1px solid ${brand.alabasterGrey}`, fontSize: '14px' },
  actionBtnBase: { minHeight: 24, padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', marginRight: '6px', fontSize: '11px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2, border: 'none' },
  viewBtn: { background: brand.darkTeal, color: '#fff' },
  resetBtn: { background: brand.amberFlame, color: '#fff' },
  delBtn: { background: brand.bloodRed, color: '#fff' },
  linkStyle: { color: brand.darkTeal, fontWeight: '600' },
  skeletonCell: { display: 'inline-block', height: 14, borderRadius: 4, background: brand.silver, minWidth: 40 },
  roleBadge: (role) => {
    const r = (role || '').toLowerCase();
    let background = brand.silver;
    let color = '#374151';
    if (r === 'admin') { background = brand.amberGlow; color = '#fff'; }
    else if (r === 'agency') { background = brand.darkTeal; color = '#fff'; }
    else if (r === 'enterprise') { background = '#7c3aed'; color = '#fff'; }
    return {
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      minHeight: 24,
      display: 'inline-flex',
      alignItems: 'center',
      background,
      color,
    };
  },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '24px', borderRadius: '12px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  inputStyle: { width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '8px', border: `1px solid ${brand.alabasterGrey}`, boxSizing: 'border-box' },
  labelStyle: { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  addBtn: { background: brand.darkTeal, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  cancelBtn: { background: brand.alabasterGrey, border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', color: '#374151' },
};

function formatDateTime(value) {
  if (!value) return '—';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch (_) {
    return '—';
  }
}

function signOnDate(user) {
  if (user.createdAt) return new Date(user.createdAt);
  if (user._id && typeof user._id.getTimestamp === 'function') return user._id.getTimestamp();
  return null;
}

function filterUsers(users, q) {
  if (!q || !q.trim()) return users;
  const s = q.toLowerCase().trim();
  return users.filter((u) => {
    const str = [u.name, u.email, u.role, u.subscriptionPlan, u.subscriptionStatus].filter(Boolean).join(' ').toLowerCase();
    return str.includes(s);
  });
}

function filterListings(listings, q) {
  if (!q || !q.trim()) return listings;
  const s = q.toLowerCase().trim();
  return listings.filter((p) => {
    const str = [p.location, p.title, p.listingType, p.propertyCategory, p.price, p.status].filter(Boolean).join(' ').toLowerCase();
    return str.includes(s);
  });
}

function MetadataJsonTree({ data, filter }) {
    const filterLower = (filter || '').toLowerCase().trim();

    function matchesFilter(key, value) {
        if (!filterLower) return true;
        if (String(key).toLowerCase().includes(filterLower)) return true;
        if (value !== null && typeof value !== 'object' && String(value).toLowerCase().includes(filterLower)) return true;
        if (value && typeof value === 'object') {
            return JSON.stringify(value).toLowerCase().includes(filterLower);
        }
        return false;
    }

    function highlight(text) {
        if (!filterLower || !text) return text;
        const str = String(text);
        const idx = str.toLowerCase().indexOf(filterLower);
        if (idx === -1) return str;
        return (
            <>{str.slice(0, idx)}<mark style={{ background: '#fef08a', borderRadius: 2, padding: '0 1px' }}>{str.slice(idx, idx + filterLower.length)}</mark>{str.slice(idx + filterLower.length)}</>
        );
    }

    function renderValue(value) {
        if (value === null || value === undefined) return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>null</span>;
        if (typeof value === 'boolean') return <span style={{ color: '#7c3aed' }}>{value ? 'true' : 'false'}</span>;
        if (typeof value === 'number') return <span style={{ color: '#2563eb' }}>{value.toLocaleString()}</span>;
        if (typeof value === 'string') {
            if (value.length > 300) return <span style={{ color: '#059669' }}>"{highlight(value.slice(0, 300))}…"</span>;
            return <span style={{ color: '#059669' }}>"{highlight(value)}"</span>;
        }
        return String(value);
    }

    function JsonNode({ keyName, value, depth = 0, defaultOpen = false }) {
        const [open, setOpen] = useState(defaultOpen || depth < 1);
        const isObj = value !== null && typeof value === 'object';
        const isArray = Array.isArray(value);
        const entries = isObj ? Object.entries(value) : [];
        const filtered = filterLower ? entries.filter(([k, v]) => matchesFilter(k, v)) : entries;

        if (!isObj) {
            return (
                <div style={{ display: 'flex', gap: 6, padding: '3px 0', paddingLeft: depth * 20, fontSize: 13, fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}>
                    {keyName !== undefined && <span style={{ color: '#475569', fontWeight: 600 }}>{highlight(String(keyName))}:</span>}
                    {renderValue(value)}
                </div>
            );
        }

        const count = isArray ? value.length : Object.keys(value).length;
        const bracketOpen = isArray ? '[' : '{';
        const bracketClose = isArray ? ']' : '}';

        return (
            <div style={{ paddingLeft: depth * 20 }}>
                <div
                    onClick={() => setOpen(!open)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', cursor: 'pointer', fontSize: 13, fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", userSelect: 'none' }}
                >
                    <span style={{ color: '#94a3b8', fontSize: 10, width: 12, textAlign: 'center', transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9654;</span>
                    {keyName !== undefined && <span style={{ color: '#475569', fontWeight: 600 }}>{highlight(String(keyName))}:</span>}
                    <span style={{ color: '#94a3b8' }}>{bracketOpen}</span>
                    {!open && <span style={{ color: '#94a3b8', fontSize: 11 }}>{count} {isArray ? 'items' : 'keys'} {bracketClose}</span>}
                </div>
                {open && (
                    <>
                        {filtered.length === 0 && entries.length > 0 && (
                            <div style={{ paddingLeft: (depth + 1) * 20, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '2px 0' }}>No matches</div>
                        )}
                        {filtered.map(([k, v]) => (
                            <JsonNode key={k} keyName={isArray ? Number(k) : k} value={v} depth={depth + 1} />
                        ))}
                        <div style={{ paddingLeft: depth * 20, color: '#94a3b8', fontSize: 13, fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}>{bracketClose}</div>
                    </>
                )}
            </div>
        );
    }

    if (!data || typeof data !== 'object') return <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(data, null, 2)}</pre>;
    return <JsonNode value={data} depth={0} defaultOpen />;
}

export default function AdminDashboardLists() {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState('accounts');
    const [searchAccounts, setSearchAccounts] = useState('');
    const [searchListings, setSearchListings] = useState('');
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [listings, setListings] = useState([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalListings, setTotalListings] = useState(0);
    const [loadError, setLoadError] = useState(null);

    const [editModal, setEditModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [resetModal, setResetModal] = useState(false);
    const [resetUser, setResetUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetSaving, setResetSaving] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteUser, setDeleteUser] = useState(null);
    const [deleteInfo, setDeleteInfo] = useState(null);
    const [deleteStep, setDeleteStep] = useState(1);
    const [transferToUserId, setTransferToUserId] = useState('');
    const [deleteChildrenConfirm, setDeleteChildrenConfirm] = useState(false);
    const [deleteSaving, setDeleteSaving] = useState(false);
    const [deleteListingModal, setDeleteListingModal] = useState(false);
    const [listingToDelete, setListingToDelete] = useState(null);
    const [deleteListingSaving, setDeleteListingSaving] = useState(false);

    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [selectedListingIds, setSelectedListingIds] = useState([]);
    const [bulkDeleteAccountsModal, setBulkDeleteAccountsModal] = useState(false);
    const [bulkDeleteListingsModal, setBulkDeleteListingsModal] = useState(false);
    const [bulkDeleteSaving, setBulkDeleteSaving] = useState(false);

    const [metadataModal, setMetadataModal] = useState(false);
    const [metadataProperty, setMetadataProperty] = useState(null);
    const [metadataLoading, setMetadataLoading] = useState(false);
    const [metadataSearch, setMetadataSearch] = useState('');

    const fetchUserBatch = useCallback(async (skip, limit) => {
        const res = await api.get('/api/users', { params: { skip, limit } });
        const data = res.data;
        const list = Array.isArray(data?.users) ? data.users : (Array.isArray(data) ? data : []);
        const total = typeof data?.total === 'number' ? data.total : list.length;
        return { users: list, total };
    }, []);
    const fetchListingBatch = useCallback(async (skip, limit) => {
        const res = await api.get('/api/admin/listings', { params: { skip, limit } });
        const data = res.data;
        const list = Array.isArray(data?.listings) ? data.listings : (Array.isArray(data) ? data : []);
        const total = typeof data?.total === 'number' ? data.total : list.length;
        return { listings: list, total };
    }, []);

    const fetchAll = useCallback(() => {
        setLoadError(null);
        const applyBootstrap = (data) => {
            const u = Array.isArray(data?.users) ? data.users : [];
            const l = Array.isArray(data?.listings) ? data.listings : [];
            setUsers(u);
            setListings(l);
            setTotalUsers(typeof data?.totalUsers === 'number' ? data.totalUsers : u.length);
            setTotalListings(typeof data?.totalListings === 'number' ? data.totalListings : l.length);
            setLoading(false);
        };
        let usedCache = false;
        try {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, at } = JSON.parse(cached);
                if (Date.now() - at < CACHE_TTL_MS && data) { applyBootstrap(data); setLoadError(null); usedCache = true; }
            }
        } catch (_) {}
        if (!usedCache) { setLoading(true); setUsers([]); setListings([]); setTotalUsers(0); setTotalListings(0); }
        const timeout = setTimeout(() => setLoading(false), 12000);
        api.get('/api/admin/bootstrap')
            .then((res) => {
                const data = res.data;
                applyBootstrap(data);
                clearTimeout(timeout);
                try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, at: Date.now() })); } catch (_) {}
                const totalU = typeof data?.totalUsers === 'number' ? data.totalUsers : (data?.users?.length || 0);
                const totalL = typeof data?.totalListings === 'number' ? data.totalListings : (data?.listings?.length || 0);
                for (let skip = BATCH_SIZE; skip < totalU; skip += BATCH_SIZE) {
                    fetchUserBatch(skip, BATCH_SIZE).then(({ users: next }) => setUsers((prev) => [...prev, ...next]));
                }
                for (let skip = BATCH_SIZE; skip < totalL; skip += BATCH_SIZE) {
                    fetchListingBatch(skip, BATCH_SIZE).then(({ listings: next }) => setListings((prev) => [...prev, ...next]));
                }
            })
            .catch((err) => {
                clearTimeout(timeout);
                setLoading(false);
                setUsers([]);
                setListings([]);
                setLoadError(err.response?.status === 403 ? 'Access denied. Log in with admin@internationalpropertymarket.com and try again.' : (err.response?.data?.message || err.message || 'Failed to load'));
            });
    }, [fetchUserBatch, fetchListingBatch]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleEditSave = async (e) => {
        e.preventDefault();
        if (!editUser?._id) return;
        setEditSaving(true);
        try {
            await api.patch(`/api/admin/users/${editUser._id}`, {
                name: editUser.name,
                email: (editUser.email || '').toLowerCase().trim(),
                role: editUser.role,
                subscriptionPlan: editUser.subscriptionPlan || undefined,
                subscriptionStatus: editUser.subscriptionStatus || undefined,
                subscriptionPlanOption: editUser.subscriptionPlanOption || undefined
            });
            setUsers((prev) => prev.map((u) => (u._id === editUser._id ? { ...u, ...editUser } : u)));
            setEditModal(false);
            setEditUser(null);
        } catch (err) { alert(err.response?.data?.message || err.message || 'Update failed'); }
        setEditSaving(false);
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        if (!resetUser?._id || newPassword.length < 8 || newPassword !== confirmPassword) {
            if (newPassword !== confirmPassword) alert('Passwords do not match');
            return;
        }
        setResetSaving(true);
        try {
            await api.patch(`/api/admin/users/${resetUser._id}`, { newPassword });
            setResetModal(false);
            setResetUser(null);
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) { alert(err.response?.data?.message || err.message || 'Reset failed'); }
        setResetSaving(false);
    };

    const handleDeleteClick = async (u) => {
        setDeleteUser(u);
        setDeleteStep(1);
        setTransferToUserId('');
        setDeleteChildrenConfirm(false);
        setDeleteModal(true);
        setDeleteInfo(null);
        try {
            const res = await api.get(`/api/admin/users/${u._id}`);
            setDeleteInfo({ linkedChildrenCount: res.data.linkedChildrenCount || 0, user: res.data.user });
        } catch (_) { setDeleteInfo({ linkedChildrenCount: 0, user: u }); }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteUser?._id) return;
        const hasChildren = deleteInfo && deleteInfo.linkedChildrenCount > 0;
        if (hasChildren && deleteStep === 1) { setDeleteStep(2); return; }
        if (hasChildren && deleteStep === 2 && !transferToUserId && !deleteChildrenConfirm) {
            alert('Choose Transfer to agency or confirm Delete all linked agents.');
            return;
        }
        setDeleteSaving(true);
        try {
            const body = {};
            if (hasChildren) {
                if (transferToUserId) body.transferToUserId = transferToUserId;
                else body.deleteChildren = true;
            }
            await api.delete(`/api/admin/users/${deleteUser._id}`, { data: body });
            setUsers((prev) => prev.filter((u) => u._id !== deleteUser._id));
            setTotalUsers((prev) => prev - 1);
            setDeleteModal(false);
            setDeleteUser(null);
            setDeleteInfo(null);
            setDeleteStep(1);
        } catch (err) { alert(err.response?.data?.message || err.message || 'Delete failed'); }
        setDeleteSaving(false);
    };

    const handleDeleteListing = (p) => { setListingToDelete(p); setDeleteListingModal(true); };

    const confirmDeleteListing = async () => {
        if (!listingToDelete?._id) return;
        setDeleteListingSaving(true);
        try {
            await api.delete(`/api/properties/${encodeURIComponent(listingToDelete._id)}`);
            setListings((prev) => prev.filter((p) => p._id !== listingToDelete._id));
            setTotalListings((prev) => prev - 1);
            setDeleteListingModal(false);
            setListingToDelete(null);
        } catch (err) { alert(err.response?.data?.message || err.message || 'Delete failed'); }
        setDeleteListingSaving(false);
    };

    const handleViewMetadata = async (p) => {
        setMetadataProperty(null);
        setMetadataSearch('');
        setMetadataLoading(true);
        setMetadataModal(true);
        try {
            const res = await api.get('/api/admin/property-metadata', { params: { id: p._id } });
            setMetadataProperty(res.data);
        } catch (err) {
            setMetadataProperty({ _error: err.response?.data?.message || err.message || 'Failed to load metadata' });
        }
        setMetadataLoading(false);
    };

    const handleCopyMetadata = () => {
        if (!metadataProperty?.listingMetadata) return;
        navigator.clipboard.writeText(JSON.stringify(metadataProperty.listingMetadata, null, 2))
            .then(() => alert('Copied to clipboard'))
            .catch(() => alert('Copy failed'));
    };

    const handleDownloadMetadata = () => {
        if (!metadataProperty?.listingMetadata) return;
        const blob = new Blob([JSON.stringify(metadataProperty.listingMetadata, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metadata-${metadataProperty._id || 'property'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const agencies = users.filter((u) => (u.role || '').toLowerCase() === 'agency');
    const filteredUsers = filterUsers(users, searchAccounts);
    const filteredListings = filterListings(listings, searchListings);
    const filteredUserIds = filteredUsers.map((u) => u._id);
    const selectableUserIds = filteredUserIds.filter((id) => !isMainAdmin(filteredUsers.find((u) => u._id === id)));
    const filteredListingIds = filteredListings.map((p) => p._id);
    const allUsersSelected = selectableUserIds.length > 0 && selectableUserIds.every((id) => selectedUserIds.includes(id));
    const someUsersSelected = selectableUserIds.some((id) => selectedUserIds.includes(id));
    const allListingsSelected = filteredListingIds.length > 0 && filteredListingIds.every((id) => selectedListingIds.includes(id));
    const someListingsSelected = filteredListingIds.some((id) => selectedListingIds.includes(id));

    const toggleUserSelection = (id) => {
        setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };
    const toggleListingSelection = (id) => {
        setSelectedListingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };
    const toggleSelectAllUsers = () => {
        if (allUsersSelected) setSelectedUserIds((prev) => prev.filter((id) => !selectableUserIds.includes(id)));
        else setSelectedUserIds((prev) => [...new Set([...prev, ...selectableUserIds])]);
    };
    const toggleSelectAllListings = () => {
        if (allListingsSelected) setSelectedListingIds((prev) => prev.filter((id) => !filteredListingIds.includes(id)));
        else setSelectedListingIds((prev) => [...new Set([...prev, ...filteredListingIds])]);
    };

    const handleBulkDeleteAccounts = async () => {
        const ids = selectedUserIds.filter((id) => !isMainAdmin(users.find((u) => u._id === id))).slice();
        if (ids.length === 0) return;
        setBulkDeleteSaving(true);
        setBulkDeleteAccountsModal(false);
        let removed = 0;
        for (const id of ids) {
            try {
                await api.delete(`/api/admin/users/${id}`, { data: {} });
                setUsers((prev) => prev.filter((u) => u._id !== id));
                setTotalUsers((prev) => prev - 1);
                setSelectedUserIds((prev) => prev.filter((x) => x !== id));
                removed++;
            } catch (err) {
                alert(err.response?.data?.message || err.message || `Delete failed for one account. ${removed} deleted.`);
                break;
            }
        }
        setBulkDeleteSaving(false);
    };

    const handleBulkDeleteListings = async () => {
        const ids = selectedListingIds.slice();
        if (ids.length === 0) return;
        setBulkDeleteSaving(true);
        setBulkDeleteListingsModal(false);
        let removed = 0;
        for (const id of ids) {
            try {
                await api.delete(`/api/properties/${encodeURIComponent(id)}`);
                setListings((prev) => prev.filter((p) => p._id !== id));
                setTotalListings((prev) => prev - 1);
                setSelectedListingIds((prev) => prev.filter((x) => x !== id));
                removed++;
            } catch (err) {
                alert(err.response?.data?.message || err.message || `Delete failed for one listing. ${removed} deleted.`);
                break;
            }
        }
        setBulkDeleteSaving(false);
    };

    const showSkeleton = loading && users.length === 0;
    const skeletonRows = 10;

    return (
        <div style={{ padding: isMobile ? 16 : 24, minHeight: 0, overflow: 'auto' }}>
            <div style={styles.contentBox}>
                {!loading && users.length === 0 && listings.length === 0 && loadError && (
                    <div style={{ marginBottom: 16, padding: 16, background: 'rgba(255, 200, 1, 0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <span style={{ color: brand.oxidizedIron }}>{loadError}</span>
                        <button type="button" onClick={() => fetchAll()} style={styles.addBtn}>Retry</button>
                    </div>
                )}

                <div style={styles.tabBar}>
                    <button type="button" onClick={() => setActiveTab('accounts')} style={activeTab === 'accounts' ? styles.tabActive : styles.tab}>Accounts</button>
                    <button type="button" onClick={() => setActiveTab('listings')} style={activeTab === 'listings' ? styles.tabActive : styles.tab}>Listings</button>
                </div>

                {activeTab === 'accounts' && (
                    <>
                        <input type="text" placeholder="Search accounts (name, email, role, plan…)" value={searchAccounts} onChange={(e) => setSearchAccounts(e.target.value)} style={styles.search} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                            <span style={{ fontSize: 14, color: '#64748b' }}>
                                {totalUsers ? `${filteredUsers.length} of ${totalUsers}` : filteredUsers.length} user{(totalUsers || filteredUsers.length) !== 1 ? 's' : ''}
                                {showSkeleton && <span style={{ marginLeft: 8, color: '#94a3b8' }}>Loading…</span>}
                            </span>
                            {someUsersSelected && (
                                <button type="button" onClick={() => setBulkDeleteAccountsModal(true)} style={styles.delBtn} disabled={bulkDeleteSaving}>
                                    Delete selected ({selectedUserIds.filter((id) => selectableUserIds.includes(id)).length})
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={styles.table} className="admin-dashboard-table">
                                <thead><tr style={styles.thead}>
                                    <th style={{ ...styles.th, width: 40 }}>
                                        <input type="checkbox" checked={allUsersSelected} ref={(el) => { if (el) el.indeterminate = someUsersSelected && !allUsersSelected; }} onChange={toggleSelectAllUsers} aria-label="Select all" />
                                    </th>
                                    <th style={styles.th}>Name</th><th style={styles.th}>Surname</th><th style={styles.th}>Email</th><th style={styles.th}>Account type</th><th style={styles.th}>Plan</th><th style={styles.th}>Plan status</th><th style={styles.th}>Sign-on date</th><th style={styles.th}>Last logged in</th><th style={styles.th}>Actions</th>
                                </tr></thead>
                                <tbody>
                                    {showSkeleton && Array.from({ length: skeletonRows }).map((_, i) => (
                                        <tr key={`sk-${i}`} style={styles.tr}>
                                            <td colSpan={10} style={styles.td}><span style={styles.skeletonCell} /></td>
                                        </tr>
                                    ))}
                                    {!showSkeleton && filteredUsers.map((u) => {
                                        const { name, surname } = nameParts(u.name);
                                        const checked = selectedUserIds.includes(u._id);
                                        const mainAdmin = isMainAdmin(u);
                                        return (
                                            <tr key={u._id} style={styles.tr}>
                                                <td style={styles.td}>{mainAdmin ? <span style={{ color: brand.silver }}>—</span> : <input type="checkbox" checked={checked} onChange={() => toggleUserSelection(u._id)} aria-label={`Select ${u.email}`} />}</td>
                                                <td style={styles.td}>{name}</td><td style={styles.td}>{surname}</td><td style={styles.td}>{u.email}</td>
                                                <td style={styles.td}><span style={styles.roleBadge(u.role)}>{u.role || '—'}</span></td>
                                                <td style={styles.td}>{u.subscriptionPlan || '—'}</td><td style={styles.td}>{u.subscriptionStatus || '—'}</td>
                                                <td style={styles.td}>{formatDateTime(signOnDate(u))}</td>
                                                <td style={styles.td}>{formatDateTime(u.lastLoginAt)}</td>
                                                <td style={styles.td}>
                                                    <button type="button" onClick={() => { setEditUser({ ...u }); setEditModal(true); }} style={{ ...styles.actionBtnBase, ...styles.viewBtn }}>Edit</button>
                                                    <button type="button" onClick={() => { setResetUser(u); setNewPassword(''); setConfirmPassword(''); setResetModal(true); }} style={{ ...styles.actionBtnBase, ...styles.resetBtn }}>Reset password</button>
                                                    {!mainAdmin && <button type="button" onClick={() => handleDeleteClick(u)} style={{ ...styles.actionBtnBase, ...styles.delBtn }}>Delete</button>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'listings' && (
                    <>
                        <input type="text" placeholder="Search listings (address, type, price, status…)" value={searchListings} onChange={(e) => setSearchListings(e.target.value)} style={styles.search} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                            <span style={{ fontSize: 14, color: '#64748b' }}>
                                {totalListings ? `${filteredListings.length} of ${totalListings}` : filteredListings.length} listing{(totalListings || filteredListings.length) !== 1 ? 's' : ''}
                            </span>
                            {someListingsSelected && (
                                <button type="button" onClick={() => setBulkDeleteListingsModal(true)} style={styles.delBtn} disabled={bulkDeleteSaving}>
                                    Delete selected ({selectedListingIds.filter((id) => filteredListingIds.includes(id)).length})
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={styles.table} className="admin-dashboard-table">
                                <thead><tr style={styles.thead}>
                                    <th style={{ ...styles.th, width: 40 }}>
                                        <input type="checkbox" checked={allListingsSelected} ref={(el) => { if (el) el.indeterminate = someListingsSelected && !allListingsSelected; }} onChange={toggleSelectAllListings} aria-label="Select all" />
                                    </th>
                                    <th style={styles.th}>Address</th><th style={styles.th}>Type</th><th style={styles.th}>Price</th><th style={styles.th}>Status</th><th style={styles.th}>Actions</th>
                                </tr></thead>
                                <tbody>
                                    {loading && listings.length === 0 && Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={`sk-${i}`} style={styles.tr}><td colSpan={6} style={styles.td}><span style={styles.skeletonCell} /></td></tr>
                                    ))}
                                    {!(loading && listings.length === 0) && filteredListings.map((p) => {
                                        const checked = selectedListingIds.includes(p._id);
                                        return (
                                            <tr key={p._id} style={styles.tr}>
                                                <td style={styles.td}><input type="checkbox" checked={checked} onChange={() => toggleListingSelection(p._id)} aria-label={`Select ${p.location || p._id}`} /></td>
                                                <td style={styles.td}>{[p.locationDetails?.streetAddress, p.locationDetails?.suburb, p.locationDetails?.city].filter(Boolean).filter((v, i, a) => a.findIndex(q => q.toLowerCase() === v.toLowerCase()) === i).join(', ') || p.location || p.address || '—'}</td>
                                                <td style={styles.td}>{p.listingType || p.propertyCategory || '—'}</td>
                                                <td style={styles.td}>{p.price || '—'}</td>
                                                <td style={styles.td}>{p.status || '—'}</td>
                                                <td style={styles.td}>
                                                    <a href={`/property/${p._id}`} target="_blank" rel="noopener noreferrer" style={{ ...styles.actionBtnBase, ...styles.viewBtn, textDecoration: 'none' }}>View</a>
                                                    <button type="button" onClick={() => handleViewMetadata(p)} style={{ ...styles.actionBtnBase, background: '#6366f1', color: '#fff' }}>Metadata</button>
                                                    <button type="button" onClick={() => handleDeleteListing(p)} style={{ ...styles.actionBtnBase, ...styles.delBtn }}>Delete</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {editModal && editUser && (
                <div style={styles.modalOverlay} onClick={() => !editSaving && setEditModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: brand.darkTeal }}>Edit user</h2>
                        <form onSubmit={handleEditSave}>
                            <label style={styles.labelStyle}>Name</label>
                            <input style={styles.inputStyle} value={editUser.name || ''} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
                            <label style={styles.labelStyle}>Email</label>
                            <input style={styles.inputStyle} type="email" value={editUser.email || ''} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
                            <label style={styles.labelStyle}>Role</label>
                            <select style={styles.inputStyle} value={editUser.role || ''} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                                {['investor','buyer','seller','tenant','agent','independent_agent','agency','agency_agent','admin'].map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <label style={styles.labelStyle}>Plan</label>
                            <input style={styles.inputStyle} value={editUser.subscriptionPlan || ''} onChange={(e) => setEditUser({ ...editUser, subscriptionPlan: e.target.value })} />
                            <label style={styles.labelStyle}>Plan status</label>
                            <input style={styles.inputStyle} value={editUser.subscriptionStatus || ''} onChange={(e) => setEditUser({ ...editUser, subscriptionStatus: e.target.value })} />
                            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                                <button type="submit" style={styles.addBtn} disabled={editSaving}>{editSaving ? 'Saving...' : 'Save'}</button>
                                <button type="button" onClick={() => setEditModal(false)} style={styles.cancelBtn}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {resetModal && resetUser && (
                <div style={styles.modalOverlay} onClick={() => !resetSaving && setResetModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: brand.darkTeal }}>Reset password</h2>
                        <p style={{ margin: '0 0 16px', color: '#64748b' }}>User: {resetUser.email}</p>
                        <form onSubmit={handleResetSubmit}>
                            <label style={styles.labelStyle}>New password (min 8)</label>
                            <input style={styles.inputStyle} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
                            <label style={styles.labelStyle}>Confirm</label>
                            <input style={styles.inputStyle} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
                            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                                <button type="submit" style={styles.addBtn} disabled={resetSaving || newPassword.length < 8 || newPassword !== confirmPassword}>Reset password</button>
                                <button type="button" onClick={() => setResetModal(false)} style={styles.cancelBtn}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteModal && deleteUser && (
                <div style={styles.modalOverlay} onClick={() => !deleteSaving && setDeleteModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: brand.bloodRed }}>Delete user</h2>
                        <p style={{ margin: '0 0 12px' }}><strong>{deleteUser.name}</strong> ({deleteUser.email})</p>
                        {deleteInfo?.linkedChildrenCount > 0 && (
                            <p style={{ margin: '0 0 16px', color: brand.oxidizedIron }}>This account has <strong>{deleteInfo.linkedChildrenCount} linked agent(s)</strong>. Transfer or delete them.</p>
                        )}
                        {deleteStep === 1 && deleteInfo !== null && (
                            <>
                                <p style={{ margin: '0 0 20px', color: '#64748b' }}>
                                    {deleteInfo.linkedChildrenCount > 0 ? 'Click Continue to choose how to handle linked agents.' : 'Permanently delete this user and their data?'}
                                </p>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={handleDeleteConfirm} style={styles.delBtn}>{deleteInfo.linkedChildrenCount > 0 ? 'Continue' : 'Delete permanently'}</button>
                                    <button type="button" onClick={() => setDeleteModal(false)} style={styles.cancelBtn}>Cancel</button>
                                </div>
                            </>
                        )}
                        {deleteStep === 1 && deleteInfo === null && <p style={{ margin: 0, color: '#64748b' }}>Loading...</p>}
                        {deleteStep === 2 && deleteInfo?.linkedChildrenCount > 0 && (
                            <>
                                <label style={styles.labelStyle}>Transfer to agency</label>
                                <select style={styles.inputStyle} value={transferToUserId} onChange={(e) => { setTransferToUserId(e.target.value); setDeleteChildrenConfirm(false); }}>
                                    <option value="">— Select agency or delete all below —</option>
                                    {agencies.filter((a) => a._id !== deleteUser._id).map((a) => <option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
                                </select>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                    <input type="checkbox" checked={deleteChildrenConfirm} onChange={(e) => { setDeleteChildrenConfirm(e.target.checked); if (e.target.checked) setTransferToUserId(''); }} />
                                    <span>Delete all {deleteInfo.linkedChildrenCount} linked agents</span>
                                </label>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={handleDeleteConfirm} style={styles.delBtn} disabled={deleteSaving || (!transferToUserId && !deleteChildrenConfirm)}>{deleteSaving ? 'Deleting...' : 'Delete user'}</button>
                                    <button type="button" onClick={() => { setDeleteStep(1); setTransferToUserId(''); setDeleteChildrenConfirm(false); }} style={styles.cancelBtn}>Back</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {deleteListingModal && listingToDelete && (
                <div style={styles.modalOverlay} onClick={() => !deleteListingSaving && setDeleteListingModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: brand.bloodRed }}>Delete listing</h2>
                        <p style={{ margin: '0 0 20px' }}>Address: <strong>{listingToDelete.location || listingToDelete.address || listingToDelete.title || '—'}</strong>. This cannot be undone.</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={confirmDeleteListing} style={styles.delBtn} disabled={deleteListingSaving}>{deleteListingSaving ? 'Deleting...' : 'Delete'}</button>
                            <button type="button" onClick={() => { setDeleteListingModal(false); setListingToDelete(null); }} style={styles.cancelBtn}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {bulkDeleteAccountsModal && (
                <div style={styles.modalOverlay} onClick={() => !bulkDeleteSaving && setBulkDeleteAccountsModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: brand.bloodRed }}>Delete selected accounts</h2>
                        <p style={{ margin: '0 0 20px', color: '#64748b' }}>
                            Permanently delete {selectedUserIds.filter((id) => selectableUserIds.includes(id)).length} selected account(s)? This cannot be undone. Accounts with linked agents may fail.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={handleBulkDeleteAccounts} style={styles.delBtn} disabled={bulkDeleteSaving}>{bulkDeleteSaving ? 'Deleting...' : 'Delete selected'}</button>
                            <button type="button" onClick={() => setBulkDeleteAccountsModal(false)} style={styles.cancelBtn}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {bulkDeleteListingsModal && (
                <div style={styles.modalOverlay} onClick={() => !bulkDeleteSaving && setBulkDeleteListingsModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: brand.bloodRed }}>Delete selected listings</h2>
                        <p style={{ margin: '0 0 20px', color: '#64748b' }}>
                            Permanently delete {selectedListingIds.filter((id) => filteredListingIds.includes(id)).length} selected listing(s)? This cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={handleBulkDeleteListings} style={styles.delBtn} disabled={bulkDeleteSaving}>{bulkDeleteSaving ? 'Deleting...' : 'Delete selected'}</button>
                            <button type="button" onClick={() => setBulkDeleteListingsModal(false)} style={styles.cancelBtn}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {metadataModal && (
                <div style={styles.modalOverlay} onClick={() => { setMetadataModal(false); setMetadataProperty(null); }}>
                    <div style={{ background: '#fff', borderRadius: 14, width: '90%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px 12px', borderBottom: `1px solid ${brand.alabasterGrey}`, flexShrink: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                                <div>
                                    <h2 style={{ margin: 0, color: brand.darkTeal, fontSize: 18 }}>Listing Metadata (AI Response)</h2>
                                    {metadataProperty && !metadataProperty._error && (
                                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                                            <strong>{metadataProperty.title || 'Untitled'}</strong>
                                            {' — '}
                                            {metadataProperty.location || [metadataProperty.locationDetails?.streetAddress, metadataProperty.locationDetails?.city].filter(Boolean).join(', ') || 'No address'}
                                            <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 11 }}>ID: {metadataProperty._id}</span>
                                        </p>
                                    )}
                                </div>
                                <button type="button" onClick={() => { setMetadataModal(false); setMetadataProperty(null); }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', padding: '0 4px', lineHeight: 1 }}>&times;</button>
                            </div>
                            {metadataProperty?.listingMetadata && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="Search JSON keys or values..."
                                        value={metadataSearch}
                                        onChange={(e) => setMetadataSearch(e.target.value)}
                                        style={{ flex: 1, padding: '7px 12px', borderRadius: 6, border: `1px solid ${brand.alabasterGrey}`, fontSize: 13, boxSizing: 'border-box' }}
                                    />
                                    <button type="button" onClick={handleCopyMetadata} style={{ ...styles.actionBtnBase, background: brand.darkTeal, color: '#fff', padding: '6px 14px', fontSize: 12 }}>
                                        <i className="fas fa-copy" style={{ marginRight: 4, fontSize: 10 }} /> Copy
                                    </button>
                                    <button type="button" onClick={handleDownloadMetadata} style={{ ...styles.actionBtnBase, background: '#6366f1', color: '#fff', padding: '6px 14px', fontSize: 12 }}>
                                        <i className="fas fa-download" style={{ marginRight: 4, fontSize: 10 }} /> Download
                                    </button>
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
                            {metadataLoading && (
                                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                                    <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12, display: 'block' }} />
                                    Loading metadata...
                                </div>
                            )}
                            {!metadataLoading && metadataProperty?._error && (
                                <div style={{ textAlign: 'center', padding: 40, color: brand.bloodRed }}>
                                    <i className="fas fa-exclamation-triangle" style={{ fontSize: 24, marginBottom: 12, display: 'block' }} />
                                    {metadataProperty._error}
                                </div>
                            )}
                            {!metadataLoading && metadataProperty && !metadataProperty._error && !metadataProperty.listingMetadata && (
                                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                                    <i className="fas fa-database" style={{ fontSize: 24, marginBottom: 12, display: 'block' }} />
                                    No listing metadata found for this property.
                                    <p style={{ fontSize: 12, marginTop: 8 }}>Metadata is generated when a property is uploaded with an address lookup.</p>
                                </div>
                            )}
                            {!metadataLoading && metadataProperty?.listingMetadata && (
                                <MetadataJsonTree data={metadataProperty.listingMetadata} filter={metadataSearch} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
