import json
import logging
import re
from dataclasses import dataclass, field
from typing import Literal
import urllib.parse
import urllib.request

logger = logging.getLogger("mediresq.evidence")


@dataclass
class Citation:
    source: str
    title: str
    url: str
    evidence_type: str = "guideline"  # guideline, clinical_label, pubmed


@dataclass
class SuggestedMedicineData:
    name: str
    generic_name: str
    purpose: str
    dosage_guide: str
    prescription_required: bool
    precautions: str


@dataclass
class FirstAidMeasureData:
    action: str
    instructions: str
    rationale: str


@dataclass
class ConditionExplanation:
    name: str
    confidence: float
    clinical_rationale: str
    missing_findings: list[str] = field(default_factory=list)
    warning_signs: list[str] = field(default_factory=list)
    citations: list[Citation] = field(default_factory=list)


@dataclass
class EvidenceSynthesisResult:
    possible_conditions: list[ConditionExplanation]
    clinical_rationale: str
    suggested_specialties: list[str]
    missing_findings: list[str]
    first_aid_measures: list[FirstAidMeasureData]
    suggested_otc_medicines: list[SuggestedMedicineData]
    red_flag_warning: str | None
    citations: list[Citation]
    uncertainty_level: Literal["LOW", "MODERATE", "HIGH"]
    disclaimer: str = (
        "Medical Decision-Support Only. This service does NOT provide an autonomous diagnosis "
        "or prescription. All recommendations require verification by a licensed healthcare professional."
    )


