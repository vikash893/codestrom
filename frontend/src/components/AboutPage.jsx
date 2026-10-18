import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  ShieldCheck,
  Activity,
  HeartPulse,
  Pill,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  PhoneCall,
  Search,
} from 'lucide-react';

export const AboutPage = ({ onNavigateHome, onOpenAuth }) => {
  const { language } = useLanguage();

  return (
    <div style={{ background: '#f8fafc', minHeight: '80vh', padding: '2.5rem 1rem' }}>
      <div className="container" style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '2.5rem',
            boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.3)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            <ShieldCheck size={16} />
            <span>{language === 'hi' ? 'सत्यापित डिजिटल स्वास्थ्य मंच' : 'Verified Emergency Healthcare Platform'}</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 1rem 0', lineHeight: 1.2 }}>
            {language === 'hi' ? 'मेडीरेस्क्यू (MediResQ) के बारे में' : 'About MediResQ'}
          </h1>
          <p style={{ fontSize: '1.05rem', maxWidth: '780px', margin: '0 auto 1.75rem auto', color: '#d1fae5', lineHeight: 1.6 }}>
            {language === 'hi'
              ? 'मेडीरेस्क्यू लक्षण पहचान, डब्ल्यूएचओ ट्राइएज स्तर, आयु-आधारित सटीक खुराक एवं निकटतम मेडिकल स्टोरों में लाइव दवा उपलब्धता को एक ही क्लिक में जोड़ता है।'
              : 'MediResQ bridges symptom triage, age-adapted clinical dosing, and real-time physical pharmacy inventory matching for instant doorstep dispatch.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={onNavigateHome}
              style={{
                background: '#ffffff',
                color: '#065f46',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Activity size={18} />
              <span>{language === 'hi' ? 'लक्षण जांचें' : 'Check Symptoms Now'}</span>
            </button>
            <button
              onClick={onOpenAuth}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              {language === 'hi' ? 'खाता बनाएं / लॉगिन' : 'Join as Partner / Patient'}
            </button>
          </div>
        </div>

        {/* 3 Pillars of Innovation */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ background: '#ffffff', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <HeartPulse size={26} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#064e3b', margin: '0 0 0.5rem 0' }}>
              {language === 'hi' ? '1. आयु-आधारित सटीक खुराक' : '1. Age-Adapted Dosing Engine'}
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              {language === 'hi'
                ? 'दवा की खुराक बच्चे (Pediatric), किशोर (Adolescent), वयस्क (Adult), और बुजुर्ग (Geriatric) की उम्र के अनुसार स्वतः सुरक्षित सीमा में निर्धारित की जाती है।'
                : 'Formulations and dose milligrams are algorithmically customized according to patient age brackets: Pediatric (<12y), Adolescent (12-17y), Adult (18-64y), and Senior Geriatric (65+).'}
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Search size={26} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#064e3b', margin: '0 0 0.5rem 0' }}>
              {language === 'hi' ? '2. लाइव मेडिकल स्टॉक मैपिंग' : '2. Real-Time Inventory Discovery'}
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              {language === 'hi'
                ? 'सिस्टम केवल दवा का नाम नहीं सुझाता, बल्कि पास के मेडिकल स्टोरों का डेटाबेस तुरंत स्कैन करके बताता है कि दवा स्टॉक में है या नहीं, डिलीवरी उपलब्ध है या कॉल करके मंगवाना है।'
                : 'The platform queries physical pharmacy inventories in real-time, matching exact stock quantities and distinguishing between 30-min doorstep delivery and direct store pickup.'}
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Sparkles size={26} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#064e3b', margin: '0 0 0.5rem 0' }}>
              {language === 'hi' ? '3. एमएल मॉडल एवं वेब आम सहमति' : '3. Dual-Stream ML + Web Consensus'}
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              {language === 'hi'
                ? 'प्रशिक्षित एनएलपी क्लासिफायर और लाइव इंटरनेट मेडिकल लिटरेचर दोनों के सामंजस्य से सर्वश्रेष्ठ और साक्ष्य-आधारित परिणाम तैयार होते हैं।'
                : 'Cross-verifies offline calibrated machine learning classifiers with live biomedical literature to prevent AI hallucination and deliver clinical consensus.'}
            </p>
          </div>
        </div>

        {/* How We Address Real-World Medical Challenges */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid #e2e8f0', marginBottom: '3rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '0.2rem 0.75rem', borderRadius: '999px' }}>
              CLINICAL INTEGRITY & SAFETY
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0' }}>
              {language === 'hi' ? 'वास्तविक स्वास्थ्य चुनौतियों का ठोस समाधान' : 'Overcoming Real-World Healthcare Bottlenecks'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '650px', margin: '0 auto' }}>
              {language === 'hi'
                ? 'स्वास्थ्य सेवाओं में आने वाली 8 प्रमुख समस्याओं को मेडीरेस्क्यू ने तकनीकी रूप से हल किया है।'
                : 'Engineered specifically to solve inventory lag, hallucinated guidance, and emergency triage latency.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1.25rem' }}>
              <strong style={{ color: '#166534', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span>Live Stock Syncing</span>
              </strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>
                Eliminates phantom availability. Stores without verified stock are tagged as <em>"Not available nearby"</em> to protect patient time.
              </p>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1.25rem' }}>
              <strong style={{ color: '#166534', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span>WHO Red-Flag Triage</span>
              </strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>
                Immediate automatic escalation to 112 emergency routing when cardiovascular, respiratory, or stroke red-flags are identified.
              </p>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1.25rem' }}>
              <strong style={{ color: '#166534', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span>Strict Medical Disclaimers</span>
              </strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>
                Transparent decision support. All OTC recommendations clearly display required doctor consultation flags.
              </p>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1.25rem' }}>
              <strong style={{ color: '#166534', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span>Privacy & Protected Data</span>
              </strong>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>
                Medical records and prescription scans are encrypted with role-based access control (RBAC) and admin approvals.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Strip */}
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: '#065f46', fontSize: '1.05rem', fontWeight: 800 }}>
              {language === 'hi' ? 'क्या आपके पास कोई सवाल है?' : 'Have Questions or Need Assistance?'}
            </h4>
            <p style={{ margin: 0, color: '#047857', fontSize: '0.85rem' }}>
              {language === 'hi' ? 'हमारी 24x7 इमरजेंसी सपोर्ट टीम आपकी सहायता के लिए तैयार है।' : 'Our medical operations and pharmacy support helpdesk is available 24 hours a day.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a
              href="tel:112"
              style={{
                background: '#dc2626',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <PhoneCall size={14} />
              <span>112 Emergency</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
