import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HomeFigmaTopbar from './HomeFigmaTopbar';
import './HomeLandingHeroFigma.css';

/**
 * Figma IPM hero (node 2362:2): full-viewport hero with in-bar navigation
 * wired to the same routes as App.js landing nav.
 */
export default function HomeLandingHeroFigma() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [topbarDark, setTopbarDark] = useState(false);
  const heroVideoRef = useRef(null);
  const heroSectionRef = useRef(null);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return undefined;
    const tryPlay = () => {
      const p = video.play();
      if (p !== undefined && typeof p.catch === 'function') p.catch(() => {});
    };
    tryPlay();
    const onTabVisible = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    document.addEventListener('visibilitychange', onTabVisible);
    return () => document.removeEventListener('visibilitychange', onTabVisible);
  }, []);

  // Flip nav to dark-text variant once the hero has scrolled mostly out of view.
  useEffect(() => {
    let rafId = 0;
    const check = () => {
      const hero = heroSectionRef.current;
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      // Switch when less than ~80px of the hero remains visible above the fold.
      setTopbarDark(rect.bottom < 80);
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        check();
      });
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate('/collection', { state: { searchQuery: q, heroIntent: 'buy' } });
  };

  return (
    <section className="home-figma" aria-label={t('nav.home')} ref={heroSectionRef}>
      <HomeFigmaTopbar darkMode={topbarDark} />

      <div className="home-figma__bg" aria-hidden>
        <video
          ref={heroVideoRef}
          className="home-figma__bg-video"
          src="/landing-hero-video.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
        <div className="home-figma__bg-overlay" />
        <div className="home-figma__bg-vignette" />
      </div>

      <div className="home-figma__main">
        <div className="home-figma__copy">
          {/* One sentence: plain + accent spans keep separate typography */}
          <h1 className="home-figma__headline">
            <span className="home-figma__headline-sentence">
              <span className="home-figma__headline-plain">The Real Estate Market,</span>
              <span className="home-figma__headline-accent"> Reinvented.</span>
            </span>
          </h1>
          <p className="home-figma__tagline">
            <span className="home-figma__tagline-line">
              IPM connects real estate <span className="home-figma__tagline-hit">agents</span>, tenants,{' '}
              <span className="home-figma__tagline-hit">buyers</span>,{' '}
              <span className="home-figma__tagline-hit">investors</span> and{' '}
              <span className="home-figma__tagline-hit">partners</span>,
            </span>
            <br aria-hidden />
            <span className="home-figma__tagline-line home-figma__tagline-line--second">
              in one intelligent ecosystem.
            </span>
          </p>
        </div>

        <form className="home-figma__search" onSubmit={handleSearch}>
          <div className="home-figma__search-inner">
            <span className="home-figma__search-icon-slot" aria-hidden>
              <img
                src="/landing-figma-icons/search.png"
                alt=""
                width={25}
                height={25}
                className="home-figma__search-icon-img"
              />
            </span>
            <input
              type="text"
              className="home-figma__search-input"
              placeholder="Describe the property or opportunity you are looking for"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search properties"
            />
            <div className="home-figma__search-actions">
              <button type="button" className="home-figma__icon-btn" aria-label="Location">
                <img
                  src="/landing-figma-icons/location.png"
                  alt=""
                  width={25}
                  height={25}
                  className="home-figma__icon-btn-img"
                />
              </button>
              <button type="button" className="home-figma__icon-btn" aria-label="Voice search">
                <img
                  src="/landing-figma-icons/microphone.png"
                  alt=""
                  width={25}
                  height={25}
                  className="home-figma__icon-btn-img"
                />
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
