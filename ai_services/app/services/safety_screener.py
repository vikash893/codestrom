import re
from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class SafetyRule:
    rule_id: str
    category: str
    patterns: tuple[re.Pattern, ...]
    guidance: str
    triage_level: Literal["RED", "YELLOW"] = "RED"
    priority: Literal["P0_EMERGENCY", "P1_URGENT"] = "P0_EMERGENCY"


# Pre-compiled regex patterns for multilingual emergency detection
# (English, Devanagari Hindi, and Latin Hinglish)
EMERGENCY_RULES: tuple[SafetyRule, ...] = (
    SafetyRule(
        rule_id="CARDIOVASCULAR_WARNING",
        category="Cardiovascular",
        triage_level="RED",
        priority="P0_EMERGENCY",
        patterns=(
            # English
            re.compile(
                r"\b(chest\s*(pain|pressure|tightness|ache|discomfort|burning)|"
                r"(pain|pressure|ache|discomfort|tightness)\s+in\s+(the\s+|my\s+)?chest|"
                r"hurting\s+in\s+(the\s+|my\s+)?chest|chest\s+hurts|heart\s*(attack|pain|ache)|"
                r"pain\s+radiating\s+to\s+(left\s+arm|jaw)|crushing\s+chest|angina)\b",
                re.IGNORECASE,
            ),
            # Hindi (Devanagari)
            re.compile(r"(सीने\s*में\s*(तेज\s*)?(दर्द|जलन|दबाव)|छाती\s*में\s*(दर्द|जलन)|दिल\s*(का\s*दौरा|में\s*दर्द))"),
            # Hinglish
            re.compile(r"\b(chhati|sine|seene|chaati|chest)\s*(m(e|ein)|me)?\s*(bahut\s*|tez\s*)?(dard|jalan|pressure|pain)\b", re.IGNORECASE),
            re.compile(r"\b(heart\s*attack|dil\s*ka\s*daura|left\s*arm\s*pain|chest\s*me\s*dard|pain\s+in\s+chest|dil\s*me\s*dard)\b", re.IGNORECASE),
        ),
        guidance=(
            "CRITICAL WARNING: The reported symptoms suggest a potential cardiac emergency. "
            "Please call emergency services (112 or local emergency line) immediately and "
            "proceed to the nearest emergency department. Do not drive yourself."
        ),
    ),
    SafetyRule(
        rule_id="RESPIRATORY_DISTRESS",
        category="Respiratory",
        triage_level="RED",
        priority="P0_EMERGENCY",
        patterns=(
            # English
            re.compile(r"\b(cannot\s+breathe|unable\s+to\s+breathe|severe\s+shortness\s+of\s+breath|gasping\s+for\s+air|lips\s+turning\s+blue|cyanosis|choking|suffocating)\b", re.IGNORECASE),
            # Hindi (Devanagari)
            re.compile(r"(सांस\s*(नहीं\s*आ\s*रही|लेने\s*में\s*(बहुत\s*)?तकलीफ)|दम\s*घुट\s*रहा\s*है|नीले\s*होंठ)"),
            # Hinglish
            re.compile(r"\b(saas|sans|saans)\s*(nahi\s*aa\s*rahi|lene\s*me(in)?\s*(bahut\s*)?problem|phool\s*rahi)\b", re.IGNORECASE),
            re.compile(r"\b(dam\s*ghut\s*raha|breathe\s*nahi\s*kar\s*pa\s*raha)\b", re.IGNORECASE),
        ),
        guidance=(
            "CRITICAL WARNING: Severe breathing difficulty requires immediate emergency medical attention. "
            "Call 112 immediately or go to the nearest emergency hospital."
        ),
    ),
    SafetyRule(
        rule_id="STROKE_OR_NEURO_EMERGENCY",
        category="Neurological",
        triage_level="RED",
        priority="P0_EMERGENCY",
        patterns=(
            # English
            re.compile(r"\b(facial\s+droop|slurred\s+speech|sudden\s+weakness\s+on\s+one\s+side|loss\s+of\s+consciousness|unconscious|unresponsive|seizure|convulsion|thunderclap\s+headache)\b", re.IGNORECASE),
            # Hindi (Devanagari)
            re.compile(r"(बेहोश\s*(हो\s*गया)?|लकवा|चेहरा\s*टेढ़ा|बोलने\s*में\s*लड़खड़ाहट|दौरा\s*पड़\s*रहा)"),
            # Hinglish
            re.compile(r"\b(behosh|chehra\s*tedha|bol\s*nahi\s*pa\s*raha|daura\s*pad|chakkar\s*gir\s*gaya\s*unconscious)\b", re.IGNORECASE),
            re.compile(r"\b(slurred\s*bol\s*raha|sudden\s*paralysis|one\s*side\s*kam\s*nahi\s*kar\s*raha)\b", re.IGNORECASE),
        ),
        guidance=(
            "CRITICAL WARNING: Signs of acute stroke or neurological crisis detected (FAST warning signs). "
            "Every minute counts. Call 112 immediately and transport the patient to an acute stroke-ready emergency center."
        ),
    ),
    SafetyRule(
        rule_id="SEVERE_TRAUMA_OR_HEMORRHAGE",
        category="Trauma / Hemorrhage",
        triage_level="RED",
        priority="P0_EMERGENCY",
        patterns=(
            # English
            re.compile(r"\b(uncontrolled\s+bleeding|arterial\s+bleeding|severe\s+head\s+injury|coughing\s+up\s+large\s+blood|vomiting\s+blood|deep\s+stab|gunshot)\b", re.IGNORECASE),
            # Hindi (Devanagari)
            re.compile(r"(बहुत\s*खून\s*बह\s*रहा\s*है|खून\s*की\s*उल्टी|सिर\s*में\s*गहरी\s*चोट)"),
            # Hinglish
            re.compile(r"\b(bohot\s*khoon\s*nikal\s*raha|khoon\s*ki\s*ulti|head\s*injury\s*bleed)\b", re.IGNORECASE),
        ),
        guidance=(
            "CRITICAL WARNING: Severe bleeding or major trauma requires immediate emergency trauma care. "
            "Apply firm, continuous pressure to bleeding wounds and call emergency services (112) immediately."
        ),
    ),
    SafetyRule(
        rule_id="ANAPHYLAXIS_OR_POISONING",
        category="Anaphylaxis / Toxicology",
        triage_level="RED",
        priority="P0_EMERGENCY",
        patterns=(
            # English
            re.compile(r"\b(anaphylaxis|swollen\s+tongue|throat\s+closing\s+up|swallowed\s+poison|ingested\s+pesticide|drug\s+overdose)\b", re.IGNORECASE),
            # Hindi (Devanagari)
            re.compile(r"(गला\s*बंद\s*हो\s*रहा|जहर\s*खा\s*लिया|कीटनाशक\s*पी\s*लिया)"),
            # Hinglish
            re.compile(r"\b(gala\s*band\s*ho\s*raha|zeher\s*kha\s*liya|throat\s*closing|swallowed\s*poison)\b", re.IGNORECASE),
        ),
        guidance=(
            "CRITICAL WARNING: Potential severe allergic reaction (anaphylaxis) or acute poisoning detected. "
            "Administer auto-injector (EpiPen) if prescribed, and call 112 immediately."
        ),
    ),
)

