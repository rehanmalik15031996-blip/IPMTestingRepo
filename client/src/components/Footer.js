import React, { useState, useEffect } from 'react';
import { contactPublicFetch } from '../utils/contactPublicFetch';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useMediaQuery';
import LegalPolicyModals from './LegalPolicyModals';

// Constants outside component to avoid recreation on every render
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const Footer = () => {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    // Form State
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '', message: '',
        selectedDate: ''
    });

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [bookedDates, setBookedDates] = useState([]); // Stores dates from DB

    // Legal modals (Terms of Service / Privacy – same popup style as registration)
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);

    // 1. FETCH BOOKED DATES FROM DB ON LOAD
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const data = await contactPublicFetch.getAppointments();
                setBookedDates(Array.isArray(data) ? data : []); // ["January 16, 2026", ...]
            } catch (err) {
                console.error("Could not fetch bookings", err);
            }
        };
        fetchAppointments();
    }, []);

    // 2. AUTO-SELECT TODAY
    useEffect(() => {
        const today = new Date();
        if (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) {
            setSelectedDay(today.getDate());
            setFormData(prev => ({
                ...prev,
                selectedDate: `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`
            }));
        } else {
            setSelectedDay(null);
        }
    }, [currentDate]);

    // Helpers
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const changeMonth = (dir) => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + dir)));
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // 3. HANDLE CLICK (Prevent clicking past or booked days)
    const handleDateClick = (day, isDisabled) => {
        if (isDisabled) return; // Stop click if disabled

        setSelectedDay(day);
        const formattedDate = `${monthNames[currentDate.getMonth()]} ${day}, ${currentDate.getFullYear()}`;
        setFormData({ ...formData, selectedDate: formattedDate });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await contactPublicFetch.postInquiry(formData);
            alert("Inquiry Sent! We saved your appointment.");
            
            // Refresh booked dates so the calendar updates instantly
            setBookedDates([...bookedDates, formData.selectedDate]); 
            setFormData({ firstName: '', lastName: '', email: '', phone: '', message: '', selectedDate: formData.selectedDate });
        } catch (err) {
            alert("Connection Failed.");
        }
    };

    // 4. RENDER CALENDAR GRID
    const renderCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = getDaysInMonth(year, month);
        const startDay = getFirstDayOfMonth(year, month);
        
        // "Today" for comparison (set hours to 0 to compare just the date)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysArray = [];

        // Empty slots
        for (let i = 0; i < startDay; i++) {
            daysArray.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
        }

        // Render Days
        for (let d = 1; d <= totalDays; d++) {
            // Construct the date string for this specific cell
            const cellDateString = `${monthNames[month]} ${d}, ${year}`;
            
            // Create a real Date object for this cell to compare with "Today"
            const cellDateObj = new Date(year, month, d);
            
            // LOGIC A: Is it in the past?
            const isPast = cellDateObj < today;

            // LOGIC B: Is it in the database?
            const isBooked = bookedDates.includes(cellDateString);

            // LOGIC C: Is it selected?
            const isSelected = d === selectedDay && !isPast && !isBooked ? 'active-date' : '';

            // Combine Logic for "Disabled" style
            let classString = "cal-day";
            if (isPast) classString += " past-date";      // Style for past
            else if (isBooked) classString += " booked-date"; // Style for booked
            else if (isSelected) classString += " active-date"; // Style for selected

            // If past or booked, it is effectively disabled
            const isDisabled = isPast || isBooked;

            daysArray.push(
                <div 
                    key={d} 
                    className={classString} 
                    onClick={() => handleDateClick(d, isDisabled)}
                >
                    {d}
                </div>
            );
        }
        return daysArray;
    };

    const footerLink = (label, onClick) => (
        <button type="button" className="footer-link-item" onClick={onClick}>{label}</button>
    );

    // Locations with main language and currency for landing page footer
    const footerLocations = [
        { label: 'Dubai', language: 'Arabic', currency: 'AED' },
        { label: 'Netherlands', language: 'Dutch', currency: 'EUR' },
        { label: 'South Africa', language: 'English', currency: 'ZAR' },
        { label: 'United States of America', language: 'English', currency: 'USD' },
        { label: 'Asia', language: 'Various', currency: 'Various' },
        { label: 'Greece', language: 'Greek', currency: 'EUR' },
        { label: 'Bali', language: 'Indonesian', currency: 'IDR' },
        { label: 'America', language: 'English', currency: 'USD' },
        { label: 'Australia', language: 'English', currency: 'AUD' },
        { label: 'New Zealand', language: 'English', currency: 'NZD' },
        { label: 'Canada', language: 'English / French', currency: 'CAD' },
        { label: 'Brazil', language: 'Portuguese', currency: 'BRL' },
        { label: 'Spain', language: 'Spanish', currency: 'EUR' },
        { label: 'Italy', language: 'Italian', currency: 'EUR' },
        { label: 'Malta', language: 'Maltese / English', currency: 'EUR' }
    ];

    return (
        <footer id="contact" className="footer-section">
            <div className="footer-header-pill">{t('footer.getInTouch')}</div>
            <div className="footer-content-wrapper">
                <p className="footer-intro">{t('footer.intro')}</p>
                <div className="contact-container">
                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="form-row">
                            <input type="text" name="firstName" placeholder={t('footer.firstName')} className="form-input" value={formData.firstName} onChange={handleChange} required />
                            <input type="text" name="lastName" placeholder={t('footer.lastName')} className="form-input" value={formData.lastName} onChange={handleChange} required />
                        </div>
                        <div className="form-row">
                            <input type="email" name="email" placeholder={t('footer.email')} className="form-input" value={formData.email} onChange={handleChange} required />
                            <input type="text" name="phone" placeholder={t('footer.phone')} className="form-input" value={formData.phone} onChange={handleChange} />
                        </div>
                        <textarea name="message" placeholder={t('footer.helpPlaceholder')} className="form-textarea" value={formData.message} onChange={handleChange} required></textarea>
                        
                        <input type="hidden" value={formData.selectedDate} /> 
                        <button type="submit" className="send-btn">{t('footer.submit')}</button>
                    </form>

                    <div className="calendar-replica">
                        <div className="cal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px 8px 0 0' }}>
                            <i className="fas fa-chevron-left" style={{ cursor: 'pointer', color: '#ffc801', fontSize: '1.2rem', padding: '5px' }} onClick={() => changeMonth(-1)}></i>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                            <i className="fas fa-chevron-right" style={{ cursor: 'pointer', color: '#ffc801', fontSize: '1.2rem', padding: '5px' }} onClick={() => changeMonth(1)}></i>
                        </div>
                        <div className="cal-grid">
                            {dayNames.map(day => <div key={day} className="cal-day-name">{day}</div>)}
                            {renderCalendarDays()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Link columns + GDPR + social (one divider line above) */}
            <div className="footer-links-section">
                <div className="footer-links-inner">
                    <div className="footer-col">
                        <h4 className="footer-col-title">Resources</h4>
                        {footerLink('Calculators')}
                        {footerLink('Property Guides')}
                        {footerLink('Pricing Guides')}
                        {footerLink('Tier Guides')}
                        {footerLink('Academy')}
                    </div>
                    <div className="footer-col">
                        <h4 className="footer-col-title">Search</h4>
                        {footerLink('Properties by type')}
                        {footerLink('Homes for sale')}
                        {footerLink('Homes for rent')}
                        {footerLink('Commercial properties for sale')}
                        {footerLink('Commercial properties for rent')}
                        {footerLink('Find an agent')}
                        {footerLink('New Developments')}
                    </div>
                    <div className="footer-gdpr-block">
                        <div className="footer-gdpr-logo">
                            <div className="footer-gdpr-stars-wrap" aria-hidden="true">
                                {[...Array(12)].map((_, i) => (
                                    <span key={i} className="footer-gdpr-star" style={{ '--star-index': i }}>✦</span>
                                ))}
                                <span className="footer-gdpr-text-in-circle">GDPR</span>
                            </div>
                            <div className="footer-gdpr-sub">The General Data Protection</div>
                        </div>
                    </div>
                    <div className="footer-col">
                        <h4 className="footer-col-title">Locations</h4>
                        {footerLocations.map((loc) => (
                            <div key={loc.label} className="footer-location-item" style={{ marginBottom: '10px' }}>
                                <button type="button" className="footer-link-item" style={{ display: 'block', textAlign: 'left', padding: 0 }}>{loc.label}</button>
                            </div>
                        ))}
                    </div>
                    <div className="footer-col">
                        <h4 className="footer-col-title">IPM</h4>
                        {footerLink('About')}
                        {footerLink('Newsletter')}
                        {footerLink('Contact Us')}
                        {footerLink('Careers')}
                        {footerLink('Terms of Service', () => setShowTermsModal(true))}
                        {footerLink('Privacy', () => setShowPrivacyModal(true))}
                    </div>
                </div>
                <div className="footer-social-row">
                    <button type="button" className="footer-social-icon" aria-label="Instagram"><i className="fab fa-instagram" /></button>
                    <button type="button" className="footer-social-icon" aria-label="Facebook"><i className="fab fa-facebook-f" /></button>
                    <button type="button" className="footer-social-icon" aria-label="TikTok"><i className="fab fa-tiktok" /></button>
                    <button type="button" className="footer-social-icon" aria-label="LinkedIn"><i className="fab fa-linkedin-in" /></button>
                    <button type="button" className="footer-social-icon" aria-label="YouTube"><i className="fab fa-youtube" /></button>
                    <button type="button" className="footer-social-icon" aria-label="Pinterest"><i className="fab fa-pinterest-p" /></button>
                </div>
            </div>

            <LegalPolicyModals
                showTermsModal={showTermsModal}
                setShowTermsModal={setShowTermsModal}
                showPrivacyModal={showPrivacyModal}
                setShowPrivacyModal={setShowPrivacyModal}
                isMobile={isMobile}
            />
        </footer>
    );
};

export default Footer;