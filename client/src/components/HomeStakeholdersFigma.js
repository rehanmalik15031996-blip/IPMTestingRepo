import React from 'react';
import HomeFlipCard from './HomeFlipCard';
import './HomeStakeholdersFigma.css';

/**
 * Section 5 — "All of the stakeholders. From start to finish. In one ecosystem."
 * Figma node 2380:8 (file JYBjGJQflfPIrKBarixmcX).
 *
 * Layout:
 * - Full-bleed photo background with dark overlay
 * - Eyebrow + two-line title at the top
 * - Row of 5 flip cards (reuses HomeFlipCard)
 * - Bottom caption "everything and everyone operates in one platform."
 *
 * Interaction mirrors Section 2: hover/tap a card to flip it and reveal the
 * per-stakeholder feature list.
 */

const BG = '/landing-stakeholders/bg.png';

const STAKEHOLDERS = [
  {
    label: 'Enterprises',
    icon: '/landing-stakeholders/icon-enterprises.png',
    features: [
      'Command Centre',
      'Royalty Engine',
      'Compliance Hub',
      'Network Control',
      'MLS Sync',
      'Brand Oversight',
    ],
  },
  {
    label: 'Agencies',
    icon: '/landing-stakeholders/icon-agencies.png',
    features: [
      'Performance Hub',
      'Prospecting & CRM',
      'Listings & MLS',
      'Deal Pipeline',
      'Marketing Suite',
      'Smart Vault AI',
      'IPM Score',
    ],
  },
  {
    label: 'Buyers',
    icon: '/landing-stakeholders/icon-buyers.png',
    features: [
      'Aura Matching',
      'Smart Alerts',
      'Area Intelligence',
      'Value Trends',
      'ESG & Lifestyle',
      'Bond Calculator',
    ],
  },
  {
    label: 'Investors',
    icon: '/landing-stakeholders/icon-investors.png',
    features: [
      'Portfolio Command',
      'Asset Performance',
      'IPM Score',
      'ROI Forecasting',
      'Market Intel',
      'Smart Vault AI',
    ],
  },
  {
    label: 'Partners',
    icon: '/landing-stakeholders/icon-partners.png',
    features: [
      'Partner Portal',
      'Lead Pipeline',
      'Deal Tracking',
      'Smart Vault AI',
      'Revenue Tracking',
      'Performance Intel',
    ],
  },
];

function Front({ label, icon }) {
  return (
    <div className="home-stakeholders__face home-stakeholders__face--front">
      <span className="home-stakeholders__icon-wrap" aria-hidden>
        <img src={icon} alt="" className="home-stakeholders__icon" loading="lazy" />
      </span>
      <span className="home-stakeholders__label">{label}</span>
    </div>
  );
}

function Back({ features }) {
  return (
    <div className="home-stakeholders__face home-stakeholders__face--back">
      <ul className="home-stakeholders__features">
        {features.map((f) => (
          <li key={f} className="home-stakeholders__feature">
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomeStakeholdersFigma() {
  return (
    <section
      className="home-stakeholders"
      aria-label="All of the stakeholders. From start to finish. In one ecosystem."
    >
      <div className="home-stakeholders__bg" aria-hidden>
        <img src={BG} alt="" className="home-stakeholders__bg-img" />
        <div className="home-stakeholders__bg-scrim" />
      </div>

      <div className="home-stakeholders__inner">
        <header className="home-stakeholders__header">
          <span className="home-stakeholders__eyebrow">THE ENTIRE PROPERTY JOURNEY</span>
          <h2 className="home-stakeholders__title">
            <span className="home-stakeholders__title-line">All of the stakeholders. From start to finish.</span>
            <span className="home-stakeholders__title-line home-stakeholders__title-line--accent">
              In one ecosystem.
            </span>
          </h2>
        </header>

        <div className="home-stakeholders__grid" role="list">
          {STAKEHOLDERS.map((s) => (
            <HomeFlipCard
              key={s.label}
              ariaLabel={`${s.label} — ${s.features.join(', ')}`}
              className="home-stakeholders__card"
              front={<Front label={s.label} icon={s.icon} />}
              back={<Back features={s.features} />}
            />
          ))}
        </div>

        <p className="home-stakeholders__caption">
          everything and everyone operates in one platform.
        </p>
      </div>
    </section>
  );
}
