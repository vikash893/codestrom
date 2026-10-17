import { DoctorProfile } from '../models/DoctorProfile.js';

export const createOrUpdateProfile = async (req, res, next) => {
  try {
    const {
      fullName,
      medicalRegistrationNumber,
      registrationCouncil,
      qualifications,
      specialties,
      experienceYears,
      consultationModes,
      consultationFee,
      clinicAddress,
      longitude,
      latitude,
      verifiedPhone,
      workingHours,
    } = req.body;

    if (!fullName || !medicalRegistrationNumber || !registrationCouncil || !verifiedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Full name, registration number, council, and contact phone are required.',
      });
    }

    const coordinates = (longitude !== undefined && latitude !== undefined)
      ? [parseFloat(longitude), parseFloat(latitude)]
      : undefined;

    const existingProfile = await DoctorProfile.findOne({ userId: req.user._id });

    if (existingProfile) {
      existingProfile.fullName = fullName;
      existingProfile.medicalRegistrationNumber = medicalRegistrationNumber;
      existingProfile.registrationCouncil = registrationCouncil;
      if (qualifications) existingProfile.qualifications = qualifications;
      if (specialties) existingProfile.specialties = specialties;
      if (experienceYears !== undefined) existingProfile.experienceYears = experienceYears;
      if (consultationModes) existingProfile.consultationModes = consultationModes;
      if (consultationFee !== undefined) existingProfile.consultationFee = consultationFee;
      if (clinicAddress) existingProfile.clinicAddress = clinicAddress;
      if (coordinates) existingProfile.location = { type: 'Point', coordinates };
      existingProfile.verifiedPhone = verifiedPhone;
      if (workingHours) existingProfile.workingHours = workingHours;

      await existingProfile.save();
      return res.status(200).json({
        success: true,
        message: 'Doctor profile updated successfully.',
        profile: existingProfile,
      });
    }

    const newProfile = await DoctorProfile.create({
      userId: req.user._id,
      fullName,
      medicalRegistrationNumber,
      registrationCouncil,
      qualifications: qualifications || ['MBBS'],
      specialties: specialties || ['General Physician'],
      experienceYears: experienceYears || 1,
      consultationModes: consultationModes || ['chat', 'audio', 'video'],
      consultationFee: consultationFee || 500,
      clinicAddress: clinicAddress || '',
      location: coordinates ? { type: 'Point', coordinates } : { type: 'Point', coordinates: [77.2090, 28.6139] },
      verifiedPhone,
      workingHours: workingHours || { start: '09:00', end: '18:00', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
      isVerified: false, // Must be verified by admin
      verificationStatus: 'pending',
      isAvailable: false,
    });

    res.status(201).json({
      success: true,
      message: 'Doctor profile created. Verification is pending administrative review.',
      profile: newProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleAvailability = async (req, res, next) => {
  try {
    const profile = await DoctorProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found. Please create a profile first.',
      });
    }

    const { isAvailable } = req.body;
    profile.isAvailable = typeof isAvailable === 'boolean' ? isAvailable : !profile.isAvailable;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Doctor status updated to ${profile.isAvailable ? 'available' : 'unavailable'}.`,
      isAvailable: profile.isAvailable,
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorProfile = async (req, res, next) => {
  try {
    const profile = await DoctorProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    res.status(200).json({
      success: true,
      doctor: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const listDoctors = async (req, res, next) => {
  try {
    const { specialty, availableOnly = 'true' } = req.query;
    const filter = {};

    if (specialty) {
      filter.specialties = { $regex: specialty, $options: 'i' };
    }
    if (availableOnly === 'true') {
      filter.isAvailable = true;
    }

    const doctors = await DoctorProfile.find(filter).sort({ experienceYears: -1 }).limit(50);

    res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    next(error);
  }
};
