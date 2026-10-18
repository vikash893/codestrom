import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Activity,
  Camera,
  Building2,
  Pill,
  Stethoscope,
  ShoppingBag,
  Clock,
  AlertTriangle,
  UserCheck,
  Settings,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';

export const Sidebar = ({ activeTab, onSelectTab, role = 'patient', counts = {} }) => {
  const { t, language } = useLanguage();

  const patientNav = [
    { id: 'intake', label: t('navSymptomIntake'), icon: Activity, badge: null, color: '#2563eb' },
    { id: 'scanner', label: t('navSkinPrescription'), icon: Camera, badge: 'AI', color: '#7c3aed' },
    { id: 'medicines', label: t('navMedicines'), icon: Pill, badge: counts.medicines || null, color: '#059669' },
    { id: 'orders', label: t('navMyOrders'), icon: ShoppingBag, badge: counts.orders || null, color: '#d97706' },
    { id: 'doctors', label: t('navDoctorConnect'), icon: Stethoscope, badge: counts.doctors || null, color: '#0284c7' },
    { id: 'hospitals', label: t('navHospitals'), icon: Building2, badge: counts.hospitals || null, color: '#dc2626' },
  ];

  const doctorNav = [
    { id: 'queue', label: t('navDoctorQueue'), icon: ShieldAlert, badge: counts.queue || null, color: '#dc2626' },
    { id: 'consultations', label: t('navActiveConsultations'), icon: Stethoscope, badge: counts.consultations || null, color: '#0284c7' },
    { id: 'profile', label: t('navDoctorProfile'), icon: UserCheck, badge: null, color: '#059669' },
  ];

  const pharmacyNav = [
    { id: 'orders', label: t('navPharmacyOrders'), icon: ShoppingBag, badge: counts.pharmacyOrders || null, color: '#d97706' },
    { id: 'inventory', label: t('navPharmacyInventory'), icon: Pill, badge: counts.inventory || null, color: '#059669' },
    { id: 'alerts', label: t('navPharmacyAlerts'), icon: AlertTriangle, badge: counts.alerts || null, color: '#dc2626' },
  ];

  const hospitalNav = [
    { id: 'requests', label: language === 'hi' ? 'मरीज भर्ती अनुरोध' : 'Patient Requests & Admissions', icon: Activity, badge: counts.hospitalRequests || null, color: '#dc2626' },
    { id: 'beds', label: language === 'hi' ? 'बेड प्रबंधन व आरक्षण' : 'Bed Management & Reserve', icon: Building2, badge: counts.availableBeds !== undefined ? `${counts.availableBeds} Free` : null, color: '#2563eb' },
    { id: 'doctors', label: language === 'hi' ? 'डॉक्टर रोस्टर व शेड्यूलिंग' : 'Doctor Roster & Scheduling', icon: Stethoscope, badge: counts.onDutyDoctors !== undefined ? `${counts.onDutyDoctors} On Duty` : null, color: '#059669' },
    { id: 'profile', label: language === 'hi' ? 'अस्पताल व ट्रॉमा सुविधाएं' : 'Facility & Trauma Readiness', icon: ShieldAlert, badge: '24/7', color: '#7c3aed' },
  ];

  let items = patientNav;
  if (role === 'doctor') items = doctorNav;
  if (role === 'pharmacy') items = pharmacyNav;
  if (role === 'hospital') items = hospitalNav;

  return (
    <aside style={{
      width: '260px',
      flexShrink: 0,
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      minHeight: 'calc(100vh - 120px)',
      padding: '1.25rem 0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
    }}>
      <div style={{
        padding: '0.25rem 0.75rem 0.75rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#64748b',
        borderBottom: '1px solid #f1f5f9',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>{role.toUpperCase()} WORKSPACE</span>
        <span style={{
          background: '#f1f5f9',
          color: '#334155',
          fontSize: '0.7rem',
          padding: '0.1rem 0.4rem',
          borderRadius: '4px',
          fontWeight: 600,
        }}>
          {language === 'hi' ? 'हिन्दी' : 'EN'}
        </span>
      </div>

      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.7rem 0.85rem',
              borderRadius: '8px',
              border: isActive ? `1.5px solid ${item.color}` : '1.5px solid transparent',
              background: isActive ? `${item.color}10` : 'transparent',
              color: isActive ? item.color : '#334155',
              cursor: 'pointer',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.875rem',
              textAlign: 'left',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Icon size={18} color={item.color} />
              <span>{item.label}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {item.badge !== null && item.badge !== undefined && (
                <span style={{
                  background: isActive ? item.color : '#e2e8f0',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '999px',
                }}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={14} color={item.color} />}
            </div>
          </button>
        );
      })}

      {/* Emergency Quick Assist Card in Sidebar */}
      <div style={{
        marginTop: 'auto',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '0.85rem',
        fontSize: '0.8rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c', fontWeight: 700, marginBottom: '0.25rem' }}>
          <ShieldAlert size={16} />
          <span>{language === 'hi' ? 'आपातकालीन सहायता' : 'Emergency Assist'}</span>
        </div>
        <p style={{ color: '#7f1d1d', margin: '0 0 0.5rem 0', lineHeight: 1.3, fontSize: '0.75rem' }}>
          {language === 'hi'
            ? 'जीवन-घातक स्थिति में तुरंत 112 या 108 पर संपर्क करें।'
            : 'Immediate response ambulance and emergency dispatch:'}
        </p>
        <a
          href="tel:112"
          style={{
            display: 'block',
            textAlign: 'center',
            background: '#dc2626',
            color: '#ffffff',
            padding: '0.35rem 0.5rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.8rem',
          }}
        >
          📞 Call 112 Emergency
        </a>
      </div>
    </aside>
  );
};
