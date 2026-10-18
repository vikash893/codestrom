import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  medicineName: { type: String, required: true },
  genericName: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyInventory' },
});

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  note: { type: String },
});

const medicineOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryType: {
      type: String,
      enum: ['home_delivery', 'store_pickup'],
      default: 'home_delivery',
    },
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, default: 'Delhi' },
      postalCode: { type: String, default: '110001' },
      contactPhone: { type: String, required: true },
      patientName: { type: String },
      instructions: { type: String },
    },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: () => [{ status: 'placed', note: 'Order placed by patient' }],
    },
    paymentMethod: {
      type: String,
      enum: ['cash_on_delivery', 'online_upi'],
      default: 'cash_on_delivery',
    },
    isPrescriptionVerified: {
      type: Boolean,
      default: true,
    },
    estimatedDeliveryMinutes: {
      type: Number,
      default: 45,
    },
  },
  {
    timestamps: true,
  }
);

medicineOrderSchema.index({ patientId: 1, createdAt: -1 });
medicineOrderSchema.index({ pharmacyId: 1, status: 1, createdAt: -1 });

export const MedicineOrder = mongoose.model('MedicineOrder', medicineOrderSchema);
