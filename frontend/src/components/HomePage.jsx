import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from '../context/LocationContext';
import {
  Activity,
  Send,
  Pill,
  Clock,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Truck,
  Sparkles,
  MapPin,
  ShieldCheck,
  Building2,
  AlertCircle,
  Mic,
  MicOff,
  Search,
  Lock,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Stethoscope,
  ShoppingBag,
} from 'lucide-react';

export const HomePage = ({ onOpenAuth, onNavigateAbout, onNavigateContact }) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { coords, locationName } = useLocation();

  // Mandatory Form States
  const [description, setDescription] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [duration, setDuration] = useState('1-2 days');
  const [severity, setSeverity] = useState('moderate');
  const [relevantHistory, setRelevantHistory] = useState('None');

  // Intake UI states
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [intakeResult, setIntakeResult] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // Medicine Card / Cart State
  const [medicineCard, setMedicineCard] = useState([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [cartChecking, setCartChecking] = useState(false);
  const [cartAvailabilityData, setCartAvailabilityData] = useState(null);
  const [orderingStoreId, setOrderingStoreId] = useState(null);

  // Order delivery address states
  const [orderStreet, setOrderStreet] = useState(user?.address?.street || '');
  const [orderCity, setOrderCity] = useState(user?.address?.city || 'Delhi');
  const [orderPhone, setOrderPhone] = useState(user?.phone || '');

  // Voice Speech Recognition
  const handleToggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(language === 'hi' ? 'आपके ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।' : 'Voice recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    if (!isListening) {
      recognition.start();
      setIsListening(true);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      recognition.stop();
      setIsListening(false);
    }
  };

  // Submit Symptom Assessment Form (Available to Everyone; Gatekeeps Order & Phone)
  const handleSubmitIntake = async (e) => {
    e.preventDefault();
    setFormError('');

    // Strict validation: ALL fields are mandatory
    if (!description.trim() || description.trim().length < 5) {
      setFormError(language === 'hi' ? 'कृपया अपनी समस्या/लक्षण कम से कम 5 अक्षरों में विस्तार से लिखें।' : 'Please describe your symptoms in at least 5 characters.');
      return;
    }
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setFormError(language === 'hi' ? 'कृपया मरीज की वैध आयु (1 से 120 वर्ष) दर्ज करें।' : 'Please enter a valid patient age (1 to 120 years).');
      return;
    }
    if (!gender) {
      setFormError(language === 'hi' ? 'कृपया लिंग (Gender) चुनें।' : 'Please select a gender.');
      return;
    }
    if (!duration) {
      setFormError(language === 'hi' ? 'कृपया लक्षणों की अवधि (Duration) चुनें।' : 'Please select symptom duration.');
      return;
    }
    if (!severity) {
      setFormError(language === 'hi' ? 'कृपया गंभीरता स्तर (Severity) चुनें।' : 'Please select severity level.');
      return;
    }
    if (!relevantHistory.trim()) {
      setFormError(language === 'hi' ? 'कृपया मेडिकल हिस्ट्री दर्ज करें (या "None" लिखें)।' : 'Please enter medical history (or "None").');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/intake', {
        description: description.trim(),
        language,
        age_years: parsedAge,
        gender,
        duration,
        severity,
        relevant_history: relevantHistory.trim(),
        coordinates: [coords.lng, coords.lat],
      });

      setIntakeResult(res.data);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to analyze symptoms');
    } finally {
      setLoading(false);
    }
  };

  // Medicine Card / Cart Handlers
  const handleAddToCard = (med) => {
    const medName = med.name || med.medicineName;
    const genericName = med.genericName || med.generic_name || medName;
    const unitPrice = med.matchedPharmacy?.unitPrice || med.price || 50;

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
          if (item.name.toLowerCase() === medName.toLowerCase()) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);

      // If modal is open, trigger recheck
      if (cartModalOpen) {
        handleRecheckCart(updated);
      }
      return updated;
    });
  };

  const handleRemoveFromCard = (medName) => {
    setMedicineCard((prev) => {
      const updated = prev.filter((item) => item.name.toLowerCase() !== medName.toLowerCase());
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

  // Confirm order for a specific store group (Grouped by Store)
  const handleConfirmStoreOrder = async (storeGroup) => {
    if (!user) {
      onOpenAuth('login', language === 'hi' ? 'दवा का ऑर्डर दर्ज करने के लिए कृपया लॉगिन या रजिस्टर करें।' : 'Please sign in or register to place your medicine delivery order.');
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
      } else {
        handleRecheckCart(remaining);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place order for this store');
    } finally {
      setOrderingStoreId(null);
    }
  };

  // Action Gatekeeper: Viewing / Calling Pharmacy Phone Number Requires Login
  const handleCallPharmacy = (phoneNumber) => {
    if (!user) {
      onOpenAuth('login', language === 'hi' ? 'मेडिकल स्टोर का संपर्क नंबर देखने एवं कॉल करने के लिए कृपया लॉगिन या रजिस्टर करें।' : 'Please sign in or register to access verified medical contact details.');
      return;
    }
    window.location.href = `tel:${phoneNumber}`;
  };

  // Action Gatekeeper: Calling Doctor Requires Login
  const handleCallDoctor = (phoneNumber) => {
    if (!user) {
      onOpenAuth('login', language === 'hi' ? 'डॉक्टर से परामर्श या संपर्क करने के लिए कृपया लॉगिन या रजिस्टर करें।' : 'Please sign in or register to contact and consult verified doctors.');
      return;
    }
    window.location.href = `tel:${phoneNumber}`;
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      {/* 1. HERO BANNER - GREEN & WHITE THEME */}
      <section
        style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 40%, #059669 100%)',
          color: '#ffffff',
          padding: '3.5rem 1rem 4rem 1rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="container" style={{ maxWidth: '1140px', margin: '0 auto', textAlign: 'center' }}>
          {/* Trust Badge Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(8px)',
              padding: '0.35rem 0.95rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#d1fae5',
              marginBottom: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            <ShieldCheck size={16} color="#6ee7b7" />
            <span>{language === 'hi' ? 'डब्ल्यूएचओ ट्राइएज एवं साक्ष्य-सत्यापित स्वास्थ्य मंच' : 'WHO-Compliant Triage & Evidence-Based Care'}</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              margin: '0 0 1.25rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            {language === 'hi'
              ? 'आपातकालीन लक्षण जांच, सही दवा खुराक एवं लाइव मेडिकल स्टॉक'
              : 'Instant Symptom Triage, Age-Adapted Dosing & Live Pharmacy Stock'}
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              maxWidth: '820px',
              margin: '0 auto 2rem auto',
              color: '#d1fae5',
              lineHeight: 1.6,
            }}
          >
            {language === 'hi'
              ? 'अपनी समस्या और आयु दर्ज करें। एआई तुरंत सही खुराक निर्धारित करेगा और पास के मेडिकल स्टोर में दवा का लाइव स्टॉक खोजकर सीधे घर पर डिलीवरी का विकल्प देगा।'
              : 'Enter your symptoms and age. MediResQ algorithmically computes age-adapted dosages, scans verified pharmacy inventories in real-time, and dispatches directly to your doorstep.'}
          </p>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: '#6ee7b7' }}>●</span>
              <span>500+ Verified Pharmacies</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: '#6ee7b7' }}>●</span>
              <span>Age-Adapted Pharmacotherapy</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: '#6ee7b7' }}>●</span>
              <span>30-Min Doorstep Express Dispatch</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: '#fca5a5' }}>●</span>
              <span>112 Emergency Ambulance Link</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MAIN SECTION: SYMPTOM ASSESSMENT & MEDICINE FINDER (ALL FIELDS MANDATORY) */}
      <section style={{ maxWidth: '1140px', margin: '-2.5rem auto 3rem auto', padding: '0 1rem' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '2px solid #a7f3d0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            padding: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.4rem', borderRadius: '8px' }}>
                  <Activity size={22} />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#064e3b' }}>
                  {language === 'hi' ? 'लक्षण जांच एवं निकटतम दवा खोज' : 'AI Symptom & Nearest Medicine Locator'}
                </h2>
              </div>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                {language === 'hi'
                  ? 'सटीक नैदानिक खुराक और पास के मेडिकल स्टोर की लाइव खोज के लिए सभी फ़ील्ड अनिवार्य हैं।'
                  : 'All fields are mandatory to calculate age-adjusted dosing and search nearby live pharmacy inventory.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', background: '#f0fdf4', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534' }}>
              <MapPin size={14} color="#16a34a" />
              <span>Location: <strong>{locationName || 'Delhi NCR'}</strong></span>
            </div>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{formError}</span>
            </div>
          )}

          {/* Intake Form */}
          <form onSubmit={handleSubmitIntake}>
            {/* Field 1: Symptoms Description (MANDATORY) */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                  {language === 'hi' ? '1. अपनी स्वास्थ्य समस्या / लक्षण विस्तार से लिखें' : '1. Describe Your Symptoms / Health Concern'} *
                </label>
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  style={{
                    background: isListening ? '#fee2e2' : '#f0fdf4',
                    color: isListening ? '#dc2626' : '#059669',
                    border: isListening ? '1px solid #fca5a5' : '1px solid #a7f3d0',
                    borderRadius: '20px',
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                  <span>{isListening ? (language === 'hi' ? 'सुन रहा है...' : 'Listening...') : (language === 'hi' ? 'बोलकर बताएं (Voice)' : 'Voice Input')}</span>
                </button>
              </div>

              <textarea
                rows={3}
                className="form-control"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem' }}
                placeholder={
                  language === 'hi'
                    ? 'उदा. मुझे 2 दिन से तेज बुखार, बदन दर्द और सूखी खांसी है...'
                    : 'e.g. Having high fever with chills, body ache, and throat irritation for the past 2 days...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              {/* Quick Suggestion Chips */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Try:</span>
                {[
                  { en: 'High fever and severe body pain', hi: 'तेज बुखार और बदन दर्द' },
                  { en: 'Severe chest burning and acidity', hi: 'सीने में जलन और गैस' },
                  { en: 'Itchy skin rash with red spots', hi: 'खुजली और त्वचा पर लाल दाने' },
                  { en: 'Watery diarrhea and stomach cramps', hi: 'दस्त और पेट में ऐंठन' },
                ].map((sug, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setDescription(language === 'hi' ? sug.hi : sug.en)}
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      borderRadius: '16px',
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'hi' ? sug.hi : sug.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Row of Mandatory Demographic & Clinical Parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Field 2: Age (MANDATORY - Drives Dosage Computation) */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>{language === 'hi' ? '2. मरीज की उम्र (Age)' : '2. Patient Age'} *</span>
                  <span style={{ fontSize: '0.7rem', color: '#059669', background: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    Dose Critical
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="form-control"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  placeholder="e.g. 28"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>

              {/* Field 3: Gender (MANDATORY) */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                  {language === 'hi' ? '3. लिंग (Gender)' : '3. Gender'} *
                </label>
                <select
                  className="form-control"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="male">Male (पुरुष)</option>
                  <option value="female">Female (महिला)</option>
                  <option value="other">Other (अन्य)</option>
                </select>
              </div>

              {/* Field 4: Duration (MANDATORY) */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                  {language === 'hi' ? '4. लक्षणों की अवधि (Duration)' : '4. Duration'} *
                </label>
                <select
                  className="form-control"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                >
                  <option value="Under 24 hours">Under 24 hours (24 घंटे से कम)</option>
                  <option value="1-2 days">1-2 days (1 से 2 दिन)</option>
                  <option value="3-5 days">3-5 days (3 से 5 दिन)</option>
                  <option value="1 week or more">1 week or more (1 सप्ताह या अधिक)</option>
                </select>
              </div>

              {/* Field 5: Severity (MANDATORY) */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                  {language === 'hi' ? '5. गंभीरता (Severity)' : '5. Severity'} *
                </label>
                <select
                  className="form-control"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  required
                >
                  <option value="mild">Mild - Noticeable but managing</option>
                  <option value="moderate">Moderate - Affecting daily activities</option>
                  <option value="severe">Severe - Intense pain / High distress</option>
                </select>
              </div>
            </div>

            {/* Field 6: Relevant Medical History / Allergies (MANDATORY) */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                {language === 'hi' ? '6. पूर्व मेडिकल हिस्ट्री / दवा एलर्जी (Medical History / Allergies)' : '6. Medical History / Known Drug Allergies'} *
              </label>
              <input
                type="text"
                className="form-control"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                placeholder={language === 'hi' ? 'उदा. None, या Asthma, Diabetes, Penicillin Allergy...' : 'e.g. None, or Asthma, Diabetes, Hypertension, Penicillin Allergy...'}
                value={relevantHistory}
                onChange={(e) => setRelevantHistory(e.target.value)}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.9rem',
                fontWeight: 800,
                fontSize: '1.05rem',
                background: '#059669',
                borderColor: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px rgba(5, 150, 105, 0.25)',
              }}
              disabled={loading}
            >
              <Search size={20} />
              <span>
                {loading
                  ? (language === 'hi' ? 'एआई विश्लेषण एवं मेडिकल स्टोर खोज जारी है...' : 'Analyzing Symptoms & Searching Nearest Stores...')
                  : (language === 'hi' ? 'लक्षण जांचें एवं निकटतम मेडिकल स्टोर में दवा खोजें' : 'Analyze Symptoms & Find Nearest Available Medicines')}
              </span>
            </button>
          </form>

          {/* 3. DYNAMIC INTAKE & MEDICINE SEARCH RESULTS */}
          {intakeResult && (
            <div style={{ marginTop: '2rem', borderTop: '2px solid #e2e8f0', paddingTop: '2rem' }}>
              {/* Emergency Banner if Red Flag */}
              {intakeResult.isEmergency ? (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '2px solid #f87171',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                    color: '#991b1b',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.1rem' }}>
                    <ShieldAlert size={24} color="#dc2626" />
                    <span>WHO P0 CRITICAL EMERGENCY ALERT</span>
                  </div>
                  <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.9rem' }}>
                    {intakeResult.emergencyGuidance}
                  </p>
                  <a
                    href="tel:112"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0.5rem 1.25rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                    }}
                  >
                    <PhoneCall size={16} />
                    <span>Call 112 Emergency Ambulance Immediately</span>
                  </a>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>WHO Triage Level</span>
                    <div style={{ fontWeight: 800, color: '#064e3b', fontSize: '1.1rem' }}>
                      P3 Routine Outpatient &bull; Non-Emergency
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #bbf7d0' }}>
                    Decision-Support Only
                  </span>
                </div>
              )}

              {/* Consensus ML + Web Primary Outcome */}
              {intakeResult.consensus_pipeline && (
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                      🎯 Consensus: {intakeResult.consensus_pipeline.primary_condition}
                    </div>
                    <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                      {Math.round(intakeResult.consensus_pipeline.confidence_score * 100)}% Confidence
                    </span>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#475569', marginBottom: '0.75rem' }}>
                    Evaluated by Trained ML Model + Real-time Web Evidence &bull; Specialist: <strong>{intakeResult.consensus_pipeline.recommended_specialist}</strong>
                  </div>
                </div>
              )}

              {/* 1. NEAREST EMERGENCY HOSPITAL (DATABASE MATCH) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Building2 size={22} color={intakeResult.isEmergency ? '#dc2626' : '#059669'} />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: intakeResult.isEmergency ? '#991b1b' : '#064e3b' }}>
                    {language === 'hi' ? 'निकटतम आपातकालीन अस्पताल (24/7 Emergency & ICU)' : 'Nearest Emergency Hospital (24/7 Trauma & Beds)'}
                  </h3>
                </div>

                {intakeResult.nearestHospital?.isAvailableNearby ? (
                  <div
                    style={{
                      background: intakeResult.isEmergency ? '#fef2f2' : '#ffffff',
                      border: intakeResult.isEmergency ? '2px solid #ef4444' : '1.5px solid #86efac',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                            {intakeResult.nearestHospital.hospitalName}
                          </h4>
                          <span style={{ fontSize: '0.72rem', background: '#dc2626', color: '#ffffff', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '4px' }}>
                            🚨 24/7 EMERGENCY
                          </span>
                          {intakeResult.nearestHospital.ambulanceAvailable && (
                            <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '4px' }}>
                              🚑 AMBULANCE READY
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          📍 {intakeResult.nearestHospital.address} &bull; <strong>{intakeResult.nearestHospital.distanceKm} km away</strong> &bull; {intakeResult.nearestHospital.traumaCareLevel}
                        </div>
                      </div>

                      {/* Live Available Beds Count */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.65rem', textAlign: 'center', minWidth: '70px' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>ICU BEDS</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#dc2626' }}>
                            {intakeResult.nearestHospital.availableBeds?.icu ?? 0}
                          </div>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.65rem', textAlign: 'center', minWidth: '70px' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>EMERGENCY</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ea580c' }}>
                            {intakeResult.nearestHospital.availableBeds?.emergency ?? 0}
                          </div>
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.65rem', textAlign: 'center', minWidth: '70px' }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>OXYGEN</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#059669' }}>
                            {intakeResult.nearestHospital.availableBeds?.oxygen ?? 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hospital Call Hotline (Direct call in emergency) */}
                    <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.825rem', color: '#334155' }}>
                        {language === 'hi' ? 'आपातकालीन सहायता एवं बेड रिज़र्वेशन के लिए सीधे कॉल करें:' : 'Direct Emergency Trauma & Bed Admission Hotline:'}
                      </span>
                      <a
                        href={`tel:${intakeResult.nearestHospital.emergencyContactNumber}`}
                        className="btn btn-primary"
                        style={{
                          background: '#dc2626',
                          borderColor: '#dc2626',
                          padding: '0.55rem 1.25rem',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          color: '#ffffff',
                          textDecoration: 'none',
                          borderRadius: '8px',
                        }}
                      >
                        <PhoneCall size={16} />
                        <span>{language === 'hi' ? 'आपातकालीन कॉल करें: ' : 'Call Emergency: '} {intakeResult.nearestHospital.emergencyContactNumber}</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  /* HOSPITAL NOT AVAILABLE NEARBY */
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1.5px solid #fecaca',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      color: '#991b1b',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <AlertCircle size={24} color="#dc2626" />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                            {language === 'hi' ? 'आपके पास कोई आपातकालीन अस्पताल उपलब्ध नहीं है' : 'No emergency hospital available at your nearby location'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>
                            {language === 'hi' ? 'कृपया तत्काल राष्ट्रीय आपातकालीन सेवा 112 पर संपर्क करें।' : 'Please dial the National Emergency Service 112 immediately for immediate ambulance dispatch.'}
                          </div>
                        </div>
                      </div>
                      <a
                        href="tel:112"
                        style={{
                          background: '#dc2626',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          padding: '0.5rem 1.1rem',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <PhoneCall size={16} />
                        <span>{language === 'hi' ? '112 एम्बुलेंस कॉल करें' : 'Call 112 Ambulance'}</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. NEAREST DOCTOR (DATABASE MATCH) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Stethoscope size={22} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#064e3b' }}>
                    {language === 'hi' ? 'निकटतम विशेषज्ञ डॉक्टर (Specialist Doctor)' : 'Nearest Specialist Doctor'}
                  </h3>
                </div>

                {intakeResult.nearestDoctor?.isAvailableNearby ? (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #86efac',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                            {intakeResult.nearestDoctor.fullName}
                          </h4>
                          <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '4px' }}>
                            VERIFIED DOCTOR
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700 }}>
                          {intakeResult.nearestDoctor.specialties?.join(', ') || 'General Physician'} &bull; {intakeResult.nearestDoctor.experienceYears} {language === 'hi' ? 'वर्ष अनुभव' : 'years exp.'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                          📍 {intakeResult.nearestDoctor.clinicAddress} &bull; <strong>{intakeResult.nearestDoctor.distanceKm} km away</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Consultation Fee</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669' }}>
                          ₹{intakeResult.nearestDoctor.consultationFee || 500}
                        </div>
                      </div>
                    </div>

                    {/* Doctor Action Button (Call Doctor with Login Gatekeeper for Guests) */}
                    <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.825rem', color: '#475569' }}>
                        {language === 'hi' ? 'परामर्श या अपॉइंटमेंट के लिए डॉक्टर को सीधे कॉल करें:' : 'Direct consultation & appointment hotline:'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleCallDoctor(intakeResult.nearestDoctor.verifiedPhone)}
                        style={{
                          background: '#059669',
                          borderColor: '#059669',
                          padding: '0.55rem 1.25rem',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          color: '#ffffff',
                          borderRadius: '8px',
                        }}
                      >
                        <PhoneCall size={16} />
                        <span>
                          {user
                            ? `${language === 'hi' ? 'कॉल करें: ' : 'Call Doctor: '} ${intakeResult.nearestDoctor.verifiedPhone}`
                            : (language === 'hi' ? 'डॉक्टर को कॉल करें' : 'Call Doctor')}
                        </span>
                        {!user && <Lock size={13} style={{ opacity: 0.8 }} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* DOCTOR NOT AVAILABLE NEARBY */
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1.5px solid #fde68a',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      color: '#92400e',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <AlertTriangle size={24} color="#d97706" />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                          {language === 'hi' ? 'आपके पास कोई डॉक्टर उपलब्ध नहीं है' : 'No doctor available at your nearby location'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#b45309' }}>
                          {language === 'hi'
                            ? `आपकी स्थिति के लिए सुझाई गई विशेषता (${intakeResult.consensus_pipeline?.recommended_specialist || 'विशेषज्ञ'}) के अनुसार आपके नजदीकी क्षेत्र में कोई सत्यापित डॉक्टर पंजीकृत नहीं है।`
                            : `No verified specialist (${intakeResult.consensus_pipeline?.recommended_specialist || 'Specialist'}) is currently available in your nearby radius.`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* MEDICINES SECTION WITH AGE-ADAPTED DOSAGE & DATABASE INVENTORY AVAILABILITY */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Pill size={22} color="#059669" />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#064e3b' }}>
                    {language === 'hi' ? 'सुझाई गई औषधियां एवं पास के मेडिकल स्टोर का स्टॉक' : 'Suggested Medicines with Age-Adapted Dose & Live Pharmacy Stock'}
                  </h3>
                </div>

                {/* STICKY / PROMINENT MEDICINE CARD BANNER */}
                {medicineCard.length > 0 && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                      color: '#ffffff',
                      borderRadius: '12px',
                      padding: '1rem 1.25rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      boxShadow: '0 4px 12px rgba(6, 78, 59, 0.25)',
                      border: '1.5px solid #10b981',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: '#059669', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={22} color="#ffffff" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
                          {language === 'hi'
                            ? `दवा कार्ड (${medicineCard.length} ${medicineCard.length === 1 ? 'दवा' : 'दवाइयां'})`
                            : `Medicine Card (${medicineCard.length} ${medicineCard.length === 1 ? 'medicine' : 'medicines'})`}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>
                          {medicineCard.map((it) => it.name).join(', ')}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleOpenCardModal}
                      style={{
                        background: '#10b981',
                        borderColor: '#10b981',
                        padding: '0.6rem 1.25rem',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        borderRadius: '8px',
                        color: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>{language === 'hi' ? 'स्टोर उपलब्धता जांचें एवं ऑर्डर पुष्टि करें' : 'Check Store Availability & Order'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(
                    (intakeResult.suggestedMedicinesWithInventory && intakeResult.suggestedMedicinesWithInventory.length > 0)
                      ? intakeResult.suggestedMedicinesWithInventory
                      : ((intakeResult.evidenceSynthesis?.suggestedMedicines && intakeResult.evidenceSynthesis.suggestedMedicines.length > 0)
                        ? intakeResult.evidenceSynthesis.suggestedMedicines
                        : (intakeResult.consensus_pipeline?.common_and_best_medicines || []))
                  ).map((med, mIdx) => {
                    const isAvailable = med.isAvailableNearby && med.matchedPharmacy;
                    const pharm = med.matchedPharmacy;
                    const inCard = medicineCard.find((c) => (c.name || '').toLowerCase() === (med.name || '').toLowerCase());

                    return (
                      <div
                        key={mIdx}
                        style={{
                          background: '#ffffff',
                          border: isAvailable ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        {/* Medicine Title & Age Dose Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                              {med.name}
                            </h4>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              Generic: <strong>{med.genericName || med.generic_name || med.name}</strong>
                            </span>
                          </div>

                          {/* Age-Adapted Tag */}
                          <span
                            style={{
                              fontSize: '0.75rem',
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                            }}
                          >
                            👤 {med.ageGroup || `Patient Age: ${intakeResult.patientAge || age}y`}
                          </span>
                        </div>

                        {/* Dose Amount & Frequency (Explicitly Age-Adapted) */}
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.75rem', margin: '0.5rem 0 0.85rem 0', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}>
                          <div style={{ color: '#065f46', fontWeight: 700, marginBottom: '0.25rem' }}>
                            💊 <strong>{language === 'hi' ? 'सटीक खुराक (Dose Amount):' : 'Calculated Dose Amount:'}</strong> {med.doseAmount || 'Standard Adult Dose'}
                          </div>
                          <div style={{ color: '#334155' }}>
                            ⏰ <strong>{language === 'hi' ? 'लेने का समय (Frequency):' : 'Schedule:'}</strong> {med.frequency || med.dosageGuide}
                          </div>
                          {med.instructions && (
                            <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                              ℹ️ {med.instructions}
                            </div>
                          )}
                        </div>

                        {/* BELOW THE MEDICINE: DATABASE SEARCH & NEAREST MEDICAL RESULT */}
                        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.85rem' }}>
                          {isAvailable ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                                  <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                    🟢 IN STOCK ({pharm.availableQuantity} units)
                                  </span>
                                  {pharm.homeDeliveryAvailable && (
                                    <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                      ⚡ 30-Min Delivery
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                                  Store: {pharm.storeName}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                  📍 {pharm.address?.street || 'Local Area'} &bull; {pharm.distanceKm ? `${pharm.distanceKm} km away` : 'Near you'} &bull; <strong style={{ color: '#059669' }}>₹{pharm.unitPrice}</strong>
                                </div>
                              </div>

                              {/* Action Buttons: Add to Medicine Card & Call Store */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {inCard ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '0.25rem 0.5rem' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCardQuantity(med.name, -1)}
                                      style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#065f46', minWidth: '24px', textAlign: 'center' }}>
                                      {inCard.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCardQuantity(med.name, 1)}
                                      style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <Plus size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleOpenCardModal}
                                      style={{ marginLeft: '0.4rem', background: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.7rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    >
                                      <ShoppingBag size={13} />
                                      <span>{language === 'hi' ? 'कार्ड देखें' : 'View Card'}</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => handleAddToCard(med)}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      fontSize: '0.85rem',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.4rem',
                                      background: '#059669',
                                      borderColor: '#059669',
                                    }}
                                  >
                                    <Plus size={15} />
                                    <span>{language === 'hi' ? 'कार्ड में जोड़ें' : 'Add to Card'}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  onClick={() => handleCallPharmacy(pharm.verifiedContactNumber)}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                  }}
                                >
                                  <PhoneCall size={15} />
                                  <span>
                                    {user
                                      ? `${pharm.verifiedContactNumber}`
                                      : (language === 'hi' ? 'कॉल करें' : 'Call Store')}
                                  </span>
                                  {!user && <Lock size={12} style={{ opacity: 0.7 }} />}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* SCENARIO 3: NO NEARBY MEDICAL FOUND WITH MEDICINE IN STOCK */
                            <div
                              style={{
                                background: '#fef3c7',
                                border: '1px solid #fde68a',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e', fontSize: '0.85rem' }}>
                                <AlertTriangle size={18} color="#d97706" />
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

                              <button
                                type="button"
                                onClick={() => handleAddToCard(med)}
                                style={{
                                  background: inCard ? '#ecfdf5' : '#ffffff',
                                  border: inCard ? '1.5px solid #059669' : '1px solid #d97706',
                                  color: inCard ? '#065f46' : '#92400e',
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <Plus size={13} />
                                <span>{inCard ? (language === 'hi' ? 'कार्ड में है' : 'In Card') : (language === 'hi' ? 'कार्ड में जोड़ें (सभी स्टोर खोजें)' : 'Add to Card (Scan All Stores)')}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* First Aid Measures */}
              {intakeResult.evidenceSynthesis?.firstAidMeasures?.length > 0 && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '1rem', marginTop: '1.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#065f46', marginBottom: '0.5rem' }}>
                    🩹 {language === 'hi' ? 'प्राथमिक उपचार एवं घरेलू कदम:' : 'Immediate First Aid & Home Relief Steps:'}
                  </div>
                  {intakeResult.evidenceSynthesis.firstAidMeasures.map((fa, faIdx) => (
                    <div key={faIdx} style={{ fontSize: '0.85rem', color: '#064e3b', marginBottom: '0.35rem' }}>
                      <strong>{fa.action}:</strong> {fa.instructions}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 4. MEDICINE CARD & LIVE STORE AVAILABILITY MODAL */}
      {cartModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setCartModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
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
              borderRadius: '16px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={22} color="#059669" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#064e3b' }}>
                  {language === 'hi' ? 'दवा कार्ड एवं लाइव स्टोर उपलब्धता' : 'Medicine Card & Live Store Availability'}
                </h3>
              </div>
              <button
                onClick={() => setCartModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.25rem', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Loading State during Real-Time Availability Check */}
            {cartChecking ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#059669' }}>
                <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #86efac', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem', fontWeight: 700, fontSize: '0.95rem', color: '#064e3b' }}>
                  {language === 'hi'
                    ? 'निकटतम मेडिकल स्टोरों में दवा का लाइव स्टॉक जांचा जा रहा है...'
                    : 'Checking live stock availability across nearby verified pharmacies...'}
                </p>
              </div>
            ) : (
              <div>
                {/* Summary Pill */}
                {cartAvailabilityData?.summary && (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {language === 'hi' ? 'कार्ड सारांश:' : 'Card Summary:'}
                      </span>
                      <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        🟢 {cartAvailabilityData.summary.totalAvailable} {language === 'hi' ? 'उपलब्ध' : 'Available in Stock'}
                      </span>
                      {cartAvailabilityData.summary.totalUnavailable > 0 && (
                        <span style={{ background: '#fef3c7', color: '#92400e', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          ⚠️ {cartAvailabilityData.summary.totalUnavailable} {language === 'hi' ? 'अनुपलब्ध' : 'Out of Stock'}
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      📍 {locationName || 'Local Area'}
                    </span>
                  </div>
                )}

                {/* 1. STORE GROUPS: If at same store -> show one; If on different stores -> show each store */}
                {cartAvailabilityData?.storeGroups && cartAvailabilityData.storeGroups.length > 0 ? (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      {language === 'hi' ? 'सत्यापित स्टोर जहां दवाइयां उपलब्ध हैं:' : 'Verified Stores with Stock Available:'}
                    </div>

                    {cartAvailabilityData.storeGroups.map((group, gIdx) => (
                      <div
                        key={gIdx}
                        style={{
                          background: '#f0fdf4',
                          border: '1.5px solid #86efac',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          marginBottom: '1rem',
                        }}
                      >
                        {/* Store Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <Building2 size={18} color="#059669" />
                              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#064e3b' }}>
                                {group.store.storeName}
                              </h4>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                              📍 {group.store.address?.street}, {group.store.address?.city} &bull; <strong>{group.store.distanceKm} km away</strong> &bull; 📞 {group.store.verifiedContactNumber}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                            🟢 {group.items.length} {group.items.length === 1 ? 'Item' : 'Items'} Available
                          </span>
                        </div>

                        {/* Items in this Store */}
                        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #bbf7d0', padding: '0.75rem', marginBottom: '0.85rem' }}>
                          {group.items.map((it, itIdx) => (
                            <div
                              key={itIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.5rem 0',
                                borderBottom: itIdx < group.items.length - 1 ? '1px dashed #e2e8f0' : 'none',
                              }}
                            >
                              <div>
                                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{it.name}</strong>
                                <div style={{ fontSize: '0.75rem', color: '#059669' }}>
                                  ₹{it.unitPrice} &times; {it.quantity} &bull; In stock: <strong>{it.availableQuantity} units</strong>
                                </div>
                              </div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                                ₹{it.subtotal}
                              </div>
                            </div>
                          ))}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid #cbd5e1', paddingTop: '0.5rem', marginTop: '0.5rem', fontWeight: 800, fontSize: '1rem', color: '#064e3b' }}>
                            <span>{language === 'hi' ? 'स्टोर कुल राशि:' : 'Store Subtotal:'}</span>
                            <span>₹{group.storeSubtotal}</span>
                          </div>
                        </div>

                        {/* Delivery Address fields */}
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.85rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                            {language === 'hi' ? 'डिलीवरी पता एवं संपर्क नंबर:' : 'Delivery Address & Phone:'}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                              placeholder="Street Address"
                              value={orderStreet}
                              onChange={(e) => setOrderStreet(e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-control"
                              style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                              placeholder="City"
                              value={orderCity}
                              onChange={(e) => setOrderCity(e.target.value)}
                            />
                          </div>
                          <input
                            type="tel"
                            className="form-control"
                            style={{ width: '100%', padding: '0.45rem', fontSize: '0.825rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            placeholder="Phone Number for Delivery"
                            value={orderPhone}
                            onChange={(e) => setOrderPhone(e.target.value)}
                          />
                        </div>

                        {/* Confirm Order for this specific Store */}
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleConfirmStoreOrder(group)}
                          disabled={orderingStoreId === group.store.pharmacyId}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.45rem',
                            background: '#059669',
                            borderColor: '#059669',
                            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                          }}
                        >
                          <Truck size={16} />
                          <span>
                            {orderingStoreId === group.store.pharmacyId
                              ? (language === 'hi' ? 'ऑर्डर पुष्टि हो रही है...' : 'Confirming Order...')
                              : (language === 'hi'
                                ? `${group.store.storeName} से ऑर्डर की पुष्टि करें (₹${group.storeSubtotal})`
                                : `Confirm Order from ${group.store.storeName} (₹${group.storeSubtotal})`)}
                          </span>
                          {!user && <Lock size={13} style={{ opacity: 0.8 }} />}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', color: '#64748b', marginBottom: '1.25rem' }}>
                    <AlertTriangle size={32} color="#f59e0b" style={{ margin: '0 auto 0.5rem auto' }} />
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                      {language === 'hi' ? 'कोई भी दवा पास के स्टोर में उपलब्ध नहीं है' : 'No Medicines Available Nearby'}
                    </h4>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.825rem' }}>
                      {language === 'hi'
                        ? 'कार्ड में जोड़ी गई दवाइयां किसी भी नजदीकी सत्यापित मेडिकल स्टोर में उपलब्ध नहीं हैं।'
                        : 'None of the items in your card are currently in stock at nearby verified pharmacies.'}
                    </p>
                  </div>
                )}

                {/* 2. UNAVAILABLE MEDICINES (Not need to confirm all; available can be confirmed) */}
                {cartAvailabilityData?.unavailableItems && cartAvailabilityData.unavailableItems.length > 0 && (
                  <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '1.15rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.95rem', color: '#92400e', marginBottom: '0.35rem' }}>
                      <AlertTriangle size={18} color="#d97706" />
                      <span>
                        {language === 'hi'
                          ? `अनुपलब्ध दवाइयां (${cartAvailabilityData.unavailableItems.length}) - नजदीकी स्टोर में स्टॉक नहीं है`
                          : `Unavailable Medicines (${cartAvailabilityData.unavailableItems.length}) - Out of Stock Nearby`}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#b45309', margin: '0 0 0.75rem 0' }}>
                      {language === 'hi'
                        ? 'ये दवाइयां पास के किसी सत्यापित स्टोर में उपलब्ध नहीं हैं। आपको इन्हें पुष्टि करने की आवश्यकता नहीं है; आप ऊपर उपलब्ध दवाओं का ऑर्डर स्वतंत्र रूप से दर्ज कर सकते हैं।'
                        : 'These items are currently out of stock across nearby stores. You do not need to confirm them; you can proceed to confirm order for the available medicines above without waiting.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {cartAvailabilityData.unavailableItems.map((uItem, uIdx) => (
                        <div
                          key={uIdx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#ffffff',
                            border: '1px solid #fed7aa',
                            borderRadius: '6px',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.825rem',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#9a3412' }}>{uItem.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#ea580c', marginLeft: '0.5rem' }}>
                              (Qty: {uItem.quantity})
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#b91c1c', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                              OUT OF STOCK
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCard(uItem.name)}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
                              title="Remove from card"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
