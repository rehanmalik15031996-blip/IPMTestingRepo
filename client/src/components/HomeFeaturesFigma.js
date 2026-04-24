import React from 'react';
import HomeFlipCard from './HomeFlipCard';
import './HomeFeaturesFigma.css';

/**
 * Figma node 2371:3 — "Every stage. Every stakeholder. One Platform."
 * Six flip cards: teal front with big ghost number + label; light grey back with copy.
 */
const CARDS = [
  { n: '01', label: 'Search',   body: 'Find properties, people and opportunities across the market.' },
  { n: '02', label: 'Evaluate', body: 'Use live data, pricing and market signals to assess potential.' },
  { n: '03', label: 'Connect',  body: 'Bring buyers, sellers, agents, investors and partners together.' },
  { n: '04', label: 'Transact', body: 'Manage the deal journey, documents and next steps in one place.' },
  { n: '05', label: 'Manage',   body: 'Keep property records, updates and ongoing activity organised.' },
  { n: '06', label: 'Grow',     body: 'Track performance, portfolio value and future opportunity over time.' },
];

export default function HomeFeaturesFigma() {
  return (
    <section className="home-features" aria-label="Every stage. Every stakeholder. One platform.">
      <div className="home-features__inner">
        <header className="home-features__header">
          <span className="home-features__eyebrow">A GLOBAL PROPERTY MARKET. ONE ECOSYSTEM</span>
          <h2 className="home-features__title">
            <span className="home-features__title-line">Every stage. Every stakeholder.</span>
            <span className="home-features__title-line home-features__title-line--accent">One Platform.</span>
          </h2>
        </header>

        <div className="home-features__grid">
          {CARDS.map((card) => (
            <HomeFlipCard
              key={card.n}
              ariaLabel={`${card.label} — ${card.body}`}
              className="home-features__card"
              front={
                <div className="home-features__face home-features__face--front">
                  <span className="home-features__num" aria-hidden>{card.n}</span>
                  <span className="home-features__label">{card.label}</span>
                </div>
              }
              back={
                <div className="home-features__face home-features__face--back">
                  <span className="home-features__num home-features__num--back" aria-hidden>{card.n}</span>
                  <p className="home-features__body">{card.body}</p>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
