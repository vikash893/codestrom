import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  PhoneCall,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  ShieldCheck,
  Building2,
  MessageSquare,
} from 'lucide-react';

export const ContactPage = ({ onOpenAuth }) => {
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [inquiryType, setInquiryType] = useState('patient_help');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !emailOrPhone.trim() || !message.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setName('');
      setEmailOrPhone('');
      setMessage('');
    }, 1500);
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '80vh', padding: '2.5rem 1rem' }}>
      <div className="container" style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span
            style={{
              fontSize: '0.8rem',
              background: '#dcfce7',
              color: '#15803d',
              fontWeight: 700,
              padding: '0.2rem 0.75rem',
              borderRadius: '999px',
              display: 'inline-block',
              marginBottom: '0.5rem',
            }}
          >
            24/7 SUPPORT & COORDINATION
          </span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#064e3b', margin: '0 0 0.5rem 0' }}>
            {language === 'hi' ? 'संपर्क करें एवं सहायता केंद्र' : 'Contact Us & Emergency Helpdesk'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
            {language === 'hi'
              ? 'आपातकालीन सहायता, फार्मेसी पार्टनरशिप, डॉक्टर सत्यापन या किसी भी तकनीकी प्रश्न के लिए संपर्क करें।'
              : 'Reach out to our operations team for emergency assistance, pharmacy onboarding, or clinician verification.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(350px, 1.4fr)', gap: '2rem' }}>
          {/* Left Cards: Contact Info & Emergency Hotlines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Critical Emergency Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <PhoneCall size={22} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  {language === 'hi' ? 'तत्काल राष्ट्रीय आपातकालीन नंबर' : 'National Emergency Hotline'}
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#fee2e2', margin: '0 0 1rem 0' }}>
                {language === 'hi'
                  ? 'छाती में तेज दर्द, सांस लेने में तकलीफ या गंभीर चोट होने पर तुरंत 112 डायल करें।'
                  : 'For acute emergencies including severe chest pain, shortness of breath, or trauma, dial 112 immediately.'}
              </p>
              <a
                href="tel:112"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#ffffff',
                  color: '#dc2626',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                }}
              >
                <span>Call 112 Emergency</span>
              </a>
            </div>

            {/* Standard Contacts Card */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #a7f3d0',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              }}
            >
              <h4 style={{ margin: '0 0 1rem 0', color: '#065f46', fontSize: '1.05rem', fontWeight: 800 }}>
                {language === 'hi' ? 'कार्यालय एवं संपर्क जानकारी' : 'Headquarters & Helpdesk'}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.4rem', borderRadius: '8px' }}>
                    <PhoneCall size={18} />
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block' }}>Central Helpline</strong>
                    <a href="tel:+911123456789" style={{ color: '#059669', textDecoration: 'none' }}>
                      +91 11 2345 6789 (Toll Free)
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.4rem', borderRadius: '8px' }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block' }}>Email Support</strong>
                    <a href="mailto:support@mediresq.health" style={{ color: '#059669', textDecoration: 'none' }}>
                      support@mediresq.health
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.4rem', borderRadius: '8px' }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block' }}>Corporate Office</strong>
                    <span style={{ color: '#475569' }}>
                      Block B, Connaught Place, New Delhi, 110001, India
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.4rem', borderRadius: '8px' }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block' }}>Operating Hours</strong>
                    <span style={{ color: '#475569' }}>24 Hours &bull; 7 Days a Week (365 Days)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Interactive Inquiry & Support Form */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.75rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#064e3b', margin: '0 0 0.5rem 0' }}>
              {language === 'hi' ? 'सहायता संदेश भेजें' : 'Send an Inquiry / Message'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
              {language === 'hi'
                ? 'हमारी मेडिकल ऑपरेशन्स टीम 15 मिनट के भीतर आपसे संपर्क करेगी।'
                : 'Our operations coordinator will review your request and respond within 15 minutes.'}
            </p>

            {submitted ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '10px',
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#166534',
                }}
              >
                <CheckCircle2 size={42} color="#16a34a" style={{ margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800 }}>
                  {language === 'hi' ? 'संदेश सफलतापूर्वक प्राप्त हुआ!' : 'Message Submitted Successfully!'}
                </h4>
                <p style={{ fontSize: '0.875rem', color: '#15803d', margin: '0 0 1rem 0' }}>
                  {language === 'hi'
                    ? 'आपकी सहायता टिकट संख्या दर्ज हो गई है। हमारी टीम जल्द आपसे संपर्क करेगी।'
                    : 'Your support ticket has been queued. Our emergency coordinator will call or email you promptly.'}
                </p>
                <button
                  className="btn btn-outline"
                  onClick={() => setSubmitted(false)}
                  style={{ fontSize: '0.85rem' }}
                >
                  {language === 'hi' ? 'दूसरा संदेश भेजें' : 'Send Another Message'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                    {language === 'hi' ? 'आपका पूरा नाम' : 'Full Name'} *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    placeholder="e.g. Vikram Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                    {language === 'hi' ? 'मोबाइल नंबर या ईमेल' : 'Mobile Number or Email'} *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    placeholder="+91 98765 43210 or email@domain.com"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                    {language === 'hi' ? 'प्रश्न का प्रकार' : 'Inquiry Category'} *
                  </label>
                  <select
                    className="form-control"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                  >
                    <option value="patient_help">Patient Care & Medicine Delivery Assistance</option>
                    <option value="pharmacy_partner">Pharmacy Onboarding & Inventory Integration</option>
                    <option value="doctor_verify">Doctor Verification & Teleconsultation</option>
                    <option value="hospital_emergency">Hospital Bed & Trauma Emergency Routing</option>
                    <option value="other">Other Inquiry / Feedback</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                    {language === 'hi' ? 'आपका संदेश' : 'Message Details'} *
                  </label>
                  <textarea
                    rows={4}
                    className="form-control"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    placeholder="Describe your inquiry, emergency request, or partnership interest..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    background: '#059669',
                    borderColor: '#059669',
                  }}
                >
                  <Send size={16} />
                  <span>{language === 'hi' ? 'संदेश भेजें' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
