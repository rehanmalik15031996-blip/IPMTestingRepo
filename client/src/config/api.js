// API Configuration
// This file centralizes all API endpoint configuration

import axios from 'axios';
import { invalidateDashboardCache } from './dashboardCache';

// For Vercel deployment and local dev with Vercel CLI, use relative paths (same domain)
// This works both locally (with `vercel dev`) and in production
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function clearAuthHeader(config) {
  const h = config.headers;
  if (!h) return;
  if (typeof h.delete === 'function') h.delete('Authorization');
  delete h.Authorization;
}

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    try {
      // Only for truly public reads (e.g. marketing home). Never set for all GET /api/properties — breaks agent dashboards.
      if (config.publicRequest === true) {
        clearAuthHeader(config);
        return config;
      }
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const token = user?.token ?? (user?.user && user.user.token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
    } catch (err) {
      console.warn('Error parsing user from localStorage:', err);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: on 401, clear session and redirect to login so user can get a fresh token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/api/auth/login');
    if (status === 401 && !isLoginRequest) {
      try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user?._id) invalidateDashboardCache(user._id);
      } catch (_) {}
      localStorage.removeItem('user');
      window.location.href = '/login?session=expired';
      return Promise.reject(error);
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
