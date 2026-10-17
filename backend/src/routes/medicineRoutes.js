import { Router } from 'express';
import {
  searchMedicines,
  addCanonicalMedicine,
  matchInventory,
} from '../controllers/medicineController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.get('/search', searchMedicines);
router.get('/match-inventory', matchInventory);

// Protected routes (Admin only)
router.post('/catalogue', authenticate, authorize('admin'), addCanonicalMedicine);

export default router;
