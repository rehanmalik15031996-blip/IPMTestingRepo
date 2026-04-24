import React, { useEffect, useRef, useState } from 'react';
import './HomeStatsFigma.css';

/**
 * Section 4 — Stats strip.
 * Figma node 2378:6 (file JYBjGJQflfPIrKBarixmcX).
 *
 * Behaviour — Framer-style number counter:
 * - Numeric stats count up from 0 to the target when the section
 *   first enters the viewport.
 * - Non-numeric stats (e.g. "All") fade + translate in at the same time.
 * - Respects prefers-reduced-motion (jumps to final value, no animation).
 */
const STATS = [
  { target: 8, suffix: '+', sub: ['systems integrated', 'into one platform'] },
  { target: 2, suffix: 'x', suffixSpace: true, sub: ['faster property evaluation'] },
  { text: 'All', sub: ['of the global markets'] },
];

const DURATION_MS = 2800; // Count-up duration (slower, more deliberate)
// easeOutExpo — fast start, long gentle tail (matches Framer's counter feel).
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

function useCountUp(target, active, duration = DURATION_MS) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(target);
      return undefined;
    }
    let rafId = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * easeOutExpo(t));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, active, duration]);
  return value;
}

function NumericStat({ target, suffix, suffixSpace, active }) {
  const raw = useCountUp(target, active);
  // Integer-only counters (design shows whole numbers).
  const display = Math.round(raw);
  return (
    <p className="home-stats__num">
      <span>{display}</span>
      {suffix && (
        <span className="home-stats__num-suffix">
          {suffixSpace ? ' ' : ''}
          {suffix}
        </span>
      )}
    </p>
  );
}

function TextStat({ text }) {
  return <p className="home-stats__num">{text}</p>;
}

export default function HomeStatsFigma() {
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`home-stats ${inView ? 'home-stats--in' : ''}`}
      aria-label="IPM platform stats"
    >
      <div className="home-stats__inner">
        {STATS.map((s, i) => (
          <React.Fragment key={i}>
            <span className="home-stats__divider" aria-hidden />
            <div
              className="home-stats__col"
              style={{ '--stagger': `${i * 80}ms` }}
            >
              {'target' in s ? (
                <NumericStat
                  target={s.target}
                  suffix={s.suffix}
                  suffixSpace={s.suffixSpace}
                  active={inView}
                />
              ) : (
                <TextStat text={s.text} />
              )}
              {s.sub && s.sub.length > 0 && (
                <p className="home-stats__sub">
                  {s.sub.map((line, j) => (
                    <span key={j} className="home-stats__sub-line">
                      {line}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </React.Fragment>
        ))}
        <span className="home-stats__divider" aria-hidden />
      </div>
    </section>
  );
}
