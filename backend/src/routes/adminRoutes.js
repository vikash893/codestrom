import { Router } from 'express';
import {
  getPendingVerifications,
  reviewVerification,
  getPlatformStats,
  getAuditLogs,
  toggleUserSuspension,
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Strictly protect all admin routes to Admin role only
router.use(authenticate, authorize('admin'));

router.get('/verifications/pending', getPendingVerifications);
router.post('/verifications/decision', reviewVerification);
router.get('/stats', getPlatformStats);
router.get('/audit-logs', getAuditLogs);
router.post('/users/suspension', toggleUserSuspension);

export default router;
