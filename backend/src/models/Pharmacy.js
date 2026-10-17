import mongoose from 'mongoose';

const pharmacySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    drugLicenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
    },
    verifiedContactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    alternateContactNumber: {
      type: String,
      trim: true,
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
    operatingHours: {
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '22:00' },
      is24Hours: { type: Boolean, default: false },
    },
    serviceRadiusKm: {
      type: Number,
      default: 10,
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

pharmacySchema.index({ location: '2dsphere' });

export const Pharmacy = mongoose.model('Pharmacy', pharmacySchema);
