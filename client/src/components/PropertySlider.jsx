import React, { useState } from 'react';

const PropertySlider = () => {
  const [activeTab, setActiveTab] = useState('buyers');

  const sliderData = {
    buyers: { title: "For Buyers", desc: "...", image: "..." },
    sellers: { title: "For Sellers & Agents", desc: "...", image: "..." },
    // ... add the rest from your script.js
  };

  return (
    <section className="split-slider">
      <div className="slider-content">
        <h3>{sliderData[activeTab].title}</h3>
        <p className="fade-in">{sliderData[activeTab].desc}</p>
      </div>
      {/* Update active class based on state */}
      <div className={`v-tab-item ${activeTab === 'buyers' ? 'active' : ''}`} 
           onClick={() => setActiveTab('buyers')}>
        <span className="v-text">BUYERS</span>
      </div>
    </section>
  );
};

export default PropertySlider;