import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ShieldAlert,
  Check,
  X,
  Users,
  Activity,
  Stethoscope,
  Pill,
  Building2,
  Clock,
  Trash2,
  Edit,
  Plus,
  Search,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  ChevronRight,
  Database,
  Eye,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { SkeletonCard, SkeletonRow } from './Skeleton';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'approvals' | 'users' | 'doctors' | 'hospitals' | 'pharmacies' | 'audit'
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState({ doctors: [], pharmacies: [], hospitals: [] });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Tab: Users state
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ phone: '', email: '', password: '', role: 'patient', status: 'active', isVerified: false });

  // Tab: Doctors state
  const [doctorsList, setDoctorsList] = useState([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorForm, setDoctorForm] = useState({ fullName: '', phone: '', medicalRegistrationNumber: '', registrationCouncil: 'State Medical Council', specialties: 'General Medicine', consultationFee: 500, clinicAddress: '', isVerified: true });

  // Tab: Hospitals state
  const [hospitalsList, setHospitalsList] = useState([]);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [hospitalForm, setHospitalForm] = useState({ hospitalName: '', registrationNumber: '', verifiedEmergencyNumbers: '', addressStreet: '', addressCity: 'Delhi', traumaCareLevel: 'Level 1', isVerified: true });

  // Tab: Pharmacies state
  const [pharmaciesList, setPharmaciesList] = useState([]);
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState(null); // When selected, opens drawer/detail of medicines & orders
  const [pharmacyMedicines, setPharmacyMedicines] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [pharmacyOrdersStats, setPharmacyOrdersStats] = useState(null);
  const [pharmacyDetailLoading, setPharmacyDetailLoading] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [medicineForm, setMedicineForm] = useState({ medicineName: '', genericName: '', brandName: '', strength: '', dosageForm: 'tablet', availableQuantity: 20, unitPrice: 50, batchNumber: '' });
  const [showAddPharmacyModal, setShowAddPharmacyModal] = useState(false);
  const [pharmacyForm, setPharmacyForm] = useState({ storeName: '', drugLicenseNumber: '', phone: '', addressStreet: '', homeDeliveryAvailable: true, deliveryRadiusKm: 10, isVerified: true });

  // Purge modal state
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState('all');
  const [purgeLoading, setPurgeLoading] = useState(false);

  const notify = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadStatsAndApprovals = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

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
      console.error('Failed to load admin summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Loaders for specific tabs
  const loadUsers = async () => {
    try {
      const res = await api.get(`/admin/users?search=${encodeURIComponent(userSearch)}&role=${userRoleFilter}`);
      setUsersList(res.data.users || []);
    } catch (err) {
      console.warn('Load users err:', err);
    }
  };

  const loadDoctors = async () => {
    try {
      const res = await api.get(`/admin/doctors?search=${encodeURIComponent(doctorSearch)}`);
      setDoctorsList(res.data.doctors || []);
    } catch (err) {
      console.warn('Load doctors err:', err);
    }
  };

  const loadHospitals = async () => {
    try {
      const res = await api.get(`/admin/hospitals?search=${encodeURIComponent(hospitalSearch)}`);
      setHospitalsList(res.data.hospitals || []);
    } catch (err) {
      console.warn('Load hospitals err:', err);
    }
  };

  const loadPharmacies = async () => {
    try {
      const res = await api.get(`/admin/pharmacies?search=${encodeURIComponent(pharmacySearch)}`);
      setPharmaciesList(res.data.pharmacies || []);
    } catch (err) {
      console.warn('Load pharmacies err:', err);
    }
  };

  const loadPharmacyDetails = async (pharmacyId) => {
    setPharmacyDetailLoading(true);
    try {
      const [medRes, ordRes] = await Promise.all([
        api.get(`/admin/pharmacies/${pharmacyId}/medicines`),
        api.get(`/admin/pharmacies/${pharmacyId}/orders`),
      ]);
      setPharmacyMedicines(medRes.data.medicines || []);
      setPharmacyOrders(ordRes.data.orders || []);
      setPharmacyOrdersStats(ordRes.data.stats || null);
    } catch (err) {
      console.warn('Pharmacy details err:', err);
    } finally {
      setPharmacyDetailLoading(false);
    }
  };

  useEffect(() => {
    loadStatsAndApprovals();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'doctors') loadDoctors();
    if (activeTab === 'hospitals') loadHospitals();
    if (activeTab === 'pharmacies') loadPharmacies();
  }, [activeTab, userRoleFilter]);

  // Handle Approvals
  const handleDecision = async (entityType, entityId, status) => {
    const reason = prompt(`Reason for ${status}ing this ${entityType}:`) || 'Administrative verification review';
    try {
      await api.post('/admin/verifications/decision', {
        entityType,
        entityId,
        status,
        reason,
      });
      notify(`${entityType} marked as ${status.toUpperCase()}!`);
      loadStatsAndApprovals(true);
      if (activeTab === 'doctors') loadDoctors();
      if (activeTab === 'hospitals') loadHospitals();
      if (activeTab === 'pharmacies') loadPharmacies();
    } catch (err) {
      alert(err.response?.data?.message || 'Verification update failed');
    }
  };

  // User Actions
  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser._id}`, userForm);
        notify('User updated successfully!');
      } else {
        await api.post('/admin/users', userForm);
        notify('User created successfully!');
      }
      setShowUserModal(false);
      setEditingUser(null);
      loadUsers();
      loadStatsAndApprovals(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user and all linked resources?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      notify('User deleted successfully!');
      loadUsers();
      loadStatsAndApprovals(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Doctor Actions
  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    try {
      if (editingDoctor) {
        await api.put(`/admin/doctors/${editingDoctor._id}`, doctorForm);
        notify('Doctor updated successfully!');
      } else {
        await api.post('/admin/doctors', doctorForm);
        notify('Doctor created successfully!');
      }
      setShowDoctorModal(false);
      setEditingDoctor(null);
      loadDoctors();
      loadStatsAndApprovals(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save doctor');
    }
  };

  const handleDeleteDoctor = async (docId) => {
    if (!window.confirm('Delete this doctor profile?')) return;
    try {
      await api.delete(`/admin/doctors/${docId}`);
      notify('Doctor deleted successfully!');
      loadDoctors();
      loadStatsAndApprovals(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete doctor');
    }
  };

  // Hospital Actions
  const handleSaveHospital = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        hospitalName: hospitalForm.hospitalName,
        registrationNumber: hospitalForm.registrationNumber,
        verifiedEmergencyNumbers: hospitalForm.verifiedEmergencyNumbers.split(',').map((s) => s.trim()).filter(Boolean),
        address: {
          street: hospitalForm.addressStreet || 'Civil Hospital Road',
          city: hospitalForm.addressCity || 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
        },
        traumaCareLevel: hospitalForm.traumaCareLevel,
        isVerified: hospitalForm.isVerified,
      };

      if (editingHospital) {
        await api.put(`/admin/hospitals/${editingHospital._id}`, payload);
        notify('Hospital updated successfully!');
      } else {
        await api.post('/admin/hospitals', payload);
        notify('Hospital created successfully!');
      }
      setShowHospitalModal(false);
      setEditingHospital(null);
      loadHospitals();
      loadStatsAndApprovals(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save hospital');
    }
  };

  const handleDeleteHospital = async (hospId) => {
    if (!window.confirm('Delete this hospital facility?')) return;
    try {
      await api.delete(`/admin/hospitals/${hospId}`);
      notify('Hospital deleted successfully!');
      loadHospitals();
      loadStatsAndApprovals(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete hospital');
    }
  };

  // Pharmacy Actions
  const handleSavePharmacy = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        storeName: pharmacyForm.storeName,
        drugLicenseNumber: pharmacyForm.drugLicenseNumber,
        phone: pharmacyForm.phone,
        address: {
          street: pharmacyForm.addressStreet || 'Main Market Road',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
        },
        homeDeliveryAvailable: pharmacyForm.homeDeliveryAvailable,
        deliveryRadiusKm: Number(pharmacyForm.deliveryRadiusKm),
        isVerified: pharmacyForm.isVerified,
      };

      await api.post('/admin/pharmacies', payload);
      notify('Medical store created successfully!');
      setShowAddPharmacyModal(false);
      loadPharmacies();
      loadStatsAndApprovals(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save pharmacy');
    }
  };

  const handleDeletePharmacy = async (pharmId) => {
    if (!window.confirm('Delete this pharmacy and all uploaded medicines and orders?')) return;
    try {
      await api.delete(`/admin/pharmacies/${pharmId}`);
      notify('Pharmacy and linked items deleted!');
      if (selectedPharmacy?._id === pharmId) setSelectedPharmacy(null);
      loadPharmacies();
      loadStatsAndApprovals(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete pharmacy');
    }
  };

  // Medicine Actions for selected pharmacy
  const handleAddMedicineToPharmacy = async (e) => {
    e.preventDefault();
    if (!selectedPharmacy) return;
    try {
      await api.post(`/admin/pharmacies/${selectedPharmacy._id}/medicines`, medicineForm);
      notify(`Medicine added to ${selectedPharmacy.storeName}!`);
      setShowAddMedicineModal(false);
      setMedicineForm({ medicineName: '', genericName: '', brandName: '', strength: '', dosageForm: 'tablet', availableQuantity: 20, unitPrice: 50, batchNumber: '' });
      loadPharmacyDetails(selectedPharmacy._id);
      loadPharmacies();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add medicine');
    }
  };

  const handleDeleteMedicine = async (medId) => {
    if (!window.confirm('Delete this medicine from inventory?')) return;
    try {
      await api.delete(`/admin/medicines/${medId}`);
      notify('Medicine deleted from inventory!');
      if (selectedPharmacy) loadPharmacyDetails(selectedPharmacy._id);
      loadPharmacies();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete medicine');
    }
  };

  // Order Status update
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      notify(`Order status set to ${newStatus}!`);
      if (selectedPharmacy) loadPharmacyDetails(selectedPharmacy._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order');
    }
  };

  // Purge Seeded Demo Data
  const handlePurgeData = async () => {
    if (!window.confirm(`Are you sure you want to PURGE seeded ${purgeTarget.toUpperCase()} data? This action cannot be undone.`)) return;
    setPurgeLoading(true);
    try {
      const res = await api.post('/admin/purge-seed-data', { entityType: purgeTarget });
      notify(`Seeded data purged successfully! (${JSON.stringify(res.data.report)})`);
      setShowPurgeModal(false);
      loadStatsAndApprovals(true);
      if (activeTab === 'users') loadUsers();
      if (activeTab === 'doctors') loadDoctors();
      if (activeTab === 'hospitals') loadHospitals();
      if (activeTab === 'pharmacies') loadPharmacies();
    } catch (err) {
      alert(err.response?.data?.message || 'Purge failed');
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              MediResQ Central Administration Hub
            </h2>
            <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
              Root Admin: {user?.email || 'vikashbhardwaj430@gmail.com'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {language === 'hi'
              ? 'उपयोगकर्ताओं, डॉक्टरों, अस्पतालों और मेडिकल स्टोर (दवाओं एवं ऑर्डर्स) का प्रबंधन, अनुमोदन व डेटा सफाई'
              : 'Full CRUD Governance for Users, Doctors, Hospitals, and Medical Stores (Medicines & Orders), plus Verification Approvals'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={() => setShowPurgeModal(true)}
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
          >
            <Database size={14} />
            <span>{language === 'hi' ? 'सीडेड डेटा हटाएं' : 'Purge Seeded Data'}</span>
          </button>

          <button
            className="btn btn-outline"
            onClick={() => loadStatsAndApprovals(true)}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{language === 'hi' ? 'रिफ्रेश' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            background: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fca5a5'}`,
            color: notification.type === 'success' ? '#166534' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
            ✕
          </button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0.2rem',
        }}
      >
        {[
          { id: 'overview', label: language === 'hi' ? 'डैशबोर्ड अवलोकन' : 'Overview & Stats', icon: Activity },
          {
            id: 'approvals',
            label: language === 'hi' ? 'सत्यापन अनुमोदन' : 'Provider Approvals',
            icon: UserCheck,
            badge: stats?.pendingApprovalsCount || (pending.doctors.length + pending.pharmacies.length + pending.hospitals.length),
            badgeColor: '#dc2626',
          },
          { id: 'users', label: language === 'hi' ? 'यूजर प्रबंधन' : 'Users Management', icon: Users, badge: stats?.totalUsers },
          { id: 'doctors', label: language === 'hi' ? 'डॉक्टर प्रबंधन' : 'Doctors', icon: Stethoscope, badge: stats?.totalDoctors },
          { id: 'hospitals', label: language === 'hi' ? 'अस्पताल प्रबंधन' : 'Hospitals', icon: Building2, badge: stats?.totalHospitals },
          {
            id: 'pharmacies',
            label: language === 'hi' ? 'मेडिकल व दवाइयां' : 'Medical Stores & Medicines',
            icon: Pill,
            badge: stats?.totalPharmacies,
          },
          { id: 'audit', label: language === 'hi' ? 'ऑडिट सुरक्षा ट्रेल' : 'Audit Trail', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedPharmacy(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: isActive ? '#ffffff' : 'transparent',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  style={{
                    background: tab.badgeColor || '#e2e8f0',
                    color: tab.badgeColor ? '#ffffff' : '#334155',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: OVERVIEW & PLATFORM STATS                          */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div>
          {loading ? (
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
              <SkeletonCard height="90px" />
              <SkeletonCard height="90px" />
              <SkeletonCard height="90px" />
              <SkeletonCard height="90px" />
              <SkeletonCard height="90px" />
              <SkeletonCard height="90px" />
            </div>
          ) : stats ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Registered Users</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{stats.totalUsers}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{stats.totalPatients} Citizens / Patients</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', borderLeft: '4px solid #dc2626' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Pending Provider Approvals</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>
                  {stats.pendingApprovalsCount || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Requires Admin Approval to unlock features</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Doctors & Clinicians</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>{stats.totalDoctors}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{stats.verifiedDoctors} Approved & Active</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Medical Stores / Pharmacies</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>{stats.totalPharmacies}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{stats.totalMedicines || 0} Uploaded Medicines in Stock</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', borderLeft: '4px solid #9333ea' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Hospitals & Trauma Centers</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#9333ea', marginTop: '0.2rem' }}>{stats.totalHospitals}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{stats.emergencyHospitals} 24/7 ER Facilities</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Medicine Delivery Orders</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7', marginTop: '0.2rem' }}>{stats.totalOrders}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Processed Across Medical Stores</div>
              </div>
            </div>
          ) : null}

          {/* Pending Verifications Urgent Banner in Overview */}
          {(pending.doctors.length > 0 || pending.pharmacies.length > 0 || pending.hospitals.length > 0) && (
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '10px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={24} color="#d97706" />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#92400e' }}>
                    {pending.doctors.length + pending.pharmacies.length + pending.hospitals.length} Healthcare Providers Pending Verification
                  </h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: '#b45309' }}>
                    Unapproved doctors, medical stores, and hospitals cannot access clinical workflows until you review their credentials.
                  </p>
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setActiveTab('approvals')}
                style={{ fontSize: '0.825rem', padding: '0.45rem 0.85rem' }}
              >
                Review Approvals Now &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PROVIDER APPROVALS HUB                             */}
      {/* ========================================================= */}
      {activeTab === 'approvals' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {language === 'hi' ? 'चिकित्सा प्रदाता सत्यापन कतार' : 'Healthcare Provider Credential Verification Queue'}
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
              {language === 'hi'
                ? 'डॉक्टर मेडिकल काउंसिल, दवा लाइसेंस (DL) एवं अस्पताल पंजीकरण की समीक्षा करें और मंजूरी दें।'
                : 'Approve or reject doctor medical council IDs, pharmacy drug licenses, and hospital trauma credentials.'}
            </p>
          </div>

          {pending.doctors.length === 0 && pending.pharmacies.length === 0 && pending.hospitals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <CheckCircle2 size={44} color="#16a34a" style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                All Provider Accounts are Verified
              </h4>
              <p style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>
                There are no pending doctor, medical store, or hospital verification requests.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Doctors Pending */}
              {pending.doctors.map((d) => (
                <div
                  key={d._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ background: '#e0f2fe', padding: '0.5rem', borderRadius: '8px' }}>
                      <Stethoscope size={20} color="#0284c7" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Doctor: {d.fullName}</strong>
                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                          Pending Audit
                        </span>
                      </div>
                      <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.2rem' }}>
                        <strong>Council Reg:</strong> {d.medicalRegistrationNumber} ({d.registrationCouncil}) &bull; <strong>Phone:</strong> {d.verifiedPhone}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Specialties: {d.specialties?.join(', ')} &bull; Fee: ₹{d.consultationFee} &bull; Clinic: {d.clinicAddress}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleDecision('DoctorProfile', d._id, 'approved')}
                      style={{ background: '#16a34a', padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      <Check size={14} /> Approve & Unlock
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleDecision('DoctorProfile', d._id, 'rejected')}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: '#dc2626' }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}

              {/* Pharmacies Pending */}
              {pending.pharmacies.map((p) => (
                <div
                  key={p._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '8px' }}>
                      <Pill size={20} color="#d97706" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Pharmacy: {p.storeName}</strong>
                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                          Pending DL Audit
                        </span>
                      </div>
                      <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.2rem' }}>
                        <strong>Drug License No:</strong> {p.drugLicenseNumber} &bull; <strong>GSTIN:</strong> {p.gstin || 'N/A'} &bull; <strong>Phone:</strong> {p.verifiedContactNumber}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Delivery Radius: {p.deliveryRadiusKm} km &bull; Address: {p.address?.street}, {p.address?.city}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleDecision('Pharmacy', p._id, 'approved')}
                      style={{ background: '#16a34a', padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      <Check size={14} /> Approve & Unlock
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleDecision('Pharmacy', p._id, 'rejected')}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: '#dc2626' }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}

              {/* Hospitals Pending */}
              {pending.hospitals.map((h) => (
                <div
                  key={h._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ background: '#fee2e2', padding: '0.5rem', borderRadius: '8px' }}>
                      <Building2 size={20} color="#dc2626" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Hospital: {h.hospitalName}</strong>
                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                          Pending NABH Audit
                        </span>
                      </div>
                      <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.2rem' }}>
                        <strong>Registration:</strong> {h.registrationNumber} &bull; <strong>Trauma Level:</strong> {h.traumaCareLevel} &bull; <strong>24/7 ER:</strong> {h.emergencyDepartmentAvailable ? 'Yes' : 'No'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Hotlines: {h.verifiedEmergencyNumbers?.join(', ')} &bull; Address: {h.address?.street}, {h.address?.city}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleDecision('Hospital', h._id, 'approved')}
                      style={{ background: '#16a34a', padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      <Check size={14} /> Approve & Unlock
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleDecision('Hospital', h._id, 'rejected')}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: '#dc2626' }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: USER CRUD MANAGEMENT                               */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                System User Management
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                View, create, edit roles/statuses, or delete user accounts across the platform
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingUser(null);
                setUserForm({ phone: '', email: '', password: '', role: 'patient', status: 'active', isVerified: true });
                setShowUserModal(true);
              }}
              style={{ fontSize: '0.825rem', padding: '0.45rem 0.85rem' }}
            >
              <Plus size={15} /> Add New User
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by phone or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2.1rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
            >
              <option value="all">All Roles</option>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="hospital">Hospital</option>
              <option value="admin">Admin</option>
            </select>

            <button className="btn btn-outline" onClick={loadUsers} style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}>
              Search
            </button>
          </div>

          {/* Users Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Phone & Email</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Role</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Account Status</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Verified</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.phone}</div>
                      {u.email && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span
                        style={{
                          background: u.role === 'admin' ? '#fee2e2' : u.role === 'doctor' ? '#dcfce7' : u.role === 'pharmacy' ? '#fef3c7' : '#eff6ff',
                          color: u.role === 'admin' ? '#991b1b' : u.role === 'doctor' ? '#166534' : u.role === 'pharmacy' ? '#92400e' : '#1d4ed8',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span
                        style={{
                          color: u.status === 'active' ? '#16a34a' : u.status === 'pending' ? '#d97706' : '#dc2626',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                        }}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {u.isVerified ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Verified</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setUserForm({ phone: u.phone, email: u.email || '', role: u.role, status: u.status, isVerified: u.isVerified, password: '' });
                            setShowUserModal(true);
                          }}
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                          title="Edit User"
                        >
                          <Edit size={13} color="#334155" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                          title="Delete User"
                        >
                          <Trash2 size={13} color="#dc2626" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: DOCTORS CRUD MANAGEMENT                            */}
      {/* ========================================================= */}
      {activeTab === 'doctors' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Doctor Clinicians Registry
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Manage clinician credentials, council registration, consultation fees, and verification status
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingDoctor(null);
                setDoctorForm({ fullName: '', phone: '', medicalRegistrationNumber: '', registrationCouncil: 'State Medical Council', specialties: 'General Medicine', consultationFee: 500, clinicAddress: '', isVerified: true });
                setShowDoctorModal(true);
              }}
              style={{ fontSize: '0.825rem', padding: '0.45rem 0.85rem' }}
            >
              <Plus size={15} /> Add New Doctor
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Doctor Name</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Council Reg & Phone</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Specialties</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Fee</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Approval</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctorsList.map((d) => (
                  <tr key={d._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.clinicAddress || 'Hospital Roster'}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{d.medicalRegistrationNumber}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.verifiedPhone}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{d.specialties?.join(', ')}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>₹{d.consultationFee}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span
                        style={{
                          background: d.isVerified ? '#dcfce7' : '#fef3c7',
                          color: d.isVerified ? '#166534' : '#92400e',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '0.725rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        {d.verificationStatus || (d.isVerified ? 'Approved' : 'Pending')}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => {
                            setEditingDoctor(d);
                            setDoctorForm({
                              fullName: d.fullName,
                              phone: d.verifiedPhone,
                              medicalRegistrationNumber: d.medicalRegistrationNumber,
                              registrationCouncil: d.registrationCouncil || 'State Medical Council',
                              specialties: d.specialties?.join(', ') || 'General Medicine',
                              consultationFee: d.consultationFee || 500,
                              clinicAddress: d.clinicAddress || '',
                              isVerified: d.isVerified,
                            });
                            setShowDoctorModal(true);
                          }}
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                          title="Edit Doctor"
                        >
                          <Edit size={13} color="#334155" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(d._id)}
                          style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                          title="Delete Doctor"
                        >
                          <Trash2 size={13} color="#dc2626" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: HOSPITALS CRUD MANAGEMENT                          */}
      {/* ========================================================= */}
      {activeTab === 'hospitals' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Hospital Facilities & Trauma Centers
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Manage verified hospital emergency facilities, trauma levels, hotlines, and bed matrices
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingHospital(null);
                setHospitalForm({ hospitalName: '', registrationNumber: '', verifiedEmergencyNumbers: '', addressStreet: '', addressCity: 'Delhi', traumaCareLevel: 'Level 1', isVerified: true });
                setShowHospitalModal(true);
              }}
              style={{ fontSize: '0.825rem', padding: '0.45rem 0.85rem' }}
            >
              <Plus size={15} /> Add New Hospital
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Hospital Name</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Reg No & Trauma Level</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Emergency Hotlines</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Available Beds</th>
                  <th style={{ padding: '0.65rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitalsList.map((h) => {
                  const freeBeds =
                    (h.beds?.icu?.available || 0) +
                    (h.beds?.emergency?.available || 0) +
                    (h.beds?.oxygen?.available || 0) +
                    (h.beds?.general?.available || 0);

                  return (
                    <tr key={h._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{h.hospitalName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{h.address?.street}, {h.address?.city}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{h.registrationNumber}</div>
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>{h.traumaCareLevel}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#2563eb' }}>{h.verifiedEmergencyNumbers?.join(', ')}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#16a34a' }}>
                        {freeBeds} Free
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span
                          style={{
                            background: h.isVerified ? '#dcfce7' : '#fef3c7',
                            color: h.isVerified ? '#166534' : '#92400e',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.725rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          {h.verificationStatus || (h.isVerified ? 'Approved' : 'Pending')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => {
                              setEditingHospital(h);
                              setHospitalForm({
                                hospitalName: h.hospitalName,
                                registrationNumber: h.registrationNumber,
                                verifiedEmergencyNumbers: h.verifiedEmergencyNumbers?.join(', ') || '',
                                addressStreet: h.address?.street || '',
                                addressCity: h.address?.city || 'Delhi',
                                traumaCareLevel: h.traumaCareLevel || 'Level 1',
                                isVerified: h.isVerified,
                              });
                              setShowHospitalModal(true);
                            }}
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            title="Edit Hospital"
                          >
                            <Edit size={13} color="#334155" />
                          </button>
                          <button
                            onClick={() => handleDeleteHospital(h._id)}
                            style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            title="Delete Hospital"
                          >
                            <Trash2 size={13} color="#dc2626" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: MEDICAL STORES, MEDICINES & ORDERS MANAGEMENT       */}
      {/* ========================================================= */}
      {activeTab === 'pharmacies' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedPharmacy ? '1fr 1.5fr' : '1fr', gap: '1.5rem' }}>
          {/* Left: Pharmacies List */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Medical Stores / Pharmacies ({pharmaciesList.length})
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                  Click a medical store to inspect uploaded medicines and received delivery orders
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => {
                  setPharmacyForm({ storeName: '', drugLicenseNumber: '', phone: '', addressStreet: '', homeDeliveryAvailable: true, deliveryRadiusKm: 10, isVerified: true });
                  setShowAddPharmacyModal(true);
                }}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                <Plus size={14} /> Add Pharmacy
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pharmaciesList.map((p) => {
                const isSelected = selectedPharmacy?._id === p._id;

                return (
                  <div
                    key={p._id}
                    onClick={() => {
                      setSelectedPharmacy(p);
                      loadPharmacyDetails(p._id);
                    }}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{p.storeName}</strong>
                      <span
                        style={{
                          background: p.isVerified ? '#dcfce7' : '#fef3c7',
                          color: p.isVerified ? '#166534' : '#92400e',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        {p.isVerified ? 'Approved' : 'Pending'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      DL: {p.drugLicenseNumber} &bull; Contact: {p.verifiedContactNumber}
                    </div>

                    {/* Stats Ribbon */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.65rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.45rem', fontSize: '0.75rem' }}>
                      <span style={{ color: '#059669', fontWeight: 700 }}>
                        💊 {p.totalMedicines || 0} Medicines Uploaded
                      </span>
                      <span style={{ color: '#2563eb', fontWeight: 700 }}>
                        📦 {p.totalOrders || 0} Orders Received
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePharmacy(p._id);
                        }}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}
                        title="Delete Pharmacy"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Pharmacy Detail (Medicines & Orders) */}
          {selectedPharmacy && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Pill size={20} color="#059669" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                      {selectedPharmacy.storeName}
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                    DL: {selectedPharmacy.drugLicenseNumber} &bull; Phone: {selectedPharmacy.verifiedContactNumber} &bull; Delivery Radius: {selectedPharmacy.deliveryRadiusKm} km
                  </p>
                </div>

                <button
                  onClick={() => setSelectedPharmacy(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              </div>

              {/* Pharmacy Quick Order Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Total Orders Received</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1d4ed8' }}>{pharmacyOrdersStats?.totalOrders || pharmacyOrders.length}</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Medicines Stocked</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>{pharmacyMedicines.length}</div>
                </div>
                <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 600, textTransform: 'uppercase' }}>Total Orders Value</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>₹{pharmacyOrdersStats?.totalAmount || 0}</div>
                </div>
              </div>

              {/* Sub-section 1: UPLOADED MEDICINES CRUD */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Uploaded Medicines Inventory ({pharmacyMedicines.length})
                  </h4>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowAddMedicineModal(true)}
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', background: '#059669' }}
                  >
                    <Plus size={13} /> Add Medicine
                  </button>
                </div>

                {pharmacyMedicines.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem', background: '#f8fafc', borderRadius: '8px' }}>
                    No medicines uploaded by this pharmacy yet. Click "Add Medicine" to upload stock.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', maxHeight: '240px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: '0.725rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '0.45rem 0.35rem' }}>Medicine Name</th>
                          <th style={{ padding: '0.45rem 0.35rem' }}>Generic / Brand</th>
                          <th style={{ padding: '0.45rem 0.35rem' }}>Price</th>
                          <th style={{ padding: '0.45rem 0.35rem' }}>Quantity</th>
                          <th style={{ padding: '0.45rem 0.35rem' }}>Batch</th>
                          <th style={{ padding: '0.45rem 0.35rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pharmacyMedicines.map((m) => (
                          <tr key={m._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.5rem 0.35rem', fontWeight: 600 }}>{m.medicineName}</td>
                            <td style={{ padding: '0.5rem 0.35rem', color: '#64748b' }}>{m.genericName || m.brandName || '-'}</td>
                            <td style={{ padding: '0.5rem 0.35rem', fontWeight: 700, color: '#0f172a' }}>₹{m.unitPrice}</td>
                            <td style={{ padding: '0.5rem 0.35rem' }}>
                              <span style={{ color: m.availableQuantity > 10 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                                {m.availableQuantity}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem 0.35rem', fontSize: '0.75rem', color: '#94a3b8' }}>{m.batchNumber || '-'}</td>
                            <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handleDeleteMedicine(m._id)}
                                style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '0.2rem 0.4rem', borderRadius: '4px', cursor: 'pointer' }}
                                title="Delete Medicine"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sub-section 2: ORDERS RECEIVED BY THIS PHARMACY */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: '#0f172a' }}>
                  Orders Received by this Medical Store ({pharmacyOrders.length})
                </h4>

                {pharmacyOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem', background: '#f8fafc', borderRadius: '8px' }}>
                    No delivery orders received by this medical store yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
                    {pharmacyOrders.map((ord) => (
                      <div
                        key={ord._id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          background: '#f8fafc',
                          fontSize: '0.8rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>Order #{ord.orderId}</span>
                          <span style={{ fontWeight: 800, color: '#2563eb' }}>₹{ord.totalAmount}</span>
                        </div>

                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                          Deliver to: {ord.deliveryAddress?.patientName} &bull; {ord.deliveryAddress?.contactPhone} &bull; {ord.deliveryAddress?.street}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                            Items: {ord.items?.map((it) => `${it.medicineName} (x${it.quantity})`).join(', ')}
                          </span>

                          <select
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.orderId, e.target.value)}
                            style={{
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: '#ffffff',
                            }}
                          >
                            <option value="placed">Placed</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="packed">Packed</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: AUDIT SECURITY TRAIL                               */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
            Administrative Security Audit Trail
          </h3>

          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              No administrative audit actions recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Action</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Target Entity</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Admin User</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#0f172a' }}>{log.action}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>{log.targetEntity}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>{log.actorUserId?.email || log.actorUserId?.phone || 'Admin'}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PURGE SEEDED DEMO DATA                             */}
      {/* ========================================================= */}
      {showPurgeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '480px', width: '100%', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                <Trash2 size={20} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Purge Seeded Demo Data</h3>
              </div>
              <button onClick={() => setShowPurgeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4, marginBottom: '1.25rem' }}>
              Select which category of mock/seeded records you want to delete. This helps clear demo orders, cases, and test inventory before production testing.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.4rem', color: '#334155' }}>
                Select Purge Scope
              </label>
              <select
                value={purgeTarget}
                onChange={(e) => setPurgeTarget(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
              >
                <option value="all">Full Purge: All Demo Cases, Orders & Test Items</option>
                <option value="cases">Demo Emergency Cases & Triage Records Only</option>
                <option value="orders">Demo Pharmacy Delivery Orders Only</option>
                <option value="medicines">All Uploaded Pharmacy Inventory Only</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button className="btn btn-outline" onClick={() => setShowPurgeModal(false)} style={{ fontSize: '0.85rem' }}>
                Cancel
              </button>
              <button
                onClick={handlePurgeData}
                disabled={purgeLoading}
                className="btn btn-danger"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', fontWeight: 700 }}
              >
                {purgeLoading ? 'Purging...' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT USER                                    */}
      {/* ========================================================= */}
      {showUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '480px', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 1rem 0' }}>
              {editingUser ? 'Edit User Account' : 'Create New User Account'}
            </h3>

            <form onSubmit={handleSaveUser}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Phone Number *</label>
                <input
                  type="text"
                  required
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="+919876543210"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Email Address</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="user@example.com"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {editingUser ? 'Reset Password (Leave blank to keep)' : 'Password *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Role</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="hospital">Hospital</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Account Status</label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowUserModal(false)} style={{ fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD MEDICINE TO PHARMACY                           */}
      {/* ========================================================= */}
      {showAddMedicineModal && selectedPharmacy && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '480px', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 1rem 0' }}>
              Add Medicine to {selectedPharmacy.storeName}
            </h3>

            <form onSubmit={handleAddMedicineToPharmacy}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Medicine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 650mg"
                  value={medicineForm.medicineName}
                  onChange={(e) => setMedicineForm({ ...medicineForm, medicineName: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Generic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acetaminophen"
                    value={medicineForm.genericName}
                    onChange={(e) => setMedicineForm({ ...medicineForm, genericName: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Dosage Form</label>
                  <select
                    value={medicineForm.dosageForm}
                    onChange={(e) => setMedicineForm({ ...medicineForm, dosageForm: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="ointment">Ointment</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={medicineForm.unitPrice}
                    onChange={(e) => setMedicineForm({ ...medicineForm, unitPrice: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={medicineForm.availableQuantity}
                    onChange={(e) => setMedicineForm({ ...medicineForm, availableQuantity: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddMedicineModal(false)} style={{ fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700, background: '#059669' }}>Save Medicine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD PHARMACY                                       */}
      {/* ========================================================= */}
      {showAddPharmacyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', maxWidth: '480px', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Register New Medical Store</h3>
            <form onSubmit={handleSavePharmacy}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo Medicals"
                  value={pharmacyForm.storeName}
                  onChange={(e) => setPharmacyForm({ ...pharmacyForm, storeName: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Drug License (DL No) *</label>
                  <input
                    type="text"
                    required
                    placeholder="DL-2026-XXXX"
                    value={pharmacyForm.drugLicenseNumber}
                    onChange={(e) => setPharmacyForm({ ...pharmacyForm, drugLicenseNumber: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Contact Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+919876543210"
                    value={pharmacyForm.phone}
                    onChange={(e) => setPharmacyForm({ ...pharmacyForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>Street Address</label>
                <input
                  type="text"
                  placeholder="Main Market Road, City"
                  value={pharmacyForm.addressStreet}
                  onChange={(e) => setPharmacyForm({ ...pharmacyForm, addressStreet: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddPharmacyModal(false)} style={{ fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Save Pharmacy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
