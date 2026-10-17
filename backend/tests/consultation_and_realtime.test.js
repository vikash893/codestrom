import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './testHelper.js';
import { IntakeRecord } from '../src/models/IntakeRecord.js';
import { DoctorProfile } from '../src/models/DoctorProfile.js';

const app = createApp();

let patientToken;
let patientUserId;
let doctorToken;
let doctorProfileId;
let intakeRecordId;

before(async () => {
  await setupTestDB();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  // 1. Register Patient
  const pRes = await request(app).post('/api/v1/auth/register').send({
    phone: '+919811002233',
    password: 'patientpass123',
    fullName: 'Rohan Mehra',
    role: 'patient',
  });
  patientToken = pRes.body.token;
  patientUserId = pRes.body.user.id;

  // 2. Register Doctor
  const dRes = await request(app).post('/api/v1/auth/register').send({
    phone: '+919899887766',
    password: 'doctorpass123',
    fullName: 'Dr. Sunita Varma',
    role: 'doctor',
  });
  doctorToken = dRes.body.token;

  // Setup Doctor profile
  const docProfileRes = await request(app)
    .post('/api/v1/doctors/profile')
    .set('Authorization', `Bearer ${doctorToken}`)
    .send({
      fullName: 'Dr. Sunita Varma',
      medicalRegistrationNumber: 'MCI-DEL-7788',
      registrationCouncil: 'Delhi Medical Council',
      qualifications: ['MBBS', 'MD Pulmonology'],
      specialties: ['Pulmonology'],
      verifiedPhone: '+919899887766',
      longitude: 77.2100,
      latitude: 28.6100,
    });
  doctorProfileId = docProfileRes.body.profile._id;

  // 3. Create Intake Record for Patient
  const intake = await IntakeRecord.create({
    patientId: patientUserId,
    rawDescription: 'Persistent dry cough and mild fever for 4 days',
    duration: '4 days',
    reportedSeverity: 'moderate',
    detectedLanguage: 'en',
    extractedSymptoms: ['cough', 'fever'],
    isEmergency: false,
    structuredSummary: 'Patient reports persistent dry cough and mild fever for 4 days.',
  });
  intakeRecordId = intake._id;
});

test('Full Consultation Lifecycle: Request -> Accept -> Clinical Notes -> Prescriptions -> Notifications', async () => {
  // 1. Patient requests consultation
  const reqRes = await request(app)
    .post('/api/v1/consultations/request')
    .set('Authorization', `Bearer ${patientToken}`)
    .send({
      doctorId: doctorProfileId,
      intakeRecordId: intakeRecordId,
      consultationType: 'chat',
    });

  assert.equal(reqRes.status, 201);
  assert.equal(reqRes.body.success, true);
  assert.equal(reqRes.body.consultation.status, 'requested');
  const consultationId = reqRes.body.consultation._id;

  // 2. Doctor checks notifications and consultation requests
  const docConsultRes = await request(app)
    .get('/api/v1/consultations/my')
    .set('Authorization', `Bearer ${doctorToken}`);

  assert.equal(docConsultRes.status, 200);
  assert.equal(docConsultRes.body.count, 1);
  assert.equal(docConsultRes.body.consultations[0]._id, consultationId);

  // 3. Patient tries to accept own consultation (forbidden: patients cannot accept)
  const patientTamperRes = await request(app)
    .patch(`/api/v1/consultations/${consultationId}/status`)
    .set('Authorization', `Bearer ${patientToken}`)
    .send({ status: 'accepted' });

  assert.equal(patientTamperRes.status, 403);

  // 4. Doctor accepts consultation -> sessionToken generated
  const acceptRes = await request(app)
    .patch(`/api/v1/consultations/${consultationId}/status`)
    .set('Authorization', `Bearer ${doctorToken}`)
    .send({ status: 'accepted' });

  assert.equal(acceptRes.status, 200);
  assert.equal(acceptRes.body.consultation.status, 'accepted');
  assert.ok(acceptRes.body.consultation.sessionToken);

  // 5. Doctor submits clinical notes & prescription advice
  const notesRes = await request(app)
    .post(`/api/v1/consultations/${consultationId}/notes`)
    .set('Authorization', `Bearer ${doctorToken}`)
    .send({
      clinicalNotes: 'Mild viral upper respiratory tract infection. Lungs clear to auscultation.',
      recommendations: 'Warm water hydration, steam inhalation twice daily, rest.',
      prescribedMedicines: [
        {
          medicineName: 'Levocetirizine 5mg',
          dosage: '5mg',
          frequency: 'Once at night',
          durationDays: 5,
          instructions: 'Take after meals',
        },
      ],
    });

  assert.equal(notesRes.status, 200);
  assert.equal(notesRes.body.consultation.status, 'completed');
  assert.equal(notesRes.body.consultation.prescribedMedicines.length, 1);
  assert.equal(notesRes.body.consultation.prescribedMedicines[0].medicineName, 'Levocetirizine 5mg');

  // 6. Patient retrieves completed consultation details
  const patientViewRes = await request(app)
    .get(`/api/v1/consultations/${consultationId}`)
    .set('Authorization', `Bearer ${patientToken}`);

  assert.equal(patientViewRes.status, 200);
  assert.equal(patientViewRes.body.consultation.status, 'completed');
  assert.equal(
    patientViewRes.body.consultation.clinicalNotes,
    'Mild viral upper respiratory tract infection. Lungs clear to auscultation.'
  );

  // 7. Patient checks notifications and marks as read
  const notifRes = await request(app)
    .get('/api/v1/notifications')
    .set('Authorization', `Bearer ${patientToken}`);

  assert.equal(notifRes.status, 200);
  assert.ok(notifRes.body.count >= 1);
  const firstNotifId = notifRes.body.notifications[0]._id;

  const readRes = await request(app)
    .patch(`/api/v1/notifications/${firstNotifId}/read`)
    .set('Authorization', `Bearer ${patientToken}`);

  assert.equal(readRes.status, 200);
  assert.equal(readRes.body.notification.isRead, true);
});