# Urgent non-life-threatening rules (YELLOW / P1_URGENT)
URGENT_RULES: tuple[SafetyRule, ...] = (
    SafetyRule(
        rule_id="ACUTE_HIGH_FEVER_OR_INFECTION",
        category="Infection / High Fever",
        triage_level="YELLOW",
        priority="P1_URGENT",
        patterns=(
            re.compile(r"\b(high\s*fever\s*(for|since)\s*[3-9]\s*days|104|fever\s*with\s*(stiff\s*neck|rigors|confusion))\b", re.IGNORECASE),
            re.compile(r"(तेज\s*बुखार\s*तीन\s*दिन\s*से|गर्दन\s*अकड़ना)"),
            re.compile(r"\b(bahut\s*tez\s*bukhar|103|104|kapi\s*chhut\s*rahi)\b", re.IGNORECASE),
        ),
        guidance=(
            "URGENT REVIEW RECOMMENDED: High or prolonged fever requires prompt medical evaluation to rule out acute infection."
        ),
    ),
    SafetyRule(
        rule_id="ACUTE_SEVERE_ABDOMINAL_PAIN",
        category="Gastrointestinal",
        triage_level="YELLOW",
        priority="P1_URGENT",
        patterns=(
            re.compile(r"\b(severe\s*(stomach|belly|abdominal)\s*pain|appendicitis|constant\s*vomiting\s*cannot\s*keep\s*water)\b", re.IGNORECASE),
            re.compile(r"(पेट\s*में\s*असहनीय\s*दर्द|पानी\s*भी\s*नहीं\s*रुक\s*रहा)"),
            re.compile(r"\b(pet\s*me\s*bahut\s*tez\s*dard|lagatar\s*ulti\s*paani\s*nahi\s*ruk\s*raha)\b", re.IGNORECASE),
        ),
        guidance=(
            "URGENT REVIEW RECOMMENDED: Severe acute abdominal pain requires prompt clinical assessment."
        ),
    ),
)


