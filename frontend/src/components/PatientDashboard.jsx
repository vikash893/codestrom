import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmergencyBanner } from './EmergencyBanner';
import {
  Activity,
  Send,
  Mic,
  Camera,
  MapPin,
  Building2,
  Pill,
  Stethoscope,
  Clock,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const PatientDashboard = ({ onOpenAuth }) => {
  const { user } = useAuth();

  // Active sub-navigation tab
  const [activeTab, setActiveTab] = useState('intake');

  // Coordinates
  const [coords, setCoords] = useState({ lng: 77.2090, lat: 28.6139 }); // Default Delhi
  const [locationName, setLocationName] = useState('New Delhi (Default)');

  // Intake State
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('unknown');
  const [age, setAge] = useState('');
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeResult, setIntakeResult] = useState(null);
  const [intakeError, setIntakeError] = useState('');

  // Media upload state
  const [mediaLoading, setMediaLoading] = useState(false);
  const [ocrConfirmation, setOcrConfirmation] = useState(null);

  // Discovery state
  const [hospitals, setHospitals] = useState([]);
  const [medicineQuery, setMedicineQuery] = useState('');
  const [medicineMatches, setMedicineMatches] = useState([]);
  const [medLoading, setMedLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [requestingDocId, setRequestingDocId] = useState(null);
  const [consultationNotice, setConsultationNotice] = useState('');

  // Request browser GPS
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lng: pos.coords.longitude, lat: pos.coords.latitude });
          setLocationName(`GPS: [${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}]`);
        },
        (err) => {
          console.warn('Geolocation permission denied or unavailable:', err.message);
          setLocationName('GPS unavailable (using manual coordinates)');
        }
      );
    }
  };

  // Load Nearby Hospitals
  const loadNearbyHospitals = async () => {
    try {
      const res = await api.get(`/nearby?lng=${coords.lng}&lat=${coords.lat}&radiusKm=15&category=hospitals`);
      setHospitals(res.data.data.hospitals || []);
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    }
  };

  // Load Available Doctors
  const loadDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      setDoctors(res.data.doctors || []);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  // Load Patient Consultations
  const loadConsultations = async () => {
    if (!user) return;
    try {
      const res = await api.get('/consultations/my');
      setConsultations(res.data.consultations || []);
    } catch (err) {
      console.error('Failed to load consultations:', err);
    }
  };

  useEffect(() => {
    loadNearbyHospitals();
    loadDoctors();
    if (user) {
      loadConsultations();
    }
  }, [coords, user]);

  // Handle Intake Submission
  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    setIntakeLoading(true);
    setIntakeError('');

    try {
      // Submits to prioritized durable Case queue with WHO 4-tier triage
      const res = await api.post('/cases', {
        description,
        language,
        duration: duration || undefined,
        severity,
        age_years: age ? parseInt(age, 10) : undefined,
        latitude: coords.lat,
        longitude: coords.lng,
        idempotencyKey: `intake-${user.id || user._id}-${Date.now()}`,
      });

      const caseData = res.data.case;
      setIntakeResult({
        intakeId: caseData.intakeRecordId || caseData._id,
        caseId: caseData.caseId,
        isEmergency: caseData.priority === 'P0_EMERGENCY' || caseData.triageLevel === 'RED',
        triageLevel: caseData.triageLevel,
        priority: caseData.priority,
        reasonCodes: caseData.reasonCodes || [],
        emergencyGuidance: caseData.patientGuidance,
        emergencyCallNumber: res.data.emergencyCallNumber || (caseData.triageLevel === 'RED' ? '112' : null),
        detectedLanguage: caseData.patientDetails?.language || language,
        extractedSymptoms: caseData.patientDetails?.extractedSymptoms || [],
        summary: caseData.patientDetails?.description || description,
        evidenceSynthesis: caseData.evidenceSynthesis,
        nearbyFacilities: res.data.nearbyFacilities || null,
        disclaimer: res.data.disclaimer,
        status: caseData.status,
      });

      if (caseData.priority === 'P0_EMERGENCY' || caseData.triageLevel === 'RED') {
        // Automatically switch to hospitals tab if critical emergency
        loadNearbyHospitals();
      }
      loadConsultations();
    } catch (err) {
      setIntakeError(err.response?.data?.message || err.message || 'Intake submission failed');
    } finally {
      setIntakeLoading(false);
    }
  };

  // Handle Audio Upload
  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      onOpenAuth();
      return;
    }

    setMediaLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    try {
      const res = await api.post('/uploads/audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.data?.transcript) {
        setDescription((prev) => (prev ? `${prev} ${res.data.data.transcript}` : res.data.data.transcript));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Audio transcription error');
    } finally {
      setMediaLoading(false);
    }
  };

  // Handle Image OCR Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      onOpenAuth();
      return;
    }

    setMediaLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setOcrConfirmation(res.data.data);
      if (res.data.data?.extracted_text) {
        setDescription((prev) => (prev ? `${prev}\n[Prescription Photo Text]: ${res.data.data.extracted_text}` : `[Prescription Photo Text]: ${res.data.data.extracted_text}`));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Image OCR processing error');
    } finally {
      setMediaLoading(false);
    }
  };

  // Handle Medicine Inventory Search
  const handleMedicineSearch = async (e) => {
    e.preventDefault();
    if (!medicineQuery.trim()) return;

    setMedLoading(true);
    try {
      const res = await api.get(
        `/medicines/match-inventory?query=${encodeURIComponent(medicineQuery)}&lng=${coords.lng}&lat=${coords.lat}&radiusKm=20`
      );
      setMedicineMatches(res.data.matches || []);
    } catch (err) {
      console.error('Medicine search error:', err);
    } finally {
      setMedLoading(false);
    }
  };

  // Handle Consultation Request
  const handleRequestConsultation = async (doctorId) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!intakeResult?.intakeId) {
      alert('Please submit your symptoms intake above first so the doctor can review your concern.');
      return;
    }

    setRequestingDocId(doctorId);
    try {
      await api.post('/consultations/request', {
        doctorId,
        intakeRecordId: intakeResult.intakeId,
        consultationType: 'chat',
      });
      setConsultationNotice('Consultation requested successfully! The doctor will review your intake shortly.');
      loadConsultations();
      setTimeout(() => setConsultationNotice(''), 6000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request consultation');
    } finally {
      setRequestingDocId(null);
    }
  };

  return (
    <div className="container">
      {/* Emergency Alert Prompt if triggered */}
      {intakeResult?.isEmergency && (
        <EmergencyBanner
          guidance={intakeResult.emergencyGuidance}
          flags={intakeResult.emergencyFlags}
          callNumber={intakeResult.emergencyCallNumber || '112'}
        />
      )}

      {/* Location Bar */}
      <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <MapPin size={18} color="var(--primary)" />
          <span>Location: <strong>{locationName}</strong></span>
        </div>
        <button className="btn btn-outline" onClick={handleGetLocation} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
          Detect GPS Location
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {[
          { id: 'intake', label: 'Symptom Intake', icon: FileText },
          { id: 'hospitals', label: 'Emergency Hospitals', icon: Building2 },
          { id: 'pharmacies', label: 'Medicine Stock Finder', icon: Pill },
          { id: 'doctors', label: 'Doctors & Consultations', icon: Stethoscope },
          { id: 'history', label: 'My Health History', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                border: 'none',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-main)',
                fontWeight: isActive ? 600 : 500,
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {consultationNotice && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
          {consultationNotice}
        </div>
      )}

      {/* TAB 1: SYMPTOM INTAKE */}
      {activeTab === 'intake' && (
        <div className="grid-2">
          {/* Intake Form */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Describe Your Health Concern</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Type in English, हिन्दी, or Hinglish. You can also record voice or upload prescription photos.
            </p>

            {intakeError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.6rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {intakeError}
              </div>
            )}

            <form onSubmit={handleIntakeSubmit}>
              <div className="form-group">
                <label className="form-label">Symptoms Description</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="e.g., Severe headache since yesterday with nausea / kal se tez bukhar aur gala dard hai..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Multimedia Upload Controls */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <label className="btn btn-outline" style={{ fontSize: '0.825rem', cursor: 'pointer' }}>
                  <Mic size={16} />
                  <span>{mediaLoading ? 'Processing Audio...' : 'Record / Upload Voice'}</span>
                  <input type="file" accept="audio/*" onChange={handleAudioUpload} style={{ display: 'none' }} disabled={mediaLoading} />
                </label>

                <label className="btn btn-outline" style={{ fontSize: '0.825rem', cursor: 'pointer' }}>
                  <Camera size={16} />
                  <span>{mediaLoading ? 'Scanning...' : 'Upload Prescription / Packaging'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={mediaLoading} />
                </label>
              </div>

              {/* OCR Uncertainty Flag Banner if photo scanned */}
              {ocrConfirmation && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '0.65rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.825rem' }}>
                  <strong>Image OCR Detected:</strong>
                  <div>{ocrConfirmation.extracted_text}</div>
                  <div style={{ marginTop: '0.35rem', fontStyle: 'italic' }}>{ocrConfirmation.disclaimer}</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 2 days / 3 hours"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reported Severity</label>
                  <select className="form-control" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                    <option value="unknown">Unknown</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Patient Age (Years)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 35"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min={0}
                    max={120}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Input Language</label>
                  <select className="form-control" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="hinglish">Hinglish</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={intakeLoading}>
                <Send size={18} />
                <span>{intakeLoading ? 'Processing Intake & Safety Screening...' : 'Submit Symptoms for Review'}</span>
              </button>
            </form>
          </div>

          {/* Intake Results & Safety Guidance */}
          <div>
            {intakeResult ? (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Structured Intake Summary</h3>
                    {intakeResult.caseId && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Priority Case ID: <strong>{intakeResult.caseId}</strong>
                      </span>
                    )}
                  </div>
                  <span className={`badge ${
                    intakeResult.triageLevel === 'RED'
                      ? 'badge-emergency'
                      : intakeResult.triageLevel === 'YELLOW'
                      ? 'badge-warning'
                      : 'badge-success'
                  }`}>
                    {intakeResult.priority || (intakeResult.isEmergency ? 'P0_EMERGENCY' : 'P3_ROUTINE')} ({intakeResult.triageLevel || 'GREEN'})
                  </span>
                </div>

                {intakeResult.isEmergency && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', color: '#991b1b', fontSize: '0.9rem' }}>
                    <strong>Immediate Action: </strong> {intakeResult.emergencyGuidance}
                    <div style={{ marginTop: '0.5rem' }}>
                      <a href={`tel:${intakeResult.emergencyCallNumber || '112'}`} className="tel-link">
                        <PhoneCall size={16} />
                        <span>Call Dispatch: {intakeResult.emergencyCallNumber || '112'}</span>
                      </a>
                    </div>
                  </div>
                )}


                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>EXTRACTED SYMPTOMS</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {intakeResult.extractedSymptoms?.length > 0 ? (
                      intakeResult.extractedSymptoms.map((s) => (
                        <span key={s} className="badge badge-info">{s.replace(/_/g, ' ')}</span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>None matched automatically</span>
                    )}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '6px', fontSize: '0.9rem', whiteSpace: 'pre-line', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                  {intakeResult.summary}
                </div>

                {/* Evidence-Based Clinical Assessment & Verifiable Citations */}
                {intakeResult.evidenceSynthesis?.possibleConditions?.length > 0 && (
                  <div style={{ marginBottom: '1rem', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--primary)' }}>Clinical Assessment & Evidence Search:</span>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Decision-Support</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {intakeResult.evidenceSynthesis.possibleConditions.map((cond, idx) => (
                        <div key={idx} style={{ background: '#f8fafc', borderRadius: '6px', padding: '0.65rem', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                            <span>{cond.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Match: {Math.round((cond.confidence || 0.6) * 100)}%
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                            {cond.clinicalRationale}
                          </div>

                          {cond.missingFindings?.length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
                              <strong>Tests / Findings Needed:</strong> {cond.missingFindings.join(', ')}
                            </div>
                          )}

                          {cond.citations?.length > 0 && (
                            <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.75rem' }}>
                              <strong style={{ color: 'var(--primary)' }}>Verified Clinical Citations:</strong>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.15rem' }}>
                                {cond.citations.map((cit, ci) => (
                                  <a
                                    key={ci}
                                    href={cit.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#0284c7', textDecoration: 'underline' }}
                                  >
                                    &bull; {cit.source}: {cit.title} &rarr;
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* First Aid & Immediate Home Care Measures */}
                {intakeResult.evidenceSynthesis?.firstAidMeasures?.length > 0 && (
                  <div style={{ marginBottom: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#065f46' }}>
                      🩹 Immediate First Aid & Home Care Steps:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {intakeResult.evidenceSynthesis.firstAidMeasures.map((fa, i) => (
                        <div key={i} style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '6px', border: '1px solid #d1fae5' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#047857' }}>{fa.action}</div>
                          <div style={{ fontSize: '0.825rem', color: '#1f2937', margin: '0.2rem 0' }}>{fa.instructions}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>Rationale: {fa.rationale}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Safe OTC Medicines */}
                {intakeResult.evidenceSynthesis?.suggestedMedicines?.length > 0 && (
                  <div style={{ marginBottom: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>💊 Suggested Medicines & Symptom Relief:</span>
                      <span style={{ fontSize: '0.75rem', color: '#15803d' }}>Non-prescription OTC</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {intakeResult.evidenceSynthesis.suggestedMedicines.map((med, i) => (
                        <div key={i} style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#14532d' }}>{med.name} ({med.genericName})</strong>
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                              {med.prescriptionRequired ? 'PRESCRIPTION REQUIRED' : 'OTC AVAILABLE'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#374151', margin: '0.2rem 0' }}>
                            <strong>Purpose:</strong> {med.purpose} &bull; <strong>Dose:</strong> {med.dosageGuide}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                            ⚠️ {med.precautions}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nearby Emergency Facilities & Physical Resources */}
                {intakeResult.nearbyFacilities && (
                  <div style={{ marginBottom: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                      📍 Recommended Nearby Healthcare Resources:
                    </div>

                    {/* Nearby Hospitals */}
                    {intakeResult.nearbyFacilities.hospitals?.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                          🏥 Nearby Hospitals:
                        </div>
                        {intakeResult.nearbyFacilities.hospitals.map((h, hi) => (
                          <div key={hi} style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>{h.hospitalName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.address?.city || 'Emergency Dept'} &bull; ~{Math.round(h.distanceMeters / 1000)} km</div>
                            </div>
                            {h.verifiedEmergencyNumbers?.[0] && (
                              <a href={`tel:${h.verifiedEmergencyNumbers[0]}`} className="tel-link" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                <PhoneCall size={12} /> Call
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Available Specialists */}
                    {intakeResult.nearbyFacilities.doctors?.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                          👨‍⚕️ Available Specialized Doctors:
                        </div>
                        {intakeResult.nearbyFacilities.doctors.map((d, di) => (
                          <div key={di} style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>{d.fullName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.specialties?.join(', ')} &bull; Fee: ₹{d.consultationFee || 500}</div>
                            </div>
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setActiveTab('doctors')}>
                              Consult
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Verified Pharmacies with Stock */}
                    {intakeResult.nearbyFacilities.pharmaciesWithStock?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                          💊 Nearby Pharmacies with Confirmed Stock:
                        </div>
                        {intakeResult.nearbyFacilities.pharmaciesWithStock.map((p, pi) => (
                          <div key={pi} style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>{p.pharmacyName} &bull; <span style={{ color: 'var(--success)' }}>{p.medicineName} (In Stock)</span></div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.address?.addressLine1 || 'Local Pharmacy'} &bull; ₹{p.unitPrice}</div>
                            </div>
                            {p.contactNumber && (
                              <a href={`tel:${p.contactNumber}`} className="tel-link-regular" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                <PhoneCall size={12} /> Call Store
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}


                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  {intakeResult.disclaimer}
                </div>

                {!intakeResult.isEmergency && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <button className="btn btn-outline" onClick={() => setActiveTab('doctors')} style={{ width: '100%' }}>
                      <Stethoscope size={16} />
                      <span>Request Doctor Consultation for this Intake</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                <Activity size={48} color="var(--primary)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Safety-First Clinical Triage</h3>
                <p style={{ fontSize: '0.875rem' }}>
                  Describe your symptoms on the left. The deterministic emergency engine analyzes warning signs in under 5 milliseconds.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NEARBY HOSPITALS */}
      {activeTab === 'hospitals' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Nearby Verified Hospitals & Emergency Centers</h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Within 15 km of your location</span>
          </div>

          <div className="grid-2">
            {hospitals.map((hosp) => (
              <div key={hosp._id} className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{hosp.hospitalName}</h3>
                  {hosp.distanceMeters !== undefined && (
                    <span className="badge badge-info">{(hosp.distanceMeters / 1000).toFixed(1)} km</span>
                  )}
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  {hosp.address?.street}, {hosp.address?.city}
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {hosp.emergencyDepartmentAvailable && (
                    <span className="badge badge-danger">24/7 Emergency Care</span>
                  )}
                  {hosp.traumaCareLevel && (
                    <span className="badge badge-warning">{hosp.traumaCareLevel}</span>
                  )}
                  {hosp.isVerified && (
                    <span className="badge badge-success">Verified Facility</span>
                  )}
                </div>

                {/* Direct Emergency Telephone Hotlines */}
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
      )}

      {/* TAB 3: PHARMACY & MEDICINE MATCHING */}
      {activeTab === 'pharmacies' && (
        <div>
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Find Real Pharmacy Medicine Stock</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Check verified live inventory from registered pharmacies within your search radius.
            </p>

            <form onSubmit={handleMedicineSearch} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search medicine by name or generic (e.g. Paracetamol, Dolo, Amoxicillin)..."
                value={medicineQuery}
                onChange={(e) => setMedicineQuery(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={medLoading}>
                {medLoading ? 'Searching...' : 'Search Inventory'}
              </button>
            </form>
          </div>

          {/* Results List */}
          {medicineMatches.length > 0 ? (
            <div className="grid-2">
              {medicineMatches.map((m) => (
                <div key={m.inventoryId} className="card" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{m.medicineName}</h3>
                      <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{m.genericName || m.brandName}</span>
                    </div>
                    <span className={`badge ${m.stockStatus === 'in_stock' ? 'badge-success' : m.stockStatus === 'low_stock' ? 'badge-warning' : 'badge-danger'}`}>
                      {m.stockStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                    <strong>Available Quantity:</strong> {m.availableQuantity} units &bull; <strong>Price:</strong> ₹{m.unitPrice}
                  </div>

                  {/* Pharmacy Details */}
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.925rem' }}>{m.pharmacy.storeName}</div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {m.pharmacy.address?.street}, {m.pharmacy.address?.city}
                      {m.distanceMeters !== null && ` (${(m.distanceMeters / 1000).toFixed(1)} km away)`}
                    </div>

                    <a href={m.pharmacy.callUrl} className="tel-link-regular">
                      <PhoneCall size={14} />
                      <span>Call Pharmacy: {m.pharmacy.verifiedContactNumber}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No inventory search performed yet. Type a medicine name above to check nearby verified stock.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DOCTORS & CONSULTATIONS */}
      {activeTab === 'doctors' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Verified Doctors & Clinicians</h2>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Connect with licensed medical professionals</span>
          </div>

          <div className="grid-2">
            {doctors.map((doc) => (
              <div key={doc._id} className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{doc.fullName}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{doc.specialties?.join(', ')}</span>
                  </div>
                  <span className={`badge ${doc.isAvailable ? 'badge-success' : 'badge-warning'}`}>
                    {doc.isAvailable ? 'Available Now' : 'Offline'}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  <strong>Reg No:</strong> {doc.medicalRegistrationNumber} &bull; <strong>Fee:</strong> ₹{doc.consultationFee}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.825rem', padding: '0.45rem 0.85rem' }}
                    onClick={() => handleRequestConsultation(doc._id)}
                    disabled={requestingDocId === doc._id}
                  >
                    {requestingDocId === doc._id ? 'Requesting...' : 'Request Consultation'}
                  </button>

                  <a href={`tel:${doc.verifiedPhone}`} className="tel-link-regular" style={{ fontSize: '0.825rem' }}>
                    <PhoneCall size={14} />
                    <span>Call: {doc.verifiedPhone}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CONSULTATION HISTORY */}
      {activeTab === 'history' && (
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Your Consultation & Clinical History</h2>

          {consultations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {consultations.map((c) => (
                <div key={c._id} className="card" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                        Consultation with {c.doctorId?.fullName || 'Medical Specialist'}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Requested on {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`badge ${c.status === 'completed' ? 'badge-success' : c.status === 'accepted' ? 'badge-info' : 'badge-warning'}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>

                  {c.intakeRecordId && (
                    <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      <strong>Submitted Intake:</strong> {c.intakeRecordId.rawDescription}
                    </div>
                  )}

                  {/* Doctor Clinical Notes */}
                  {c.clinicalNotes && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                      <strong style={{ color: '#166534', fontSize: '0.9rem' }}>Doctor's Clinical Notes:</strong>
                      <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{c.clinicalNotes}</p>
                      {c.recommendations && (
                        <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          <strong>Recommendations:</strong> {c.recommendations}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Prescribed Medicines */}
                  {c.prescribedMedicines?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Prescribed Medicines:</div>
                      {c.prescribedMedicines.map((med, idx) => (
                        <div key={idx} style={{ fontSize: '0.825rem', background: '#f1f5f9', padding: '0.4rem 0.6rem', borderRadius: '4px', marginBottom: '0.25rem' }}>
                          <strong>{med.medicineName}</strong> - {med.dosage} ({med.frequency}) for {med.durationDays} days. {med.instructions}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
              <Clock size={40} color="var(--primary)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
              <h3>No Consultations Yet</h3>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                When you request consultations with registered doctors, clinical notes and prescription advice will appear here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
