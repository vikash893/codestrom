import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PhoneCall, ShieldAlert, Heart, Globe } from 'lucide-react';

export const Footer = () => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <footer style={{
      background: '#ffffff',
      borderTop: '1px solid #e2e8f0',
      padding: '1.25rem 0',
      marginTop: 'auto',
      fontSize: '0.85rem',
      color: '#64748b',
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <strong style={{ color: '#0f172a' }}>{t('brandName')}</strong>
          <span>&bull;</span>
          <span>{t('brandTagline')}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', fontWeight: 600 }}>
            <PhoneCall size={15} />
            <span>{t('emergencyCallText')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Globe size={15} />
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '0.15rem 0.45rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#1e293b',
              }}
            >
              {language === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="container" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
        {t('disclaimerText')}
      </div>
    </footer>
  );
};
