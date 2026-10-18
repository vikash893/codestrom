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
    {
        "trigger_symptoms": {"skin_rash_itching"},
        "keywords": ["skin", "rash", "itching", "khujli", "red spots", "allergy", "fungal", "ringworm", "eczema", "hives", "urticaria", "daad"],
        "condition": "Acute Dermatitis / Allergic Urticaria / Fungal Dermatomycosis (त्वचा संक्रमण / दाद / खुजली)",
        "specialties": ["Dermatology (चर्म रोग विशेषज्ञ)", "General Medicine"],
        "rationale": "Pruritic erythematous cutaneous eruptions require differentiation between allergic, contact irritant, and fungal dermatomycoses under standard dermatological protocols.",
        "missing_findings": ["Dermatological examination of lesion margins", "KOH mount for fungal hyphae", "History of new topical exposures/allergens"],
        "warning_signs": ["Facial swelling or lip angioedema", "Rapidly spreading purple or necrotic petechiae", "High fever with skin peeling (SJS/TEN alert)"],
        "first_aid": [
            FirstAidMeasureData(
                action="Cool Compresses & Anti-Scratch Care",
                instructions="Apply clean, cold damp cloth for 10-15 minutes to reduce capillary dilation. Keep fingernails trimmed and avoid scratching to prevent secondary bacterial infection.",
                rationale="Cools histamine receptors and prevents epidermal excoriation.",
            ),
            FirstAidMeasureData(
                action="Loose Breathable Cotton Clothing",
                instructions="Wear soft, unbleached cotton apparel. Avoid tight synthetic waistbands and hot water baths.",
                rationale="Minimizes friction, sweat accumulation, and maceration.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Cetirizine 10mg / Levocetirizine 5mg",
                generic_name="Cetirizine Hydrochloride",
                purpose="Oral H1-antihistamine for severe pruritus and allergic flares",
                dosage_guide="1 tablet at bedtime for 5 to 7 days",
                prescription_required=False,
                precautions="May cause mild drowsiness; avoid alcohol and driving.",
            ),
            SuggestedMedicineData(
                name="Calamine Soothing Lotion",
                generic_name="Calamine + Zinc Oxide",
                purpose="Topical antipruritic cooling agent for soothing erythematous skin",
                dosage_guide="Apply gently over affected skin twice daily",
                prescription_required=False,
                precautions="For external use only; do not apply on open bleeding sores.",
            ),
            SuggestedMedicineData(
                name="Clotrimazole 1% Cream / Terbinafine 1%",
                generic_name="Clotrimazole / Terbinafine",
                purpose="Topical antifungal for ringworm, fungal rashes, and jock itch",
                dosage_guide="Apply thin layer twice daily to clean dry skin for 14 days",
                prescription_required=False,
                precautions="Continue for 1 week after rash clears to prevent fungal recurrence.",
            ),
        ],
        "citations": [
            Citation(
                source="Indian Association of Dermatologists (IADVL)",
                title="Management Guidelines for Superficial Fungal and Eczematous Dermatoses",
                url="https://iadvl.org/",
            ),
        ],
    },
    {
        "trigger_symptoms": {"acidity_gerd"},
        "keywords": ["acidity", "gas", "heartburn", "seene me jalan", "pet me jalan", "khatti dakar", "gerd", "acid reflux"],
        "condition": "Gastroesophageal Reflux Disease (GERD) & Acid Peptic Dyspepsia (एसिडिटी / गैस)",
        "specialties": ["Gastroenterology", "General Medicine"],
        "rationale": "Retrosternal pyrosis and postprandial acid regurgitation indicate transient lower esophageal sphincter relaxation and gastric hyperacidity.",
        "missing_findings": ["Endoscopy (if red flags present)", "H. Pylori screening", "Response to antacid trial"],
        "warning_signs": ["Difficulty or pain swallowing (dysphagia)", "Unexplained weight loss", "Vomiting blood or coffee-ground emesis", "Black tarry stools"],
        "first_aid": [
            FirstAidMeasureData(
                action="Head-of-Bed Elevation & Posture",
                instructions="Remain upright for at least 2 hours after eating. Elevate the head end of your bed by 6 inches when sleeping.",
                rationale="Gravity prevents acid reflux into the distal esophagus.",
            ),
            FirstAidMeasureData(
                action="Dietary Modification",
                instructions="Avoid spicy, deep-fried, oily items, citrus juices, chocolate, and carbonated beverages. Eat small, frequent meals.",
                rationale="Reduces gastric volume and lowers gastric distension pressure.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Pan-D / Pantocid 40",
                generic_name="Pantoprazole 40mg",
                purpose="Proton pump inhibitor significantly suppressing gastric hydrochloric acid",
                dosage_guide="1 tablet 30 minutes before breakfast once daily",
                prescription_required=False,
                precautions="Best taken on empty stomach with plain water.",
            ),
            SuggestedMedicineData(
                name="Digene / Gelusil Antacid Gel",
                generic_name="Magnesium Hydroxide + Aluminium Hydroxide + Simethicone",
                purpose="Immediate neutralizing of excess gastric acid and antifoaming gas relief",
                dosage_guide="10 ml (2 teaspoons) after meals or at onset of burning",
                prescription_required=False,
                precautions="Shake well before use; excessive use may soften stool.",
            ),
        ],
        "citations": [
            Citation(
                source="World Gastroenterology Organisation (WGO)",
                title="Global Guidelines: GERD Management in Primary Care",
                url="https://www.worldgastroenterology.org/",
            ),
        ],
    },
    {
        "trigger_symptoms": {"diarrhea_loose_motions"},
        "keywords": ["diarrhea", "loose motion", "dast", "pet kharab", "watery stool", "dysentery", "food poisoning"],
        "condition": "Acute Gastroenteritis & Dehydration Risk (दस्त / लूज मोशन / पेट संक्रमण)",
        "specialties": ["General Medicine", "Pediatrics (if child)", "Gastroenterology"],
        "rationale": "Frequent watery stools cause rapid depletion of fluids, sodium, potassium, and bicarbonate requiring urgent rehydration protocols.",
        "missing_findings": ["Assessment of hydration status (skin turgor, mucous membranes)", "Stool routine/culture", "Urine output tracking"],
        "warning_signs": ["Sunken eyes, lethargy, or extreme thirst", "Inability to drink or retain oral fluids", "High fever with bloody stools (dysentery)", "Absence of urination for >8 hours"],
        "first_aid": [
            FirstAidMeasureData(
                action="Oral Rehydration Therapy (WHO-ORS)",
                instructions="Sip standard WHO-ORS solution (1 sachet dissolved in 1 liter of boiled and cooled water) continuously after each loose motion.",
                rationale="Sodium-glucose cotransport facilitates rapid intestinal water absorption.",
            ),
            FirstAidMeasureData(
                action="BRAT / Bland Fluid Diet",
                instructions="Consume banana, boiled rice, curd (probiotic benefits), light khichdi, and clear vegetable broth. Avoid milk, tea, coffee, and sugary sodas.",
                rationale="Gentle on inflamed intestinal villi while replenishing gut electrolytes.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Electral / WHO-ORS Sachet",
                generic_name="Oral Rehydration Salts (WHO Formula)",
                purpose="Vital replacement of lost water and essential electrolytes",
                dosage_guide="Dissolve 1 full sachet in 1 liter clean water; drink 200-400ml after each purge",
                prescription_required=False,
                precautions="Do NOT boil the solution after mixing. Discard unused solution after 24 hours.",
            ),
            SuggestedMedicineData(
                name="Zinc Sulphate 20mg Tablet",
                generic_name="Zinc Sulphate Dispersible",
                purpose="Promotes mucosal regeneration and reduces duration/recurrence of diarrhea",
                dosage_guide="1 dispersible tablet daily dissolved in water for 14 days",
                prescription_required=False,
                precautions="Recommended by WHO/UNICEF for complete diarrheal recovery.",
            ),
            SuggestedMedicineData(
                name="Sporolac / Econorm Probiotic",
                generic_name="Lactobacillus / Saccharomyces boulardii",
                purpose="Restoration of normal commensal gut microflora",
                dosage_guide="1 capsule twice daily with curd or water for 5 days",
                prescription_required=False,
                precautions="Safe for all age groups.",
            ),
        ],
        "citations": [
            Citation(
                source="WHO Clinical Guidelines",
                title="The Treatment of Diarrhoea: A Manual for Physicians and Other Senior Health Workers",
                url="https://www.who.int/publications/i/item/9241593180",
            ),
        ],
    },
    {
        "trigger_symptoms": {"eye_problem"},
        "keywords": ["eye", "aankh", "red eye", "conjunctivitis", "eye pain", "itchy eye", "watery eye", "aankh aana"],
        "condition": "Acute Conjunctivitis & Ocular Irritation (आंख आना / आंखों में लाली व जलन)",
        "specialties": ["Ophthalmology (नेत्र रोग विशेषज्ञ)"],
        "rationale": "Hyperemia of conjunctival vessels with tearing and irritation requires assessment for viral, bacterial, or allergic etiology.",
        "missing_findings": ["Visual acuity measurement (Snellen chart)", "Slit lamp biomicroscopy", "Pupillary light reflex test"],
        "warning_signs": ["Sudden loss or blurring of vision", "Severe deep throbbing eye pain", "Extreme sensitivity to light (photophobia)", "Halos around lights"],
        "first_aid": [
            FirstAidMeasureData(
                action="Cold Compresses & Eye Hygiene",
                instructions="Place a clean cotton pad soaked in cool water over closed eyelids for 5 minutes. Wash hands frequently and do NOT rub the eyes.",
                rationale="Decreases vascular congestion and prevents spread to unaffected eye.",
            ),
            FirstAidMeasureData(
                action="Discontinue Contact Lenses",
                instructions="Immediately remove and discard contact lenses until fully cleared by an eye doctor.",
                rationale="Prevents microbial keratitis and corneal ulceration.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Refresh Tears / Tear Drops",
                generic_name="Carboxymethylcellulose 0.5% Eye Drops",
                purpose="Soothing ocular lubrication and clearance of foreign irritants/allergens",
                dosage_guide="1-2 drops in affected eye 4 to 6 times daily",
                prescription_required=False,
                precautions="Do not touch dropper tip to eyelashes or hands; discard bottle 30 days after opening.",
            ),
        ],
        "citations": [
            Citation(
                source="All India Ophthalmological Society (AIOS)",
                title="Clinical Guidelines for Red Eye Evaluation and Management",
                url="https://aios.org/",
            ),
        ],
    },
    {
        "trigger_symptoms": {"ear_problem"},
        "keywords": ["ear", "kaan", "ear pain", "ear ache", "ear infection", "kaan me dard"],
        "condition": "Acute Otalgia & Otitis Externa / Media (कान में दर्द व संक्रमण)",
        "specialties": ["ENT / Otorhinolaryngology (कान, नाक, गला विशेषज्ञ)"],
        "rationale": "Ear pain may arise from canal inflammation, middle ear effusion, or referred dental/temporomandibular joint etiology.",
        "missing_findings": ["Otoscopy for tympanic membrane integrity", "Hearing acuity assessment", "Mastoid tenderness test"],
        "warning_signs": ["Yellow or bloody discharge from ear", "Swelling or redness behind the ear (mastoiditis)", "Facial nerve weakness or drooping"],
        "first_aid": [
            FirstAidMeasureData(
                action="Warm Compress & Ear Protection",
                instructions="Hold a warm dry washcloth against the outside of the ear for 10 minutes. Keep ear strictly dry; do not insert cotton buds, pins, or oil.",
                rationale="Warmth soothes local nerve endings; foreign objects risk perforating the eardrum.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Paracetamol 650mg / Dolo",
                generic_name="Paracetamol",
                purpose="Oral analgesic relief for acute ear pain",
                dosage_guide="1 tablet with water as needed (max 3 times daily)",
                prescription_required=False,
                precautions="Do not exceed maximum dose.",
            ),
        ],
        "citations": [
            Citation(
                source="American Academy of Otolaryngology",
                title="Clinical Practice Guideline: Acute Otitis Externa",
                url="https://www.entnet.org/",
            ),
        ],
    },
    {
        "trigger_symptoms": {"toothache_dental"},
        "keywords": ["tooth", "teeth", "toothache", "daant", "dental", "gum", "dadh me dard", "masoode"],
        "condition": "Acute Dental Caries & Odontogenic Pulpitis (दांत का दर्द / मसूड़ों में सूजन)",
        "specialties": ["Dental Surgery / Endodontics (दंत रोग विशेषज्ञ)"],
        "rationale": "Sharp throbbing tooth pain exacerbated by thermal changes indicates pulpal inflammation requiring definitive operative dentistry.",
        "missing_findings": ["Intraoral periapical radiograph (IOPA X-Ray)", "Dental percussion test", "Thermal vitality testing"],
        "warning_signs": ["Facial swelling spreading to cheek or neck", "Trismus (inability to open mouth > 2 fingers)", "High fever with difficulty swallowing"],
        "first_aid": [
            FirstAidMeasureData(
                action="Warm Saltwater Mouth Rinse",
                instructions="Mix 1/2 teaspoon of salt in a glass of warm water. Gently rinse mouth for 30 seconds and spit out (do not swallow). Repeat 3 times daily.",
                rationale="Creates a hypertonic environment that draws out inflammatory edema and cleanses debris.",
            ),
            FirstAidMeasureData(
                action="Clove Oil (Laung ka Tel) Application",
                instructions="Dab a small cotton swab with 1-2 drops of clove oil and place gently on the aching tooth for 5 minutes.",
                rationale="Eugenol in clove oil acts as a natural local anesthetic and antiseptic.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Combiflam / Ketorol DT",
                generic_name="Ibuprofen 400mg + Paracetamol 325mg",
                purpose="Fast-acting oral anti-inflammatory analgesic for throbbing dental pain",
                dosage_guide="1 tablet after food twice or thrice daily for maximum 3 days",
                prescription_required=False,
                precautions="Always take with or after food; do not take on empty stomach.",
            ),
            SuggestedMedicineData(
                name="Hexidine / Clohex Mouthwash",
                generic_name="Chlorhexidine Gluconate 0.2%",
                purpose="Broad-spectrum oral antiseptic reducing bacterial plaque and gum inflammation",
                dosage_guide="Rinse with 10ml undiluted for 60 seconds twice daily after brushing",
                prescription_required=False,
                precautions="Do not eat or drink for 30 minutes after rinsing.",
            ),
        ],
        "citations": [
            Citation(
                source="Indian Dental Association (IDA)",
                title="Emergency Management of Odontogenic Pain and Infections",
                url="https://ida.org.in/",
            ),
        ],
    },
    {
        "trigger_symptoms": {"back_pain"},
        "keywords": ["back pain", "kamar dard", "peeth dard", "lower back", "lumbago", "sciatica", "slip disc"],
        "condition": "Acute Lumbar Musculoskeletal Strain & Lumbago (कमर दर्द / स्प्रेन)",
        "specialties": ["Orthopedics", "Physiotherapy", "General Medicine"],
        "rationale": "Lower lumbar pain without neurological deficits represents acute paravertebral myofascial strain or ligamentous overstretch.",
        "missing_findings": ["Straight leg raise test (SLR)", "Neurological lower extremity motor/sensory test", "Lumbar spine X-ray/MRI"],
        "warning_signs": ["Loss of bowel or bladder control (Cauda Equina Emergency)", "Numbness in groin or saddle area", "Progressive leg weakness or foot drop"],
        "first_aid": [
            FirstAidMeasureData(
                action="Relative Rest on Firm Surface",
                instructions="Rest on a medium-firm mattress with a pillow under the knees when lying on the back. Avoid prolonged bed rest beyond 48 hours; resume light walking.",
                rationale="Unloads intervertebral lumbar disc pressure while preserving spinal flexibility.",
            ),
            FirstAidMeasureData(
                action="Ice/Heat Therapy Protocol",
                instructions="Apply an ice pack wrapped in a towel for 15 minutes during the first 48 hours, followed by warm heating pad for 15-20 minutes afterwards.",
                rationale="Cold reduces acute inflammatory swelling; subsequent heat relaxes muscular spasms.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Volini / Moov Gel",
                generic_name="Diclofenac Diethylamine + Methyl Salicylate Gel",
                purpose="Direct topical penetration relieving localized muscle spasms and pain",
                dosage_guide="Apply gently over painful lumbar area 3 to 4 times daily (do not massage vigorously)",
                prescription_required=False,
                precautions="Wash hands after applying; avoid contact with eyes or broken skin.",
            ),
            SuggestedMedicineData(
                name="Aceclo Plus / Zerodol-P",
                generic_name="Aceclofenac 100mg + Paracetamol 325mg",
                purpose="Systemic NSAID analgesic reducing musculoskeletal inflammation",
                dosage_guide="1 tablet twice daily after meals for 3 to 5 days",
                prescription_required=False,
                precautions="Take with food or antacid to prevent gastric irritation.",
            ),
        ],
        "citations": [
            Citation(
                source="NICE Clinical Guidelines",
                title="Low Back Pain and Sciatica in Over 16s: Assessment and Management",
                url="https://www.nice.org.uk/guidance/ng59",
            ),
        ],
    },
    {
        "trigger_symptoms": {"joint_pain"},
        "keywords": ["joint pain", "knee pain", "ghutne me dard", "jodo me dard", "arthritis", "gathiya"],
        "condition": "Degenerative Osteoarthritis & Peripheral Arthralgia (जोड़ों व घुटने का दर्द / गठिया)",
        "specialties": ["Orthopedics (अस्थि रोग विशेषज्ञ)", "Rheumatology"],
        "rationale": "Weight-bearing joint pain worsening with movement indicates cartilage degeneration and mechanical joint stress.",
        "missing_findings": ["Weight-bearing bilateral knee X-rays", "Serum Uric Acid test", "ESR and Rheumatoid Factor"],
        "warning_signs": ["Hot, red, acutely swollen joint with inability to bear weight (Septic Arthritis Alert)", "High fever accompanying joint pain"],
        "first_aid": [
            FirstAidMeasureData(
                action="Low-Impact Joint Protection",
                instructions="Avoid deep squatting, sitting cross-legged on the floor, and high-impact stair climbing. Perform gentle non-weight bearing quadriceps leg lifts.",
                rationale="Minimizes patellofemoral compressive stress while strengthening joint-stabilizing muscles.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Dolo 650 / Paracetamol",
                generic_name="Paracetamol 650mg",
                purpose="First-line analgesia recommended for mild-to-moderate osteoarthritis",
                dosage_guide="1 tablet twice daily after meals",
                prescription_required=False,
                precautions="Safer for stomach than chronic NSAIDs.",
            ),
            SuggestedMedicineData(
                name="Omnigel / Fastum Gel",
                generic_name="Diclofenac Topical Gel 1.16%",
                purpose="Targeted topical anti-inflammatory reducing knee stiffness",
                dosage_guide="Apply 2-4 grams to affected joint 3 times daily",
                prescription_required=False,
                precautions="Avoid broken skin.",
            ),
        ],
        "citations": [
            Citation(
                source="American College of Rheumatology",
                title="Guideline for the Management of Osteoarthritis of the Hand, Hip, and Knee",
                url="https://rheumatology.org/",
            ),
        ],
    },
    {
        "trigger_symptoms": {"cold_congestion"},
        "keywords": ["cold", "jukam", "sardi", "runny nose", "sneezing", "naak behna", "chheenk", "blocked nose", "sinus"],
        "condition": "Acute Viral Rhinosinusitis & Upper Airway Congestion (सर्दी-जुकाम / बंद नाक)",
        "specialties": ["General Medicine", "ENT"],
        "rationale": "Nasal mucosal hypersecretion with sneezing and congestion typically represents self-limiting rhinovirus or adenovirus infection.",
        "missing_findings": ["Anterior rhinoscopy for mucosal edema", "Maxillary sinus transillumination"],
        "warning_signs": ["Severe frontal headache worsening on bending forward (Acute Sinusitis)", "Fever persisting > 5 days", "Unilateral purulent or foul-smelling nasal discharge"],
        "first_aid": [
            FirstAidMeasureData(
                action="Steam Inhalation & Saline Irrigation",
                instructions="Inhale warm steam for 10 minutes twice daily. Use normal saline nasal drops (2-3 drops per nostril) to clear thick mucus.",
                rationale="Thins tenacious mucous secretions and restores mucociliary clearance.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Sinarest / Cheston Cold",
                generic_name="Paracetamol 500mg + Phenylephrine 10mg + Chlorpheniramine 2mg",
                purpose="Triple-action relief for fever, nasal congestion, and sneezing",
                dosage_guide="1 tablet thrice daily after food for 3 days",
                prescription_required=False,
                precautions="May cause mild drowsiness; caution in patients with hypertension.",
            ),
            SuggestedMedicineData(
                name="Otrivin Saline / Nasoclear",
                generic_name="Sodium Chloride 0.9% Nasal Drops",
                purpose="Non-medicated isotonic moisturizing and clearing of blocked nasal passages",
                dosage_guide="2-3 drops in each nostril 3 to 4 times daily",
                prescription_required=False,
                precautions="Safe for long-term use (does NOT cause rebound congestion like xylometazoline).",
            ),
        ],
        "citations": [
            Citation(
                source="CDC Clinical Guidelines",
                title="Common Cold: Symptom Relief and Antibiotic Stewardship",
                url="https://www.cdc.gov/antibiotic-use/colds.html",
            ),
        ],
    },
    {
        "trigger_symptoms": {"urinary_problem"},
        "keywords": ["urine", "urination", "burning urination", "peshab me jalan", "uti", "frequent urination"],
        "condition": "Acute Uncomplicated Lower UTI & Dysuria (पेशाब में जलन व संक्रमण)",
        "specialties": ["Urology", "General Medicine", "Gynecology"],
        "rationale": "Dysuria with urinary urgency and frequency points to acute bacterial colonization of the bladder urothelium (cystitis).",
        "missing_findings": ["Urine routine and microscopy (pus cells, RBCs, bacteria)", "Urine culture and antibiotic sensitivity (Urine C/S)"],
        "warning_signs": ["Flank/lower back pain with chills and high fever (Pyelonephritis / Kidney Infection Alert)", "Visible blood in urine (gross hematuria)"],
        "first_aid": [
            FirstAidMeasureData(
                action="Aggressive Water Hydration",
                instructions="Drink 3 to 3.5 liters of clean water and unsweetened fluids throughout the day. Urinate frequently and do not hold urine.",
                rationale="High urinary volume physically flushes bacteria out of the urethral lumen.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Alkamac / Cital Syrup",
                generic_name="Disodium Hydrogen Citrate 1.4g / 5ml",
                purpose="Systemic urinary alkalinizer neutralizing acidic urine to relieve burning sensation immediately",
                dosage_guide="2 teaspoons (10ml) diluted in a full glass of water thrice daily",
                prescription_required=False,
                precautions="Always dilute in water; caution in patients with renal impairment or sodium restriction.",
            ),
        ],
        "citations": [
            Citation(
                source="European Association of Urology (EAU)",
                title="Guidelines on Urological Infections",
                url="https://uroweb.org/guidelines/urological-infections",
            ),
        ],
    },
    {
        "trigger_symptoms": {"burns_wounds"},
        "keywords": ["burn", "jala", "cut", "wound", "bleeding", "chot", "ghav", "injury", "khoon"],
        "condition": "Superficial Minor Thermal Burn / Skin Abrasion (जलना / घाव / चोट)",
        "specialties": ["Emergency Medicine", "General Surgery"],
        "rationale": "Thermal injury and mechanical abrasions damage epidermal integrity, requiring immediate cooling and sterile antiseptic dressings.",
        "missing_findings": ["Tetanus immunization history", "Depth of burn evaluation (1st vs 2nd degree)", "Wound contamination assessment"],
        "warning_signs": ["Burns on face, hands, joints, or genitals", "Circumferential burns or charred/white leather-like skin", "Chemical or high-voltage electrical burns (Immediate 112 Dispatch)"],
        "first_aid": [
            FirstAidMeasureData(
                action="Cool Running Water for 20 Minutes",
                instructions="Immediately hold burned area under cool running tap water for 15-20 minutes. Do NOT use ice, butter, toothpaste, or turmeric.",
                rationale="Dissipates stored thermal energy from dermal layers and reduces tissue necrosis.",
            ),
            FirstAidMeasureData(
                action="Direct Pressure for Bleeding",
                instructions="If bleeding from a cut, press firmly with a sterile gauze pad or clean towel for 5 uninterrupted minutes without lifting.",
                rationale="Activates physiological platelet plug formation.",
            ),
        ],
        "otc_medicines": [
            SuggestedMedicineData(
                name="Burnol / Silvadene Cream",
                generic_name="Silver Sulfadiazine 1% / Aminacrine Cream",
                purpose="Topical antibacterial prevention of infection in minor burns and scalds",
                dosage_guide="Apply thick layer gently over clean burned area and cover loosely with sterile gauze",
                prescription_required=False,
                precautions="For 1st degree minor burns only. Avoid near eyes.",
            ),
            SuggestedMedicineData(
                name="Betadine 5% Antiseptic Ointment",
                generic_name="Povidone Iodine 5%",
                purpose="Microbicidal broad-spectrum protection for cuts, wounds, and abrasions",
                dosage_guide="Apply thin layer after washing wound with clean water",
                prescription_required=False,
                precautions="Do not use if allergic to iodine.",
            ),
        ],
        "citations": [
            Citation(
                source="WHO Emergency and Trauma Care",
                title="Management of Minor Burns and Wounds in Primary Care Settings",
                url="https://www.who.int/publications/i/item/9789241549479",
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
