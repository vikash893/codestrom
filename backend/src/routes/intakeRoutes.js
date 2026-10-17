import { Router } from 'express';
import { submitIntake, getIntakeById } from '../controllers/intakeController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Patients can submit intake; doctors, patients, and admins can read authorized intakes
router.post('/', authenticate, authorize('patient'), submitIntake);
router.get('/:id', authenticate, getIntakeById);

export default router;
