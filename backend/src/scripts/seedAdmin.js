import { connectDB, disconnectDB } from '../config/db.js';
import { seedDefaultAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from '../utils/seedAdmin.js';

const run = async () => {
  console.log('[Script] Connecting to database...');
  await connectDB();
  console.log('[Script] Seeding admin user...');
  await seedDefaultAdmin();
  console.log(`[Script] Completed. Credentials: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  await disconnectDB();
  process.exit(0);
};

run().catch((err) => {
  console.error('[Script] Fatal error:', err);
  process.exit(1);
});
