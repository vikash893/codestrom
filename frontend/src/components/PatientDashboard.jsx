import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from '../context/LocationContext';
import { EmergencyBanner } from './EmergencyBanner';
import { Sidebar } from './Sidebar';
import {
  Skeleton,
  SkeletonCard,
  SkeletonOrderItem,
  SkeletonTriage,
} from './Skeleton';
import {
  Activity,
  Send,
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
  ShoppingBag,
  Truck,
  ArrowRight,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';

export const PatientDashboard = ({ onOpenAuth }) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { coords, locationName, locLoading, fetchLiveCoords } = useLocation();

  // Active Tab: 'intake' | 'scanner' | 'medicines' | 'orders' | 'doctors' | 'hospitals'
  const [activeTab, setActiveTab] = useState('intake');

  // 1. Intake State (Mandatory Fields)
  const [description, setDescription] = useState('');
  const [inputLang, setInputLang] = useState(language || 'en');
  const [duration, setDuration] = useState('1-2 days');
  const [severity, setSeverity] = useState('moderate');
  const [age, setAge] = useState(user?.age ? String(user.age) : '28');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [relevantHistory, setRelevantHistory] = useState('None');
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeResult, setIntakeResult] = useState(null);
  const [intakeError, setIntakeError] = useState('');

  // 2. Scanner State (Skin & Medical Bill / Prescription)
  const [scannerMode, setScannerMode] = useState('skin'); // 'skin' | 'prescription'
  const [scannerFile, setScannerFile] = useState(null);
  const [scannerPreview, setScannerPreview] = useState(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [skinAnalysis, setSkinAnalysis] = useState(null);
  const [prescriptionAnalysis, setPrescriptionAnalysis] = useState(null);
  const [scannerError, setScannerError] = useState('');

  // 3. Orders, Medicine Card & Live Store Availability State
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [medicineCard, setMedicineCard] = useState([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartChecking, setCartChecking] = useState(false);
  const [cartAvailabilityData, setCartAvailabilityData] = useState(null);
  const [orderingStoreId, setOrderingStoreId] = useState(null);
  const [orderStreet, setOrderStreet] = useState(user?.address?.street || '');
  const [orderCity, setOrderCity] = useState(user?.address?.city || 'Delhi');
  const [orderPhone, setOrderPhone] = useState(user?.phone || '');

  // 4. Discovery State
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [medicineQuery, setMedicineQuery] = useState('');
  const [medicineMatches, setMedicineMatches] = useState([]);
  const [medLoading, setMedLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const [requestingDocId, setRequestingDocId] = useState(null);
  const [consultationNotice, setConsultationNotice] = useState('');

  // Load Nearby Hospitals
  const loadNearbyHospitals = async () => {
    setHospitalsLoading(true);
    try {
      const res = await api.get(`/nearby?lng=${coords.lng}&lat=${coords.lat}&radiusKm=15&category=hospitals`);
      setHospitals(res.data.data.hospitals || []);
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    } finally {
      setHospitalsLoading(false);
    }
  };

  // Load Available Doctors
  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const res = await api.get('/doctors');
      setDoctors(res.data.doctors || []);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setDoctorsLoading(false);
    }
  };

  // Load Patient Orders
  const loadOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    try {
      const res = await api.get('/orders/my-orders');
      setMyOrders(res.data.orders || []);
    } catch (err) {
      console.warn('Failed to load orders:', err.message);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Load Consultations
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
      loadOrders();
      loadConsultations();
    }
  }, [coords, user]);

  // Handle Symptom Intake
  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    // Validation: All 6 fields are mandatory
    if (!description.trim() || description.trim().length < 5) {
      setIntakeError(language === 'hi' ? 'कृपया अपनी समस्या/लक्षण कम से कम 5 अक्षरों में विस्तार से लिखें।' : 'Please describe your symptoms in at least 5 characters.');
      return;
    }
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setIntakeError(language === 'hi' ? 'कृपया मरीज की वैध आयु (1 से 120 वर्ष) दर्ज करें।' : 'Please enter a valid patient age (1 to 120 years).');
      return;
    }
    if (!gender) {
      setIntakeError(language === 'hi' ? 'कृपया लिंग (Gender) चुनें।' : 'Please select gender.');
      return;
    }
    if (!duration) {
      setIntakeError(language === 'hi' ? 'कृपया लक्षणों की अवधि (Duration) चुनें।' : 'Please select symptom duration.');
      return;
    }
    if (!severity) {
      setIntakeError(language === 'hi' ? 'कृपया गंभीरता स्तर (Severity) चुनें।' : 'Please select severity level.');
      return;
    }
    if (!relevantHistory.trim()) {
      setIntakeError(language === 'hi' ? 'कृपया मेडिकल हिस्ट्री दर्ज करें (या "None" लिखें)।' : 'Please enter medical history (or "None").');
      return;
    }

    setIntakeLoading(true);
    setIntakeError('');

    try {
      const payload = {
        description: description.trim(),
        language: inputLang,
        age_years: parsedAge,
        gender,
        duration,
        severity,
        relevant_history: relevantHistory.trim(),
        coordinates: [coords.lng, coords.lat],
      };

      const res = await api.post('/intake', payload);
      setIntakeResult(res.data);
    } catch (err) {
      setIntakeError(err.response?.data?.message || err.message || 'Failed to submit symptom assessment');
    } finally {
      setIntakeLoading(false);
    }
  };

  // Handle Scanner File Upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScannerFile(file);
      setScannerPreview(URL.createObjectURL(file));
      setSkinAnalysis(null);
      setPrescriptionAnalysis(null);
      setScannerError('');
    }
  };

  const handleProcessScan = async () => {
    if (!scannerFile) return;
    if (!user) {
      onOpenAuth();
      return;
    }

    setScannerLoading(true);
    setScannerError('');

    try {
      const formData = new FormData();
      formData.append('file', scannerFile);
      formData.append('imageType', scannerMode);

      const res = await api.post(`/uploads/image?type=${scannerMode}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (scannerMode === 'skin') {
        setSkinAnalysis(res.data.data);
      } else {
        setPrescriptionAnalysis(res.data.data);
      }
    } catch (err) {
      setScannerError(err.response?.data?.message || err.message || 'Failed to process document/image');
    } finally {
      setScannerLoading(false);
    }
  };

  // Medicine Card / Cart Handlers & Live Store Availability Verification
  const handleAddToCard = (med) => {
    const medName = med.name || med.medicineName;
    const genericName = med.genericName || med.generic_name || medName;
    const unitPrice = med.matchedPharmacy?.unitPrice || med.unitPrice || med.price || 50;

    setMedicineCard((prev) => {
      const existing = prev.find((item) => (item.name || '').toLowerCase() === medName.toLowerCase());
      if (existing) {
        return prev.map((item) =>
          (item.name || '').toLowerCase() === medName.toLowerCase()
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `MED-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: medName,
          genericName,
          quantity: 1,
          unitPrice,
          doseAmount: med.doseAmount,
          frequency: med.frequency,
          initialPharmacy: med.matchedPharmacy || null,
        },
      ];
    });
  };

  const handleUpdateCardQuantity = (medName, delta) => {
    setMedicineCard((prev) => {
      const updated = prev
        .map((item) => {
          if ((item.name || '').toLowerCase() === medName.toLowerCase()) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);

      if (cartModalOpen) {
        handleRecheckCart(updated);
      }
      return updated;
    });
  };

  const handleRemoveFromCard = (medName) => {
    setMedicineCard((prev) => {
      const updated = prev.filter((item) => (item.name || '').toLowerCase() !== medName.toLowerCase());
      if (cartModalOpen) {
        handleRecheckCart(updated);
      }
      return updated;
    });
  };

  // Check live availability across all stores for all items in the card
  const handleOpenCardModal = async () => {
    if (medicineCard.length === 0) return;
    setCartModalOpen(true);
    setCartChecking(true);
    try {
      const res = await api.post('/medicines/check-cart-availability', {
        items: medicineCard.map((it) => ({
          name: it.name,
          genericName: it.genericName,
          quantity: it.quantity,
        })),
        coordinates: [coords.lng, coords.lat],
      });
      setCartAvailabilityData(res.data);
    } catch (err) {
      console.error('Failed to check cart availability:', err);
    } finally {
      setCartChecking(false);
    }
  };

  const handleRecheckCart = async (updatedItems) => {
    if (!updatedItems || updatedItems.length === 0) {
      setCartAvailabilityData(null);
      return;
    }
    setCartChecking(true);
    try {
      const res = await api.post('/medicines/check-cart-availability', {
        items: updatedItems.map((it) => ({
          name: it.name,
          genericName: it.genericName,
          quantity: it.quantity,
        })),
        coordinates: [coords.lng, coords.lat],
      });
      setCartAvailabilityData(res.data);
    } catch (err) {
      console.error('Failed to recheck cart availability:', err);
    } finally {
      setCartChecking(false);
    }
  };

  // Confirm order for a specific store group (Grouped by Store; partial available orders confirmed)
  const handleConfirmStoreOrder = async (storeGroup) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!storeGroup.items || storeGroup.items.length === 0) return;

    setOrderingStoreId(storeGroup.store.pharmacyId);
    try {
      const payload = {
        pharmacyId: storeGroup.store.pharmacyId,
        items: storeGroup.items.map((it) => ({
          medicineName: it.name,
          genericName: it.genericName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          inventoryId: it.inventoryId,
        })),
        deliveryType: 'home_delivery',
        deliveryAddress: {
          street: orderStreet || 'Main Market Road',
          city: orderCity || 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          contactPhone: orderPhone || user.phone,
          patientName: user.name || user.phone || 'Patient',
        },
        paymentMethod: 'cash_on_delivery',
      };

      const res = await api.post('/orders', payload);

      alert(
        language === 'hi'
          ? `ऑर्डर सफल! ${storeGroup.store.storeName} को ₹${storeGroup.storeSubtotal} का ऑर्डर भेज दिया गया है। (Order ID: ${res.data.order?.orderId})`
          : `Order placed successfully! ${storeGroup.store.storeName} has received your order for ₹${storeGroup.storeSubtotal}. (Order ID: ${res.data.order?.orderId})`
      );

      // Remove ordered items from card
      const orderedNames = new Set(storeGroup.items.map((it) => it.name.toLowerCase()));
      const remaining = medicineCard.filter((it) => !orderedNames.has(it.name.toLowerCase()));
      setMedicineCard(remaining);

      if (remaining.length === 0) {
        setCartModalOpen(false);
        setCartAvailabilityData(null);
      } else {
        handleRecheckCart(remaining);
      }

      loadOrders();
      setActiveTab('orders');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place delivery order. Please verify live availability.');
    } finally {
      setOrderingStoreId(null);
    }
  };

  // Helper for 1-click add & verify
  const handleInitiateOrder = (pharmacy, items) => {
    if (!items || items.length === 0) return;
    items.forEach((it) => {
      handleAddToCard({
        ...it,
        matchedPharmacy: pharmacy,
      });
    });
    setCartModalOpen(true);
    setCartChecking(true);
    api.post('/medicines/check-cart-availability', {
      items: items.map((it) => ({
        name: it.name || it.medicineName,
        genericName: it.genericName || it.name,
        quantity: it.quantity || 1,
      })),
      coordinates: [coords.lng, coords.lat],
    }).then((res) => {
      setCartAvailabilityData(res.data);
    }).catch((err) => {
      console.error('Cart check failed:', err);
    }).finally(() => {
      setCartChecking(false);
    });
  };

  // Medicine Search
  const handleSearchMedicine = async (e) => {
    e.preventDefault();
    if (!medicineQuery.trim()) return;

    setMedLoading(true);
    try {
      const res = await api.get(`/medicines/match-inventory?query=${encodeURIComponent(medicineQuery)}&lng=${coords.lng}&lat=${coords.lat}&radiusKm=15`);
      setMedicineMatches(res.data.matches || []);
    } catch (err) {
      console.error('Medicine match search failed:', err);
    } finally {
      setMedLoading(false);
    }
  };

  // Request Doctor Consultation
  const handleRequestConsultation = async (doctorId) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setRequestingDocId(doctorId);
    setConsultationNotice('');

    try {
      const res = await api.post('/consultations/request', {
        doctorId,
        consultationMode: 'chat',
        patientSymptoms: intakeResult?.extractedSymptoms || [description || 'General Consultation Request'],
        urgency: intakeResult?.priority || 'P3_ROUTINE',
      });

      setConsultationNotice(language === 'hi' ? 'डॉक्टर को परामर्श अनुरोध भेजा गया है।' : `Consultation requested! Doctor has been notified.`);
      loadConsultations();
      setTimeout(() => setConsultationNotice(''), 6000);
    } catch (err) {
      setConsultationNotice(err.response?.data?.message || 'Failed to request consultation');
    } finally {
      setRequestingDocId(null);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Dedicated Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        role="patient"
        counts={{
          orders: myOrders.length,
          medicines: medicineMatches.length,
          doctors: doctors.length,
          hospitals: hospitals.length,
        }}
      />

      {/* Main Content Workspace */}
      <div style={{ flex: 1, padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Top Emergency Hotline Banner */}
        <EmergencyBanner />

        {/* Live Device GPS Coordinates Bar */}
        <div style={{
          background: coords?.isLive ? '#f0fdf4' : '#ffffff',
          border: coords?.isLive ? '1.5px solid #86efac' : '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.6rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: coords?.isLive ? '#15803d' : '#334155' }}>
            <MapPin size={16} color={coords?.isLive ? '#16a34a' : '#2563eb'} />
            <span>
              {coords?.isLive ? '🟢 Live Device GPS: ' : '📍 Current Location: '}
              <strong>{locationName}</strong>
            </span>
          </div>
          <button
            onClick={() => fetchLiveCoords()}
            disabled={locLoading}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.25rem 0.6rem',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {locLoading ? 'Acquiring GPS...' : (language === 'hi' ? 'लाइव GPS रिफ्रेश करें' : 'Refresh Live GPS')}
          </button>
        </div>

        {/* TAB 1: SYMPTOM ASSESSMENT & AI TRIAGE */}
        {activeTab === 'intake' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.4fr)', gap: '1.5rem' }}>
              {/* Intake Form */}
              <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} color="#2563eb" />
                  <span>{language === 'hi' ? 'एआई लक्षण एवं आपातकालीन जांच' : 'AI Symptom & Emergency Triage'}</span>
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                  {language === 'hi'
                    ? 'अपनी समस्या हिंदी या अंग्रेजी में लिखें (उदा. "कल से छाती में तेज दर्द हो रहा है")'
                    : 'Describe your symptoms in natural language (e.g. "feeling sharp pain in chest from yesterday")'}
                </p>

                {intakeError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.65rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {intakeError}
                  </div>
                )}

                <form onSubmit={handleIntakeSubmit}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>
                      {language === 'hi' ? 'आप कैसा महसूस कर रहे हैं? (लक्षण)' : 'What symptoms are you experiencing?'} *
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      placeholder={language === 'hi' ? 'उदा. कल रात से छाती में भारीपन और पसीना आ रहा है...' : 'e.g. sharp chest pain radiating to left arm since yesterday, feeling short of breath...'}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        {language === 'hi' ? 'आयु (Patient Age)' : 'Patient Age'} *
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        placeholder="25"
                        min="1"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        {language === 'hi' ? 'लिंग (Gender)' : 'Gender'} *
                      </label>
                      <select
                        className="form-control"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        required
                      >
                        <option value="male">{language === 'hi' ? 'पुरुष (Male)' : 'Male'}</option>
                        <option value="female">{language === 'hi' ? 'महिला (Female)' : 'Female'}</option>
                        <option value="other">{language === 'hi' ? 'अन्य (Other)' : 'Other'}</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        {language === 'hi' ? 'अवधि (Duration)' : 'Duration'} *
                      </label>
                      <select
                        className="form-control"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        required
                      >
                        <option value="Few hours">{language === 'hi' ? 'कुछ घंटे (Few hours)' : 'Few hours'}</option>
                        <option value="1-2 days">{language === 'hi' ? '1 से 2 दिन (1-2 days)' : '1-2 days'}</option>
                        <option value="3-7 days">{language === 'hi' ? '3 से 7 दिन (3-7 days)' : '3-7 days'}</option>
                        <option value="> 1 week">{language === 'hi' ? '1 सप्ताह से अधिक (> 1 week)' : '> 1 week'}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        {language === 'hi' ? 'गंभीरता (Severity)' : 'Severity'} *
                      </label>
                      <select
                        className="form-control"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        required
                      >
                        <option value="mild">{language === 'hi' ? 'हल्का (Mild)' : 'Mild'}</option>
                        <option value="moderate">{language === 'hi' ? 'मध्यम (Moderate)' : 'Moderate'}</option>
                        <option value="severe">{language === 'hi' ? 'गंभीर (Severe)' : 'Severe'}</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        {language === 'hi' ? 'मेडिकल हिस्ट्री / एलर्जी' : 'History / Allergies'} *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        placeholder={language === 'hi' ? 'उदा. None या Asthma, Diabetes...' : 'e.g. None or Asthma, Diabetes...'}
                        value={relevantHistory}
                        onChange={(e) => setRelevantHistory(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                        {t('languagePref')}
                      </label>
                      <select
                        className="form-control"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        value={inputLang}
                        onChange={(e) => setInputLang(e.target.value)}
                      >
                        <option value="en">English</option>
                        <option value="hi">हिन्दी (Hindi)</option>
                        <option value="hinglish">Hinglish</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', fontWeight: 700, fontSize: '0.95rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    disabled={intakeLoading}
                  >
                    <Send size={16} />
                    <span>{intakeLoading ? (language === 'hi' ? 'जांच जारी है...' : 'Synthesizing Clinical Evidence...') : (language === 'hi' ? 'लक्षण जांचें एवं संसाधन खोजें' : 'Assess Symptoms & Find Resources')}</span>
                  </button>
                </form>
              </div>

              {/* Triage Results & Decision Support */}
              <div>
                {intakeLoading ? (
                  <SkeletonTriage />
                ) : intakeResult ? (
                  <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                          {language === 'hi' ? 'एआई नैदानिक विश्लेषण रिपोर्ट' : 'Structured Triage Assessment'}
                        </h4>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Case ID: <strong>{intakeResult.caseId}</strong>
                        </span>
                      </div>
                      <span className={`badge ${
                        intakeResult.triageLevel === 'RED'
                          ? 'badge-emergency'
                          : intakeResult.triageLevel === 'YELLOW'
                          ? 'badge-warning'
                          : 'badge-success'
                      }`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                        {intakeResult.priority} ({intakeResult.triageLevel})
                      </span>
                    </div>

                    {/* RED EMERGENCY BANNER */}
                    {intakeResult.isEmergency && (
                      <div style={{ background: '#fef2f2', border: '1.5px solid #ef4444', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', color: '#991b1b', fontSize: '0.9rem' }}>
                        <strong>⚠️ {language === 'hi' ? 'आपातकालीन चेतावनी' : 'EMERGENCY RED FLAG'}:</strong> {intakeResult.emergencyGuidance}
                        <div style={{ marginTop: '0.65rem' }}>
                          <a
                            href="tel:112"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              background: '#dc2626',
                              color: '#ffffff',
                              padding: '0.4rem 0.85rem',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            <PhoneCall size={16} />
                            <span>{language === 'hi' ? 'तुरंत 112 एम्बुलेंस बुलाएं' : 'Call 112 Ambulance Dispatch'}</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Extracted Symptoms */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        {language === 'hi' ? 'पहचाने गए लक्षण' : 'Extracted Symptoms'}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {intakeResult.extractedSymptoms.map((sym, idx) => (
                          <span key={idx} className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                            {sym.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Dual-Stream ML Model + Internet Consensus Card */}
                    {(intakeResult.consensus_pipeline || intakeResult.aiAssessment?.consensus_pipeline) && (
                      (() => {
                        const cp = intakeResult.consensus_pipeline || intakeResult.aiAssessment?.consensus_pipeline;
                        return (
                          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span>🎯 {language === 'hi' ? 'आम सहमति एवं सर्वश्रेष्ठ आउटपुट' : 'Consensus & Best Primary Output:'}</span>
                              </div>
                              <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.55rem', borderRadius: '999px', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                                {cp.consensus_status}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                              {cp.primary_condition} &bull; <span style={{ color: '#059669', fontSize: '0.8rem' }}>{Math.round(cp.confidence_score * 100)}% Confidence</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem', fontSize: '0.72rem' }}>
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                🤖 ML Model: {cp.model_stream?.predicted_disease} ({Math.round((cp.model_stream?.raw_confidence || 0.9) * 100)}%)
                              </span>
                              <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                🌐 Web Search: {cp.web_stream?.web_conditions_found?.[0] || 'Clinical Evidence Verified'}
                              </span>
                              <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                                ⚡ Alignment: {Math.round((cp.model_web_alignment_score || 0.85) * 100)}%
                              </span>
                            </div>

                            {/* Common & Best Verified Medicines */}
                            {cp.common_and_best_medicines?.length > 0 && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#15803d', marginBottom: '0.3rem' }}>
                                  💊 {language === 'hi' ? 'सर्वश्रेष्ठ औषधियां (ML मॉडल एवं इंटरनेट द्वारा सत्यापित):' : 'Common & Best Medicines (Verified by ML + Internet):'}
                                </div>
                                {cp.common_and_best_medicines.map((med, mIdx) => (
                                  <div key={mIdx} style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.5rem', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <strong style={{ color: '#14532d' }}>{med.name}</strong>
                                      <span style={{ color: '#059669', fontWeight: 600 }}>₹{med.price}</span>
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '0.15rem' }}>
                                      {med.evidence_badge} &bull; {med.instruction}
                                    </div>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ width: '100%', marginTop: '0.5rem', padding: '0.45rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                                  onClick={() => {
                                    handleInitiateOrder(null, cp.common_and_best_medicines.map((m) => ({ name: m.name, quantity: 1, unitPrice: m.price })));
                                  }}
                                >
                                  <Truck size={14} />
                                  <span>{language === 'hi' ? 'सर्वश्रेष्ठ दवाइयां घर मंगवाएं (Home Delivery)' : 'Order Best Medicines for Home Delivery'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}

                    {/* Possible Conditions & Evidence */}
                    {intakeResult.evidenceSynthesis?.possibleConditions?.length > 0 && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                          {language === 'hi' ? 'संभावित स्वास्थ्य स्थितियां (Clinical Differential)' : 'Possible Clinical Conditions:'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {intakeResult.evidenceSynthesis.possibleConditions.map((c, i) => (
                            <div key={i} style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.825rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                <span style={{ color: '#0f172a' }}>{c.name}</span>
                                <span style={{ color: '#2563eb' }}>{Math.round((c.confidence || 0.6) * 100)}% match</span>
                              </div>
                              <p style={{ margin: '0.25rem 0', color: '#475569' }}>{c.clinicalRationale}</p>
                              {c.citations?.length > 0 && (
                                <div style={{ fontSize: '0.725rem', color: '#0284c7' }}>
                                  Verified: <a href={c.citations[0].url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>{c.citations[0].source}</a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* First Aid Measures */}
                    {intakeResult.evidenceSynthesis?.firstAidMeasures?.length > 0 && (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#065f46', marginBottom: '0.4rem' }}>
                          🩹 {language === 'hi' ? 'प्राथमिक उपचार एवं घरेलू कदम' : 'Immediate First Aid & Home Steps:'}
                        </div>
                        {intakeResult.evidenceSynthesis.firstAidMeasures.map((fa, i) => (
                          <div key={i} style={{ fontSize: '0.825rem', color: '#064e3b', marginBottom: '0.35rem' }}>
                            <strong>{fa.action}:</strong> {fa.instructions}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Consultation Notice Notification */}
                    {consultationNotice && (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        {consultationNotice}
                      </div>
                    )}

                    {/* 1. NEAREST EMERGENCY HOSPITAL (DATABASE SEARCH) */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                        <Building2 size={20} color={intakeResult.isEmergency ? '#dc2626' : '#059669'} />
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: intakeResult.isEmergency ? '#991b1b' : '#064e3b' }}>
                          {language === 'hi' ? 'निकटतम आपातकालीन अस्पताल (24/7 Trauma & Beds)' : 'Nearest Emergency Hospital (24/7 Trauma & Beds)'}
                        </h4>
                      </div>

                      {intakeResult.nearestHospital?.isAvailableNearby ? (
                        <div
                          style={{
                            background: intakeResult.isEmergency ? '#fef2f2' : '#ffffff',
                            border: intakeResult.isEmergency ? '2px solid #ef4444' : '1.5px solid #86efac',
                            borderRadius: '10px',
                            padding: '1rem',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                  {intakeResult.nearestHospital.hospitalName}
                                </h5>
                                <span style={{ fontSize: '0.7rem', background: '#dc2626', color: '#ffffff', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                                  🚨 24/7 EMERGENCY
                                </span>
                                {intakeResult.nearestHospital.ambulanceAvailable && (
                                  <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                                    🚑 AMBULANCE READY
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                📍 {intakeResult.nearestHospital.address} &bull; <strong>{intakeResult.nearestHospital.distanceKm} km away</strong> &bull; {intakeResult.nearestHospital.traumaCareLevel}
                              </div>
                            </div>

                            {/* Live Available Beds Counters */}
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.25rem 0.5rem', textAlign: 'center', minWidth: '60px' }}>
                                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>ICU</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#dc2626' }}>
                                  {intakeResult.nearestHospital.availableBeds?.icu ?? 0}
                                </div>
                              </div>
                              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.25rem 0.5rem', textAlign: 'center', minWidth: '60px' }}>
                                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>EMERGENCY</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ea580c' }}>
                                  {intakeResult.nearestHospital.availableBeds?.emergency ?? 0}
                                </div>
                              </div>
                              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.25rem 0.5rem', textAlign: 'center', minWidth: '60px' }}>
                                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>OXYGEN</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#059669' }}>
                                  {intakeResult.nearestHospital.availableBeds?.oxygen ?? 0}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Emergency Direct Call Button */}
                          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.65rem', marginTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.78rem', color: '#334155' }}>
                              {language === 'hi' ? 'आपातकालीन सहायता एवं बेड रिज़र्वेशन के लिए कॉल करें:' : 'Direct Emergency Trauma & Bed Hotline:'}
                            </span>
                            <a
                              href={`tel:${intakeResult.nearestHospital.emergencyContactNumber}`}
                              className="btn btn-primary"
                              style={{
                                background: '#dc2626',
                                borderColor: '#dc2626',
                                padding: '0.45rem 1rem',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: '#ffffff',
                                textDecoration: 'none',
                                borderRadius: '6px',
                              }}
                            >
                              <PhoneCall size={14} />
                              <span>{language === 'hi' ? 'आपातकालीन कॉल: ' : 'Call Emergency: '} {intakeResult.nearestHospital.emergencyContactNumber}</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        /* HOSPITAL NOT AVAILABLE NEARBY */
                        <div
                          style={{
                            background: '#fef2f2',
                            border: '1.5px solid #fecaca',
                            borderRadius: '10px',
                            padding: '1rem',
                            color: '#991b1b',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <AlertCircle size={20} color="#dc2626" />
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                                  {language === 'hi' ? 'आपके पास कोई आपातकालीन अस्पताल उपलब्ध नहीं है' : 'No emergency hospital available at your nearby location'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                                  {language === 'hi' ? 'कृपया तत्काल राष्ट्रीय आपातकालीन सेवा 112 पर कॉल करें।' : 'Please dial National Emergency Dispatch 112 immediately.'}
                                </div>
                              </div>
                            </div>
                            <a
                              href="tel:112"
                              style={{
                                background: '#dc2626',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                padding: '0.45rem 0.95rem',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <PhoneCall size={14} />
                              <span>{language === 'hi' ? '112 एम्बुलेंस कॉल करें' : 'Call 112 Ambulance'}</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. NEAREST DOCTOR (DATABASE SEARCH) */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                        <Stethoscope size={20} color="#059669" />
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#064e3b' }}>
                          {language === 'hi' ? 'निकटतम विशेषज्ञ डॉक्टर (Specialist Doctor)' : 'Nearest Specialist Doctor'}
                        </h4>
                      </div>

                      {intakeResult.nearestDoctor?.isAvailableNearby ? (
                        <div
                          style={{
                            background: '#ffffff',
                            border: '1.5px solid #86efac',
                            borderRadius: '10px',
                            padding: '1rem',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                  {intakeResult.nearestDoctor.fullName}
                                </h5>
                                <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                                  VERIFIED DOCTOR
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
                                {intakeResult.nearestDoctor.specialties?.join(', ') || 'General Physician'} &bull; {intakeResult.nearestDoctor.experienceYears} {language === 'hi' ? 'वर्ष अनुभव' : 'years exp.'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                                📍 {intakeResult.nearestDoctor.clinicAddress} &bull; <strong>{intakeResult.nearestDoctor.distanceKm} km away</strong>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Consultation Fee</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#059669' }}>
                                ₹{intakeResult.nearestDoctor.consultationFee || 500}
                              </div>
                            </div>
                          </div>

                          {/* Doctor Actions: Call Directly & Online Consultation */}
                          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.65rem', marginTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                              {language === 'hi' ? 'परामर्श या अपॉइंटमेंट के लिए डॉक्टर से संपर्क करें:' : 'Contact doctor for appointment or consultation:'}
                            </span>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <a
                                href={`tel:${intakeResult.nearestDoctor.verifiedPhone}`}
                                className="btn btn-primary"
                                style={{
                                  background: '#059669',
                                  borderColor: '#059669',
                                  padding: '0.45rem 0.95rem',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  color: '#ffffff',
                                  textDecoration: 'none',
                                  borderRadius: '6px',
                                }}
                              >
                                <PhoneCall size={14} />
                                <span>{language === 'hi' ? 'कॉल करें' : 'Call Doctor'}</span>
                              </a>
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => handleRequestConsultation(intakeResult.nearestDoctor.doctorId)}
                                disabled={requestingDocId === intakeResult.nearestDoctor.doctorId}
                                style={{
                                  padding: '0.45rem 0.95rem',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  borderRadius: '6px',
                                }}
                              >
                                <Send size={14} />
                                <span>{requestingDocId === intakeResult.nearestDoctor.doctorId ? (language === 'hi' ? 'अनुरोध भेजा जा रहा है...' : 'Requesting...') : (language === 'hi' ? 'ऑनलाइन परामर्श बुक करें' : 'Request Consult')}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* DOCTOR NOT AVAILABLE NEARBY */
                        <div
                          style={{
                            background: '#fffbeb',
                            border: '1.5px solid #fde68a',
                            borderRadius: '10px',
                            padding: '1rem',
                            color: '#92400e',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={20} color="#d97706" />
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                                {language === 'hi' ? 'आपके पास कोई डॉक्टर उपलब्ध नहीं है' : 'No doctor available at your nearby location'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                                {language === 'hi'
                                  ? `सुझाई गई विशेषता (${intakeResult.consensus_pipeline?.recommended_specialist || 'विशेषज्ञ'}) के अनुसार आपके नजदीकी क्षेत्र में कोई डॉक्टर पंजीकृत नहीं है।`
                                  : `No verified specialist (${intakeResult.consensus_pipeline?.recommended_specialist || 'Specialist'}) is currently available in your nearby radius.`}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* MEDICINES SECTION WITH AGE-ADAPTED DOSAGE & DATABASE INVENTORY DISCOVERY */}
                    {(() => {
                      const candidateMedicines = (
                        (intakeResult.suggestedMedicinesWithInventory && intakeResult.suggestedMedicinesWithInventory.length > 0)
                          ? intakeResult.suggestedMedicinesWithInventory
                          : ((intakeResult.consensus_pipeline?.common_and_best_medicines && intakeResult.consensus_pipeline.common_and_best_medicines.length > 0)
                            ? intakeResult.consensus_pipeline.common_and_best_medicines
                            : (intakeResult.evidenceSynthesis?.suggestedMedicines || []))
                      );

                      if (!candidateMedicines || candidateMedicines.length === 0) return null;

                      return (
                        <div style={{ marginBottom: '1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                            <Pill size={20} color="#059669" />
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#064e3b' }}>
                              {language === 'hi' ? 'सुझाई गई औषधियां एवं पास के मेडिकल स्टोर का स्टॉक' : 'Suggested Medicines & Nearest Pharmacy Stock'}
                            </h4>
                          </div>

                          {/* MEDICINE CARD STICKY / PROMINENT BANNER */}
                          {medicineCard.length > 0 && (
                            <div
                              style={{
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                color: '#ffffff',
                                borderRadius: '10px',
                                padding: '0.85rem 1.15rem',
                                marginBottom: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 4px 10px rgba(5, 150, 105, 0.2)',
                                flexWrap: 'wrap',
                                gap: '0.75rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{ background: '#ffffff', color: '#059669', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                  <ShoppingBag size={18} />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                                    {language === 'hi'
                                      ? `दवा कार्ड: ${medicineCard.reduce((s, it) => s + it.quantity, 0)} दवाइयां जोड़ी गईं`
                                      : `Medicine Card: ${medicineCard.reduce((s, it) => s + it.quantity, 0)} items in card`}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                                    {medicineCard.map((it) => `${it.name} (${it.quantity})`).join(', ')}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleOpenCardModal}
                                style={{
                                  background: '#ffffff',
                                  color: '#047857',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '0.5rem 1rem',
                                  fontWeight: 800,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                }}
                              >
                                <CheckCircle2 size={15} color="#059669" />
                                <span>{language === 'hi' ? 'लाइव उपलब्धता जांचें एवं ऑर्डर करें' : 'Check Store Availability & Confirm'}</span>
                              </button>
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {candidateMedicines.map((med, mIdx) => {
                              const isAvailable = med.isAvailableNearby && med.matchedPharmacy;
                              const pharm = med.matchedPharmacy;
                              const inCardItem = medicineCard.find((it) => (it.name || '').toLowerCase() === (med.name || '').toLowerCase());
                              const inCardQty = inCardItem ? inCardItem.quantity : 0;

                              return (
                                <div
                                  key={mIdx}
                                  style={{
                                    background: '#ffffff',
                                    border: isAvailable ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '1rem',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                                  }}
                                >
                                  {/* Medicine Title & Age Tag */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'gap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                    <div>
                                      <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                                        {med.name}
                                      </h5>
                                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        Generic: <strong>{med.genericName || med.generic_name || med.name}</strong>
                                      </span>
                                    </div>
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        background: '#ecfdf5',
                                        color: '#065f46',
                                        border: '1px solid #a7f3d0',
                                        fontWeight: 700,
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '6px',
                                      }}
                                    >
                                      👤 {med.ageGroup || `Patient Age: ${intakeResult.patientAge || age}y`}
                                    </span>
                                  </div>

                                  {/* Age-Adapted Dose & Schedule */}
                                  <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '0.6rem', margin: '0.4rem 0 0.65rem 0', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
                                    <div style={{ color: '#065f46', fontWeight: 700, marginBottom: '0.2rem' }}>
                                      💊 <strong>{language === 'hi' ? 'सटीक खुराक (Dose):' : 'Calculated Dose Amount:'}</strong> {med.doseAmount || 'Standard Adult Dose'}
                                    </div>
                                    <div style={{ color: '#334155' }}>
                                      ⏰ <strong>{language === 'hi' ? 'लेने का समय:' : 'Schedule:'}</strong> {med.frequency || med.dosageGuide}
                                    </div>
                                    {med.instructions && (
                                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                        ℹ️ {med.instructions}
                                      </div>
                                    )}
                                  </div>

                                  {/* BELOW THE MEDICINE: Live Database Medical Store Search */}
                                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.65rem' }}>
                                    {isAvailable ? (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                                            <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                                              🟢 IN STOCK ({pharm.availableQuantity} units)
                                            </span>
                                            {pharm.homeDeliveryAvailable && (
                                              <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                                                ⚡ 30-Min Delivery
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                                            Store: {pharm.storeName}
                                          </div>
                                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            📍 {pharm.address?.street || 'Local Area'} &bull; {pharm.distanceKm ? `${pharm.distanceKm} km away` : 'Near you'} &bull; <strong style={{ color: '#059669' }}>₹{pharm.unitPrice}</strong>
                                          </div>
                                        </div>

                                        {/* Direct Order or Call Store Button */}
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                          {/* Quantity Stepper or Add to Card */}
                                          {inCardQty > 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '0.15rem 0.35rem' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateCardQuantity(med.name, -1)}
                                                style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', background: '#ffffff', color: '#065f46', cursor: 'pointer', fontWeight: 'bold' }}
                                                title="Decrease"
                                              >
                                                <Minus size={12} />
                                              </button>
                                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#065f46', padding: '0 0.3rem' }}>
                                                {inCardQty}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateCardQuantity(med.name, 1)}
                                                style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', background: '#ffffff', color: '#065f46', cursor: 'pointer', fontWeight: 'bold' }}
                                                title="Increase"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              className="btn btn-outline"
                                              onClick={() => handleAddToCard(med)}
                                              style={{
                                                padding: '0.45rem 0.75rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.3rem',
                                                borderColor: '#059669',
                                                color: '#059669',
                                              }}
                                            >
                                              <Plus size={13} />
                                              <span>{language === 'hi' ? '+ कार्ड में जोड़ें' : '+ Add to Card'}</span>
                                            </button>
                                          )}

                                          {/* Direct Order Button */}
                                          {pharm.homeDeliveryAvailable ? (
                                            <button
                                              type="button"
                                              className="btn btn-primary"
                                              onClick={() => {
                                                if (inCardQty === 0) handleAddToCard(med);
                                                handleOpenCardModal();
                                              }}
                                              style={{
                                                padding: '0.45rem 0.85rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                background: '#059669',
                                                borderColor: '#059669',
                                              }}
                                            >
                                              <Truck size={14} />
                                              <span>{language === 'hi' ? 'घर पर ऑर्डर करें' : 'Order for Home Delivery'}</span>
                                            </button>
                                          ) : (
                                            <a
                                              href={`tel:${pharm.verifiedContactNumber}`}
                                              className="btn btn-outline"
                                              style={{
                                                padding: '0.45rem 0.85rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                textDecoration: 'none',
                                                color: '#334155',
                                              }}
                                            >
                                              <PhoneCall size={14} />
                                              <span>{pharm.verifiedContactNumber || (language === 'hi' ? 'कॉल करें' : 'Call Store')}</span>
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      /* SCENARIO 3: NO NEARBY STORE FOUND WITH LIVE STOCK */
                                      <div
                                        style={{
                                          background: '#fef3c7',
                                          border: '1px solid #fde68a',
                                          borderRadius: '6px',
                                          padding: '0.6rem',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          flexWrap: 'wrap',
                                          gap: '0.45rem',
                                          color: '#92400e',
                                          fontSize: '0.8rem',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                          <AlertCircle size={16} color="#d97706" />
                                          <div>
                                            <strong>{language === 'hi' ? 'स्टॉक स्थिति:' : 'Stock Status:'} </strong>
                                            <span>{med.name} — </span>
                                            <strong style={{ color: '#b45309' }}>
                                              {language === 'hi'
                                                ? 'यह दवा आपके पास के किसी मेडिकल स्टोर में उपलब्ध नहीं है।'
                                                : 'Not available at your nearby medical stores.'}
                                            </strong>
                                          </div>
                                        </div>

                                        {/* Allow adding to card to verify */}
                                        <div>
                                          {inCardQty > 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#ffffff', border: '1px solid #fde68a', borderRadius: '4px', padding: '0.1rem 0.3rem' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateCardQuantity(med.name, -1)}
                                                style={{ width: '20px', height: '20px', border: 'none', background: 'transparent', color: '#92400e', cursor: 'pointer', fontWeight: 'bold' }}
                                              >
                                                -
                                              </button>
                                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', padding: '0 0.25rem' }}>
                                                {inCardQty} in card
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateCardQuantity(med.name, 1)}
                                                style={{ width: '20px', height: '20px', border: 'none', background: 'transparent', color: '#92400e', cursor: 'pointer', fontWeight: 'bold' }}
                                              >
                                                +
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => handleAddToCard(med)}
                                              style={{
                                                background: '#ffffff',
                                                border: '1px solid #d97706',
                                                borderRadius: '4px',
                                                padding: '0.2rem 0.5rem',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                color: '#b45309',
                                                cursor: 'pointer',
                                              }}
                                            >
                                              + {language === 'hi' ? 'कार्ड में जोड़ें' : 'Add to Card'}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ background: '#ffffff', borderRadius: '10px', padding: '2.5rem', textAlign: 'center', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    <Activity size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.35rem 0', color: '#334155' }}>
                      {language === 'hi' ? 'नैदानिक रिपोर्ट की प्रतीक्षा है' : 'Awaiting Symptom Intake'}
                    </h4>
                    <p style={{ fontSize: '0.825rem', maxWidth: '380px', margin: '0 auto' }}>
                      {language === 'hi'
                        ? 'बाईं ओर अपने लक्षण दर्ज करें। एआई तुरंत डब्ल्यूएचओ ट्राइएज स्तर, संभावित रोग, प्राथमिक चिकित्सा एवं पास के सत्यापित मेडिकल स्टोर खोजेगा।'
                        : 'Submit your symptoms on the left to receive immediate WHO triage level, clinical differential, first aid advice, and verified physical resources.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SKIN INFECTION & MEDICAL BILL / PRESCRIPTION SCANNER */}
        {activeTab === 'scanner' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
                {t('scannerTitle')}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                {t('scannerSubtitle')}
              </p>
            </div>

            {/* Sub-mode selector tabs */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <button
                className={`btn ${scannerMode === 'skin' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setScannerMode('skin'); setScannerFile(null); setScannerPreview(null); }}
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Camera size={16} />
                <span>{t('scanSkinTab')}</span>
              </button>
              <button
                className={`btn ${scannerMode === 'prescription' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setScannerMode('prescription'); setScannerFile(null); setScannerPreview(null); }}
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FileText size={16} />
                <span>{t('scanPrescriptionTab')}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.4fr)', gap: '1.5rem' }}>
              {/* Upload Card */}
              <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem 0' }}>
                  {scannerMode === 'skin' ? t('uploadSkinPhoto') : t('uploadPrescription')}
                </h4>

                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  marginBottom: '1rem',
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="scannerFileInput"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <label htmlFor="scannerFileInput" style={{ cursor: 'pointer', display: 'block' }}>
                    {scannerPreview ? (
                      <img
                        src={scannerPreview}
                        alt="Preview"
                        style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div>
                        <Camera size={40} color="#64748b" style={{ margin: '0 auto 0.5rem auto' }} />
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                          {language === 'hi' ? 'फोटो चुनने के लिए यहां क्लिक करें' : 'Click to Upload Image or Take Photo'}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Supports JPG, PNG, WebP</span>
                      </div>
                    )}
                  </label>
                </div>

                {scannerError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.65rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {scannerError}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
                  disabled={!scannerFile || scannerLoading}
                  onClick={handleProcessScan}
                >
                  {scannerLoading ? t('analyzingImage') : (language === 'hi' ? 'एआई द्वारा जांचें' : 'Analyze with AI Vision Model')}
                </button>
              </div>

              {/* Analysis Output */}
              <div>
                {scannerLoading ? (
                  <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Camera size={18} color="#7c3aed" />
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                        {language === 'hi' ? 'छवि का एआई न्यूरल विश्लेषण जारी है...' : 'AI Vision Model Neural Analysis in Progress...'}
                      </strong>
                    </div>
                    <Skeleton height="120px" style={{ marginBottom: '1rem' }} />
                    <Skeleton width="70%" height="1.1rem" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton width="90%" height="0.85rem" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton width="60%" height="0.85rem" style={{ marginBottom: '1.25rem' }} />
                    <Skeleton height="45px" borderRadius="8px" />
                  </div>
                ) : (
                  <>
                    {/* 1. SKIN INFECTION RESULT */}
                    {scannerMode === 'skin' && skinAnalysis && (
                  <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                        {t('skinAnalysisResult')}
                      </h4>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                          🧠 ANN ({Math.round((skinAnalysis.confidence_score || 0.92) * 100)}%)
                        </span>
                        <span className="badge badge-warning" style={{ fontSize: '0.78rem' }}>
                          {skinAnalysis.severity}
                        </span>
                      </div>
                    </div>

                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e' }}>
                        {skinAnalysis.condition}
                      </div>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem', color: '#78350f' }}>
                        {skinAnalysis.visual_findings}
                      </p>
                      {skinAnalysis.model_architecture && (
                        <div style={{ fontSize: '0.725rem', color: '#4338ca', marginTop: '0.35rem', fontWeight: 600 }}>
                          ⚡ Model: {skinAnalysis.model_architecture} (Dense 128 &rarr; 64 &rarr; 32 &rarr; 8)
                        </div>
                      )}
                      {skinAnalysis.image_metrics?.erythema_index !== undefined && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem', fontSize: '0.725rem' }}>
                          <span style={{ background: '#fef08a', color: '#854d0e', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                            🔬 Erythema Index: {skinAnalysis.image_metrics.erythema_index}
                          </span>
                          <span style={{ background: '#fef08a', color: '#854d0e', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                            📐 Edge Density: {skinAnalysis.image_metrics.edge_density}
                          </span>
                          <span style={{ background: '#fef08a', color: '#854d0e', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                            🔆 Luminance: {skinAnalysis.image_metrics.luminance}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Recommended Medicines */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#166534', marginBottom: '0.5rem' }}>
                        💊 {language === 'hi' ? 'सुझाई गई त्वचा औषधियां (Topical Care):' : 'Recommended Topical Care:'}
                      </div>
                      {skinAnalysis.recommended_medicines?.map((med, idx) => (
                        <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.65rem', marginBottom: '0.4rem', fontSize: '0.825rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a' }}>
                            <span>{med.name} ({med.dosage_form})</span>
                            <span style={{ color: '#059669' }}>₹{med.price}</span>
                          </div>
                          <div style={{ color: '#475569', margin: '0.2rem 0' }}>{med.purpose}</div>
                          <div style={{ color: '#2563eb', fontSize: '0.78rem' }}>Instruction: {med.instruction}</div>
                        </div>
                      ))}
                    </div>

                    {/* 1-Click Order for Home Delivery */}
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.75rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
                      onClick={() => {
                        const defaultPharm = {
                          _id: '6ad3a9484b9015ba6a0b9a01',
                          storeName: 'Apollo Pharmacy & Wellness',
                          verifiedContactNumber: '+919876543210',
                        };
                        handleInitiateOrder(defaultPharm, skinAnalysis.recommended_medicines);
                      }}
                    >
                      <Truck size={18} />
                      <span>{t('orderFromPharmacyBtn')}</span>
                    </button>

                    {/* Warning signs & specialist */}
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: '#475569' }}>
                      <strong>{language === 'hi' ? 'विशेषज्ञ परामर्श' : 'Recommended Specialist'}: </strong> {skinAnalysis.recommended_specialist}
                      <div style={{ marginTop: '0.35rem', fontStyle: 'italic', color: '#94a3b8' }}>{skinAnalysis.disclaimer}</div>
                    </div>
                  </div>
                )}

                {/* 2. PRESCRIPTION / BILL OCR RESULT */}
                {scannerMode === 'prescription' && prescriptionAnalysis && (
                  <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                        {t('prescriptionResult')}
                      </h4>
                      <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                        OCR Confirmed ({Math.round((prescriptionAnalysis.confidence_score || 0.92) * 100)}%)
                      </span>
                    </div>

                    {/* Extracted Text */}
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem', fontStyle: 'italic', color: '#334155' }}>
                      "{prescriptionAnalysis.extracted_text}"
                    </div>

                    {prescriptionAnalysis.image_metrics?.detected_line_count > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>⚡ Native OCR scanned {prescriptionAnalysis.image_metrics.detected_line_count} document lines and extracted medicine candidates</span>
                      </div>
                    )}

                    {/* Detected Items List */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#166534', marginBottom: '0.5rem' }}>
                        {language === 'hi' ? 'पर्चे से पहचानी गई दवाइयां:' : 'Medicines Ready to Order:'}
                      </div>
                      {prescriptionAnalysis.items_for_order?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.65rem', marginBottom: '0.4rem', fontSize: '0.825rem' }}>
                          <div>
                            <span style={{ fontWeight: 700, color: '#14532d' }}>{item.name}</span>
                            {item.category && <span style={{ fontSize: '0.72rem', color: '#15803d', marginLeft: '0.4rem' }}>({item.category})</span>}
                          </div>
                          <span style={{ fontWeight: 600, color: '#059669' }}>₹{item.estimated_price}</span>
                        </div>
                      ))}
                    </div>

                    {/* 1-Click Order for Home Delivery */}
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.75rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
                      onClick={() => {
                        const defaultPharm = {
                          _id: '6ad3a9484b9015ba6a0b9a01',
                          storeName: 'Apollo Pharmacy & Wellness',
                          verifiedContactNumber: '+919876543210',
                        };
                        handleInitiateOrder(defaultPharm, prescriptionAnalysis.items_for_order);
                      }}
                    >
                      <Truck size={18} />
                      <span>{t('orderFromPharmacyBtn')}</span>
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!skinAnalysis && !prescriptionAnalysis && (
                  <div style={{ background: '#ffffff', borderRadius: '10px', padding: '2.5rem', textAlign: 'center', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    <Camera size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.35rem 0', color: '#334155' }}>
                      {language === 'hi' ? 'फोटो अपलोड करें' : 'Upload an Image to Begin'}
                    </h4>
                    <p style={{ fontSize: '0.825rem', maxWidth: '380px', margin: '0 auto' }}>
                      {scannerMode === 'skin'
                        ? (language === 'hi' ? 'त्वचा पर संक्रमण, दाने या लालिमा की फोटो अपलोड करें।' : 'Upload a photo of your skin rash or infection for instant dermatological decision-support.')
                        : (language === 'hi' ? 'दवा पर्ची या बिल अपलोड कर दवाइयां सीधे घर पर मंगवाएं।' : 'Upload a doctor prescription or medical invoice to extract medicine names and dispatch directly to your doorstep.')}
                    </p>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MEDICINE SEARCH & DIRECT HOME DELIVERY */}
        {activeTab === 'medicines' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
                {t('navMedicines')}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                {language === 'hi' ? 'सत्यापित मेडिकल स्टोरों में दवाओं का लाइव स्टॉक खोजें और तुरंत घर पर मंगवाएं।' : 'Check live verified pharmacy stock and order for direct doorstep delivery.'}
              </p>
            </div>

            <form onSubmit={handleSearchMedicine} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                placeholder={language === 'hi' ? 'दवा का नाम लिखें (उदा. Paracetamol, Dolo, Aspirin, Amoxicillin)...' : 'Search medicine name (e.g. Paracetamol, Dolo, Aspirin, Amoxicillin)...'}
                value={medicineQuery}
                onChange={(e) => setMedicineQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}>
                {medLoading ? 'Searching...' : (language === 'hi' ? 'स्टॉक खोजें' : 'Search Stock')}
              </button>
            </form>

            {medLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {medicineMatches.map((m, idx) => (
                  <div key={idx} className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>{m.medicineName}</h4>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{m.genericName} &bull; {m.dosageForm}</span>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                        {m.availableQuantity} in stock
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#334155', margin: '0.5rem 0' }}>
                      <strong>Store:</strong> {m.pharmacy?.storeName || 'Verified Pharmacy'}
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        📍 {m.pharmacy?.address?.street || 'Local Area'} ({m.distanceKm ? `${m.distanceKm} km` : 'Near you'})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: '0.35rem 0' }}>
                      <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                        🟢 Live Inventory Verified
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>
                        ₹{m.unitPrice}
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {m.pharmacy?.verifiedContactNumber && (
                          <a
                            href={`tel:${m.pharmacy.verifiedContactNumber}`}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                            title="Call chemist to confirm live stock"
                          >
                            <PhoneCall size={14} />
                            <span>{language === 'hi' ? 'कॉल' : 'Call'}</span>
                          </a>
                        )}
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => handleInitiateOrder(m.pharmacy, [{ name: m.medicineName, genericName: m.genericName, quantity: 1, unitPrice: m.unitPrice, inventoryId: m._id }])}
                        >
                          <Truck size={14} />
                          <span>{language === 'hi' ? 'घर पर मंगवाएं' : 'Home Delivery'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MY ORDERS & LIVE DELIVERY TRACKING */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
                  {t('navMyOrders')}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                  {t('liveOrderTracking')}
                </p>
              </div>
              <button className="btn btn-outline" onClick={loadOrders} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
            </div>

            {ordersLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <SkeletonOrderItem />
                <SkeletonOrderItem />
              </div>
            ) : myOrders.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '10px', padding: '3rem', textAlign: 'center', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                <ShoppingBag size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.35rem 0', color: '#334155' }}>
                  {t('noOrdersYet')}
                </h4>
                <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
                  {language === 'hi' ? 'आप लक्षण जांच या पर्ची स्कैनर से सीधे घर पर दवा मंगवा सकते हैं।' : 'Order medicines from the Symptom Assessment or Prescription Scanner tabs to track live dispatch here.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {myOrders.map((ord) => {
                  const stages = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered'];
                  const currentIdx = stages.indexOf(ord.status);

                  return (
                    <div key={ord._id} className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Order: {ord.orderId}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Pharmacy: <strong>{ord.pharmacyId?.storeName || 'Partner Pharmacy'}</strong> &bull; {new Date(ord.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            background: ord.status === 'delivered' ? '#dcfce7' : ord.status === 'out_for_delivery' ? '#fef3c7' : '#e0f2fe',
                            color: ord.status === 'delivered' ? '#166534' : ord.status === 'out_for_delivery' ? '#92400e' : '#0369a1',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                          }}>
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Live Stepper Visualization */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', margin: '1.25rem 0', textAlign: 'center' }}>
                        {stages.map((st, sIdx) => {
                          const isDone = sIdx <= currentIdx;
                          const isCurrent = sIdx === currentIdx;

                          return (
                            <div key={st} style={{ position: 'relative' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: isDone ? '#2563eb' : '#e2e8f0',
                                color: isDone ? '#ffffff' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 0.35rem auto',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                boxShadow: isCurrent ? '0 0 0 3px rgba(37,99,235,0.2)' : 'none',
                              }}>
                                {isDone ? '✓' : sIdx + 1}
                              </div>
                              <span style={{ fontSize: '0.725rem', fontWeight: isDone ? 700 : 500, color: isDone ? '#0f172a' : '#94a3b8', textTransform: 'capitalize' }}>
                                {st.replace(/_/g, ' ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Items & Address */}
                      <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.85rem', fontSize: '0.825rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <strong>{language === 'hi' ? 'दवाइयां' : 'Ordered Medicines'}:</strong>
                          <ul style={{ margin: '0.35rem 0 0 1rem', padding: 0 }}>
                            {ord.items?.map((it, idx) => (
                              <li key={idx}>
                                {it.medicineName} x {it.quantity} (₹{it.unitPrice})
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <strong>{language === 'hi' ? 'डिलीवरी पता' : 'Destination Address'}:</strong>
                          <p style={{ margin: '0.35rem 0 0 0', color: '#475569' }}>
                            {ord.deliveryAddress?.street}, {ord.deliveryAddress?.city}
                            <br />
                            Phone: {ord.deliveryAddress?.contactPhone}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Amount:</span>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                            ₹{ord.totalAmount}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Cash on Delivery</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: DOCTORS CONNECT */}
        {activeTab === 'doctors' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
                {t('navDoctorConnect')}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                {language === 'hi' ? 'सत्यापित विशेषज्ञ डॉक्टरों से तुरंत ऑनलाइन या क्लिनिक परामर्श लें।' : 'Consult verified specialist clinicians with 1-click booking.'}
              </p>
            </div>

            {consultationNotice && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {consultationNotice}
              </div>
            )}

            {doctorsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {doctors.map((doc) => (
                  <div key={doc._id} className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>{doc.fullName}</h4>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{doc.qualifications?.join(', ')}</span>
                      </div>
                      <span className={`badge ${doc.isAvailable ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                        {doc.isAvailable ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div style={{ margin: '0.5rem 0', fontSize: '0.825rem' }}>
                      <div style={{ color: '#2563eb', fontWeight: 600 }}>{doc.specialties?.join(', ')}</div>
                      <div style={{ color: '#64748b', fontSize: '0.78rem' }}>📍 {doc.clinicAddress || 'Medical Clinic'}</div>
                      <div style={{ color: '#64748b', fontSize: '0.78rem' }}>🕒 Hours: {doc.workingHours?.start || '09:00'} - {doc.workingHours?.end || '18:00'}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                        ₹{doc.consultationFee || 500}
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                        disabled={requestingDocId === doc._id}
                        onClick={() => handleRequestConsultation(doc._id)}
                      >
                        {requestingDocId === doc._id ? 'Connecting...' : (language === 'hi' ? 'परामर्श लें' : '1-Click Connect')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: NEARBY HOSPITALS */}
        {activeTab === 'hospitals' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
                {t('navHospitals')}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                {language === 'hi' ? '24/7 आपातकालीन ट्रामा विभाग और आईसीयू सुविधाओं से युक्त निकटतम अस्पताल।' : '24/7 emergency trauma centers and critical hospital admission routing.'}
              </p>
            </div>

            {hospitalsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {hospitals.map((hosp) => (
                  <div key={hosp._id} className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>{hosp.hospitalName}</h4>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{hosp.address?.street}, {hosp.address?.city}</span>
                      </div>
                      <span className="badge badge-emergency" style={{ fontSize: '0.72rem' }}>
                        {hosp.traumaCareLevel || '24/7 ER'}
                      </span>
                    </div>

                    <div style={{ margin: '0.5rem 0', fontSize: '0.825rem', color: '#475569' }}>
                      <div>Emergency: {hosp.verifiedEmergencyNumbers?.join(', ') || '112'}</div>
                    </div>

                    <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <a
                        href={`tel:${hosp.verifiedEmergencyNumbers?.[0] || '112'}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          background: '#dc2626',
                          color: '#ffffff',
                          padding: '0.45rem',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontWeight: 700,
                          fontSize: '0.825rem',
                        }}
                      >
                        <PhoneCall size={14} />
                        <span>{language === 'hi' ? 'आपातकालीन कॉल' : 'Emergency Hotline'}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ORDER CONFIRMATION MODAL WITH QUANTITY SELECTOR */}
      {orderModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setOrderModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={20} color="#2563eb" />
                  <span>{language === 'hi' ? 'दवा होम डिलीवरी ऑर्डर पुष्टि' : 'Confirm Medicine Home Delivery'}</span>
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {language === 'hi' ? 'मात्रा (Quantity) सेट करें और डिलीवरी पता भरें' : 'Select quantities & enter delivery address'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontWeight: 'bold',
                }}
              >
                ✕
              </button>
            </div>

            {/* Pharmacy Dispatch Info Banner */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    {language === 'hi' ? 'डिस्पैच फार्मेसी' : 'Dispatch Pharmacy'}
                  </span>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.925rem' }}>
                    {selectedPharmacyForOrder?.pharmacyName || selectedPharmacyForOrder?.storeName || 'Verified Partner Pharmacy'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.55rem', borderRadius: '999px', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                    ⚡ 30-45 Mins Express
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.55rem', borderRadius: '999px', fontWeight: 700, border: '1px solid #bae6fd' }}>
                    💵 COD
                  </span>
                </div>
              </div>
            </div>

            {/* Medicines List with Interactive Quantity Selectors */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Pill size={16} color="#2563eb" />
                  <span>{language === 'hi' ? 'दवाइयां एवं मात्रा (Quantity):' : 'Medicines & Quantities:'}</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddManualItem}
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Plus size={13} />
                  <span>{language === 'hi' ? 'और दवा जोड़ें' : 'Add Another Medicine'}</span>
                </button>
              </div>

              {orderItemsToSubmit.length === 0 ? (
                <div style={{ background: '#fef2f2', border: '1px dashed #fca5a5', borderRadius: '8px', padding: '1rem', textAlign: 'center', color: '#b91c1c', fontSize: '0.85rem' }}>
                  <strong>{language === 'hi' ? 'कम से कम 1 दवा आवश्यक है।' : 'At least 1 medicine item is required.'}</strong>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.78rem' }}>
                    {language === 'hi' ? 'कृपया ऊपर दिए गए "और दवा जोड़ें" बटन पर क्लिक करें।' : 'Please click "+ Add Another Medicine" above to add an item.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {orderItemsToSubmit.map((item, idx) => {
                    const price = Math.max(0, parseFloat(item.unitPrice || item.price || item.estimated_price) || 50);
                    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
                    const lineSubtotal = price * qty;

                    return (
                      <div
                        key={idx}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                        }}
                      >
                        {/* Name & Unit Price */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItemName(idx, e.target.value)}
                            style={{
                              width: '100%',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              color: '#0f172a',
                              border: '1px solid transparent',
                              borderRadius: '4px',
                              padding: '0.15rem 0.3rem',
                              background: 'transparent',
                            }}
                            onFocus={(e) => { e.target.style.border = '1px solid #cbd5e1'; e.target.style.background = '#f8fafc'; }}
                            onBlur={(e) => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }}
                            placeholder="Medicine name"
                          />
                          <div style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '0.3rem' }}>
                            ₹{price} / unit &bull; <span style={{ color: '#059669', fontWeight: 600 }}>Total: ₹{lineSubtotal}</span>
                          </div>
                        </div>

                        {/* Quantity Selector: [-] [ Qty ] [+] */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(idx, -1)}
                            disabled={qty <= 1}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: qty <= 1 ? '#f1f5f9' : '#ffffff',
                              color: qty <= 1 ? '#94a3b8' : '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: qty <= 1 ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold',
                            }}
                            title="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>

                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={qty}
                            onChange={(e) => handleSetItemQuantity(idx, e.target.value)}
                            style={{
                              width: '42px',
                              height: '28px',
                              textAlign: 'center',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: '#0f172a',
                              padding: 0,
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(idx, 1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                            title="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>

                          {/* Delete Item */}
                          <button
                            type="button"
                            onClick={() => handleRemoveOrderItem(idx)}
                            style={{
                              width: '28px',
                              height: '28px',
                              marginLeft: '0.25rem',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#fee2e2',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                            title="Remove medicine"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bill Summary */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', color: '#475569' }}>
                <span>{language === 'hi' ? 'दवाइयों का उप-योग (Subtotal)' : 'Medicines Subtotal'}:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{orderTotalAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem', color: '#475569' }}>
                <span>{language === 'hi' ? 'एक्सप्रेस होम डिलीवरी' : 'Express Doorstep Delivery'}:</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>FREE (₹0)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.45rem', fontSize: '0.95rem' }}>
                <strong style={{ color: '#0f172a' }}>{language === 'hi' ? 'कुल देय राशि (Grand Total)' : 'Total Amount Payable'}:</strong>
                <strong style={{ color: '#059669', fontSize: '1.1rem' }}>₹{orderTotalAmount}</strong>
              </div>
            </div>

            {/* Delivery Address Form */}
            <form onSubmit={handleConfirmOrder}>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem', display: 'block', marginBottom: '0.25rem' }}>
                  {language === 'hi' ? 'डिलीवरी का पता (House/Street/Landmark)' : 'Delivery Street Address'} *
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  placeholder="e.g. Flat 302, Green Park Avenue, New Delhi"
                  value={orderStreet}
                  onChange={(e) => setOrderStreet(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem', display: 'block', marginBottom: '0.25rem' }}>
                    {language === 'hi' ? 'शहर' : 'City'} *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    value={orderCity}
                    onChange={(e) => setOrderCity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem', display: 'block', marginBottom: '0.25rem' }}>
                    {language === 'hi' ? 'संपर्क मोबाइल' : 'Contact Phone'} *
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    value={orderPhone}
                    onChange={(e) => setOrderPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: (orderSubmitting || orderItemsToSubmit.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (orderSubmitting || orderItemsToSubmit.length === 0) ? 0.6 : 1,
                }}
                disabled={orderSubmitting || orderItemsToSubmit.length === 0}
              >
                <Truck size={18} />
                <span>
                  {orderSubmitting
                    ? (language === 'hi' ? 'ऑर्डर दर्ज हो रहा है...' : 'Placing Order...')
                    : (language === 'hi'
                        ? `ऑर्डर कन्फर्म करें • ₹${orderTotalAmount} (Cash on Delivery)`
                        : `Confirm & Place Order • ₹${orderTotalAmount} (Cash on Delivery)`)}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
