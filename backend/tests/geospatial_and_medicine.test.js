import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './testHelper.js';
import { Hospital } from '../src/models/Hospital.js';
import { Pharmacy } from '../src/models/Pharmacy.js';
import { DoctorProfile } from '../src/models/DoctorProfile.js';
import { PharmacyInventory } from '../src/models/PharmacyInventory.js';
import mongoose from 'mongoose';

const app = createApp();

before(async () => {
  await setupTestDB();
  // Ensure 2dsphere indexes are built
  await Hospital.createIndexes();
  await Pharmacy.createIndexes();
  await DoctorProfile.createIndexes();
});

after(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

test('GET /api/v1/nearby validates coordinates and returns nearby facilities', async () => {
  // 1. Rejects missing coordinates
  const missingRes = await request(app).get('/api/v1/nearby');
  assert.equal(missingRes.status, 400);

  // 2. Rejects out of range coordinates
  const invalidRes = await request(app).get('/api/v1/nearby?lng=200&lat=45');
  assert.equal(invalidRes.status, 400);

  // 3. Seed verified hospital at CP, New Delhi
  await Hospital.create({
    hospitalName: 'Delhi Central Emergency Hospital',
    registrationNumber: 'HOSP-CP-001',
    verifiedEmergencyNumbers: ['+911123344556'],
    address: {
      street: 'Connaught Circus',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110001',
    },
    location: {
      type: 'Point',
      coordinates: [77.2167, 28.6333],
    },
    emergencyDepartmentAvailable: true,
    traumaCareLevel: 'Level 1',
    isActive: true,
    isVerified: true,
  });

  // Seed verified pharmacy at Connaught Place
  const pharmacy = await Pharmacy.create({
    userId: new mongoose.Types.ObjectId(),
    storeName: 'Central Care Pharmacy',
    drugLicenseNumber: 'DL-DEL-2024-1122',
    verifiedContactNumber: '+919811122233',
    address: {
      street: 'Barakhamba Road',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110001',
    },
    location: {
      type: 'Point',
      coordinates: [77.2200, 28.6300],
    },
    isActive: true,
    isVerified: true,
  });

  // Seed doctor at CP
  await DoctorProfile.create({
    userId: new mongoose.Types.ObjectId(),
    fullName: 'Dr. Ananya Roy',
    medicalRegistrationNumber: 'DMC-2019-1234',
    registrationCouncil: 'Delhi Medical Council',
    specialties: ['General Physician'],
    verifiedPhone: '+919877788899',
    location: {
      type: 'Point',
      coordinates: [77.2150, 28.6320],
    },
    isAvailable: true,
    isVerified: true,
  });

  // 4. Query nearby from 500m away (77.2170, 28.6330)
  const nearbyRes = await request(app).get('/api/v1/nearby?lng=77.2170&lat=28.6330&radiusKm=5');

  assert.equal(nearbyRes.status, 200);
  assert.equal(nearbyRes.body.success, true);
  assert.equal(nearbyRes.body.data.hospitals.length, 1);
  assert.equal(nearbyRes.body.data.hospitals[0].hospitalName, 'Delhi Central Emergency Hospital');
  assert.deepEqual(nearbyRes.body.data.hospitals[0].verifiedEmergencyNumbers, ['+911123344556']);
  assert.ok(nearbyRes.body.data.hospitals[0].distanceMeters >= 0);

  assert.equal(nearbyRes.body.data.pharmacies.length, 1);
  assert.equal(nearbyRes.body.data.pharmacies[0].storeName, 'Central Care Pharmacy');

  assert.equal(nearbyRes.body.data.doctors.length, 1);
  assert.equal(nearbyRes.body.data.doctors[0].fullName, 'Dr. Ananya Roy');
});

test('GET /api/v1/medicines/match-inventory matches medicines against verified pharmacy inventory', async () => {
  // Seed Pharmacy
  const pharmacy = await Pharmacy.create({
    userId: new mongoose.Types.ObjectId(),
    storeName: 'MedPlus Connaught',
    drugLicenseNumber: 'DL-DEL-2024-3344',
    verifiedContactNumber: '+919899001122',
    address: {
      street: 'Janpath Road',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110001',
    },
    location: {
      type: 'Point',
      coordinates: [77.2185, 28.6280],
    },
    isActive: true,
    isVerified: true,
  });

  // Seed Inventory Item
  await PharmacyInventory.create({
    pharmacyId: pharmacy._id,
    medicineName: 'Amoxicillin 500mg Capsule',
    genericName: 'Amoxicillin',
    brandName: 'Mox 500',
    strength: '500mg',
    dosageForm: 'capsule',
    availableQuantity: 45,
    unitPrice: 85.0,
    stockStatus: 'in_stock',
    isAvailable: true,
  });

  // 1. Query for amoxicillin with coordinates
  const matchRes = await request(app).get(
    '/api/v1/medicines/match-inventory?query=amoxicillin&lng=77.2180&lat=28.6290&radiusKm=5'
  );

  assert.equal(matchRes.status, 200);
  assert.equal(matchRes.body.success, true);
  assert.equal(matchRes.body.count, 1);
  assert.equal(matchRes.body.matches[0].medicineName, 'Amoxicillin 500mg Capsule');
  assert.equal(matchRes.body.matches[0].stockStatus, 'in_stock');
  assert.equal(matchRes.body.matches[0].availableQuantity, 45);
  assert.equal(matchRes.body.matches[0].pharmacy.storeName, 'MedPlus Connaught');
  assert.equal(matchRes.body.matches[0].pharmacy.callUrl, 'tel:+919899001122');
  assert.ok(matchRes.body.matches[0].distanceMeters >= 0);

  // 2. Query for non-existent medicine
  const emptyRes = await request(app).get(
    '/api/v1/medicines/match-inventory?query=NonExistentMedicineX'
  );
  assert.equal(emptyRes.status, 200);
  assert.equal(emptyRes.body.count, 0);
  assert.equal(emptyRes.body.matches.length, 0);
});
