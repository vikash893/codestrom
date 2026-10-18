from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class EnsembleIntakeRequest(BaseModel):
    symptoms: str = Field(..., min_length=3, description="Patient symptoms in English, Hindi, or Hinglish")
    age: Optional[int] = Field(default=30, ge=0, le=120)
    language: Optional[str] = Field(default="en")


class ConsensusMedicineItem(BaseModel):
    name: str
    generic_name: str
    dosage_form: str
    price: float
    instruction: str
    consensus_verified: bool
    evidence_badge: str


class EnsembleIntakeResponse(BaseModel):
    status: str
    pipeline_type: str
    primary_condition: str
    consensus_status: str
    confidence_score: float
    model_web_alignment_score: float
    is_emergency: bool
    emergency_flags: List[str]
    recommended_specialist: str
    severity: str
    model_stream: Dict[str, Any]
    web_stream: Dict[str, Any]
    common_and_best_medicines: List[Dict[str, Any]]
    home_care: List[str]
    disclaimer: str


class RetrainPipelineResponse(BaseModel):
    status: str
    message: str
    symptom_ml_model: Dict[str, Any]
    skin_ann_model: Dict[str, Any]
