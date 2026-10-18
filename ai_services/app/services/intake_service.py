from app.schemas.evidence import EvidenceResponse
from app.schemas.intake import IntakeRequest, IntakeResponse
from app.services.evidence_service import synthesize_evidence
from app.services.extractor import extract_symptoms
from app.services.language_detector import detect_language
from app.services.providers.local_provider import LocalRuleBasedProvider
from app.services.safety_screener import screen_emergency

_default_provider = LocalRuleBasedProvider()


def process_intake(request: IntakeRequest) -> IntakeResponse:
    # 1. Deterministic Language Detection
    detected_lang = detect_language(request.description, request.language)

    # 2. Fast Deterministic Emergency Screening (Sub-5ms, independent of external AI)
    safety_result = screen_emergency(request.description, request.severity)

    # 3. Clinical Symptom & Feature Extraction
    clinical_data = extract_symptoms(request.description)

    # 4. Multi-Source Clinical Evidence & Medical Search Synthesis
    evidence = synthesize_evidence(
        symptoms=clinical_data.symptoms,
        patient_description=request.description,
        severity=request.severity,
        age=request.age_years,
    )

    # 5. Generate structured summary preserving baseline format
    summary_parts = [
        f"Patient description: {request.description}",
    ]

    if request.duration:
        summary_parts.append(f"Duration: {request.duration}")

    if request.severity != "unknown":
        summary_parts.append(
            f"Patient-reported severity: {request.severity}"
        )

    if request.age_years is not None:
        summary_parts.append(f"Age: {request.age_years} years")

    if request.relevant_history:
        summary_parts.append(
            f"Relevant history: {request.relevant_history}"
        )

    return IntakeResponse(
        status="received",
        summary="\n".join(summary_parts),
        needs_clinician_review=True,
        disclaimer=(
            "This service does not provide a diagnosis or prescription. "
            "Seek emergency medical care immediately for severe or "
            "rapidly worsening symptoms."
        ),
        is_emergency=safety_result.is_emergency,
        emergency_flags=safety_result.emergency_flags,
        emergency_guidance=safety_result.guidance,
        triage={
            "level": safety_result.triage_level,
            "priority": safety_result.priority,
            "reason_codes": safety_result.reason_codes,
            "requires_human_review": safety_result.requires_human_review,
            "ruleset_version": safety_result.ruleset_version,
        },
        patient_guidance=safety_result.guidance,
        detected_language=detected_lang,
        extracted_symptoms=clinical_data.symptoms,
        confidence_score=clinical_data.confidence_score,
        evidence_synthesis={
            "possible_conditions": [
                {
                    "name": c.name,
                    "confidence": c.confidence,
                    "clinical_rationale": c.clinical_rationale,
                    "missing_findings": c.missing_findings,
                    "warning_signs": c.warning_signs,
                    "citations": [
                        {"source": cit.source, "title": cit.title, "url": cit.url, "evidence_type": cit.evidence_type}
                        for cit in c.citations
                    ],
                }
                for c in evidence.possible_conditions
            ],
            "possibleConditions": [
                {
                    "name": c.name,
                    "confidence": c.confidence,
                    "clinicalRationale": c.clinical_rationale,
                    "missingFindings": c.missing_findings,
                    "warningSigns": c.warning_signs,
                    "citations": [
                        {"source": cit.source, "title": cit.title, "url": cit.url}
                        for cit in c.citations
                    ],
                }
                for c in evidence.possible_conditions
            ],
            "clinical_rationale": evidence.clinical_rationale,
            "clinicalRationale": evidence.clinical_rationale,
            "suggested_specialties": evidence.suggested_specialties,
            "suggestedSpecialties": evidence.suggested_specialties,
            "missing_findings": evidence.missing_findings,
            "missingFindings": evidence.missing_findings,
            "first_aid_measures": [
                {
                    "action": fa.action,
                    "instructions": fa.instructions,
                    "rationale": fa.rationale,
                }
                for fa in evidence.first_aid_measures
            ],
            "firstAidMeasures": [
                {
                    "action": fa.action,
                    "instructions": fa.instructions,
                    "rationale": fa.rationale,
                }
                for fa in evidence.first_aid_measures
            ],
            "suggested_otc_medicines": [
                {
                    "name": med.name,
                    "generic_name": med.generic_name,
                    "purpose": med.purpose,
                    "dosage_guide": med.dosage_guide,
                    "prescription_required": med.prescription_required,
                    "precautions": med.precautions,
                }
                for med in evidence.suggested_otc_medicines
            ],
            "suggestedMedicines": [
                {
                    "name": med.name,
                    "genericName": med.generic_name,
                    "purpose": med.purpose,
                    "dosageGuide": med.dosage_guide,
                    "prescriptionRequired": med.prescription_required,
                    "precautions": med.precautions,
                }
                for med in evidence.suggested_otc_medicines
            ],
            "red_flag_warning": evidence.red_flag_warning,
            "redFlagWarning": evidence.red_flag_warning,
            "citations": [
                {"source": cit.source, "title": cit.title, "url": cit.url, "evidence_type": cit.evidence_type}
                for cit in evidence.citations
            ],
            "uncertainty_level": evidence.uncertainty_level,
            "uncertaintyLevel": evidence.uncertainty_level,
            "disclaimer": evidence.disclaimer,
        },
        version="0.2.0",
    )

