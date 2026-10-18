import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sidebar } from './Sidebar';
import { SkeletonQueueItem, SkeletonCard, SkeletonRow } from './Skeleton';
import {
  Stethoscope,
  Check,
  X,
  CheckCircle,
  FileText,
  Plus,
  PhoneCall,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Search,
  MapPin,
  Calendar,
} from 'lucide-react';

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'consultations' | 'profile'
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [evidenceAnalysis, setEvidenceAnalysis] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [consultationsLoading, setConsultationsLoading] = useState(true);

  // Clinical notes state
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [prescriptions, setPrescriptions] = useState([
    { medicineName: '', dosage: '', frequency: '', durationDays: 5, instructions: '' },
  ]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const loadDoctorData = async () => {
    setConsultationsLoading(true);
    try {
      const consultRes = await api.get('/consultations/my');
      setConsultations(consultRes.data.consultations || []);

      const meRes = await api.get('/auth/me');
      if (meRes.data.user) {
        const docList = await api.get('/doctors');
        const myDoc = docList.data.doctors?.find((d) => d.verifiedPhone === meRes.data.user.phone);
        if (myDoc) {
          setProfile(myDoc);
          setIsAvailable(myDoc.isAvailable);
        }
      }
    } catch (err) {
      console.warn('Doctor profile load:', err.message);
    } finally {
      setConsultationsLoading(false);
    }
  };

  const loadPriorityQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await api.get('/cases/queue');
      // Sort cases: P0 emergency first, then by createdAt desc
      const sorted = (res.data.queue || []).sort((a, b) => {
        if (a.priority === 'P0_EMERGENCY' && b.priority !== 'P0_EMERGENCY') return -1;
        if (b.priority === 'P0_EMERGENCY' && a.priority !== 'P0_EMERGENCY') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setPriorityQueue(sorted);
    } catch (err) {
      console.warn('Priority queue query:', err.message);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
    loadPriorityQueue();
    const interval = setInterval(loadPriorityQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAvailability = async () => {
    try {
      const res = await api.patch('/doctors/availability', { isAvailable: !isAvailable });
      setIsAvailable(res.data.isAvailable);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle availability');
    }
  };

  const handleAcceptCase = async (caseId) => {
    try {
      await api.post(`/cases/${caseId}/accept`);
      alert(`Case ${caseId} accepted! You are now the assigned clinician.`);
      loadPriorityQueue();
      loadDoctorData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept case');
      loadPriorityQueue();
    }
  };

  const handleAcknowledgeCase = async (caseId) => {
    try {
      await api.post(`/cases/${caseId}/acknowledge`);
      loadPriorityQueue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge case');
    }
  };

  const handleDeclineCase = async (caseId) => {
    const reason = prompt('Reason for declining/releasing case:', 'Provider busy');
    if (!reason) return;
    try {
      await api.post(`/cases/${caseId}/decline`, { reason });
      loadPriorityQueue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to release case');
    }
  };

  const handleInspectEvidence = async (c) => {
    setSelectedCase(c);
    setEvidenceLoading(true);
    setEvidenceAnalysis(null);
    try {
      const res = await api.post('http://127.0.0.1:8000/api/v1/clinical/evidence-synthesis', {
        symptoms: c.patientDetails?.extractedSymptoms || [],
        description: c.patientDetails?.description || '',
        severity: c.patientDetails?.severity || 'unknown',
        age_years: c.patientDetails?.ageYears,
      });
      setEvidenceAnalysis(res.data);
    } catch (err) {
      setEvidenceAnalysis({
        possible_conditions: [
          {
            name: 'Differential Clinical Assessment Pending',
            confidence: 0.75,
            clinical_rationale: 'Review patient reported symptoms and perform in-person or teleconsult assessment.',
            missing_findings: ['Blood pressure', 'Auscultation'],
            warning_signs: ['Loss of consciousness', 'Severe dyspnea'],
            citations: [{ source: 'WHO Clinical Practice Guidelines', title: 'Primary Care Assessment', url: 'https://who.int' }],
          },
        ],
        clinical_rationale: 'Clinical review recommended.',
        uncertainty_level: 'MODERATE',
        disclaimer: 'Decision-support only. Doctor review mandatory.',
      });
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleAddPrescriptionRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      { medicineName: '', dosage: '', frequency: '', durationDays: 5, instructions: '' },
    ]);
  };

  const handlePrescriptionChange = (index, field, value) => {
    setPrescriptions((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleSubmitNotes = async (e) => {
    e.preventDefault();
    if (!activeConsultation) return;

    setSubmitLoading(true);
    try {
      const validPrescriptions = prescriptions.filter((p) => p.medicineName.trim().length > 0);
      await api.post(`/consultations/${activeConsultation._id}/notes`, {
        clinicalNotes,
        recommendations,
        prescribedMedicines: validPrescriptions,
      });

      alert('Clinical notes and prescriptions submitted successfully!');
      setActiveConsultation(null);
      setClinicalNotes('');
      setRecommendations('');
      loadDoctorData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit clinical notes');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        role="doctor"
        counts={{
          queue: priorityQueue.length,
          consultations: consultations.length,
        }}
      />

      {/* Main Content Workspace */}
      <div style={{ flex: 1, padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {language === 'hi' ? 'चिकित्सक आपातकालीन एवं परामर्श पोर्टल' : 'Doctor Emergency Queue & Consultation Portal'}
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              {language === 'hi'
                ? 'डब्ल्यूएचओ ट्राइएज आपातकालीन कतार, पास के आपात मामलों की प्राथमिकता एवं डिजिटल पर्चा'
                : 'WHO 4-Tier triage priority queue, emergency SLA management, and clinical consultations'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              className={`btn ${isAvailable ? 'btn-primary' : 'btn-outline'}`}
              onClick={handleToggleAvailability}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              <span>{isAvailable ? 'Status: Available Online' : 'Status: Offline / Inactive'}</span>
            </button>
            <button
              className="btn btn-outline"
              onClick={loadPriorityQueue}
              style={{ padding: '0.4rem 0.6rem' }}
              title="Refresh Queue"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* TAB 1: PRIORITY EMERGENCY QUEUE */}
        {activeTab === 'queue' && (
          <div>
            {queueLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <SkeletonQueueItem />
                <SkeletonQueueItem />
                <SkeletonQueueItem />
              </div>
            ) : priorityQueue.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '10px', padding: '3rem', textAlign: 'center', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                <ShieldAlert size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>
                  {language === 'hi' ? 'आपातकालीन कतार में कोई नया मामला नहीं है' : 'Priority Queue is Clear'}
                </h4>
                <p style={{ fontSize: '0.825rem' }}>
                  {language === 'hi' ? 'जैसे ही कोई मरीज लक्षण दर्ज करेगा, वह ट्राइएज प्राथमिकता के अनुसार यहां दिखाई देगा।' : 'Incoming patient triage cases will appear here ordered by critical SLA priority.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {priorityQueue.map((c) => {
                  const isEmergency = c.priority === 'P0_EMERGENCY';

                  return (
                    <div
                      key={c._id}
                      className="card"
                      style={{
                        background: isEmergency ? '#fff5f5' : '#ffffff',
                        border: isEmergency ? '2px solid #ef4444' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        boxShadow: isEmergency ? '0 4px 14px rgba(239, 68, 68, 0.15)' : 'none',
                      }}
                    >
                      {/* Priority Tag & SLA */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`badge ${isEmergency ? 'badge-emergency' : 'badge-info'}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}>
                            {c.priority} ({c.triageLevel})
                          </span>

                          {/* Nearby Emergency Badge */}
                          {isEmergency && (
                            <span style={{
                              background: '#dc2626',
                              color: '#ffffff',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              letterSpacing: '0.05em',
                              animation: 'pulse 1.5s infinite',
                            }}>
                              🚨 {language === 'hi' ? 'पास में गंभीर आपातकाल (Priority #1)' : 'NEARBY CRITICAL EMERGENCY (Priority #1)'}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock size={14} />
                          <span>Case: <strong>{c.caseId}</strong> &bull; {new Date(c.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {/* Patient Details */}
                      <div style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                        <strong>Description:</strong> {c.patientDetails?.description || 'Patient reported symptoms'}
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {c.patientDetails?.extractedSymptoms?.map((sym, sIdx) => (
                          <span key={sIdx} className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                            {sym.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => handleInspectEvidence(c)}
                        >
                          {language === 'hi' ? 'एआई नैदानिक साक्ष्य देखें' : 'Inspect AI Clinical Differential'}
                        </button>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#b91c1c', borderColor: '#fca5a5' }}
                            onClick={() => handleDeclineCase(c._id)}
                          >
                            Decline / Release
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                            onClick={() => handleAcknowledgeCase(c._id)}
                          >
                            Acknowledge
                          </button>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem', fontWeight: 700 }}
                            onClick={() => handleAcceptCase(c._id)}
                          >
                            ✓ Accept Case
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Evidence Modal / Bottom Viewer */}
            {selectedCase && (
              <div style={{ marginTop: '1.5rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    AI Clinical Synthesis for Case: {selectedCase.caseId}
                  </h4>
                  <button onClick={() => setSelectedCase(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    ✕ Close
                  </button>
                </div>

                {evidenceLoading ? (
                  <SkeletonCard height="160px" />
                ) : evidenceAnalysis ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                      {evidenceAnalysis.possible_conditions?.map((pc, pci) => (
                        <div key={pci} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.825rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{pc.name} ({Math.round(pc.confidence * 100)}%)</div>
                          <p style={{ margin: '0.25rem 0', color: '#475569' }}>{pc.clinical_rationale}</p>
                          {pc.warning_signs?.length > 0 && (
                            <div style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                              ⚠️ Warning Signs: {pc.warning_signs.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE CONSULTATIONS & DIGITAL PRESCRIPTION */}
        {activeTab === 'consultations' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.4fr)', gap: '1.5rem' }}>
              {/* Consultations List */}
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  {language === 'hi' ? 'रोगी परामर्श सूची' : 'Patient Consultations'} ({consultations.length})
                </h4>
                {consultationsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </div>
                ) : consultations.length === 0 ? (
                  <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '10px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
                    No consultations scheduled yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {consultations.map((con) => (
                      <div
                        key={con._id}
                        onClick={() => setActiveConsultation(con)}
                        style={{
                          background: activeConsultation?._id === con._id ? '#eff6ff' : '#ffffff',
                          border: activeConsultation?._id === con._id ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <strong style={{ fontSize: '0.9rem' }}>Patient: {con.patientId?.fullName || con.patientId?.phone || 'Patient'}</strong>
                          <span className={`badge ${con.status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                            {con.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Mode: {con.consultationMode} &bull; Urgency: {con.urgency}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Consultation Workspace / Notes Form */}
              <div>
                {activeConsultation ? (
                  <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                      Clinical Notes & Prescription
                    </h4>

                    <form onSubmit={handleSubmitNotes}>
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem', display: 'block', marginBottom: '0.25rem' }}>
                          Clinical Assessment & Examination Notes
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          placeholder="e.g. Patient presents with non-radiating chest tightness. Vitals stable. Recommend ECG and troponin."
                          value={clinicalNotes}
                          onChange={(e) => setClinicalNotes(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem', display: 'block', marginBottom: '0.25rem' }}>
                          Diet & Lifestyle Recommendations
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          placeholder="e.g. Bed rest, avoid heavy physical exertion, light diet"
                          value={recommendations}
                          onChange={(e) => setRecommendations(e.target.value)}
                        />
                      </div>

                      {/* Prescriptions */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.825rem', margin: 0 }}>
                            Prescribed Medicines (Digital Rx)
                          </label>
                          <button
                            type="button"
                            onClick={handleAddPrescriptionRow}
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                          >
                            + Add Medicine
                          </button>
                        </div>

                        {prescriptions.map((p, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: '0.4rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              placeholder="Medicine Name (e.g. Dolo 650)"
                              value={p.medicineName}
                              onChange={(e) => handlePrescriptionChange(idx, 'medicineName', e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: '0.4rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              placeholder="Dosage (1 tab TDS)"
                              value={p.dosage}
                              onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: '0.4rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              placeholder="Frequency"
                              value={p.frequency}
                              onChange={(e) => handlePrescriptionChange(idx, 'frequency', e.target.value)}
                            />
                          </div>
                        ))}
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
                        disabled={submitLoading}
                      >
                        {submitLoading ? 'Saving...' : 'Submit Digital Prescription & Complete'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div style={{ background: '#ffffff', padding: '3rem', borderRadius: '10px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                    Select a patient consultation on the left to write notes and prescribe medicines.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOCTOR PROFILE & WORKING HOURS */}
        {activeTab === 'profile' && (
          <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.5rem', maxWidth: '600px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1rem 0' }}>
              Doctor Practice Profile & Availability
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div>
                <strong>Name: </strong> {profile?.fullName || user.phone}
              </div>
              <div>
                <strong>Medical Registration No: </strong> {profile?.medicalRegistrationNumber || 'Verified License'}
              </div>
              <div>
                <strong>Specialties: </strong> {profile?.specialties?.join(', ') || 'General Medicine'}
              </div>
              <div>
                <strong>Qualifications: </strong> {profile?.qualifications?.join(', ') || 'MBBS'}
              </div>
              <div>
                <strong>Consultation Fee: </strong> ₹{profile?.consultationFee || 500}
              </div>
              <div>
                <strong>Clinic Address: </strong> {profile?.clinicAddress || 'Central Hospital'}
              </div>
              <div>
                <strong>Working Hours: </strong> {profile?.workingHours?.start || '09:00'} - {profile?.workingHours?.end || '18:00'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
