import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
      index: true,
    },
    intakeRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IntakeRecord',
      required: true,
    },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    consultationType: {
      type: String,
      enum: ['chat', 'audio', 'video', 'in_person'],
      default: 'chat',
    },
    sessionToken: {
      type: String,
    },
    clinicalNotes: {
      type: String,
    },
    recommendations: {
      type: String,
    },
    prescribedMedicines: [
      {
        medicineName: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        durationDays: { type: Number, required: true },
        instructions: { type: String },
      },
    ],
    scheduledAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Consultation = mongoose.model('Consultation', consultationSchema);
