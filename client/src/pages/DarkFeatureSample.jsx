import React from 'react';

const DarkFeatureSample = () => {
    return (
        <>
            <style>{`
                #home-dark-feature {
                    --ipm-green: #10575c;
                    --ipm-orange: #ffc801;
                    --glass-bg: rgba(255, 255, 255, 0.15);
                    --glass-border: rgba(255, 255, 255, 0.2);
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    background-color: #f5f5f5;
                    overflow: hidden;
                    box-sizing: border-box;
                }

                #home-dark-feature .container {
                    display: grid;
                    grid-template-columns: 1fr;
                    width: 100%;
                    margin: 0 auto;
                }

                @media (min-width: 1024px) {
                    #home-dark-feature .container {
                        grid-template-columns: 1.2fr 0.8fr;
                    }
                }

                /* LEFT VISUAL SECTION */
                #home-dark-feature .df-visual {
                    position: relative;
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    min-height: 600px;
                    background: url('/img/image-container.png') center/cover no-repeat;
                }

                #home-dark-feature .df-visual-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.15));
                    z-index: 1;
                }

                #home-dark-feature .df-visual-inner {
                    position: relative;
                    z-index: 2;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 30px;
                }

                /* SEARCH BAR */
                #home-dark-feature .df-top-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 20px;
                }

                #home-dark-feature .df-brand { color: #fff; }
                #home-dark-feature .df-brand h2 { font-size: 28px; margin: 0; font-weight: 600; }
                #home-dark-feature .df-brand p { font-family: 'Playfair Display', serif; font-style: italic; color: #ffc801; margin: 0; font-size: 20px; }

                #home-dark-feature .df-search {
                    flex: 1;
                    max-width: 500px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--glass-border);
                    border-radius: 50px;
                    padding: 12px 25px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    color: #fff;
                }

                /* DASHBOARD GRID */
                #home-dark-feature .df-cards {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr 1.2fr 2fr;
                    gap: 15px;
                    align-items: end;
                }

                #home-dark-feature .df-panel {
                    background: var(--glass-bg);
                    backdrop-filter: blur(12px);
                    border: 1px solid var(--glass-border);
                    border-radius: 18px;
                    padding: 15px;
                    color: #fff;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                }

                /* METRICS COLUMN */
                #home-dark-feature .df-metrics-col {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                #home-dark-feature .df-mini-card {
                    background: var(--glass-bg);
                    backdrop-filter: blur(8px);
                    border-radius: 12px;
                    padding: 12px;
                }
                #home-dark-feature .df-mini-card h4 { font-size: 11px; margin: 0; opacity: 0.9; }
                #home-dark-feature .df-mini-card .val { font-size: 20px; font-weight: 600; margin: 5px 0; }
                #home-dark-feature .df-pill {
                    background: #fff;
                    color: #10575c;
                    font-size: 9px;
                    padding: 4px 8px;
                    border-radius: 20px;
                    font-weight: 600;
                }

                /* CONFIDENCE PANEL — exact Figma specs */
                #home-dark-feature .df-panel--confidence {
                    display: flex;
                    flex-direction: column;
                    gap: 12.5px;
                    align-items: center;
                    justify-content: center;
                    padding: 12.5px;
                    background: rgba(255, 255, 255, 0.3);
                    backdrop-filter: blur(4.7px);
                    -webkit-backdrop-filter: blur(4.7px);
                    border-radius: 9.4px;
                    border: none;
                    box-shadow: 0 4.7px 15.7px rgba(44, 47, 47, 0.2);
                }
                #home-dark-feature .df-conf-heading {
                    width: 100%;
                }
                #home-dark-feature .df-conf-heading .df-conf-title {
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 600;
                    font-size: 11.4px;
                    color: #fff;
                    line-height: 0.96;
                }
                #home-dark-feature .df-conf-heading .df-conf-sub {
                    margin: 3.7px 0 0;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 400;
                    font-size: 6.27px;
                    color: rgba(255, 255, 255, 0.85);
                    line-height: 1.28;
                }
                #home-dark-feature .df-gauge-area {
                    display: inline-grid;
                    place-items: start;
                }
                #home-dark-feature .df-gauge-area > * {
                    grid-area: 1 / 1;
                }
                #home-dark-feature .df-gauge-arc {
                    width: 75.15px;
                    height: 38.04px;
                    margin-left: 3.7px;
                    display: block;
                }
                #home-dark-feature .df-gauge-pct {
                    margin-left: 26.9px;
                    margin-top: 28.8px;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 600;
                    font-size: 13.9px;
                    color: #f8faf9;
                    line-height: 8px;
                    white-space: nowrap;
                }
                #home-dark-feature .df-gauge-label {
                    margin-top: 47.3px;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 400;
                    font-size: 9.28px;
                    color: #f8faf9;
                    line-height: 8px;
                    white-space: nowrap;
                }
                #home-dark-feature .df-feat-row {
                    display: flex;
                    gap: 14.85px;
                    align-items: flex-start;
                    width: 100%;
                }
                #home-dark-feature .df-feat-icon {
                    width: 14.85px;
                    height: 14.85px;
                    flex-shrink: 0;
                }
                #home-dark-feature .df-feat-text {
                    display: flex;
                    flex-direction: column;
                    gap: 1.86px;
                    flex: 1;
                    min-width: 0;
                }
                #home-dark-feature .df-feat-title {
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 600;
                    font-size: 8.35px;
                    color: rgba(255, 255, 255, 0.85);
                    line-height: 1.48;
                }
                #home-dark-feature .df-feat-desc {
                    margin: 0;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 400;
                    font-size: 6.27px;
                    color: rgba(255, 255, 255, 0.85);
                    line-height: 1.28;
                }

                /* RETURN PANEL (RIGHTMOST) */
                #home-dark-feature .df-return-bar {
                    display: flex;
                    height: 25px;
                    border-radius: 5px;
                    overflow: hidden;
                    margin: 15px 0;
                }
                #home-dark-feature .bar-growth { background: #fff; width: 60%; color: #333; display: flex; align-items: center; padding: 0 10px; font-size: 10px; font-weight: 700; }
                #home-dark-feature .bar-yield { background: rgba(255,255,255,0.4); width: 40%; display: flex; align-items: center; padding: 0 10px; font-size: 10px; }

                /* RIGHT CONTENT SECTION */
                #home-dark-feature .df-content {
                    background-color: var(--ipm-green);
                    padding: 60px;
                    color: #fff;
                }
                #home-dark-feature .df-content h1 { font-size: 42px; line-height: 1.1; margin-bottom: 20px; font-weight: 300; }
                #home-dark-feature .df-content h1 span { font-family: 'Playfair Display', serif; font-style: italic; color: #ffc801; }
                
                #home-dark-feature .btn-primary {
                    background: var(--ipm-orange);
                    padding: 15px 30px;
                    border-radius: 10px;
                    color: #fff;
                    text-decoration: none;
                    font-weight: 600;
                    display: inline-block;
                    margin-right: 15px;
                }
            `}</style>

            <section id="home-dark-feature">
                <div className="container">
                    {/* LEFT SIDE: DASHBOARD */}
                    <div className="df-visual">
                        <div className="df-visual-overlay"></div>
                        <div className="df-visual-inner">
                            
                            <div className="df-top-row">
                                <div className="df-brand">
                                    <h2>IPM Investor</h2>
                                    <p>Solutions</p>
                                </div>
                                <div className="df-search">
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                    <span>Describe your ideal next investment</span>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                                        <i className="fa-solid fa-microphone"></i>
                                        <i className="fa-solid fa-map"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="df-cards">
                                {/* Col 1: Metrics */}
                                <div className="df-metrics-col">
                                    <div className="df-mini-card">
                                        <h4>Rental Yield</h4>
                                        <div className="val">6.4%</div>
                                        <span className="df-pill">Above market avg.</span>
                                    </div>
                                    <div className="df-mini-card">
                                        <h4>Days on Market</h4>
                                        <div className="val">40</div>
                                        <span className="df-pill">Fast-moving area</span>
                                    </div>
                                    <div className="df-mini-card">
                                        <h4>Energy Rating</h4>
                                        <div className="val">A</div>
                                        <span className="df-pill">Top-tier performance</span>
                                    </div>
                                </div>

                                {/* Col 2: Confidence — Figma-matched */}
                                <div className="df-panel df-panel--confidence">
                                    <div className="df-conf-heading">
                                        <p className="df-conf-title">Investment Confidence</p>
                                        <p className="df-conf-sub">Composite signal score from market, rental &amp; location data.</p>
                                    </div>
                                    <div className="df-gauge-area">
                                        <img className="df-gauge-arc" src="/img/df-gauge-arc.svg" alt="" />
                                        <span className="df-gauge-pct">76%</span>
                                        <span className="df-gauge-label">Confidence Score</span>
                                    </div>
                                    <div className="df-feat-row">
                                        <img className="df-feat-icon" src="/img/df-icon-house.svg" alt="" />
                                        <div className="df-feat-text">
                                            <p className="df-feat-title">Strong Expat Demand</p>
                                            <p className="df-feat-desc">Dubai Hills popular with high-income expats &amp; remote workers.</p>
                                        </div>
                                    </div>
                                    <div className="df-feat-row">
                                        <img className="df-feat-icon" src="/img/df-icon-sparkle.svg" alt="" />
                                        <div className="df-feat-text">
                                            <p className="df-feat-title">Premium New Build</p>
                                            <p className="df-feat-desc">2023 completion — no maintenance backlog, modern ESG spec.</p>
                                        </div>
                                    </div>
                                    <div className="df-feat-row">
                                        <img className="df-feat-icon" src="/img/df-icon-arrow-up.svg" alt="" />
                                        <div className="df-feat-text">
                                            <p className="df-feat-title">Consistent Appreciation</p>
                                            <p className="df-feat-desc">+18% over 5 years with ongoing infrastructure investment.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Col 3: Future Prospects */}
                                <div className="df-panel">
                                    <div style={{fontSize: '12px', fontWeight: '600'}}>Future Prospects</div>
                                    <div style={{position: 'relative', marginTop: '10px'}}>
                                        <img src="/img/df-future-house.jpg" alt="House" style={{width: '100%', borderRadius: '8px'}} />
                                        <div style={{position: 'absolute', top: '-10px', right: '-10px', background: '#fff', color: '#333', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '10px'}}>
                                            <strong>87</strong><span style={{fontSize: '6px'}}>IPM</span>
                                        </div>
                                    </div>
                                    <p style={{fontSize: '9px', marginTop: '10px'}}>Contemporary modern property fitting your portfolio.</p>
                                    <div style={{fontSize: '10px', fontWeight: '700', marginTop: '10px'}}>View Now &rarr;</div>
                                </div>

                                {/* Col 4: Total Return */}
                                <div className="df-panel">
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <span style={{fontSize: '12px', fontWeight: '600'}}>Total Return</span>
                                        <span className="df-pill">Annualized (YTD)</span>
                                    </div>
                                    <div style={{fontSize: '28px', fontWeight: '400', margin: '10px 0'}}>18.4%</div>
                                    <div style={{fontSize: '9px'}}>Total estimated gain: €24,500</div>
                                    
                                    <div className="df-return-bar">
                                        <div className="bar-growth">11.2% €28,800</div>
                                        <div className="bar-yield">7.2% €16,700</div>
                                    </div>

                                    <div style={{fontSize: '9px', opacity: '0.8'}}>Annualized trajectory & yield growth</div>
                                    <div style={{height: '50px', borderBottom: '1px solid rgba(255,255,255,0.3)', marginTop: '5px'}}>
                                        <svg viewBox="0 0 100 30" style={{width: '100%'}}>
                                            <path d="M0 25 Q 25 20, 50 15 T 100 5" fill="none" stroke="white" strokeWidth="2" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE: TEXT CONTENT */}
                    <div className="df-content">
                        <div style={{letterSpacing: '2px', fontSize: '10px', marginBottom: '20px'}}>IPM INVESTOR SOLUTIONS</div>
                        <h1>One Subscription,<br/>the <span>Entire Property Journey.</span></h1>
                        <p style={{opacity: 0.8, lineHeight: 1.6, marginBottom: '30px'}}>
                            IPM serves every stakeholder in the property lifecycle – from agents winning more mandates to investors modeling real-time yield.
                        </p>
                        
                        <div style={{marginBottom: '40px'}}>
                            <div style={{marginBottom: '20px'}}>
                                <strong>Agents &amp; Agencies</strong>
                                <p style={{fontSize: '14px', opacity: 0.7}}>Prospect smarter, list faster and close with confidence.</p>
                            </div>
                            <div>
                                <strong>Buyers &amp; Investors</strong>
                                <p style={{fontSize: '14px', opacity: 0.7}}>Find the right property with natural language search.</p>
                            </div>
                        </div>

                        <div style={{display: 'flex', alignItems: 'center'}}>
                            <a href="#" className="btn-primary">Explore Full Platform &rarr;</a>
                            <a href="#" style={{color: '#fff', textDecoration: 'none', marginLeft: '10px'}}>View Pricing</a>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default DarkFeatureSample;
