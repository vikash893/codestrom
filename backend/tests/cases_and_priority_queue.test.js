import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { setupTestDB, teardownTestDB, clearTestDB } from './testHelper.js';
import { createApp } from '../src/app.js';

let app;


test.before(async () => {
  await setupTestDB();
  app = createApp();
});

test.after(async () => {
  await teardownTestDB();
});

test('Case Management & Priority Queue Workflow', async (t) => {
  // 1. Register Patient
  const patientRes = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Suresh Patel',
    email: 'suresh@example.com',
    phone: '+919876543201',
    password: 'password123',
    role: 'patient',
  });
  const patientToken = patientRes.body.token;

  // 2. Register Doctor 1
  const doctorRes1 = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Dr. Priya Sharma',
    email: 'priya@example.com',
    phone: '+919876543202',
    password: 'password123',
    role: 'doctor',
  });
  const doctorToken1 = doctorRes1.body.token;

  // 3. Register Doctor 2 (for race-condition verification)
  const doctorRes2 = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Dr. Amit Roy',
    email: 'amit@example.com',
    phone: '+919876543203',
    password: 'password123',
    role: 'doctor',
  });
  const doctorToken2 = doctorRes2.body.token;


  let emergencyCaseId;
  let routineCaseId;

  await t.test('POST /api/v1/cases creates P0 emergency case with WHO triage and idempotency', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        description: 'Severe chest pain radiating to left arm with difficulty breathing since 20 minutes',
        severity: 'severe',
        idempotencyKey: 'idemp-key-001',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.case.priority, 'P0_EMERGENCY');
    assert.equal(res.body.case.triageLevel, 'RED');
    assert.equal(res.body.emergencyCallNumber, '112');
    emergencyCaseId = res.body.case.caseId;

    // Test Idempotency with exact same key
    const dupRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        description: 'Duplicate submission attempt',
        idempotencyKey: 'idemp-key-001',
      });

    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.isDuplicate, true);
    assert.equal(dupRes.body.case.caseId, emergencyCaseId);
  });

  await t.test('POST /api/v1/cases creates P3 routine case for mild symptoms', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        description: 'Mild runny nose and sneezing for 2 days without fever',
        severity: 'mild',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.case.priority, 'P3_ROUTINE');
    assert.equal(res.body.case.triageLevel, 'GREEN');
    routineCaseId = res.body.case.caseId;
  });

  await t.test('GET /api/v1/cases/queue returns aged priority queue for doctors (P0 first)', async () => {
    const res = await request(app)
      .get('/api/v1/cases/queue')
      .set('Authorization', `Bearer ${doctorToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.queue.length >= 2);
    // P0 case should be first due to higher dynamicScore
    assert.equal(res.body.queue[0].caseId, emergencyCaseId);
    assert.equal(res.body.queue[0].priority, 'P0_EMERGENCY');
  });

  await t.test('POST /api/v1/cases/:caseId/acknowledge sets acknowledged status', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${emergencyCaseId}/acknowledge`)
      .set('Authorization', `Bearer ${doctorToken1}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.case.status, 'ACKNOWLEDGED');
    assert.ok(res.body.case.acknowledgedAt);
  });

  await t.test('POST /api/v1/cases/:caseId/accept executes atomic claim and rejects concurrent race condition', async () => {
    // Doctor 1 claims the case
    const claim1 = await request(app)
      .post(`/api/v1/cases/${emergencyCaseId}/accept`)
      .set('Authorization', `Bearer ${doctorToken1}`);

    assert.equal(claim1.status, 200);
    assert.equal(claim1.body.case.status, 'IN_CONSULTATION');

    // Doctor 2 tries to claim the same case concurrently -> 409 Conflict
    const claim2 = await request(app)
      .post(`/api/v1/cases/${emergencyCaseId}/accept`)
      .set('Authorization', `Bearer ${doctorToken2}`);

    assert.equal(claim2.status, 409);
    assert.match(claim2.body.message, /already been accepted/);
  });

  await t.test('POST /api/v1/cases/:caseId/decline releases case back to QUEUED', async () => {
    const releaseRes = await request(app)
      .post(`/api/v1/cases/${emergencyCaseId}/decline`)
      .set('Authorization', `Bearer ${doctorToken1}`)
      .send({ reason: 'Called into operating theater' });

    assert.equal(releaseRes.status, 200);
    assert.equal(releaseRes.body.case.status, 'QUEUED');
    assert.equal(releaseRes.body.case.assignedProviderId, null);
  });

  await t.test('POST /api/v1/cases/:caseId/escalate upgrades routine case to P0 EMERGENCY', async () => {
    const escRes = await request(app)
      .post(`/api/v1/cases/${routineCaseId}/escalate`)
      .set('Authorization', `Bearer ${doctorToken1}`)
      .send({ reason: 'Patient developed acute respiratory distress' });

    assert.equal(escRes.status, 200);
    assert.equal(escRes.body.case.priority, 'P0_EMERGENCY');
    assert.equal(escRes.body.case.triageLevel, 'RED');
    assert.equal(escRes.body.case.status, 'ESCALATED');
  });
});
