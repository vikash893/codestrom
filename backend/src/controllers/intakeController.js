import axios from 'axios';
import { config } from '../config/env.js';
import { IntakeRecord } from '../models/IntakeRecord.js';

export const submitIntake = async (req, res, next) => {
  try {
    const {
      description,
      language = 'en',
      duration,
      severity = 'unknown',
      age_years,
      relevant_history,
    } = req.body;

    if (!description || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 5 characters long.',
      });
    }

    let aiData;
    try {
      // Call Python AI Service
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
    } catch (aiError) {
      console.warn(
        `[Intake Controller] AI service connection failed (${aiError.message}). Using local safe triage fallback.`
      );
      // Fail-safe deterministic emergency fallback: never block safety guidance on network failure!
      const lowerDesc = description.toLowerCase();
      const isEmergencyFallback =
        lowerDesc.includes('chest pain') ||
        lowerDesc.includes('heart attack') ||
        lowerDesc.includes('cannot breathe') ||
        lowerDesc.includes('sine me dard') ||
        lowerDesc.includes('saans nahi');

      aiData = {
        status: 'received',
        summary: `Patient description: ${description}`,
        needs_clinician_review: true,
        disclaimer:
          'This service does not provide an autonomous diagnosis or prescription. Seek emergency medical care immediately for severe symptoms.',
        is_emergency: isEmergencyFallback,
        emergency_flags: isEmergencyFallback ? ['EMERGENCY_FALLBACK_TRIGGERED'] : [],
        emergency_guidance: isEmergencyFallback
          ? 'CRITICAL WARNING: Urgent symptoms detected. Please call 112 immediately or proceed to the nearest emergency hospital.'
          : null,
        detected_language: language,
        extracted_symptoms: [],
        confidence_score: 0.7,
        version: '0.2.0-fallback',
      };
    }

    // Persist Intake Record
    const record = await IntakeRecord.create({
      patientId: req.user._id,
      rawDescription: description,
      duration,
      reportedSeverity: severity,
      patientAge: age_years,
      relevantHistory: relevant_history,
      detectedLanguage: aiData.detected_language || language,
      extractedSymptoms: aiData.extracted_symptoms || [],
      isEmergency: aiData.is_emergency || false,
      emergencyFlags: aiData.emergency_flags || [],
      emergencyGuidance: aiData.emergency_guidance || null,
      structuredSummary: aiData.summary,
      needsClinicianReview: aiData.needs_clinician_review ?? true,
      status: aiData.is_emergency ? 'emergency_escalated' : 'received',
    });

    res.status(200).json({
      success: true,
      intakeId: record._id,
      status: record.status,
      isEmergency: record.isEmergency,
      emergencyFlags: record.emergencyFlags,
      emergencyGuidance: record.emergencyGuidance,
      emergencyCallNumber: record.isEmergency ? config.emergencyDispatchNumber : null,
      detectedLanguage: record.detectedLanguage,
      extractedSymptoms: record.extractedSymptoms,
      summary: record.structuredSummary,
      needsClinicianReview: record.needsClinicianReview,
      disclaimer: aiData.disclaimer,
      createdAt: record.createdAt,
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
