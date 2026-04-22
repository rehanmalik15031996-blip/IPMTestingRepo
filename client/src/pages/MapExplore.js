import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import api from '../config/api';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

// Default center (Dubai) when no property coordinates
const DEFAULT_CENTER = [55.2708, 25.2048];
const DEFAULT_ZOOM = 12;

const PROPERTY_TYPES = [
  { id: 'house', label: 'House', icon: 'fa-house' },
  { id: 'commercial', label: 'Commercial', icon: 'fa-building' },
  { id: 'apartment', label: 'Apartment', icon: 'fa-building-user' },
  { id: 'land', label: 'Land Plot', icon: 'fa-map-location-dot' },
];

const ROOM_OPTIONS = ['1', '2', '3', '4', '5+'];

const styles = {
  layout: {
    display: 'flex',
    height: 'calc(100vh - 56px)',
    overflow: 'hidden',
  },
  sidebar: {
    width: 280,
    minWidth: 280,
    background: '#fff',
    boxShadow: '2px 0 12px rgba(0,0,0,0.06)',
    padding: '20px 16px',
    overflowY: 'auto',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 10,
    display: 'block',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  typeBtn: {
    padding: '10px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: '#333',
    transition: 'all 0.2s',
  },
  typeBtnActive: {
    background: '#2563eb',
    borderColor: '#2563eb',
    color: '#fff',
  },
  roomRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1px solid #e0e0e0',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: '#333',
    transition: 'all 0.2s',
  },
  roomBtnActive: {
    background: '#2563eb',
    borderColor: '#2563eb',
    color: '#fff',
  },
  sliderWrap: {
    padding: '8px 0',
  },
  budgetText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 8,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    cursor: 'pointer',
    fontSize: 14,
    color: '#333',
  },
  applyBtn: {
    width: '100%',
    padding: '12px 20px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 24,
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
    minWidth: 0,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  popupCard: {
    width: 280,
    background: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  popupImage: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
    background: '#f0f0f0',
  },
  popupBody: {
    padding: 12,
  },
  popupPrice: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  popupSpecs: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  popupAddress: {
    fontSize: 12,
    color: '#888',
  },
  popupLink: {
    display: 'inline-block',
    marginTop: 10,
    fontSize: 13,
    fontWeight: 600,
    color: '#2563eb',
    textDecoration: 'none',
  },
  noToken: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
    color: '#666',
    padding: 24,
    textAlign: 'center',
  },
};

function getPropertyCoords(property) {
  const lat = property?.locationDetails?.coordinates?.lat;
  const lng = property?.locationDetails?.coordinates?.lng;
  if (lat != null && lng != null) return [lng, lat];
  return null;
}

function getPropertyImage(property) {
  return property?.media?.coverImage || property?.imageUrl || property?.media?.imageGallery?.[0] || '';
}

