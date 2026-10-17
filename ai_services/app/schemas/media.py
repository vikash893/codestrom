from pydantic import BaseModel, Field


class AudioTranscriptionResponse(BaseModel):
    transcript: str
    detected_language: str
    duration_seconds: float = 0.0
    confidence_score: float = 0.95
    is_emergency: bool = False
    emergency_flags: list[str] = Field(default_factory=list)
    extracted_symptoms: list[str] = Field(default_factory=list)


class ImageOCRResponse(BaseModel):
    extracted_text: str
    detected_medicines: list[str] = Field(default_factory=list)
    confidence_score: float = 0.88
    requires_user_confirmation: bool = True
    disclaimer: str = (
        "AI text extraction from images may contain inaccuracies. "
        "Always confirm medicine names and dosages against the physical packaging or original prescription."
    )
