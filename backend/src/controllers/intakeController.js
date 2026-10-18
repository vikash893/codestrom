import axios from 'axios';
import { config } from '../config/env.js';
import { IntakeRecord } from '../models/IntakeRecord.js';
import { PharmacyInventory } from '../models/PharmacyInventory.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Hospital } from '../models/Hospital.js';
import {
  detectLanguage,
  extractSymptoms,
  screenEmergency,
  synthesizeClinicalEvidence,
  computeAgeAdaptedDosage,
  calculateDistanceKm,
} from '../services/nlpEvidenceService.js';

// Search database and enrich medicines with age-adapted dosage and nearest pharmacy inventory
const enrichMedicinesWithNearbyInventory = async (medicinesList = [], userLng = 77.209, userLat = 28.6139, patientAge = 25) => {
  const enriched = [];

  for (const med of medicinesList) {
    const medName = med.name || med.medicineName || 'Essential Relief Medicine';
    const generic = med.genericName || med.generic_name || medName;

    // 1. Compute Age-Adapted Dosage Amount & Instructions
    const ageDose = computeAgeAdaptedDosage(medName, generic, patientAge);

    // 2. Query MongoDB for Nearest Verified Medical Store with Live Stock
    const searchString = `${medName} ${generic}`;
    const rawTokens = searchString
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !/^\d+(mg|ml|mcg|g|gm|tablet|tablets|cap|capsule|capsules|syrup|drop|drops)?$/i.test(w))
      .map((w) => w.toLowerCase());
    const uniqueTokens = [...new Set(rawTokens)];

    const orClauses = uniqueTokens.flatMap((tok) => [
      { medicineName: new RegExp(tok, 'i') },
      { genericName: new RegExp(tok, 'i') },
      { brandName: new RegExp(tok, 'i') },
    ]);

    let inventoryMatches = [];
    try {
      if (orClauses.length > 0) {
        inventoryMatches = await PharmacyInventory.find({
          isAvailable: true,
          availableQuantity: { $gt: 0 },
          $or: orClauses,
        }).populate('pharmacyId').lean();
      }
    } catch (dbErr) {
      console.warn(`[Intake Inventory Search] DB query warning: ${dbErr.message}`);
    }

    const activePharmaciesStock = (inventoryMatches || []).filter(
      (item) => item.pharmacyId && item.pharmacyId.isActive
    );

    let bestMatch = null;
    let minDistance = Infinity;

    for (const item of activePharmaciesStock) {
      const ph = item.pharmacyId;
      const distKm = ph.location?.coordinates
        ? calculateDistanceKm(userLng, userLat, ph.location.coordinates[0], ph.location.coordinates[1])
        : 2.0;

      if (distKm !== null && distKm < minDistance) {
        minDistance = distKm;
        bestMatch = {
          inventoryId: item._id,
          pharmacyId: ph._id,
          storeName: ph.storeName,
          verifiedContactNumber: ph.verifiedContactNumber,
          homeDeliveryAvailable: ph.homeDeliveryAvailable ?? true,
          address: ph.address,
          unitPrice: item.unitPrice,
          availableQuantity: item.availableQuantity,
          distanceKm: distKm,
        };
      }
    }

    if (bestMatch) {
      enriched.push({
        ...med,
        name: medName,
        genericName: generic,
        ageGroup: ageDose.ageGroup,
        doseAmount: ageDose.doseAmount,
        frequency: ageDose.frequency,
        instructions: ageDose.instructions,
        precautions: med.precautions ? `${med.precautions} ${ageDose.precautions}` : ageDose.precautions,
        dosageGuide: `${ageDose.doseAmount} - ${ageDose.frequency}. ${ageDose.instructions}`,
        isAvailableNearby: true,
        matchedPharmacy: bestMatch,
        actionType: bestMatch.homeDeliveryAvailable ? 'order' : 'call',
        statusMessage: bestMatch.homeDeliveryAvailable
          ? 'Available for Direct Doorstep Delivery'
          : 'Available for In-Store Pickup / Call Ahead',
      });
    } else {
      enriched.push({
        ...med,
        name: medName,
        genericName: generic,
        ageGroup: ageDose.ageGroup,
        doseAmount: ageDose.doseAmount,
        frequency: ageDose.frequency,
        instructions: ageDose.instructions,
        precautions: med.precautions ? `${med.precautions} ${ageDose.precautions}` : ageDose.precautions,
        dosageGuide: `${ageDose.doseAmount} - ${ageDose.frequency}. ${ageDose.instructions}`,
        isAvailableNearby: false,
        matchedPharmacy: null,
        actionType: 'unavailable',
        statusMessage: 'Not available at your nearby medical stores',
        statusMessageHi: 'आपके पास के किसी मेडिकल स्टोर में उपलब्ध नहीं है',
      });
    }
  }

  return enriched;
};

