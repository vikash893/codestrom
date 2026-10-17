import { Router } from 'express';
import {
  createOrUpdatePharmacy,
  getPharmacy,
  addInventoryItem,
  updateInventoryItem,
  getInventory,
  getLowStockAlerts,
} from '../controllers/pharmacyController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.get('/:id', getPharmacy);
router.get('/:pharmacyId/inventory', getInventory);

// Protected routes (Pharmacy owner only)
router.post('/register', authenticate, authorize('pharmacy', 'admin'), createOrUpdatePharmacy);
router.put('/profile', authenticate, authorize('pharmacy', 'admin'), createOrUpdatePharmacy);
router.post('/inventory', authenticate, authorize('pharmacy', 'admin'), addInventoryItem);
router.put('/inventory/:itemId', authenticate, authorize('pharmacy', 'admin'), updateInventoryItem);
router.get('/inventory/alerts/low-stock', authenticate, authorize('pharmacy', 'admin'), getLowStockAlerts);

export default router;
