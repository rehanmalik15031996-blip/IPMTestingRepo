import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { contactPublicFetch } from '../utils/contactPublicFetch';
import './HomeGetInTouchFigma.css';

/**
 * Section 7 — "Get in touch" (Figma node 2382:11).
 *
 * Left column:
 *   - GET IN TOUCH eyebrow
 *   - Two-line headline ("Turn your real estate goals / into a Realty")
 *   - Body copy
 *   - "View IPM Services" outline button (same size as the Why-IPM CTA)
 * Right column:
 *   - Glass card (rgba(255,255,255,0.2), blur 15) containing an inquiry form
 *     with First name, Surname, Email, Contact number, a multi-line message,
 *     a yellow "Send an inquiry" submit button, and a GDPR note.
 * Background: full-bleed property photo with a rgba(16,87,92,0.6) teal scrim.
 *
 * Form submission uses contactPublicFetch.postInquiry — same wiring as the
 * previous home landing's Get-In-Touch section.
 */

const BG = '/landing-contact/bg.png';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  message: '',
};

export default function HomeGetInTouchFigma() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await contactPublicFetch.postInquiry({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        enquiryType: 'Website — Get in touch',
      });
      setForm(EMPTY_FORM);
      setSubmitting(false);
      alert("Thank you. Your enquiry has been sent — we'll get back to you soon.");
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      alert(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <section className="home-get-in-touch" aria-labelledby="home-git-title">
      <div className="home-get-in-touch__bg" aria-hidden>
        <img src={BG} alt="" className="home-get-in-touch__bg-img" />
        <div className="home-get-in-touch__scrim" />
      </div>

      <div className="home-get-in-touch__inner">
        {/* LEFT — copy + CTA */}
        <div className="home-get-in-touch__copy">
          <span className="home-get-in-touch__eyebrow">GET IN TOUCH</span>
          <h2 className="home-get-in-touch__title" id="home-git-title">
            <span className="home-get-in-touch__title-line">Turn your real estate goals</span>
            <span className="home-get-in-touch__title-line home-get-in-touch__title-line--accent">
              into a Realty
            </span>
          </h2>
          <p className="home-get-in-touch__body">
            Whether you are looking to rent, buy, sell or invest, our team and platform are here to
            guide you every step of the way across all global markets.
          </p>
          <div className="home-get-in-touch__cta-wrap">
            <Link to="/our-services" className="home-get-in-touch__cta">
              View IPM Services
            </Link>
          </div>
        </div>

        {/* RIGHT — glass form card + GDPR note below */}
        <div className="home-get-in-touch__form-col">
        <form className="home-get-in-touch__card" onSubmit={handleSubmit} noValidate>
          <div className="home-get-in-touch__row home-get-in-touch__row--split">
            <label className="home-get-in-touch__field" htmlFor="git-firstName">
              <input
                id="git-firstName"
                type="text"
                name="firstName"
                placeholder="First Name"
                value={form.firstName}
                onChange={handleChange}
                autoComplete="given-name"
                required
              />
            </label>
            <label className="home-get-in-touch__field" htmlFor="git-lastName">
              <input
                id="git-lastName"
                type="text"
                name="lastName"
                placeholder="Surname"
                value={form.lastName}
                onChange={handleChange}
                autoComplete="family-name"
                required
              />
            </label>
          </div>

          <label className="home-get-in-touch__field" htmlFor="git-email">
            <input
              id="git-email"
              type="email"
              name="email"
              placeholder="E-mail Address"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>

          <label className="home-get-in-touch__field" htmlFor="git-phone">
            <input
              id="git-phone"
              type="tel"
              name="phone"
              placeholder="Contact Number"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
            />
          </label>

          <label className="home-get-in-touch__field home-get-in-touch__field--area" htmlFor="git-message">
            <textarea
              id="git-message"
              name="message"
              placeholder="What can we help you with?"
              value={form.message}
              onChange={handleChange}
              rows={8}
              required
            />
          </label>

          <button
            type="submit"
            className="home-get-in-touch__submit"
            disabled={submitting}
          >
            {submitting ? 'Sending…' : 'Send an inquiry'}
          </button>
        </form>

          <p className="home-get-in-touch__gdpr">
            Your data is protected and never shared. GDPR compliant.
          </p>
        </div>
      </div>
    </section>
  );
}
