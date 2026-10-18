from typing import Any
from pydantic import BaseModel, Field


class AudioTranscriptionResponse(BaseModel):
    transcript: str
    detected_language: str
    duration_seconds: float = 0.0
    confidence_score: float = 0.95
    is_emergency: bool = False
    emergency_flags: list[str] = Field(default_factory=list)
    extracted_symptoms: list[str] = Field(default_factory=list)


class SkinMedicineItem(BaseModel):
    name: str
    generic_name: str
    dosage_form: str
    purpose: str
    instruction: str
    price: float


class SkinAnalysisResponse(BaseModel):
    analysis_type: str = "skin_infection"
    model_architecture: str = "Multi-Layer Perceptron (ANN)"
    condition: str
    severity: str
    confidence_score: float
    neural_network_candidates: list[dict[str, Any]] = Field(default_factory=list)
    visual_findings: str
    recommended_medicines: list[SkinMedicineItem] = Field(default_factory=list)
    home_care: list[str] = Field(default_factory=list)
    warning_signs: list[str] = Field(default_factory=list)
    recommended_specialist: str
    can_order_medicines: bool = True
    image_metrics: dict[str, Any] = Field(default_factory=dict)
    disclaimer: str = (
        "AI dermatological screening is preliminary decision-support. "
        "A physical in-person examination by a certified dermatologist is strongly recommended."
    )


class ImageOCRResponse(BaseModel):
    extracted_text: str
    detected_medicines: list[str] = Field(default_factory=list)
    detected_dosages: list[str] = Field(default_factory=list)
    items_for_order: list[dict[str, Any]] = Field(default_factory=list)
    confidence_score: float = 0.88
    requires_user_confirmation: bool = True
    image_metrics: dict[str, Any] = Field(default_factory=dict)
    disclaimer: str = (
        "AI text extraction from images may contain inaccuracies. "
        "Always confirm medicine names and dosages against the physical packaging or original prescription."
    )