@dataclass
class ScreeningResult:
    is_emergency: bool
    emergency_flags: list[str] = field(default_factory=list)
    guidance: str | None = None
    urgency_level: str = "routine"

    # WHO 4-tier triage extensions
    triage_level: Literal["RED", "YELLOW", "GREEN", "UNKNOWN"] = "GREEN"
    priority: Literal["P0_EMERGENCY", "P1_URGENT", "P2_PRIORITY", "P3_ROUTINE"] = "P3_ROUTINE"
    reason_codes: list[str] = field(default_factory=list)
    requires_human_review: bool = True
    ruleset_version: str = "WHO-IITT-v1.2"


def screen_emergency(
    text: str,
    reported_severity: str = "unknown",
) -> ScreeningResult:
    """
    Deterministic safety evaluation executed in sub-5ms based on WHO-IITT triage standards.
    Maps to RED (P0), YELLOW (P1), GREEN (P3), or UNKNOWN (P2).
    """
    if not text or not text.strip():
        return ScreeningResult(
            is_emergency=False,
            urgency_level="routine",
            triage_level="UNKNOWN",
            priority="P2_PRIORITY",
            reason_codes=["INSUFFICIENT_INFORMATION"],
            guidance="Insufficient information provided. Please provide more details about your symptoms.",
        )

    cleaned_text = text.strip()

    # 1. Evaluate P0 RED Emergency Rules
    red_flags: list[str] = []
    red_guidance: list[str] = []

    for rule in EMERGENCY_RULES:
        for pattern in rule.patterns:
            if pattern.search(cleaned_text):
                red_flags.append(rule.rule_id)
                red_guidance.append(rule.guidance)
                break

    if red_flags:
        combined_guidance = " ".join(dict.fromkeys(red_guidance))
        return ScreeningResult(
            is_emergency=True,
            emergency_flags=red_flags,
            guidance=combined_guidance,
            urgency_level="emergency",
            triage_level="RED",
            priority="P0_EMERGENCY",
            reason_codes=red_flags,
            requires_human_review=True,
        )

    # 2. Evaluate P1 YELLOW Urgent Rules
    yellow_flags: list[str] = []
    yellow_guidance: list[str] = []

    for rule in URGENT_RULES:
        for pattern in rule.patterns:
            if pattern.search(cleaned_text):
                yellow_flags.append(rule.rule_id)
                yellow_guidance.append(rule.guidance)
                break

    if yellow_flags:
        combined_guidance = " ".join(dict.fromkeys(yellow_guidance))
        return ScreeningResult(
            is_emergency=False,
            emergency_flags=yellow_flags,
            guidance=combined_guidance,
            urgency_level="urgent_consult",
            triage_level="YELLOW",
            priority="P1_URGENT",
            reason_codes=yellow_flags,
            requires_human_review=True,
        )

    # 3. Patient reported severe symptoms (prompts YELLOW urgent review)
    if reported_severity == "severe":
        return ScreeningResult(
            is_emergency=False,
            emergency_flags=["PATIENT_REPORTED_SEVERE"],
            guidance="Patient reported symptoms as severe. We advise prompt clinical evaluation by a medical professional.",
            urgency_level="urgent_consult",
            triage_level="YELLOW",
            priority="P1_URGENT",
            reason_codes=["PATIENT_REPORTED_SEVERE"],
            requires_human_review=True,
        )

    # 4. Too brief/uncertain description
    if len(cleaned_text) < 10:
        return ScreeningResult(
            is_emergency=False,
            emergency_flags=[],
            guidance="Description is very brief. A clinician will review to confirm further details.",
            urgency_level="routine",
            triage_level="UNKNOWN",
            priority="P2_PRIORITY",
            reason_codes=["BRIEF_DESCRIPTION"],
            requires_human_review=True,
        )

    # 5. Routine / Lower Urgency (GREEN)
    return ScreeningResult(
        is_emergency=False,
        emergency_flags=[],
        guidance=None,
        urgency_level="routine",
        triage_level="GREEN",
        priority="P3_ROUTINE",
        reason_codes=["NON_URGENT_SYMPTOMS"],
        requires_human_review=True,
    )
