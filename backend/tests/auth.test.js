import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './testHelper.js';

const app = createApp();

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

test('GET /health returns healthy status', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
  assert.equal(res.body.service, 'mediresq-backend');
});

test('POST /api/v1/auth/register registers a patient successfully', async () => {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      phone: '+919876543210',
      password: 'password123',
      fullName: 'Aarav Sharma',
      preferredLanguage: 'hi',
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token);
  assert.equal(res.body.user.phone, '+919876543210');
  assert.equal(res.body.user.role, 'patient');
  assert.equal(res.body.profile.fullName, 'Aarav Sharma');
  assert.equal(res.body.profile.preferredLanguage, 'hi');
});

test('POST /api/v1/auth/register rejects duplicate phone number with 409', async () => {
  await request(app).post('/api/v1/auth/register').send({
    phone: '+919876543210',
    password: 'password123',
    fullName: 'Aarav Sharma',
  });

  const res = await request(app).post('/api/v1/auth/register').send({
    phone: '+919876543210',
    password: 'anotherpassword',
    fullName: 'Another User',
  });

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
});

test('POST /api/v1/auth/register prevents self-assigning admin role', async () => {
  const res = await request(app).post('/api/v1/auth/register').send({
    phone: '+919999999999',
    password: 'adminpassword',
    fullName: 'Fake Admin',
    role: 'admin',
  });

  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
});

test('POST /api/v1/auth/login authenticates registered user', async () => {
  await request(app).post('/api/v1/auth/register').send({
    phone: '+919876543210',
    password: 'password123',
    fullName: 'Aarav Sharma',
  });

  const res = await request(app).post('/api/v1/auth/login').send({
    phoneOrEmail: '+919876543210',
    password: 'password123',
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.token);
  assert.equal(res.body.user.phone, '+919876543210');
});

test('POST /api/v1/auth/login rejects wrong password with 401', async () => {
  await request(app).post('/api/v1/auth/register').send({
    phone: '+919876543210',
    password: 'password123',
    fullName: 'Aarav Sharma',
  });

  const res = await request(app).post('/api/v1/auth/login').send({
    phoneOrEmail: '+919876543210',
    password: 'wrongpassword',
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('GET /api/v1/auth/me returns authenticated patient profile', async () => {
  const regRes = await request(app).post('/api/v1/auth/register').send({
    phone: '+919876543210',
    password: 'password123',
    fullName: 'Aarav Sharma',
  });

  const token = regRes.body.token;

  const meRes = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.phone, '+919876543210');
  assert.equal(meRes.body.profile.fullName, 'Aarav Sharma');
});