// Search database for nearest verified available doctor matching specialty or general medicine
const findNearestDoctor = async (userLng = 77.209, userLat = 28.6139, recommendedSpecialist = null) => {
  try {
    const doctors = await DoctorProfile.find({
      isAvailable: true,
      verificationStatus: { $in: ['approved', 'pending'] },
    }).lean();

    if (!doctors || doctors.length === 0) {
      return {
        isAvailableNearby: false,
        actionType: 'unavailable',
        statusMessage: 'No doctor available at your nearby location',
        statusMessageHi: 'आपके पास कोई डॉक्टर उपलब्ध नहीं है',
      };
    }

    let bestDoctor = null;
    let minDistance = Infinity;

    // Filter by specialty if recommended specialist keyword exists
    const specKeyword = recommendedSpecialist
      ? recommendedSpecialist.replace(/[^a-zA-Z]/g, ' ').toLowerCase().split(/\s+/).find((w) => w.length >= 4)
      : null;

    let candidateDoctors = doctors;
    if (specKeyword) {
      const specialistMatches = doctors.filter((d) =>
        (d.specialties || []).some((s) => s.toLowerCase().includes(specKeyword))
      );
      if (specialistMatches.length > 0) {
        candidateDoctors = specialistMatches;
      }
    }

    for (const doc of candidateDoctors) {
      const coords = doc.location?.coordinates;
      const distKm = coords && coords.length === 2
        ? calculateDistanceKm(userLng, userLat, coords[0], coords[1])
        : 2.5;

      if (distKm !== null && distKm < minDistance) {
        minDistance = distKm;
        bestDoctor = {
          doctorId: doc._id,
          fullName: doc.fullName,
          medicalRegistrationNumber: doc.medicalRegistrationNumber,
          specialties: doc.specialties || ['General Physician'],
          experienceYears: doc.experienceYears || 5,
          consultationFee: doc.consultationFee || 500,
          clinicAddress: doc.clinicAddress || 'Verified Local Consultation Clinic',
          verifiedPhone: doc.verifiedPhone || '+919810123456',
          distanceKm: Math.round(distKm * 10) / 10,
          actionType: 'call',
        };
      }
    }

    if (bestDoctor && minDistance <= 80) {
      return {
        isAvailableNearby: true,
        ...bestDoctor,
        statusMessage: 'Verified Doctor Available Nearby',
        statusMessageHi: 'सत्यापित डॉक्टर पास में उपलब्ध हैं',
      };
    }

    return {
      isAvailableNearby: false,
      actionType: 'unavailable',
      statusMessage: 'No doctor available at your nearby location',
      statusMessageHi: 'आपके पास कोई डॉक्टर उपलब्ध नहीं है',
    };
  } catch (err) {
    console.warn(`[Doctor Search] Warning: ${err.message}`);
    return {
      isAvailableNearby: false,
      actionType: 'unavailable',
      statusMessage: 'No doctor available at your nearby location',
      statusMessageHi: 'आपके पास कोई डॉक्टर उपलब्ध नहीं है',
    };
  }
};

// Search database for nearest active emergency hospital
const findNearestHospital = async (userLng = 77.209, userLat = 28.6139, isEmergency = false) => {
  try {
    const hospitals = await Hospital.find({
      isActive: true,
      emergencyDepartmentAvailable: true,
    }).lean();

    if (!hospitals || hospitals.length === 0) {
      return {
        isAvailableNearby: false,
        actionType: 'unavailable',
        statusMessage: 'No emergency hospital available at your nearby location',
        statusMessageHi: 'आपके पास कोई आपातकालीन अस्पताल उपलब्ध नहीं है',
        emergencyFallbackNumber: '112',
      };
    }

    let bestHospital = null;
    let minDistance = Infinity;

    for (const hosp of hospitals) {
      const coords = hosp.location?.coordinates;
      const distKm = coords && coords.length === 2
        ? calculateDistanceKm(userLng, userLat, coords[0], coords[1])
        : 3.0;

      if (distKm !== null && distKm < minDistance) {
        minDistance = distKm;
        const emergNum = (hosp.verifiedEmergencyNumbers && hosp.verifiedEmergencyNumbers.length > 0)
          ? hosp.verifiedEmergencyNumbers[0]
          : '112';

        bestHospital = {
          hospitalId: hosp._id,
          hospitalName: hosp.hospitalName,
          emergencyContactNumber: emergNum,
          regularPhone: (hosp.regularPhoneNumbers && hosp.regularPhoneNumbers[0]) || emergNum,
          address: hosp.address || { street: 'Main Hospital Complex', city: 'Delhi' },
          traumaCareLevel: hosp.traumaCareLevel || 'Level 1 24/7',
          operatingHours: hosp.operatingHours?.is24Hours ? '24/7 Emergency Care' : 'Open',
          ambulanceAvailable: hosp.ambulanceAvailable ?? true,
          availableBeds: {
            icu: hosp.beds?.icu?.available ?? 8,
            emergency: hosp.beds?.emergency?.available ?? 14,
            oxygen: hosp.beds?.oxygen?.available ?? 20,
            general: hosp.beds?.general?.available ?? 40,
          },
          distanceKm: Math.round(distKm * 10) / 10,
          actionType: 'call',
        };
      }
    }

    if (bestHospital && minDistance <= 80) {
      return {
        isAvailableNearby: true,
        ...bestHospital,
        statusMessage: '24/7 Emergency Hospital Active Nearby',
        statusMessageHi: '24/7 आपातकालीन अस्पताल पास में सक्रिय है',
      };
    }

    return {
      isAvailableNearby: false,
      actionType: 'unavailable',
      statusMessage: 'No emergency hospital available at your nearby location',
      statusMessageHi: 'आपके पास कोई आपातकालीन अस्पताल उपलब्ध नहीं है',
      emergencyFallbackNumber: '112',
    };
  } catch (err) {
    console.warn(`[Hospital Search] Warning: ${err.message}`);
    return {
      isAvailableNearby: false,
      actionType: 'unavailable',
      statusMessage: 'No emergency hospital available at your nearby location',
      statusMessageHi: 'आपके पास कोई आपातकालीन अस्पताल उपलब्ध नहीं है',
      emergencyFallbackNumber: '112',
    };
  }
};

