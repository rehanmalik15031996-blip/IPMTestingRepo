import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import './Prospecting.css';

/**
 * Prospecting — Figma node 2387:12
 *
 * The prospecting workspace for agents and agencies. Top KPI strip + three-column
 * layout: filters (left), map (center), insights (right).
 *
 * The data here is a faithful reproduction of the Figma comp's static values so the
 * page can be reviewed pixel-for-pixel against design. Wiring real CRM/prospecting
 * data is intentionally a follow-up.
 */

const KPIS = [
    { title: 'Hot Prospects',     value: '14',     pillTone: 'up',   pillStrong: '+1',  pillRest: ' this week' },
    { title: 'Qualified Leads',   value: '28',     pillTone: 'up',   pillStrong: '+6',  pillRest: ' this week' },
    { title: 'Calls Made',        value: '12',     pillTone: 'up',   pillStrong: '3 ',  pillRest: 'until weekly target' },
    { title: 'Appraisals Booked', value: '5',      pillTone: 'down', pillStrong: '-2%', pillRest: ' this week' },
    { title: 'Pipeline Value',    value: 'R14.2M', pillTone: 'up',   pillStrong: '+12%', pillRest: ' this month' },
    { title: 'Opportunities',     value: '22',     pillTone: 'up',   pillStrong: '',    pillRest: 'in current zone' },
];

const FILTERS = [
    'Prospect Score',
    'Property Type',
    'Time Since Last Sale',
    'Database Status',
    'Budget Range',
    'Export List',
];

const TAGS = [
    { id: 'all',  label: 'All',         active: true,  dot: null },
    { id: 'hot',  label: 'Hot',         active: false, dot: 'hot' },
    { id: 'warm', label: 'Warm',        active: false, dot: 'warm' },
    { id: 'ndb',  label: '+ Not in DB', active: false, dot: null },
];

// Coloured numbered pins scattered across the map placeholder. Coordinates are
// percentages of the map container so the layout stays responsive.
const PINS = [
    { id: 1, n: 94, tone: 'hot',  x: 22, y: 22 },
    { id: 2, n: 91, tone: 'hot',  x: 38, y: 18 },
    { id: 3, n: 82, tone: 'warm', x: 50, y: 22 },
    { id: 4, n: 88, tone: 'hot',  x: 64, y: 18 },
    { id: 5, n: 65, tone: 'cool', x: 18, y: 38 },
    { id: 6, n: 87, tone: 'hot',  x: 32, y: 44 },
    { id: 7, n: 56, tone: 'cool', x: 48, y: 42 },
    { id: 8, n: 62, tone: 'cool', x: 60, y: 44 },
    { id: 9, n: 76, tone: 'warm', x: 36, y: 62 },
    { id: 10, n: 71, tone: 'warm', x: 56, y: 64 },
    { id: 11, n: 58, tone: 'cool', x: 22, y: 76 },
    { id: 12, n: 48, tone: 'cold', x: 30, y: 78 },
    { id: 13, n: 78, tone: 'warm', x: 46, y: 78 },
    { id: 14, n: 43, tone: 'cold', x: 56, y: 80 },
    { id: 15, n: 40, tone: 'cold', x: 70, y: 80 },
    { id: 16, n: 85, tone: 'hot',  x: 12, y: 56 },
    { id: 17, n: 68, tone: 'cool', x: 78, y: 70 },
];

function Pill({ tone, strong, rest }) {
    return (
        <span className={`pr-kpi__pill ${tone === 'down' ? 'pr-kpi__pill--down' : ''}`}>
            {strong && <strong>{strong}</strong>}
            <span>{rest}</span>
        </span>
    );
}

