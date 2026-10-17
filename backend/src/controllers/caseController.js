import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config/env.js';
import { Case } from '../models/Case.js';
import { IntakeRecord } from '../models/IntakeRecord.js';
import { Notification } from '../models/Notification.js';
import { Hospital } from '../models/Hospital.js';
import { Pharmacy } from '../models/Pharmacy.js';
import { PharmacyInventory } from '../models/PharmacyInventory.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { emitToRole, emitToUser } from '../config/socket.js';


// Helper to determine WHO 4-tier triage priority locally if AI service is unavailable
const evaluateLocalTriage = (description = '', severity = 'unknown') => {
  const lower = description.toLowerCase();
  const isEmergency =
    lower.includes('chest pain') ||
    lower.includes('heart attack') ||
    lower.includes('cannot breathe') ||
    lower.includes('sine me dard') ||
    lower.includes('saans nahi') ||
    lower.includes('stroke') ||
    lower.includes('unconscious') ||
    lower.includes('behosh');

  if (isEmergency) {
    return {
      level: 'RED',
      priority: 'P0_EMERGENCY',
      reason_codes: ['CRITICAL_SYMPTOM_FALLBACK'],
      patient_guidance:
        'CRITICAL WARNING: Urgent symptoms detected. Please call 112 immediately or proceed to the nearest emergency hospital.',
      requires_human_review: true,
      ruleset_version: 'WHO-IITT-v1.2-fallback',
    };
  }

  if (severity === 'severe' || lower.includes('high fever') || lower.includes('tez bukhar')) {
    return {
      level: 'YELLOW',
      priority: 'P1_URGENT',
      reason_codes: ['URGENT_SYMPTOM_OR_REPORTED_SEVERE'],
      patient_guidance:
        'URGENT REVIEW RECOMMENDED: High severity reported. A medical professional should evaluate you promptly.',
      requires_human_review: true,
      ruleset_version: 'WHO-IITT-v1.2-fallback',
    };
  }

  if (description.trim().length < 10) {
    return {
      level: 'UNKNOWN',
      priority: 'P2_PRIORITY',
      reason_codes: ['INSUFFICIENT_INFORMATION'],
      patient_guidance: 'Description is brief. Clinician review required.',
      requires_human_review: true,
      ruleset_version: 'WHO-IITT-v1.2-fallback',
    };
  }

  return {
    level: 'GREEN',
    priority: 'P3_ROUTINE',
    reason_codes: ['NON_URGENT_SYMPTOMS'],
    patient_guidance: null,
    requires_human_review: true,
    ruleset_version: 'WHO-IITT-v1.2-fallback',
  };
};

/**
 * POST /api/v1/cases
 * Submits symptom intake and creates a prioritized case with idempotency
 */
