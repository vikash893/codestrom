
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from config import settings
from logging_config import configure_logging

from app.schemas.evidence import EvidenceRequest, EvidenceResponse
from app.schemas.intake import IntakeRequest, IntakeResponse
from app.schemas.media import AudioTranscriptionResponse, ImageOCRResponse
from app.services.evidence_service import synthesize_evidence
from app.services.intake_service import process_intake
from app.services.media_service import process_audio_transcription, process_image_ocr
from fastapi import UploadFile, File



configure_logging()
logger = logging.getLogger("mediresq.ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("MediResQ AI Services starting")
    yield
    logger.info("MediResQ AI Services stopping")


app = FastAPI(
    title="MediResQ AI Services",
    description="AI-assisted healthcare navigation services for MediResQ.",
    version="0.1.0",
    lifespan=lifespan,
    debug=not settings.is_production,
)


@app.exception_handler(Exception)
async def handle_unexpected_error(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    logger.error(
        "Unexpected application error on %s %s",
        request.method,
        request.url.path,
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred."},
    )


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "mediresq-ai-services",
        "version": "0.1.0",
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Welcome to MediResQ AI Services",
        "docs": "/docs",
        "health": "/health",
    }


@app.post(
    "/api/v1/intake",
    response_model=IntakeResponse,
    tags=["AI Intake"],
)
async def create_intake(request: IntakeRequest):
    return process_intake(request)


@app.post(
    "/api/v1/media/transcribe-audio",
    response_model=AudioTranscriptionResponse,
    tags=["AI Media"],
)
async def transcribe_audio(
    file: UploadFile = File(...),
    language_hint: str = "en",
):
    contents = await file.read()
    return process_audio_transcription(file.filename or "audio.wav", contents, language_hint)


@app.post(
    "/api/v1/media/ocr-image",
    response_model=ImageOCRResponse,
    tags=["AI Media"],
)
async def ocr_image(
    file: UploadFile = File(...),
):
    contents = await file.read()
    return process_image_ocr(file.filename or "prescription.jpg", contents)


@app.post(
    "/api/v1/clinical/evidence-synthesis",
    response_model=EvidenceResponse,
    tags=["Clinical Evidence"],
)
async def get_evidence_synthesis(request: EvidenceRequest):
    result = synthesize_evidence(
        symptoms=request.symptoms,
        patient_description=request.description,
        severity=request.severity,
        age=request.age_years,
    )
    return {
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
            for c in result.possible_conditions
        ],
        "clinical_rationale": result.clinical_rationale,
        "suggested_specialties": result.suggested_specialties,
        "missing_findings": result.missing_findings,
        "first_aid_measures": [
            {
                "action": fa.action,
                "instructions": fa.instructions,
                "rationale": fa.rationale,
            }
            for fa in result.first_aid_measures
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
            for med in result.suggested_otc_medicines
        ],
        "red_flag_warning": result.red_flag_warning,
        "citations": [
            {"source": cit.source, "title": cit.title, "url": cit.url, "evidence_type": cit.evidence_type}
            for cit in result.citations
        ],
        "uncertainty_level": result.uncertainty_level,
        "disclaimer": result.disclaimer,
    }


