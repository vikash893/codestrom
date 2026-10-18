import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sidebar } from './Sidebar';
import { SkeletonCard, SkeletonRow } from './Skeleton';
import {
  Building2,
  Stethoscope,
  Activity,
  PhoneCall,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  UserCheck,
  Plus,
  Check,
  X,
  Calendar,
  ArrowRight,
  UserPlus,
  FileText,
  Bed,
  MapPin,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const HospitalDashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'beds' | 'doctors' | 'profile'
  const [hospital, setHospital] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterPriority, setFilterPriority] = useState('all');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Bed Reservation Modal State
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [selectedRequestForBed, setSelectedRequestForBed] = useState(null);
  const [bedForm, setBedForm] = useState({
    requestId: '',
    patientName: '',
    patientPhone: '',
    patientAge: 45,
    bedType: 'icu',
    bedNumber: 'ICU-01',
    priority: 'P0 Emergency',
    notes: '',
  });
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveError, setReserveError] = useState('');

  // Doctor Scheduling Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRequestForDoctor, setSelectedRequestForDoctor] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    requestId: '',
    patientName: '',
    patientPhone: '',
    doctorName: '',
    specialty: 'Emergency & Critical Care',
    scheduledTime: 'Immediate (Within 10m)',
    consultationType: 'Emergency Triage & Resuscitation',
    priority: 'Immediate',
    notes: '',
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // Bed Status updating state
  const [updatingReservationId, setUpdatingReservationId] = useState(null);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch hospital facility profile, live beds & doctor roster
      const hospRes = await api.get('/hospitals/me');
      if (hospRes.data.hospital) {
        setHospital(hospRes.data.hospital);
      }

      // 2. Fetch incoming patient admission/triage requests
      const reqRes = await api.get('/hospitals/my/requests');
      setRequests(reqRes.data.requests || []);
    } catch (err) {
      console.warn('Hospital dashboard data load:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 12000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (text, type = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Open Bed Reservation Modal for a specific patient request
  const handleOpenReserveModal = (reqItem) => {
    const defaultType = reqItem.priority === 'P0_EMERGENCY' ? 'icu' : 'emergency';
    const suggestedNum = `${defaultType.toUpperCase()}-${Math.floor(10 + Math.random() * 89)}`;

    setSelectedRequestForBed(reqItem);
    setBedForm({
      requestId: reqItem.requestId,
      patientName: reqItem.patientName,
      patientPhone: reqItem.patientPhone,
      patientAge: reqItem.patientAge || 45,
      bedType: defaultType,
      bedNumber: suggestedNum,
      priority: reqItem.priority === 'P0_EMERGENCY' ? 'P0 Emergency' : 'P1 Urgent',
      notes: `Admission for ${reqItem.symptoms?.slice(0, 50)}...`,
    });
    setReserveError('');
    setShowReserveModal(true);
  };

  // Open Doctor Scheduling Modal for a specific patient request
  const handleOpenScheduleModal = (reqItem) => {
    const availableDocs = hospital?.hospitalDoctors?.filter((d) => d.isOnDuty) || [];
    const chosenDoc = availableDocs[0]?.name || hospital?.hospitalDoctors?.[0]?.name || 'Dr. On-Duty Specialist';
    const chosenSpecialty = availableDocs[0]?.specialty || 'Emergency & Critical Care';

    setSelectedRequestForDoctor(reqItem);
    setScheduleForm({
      requestId: reqItem.requestId,
      patientName: reqItem.patientName,
      patientPhone: reqItem.patientPhone,
      doctorName: chosenDoc,
      specialty: chosenSpecialty,
      scheduledTime: 'Immediate (Within 10m)',
      consultationType: 'Emergency Triage & Resuscitation',
      priority: reqItem.priority === 'P0_EMERGENCY' ? 'Immediate' : 'Urgent',
      notes: `Consultation for ${reqItem.symptoms?.slice(0, 50)}...`,
    });
    setScheduleError('');
    setShowScheduleModal(true);
  };

  // Submit Bed Reservation
  const handleConfirmBedReservation = async (e) => {
    e.preventDefault();
    setReserveError('');
    setReserveLoading(true);

    try {
      const res = await api.post('/hospitals/my/reserve-bed', bedForm);
      if (res.data.success) {
        showNotification(
          language === 'hi'
            ? `बेड ${res.data.bedNumber} (${res.data.bedType?.toUpperCase()}) सफलतापूर्वक आरक्षित किया गया!`
            : `Bed ${res.data.bedNumber} (${res.data.bedType?.toUpperCase()}) reserved successfully!`
        );
        setShowReserveModal(false);
        loadData(true);
      }
    } catch (err) {
      setReserveError(err.response?.data?.message || err.message || 'Failed to reserve bed');
    } finally {
      setReserveLoading(false);
    }
  };

  // Submit Doctor Schedule
  const handleConfirmDoctorSchedule = async (e) => {
    e.preventDefault();
    setScheduleError('');
    setScheduleLoading(true);

    try {
      const res = await api.post('/hospitals/my/schedule-doctor', scheduleForm);
      if (res.data.success) {
        showNotification(
          language === 'hi'
            ? `${res.data.doctorName} को ${scheduleForm.patientName} के लिए शेड्यूल्ड किया गया (${scheduleForm.scheduledTime})!`
            : `${res.data.doctorName} scheduled for ${scheduleForm.patientName} (${scheduleForm.scheduledTime})!`
        );
        setShowScheduleModal(false);
        loadData(true);
      }
    } catch (err) {
      setScheduleError(err.response?.data?.message || err.message || 'Failed to schedule doctor');
    } finally {
      setScheduleLoading(false);
    }
  };

  // Update Bed Reservation Status (Admitted / Discharged / Cancelled)
  const handleUpdateBedStatus = async (reservationId, status) => {
    setUpdatingReservationId(reservationId);
    try {
      const res = await api.patch(`/hospitals/my/beds/${reservationId}/status`, { status });
      if (res.data.success) {
        showNotification(
          language === 'hi'
            ? `बेड स्थिति अपडेट: ${status.toUpperCase()}!`
            : `Bed reservation updated to ${status.toUpperCase()}!`
        );
        loadData(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update bed status');
    } finally {
      setUpdatingReservationId(null);
    }
  };

  // Bed stats calculations
  const bedsData = hospital?.beds || {
    icu: { total: 15, available: 8, reserved: 4, occupied: 3 },
    emergency: { total: 25, available: 14, reserved: 6, occupied: 5 },
    oxygen: { total: 40, available: 22, reserved: 10, occupied: 8 },
    general: { total: 80, available: 45, reserved: 20, occupied: 15 },
  };

  const totalAvailableBeds =
    (bedsData.icu?.available || 0) +
    (bedsData.emergency?.available || 0) +
    (bedsData.oxygen?.available || 0) +
    (bedsData.general?.available || 0);

  const totalBedsCount =
    (bedsData.icu?.total || 0) +
    (bedsData.emergency?.total || 0) +
    (bedsData.oxygen?.total || 0) +
    (bedsData.general?.total || 0);

  const onDutyCount = (hospital?.hospitalDoctors || []).filter((d) => d.isOnDuty).length;

  const filteredRequests = requests.filter((r) => {
    if (filterPriority === 'all') return true;
    if (filterPriority === 'P0_EMERGENCY') return r.priority === 'P0_EMERGENCY';
    if (filterPriority === 'P1_URGENT') return r.priority === 'P1_URGENT';
    if (filterPriority === 'pending') return r.status === 'pending';
    if (filterPriority === 'action_taken') return r.status !== 'pending';
    return true;
  });

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        role="hospital"
        counts={{
          hospitalRequests: requests.length,
          availableBeds: totalAvailableBeds,
          onDutyDoctors: onDutyCount,
        }}
      />

      {/* Main Content Workspace */}
      <div style={{ flex: 1, padding: '1.5rem', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {hospital?.hospitalName || 'Apex Trauma & Multispecialty Hospital'}
              </h2>
              <span
                style={{
                  background: '#dcfce7',
                  color: '#166534',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <ShieldCheck size={13} />
                {language === 'hi' ? 'सत्यापित अस्पताल' : 'Verified Facility'}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
              {language === 'hi'
                ? `पंजीकरण संख्या: ${hospital?.registrationNumber || 'HOSP-DEL-001'} | 24/7 आपातकालीन विभाग एवं आईसीयू बेड कमान केंद्र`
                : `Reg: ${hospital?.registrationNumber || 'HOSP-DEL-001'} | 24/7 Trauma Command, Real-Time Bed Allocation & Doctor Dispatch`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <ShieldAlert size={14} color="#dc2626" />
              {language === 'hi' ? '24/7 ट्रॉमा सक्रिय' : '24/7 Trauma Active'}
            </span>

            <button
              className="btn btn-outline"
              onClick={() => loadData(true)}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Refresh Hospital Portal"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{language === 'hi' ? 'रिफ्रेश' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              background: feedbackMsg.type === 'success' ? '#f0fdf4' : '#eff6ff',
              border: `1px solid ${feedbackMsg.type === 'success' ? '#bbf7d0' : '#bfdbfe'}`,
              color: feedbackMsg.type === 'success' ? '#166534' : '#1e40af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} />
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMsg(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Key Metrics Quick Ribbon */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              borderLeft: '4px solid #dc2626',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              {language === 'hi' ? 'आपातकालीन मरीज अनुरोध' : 'Patient Requests'}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>
              {requests.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {requests.filter((r) => r.priority === 'P0_EMERGENCY').length} {language === 'hi' ? 'अति गंभीर (P0)' : 'Critical P0 Cases'}
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              borderLeft: '4px solid #2563eb',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              {language === 'hi' ? 'कुल उपलब्ध बेड' : 'Total Available Beds'}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>
              {totalAvailableBeds} <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>/ {totalBedsCount}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {bedsData.icu?.available || 0} {language === 'hi' ? 'आईसीयू में खाली' : 'ICU Beds Free'}
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              borderLeft: '4px solid #059669',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              {language === 'hi' ? 'ऑन-ड्यूटी डॉक्टर' : 'On-Duty Doctors'}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
              {onDutyCount} <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>/ {(hospital?.hospitalDoctors || []).length}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {language === 'hi' ? 'ट्रॉमा एवं आपातकालीन शिफ्ट' : 'Trauma & Critical Roster Active'}
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              borderLeft: '4px solid #7c3aed',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              {language === 'hi' ? 'सक्रिय बेड आरक्षण' : 'Active Bed Reservations'}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', marginTop: '0.2rem' }}>
              {(hospital?.bedReservations || []).filter((r) => r.status === 'reserved').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {(hospital?.bedReservations || []).filter((r) => r.status === 'admitted').length} {language === 'hi' ? 'भर्ती मरीज' : 'Admitted Patients'}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PATIENT REQUESTS & ADMISSIONS                      */}
        {/* ========================================================= */}
        {activeTab === 'requests' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {language === 'hi' ? 'इनबाउंड मरीज भर्ती एवं आपातकालीन अनुरोध' : 'Inbound Patient Admissions & Emergency Requests'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                  {language === 'hi'
                    ? 'रोगियों के लक्षणों की जांच करें, तुरंत बेड आरक्षित करें या ऑन-ड्यूटी डॉक्टर शेड्यूल करें'
                    : 'Review incoming emergency triage symptoms, reserve hospital beds, or assign on-duty clinicians'}
                </p>
              </div>

              {/* Priority Filters */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: language === 'hi' ? 'सभी अनुरोध' : 'All Requests' },
                  { id: 'P0_EMERGENCY', label: language === 'hi' ? '🚨 P0 आपातकालीन' : '🚨 P0 Emergency' },
                  { id: 'P1_URGENT', label: language === 'hi' ? '⚠️ P1 तत्काल' : '⚠️ P1 Urgent' },
                  { id: 'pending', label: language === 'hi' ? 'कार्रवाई लंबित' : 'Action Pending' },
                  { id: 'action_taken', label: language === 'hi' ? 'बेड/डॉक्टर आवंटित' : 'Assigned' },
                ].map((flt) => (
                  <button
                    key={flt.id}
                    onClick={() => setFilterPriority(flt.id)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: filterPriority === flt.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      background: filterPriority === flt.id ? '#eff6ff' : '#ffffff',
                      color: filterPriority === flt.id ? '#1d4ed8' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <SkeletonCard height="130px" />
                <SkeletonCard height="130px" />
                <SkeletonCard height="130px" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  padding: '3rem 1.5rem',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                }}
              >
                <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                  {language === 'hi' ? 'कोई लंबित अनुरोध नहीं मिला' : 'No Incoming Requests Found'}
                </h4>
                <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {language === 'hi'
                    ? 'सभी आपातकालीन मामलों का निपटारा हो चुका है अथवा वर्तमान फिल्टर में कोई केस उपलब्ध नहीं है।'
                    : 'All emergency requests have been attended to or none match the selected filter.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredRequests.map((reqItem) => {
                  const isP0 = reqItem.priority === 'P0_EMERGENCY';
                  const isReserved = reqItem.reservedBed || reqItem.status === 'bed_reserved' || reqItem.status === 'admitted';
                  const isScheduled = reqItem.scheduledDoctor || reqItem.status === 'doctor_scheduled';

                  return (
                    <div
                      key={reqItem.requestId}
                      style={{
                        background: '#ffffff',
                        border: isP0 ? '1.5px solid #f87171' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        boxShadow: isP0 ? '0 4px 12px rgba(220, 38, 38, 0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Top Header of Card */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                background: isP0 ? '#fee2e2' : '#fef3c7',
                                color: isP0 ? '#991b1b' : '#92400e',
                                fontWeight: 800,
                                fontSize: '0.725rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              {isP0 && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />}
                              {reqItem.priority?.replace('_', ' ') || 'P1 URGENT'}
                            </span>

                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                              {reqItem.patientName}
                            </h4>

                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              (Age: {reqItem.patientAge || 'Adult'})
                            </span>

                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              ID: {reqItem.requestId}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Clock size={13} />
                            <span>
                              {reqItem.createdAt ? new Date(reqItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                            <span>&bull;</span>
                            <a
                              href={`tel:${reqItem.patientPhone}`}
                              style={{ color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <PhoneCall size={12} />
                              {reqItem.patientPhone}
                            </a>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {isReserved && (
                            <span
                              style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <Bed size={13} />
                              {reqItem.reservedBed
                                ? `Bed Reserved: ${reqItem.reservedBed.bedNumber} (${reqItem.reservedBed.bedType?.toUpperCase()})`
                                : 'Bed Reserved'}
                            </span>
                          )}

                          {isScheduled && (
                            <span
                              style={{
                                background: '#f0fdf4',
                                color: '#166534',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #bbf7d0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <Stethoscope size={13} />
                              {reqItem.scheduledDoctor
                                ? `Dr. Assigned: ${reqItem.scheduledDoctor.doctorName}`
                                : 'Doctor Scheduled'}
                            </span>
                          )}

                          {!isReserved && !isScheduled && (
                            <span
                              style={{
                                background: '#fffbeb',
                                color: '#b45309',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #fde68a',
                              }}
                            >
                              {language === 'hi' ? 'कार्रवाई आवश्यक' : 'Pending Hospital Action'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Symptoms & Clinical Description */}
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '0.75rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          marginBottom: '0.85rem',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                          {language === 'hi' ? 'रोगी के प्राथमिक लक्षण एवं स्थिति:' : 'PRIMARY REPORTED SYMPTOMS & STATUS:'}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4 }}>
                          {reqItem.symptoms}
                        </p>

                        {reqItem.extractedSymptoms?.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {reqItem.extractedSymptoms.map((sym, sIdx) => (
                              <span
                                key={sIdx}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  color: '#334155',
                                  fontSize: '0.7rem',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '4px',
                                  fontWeight: 500,
                                }}
                              >
                                {sym}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Bar for Hospital Staff */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: '0.65rem',
                          flexWrap: 'wrap',
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: '0.75rem',
                        }}
                      >
                        <a
                          href={`tel:${reqItem.patientPhone}`}
                          className="btn btn-outline"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                        >
                          <PhoneCall size={13} />
                          <span>{language === 'hi' ? 'कॉल करें' : 'Call Patient'}</span>
                        </a>

                        {/* Button 1: RESERVE BED */}
                        <button
                          className="btn btn-primary"
                          onClick={() => handleOpenReserveModal(reqItem)}
                          style={{
                            fontSize: '0.825rem',
                            padding: '0.4rem 0.85rem',
                            fontWeight: 700,
                            background: '#2563eb',
                          }}
                        >
                          <Bed size={15} />
                          <span>{language === 'hi' ? '🛏️ बेड आरक्षित करें' : '🛏️ Reserve Bed'}</span>
                        </button>

                        {/* Button 2: SCHEDULE DOCTOR */}
                        <button
                          className="btn btn-primary"
                          onClick={() => handleOpenScheduleModal(reqItem)}
                          style={{
                            fontSize: '0.825rem',
                            padding: '0.4rem 0.85rem',
                            fontWeight: 700,
                            background: '#059669',
                          }}
                        >
                          <Stethoscope size={15} />
                          <span>{language === 'hi' ? '👨‍⚕️ डॉक्टर शेड्यूल करें' : '👨‍⚕️ Schedule Doctor'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: BED MANAGEMENT & LIVE CAPACITY MATRIX               */}
        {/* ========================================================= */}
        {activeTab === 'beds' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {language === 'hi' ? 'वास्तविक समय बेड क्षमता एवं आवंटन' : 'Real-Time Bed Matrix & Inpatient Allocation'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                  {language === 'hi'
                    ? 'आईसीयू, इमरजेंसी, ऑक्सीजन एवं सामान्य वार्ड की लाइव क्षमता एवं आरक्षण प्रबंधन'
                    : 'Live ward capacity tracking, patient admission handoff, and discharge management'}
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedRequestForBed(null);
                  setBedForm({
                    requestId: `REQ-DIRECT-${Date.now().toString().slice(-4)}`,
                    patientName: 'Walk-in Admission',
                    patientPhone: '+919876543210',
                    patientAge: 40,
                    bedType: 'emergency',
                    bedNumber: `ER-${Math.floor(10 + Math.random() * 89)}`,
                    priority: 'P0 Emergency',
                    notes: 'Direct hospital desk admission',
                  });
                  setReserveError('');
                  setShowReserveModal(true);
                }}
                style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem', fontWeight: 700 }}
              >
                <Plus size={15} />
                <span>{language === 'hi' ? 'सीधा बेड आरक्षण' : 'Quick Reserve Bed'}</span>
              </button>
            </div>

            {/* 4 Ward Capacity Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem',
                marginBottom: '1.75rem',
              }}
            >
              {[
                {
                  id: 'icu',
                  title: language === 'hi' ? 'आईसीयू क्रिटिकल केयर' : 'ICU Critical Care',
                  stats: bedsData.icu,
                  color: '#dc2626',
                  icon: ShieldAlert,
                },
                {
                  id: 'emergency',
                  title: language === 'hi' ? 'इमरजेंसी / ट्रॉमा बे' : 'Emergency & Trauma Bay',
                  stats: bedsData.emergency,
                  color: '#ea580c',
                  icon: Activity,
                },
                {
                  id: 'oxygen',
                  title: language === 'hi' ? 'हाई-फ्लो ऑक्सीजन वार्ड' : 'Oxygen Supported Ward',
                  stats: bedsData.oxygen,
                  color: '#0284c7',
                  icon: Bed,
                },
                {
                  id: 'general',
                  title: language === 'hi' ? 'सामान्य इनपेशेंट वार्ड' : 'General Inpatient Ward',
                  stats: bedsData.general,
                  color: '#059669',
                  icon: Building2,
                },
              ].map((ward) => {
                const WardIcon = ward.icon;
                const stats = ward.stats || { total: 20, available: 10, reserved: 5, occupied: 5 };
                const pctOccupied = Math.round(((stats.total - stats.available) / (stats.total || 1)) * 100);

                return (
                  <div
                    key={ward.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                        <WardIcon size={17} color={ward.color} />
                        <span>{ward.title}</span>
                      </div>
                      <span
                        style={{
                          background: stats.available > 0 ? '#f0fdf4' : '#fef2f2',
                          color: stats.available > 0 ? '#15803d' : '#b91c1c',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                        }}
                      >
                        {stats.available > 0 ? `${stats.available} Available` : 'Full'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: ward.color }}>
                        {stats.available}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {language === 'hi' ? 'कुल:' : 'Total:'} {stats.total} Beds
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          width: `${pctOccupied}%`,
                          height: '100%',
                          background: ward.color,
                          borderRadius: '999px',
                        }}
                      />
                    </div>

                    {/* Detail Counters */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <div>
                        <strong>{stats.reserved || 0}</strong> {language === 'hi' ? 'आरक्षित' : 'Reserved'}
                      </div>
                      <div>
                        <strong>{stats.occupied || 0}</strong> {language === 'hi' ? 'भर्ती' : 'Occupied'}
                      </div>
                      <div>
                        <strong>{pctOccupied}%</strong> {language === 'hi' ? 'व्यस्त' : 'Load'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Bed Reservations List */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {language === 'hi' ? 'सक्रिय बेड आरक्षण एवं रोगी प्रवेश' : 'Active Bed Reservations & Admission Log'} ({(hospital?.bedReservations || []).length})
                </h4>
              </div>

              {(hospital?.bedReservations || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                  {language === 'hi' ? 'वर्तमान में कोई सक्रिय बेड आरक्षण नहीं है।' : 'No active bed reservations at present.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.5rem' }}>ID & Time</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Patient Name</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Ward & Bed Number</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Priority</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Status</th>
                        <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(hospital?.bedReservations || []).map((resv) => {
                        const isUpdating = updatingReservationId === resv.reservationId;

                        return (
                          <tr key={resv.reservationId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>{resv.reservationId}</div>
                              <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                                {new Date(resv.reservedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{resv.patientName}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{resv.patientPhone}</div>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <span
                                style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              >
                                {resv.bedNumber} ({resv.bedType?.toUpperCase()})
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <span
                                style={{
                                  color: resv.admissionPriority?.includes('P0') ? '#dc2626' : '#d97706',
                                  fontWeight: 700,
                                }}
                              >
                                {resv.admissionPriority}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <span
                                style={{
                                  background:
                                    resv.status === 'admitted'
                                      ? '#dcfce7'
                                      : resv.status === 'reserved'
                                      ? '#fef3c7'
                                      : '#f1f5f9',
                                  color:
                                    resv.status === 'admitted'
                                      ? '#166534'
                                      : resv.status === 'reserved'
                                      ? '#92400e'
                                      : '#475569',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  fontSize: '0.725rem',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {resv.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                {resv.status === 'reserved' && (
                                  <button
                                    onClick={() => handleUpdateBedStatus(resv.reservationId, 'admitted')}
                                    disabled={isUpdating}
                                    style={{
                                      background: '#16a34a',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '0.25rem 0.55rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✓ {language === 'hi' ? 'भर्ती करें' : 'Admit'}
                                  </button>
                                )}

                                {resv.status === 'admitted' && (
                                  <button
                                    onClick={() => handleUpdateBedStatus(resv.reservationId, 'discharged')}
                                    disabled={isUpdating}
                                    style={{
                                      background: '#2563eb',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '0.25rem 0.55rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    🏁 {language === 'hi' ? 'डिस्चार्ज' : 'Discharge'}
                                  </button>
                                )}

                                {resv.status === 'reserved' && (
                                  <button
                                    onClick={() => handleUpdateBedStatus(resv.reservationId, 'cancelled')}
                                    disabled={isUpdating}
                                    style={{
                                      background: '#f1f5f9',
                                      color: '#64748b',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '4px',
                                      padding: '0.25rem 0.5rem',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: DOCTOR ROSTER & SCHEDULING                          */}
        {/* ========================================================= */}
        {activeTab === 'doctors' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {language === 'hi' ? 'अस्पताल डॉक्टर रोस्टर एवं आपातकालीन शेड्यूलिंग' : 'Hospital Doctor Staff Roster & Clinical Schedules'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                  {language === 'hi'
                    ? 'ट्रॉमा, आईसीयू, कार्डियोलॉजी एवं सर्जरी विशेषज्ञों की ऑन-ड्यूटी स्थिति व अपॉइंटमेंट्स'
                    : 'Manage active shift specialists, dispatch clinicians for incoming emergency cases'}
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedRequestForDoctor(null);
                  setScheduleForm({
                    requestId: `REQ-DOC-${Date.now().toString().slice(-4)}`,
                    patientName: 'Emergency Walk-in',
                    patientPhone: '+919876543210',
                    doctorName: hospital?.hospitalDoctors?.[0]?.name || 'Dr. R. K. Sharma',
                    specialty: 'Cardiology & Emergency',
                    scheduledTime: 'Immediate (Within 10m)',
                    consultationType: 'Emergency Triage & Resuscitation',
                    priority: 'Immediate',
                    notes: 'Clinical consultation booked via desk',
                  });
                  setScheduleError('');
                  setShowScheduleModal(true);
                }}
                style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem', fontWeight: 700, background: '#059669' }}
              >
                <Plus size={15} />
                <span>{language === 'hi' ? 'नया शेड्यूल बनाएं' : 'Schedule Consultation'}</span>
              </button>
            </div>

            {/* Doctors Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '1.75rem',
              }}
            >
              {(hospital?.hospitalDoctors || []).map((doc, idx) => (
                <div
                  key={doc.doctorId || idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {doc.name}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                        {doc.specialty}
                      </div>
                    </div>
                    <span
                      style={{
                        background: doc.isOnDuty ? '#dcfce7' : '#f1f5f9',
                        color: doc.isOnDuty ? '#166534' : '#64748b',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                      }}
                    >
                      {doc.isOnDuty ? 'On Duty' : 'Off Shift'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.775rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    <div><strong>Qualification:</strong> {doc.qualification}</div>
                    <div style={{ marginTop: '0.2rem' }}><strong>Shift Hours:</strong> {doc.workingHours}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                    <a
                      href={`tel:${doc.phone}`}
                      style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <PhoneCall size={12} />
                      {doc.phone}
                    </a>

                    <button
                      onClick={() => {
                        setScheduleForm((prev) => ({
                          ...prev,
                          doctorName: doc.name,
                          specialty: doc.specialty,
                        }));
                        setShowScheduleModal(true);
                      }}
                      style={{
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {language === 'hi' ? 'असाइन करें' : 'Assign Patient'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Scheduled Consultations Table */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0f172a' }}>
                {language === 'hi' ? 'आगामी डॉक्टर परामर्श एवं शेड्यूलिंग सूची' : 'Scheduled Clinical Consultations'} ({(hospital?.doctorSchedules || []).length})
              </h4>

              {(hospital?.doctorSchedules || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                  {language === 'hi' ? 'कोई डॉक्टर परामर्श शेड्यूल नहीं है।' : 'No upcoming consultations scheduled yet.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Schedule ID</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Patient Name</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Assigned Doctor</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Scheduled Slot</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Type & Priority</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(hospital?.doctorSchedules || []).map((sch) => (
                        <tr key={sch.scheduleId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#1e293b' }}>
                            {sch.scheduleId}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ fontWeight: 600 }}>{sch.patientName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sch.patientPhone}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ fontWeight: 600, color: '#059669' }}>{sch.doctorName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sch.specialty}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span
                              style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                              }}
                            >
                              {sch.scheduledTime}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div>{sch.consultationType}</div>
                            <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.725rem' }}>
                              {sch.priority}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: '#64748b', fontSize: '0.775rem' }}>
                            {sch.notes || 'Routine Assessment'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: FACILITY & TRAUMA READINESS                         */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Facility Details Card */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.5rem',
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
                {language === 'hi' ? 'अस्पताल प्रमाणन व संपर्क विवरण' : 'Hospital Facility Credentials & Contact'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Facility Name</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                    {hospital?.hospitalName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Registration Number</div>
                  <div style={{ fontWeight: 600 }}>{hospital?.registrationNumber}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Trauma Care Designation</div>
                  <div style={{ fontWeight: 700, color: '#dc2626' }}>
                    {hospital?.traumaCareLevel || 'Level 1 Comprehensive Trauma Center'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Physical Address</div>
                  <div style={{ color: '#334155' }}>
                    {hospital?.address?.street}, {hospital?.address?.city}, {hospital?.address?.state} - {hospital?.address?.postalCode}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Coordinates (GPS)</div>
                  <div style={{ color: '#334155', fontFamily: 'monospace' }}>
                    [{hospital?.location?.coordinates?.[0]?.toFixed(4)}, {hospital?.location?.coordinates?.[1]?.toFixed(4)}]
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Department Hotlines */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.5rem',
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
                {language === 'hi' ? 'सत्यापित आपातकालीन हॉटलाइन' : 'Verified Emergency Numbers'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(hospital?.verifiedEmergencyNumbers || ['112', '108']).map((num, i) => (
                  <a
                    key={i}
                    href={`tel:${num}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <PhoneCall size={16} />
                      <span>{num}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', background: '#dc2626', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      24/7 Hotline
                    </span>
                  </a>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {language === 'hi' ? 'एम्बुलेंस एवं ट्रॉमा डिस्पैच' : 'Ambulance & Trauma Fleet'}
                </div>
                <p style={{ margin: 0, color: '#64748b' }}>
                  {language === 'hi'
                    ? '24 घंटे क्रिटिकल केयर एम्बुलेंस और ऑन-कॉल रेस्क्यू टीम एक्टिव है।'
                    : 'Active ALS (Advanced Life Support) ambulances stationed and synchronized with MediResQ live GPS dispatch.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: RESERVE BED MODAL                                 */}
      {/* ========================================================= */}
      {showReserveModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bed size={20} color="#2563eb" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {language === 'hi' ? 'अस्पताल बेड आरक्षित करें' : 'Reserve Hospital Inpatient Bed'}
                </h3>
              </div>
              <button
                onClick={() => setShowReserveModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {reserveError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {reserveError}
              </div>
            )}

            <form onSubmit={handleConfirmBedReservation}>
              {/* Patient info row */}
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  Patient & Request Details
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <div>
                    <strong>{bedForm.patientName}</strong> ({bedForm.patientAge} Yrs)
                  </div>
                  <div style={{ color: '#2563eb', fontWeight: 600 }}>{bedForm.patientPhone}</div>
                </div>
              </div>

              {/* Bed Type Selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                  {language === 'hi' ? 'वार्ड प्रकार चुनें *' : 'Select Ward / Bed Category *'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    { id: 'icu', label: 'ICU Critical Care', count: bedsData.icu?.available || 0 },
                    { id: 'emergency', label: 'Emergency & Trauma', count: bedsData.emergency?.available || 0 },
                    { id: 'oxygen', label: 'Oxygen Supported', count: bedsData.oxygen?.available || 0 },
                    { id: 'general', label: 'General Ward', count: bedsData.general?.available || 0 },
                  ].map((w) => (
                    <button
                      type="button"
                      key={w.id}
                      onClick={() => {
                        const newBedNum = `${w.id.toUpperCase()}-${Math.floor(10 + Math.random() * 89)}`;
                        setBedForm({ ...bedForm, bedType: w.id, bedNumber: newBedNum });
                      }}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: bedForm.bedType === w.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: bedForm.bedType === w.id ? '#eff6ff' : '#ffffff',
                        color: bedForm.bedType === w.id ? '#1d4ed8' : '#334155',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      <div>{w.label}</div>
                      <div style={{ fontSize: '0.7rem', color: w.count > 0 ? '#15803d' : '#b91c1c', fontWeight: 500 }}>
                        {w.count} Available
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bed Number Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    {language === 'hi' ? 'बेड नंबर *' : 'Bed Number / Tag *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={bedForm.bedNumber}
                    onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    {language === 'hi' ? 'भर्ती प्राथमिकता' : 'Admission Priority'}
                  </label>
                  <select
                    value={bedForm.priority}
                    onChange={(e) => setBedForm({ ...bedForm, priority: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: '#ffffff',
                    }}
                  >
                    <option value="P0 Emergency">P0 Emergency (Immediate Resuscitation)</option>
                    <option value="P1 Urgent">P1 Urgent (Within 30 Mins)</option>
                    <option value="P2 Priority">P2 Priority Inpatient</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                  {language === 'hi' ? 'क्लिनिकल प्रवेश नोट्स' : 'Clinical Admission Notes'}
                </label>
                <textarea
                  rows={2}
                  value={bedForm.notes}
                  onChange={(e) => setBedForm({ ...bedForm, notes: e.target.value })}
                  placeholder="e.g. Acute chest pain, patient arriving via 108 ambulance..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowReserveModal(false)}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={reserveLoading}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', fontWeight: 700, background: '#2563eb' }}
                >
                  {reserveLoading ? 'Reserving...' : language === 'hi' ? '✓ पुष्टि करें व बेड आरक्षित करें' : '✓ Confirm & Reserve Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: SCHEDULE DOCTOR MODAL                             */}
      {/* ========================================================= */}
      {showScheduleModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Stethoscope size={20} color="#059669" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {language === 'hi' ? 'ऑन-ड्यूटी डॉक्टर शेड्यूल करें' : 'Schedule On-Duty Clinician'}
                </h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {scheduleError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {scheduleError}
              </div>
            )}

            <form onSubmit={handleConfirmDoctorSchedule}>
              {/* Patient info summary */}
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  Patient Intake Case
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <div><strong>{scheduleForm.patientName}</strong></div>
                  <div style={{ color: '#059669', fontWeight: 600 }}>{scheduleForm.patientPhone}</div>
                </div>
              </div>

              {/* Select Doctor from Roster */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                  {language === 'hi' ? 'चिकित्सक चुनें (स्टाफ रोस्टर) *' : 'Select Doctor from Staff Roster *'}
                </label>
                <select
                  required
                  value={scheduleForm.doctorName}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const matched = hospital?.hospitalDoctors?.find((d) => d.name === selectedName);
                    setScheduleForm({
                      ...scheduleForm,
                      doctorName: selectedName,
                      specialty: matched?.specialty || scheduleForm.specialty,
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    background: '#ffffff',
                  }}
                >
                  {(hospital?.hospitalDoctors || [
                    { name: 'Dr. R. K. Sharma', specialty: 'Cardiology & Emergency' },
                    { name: 'Dr. Ananya Sen', specialty: 'Emergency & Critical Care' },
                    { name: 'Dr. Vikram Verma', specialty: 'General & Trauma Surgery' },
                  ]).map((doc, dIdx) => (
                    <option key={dIdx} value={doc.name}>
                      {doc.name} &bull; {doc.specialty} {doc.isOnDuty ? '(On Duty)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Slot & Consultation Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    {language === 'hi' ? 'समय स्लॉट *' : 'Appointment Slot *'}
                  </label>
                  <select
                    value={scheduleForm.scheduledTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: '#ffffff',
                    }}
                  >
                    <option value="Immediate (Within 10m)">Immediate (Within 10m)</option>
                    <option value="Within 30 Mins">Within 30 Mins</option>
                    <option value="Next Shift Slot (1 Hour)">Next Shift Slot (1 Hour)</option>
                    <option value="Today Evening (18:00)">Today Evening (18:00)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    {language === 'hi' ? 'परामर्श प्रकार' : 'Consultation Type'}
                  </label>
                  <select
                    value={scheduleForm.consultationType}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, consultationType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: '#ffffff',
                    }}
                  >
                    <option value="Emergency Triage & Resuscitation">Emergency Triage & Resuscitation</option>
                    <option value="Trauma Surgical Review">Trauma Surgical Review</option>
                    <option value="ICU Critical Evaluation">ICU Critical Evaluation</option>
                    <option value="Inpatient Ward Assessment">Inpatient Ward Assessment</option>
                  </select>
                </div>
              </div>

              {/* Consultation Notes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                  {language === 'hi' ? 'क्लिनिकल निर्देश / टिप्पणियां' : 'Clinical Instructions / Notes'}
                </label>
                <textarea
                  rows={2}
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  placeholder="e.g. Prepare ECG, IV line, blood test panel before clinician arrives..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowScheduleModal(false)}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={scheduleLoading}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', fontWeight: 700, background: '#059669' }}
                >
                  {scheduleLoading ? 'Scheduling...' : language === 'hi' ? '✓ डॉक्टर असाइन करें' : '✓ Confirm & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