export const createCase = async (req, res, next) => {
  try {
    const {
      description,
      language = 'en',
      duration,
      severity = 'unknown',
      age_years,
      relevant_history,
      latitude,
      longitude,
      idempotencyKey,
    } = req.body;

    if (!description || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 5 characters long.',
      });
    }

    // Check idempotency if key provided
    if (idempotencyKey) {
      const existingCase = await Case.findOne({ idempotencyKey });
      if (existingCase) {
        return res.status(200).json({
          success: true,
          isDuplicate: true,
          case: existingCase,
        });
      }
    }

    // Call Python AI Service for deterministic WHO 4-tier screening and feature extraction
    let aiData;
    try {
      const aiResponse = await axios.post(
        `${config.aiServiceUrl}/api/v1/intake`,
        {
          description,
          language,
          duration,
          severity,
          age_years,
          relevant_history,
        },
        { timeout: 8000 }
      );
      aiData = aiResponse.data;
    } catch (err) {
      console.warn(`[Case Controller] AI service unavailable (${err.message}). Using local safe triage engine.`);
      const localTriage = evaluateLocalTriage(description, severity);
      aiData = {
        status: 'received',
        summary: `Patient description: ${description}`,
        triage: localTriage,
        patient_guidance: localTriage.patient_guidance,
        detected_language: language,
        extracted_symptoms: [],
        disclaimer:
          'This service does not provide an autonomous diagnosis or prescription. Seek emergency medical care immediately for severe symptoms.',
      };
    }

    const triage = aiData.triage || evaluateLocalTriage(description, severity);
    const generatedCaseId = `CASE-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Create linked IntakeRecord
    const intakeRecord = await IntakeRecord.create({
      patientId: req.user._id,
      rawDescription: description,
      duration,
      reportedSeverity: severity,
      patientAge: age_years,
      relevantHistory: relevant_history,
      detectedLanguage: aiData.detected_language || language,
      extractedSymptoms: aiData.extracted_symptoms || [],
      isEmergency: triage.level === 'RED',
      emergencyFlags: triage.reason_codes || [],
      emergencyGuidance: triage.patient_guidance || null,
      structuredSummary: aiData.summary || description,
      needsClinicianReview: triage.requires_human_review ?? true,
      status: triage.level === 'RED' ? 'emergency_escalated' : 'received',
    });

    const parsedLat = Number(latitude) || 28.6139;
    const parsedLng = Number(longitude) || 77.209;

    // Create durable Case
    const newCase = await Case.create({
      caseId: generatedCaseId,
      patientId: req.user._id,
      intakeRecordId: intakeRecord._id,
      idempotencyKey: idempotencyKey || undefined,
      triageLevel: triage.level,
      priority: triage.priority,
      reasonCodes: triage.reason_codes,
      rulesetVersion: triage.ruleset_version || 'WHO-IITT-v1.2',
      patientGuidance: triage.patient_guidance,
      requiresHumanReview: triage.requires_human_review ?? true,
      status: 'QUEUED',
      patientDetails: {
        description,
        language: aiData.detected_language || language,
        duration,
        severity,
        ageYears: age_years,
        relevantHistory: relevant_history,
        extractedSymptoms: aiData.extracted_symptoms || [],
      },
      evidenceSynthesis: aiData.evidence_synthesis || {
        possibleConditions: [],
        disclaimer: 'Medical decision-support only.',
      },
      patientLocation: {
        type: 'Point',
        coordinates: [parsedLng, parsedLat],
      },
    });

    // Real-Time Notification & Broadcast
    // 1. If P0 Emergency, broadcast immediate high-priority alert to all connected doctors & hospitals
    if (newCase.priority === 'P0_EMERGENCY' || newCase.triageLevel === 'RED') {
      emitToRole('doctor', 'emergency_alert', {
        caseId: newCase.caseId,
        priority: newCase.priority,
        triageLevel: newCase.triageLevel,
        reasonCodes: newCase.reasonCodes,
        createdAt: newCase.createdAt,
      });

      emitToRole('hospital', 'emergency_alert', {
        caseId: newCase.caseId,
        priority: newCase.priority,
        triageLevel: newCase.triageLevel,
        reasonCodes: newCase.reasonCodes,
        createdAt: newCase.createdAt,
      });
    }

    // 2. Broadcast queue update to doctor and hospital channels
    emitToRole('doctor', 'queue_updated', {
      caseId: newCase.caseId,
      priority: newCase.priority,
      triageLevel: newCase.triageLevel,
      status: newCase.status,
    });
    emitToRole('hospital', 'queue_updated', {
      caseId: newCase.caseId,
      priority: newCase.priority,
      triageLevel: newCase.triageLevel,
      status: newCase.status,
    });

    // 3. Notify patient
    await Notification.create({
      userId: req.user._id,
      title: triage.level === 'RED' ? 'EMERGENCY WARNING' : 'Intake Case Queued',
      message:
        triage.level === 'RED'
          ? `Immediate attention required: Call 112 or visit nearest emergency room. Case ${newCase.caseId} opened.`
          : `Your symptoms have been logged as ${triage.priority} priority. Case ID: ${newCase.caseId}.`,
      type: triage.level === 'RED' ? 'emergency' : 'system',
      data: { caseId: newCase.caseId, triageLevel: triage.level },
    });

    // 4. Geospatial resource discovery matching patient's condition & location
    let nearbyFacilities = {
      hospitals: [],
      doctors: [],
      pharmaciesWithStock: [],
    };

    try {
      const centerPoint = {
        type: 'Point',
        coordinates: [parsedLng, parsedLat],
      };
      const geoNearStage = {
        $geoNear: {
          near: centerPoint,
          distanceField: 'distanceMeters',
          maxDistance: 25000, // 25 km radius
          spherical: true,
        },
      };

      // A. Emergency & General Hospitals
      nearbyFacilities.hospitals = await Hospital.aggregate([
        geoNearStage,
        { $match: { isActive: true } },
        {
          $project: {
            hospitalName: 1,
            emergencyDepartmentAvailable: 1,
            verifiedEmergencyNumbers: 1,
            regularPhoneNumbers: 1,
            address: 1,
            traumaCareLevel: 1,
            distanceMeters: { $round: ['$distanceMeters', 0] },
          },
        },
        { $sort: { distanceMeters: 1 } },
        { $limit: 3 },
      ]);

      // B. Relevant Available Doctors
      const suggestedSpecs = aiData.evidence_synthesis?.suggested_specialties || [];
      const docMatch = { isAvailable: true };
      if (suggestedSpecs.length > 0) {
        docMatch.specialties = { $in: suggestedSpecs };
      }

      nearbyFacilities.doctors = await DoctorProfile.aggregate([
        geoNearStage,
        { $match: docMatch },
        {
          $project: {
            fullName: 1,
            specialties: 1,
            qualifications: 1,
            consultationFee: 1,
            verifiedPhone: 1,
            isAvailable: 1,
            distanceMeters: { $round: ['$distanceMeters', 0] },
          },
        },
        { $sort: { distanceMeters: 1 } },
        { $limit: 3 },
      ]);

      // C. Match physical pharmacies with stock for suggested medicines
      const suggestedMeds = aiData.evidence_synthesis?.suggested_otc_medicines || [];
      const searchTerms = suggestedMeds.map((m) => m.name.split('/')[0].trim());

      if (searchTerms.length > 0) {
        const regexPatterns = searchTerms.map((term) => new RegExp(term, 'i'));
        const stockItems = await PharmacyInventory.find({
          isAvailable: true,
          availableQuantity: { $gt: 0 },
          $or: [
            { medicineName: { $in: regexPatterns } },
            { genericName: { $in: regexPatterns } },
            { brandName: { $in: regexPatterns } },
          ],
        }).populate('pharmacyId').limit(5).lean();

        nearbyFacilities.pharmaciesWithStock = stockItems
          .filter((item) => item.pharmacyId && item.pharmacyId.isActive)
          .map((item) => ({
            inventoryId: item._id,
            medicineName: item.medicineName,
            availableQuantity: item.availableQuantity,
            unitPrice: item.unitPrice,
            stockStatus: item.stockStatus,
            pharmacyName: item.pharmacyId.storeName,
            contactNumber: item.pharmacyId.verifiedContactNumber,
            address: item.pharmacyId.address,
          }));
      }
    } catch (geoErr) {
      console.warn(`[Case Controller] Geospatial discovery error: ${geoErr.message}`);
    }

    res.status(201).json({
      success: true,
      case: newCase,
      nearbyFacilities,
      emergencyCallNumber: triage.level === 'RED' ? config.emergencyDispatchNumber : null,
      disclaimer: aiData.disclaimer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/cases/:caseId
 * Retrieve specific case details with access control
 */
export const getCaseById = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const foundCase = await Case.findOne({
      $or: [{ caseId }, { _id: caseId.match(/^[0-9a-fA-F]{24}$/) ? caseId : null }],
    }).populate('patientId', 'name email phone')
      .populate('assignedProviderId', 'name email phone role');

    if (!foundCase) {
      return res.status(404).json({
        success: false,
        message: 'Case not found.',
      });
    }

    const isPatient = foundCase.patientId._id.toString() === req.user._id.toString();
    const isAssigned = foundCase.assignedProviderId && foundCase.assignedProviderId._id.toString() === req.user._id.toString();
    const isPrivileged = ['doctor', 'hospital', 'admin'].includes(req.user.role);

    if (!isPatient && !isAssigned && !isPrivileged) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this case.',
      });
    }

    res.status(200).json({
      success: true,
      case: foundCase,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/provider/cases
 * Priority Queue endpoint for doctors and hospital personnel
 * Implements SLA sorting: P0 > P1 > P2 > P3, with waiting-time aging
 */
export const getPriorityQueue = async (req, res, next) => {
  try {
    const { status, triageLevel } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['QUEUED', 'ACKNOWLEDGED'] };
    }

    if (triageLevel) {
      filter.triageLevel = triageLevel;
    }

    // Query active cases
    const cases = await Case.find(filter)
      .populate('patientId', 'name email phone')
      .populate('assignedProviderId', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    const priorityWeight = {
      P0_EMERGENCY: 1000,
      P1_URGENT: 500,
      P2_PRIORITY: 250,
      P3_ROUTINE: 100,
    };

    const now = Date.now();

    // Compute dynamic urgency score with waiting-time aging (anti-starvation)
    // Score = Priority Weight + (Elapsed Minutes * 5)
    const agedCases = cases.map((c) => {
      const elapsedMinutes = Math.floor((now - new Date(c.createdAt).getTime()) / 60000);
      const baseWeight = priorityWeight[c.priority] || 100;
      const dynamicScore = baseWeight + elapsedMinutes * 5;

      return {
        ...c,
        elapsedMinutes,
        dynamicScore,
      };
    });

    // Sort descending by dynamicScore (highest priority + oldest waiting first)
    agedCases.sort((a, b) => b.dynamicScore - a.dynamicScore);

    res.status(200).json({
      success: true,
      count: agedCases.length,
      queue: agedCases,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cases/:caseId/acknowledge
 * Clinician acknowledges seeing the case (starts SLA timer, moves to ACKNOWLEDGED)
 */
export const acknowledgeCase = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    const updatedCase = await Case.findOneAndUpdate(
      {
        caseId,
        status: 'QUEUED',
      },
      {
        $set: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedCase) {
      return res.status(404).json({
        success: false,
        message: 'Case not found or already acknowledged/in consultation.',
      });
    }

    emitToUser(updatedCase.patientId, 'case_acknowledged', {
      caseId: updatedCase.caseId,
      acknowledgedAt: updatedCase.acknowledgedAt,
    });

    res.status(200).json({
      success: true,
      message: 'Case acknowledged.',
      case: updatedCase,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cases/:caseId/accept
 * Atomic provider claim with optimistic concurrency lock to prevent race conditions
 */
export const acceptCase = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    // Concurrency-safe atomic mutation: only succeeds if assignedProviderId is null or already this provider
    const claimedCase = await Case.findOneAndUpdate(
      {
        caseId,
        status: { $in: ['QUEUED', 'ACKNOWLEDGED'] },
        $or: [{ assignedProviderId: null }, { assignedProviderId: req.user._id }],
      },
      {
        $set: {
          status: 'IN_CONSULTATION',
          assignedProviderId: req.user._id,
          acceptedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!claimedCase) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: This case has already been accepted by another healthcare provider.',
      });
    }

    // Broadcast queue update
    emitToRole('doctor', 'queue_updated', {
      caseId: claimedCase.caseId,
      status: claimedCase.status,
      assignedProviderId: req.user._id,
    });
    emitToRole('hospital', 'queue_updated', {
      caseId: claimedCase.caseId,
      status: claimedCase.status,
      assignedProviderId: req.user._id,
    });

    // Notify patient
    emitToUser(claimedCase.patientId, 'case_claimed', {
      caseId: claimedCase.caseId,
      providerName: req.user.name,
      status: claimedCase.status,
    });

    res.status(200).json({
      success: true,
      message: 'Case claimed successfully.',
      case: claimedCase,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cases/:caseId/decline
 * Clinician declines or releases case back to the priority queue
 */
export const declineCase = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { reason = 'Provider unavailable' } = req.body;

    const releasedCase = await Case.findOneAndUpdate(
      {
        caseId,
        assignedProviderId: req.user._id,
      },
      {
        $set: {
          status: 'QUEUED',
          assignedProviderId: null,
          acceptedAt: null,
        },
      },
      { new: true }
    );

    if (!releasedCase) {
      return res.status(404).json({
        success: false,
        message: 'Case not found or you are not the assigned provider.',
      });
    }

    // Broadcast queue update for other providers to claim
    emitToRole('doctor', 'queue_updated', {
      caseId: releasedCase.caseId,
      status: 'QUEUED',
      reason,
    });

    res.status(200).json({
      success: true,
      message: 'Case released back to queue.',
      case: releasedCase,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cases/:caseId/escalate
 * Manually or automatically escalates a deteriorating case (e.g. YELLOW -> RED, P1 -> P0)
 */
export const escalateCase = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { reason = 'Patient clinical deterioration or SLA timeout' } = req.body;

    const escalatedCase = await Case.findOneAndUpdate(
      { caseId },
      {
        $set: {
          triageLevel: 'RED',
          priority: 'P0_EMERGENCY',
          status: 'ESCALATED',
          escalatedAt: new Date(),
          escalationReason: reason,
        },
      },
      { new: true }
    );

    if (!escalatedCase) {
      return res.status(404).json({
        success: false,
        message: 'Case not found.',
      });
    }

    // Emergency broadcast
    emitToRole('doctor', 'emergency_alert', {
      caseId: escalatedCase.caseId,
      priority: 'P0_EMERGENCY',
      triageLevel: 'RED',
      reason,
      escalatedAt: escalatedCase.escalatedAt,
    });
    emitToRole('hospital', 'emergency_alert', {
      caseId: escalatedCase.caseId,
      priority: 'P0_EMERGENCY',
      triageLevel: 'RED',
      reason,
      escalatedAt: escalatedCase.escalatedAt,
    });

    emitToUser(escalatedCase.patientId, 'case_escalated', {
      caseId: escalatedCase.caseId,
      message: 'Case escalated to immediate emergency priority. Please call 112.',
      emergencyNumber: config.emergencyDispatchNumber,
    });

    res.status(200).json({
      success: true,
      message: 'Case escalated to P0 EMERGENCY.',
      case: escalatedCase,
    });
  } catch (error) {
    next(error);
  }
};
