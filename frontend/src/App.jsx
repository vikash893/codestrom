import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LocationProvider } from './context/LocationContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './components/HomePage';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { PatientDashboard } from './components/PatientDashboard';
import { PharmacyDashboard } from './components/PharmacyDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { HospitalDashboard } from './components/HospitalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PendingApprovalGuard } from './components/PendingApprovalGuard';

const MainContent = () => {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [activePage, setActivePage] = useState('home'); // 'home' | 'about' | 'contact' | 'dashboard'
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login', message: '' });
  const [adminViewMode, setAdminViewMode] = useState('admin');

  const handleOpenAuth = (mode = 'login', message = '') => {
    setAuthModal({ isOpen: true, mode, message });
  };

  const handleCloseAuth = () => {
    setAuthModal({ isOpen: false, mode: 'login', message: '' });
  };

  // If user logs in while on 'home' or when clicking dashboard, role dictates dashboard
  let currentRole = 'patient';
  if (user) {
    if (user.role === 'admin') {
      currentRole = adminViewMode;
    } else {
      currentRole = user.role;
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <Navbar
        onOpenAuth={handleOpenAuth}
        activePage={activePage}
        setActivePage={(page) => {
          if (page === 'dashboard' && !user) {
            handleOpenAuth('login', language === 'hi' ? 'डैशबोर्ड देखने के लिए कृपया लॉगिन करें।' : 'Please sign in to access your dashboard.');
            return;
          }
          setActivePage(page);
        }}
      />

      {/* Admin Only Switcher Toolbar */}
      {user && user.role === 'admin' && (
        <div style={{ background: '#ecfdf5', borderBottom: '1px solid #a7f3d0', padding: '0.4rem 1rem' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, fontSize: '0.825rem' }}>
            <span>
              Administrator Role Preview: <strong style={{ color: '#047857' }}>{currentRole.toUpperCase()}</strong>
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn ${currentRole === 'admin' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setAdminViewMode('admin')}
              >
                Admin Panel
              </button>
              <button
                className={`btn ${currentRole === 'patient' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setAdminViewMode('patient')}
              >
                Patient View
              </button>
              <button
                className={`btn ${currentRole === 'doctor' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setAdminViewMode('doctor')}
              >
                Doctor View
              </button>
              <button
                className={`btn ${currentRole === 'pharmacy' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setAdminViewMode('pharmacy')}
              >
                Pharmacy View
              </button>
              <button
                className={`btn ${currentRole === 'hospital' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setAdminViewMode('hospital')}
              >
                Hospital View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {user ? (
          currentRole === 'pharmacy' ? (
            <PendingApprovalGuard>
              <PharmacyDashboard />
            </PendingApprovalGuard>
          ) : currentRole === 'doctor' ? (
            <PendingApprovalGuard>
              <DoctorDashboard />
            </PendingApprovalGuard>
          ) : currentRole === 'hospital' ? (
            <PendingApprovalGuard>
              <HospitalDashboard />
            </PendingApprovalGuard>
          ) : currentRole === 'admin' ? (
            <AdminDashboard />
          ) : (
            <PatientDashboard onOpenAuth={handleOpenAuth} />
          )
        ) : (
          /* Before Login: Home, About, Contact Pages */
          activePage === 'about' ? (
            <AboutPage
              onNavigateHome={() => setActivePage('home')}
              onOpenAuth={() => handleOpenAuth('register')}
            />
          ) : activePage === 'contact' ? (
            <ContactPage onOpenAuth={handleOpenAuth} />
          ) : (
            /* Default: Beautiful Green and White HomePage with Public Symptom Assessment */
            <HomePage
              onOpenAuth={handleOpenAuth}
              onNavigateAbout={() => setActivePage('about')}
              onNavigateContact={() => setActivePage('contact')}
            />
          )
        )}
      </main>

      {/* Dedicated Modern Footer */}
      <Footer />

      {/* Auth Modal with Dynamic Role Selection, Mode & Messages */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        customMessage={authModal.message}
        onClose={handleCloseAuth}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <LocationProvider>
            <MainContent />
          </LocationProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
