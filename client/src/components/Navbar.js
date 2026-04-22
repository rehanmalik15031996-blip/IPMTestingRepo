import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    return (
        <nav className="navbar slide-down">
            <div className="nav-left">
                <div className="logo-icon"><i className="fas fa-layer-group"></i></div>
                <div className="logo-text">IPM</div>
            </div>
            <div className="nav-right">
                <span className="btn-outline" style={{ opacity: 0.6, pointerEvents: 'none', cursor: 'not-allowed' }}>Collection</span>
                <Link to="/dashboard" className="btn-filled">myIPM</Link>
            </div>
        </nav>
    );
};

export default Navbar;