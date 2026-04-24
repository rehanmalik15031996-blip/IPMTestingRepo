import React from 'react';
import { Link } from 'react-router-dom';
import './HomeServicesCtaBand.css';

/**
 * Thin white band with a centered "View IPM Services" outline button.
 *
 * Used between content sections on the home page (e.g. between the features
 * flip-cards and the scroll-pinned carousel) to offer users a direct jump
 * into the services page. Visual language matches the CTA in the Why-IPM
 * section: grey outline, grey text, green on hover.
 */
export default function HomeServicesCtaBand() {
  return (
    <div className="home-services-cta-band">
      <Link to="/our-services" className="home-services-cta-band__btn">
        View IPM Services
      </Link>
    </div>
  );
}
