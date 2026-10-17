import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema(
  {
    caseId: {
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
    intakeRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IntakeRecord',
      index: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    triageLevel: {
      type: String,
      enum: ['RED', 'YELLOW', 'GREEN', 'UNKNOWN'],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['P0_EMERGENCY', 'P1_URGENT', 'P2_PRIORITY', 'P3_ROUTINE'],
      required: true,
      index: true,
    },
    reasonCodes: {
      type: [String],
      default: [],
    },
    rulesetVersion: {
      type: String,
      default: 'WHO-IITT-v1.2',
    },
    patientGuidance: {
      type: String,
    },
    requiresHumanReview: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: [
        'QUEUED',
        'ACKNOWLEDGED',
        'IN_CONSULTATION',
        'ESCALATED',
        'RESOLVED',
        'CANCELLED',
      ],
      default: 'QUEUED',
      index: true,
    },
    assignedProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    escalatedAt: {
      type: Date,
      default: null,
    },
    escalationReason: {
      type: String,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    patientDetails: {
      description: String,
      language: { type: String, default: 'en' },
      duration: String,
      severity: String,
      ageYears: Number,
      relevantHistory: String,
      extractedSymptoms: [String],
    },
    evidenceSynthesis: {
      possibleConditions: [
        {
          name: String,
          confidence: Number,
          clinicalRationale: String,
          missingFindings: [String],
          warningSigns: [String],
          citations: [
            {
              source: String,
              title: String,
              url: String,
            },
          ],
        },
      ],
      firstAidMeasures: [
        {
          action: String,
          instructions: String,
          rationale: String,
        },
      ],
      suggestedMedicines: [
        {
          name: String,
          genericName: String,
          purpose: String,
          dosageGuide: String,
          prescriptionRequired: Boolean,
          precautions: String,
        },
      ],
      disclaimer: {
        type: String,
        default:
          'Medical decision-support only. Autonomous diagnosis or prescribing is strictly prohibited.',
      },
    },
    patientLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.209, 28.6139],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast SLA queue ordering and provider queries
caseSchema.index({ priority: 1, createdAt: 1, status: 1 });
caseSchema.index({ assignedProviderId: 1, status: 1 });
caseSchema.index({ patientLocation: '2dsphere' });

export const Case = mongoose.model('Case', caseSchema);
