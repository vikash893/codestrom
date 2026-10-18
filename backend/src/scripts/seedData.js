import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Hospital } from '../models/Hospital.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Pharmacy } from '../models/Pharmacy.js';
import { PharmacyInventory } from '../models/PharmacyInventory.js';
import { MedicineCatalogue } from '../models/MedicineCatalogue.js';

async function seed() {
  try {
    console.log(`Connecting to MongoDB at ${config.mongoUri}...`);
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB successfully.');

    // Clear existing seeded data
    console.log('Clearing existing data...');
    await PharmacyInventory.deleteMany({});
    await Pharmacy.deleteMany({});
    await DoctorProfile.deleteMany({});
    await Hospital.deleteMany({});
    await MedicineCatalogue.deleteMany({});
    await User.deleteMany({ email: { $regex: /@mediresq\.test$/ } });

    const passwordHash = await bcrypt.hash('Password@123', 10);

    // 1. Seed Medicine Catalogue (Indian OTC and Prescription medicines)
    console.log('Seeding Medicine Catalogue...');
    const medicines = await MedicineCatalogue.create([
      {
        canonicalName: 'PARACETAMOL 650MG TABLET',
        brandName: 'Dolo 650',
        genericName: 'Paracetamol',
        dosageForm: 'tablet',
        strength: '650mg',
        packSize: '15 tablets',
        scheduleCategory: 'OTC',
        manufacturer: 'Micro Labs Ltd',
        requiresPrescription: false,
        contraindications: ['Severe hepatic impairment', 'Active liver disease'],
        pregnancyCategory: 'B',
        ageRestrictions: { minAgeYears: 12, maxAgeYears: 120, pediatricWarning: 'Not recommended for children under 12 years without clinical guidance' },
        drugInteractions: ['Warfarin (at high prolonged doses)', 'Alcohol'],
        antibioticStewardship: { isAntibiotic: false, accessGroup: 'NOT_APPLICABLE' },
        isActive: true,
      },
      {
        canonicalName: 'PARACETAMOL 500MG TABLET',
        brandName: 'Crocin Advance',
        genericName: 'Paracetamol',
        dosageForm: 'tablet',
        strength: '500mg',
        packSize: '20 tablets',
        scheduleCategory: 'OTC',
        manufacturer: 'GlaxoSmithKline',
        requiresPrescription: false,
        contraindications: ['Severe liver failure'],
        pregnancyCategory: 'B',
        ageRestrictions: { minAgeYears: 6, maxAgeYears: 120, pediatricWarning: 'Adjust dose for pediatric patients' },
        drugInteractions: ['Alcohol', 'Isoniazid'],
        antibioticStewardship: { isAntibiotic: false, accessGroup: 'NOT_APPLICABLE' },
        isActive: true,
      },
      {
        canonicalName: 'ORAL REHYDRATION SALTS WHO FORMULA',
        brandName: 'Electral Powder',
        genericName: 'Oral Rehydration Salts (WHO Formula)',
        dosageForm: 'powder',
        strength: '21.8g sachet',
        packSize: '1 sachet for 1L water',
        scheduleCategory: 'OTC',
        manufacturer: 'FDC Ltd',
        requiresPrescription: false,
        contraindications: ['Intestinal obstruction', 'Severe persistent vomiting requiring IV rehydration'],
        pregnancyCategory: 'A',
        ageRestrictions: { minAgeYears: 0, maxAgeYears: 120, pediatricWarning: 'Safe across all ages; follow reconstitution precisely' },
        drugInteractions: [],
        antibioticStewardship: { isAntibiotic: false, accessGroup: 'NOT_APPLICABLE' },
        isActive: true,
      },
      {
        canonicalName: 'IBUPROFEN 400MG + PARACETAMOL 325MG',
        brandName: 'Combiflam',
        genericName: 'Ibuprofen + Paracetamol',
        dosageForm: 'tablet',
        strength: '400mg + 325mg',
        packSize: '20 tablets',
        scheduleCategory: 'Schedule_H',
        manufacturer: 'Sanofi India',
        requiresPrescription: true,
        contraindications: ['Active peptic ulcer', 'GI bleeding', 'Severe renal impairment', 'Third-trimester pregnancy'],
        pregnancyCategory: 'D',
        ageRestrictions: { minAgeYears: 12, maxAgeYears: 120, pediatricWarning: 'Contraindicated under 12 years' },
        drugInteractions: ['Aspirin', 'Anticoagulants', 'ACE inhibitors', 'Methotrexate'],
        antibioticStewardship: { isAntibiotic: false, accessGroup: 'NOT_APPLICABLE' },
        isActive: true,
      },
      {
        canonicalName: 'ONDANSETRON 4MG MD TABLET',
        brandName: 'Ondem MD 4',
        genericName: 'Ondansetron',
        dosageForm: 'tablet',
        strength: '4mg',
        packSize: '10 orally disintegrating tablets',
        scheduleCategory: 'Schedule_H',
        manufacturer: 'Alkem Laboratories',
        requiresPrescription: true,
        contraindications: ['Congenital long QT syndrome', 'Concurrent apomorphine use'],
        pregnancyCategory: 'B',
        ageRestrictions: { minAgeYears: 4, maxAgeYears: 120, pediatricWarning: 'Safety established for children > 4 years' },
        drugInteractions: ['Apomorphine', 'Antiarrhythmics', 'QT-prolonging agents'],
        antibioticStewardship: { isAntibiotic: false, accessGroup: 'NOT_APPLICABLE' },
        isActive: true,
      },
      {
        canonicalName: 'DICYCLOMINE 10MG + MEFENAMIC ACID 250MG',
        brandName: 'Meftal-Spas',
        genericName: 'Dicyclomine + Mefenamic Acid',
        dosageForm: 'tablet',
        strength: '10mg + 250mg',
        packSize: '10 tablets',
        scheduleCategory: 'Schedule_H',
        manufacturer: 'Blue Cross Laboratories',
        requiresPrescription: true,
        contraindications: ['Glaucoma', 'Myasthenia gravis', 'Obstructive uropathy', 'Severe renal impairment'],
        pregnancyCategory: 'C',
        ageRestrictions: { minAgeYears: 1, maxAgeYears: 120, pediatricWarning: 'Do not use in infants under 6 months' },
        drugInteractions: ['Antacids (reduce absorption)', 'Anticholinergic drugs'],
        antibioticStewardship: { isAntibiotic: false, accessGroup: 'NOT_APPLICABLE' },
        isActive: true,
      },
      {
        canonicalName: 'ASPIRIN 75MG GASTRO-RESISTANT TABLET',
        brandName: 'Ecosprin 75',
        genericName: 'Aspirin',
        dosageForm: 'tablet',
        strength: '75mg',
        packSize: '14 tablets',
        scheduleCategory: 'Schedule_H',
        manufacturer: 'USV Ltd',
        requiresPrescription: true,
        contraindications: ['Active bleeding disorders', 'Peptic ulcer', 'Hemophilia', 'Reye syndrome risk in children'],
        pregnancyCategory: 'D',
        ageRestrictions: { minAgeYears: 16, maxAgeYears: 120, pediatricWarning: 'Contraindicated under 16 years due to Reye syndrome' },
        drugInteractions: ['Heparin', 'Warfarin', 'NSAIDs', 'SSRIs'],
        antibioticStewardship: { isAntibiotic: false, accessGroup: 'NOT_APPLICABLE' },
        isActive: true,
      },
    ]);
    console.log(`Seeded ${medicines.length} medicines in catalogue.`);

    // 2. Seed Hospitals (Near Delhi vs Far Cities)
    console.log('Seeding Hospitals...');
    const hospitals = await Hospital.create([
      // NEAR HOSPITALS (within 1 - 6 km of Delhi center 77.2090, 28.6139)
      {
        hospitalName: 'Dr. Ram Manohar Lohia (RML) Hospital & Emergency Centre',
        registrationNumber: 'HOSP-DEL-RML-001',
        verifiedEmergencyNumbers: ['+91-11-23365525', '112', '102'],
        regularPhoneNumbers: ['+91-11-23365555'],
        address: {
          street: 'Baba Kharak Singh Marg, Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110001',
        },
        location: {
          type: 'Point',
          coordinates: [77.2014, 28.6253], // ~1.5 km
        },
        emergencyDepartmentAvailable: true,
        traumaCareLevel: 'Level 1',
        operatingHours: '24/7',
        isVerified: true,
        isActive: true,
      },
      {
        hospitalName: 'AIIMS (All India Institute of Medical Sciences) Trauma Centre',
        registrationNumber: 'HOSP-DEL-AIIMS-002',
        verifiedEmergencyNumbers: ['+91-11-26588500', '112'],
        regularPhoneNumbers: ['+91-11-26588700'],
        address: {
          street: 'Sri Aurobindo Marg, Ansari Nagar',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110029',
        },
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.5672], // ~5.1 km
        },
        emergencyDepartmentAvailable: true,
        traumaCareLevel: 'Level 1',
        operatingHours: '24/7',
        isVerified: true,
        isActive: true,
      },
      {
        hospitalName: 'Safdarjung Hospital & Vardhman Mahavir Medical College',
        registrationNumber: 'HOSP-DEL-SJH-003',
        verifiedEmergencyNumbers: ['+91-11-26165060', '112'],
        regularPhoneNumbers: ['+91-11-26165030'],
        address: {
          street: 'Ring Road, Opposite AIIMS',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110029',
        },
        location: {
          type: 'Point',
          coordinates: [77.2075, 28.5700], // ~4.9 km
        },
        emergencyDepartmentAvailable: true,
        traumaCareLevel: 'Level 1',
        operatingHours: '24/7',
        isVerified: true,
        isActive: true,
      },

      // FAR HOSPITALS (> 1000 km away)
      {
        hospitalName: 'Lilavati Hospital & Research Centre (Mumbai)',
        registrationNumber: 'HOSP-MUM-LIL-004',
        verifiedEmergencyNumbers: ['+91-22-26751000', '112'],
        regularPhoneNumbers: ['+91-22-26751555'],
        address: {
          street: 'A-791, Bandra Reclamation, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050',
        },
        location: {
          type: 'Point',
          coordinates: [72.8295, 19.0515], // Mumbai (~1,150 km)
        },
        emergencyDepartmentAvailable: true,
        traumaCareLevel: 'Level 1',
        operatingHours: '24/7',
        isVerified: true,
        isActive: true,
      },
      {
        hospitalName: 'Manipal Hospital (Old Airport Road, Bengaluru)',
        registrationNumber: 'HOSP-BLR-MAN-005',
        verifiedEmergencyNumbers: ['+91-80-25024444', '112'],
        regularPhoneNumbers: ['+91-80-25023333'],
        address: {
          street: '98, HAL Old Airport Rd, Kodihalli',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560017',
        },
        location: {
          type: 'Point',
          coordinates: [77.6515, 12.9592], // Bengaluru (~1,740 km)
        },
        emergencyDepartmentAvailable: true,
        traumaCareLevel: 'Level 1',
        operatingHours: '24/7',
        isVerified: true,
        isActive: true,
      },
    ]);
    console.log(`Seeded ${hospitals.length} hospitals.`);

    // 3. Seed Doctors and their User accounts
    console.log('Seeding Doctors and Doctor Users...');
    const doctorUsers = await User.create([
      { phone: '+919810123456', email: 'dr.rajesh@mediresq.test', passwordHash, role: 'doctor', isVerified: true },
      { phone: '+919811223344', email: 'dr.ananya@mediresq.test', passwordHash, role: 'doctor', isVerified: true },
      { phone: '+919819876543', email: 'dr.vikram@mediresq.test', passwordHash, role: 'doctor', isVerified: true },
      { phone: '+919871112233', email: 'dr.sunita@mediresq.test', passwordHash, role: 'doctor', isVerified: true },
      { phone: '+919820011223', email: 'dr.rohan@mediresq.test', passwordHash, role: 'doctor', isVerified: true },
      { phone: '+919845012345', email: 'dr.priya@mediresq.test', passwordHash, role: 'doctor', isVerified: true },
    ]);

    const doctors = await DoctorProfile.create([
      // NEAR DOCTORS (within 1-6 km of Delhi)
      {
        userId: doctorUsers[0]._id,
        fullName: 'Dr. Rajesh K. Sharma, MD',
        verifiedPhone: '+919810123456',
        medicalRegistrationNumber: 'DMC-REG-2005-1234',
        registrationCouncil: 'Delhi Medical Council',
        specialties: ['Cardiology', 'Emergency Medicine'],
        qualifications: ['MBBS', 'MD (Medicine)', 'DM (Cardiology) - AIIMS'],
        experienceYears: 18,
        consultationFee: 800,
        consultationModes: ['in_person', 'video', 'chat'],
        isAvailable: true,
        isVerified: true,
        clinicAddress: 'Connaught Circus, Block B, New Delhi, Delhi 110001',
        location: {
          type: 'Point',
          coordinates: [77.2150, 28.6200], // ~1.1 km
        },
      },
      {
        userId: doctorUsers[1]._id,
        fullName: 'Dr. Ananya Iyer, MD',
        verifiedPhone: '+919811223344',
        medicalRegistrationNumber: 'DMC-REG-2012-5678',
        registrationCouncil: 'Delhi Medical Council',
        specialties: ['General Medicine', 'Internal Medicine'],
        qualifications: ['MBBS', 'MD (Internal Medicine)'],
        experienceYears: 11,
        consultationFee: 500,
        consultationModes: ['in_person', 'audio', 'video'],
        isAvailable: true,
        isVerified: true,
        clinicAddress: 'East Patel Nagar Market, New Delhi, Delhi 110008',
        location: {
          type: 'Point',
          coordinates: [77.1700, 28.6450], // ~4.5 km
        },
      },
      {
        userId: doctorUsers[2]._id,
        fullName: 'Dr. Vikram Malhotra, DNB',
        verifiedPhone: '+919819876543',
        medicalRegistrationNumber: 'DMC-REG-2009-9012',
        registrationCouncil: 'Delhi Medical Council',
        specialties: ['Pulmonology', 'Critical Care Medicine'],
        qualifications: ['MBBS', 'DNB (Respiratory Diseases)'],
        experienceYears: 14,
        consultationFee: 700,
        consultationModes: ['in_person', 'video'],
        isAvailable: true,
        isVerified: true,
        clinicAddress: 'South Extension Part II, New Delhi, Delhi 110049',
        location: {
          type: 'Point',
          coordinates: [77.2200, 28.5710], // ~4.9 km
        },
      },
      {
        userId: doctorUsers[3]._id,
        fullName: 'Dr. Sunita Rao, DM',
        verifiedPhone: '+919871112233',
        medicalRegistrationNumber: 'DMC-REG-2007-3456',
        registrationCouncil: 'Delhi Medical Council',
        specialties: ['Gastroenterology', 'General Medicine'],
        qualifications: ['MBBS', 'MD', 'DM (Gastroenterology)'],
        experienceYears: 16,
        consultationFee: 900,
        consultationModes: ['in_person', 'chat', 'video'],
        isAvailable: true,
        isVerified: true,
        clinicAddress: 'Green Park Main, New Delhi, Delhi 110016',
        location: {
          type: 'Point',
          coordinates: [77.2050, 28.5580], // ~6.2 km
        },
      },

      // FAR DOCTORS
      {
        userId: doctorUsers[4]._id,
        fullName: 'Dr. Rohan Mehta, DM',
        verifiedPhone: '+919820011223',
        medicalRegistrationNumber: 'MMC-REG-2003-7890',
        registrationCouncil: 'Maharashtra Medical Council',
        specialties: ['Cardiology'],
        qualifications: ['MBBS', 'DM (Cardiology) - KEM Mumbai'],
        experienceYears: 20,
        consultationFee: 1500,
        consultationModes: ['in_person', 'video'],
        isAvailable: true,
        isVerified: true,
        clinicAddress: 'Hill Road, Bandra West, Mumbai, Maharashtra 400050',
        location: {
          type: 'Point',
          coordinates: [72.8320, 19.0550], // Mumbai (~1,150 km)
        },
      },
      {
        userId: doctorUsers[5]._id,
        fullName: 'Dr. Priya Nair, MD',
        verifiedPhone: '+919845012345',
        medicalRegistrationNumber: 'KMC-REG-2008-2345',
        registrationCouncil: 'Karnataka Medical Council',
        specialties: ['Neurology', 'General Medicine'],
        qualifications: ['MBBS', 'MD (Medicine)', 'DM (Neurology) - NIMHANS'],
        experienceYears: 15,
        consultationFee: 1000,
        consultationModes: ['in_person', 'video'],
        isAvailable: true,
        isVerified: true,
        clinicAddress: '100ft Road, Indiranagar, Bengaluru, Karnataka 560038',
        location: {
          type: 'Point',
          coordinates: [77.6400, 12.9780], // Bengaluru (~1,740 km)
        },
      },
    ]);
    console.log(`Seeded ${doctors.length} doctors.`);

    // 4. Seed Pharmacies and their User accounts
    console.log('Seeding Pharmacies and Pharmacy Users...');
    const pharmacyUsers = await User.create([
      { phone: '+911123719000', email: 'apollo.cp@mediresq.test', passwordHash, role: 'pharmacy', isVerified: true },
      { phone: '+911125754321', email: 'medplus.kb@mediresq.test', passwordHash, role: 'pharmacy', isVerified: true },
      { phone: '+911126589900', email: 'guardian.aiims@mediresq.test', passwordHash, role: 'pharmacy', isVerified: true },
      { phone: '+912226401234', email: 'wellness.bandra@mediresq.test', passwordHash, role: 'pharmacy', isVerified: true },
    ]);

    const pharmacies = await Pharmacy.create([
      // NEAR PHARMACIES (Delhi)
      {
        userId: pharmacyUsers[0]._id,
        storeName: 'Apollo Pharmacy 24/7 - Connaught Place',
        drugLicenseNumber: 'DL-DEL-CP-2023-8901',
        gstin: '07AAAAA0000A1Z5',
        verifiedContactNumber: '+91-11-23719000',
        alternateContactNumber: '+91-9811009988',
        address: {
          street: 'Inner Circle, F-Block, Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110001',
        },
        location: {
          type: 'Point',
          coordinates: [77.2180, 28.6320], // ~1.5 km
        },
        operatingHours: '24 Hours',
        isVerified: true,
        isActive: true,
      },
      {
        userId: pharmacyUsers[1]._id,
        storeName: 'MedPlus Pharmacy - Karol Bagh',
        drugLicenseNumber: 'DL-DEL-KB-2024-5432',
        gstin: '07BBBBB0000B1Z6',
        verifiedContactNumber: '+91-11-25754321',
        alternateContactNumber: '+91-9811554433',
        address: {
          street: 'Ajmal Khan Road, Karol Bagh',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110005',
        },
        location: {
          type: 'Point',
          coordinates: [77.1900, 28.6520], // ~4.2 km
        },
        operatingHours: '8:00 AM - 11:00 PM',
        isVerified: true,
        isActive: true,
      },
      {
        userId: pharmacyUsers[2]._id,
        storeName: 'Guardian Pharmacy - AIIMS Metro Station',
        drugLicenseNumber: 'DL-DEL-AIIMS-2022-1122',
        gstin: '07CCCCC0000C1Z7',
        verifiedContactNumber: '+91-11-26589900',
        address: {
          street: 'Concourse Level, AIIMS Metro Station',
          city: 'New Delhi',
          state: 'Delhi',
          postalCode: '110029',
        },
        location: {
          type: 'Point',
          coordinates: [77.2080, 28.5680], // ~5.0 km
        },
        operatingHours: '24 Hours',
        isVerified: true,
        isActive: true,
      },

      // FAR PHARMACY (Mumbai)
      {
        userId: pharmacyUsers[3]._id,
        storeName: 'Wellness Forever 24/7 - Bandra West',
        drugLicenseNumber: 'DL-MH-MUM-2021-9988',
        gstin: '27DDDDD0000D1Z8',
        verifiedContactNumber: '+91-22-26401234',
        address: {
          street: 'Linking Road, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050',
        },
        location: {
          type: 'Point',
          coordinates: [72.8350, 19.0580], // Mumbai (~1,150 km)
        },
        operatingHours: '24 Hours',
        isVerified: true,
        isActive: true,
      },
    ]);
    console.log(`Seeded ${pharmacies.length} pharmacies.`);

    // 5. Seed Inventory for Near Pharmacies
    console.log('Seeding Pharmacy Inventory...');
    const nearPharmacy1 = pharmacies[0]; // Apollo CP
    const nearPharmacy2 = pharmacies[1]; // MedPlus Karol Bagh
    const nearPharmacy3 = pharmacies[2]; // Guardian AIIMS
    const farPharmacy = pharmacies[3]; // Wellness Forever Mumbai

    const inventoryItems = await PharmacyInventory.create([
      // Apollo CP (Near) has Dolo 650, Electral, Combiflam, Ondem
      {
        pharmacyId: nearPharmacy1._id,
        medicineName: 'Dolo 650 Tablet',
        genericName: 'Paracetamol',
        brandName: 'Dolo 650',
        strength: '650mg',
        dosageForm: 'tablet',
        availableQuantity: 150,
        unitPrice: 32.50,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },
      {
        pharmacyId: nearPharmacy1._id,
        medicineName: 'Electral Powder Sachet',
        genericName: 'Oral Rehydration Salts',
        brandName: 'Electral',
        strength: '21.8g',
        dosageForm: 'powder',
        availableQuantity: 80,
        unitPrice: 22.00,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },
      {
        pharmacyId: nearPharmacy1._id,
        medicineName: 'Combiflam Tablet',
        genericName: 'Ibuprofen + Paracetamol',
        brandName: 'Combiflam',
        strength: '400mg + 325mg',
        dosageForm: 'tablet',
        availableQuantity: 60,
        unitPrice: 44.00,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },
      {
        pharmacyId: nearPharmacy1._id,
        medicineName: 'Disprin Regular Tablet',
        genericName: 'Aspirin 300mg',
        brandName: 'Disprin',
        strength: '300mg',
        dosageForm: 'tablet',
        availableQuantity: 100,
        unitPrice: 18.00,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },
      {
        pharmacyId: nearPharmacy1._id,
        medicineName: 'Strepsils Orange Lozenges',
        genericName: 'Amylmetacresol + Dichlorobenzyl alcohol',
        brandName: 'Strepsils',
        strength: 'Standard',
        dosageForm: 'lozenge',
        availableQuantity: 200,
        unitPrice: 40.00,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },

      // MedPlus Karol Bagh (Near) has Crocin, Meftal-Spas, Electral
      {
        pharmacyId: nearPharmacy2._id,
        medicineName: 'Crocin Advance 500mg',
        genericName: 'Paracetamol',
        brandName: 'Crocin',
        strength: '500mg',
        dosageForm: 'tablet',
        availableQuantity: 200,
        unitPrice: 20.00,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },
      {
        pharmacyId: nearPharmacy2._id,
        medicineName: 'Meftal-Spas Tablet',
        genericName: 'Dicyclomine + Mefenamic Acid',
        brandName: 'Meftal-Spas',
        strength: '10mg + 250mg',
        dosageForm: 'tablet',
        availableQuantity: 30,
        unitPrice: 48.00,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },
      {
        pharmacyId: nearPharmacy2._id,
        medicineName: 'Electral Powder Sachet',
        genericName: 'Oral Rehydration Salts',
        brandName: 'Electral',
        strength: '21.8g',
        dosageForm: 'powder',
        availableQuantity: 50,
        unitPrice: 22.00,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },

      // Guardian AIIMS (Near) has Ecosprin, Dolo 650
      {
        pharmacyId: nearPharmacy3._id,
        medicineName: 'Ecosprin 75mg Tablet',
        genericName: 'Aspirin',
        brandName: 'Ecosprin',
        strength: '75mg',
        dosageForm: 'tablet',
        availableQuantity: 90,
        unitPrice: 15.00,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },
      {
        pharmacyId: nearPharmacy3._id,
        medicineName: 'Dolo 650 Tablet',
        genericName: 'Paracetamol',
        brandName: 'Dolo 650',
        strength: '650mg',
        dosageForm: 'tablet',
        availableQuantity: 120,
        unitPrice: 32.50,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },

      // Mumbai Pharmacy (Far) has Dolo 650
      {
        pharmacyId: farPharmacy._id,
        medicineName: 'Dolo 650 Tablet',
        genericName: 'Paracetamol',
        brandName: 'Dolo 650',
        strength: '650mg',
        dosageForm: 'tablet',
        availableQuantity: 300,
        unitPrice: 32.50,
        stockStatus: 'in_stock',
        isAvailable: true,
        lastRestockedAt: new Date(),
      },
    ]);
    console.log(`Seeded ${inventoryItems.length} inventory records.`);

    // Ensure 2dsphere indexes exist
    console.log('Ensuring 2dsphere geospatial indexes...');
    await Hospital.syncIndexes();
    await DoctorProfile.syncIndexes();
    await Pharmacy.syncIndexes();
    console.log('2dsphere indexes synchronized successfully.');

    console.log('=== SEEDING COMPLETE ===');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
