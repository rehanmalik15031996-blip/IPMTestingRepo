import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';

const HelpCenter = () => {
    const isMobile = useIsMobile();
    // State to track which question is open (null = all closed)
    const [openIndex, setOpenIndex] = useState(null);

    // FAQ Data with Answers
    const faqs = [
        {
            question: 'How do I start investing with IPM?',
            answer: 'Getting started is simple. First, create an account and complete the identity verification (KYC) process. Once verified, you can browse our "Premium Global Collection" of AI-vetted properties. Select a property, choose your investment amount, and purchase fractional shares instantly using our secure payment gateway.'
        },
        {
            question: 'What is the minimum investment amount?',
            answer: 'We believe in democratizing real estate. You can start investing with as little as 500 AED (or equivalent in USD/EUR). This allows you to build a diversified portfolio across multiple global markets without needing large capital.'
        },
        {
            question: 'How are returns calculated and paid?',
            answer: 'Returns are generated from two sources: Monthly Rental Income and Capital Appreciation. Rental income is distributed to your digital wallet monthly. Capital appreciation is realized when you sell your shares on our secondary market or when the property is sold after a fixed term.'
        },
        {
            question: 'Is my data and investment secure?',
            answer: 'Absolutely. We use bank-grade encryption for all personal data. Furthermore, every property transaction is recorded on a private blockchain ledger, providing an immutable proof of ownership that cannot be tampered with.'
        },
        {
            question: 'Can I sell my property shares anytime?',
            answer: 'Yes! IPM features a secondary marketplace where you can list your shares for sale to other investors on the platform. This provides liquidity that traditional real estate investment lacks.'
        }
    ];

    const toggleFAQ = (index) => {
        // If clicking the already open one, close it. Otherwise, open the new one.
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            
            <div style={{ maxWidth: '800px', margin: isMobile ? '30px auto' : '50px auto', padding: isMobile ? '20px 16px' : '20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                    <h1 style={{ color: '#1f3a3d', fontSize: '36px', fontWeight: '800', marginBottom: '10px' }}>How can we help you?</h1>
                    <p style={{ color: '#666' }}>Find answers to common questions about investing with IPM.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {faqs.map((item, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <div 
                                key={index} 
                                onClick={() => toggleFAQ(index)}
                                style={{ 
                                    background: 'white', 
                                    borderRadius: '12px', 
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {/* Question Header */}
                                <div style={{ 
                                    padding: '20px 25px', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    background: isOpen ? '#f8fafc' : 'white' // Slight grey when open
                                }}>
                                    <span style={{ fontWeight: 'bold', color: isOpen ? '#11575C' : '#333', fontSize: '16px' }}>
                                        {item.question}
                                    </span>
                                    <i 
                                        className="fas fa-chevron-down" 
                                        style={{ 
                                            color: isOpen ? '#11575C' : '#ccc', 
                                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.3s ease'
                                        }}
                                    ></i>
                                </div>

                                {/* Answer Body (Conditional Render) */}
                                {isOpen && (
                                    <div style={{ 
                                        padding: '0 25px 25px 25px', 
                                        color: '#555', 
                                        lineHeight: '1.6', 
                                        fontSize: '14px',
                                        borderTop: '1px solid #f1f5f9',
                                        marginTop: '-5px', // Visual tweak to pull text up slightly
                                        paddingTop: '15px'
                                    }}>
                                        {item.answer}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Contact Support Footer */}
                <div style={{ marginTop: '50px', textAlign: 'center' }}>
                    <Link to="/contact" style={{ 
                        marginTop: '10px',
                        background: '#1f3a3d', 
                        color: 'white', 
                        border: 'none', 
                        padding: '12px 25px', 
                        borderRadius: '30px', 
                        fontWeight: 'bold', 
                        textDecoration: 'none',
                        cursor: 'pointer' 
                    }}>
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;