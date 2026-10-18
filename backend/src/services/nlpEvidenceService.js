import https from 'https';

// Multilingual Stopwords and Tokenization Helpers
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'am', 'is', 'are', 'was', 'were', 'feeling', 'feel', 'having',
  'have', 'had', 'from', 'since', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for',
  'with', 'and', 'or', 'of', 'yesterday', 'today', 'days', 'hours', 'day', 'hour',
  'kal', 'se', 'hai', 'raha', 'rahi', 'hu', 'tha', 'thi', 'me', 'mein', 'bahut',
  'tez', 'thora', 'bhi', 'kuch', 'hona', 'lag'
]);

// Multilingual Symptom Dictionary
export const SYMPTOM_PATTERNS = {
  chest_pain: [
    /\b(chest\s*(pain|pressure|ache|heaviness|tightness|burning|discomfort)|(pain|ache|pressure|tightness|heaviness|discomfort|burning)\s+in\s+(the\s+|my\s+)?chest|hurting\s+in\s+(the\s+|my\s+)?chest|chest\s+hurts|heart\s*(pain|attack|ache)|angina|pain\s+radiating\s+to\s+(left\s+arm|jaw)|crushing\s+chest)\b/i,
    /(सीने\s*में\s*(तेज\s*)?(दर्द|जलन|भारीपन|दबाव)|छाती\s*में\s*(दर्द|जलन)|दिल\s*(में\s*दर्द|का\s*दौरा))/i,
    /\b((sine|seene|chhati|chaati|chest)\s*(m(e|ein)|me)?\s*(bahut\s*|tez\s*)?(dard|jalan|pressure|heaviness|pain|khinchav)|pain\s+in\s+chest|dil\s*me\s*dard|heart\s*me\s*dard)\b/i,
  ],
  shortness_of_breath: [
    /\b(shortness\s*of\s*breath|breathlessness|difficulty\s*breathing|trouble\s*breathing|cannot\s*breathe|can'?t\s*breathe|hard\s*to\s*breathe|gasping|suffocating)\b/i,
    /(सांस\s*(फूलना|लेने\s*में\s*(दिक्कत|तकलीफ)|नहीं\s*आ\s*रही)|दम\s*घुट)/i,
    /\b(saa?ns?\s*(lene\s*me(in)?|phool|dikkat|problem|nahi\s*aa\s*rahi)|breathlessness|dam\s*ghut|saas\s*phul)\b/i,
  ],
  headache: [
    /\b(headache|migraine|head\s*pain|(pain|ache)\s+in\s+(the\s+|my\s+)?head|head\s+hurts|throbbing\s+head)\b/i,
    /(सिर\s*(में\s*)?(तेज\s*)?दर्द|आधाशीशी|सिर\s*घूम\s*रहा)/i,
    /\b(sir\s*dard|sar\s*dard|sir\s*me\s*dard|sar\s*me\s*dard|sar\s*ghum\s*raha)\b/i,
  ],
  fever: [
    /\b(fever|high\s*temperature|chills|feverish|body\s*is\s*hot|burning\s*fever|pyrexia|temperature)\b/i,
    /(बुखार|ताप|ठंड\s*लगना|कंपकंपी)/i,
    /\b(bukhar|tez\s*bukhar|thand\s*lag\s*rahi|body\s*garam)\b/i,
  ],
  cough: [
    /\b(cough|coughing|dry\s*cough|wet\s*cough|persistent\s*cough)\b/i,
    /(खांसी|खराश|बलगम)/i,
    /\b(khansi|sukhi\s*khansi|balgham|cough\s*aa\s*raha)\b/i,
  ],
  sore_throat: [
    /\b(sore\s*throat|throat\s*(pain|irritation|infection)|(pain|hurts)\s+in\s+(the\s+|my\s+)?throat|throat\s+hurts|pain\s+swallowing|difficulty\s+swallowing)\b/i,
    /(गले\s*में\s*(खराश|दर्द)|निगलने\s*में\s*दर्द)/i,
    /\b(gale\s*me\s*dard|gala\s*kharash|gala\s*khinch|swallow\s*dard)\b/i,
  ],
  nausea_vomiting: [
    /\b(nausea|vomiting|throwing\s*up|puking|feel\s*like\s*vomiting|queasy|nauseous)\b/i,
    /(उल्टी|जी\s*मिचलाना|उबकाई)/i,
    /\b(ulti|ji\s*michlana|vomit|vomiting)\b/i,
  ],
  abdominal_pain: [
    /\b(stomach\s*(ache|pain|cramp|upset)|abdominal\s*pain|belly\s*(pain|ache)|(pain|ache)\s+in\s+(the\s+|my\s+)?(stomach|belly|abdomen|tummy)|tummy\s*ache|gut\s*pain)\b/i,
    /(पेट\s*(में\s*)?(तेज\s*)?दर्द|मरोड़|दस्त)/i,
    /\b(pet\s*dard|pet\s*me\s*dard|stomach\s*pain|pet\s*kharab)\b/i,
  ],
  dizziness: [
    /\b(dizziness|vertigo|lightheaded|fainting|feel\s*faint|room\s*spinning)\b/i,
    /(चक्कर|बेहोशी|सिर\s*घूमना)/i,
    /\b(chakkar|chakkar\s*aana|lightheaded|behosh)\b/i,
  ],
  fatigue: [
    /\b(fatigue|exhaustion|weakness|tiredness|body\s*ache|body\s*pain|lethargy)\b/i,
    /(थकान|कमजोरी|बदन\s*दर्द)/i,
    /\b(thakan|kamzori|weakness|badan\s*dard|body\s*pain)\b/i,
  ],
  acidity_gerd: [
    /\b(acidity|acid\s*reflux|gerd|heartburn|gas\s*problem|indigestion|burning\s*stomach|sour\s*burp)\b/i,
    /(एसिडिटी|गैस|खट्टी\s*डकार|पेट\s*में\s*जलन|सीने\s*में\s*जलन)/i,
    /\b(acidity|gas|khatti\s*dakar|pet\s*me\s*jalan|gas\s*ban\s*rahi|seene\s*me\s*jalan)\b/i,
  ],
  diarrhea_loose_motions: [
    /\b(diarrhea|loose\s*motion|watery\s*stool|dysentery|frequent\s*stools|food\s*poisoning)\b/i,
    /(दस्त|पतले\s*दस्त|पेचिश|लूज\s*मोशन)/i,
    /\b(dast|loose\s*motion|loose\s*motions|pet\s*kharab|patla\s*paikhana)\b/i,
  ],
  skin_rash_itching: [
    /\b(skin\s*rash|itching|itchy\s*skin|hives|urticaria|pruritus|red\s*spots|ringworm|eczema|psoriasis|fungal\s*infection|dermatitis)\b/i,
    /(खुजली|त्वचा\s*पर\s*दाने|लाल\s*चकत्ते|दाद|खाज|एक्जिमा)/i,
    /\b(khujli|daane|chakatte|laal\s*daane|fungal|ringworm|skin\s*allergy|daad)\b/i,
  ],
  eye_problem: [
    /\b(eye\s*(pain|infection|redness|strain|irritation)|red\s*eyes?|conjunctivitis|pink\s*eye|itchy\s*eyes?|watery\s*eyes?|blurred\s*vision)\b/i,
    /(आंखों\s*में\s*(दर्द|जलन|लाली|पानी)|आंख\s*आना)/i,
    /\b(aankh\s*me\s*dard|aankh\s*laal|aankh\s*aana|eye\s*red|eyes?\s*pain)\b/i,
  ],
  ear_problem: [
    /\b(ear\s*(pain|ache|infection|discharge)|hurting\s+ear|tinnitus|clogged\s*ear)\b/i,
    /(कान\s*में\s*(दर्द|मवाद|आवाजें))/i,
    /\b(kaan\s*me\s*dard|kaan\s*dard|ear\s*pain|ear\s*ache)\b/i,
  ],
  toothache_dental: [
    /\b(toothache|teeth\s*pain|tooth\s*pain|swollen\s*gum|gum\s*bleeding|dental\s*pain)\b/i,
    /(दांत\s*में\s*दर्द|मसूड़ों\s*में\s*सूजन|दाढ़\s*में\s*दर्द)/i,
    /\b(daant\s*me\s*dard|daant\s*dard|dadh\s*dard|teeth\s*pain|gum\s*pain)\b/i,
  ],
  back_pain: [
    /\b(back\s*(pain|ache)|lower\s*back\s*pain|lumbar\s*pain|sciatica|spine\s*pain|slipped\s*disc)\b/i,
    /(कमर\s*में\s*दर्द|पीठ\s*दर्द|रीढ़\s*की\s*हड्डी\s*में\s*दर्द)/i,
    /\b(kamar\s*dard|kamar\s*me\s*dard|peeth\s*dard|back\s*pain)\b/i,
  ],
  joint_pain: [
    /\b(joint\s*pain|knee\s*pain|arthritis|swollen\s*joints?|gout|shoulder\s*pain|wrist\s*pain)\b/i,
    /(जोड़ों\s*में\s*दर्द|घुटने\s*में\s*दर्द|गठिया|जोड़ों\s*में\s*सूजन)/i,
    /\b(jodo\s*me\s*dard|ghutne\s*me\s*dard|knee\s*pain|joint\s*pain|gathiya)\b/i,
  ],
  cold_congestion: [
    /\b(cold|runny\s*nose|nasal\s*congestion|sneezing|blocked\s*nose|sinus\s*pain)\b/i,
    /(जुकाम|सर्दी|नाक\s*बहना|छींक|नाक\s*बंद)/i,
    /\b(jukam|sardi|naak\s*beh\s*rahi|chheenk|chhik|band\s*naak)\b/i,
  ],
  urinary_problem: [
    /\b(burning\s*urination|urinary\s*tract\s*infection|uti|pain\s*when\s*urinating|frequent\s*urination|blood\s*in\s*urine)\b/i,
    /(पेशाब\s*में\s*जलन|पेशाब\s*रुक\s*कर\s*आना|पेशाब\s*में\s*दर्द)/i,
    /\b(peshab\s*me\s*jalan|urine\s*infection|uti|peshab\s*me\s*dard)\b/i,
  ],
  burns_wounds: [
    /\b(burn|burned|scald|cut|wound|bleeding|injury|bruise|laceration)\b/i,
    /(जल\s*गया|चोट|घाव|खून\s*बह\s*रहा|कट\s*गया)/i,
    /\b(jal\s*gaya|chot\s*lagi|ghav|khoon\s*nikal\s*raha|cut\s*lag\s*gaya)\b/i,
  ],
};

// Emergency Triage Rules (WHO 4-Tier)
export const EMERGENCY_PATTERNS = [
  {
    ruleId: 'CARDIOVASCULAR_WARNING',
    category: 'Cardiovascular',
    triageLevel: 'RED',
    priority: 'P0_EMERGENCY',
    patterns: [
      /\b(chest\s*(pain|pressure|tightness|ache|discomfort|burning)|(pain|pressure|ache|discomfort|tightness)\s+in\s+(the\s+|my\s+)?chest|hurting\s+in\s+(the\s+|my\s+)?chest|chest\s+hurts|heart\s*(attack|pain|ache)|pain\s+radiating\s+to\s+(left\s+arm|jaw)|crushing\s+chest|angina)\b/i,
      /(सीने\s*में\s*(तेज\s*)?(दर्द|जलन|दबाव)|छाती\s*में\s*(दर्द|जलन)|दिल\s*(का\s*दौरा|में\s*दर्द))/i,
      /\b(chhati|sine|seene|chaati|chest)\s*(m(e|ein)|me)?\s*(bahut\s*|tez\s*)?(dard|jalan|pressure|pain)\b/i,
      /\b(heart\s*attack|dil\s*ka\s*daura|left\s*arm\s*pain|chest\s*me\s*dard|pain\s+in\s+chest|dil\s*me\s*dard)\b/i,
    ],
    guidance:
      'CRITICAL WARNING: The reported symptoms suggest a potential cardiac emergency. Please call emergency services (112 or local emergency line) immediately and proceed to the nearest emergency department. Do not drive yourself.',
  },
  {
    ruleId: 'RESPIRATORY_DISTRESS',
    category: 'Respiratory',
    triageLevel: 'RED',
    priority: 'P0_EMERGENCY',
    patterns: [
      /\b(cannot\s+breathe|unable\s+to\s+breathe|severe\s+shortness\s+of\s+breath|gasping\s+for\s+air|lips\s+turning\s+blue|cyanosis|choking|suffocating)\b/i,
      /(सांस\s*(नहीं\s*आ\s*रही|लेने\s*में\s*(बहुत\s*)?तकलीफ)|दम\s*घुट\s*रहा\s*है|नीले\s*होंठ)/i,
      /\b(saas|sans|saans)\s*(nahi\s*aa\s*rahi|lene\s*me(in)?\s*(bahut\s*)?problem|phool\s*rahi)\b/i,
      /\b(dam\s*ghut\s*raha|breathe\s*nahi\s*kar\s*pa\s*raha)\b/i,
    ],
    guidance:
      'CRITICAL WARNING: Severe breathing difficulty requires immediate emergency medical attention. Call 112 immediately or go to the nearest emergency hospital.',
  },
  {
    ruleId: 'STROKE_OR_NEURO_EMERGENCY',
    category: 'Neurological',
    triageLevel: 'RED',
    priority: 'P0_EMERGENCY',
    patterns: [
      /\b(facial\s+droop|slurred\s+speech|sudden\s+weakness\s+on\s+one\s+side|loss\s+of\s+consciousness|unconscious|unresponsive|seizure|convulsion|thunderclap\s+headache)\b/i,
      /(बेहोश\s*(हो\s*गया)?|लकवा|चेहरा\s*टेढ़ा|बोलने\s*में\s*लड़खड़ाहट|दौरा\s*पड़\s*रहा)/i,
      /\b(behosh|chehra\s*tedha|bol\s*nahi\s*pa\s*raha|daura\s*pad|chakkar\s*gir\s*gaya\s*unconscious)\b/i,
    ],
    guidance:
      'CRITICAL WARNING: Signs of acute stroke or neurological crisis detected (FAST warning signs). Every minute counts. Call 112 immediately and transport patient to an acute stroke-ready emergency center.',
  },
  {
    ruleId: 'SEVERE_TRAUMA_OR_HEMORRHAGE',
    category: 'Trauma / Hemorrhage',
    triageLevel: 'RED',
    priority: 'P0_EMERGENCY',
    patterns: [
      /\b(uncontrolled\s+bleeding|arterial\s+bleeding|severe\s+head\s+injury|coughing\s+up\s+large\s+blood|vomiting\s+blood|deep\s+stab|gunshot)\b/i,
      /(बहुत\s*खून\s*बह\s*रहा\s*है|खून\s*की\s*उल्टी|सिर\s*में\s*गहरी\s*चोट)/i,
      /\b(bohot\s*khoon\s*nikal\s*raha|khoon\s*ki\s*ulti|head\s*injury\s*bleed)\b/i,
    ],
    guidance:
      'CRITICAL WARNING: Severe bleeding or major trauma requires immediate emergency trauma care. Apply firm pressure and call 112 immediately.',
  },
];

// Urgent Rules (YELLOW / P1_URGENT)
export const URGENT_PATTERNS = [
  {
    ruleId: 'ACUTE_HIGH_FEVER_OR_INFECTION',
    category: 'Infection / High Fever',
    triageLevel: 'YELLOW',
    priority: 'P1_URGENT',
    patterns: [
      /\b(high\s*fever\s*(for|since)\s*[3-9]\s*days|103|104|105|fever\s*with\s*(stiff\s*neck|rigors|confusion))\b/i,
      /(तेज\s*बुखार\s*तीन\s*दिन\s*से|गर्दन\s*अकड़ना)/i,
      /\b(bahut\s*tez\s*bukhar|103|104|kapi\s*chhut\s*rahi)\b/i,
    ],
    guidance:
      'URGENT REVIEW RECOMMENDED: High or prolonged fever requires prompt medical evaluation to rule out acute infection.',
  },
  {
    ruleId: 'ACUTE_SEVERE_ABDOMINAL_PAIN',
    category: 'Gastrointestinal',
    triageLevel: 'YELLOW',
    priority: 'P1_URGENT',
    patterns: [
      /\b(severe\s*(stomach|belly|abdominal)\s*pain|appendicitis|constant\s*vomiting\s*cannot\s*keep\s*water)\b/i,
      /\bsevere\s+([a-z\u0900-\u097F]+\s+){0,3}(pain|ache|dard)\b/i,
      /(पेट\s*में\s*असहनीय\s*दर्द|पानी\s*भी\s*नहीं\s*रुक\s*रहा)/i,
      /\b(pet\s*me\s*bahut\s*tez\s*dard|lagatar\s*ulti\s*paani\s*nahi\s*ruk\s*raha|bahut\s*tez\s*pet\s*dard)\b/i,
    ],
    guidance:
      'URGENT REVIEW RECOMMENDED: Severe acute abdominal pain requires prompt clinical assessment.',
  },
];

// Curated Clinical Evidence Knowledge Base
export const EVIDENCE_KNOWLEDGE_BASE = [
  {
    triggerSymptoms: ['chest_pain', 'shortness_of_breath'],
    keywords: ['chest', 'heart', 'cardiac', 'angina', 'pain in chest', 'sine me dard'],
    condition: 'Acute Coronary Syndrome / Angina Pectoris',
    specialties: ['Cardiology', 'Emergency Medicine'],
    rationale:
      'Chest pain with potential dyspnea warrants immediate exclusion of acute myocardial ischemia under WHO/AHA emergency protocols.',
    missingFindings: ['12-lead ECG', 'Cardiac biomarkers (Troponin I/T)', 'Blood pressure reading'],
    warningSigns: ['Radiation to jaw or left arm', 'Diaphoresis (cold sweat)', 'Syncope'],
    firstAid: [
      {
        action: 'Emergency Positioning & Rest',
        instructions:
          "Sit upright or in a semi-reclined 'W-position' with knees bent to ease cardiac workload. Loosen tight clothing around neck and waist.",
        rationale: 'Minimizes myocardial oxygen demand while waiting for emergency ambulance dispatch (112).',
      },
      {
        action: 'Aspirin Chewing (Emergency Protocol)',
        instructions:
          'If patient is conscious, has NO aspirin allergy, and NO active bleeding/ulcers, chew one non-enteric coated tablet of Aspirin (300mg / Disprin).',
        rationale: 'Inhibits platelet aggregation in acute coronary thrombosis.',
      },
    ],
    medicines: [
      {
        name: 'Disprin / Ecosprin',
        genericName: 'Aspirin 300mg',
        purpose: 'Emergency antiplatelet for suspected acute myocardial infarction',
        dosageGuide: 'Single chewable dose of 300mg immediately (if no ulcer/allergy)',
        prescriptionRequired: false,
        precautions: 'Do NOT take if allergic to NSAIDs, active bleeding, or suspected stroke.',
      },
      {
        name: 'Sorbitrate',
        genericName: 'Isosorbide Dinitrate 5mg',
        purpose: 'Sublingual vasodilator for known angina (ONLY if previously prescribed by cardiologist)',
        dosageGuide: '5mg dissolved under the tongue while seated',
        prescriptionRequired: true,
        precautions: 'Causes sudden blood pressure drop; do NOT take if BP is low or if taking PDE-5 inhibitors.',
      },
    ],
    citations: [
      {
        source: 'WHO Emergency Triage Assessment & Treatment',
        title: 'Integrated Management of Cardiovascular Emergencies',
        url: 'https://www.who.int/publications/i/item/9789241511179',
      },
      {
        source: 'MoHFW India Standard Treatment Guidelines',
        title: 'Management of Acute STEMI and Non-STEMI',
        url: 'https://main.mohfw.gov.in/',
      },
      {
        source: 'PubMed Central (NCBI)',
        title: 'Emergency Medical Care Guidelines for Acute Chest Pain',
        url: 'https://pmc.ncbi.nlm.nih.gov/',
      },
    ],
  },
  {
    triggerSymptoms: ['fever', 'cough'],
    keywords: ['fever', 'cough', 'bukhar', 'khansi', 'phlegm', 'chills'],
    condition: 'Acute Respiratory Tract Infection (Bronchitis / Pneumonia)',
    specialties: ['Pulmonology', 'General Medicine'],
    rationale:
      'Co-presentation of pyrexia and productive or dry cough indicates acute upper or lower respiratory tract involvement.',
    missingFindings: ['SpO2 oxygen saturation', 'Chest auscultation for crackles/wheeze', 'Sputum color/purulence'],
    warningSigns: ['Respiratory rate > 30 bpm', 'SpO2 < 94%', 'Cyanosis (bluish lips)', 'Altered mental status'],
    firstAid: [
      {
        action: 'Tepid Sponging & Hydration',
        instructions:
          'Sponge forehead, neck, and limbs with room-temperature water. Drink at least 2.5 to 3 liters of warm fluids or electrolyte water daily.',
        rationale: 'Promotes evaporative heat loss and prevents dehydration from fever.',
      },
      {
        action: 'Steam Inhalation',
        instructions: 'Inhale plain warm steam for 10-15 minutes twice daily. Keep head at a comfortable distance.',
        rationale: 'Humidifies irritated respiratory mucosa and loosens bronchial secretions.',
      },
    ],
    medicines: [
      {
        name: 'Dolo 650 / Calpol',
        genericName: 'Paracetamol 650mg',
        purpose: 'Antipyretic and analgesic for fever and body ache',
        dosageGuide: '1 tablet every 6 to 8 hours as needed (maximum 3000mg/day)',
        prescriptionRequired: false,
        precautions: 'Do not exceed maximum daily dose; caution in pre-existing liver disease.',
      },
      {
        name: 'Benadryl DR / Ascoril D',
        genericName: 'Dextromethorphan / Phenylephrine',
        purpose: 'Cough suppressant for dry irritating cough',
        dosageGuide: '5-10 ml twice or thrice daily after meals',
        prescriptionRequired: false,
        precautions: 'May cause mild drowsiness; avoid driving.',
      },
    ],
    citations: [
      {
        source: 'WHO Clinical Guidelines',
        title: 'Infection Prevention and Management of Acute Respiratory Infections',
        url: 'https://www.who.int/health-topics/respiratory-disease',
      },
      {
        source: 'MoHFW Guidelines',
        title: 'Management of Community-Acquired Pneumonia in Adults',
        url: 'https://main.mohfw.gov.in/',
      },
    ],
  },
  {
    triggerSymptoms: ['abdominal_pain', 'nausea_vomiting'],
    keywords: ['stomach', 'pet', 'belly', 'vomit', 'ulti', 'nausea', 'abdomen', 'diarrhea'],
    condition: 'Acute Gastroenteritis / Gastrointestinal Distress',
    specialties: ['Gastroenterology', 'General Medicine'],
    rationale:
      'Abdominal pain accompanied by emesis or nausea indicates acute enteric inflammation or functional GI disruption.',
    missingFindings: [
      'Hydration status (skin turgor, dry mucous membranes)',
      'Rebound tenderness in right lower quadrant',
      'Bowel habits / stool frequency',
    ],
    warningSigns: [
      'Inability to retain liquids > 24 hours',
      'Hematemesis (vomiting blood)',
      'Peritoneal guarding / rigidity',
    ],
    firstAid: [
      {
        action: 'Oral Rehydration Therapy (WHO-ORS)',
        instructions:
          'Sip WHO-standard Oral Rehydration Salts (ORS) solution slowly in small sips (50-100 ml every 15 minutes).',
        rationale: 'Restores essential sodium, potassium, and glucose to prevent hypovolemic shock.',
      },
      {
        action: 'BRAT Diet & Gut Rest',
        instructions:
          'Eat bland foods (bananas, rice porridge/khichdi, curd). Avoid spicy, oily, and caffeinated products.',
        rationale: 'Reduces intestinal motility and promotes mucosal healing.',
      },
    ],
    medicines: [
      {
        name: 'Electral / WHO ORS',
        genericName: 'Oral Rehydration Salts (WHO Formula)',
        purpose: 'Replacement of fluid and electrolyte losses in diarrhea and vomiting',
        dosageGuide: 'Dissolve 1 sachet in 1 Liter clean drinking water, consume over 24 hours',
        prescriptionRequired: false,
        precautions: 'Use freshly prepared solution within 24 hours; do not add sugar or milk.',
      },
      {
        name: 'Ondem 4mg / Vomikind',
        genericName: 'Ondansetron 4mg',
        purpose: 'Antiemetic to control persistent nausea and vomiting',
        dosageGuide: '1 tablet dissolved on tongue 15-30 minutes before oral fluids',
        prescriptionRequired: true,
        precautions: 'Consult doctor or pharmacist; may cause mild constipation.',
      },
      {
        name: 'Meftal-Spas / Cyclopam',
        genericName: 'Dicyclomine + Paracetamol',
        purpose: 'Antispasmodic for colicky abdominal cramps',
        dosageGuide: '1 tablet as needed with food',
        prescriptionRequired: true,
        precautions: 'Do not use if localized appendicitis or bowel obstruction is suspected.',
      },
    ],
    citations: [
      {
        source: 'WHO Diarrhoeal Disease Fact Sheets',
        title: 'Guidelines for the Management of Acute Gastroenteritis',
        url: 'https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease',
      },
    ],
  },
  {
    triggerSymptoms: ['headache', 'dizziness'],
    keywords: ['headache', 'migraine', 'sir dard', 'sar dard', 'chakkar', 'dizzy', 'lightheaded'],
    condition: 'Tension Headache / Migraine Cephalea',
    specialties: ['Neurology', 'General Medicine'],
    rationale:
      'Cranial discomfort with vestibular symptoms requires differential evaluation between tension cephalea, vascular migraine, or vestibular dysfunction.',
    missingFindings: [
      'Blood pressure measurement',
      'Neurological focal deficit examination',
      'Photophobia / phonophobia presence',
    ],
    warningSigns: [
      "Sudden thunderclap onset ('worst headache of life')",
      'Focal neurological weakness or slurred speech',
      'Neck stiffness (meningismus)',
    ],
    firstAid: [
      {
        action: 'Dark Quiet Room Rest',
        instructions:
          'Lie down in a quiet, darkened room with a cool damp cloth or ice pack over forehead and temples.',
        rationale: 'Reduces sensory stimulation and relieves vascular tension.',
      },
      {
        action: 'Hydration & Gentle Neck Relaxation',
        instructions:
          'Drink 500ml of water slowly; perform gentle isometric neck stretches without sudden jerks.',
        rationale: 'Reverses dehydration headache and releases myofascial tension.',
      },
    ],
    medicines: [
      {
        name: 'Crocin / Paracetamol 500mg',
        genericName: 'Paracetamol 500mg',
        purpose: 'First-line mild analgesic for tension headache',
        dosageGuide: '1 tablet with a glass of water every 6 hours as needed',
        prescriptionRequired: false,
        precautions: 'Avoid taking with other acetaminophen-containing cold remedies.',
      },
      {
        name: 'Combiflam / Ibuprofen',
        genericName: 'Ibuprofen 400mg + Paracetamol 325mg',
        purpose: 'Anti-inflammatory for moderate throbbing migraine/headache',
        dosageGuide: '1 tablet after a full meal',
        prescriptionRequired: true,
        precautions: 'Take with food; avoid in gastric ulcers, asthma, or kidney disease.',
      },
    ],
    citations: [
      {
        source: 'International Headache Society (ICHD-3)',
        title: 'Classification of Headache Disorders',
        url: 'https://ichd-3.org/',
      },
    ],
  },
  {
    triggerSymptoms: ['cough', 'sore_throat'],
    keywords: ['throat', 'gala', 'sore throat', 'cough', 'swallowing'],
    condition: 'Acute Pharyngitis / Upper Respiratory Tract Infection',
    specialties: ['ENT / Otorhinolaryngology', 'General Medicine'],
    rationale:
      'Oropharyngeal irritation with cough is hallmark of viral pharyngitis or acute tonsillopharyngitis.',
    missingFindings: ['Oral temperature', 'Inspection for tonsillar exudates', 'Cervical lymph node palpation'],
    warningSigns: [
      'Difficulty swallowing saliva (drooling)',
      'Inability to open mouth (trismus)',
      'Stridor / whistling sound while breathing',
    ],
    firstAid: [
      {
        action: 'Warm Salt Water Gargle',
        instructions:
          'Dissolve 1/2 teaspoon of salt in a glass of warm water. Gargle deeply for 30 seconds, 3 to 4 times a day.',
        rationale: 'Reduces throat edema via osmotic action and washes away viral debris.',
      },
      {
        action: 'Honey & Ginger Warm Tea',
        instructions:
          'Drink warm water with 1 teaspoon pure honey and grated ginger (avoid honey in infants under 1 year).',
        rationale: 'Natural demulcent coating soothes irritated pharyngeal nerve endings.',
      },
    ],
    medicines: [
      {
        name: 'Strepsils / Cofsils',
        genericName: 'Amylmetacresol + Dichlorobenzyl alcohol',
        purpose: 'Antiseptic throat lozenge for throat irritation and difficulty swallowing',
        dosageGuide: 'Dissolve 1 lozenge slowly in mouth every 3-4 hours (maximum 8/day)',
        prescriptionRequired: false,
        precautions: 'Do not chew whole; do not give to children under 6 due to choking risk.',
      },
      {
        name: 'Betadine Gargle (2% W/V)',
        genericName: 'Povidone Iodine 2%',
        purpose: 'Antiseptic oral rinse for acute pharyngeal infection',
        dosageGuide: 'Dilute with equal volume of water, gargle for 30 seconds twice daily',
        prescriptionRequired: false,
        precautions: 'Do NOT swallow; avoid in thyroid disorders or iodine allergy.',
      },
    ],
    citations: [
      {
        source: 'CDC / WHO Clinical Guidelines',
        title: 'Principles of Appropriate Antibiotic Use for Acute Pharyngitis',
        url: 'https://www.cdc.gov/groupastrep/guidance.html',
      },
    ],
  },
  {
    triggerSymptoms: ['fatigue'],
    keywords: ['weakness', 'tired', 'thakan', 'fatigue', 'exhausted', 'kamzori'],
    condition: 'General Debility / Post-Viral Fatigue / Nutritional Deficiency',
    specialties: ['General Medicine'],
    rationale:
      'Generalized fatigue without acute localized pain suggests metabolic, nutritional, or post-infectious etiology.',
    missingFindings: [
      'Complete Blood Count (CBC/Hemoglobin)',
      'Thyroid Stimulating Hormone (TSH)',
      'Serum Ferritin / Vitamin D/B12',
    ],
    warningSigns: [
      'Rapid unexplained weight loss',
      'Shortness of breath on mild exertion',
      'Black tarry stools',
    ],
    firstAid: [
      {
        action: 'Electrolyte Balance & Scheduled Rest',
        instructions:
          'Ensure 7-8 hours of regular nighttime sleep. Sip fresh coconut water or electrolyte fluids through the day.',
        rationale: 'Restores neuro-endocrine circadian rhythm and cellular hydration.',
      },
    ],
    medicines: [
      {
        name: 'Becosules / Neurobion Forte',
        genericName: 'B-Complex Vitamins with Vitamin C',
        purpose: 'Nutritional support for cellular energy metabolism and nerve health',
        dosageGuide: '1 capsule once daily after lunch or breakfast',
        prescriptionRequired: false,
        precautions: 'Harmless bright yellow discoloration of urine may occur.',
      },
    ],
    citations: [
      {
        source: 'WHO Primary Care Guidelines',
        title: 'Evaluation of Chronic Fatigue and Weakness',
        url: 'https://www.who.int/',
      },
    ],
  },
  {
    triggerSymptoms: ['skin_rash_itching'],
    keywords: ['skin', 'rash', 'itching', 'khujli', 'red spots', 'allergy', 'fungal', 'ringworm', 'eczema', 'hives', 'urticaria', 'daad'],
    condition: 'Acute Dermatitis / Allergic Urticaria / Fungal Dermatomycosis (त्वचा संक्रमण / दाद / खुजली)',
    specialties: ['Dermatology (चर्म रोग विशेषज्ञ)', 'General Medicine'],
    rationale: 'Pruritic erythematous cutaneous eruptions require differentiation between allergic, contact irritant, and fungal dermatomycoses under standard dermatological protocols.',
    missingFindings: ['Dermatological examination of lesion margins', 'KOH mount for fungal hyphae', 'History of new topical exposures/allergens'],
    warningSigns: ['Facial swelling or lip angioedema', 'Rapidly spreading purple or necrotic petechiae', 'High fever with skin peeling (SJS/TEN alert)'],
    firstAid: [
      {
        action: 'Cool Compresses & Anti-Scratch Care',
        instructions: 'Apply clean, cold damp cloth for 10-15 minutes to reduce capillary dilation. Keep fingernails trimmed and avoid scratching to prevent secondary bacterial infection.',
        rationale: 'Cools histamine receptors and prevents epidermal excoriation.',
      },
    ],
    medicines: [
      {
        name: 'Cetirizine 10mg / Levocetirizine 5mg',
        genericName: 'Cetirizine Hydrochloride',
        purpose: 'Oral H1-antihistamine for severe pruritus and allergic flares',
        dosageGuide: '1 tablet at bedtime for 5 to 7 days',
        prescriptionRequired: false,
        precautions: 'May cause mild drowsiness; avoid alcohol and driving.',
      },
      {
        name: 'Calamine Soothing Lotion',
        genericName: 'Calamine + Zinc Oxide',
        purpose: 'Topical antipruritic cooling agent for soothing erythematous skin',
        dosageGuide: 'Apply gently over affected skin twice daily',
        prescriptionRequired: false,
        precautions: 'For external use only; do not apply on open bleeding sores.',
      },
      {
        name: 'Clotrimazole 1% Cream / Terbinafine 1%',
        genericName: 'Clotrimazole / Terbinafine',
        purpose: 'Topical antifungal for ringworm, fungal rashes, and jock itch',
        dosageGuide: 'Apply thin layer twice daily to clean dry skin for 14 days',
        prescriptionRequired: false,
        precautions: 'Continue for 1 week after rash clears to prevent fungal recurrence.',
      },
    ],
    citations: [
      {
        source: 'Indian Association of Dermatologists (IADVL)',
        title: 'Management Guidelines for Superficial Fungal and Eczematous Dermatoses',
        url: 'https://iadvl.org/',
      },
    ],
  },
  {
    triggerSymptoms: ['acidity_gerd'],
    keywords: ['acidity', 'gas', 'heartburn', 'seene me jalan', 'pet me jalan', 'khatti dakar', 'gerd', 'acid reflux'],
    condition: 'Gastroesophageal Reflux Disease (GERD) & Acid Peptic Dyspepsia (एसिडिटी / गैस)',
    specialties: ['Gastroenterology', 'General Medicine'],
    rationale: 'Retrosternal pyrosis and postprandial acid regurgitation indicate transient lower esophageal sphincter relaxation and gastric hyperacidity.',
    missingFindings: ['Endoscopy (if red flags present)', 'H. Pylori screening', 'Response to antacid trial'],
    warningSigns: ['Difficulty or pain swallowing (dysphagia)', 'Unexplained weight loss', 'Vomiting blood or coffee-ground emesis', 'Black tarry stools'],
    firstAid: [
      {
        action: 'Head-of-Bed Elevation & Posture',
        instructions: 'Remain upright for at least 2 hours after eating. Elevate the head end of your bed by 6 inches when sleeping.',
        rationale: 'Gravity prevents acid reflux into the distal esophagus.',
      },
    ],
    medicines: [
      {
        name: 'Pan-D / Pantocid 40',
        genericName: 'Pantoprazole 40mg',
        purpose: 'Proton pump inhibitor significantly suppressing gastric hydrochloric acid',
        dosageGuide: '1 tablet 30 minutes before breakfast once daily',
        prescriptionRequired: false,
        precautions: 'Best taken on empty stomach with plain water.',
      },
      {
        name: 'Digene / Gelusil Antacid Gel',
        genericName: 'Magnesium Hydroxide + Aluminium Hydroxide + Simethicone',
        purpose: 'Immediate neutralizing of excess gastric acid and antifoaming gas relief',
        dosageGuide: '10 ml (2 teaspoons) after meals or at onset of burning',
        prescriptionRequired: false,
        precautions: 'Shake well before use; excessive use may soften stool.',
      },
    ],
    citations: [
      {
        source: 'World Gastroenterology Organisation (WGO)',
        title: 'Global Guidelines: GERD Management in Primary Care',
        url: 'https://www.worldgastroenterology.org/',
      },
    ],
  },
  {
    triggerSymptoms: ['diarrhea_loose_motions'],
    keywords: ['diarrhea', 'loose motion', 'dast', 'pet kharab', 'watery stool', 'dysentery', 'food poisoning'],
    condition: 'Acute Gastroenteritis & Dehydration Risk (दस्त / लूज मोशन / पेट संक्रमण)',
    specialties: ['General Medicine', 'Pediatrics', 'Gastroenterology'],
    rationale: 'Frequent watery stools cause rapid depletion of fluids, sodium, potassium, and bicarbonate requiring urgent rehydration protocols.',
    missingFindings: ['Assessment of hydration status', 'Stool routine/culture', 'Urine output tracking'],
    warningSigns: ['Sunken eyes, lethargy, or extreme thirst', 'Inability to drink or retain oral fluids', 'High fever with bloody stools (dysentery)'],
    firstAid: [
      {
        action: 'Oral Rehydration Therapy (WHO-ORS)',
        instructions: 'Sip standard WHO-ORS solution (1 sachet dissolved in 1 liter of boiled and cooled water) continuously after each loose motion.',
        rationale: 'Sodium-glucose cotransport facilitates rapid intestinal water absorption.',
      },
    ],
    medicines: [
      {
        name: 'Electral / WHO-ORS Sachet',
        genericName: 'Oral Rehydration Salts (WHO Formula)',
        purpose: 'Vital replacement of lost water and essential electrolytes',
        dosageGuide: 'Dissolve 1 full sachet in 1 liter clean water; drink 200-400ml after each purge',
        prescriptionRequired: false,
        precautions: 'Do NOT boil the solution after mixing. Discard unused solution after 24 hours.',
      },
      {
        name: 'Zinc Sulphate 20mg Tablet',
        genericName: 'Zinc Sulphate Dispersible',
        purpose: 'Promotes mucosal regeneration and reduces duration of diarrhea',
        dosageGuide: '1 dispersible tablet daily dissolved in water for 14 days',
        prescriptionRequired: false,
        precautions: 'Recommended by WHO/UNICEF for complete recovery.',
      },
    ],
    citations: [
      {
        source: 'WHO Clinical Guidelines',
        title: 'The Treatment of Diarrhoea: A Manual for Physicians and Other Senior Health Workers',
        url: 'https://www.who.int/publications/i/item/9241593180',
      },
    ],
  },
  {
    triggerSymptoms: ['eye_problem'],
    keywords: ['eye', 'aankh', 'red eye', 'conjunctivitis', 'eye pain', 'itchy eye', 'watery eye', 'aankh aana'],
    condition: 'Acute Conjunctivitis & Ocular Irritation (आंख आना / आंखों में लाली व जलन)',
    specialties: ['Ophthalmology (नेत्र रोग विशेषज्ञ)'],
    rationale: 'Hyperemia of conjunctival vessels with tearing and irritation requires assessment for viral, bacterial, or allergic etiology.',
    missingFindings: ['Visual acuity measurement', 'Slit lamp biomicroscopy', 'Pupillary light reflex test'],
    warningSigns: ['Sudden loss or blurring of vision', 'Severe deep throbbing eye pain', 'Extreme photophobia'],
    firstAid: [
      {
        action: 'Cold Compresses & Eye Hygiene',
        instructions: 'Place a clean cotton pad soaked in cool water over closed eyelids for 5 minutes. Wash hands frequently and do NOT rub the eyes.',
        rationale: 'Decreases vascular congestion and prevents spread to unaffected eye.',
      },
    ],
    medicines: [
      {
        name: 'Refresh Tears / Tear Drops',
        genericName: 'Carboxymethylcellulose 0.5% Eye Drops',
        purpose: 'Soothing ocular lubrication and clearance of foreign irritants/allergens',
        dosageGuide: '1-2 drops in affected eye 4 to 6 times daily',
        prescriptionRequired: false,
        precautions: 'Do not touch dropper tip to eyelashes or hands; discard bottle 30 days after opening.',
      },
    ],
    citations: [
      {
        source: 'All India Ophthalmological Society (AIOS)',
        title: 'Clinical Guidelines for Red Eye Evaluation and Management',
        url: 'https://aios.org/',
      },
    ],
  },
  {
    triggerSymptoms: ['toothache_dental'],
    keywords: ['tooth', 'teeth', 'toothache', 'daant', 'dental', 'gum', 'dadh me dard', 'masoode'],
    condition: 'Acute Dental Caries & Odontogenic Pulpitis (दांत का दर्द / मसूड़ों में सूजन)',
    specialties: ['Dental Surgery / Endodontics (दंत रोग विशेषज्ञ)'],
    rationale: 'Sharp throbbing tooth pain exacerbated by thermal changes indicates pulpal inflammation requiring definitive operative dentistry.',
    missingFindings: ['Intraoral periapical radiograph (IOPA X-Ray)', 'Dental percussion test'],
    warningSigns: ['Facial swelling spreading to cheek or neck', 'Trismus (inability to open mouth > 2 fingers)', 'High fever with difficulty swallowing'],
    firstAid: [
      {
        action: 'Warm Saltwater Mouth Rinse',
        instructions: 'Mix 1/2 teaspoon of salt in a glass of warm water. Gently rinse mouth for 30 seconds and spit out (do not swallow). Repeat 3 times daily.',
        rationale: 'Creates a hypertonic environment that draws out inflammatory edema and cleanses debris.',
      },
    ],
    medicines: [
      {
        name: 'Combiflam / Ketorol DT',
        genericName: 'Ibuprofen 400mg + Paracetamol 325mg',
        purpose: 'Fast-acting oral anti-inflammatory analgesic for throbbing dental pain',
        dosageGuide: '1 tablet after food twice daily for maximum 3 days',
        prescriptionRequired: false,
        precautions: 'Always take with food; avoid on empty stomach.',
      },
    ],
    citations: [
      {
        source: 'Indian Dental Association (IDA)',
        title: 'Emergency Management of Odontogenic Pain and Infections',
        url: 'https://ida.org.in/',
      },
    ],
  },
  {
    triggerSymptoms: ['back_pain'],
    keywords: ['back pain', 'kamar dard', 'peeth dard', 'lower back', 'lumbago', 'sciatica', 'slip disc'],
    condition: 'Acute Lumbar Musculoskeletal Strain & Lumbago (कमर दर्द / स्प्रेन)',
    specialties: ['Orthopedics', 'Physiotherapy', 'General Medicine'],
    rationale: 'Lower lumbar pain without neurological deficits represents acute paravertebral myofascial strain or ligamentous overstretch.',
    missingFindings: ['Straight leg raise test (SLR)', 'Neurological lower extremity motor/sensory test'],
    warningSigns: ['Loss of bowel or bladder control (Cauda Equina Emergency)', 'Numbness in groin or saddle area', 'Progressive leg weakness'],
    firstAid: [
      {
        action: 'Relative Rest & Postural Support',
        instructions: 'Rest on a medium-firm surface with a pillow under the knees when lying on the back. Resume light walking within 24-48 hours.',
        rationale: 'Unloads lumbar disc pressure while preserving spinal mobility.',
      },
    ],
    medicines: [
      {
        name: 'Volini / Moov Gel',
        genericName: 'Diclofenac Diethylamine + Methyl Salicylate Gel',
        purpose: 'Direct topical penetration relieving localized muscle spasms and pain',
        dosageGuide: 'Apply gently over painful lumbar area 3 times daily',
        prescriptionRequired: false,
        precautions: 'Wash hands after applying; avoid contact with eyes.',
      },
      {
        name: 'Aceclo Plus / Zerodol-P',
        genericName: 'Aceclofenac 100mg + Paracetamol 325mg',
        purpose: 'Systemic NSAID analgesic reducing musculoskeletal inflammation',
        dosageGuide: '1 tablet twice daily after meals for 3 to 5 days',
        prescriptionRequired: false,
        precautions: 'Take with food to prevent gastric irritation.',
      },
    ],
    citations: [
      {
        source: 'NICE Clinical Guidelines',
        title: 'Low Back Pain and Sciatica: Assessment and Management',
        url: 'https://www.nice.org.uk/guidance/ng59',
      },
    ],
  },
  {
    triggerSymptoms: ['joint_pain'],
    keywords: ['joint pain', 'knee pain', 'ghutne me dard', 'jodo me dard', 'arthritis', 'gathiya'],
    condition: 'Degenerative Osteoarthritis & Peripheral Arthralgia (जोड़ों व घुटने का दर्द / गठिया)',
    specialties: ['Orthopedics (अस्थि रोग विशेषज्ञ)', 'Rheumatology'],
    rationale: 'Weight-bearing joint pain worsening with movement indicates cartilage degeneration and mechanical joint stress.',
    missingFindings: ['Weight-bearing bilateral knee X-rays', 'Serum Uric Acid test', 'ESR and Rheumatoid Factor'],
    warningSigns: ['Hot, red, acutely swollen joint with inability to bear weight (Septic Arthritis Alert)', 'High fever accompanying joint pain'],
    firstAid: [
      {
        action: 'Low-Impact Joint Protection',
        instructions: 'Avoid deep squatting and high-impact stair climbing. Perform gentle non-weight bearing quadriceps leg lifts.',
        rationale: 'Minimizes patellofemoral compressive stress while strengthening stabilizing muscles.',
      },
    ],
    medicines: [
      {
        name: 'Dolo 650 / Paracetamol',
        genericName: 'Paracetamol 650mg',
        purpose: 'First-line analgesia recommended for mild-to-moderate osteoarthritis',
        dosageGuide: '1 tablet twice daily after meals',
        prescriptionRequired: false,
        precautions: 'Safer for stomach than chronic NSAIDs.',
      },
      {
        name: 'Omnigel / Fastum Gel',
        genericName: 'Diclofenac Topical Gel 1.16%',
        purpose: 'Targeted topical anti-inflammatory reducing knee stiffness',
        dosageGuide: 'Apply 2-4 grams to affected joint 3 times daily',
        prescriptionRequired: false,
        precautions: 'Avoid broken skin.',
      },
    ],
    citations: [
      {
        source: 'American College of Rheumatology',
        title: 'Guideline for the Management of Osteoarthritis of the Hand, Hip, and Knee',
        url: 'https://rheumatology.org/',
      },
    ],
  },
  {
    triggerSymptoms: ['cold_congestion'],
    keywords: ['cold', 'jukam', 'sardi', 'runny nose', 'sneezing', 'naak behna', 'chheenk', 'blocked nose', 'sinus'],
    condition: 'Acute Viral Rhinosinusitis & Upper Airway Congestion (सर्दी-जुकाम / बंद नाक)',
    specialties: ['General Medicine', 'ENT'],
    rationale: 'Nasal mucosal hypersecretion with sneezing and congestion represents self-limiting upper respiratory viral infection.',
    missingFindings: ['Anterior rhinoscopy for mucosal edema', 'Sinus tenderness test'],
    warningSigns: ['Severe frontal headache worsening on bending forward', 'Fever persisting > 5 days'],
    firstAid: [
      {
        action: 'Steam Inhalation & Saline Irrigation',
        instructions: 'Inhale warm steam for 10 minutes twice daily. Use normal saline nasal drops (2-3 drops per nostril) to clear thick mucus.',
        rationale: 'Thins tenacious secretions and restores mucociliary clearance.',
      },
    ],
    medicines: [
      {
        name: 'Sinarest / Cheston Cold',
        genericName: 'Paracetamol 500mg + Phenylephrine 10mg + Chlorpheniramine 2mg',
        purpose: 'Triple-action relief for fever, nasal congestion, and sneezing',
        dosageGuide: '1 tablet thrice daily after food for 3 days',
        prescriptionRequired: false,
        precautions: 'May cause mild drowsiness; caution in hypertension.',
      },
      {
        name: 'Otrivin Saline / Nasoclear',
        genericName: 'Sodium Chloride 0.9% Nasal Drops',
        purpose: 'Non-medicated isotonic moisturizing of blocked nasal passages',
        dosageGuide: '2-3 drops in each nostril 3 to 4 times daily',
        prescriptionRequired: false,
        precautions: 'Safe for daily use.',
      },
    ],
    citations: [
      {
        source: 'CDC Clinical Guidelines',
        title: 'Common Cold: Symptom Relief and Antibiotic Stewardship',
        url: 'https://www.cdc.gov/antibiotic-use/colds.html',
      },
    ],
  },
  {
    triggerSymptoms: ['urinary_problem'],
    keywords: ['urine', 'urination', 'burning urination', 'peshab me jalan', 'uti', 'frequent urination'],
    condition: 'Acute Uncomplicated Lower UTI & Dysuria (पेशाब में जलन व संक्रमण)',
    specialties: ['Urology', 'General Medicine', 'Gynecology'],
    rationale: 'Dysuria with urinary urgency and frequency points to acute bacterial colonization of the bladder urothelium (cystitis).',
    missingFindings: ['Urine routine and microscopy (pus cells, RBCs)', 'Urine culture and antibiotic sensitivity'],
    warningSigns: ['Flank/lower back pain with chills and high fever (Kidney Infection Alert)', 'Visible blood in urine'],
    firstAid: [
      {
        action: 'Aggressive Water Hydration',
        instructions: 'Drink 3 to 3.5 liters of clean water and unsweetened fluids throughout the day. Urinate frequently and do not hold urine.',
        rationale: 'High urinary volume physically flushes bacteria out of the urethral lumen.',
      },
    ],
    medicines: [
      {
        name: 'Alkamac / Cital Syrup',
        genericName: 'Disodium Hydrogen Citrate 1.4g / 5ml',
        purpose: 'Systemic urinary alkalinizer neutralizing acidic urine to relieve burning sensation immediately',
        dosageGuide: '2 teaspoons (10ml) diluted in a full glass of water thrice daily',
        prescriptionRequired: false,
        precautions: 'Always dilute in water.',
      },
    ],
    citations: [
      {
        source: 'European Association of Urology (EAU)',
        title: 'Guidelines on Urological Infections',
        url: 'https://uroweb.org/guidelines/urological-infections',
      },
    ],
  },
  {
    triggerSymptoms: ['burns_wounds'],
    keywords: ['burn', 'jala', 'cut', 'wound', 'bleeding', 'chot', 'ghav', 'injury', 'khoon'],
    condition: 'Superficial Minor Thermal Burn / Skin Abrasion (जलना / घाव / चोट)',
    specialties: ['Emergency Medicine', 'General Surgery'],
    rationale: 'Thermal injury and mechanical abrasions damage epidermal integrity, requiring immediate cooling and sterile antiseptic dressings.',
    missingFindings: ['Tetanus immunization history', 'Depth of burn evaluation (1st vs 2nd degree)'],
    warningSigns: ['Burns on face, hands, joints, or genitals', 'Circumferential burns or charred skin', 'Chemical or high-voltage electrical burns (Immediate 112 Dispatch)'],
    firstAid: [
      {
        action: 'Cool Running Water for 20 Minutes',
        instructions: 'Immediately hold burned area under cool running tap water for 15-20 minutes. Do NOT use ice, butter, toothpaste, or turmeric.',
        rationale: 'Dissipates stored thermal energy from dermal layers and reduces tissue necrosis.',
      },
    ],
    medicines: [
      {
        name: 'Burnol / Silvadene Cream',
        genericName: 'Silver Sulfadiazine 1% / Aminacrine Cream',
        purpose: 'Topical antibacterial prevention of infection in minor burns and scalds',
        dosageGuide: 'Apply thick layer gently over clean burned area and cover loosely with sterile gauze',
        prescriptionRequired: false,
        precautions: 'For 1st degree minor burns only. Avoid near eyes.',
      },
      {
        name: 'Betadine 5% Antiseptic Ointment',
        genericName: 'Povidone Iodine 5%',
        purpose: 'Microbicidal broad-spectrum protection for cuts, wounds, and abrasions',
        dosageGuide: 'Apply thin layer after washing wound with clean water',
        prescriptionRequired: false,
        precautions: 'Do not use if allergic to iodine.',
      },
    ],
    citations: [
      {
        source: 'WHO Emergency and Trauma Care',
        title: 'Management of Minor Burns and Wounds in Primary Care Settings',
        url: 'https://www.who.int/publications/i/item/9789241549479',
      },
    ],
  },
];

/**
 * Detect language based on script and words
 */
export const detectLanguage = (text = '', hint = 'en') => {
  if (!text) return hint;
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const hinglishTokens = ['dard', 'bukhar', 'khansi', 'chhati', 'seene', 'pet', 'sir', 'gala', 'nahi', 'raha', 'bahut', 'tez'];
  const lower = text.toLowerCase();
  for (const token of hinglishTokens) {
    if (lower.includes(token)) return 'hinglish';
  }
  return hint || 'en';
};

/**
 * Natural Language Processing (NLP) Symptom Extractor
 */
export const extractSymptoms = (text = '') => {
  if (!text || typeof text !== 'string') return [];
  const found = new Set();
  const lower = text.toLowerCase();

  for (const [symptomKey, patterns] of Object.entries(SYMPTOM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text) || pattern.test(lower)) {
        found.add(symptomKey);
        break;
      }
    }
  }

  return Array.from(found);
};

