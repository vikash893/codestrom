import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { PatientDashboard } from './components/PatientDashboard';
import { PharmacyDashboard } from './components/PharmacyDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { HospitalDashboard } from './components/HospitalDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

const MainContent = () => {
  const { user } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [viewMode, setViewMode] = useState('auto'); // 'auto' uses user.role, or explicit switcher

  // Determine which dashboard to display
  let currentRole = user?.role || 'patient';
  if (viewMode !== 'auto') {
    currentRole = viewMode;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenAuth={() => setIsAuthOpen(true)} />

      {/* Role Switcher Toolbar for multi-role preview */}
      {user && (
        <div style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border)', padding: '0.4rem 1rem' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, fontSize: '0.825rem' }}>
            <span>Active Role View: <strong>{currentRole.toUpperCase()}</strong></span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn ${currentRole === 'patient' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                onClick={() => setViewMode('patient')}
              >
                Patient View
              </button>
              {(user.role === 'doctor' || user.role === 'admin') && (
                <button
                  className={`btn ${currentRole === 'doctor' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setViewMode('doctor')}
                >
                  Doctor View
                </button>
              )}
              {(user.role === 'pharmacy' || user.role === 'admin') && (
                <button
                  className={`btn ${currentRole === 'pharmacy' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setViewMode('pharmacy')}
                >
                  Pharmacy View
                </button>
              )}
              {(user.role === 'hospital' || user.role === 'admin') && (
                <button
                  className={`btn ${currentRole === 'hospital' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setViewMode('hospital')}
                >
                  Hospital View
                </button>
              )}
              {user.role === 'admin' && (
                <button
                  className={`btn ${currentRole === 'admin' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setViewMode('admin')}
                >
                  Admin View
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main View Render */}
      <main style={{ flex: 1, padding: '1rem 0' }}>
        {currentRole === 'pharmacy' ? (
          <PharmacyDashboard />
        ) : currentRole === 'doctor' ? (
          <DoctorDashboard />
        ) : currentRole === 'hospital' ? (
          <HospitalDashboard />
        ) : currentRole === 'admin' ? (
          <AdminDashboard />
        ) : (
          <PatientDashboard onOpenAuth={() => setIsAuthOpen(true)} />
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid var(--border)', padding: '1.5rem 0', marginTop: 'auto' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div>
            <strong>MediResQ</strong> &bull; AI Healthcare Navigation & Verified Physical Resource Platform
          </div>
          <div>
            Emergency Services: <a href="tel:112" style={{ color: 'var(--emergency)', fontWeight: 600 }}>112</a> &bull; Medical Decision-Support Only
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
