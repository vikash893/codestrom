import { Router } from 'express';
import {
  createOrUpdateProfile,
  toggleAvailability,
  getDoctorProfile,
  listDoctors,
} from '../controllers/doctorController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.get('/', listDoctors);
router.get('/:id', getDoctorProfile);

// Protected routes (Doctor only)
router.post('/profile', authenticate, authorize('doctor', 'admin'), createOrUpdateProfile);
router.put('/profile', authenticate, authorize('doctor', 'admin'), createOrUpdateProfile);
router.patch('/availability', authenticate, authorize('doctor', 'admin'), toggleAvailability);

export default router;