/**
 * Deterministic Emergency & Urgent Safety Screening (WHO 4-Tier)
 */
export const screenEmergency = (text = '', severity = 'unknown') => {
  const clean = (text || '').trim();
  if (!clean || clean.length < 5) {
    return {
      isEmergency: false,
      emergencyFlags: [],
      guidance: 'Insufficient information provided. Please describe your symptoms in more detail.',
      triageLevel: 'UNKNOWN',
      priority: 'P2_PRIORITY',
      reasonCodes: ['INSUFFICIENT_INFORMATION'],
      requiresHumanReview: true,
    };
  }

  // 1. Evaluate P0 RED Emergency Rules
  for (const rule of EMERGENCY_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(clean)) {
        return {
          isEmergency: true,
          emergencyFlags: [rule.ruleId],
          guidance: rule.guidance,
          triageLevel: rule.triageLevel,
          priority: rule.priority,
          reasonCodes: [rule.ruleId],
          requiresHumanReview: true,
        };
      }
    }
  }

  // 2. Evaluate P1 YELLOW Urgent Rules
  for (const rule of URGENT_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(clean)) {
        return {
          isEmergency: false,
          emergencyFlags: [rule.ruleId],
          guidance: rule.guidance,
          triageLevel: rule.triageLevel,
          priority: rule.priority,
          reasonCodes: [rule.ruleId],
          requiresHumanReview: true,
        };
      }
    }
  }

  // 3. Severe Patient-Reported Severity -> YELLOW
  if (severity === 'severe') {
    return {
      isEmergency: false,
      emergencyFlags: ['PATIENT_REPORTED_SEVERE'],
      guidance:
        'Patient reported symptoms as severe. We advise prompt clinical evaluation by a medical professional.',
      triageLevel: 'YELLOW',
      priority: 'P1_URGENT',
      reasonCodes: ['PATIENT_REPORTED_SEVERE'],
      requiresHumanReview: true,
    };
  }

  // 4. Brief description -> UNKNOWN (P2)
  if (clean.length < 10) {
    return {
      isEmergency: false,
      emergencyFlags: [],
      guidance: 'Description is brief. Clinician review advised.',
      triageLevel: 'UNKNOWN',
      priority: 'P2_PRIORITY',
      reasonCodes: ['BRIEF_DESCRIPTION'],
      requiresHumanReview: true,
    };
  }

  // 5. Default -> GREEN (P3_ROUTINE)
  return {
    isEmergency: false,
    emergencyFlags: [],
    guidance: null,
    triageLevel: 'GREEN',
    priority: 'P3_ROUTINE',
    reasonCodes: ['NON_URGENT_SYMPTOMS'],
    requiresHumanReview: true,
  };
};

