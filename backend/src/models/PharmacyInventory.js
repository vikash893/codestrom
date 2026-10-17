import mongoose from 'mongoose';

const pharmacyInventorySchema = new mongoose.Schema(
  {
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    medicineCatalogueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicineCatalogue',
    },
    medicineName: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      trim: true,
    },
    brandName: {
      type: String,
      trim: true,
    },
    strength: {
      type: String,
      trim: true,
    },
    dosageForm: {
      type: String,
      trim: true,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
    },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastRestockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

pharmacyInventorySchema.index({ pharmacyId: 1, medicineCatalogueId: 1 });
pharmacyInventorySchema.index({ pharmacyId: 1, medicineName: 1 });

export const PharmacyInventory = mongoose.model('PharmacyInventory', pharmacyInventorySchema);
