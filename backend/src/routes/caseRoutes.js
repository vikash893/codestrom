import express from 'express';
import {
  createCase,
  getCaseById,
  getPriorityQueue,
  acknowledgeCase,
  acceptCase,
  declineCase,
  escalateCase,
} from '../controllers/caseController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Patient creates prioritized case with deterministic triage
router.post('/', authenticate, createCase);

// Providers query priority queue sorted by SLA and waiting-time aging
router.get(
  '/queue',
  authenticate,
  authorize('doctor', 'hospital', 'admin'),
  getPriorityQueue
);

// Clinician acknowledges case (starts SLA timer)
router.post(
  '/:caseId/acknowledge',
  authenticate,
  authorize('doctor', 'hospital', 'admin'),
  acknowledgeCase
);

// Atomic claim: clinician accepts case
router.post(
  '/:caseId/accept',
  authenticate,
  authorize('doctor', 'hospital', 'admin'),
  acceptCase
);

// Clinician declines or releases case back to queue
router.post(
  '/:caseId/decline',
  authenticate,
  authorize('doctor', 'hospital', 'admin'),
  declineCase
);

// Escalates deteriorating case to P0 EMERGENCY
router.post(
  '/:caseId/escalate',
  authenticate,
  authorize('doctor', 'hospital', 'admin'),
  escalateCase
);

// Get case details by ID
router.get('/:caseId', authenticate, getCaseById);

export default router;
