import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../config/api';

export default function OutstandOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [err, setErr] = useState('');

  useEffect(() => {
    const session = searchParams.get('session');
    if (!session) {
      setErr('Missing session. Go back to Marketing and use “Link account” again.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const pend = await api.get(`/api/outstand/pending/${encodeURIComponent(session)}`);
        if (cancelled) return;
        const payload = pend.data?.data ?? pend.data;
        const pages = payload?.availablePages || [];
        const ids = pages.map((p) => p.id).filter(Boolean);
        if (!ids.length) {
          setErr(
            'No selectable pages were returned for this network. Finish connecting in the Outstand dashboard, or check your Meta/X OAuth app redirect URLs match this app.',
          );
          return;
        }
        const fin = await api.post(`/api/outstand/finalize/${encodeURIComponent(session)}`, {
          selectedPageIds: ids,
        });
        if (cancelled) return;
        if (fin.data?.success === false) {
          throw new Error(fin.data?.error || fin.data?.message || 'Finalize failed');
        }
        const connected = fin.data?.connectedAccounts;
        if (!Array.isArray(connected) || connected.length === 0) {
          if (!fin.data?.success) {
            throw new Error(fin.data?.error || fin.data?.message || 'No accounts were connected');
          }
        }
        let marketingPath = '/marketing';
        try {
          const u = JSON.parse(localStorage.getItem('user') || 'null');
          if (u && String(u.role || '').toLowerCase() === 'admin') marketingPath = '/admin/marketing';
        } catch (_) {}
        navigate(`${marketingPath}?outstand=connected`, { replace: true });
      } catch (e) {
        if (!cancelled) {
          setErr(e.response?.data?.message || e.response?.data?.error || e.message || 'Connection failed');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  return (
    <div style={{ padding: 48, textAlign: 'center', fontFamily: 'sans-serif', maxWidth: 520, margin: '0 auto' }}>
      {err ? (
        <>
          <h2 style={{ color: '#11575C' }}>Could not connect account</h2>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>{err}</p>
          <button
            type="button"
            onClick={() => navigate('/marketing')}
            style={{
              marginTop: 16,
              background: '#11575C',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Marketing
          </button>
        </>
      ) : (
        <>
          <p style={{ color: '#475569', fontSize: 16 }}>Finishing connection…</p>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Please wait.</p>
        </>
      )}
    </div>
  );
}
