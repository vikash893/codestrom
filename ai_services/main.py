
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from config import settings
from logging_config import configure_logging

from app.schemas.evidence import EvidenceRequest, EvidenceResponse
from app.schemas.intake import IntakeRequest, IntakeResponse
from app.schemas.media import (
    AudioTranscriptionResponse,
    ImageOCRResponse,
    SkinAnalysisResponse,
)
from app.services.evidence_service import synthesize_evidence
from app.services.intake_service import process_intake
from app.services.media_service import (
    process_audio_transcription,
    process_image_ocr,
    process_skin_analysis,
)
from app.schemas.ensemble import (
    EnsembleIntakeRequest,
    EnsembleIntakeResponse,
    RetrainPipelineResponse,
)
from app.services.ensemble_service import get_ensemble_service
from app.services.ann_image_service import get_ann_image_service
from app.ml.dataset_downloader import prepare_all_datasets
from app.ml.train_symptom_model import train_symptom_nlp_model, SymptomPredictor
from app.ml.train_skin_ann import train_skin_ann_model, SkinANNPredictor
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
    "/api/v1/media/analyze-skin",
    response_model=SkinAnalysisResponse,
    tags=["AI Media"],
)
async def analyze_skin(
    file: UploadFile = File(...),
):
    contents = await file.read()
    service = get_ann_image_service()
    return service.process_image_with_ann(file.filename or "skin.jpg", contents)


@app.post(
    "/api/v1/pipeline/consensus-intake",
    response_model=EnsembleIntakeResponse,
    tags=["Ensemble Pipeline"],
)
async def consensus_intake(request: EnsembleIntakeRequest):
    """
    Dual-stream ensemble pipeline:
    1. Evaluates patient symptoms against the trained ML NLP model.
    2. Searches internet medical literature for real-time corroboration.
    3. Fuses both streams to extract common and best consensus outcome.
    """
    service = get_ensemble_service()
    return service.process_ensemble_assessment(request.symptoms, request.age or 30)


@app.post(
    "/api/v1/pipeline/ann-skin-analysis",
    response_model=SkinAnalysisResponse,
    tags=["ANN Image Analysis"],
)
async def ann_skin_analysis(
    file: UploadFile = File(...),
):
    """
    Artificial Neural Network (ANN) classification of skin conditions:
    Extracts 12-dimensional perceptual feature vector and executes forward pass
    through trained Multi-Layer Perceptron (128 -> 64 -> 32 -> 8).
    """
    contents = await file.read()
    service = get_ann_image_service()
    return service.process_image_with_ann(file.filename or "skin.jpg", contents)


@app.get(
    "/api/v1/pipeline/train-status",
    tags=["ML & ANN Pipeline Management"],
)
async def get_train_status():
    """Returns training metrics, dataset sizes, and architecture of both models."""
    symptom_pred = SymptomPredictor.get_instance()
    ann_pred = SkinANNPredictor.get_instance()
    return {
        "status": "ready",
        "symptom_ml_model": {
            "type": "TF-IDF + Calibrated Multi-Class Classifier",
            "metrics": symptom_pred.metrics,
            "classes_count": len(symptom_pred.classes),
            "classes": symptom_pred.classes,
        },
        "skin_ann_model": {
            "architecture": ann_pred.architecture,
            "classes": ann_pred.classes,
        },
    }


@app.post(
    "/api/v1/pipeline/retrain",
    response_model=RetrainPipelineResponse,
    tags=["ML & ANN Pipeline Management"],
)
async def retrain_pipelines():
    """Triggers download of latest dataset and retrains both NLP ML model and Skin ANN."""
    logger.info("Triggering full retraining of ML and ANN pipelines...")
    prepare_all_datasets()
    ml_res = train_symptom_nlp_model()
    ann_res = train_skin_ann_model()
    return {
        "status": "success",
        "message": "Both Symptom ML NLP pipeline and Skin ANN models retrained successfully.",
        "symptom_ml_model": ml_res.get("metrics", {}),
        "skin_ann_model": ann_res.get("architecture", {}),
    }


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


