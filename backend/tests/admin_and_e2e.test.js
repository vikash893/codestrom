import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './testHelper.js';
import { User } from '../src/models/User.js';
import { DoctorProfile } from '../src/models/DoctorProfile.js';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';

const app = createApp();

let adminToken;
let adminUserId;

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  // Seed Admin user directly in DB
  const adminPasswordHash = await User.hashPassword('adminSuperSecret123');
  const admin = await User.create({
    phone: '+919999000000',
    email: 'admin@mediresq.org',
    passwordHash: adminPasswordHash,
    role: 'admin',
    status: 'active',
    isVerified: true,
  });

  adminUserId = admin._id;
  adminToken = jwt.sign({ id: admin._id, role: 'admin' }, config.jwtSecret);
});

test('Ordinary users are blocked from admin endpoints (403 Forbidden)', async () => {
  // Register patient
  const pReg = await request(app).post('/api/v1/auth/register').send({
    phone: '+919811778899',
    password: 'password123',
    fullName: 'Patient Normal',
    role: 'patient',
  });
  const patientToken = pReg.body.token;

  const res = await request(app)
    .get('/api/v1/admin/stats')
    .set('Authorization', `Bearer ${patientToken}`);

  assert.equal(res.status, 403);
});

test('Admin verifications, audit logs, platform statistics, and account suspension', async () => {
  // 1. Doctor registers
  const docReg = await request(app).post('/api/v1/auth/register').send({
    phone: '+919811554433',
    password: 'doctorpass123',
    fullName: 'Dr. Vivek Malhotra',
    role: 'doctor',
  });
  const docToken = docReg.body.token;

  const docProfRes = await request(app)
    .post('/api/v1/doctors/profile')
    .set('Authorization', `Bearer ${docToken}`)
    .send({
      fullName: 'Dr. Vivek Malhotra',
      medicalRegistrationNumber: 'MCI-DEL-9999',
      registrationCouncil: 'Delhi Medical Council',
      specialties: ['Neurology'],
      verifiedPhone: '+919811554433',
    });
  const docProfileId = docProfRes.body.profile._id;
  assert.equal(docProfRes.body.profile.isVerified, false);

  // 2. Admin queries pending verifications
  const pendingRes = await request(app)
    .get('/api/v1/admin/verifications/pending')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(pendingRes.status, 200);
  assert.equal(pendingRes.body.pending.doctors.length, 1);
  assert.equal(pendingRes.body.pending.doctors[0].fullName, 'Dr. Vivek Malhotra');

  // 3. Admin approves doctor verification
  const decisionRes = await request(app)
    .post('/api/v1/admin/verifications/decision')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      entityType: 'DoctorProfile',
      entityId: docProfileId,
      status: 'approved',
      reason: 'Verified with State Medical Council directory.',
    });

  assert.equal(decisionRes.status, 200);
  assert.equal(decisionRes.body.item.isVerified, true);
  assert.equal(decisionRes.body.item.verificationStatus, 'approved');

  // Verify doctor profile now reflects verified status
  const updatedDoc = await DoctorProfile.findById(docProfileId);
  assert.equal(updatedDoc.isVerified, true);

  // 4. Admin audits platform stats
  const statsRes = await request(app)
    .get('/api/v1/admin/stats')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(statsRes.status, 200);
  assert.equal(statsRes.body.stats.verifiedDoctors, 1);

  // 5. Admin queries audit logs
  const logsRes = await request(app)
    .get('/api/v1/admin/audit-logs')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(logsRes.status, 200);
  assert.ok(logsRes.body.total >= 1);
  assert.equal(logsRes.body.logs[0].action, 'APPROVE_DOCTORPROFILE');

  // 6. Admin suspends a user
  const suspendRes = await request(app)
    .post('/api/v1/admin/users/suspension')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      userId: docReg.body.user.id,
      suspend: true,
      reason: 'Violation of platform safety guidelines.',
    });

  assert.equal(suspendRes.status, 200);
  assert.equal(suspendRes.body.user.status, 'suspended');

  // 7. Suspended user login is now blocked
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    phoneOrEmail: '+919811554433',
    password: 'doctorpass123',
  });
  assert.equal(loginRes.status, 403);
});
