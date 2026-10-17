import re
from dataclasses import dataclass, field


# Canonical symptom dictionary with multilingual recognition patterns
SYMPTOM_DICTIONARY: dict[str, tuple[re.Pattern, ...]] = {
    "headache": (
        re.compile(r"\b(headache|migraine|head\s*pain)\b", re.IGNORECASE),
        re.compile(r"(सिर\s*(में\s*)?दर्द|आधाशीशी)"),
        re.compile(r"\b(sir\s*dard|sar\s*dard|sir\s*me\s*dard|sar\s*me\s*dard)\b", re.IGNORECASE),
    ),
    "fever": (
        re.compile(r"\b(fever|high\s*temperature|chills|feverish)\b", re.IGNORECASE),
        re.compile(r"(बुखार|ताप|ठंड\s*लगना)"),
        re.compile(r"\b(bukhar|tez\s*bukhar|thand\s*lag\s*rahi)\b", re.IGNORECASE),
    ),
    "cough": (
        re.compile(r"\b(cough|coughing|dry\s*cough|wet\s*cough)\b", re.IGNORECASE),
        re.compile(r"(खांसी|खराश)"),
        re.compile(r"\b(khansi|sukhi\s*khansi|balgham)\b", re.IGNORECASE),
    ),
    "chest_pain": (
        re.compile(r"\b(chest\s*pain|chest\s*pressure|tightness\s*in\s*chest)\b", re.IGNORECASE),
        re.compile(r"(सीने\s*में\s*दर्द|छाती\s*में\s*दर्द)"),
        re.compile(r"\b(sine\s*me\s*dard|chhati\s*me\s*dard)\b", re.IGNORECASE),
    ),
    "shortness_of_breath": (
        re.compile(r"\b(shortness\s*of\s*breath|breathlessness|difficulty\s*breathing)\b", re.IGNORECASE),
        re.compile(r"(सांस\s*(फूलना|लेने\s*में\s*(दिक्कत|तकलीफ)|नहीं\s*आ\s*रही)|दम\s*घुट)"),
        re.compile(r"\b(saa?ns?\s*(lene\s*me(in)?|phool|dikkat|problem)|breathlessness|dam\s*ghut)\b", re.IGNORECASE),
    ),
    "nausea_vomiting": (
        re.compile(r"\b(nausea|vomiting|throwing\s*up|puking)\b", re.IGNORECASE),
        re.compile(r"(उल्टी|जी\s*मिचलाना)"),
        re.compile(r"\b(ulti|ji\s*michlana|vomit)\b", re.IGNORECASE),
    ),
    "abdominal_pain": (
        re.compile(r"\b(stomach\s*ache|abdominal\s*pain|belly\s*pain|stomach\s*pain)\b", re.IGNORECASE),
        re.compile(r"(पेट\s*(में\s*)?दर्द|मरोड़)"),
        re.compile(r"\b(pet\s*dard|pet\s*me\s*dard|stomach\s*pain)\b", re.IGNORECASE),
    ),
    "dizziness": (
        re.compile(r"\b(dizziness|vertigo|lightheaded|fainting)\b", re.IGNORECASE),
        re.compile(r"(चक्कर|बेहोशी)"),
        re.compile(r"\b(chakkar|chakkar\s*aana|lightheaded)\b", re.IGNORECASE),
    ),
    "fatigue": (
        re.compile(r"\b(fatigue|exhaustion|weakness|tiredness)\b", re.IGNORECASE),
        re.compile(r"(थकान|कमजोरी)"),
        re.compile(r"\b(thakan|kamzori|weakness)\b", re.IGNORECASE),
    ),
    "sore_throat": (
        re.compile(r"\b(sore\s*throat|throat\s*pain|pain\s*swallowing)\b", re.IGNORECASE),
        re.compile(r"(गले\s*में\s*खराश|गले\s*में\s*दर्द)"),
        re.compile(r"\b(gale\s*me\s*dard|gala\s*kharash)\b", re.IGNORECASE),
    ),
}


@dataclass
class ExtractedClinicalDetails:
    symptoms: list[str] = field(default_factory=list)
    confidence_score: float = 1.0


def extract_symptoms(text: str) -> ExtractedClinicalDetails:
    """
    Extracts recognized medical symptoms across English, Hindi, and Hinglish.
    """
    if not text:
        return ExtractedClinicalDetails(symptoms=[], confidence_score=1.0)

    found_symptoms: list[str] = []

    for symptom_key, patterns in SYMPTOM_DICTIONARY.items():
        for pattern in patterns:
            if pattern.search(text):
                found_symptoms.append(symptom_key)
                break

    return ExtractedClinicalDetails(
        symptoms=found_symptoms,
        confidence_score=0.95 if found_symptoms else 0.80,
    )
