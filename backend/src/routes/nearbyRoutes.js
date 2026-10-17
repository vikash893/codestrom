import { Router } from 'express';
import { getNearbyHealthcare } from '../controllers/nearbyController.js';

const router = Router();

router.get('/', getNearbyHealthcare);

export default router;
