import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import intakeRoutes from './routes/intakeRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import pharmacyRoutes from './routes/pharmacyRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import nearbyRoutes from './routes/nearbyRoutes.js';
import medicineRoutes from './routes/medicineRoutes.js';
import consultationRoutes from './routes/consultationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const createApp = () => {
  const app = express();

  // Security headers & CORS
  app.use(helmet());
  app.use(cors());

  // Request parsing
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Logging in non-test mode
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Rate Limiting (Emergency bypass: never block emergency triage or escalation calls!)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Never block emergency triage or escalate endpoints
      return (
        req.path.includes('/api/v1/cases') &&
        (req.body?.severity === 'severe' || req.path.includes('/escalate'))
      );
    },
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api/', apiLimiter);

  // Health checks
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'mediresq-backend',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'MediResQ Backend API Service',
      version: '0.1.0',
      health: '/health',
      docs: '/api/v1',
    });
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/patients', patientRoutes);
  app.use('/api/v1/intake', intakeRoutes);
  app.use('/api/v1/cases', caseRoutes);
  app.use('/api/v1/doctors', doctorRoutes);
  app.use('/api/v1/pharmacies', pharmacyRoutes);
  app.use('/api/v1/hospitals', hospitalRoutes);
  app.use('/api/v1/nearby', nearbyRoutes);
  app.use('/api/v1/medicines', medicineRoutes);
  app.use('/api/v1/consultations', consultationRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/uploads', uploadRoutes);
  app.use('/api/v1/admin', adminRoutes);


  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Endpoint not found: ${req.method} ${req.url}`,
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp();
