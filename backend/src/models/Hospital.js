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
  },
  {
    timestamps: true,
  }
);

hospitalSchema.index({ location: '2dsphere' });

export const Hospital = mongoose.model('Hospital', hospitalSchema);
