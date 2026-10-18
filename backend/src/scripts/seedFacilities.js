import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Hospital } from '../models/Hospital.js';
import { Pharmacy } from '../models/Pharmacy.js';
import { PharmacyInventory } from '../models/PharmacyInventory.js';

export async function seedDoctorsAndHospitals() {
  try {
    await mongoose.connect(config.mongoUri);

    const docCount = await DoctorProfile.countDocuments();
    const hospCount = await Hospital.countDocuments();

    if (hospCount === 0) {
      console.log('[Seed] Seeding sample verified emergency hospitals...');
      await Hospital.create([
        {
          hospitalName: 'AIIMS New Delhi Emergency & Trauma Centre',
          registrationNumber: 'HOSP-DEL-AIIMS-001',
          verifiedEmergencyNumbers: ['+911126588500', '112'],
          regularPhoneNumbers: ['+911126588700'],
          address: {
            street: 'Sri Aurobindo Marg, Ansari Nagar',
            city: 'New Delhi',
            state: 'Delhi',
            postalCode: '110029',
          },
          location: {
            type: 'Point',
            coordinates: [77.2090, 28.5672],
          },
          emergencyDepartmentAvailable: true,
          traumaCareLevel: 'Level 1',
          ambulanceAvailable: true,
          operatingHours: { is24Hours: true },
          isVerified: true,
          isActive: true,
          verificationStatus: 'approved',
          beds: {
            icu: { total: 40, available: 12, reserved: 8, occupied: 20 },
            emergency: { total: 60, available: 22, reserved: 10, occupied: 28 },
            oxygen: { total: 100, available: 45, reserved: 15, occupied: 40 },
            general: { total: 200, available: 85, reserved: 30, occupied: 85 },
          },
        },
        {
          hospitalName: 'Safdarjung Hospital & Vardhman Mahavir Medical College',
          registrationNumber: 'HOSP-DEL-SJH-002',
          verifiedEmergencyNumbers: ['+911126165060', '112'],
          regularPhoneNumbers: ['+911126165030'],
          address: {
            street: 'Ring Road, Opposite AIIMS',
            city: 'New Delhi',
            state: 'Delhi',
            postalCode: '110029',
          },
          location: {
            type: 'Point',
            coordinates: [77.2075, 28.5700],
          },
          emergencyDepartmentAvailable: true,
          traumaCareLevel: 'Level 1',
          ambulanceAvailable: true,
          operatingHours: { is24Hours: true },
          isVerified: true,
          isActive: true,
          verificationStatus: 'approved',
          beds: {
            icu: { total: 35, available: 8, reserved: 5, occupied: 22 },
            emergency: { total: 50, available: 18, reserved: 7, occupied: 25 },
            oxygen: { total: 80, available: 32, reserved: 12, occupied: 36 },
            general: { total: 180, available: 60, reserved: 20, occupied: 100 },
          },
        },
      ]);
      console.log('[Seed] Hospitals successfully seeded.');
    }

    if (docCount === 0) {
      console.log('[Seed] Seeding sample verified doctors...');
      const passwordHash = await bcrypt.hash('Password@123', 10);

      const d1User = await User.create({
        phone: '+919810123456',
        email: 'dr.rajesh@mediresq.test',
        passwordHash,
        role: 'doctor',
        isVerified: true,
        approvalStatus: 'approved',
      });

      const d2User = await User.create({
        phone: '+919811223344',
        email: 'dr.ananya@mediresq.test',
        passwordHash,
        role: 'doctor',
        isVerified: true,
        approvalStatus: 'approved',
      });

      const d3User = await User.create({
        phone: '+919819876543',
        email: 'dr.vikram@mediresq.test',
        passwordHash,
        role: 'doctor',
        isVerified: true,
        approvalStatus: 'approved',
      });

      await DoctorProfile.create([
        {
          userId: d1User._id,
          fullName: 'Dr. Rajesh Sharma, MD (Cardiology)',
          medicalRegistrationNumber: 'MCI-DEL-CARD-1044',
          registrationCouncil: 'Delhi Medical Council',
          qualifications: ['MBBS', 'MD (Medicine)', 'DM (Cardiology)'],
          specialties: ['Cardiologist', 'Cardiology', 'General Physician'],
          experienceYears: 14,
          consultationFee: 700,
          clinicAddress: 'Heart & Vascular Care Clinic, Green Park, New Delhi',
          location: {
            type: 'Point',
            coordinates: [77.2050, 28.5580],
          },
          verifiedPhone: '+919810123456',
          isVerified: true,
          verificationStatus: 'approved',
          isAvailable: true,
        },
        {
          userId: d2User._id,
          fullName: 'Dr. Ananya Sen, MD (Neurology)',
          medicalRegistrationNumber: 'MCI-DEL-NEURO-2088',
          registrationCouncil: 'Delhi Medical Council',
          qualifications: ['MBBS', 'MD (Medicine)', 'DM (Neurology)'],
          specialties: ['Neurologist', 'Neurology', 'General Physician'],
          experienceYears: 11,
          consultationFee: 800,
          clinicAddress: 'Brain & Spine Neuro Care, Hauz Khas, New Delhi',
          location: {
            type: 'Point',
            coordinates: [77.2065, 28.5490],
          },
          verifiedPhone: '+919811223344',
          isVerified: true,
          verificationStatus: 'approved',
          isAvailable: true,
        },
        {
          userId: d3User._id,
          fullName: 'Dr. Vikram Malhotra, MBBS, DNB (Family Medicine)',
          medicalRegistrationNumber: 'MCI-DEL-GEN-3012',
          registrationCouncil: 'Delhi Medical Council',
          qualifications: ['MBBS', 'DNB (Family Medicine)'],
          specialties: ['General Physician', 'Internal Medicine', 'Family Medicine'],
          experienceYears: 8,
          consultationFee: 400,
          clinicAddress: 'Community Primary Health Clinic, Connaught Place, New Delhi',
          location: {
            type: 'Point',
            coordinates: [77.2190, 28.6310],
          },
          verifiedPhone: '+919819876543',
          isVerified: true,
          verificationStatus: 'approved',
          isAvailable: true,
        },
      ]);
      console.log('[Seed] Doctors successfully seeded.');
    }

    // Seed Pharmacies and Inventory if needed
    const phCount = await Pharmacy.countDocuments();
    if (phCount <= 1) {
      console.log('[Seed] Seeding sample verified pharmacies and inventories...');
      const passwordHash = await bcrypt.hash('Password@123', 10);

      const phUser1 = await User.create({
        phone: '+919811001122',
        email: 'apollo.cp@mediresq.test',
        passwordHash,
        role: 'pharmacy',
        isVerified: true,
        approvalStatus: 'approved',
      });

      const phUser2 = await User.create({
        phone: '+919811334455',
        email: 'medplus.kb@mediresq.test',
        passwordHash,
        role: 'pharmacy',
        isVerified: true,
        approvalStatus: 'approved',
      });

      const ph1 = await Pharmacy.create({
        userId: phUser1._id,
        storeName: 'Apollo Pharmacy 24/7 - Connaught Place',
        drugLicenseNumber: 'DL-DEL-CP-2026-001',
        gstin: '07AAAAA1111A1Z1',
        verifiedContactNumber: '+911123719000',
        address: {
          street: 'Inner Circle, F-Block, Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110001',
        },
        location: {
          type: 'Point',
          coordinates: [77.2180, 28.6320],
        },
        operatingHours: { is24Hours: true },
        homeDeliveryAvailable: true,
        deliveryRadiusKm: 15,
        isVerified: true,
        isActive: true,
        verificationStatus: 'approved',
      });

      const ph2 = await Pharmacy.create({
        userId: phUser2._id,
        storeName: 'MedPlus Pharmacy - Karol Bagh',
        drugLicenseNumber: 'DL-DEL-KB-2026-002',
        gstin: '07BBBBB2222B2Z2',
        verifiedContactNumber: '+911125754321',
        address: {
          street: 'Ajmal Khan Road, Karol Bagh',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110005',
        },
        location: {
          type: 'Point',
          coordinates: [77.1900, 28.6520],
        },
        operatingHours: { is24Hours: false, openTime: '08:00', closeTime: '23:00' },
        homeDeliveryAvailable: true,
        deliveryRadiusKm: 15,
        isVerified: true,
        isActive: true,
        verificationStatus: 'approved',
      });

      // Seed inventories:
      // Apollo has Paracetamol 650mg (Dolo 650), ORS (Electral), Combiflam, Cetirizine
      // MedPlus has Amoxicillin 500mg, Azithromycin 500mg, Paracetamol 500mg (Crocin), Pantoprazole 40mg
      await PharmacyInventory.create([
        {
          pharmacyId: ph1._id,
          medicineName: 'Paracetamol 650mg (Dolo 650)',
          genericName: 'Paracetamol',
          brandName: 'Dolo 650',
          strength: '650mg',
          dosageForm: 'tablet',
          availableQuantity: 120,
          unitPrice: 30,
          stockStatus: 'in_stock',
          isAvailable: true,
        },
        {
          pharmacyId: ph1._id,
          medicineName: 'Oral Rehydration Salts (Electral ORS)',
          genericName: 'Oral Rehydration Salts',
          brandName: 'Electral',
          strength: '21.8g',
          dosageForm: 'powder sachet',
          availableQuantity: 80,
          unitPrice: 22,
          stockStatus: 'in_stock',
          isAvailable: true,
        },
        {
          pharmacyId: ph1._id,
          medicineName: 'Combiflam Tablet',
          genericName: 'Ibuprofen + Paracetamol',
          brandName: 'Combiflam',
          strength: '400mg + 325mg',
          dosageForm: 'tablet',
          availableQuantity: 60,
          unitPrice: 42,
          stockStatus: 'in_stock',
          isAvailable: true,
        },
        {
          pharmacyId: ph1._id,
          medicineName: 'Cetirizine 10mg (Cetzine)',
          genericName: 'Cetirizine',
          brandName: 'Cetzine',
          strength: '10mg',
          dosageForm: 'tablet',
          availableQuantity: 90,
          unitPrice: 25,
          stockStatus: 'in_stock',
          isAvailable: true,
        },
        // MedPlus Store
        {
          pharmacyId: ph2._id,
          medicineName: 'Amoxicillin 500mg (Novamox)',
          genericName: 'Amoxicillin',
          brandName: 'Novamox',
          strength: '500mg',
          dosageForm: 'capsule',
          availableQuantity: 50,
          unitPrice: 85,
          stockStatus: 'in_stock',
          isAvailable: true,
        },
        {
          pharmacyId: ph2._id,
          medicineName: 'Azithromycin 500mg (Azithral)',
          genericName: 'Azithromycin',
          brandName: 'Azithral',
          strength: '500mg',
          dosageForm: 'tablet',
          availableQuantity: 35,
          unitPrice: 115,
          stockStatus: 'in_stock',
          isAvailable: true,
        },
        {
          pharmacyId: ph2._id,
          medicineName: 'Paracetamol 500mg (Crocin Advance)',
          genericName: 'Paracetamol',
          brandName: 'Crocin',
          strength: '500mg',
          dosageForm: 'tablet',
          availableQuantity: 70,
          unitPrice: 28,
          stockStatus: 'in_stock',
          isAvailable: true,
        },
        {
          pharmacyId: ph2._id,
          medicineName: 'Pantoprazole 40mg (Pan 40)',
          genericName: 'Pantoprazole',
          brandName: 'Pan 40',
          strength: '40mg',
          dosageForm: 'tablet',
          availableQuantity: 65,
          unitPrice: 55,
          stockStatus: 'in_stock',
          isAvailable: true,
        },
      ]);
      console.log('[Seed] Pharmacies and Inventories successfully seeded.');
    }
  } catch (err) {
    console.error('[Seed] Facility seed error:', err.message);
  }
}

if (process.argv[1]?.endsWith('seedFacilities.js')) {
  seedDoctorsAndHospitals().then(() => process.exit(0));
}
