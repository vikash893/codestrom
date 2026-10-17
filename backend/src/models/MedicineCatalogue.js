import mongoose from 'mongoose';

const medicineCatalogueSchema = new mongoose.Schema(
  {
    canonicalName: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    brandName: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      required: true,
      trim: true,
    },
    dosageForm: {
      type: String,
      enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'inhaler', 'drops', 'powder'],
      required: true,
    },
    strength: {
      type: String,
      required: true,
      trim: true,
    },
    packSize: {
      type: String,
      trim: true,
    },
    scheduleCategory: {
      type: String,
      enum: ['OTC', 'Schedule_H', 'Schedule_H1', 'Schedule_X'],
      default: 'OTC',
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    requiresPrescription: {
      type: Boolean,
      default: false,
    },
    contraindications: {
      type: [String],
      default: [],
    },
    pregnancyCategory: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'X', 'N'],
      default: 'N',
    },
    ageRestrictions: {
      minAgeYears: { type: Number, default: 0 },
      maxAgeYears: { type: Number, default: 120 },
      pediatricWarning: { type: String, default: null },
    },
    drugInteractions: {
      type: [String],
      default: [],
    },
    antibioticStewardship: {
      isAntibiotic: { type: Boolean, default: false },
      accessGroup: {
        type: String,
        enum: ['ACCESS', 'WATCH', 'RESERVE', 'NOT_APPLICABLE'],
        default: 'NOT_APPLICABLE',
      },
      stewardshipNotice: { type: String, default: null },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

medicineCatalogueSchema.index({ brandName: 'text', genericName: 'text' });

export const MedicineCatalogue = mongoose.model('MedicineCatalogue', medicineCatalogueSchema);
