import { User } from '../models/User.js';

export const ADMIN_EMAIL = 'vikashbhardwaj430@gmail.com';
export const ADMIN_PASSWORD = 'Vi@12345';
export const ADMIN_PHONE = '+919999999999';

/**
 * Ensures the specified administrator user exists and is active.
 * Idempotent: can be called repeatedly without duplicating.
 */
export const seedDefaultAdmin = async () => {
  try {
    const passwordHash = await User.hashPassword(ADMIN_PASSWORD);

    let admin = await User.findOne({
      $or: [{ email: ADMIN_EMAIL.toLowerCase() }, { phone: ADMIN_PHONE }],
    });

    if (admin) {
      admin.email = ADMIN_EMAIL.toLowerCase();
      admin.phone = ADMIN_PHONE;
      admin.passwordHash = passwordHash;
      admin.role = 'admin';
      admin.status = 'active';
      admin.isVerified = true;
      await admin.save();
      console.log(`[MediResQ Seed] Default Admin (${ADMIN_EMAIL}) verified and updated.`);
      return admin;
    }

    admin = await User.create({
      phone: ADMIN_PHONE,
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: 'admin',
      status: 'active',
      isVerified: true,
    });

    console.log(`[MediResQ Seed] Default Admin (${ADMIN_EMAIL}) successfully seeded.`);
    return admin;
  } catch (error) {
    console.error('[MediResQ Seed] Failed to seed default admin:', error.message);
  }
};
