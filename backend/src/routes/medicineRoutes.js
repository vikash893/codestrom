import { Router } from 'express';
import {
  searchMedicines,
  addCanonicalMedicine,
  matchInventory,
  checkCartAvailability,
} from '../controllers/medicineController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.get('/search', searchMedicines);
router.get('/match-inventory', matchInventory);
router.post('/check-cart-availability', checkCartAvailability);

// Protected routes (Admin only)
router.post('/catalogue', authenticate, authorize('admin'), addCanonicalMedicine);

export default router;
