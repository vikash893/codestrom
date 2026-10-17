import mongoose from 'mongoose';

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    medicalRegistrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    registrationCouncil: {
      type: String,
      required: true,
      trim: true,
    },
    qualifications: {
      type: [String],
      default: [],
    },
    specialties: {
      type: [String],
      default: ['General Physician'],
      index: true,
    },
    experienceYears: {
      type: Number,
      min: 0,
      default: 1,
    },
    consultationModes: {
      type: [String],
      enum: ['chat', 'audio', 'video', 'in_person'],
      default: ['chat', 'audio', 'video'],
    },
    consultationFee: {
      type: Number,
      min: 0,
      default: 500,
    },
    clinicAddress: {
      type: String,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [77.2090, 28.6139], // Default Delhi
      },
    },
    verifiedPhone: {
      type: String,
      required: true,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: false,
      index: true,
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      days: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      },
    },
  },
  {
    timestamps: true,
  }
);

doctorProfileSchema.index({ location: '2dsphere' });

export const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);
