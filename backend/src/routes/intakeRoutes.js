import { Router } from 'express';
import { submitIntake, getIntakeById } from '../controllers/intakeController.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.js';

const router = Router();

// Allow both unauthenticated guests and authenticated patients to submit intake
router.post('/', optionalAuthenticate, submitIntake);
router.get('/:id', authenticate, getIntakeById);

export default router;
