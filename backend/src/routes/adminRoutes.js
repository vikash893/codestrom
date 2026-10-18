import { Router } from 'express';
import {
  getPendingVerifications,
  reviewVerification,
  getPlatformStats,
  getAuditLogs,
  toggleUserSuspension,
  // User CRUD
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  // Doctor CRUD
  listDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  // Hospital CRUD
  listAllHospitals,
  createHospital,
  updateHospital,
  deleteHospital,
  // Pharmacy CRUD
  listPharmacies,
  getPharmacyDetails,
  createPharmacy,
  updatePharmacy,
  deletePharmacy,
  // Medicines CRUD (per pharmacy)
  getPharmacyMedicines,
  addPharmacyMedicine,
  updateMedicine,
  deleteMedicine,
  // Orders CRUD (per pharmacy)
  getPharmacyOrders,
  updateOrderStatus,
  // Purge Seed Data
  purgeSeedData,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Strictly protect all admin routes to Admin role only
router.use(authenticate, authorize('admin'));

// 1. Stats, Pending Approvals, & Audit
router.get('/stats', getPlatformStats);
router.get('/verifications/pending', getPendingVerifications);
router.post('/verifications/decision', reviewVerification);
router.get('/audit-logs', getAuditLogs);
router.post('/purge-seed-data', purgeSeedData);

// 2. User CRUD & Suspension
router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/suspension', toggleUserSuspension);

// 3. Doctor CRUD
router.get('/doctors', listDoctors);
router.post('/doctors', createDoctor);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);

// 4. Hospital CRUD
router.get('/hospitals', listAllHospitals);
router.post('/hospitals', createHospital);
router.put('/hospitals/:id', updateHospital);
router.delete('/hospitals/:id', deleteHospital);

// 5. Pharmacy (Medical Store) CRUD
router.get('/pharmacies', listPharmacies);
router.get('/pharmacies/:id', getPharmacyDetails);
router.post('/pharmacies', createPharmacy);
router.put('/pharmacies/:id', updatePharmacy);
router.delete('/pharmacies/:id', deletePharmacy);

// 6. Medicines for a specific Pharmacy
router.get('/pharmacies/:id/medicines', getPharmacyMedicines);
router.post('/pharmacies/:id/medicines', addPharmacyMedicine);
router.put('/medicines/:medicineId', updateMedicine);
router.delete('/medicines/:medicineId', deleteMedicine);

// 7. Orders for a specific Pharmacy
router.get('/pharmacies/:id/orders', getPharmacyOrders);
router.patch('/orders/:orderId/status', updateOrderStatus);

export default router;
