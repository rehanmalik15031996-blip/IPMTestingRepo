// Load real monthly data + YoY actuals. Returns { countryName: array | { monthlyData, yoyPercent?, _source? } }.
// Supports year-keyed format ("2023", "2024") and normalizes to latest year's monthlyData + computed YoY.
const path = require('path');
const fs = require('fs');

let _cache = null;

function normalizeMarketTrendFromRaw(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return { monthlyData: raw };
  if (raw.monthlyData && Array.isArray(raw.monthlyData)) return { monthlyData: raw.monthlyData, yoyPercent: raw.yoyPercent, _source: raw._source };
  const yearKeys = Object.keys(raw).filter((k) => /^\d{4}$/.test(k)).sort().reverse();
  if (yearKeys.length === 0) return null;
  const latestYear = yearKeys[0];
  const monthlyData = raw[latestYear];
  if (!Array.isArray(monthlyData) || monthlyData.length === 0) return null;
  let yoyPercent = raw.yoyPercent;
  if (yearKeys.length >= 2) {
    const prevYear = raw[yearKeys[1]];
    if (Array.isArray(prevYear) && prevYear.length > 0) {
      const lastPrev = prevYear[prevYear.length - 1].value;
      const lastCur = monthlyData[monthlyData.length - 1].value;
      if (lastPrev != null && lastPrev !== 0) {
        const pct = ((lastCur - lastPrev) / lastPrev) * 100;
        yoyPercent = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
      }
    }
  }
  return { monthlyData, yoyPercent, _source: raw._source };
}

function loadMarketTrendsMonthly() {
  if (_cache) return _cache;
  try {
    const filePath = path.join(__dirname, 'marketTrendsMonthly.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    const out = {};
    for (const key of Object.keys(data)) {
      if (key.startsWith('_')) continue;
      const v = data[key];
      const normalized = normalizeMarketTrendFromRaw(v);
      if (normalized && normalized.monthlyData && normalized.monthlyData.length > 0) out[key] = normalized;
    }
    _cache = out;
    return out;
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') console.warn('[marketTrendsMonthly] Could not load:', e.message);
    _cache = {};
    return {};
  }
}

module.exports = { loadMarketTrendsMonthly };
