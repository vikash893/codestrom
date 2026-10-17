import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Building2, PhoneCall, ShieldCheck, Clock } from 'lucide-react';

export const HospitalDashboard = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await api.get('/hospitals');
        setHospitals(res.data.hospitals || []);
      } catch (err) {
        console.error('Failed to load hospitals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  return (
    <div className="container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Hospital Facility Portal</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Manage emergency department readiness, verified hotlines, and facility operating credentials
        </p>
      </div>

      <div className="grid-2">
        {hospitals.map((hosp) => (
          <div key={hosp._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{hosp.hospitalName}</h3>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Reg: {hosp.registrationNumber}</span>
              </div>
              <span className={`badge ${hosp.isVerified ? 'badge-success' : 'badge-warning'}`}>
                {hosp.isVerified ? 'Verified Facility' : 'Pending Verification'}
              </span>
            </div>

            <div style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              <div><strong>Address:</strong> {hosp.address?.street}, {hosp.address?.city}, {hosp.address?.state}</div>
              <div style={{ marginTop: '0.25rem' }}>
                <strong>Trauma Care:</strong> {hosp.traumaCareLevel} &bull; <strong>24/7 Emergency:</strong> {hosp.emergencyDepartmentAvailable ? 'Active' : 'No'}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>VERIFIED EMERGENCY HOTLINES:</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {hosp.verifiedEmergencyNumbers?.map((num) => (
                  <a key={num} href={`tel:${num}`} className="tel-link">
                    <PhoneCall size={14} />
                    <span>{num}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
