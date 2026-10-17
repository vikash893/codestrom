import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, PhoneCall, User as UserIcon, LogOut, ShieldAlert } from 'lucide-react';

export const Navbar = ({ onOpenAuth, activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  return (
    <header style={{ background: '#ffffff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setActiveTab('intake')}>
          <div style={{ background: 'var(--primary)', color: 'white', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
            <Activity size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>MediResQ</h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AI Emergency & Resource Navigation</span>
          </div>
        </div>

        {/* Emergency Call Quick Access */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a href="tel:112" className="tel-link" title="Call Emergency Services immediately">
            <PhoneCall size={16} />
            <span>Emergency 112</span>
          </a>

          {/* User Section */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', background: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '20px' }}>
                <UserIcon size={16} color="var(--primary)" />
                <span style={{ fontWeight: 600 }}>{user.phone}</span>
                <span className={`badge ${user.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                  {user.role}
                </span>
              </div>
              <button className="btn btn-outline" onClick={logout} style={{ padding: '0.4rem 0.75rem' }}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onOpenAuth}>
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
