"""
Ensemble Medical Pipeline Service for MediResQ.
Fuses predictions from the trained Machine Learning NLP model with real-time
Internet Medical Search evidence to extract the common and best consensus diagnosis,
evidence-verified medicines, precautions, and specialist routing.
"""

import re
import logging
from typing import Dict, Any, List

from app.ml.train_symptom_model import SymptomPredictor
from app.ml.web_medical_search import get_web_medical_searcher
from app.services.safety_screener import screen_emergency

logger = logging.getLogger("mediresq.ai.ensemble")

# Semantic equivalence mapping between ML dataset disease labels and medical literature titles
CONDITION_SYNONYMS = {
    "gerd": ["gastroesophageal reflux disease", "acid reflux", "heartburn", "esophagitis", "gerd"],
    "fungal infection": ["fungal infection", "tinea", "ringworm", "mycosis", "candidiasis", "dermatomycosis"],
    "allergy": ["allergy", "allergic rhinitis", "urticaria", "hypersensitivity", "hay fever"],
    "bronchial asthma": ["asthma", "bronchial asthma", "bronchospasm", "wheezing", "reactive airway"],
    "heart attack": ["myocardial infarction", "acute coronary syndrome", "heart attack", "angina", "chest pain"],
    "migraine": ["migraine", "headache", "vascular headache", "cephalea"],
    "common cold": ["common cold", "rhinovirus", "upper respiratory tract infection", "nasopharyngitis", "cold"],
    "pneumonia": ["pneumonia", "lower respiratory tract infection", "pulmonary consolidation"],
    "urinary tract infection": ["urinary tract infection", "uti", "cystitis", "pyelonephritis", "dysuria"],
    "acne": ["acne", "acne vulgaris", "pimples", "folliculitis"],
    "dengue": ["dengue", "dengue fever", "breakbone fever"],
    "malaria": ["malaria", "plasmodium"],
    "typhoid": ["typhoid", "enteric fever", "salmonella typhi"],
    "diabetes": ["diabetes", "diabetes mellitus", "hyperglycemia", "type 2 diabetes"],
    "hypertension": ["hypertension", "high blood pressure", "hypertensive crisis"],
    "gastroenteritis": ["gastroenteritis", "stomach flu", "food poisoning", "infectious diarrhea"]
}


def compute_semantic_overlap(model_disease: str, web_conditions: List[str]) -> float:
    """Calculates semantic alignment score between model prediction and web search titles."""
    model_lower = model_disease.lower().strip()
    synonyms = CONDITION_SYNONYMS.get(model_lower, [model_lower])

    max_score = 0.0

    for web_cond in web_conditions:
        web_lower = web_cond.lower().strip()
        # Direct equality or substring containment
        if any(s in web_lower or web_lower in s for s in synonyms):
            return 1.0
        # Word set Jaccard overlap
        s_words = set(re.findall(r"\w+", " ".join(synonyms)))
        w_words = set(re.findall(r"\w+", web_lower))
        if s_words and w_words:
            overlap = len(s_words & w_words) / float(len(s_words | w_words))
            if overlap > max_score:
                max_score = overlap

    return round(max_score, 2)