function getPrice(property) {
  const p = property?.pricing?.askingPrice ?? property?.pricing?.monthlyRental;
  if (p != null) return p;
  const str = property?.price;
  if (!str) return null;
  const num = parseFloat(String(str).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
}

function formatPrice(property) {
  const p = getPrice(property);
  if (p == null) return property?.price || '—';
  const currency = property?.pricing?.currency || 'USD';
  if (property?.pricing?.monthlyRental != null) return `${currency} ${p.toLocaleString()} / month`;
  return `${currency} ${p.toLocaleString()}`;
}

function getBeds(property) {
  return property?.residential?.bedrooms ?? property?.specs?.beds ?? null;
}

function getBaths(property) {
  return property?.residential?.bathrooms ?? property?.specs?.baths ?? null;
}

function getSqft(property) {
  return property?.residential?.livingAreaSize ?? property?.propertySize?.size ?? property?.specs?.sqft ?? null;
}

function getAddress(property) {
  return property?.locationDetails?.streetAddress || property?.location || '';
}

export default function MapExplore() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    propertyType: null,
    budgetMin: 0,
    budgetMax: 10000,
    beds: null,
    baths: null,
    furnished: false,
    petAllowed: false,
    shared: false,
  });
  const [selectedProperty, setSelectedProperty] = useState(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/properties');
      setProperties(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const filtered = properties.filter((p) => {
    if (filters.propertyType) {
      const cat = (p.propertyCategory || p.listingType || '').toLowerCase();
      const type = (p.type || '').toLowerCase();
      if (filters.propertyType === 'house' && !cat.includes('residential') && !type.includes('villa') && !type.includes('house')) return false;
      if (filters.propertyType === 'commercial' && !cat.includes('commercial')) return false;
      if (filters.propertyType === 'apartment' && !type.includes('apartment') && !type.includes('flat')) return false;
      if (filters.propertyType === 'land' && !cat.includes('land')) return false;
    }
    const price = getPrice(p);
    if (price != null && (price < filters.budgetMin || price > filters.budgetMax)) return false;
    const beds = getBeds(p);
    if (filters.beds != null && beds != null && beds < parseInt(filters.beds, 10) && filters.beds !== '5+') return false;
    if (filters.beds === '5+' && beds != null && beds < 5) return false;
    const baths = getBaths(p);
    if (filters.baths != null && baths != null && baths < parseInt(filters.baths, 10) && filters.baths !== '5+') return false;
    if (filters.baths === '5+' && baths != null && baths < 5) return false;
    return true;
  });

  const withCoords = filtered.filter((p) => getPropertyCoords(p));

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || !withCoords.length) return;

    if (!mapRef.current) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/standard',
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapRef.current = map;
    }

    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();

    withCoords.forEach((property) => {
      const coords = getPropertyCoords(property);
      if (!coords) return;

      const el = document.createElement('div');
      el.className = 'mapbox-marker-house';
      el.innerHTML = '<span style="font-size:24px">🏠</span>';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);

      el.addEventListener('click', () => {
        setSelectedProperty(property);
        popupRef.current?.remove();
        const popup = new mapboxgl.Popup({ offset: 25, closeButton: true })
          .setLngLat(coords)
          .setDOMContent(document.createElement('div'));
        const card = document.createElement('div');
        card.style.cssText = 'min-width:260px;';
        const img = getPropertyImage(property);
        const isDevelopment = String(property?.propertyCategory || '').toLowerCase() === 'development';
        const specsLine = isDevelopment ? '' : ([getBeds(property), getBaths(property), getSqft(property)].filter(Boolean).join(' · ') || '—');
        card.innerHTML = `
          <div style="width:100%;height:140px;background:#eee;border-radius:8px 8px 0 0;overflow:hidden">
            ${img ? `<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover" />` : ''}
          </div>
          <div style="padding:12px">
            <div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${formatPrice(property)}</div>
            ${specsLine ? `<div style="font-size:13px;color:#666;margin-bottom:4px">${specsLine}</div>` : ''}
            <div style="font-size:12px;color:#888">${getAddress(property) || '—'}</div>
            <a href="/property/${property._id}" style="display:inline-block;margin-top:8px;font-size:13px;font-weight:600;color:#2563eb">View details →</a>
          </div>
        `;
        popup.setDOMContent(card);
        popup.addTo(map);
        popupRef.current = popup;
        popup.on('close', () => setSelectedProperty(null));
      });

      markersRef.current.push(marker);
      bounds.extend(coords);
    });

    if (withCoords.length > 0 && withCoords.length < 100) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withCoords.map((p) => p._id).join(','), properties.length]);

  if (!MAPBOX_TOKEN) {
    return (
      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Explore on Map</div>
          <p style={{ fontSize: 14, color: '#666' }}>Filters will appear here.</p>
        </div>
        <div style={styles.noToken}>
          <div>
            <p><strong>Mapbox token required</strong></p>
            <p>Add <code>REACT_APP_MAPBOX_ACCESS_TOKEN</code> to your <code>.env</code> and restart the app.</p>
            <p>Get a token at <a href="https://account.mapbox.com" target="_blank" rel="noopener noreferrer">account.mapbox.com</a>.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTitle}>
          <span>Explore</span>
          <span style={{ fontSize: 14, fontWeight: 400, color: '#666' }}>on map</span>
        </div>

        <div style={styles.filterSection}>
          <span style={styles.filterLabel}>Property type</span>
          <div style={styles.typeGrid}>
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                style={{ ...styles.typeBtn, ...(filters.propertyType === t.id ? styles.typeBtnActive : {}) }}
                onClick={() => setFilters((f) => ({ ...f, propertyType: f.propertyType === t.id ? null : t.id }))}
              >
                <i className={`fa-solid ${t.icon}`} style={{ fontSize: 16 }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.filterSection}>
          <span style={styles.filterLabel}>Budget</span>
          <div style={styles.sliderWrap}>
            <div style={styles.budgetText}>
              {filters.budgetMin} – {filters.budgetMax}
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={filters.budgetMax}
              onChange={(e) => setFilters((f) => ({ ...f, budgetMax: Number(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={styles.filterSection}>
          <span style={styles.filterLabel}>Bedroom</span>
          <div style={styles.roomRow}>
            {ROOM_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                style={{ ...styles.roomBtn, ...(filters.beds === n ? styles.roomBtnActive : {}) }}
                onClick={() => setFilters((f) => ({ ...f, beds: f.beds === n ? null : n }))}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.filterSection}>
          <span style={styles.filterLabel}>Bathroom</span>
          <div style={styles.roomRow}>
            {ROOM_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                style={{ ...styles.roomBtn, ...(filters.baths === n ? styles.roomBtnActive : {}) }}
                onClick={() => setFilters((f) => ({ ...f, baths: f.baths === n ? null : n }))}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.filterSection}>
          <span style={styles.filterLabel}>Amenities</span>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={filters.furnished}
              onChange={(e) => setFilters((f) => ({ ...f, furnished: e.target.checked }))}
            />
            Furnished
          </label>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={filters.petAllowed}
              onChange={(e) => setFilters((f) => ({ ...f, petAllowed: e.target.checked }))}
            />
            Pet allowed
          </label>
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={filters.shared}
              onChange={(e) => setFilters((f) => ({ ...f, shared: e.target.checked }))}
            />
            Shared accommodation
          </label>
        </div>

        <button type="button" style={styles.applyBtn} onClick={() => {}}>
          Apply
        </button>

        {loading && <p style={{ marginTop: 16, fontSize: 13, color: '#888' }}>Loading properties…</p>}
        {!loading && (
          <p style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
            {withCoords.length} of {filtered.length} on map
          </p>
        )}
      </aside>

      <div style={styles.mapWrap}>
        <div ref={mapContainerRef} style={styles.map} />
      </div>
    </div>
  );
}
