import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  addEmergencyContact,
  getHistory,
} from '../controllers/patientController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Protect all patient routes to authenticated patients
router.use(authenticate, authorize('patient', 'admin'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/emergency-contacts', addEmergencyContact);
router.get('/history', getHistory);

export default router;
