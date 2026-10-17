import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async (customUri) => {
  const uri = customUri || config.mongoUri;
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`[MediResQ DB] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MediResQ DB] MongoDB Connection Error: ${error.message}`);
    if (config.env === 'production') {
      process.exit(1);
    }
    console.warn('[MediResQ DB] Operating with local fallback or mock state.');
    return null;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('[MediResQ DB] MongoDB Disconnected.');
  } catch (err) {
    console.error('[MediResQ DB] Disconnect error:', err.message);
  }
};
