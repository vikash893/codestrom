import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediresq',
  jwtSecret: process.env.JWT_SECRET || 'mediresq-dev-super-secure-jwt-secret-key-32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  emergencyDispatchNumber: process.env.EMERGENCY_DISPATCH_NUMBER || '112',
};
