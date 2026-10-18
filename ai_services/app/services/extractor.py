import re
from dataclasses import dataclass, field


# Canonical symptom dictionary with multilingual recognition patterns (English, Hindi, Hinglish)
SYMPTOM_DICTIONARY: dict[str, tuple[re.Pattern, ...]] = {
    "chest_pain": (
        re.compile(
            r"\b(chest\s*(pain|pressure|ache|heaviness|tightness|burning|discomfort)|"
            r"(pain|ache|pressure|tightness|heaviness|discomfort|burning)\s+in\s+(the\s+|my\s+)?chest|"
            r"hurting\s+in\s+(the\s+|my\s+)?chest|chest\s+hurts|heart\s*(pain|attack|ache)|angina|"
            r"pain\s+radiating\s+to\s+(left\s+arm|jaw)|crushing\s+chest)\b",
            re.IGNORECASE,
        ),
        re.compile(r"(सीने\s*में\s*(तेज\s*)?(दर्द|जलन|भारीपन|दबाव)|छाती\s*में\s*(दर्द|जलन)|दिल\s*(में\s*दर्द|का\s*दौरा))"),
        re.compile(
            r"\b((sine|seene|chhati|chaati|chest)\s*(m(e|ein)|me)?\s*(bahut\s*|tez\s*)?(dard|jalan|pressure|heaviness|pain|khinchav)|"
            r"pain\s+in\s+chest|dil\s*me\s*dard|heart\s*me\s*dard)\b",
            re.IGNORECASE,
        ),
    ),
    "headache": (
        re.compile(
            r"\b(headache|migraine|head\s*pain|(pain|ache)\s+in\s+(the\s+|my\s+)?head|head\s+hurts|throbbing\s+head)\b",
            re.IGNORECASE,
        ),
        re.compile(r"(सिर\s*(में\s*)?(तेज\s*)?दर्द|आधाशीशी|सिर\s*घूम\s*रहा)"),
        re.compile(r"\b(sir\s*dard|sar\s*dard|sir\s*me\s*dard|sar\s*me\s*dard|sar\s*ghum\s*raha)\b", re.IGNORECASE),
    ),
    "fever": (
        re.compile(
            r"\b(fever|high\s*temperature|chills|feverish|body\s*is\s*hot|burning\s*fever|pyrexia|temperature)\b",
            re.IGNORECASE,
        ),
        re.compile(r"(बुखार|ताप|ठंड\s*लगना|कंपकंपी)"),
        re.compile(r"\b(bukhar|tez\s*bukhar|thand\s*lag\s*rahi|body\s*garam)\b", re.IGNORECASE),
    ),
    "shortness_of_breath": (
        re.compile(
            r"\b(shortness\s*of\s*breath|breathlessness|difficulty\s*breathing|trouble\s*breathing|"
            r"cannot\s*breathe|can\'?t\s*breathe|hard\s*to\s*breathe|gasping|suffocating)\b",
            re.IGNORECASE,
        ),
        re.compile(r"(सांस\s*(फूलना|लेने\s*में\s*(दिक्कत|तकलीफ)|नहीं\s*आ\s*रही)|दम\s*घुट)"),
        re.compile(
            r"\b(saa?ns?\s*(lene\s*me(in)?|phool|dikkat|problem|nahi\s*aa\s*rahi)|breathlessness|dam\s*ghut|saas\s*phul)\b",
            re.IGNORECASE,
        ),
    ),
    "cough": (
        re.compile(r"\b(cough|coughing|dry\s*cough|wet\s*cough|persistent\s*cough)\b", re.IGNORECASE),
        re.compile(r"(खांसी|खराश|बलगम)"),
        re.compile(r"\b(khansi|sukhi\s*khansi|balgham|cough\s*aa\s*raha)\b", re.IGNORECASE),
    ),
    "sore_throat": (
        re.compile(
            r"\b(sore\s*throat|throat\s*(pain|irritation|infection)|(pain|hurts)\s+in\s+(the\s+|my\s+)?throat|"
            r"throat\s+hurts|pain\s+swallowing|difficulty\s+swallowing|pharyngitis|tonsil)\b",
            re.IGNORECASE,
        ),
        re.compile(r"(गले\s*में\s*(खराश|दर्द)|निगलने\s*में\s*दर्द|टॉन्सिल)"),
        re.compile(r"\b(gale\s*me\s*dard|gala\s*kharash|gala\s*khinch|swallow\s*dard|tonsils?)\b", re.IGNORECASE),
    ),
    "nausea_vomiting": (
        re.compile(r"\b(nausea|vomiting|throwing\s*up|puking|feel\s*like\s*vomiting|queasy|nauseous)\b", re.IGNORECASE),
        re.compile(r"(उल्टी|जी\s*मिचलाना|उबकाई)"),
        re.compile(r"\b(ulti|ji\s*michlana|vomit|vomiting)\b", re.IGNORECASE),
    ),
    "abdominal_pain": (
        re.compile(
            r"\b(stomach\s*(ache|pain|cramp|upset)|abdominal\s*pain|belly\s*(pain|ache)|"
            r"(pain|ache)\s+in\s+(the\s+|my\s+)?(stomach|belly|abdomen|tummy)|tummy\s*ache|gut\s*pain)\b",
            re.IGNORECASE,
        ),
        re.compile(r"(पेट\s*(में\s*)?(तेज\s*)?दर्द|मरोड़)"),
        re.compile(r"\b(pet\s*dard|pet\s*me\s*dard|stomach\s*pain|pet\s*me\s*marod)\b", re.IGNORECASE),
    ),
    "acidity_gerd": (
        re.compile(r"\b(acidity|acid\s*reflux|gerd|heartburn|gas\s*problem|indigestion|burning\s*stomach|sour\s*burp)\b", re.IGNORECASE),
        re.compile(r"(एसिडिटी|गैस|खट्टी\s*डकार|पेट\s*में\s*जलन|सीने\s*में\s*जलन)"),
        re.compile(r"\b(acidity|gas|khatti\s*dakar|pet\s*me\s*jalan|gas\s*ban\s*rahi|seene\s*me\s*jalan)\b", re.IGNORECASE),
    ),
    "diarrhea_loose_motions": (
        re.compile(r"\b(diarrhea|loose\s*motion|watery\s*stool|dysentery|frequent\s*stools|food\s*poisoning)\b", re.IGNORECASE),
        re.compile(r"(दस्त|पतले\s*दस्त|पेचिश|लूज\s*मोशन)"),
        re.compile(r"\b(dast|loose\s*motion|loose\s*motions|pet\s*kharab|patla\s*paikhana)\b", re.IGNORECASE),
    ),
    "skin_rash_itching": (
        re.compile(r"\b(skin\s*rash|itching|itchy\s*skin|hives|urticaria|pruritus|red\s*spots|ringworm|eczema|psoriasis|fungal\s*infection|dermatitis)\b", re.IGNORECASE),
        re.compile(r"(खुजली|त्वचा\s*पर\s*दाने|लाल\s*चकत्ते|दाद|खाज|एक्जिमा)"),
        re.compile(r"\b(khujli|daane|chakatte|laal\s*daane|fungal|ringworm|skin\s*allergy|daad)\b", re.IGNORECASE),
    ),
    "eye_problem": (
        re.compile(r"\b(eye\s*(pain|infection|redness|strain|irritation)|red\s*eyes?|conjunctivitis|pink\s*eye|itchy\s*eyes?|watery\s*eyes?|blurred\s*vision)\b", re.IGNORECASE),
        re.compile(r"(आंखों\s*में\s*(दर्द|जलन|लाली|पानी)|आंख\s*आना)"),
        re.compile(r"\b(aankh\s*me\s*dard|aankh\s*laal|aankh\s*aana|eye\s*red|eyes?\s*pain)\b", re.IGNORECASE),
    ),
    "ear_problem": (
        re.compile(r"\b(ear\s*(pain|ache|infection|discharge)|hurting\s+ear|tinnitus|clogged\s*ear)\b", re.IGNORECASE),
        re.compile(r"(कान\s*में\s*(दर्द|मवाद|आवाजें))"),
        re.compile(r"\b(kaan\s*me\s*dard|kaan\s*dard|ear\s*pain|ear\s*ache)\b", re.IGNORECASE),
    ),
    "toothache_dental": (
        re.compile(r"\b(toothache|teeth\s*pain|tooth\s*pain|swollen\s*gum|gum\s*bleeding|dental\s*pain)\b", re.IGNORECASE),
        re.compile(r"(दांत\s*में\s*दर्द|मसूड़ों\s*में\s*सूजन|दाढ़\s*में\s*दर्द)"),
        re.compile(r"\b(daant\s*me\s*dard|daant\s*dard|dadh\s*dard|teeth\s*pain|gum\s*pain)\b", re.IGNORECASE),
    ),
    "back_pain": (
        re.compile(r"\b(back\s*(pain|ache)|lower\s*back\s*pain|lumbar\s*pain|sciatica|spine\s*pain|slipped\s*disc)\b", re.IGNORECASE),
        re.compile(r"(कमर\s*में\s*दर्द|पीठ\s*दर्द|रीढ़\s*की\s*हड्डी\s*में\s*दर्द)"),
        re.compile(r"\b(kamar\s*dard|kamar\s*me\s*dard|peeth\s*dard|back\s*pain)\b", re.IGNORECASE),
    ),
    "joint_pain": (
        re.compile(r"\b(joint\s*pain|knee\s*pain|arthritis|swollen\s*joints?|gout|shoulder\s*pain|wrist\s*pain)\b", re.IGNORECASE),
        re.compile(r"(जोड़ों\s*में\s*दर्द|घुटने\s*में\s*दर्द|गठिया|जोड़ों\s*में\s*सूजन)"),
        re.compile(r"\b(jodo\s*me\s*dard|ghutne\s*me\s*dard|knee\s*pain|joint\s*pain|gathiya)\b", re.IGNORECASE),
    ),
    "cold_congestion": (
        re.compile(r"\b(cold|runny\s*nose|nasal\s*congestion|sneezing|blocked\s*nose|sinus\s*pain)\b", re.IGNORECASE),
        re.compile(r"(जुकाम|सर्दी|नाक\s*बहना|छींक|नाक\s*बंद)"),
        re.compile(r"\b(jukam|sardi|naak\s*beh\s*rahi|chheenk|chhik|band\s*naak)\b", re.IGNORECASE),
    ),
    "urinary_problem": (
        re.compile(r"\b(burning\s*urination|urinary\s*tract\s*infection|uti|pain\s*when\s*urinating|frequent\s*urination|blood\s*in\s*urine)\b", re.IGNORECASE),
        re.compile(r"(पेशाब\s*में\s*जलन|पेशाब\s*रुक\s*कर\s*आना|पेशाब\s*में\s*दर्द)"),
        re.compile(r"\b(peshab\s*me\s*jalan|urine\s*infection|uti|peshab\s*me\s*dard)\b", re.IGNORECASE),
    ),
    "burns_wounds": (
        re.compile(r"\b(burn|burned|scald|cut|wound|bleeding|injury|bruise|laceration)\b", re.IGNORECASE),
        re.compile(r"(जल\s*गया|चोट|घाव|खून\s*बह\s*रहा|कट\s*गया)"),
        re.compile(r"\b(jal\s*gaya|chot\s*lagi|ghav|khoon\s*nikal\s*raha|cut\s*lag\s*gaya)\b", re.IGNORECASE),
    ),
    "dizziness": (
        re.compile(r"\b(dizziness|vertigo|lightheaded|fainting|feel\s*faint|room\s*spinning)\b", re.IGNORECASE),
        re.compile(r"(चक्कर|बेहोशी|सिर\s*घूमना)"),
        re.compile(r"\b(chakkar|chakkar\s*aana|lightheaded|behosh)\b", re.IGNORECASE),
    ),
    "fatigue": (
        re.compile(r"\b(fatigue|exhaustion|weakness|tiredness|body\s*ache|body\s*pain|lethargy)\b", re.IGNORECASE),
        re.compile(r"(थकान|कमजोरी|बदन\s*दर्द)"),
        re.compile(r"\b(thakan|kamzori|weakness|badan\s*dard|body\s*pain)\b", re.IGNORECASE),
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

    # Contextual fallback: if no dictionary key matched, infer keywords from input
    if not found_symptoms and len(text.strip()) > 3:
        lower_txt = text.lower()
        if any(w in lower_txt for w in ["pain", "dard", "ache", "hurt"]):
            found_symptoms.append("fatigue")
        elif any(w in lower_txt for w in ["red", "laal", "rash", "allergy"]):
            found_symptoms.append("skin_rash_itching")
        elif any(w in lower_txt for w in ["stomach", "pet", "belly", "food"]):
            found_symptoms.append("abdominal_pain")

    return ExtractedClinicalDetails(
        symptoms=found_symptoms,
        confidence_score=0.95 if found_symptoms else 0.75,
    )
