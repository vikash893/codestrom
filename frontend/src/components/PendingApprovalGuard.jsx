import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogOut,
  Building2,
  Stethoscope,
  Pill,
  FileText,
  Phone,
} from 'lucide-react';
import api from '../services/api';

export const PendingApprovalGuard = ({ children }) => {
  const { user, profile, setProfile, logout } = useAuth();
  const { language } = useLanguage();
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // If user is not logged in, or is patient or admin, pass through directly
  if (!user || user.role === 'patient' || user.role === 'admin') {
    return children;
  }

  // Check verification flags
  const isPending =
    profile?.verificationStatus === 'pending' ||
    user.status === 'pending' ||
    (!user.isVerified && profile?.verificationStatus !== 'approved');

  const isRejected = profile?.verificationStatus === 'rejected';

  // If approved and verified, render dashboard normally
  if (!isPending && !isRejected && (profile?.isVerified || user.isVerified)) {
    return children;
  }

  const handleRefreshStatus = async () => {
    setChecking(true);
    setStatusMsg(null);
    try {
      const res = await api.get('/auth/me');
      if (res.data.profile) {
        setProfile(res.data.profile);
      }
      if (res.data.user?.isVerified || res.data.profile?.isVerified) {
        setStatusMsg({ type: 'success', text: 'Congratulations! Your account has been approved by the Administrator.' });
        window.location.reload();
      } else {
        setStatusMsg({ type: 'info', text: 'Verification is still under review by the Administrator.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Could not refresh status. Please try again.' });
    } finally {
      setChecking(false);
    }
  };

  const getRoleIcon = () => {
    if (user.role === 'doctor') return Stethoscope;
    if (user.role === 'pharmacy') return Pill;
    if (user.role === 'hospital') return Building2;
    return ShieldAlert;
  };

  const RoleIcon = getRoleIcon();

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          maxWidth: '560px',
          width: '100%',
          padding: '2.25rem',
          textAlign: 'center',
        }}
      >
        {/* Status Badge & Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isRejected ? '#fee2e2' : '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}
        >
          {isRejected ? (
            <XCircle size={32} color="#dc2626" />
          ) : (
            <Clock size={32} color="#d97706" />
          )}
        </div>

        <span
          style={{
            background: isRejected ? '#fee2e2' : '#fef3c7',
            color: isRejected ? '#991b1b' : '#92400e',
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0.2rem 0.65rem',
            borderRadius: '999px',
          }}
        >
          {isRejected
            ? language === 'hi' ? 'आवेदन अस्वीकृत' : 'Application Rejected'
            : language === 'hi' ? 'व्यवस्थापक अनुमोदन लंबित' : 'Administrator Approval Pending'}
        </span>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '1rem 0 0.5rem 0' }}>
          {isRejected
            ? language === 'hi' ? 'खाता सत्यापन अस्वीकृत' : 'Provider Verification Rejected'
            : language === 'hi' ? 'पंजीकरण समीक्षाधीन है' : 'Registration Under Administrative Review'}
        </h2>

        <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
          {isRejected
            ? language === 'hi'
              ? 'आपके द्वारा प्रस्तुत चिकित्सा क्रेडेंशियल स्वीकृत नहीं हो सके। कृपया सहायता टीम से संपर्क करें।'
              : 'Your submitted medical council / drug license credentials could not be verified. Please contact administrator support.'
            : language === 'hi'
              ? `नमस्ते ${user.name || user.phone}! रोगी सुरक्षा नियमों के अनुसार, सभी डॉक्टर, मेडिकल स्टोर एवं अस्पतालों को क्लिनिकल सुविधाएं अनलॉक करने से पहले एडमिनिस्ट्रेटर द्वारा सत्यापन आवश्यक है।`
              : `Hello ${user.name || user.phone}! Under MediResQ patient safety guidelines, all ${user.role} accounts require administrative verification of credentials before full portal features can be accessed.`}
        </p>

        {/* Feedback message */}
        {statusMsg && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
              background: statusMsg.type === 'success' ? '#f0fdf4' : statusMsg.type === 'error' ? '#fef2f2' : '#eff6ff',
              color: statusMsg.type === 'success' ? '#166534' : statusMsg.type === 'error' ? '#991b1b' : '#1e40af',
              border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : statusMsg.type === 'error' ? '#fca5a5' : '#bfdbfe'}`,
            }}
          >
            {statusMsg.text}
          </div>
        )}

        {/* Submitted Credentials Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            textAlign: 'left',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            {language === 'hi' ? 'जमा किए गए क्रेडेंशियल विवरण' : 'Submitted Provider Credentials'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.825rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Provider Type:</span>
              <div style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Registered Contact:</span>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{user.phone}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>License / Reg No:</span>
              <div style={{ fontWeight: 700, color: '#2563eb' }}>
                {profile?.medicalRegistrationNumber ||
                  profile?.drugLicenseNumber ||
                  profile?.registrationNumber ||
                  'Pending Submission'}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Approval Status:</span>
              <div style={{ fontWeight: 700, color: isRejected ? '#dc2626' : '#d97706', textTransform: 'capitalize' }}>
                {profile?.verificationStatus || 'Pending Review'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={handleRefreshStatus}
            disabled={checking}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Checking Status...' : language === 'hi' ? 'स्थिति जांचें' : 'Check Verification Status'}</span>
          </button>

          <button
            onClick={logout}
            className="btn btn-outline"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
          >
            <LogOut size={15} />
            <span>{language === 'hi' ? 'लॉग आउट' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
