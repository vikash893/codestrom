import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './testHelper.js';
import { seedDefaultAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from '../src/utils/seedAdmin.js';

const app = createApp();
let adminToken;

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();
  await seedDefaultAdmin();

  // Login as seeded admin
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    phoneOrEmail: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.user.role, 'admin');
  assert.equal(loginRes.body.user.email, ADMIN_EMAIL);
  adminToken = loginRes.body.token;
});

test('Admin can login with seeded credentials and query full platform stats', async () => {
  const statsRes = await request(app)
    .get('/api/v1/admin/stats')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(statsRes.status, 200);
  assert.equal(statsRes.body.success, true);
  assert.ok(statsRes.body.stats.totalUsers >= 1);
});

test('Admin User CRUD workflow', async () => {
  // 1. Create a user
  const createRes = await request(app)
    .post('/api/v1/admin/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      phone: '+919876500001',
      email: 'testuser@mediresq.org',
      password: 'UserPass@123',
      role: 'patient',
      fullName: 'Test Patient',
    });

  assert.equal(createRes.status, 201);
  const userId = createRes.body.user._id;

  // 2. List users
  const listRes = await request(app)
    .get('/api/v1/admin/users?search=testuser')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.users.length, 1);

  // 3. Update user
  const updateRes = await request(app)
    .put(`/api/v1/admin/users/${userId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      status: 'suspended',
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.user.status, 'suspended');

  // 4. Delete user
  const delRes = await request(app)
    .delete(`/api/v1/admin/users/${userId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(delRes.status, 200);
});

test('Admin Pharmacy, Medicines, and Orders CRUD workflow', async () => {
  // 1. Create Pharmacy
  const createPharm = await request(app)
    .post('/api/v1/admin/pharmacies')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      storeName: 'MedPlus City Pharmacy',
      drugLicenseNumber: 'DL-MEDPLUS-9900',
      phone: '+919876500002',
      homeDeliveryAvailable: true,
      deliveryRadiusKm: 15,
      isVerified: true,
      verificationStatus: 'approved',
    });

  assert.equal(createPharm.status, 201);
  const pharmId = createPharm.body.pharmacy._id;

  // 2. Add medicine to this pharmacy
  const addMed = await request(app)
    .post(`/api/v1/admin/pharmacies/${pharmId}/medicines`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      medicineName: 'Azithromycin 500mg Tablet',
      genericName: 'Azithromycin',
      availableQuantity: 40,
      unitPrice: 120,
      dosageForm: 'tablet',
    });

  assert.equal(addMed.status, 201);
  const medId = addMed.body.medicine._id;

  // 3. Get medicines of this pharmacy
  const listMed = await request(app)
    .get(`/api/v1/admin/pharmacies/${pharmId}/medicines`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(listMed.status, 200);
  assert.equal(listMed.body.medicines.length, 1);
  assert.equal(listMed.body.medicines[0].medicineName, 'Azithromycin 500mg Tablet');

  // 4. Edit medicine
  const editMed = await request(app)
    .put(`/api/v1/admin/medicines/${medId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      unitPrice: 135,
      availableQuantity: 55,
    });

  assert.equal(editMed.status, 200);
  assert.equal(editMed.body.medicine.unitPrice, 135);

  // 5. Query pharmacy orders
  const ordersRes = await request(app)
    .get(`/api/v1/admin/pharmacies/${pharmId}/orders`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(ordersRes.status, 200);
  assert.equal(ordersRes.body.stats.totalOrders, 0);

  // 6. Delete medicine
  const delMed = await request(app)
    .delete(`/api/v1/admin/medicines/${medId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(delMed.status, 200);

  // 7. Delete pharmacy
  const delPharm = await request(app)
    .delete(`/api/v1/admin/pharmacies/${pharmId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(delPharm.status, 200);
});

test('Admin can purge seeded and demo data', async () => {
  const purgeRes = await request(app)
    .post('/api/v1/admin/purge-seed-data')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ target: 'all' });

  assert.equal(purgeRes.status, 200);
  assert.equal(purgeRes.body.success, true);
});
