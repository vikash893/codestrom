import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './testHelper.js';

const app = createApp();
let authToken;

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  const regRes = await request(app).post('/api/v1/auth/register').send({
    phone: '+919811445566',
    password: 'password123',
    fullName: 'Upload Tester',
    role: 'patient',
  });
  authToken = regRes.body.token;
});

test('POST /api/v1/uploads/image extracts prescription text with uncertainty warning', async () => {
  const fakeJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

  const res = await request(app)
    .post('/api/v1/uploads/image')
    .set('Authorization', `Bearer ${authToken}`)
    .attach('file', fakeJpg, { filename: 'rx.jpg', contentType: 'image/jpeg' });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.extracted_text);
  assert.equal(res.body.data.requires_user_confirmation, true);
  assert.ok(res.body.data.disclaimer);
});

test('POST /api/v1/uploads/image rejects non-image MIME types', async () => {
  const fakeTxt = Buffer.from('hello world text');

  const res = await request(app)
    .post('/api/v1/uploads/image')
    .set('Authorization', `Bearer ${authToken}`)
    .attach('file', fakeTxt, { filename: 'notes.txt', contentType: 'text/plain' });

  // Multer filter rejects with error, handled by error handler
  assert.ok(res.status >= 400);
});

test('POST /api/v1/uploads/audio transcribes audio input', async () => {
  const fakeWav = Buffer.from('RIFF....WAVEfmt ');

  const res = await request(app)
    .post('/api/v1/uploads/audio')
    .set('Authorization', `Bearer ${authToken}`)
    .attach('file', fakeWav, { filename: 'voice.wav', contentType: 'audio/wav' })
    .field('language', 'en');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.transcript);
});

test('Uploads without authorization token return 401', async () => {
  const fakeJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const res = await request(app)
    .post('/api/v1/uploads/image')
    .attach('file', fakeJpg, { filename: 'rx.jpg', contentType: 'image/jpeg' });

  assert.equal(res.status, 401);
});