/**
 * Calculates Age-Adapted Clinical Dosage Amount & Instructions
 */
export const computeAgeAdaptedDosage = (medicineName = '', genericName = '', ageYears = 25) => {
  const age = Number(ageYears) || 25;
  const med = `${medicineName} ${genericName || ''}`.toLowerCase();

  let ageGroup = 'Adult (18-64y)';
  let doseAmount = 'Standard Adult Clinical Dose';
  let frequency = 'Twice daily after meals';
  let instructions = 'Take with a glass of water after food.';
  let precautions = 'Consult a doctor if symptoms persist beyond 3 days.';

  if (age < 12) {
    ageGroup = `Pediatric Child (${age}y)`;
    if (med.includes('paracetamol') || med.includes('crocin') || med.includes('dolo') || med.includes('calpol')) {
      doseAmount = '10-15 mg/kg (Pediatric Oral Suspension 120mg/5ml, approx 5-7.5ml)';
      frequency = 'Every 6 to 8 hours as needed (Maximum 4 doses in 24 hours)';
      instructions = 'Use calibrated measuring syringe or spoon. Never exceed weight-based dose.';
      precautions = 'Pediatric liver monitoring advised. Avoid co-administering other paracetamol syrups.';
    } else if (med.includes('cetirizine') || med.includes('levocetirizine') || med.includes('allegra')) {
      doseAmount = 'Pediatric Syrup 2.5mg (2.5ml to 5ml)';
      frequency = 'Once daily at bedtime';
      instructions = 'Give after evening dinner with water.';
      precautions = 'May cause drowsiness. Keep child well-hydrated.';
    } else if (med.includes('ors') || med.includes('electral')) {
      doseAmount = '100 - 200 ml oral solution after each loose stool';
      frequency = 'Frequent small sips';
      instructions = 'Dissolve 1 sachet in 1 litre boiled & cooled water. Use within 24 hours.';
      precautions = 'Do not mix with milk or sugary juices.';
    } else if (med.includes('cough') || med.includes('syrup')) {
      doseAmount = '2.5 ml to 5 ml Pediatric Cough Suspension';
      frequency = 'Twice daily';
      instructions = 'Administer with oral dropper after food.';
      precautions = 'Avoid adult cough formulas containing codeine in children.';
    } else if (med.includes('clotrimazole') || med.includes('calamine') || med.includes('cream')) {
      doseAmount = 'Thin topical layer';
      frequency = 'Twice daily';
      instructions = 'Gently apply over affected skin. Do not cover with tight occlusive diapers.';
      precautions = 'For external use only. Discontinue if redness increases.';
    } else {
      doseAmount = 'Pediatric Reduced Formulation';
      frequency = 'Twice daily under parental supervision';
      instructions = 'Administer with oral spoon after meals.';
      precautions = 'Dosing titrated strictly by child age and body mass.';
    }
  } else if (age >= 12 && age <= 17) {
    ageGroup = `Adolescent (${age}y)`;
    if (med.includes('paracetamol') || med.includes('crocin') || med.includes('dolo')) {
      doseAmount = '250mg - 500mg (1 tablet)';
      frequency = 'Every 6-8 hours as needed (Max 2000mg/day)';
      instructions = 'Take with water after meals.';
      precautions = 'Do not take on an empty stomach.';
    } else if (med.includes('cetirizine') || med.includes('levocetirizine')) {
      doseAmount = '5mg to 10mg (1 tablet)';
      frequency = 'Once daily at bedtime';
      instructions = 'Take before sleeping with water.';
      precautions = 'Avoid driving, cycling or strenuous physical activity after dose.';
    } else {
      doseAmount = 'Adolescent Standard Dose (approx. 70% adult ceiling)';
      frequency = '1-2 times daily';
      instructions = 'Take after meals with water.';
      precautions = 'Adhere strictly to interval timing.';
    }
  } else if (age >= 65) {
    ageGroup = `Senior / Geriatric (${age}y)`;
    if (med.includes('paracetamol') || med.includes('crocin') || med.includes('dolo')) {
      doseAmount = '325mg - 500mg (Geriatric Safe Dose)';
      frequency = 'Every 8 hours as needed (Max 2000mg/day)';
      instructions = 'Take after food with plenty of water.';
      precautions = 'Regular renal and hepatic function monitoring recommended for elderly patients.';
    } else if (med.includes('ibuprofen') || med.includes('combiflam') || med.includes('brufen') || med.includes('diclofenac')) {
      doseAmount = 'Lowest effective dose (200mg) with PPI gastro-protection';
      frequency = 'Once to twice daily with full meals';
      instructions = 'Always take with food and preferably an antacid/pantoprazole.';
      precautions = 'Elevated cardiac and gastrointestinal risks in seniors with NSAIDs.';
    } else if (med.includes('cetirizine') || med.includes('levocetirizine')) {
      doseAmount = '5mg (Senior low-dose)';
      frequency = 'Once daily at bedtime';
      instructions = 'Take at night. Rise slowly from bed to avoid postural dizziness.';
      precautions = 'Higher susceptibility to sedation and urinary retention.';
    } else {
      doseAmount = 'Geriatric Conservative Dose (Start low, titrate slow)';
      frequency = '1 tablet daily or extended interval';
      instructions = 'Take with food and adequate hydration.';
      precautions = 'Check compatibility with chronic cardiovascular medications.';
    }
  } else {
    // Adult 18 - 64
    ageGroup = `Adult (${age}y)`;
    if (med.includes('paracetamol') || med.includes('crocin') || med.includes('dolo')) {
      doseAmount = '500mg - 650mg (1 tablet)';
      frequency = 'Every 6 hours as needed (Maximum 3000mg/24h)';
      instructions = 'Take after meals with plenty of water.';
      precautions = 'Do not exceed 3000mg per day. Avoid alcohol.';
    } else if (med.includes('cetirizine') || med.includes('levocetirizine')) {
      doseAmount = '10mg (1 tablet)';
      frequency = 'Once daily at bedtime';
      instructions = 'Swallow whole with water at bedtime.';
      precautions = 'May cause mild drowsiness; avoid driving or heavy machinery.';
    } else if (med.includes('ors') || med.includes('electral')) {
      doseAmount = '200 - 400 ml after each loose stool';
      frequency = 'Frequent sips throughout the day';
      instructions = '1 sachet dissolved in 1 litre clean drinking water.';
      precautions = 'Discard unused reconstituted solution after 24 hours.';
    } else {
      doseAmount = 'Adult Therapeutic Dose';
      frequency = 'Twice daily after meals';
      instructions = 'Take with food and water as indicated.';
      precautions = 'Complete course as recommended by doctor.';
    }
  }

  return {
    ageGroup,
    doseAmount,
    frequency,
    instructions,
    precautions,
  };
};

