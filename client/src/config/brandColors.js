/**
 * Brand colors for dashboards and app UI. Use these instead of hardcoded hex.
 */
export const brand = {
  primary: '#1F4B43',
  primaryLight: '#115e59',
  primaryMuted: '#0d9488',
  muted: '#64748b',
  mutedLight: '#9ca3af',
  text: '#334155',
  textLight: '#64748b',
  border: '#e2e8f0',
  background: '#f8fafc',
};

/** Status pill colors (Market Trends GOOD / EXCELLENT / STABLE / CAUTION) – brand-aligned */
export function getStatusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'excellent') return brand.primaryMuted;
  if (s === 'good') return '#059669';
  if (s === 'stable') return '#475569';
  if (s === 'caution') return '#0f766e';
  return brand.primary;
}
