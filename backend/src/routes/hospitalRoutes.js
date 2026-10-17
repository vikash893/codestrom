import { Router } from 'express';
import {
  createOrUpdateHospital,
  getHospital,
  listHospitals,
} from '../controllers/hospitalController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.get('/', listHospitals);
router.get('/:id', getHospital);

// Protected routes (Hospital admin/representative)
router.post('/register', authenticate, authorize('hospital', 'admin'), createOrUpdateHospital);
router.put('/profile', authenticate, authorize('hospital', 'admin'), createOrUpdateHospital);

export default router;