/**
 * Synthesizes Medical Evidence & Problem + Medicine recommendations
 */
export const synthesizeClinicalEvidence = (symptoms = [], description = '', severity = 'unknown', ageYears = 25) => {
  const symptomSet = new Set(symptoms);
  const lowerDesc = (description || '').toLowerCase();

  const matchedConditions = [];
  const suggestedSpecialties = new Set();
  const aggregatedMissing = new Set();
  const firstAidMeasures = [];
  const suggestedMedicines = [];
  const allCitations = [];

  for (const entry of EVIDENCE_KNOWLEDGE_BASE) {
    const triggerMatch = entry.triggerSymptoms.some((s) => symptomSet.has(s));
    const keywordMatch = entry.keywords.some((kw) => lowerDesc.includes(kw));

    if (triggerMatch || keywordMatch) {
      const matchScore = triggerMatch ? 0.85 : 0.65;
      matchedConditions.push({
        name: entry.condition,
        confidence: matchScore,
        clinicalRationale: entry.rationale,
        missingFindings: entry.missingFindings,
        warningSigns: entry.warningSigns,
        citations: entry.citations,
      });

      entry.specialties.forEach((spec) => suggestedSpecialties.add(spec));
      entry.missingFindings.forEach((mf) => aggregatedMissing.add(mf));

      entry.firstAid.forEach((fa) => {
        if (!firstAidMeasures.some((item) => item.action === fa.action)) {
          firstAidMeasures.push(fa);
        }
      });

      entry.medicines.forEach((med) => {
        if (!suggestedMedicines.some((item) => item.name === med.name)) {
          const ageDose = computeAgeAdaptedDosage(med.name, med.genericName, ageYears);
          suggestedMedicines.push({
            ...med,
            ageGroup: ageDose.ageGroup,
            doseAmount: ageDose.doseAmount,
            frequency: ageDose.frequency,
            dosageGuide: `${ageDose.doseAmount} - ${ageDose.frequency}. ${ageDose.instructions}`,
            precautions: med.precautions ? `${med.precautions} ${ageDose.precautions}` : ageDose.precautions,
          });
        }
      });

      entry.citations.forEach((cit) => allCitations.push(cit));
    }
  }

  // If no match found, fallback to intelligent general outpatient assessment
  if (matchedConditions.length === 0) {
    const defaultCitations = [
      {
        source: 'PubMed Central (NCBI)',
        title: 'Evidence-Based Clinical Decision Support for Primary Care Symptoms',
        url: 'https://pmc.ncbi.nlm.nih.gov/',
      },
      {
        source: 'WHO Primary Care Guidelines',
        title: 'Integrated Clinical Management of Common Symptoms',
        url: 'https://www.who.int/publications/i/item/9789241547703',
      },
      {
        source: 'National Health Portal (MoHFW India)',
        title: 'Standard Clinical Guidelines for General Outpatient Care',
        url: 'https://main.mohfw.gov.in/',
      },
    ];

    matchedConditions.push({
      name: 'Undifferentiated Symptom Complex Requiring Outpatient Evaluation',
      confidence: 0.55,
      clinicalRationale: `Reported symptoms ('${(description || '').slice(0, 60)}...') warrant formal bedside medical interview, vital signs assessment, and diagnostic evaluation.`,
      missingFindings: [
        'Vital signs (Blood pressure, Pulse rate, Body temperature, SpO2)',
        'Full medical and drug allergy history',
      ],
      warningSigns: ['Sudden unremitting pain', 'Severe breathlessness', 'Altered mental status'],
      citations: defaultCitations,
    });

    suggestedSpecialties.add('General Medicine');
    firstAidMeasures.push({
      action: 'Rest & Vital Sign Monitoring',
      instructions:
        'Avoid physical exertion. Check body temperature, blood pressure, and pulse if home monitoring devices are available.',
      rationale: 'Provides objective clinical baseline for the examining physician.',
    });
    const fallbackAgeDose = computeAgeAdaptedDosage('Crocin / Paracetamol 500mg', 'Paracetamol 500mg', ageYears);
    suggestedMedicines.push({
      name: 'Crocin / Paracetamol 500mg',
      genericName: 'Paracetamol 500mg',
      purpose: 'Temporary mild pain or fever relief',
      ageGroup: fallbackAgeDose.ageGroup,
      doseAmount: fallbackAgeDose.doseAmount,
      frequency: fallbackAgeDose.frequency,
      dosageGuide: `${fallbackAgeDose.doseAmount} - ${fallbackAgeDose.frequency}. ${fallbackAgeDose.instructions}`,
      prescriptionRequired: false,
      precautions: `Consult a doctor if symptoms persist past 48 hours. ${fallbackAgeDose.precautions}`,
    });
    allCitations.push(...defaultCitations);
  }

  return {
    possibleConditions: matchedConditions,
    firstAidMeasures,
    suggestedMedicines,
    clinicalRationale: `Based on ${symptoms.length} recognized symptom(s), identified ${matchedConditions.length} prospective differential condition(s). Physician evaluation is advised.`,
    suggestedSpecialties: Array.from(suggestedSpecialties),
    missingFindings: Array.from(aggregatedMissing),
    redFlagWarning:
      symptomSet.has('chest_pain') || symptomSet.has('shortness_of_breath') || severity === 'severe'
        ? 'Critical warning signs detected: Patient requires immediate emergency evaluation or direct 112 dispatch.'
        : null,
    citations: allCitations,
    uncertaintyLevel: symptoms.length >= 2 ? 'LOW' : 'MODERATE',
    disclaimer:
      'Medical decision-support only. This service does NOT provide an autonomous diagnosis or prescription. All recommendations require verification by a licensed healthcare professional.',
  };
};

/**
 * Calculates geographical distance in kilometers using the Haversine formula
 */
export const calculateDistanceKm = (lng1, lat1, lng2, lat2) => {
  if (lng1 == null || lat1 == null || lng2 == null || lat2 == null) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};
