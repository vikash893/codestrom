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

test('Doctor profile setup, verification guard, and availability toggle', async () => {
  // 1. Register doctor user
  const regRes = await request(app).post('/api/v1/auth/register').send({
    phone: '+919811111111',
    password: 'doctorpassword',
    fullName: 'Dr. Sameer Khan',
    role: 'doctor',
  });
  assert.equal(regRes.status, 201);
  const docToken = regRes.body.token;

  // 2. Create doctor profile
  const profileRes = await request(app)
    .post('/api/v1/doctors/profile')
    .set('Authorization', `Bearer ${docToken}`)
    .send({
      fullName: 'Dr. Sameer Khan',
      medicalRegistrationNumber: 'DMC-2018-9988',
      registrationCouncil: 'Delhi Medical Council',
      qualifications: ['MBBS', 'MD Cardiology'],
      specialties: ['Cardiology', 'General Physician'],
      experienceYears: 12,
      consultationFee: 800,
      clinicAddress: 'Connaught Place, New Delhi',
      longitude: 77.2167,
      latitude: 28.6333,
      verifiedPhone: '+919811111111',
    });

  assert.equal(profileRes.status, 201);
  assert.equal(profileRes.body.profile.isVerified, false); // Must remain unverified until admin audit
  assert.equal(profileRes.body.profile.isAvailable, false);
  assert.equal(profileRes.body.profile.medicalRegistrationNumber, 'DMC-2018-9988');

  // 3. Toggle availability
  const availRes = await request(app)
    .patch('/api/v1/doctors/availability')
    .set('Authorization', `Bearer ${docToken}`)
    .send({ isAvailable: true });

  assert.equal(availRes.status, 200);
  assert.equal(availRes.body.isAvailable, true);

  // 4. List available doctors
  const listRes = await request(app).get('/api/v1/doctors?specialty=Cardiology');
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.count, 1);
  assert.equal(listRes.body.doctors[0].fullName, 'Dr. Sameer Khan');
});

test('Pharmacy registration, inventory CRUD, cross-pharmacy security, and stock alerts', async () => {
  // 1. Register Pharmacy 1
  const p1Reg = await request(app).post('/api/v1/auth/register').send({
    phone: '+919822222222',
    password: 'pharmacypassword',
    fullName: 'Apollo Chemist Owner',
    role: 'pharmacy',
  });
  const p1Token = p1Reg.body.token;

  // Setup Pharmacy 1 profile
  const p1StoreRes = await request(app)
    .post('/api/v1/pharmacies/register')
    .set('Authorization', `Bearer ${p1Token}`)
    .send({
      storeName: 'Apollo Meds CP',
      drugLicenseNumber: 'DL-DEL-2024-5544',
      verifiedContactNumber: '+919822222222',
      address: {
        street: 'Block B, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110001',
      },
      longitude: 77.2180,
      latitude: 28.6320,
    });
  assert.equal(p1StoreRes.status, 201);
  const pharmacy1Id = p1StoreRes.body.pharmacy._id;

  // 2. Add Medicine to Pharmacy 1 inventory
  const addMedRes = await request(app)
    .post('/api/v1/pharmacies/inventory')
    .set('Authorization', `Bearer ${p1Token}`)
    .send({
      medicineName: 'Paracetamol 650mg',
      brandName: 'Dolo 650',
      strength: '650mg',
      dosageForm: 'tablet',
      availableQuantity: 5, // low stock!
      unitPrice: 32.5,
      batchNumber: 'DL65-99',
      expiryDate: '2027-12-31',
    });

  assert.equal(addMedRes.status, 201);
  assert.equal(addMedRes.body.item.stockStatus, 'low_stock');
  const itemId = addMedRes.body.item._id;

  // 3. Low stock alerts
  const alertRes = await request(app)
    .get('/api/v1/pharmacies/inventory/alerts/low-stock')
    .set('Authorization', `Bearer ${p1Token}`);

  assert.equal(alertRes.status, 200);
  assert.equal(alertRes.body.count, 1);
  assert.equal(alertRes.body.alerts[0].medicineName, 'Paracetamol 650mg');

  // 4. Register Pharmacy 2 (attacker)
  const p2Reg = await request(app).post('/api/v1/auth/register').send({
    phone: '+919833333333',
    password: 'anotherpharmacypassword',
    fullName: 'Shree Chemist Owner',
    role: 'pharmacy',
  });
  const p2Token = p2Reg.body.token;

  await request(app)
    .post('/api/v1/pharmacies/register')
    .set('Authorization', `Bearer ${p2Token}`)
    .send({
      storeName: 'Shree Pharmacy',
      drugLicenseNumber: 'DL-DEL-2024-9999',
      verifiedContactNumber: '+919833333333',
      address: {
        street: 'Karol Bagh',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110005',
      },
      longitude: 77.1900,
      latitude: 28.6500,
    });

  // 5. Cross-pharmacy tamper attempt: Pharmacy 2 tries to update Pharmacy 1's inventory item
  const attackRes = await request(app)
    .put(`/api/v1/pharmacies/inventory/${itemId}`)
    .set('Authorization', `Bearer ${p2Token}`)
    .send({
      availableQuantity: 0,
    });

  assert.equal(attackRes.status, 403);
  assert.equal(attackRes.body.success, false);

  // 6. Legitimate update by Pharmacy 1
  const updateRes = await request(app)
    .put(`/api/v1/pharmacies/inventory/${itemId}`)
    .set('Authorization', `Bearer ${p1Token}`)
    .send({
      availableQuantity: 50,
      unitPrice: 30.0,
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.item.availableQuantity, 50);
  assert.equal(updateRes.body.item.stockStatus, 'in_stock');
});

test('Hospital registration and verified emergency hotline queries', async () => {
  // 1. Register hospital rep user
  const hReg = await request(app).post('/api/v1/auth/register').send({
    phone: '+919844444444',
    password: 'hospitalpassword',
    fullName: 'AIIMS Administrator',
    role: 'hospital',
  });
  const hToken = hReg.body.token;

  // 2. Register hospital facility
  const hospRes = await request(app)
    .post('/api/v1/hospitals/register')
    .set('Authorization', `Bearer ${hToken}`)
    .send({
      hospitalName: 'AIIMS Delhi Emergency Hospital',
      registrationNumber: 'HOSP-DEL-001',
      verifiedEmergencyNumbers: ['+911126588500', '+911126588700'],
      regularPhoneNumbers: ['+911126593200'],
      address: {
        street: 'Sri Aurobindo Marg, Ansari Nagar',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110029',
      },
      longitude: 77.2090,
      latitude: 28.5672,
      emergencyDepartmentAvailable: true,
      traumaCareLevel: 'Level 1',
      operatingHours: { is24Hours: true },
    });

  assert.equal(hospRes.status, 201);
  assert.equal(hospRes.body.hospital.emergencyDepartmentAvailable, true);
  assert.equal(hospRes.body.hospital.verifiedEmergencyNumbers.length, 2);

  // 3. Query emergency hospitals
  const queryRes = await request(app).get('/api/v1/hospitals?emergencyOnly=true');
  assert.equal(queryRes.status, 200);
  assert.equal(queryRes.body.count, 1);
  assert.equal(queryRes.body.hospitals[0].hospitalName, 'AIIMS Delhi Emergency Hospital');
  assert.deepEqual(queryRes.body.hospitals[0].verifiedEmergencyNumbers, ['+911126588500', '+911126588700']);
});
