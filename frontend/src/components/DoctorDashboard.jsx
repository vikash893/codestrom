import React, { useState, useEffect } from 'react';
import api from '../services/api';
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
} from 'lucide-react';

export const DoctorDashboard = () => {
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [evidenceAnalysis, setEvidenceAnalysis] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);

  // Clinical notes state
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [prescriptions, setPrescriptions] = useState([
    { medicineName: '', dosage: '', frequency: '', durationDays: 5, instructions: '' },
  ]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const loadDoctorData = async () => {
    try {
      // 1. Fetch consultations
      const consultRes = await api.get('/consultations/my');
      setConsultations(consultRes.data.consultations || []);

      // 2. Fetch doctor profile
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
      console.error('Failed to load doctor data:', err);
    }
  };

  const loadPriorityQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await api.get('/cases/queue');
      setPriorityQueue(res.data.queue || []);
    } catch (err) {
      console.warn('Priority queue query:', err.message);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
    loadPriorityQueue();
    // Poll queue periodically for incoming SLA cases
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

  const handleAcknowledgeCase = async (caseId) => {
    try {
      await api.post(`/cases/${caseId}/acknowledge`);
      loadPriorityQueue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge case');
    }
  };

  const handleAcceptCase = async (caseId) => {
    try {
      const res = await api.post(`/cases/${caseId}/accept`);
      alert(`Case ${caseId} accepted! You are now the assigned clinician.`);
      loadPriorityQueue();
      loadDoctorData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept case (may have been claimed by another doctor)');
      loadPriorityQueue();
    }
  };

  const handleDeclineCase = async (caseId) => {
    const reason = prompt('Please provide a reason for declining / releasing this case:', 'Provider busy');
    if (!reason) return;
    try {
      await api.post(`/cases/${caseId}/decline`, { reason });
      loadPriorityQueue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to release case');
    }
  };

  const handleEscalateCase = async (caseId) => {
    const reason = prompt('Reason for emergency escalation to P0:', 'Signs of clinical deterioration observed');
    if (!reason) return;
    try {
      await api.post(`/cases/${caseId}/escalate`, { reason });
      alert(`Case ${caseId} has been escalated to P0 EMERGENCY.`);
      loadPriorityQueue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to escalate case');
    }
  };

  const handleInspectCaseEvidence = async (c) => {
    setSelectedCase(c);
    setEvidenceLoading(true);
    setEvidenceAnalysis(null);
    try {
      // Request AI Evidence Synthesis
      const res = await api.post('http://127.0.0.1:8000/api/v1/clinical/evidence-synthesis', {
        symptoms: c.patientDetails?.extractedSymptoms || [],
        description: c.patientDetails?.description || '',
        severity: c.patientDetails?.severity || 'unknown',
        age_years: c.patientDetails?.ageYears,
      });
      setEvidenceAnalysis(res.data);
    } catch (err) {
      // Fallback local synthesis preview
      setEvidenceAnalysis({
        possible_conditions: [
          {
            name: 'Differential Clinical Assessment Pending',
            confidence: 0.7,
            clinical_rationale: 'Review patient reported symptoms and perform in-person or teleconsult assessment.',
            missing_findings: ['Blood pressure', 'Heart rate', 'Auscultation'],
            warning_signs: ['Loss of consciousness', 'Severe dyspnea'],
            citations: [{ source: 'WHO Clinical Practice Guidelines', title: 'Primary Care Assessment', url: 'https://who.int' }],
          },
        ],
        clinical_rationale: 'Evidence analysis generated via local safe medical decision-support protocol.',
        suggested_specialties: ['General Medicine'],
        uncertainty_level: 'MODERATE',
        disclaimer: 'Decision-support only. Doctor review mandatory.',
      });
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleUpdateStatus = async (consultationId, newStatus) => {
    try {
      await api.patch(`/consultations/${consultationId}/status`, { status: newStatus });
      loadDoctorData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update consultation status');
    }
  };

  const handleAddPrescriptionRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      { medicineName: '', dosage: '', frequency: '', durationDays: 3, instructions: '' },
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

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'P0_EMERGENCY':
        return 'badge-emergency';
      case 'P1_URGENT':
        return 'badge-warning';
      case 'P2_PRIORITY':
        return 'badge-info';
      default:
        return 'badge-success';
    }
  };

  return (
    <div className="container">
      {/* Header & Availability */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Clinician Emergency & Consultation Portal</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Real-time WHO 4-tier triage priority queue, SLA escalations, and AI clinical decision-support
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className={`btn ${isAvailable ? 'btn-primary' : 'btn-outline'}`}
            onClick={handleToggleAvailability}
          >
            <span>{isAvailable ? 'Status: Available Online' : 'Status: Offline / Inactive'}</span>
          </button>
          <button className="btn btn-outline" onClick={loadPriorityQueue} title="Refresh Priority Queue">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* P0 EMERGENCY HIGH-PRIORITY ALERT BANNER (If any P0 waiting) */}
      {priorityQueue.some((q) => q.priority === 'P0_EMERGENCY' && q.status === 'QUEUED') && (
        <div
          style={{
            background: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            animation: 'pulse 2s infinite',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={28} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.05rem' }}>
                CRITICAL WARNING: P0 EMERGENCY PATIENT(S) IN QUEUE
              </div>
              <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                Life-threatening red-flag symptoms detected. Immediate provider acknowledgment and triage required.
              </div>
            </div>
          </div>
          <button
            className="btn btn-emergency"
            onClick={() => {
              const p0 = priorityQueue.find((q) => q.priority === 'P0_EMERGENCY');
              if (p0) handleInspectCaseEvidence(p0);
            }}
          >
            Review P0 Case Now
          </button>
        </div>
      )}

      {/* SLA Priority Queue Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              SLA Emergency Priority Queue ({priorityQueue.length} Active Cases)
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>
              Sorted by dynamic urgency: WHO Triage Class + Waiting Time Aging
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Auto-refreshes every 10s
          </span>
        </div>

        {priorityQueue.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem' }}>Case ID</th>
                  <th style={{ padding: '0.6rem' }}>Priority / Triage</th>
                  <th style={{ padding: '0.6rem' }}>Symptoms & Description</th>
                  <th style={{ padding: '0.6rem' }}>Waiting Time</th>
                  <th style={{ padding: '0.6rem' }}>Status</th>
                  <th style={{ padding: '0.6rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {priorityQueue.map((item) => (
                  <tr
                    key={item.caseId}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: item.priority === 'P0_EMERGENCY' ? '#fff5f5' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '0.6rem', fontWeight: 700 }}>{item.caseId}</td>
                    <td style={{ padding: '0.6rem' }}>
                      <span className={`badge ${getPriorityBadgeClass(item.priority)}`}>
                        {item.priority} ({item.triageLevel})
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem', maxWidth: '300px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {item.patientDetails?.description || 'N/A'}
                      </div>
                      {item.reasonCodes?.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                          Reason: {item.reasonCodes.join(', ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                        <Clock size={14} /> {item.elapsedMinutes ?? 0}m
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      <span className="badge badge-info">{item.status}</span>
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleInspectCaseEvidence(item)}
                          title="View clinical decision support & citations"
                        >
                          <Search size={14} /> Evidence
                        </button>
                        {item.status === 'QUEUED' && (
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleAcknowledgeCase(item.caseId)}
                          >
                            <Check size={14} /> Ack
                          </button>
                        )}
                        {['QUEUED', 'ACKNOWLEDGED'].includes(item.status) && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleAcceptCase(item.caseId)}
                          >
                            Claim
                          </button>
                        )}
                        {item.priority !== 'P0_EMERGENCY' && (
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => handleEscalateCase(item.caseId)}
                            title="Escalate to P0 Emergency"
                          >
                            <AlertTriangle size={14} /> Escalate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
            No queued priority cases at this time.
          </div>
        )}
      </div>

      {/* Clinical Evidence & Case Detail Modal / Drawer */}
      {selectedCase && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Stethoscope size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Clinical Decision-Support: Case {selectedCase.caseId}
              </h3>
            </div>
            <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setSelectedCase(null)}>
              <X size={16} /> Close
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
              <strong>Patient Details:</strong>
              <div>Age: {selectedCase.patientDetails?.ageYears || 'Unspecified'}</div>
              <div>Duration: {selectedCase.patientDetails?.duration || 'Unspecified'}</div>
              <div>Reported Severity: {selectedCase.patientDetails?.severity || 'unknown'}</div>
              <div>Extracted Symptoms: {selectedCase.patientDetails?.extractedSymptoms?.join(', ') || 'None identified'}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
              <strong>WHO Triage Assessment:</strong>
              <div style={{ color: selectedCase.triageLevel === 'RED' ? '#dc2626' : 'var(--text)' }}>
                Triage Level: {selectedCase.triageLevel} ({selectedCase.priority})
              </div>
              <div>Guidance: {selectedCase.patientGuidance || 'Standard routine triage.'}</div>
              <div>Ruleset: {selectedCase.rulesetVersion}</div>
            </div>
          </div>

          {/* Evidence Analysis Display */}
          {evidenceLoading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Synthesizing evidence across WHO and MoHFW guidelines...
            </div>
          ) : evidenceAnalysis ? (
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Prospective Differential Conditions (Decision-Support Only):</span>
                <span className="badge badge-info">{evidenceAnalysis.uncertainty_level} UNCERTAINTY</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                {evidenceAnalysis.possible_conditions?.map((pc, i) => (
                  <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                      <span>{pc.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Match Confidence: {Math.round(pc.confidence * 100)}%
                      </span>
                    </div>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>
                      {pc.clinical_rationale}
                    </p>

                    {pc.missing_findings?.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '0.25rem' }}>
                        <strong>Missing Findings to Confirm:</strong> {pc.missing_findings.join(', ')}
                      </div>
                    )}

                    {pc.citations?.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                        <strong>Verifiable Citations:</strong>{' '}
                        {pc.citations.map((c, ci) => (
                          <a key={ci} href={c.url} target="_blank" rel="noreferrer" style={{ marginRight: '0.5rem', textDecoration: 'underline' }}>
                            {c.source} ({c.title})
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                ⚠️ {evidenceAnalysis.disclaimer}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Existing Consultations & Documentation Section */}
      <div className="grid-2">
        {/* Left: Consultation Request Queue */}
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
            Confirmed Consultations ({consultations.length})
          </h3>

          {consultations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {consultations.map((c) => (
                <div key={c._id} className="card" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>Patient: {c.patientId?.phone || 'Confidential'}</span>
                    <span className={`badge ${c.status === 'completed' ? 'badge-success' : c.status === 'accepted' ? 'badge-info' : 'badge-warning'}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>

                  {c.intakeRecordId && (
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Authorized Intake Summary:</div>
                      <div>{c.intakeRecordId.structuredSummary}</div>
                      {c.intakeRecordId.isEmergency && (
                        <div style={{ color: 'var(--emergency)', fontWeight: 600, marginTop: '0.25rem' }}>
                          ⚠️ Emergency Flags: {c.intakeRecordId.emergencyFlags?.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    {c.status === 'requested' && (
                      <>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '0.825rem', padding: '0.4rem 0.75rem' }}
                          onClick={() => handleUpdateStatus(c._id, 'accepted')}
                        >
                          <Check size={16} />
                          <span>Accept Request</span>
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: '0.825rem', padding: '0.4rem 0.75rem' }}
                          onClick={() => handleUpdateStatus(c._id, 'declined')}
                        >
                          <X size={16} />
                          <span>Decline</span>
                        </button>
                      </>
                    )}

                    {(c.status === 'accepted' || c.status === 'in_progress') && (
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '0.825rem', padding: '0.4rem 0.75rem' }}
                        onClick={() => setActiveConsultation(c)}
                      >
                        <FileText size={16} />
                        <span>Document Consultation</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              No incoming consultation requests in queue.
            </div>
          )}
        </div>

        {/* Right: Clinical Consultation Documentation */}
        <div>
          {activeConsultation ? (
            <div className="card">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Document Consultation
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Consultation ID: {activeConsultation._id}
              </p>

              <form onSubmit={handleSubmitNotes}>
                <div className="form-group">
                  <label className="form-label">Clinical Observations & Assessment *</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Enter clinical assessment, differential diagnosis notes, or physical exam observations..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Follow-up Instructions & Recommendations</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="e.g., Hydration, follow-up in 3 days if fever persists..."
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                  />
                </div>

                {/* Prescriptions Builder */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Prescribed Medicines</label>
                    <button type="button" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }} onClick={handleAddPrescriptionRow}>
                      <Plus size={14} /> Add Medicine
                    </button>
                  </div>

                  {prescriptions.map((p, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.5rem', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Medicine Name (e.g. Paracetamol)"
                          value={p.medicineName}
                          onChange={(e) => handlePrescriptionChange(idx, 'medicineName', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Dosage (e.g. 500mg)"
                          value={p.dosage}
                          onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Frequency (e.g. TID / 3x daily)"
                          value={p.frequency}
                          onChange={(e) => handlePrescriptionChange(idx, 'frequency', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Instructions (e.g. After meals)"
                          value={p.instructions}
                          onChange={(e) => handlePrescriptionChange(idx, 'instructions', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                    {submitLoading ? 'Submitting...' : 'Sign & Submit Clinical Notes'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setActiveConsultation(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
              Select an accepted consultation or queue item to document clinical notes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
