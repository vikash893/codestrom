import { Router } from 'express';
import {
  requestConsultation,
  getMyConsultations,
  getConsultationById,
  updateConsultationStatus,
  submitClinicalNotes,
} from '../controllers/consultationController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Protect all consultation routes
router.use(authenticate);

router.post('/request', authorize('patient'), requestConsultation);
router.get('/my', getMyConsultations);
router.get('/:id', getConsultationById);
router.patch('/:id/status', authorize('doctor', 'admin'), updateConsultationStatus);
router.post('/:id/notes', authorize('doctor', 'admin'), submitClinicalNotes);

export default router;
