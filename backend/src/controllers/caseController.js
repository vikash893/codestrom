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
import {
  detectLanguage,
  extractSymptoms,
  screenEmergency,
  synthesizeClinicalEvidence,
  computeAgeAdaptedDosage,
  calculateDistanceKm,
} from '../services/nlpEvidenceService.js';

// Cleanly maps and sanitizes clinical evidence synthesis to camelCase Mongoose schema
const formatEvidenceSynthesis = (raw, description, severity, symptoms, ageYears = 25) => {
  if (!raw || (!raw.possibleConditions && !raw.possible_conditions)) {
    return synthesizeClinicalEvidence(symptoms, description, severity, ageYears);
  }

  const rawConditions = raw.possibleConditions || raw.possible_conditions || [];
  const rawFirstAid = raw.firstAidMeasures || raw.first_aid_measures || [];
  const rawMedicines = raw.suggestedMedicines || raw.suggested_otc_medicines || [];

  const possibleConditions = rawConditions.map((c) => ({
    name: c.name,
    confidence: Number(c.confidence) || 0.7,
    clinicalRationale: c.clinicalRationale || c.clinical_rationale || '',
    missingFindings: c.missingFindings || c.missing_findings || [],
    warningSigns: c.warningSigns || c.warning_signs || [],
    citations: (c.citations || []).map((cit) => ({
      source: cit.source || 'Medical Guidelines',
      title: cit.title || '',
      url: cit.url || '#',
    })),
  }));

  const firstAidMeasures = rawFirstAid.map((fa) => ({
    action: fa.action,
    instructions: fa.instructions,
    rationale: fa.rationale || '',
  }));

  const suggestedMedicines = rawMedicines.map((m) => {
    const ageDose = computeAgeAdaptedDosage(m.name, m.genericName || m.generic_name, ageYears);
    return {
      name: m.name,
      genericName: m.genericName || m.generic_name || '',
      purpose: m.purpose || '',
      ageGroup: ageDose.ageGroup,
      doseAmount: ageDose.doseAmount,
      frequency: ageDose.frequency,
      dosageGuide: `${ageDose.doseAmount} - ${ageDose.frequency}. ${ageDose.instructions}`,
      prescriptionRequired: m.prescriptionRequired ?? m.prescription_required ?? false,
      precautions: m.precautions || ageDose.precautions,
    };
  });

  return {
    possibleConditions:
      possibleConditions.length > 0
        ? possibleConditions
        : synthesizeClinicalEvidence(symptoms, description, severity, ageYears).possibleConditions,
    firstAidMeasures:
      firstAidMeasures.length > 0
        ? firstAidMeasures
        : synthesizeClinicalEvidence(symptoms, description, severity, ageYears).firstAidMeasures,
    suggestedMedicines:
      suggestedMedicines.length > 0
        ? suggestedMedicines
        : synthesizeClinicalEvidence(symptoms, description, severity, ageYears).suggestedMedicines,
    clinicalRationale: raw.clinicalRationale || raw.clinical_rationale || '',
    suggestedSpecialties: raw.suggestedSpecialties || raw.suggested_specialties || ['General Medicine'],
    missingFindings: raw.missingFindings || raw.missing_findings || [],
    redFlagWarning: raw.redFlagWarning || raw.red_flag_warning || null,
    uncertaintyLevel: raw.uncertaintyLevel || raw.uncertainty_level || 'MODERATE',
    disclaimer:
      raw.disclaimer ||
      'Medical decision-support only. Autonomous diagnosis or prescribing is strictly prohibited.',
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

    // 1. NLP Pipeline: Language Detection, Symptom Extraction & Emergency Screening
    let aiData;
    let extractedSymptoms = [];
    let triage;
    let cleanEvidence;
    let detectedLang = detectLanguage(description, language);

    try {
      const aiResponse = await axios.post(
        `${config.aiServiceUrl}/api/v1/intake`,
        {
          description,
          language: detectedLang,
          duration,
          severity,
          age_years,
          relevant_history,
        },
        { timeout: 8000 }
      );
      aiData = aiResponse.data;
      detectedLang = aiData.detected_language || detectedLang;
      extractedSymptoms = (aiData.extracted_symptoms && aiData.extracted_symptoms.length > 0)
        ? aiData.extracted_symptoms
        : extractSymptoms(description);

      triage = aiData.triage || screenEmergency(description, severity);
      cleanEvidence = formatEvidenceSynthesis(
        aiData.evidence_synthesis,
        description,
        severity,
        extractedSymptoms,
        age_years
      );
    } catch (err) {
      console.warn(`[Case Controller] AI service unavailable (${err.message}). Using built-in local NLP & clinical engine.`);
      extractedSymptoms = extractSymptoms(description);
      triage = screenEmergency(description, severity);
      cleanEvidence = synthesizeClinicalEvidence(extractedSymptoms, description, severity, age_years);

      aiData = {
        status: 'received',
        summary: `Patient description: ${description}`,
        triage,
        patient_guidance: triage.guidance,
        detected_language: detectedLang,
        extracted_symptoms: extractedSymptoms,
        evidence_synthesis: cleanEvidence,
        disclaimer:
          'This service does not provide an autonomous diagnosis or prescription. Seek emergency medical care immediately for severe symptoms.',
      };
    }

    const generatedCaseId = `CASE-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 2. Persist Intake Record
    const intakeRecord = await IntakeRecord.create({
      patientId: req.user._id,
      rawDescription: description,
      duration,
      reportedSeverity: severity,
      patientAge: age_years,
      relevantHistory: relevant_history,
      detectedLanguage: detectedLang,
      extractedSymptoms,
      isEmergency: triage.triageLevel === 'RED' || triage.level === 'RED' || triage.isEmergency,
      emergencyFlags: triage.reasonCodes || triage.reason_codes || [],
      emergencyGuidance: triage.guidance || triage.patient_guidance || null,
      structuredSummary: aiData.summary || description,
      needsClinicianReview: triage.requiresHumanReview ?? triage.requires_human_review ?? true,
      status: (triage.triageLevel === 'RED' || triage.level === 'RED') ? 'emergency_escalated' : 'received',
    });

    const parsedLat = Number(latitude) || 28.6139;
    const parsedLng = Number(longitude) || 77.209;

    // 3. Persist Durable Prioritized Case with Evidence
    const newCase = await Case.create({
      caseId: generatedCaseId,
      patientId: req.user._id,
      intakeRecordId: intakeRecord._id,
      idempotencyKey: idempotencyKey || undefined,
      triageLevel: triage.triageLevel || triage.level || 'GREEN',
      priority: triage.priority || 'P3_ROUTINE',
      reasonCodes: triage.reasonCodes || triage.reason_codes || [],
      rulesetVersion: triage.rulesetVersion || triage.ruleset_version || 'WHO-IITT-v1.2',
      patientGuidance: triage.guidance || triage.patient_guidance,
      requiresHumanReview: triage.requiresHumanReview ?? triage.requires_human_review ?? true,
      status: 'QUEUED',
      patientDetails: {
        description,
        language: detectedLang,
        duration,
        severity,
        ageYears: age_years,
        relevantHistory: relevant_history,
        extractedSymptoms,
      },
      evidenceSynthesis: cleanEvidence,
      patientLocation: {
        type: 'Point',
        coordinates: [parsedLng, parsedLat],
      },
    });

    // 4. Real-Time Broadcast & Alerting
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

    // Notify patient
    await Notification.create({
      userId: req.user._id,
      title: newCase.triageLevel === 'RED' ? 'EMERGENCY WARNING' : 'Intake Case Queued',
      message:
        newCase.triageLevel === 'RED'
          ? `Immediate attention required: Call 112 or visit nearest emergency room. Case ${newCase.caseId} opened.`
          : `Your symptoms have been logged as ${newCase.priority} priority. Case ID: ${newCase.caseId}.`,
      type: newCase.triageLevel === 'RED' ? 'emergency' : 'system',
      data: { caseId: newCase.caseId, triageLevel: newCase.triageLevel },
    });

    // 5. Geospatial Resource Discovery: Hospitals, Available Doctors & Verified Pharmacies
    let nearbyFacilities = {
      hospitals: [],
      doctors: [],
      pharmaciesWithStock: [],
    };

    try {
      // A. Emergency & General Hospitals
      const allHospitals = await Hospital.find({ isActive: true }).lean();
      const scoredHospitals = allHospitals.map((hosp) => {
        const distKm = hosp.location?.coordinates
          ? calculateDistanceKm(parsedLng, parsedLat, hosp.location.coordinates[0], hosp.location.coordinates[1])
          : null;

        return {
          _id: hosp._id,
          hospitalName: hosp.hospitalName,
          emergencyDepartmentAvailable: hosp.emergencyDepartmentAvailable,
          verifiedEmergencyNumbers: hosp.verifiedEmergencyNumbers || [],
          regularPhoneNumbers: hosp.regularPhoneNumbers || [],
          address: hosp.address,
          traumaCareLevel: hosp.traumaCareLevel,
          distanceKm: distKm,
          distanceMeters: distKm !== null ? Math.round(distKm * 1000) : null,
        };
      });

      scoredHospitals.sort((a, b) => {
        if (a.emergencyDepartmentAvailable && !b.emergencyDepartmentAvailable) return -1;
        if (!a.emergencyDepartmentAvailable && b.emergencyDepartmentAvailable) return 1;
        return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
      });

      nearbyFacilities.hospitals = scoredHospitals.slice(0, 3);

      // B. Relevant Available Doctors & Clinicians
      const suggestedSpecs = cleanEvidence.suggestedSpecialties || [];
      const allDoctors = await DoctorProfile.find({ isAvailable: true, isVerified: true }).lean();

      const scoredDoctors = allDoctors.map((doc) => {
        const distKm = doc.location?.coordinates
          ? calculateDistanceKm(parsedLng, parsedLat, doc.location.coordinates[0], doc.location.coordinates[1])
          : null;

        const matchesSpecialty = doc.specialties?.some((sp) => suggestedSpecs.includes(sp));

        return {
          _id: doc._id,
          fullName: doc.fullName,
          specialties: doc.specialties,
          qualifications: doc.qualifications,
          experienceYears: doc.experienceYears,
          consultationFee: doc.consultationFee,
          verifiedPhone: doc.verifiedPhone,
          clinicAddress: doc.clinicAddress,
          isAvailable: doc.isAvailable,
          matchesSpecialty,
          distanceKm: distKm,
          distanceMeters: distKm !== null ? Math.round(distKm * 1000) : null,
        };
      });

      // Sort: local doctors (< 50 km) first, matching specialty first, then nearest distance
      scoredDoctors.sort((a, b) => {
        const aIsLocal = (a.distanceKm ?? 9999) < 50;
        const bIsLocal = (b.distanceKm ?? 9999) < 50;
        if (aIsLocal && !bIsLocal) return -1;
        if (!aIsLocal && bIsLocal) return 1;

        if (a.matchesSpecialty && !b.matchesSpecialty) return -1;
        if (!a.matchesSpecialty && b.matchesSpecialty) return 1;
        return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
      });

      nearbyFacilities.doctors = scoredDoctors.slice(0, 3);

      // C. Match Physical Pharmacies with Confirmed Stock of Suggested Medicines
      const suggestedMeds = cleanEvidence.suggestedMedicines || [];
      const searchKeywords = new Set();
      for (const m of suggestedMeds) {
        if (m.name) {
          m.name.split(/[\s,/()]+/).filter((w) => w.length > 2).forEach((w) => searchKeywords.add(w.toLowerCase()));
        }
        if (m.genericName) {
          m.genericName.split(/[\s,/()]+/).filter((w) => w.length > 2).forEach((w) => searchKeywords.add(w.toLowerCase()));
        }
      }

      const allStockItems = await PharmacyInventory.find({
        isAvailable: true,
        availableQuantity: { $gt: 0 },
      }).populate('pharmacyId').lean();

      const activePharmaciesStock = allStockItems.filter(
        (item) => item.pharmacyId && item.pharmacyId.isActive
      );

      const matchedPharmacies = [];
      const seenPharmacies = new Set();

      for (const item of activePharmaciesStock) {
        const ph = item.pharmacyId;
        const distKm = ph.location?.coordinates
          ? calculateDistanceKm(parsedLng, parsedLat, ph.location.coordinates[0], ph.location.coordinates[1])
          : null;

        const combinedText = `${item.medicineName} ${item.genericName || ''} ${item.brandName || ''}`.toLowerCase();
        let isSameMedicineMatch = false;

        for (const kw of searchKeywords) {
          if (combinedText.includes(kw)) {
            isSameMedicineMatch = true;
            break;
          }
        }

        matchedPharmacies.push({
          inventoryId: item._id,
          medicineName: item.medicineName,
          genericName: item.genericName || item.brandName,
          availableQuantity: item.availableQuantity,
          unitPrice: item.unitPrice,
          stockStatus: item.stockStatus,
          pharmacyId: ph._id,
          pharmacyName: ph.storeName,
          contactNumber: ph.verifiedContactNumber,
          callUrl: `tel:${ph.verifiedContactNumber}`,
          address: ph.address,
          distanceKm: distKm,
          distanceMeters: distKm !== null ? Math.round(distKm * 1000) : null,
          isSameMedicineMatch,
        });
      }

      // Sort: exact suggested medicine matches first, then nearest distance
      matchedPharmacies.sort((a, b) => {
        if (a.isSameMedicineMatch && !b.isSameMedicineMatch) return -1;
        if (!a.isSameMedicineMatch && b.isSameMedicineMatch) return 1;
        return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
      });

      nearbyFacilities.pharmaciesWithStock = matchedPharmacies.slice(0, 5);
    } catch (geoErr) {
      console.warn(`[Case Controller] Geospatial discovery error: ${geoErr.message}`);
    }

    res.status(201).json({
      success: true,
      case: newCase,
      nearbyFacilities,
      emergencyCallNumber: newCase.triageLevel === 'RED' ? config.emergencyDispatchNumber : null,
      disclaimer: cleanEvidence.disclaimer,
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