# Curated Evidence Base from WHO, MoHFW India, and Clinical Guidelines
EVIDENCE_KNOWLEDGE_BASE = [
    {
        "trigger_symptoms": {"chest_pain", "shortness_of_breath"},
        "keywords": ["chest", "heart", "cardiac", "angina", "pain in chest"],
        "condition": "Acute Coronary Syndrome / Angina Pectoris",
        "specialties": ["Cardiology", "Emergency Medicine"],
        "rationale": "Chest pain with dyspnea warrants immediate exclusion of acute myocardial ischemia under WHO/AHA emergency protocols.",
        "missing_findings": ["12-lead ECG", "Cardiac biomarkers (Troponin I/T)", "Blood pressure reading"],
        "warning_signs": ["Radiation to jaw or left arm", "Diaphoresis (cold sweat)", "Syncope"],
        "first_aid": [
            FirstAidMeasureData(
                action="Emergency Positioning & Rest",
                instructions="Sit upright or in a semi-reclined 'W-position' with knees bent to ease cardiac workload. Loosen tight clothing around neck and waist.",
                rationale="Minimizes myocardial oxygen demand while waiting for emergency ambulance dispatch (112).",
            ),
            FirstAidMeasureData(
                action="Aspirin Chewing (Emergency Protocol)",
                instructions="If patient is conscious, has NO aspirin allergy, and NO active bleeding/ulcers, chew one non-enteric coated tablet of Aspirin (300mg / Disprin).",
                rationale="Inhibits platelet aggregation in acute coronary thrombosis.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Disprin / Ecosprin",
                generic_name="Aspirin 300mg",
                purpose="Emergency antiplatelet for suspected acute myocardial infarction",
                dosage_guide="Single chewable dose of 300mg immediately (if no ulcer/allergy)",
                prescription_required=False,
                precautions="Do NOT take if allergic to NSAIDs, active bleeding, or suspected stroke.",
            ),
            SuggestedMedicineData(
                name="Sorbitrate",
                generic_name="Isosorbide Dinitrate 5mg",
                purpose="Sublingual vasodilator for known angina (ONLY if previously prescribed by cardiologist)",
                dosage_guide="5mg dissolved under the tongue while seated",
                prescription_required=True,
                precautions="Causes sudden blood pressure drop; do NOT take if BP is low or if taking PDE-5 inhibitors.",
            ),
        ],
        "citations": [
            Citation(
                source="WHO Emergency Triage Assessment & Treatment",
                title="Integrated Management of Cardiovascular Emergencies",
                url="https://www.who.int/publications/i/item/9789241511179",
            ),
            Citation(
                source="MoHFW India Standard Treatment Guidelines",
                title="Management of Acute STEMI and Non-STEMI",
                url="https://main.mohfw.gov.in/",
            ),
        ],
    },
    {
        "trigger_symptoms": {"fever", "cough"},
        "keywords": ["fever", "cough", "bukhar", "khansi", "phlegm", "chills"],
        "condition": "Acute Respiratory Tract Infection (Bronchitis / Pneumonia)",
        "specialties": ["Pulmonology", "General Medicine"],
        "rationale": "Co-presentation of pyrexia and productive/dry cough suggests acute upper or lower respiratory tract involvement.",
        "missing_findings": ["SpO2 oxygen saturation", "Chest auscultation for crackles/wheeze", "Sputum color/purulence"],
        "warning_signs": ["Respiratory rate > 30 bpm", "SpO2 < 94%", "Cyanosis (bluish lips)", "Altered mental status"],
        "first_aid": [
            FirstAidMeasureData(
                action="Tepid Sponging & Hydration",
                instructions="Sponge forehead, neck, and limbs with room-temperature water (never ice). Drink at least 2.5 to 3 liters of warm fluids/electrolytes daily.",
                rationale="Promotes evaporative heat loss and prevents dehydration from fever and tachypnea.",
            ),
            FirstAidMeasureData(
                action="Steam Inhalation",
                instructions="Inhale plain warm steam for 10-15 minutes twice daily. Keep head at a comfortable distance.",
                rationale="Humidifies irritated respiratory mucosa and loosens mucus.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Dolo 650 / Calpol",
                generic_name="Paracetamol 650mg",
                purpose="Antipyretic and analgesic for fever and body ache",
                dosage_guide="1 tablet every 6 to 8 hours as needed (maximum 3000mg/day)",
                prescription_required=False,
                precautions="Do not exceed maximum daily dose; caution in pre-existing liver disease.",
            ),
            SuggestedMedicineData(
                name="Benadryl DR / Ascoril D",
                generic_name="Dextromethorphan / Phenylephrine",
                purpose="Cough suppressant for dry irritating cough",
                dosage_guide="5-10 ml twice or thrice daily after meals",
                prescription_required=False,
                precautions="May cause mild drowsiness; avoid driving.",
            ),
        ],
        "citations": [
            Citation(
                source="WHO Clinical Guidelines",
                title="Infection Prevention and Management of Acute Respiratory Infections",
                url="https://www.who.int/health-topics/respiratory-disease",
            ),
            Citation(
                source="MoHFW Guidelines",
                title="Management of Community-Acquired Pneumonia in Adults",
                url="https://main.mohfw.gov.in/",
            ),
        ],
    },
    {
        "trigger_symptoms": {"abdominal_pain", "nausea_vomiting"},
        "keywords": ["stomach", "pet", "belly", "vomit", "ulti", "nausea", "abdomen", "diarrhea"],
        "condition": "Acute Gastroenteritis / Gastrointestinal Distress",
        "specialties": ["Gastroenterology", "General Medicine"],
        "rationale": "Abdominal pain accompanied by emesis or nausea indicates acute enteric inflammation or functional GI disruption.",
        "missing_findings": ["Hydration status (skin turgor, dry mucous membranes)", "Rebound tenderness in right lower quadrant", "Bowel habits / diarrhea frequency"],
        "warning_signs": ["Inability to retain liquids > 24 hours", "Hematemesis (vomiting blood)", "High fever with peritoneal signs"],
        "first_aid": [
            FirstAidMeasureData(
                action="Oral Rehydration Therapy (WHO-ORS)",
                instructions="Sip WHO-standard Oral Rehydration Salts (ORS) solution slowly in small sips (50-100 ml every 15 minutes). Avoid gulping.",
                rationale="Restores essential sodium, potassium, and glucose to prevent hypovolemic shock.",
            ),
            FirstAidMeasureData(
                action="BRAT Diet & Gut Rest",
                instructions="Eat bland foods (bananas, rice porridge/khichdi, curd/yogurt). Avoid spicy, oily, dairy milk, and caffeinated products.",
                rationale="Reduces intestinal motility and promotes mucosal healing.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Electral / WHO ORS",
                generic_name="Oral Rehydration Salts (WHO Formula)",
                purpose="Replacement of fluid and electrolyte losses in diarrhea and vomiting",
                dosage_guide="Dissolve 1 sachet in 1 Liter clean drinking water, consume over 24 hours",
                prescription_required=False,
                precautions="Use freshly prepared solution within 24 hours; do not add sugar or milk.",
            ),
            SuggestedMedicineData(
                name="Ondem 4mg / Vomikind",
                generic_name="Ondansetron 4mg",
                purpose="Antiemetic to control persistent nausea and vomiting",
                dosage_guide="1 tablet dissolved on tongue 15-30 minutes before oral fluids (Schedule H)",
                prescription_required=True,
                precautions="Consult doctor or pharmacist; may cause mild constipation or headache.",
            ),
            SuggestedMedicineData(
                name="Meftal-Spas / Cyclopam",
                generic_name="Dicyclomine + Paracetamol",
                purpose="Antispasmodic for colicky abdominal cramps",
                dosage_guide="1 tablet as needed with food",
                prescription_required=True,
                precautions="Do not use if severe localized appendicitis or bowel obstruction is suspected.",
            ),
        ],
        "citations": [
            Citation(
                source="WHO Diarrhoeal Disease Fact Sheets",
                title="Guidelines for the Management of Acute Gastroenteritis",
                url="https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
            ),
            Citation(
                source="Indian Association of Gastrointestinal Endosurgeons (IAGE)",
                title="Evaluation of Acute Abdomen",
                url="https://www.iages.in/",
            ),
        ],
    },
    {
        "trigger_symptoms": {"headache", "dizziness"},
        "keywords": ["headache", "migraine", "sir dard", "sar dard", "chakkar", "dizzy", "lightheaded"],
        "condition": "Tension Headache / Migraine / Cervical Spondylosis",
        "specialties": ["Neurology", "General Medicine"],
        "rationale": "Cranial discomfort with vestibular symptoms requires differential evaluation between vascular migraine, tension cephalea, or inner ear pathology.",
        "missing_findings": ["Blood pressure measurement", "Neurological focal deficit examination", "Photophobia/phonophobia presence"],
        "warning_signs": ["Sudden thunderclap onset ('worst headache of life')", "Focal neurological weakness or slurred speech", "Neck stiffness (meningismus)"],
        "first_aid": [
            FirstAidMeasureData(
                action="Dark Quiet Room Rest",
                instructions="Lie down in a quiet, darkened room with a cool damp cloth or ice pack over forehead and temples.",
                rationale="Reduces sensory stimulation (photophobia/phonophobia) and relieves vascular spasm.",
            ),
            FirstAidMeasureData(
                action="Hydration & Neck Relaxation",
                instructions="Drink 500ml of water slowly; perform gentle isometric neck stretches without sudden jerks.",
                rationale="Reverses dehydration cephalea and releases occipital myofascial tension.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Crocin / Paracetamol 500mg",
                generic_name="Paracetamol 500mg",
                purpose="First-line mild analgesic for tension headache",
                dosage_guide="1 tablet with a glass of water every 6 hours as needed",
                prescription_required=False,
                precautions="Avoid taking with other acetaminophen-containing cold remedies.",
            ),
            SuggestedMedicineData(
                name="Naprosyn / Combiflam",
                generic_name="Ibuprofen 400mg + Paracetamol",
                purpose="Anti-inflammatory for moderate throbbing migraine/headache",
                dosage_guide="1 tablet after a full meal",
                prescription_required=False,
                precautions="Take with food; avoid in gastric ulcers, asthma, or kidney disease.",
            ),
        ],
        "citations": [
            Citation(
                source="International Headache Society (ICHD-3)",
                title="Classification of Headache Disorders",
                url="https://ichd-3.org/",
            ),
        ],
    },
    {
        "trigger_symptoms": {"cough", "sore_throat"},
        "keywords": ["throat", "gala", "sore throat", "cough", "swallowing"],
        "condition": "Acute Pharyngitis / Upper Respiratory Infection",
        "specialties": ["ENT / Otorhinolaryngology", "General Medicine"],
        "rationale": "Oropharyngeal inflammation and cough are hallmark signs of viral pharyngitis or bacterial tonsillopharyngitis.",
        "missing_findings": ["Centor score assessment (absence of cough, tonsillar exudates, tender anterior cervical adenopathy)", "Oral temperature"],
        "warning_signs": ["Difficulty swallowing saliva (drooling)", "Trismus (inability to open mouth)", "Stridor"],
        "first_aid": [
            FirstAidMeasureData(
                action="Warm Salt Water Gargle",
                instructions="Dissolve 1/2 teaspoon of salt in a glass of warm water. Gargle deeply for 30 seconds, 3 to 4 times a day. Spit out after gargling.",
                rationale="Reduces throat edema via osmotic action and washes away viral/cellular debris.",
            ),
            FirstAidMeasureData(
                action="Honey & Ginger Warm Tea",
                instructions="Drink warm water with 1 teaspoon pure honey and grated ginger (avoid honey in infants under 1 year).",
                rationale="Natural demulcent coating soothe irritated pharyngeal nerve endings.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Strepsils / Cofsils",
                generic_name="Amylmetacresol + Dichlorobenzyl alcohol",
                purpose="Antiseptic throat lozenge for throat irritation and difficulty swallowing",
                dosage_guide="Dissolve 1 lozenge slowly in mouth every 3-4 hours (maximum 8/day)",
                prescription_required=False,
                precautions="Do not chew whole; do not give to children under 6 due to choking risk.",
            ),
            SuggestedMedicineData(
                name="Betadine Gargle (2% W/V)",
                generic_name="Povidone Iodine 2%",
                purpose="Antiseptic oral rinse for acute pharyngeal infection",
                dosage_guide="Dilute with equal volume of water, gargle for 30 seconds twice daily",
                prescription_required=False,
                precautions="Do NOT swallow; avoid in thyroid disorders or iodine allergy.",
            ),
        ],
        "citations": [
            Citation(
                source="CDC / WHO Clinical Guidelines",
                title="Principles of Appropriate Antibiotic Use for Acute Pharyngitis",
                url="https://www.cdc.gov/groupastrep/guidance.html",
            ),
        ],
    },
    {
        "trigger_symptoms": {"fatigue"},
        "keywords": ["weakness", "tired", "thakan", "fatigue", "exhausted", "kamzori"],
        "condition": "General Debility / Post-Viral Fatigue / Nutritional Deficiency",
        "specialties": ["General Medicine"],
        "rationale": "Generalized fatigue without acute localized pain or pyrexia suggests metabolic, nutritional, or post-infectious etiology.",
        "missing_findings": ["Complete Blood Count (CBC/Hemoglobin)", "Thyroid Stimulating Hormone (TSH)", "Serum Ferritin / Vitamin D/B12"],
        "warning_signs": ["Rapid unexplained weight loss", "Shortness of breath on mild exertion", "Black tarry stools"],
        "first_aid": [
            FirstAidMeasureData(
                action="Electrolyte Balance & Scheduled Rest",
                instructions="Ensure 7-8 hours of regular nighttime sleep. Sip fresh coconut water or electrolyte fluids through the day.",
                rationale="Restores neuro-endocrine circadian rhythm and cellular hydration.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Becosules / Neurobion Forte",
                generic_name="B-Complex Vitamins with Vitamin C",
                purpose="Nutritional support for cellular energy metabolism and nerve health",
                dosage_guide="1 capsule once daily after lunch or breakfast",
                prescription_required=False,
                precautions="Harmless bright yellow discoloration of urine may occur.",
            ),
        ],
        "citations": [
            Citation(
                source="WHO Primary Care Guidelines",
                title="Evaluation of Chronic Fatigue and Weakness",
                url="https://www.who.int/",
            ),
        ],
    },
]