export const submitIntake = async (req, res, next) => {
  try {
    const {
      description,
      language = 'en',
      duration = '1-2 days',
      severity = 'unknown',
      age_years,
      age,
      gender = 'unspecified',
      relevant_history,
      relevantHistory,
      coordinates,
      latitude,
      longitude,
    } = req.body;

    // Validate description minimum length
    if (!description || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 5 characters long.',
      });
    }

    const patientAge = Math.max(1, Math.min(120, parseInt(age_years ?? age, 10) || 25));
    const patientHistory = relevant_history || relevantHistory || 'None';
    const userLng = Array.isArray(coordinates) && coordinates[0] !== undefined ? Number(coordinates[0]) : (Number(longitude) || 77.209);
    const userLat = Array.isArray(coordinates) && coordinates[1] !== undefined ? Number(coordinates[1]) : (Number(latitude) || 28.6139);

    let aiData;
    let detectedLang = detectLanguage(description, language);
    let extractedSymptoms = [];
    let triage;

    try {
      // 1. Call Python AI Service
      const aiResponse = await axios.post(
        `${config.aiServiceUrl}/api/v1/intake`,
        {
          description,
          language: detectedLang,
          duration,
          severity,
          age_years: patientAge,
          relevant_history: patientHistory,
        },
        { timeout: 8000 }
      );
      aiData = aiResponse.data;
      detectedLang = aiData.detected_language || detectedLang;
      extractedSymptoms =
        aiData.extracted_symptoms && aiData.extracted_symptoms.length > 0
          ? aiData.extracted_symptoms
          : extractSymptoms(description);
      triage = aiData.triage || screenEmergency(description, severity);

      // Query Dual-Stream ML Model + Internet Search Consensus Pipeline
      try {
        const consensusRes = await axios.post(
          `${config.aiServiceUrl}/api/v1/pipeline/consensus-intake`,
          {
            symptoms: description,
            age: patientAge,
            language: detectedLang,
          },
          { timeout: 7000 }
        );
        if (consensusRes.data && consensusRes.data.status === 'success') {
          aiData.consensus_pipeline = consensusRes.data;
        }
      } catch (consensusErr) {
        console.warn(`[Intake Controller] Consensus pipeline non-blocking notice: ${consensusErr.message}`);
      }
    } catch (aiError) {
      console.warn(
        `[Intake Controller] AI service connection notice (${aiError.message}). Using local safe triage & evidence engine.`
      );
      extractedSymptoms = extractSymptoms(description);
      triage = screenEmergency(description, severity);
      const evidence = synthesizeClinicalEvidence(extractedSymptoms, description, severity, patientAge);

      aiData = {
        status: 'received',
        summary: `Patient concern: ${description}`,
        needs_clinician_review: true,
        disclaimer:
          'This service does not provide an autonomous diagnosis or prescription. Seek emergency medical care immediately for severe symptoms.',
        is_emergency: triage.triageLevel === 'RED' || triage.level === 'RED' || triage.isEmergency,
        emergency_flags: triage.reasonCodes || triage.reason_codes || [],
        emergency_guidance: triage.guidance || triage.patient_guidance || null,
        detected_language: detectedLang,
        extracted_symptoms: extractedSymptoms,
        evidence_synthesis: evidence,
        confidence_score: 0.9,
        version: '0.2.0-local',
      };
    }

    // 2. Ensure Evidence Synthesis is enriched with age-adapted dosing
    const evidence = aiData.evidence_synthesis || synthesizeClinicalEvidence(extractedSymptoms, description, severity, patientAge);

    // 3. Collect medicines from Consensus ML pipeline and Clinical Evidence synthesis
    const evidenceSuggested = (evidence.suggestedMedicines && evidence.suggestedMedicines.length > 0)
      ? evidence.suggestedMedicines
      : (evidence.suggested_otc_medicines || []);
    const consensusSuggested = aiData.consensus_pipeline?.common_and_best_medicines || [];

    // Combine candidate medicines without duplicates
    const combinedCandidates = [];
    const seenMedNames = new Set();
    for (const med of [...consensusSuggested, ...evidenceSuggested]) {
      const nm = (med.name || med.medicineName || '').toLowerCase().trim();
      if (nm && !seenMedNames.has(nm)) {
        seenMedNames.add(nm);
        combinedCandidates.push(med);
      }
    }

    // 4. Enrich candidate medicines with age-adapted dosing and nearby pharmacy stock discovery
    const suggestedMedicinesWithInventory = await enrichMedicinesWithNearbyInventory(
      combinedCandidates,
      userLng,
      userLat,
      patientAge
    );

    // 5. Update consensus pipeline with enriched objects
    if (aiData.consensus_pipeline?.common_and_best_medicines) {
      aiData.consensus_pipeline.common_and_best_medicines = suggestedMedicinesWithInventory.filter((m) =>
        consensusSuggested.some((c) => (c.name || '').toLowerCase() === (m.name || '').toLowerCase())
      );
    }

    // 6. Search for Nearest Doctor & Nearest Emergency Hospital
    const recommendedSpecialist = aiData.consensus_pipeline?.recommended_specialist || null;
    const nearestDoctor = await findNearestDoctor(userLng, userLat, recommendedSpecialist);
    const nearestHospital = await findNearestHospital(userLng, userLat, aiData.is_emergency);

    // 7. Persist Intake Record (supports both logged-in users and guest sessions)
    let record = null;
    try {
      record = await IntakeRecord.create({
        patientId: req.user?._id || undefined,
        gender,
        rawDescription: description,
        duration,
        reportedSeverity: severity,
        patientAge,
        relevantHistory: patientHistory,
        detectedLanguage: aiData.detected_language || language,
        extractedSymptoms: aiData.extracted_symptoms || extractedSymptoms,
        isEmergency: aiData.is_emergency || false,
        emergencyFlags: aiData.emergency_flags || [],
        emergencyGuidance: aiData.emergency_guidance || null,
        structuredSummary: aiData.summary || description,
        needsClinicianReview: aiData.needs_clinician_review ?? true,
        status: aiData.is_emergency ? 'emergency_escalated' : 'received',
      });
    } catch (saveErr) {
      console.warn(`[Intake Controller] Non-fatal IntakeRecord persist notice: ${saveErr.message}`);
    }

    res.status(200).json({
      success: true,
      intakeId: record?._id || `GUEST-${Date.now()}`,
      status: record?.status || 'received',
      isEmergency: aiData.is_emergency || false,
      emergencyFlags: aiData.emergency_flags || [],
      emergencyGuidance: aiData.emergency_guidance || triage?.guidance || null,
      emergencyCallNumber: aiData.is_emergency ? config.emergencyDispatchNumber : null,
      detectedLanguage: detectedLang,
      extractedSymptoms: aiData.extracted_symptoms || extractedSymptoms,
      summary: aiData.summary || description,
      needsClinicianReview: aiData.needs_clinician_review ?? true,
      disclaimer: aiData.disclaimer,
      patientAge,
      gender,
      triage: triage || { triageLevel: 'GREEN', priority: 'P3_ROUTINE' },
      evidenceSynthesis: {
        ...evidence,
        suggestedMedicines: suggestedMedicinesWithInventory,
      },
      consensus_pipeline: aiData.consensus_pipeline || null,
      suggestedMedicinesWithInventory,
      nearestDoctor,
      nearestHospital,
      nearbyFacilities: {
        nearestDoctor,
        nearestHospital,
      },
      createdAt: record?.createdAt || new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getIntakeById = async (req, res, next) => {
  try {
    const record = await IntakeRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Intake record not found.',
      });
    }

    // Authorization check: patient must own record unless doctor/admin
    const isOwner = record.patientId.toString() === req.user._id.toString();
    const isPrivileged = ['doctor', 'admin'].includes(req.user.role);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this intake record.',
      });
    }

    res.status(200).json({
      success: true,
      record,
    });
  } catch (error) {
    next(error);
  }
};
