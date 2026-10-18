import { Router } from 'express';
import {
  createOrUpdatePharmacy,
  getPharmacy,
  getMyPharmacy,
  addInventoryItem,
  updateInventoryItem,
  getInventory,
  getLowStockAlerts,
} from '../controllers/pharmacyController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Protected routes for current pharmacy
router.get('/my/profile', authenticate, authorize('pharmacy', 'admin'), getMyPharmacy);
router.get('/my/inventory', authenticate, authorize('pharmacy', 'admin'), getMyPharmacy);
router.get('/inventory/alerts/low-stock', authenticate, authorize('pharmacy', 'admin'), getLowStockAlerts);
router.post('/register', authenticate, authorize('pharmacy', 'admin'), createOrUpdatePharmacy);
router.put('/profile', authenticate, authorize('pharmacy', 'admin'), createOrUpdatePharmacy);
router.post('/inventory', authenticate, authorize('pharmacy', 'admin'), addInventoryItem);
router.put('/inventory/:itemId', authenticate, authorize('pharmacy', 'admin'), updateInventoryItem);

// Public routes
router.get('/:id', getPharmacy);
router.get('/:pharmacyId/inventory', getInventory);

export default router;
