import express from 'express';
import {
  createOrder,
  getPatientOrders,
  getPharmacyOrders,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Patient routes
router.post('/', authenticate, createOrder);
router.get('/my-orders', authenticate, getPatientOrders);

// Pharmacy routes
router.get('/pharmacy-orders', authenticate, authorize('pharmacy', 'admin'), getPharmacyOrders);
router.patch('/:orderId/status', authenticate, authorize('pharmacy', 'admin'), updateOrderStatus);

export default router;
