import React, { useEffect, useRef, useState } from 'react';
import './HomeCarouselFigma.css';

/**
 * Figma node 2374:2 — "A connected system for the full real estate market"
 * Scroll-pinned horizontal carousel (Framer "Scroll Carousel" pattern).
 *  - Section is N slides × SLIDE_SCROLL_VH tall.
 *  - Inner pin sticks at top:0; a flex track translates by (slide-w + gap) per step.
 *  - Non-active slides get dim + blur + scale so they look "glass" at the edges.
 */
const SLIDES = [
  {
    title: ['A connected system', 'for the full real estate market'],
    sub:   ['One subscription. One System. The full experience.'],
  },
  {
    title: ['Global property access,', 'connected in one system'],
    sub:   ['Discover opportunities, markets,', 'and cross-border activity with greater ease.'],
  },
  {
    title: ['Real-time insight', 'for more informed decisions'],
    sub:   ['Live property and market data helps every stakeholder', 'move with greater confidence.'],
  },
  {
    title: ['Clear visibility across', 'every stage of the process'],
    sub:   ['Track deals, documents, updates,', 'and next steps from start to finish.'],
  },
  {
    title: ['From first search', 'to final transfer and beyond'],
    sub:   ['IPM supports the full property journey', 'in one connected platform.'],
  },
];

const SLIDE_BG = '/landing-carousel/slide-bg.png';

// Viewport heights of scroll per slide transition (bigger = more gradual).
// 80vh per slide × 4 transitions = 320vh of pinned scrolling + 100vh dwell
// = 420vh section height. Previously 150vh per slide made the section 700vh
// tall, so on most viewports users scrolled past the pin before reaching the
// later slides and only ever saw slide 1.
const SLIDE_SCROLL_VH = 80;

export default function HomeCarouselFigma() {
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const compute = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress(scrolled / total);
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        compute();
      });
    };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const activeFloat = progress * (SLIDES.length - 1);
  const activeIndex = Math.round(activeFloat);

  // Shift the track by (slide-w + gap) for each slide we've scrolled past.
  const trackTransform = `translate3d(calc(${-activeFloat} * (var(--slide-w) + var(--slide-gap))), 0, 0)`;

  return (
    <section
      ref={sectionRef}
      className="home-carousel"
      aria-label="A connected system for the full real estate market"
      style={{
        '--carousel-slides': SLIDES.length,
        '--carousel-scroll-vh': SLIDE_SCROLL_VH,
      }}
    >
      <div className="home-carousel__pin">
        <div className="home-carousel__track" style={{ transform: trackTransform }}>
          {SLIDES.map((slide, i) => {
            // The nearest slide to the scroll position stays fully crisp; only
            // slides more than ±0.5 away start to glass up.
            const distance = Math.abs(i - activeFloat);
            const glass = Math.min(Math.max(0, distance - 0.5), 1.5);
            const opacity = Math.max(0.35, 1 - glass * 0.6);
            const blurPx = glass * 8;
            const scale = 1 - glass * 0.08;
            const style = {
              opacity,
              filter: `blur(${blurPx}px)`,
              transform: `scale(${scale})`,
            };
            return (
              <article
                className="home-carousel__slide"
                key={i}
                aria-hidden={i !== activeIndex}
                style={style}
              >
                <div className="home-carousel__card">
                  <img
                    className="home-carousel__bg"
                    src={SLIDE_BG}
                    alt=""
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                  <div className="home-carousel__scrim" aria-hidden />
                  <div className="home-carousel__copy">
                    <h2 className="home-carousel__title">
                      {slide.title.map((line, j) => (
                        <span key={j} className="home-carousel__title-line">
                          {line}
                        </span>
                      ))}
                    </h2>
                    <p className="home-carousel__sub">
                      {slide.sub.map((line, j) => (
                        <span key={j} className="home-carousel__sub-line">
                          {line}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="home-carousel__dots" role="tablist" aria-label="Slide indicator">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`home-carousel__dot ${i === activeIndex ? 'is-active' : ''}`}
              aria-label={`Slide ${i + 1} of ${SLIDES.length}`}
              role="tab"
              aria-selected={i === activeIndex}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
