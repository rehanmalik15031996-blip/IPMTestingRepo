import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../config/api';

export default function RegistrationSuccess() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;
    api.post('/api/stripe-checkout-success', { session_id: sessionId })
      .then((res) => {
        if (res.data?.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
          window.location.href = '/dashboard?r=' + Date.now();
        }
      })
      .catch(() => {});
  }, [searchParams]);

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center'
    }}>
      <h1 style={{ marginBottom: 16 }}>You're all set</h1>
      <p style={{ marginBottom: 24, maxWidth: 420 }}>
        Your account is active. February and March are free; your first subscription charge will be on April 1.
      </p>
      <Link to="/login" style={{ color: 'var(--primary, #0066cc)', fontWeight: 600 }}>
        Go to login
      </Link>
    </div>
  );
}
