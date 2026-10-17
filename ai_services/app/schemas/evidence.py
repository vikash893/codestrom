from pydantic import BaseModel, Field


class EvidenceRequest(BaseModel):
    symptoms: list[str] = Field(default_factory=list)
    description: str = Field(default="", max_length=3000)
    severity: str = "unknown"
    age_years: int | None = None


class CitationResponse(BaseModel):
    source: str
    title: str
    url: str
    evidence_type: str = "guideline"


class SuggestedMedicine(BaseModel):
    name: str
    generic_name: str
    purpose: str
    dosage_guide: str
    prescription_required: bool
    precautions: str


class FirstAidMeasure(BaseModel):
    action: str
    instructions: str
    rationale: str


class ConditionResponse(BaseModel):
    name: str
    confidence: float
    clinical_rationale: str
    missing_findings: list[str]
    warning_signs: list[str]
    citations: list[CitationResponse]


class EvidenceResponse(BaseModel):
    possible_conditions: list[ConditionResponse]
    clinical_rationale: str
    suggested_specialties: list[str]
    missing_findings: list[str]
    first_aid_measures: list[FirstAidMeasure] = Field(default_factory=list)
    suggested_otc_medicines: list[SuggestedMedicine] = Field(default_factory=list)
    red_flag_warning: str | None = None
    citations: list[CitationResponse]
    uncertainty_level: str
    disclaimer: str
