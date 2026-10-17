import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldAlert, Check, X, Users, Activity, Stethoscope, Pill, Building2, Clock } from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState({ doctors: [], pharmacies: [], hospitals: [] });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, logsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/verifications/pending'),
        api.get('/admin/audit-logs'),
      ]);

      setStats(statsRes.data.stats);
      setPending(pendingRes.data.pending);
      setLogs(logsRes.data.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleDecision = async (entityType, entityId, status) => {
    const reason = prompt(`Reason for ${status}ing this ${entityType}:`) || 'Administrative verification review';
    try {
      await api.post('/admin/verifications/decision', {
        entityType,
        entityId,
        status,
        reason,
      });
      alert(`${entityType} marked as ${status}!`);
      loadAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Verification update failed');
    }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>System Administration & Governance</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Review provider credentials, monitor audit logs, and oversee platform medical safety
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#e0f2fe', padding: '0.75rem', borderRadius: '8px' }}>
              <Users size={24} color="#0284c7" />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Patients</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalPatients}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#dcfce7', padding: '0.75rem', borderRadius: '8px' }}>
              <Stethoscope size={24} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified Doctors</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.verifiedDoctors}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '8px' }}>
              <Pill size={24} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified Pharmacies</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.verifiedPharmacies}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#fee2e2', padding: '0.75rem', borderRadius: '8px' }}>
              <Building2 size={24} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Emergency Hospitals</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.emergencyHospitals}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#f3e8ff', padding: '0.75rem', borderRadius: '8px' }}>
              <Activity size={24} color="#9333ea" />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Consultations Completed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalConsultations}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#ffedd5', padding: '0.75rem', borderRadius: '8px' }}>
              <ShieldAlert size={24} color="#ea580c" />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Emergency Triage Escalations</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.emergencyIntakes}</div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Verifications Queue */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
          Pending Provider Verifications
        </h3>

        {pending.doctors.length === 0 && pending.pharmacies.length === 0 && pending.hospitals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
            No pending provider verification requests.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Pending Doctors */}
            {pending.doctors.map((d) => (
              <div key={d._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div>
                  <strong>Doctor: {d.fullName}</strong>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Council Reg: {d.medicalRegistrationNumber} ({d.registrationCouncil}) &bull; Specialties: {d.specialties?.join(', ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={() => handleDecision('DoctorProfile', d._id, 'approved')}>
                    <Check size={14} /> Approve
                  </button>
                  <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={() => handleDecision('DoctorProfile', d._id, 'rejected')}>
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}

            {/* Pending Pharmacies */}
            {pending.pharmacies.map((p) => (
              <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div>
                  <strong>Pharmacy: {p.storeName}</strong>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Drug License: {p.drugLicenseNumber} &bull; Contact: {p.verifiedContactNumber}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={() => handleDecision('Pharmacy', p._id, 'approved')}>
                    <Check size={14} /> Approve
                  </button>
                  <button className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={() => handleDecision('Pharmacy', p._id, 'rejected')}>
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
          Administrative Security Audit Trail
        </h3>
        {logs.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Target Entity</th>
                <th>Admin Actor</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td><strong>{log.action}</strong></td>
                  <td>{log.targetEntity}</td>
                  <td>{log.actorUserId?.phone || 'Admin'}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
            No administrative audit actions recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};
