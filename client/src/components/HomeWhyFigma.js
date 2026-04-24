import React from 'react';
import { Link } from 'react-router-dom';
import './HomeWhyFigma.css';

/**
 * Section 6 — "Why IPM" (Figma node 2382:10).
 *
 * Two-column layout:
 *   Left  — eyebrow, title, body copy
 *   Right — property photo with a frosted-glass overlay and an inner "focus
 *           window" showing the photo crisp, plus four floating glass chart
 *           widgets positioned over it.
 *
 * "View IPM Services" button sits at the top, centered.
 *
 * Widget positions, sizes and chart geometry are all taken directly from
 * Figma coordinates (photo frame 700×805 at 1043,4644), expressed as
 * percentages of the photo frame so the layout scales responsively.
 */

const PHOTO = '/landing-why/photo.png';

export default function HomeWhyFigma() {
  return (
    <section className="home-why" aria-labelledby="home-why-title">
      <div className="home-why__inner">
        <div className="home-why__cta-wrap">
          <Link to="/our-services" className="home-why__cta">
            View IPM Services
          </Link>
        </div>

        <div className="home-why__row">
          {/* LEFT — copy */}
          <div className="home-why__copy">
            <span className="home-why__eyebrow">WHY&nbsp;&nbsp;IPM</span>
            <h2 className="home-why__title" id="home-why-title">
              <span className="home-why__title-line">Integrated. Intelligence.</span>
              <span className="home-why__title-line home-why__title-line--accent">Global reach.</span>
            </h2>
            <div className="home-why__body">
              <p>
                IPM is a platform built for the real estate industry, bringing all of the stakeholders into one
                connected environment. It replaces the fragmented mix of tools many stakeholders still rely on, from
                separate CRMs, spreadsheets, listing portals, and email threads to disconnected systems for
                documents, communication, and deal tracking, with a single subscription designed to support the full
                property lifecycle.
              </p>
              <p>
                From discovering opportunities and listing properties to managing enquiries, tracking progress from
                offer to ownership transfer, collaborating across stakeholders, and monitoring market activity across
                multiple countries, IPM creates one place where the entire property ecosystem can work with greater
                clarity.
              </p>
              <p>
                Whether you are managing a single office, a large portfolio, an investment journey, or a cross-border
                transaction, IPM gives every stakeholder one place to connect, collaborate, and move with confidence.
              </p>
            </div>
          </div>

          {/* RIGHT — photo frame + floating widgets */}
          <div className="home-why__visual" aria-hidden="true">
            <div className="home-why__frame">
              <img className="home-why__frame-bg" src={PHOTO} alt="" />
              <div className="home-why__frame-glass" />
              <div className="home-why__focus">
                <img src={PHOTO} alt="" />
              </div>

              {/* IPM Score — 120×120 @ (120,67) in a 700×805 frame */}
              <div className="home-why__widget home-why__widget--score">
                <span className="home-why__widget-title">IPM Score</span>
                <div className="home-why__chart home-why__chart--gauge">
                  <img src="/landing-why/pie-fill.svg" alt="" />
                </div>
              </div>

              {/* Sustainability Profile — 234×120 @ (392,170) */}
              <div className="home-why__widget home-why__widget--sustainability">
                <span className="home-why__widget-title">Sustainability Profile</span>
                <div className="home-why__chart home-why__chart--bars">
                  <span className="home-why__bar home-why__bar--sm" />
                  <span className="home-why__bar home-why__bar--md" />
                  <span className="home-why__bar home-why__bar--lg" />
                </div>
              </div>

              {/* Lifestyle Index — 192×120 @ (28,408) */}
              <div className="home-why__widget home-why__widget--lifestyle">
                <span className="home-why__widget-title">Lifestyle Index</span>
                <div className="home-why__chart home-why__chart--lifestyle">
                  <img className="home-why__chart-layer" src="/landing-why/horizontal-lines.svg" alt="" />
                  <img className="home-why__chart-layer" src="/landing-why/vertical-lines.svg" alt="" />
                  <img className="home-why__chart-layer" src="/landing-why/gradient.svg" alt="" />
                  <img className="home-why__chart-layer" src="/landing-why/line.svg" alt="" />
                </div>
              </div>

              {/* Investment Confidence — 337×158 @ (41,593) */}
              <div className="home-why__widget home-why__widget--investment">
                <span className="home-why__widget-title">Investment Confidence</span>
                <div className="home-why__chart home-why__chart--investment">
                  <img className="home-why__chart-layer" src="/landing-why/chart-lines.svg" alt="" />
                  <img className="home-why__chart-layer" src="/landing-why/chart-flow-2.svg" alt="" />
                  <img className="home-why__chart-layer" src="/landing-why/chart-flow-1.svg" alt="" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
