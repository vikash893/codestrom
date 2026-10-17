import { DoctorProfile } from '../models/DoctorProfile.js';
import { Pharmacy } from '../models/Pharmacy.js';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { Consultation } from '../models/Consultation.js';
import { IntakeRecord } from '../models/IntakeRecord.js';
import { AuditLog } from '../models/AuditLog.js';

export const getPendingVerifications = async (req, res, next) => {
  try {
    const doctors = await DoctorProfile.find({ verificationStatus: 'pending' }).limit(50);
    const pharmacies = await Pharmacy.find({ verificationStatus: 'pending' }).limit(50);
    const hospitals = await Hospital.find({ verificationStatus: 'pending' }).limit(50);

    res.status(200).json({
      success: true,
      pending: {
        doctors,
        pharmacies,
        hospitals,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reviewVerification = async (req, res, next) => {
  try {
    const { entityType, entityId, status, reason = '' } = req.body;

    if (!['DoctorProfile', 'Pharmacy', 'Hospital'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entityType. Must be DoctorProfile, Pharmacy, or Hospital.',
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or rejected.',
      });
    }

    let targetModel;
    if (entityType === 'DoctorProfile') targetModel = DoctorProfile;
    else if (entityType === 'Pharmacy') targetModel = Pharmacy;
    else if (entityType === 'Hospital') targetModel = Hospital;

    const item = await targetModel.findById(entityId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${entityType} record not found.`,
      });
    }

    item.verificationStatus = status;
    item.isVerified = status === 'approved';
    await item.save();

    // Also update parent User verification flag
    if (item.userId) {
      await User.findByIdAndUpdate(item.userId, { isVerified: status === 'approved' });
    }

    // Record Audit Log
    await AuditLog.create({
      actorUserId: req.user._id,
      action: status === 'approved' ? `APPROVE_${entityType.toUpperCase()}` : `REJECT_${entityType.toUpperCase()}`,
      targetEntity: entityType,
      targetId: item._id,
      details: { status, reason },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `${entityType} verification updated to ${status}.`,
      item,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlatformStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const verifiedDoctors = await DoctorProfile.countDocuments({ isVerified: true });
    const verifiedPharmacies = await Pharmacy.countDocuments({ isVerified: true });
    const emergencyHospitals = await Hospital.countDocuments({ emergencyDepartmentAvailable: true });
    const totalConsultations = await Consultation.countDocuments();
    const totalIntakes = await IntakeRecord.countDocuments();
    const emergencyIntakes = await IntakeRecord.countDocuments({ isEmergency: true });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPatients,
        verifiedDoctors,
        verifiedPharmacies,
        emergencyHospitals,
        totalConsultations,
        totalIntakes,
        emergencyIntakes,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const logs = await AuditLog.find()
      .populate('actorUserId', 'phone email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await AuditLog.countDocuments();

    res.status(200).json({
      success: true,
      total,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserSuspension = async (req, res, next) => {
  try {
    const { userId, suspend, reason = '' } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot suspend an administrative account.',
      });
    }

    user.status = suspend ? 'suspended' : 'active';
    await user.save();

    await AuditLog.create({
      actorUserId: req.user._id,
      action: suspend ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      targetEntity: 'User',
      targetId: user._id,
      details: { suspend, reason },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `User account ${suspend ? 'suspended' : 'activated'} successfully.`,
      user: {
        id: user._id,
        phone: user.phone,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
