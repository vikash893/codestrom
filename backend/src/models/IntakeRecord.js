import mongoose from 'mongoose';

const intakeRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    gender: {
      type: String,
      default: 'unspecified',
    },
    rawDescription: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      trim: true,
    },
    reportedSeverity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'unknown'],
      default: 'unknown',
    },
    patientAge: {
      type: Number,
      min: 0,
      max: 120,
    },
    relevantHistory: {
      type: String,
      trim: true,
    },
    detectedLanguage: {
      type: String,
      default: 'en',
    },
    extractedSymptoms: {
      type: [String],
      default: [],
    },
    isEmergency: {
      type: Boolean,
      default: false,
      index: true,
    },
    emergencyFlags: {
      type: [String],
      default: [],
    },
    emergencyGuidance: {
      type: String,
    },
    structuredSummary: {
      type: String,
      required: true,
    },
    needsClinicianReview: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['received', 'consultation_requested', 'reviewed', 'emergency_escalated'],
      default: 'received',
    },
  },
  {
    timestamps: true,
  }
);

export const IntakeRecord = mongoose.model('IntakeRecord', intakeRecordSchema);
