import React, { useState } from 'react';
import './HomeFlipCard.css';

/**
 * Reusable flip card — hover on desktop, tap on touch.
 * Pattern inspired by the Framer Flip Card component.
 * Controlled via internal state so it works without JS transforms lag.
 */
export default function HomeFlipCard({
  front,
  back,
  ariaLabel,
  className = '',
}) {
  const [flipped, setFlipped] = useState(false);

  const toggleOnTap = () => setFlipped((v) => !v);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleOnTap();
    }
  };

  return (
    <div
      className={`home-flip-card ${flipped ? 'is-flipped' : ''} ${className}`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={flipped}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={toggleOnTap}
      onKeyDown={onKey}
    >
      <div className="home-flip-card__inner">
        <div className="home-flip-card__face home-flip-card__face--front">{front}</div>
        <div className="home-flip-card__face home-flip-card__face--back">{back}</div>
      </div>
    </div>
  );
}
