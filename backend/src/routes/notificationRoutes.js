import { Router } from 'express';
import { getMyNotifications, markNotificationRead } from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getMyNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;