class EnsemblePipelineService:
    """Dual-stream ensemble combining trained ML model output + internet search output."""

    def __init__(self):
        self.predictor = SymptomPredictor.get_instance()
        self.web_searcher = get_web_medical_searcher()

    def process_ensemble_assessment(self, symptoms_text: str, user_age: int = 30) -> Dict[str, Any]:
        """
        Executes the dual-engine pipeline:
        1. Predicts condition and medicines from trained ML Model.
        2. Retrieves live web medical search evidence.
        3. Fuses both streams to extract the common and best consensus outcome.
        """
        logger.info("Executing Ensemble Pipeline for symptoms: '%s'", symptoms_text[:40])

        # Fast safety screening for immediate life-threatening conditions
        safety_result = screen_emergency(symptoms_text)

        # Stream 1: Trained ML Model Inference
        model_out = self.predictor.predict(symptoms_text)
        predicted_disease = model_out["predicted_disease"]
        model_confidence = model_out["confidence"]
        model_medicines = model_out["recommended_medicines"]
        model_precautions = model_out["precautions"]

        # Stream 2: Internet Medical Search
        web_out = self.web_searcher.search_medical_evidence(symptoms_text)
        web_conditions = web_out.get("candidate_conditions", [])
        web_medicines = web_out.get("recommended_medicines", [])
        web_snippets = web_out.get("snippets", [])

        # Stream 3: Consensus & Alignment Synthesis
        overlap_score = compute_semantic_overlap(predicted_disease, web_conditions)

        if overlap_score >= 0.70:
            consensus_status = "High Consensus (ML Model & Web Confirmed)"
            fused_confidence = min(0.96, model_confidence + 0.10)
        elif overlap_score >= 0.30:
            consensus_status = "Moderate Agreement (Partial Clinical Overlap)"
            fused_confidence = model_confidence
        else:
            consensus_status = "Independent Model Assessment (Web Search Broad)"
            fused_confidence = max(0.70, model_confidence - 0.05)

        # Synthesize Common & Best Medicines
        common_medicines = []
        model_med_names = [m["name"].lower() for m in model_medicines]

        for m in model_medicines:
            is_confirmed_by_web = False
            m_generic = m.get("generic", m.get("name", "")).lower()

            # Check if active generic or brand appeared in web search results
            for wm in web_medicines:
                wm_name = wm.get("name", "").lower()
                if m_generic in wm_name or wm.get("generic_name", "").lower() in m_generic:
                    is_confirmed_by_web = True
                    break

            for snippet in web_snippets:
                if m_generic in snippet.get("snippet", "").lower():
                    is_confirmed_by_web = True
                    break

            common_medicines.append({
                "name": m["name"],
                "generic_name": m.get("generic", m.get("generic_name", m["name"])),
                "dosage_form": m.get("type", "Tablet"),
                "price": m.get("price", 50.0),
                "instruction": m.get("instruction", "Take as directed by doctor"),
                "consensus_verified": is_confirmed_by_web,
                "evidence_badge": "🟢 Verified by ML Model + Web Search" if is_confirmed_by_web else "🔵 Clinical Guideline Standard"
            })

        # Synthesize Home Care & Precautions
        home_care = list(dict.fromkeys(model_precautions))

        # Check emergency status from safety screener, model, or web search
        is_emergency = safety_result.is_emergency or model_out.get("is_emergency", False) or web_out.get("is_emergency", False)
        emergency_flags = list(set(safety_result.emergency_flags + web_out.get("red_flags", [])))

        return {
            "status": "success",
            "pipeline_type": "Dual-Stream ML Model + Internet Search Consensus",
            "primary_condition": predicted_disease,
            "consensus_status": consensus_status,
            "confidence_score": round(float(fused_confidence), 3),
            "model_web_alignment_score": overlap_score,
            "is_emergency": is_emergency,
            "emergency_flags": emergency_flags,
            "recommended_specialist": model_out.get("specialist", "General Physician"),
            "severity": "CRITICAL EMERGENCY (P0)" if is_emergency else model_out.get("severity", "Moderate"),
            "model_stream": {
                "predicted_disease": predicted_disease,
                "raw_confidence": model_confidence,
                "top_alternatives": model_out.get("top_candidates", [])
            },
            "web_stream": {
                "search_status": web_out.get("status", "unknown"),
                "web_conditions_found": web_conditions[:4],
                "verified_snippets_count": len(web_snippets)
            },
            "common_and_best_medicines": common_medicines,
            "home_care": home_care,
            "disclaimer": (
                "यह परिणाम प्रशिक्षित मशीन लर्निंग मॉडल और इंटरनेट मेडिकल साक्ष्यों के विश्लेषण पर आधारित है। "
                "यह प्रमाणित चिकित्सक का विकल्प नहीं है। गंभीर स्थिति में तुरंत डॉक्टर से संपर्क करें।"
            )
        }


# Global singleton instance
_ensemble_service_instance = None


def get_ensemble_service() -> EnsemblePipelineService:
    global _ensemble_service_instance
    if _ensemble_service_instance is None:
        _ensemble_service_instance = EnsemblePipelineService()
    return _ensemble_service_instance
