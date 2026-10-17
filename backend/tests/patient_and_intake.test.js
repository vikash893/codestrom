import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './testHelper.js';

const app = createApp();
let authToken;
let patientUser;

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  // Create standard test patient
  const res = await request(app).post('/api/v1/auth/register').send({
    phone: '+919876543210',
    password: 'password123',
    fullName: 'Priya Patel',
    preferredLanguage: 'en',
  });

  authToken = res.body.token;
  patientUser = res.body.user;
});

test('GET & PUT /api/v1/patients/profile updates patient profile', async () => {
  // Get initial profile
  const getRes = await request(app)
    .get('/api/v1/patients/profile')
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.profile.fullName, 'Priya Patel');

  // Update profile
  const putRes = await request(app)
    .put('/api/v1/patients/profile')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      bloodGroup: 'B+',
      allergies: ['Penicillin', 'Peanuts'],
      chronicConditions: ['Asthma'],
      preferredLanguage: 'hi',
    });

  assert.equal(putRes.status, 200);
  assert.equal(putRes.body.profile.bloodGroup, 'B+');
  assert.deepEqual(putRes.body.profile.allergies, ['Penicillin', 'Peanuts']);
  assert.equal(putRes.body.profile.preferredLanguage, 'hi');
});

test('POST /api/v1/patients/emergency-contacts adds emergency contact', async () => {
  const res = await request(app)
    .post('/api/v1/patients/emergency-contacts')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      name: 'Rajesh Patel',
      relationship: 'Spouse',
      phone: '+919876500000',
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.emergencyContacts.length, 1);
  assert.equal(res.body.emergencyContacts[0].name, 'Rajesh Patel');
});

test('POST /api/v1/intake submits concern and creates IntakeRecord with emergency check', async () => {
  const res = await request(app)
    .post('/api/v1/intake')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      description: 'Severe crushing chest pain radiating to left arm since 20 mins',
      severity: 'severe',
      duration: '20 minutes',
      age_years: 48,
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.intakeId);
  assert.equal(res.body.isEmergency, true);
  assert.ok(res.body.emergencyGuidance);
  assert.equal(res.body.emergencyCallNumber, '112');

  // Verify intake shows up in patient history
  const historyRes = await request(app)
    .get('/api/v1/patients/history')
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(historyRes.status, 200);
  assert.equal(historyRes.body.count, 1);
  assert.equal(historyRes.body.history[0]._id, res.body.intakeId);
  assert.equal(historyRes.body.history[0].isEmergency, true);
});

test('POST /api/v1/intake rejects short descriptions (<5 chars)', async () => {
  const res = await request(app)
    .post('/api/v1/intake')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      description: 'hi',
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('Accessing patient endpoints without auth token returns 401', async () => {
  const res = await request(app).get('/api/v1/patients/profile');
  assert.equal(res.status, 401);
});
