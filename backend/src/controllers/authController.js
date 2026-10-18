import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Pharmacy } from '../models/Pharmacy.js';
import { Hospital } from '../models/Hospital.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

export const register = async (req, res, next) => {
  try {
    const {
      phone,
      email,
      password,
      fullName,
      role = 'patient',
      preferredLanguage = 'en',
      // Doctor specific fields
      medicalRegistrationNumber,
      registrationCouncil,
      specialties,
      qualifications,
      consultationFee,
      clinicAddress,
      workingHours,
      // Pharmacy specific fields
      storeName,
      drugLicenseNumber,
      gstin,
      pharmacyAddress,
      homeDeliveryAvailable,
      deliveryRadiusKm,
      operatingHours,
      // Hospital specific fields
      hospitalName,
      hospitalRegistrationNumber,
      hospitalAddress,
      emergencyDepartmentAvailable,
      traumaCareLevel,
      emergencyNumbers,
      // Location
      latitude,
      longitude,
    } = req.body;

    const displayName = fullName || storeName || hospitalName;

    if (!phone || !password || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, password, and name are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Role safety: ordinary registration cannot assign admin role
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be self-registered.',
      });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this phone number already exists.',
      });
    }

    const parsedLat = Number(latitude) || 28.6139;
    const parsedLng = Number(longitude) || 77.2090;

    const passwordHash = await User.hashPassword(password);
    const isHealthcareProvider = ['doctor', 'pharmacy', 'hospital'].includes(role);
    const user = await User.create({
      phone,
      email: email || undefined,
      passwordHash,
      role,
      status: isHealthcareProvider ? 'pending' : 'active',
      isVerified: !isHealthcareProvider,
    });

    let profile = null;

    if (role === 'patient') {
      profile = await PatientProfile.create({
        userId: user._id,
        fullName: displayName,
        preferredLanguage,
        gender: req.body.gender || undefined,
        bloodGroup: req.body.bloodGroup || undefined,
        emergencyContacts: req.body.emergencyContactPhone
          ? [
              {
                name: req.body.emergencyContactName || 'Emergency Contact',
                relationship: req.body.emergencyContactRelationship || 'Family',
                phone: req.body.emergencyContactPhone,
              },
            ]
          : [],
      });
    } else if (role === 'doctor' && (medicalRegistrationNumber || clinicAddress || req.body.specialties)) {
      profile = await DoctorProfile.create({
        userId: user._id,
        fullName: displayName,
        medicalRegistrationNumber: medicalRegistrationNumber || `MED-REG-${Date.now().toString().slice(-6)}`,
        registrationCouncil: registrationCouncil || 'State Medical Council',
        specialties: Array.isArray(specialties) && specialties.length > 0 ? specialties : ['General Medicine'],
        qualifications: Array.isArray(qualifications) && qualifications.length > 0 ? qualifications : ['MBBS'],
        consultationFee: Number(consultationFee) || 500,
        consultationModes: ['chat', 'audio', 'video'],
        clinicAddress: clinicAddress || 'Central Medical Center',
        verifiedPhone: phone,
        isAvailable: true,
        isVerified: false,
        verificationStatus: 'pending',
        workingHours: workingHours || { start: '09:00', end: '19:00' },
        location: {
          type: 'Point',
          coordinates: [parsedLng, parsedLat],
        },
      });
    } else if (role === 'pharmacy' && (drugLicenseNumber || storeName || pharmacyAddress)) {
      profile = await Pharmacy.create({
        userId: user._id,
        storeName: storeName || displayName,
        drugLicenseNumber: drugLicenseNumber || `DL-PHARM-${Date.now().toString().slice(-6)}`,
        gstin: gstin || '07AAAAA0000A1Z5',
        verifiedContactNumber: phone,
        address: {
          street: pharmacyAddress?.street || 'Main Market Road',
          city: pharmacyAddress?.city || 'Delhi',
          state: pharmacyAddress?.state || 'Delhi',
          postalCode: pharmacyAddress?.postalCode || '110001',
        },
        location: {
          type: 'Point',
          coordinates: [parsedLng, parsedLat],
        },
        homeDeliveryAvailable: homeDeliveryAvailable !== false,
        deliveryRadiusKm: Number(deliveryRadiusKm) || 10,
        serviceRadiusKm: Number(deliveryRadiusKm) || 10,
        operatingHours: {
          openTime: operatingHours?.openTime || '08:00',
          closeTime: operatingHours?.closeTime || '22:00',
          is24Hours: Boolean(operatingHours?.is24Hours),
        },
        isVerified: false,
        verificationStatus: 'pending',
        isActive: true,
      });
    } else if (role === 'hospital' && (hospitalName || hospitalRegistrationNumber || hospitalAddress)) {
      profile = await Hospital.create({
        userId: user._id,
        hospitalName: hospitalName || displayName || 'Central Multispecialty Hospital',
        registrationNumber: hospitalRegistrationNumber || `HOSP-REG-${Date.now().toString().slice(-6)}`,
        verifiedEmergencyNumbers: Array.isArray(emergencyNumbers) && emergencyNumbers.length > 0 ? emergencyNumbers : [phone, '112'],
        regularPhoneNumbers: [phone],
        address: {
          street: hospitalAddress?.street || 'Civil Hospital Road',
          city: hospitalAddress?.city || 'Delhi',
          state: hospitalAddress?.state || 'Delhi',
          postalCode: hospitalAddress?.postalCode || '110001',
        },
        location: {
          type: 'Point',
          coordinates: [parsedLng, parsedLat],
        },
        emergencyDepartmentAvailable: emergencyDepartmentAvailable !== false,
        traumaCareLevel: traumaCareLevel || 'Level 1',
        operatingHours: { is24Hours: true },
        isVerified: false,
        verificationStatus: 'pending',
        isActive: true,
        hospitalDoctors: [
          {
            doctorId: 'DOC-HOSP-01',
            name: 'Dr. R. K. Sharma',
            specialty: 'Cardiology & Emergency',
            qualification: 'MBBS, MD, DM (Cardiology)',
            isOnDuty: true,
            phone: phone,
            workingHours: '24/7 Trauma Shift',
          },
          {
            doctorId: 'DOC-HOSP-02',
            name: 'Dr. Ananya Sen',
            specialty: 'Emergency & Critical Care',
            qualification: 'MBBS, MD (Emergency Medicine)',
            isOnDuty: true,
            phone: phone,
            workingHours: '08:00 - 20:00',
          },
          {
            doctorId: 'DOC-HOSP-03',
            name: 'Dr. Vikram Verma',
            specialty: 'General & Trauma Surgery',
            qualification: 'MBBS, MS (General Surgery)',
            isOnDuty: true,
            phone: phone,
            workingHours: '09:00 - 18:00',
          },
          {
            doctorId: 'DOC-HOSP-04',
            name: 'Dr. Priya Patel',
            specialty: 'Pulmonology & ICU Care',
            qualification: 'MBBS, MD (Pulmonary Medicine)',
            isOnDuty: true,
            phone: phone,
            workingHours: '10:00 - 19:00',
          },
        ],
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { phoneOrEmail, password, latitude, longitude } = req.body;

    if (!phoneOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone/email and password are required.',
      });
    }

    const user = await User.findOne({
      $or: [{ phone: phoneOrEmail }, { email: phoneOrEmail.toLowerCase() }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone/email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone/email or password.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact support.',
      });
    }

    // Update live coordinates on login if provided
    if (latitude !== undefined && longitude !== undefined) {
      const parsedLat = Number(latitude);
      const parsedLng = Number(longitude);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        if (user.role === 'doctor') {
          await DoctorProfile.updateOne(
            { userId: user._id },
            { $set: { 'location.coordinates': [parsedLng, parsedLat] } }
          );
        } else if (user.role === 'pharmacy') {
          await Pharmacy.updateOne(
            { userId: user._id },
            { $set: { 'location.coordinates': [parsedLng, parsedLat] } }
          );
        } else if (user.role === 'hospital') {
          await Hospital.updateOne(
            { verifiedEmergencyNumbers: user.phone },
            { $set: { 'location.coordinates': [parsedLng, parsedLat] } }
          );
        }
      }
    }

    const token = generateToken(user);

    let profile = null;
    if (user.role === 'patient') {
      profile = await PatientProfile.findOne({ userId: user._id });
    } else if (user.role === 'doctor') {
      profile = await DoctorProfile.findOne({ userId: user._id });
    } else if (user.role === 'pharmacy') {
      profile = await Pharmacy.findOne({ userId: user._id });
    } else if (user.role === 'hospital') {
      profile = await Hospital.findOne({ verifiedEmergencyNumbers: user.phone }) || await Hospital.findOne({});
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        name: profile?.fullName || profile?.storeName || profile?.hospitalName || user.phone,
      },
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    let profile = null;
    if (req.user.role === 'patient') {
      profile = await PatientProfile.findOne({ userId: req.user._id });
    } else if (req.user.role === 'doctor') {
      profile = await DoctorProfile.findOne({ userId: req.user._id });
    } else if (req.user.role === 'pharmacy') {
      profile = await Pharmacy.findOne({ userId: req.user._id });
    } else if (req.user.role === 'hospital') {
      profile = await Hospital.findOne({ verifiedEmergencyNumbers: req.user.phone }) || await Hospital.findOne({});
    }

    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        phone: req.user.phone,
        email: req.user.email,
        role: req.user.role,
        isVerified: req.user.isVerified,
        name: profile?.fullName || profile?.storeName || profile?.hospitalName || req.user.phone,
      },
      profile,
    });
  } catch (error) {
    next(error);
  }
};
