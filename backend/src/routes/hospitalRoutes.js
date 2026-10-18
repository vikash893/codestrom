import { Router } from 'express';
import {
  createOrUpdateHospital,
  getMyHospital,
  getHospitalRequests,
  reserveHospitalBed,
  scheduleHospitalDoctor,
  updateBedReservationStatus,
  getHospital,
  listHospitals,
} from '../controllers/hospitalController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Protected routes (Hospital admin/representative)
router.get('/me', authenticate, authorize('hospital', 'admin'), getMyHospital);
router.get('/my/requests', authenticate, authorize('hospital', 'admin'), getHospitalRequests);
router.post('/my/reserve-bed', authenticate, authorize('hospital', 'admin'), reserveHospitalBed);
router.post('/my/schedule-doctor', authenticate, authorize('hospital', 'admin'), scheduleHospitalDoctor);
router.patch('/my/beds/:reservationId/status', authenticate, authorize('hospital', 'admin'), updateBedReservationStatus);
router.post('/register', authenticate, authorize('hospital', 'admin'), createOrUpdateHospital);
router.put('/profile', authenticate, authorize('hospital', 'admin'), createOrUpdateHospital);

// Public routes
router.get('/', listHospitals);
router.get('/:id', getHospital);

export default router;
