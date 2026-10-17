from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class IntakeRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(
        min_length=5,
        max_length=3000,
        description="The patient's description of their current concern.",
    )
    language: str = Field(default="en", max_length=10)

    duration: str | None = Field(
        default=None,
        max_length=200,
        description="How long the symptoms have been present.",
    )
    severity: Literal["mild", "moderate", "severe", "unknown"] = "unknown"
    age_years: int | None = Field(default=None, ge=0, le=120)
    relevant_history: str | None = Field(default=None, max_length=1000)


from app.schemas.evidence import EvidenceResponse


class TriageInfo(BaseModel):
    level: Literal["RED", "YELLOW", "GREEN", "UNKNOWN"] = "GREEN"
    priority: Literal["P0_EMERGENCY", "P1_URGENT", "P2_PRIORITY", "P3_ROUTINE"] = "P3_ROUTINE"
    reason_codes: list[str] = Field(default_factory=list)
    requires_human_review: bool = True
    ruleset_version: str = "WHO-IITT-v1.2"


class IntakeResponse(BaseModel):
    status: Literal["received"]
    summary: str
    needs_clinician_review: bool = True
    disclaimer: str

    # Extended v2 fields (with defaults for full backward compatibility)
    is_emergency: bool = False
    emergency_flags: list[str] = Field(default_factory=list)
    emergency_guidance: str | None = None
    triage: TriageInfo = Field(default_factory=TriageInfo)
    patient_guidance: str | None = None
    detected_language: str = "en"
    extracted_symptoms: list[str] = Field(default_factory=list)
    confidence_score: float = 1.0
    evidence_synthesis: EvidenceResponse | None = None
    version: str = "0.2.0"