export default function Prospecting() {
    let user = null;
    try {
        const raw = localStorage.getItem('user');
        user = raw ? JSON.parse(raw) : null;
    } catch (_) { user = null; }
    const userName = user?.name || 'there';

    const [activeTagId, setActiveTagId] = useState('all');

    return (
        <div className="dashboard-container" style={{ display: 'flex', fontFamily: "'Inter', sans-serif", background: '#f7f7f8', height: '100vh', overflow: 'hidden' }}>
            <Sidebar />

            <main className="prospecting-page">
                <div className="prospecting-page__inner">
                    <header className="prospecting-page__header">
                        <div>
                            <h1>Prospecting</h1>
                            <p>Hi {userName} — here's what's moving in your zone today.</p>
                        </div>
                    </header>

                    {/* KPI BAND */}
                    <section className="pr-kpi-band" aria-label="Prospecting KPIs">
                        {KPIS.map((k) => (
                            <article key={k.title} className="pr-kpi">
                                <h3 className="pr-kpi__title">{k.title}</h3>
                                <div className="pr-kpi__value">{k.value}</div>
                                <Pill tone={k.pillTone} strong={k.pillStrong} rest={k.pillRest} />
                            </article>
                        ))}
                    </section>

                    {/* THREE-COLUMN ROW */}
                    <section className="pr-row">
                        {/* FILTERS */}
                        <aside className="pr-card">
                            <h3 className="pr-card__heading">Filters</h3>
                            <div className="pr-filters">
                                {FILTERS.map((label) => (
                                    <button key={label} type="button" className="pr-chip">
                                        <span>{label.toUpperCase()}</span>
                                        <i className="fas fa-chevron-down pr-chip__caret" aria-hidden />
                                    </button>
                                ))}
                            </div>
                        </aside>

                        {/* MAP */}
                        <section className="pr-card pr-map-col" aria-label="Prospecting map">
                            <div className="pr-map-col__header">
                                <h3 className="pr-map-col__title">Prospecting Map</h3>
                            </div>

                            <div className="pr-map-toolbar">
                                <div className="pr-search">
                                    <i className="fas fa-search" aria-hidden />
                                    <input type="text" placeholder="Search address or suburb..." aria-label="Search address or suburb" />
                                </div>
                                <div className="pr-tagrow" role="tablist" aria-label="Prospect filters">
                                    {TAGS.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={activeTagId === tag.id}
                                            className={`pr-tag ${activeTagId === tag.id ? 'is-active' : ''}`}
                                            onClick={() => setActiveTagId(tag.id)}
                                        >
                                            {tag.dot && <span className={`pr-tag__dot pr-tag__dot--${tag.dot}`} />}
                                            {tag.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pr-map" role="img" aria-label="Prospecting map showing leads scored by temperature">
                                <div className="pr-map__zone-label">Sandton Core Zone</div>
                                <div className="pr-map__diagonal" />

                                {PINS.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        className={`pr-pin pr-pin--${p.tone}`}
                                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                                        aria-label={`Prospect score ${p.n}`}
                                    >
                                        {p.n}
                                    </button>
                                ))}

                                <span className="pr-map__street-label" style={{ top: '30%', left: '52%' }}>Sandton Drive</span>
                                <span className="pr-map__street-label" style={{ top: '54%', left: '46%' }}>West Street</span>
                                <span className="pr-map__street-label" style={{ top: '70%', left: '42%' }}>Katherine Avenue</span>
                                <span className="pr-map__street-label" style={{ top: '88%', left: '40%' }}>South Road</span>

                                {/* Prospect popup */}
                                <aside className="pr-popup" aria-label="12 Wierda Pk prospect details">
                                    <div className="pr-popup__header">
                                        <span className="pr-popup__pill">+ Not in Database</span>
                                        <button type="button" className="pr-popup__close" aria-label="Close">×</button>
                                    </div>
                                    <div className="pr-popup__score">
                                        <b>60</b>
                                        <em>Cool · 55–69</em>
                                        <span>AI Prospect Score</span>
                                    </div>
                                    <div className="pr-popup__title">12 Wierda Pk</div>
                                    <div className="pr-popup__addr">Wierda Valley</div>
                                    <div className="pr-popup__grid">
                                        <div className="pr-popup__cell"><label>Last Sold</label><span>Nov 2018</span></div>
                                        <div className="pr-popup__cell"><label>Sale Price</label><span>$928K</span></div>
                                        <div className="pr-popup__cell"><label>Size</label><span>255 m²</span></div>
                                        <div className="pr-popup__cell"><label>Config</label><span>3bd · 2ba</span></div>
                                    </div>
                                    <div className="pr-popup__owner">
                                        <label>Owner</label>
                                        Unknown
                                    </div>
                                    <div className="pr-popup__actions">
                                        <button type="button" className="pr-popup__btn"><i className="fas fa-phone" /> Call</button>
                                        <button type="button" className="pr-popup__btn"><i className="far fa-sticky-note" /> Note</button>
                                        <button type="button" className="pr-popup__btn pr-popup__btn--primary"><i className="fas fa-plus" /> Add to CRM</button>
                                    </div>
                                </aside>

                                <div className="pr-map__legend" aria-label="Lead score legend">
                                    <h4>Lead Score</h4>
                                    <div className="pr-legend-row"><span className="dot" style={{ background: '#c8553d' }} /> Hot 85+</div>
                                    <div className="pr-legend-row"><span className="dot" style={{ background: '#ffb21b' }} /> Warm 70–84</div>
                                    <div className="pr-legend-row"><span className="dot" style={{ background: '#5b8c8f' }} /> Cool 55–69</div>
                                    <div className="pr-legend-row"><span className="dot" style={{ background: '#8a8a8a' }} /> Cold &lt;55</div>
                                    <div className="pr-legend-row"><span className="dot" style={{ background: '#e1e1e1', border: '1px solid #aaa' }} /> In Database</div>
                                </div>
                            </div>
                        </section>

                        {/* INSIGHTS */}
                        <aside className="pr-card pr-insights">
                            <h3 className="pr-card__heading">Prospect Insights</h3>
                            <div className="pr-insights__panel">
                                <div className="pr-insights__placeholder">Recent insight preview</div>
                            </div>
                            <div className="pr-insights__spacer" />
                            <div className="pr-insights__cta">
                                <button type="button" className="pr-cta-btn"><i className="fas fa-phone" /> Call</button>
                                <button type="button" className="pr-cta-btn"><i className="far fa-envelope" /> E-mail</button>
                            </div>
                        </aside>
                    </section>
                </div>
            </main>
        </div>
    );
}
