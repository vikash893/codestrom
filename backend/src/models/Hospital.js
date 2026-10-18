import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
    },
    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    verifiedEmergencyNumbers: {
      type: [String],
      required: true,
      validate: [
        (v) => Array.isArray(v) && v.length > 0,
        'At least one verified emergency phone number is required.',
      ],
    },
    regularPhoneNumbers: {
      type: [String],
      default: [],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
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
      },
    },
    emergencyDepartmentAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    traumaCareLevel: {
      type: String,
      enum: ['Level 1', 'Level 2', 'Level 3', 'General'],
      default: 'General',
    },
    ambulanceAvailable: {
      type: Boolean,
      default: true,
    },
    operatingHours: {
      is24Hours: { type: Boolean, default: true },
      openTime: { type: String },
      closeTime: { type: String },
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
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    beds: {
      icu: {
        total: { type: Number, default: 15 },
        available: { type: Number, default: 8 },
        reserved: { type: Number, default: 4 },
        occupied: { type: Number, default: 3 },
      },
      emergency: {
        total: { type: Number, default: 25 },
        available: { type: Number, default: 14 },
        reserved: { type: Number, default: 6 },
        occupied: { type: Number, default: 5 },
      },
      oxygen: {
        total: { type: Number, default: 40 },
        available: { type: Number, default: 22 },
        reserved: { type: Number, default: 10 },
        occupied: { type: Number, default: 8 },
      },
      general: {
        total: { type: Number, default: 80 },
        available: { type: Number, default: 45 },
        reserved: { type: Number, default: 20 },
        occupied: { type: Number, default: 15 },
      },
    },
    bedReservations: [
      {
        reservationId: { type: String, required: true },
        requestId: { type: String },
        patientName: { type: String, required: true },
        patientPhone: { type: String, required: true },
        patientAge: { type: Number },
        bedType: { type: String, enum: ['icu', 'emergency', 'oxygen', 'general'], required: true },
        bedNumber: { type: String, required: true },
        admissionPriority: { type: String, default: 'P0 Emergency' },
        status: { type: String, enum: ['reserved', 'admitted', 'discharged', 'cancelled'], default: 'reserved' },
        notes: { type: String },
        reservedAt: { type: Date, default: Date.now },
      },
    ],
    hospitalDoctors: [
      {
        doctorId: { type: String, required: true },
        name: { type: String, required: true },
        specialty: { type: String, required: true },
        qualification: { type: String, default: 'MBBS, MD' },
        isOnDuty: { type: Boolean, default: true },
        phone: { type: String },
        workingHours: { type: String, default: '09:00 - 18:00' },
      },
    ],
    doctorSchedules: [
      {
        scheduleId: { type: String, required: true },
        requestId: { type: String },
        patientName: { type: String, required: true },
        patientPhone: { type: String, required: true },
        doctorName: { type: String, required: true },
        specialty: { type: String, required: true },
        scheduledTime: { type: String, required: true },
        consultationType: { type: String, default: 'Emergency Triage' },
        priority: { type: String, default: 'Immediate' },
        status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'cancelled'], default: 'scheduled' },
        notes: { type: String },
        scheduledAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

hospitalSchema.index({ location: '2dsphere' });

export const Hospital = mongoose.model('Hospital', hospitalSchema);
