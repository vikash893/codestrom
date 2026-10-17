import crypto from 'crypto';
import { Consultation } from '../models/Consultation.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { IntakeRecord } from '../models/IntakeRecord.js';
import { Notification } from '../models/Notification.js';
import { emitToUser, emitToConsultation } from '../config/socket.js';

export const requestConsultation = async (req, res, next) => {
  try {
    const { doctorId, intakeRecordId, consultationType = 'chat' } = req.body;

    if (!doctorId || !intakeRecordId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID and Intake Record ID are required.',
      });
    }

    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    const intakeRecord = await IntakeRecord.findById(intakeRecordId);
    if (!intakeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Intake record not found.',
      });
    }

    // Check ownership of intake record
    if (intakeRecord.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only request consultations for your own intake records.',
      });
    }

    // Create Consultation
    const consultation = await Consultation.create({
      patientId: req.user._id,
      doctorId: doctor._id,
      intakeRecordId: intakeRecord._id,
      consultationType,
      status: 'requested',
    });

    // Notify Doctor
    await Notification.create({
      userId: doctor.userId,
      title: 'New Consultation Request',
      message: `A patient has requested a ${consultationType} consultation.`,
      category: 'consultation',
      metadata: { consultationId: consultation._id },
    });
    emitToUser(doctor.userId, 'new_consultation_request', {
      consultationId: consultation._id,
      consultationType,
      patientId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Consultation requested successfully.',
      consultation,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyConsultations = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      const doctorProfile = await DoctorProfile.findOne({ userId: req.user._id });
      if (!doctorProfile) {
        return res.status(404).json({
          success: false,
          message: 'Doctor profile not found.',
        });
      }
      filter.doctorId = doctorProfile._id;
    } else if (req.user.role === 'admin') {
      // Admin sees all
    } else {
      return res.status(403).json({
        success: false,
        message: 'Forbidden.',
      });
    }

    const consultations = await Consultation.find(filter)
      .populate('patientId', 'phone email')
      .populate('doctorId', 'fullName specialties consultationFee verifiedPhone')
      .populate('intakeRecordId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: consultations.length,
      consultations,
    });
  } catch (error) {
    next(error);
  }
};

export const getConsultationById = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('patientId', 'phone email')
      .populate('doctorId')
      .populate('intakeRecordId');

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found.',
      });
    }

    // Verify participant authorization
    let isAuthorized = false;
    if (req.user.role === 'admin') {
      isAuthorized = true;
    } else if (req.user.role === 'patient') {
      isAuthorized = consultation.patientId._id.toString() === req.user._id.toString();
    } else if (req.user.role === 'doctor') {
      const doctorProfile = await DoctorProfile.findOne({ userId: req.user._id });
      isAuthorized = doctorProfile && consultation.doctorId._id.toString() === doctorProfile._id.toString();
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not a participant in this consultation.',
      });
    }

    res.status(200).json({
      success: true,
      consultation,
    });
  } catch (error) {
    next(error);
  }
};

export const updateConsultationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['accepted', 'declined', 'in_progress', 'completed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of [${validStatuses.join(', ')}].`,
      });
    }

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found.',
      });
    }

    // Role verification
    if (req.user.role === 'doctor') {
      const doctorProfile = await DoctorProfile.findOne({ userId: req.user._id });
      if (!doctorProfile || consultation.doctorId.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only the assigned doctor can update this consultation status.',
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Patients cannot directly transition consultation status.',
      });
    }

    consultation.status = status;

    if (status === 'accepted' && !consultation.sessionToken) {
      consultation.sessionToken = crypto.randomBytes(16).toString('hex');
    }
    if (status === 'in_progress' && !consultation.startedAt) {
      consultation.startedAt = new Date();
    }
    if (status === 'completed' && !consultation.completedAt) {
      consultation.completedAt = new Date();
    }

    await consultation.save();

    // Notify patient
    await Notification.create({
      userId: consultation.patientId,
      title: `Consultation ${status.toUpperCase()}`,
      message: `Your consultation request has been marked as ${status}.`,
      category: 'consultation',
      metadata: { consultationId: consultation._id, status },
    });
    emitToUser(consultation.patientId, 'consultation_status_changed', {
      consultationId: consultation._id,
      status,
      sessionToken: consultation.sessionToken,
    });
    emitToConsultation(consultation._id, 'consultation_status_changed', {
      consultationId: consultation._id,
      status,
    });

    res.status(200).json({
      success: true,
      message: `Consultation status updated to ${status}.`,
      consultation,
    });
  } catch (error) {
    next(error);
  }
};

export const submitClinicalNotes = async (req, res, next) => {
  try {
    const { clinicalNotes, recommendations, prescribedMedicines } = req.body;

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found.',
      });
    }

    // Only assigned doctor can submit clinical notes
    const doctorProfile = await DoctorProfile.findOne({ userId: req.user._id });
    if (!doctorProfile || consultation.doctorId.toString() !== doctorProfile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the assigned doctor can record clinical consultation notes.',
      });
    }

    if (clinicalNotes) consultation.clinicalNotes = clinicalNotes;
    if (recommendations) consultation.recommendations = recommendations;
    if (prescribedMedicines && Array.isArray(prescribedMedicines)) {
      consultation.prescribedMedicines = prescribedMedicines;
    }
    consultation.status = 'completed';
    consultation.completedAt = new Date();

    await consultation.save();

    // Notify patient of consultation notes and prescriptions
    await Notification.create({
      userId: consultation.patientId,
      title: 'Consultation Notes Ready',
      message: 'Your doctor has completed your consultation and added prescription/care notes.',
      category: 'consultation',
      metadata: { consultationId: consultation._id },
    });
    emitToUser(consultation.patientId, 'consultation_completed', {
      consultationId: consultation._id,
      recommendations,
      prescribedMedicines,
    });

    res.status(200).json({
      success: true,
      message: 'Clinical notes and prescriptions submitted successfully.',
      consultation,
    });
  } catch (error) {
    next(error);
  }
};
