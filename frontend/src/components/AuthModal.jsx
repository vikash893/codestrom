import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from '../context/LocationContext';
import {
  X,
  Lock,
  Phone,
  User as UserIcon,
  AlertCircle,
  Stethoscope,
  Pill,
  Building2,
  Activity,
  ArrowRight,
  ArrowLeft,
  Truck,
  Clock,
  ShieldAlert,
  MapPin,
  CheckCircle,
} from 'lucide-react';

export const AuthModal = ({ isOpen, onClose, initialMode = 'login', customMessage = '' }) => {
  const { login, register } = useAuth();
  const { t, language } = useLanguage();
  const { coords, locationName, fetchLiveCoords } = useLocation();

  const [mode, setMode] = useState(initialMode || 'login'); // 'login' | 'register'
  const [regStep, setRegStep] = useState(1); // 1 = role selection, 2 = role form
  const [role, setRole] = useState('patient');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialMode) {
        setMode(initialMode);
      }
      setError('');
    }
  }, [isOpen, initialMode]);

  // Common fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Patient fields
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('prefer_not_to_say');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Delhi');

  // Doctor fields
  const [specialties, setSpecialties] = useState('General Medicine');
  const [qualifications, setQualifications] = useState('MBBS, MD');
  const [medicalRegistrationNumber, setMedicalRegistrationNumber] = useState('');
  const [registrationCouncil, setRegistrationCouncil] = useState('State Medical Council');
  const [consultationFee, setConsultationFee] = useState(500);
  const [clinicAddress, setClinicAddress] = useState('');
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00');

  // Pharmacy fields
  const [storeName, setStoreName] = useState('');
  const [drugLicenseNumber, setDrugLicenseNumber] = useState('');
  const [gstin, setGstin] = useState('');
  const [homeDeliveryAvailable, setHomeDeliveryAvailable] = useState(true);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(10);
  const [operatingHoursOpen, setOperatingHoursOpen] = useState('08:00');
  const [operatingHoursClose, setOperatingHoursClose] = useState('22:00');
  const [pharmacyStreet, setPharmacyStreet] = useState('');
  const [pharmacyCity, setPharmacyCity] = useState('Delhi');

  // Hospital fields
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalRegNumber, setHospitalRegNumber] = useState('');
  const [emergency247, setEmergency247] = useState(true);
  const [traumaCareLevel, setTraumaCareLevel] = useState('Level 1');
  const [emergencyNumbers, setEmergencyNumbers] = useState('');
  const [hospitalStreet, setHospitalStreet] = useState('');
  const [hospitalCity, setHospitalCity] = useState('Delhi');

  if (!isOpen) return null;

  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole);
    setRegStep(2);
    setError('');
    // Automatically trigger live GPS capture when role is selected
    fetchLiveCoords().catch(() => {});
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Capture live GPS coordinates upon login
      const live = await fetchLiveCoords().catch(() => coords);
      await login(phone, password, live?.lat || coords?.lat, live?.lng || coords?.lng);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Ensure live coordinates are obtained at signup
      const live = await fetchLiveCoords().catch(() => coords);

      const payload = {
        phone,
        password,
        role,
        email: email || undefined,
        preferredLanguage: language,
        latitude: live?.lat || coords?.lat || 28.6139,
        longitude: live?.lng || coords?.lng || 77.2090,
      };

      if (role === 'patient') {
        payload.fullName = fullName;
        payload.gender = gender;
        payload.emergencyContactName = emergencyContactName || undefined;
        payload.emergencyContactPhone = emergencyContactPhone || undefined;
      } else if (role === 'doctor') {
        payload.fullName = fullName.startsWith('Dr.') ? fullName : `Dr. ${fullName}`;
        payload.specialties = specialties.split(',').map((s) => s.trim()).filter(Boolean);
        payload.qualifications = qualifications.split(',').map((q) => q.trim()).filter(Boolean);
        payload.medicalRegistrationNumber = medicalRegistrationNumber || `MED-${Date.now().toString().slice(-6)}`;
        payload.registrationCouncil = registrationCouncil;
        payload.consultationFee = Number(consultationFee) || 500;
        payload.clinicAddress = clinicAddress || 'Central Clinic';
        payload.workingHours = { start: workingHoursStart, end: workingHoursEnd };
      } else if (role === 'pharmacy') {
        payload.storeName = storeName || fullName;
        payload.fullName = storeName || fullName;
        payload.drugLicenseNumber = drugLicenseNumber || `DL-${Date.now().toString().slice(-6)}`;
        payload.gstin = gstin || '07AAAAA0000A1Z5';
        payload.homeDeliveryAvailable = Boolean(homeDeliveryAvailable);
        payload.deliveryRadiusKm = Number(deliveryRadiusKm) || 10;
        payload.operatingHours = {
          openTime: operatingHoursOpen,
          closeTime: operatingHoursClose,
          is24Hours: operatingHoursOpen === '00:00' && operatingHoursClose === '23:59',
        };
        payload.pharmacyAddress = {
          street: pharmacyStreet || 'Main Market Road',
          city: pharmacyCity || 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
        };
      } else if (role === 'hospital') {
        payload.hospitalName = hospitalName || fullName;
        payload.fullName = hospitalName || fullName;
        payload.hospitalRegistrationNumber = hospitalRegNumber || `HOSP-${Date.now().toString().slice(-6)}`;
        payload.emergencyDepartmentAvailable = Boolean(emergency247);
        payload.traumaCareLevel = traumaCareLevel;
        payload.emergencyNumbers = emergencyNumbers
          ? emergencyNumbers.split(',').map((n) => n.trim()).filter(Boolean)
          : [phone, '112'];
        payload.hospitalAddress = {
          street: hospitalStreet || 'Civil Hospital Road',
          city: hospitalCity || 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
        };
      }

      await register(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: 'patient',
      title: t('rolePatient'),
      desc: t('rolePatientDesc'),
      icon: Activity,
      color: '#2563eb',
      tag: language === 'hi' ? 'रोगी / परिवार' : 'Patients & Citizens',
    },
    {
      id: 'doctor',
      title: t('roleDoctor'),
      desc: t('roleDoctorDesc'),
      icon: Stethoscope,
      color: '#0284c7',
      tag: language === 'hi' ? 'चिकित्सक' : 'Licensed Clinicians',
    },
    {
      id: 'pharmacy',
      title: t('rolePharmacy'),
      desc: t('rolePharmacyDesc'),
      icon: Pill,
      color: '#059669',
      tag: language === 'hi' ? 'दवा विक्रेता' : 'Pharmacy & Delivery',
    },
    {
      id: 'hospital',
      title: t('roleHospital'),
      desc: t('roleHospitalDesc'),
      icon: Building2,
      color: '#dc2626',
      tag: language === 'hi' ? 'अस्पताल' : 'Trauma & 24/7 ER',
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
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
    }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: mode === 'register' && regStep === 1 ? '680px' : '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          padding: '1.75rem',
          position: 'relative',
        }}
      >
        {customMessage && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              color: '#065f46',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
            }}
          >
            <Lock size={15} color="#059669" />
            <span>{customMessage}</span>
          </div>
        )}

        {/* Header Tabs: Sign In vs Register */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: mode === 'login' ? '3px solid #2563eb' : '3px solid transparent',
                padding: '0.4rem 0.6rem',
                fontSize: '1rem',
                fontWeight: mode === 'login' ? 700 : 500,
                color: mode === 'login' ? '#2563eb' : '#64748b',
                cursor: 'pointer',
              }}
            >
              {t('signIn')}
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setRegStep(1); setError(''); }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: mode === 'register' ? '3px solid #2563eb' : '3px solid transparent',
                padding: '0.4rem 0.6rem',
                fontSize: '1rem',
                fontWeight: mode === 'register' ? 700 : 500,
                color: mode === 'register' ? '#2563eb' : '#64748b',
                cursor: 'pointer',
              }}
            >
              {t('register')}
            </button>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.65rem', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Live GPS Coordinates Auto-Capture Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.75rem',
          color: coords?.isLive ? '#15803d' : '#64748b',
          marginBottom: '1rem',
          background: coords?.isLive ? '#f0fdf4' : '#f8fafc',
          border: coords?.isLive ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
          padding: '0.4rem 0.65rem',
          borderRadius: '6px',
        }}>
          <MapPin size={14} color={coords?.isLive ? '#16a34a' : '#64748b'} />
          <span>
            {coords?.isLive
              ? `Live Device Coordinates: ${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E (Auto-Acquired)`
              : locationName}
          </span>
        </div>

        {/* MODE 1: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                {t('phone')} / Email
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', paddingLeft: '2.2rem', padding: '0.6rem 0.75rem 0.6rem 2.2rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  placeholder="+919876543210 or user@example.com"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                {t('password')}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                <input
                  type="password"
                  className="form-control"
                  style={{ width: '100%', paddingLeft: '2.2rem', padding: '0.6rem 0.75rem 0.6rem 2.2rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontWeight: 600, fontSize: '0.95rem' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : t('signIn')}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
              {t('dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setRegStep(1); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
              >
                {t('register')}
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: REGISTER */}
        {mode === 'register' && (
          <div>
            {/* STEP 1: CHOOSE ROLE */}
            {regStep === 1 && (
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>
                    {t('selectRole')}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    {t('selectRoleDesc')}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                  {roles.map((r) => {
                    const Icon = r.icon;
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRole(r.id)}
                        style={{
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          background: '#ffffff',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = r.color;
                          e.currentTarget.style.boxShadow = `0 4px 12px ${r.color}20`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <div style={{ background: `${r.color}15`, color: r.color, padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
                            <Icon size={20} />
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: r.color, background: `${r.color}10`, padding: '0.15rem 0.5rem', borderRadius: '12px' }}>
                            {r.tag}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#0f172a' }}>
                          {r.title}
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem 0', lineHeight: 1.35 }}>
                          {r.desc}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: r.color, fontWeight: 600 }}>
                          <span>{t('continue')}</span>
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: DYNAMIC ROLE FORM */}
            {regStep === 2 && (
              <form onSubmit={handleRegisterSubmit}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    <ArrowLeft size={14} />
                    <span>{t('back')}</span>
                  </button>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                    Role: <strong style={{ color: '#2563eb', textTransform: 'uppercase' }}>{role}</strong>
                  </span>
                </div>

                {/* Common Identity Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.25rem', display: 'block' }}>
                      {role === 'pharmacy' ? t('storeName') : role === 'hospital' ? t('hospitalName') : t('fullName')} *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      placeholder={role === 'doctor' ? 'Dr. Sharma' : role === 'pharmacy' ? 'Apollo Meds' : role === 'hospital' ? 'Apollo Hospital' : 'Rahul Sharma'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.25rem', display: 'block' }}>
                      {t('phone')} *
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      placeholder="+919876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.25rem', display: 'block' }}>
                      {t('password')} *
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: '0.25rem', display: 'block' }}>
                      {t('email')}
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* ROLE 1: DOCTOR SPECIFIC FIELDS */}
                {role === 'doctor' && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.65rem' }}>
                      <Stethoscope size={16} />
                      <span>Doctor Credentials & Clinic Setup</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          Specialties (comma-separated) *
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          placeholder="General Medicine, Cardiology"
                          value={specialties}
                          onChange={(e) => setSpecialties(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          Qualifications *
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          placeholder="MBBS, MD (Medicine)"
                          value={qualifications}
                          onChange={(e) => setQualifications(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          Medical Registration No. *
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          placeholder="MCI-19842"
                          value={medicalRegistrationNumber}
                          onChange={(e) => setMedicalRegistrationNumber(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          Consultation Fee (₹)
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          value={consultationFee}
                          onChange={(e) => setConsultationFee(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          Available From
                        </label>
                        <input
                          type="time"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          value={workingHoursStart}
                          onChange={(e) => setWorkingHoursStart(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          Available To
                        </label>
                        <input
                          type="time"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          value={workingHoursEnd}
                          onChange={(e) => setWorkingHoursEnd(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                        Clinic / Hospital Location Address *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                        placeholder="e.g. Clinic 4, Medical Enclave, Connaught Place, New Delhi"
                        value={clinicAddress}
                        onChange={(e) => setClinicAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* ROLE 2: PHARMACY SPECIFIC FIELDS */}
                {role === 'pharmacy' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.65rem' }}>
                      <Pill size={16} />
                      <span>Pharmacy License & Home Delivery Settings</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          Drug License No. (DL) *
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          placeholder="DL-DL-2023-4891"
                          value={drugLicenseNumber}
                          onChange={(e) => setDrugLicenseNumber(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          GSTIN (Optional)
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          placeholder="07AAAAA0000A1Z5"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Can they deliver at home? */}
                    <div style={{ background: '#ffffff', border: '1px solid #86efac', borderRadius: '6px', padding: '0.65rem', marginBottom: '0.65rem' }}>
                      <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 700, color: '#15803d', display: 'block', marginBottom: '0.35rem' }}>
                        <Truck size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        {t('homeDeliveryAvailable')} *
                      </label>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.825rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="deliveryRadio"
                            checked={homeDeliveryAvailable === true}
                            onChange={() => setHomeDeliveryAvailable(true)}
                          />
                          <span>{t('yesDelivery')}</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="deliveryRadio"
                            checked={homeDeliveryAvailable === false}
                            onChange={() => setHomeDeliveryAvailable(false)}
                          />
                          <span>{t('noDelivery')}</span>
                        </label>
                      </div>

                      {homeDeliveryAvailable && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                            {t('deliveryRadiusKm')}
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            style={{ width: '120px', padding: '0.35rem', fontSize: '0.825rem' }}
                            value={deliveryRadiusKm}
                            onChange={(e) => setDeliveryRadiusKm(e.target.value)}
                            min={1}
                            max={50}
                          />
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                        Pharmacy Address & City *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                        placeholder="Shop 12, Main Market, Lajpat Nagar, New Delhi"
                        value={pharmacyStreet}
                        onChange={(e) => setPharmacyStreet(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* ROLE 3: HOSPITAL SPECIFIC FIELDS */}
                {role === 'hospital' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.65rem' }}>
                      <Building2 size={16} />
                      <span>Hospital & Emergency Care Readiness</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          NABH / Reg Number *
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          placeholder="NABH-HOSP-1049"
                          value={hospitalRegNumber}
                          onChange={(e) => setHospitalRegNumber(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          Trauma Care Level
                        </label>
                        <select
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          value={traumaCareLevel}
                          onChange={(e) => setTraumaCareLevel(e.target.value)}
                        >
                          <option value="Level 1">Level 1 (Highest Trauma Care)</option>
                          <option value="Level 2">Level 2 (Comprehensive)</option>
                          <option value="Level 3">Level 3 (Community Emergency)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                        Emergency Hotline Numbers (comma-separated)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                        placeholder="011-23456789, 112"
                        value={emergencyNumbers}
                        onChange={(e) => setEmergencyNumbers(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                        Hospital Address *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                        placeholder="Civil Lines Hospital Road, Delhi"
                        value={hospitalStreet}
                        onChange={(e) => setHospitalStreet(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* ROLE 4: PATIENT SPECIFIC FIELDS */}
                {role === 'patient' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          {t('age')}
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          placeholder="e.g. 28"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          {t('gender')}
                        </label>
                        <select
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                        >
                          <option value="prefer_not_to_say">Prefer not to say</option>
                          <option value="male">{t('genderMale')}</option>
                          <option value="female">{t('genderFemale')}</option>
                          <option value="other">{t('genderOther')}</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          {t('emergencyContactName')}
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          placeholder="Family member"
                          value={emergencyContactName}
                          onChange={(e) => setEmergencyContactName(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                          {t('emergencyContactPhone')}
                        </label>
                        <input
                          type="tel"
                          className="form-control"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                          placeholder="+919876543210"
                          value={emergencyContactPhone}
                          onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block' }}>
                        {t('deliveryAddress')}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem' }}
                        placeholder="House/Flat number, Street, Landmark"
                        value={deliveryStreet}
                        onChange={(e) => setDeliveryStreet(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontWeight: 700, fontSize: '0.95rem' }}
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : t('submitRegister')}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
