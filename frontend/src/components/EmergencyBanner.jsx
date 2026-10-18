import React from 'react';
import { AlertTriangle, PhoneCall } from 'lucide-react';

export const EmergencyBanner = ({ guidance, flags, callNumber = '112' }) => {
  if (!guidance && (!flags || flags.length === 0)) return null;

  return (
    <div className="emergency-banner" role="alert">
      <div style={{ color: '#dc2626', marginTop: '0.15rem' }}>
        <AlertTriangle size={28} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <strong style={{ fontSize: '1rem', color: '#991b1b' }}>POTENTIAL MEDICAL EMERGENCY DETECTED</strong>
          {flags && flags.map((f) => (
            <span key={f} className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
              {f.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
        <p style={{ fontSize: '0.925rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
          {guidance || 'Critical symptoms detected. Do not wait for an online doctor or questionnaire. Seek emergency medical care immediately.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a href={`tel:${callNumber}`} className="tel-link" style={{ padding: '0.5rem 1rem', fontSize: '0.95rem' }}>
            <PhoneCall size={18} />
            <span>Call Emergency Services ({callNumber}) Now</span>
          </a>
        </div>
      </div>
    </div>
  );
};
