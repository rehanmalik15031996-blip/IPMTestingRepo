import React from 'react';

const Contact = () => {
    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>

            <div style={{ maxWidth: '900px', margin: '50px auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', padding: '20px' }}>
                
                {/* Contact Info Card */}
                <div style={{ background: '#1f3a3d', color: 'white', padding: '40px', borderRadius: '16px' }}>
                    <h2>Get in touch</h2>
                    <p style={{ opacity: 0.8, marginBottom: '30px' }}>Fill out the form and our team will get back to you within 24 hours.</p>
                    <div style={{ marginBottom: '20px' }}><i className="fas fa-phone" style={{ color: '#ffb400', width: '25px' }}></i> +971 50 123 4567</div>
                    <div style={{ marginBottom: '20px' }}><i className="fas fa-envelope" style={{ color: '#ffb400', width: '25px' }}></i> support@ipm.ae</div>
                    <div><i className="fas fa-map-marker-alt" style={{ color: '#ffb400', width: '25px' }}></i> Dubai Internet City, UAE</div>
                </div>

                {/* Contact Form */}
                <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <form>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{display:'block', marginBottom:'5px', fontSize:'12px', fontWeight:'bold'}}>Name</label>
                            <input type="text" style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px'}} />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{display:'block', marginBottom:'5px', fontSize:'12px', fontWeight:'bold'}}>Email</label>
                            <input type="email" style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px'}} />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{display:'block', marginBottom:'5px', fontSize:'12px', fontWeight:'bold'}}>Message</label>
                            <textarea rows="4" style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px'}}></textarea>
                        </div>
                        <button className="btn-filled" style={{width:'100%'}}>Send Message</button>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default Contact;