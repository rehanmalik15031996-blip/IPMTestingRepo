import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../config/api';
import Sidebar from '../components/Sidebar';
import { dedupePropertyTitle } from '../utils/propertyTitle';

const brand = {
  darkTeal: '#11575C',
  alabasterGrey: '#DADADA',
  bloodRed: '#851B0B',
  amberFlame: '#FFB11A',
};

const SOCIAL_NETWORKS = [
  { id: 'instagram', label: 'Instagram', icon: 'fab fa-instagram' },
  { id: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-f' },
  { id: 'x', label: 'X (Twitter)', icon: 'fab fa-twitter' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'fab fa-linkedin-in' },
  { id: 'threads', label: 'Threads', icon: 'fas fa-at' },
  { id: 'youtube', label: 'YouTube', icon: 'fab fa-youtube' },
  { id: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok' },
  { id: 'email', label: 'Email', icon: 'fas fa-envelope' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MARKETING_LINKED_STORAGE_KEY = (userId) => `ipm_marketing_linked_${userId || 'anon'}`;
const MARKETING_RECENT_POSTS_STORAGE_KEY = (userId) => `ipm_marketing_recent_posts_${userId || 'anon'}`;

function buildEmptyLinkedAccounts() {
  return SOCIAL_NETWORKS.reduce((acc, n) => {
    acc[n.id] = [];
    return acc;
  }, {});
}

function mapPlatformToOutstandNetwork(platformId) {
  const id = String(platformId || '').toLowerCase();
  const map = {
    instagram: 'instagram',
    facebook: 'facebook',
    x: 'x',
    linkedin: 'linkedin',
    threads: 'threads',
    youtube: 'youtube',
    tiktok: 'tiktok',
  };
  return map[id] || id;
}

function mapOutstandNetworkToPlatform(network) {
  const n = String(network || '').toLowerCase();
  if (n === 'twitter') return 'x';
  return n;
}

const DEFAULT_POST_FORM = {
  title: '',
  content: '',
  hashtags: '',
  mediaFile: null,
  mediaUrl: '',
  propertyId: '',
  propertyLabel: '',
  scheduleType: 'once',
  scheduleAt: '',
  scheduleTime: '09:00',
  recurringTimesPerWeek: 3,
  recurringDays: [],
  recurringEveryDay: false,
  recurringTime: '09:00',
  recurringStartDate: '',
  recurringEndDate: '',
};

const styles = {
  page: { padding: '24px 40px', background: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { margin: 0, color: '#0f172a', fontSize: 24 },
  backBtn: { background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 500, textDecoration: 'none', color: '#334155' },
  contentBox: { background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  platformTabBar: { display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' },
  platformTab: { padding: '10px 16px', border: 'none', background: brand.alabasterGrey, fontWeight: 600, cursor: 'pointer', borderRadius: 8, color: '#374151', fontSize: 13 },
  platformTabActive: { background: brand.darkTeal, color: '#fff' },
  addBtn: { background: brand.darkTeal, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  actionBtnBase: { minHeight: 24, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', marginRight: 6, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2, border: 'none' },
  viewBtn: { background: brand.darkTeal, color: '#fff' },
  delBtn: { background: brand.bloodRed, color: '#fff' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: 24, borderRadius: 12, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' },
  label: { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 },
  input: { width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: `1px solid ${brand.alabasterGrey}`, boxSizing: 'border-box' },
  textarea: { width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: `1px solid ${brand.alabasterGrey}`, boxSizing: 'border-box', minHeight: 80, resize: 'vertical' },
  cancelBtn: { background: brand.alabasterGrey, border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', color: '#374151', marginRight: 8 },
  sectionTitle: { margin: '16px 0 8px', fontSize: 14, fontWeight: 600, color: '#334155' },
  row: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 },
  postCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 12 },
};

// Deterministic low numbers for display (views, likes, comments) so same post shows same metrics
function getSimulatedMetrics(postId) {
  const str = String(postId || '');
  let n = 0;
  for (let i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) >>> 0;
  return {
    views: (n % 47) + 8,
    likes: (n % 11) + 1,
    comments: (n % 5),
  };
}

function formatSchedule(post) {
  const s = post.schedule;
  if (!s) return '—';
  if (s.type === 'once' && s.at) return new Date(s.at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  if (s.type === 'recurring' && s.recurring) {
    const r = s.recurring;
    const parts = [];
    if (r.everyDay) parts.push('Every day');
    else if (r.daysOfWeek && r.daysOfWeek.length) parts.push(r.daysOfWeek.map(d => DAYS[d]).join(', '));
    if (r.timesPerWeek) parts.push(`${r.timesPerWeek}×/week`);
    if (r.time) parts.push(r.time);
    if (r.startDate) parts.push(`from ${new Date(r.startDate).toLocaleDateString()}`);
    if (r.endDate) parts.push(`to ${new Date(r.endDate).toLocaleDateString()}`);
    return parts.join(' · ') || 'Recurring';
  }
  return '—';
}

function formatScheduleFromForm(form) {
  if (form.scheduleType === 'once') {
    if (!form.scheduleAt) return null;
    const atStr = form.scheduleAt.includes('T') ? form.scheduleAt : `${form.scheduleAt.slice(0, 10)}T${form.scheduleTime || '09:00'}`;
    try {
      const d = new Date(atStr);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch (_) {}
    return null;
  }
  return 'Recurring';
}

// Instagram-style feed post preview (single card)
function InstagramPreviewCard({ username, caption, mediaUrl, locationLabel }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: 468,
      margin: '0 auto',
      background: '#fff',
      border: '1px solid #dbdbdb',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header: avatar + username */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
          flexShrink: 0,
        }} />
        <span style={{ fontWeight: 600, fontSize: 14, color: '#262626' }}>{username || 'username'}</span>
      </div>
      {/* Image or placeholder */}
      <div style={{ aspectRatio: '1', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt="Post"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ color: '#666', fontSize: 14 }}>No image</div>
        )}
      </div>
      {/* Actions row (icons) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px 8px' }}>
        <span style={{ fontSize: 22, color: '#262626' }}><i className="far fa-heart" /></span>
        <span style={{ fontSize: 22, color: '#262626' }}><i className="far fa-comment" /></span>
        <span style={{ fontSize: 22, color: '#262626' }}><i className="far fa-paper-plane" /></span>
        <span style={{ fontSize: 22, color: '#262626', marginLeft: 'auto' }}><i className="far fa-bookmark" /></span>
      </div>
      {/* Caption: username + text */}
      <div style={{ padding: '0 16px 12px', fontSize: 14, color: '#262626' }}>
        <span style={{ fontWeight: 600, marginRight: 6 }}>{username || 'username'}</span>
        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{caption || ''}</span>
      </div>
      {locationLabel && (
        <div style={{ padding: '0 16px 12px', fontSize: 12, color: '#8e8e8e' }}>
          <i className="fas fa-map-marker-alt" style={{ marginRight: 6 }} />{locationLabel}
        </div>
      )}
    </div>
  );
}

// X (Twitter) style preview — single tweet card
function XPreviewCard({ username, caption, mediaUrl }) {
  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      background: '#fff',
      border: '1px solid #cfd9de',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: 12, padding: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#71767b', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f1419' }}>{username || 'username'}</span>
            <span style={{ fontSize: 15, color: '#536471' }}>@{username || 'handle'}</span>
          </div>
          <div style={{ fontSize: 15, color: '#0f1419', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{caption || ''}</div>
          {mediaUrl && (
            <div style={{ marginTop: 12, borderRadius: 16, overflow: 'hidden', border: '1px solid #cfd9de' }}>
              <img src={mediaUrl} alt="Post" style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// LinkedIn style preview — update card
function LinkedInPreviewCard({ username, caption, mediaUrl }) {
  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <div style={{ padding: 12, display: 'flex', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#004182', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#000' }}>{username || 'Name'}</div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Headline · 1st</div>
          <div style={{ fontSize: 14, color: '#000', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{caption || ''}</div>
          {mediaUrl && (
            <div style={{ marginTop: 12, borderRadius: 4, overflow: 'hidden', background: '#f3f2ef' }}>
              <img src={mediaUrl} alt="Post" style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Email style preview — simple subject + body
function EmailPreviewCard({ title, caption }) {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Subject</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{title || '(No subject)'}</div>
      </div>
      <div style={{ padding: 16, fontSize: 14, color: '#333', whiteSpace: 'pre-wrap' }}>{caption || ''}</div>
    </div>
  );
}

function getPreviewComponent(platformId) {
  switch (platformId) {
    case 'instagram': return InstagramPreviewCard;
    case 'x': return XPreviewCard;
    case 'linkedin': return LinkedInPreviewCard;
    case 'email': return EmailPreviewCard;
    default: return InstagramPreviewCard;
  }
}

export default function AdminMarketing() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch (_) { return null; }
  })();
  const role = (currentUser?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const canAccessMarketing = ['admin', 'agency', 'agency_agent', 'independent_agent', 'enterprise'].includes(role);

  const [platformTab, setPlatformTab] = useState('instagram');
  const [linkedAccountsByPlatform, setLinkedAccountsByPlatform] = useState(buildEmptyLinkedAccounts);
  const linkedAccountsHydratedRef = useRef(false);
  const [linkAccountPopupPlatform, setLinkAccountPopupPlatform] = useState(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [recentPosts, setRecentPosts] = useState([]); // { id, platformId, title?, content, mediaUrl?, propertyId?, propertyLabel?, schedule, createdAt }
  const recentPostsHydratedRef = useRef(false);
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMediaObjectUrl, setPreviewMediaObjectUrl] = useState(null); // for file preview; revoke on close
  const [editingPostId, setEditingPostId] = useState(null);
  const [postForm, setPostForm] = useState({ ...DEFAULT_POST_FORM });
  const [multiPostModalOpen, setMultiPostModalOpen] = useState(false);
  const [multiPostForm, setMultiPostForm] = useState({ ...DEFAULT_POST_FORM });
  const [selectedPlatforms, setSelectedPlatforms] = useState([]); // platform ids to post to
  const [multiPostPreviewObjectUrl, setMultiPostPreviewObjectUrl] = useState(null);
  const multiPostObjectUrlRef = useRef(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionForm, setActionForm] = useState({
    trigger: 'on_like',
    likeBack: false,
    sendPropertyAd: false,
    sendMessage: false,
    messageText: '',
  });

  useEffect(() => {
    if (!currentUser || !canAccessMarketing) navigate('/login');
  }, [currentUser, canAccessMarketing, navigate]);

  useEffect(() => {
    if (linkAccountPopupPlatform) setLinkBusy(false);
  }, [linkAccountPopupPlatform]);

  // Hydrate linked accounts from localStorage (per user) so simulated links stick after leaving the page
  useEffect(() => {
    if (!currentUser?._id || !canAccessMarketing) return;
    const key = MARKETING_LINKED_STORAGE_KEY(currentUser._id);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const base = buildEmptyLinkedAccounts();
          for (const k of Object.keys(base)) {
            if (Array.isArray(parsed[k])) base[k] = parsed[k];
          }
          setLinkedAccountsByPlatform(base);
        }
      }
    } catch (_) {}
    linkedAccountsHydratedRef.current = true;
  }, [currentUser?._id, canAccessMarketing]);

  const loadOutstandAccounts = useCallback(() => {
    if (!currentUser?._id || !canAccessMarketing) return;
    api
      .get('/api/outstand/accounts')
      .then((res) => {
        const list = res.data?.data;
        if (!Array.isArray(list) || list.length === 0) return;
        const next = buildEmptyLinkedAccounts();
        for (const a of list) {
          const plat = mapOutstandNetworkToPlatform(a.network);
          if (!Object.prototype.hasOwnProperty.call(next, plat)) continue;
          const uname = (a.username || a.nickname || '').replace(/^@/, '');
          next[plat].push({
            id: a.id,
            handle: uname ? `@${uname}` : '@connected',
            username: uname || 'connected',
            connectedAt: new Date().toLocaleDateString(),
            source: 'outstand',
          });
        }
        setLinkedAccountsByPlatform(next);
      })
      .catch(() => {});
  }, [currentUser?._id, canAccessMarketing]);

  useEffect(() => {
    loadOutstandAccounts();
  }, [loadOutstandAccounts]);

  useEffect(() => {
    if (!canAccessMarketing) return;
    const q = new URLSearchParams(location.search);
    if (q.get('outstand') === 'connected') {
      loadOutstandAccounts();
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, canAccessMarketing, loadOutstandAccounts, navigate]);

  // Hydrate recent posts from localStorage so posts from listings-page flow show when user returns to Marketing
  useEffect(() => {
    if (!currentUser?._id || !canAccessMarketing) return;
    const key = MARKETING_RECENT_POSTS_STORAGE_KEY(currentUser._id);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentPosts(parsed);
        }
      }
    } catch (_) {}
    recentPostsHydratedRef.current = true;
  }, [currentUser?._id, canAccessMarketing]);

  // Persist recent posts to localStorage whenever they change (after hydration)
  useEffect(() => {
    if (!recentPostsHydratedRef.current || !currentUser?._id || !canAccessMarketing) return;
    const key = MARKETING_RECENT_POSTS_STORAGE_KEY(currentUser._id);
    try {
      const toStore = recentPosts.map((p) => ({
        ...p,
        mediaUrl: (p.mediaUrl && typeof p.mediaUrl === 'string' && p.mediaUrl.startsWith('http')) ? p.mediaUrl : undefined,
      }));
      localStorage.setItem(key, JSON.stringify(toStore));
    } catch (_) {}
  }, [recentPosts, currentUser?._id, canAccessMarketing]);

  // Persist linked accounts to localStorage whenever they change (after hydration)
  useEffect(() => {
    if (!linkedAccountsHydratedRef.current || !currentUser?._id || !canAccessMarketing) return;
    const key = MARKETING_LINKED_STORAGE_KEY(currentUser._id);
    try {
      localStorage.setItem(key, JSON.stringify(linkedAccountsByPlatform));
    } catch (_) {}
  }, [linkedAccountsByPlatform, currentUser?._id, canAccessMarketing]);

  const openPostWithPropertyRef = useRef(false);
  const cameFromListingsRef = useRef(false);
  useEffect(() => {
    const prop = location.state?.openPostWithProperty;
    if (!prop || openPostWithPropertyRef.current) return;
    openPostWithPropertyRef.current = true;
    cameFromListingsRef.current = true;
    const rawTitle = prop.title || prop.propertyTitle || 'Property';
    const title = dedupePropertyTitle(rawTitle);
    const defaultContent = `New property alert: ${title}. Get in touch for more details.`;
    setMultiPostForm((prev) => ({
      ...prev,
      ...DEFAULT_POST_FORM,
      content: defaultContent,
      title: `New property: ${title}`,
      propertyId: prop._id || prop.id || '',
      propertyLabel: title,
    }));
    setSelectedPlatforms(activePlatforms.length ? activePlatforms.map((p) => p.id) : []);
    setMultiPostModalOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state?.openPostWithProperty, location.pathname, navigate]);

  const closeMultiPostModal = () => {
    setMultiPostModalOpen(false);
    resetMultiPostForm();
    if (cameFromListingsRef.current) {
      cameFromListingsRef.current = false;
      navigate('/listing-management');
    }
  };

  const previewObjectUrlRef = useRef(null);
  // Resolve preview media URL from file (create object URL; revoke when preview closes)
  useEffect(() => {
    if (!previewOpen) {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      setPreviewMediaObjectUrl(null);
      return;
    }
    if (postForm.mediaFile) {
      const u = URL.createObjectURL(postForm.mediaFile);
      previewObjectUrlRef.current = u;
      setPreviewMediaObjectUrl(u);
      return () => {
        URL.revokeObjectURL(u);
        previewObjectUrlRef.current = null;
        setPreviewMediaObjectUrl(null);
      };
    }
    setPreviewMediaObjectUrl(null);
  }, [previewOpen, postForm.mediaFile]);

  useEffect(() => {
    if (!currentUser?._id || !canAccessMarketing) return;
    let cancelled = false;
    setListingsLoading(true);
    if (isAdmin) {
      api.get('/api/admin/listings', { params: { skip: 0, limit: 500 } })
        .then((res) => {
          if (cancelled) return;
          const data = res?.data;
          const list = Array.isArray(data?.listings) ? data.listings : (Array.isArray(data) ? data : []);
          setListings(list);
        })
        .catch(() => { if (!cancelled) setListings([]); })
        .finally(() => { if (!cancelled) setListingsLoading(false); });
    } else {
      api.get(`/api/users/${currentUser._id}?type=dashboard`)
        .then((res) => {
          if (cancelled) return;
          const agentProps = res?.data?.agentProperties || [];
          setListings(Array.isArray(agentProps) ? agentProps : []);
        })
        .catch(() => { if (!cancelled) setListings([]); })
        .finally(() => { if (!cancelled) setListingsLoading(false); });
    }
    return () => { cancelled = true; };
  }, [currentUser?._id, canAccessMarketing, isAdmin]);

  const resetPostForm = () => {
    setPostForm({ ...DEFAULT_POST_FORM });
    setEditingPostId(null);
  };

  // Active platforms = those with at least one linked account
  const activePlatforms = SOCIAL_NETWORKS.filter((n) => (linkedAccountsByPlatform[n.id] || []).length > 0);

  const resetMultiPostForm = () => {
    setMultiPostForm({ ...DEFAULT_POST_FORM });
    setSelectedPlatforms(activePlatforms.map((p) => p.id));
  };

  // Multi-post preview media URL (object URL from file; revoke when modal closes)
  useEffect(() => {
    if (!multiPostModalOpen) {
      if (multiPostObjectUrlRef.current) {
        URL.revokeObjectURL(multiPostObjectUrlRef.current);
        multiPostObjectUrlRef.current = null;
      }
      setMultiPostPreviewObjectUrl(null);
      return;
    }
    if (multiPostForm.mediaFile) {
      const u = URL.createObjectURL(multiPostForm.mediaFile);
      multiPostObjectUrlRef.current = u;
      setMultiPostPreviewObjectUrl(u);
      return () => {
        URL.revokeObjectURL(u);
        multiPostObjectUrlRef.current = null;
        setMultiPostPreviewObjectUrl(null);
      };
    }
    setMultiPostPreviewObjectUrl(null);
  }, [multiPostModalOpen, multiPostForm.mediaFile]);

  const openCreatePost = () => {
    resetPostForm();
    setPostModalOpen(true);
  };

  const openEditPost = (post) => {
    setEditingPostId(post.id);
    const s = post.schedule || {};
    const r = s.recurring || {};
    setPostForm({
      title: post.title || '',
      content: post.content || '',
      hashtags: post.hashtags || '',
      mediaFile: null,
      mediaUrl: post.mediaUrl || '',
      propertyId: post.propertyId || '',
      propertyLabel: post.propertyLabel || '',
      scheduleType: s.type || 'once',
      scheduleAt: s.at ? new Date(s.at).toISOString().slice(0, 16) : '',
      scheduleTime: s.at ? new Date(s.at).toTimeString().slice(0, 5) : '09:00',
      recurringTimesPerWeek: r.timesPerWeek || 3,
      recurringDays: r.daysOfWeek || [],
      recurringEveryDay: !!r.everyDay,
      recurringTime: r.time || '09:00',
      recurringStartDate: r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : '',
      recurringEndDate: r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : '',
    });
    setPostModalOpen(true);
  };

  const buildScheduleFromForm = (form = postForm) => {
    if (form.scheduleType === 'once') {
      if (!form.scheduleAt) return null;
      const atStr = form.scheduleAt.includes('T') ? form.scheduleAt : `${form.scheduleAt.slice(0, 10)}T${form.scheduleTime || '09:00'}`;
      return { type: 'once', at: new Date(atStr).toISOString() };
    }
    const r = {
      timesPerWeek: form.recurringTimesPerWeek,
      everyDay: form.recurringEveryDay,
      daysOfWeek: form.recurringEveryDay ? [0, 1, 2, 3, 4, 5, 6] : form.recurringDays,
      time: form.recurringTime,
      startDate: form.recurringStartDate ? new Date(form.recurringStartDate).toISOString() : null,
      endDate: form.recurringEndDate ? new Date(form.recurringEndDate).toISOString() : null,
    };
    return { type: 'recurring', recurring: r };
  };

  const submitPost = () => {
    const schedule = buildScheduleFromForm(postForm);
    const mediaUrl = postForm.mediaUrl || (postForm.mediaFile ? URL.createObjectURL(postForm.mediaFile) : '');
    const payload = {
      id: editingPostId || 'post_' + Date.now(),
      platformId,
      title: postForm.title || undefined,
      content: postForm.content,
      hashtags: postForm.hashtags?.trim() || undefined,
      mediaUrl: mediaUrl || undefined,
      propertyId: postForm.propertyId || undefined,
      propertyLabel: postForm.propertyLabel || undefined,
      schedule,
      createdAt: new Date().toISOString(),
    };
    if (editingPostId) {
      setRecentPosts((prev) => prev.map((p) => (p.id === editingPostId ? { ...p, ...payload } : p)));
    } else {
      setRecentPosts((prev) => [payload, ...prev]);
    }
    setPostModalOpen(false);
    resetPostForm();
  };

  const deletePost = (id) => {
    if (window.confirm('Delete this post?')) setRecentPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const openMultiPostModal = () => {
    resetMultiPostForm();
    setMultiPostModalOpen(true);
  };

  const submitMultiPost = () => {
    if (selectedPlatforms.length === 0) return;
    const schedule = buildScheduleFromForm(multiPostForm);
    const mediaUrl = multiPostForm.mediaUrl || (multiPostForm.mediaFile ? URL.createObjectURL(multiPostForm.mediaFile) : '');
    const baseId = 'post_multi_' + Date.now();
    const newPosts = selectedPlatforms.map((pid, i) => ({
      id: baseId + '_' + pid + '_' + i,
      platformId: pid,
      title: multiPostForm.title || undefined,
      content: multiPostForm.content,
      hashtags: multiPostForm.hashtags?.trim() || undefined,
      mediaUrl: mediaUrl || undefined,
      propertyId: multiPostForm.propertyId || undefined,
      propertyLabel: multiPostForm.propertyLabel || undefined,
      schedule,
      createdAt: new Date().toISOString(),
    }));
    setRecentPosts((prev) => [...newPosts, ...prev]);
    setMultiPostModalOpen(false);
    resetMultiPostForm();
    if (cameFromListingsRef.current) {
      cameFromListingsRef.current = false;
      navigate('/listing-management');
    }
  };

  const togglePlatformSelection = (platformId) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]
    );
  };

  const net = SOCIAL_NETWORKS.find((n) => n.id === platformTab) || SOCIAL_NETWORKS[0];
  const accounts = linkedAccountsByPlatform[platformTab] || [];
  const platformId = platformTab;
  const hasLinkedAccounts = accounts.length > 0;

  return (
    <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      <Sidebar />
      <main className="dashboard-main" style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>{isAdmin ? 'Admin · Marketing' : 'Marketing'}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {activePlatforms.length > 0 && (
            <button type="button" onClick={openMultiPostModal} style={{ ...styles.addBtn, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-share-alt" /> Multi-post
            </button>
          )}
          <Link to="/dashboard" style={styles.backBtn}>Back to Dashboard</Link>
        </div>
      </div>

      <div style={styles.contentBox}>
        <div style={styles.platformTabBar}>
          {SOCIAL_NETWORKS.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setPlatformTab(n.id)}
              style={platformTab === n.id ? { ...styles.platformTab, ...styles.platformTabActive } : styles.platformTab}
            >
              <i className={n.icon} style={{ marginRight: 8 }} />{n.label}
            </button>
          ))}
        </div>

        {accounts.length === 0 ? (
          <div style={{ background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }}><i className={net.icon} /></div>
            <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#334155' }}>No {net.label} accounts connected</p>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>Connect an account to publish and manage content from here.</p>
            <button type="button" onClick={() => setLinkAccountPopupPlatform(platformId)} style={styles.addBtn}>+ Link Account</button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {hasLinkedAccounts && (
                  <button type="button" onClick={openCreatePost} style={styles.addBtn}>
                    <i className="fas fa-plus" style={{ marginRight: 8 }} /> Post
                  </button>
                )}
                {hasLinkedAccounts && (
                  <button type="button" onClick={() => setActionModalOpen(true)} style={styles.addBtn}>
                    <i className="fas fa-plus" style={{ marginRight: 8 }} /> Action
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setLinkAccountPopupPlatform(platformId)} style={{ ...styles.actionBtnBase, ...styles.viewBtn }}>+ Link Account</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {accounts.map((acc) => (
                <div key={acc.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: brand.darkTeal }}>
                      <i className={net.icon} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{acc.handle || acc.username || 'Connected account'}</span>
                        <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 600 }}><i className="fas fa-check-circle" /> Connected</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>Connected since {acc.connectedAt || new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (acc.source === 'outstand' && acc.id) {
                        try {
                          await api.delete(`/api/outstand/accounts/${encodeURIComponent(acc.id)}`);
                        } catch (e) {
                          window.alert(e.response?.data?.message || e.message || 'Disconnect failed');
                          return;
                        }
                      }
                      setLinkedAccountsByPlatform((prev) => ({
                        ...prev,
                        [platformId]: (prev[platformId] || []).filter((a) => a.id !== acc.id),
                      }));
                    }}
                    style={{ ...styles.actionBtnBase, ...styles.delBtn }}
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>

            <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#64748b' }}>Recent posts</h4>
              {recentPosts.filter((p) => p.platformId === platformId).length === 0 ? (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>No posts yet. Use Post to create one.</p>
              ) : (
                <div>
                  {recentPosts.filter((p) => p.platformId === platformId).map((p) => (
                    <div key={p.id} style={styles.postCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          {p.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>}
                          <div style={{ fontSize: 14, color: '#475569', whiteSpace: 'pre-wrap' }}>{[p.content, p.hashtags].filter(Boolean).join('\n\n') || '—'}</div>
                          {(p.mediaUrl || p.propertyLabel) && (
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                              {p.mediaUrl && <span>Media · </span>}
                              {p.propertyLabel && <span>Property: {p.propertyLabel}</span>}
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Scheduled: {formatSchedule(p)}</div>
                          {(() => {
                            const m = getSimulatedMetrics(p.id);
                            return (
                              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#64748b' }}>
                                <span><i className="fas fa-eye" style={{ marginRight: 4 }} />{m.views} views</span>
                                <span><i className="fas fa-heart" style={{ marginRight: 4 }} />{m.likes} likes</span>
                                <span><i className="fas fa-comment" style={{ marginRight: 4 }} />{m.comments} comments</span>
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => openEditPost(p)} style={{ ...styles.actionBtnBase, ...styles.viewBtn }}>Edit</button>
                          <button type="button" onClick={() => deletePost(p.id)} style={{ ...styles.actionBtnBase, ...styles.delBtn }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Link Account modal */}
      {linkAccountPopupPlatform && (() => {
        const popupNet = SOCIAL_NETWORKS.find((n) => n.id === linkAccountPopupPlatform) || SOCIAL_NETWORKS[0];
        const startOutstandLink = async () => {
          if (linkAccountPopupPlatform === 'email') {
            window.alert('Email is not connected via Outstand. Configure social networks in Outstand (BYOK) first, then link accounts here.');
            return;
          }
          const net = mapPlatformToOutstandNetwork(linkAccountPopupPlatform);
          setLinkBusy(true);
          try {
            const redirectUri = `${window.location.origin}/outstand/oauth-callback`;
            const res = await api.post('/api/outstand/auth-url', { network: net, redirectUri });
            const url = res.data?.url;
            if (!url) throw new Error('No authorization URL returned');
            window.location.assign(url);
          } catch (e) {
            window.alert(e.response?.data?.message || e.response?.data?.details?.error || e.message || 'Could not start connection');
            setLinkBusy(false);
          }
        };
        return (
          <div style={styles.modalOverlay} onClick={() => !linkBusy && setLinkAccountPopupPlatform(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginTop: 0, color: brand.darkTeal }}>Link {popupNet.label} account</h2>
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14 }}>
                You’ll be sent to {popupNet.label} (via Outstand) to authorize. Ensure this app’s callback URL{' '}
                <strong>{typeof window !== 'undefined' ? `${window.location.origin}/outstand/oauth-callback` : '/outstand/oauth-callback'}</strong>{' '}
                is allowed in your Outstand / Meta / X developer settings where required.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" disabled={linkBusy} onClick={() => setLinkAccountPopupPlatform(null)} style={styles.cancelBtn}>Cancel</button>
                <button type="button" disabled={linkBusy} onClick={startOutstandLink} style={styles.addBtn}>
                  {linkBusy ? 'Redirecting…' : 'Continue to connect'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Action modal: trigger (on like / on comment) + actions (like back, send property ad, send message) */}
      {actionModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setActionModalOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: brand.darkTeal }}>+ Action</h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>When someone interacts with your post, run these actions automatically.</p>

            <label style={styles.label}>Trigger</label>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="radio" name="actionTrigger" checked={actionForm.trigger === 'on_like'} onChange={() => setActionForm((f) => ({ ...f, trigger: 'on_like' }))} />
                On like
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="radio" name="actionTrigger" checked={actionForm.trigger === 'on_comment'} onChange={() => setActionForm((f) => ({ ...f, trigger: 'on_comment' }))} />
                On comment
              </label>
            </div>

            <label style={styles.label}>Actions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={actionForm.likeBack} onChange={(e) => setActionForm((f) => ({ ...f, likeBack: e.target.checked }))} />
                Like back
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={actionForm.sendPropertyAd} onChange={(e) => setActionForm((f) => ({ ...f, sendPropertyAd: e.target.checked }))} />
                Send property ad
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={actionForm.sendMessage} onChange={(e) => setActionForm((f) => ({ ...f, sendMessage: e.target.checked }))} />
                Send message
              </label>
            </div>

            {actionForm.sendMessage && (
              <>
                <label style={styles.label}>Message</label>
                <textarea
                  style={styles.textarea}
                  value={actionForm.messageText}
                  onChange={(e) => setActionForm((f) => ({ ...f, messageText: e.target.value }))}
                  placeholder="e.g. Thanks for engaging! Here’s a property you might like."
                  rows={3}
                />
              </>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setActionModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
              <button type="button" onClick={() => { setActionModalOpen(false); /* TODO: persist rule */ }} style={styles.addBtn}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-platform post modal */}
      {multiPostModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h2 style={{ margin: 0, color: brand.darkTeal }}>Post to multiple platforms</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b' }}>Complete the post once, choose platforms, preview, then submit.</p>
              </div>
              <button type="button" onClick={closeMultiPostModal} style={{ background: 'none', border: 'none', fontSize: 24, color: '#64748b', cursor: 'pointer', padding: 4, lineHeight: 1 }} aria-label="Close">&times;</button>
            </div>

            <label style={styles.label}>Title (optional)</label>
            <input style={styles.input} value={multiPostForm.title} onChange={(e) => setMultiPostForm((f) => ({ ...f, title: e.target.value }))} placeholder="Post title" />

            <label style={styles.label}>Contents / Caption</label>
            <textarea style={styles.textarea} value={multiPostForm.content} onChange={(e) => setMultiPostForm((f) => ({ ...f, content: e.target.value }))} placeholder="Write your caption..." />

            <label style={styles.label}>Hashtags</label>
            <input style={styles.input} value={multiPostForm.hashtags} onChange={(e) => setMultiPostForm((f) => ({ ...f, hashtags: e.target.value }))} placeholder="#luxury #realestate" />

            <div style={styles.sectionTitle}>Media</div>
            <div style={styles.row}>
              <input type="file" accept="image/*,video/*" onChange={(e) => setMultiPostForm((f) => ({ ...f, mediaFile: e.target.files?.[0] || null, mediaUrl: '' }))} />
              <span style={{ color: '#64748b', fontSize: 13 }}>or URL:</span>
              <input style={{ ...styles.input, flex: 1, marginBottom: 0 }} value={multiPostForm.mediaUrl} onChange={(e) => setMultiPostForm((f) => ({ ...f, mediaUrl: e.target.value }))} placeholder="https://..." />
            </div>

            <label style={styles.label}>Link a property (optional)</label>
            <select
              style={styles.input}
              value={multiPostForm.propertyId || ''}
              onChange={(e) => {
                const id = e.target.value;
                const listing = listings.find((l) => l._id === id);
                setMultiPostForm((f) => ({
                  ...f,
                  propertyId: id,
                  propertyLabel: listing ? dedupePropertyTitle(listing.title || listing.location || listing.address || id) : '',
                  mediaUrl: '', mediaFile: null,
                }));
              }}
            >
              <option value="">None</option>
              {multiPostForm.propertyId && !listings.some((p) => p._id === multiPostForm.propertyId) && (
                <option value={multiPostForm.propertyId}>{multiPostForm.propertyLabel || multiPostForm.propertyId}</option>
              )}
              {listings.map((p) => (
                <option key={p._id} value={p._id}>{dedupePropertyTitle(p.title || p.location || p.address || p._id)}</option>
              ))}
            </select>

            {multiPostForm.propertyId && (() => {
              const listing = listings.find((l) => l._id === multiPostForm.propertyId);
              const imgs = [];
              const addIfNew = (url) => { if (url && !imgs.includes(url)) imgs.push(url); };
              addIfNew(listing?.imageUrl);
              addIfNew(listing?.media?.coverImage);
              if (Array.isArray(listing?.media?.imageGallery)) listing.media.imageGallery.forEach(addIfNew);
              if (imgs.length === 0) return null;
              return (
                <div style={{ marginTop: 12 }}>
                  <div style={{ ...styles.label, marginBottom: 8 }}>Use a property photo</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {imgs.map((url) => {
                      const isSelected = multiPostForm.mediaUrl === url && !multiPostForm.mediaFile;
                      return (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setMultiPostForm((f) => ({ ...f, mediaUrl: url, mediaFile: null }))}
                          style={{
                            padding: 0,
                            border: `2px solid ${isSelected ? brand.darkTeal : '#e2e8f0'}`,
                            borderRadius: 8,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            background: 'none',
                            flexShrink: 0,
                          }}
                          title="Select this photo"
                        >
                          <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', display: 'block' }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div style={styles.sectionTitle}>Schedule</div>
            <div style={styles.row}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="multiScheduleType" checked={multiPostForm.scheduleType === 'once'} onChange={() => setMultiPostForm((f) => ({ ...f, scheduleType: 'once' }))} />
                One-time
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="multiScheduleType" checked={multiPostForm.scheduleType === 'recurring'} onChange={() => setMultiPostForm((f) => ({ ...f, scheduleType: 'recurring' }))} />
                Recurring
              </label>
            </div>
            {multiPostForm.scheduleType === 'once' ? (
              <div style={styles.row}>
                <input style={styles.input} type="datetime-local" value={multiPostForm.scheduleAt} onChange={(e) => setMultiPostForm((f) => ({ ...f, scheduleAt: e.target.value }))} />
                <input style={styles.input} type="time" value={multiPostForm.scheduleTime} onChange={(e) => setMultiPostForm((f) => ({ ...f, scheduleTime: e.target.value }))} />
              </div>
            ) : (
              <div>
                <div style={styles.row}>
                  <label style={styles.label}>Times per week</label>
                  <input style={{ ...styles.input, width: 80 }} type="number" min={1} max={7} value={multiPostForm.recurringTimesPerWeek} onChange={(e) => setMultiPostForm((f) => ({ ...f, recurringTimesPerWeek: Number(e.target.value) || 1 }))} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={multiPostForm.recurringEveryDay} onChange={(e) => setMultiPostForm((f) => ({ ...f, recurringEveryDay: e.target.checked }))} />
                  Every day
                </label>
                {!multiPostForm.recurringEveryDay && (
                  <div style={styles.row}>
                    {DAYS.map((day, i) => (
                      <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                        <input type="checkbox" checked={multiPostForm.recurringDays.includes(i)} onChange={(e) => setMultiPostForm((f) => ({ ...f, recurringDays: e.target.checked ? [...f.recurringDays, i] : f.recurringDays.filter((d) => d !== i) }))} />
                        {day.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                )}
                <div style={styles.row}>
                  <label style={styles.label}>Time</label>
                  <input style={styles.input} type="time" value={multiPostForm.recurringTime} onChange={(e) => setMultiPostForm((f) => ({ ...f, recurringTime: e.target.value }))} />
                </div>
                <div style={styles.row}>
                  <label style={styles.label}>Start date</label>
                  <input style={styles.input} type="date" value={multiPostForm.recurringStartDate} onChange={(e) => setMultiPostForm((f) => ({ ...f, recurringStartDate: e.target.value }))} />
                  <label style={styles.label}>End date</label>
                  <input style={styles.input} type="date" value={multiPostForm.recurringEndDate} onChange={(e) => setMultiPostForm((f) => ({ ...f, recurringEndDate: e.target.value }))} />
                </div>
              </div>
            )}

            <div style={{ ...styles.sectionTitle, marginTop: 24 }}>Post to</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              {activePlatforms.map((n) => (
                <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', background: selectedPlatforms.includes(n.id) ? '#f0fdfa' : '#f1f5f9', borderRadius: 8, border: `2px solid ${selectedPlatforms.includes(n.id) ? brand.darkTeal : '#e2e8f0'}` }}>
                  <input type="checkbox" checked={selectedPlatforms.includes(n.id)} onChange={() => togglePlatformSelection(n.id)} />
                  <i className={n.icon} style={{ color: selectedPlatforms.includes(n.id) ? brand.darkTeal : '#64748b' }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{n.label}</span>
                </label>
              ))}
            </div>

            <div style={{ ...styles.sectionTitle, marginTop: 16 }}>Preview</div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>How your post will look on each selected platform:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {selectedPlatforms.length === 0 ? (
                <div style={{ padding: 24, background: '#f8fafc', borderRadius: 12, color: '#64748b', fontSize: 14 }}>Select at least one platform above to see previews.</div>
              ) : (
                selectedPlatforms.map((pid) => {
                  const PreviewCard = getPreviewComponent(pid);
                  const accs = linkedAccountsByPlatform[pid] || [];
                  const username = accs[0]?.handle || accs[0]?.username || 'username';
                  const caption = [multiPostForm.title, multiPostForm.content, multiPostForm.hashtags].filter(Boolean).join('\n\n');
                  const mediaUrl = multiPostPreviewObjectUrl || (multiPostForm.mediaUrl || '').trim() || null;
                  const net = SOCIAL_NETWORKS.find((n) => n.id === pid);
                  if (pid === 'email') {
                    return (
                      <div key={pid}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>{net?.label}</div>
                        <EmailPreviewCard title={multiPostForm.title} caption={[multiPostForm.content, multiPostForm.hashtags].filter(Boolean).join('\n\n')} />
                      </div>
                    );
                  }
                  return (
                    <div key={pid}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>{net?.label}</div>
                      <PreviewCard username={username} caption={caption} mediaUrl={mediaUrl} locationLabel={multiPostForm.propertyLabel || undefined} />
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
              <button type="button" onClick={closeMultiPostModal} style={styles.cancelBtn}>Cancel</button>
              <button type="button" onClick={submitMultiPost} disabled={selectedPlatforms.length === 0} style={{ ...styles.addBtn, opacity: selectedPlatforms.length === 0 ? 0.6 : 1, cursor: selectedPlatforms.length === 0 ? 'not-allowed' : 'pointer' }}>Submit to {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Post modal (Instagram example) */}
      {postModalOpen && (
        <div style={styles.modalOverlay} onClick={() => { setPostModalOpen(false); setPreviewOpen(false); resetPostForm(); }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: brand.darkTeal }}>{editingPostId ? 'Edit post' : 'New post'} ({net.label})</h2>

            <label style={styles.label}>Title (optional)</label>
            <input style={styles.input} value={postForm.title} onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))} placeholder="Post title" />

            <label style={styles.label}>Contents / Caption</label>
            <textarea style={styles.textarea} value={postForm.content} onChange={(e) => setPostForm((f) => ({ ...f, content: e.target.value }))} placeholder="Write your caption..." />

            <label style={styles.label}>Hashtags</label>
            <input style={styles.input} value={postForm.hashtags} onChange={(e) => setPostForm((f) => ({ ...f, hashtags: e.target.value }))} placeholder="#luxury #realestate #property" />

            <div style={styles.sectionTitle}>Media</div>
            <div style={styles.row}>
              <input type="file" accept="image/*,video/*" onChange={(e) => setPostForm((f) => ({ ...f, mediaFile: e.target.files?.[0] || null }))} />
              <span style={{ color: '#64748b', fontSize: 13 }}>or paste URL:</span>
              <input style={{ ...styles.input, flex: 1, marginBottom: 0 }} value={postForm.mediaUrl} onChange={(e) => setPostForm((f) => ({ ...f, mediaUrl: e.target.value }))} placeholder="https://..." />
            </div>

            <label style={styles.label}>Link a property (optional)</label>
            <select
              style={styles.input}
              value={postForm.propertyId || ''}
              onChange={(e) => {
                const id = e.target.value;
                const listing = listings.find((l) => l._id === id);
                setPostForm((f) => ({
                  ...f,
                  propertyId: id,
                  propertyLabel: listing ? dedupePropertyTitle(listing.title || listing.location || listing.address || id) : '',
                }));
              }}
            >
              <option value="">None</option>
              {listingsLoading ? (
                <option disabled>Loading listings…</option>
              ) : (
                <>
                  {postForm.propertyId && !listings.some((p) => p._id === postForm.propertyId) && (
                    <option value={postForm.propertyId}>{postForm.propertyLabel || postForm.propertyId}</option>
                  )}
                  {listings.map((p) => (
                    <option key={p._id} value={p._id}>
                      {dedupePropertyTitle(p.title || p.location || p.address || p._id)}
                    </option>
                  ))}
                </>
              )}
            </select>

            <div style={styles.sectionTitle}>Schedule</div>
            <div style={styles.row}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="scheduleType" checked={postForm.scheduleType === 'once'} onChange={() => setPostForm((f) => ({ ...f, scheduleType: 'once' }))} />
                One-time
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="scheduleType" checked={postForm.scheduleType === 'recurring'} onChange={() => setPostForm((f) => ({ ...f, scheduleType: 'recurring' }))} />
                Recurring
              </label>
            </div>
            {postForm.scheduleType === 'once' ? (
              <div style={styles.row}>
                <input style={styles.input} type="datetime-local" value={postForm.scheduleAt} onChange={(e) => setPostForm((f) => ({ ...f, scheduleAt: e.target.value }))} />
                <input style={styles.input} type="time" value={postForm.scheduleTime} onChange={(e) => setPostForm((f) => ({ ...f, scheduleTime: e.target.value }))} />
              </div>
            ) : (
              <div>
                <div style={styles.row}>
                  <label style={styles.label}>Times per week</label>
                  <input style={{ ...styles.input, width: 80 }} type="number" min={1} max={7} value={postForm.recurringTimesPerWeek} onChange={(e) => setPostForm((f) => ({ ...f, recurringTimesPerWeek: Number(e.target.value) || 1 }))} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={postForm.recurringEveryDay} onChange={(e) => setPostForm((f) => ({ ...f, recurringEveryDay: e.target.checked }))} />
                  Every day
                </label>
                {!postForm.recurringEveryDay && (
                  <div style={styles.row}>
                    {DAYS.map((day, i) => (
                      <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                        <input type="checkbox" checked={postForm.recurringDays.includes(i)} onChange={(e) => setPostForm((f) => ({ ...f, recurringDays: e.target.checked ? [...f.recurringDays, i] : f.recurringDays.filter((d) => d !== i) }))} />
                        {day.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                )}
                <div style={styles.row}>
                  <label style={styles.label}>Time</label>
                  <input style={styles.input} type="time" value={postForm.recurringTime} onChange={(e) => setPostForm((f) => ({ ...f, recurringTime: e.target.value }))} />
                </div>
                <div style={styles.row}>
                  <label style={styles.label}>Start date</label>
                  <input style={styles.input} type="date" value={postForm.recurringStartDate} onChange={(e) => setPostForm((f) => ({ ...f, recurringStartDate: e.target.value }))} />
                  <label style={styles.label}>End date</label>
                  <input style={styles.input} type="date" value={postForm.recurringEndDate} onChange={(e) => setPostForm((f) => ({ ...f, recurringEndDate: e.target.value }))} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setPreviewOpen(true)} style={styles.cancelBtn}>Preview</button>
              <button type="button" onClick={() => { setPostModalOpen(false); setPreviewOpen(false); resetPostForm(); }} style={styles.cancelBtn}>Cancel</button>
              <button type="button" onClick={submitPost} style={styles.addBtn}>{editingPostId ? 'Save' : 'Post'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal — platform-specific preview (Instagram / X / LinkedIn / Email look & feel) */}
      {previewOpen && (() => {
        const previewMediaUrl = previewMediaObjectUrl || (postForm.mediaUrl || '').trim() || null;
        const scheduleLabel = formatScheduleFromForm(postForm);
        const accounts = linkedAccountsByPlatform[platformId] || [];
        const previewUsername = accounts[0]?.handle || accounts[0]?.username || 'ipm_demo';
        const caption = [postForm.title, postForm.content, postForm.hashtags].filter(Boolean).join('\n\n');
        const net = SOCIAL_NETWORKS.find((n) => n.id === platformId) || SOCIAL_NETWORKS[0];
        const PreviewCard = getPreviewComponent(platformId);
        const isEmail = platformId === 'email';
        return (
          <div style={styles.modalOverlay} onClick={() => setPreviewOpen(false)}>
            <div style={{ ...styles.modalContent, maxWidth: 520, padding: '24px 24px 20px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: brand.darkTeal, fontSize: 18 }}>Preview · {net.label}</h3>
                <button type="button" onClick={() => setPreviewOpen(false)} style={{ ...styles.cancelBtn, marginTop: 0 }}>Close</button>
              </div>
              {isEmail ? (
                <EmailPreviewCard title={postForm.title} caption={[postForm.content, postForm.hashtags].filter(Boolean).join('\n\n')} />
              ) : (
                <PreviewCard
                  username={previewUsername}
                  caption={caption}
                  mediaUrl={previewMediaUrl}
                  locationLabel={postForm.propertyLabel || undefined}
                />
              )}
              {scheduleLabel && (
                <div style={{ marginTop: 16, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#64748b' }}>
                  <strong style={{ color: '#475569' }}>Schedule:</strong> {scheduleLabel}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
      </main>
    </div>
  );
}