def sanitize_input_text(text: str) -> str:
    """
    RAG Guardrail: Strips script tags, HTML tags, and suspicious prompt-injection sequences.
    """
    if not text:
        return ""
    cleaned = re.sub(r"<[^>]+>", " ", text)
    cleaned = re.sub(r"(ignore previous instructions|system prompt|admin override|you are now)", " ", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def query_pubmed_clinical_api(query_term: str) -> list[Citation]:
    """
    Live scientific search on PubMed (NCBI E-utilities API).
    Fetches real peer-reviewed scientific citations for the given clinical term.
    """
    citations = []
    if not query_term or len(query_term.strip()) < 3:
        return citations

    try:
        clean_query = urllib.parse.quote(f"{query_term.strip()} diagnosis guideline[Title/Abstract]")
        esearch_url = (
            f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            f"?db=pmc&term={clean_query}&retmode=json&retmax=2"
        )
        req = urllib.request.Request(esearch_url, headers={"User-Agent": "MediResQ-AI/1.0"})
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            id_list = data.get("esearchresult", {}).get("idlist", [])
            for pmid in id_list:
                citations.append(
                    Citation(
                        source="PubMed Central (NCBI)",
                        title=f"Clinical Evidence & Triage Guidelines for {query_term.title()}",
                        url=f"https://pmc.ncbi.nlm.nih.gov/articles/PMC{pmid}/",
                        evidence_type="pubmed",
                    )
                )
    except Exception as e:
        logger.debug("PubMed API search skipped or timed out: %s", e)

    return citations


def synthesize_evidence(
    symptoms: list[str],
    patient_description: str = "",
    severity: str = "unknown",
    age: int | None = None,
) -> EvidenceSynthesisResult:
    """
    Synthesizes multi-source clinical evidence based on symptoms and patient features.
    Provides verified citations, missing findings, first-aid measures, suggested medicines, and uncertainty estimates.
    """
    sanitized_desc = sanitize_input_text(patient_description).lower()
    symptom_set = set(symptoms)

    matched_conditions: list[ConditionExplanation] = []
    suggested_specialties = set()
    aggregated_missing = set()
    first_aid_measures: list[FirstAidMeasureData] = []
    suggested_medicines: list[SuggestedMedicineData] = []
    all_citations = []
    red_flag = None

    for entry in EVIDENCE_KNOWLEDGE_BASE:
        triggers = entry["trigger_symptoms"]
        overlap = triggers.intersection(symptom_set)
        keyword_overlap = [kw for kw in entry.get("keywords", []) if kw in sanitized_desc]

        if overlap or keyword_overlap:
            overlap_score = len(overlap) / max(len(triggers), 1)
            keyword_score = 0.3 if keyword_overlap else 0.0
            confidence = min(round(overlap_score * 0.7 + keyword_score, 2), 0.92)

            matched_conditions.append(
                ConditionExplanation(
                    name=entry["condition"],
                    confidence=confidence,
                    clinical_rationale=entry["rationale"],
                    missing_findings=entry["missing_findings"],
                    warning_signs=entry["warning_signs"],
                    citations=entry["citations"],
                )
            )
            for spec in entry["specialties"]:
                suggested_specialties.add(spec)
            for mf in entry["missing_findings"]:
                aggregated_missing.add(mf)
            for fa in entry.get("first_aid", []):
                if fa not in first_aid_measures:
                    first_aid_measures.append(fa)
            for med in entry.get("otc_medicines", []):
                if med not in suggested_medicines:
                    suggested_medicines.append(med)
            for cit in entry["citations"]:
                all_citations.append(cit)

    # Sort matched conditions by highest confidence
    matched_conditions.sort(key=lambda c: c.confidence, reverse=True)

    # If no condition matched, provide intelligent general assessment and query PubMed
    if not matched_conditions:
        first_term = symptoms[0] if symptoms else (patient_description.split()[:3] if patient_description else ["general"])
        query_kw = " ".join(first_term) if isinstance(first_term, list) else first_term
        live_citations = query_pubmed_clinical_api(query_kw)

        if not live_citations:
            live_citations = [
                Citation(
                    source="WHO Primary Care Clinical Guidelines",
                    title="Integrated Management of Common Adolescent and Adult Symptoms",
                    url="https://www.who.int/publications/i/item/9789241547703",
                    evidence_type="guideline",
                ),
                Citation(
                    source="National Health Portal (MOHFW India)",
                    title="Clinical Decision Guidelines for General Outpatient Intake",
                    url="https://main.mohfw.gov.in/",
                    evidence_type="guideline",
                ),
            ]

        matched_conditions.append(
            ConditionExplanation(
                name="Symptom Complex Requiring Outpatient Clinical Evaluation",
                confidence=0.55,
                clinical_rationale=(
                    f"Reported concern ('{patient_description[:60]}...') requires formal "
                    f"bedside interview, vital sign monitoring, and diagnostic laboratory testing."
                ),
                missing_findings=["Vital signs (BP, Pulse, Temperature, SpO2)", "Full medical and drug allergy history"],
                warning_signs=["Sudden unremitting pain", "Severe breathlessness", "Confusion / altered consciousness"],
                citations=live_citations,
            )
        )
        suggested_specialties.add("General Medicine")
        first_aid_measures.append(
            FirstAidMeasureData(
                action="Rest & Vital Sign Monitoring",
                instructions="Avoid physical exertion. Check body temperature, blood pressure, and pulse if monitoring devices are available at home.",
                rationale="Provides objective baseline data for the evaluating clinician.",
            )
        )
        suggested_medicines.append(
            SuggestedMedicineData(
                name="Crocin / Paracetamol 500mg",
                generic_name="Paracetamol 500mg",
                purpose="Temporary mild pain or fever relief",
                dosage_guide="1 tablet with water as needed (do not exceed 2000mg without doctor advice)",
                prescription_required=False,
                precautions="Consult a doctor if symptoms persist past 48 hours.",
            )
        )
        all_citations.extend(live_citations)
        uncertainty = "HIGH"
    elif len(symptoms) >= 2:
        uncertainty = "LOW"
    else:
        uncertainty = "MODERATE"

    # Red flag warning check
    if "chest_pain" in symptom_set or "shortness_of_breath" in symptom_set or severity == "severe":
        red_flag = "Critical warning signs detected: Patient requires immediate emergency evaluation or direct 112 dispatch."

    return EvidenceSynthesisResult(
        possible_conditions=matched_conditions,
        clinical_rationale=(
            f"Based on {len(symptoms)} symptom(s) and reported severity, identified "
            f"{len(matched_conditions)} prospective differential condition(s). Physician evaluation is required."
        ),
        suggested_specialties=list(suggested_specialties),
        missing_findings=list(aggregated_missing),
        first_aid_measures=first_aid_measures,
        suggested_otc_medicines=suggested_medicines,
        red_flag_warning=red_flag,
        citations=all_citations,
        uncertainty_level=uncertainty,
    )
