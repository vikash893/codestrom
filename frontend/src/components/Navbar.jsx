import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity, PhoneCall, User as UserIcon, LogOut, Globe, Home, Info, MessageSquare } from 'lucide-react';

export const Navbar = ({ onOpenAuth, activePage = 'home', setActivePage }) => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        {/* Brand */}
        <div
          onClick={() => {
            if (!user && setActivePage) setActivePage('home');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: !user ? 'pointer' : 'default',
          }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #059669, #047857)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '10px',
            display: 'flex',
            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
          }}>
            <Activity size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#064e3b', lineHeight: 1.1, margin: 0, letterSpacing: '-0.02em' }}>
              {t('brandName')}
            </h1>
            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
              {t('brandTagline')}
            </span>
          </div>
        </div>

        {/* BEFORE LOGIN ONLY: Center Navigation Links (Home, About, Contact) */}
        {!user && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => setActivePage && setActivePage('home')}
              style={{
                background: activePage === 'home' ? '#ecfdf5' : 'transparent',
                color: activePage === 'home' ? '#047857' : '#475569',
                border: 'none',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.85rem',
                fontWeight: activePage === 'home' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Home size={15} />
              <span>{language === 'hi' ? 'होम' : 'Home'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePage && setActivePage('about')}
              style={{
                background: activePage === 'about' ? '#ecfdf5' : 'transparent',
                color: activePage === 'about' ? '#047857' : '#475569',
                border: 'none',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.85rem',
                fontWeight: activePage === 'about' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Info size={15} />
              <span>{language === 'hi' ? 'हमारे बारे में' : 'About'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePage && setActivePage('contact')}
              style={{
                background: activePage === 'contact' ? '#ecfdf5' : 'transparent',
                color: activePage === 'contact' ? '#047857' : '#475569',
                border: 'none',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.85rem',
                fontWeight: activePage === 'contact' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease',
              }}
            >
              <MessageSquare size={15} />
              <span>{language === 'hi' ? 'संपर्क करें' : 'Contact'}</span>
            </button>
          </nav>
        )}

        {/* Right Nav controls: Language, Emergency, Auth/User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Language Switcher Button */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#334155',
            }}
            title="Toggle English / हिन्दी"
          >
            <Globe size={14} color="#059669" />
            <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {/* Emergency Hotline Button */}
          <a
            href="tel:112"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
            title="Call Emergency 112"
          >
            <PhoneCall size={14} />
            <span>112 Emergency</span>
          </a>

          {/* AFTER LOGIN: Exact Same Navbar as Before (User Profile Badge + Sign Out) */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.825rem',
                background: '#f1f5f9',
                padding: '0.3rem 0.7rem',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
              }}>
                <UserIcon size={14} color="#059669" />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.name || user.phone}</span>
                <span style={{
                  background:
                    user.role === 'doctor'
                      ? '#e0f2fe'
                      : user.role === 'pharmacy'
                      ? '#dcfce7'
                      : user.role === 'hospital'
                      ? '#fee2e2'
                      : user.role === 'admin'
                      ? '#fef3c7'
                      : '#f1f5f9',
                  color:
                    user.role === 'doctor'
                      ? '#0369a1'
                      : user.role === 'pharmacy'
                      ? '#15803d'
                      : user.role === 'hospital'
                      ? '#b91c1c'
                      : user.role === 'admin'
                      ? '#b45309'
                      : '#475569',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                }}>
                  {user.role}
                </span>
              </div>
              <button
                className="btn btn-outline"
                onClick={logout}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title="Sign out"
              >
                <LogOut size={14} />
                <span>{t('logout')}</span>
              </button>
            </div>
          ) : (
            /* BEFORE LOGIN: Separate Sign In & Register Buttons */
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => onOpenAuth('login')}
                style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem', fontWeight: 700 }}
              >
                {language === 'hi' ? 'लॉग इन' : 'Sign In'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onOpenAuth('register')}
                style={{
                  fontSize: '0.825rem',
                  padding: '0.4rem 0.95rem',
                  fontWeight: 700,
                  background: '#059669',
                  borderColor: '#059669',
                }}
              >
                {language === 'hi' ? 'रजिस्टर' : 'Register'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
