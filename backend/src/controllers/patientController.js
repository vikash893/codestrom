import { PatientProfile } from '../models/PatientProfile.js';
import { IntakeRecord } from '../models/IntakeRecord.js';

export const getProfile = async (req, res, next) => {
  try {
    const profile = await PatientProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found.',
      });
    }

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const {
      fullName,
      dateOfBirth,
      gender,
      preferredLanguage,
      bloodGroup,
      allergies,
      chronicConditions,
    } = req.body;

    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        ...(fullName && { fullName }),
        ...(dateOfBirth && { dateOfBirth }),
        ...(gender && { gender }),
        ...(preferredLanguage && { preferredLanguage }),
        ...(bloodGroup && { bloodGroup }),
        ...(allergies && { allergies }),
        ...(chronicConditions && { chronicConditions }),
      },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

export const addEmergencyContact = async (req, res, next) => {
  try {
    const { name, relationship, phone } = req.body;

    if (!name || !relationship || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, relationship, and contact phone number are required.',
      });
    }

    const profile = await PatientProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found.',
      });
    }

    profile.emergencyContacts.push({ name, relationship, phone });
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Emergency contact added successfully.',
      emergencyContacts: profile.emergencyContacts,
    });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const history = await IntakeRecord.find({ patientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
};
