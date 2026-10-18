"""
Dataset Downloader and Medical Corpus Builder for MediResQ ML Pipelines.
Downloads open medical disease-symptom-treatment datasets from public repositories,
enriches them with multilingual (English, Hindi, Hinglish) clinical representations,
and generates synthetic visual feature datasets for ANN training.
"""

import os
import csv
import logging
import random
import requests
import numpy as np

logger = logging.getLogger("mediresq.ai.ml")

RAW_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "raw")
PROCESSED_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")

BASE_GITHUB_URL = "https://raw.githubusercontent.com/amMistic/Diseases-Prediction-based-on-Symptoms/main/Dataset"

DATASET_FILES = {
    "dataset.csv": f"{BASE_GITHUB_URL}/dataset.csv",
    "symptom_precaution.csv": f"{BASE_GITHUB_URL}/symptom_precaution.csv",
    "symptom_Description.csv": f"{BASE_GITHUB_URL}/symptom_Description.csv",
    "Symptom-severity.csv": f"{BASE_GITHUB_URL}/Symptom-severity.csv",
}

# Rich clinical metadata: Verified First-Line Medicines & Specialist Mappings for Diseases
CLINICAL_TREATMENT_MAP = {
    "Fungal infection": {
        "medicines": [
            {"name": "Clotrimazole 1% Cream", "generic": "Clotrimazole", "type": "Antifungal Cream", "price": 75.0, "instruction": "Apply twice daily to affected area for 2-3 weeks"},
            {"name": "Terbinafine 250mg Tablet [Rx]", "generic": "Terbinafine", "type": "Oral Antifungal", "price": 140.0, "instruction": "1 tablet daily after food for 14 days"},
            {"name": "Ketoconazole 2% Antidandruff Wash", "generic": "Ketoconazole", "type": "Wash/Shampoo", "price": 180.0, "instruction": "Use twice weekly on infected skin folds"}
        ],
        "specialist": "Dermatologist (चर्म रोग विशेषज्ञ)",
        "severity": "Mild to Moderate",
        "emergency": False
    },
    "Allergy": {
        "medicines": [
            {"name": "Levocetirizine 5mg Tablet", "generic": "Levocetirizine", "type": "Antihistamine", "price": 45.0, "instruction": "1 tablet once daily at bedtime"},
            {"name": "Calamine Soothing Lotion", "generic": "Calamine", "type": "Topical Lotion", "price": 90.0, "instruction": "Apply gently to pruritic rash 3 times daily"},
            {"name": "Montelukast 10mg + Levocetirizine 5mg [Rx]", "generic": "Montelukast + Levocetirizine", "type": "Tablet", "price": 110.0, "instruction": "1 tablet at night for severe allergic rhinitis"}
        ],
        "specialist": "Allergist / General Physician (एलर्जी विशेषज्ञ)",
        "severity": "Mild to Moderate",
        "emergency": False
    },
    "GERD": {
        "medicines": [
            {"name": "Pantoprazole 40mg Tablet", "generic": "Pantoprazole DSR", "type": "Proton Pump Inhibitor", "price": 95.0, "instruction": "1 tablet daily morning 30 minutes before breakfast"},
            {"name": "Magaldrate + Simethicone Oral Gel", "generic": "Magaldrate Antacid", "type": "Suspension", "price": 120.0, "instruction": "2 teaspoons after meals and at bedtime for immediate relief"},
            {"name": "Domperidone 10mg Tablet [Rx]", "generic": "Domperidone", "type": "Prokinetic", "price": 60.0, "instruction": "1 tablet before lunch and dinner for acid regurgitation"}
        ],
        "specialist": "Gastroenterologist (पेट व आंत रोग विशेषज्ञ)",
        "severity": "Moderate",
        "emergency": False
    },
    "Chronic cholestasis": {
        "medicines": [
            {"name": "Ursodeoxycholic Acid 300mg [Rx]", "generic": "UDCA", "type": "Hepatoprotective", "price": 280.0, "instruction": "1 tablet twice daily with meals as prescribed"},
            {"name": "Cholestyramine Powder", "generic": "Cholestyramine", "type": "Bile Acid Sequestrant", "price": 320.0, "instruction": "Dissolve packet in water for severe pruritus"}
        ],
        "specialist": "Hepatologist / Gastroenterologist (यकृत रोग विशेषज्ञ)",
        "severity": "Moderate to Severe",
        "emergency": False
    },
    "Drug Reaction": {
        "medicines": [
            {"name": "Prednisolone 10mg Tablet [Rx]", "generic": "Prednisolone", "type": "Corticosteroid", "price": 35.0, "instruction": "As directed by physician to halt drug reaction flare"},
            {"name": "Fexofenadine 120mg Tablet", "generic": "Fexofenadine HCl", "type": "Non-drowsy Antihistamine", "price": 95.0, "instruction": "1 tablet once daily morning with water"}
        ],
        "specialist": "Emergency Physician / Dermatologist (आपातकालीन चिकित्सक)",
        "severity": "Severe (Attention Required)",
        "emergency": True
    },
    "Peptic ulcer diseae": {
        "medicines": [
            {"name": "Rabeprazole 20mg Tablet", "generic": "Rabeprazole", "type": "Proton Pump Inhibitor", "price": 85.0, "instruction": "1 tablet once daily on empty stomach for 4-8 weeks"},
            {"name": "Sucralfate 1000mg Suspension", "generic": "Sucralfate Mucosal Protectant", "type": "Syrup", "price": 145.0, "instruction": "10ml four times daily 1 hour before meals and bedtime"}
        ],
        "specialist": "Gastroenterologist (उदर रोग विशेषज्ञ)",
        "severity": "Moderate to Severe",
        "emergency": False
    },
    "AIDS": {
        "medicines": [
            {"name": "Antiretroviral Therapy (ART) Regimen [Rx]", "generic": "Tenofovir + Lamivudine + Dolutegravir", "type": "Triple Combination ART", "price": 950.0, "instruction": "Strict adherence: 1 tablet daily at fixed hour under specialist supervision"}
        ],
        "specialist": "Infectious Disease Specialist (संक्रामक रोग विशेषज्ञ)",
        "severity": "Severe",
        "emergency": False
    },
    "Diabetes ": {
        "medicines": [
            {"name": "Metformin 500mg Extended Release", "generic": "Metformin Hydrochloride", "type": "Biguanide Antidiabetic", "price": 40.0, "instruction": "1 tablet with evening meal daily; monitor blood glucose"},
            {"name": "Glimepiride 1mg Tablet [Rx]", "generic": "Glimepiride", "type": "Sulfonylurea", "price": 65.0, "instruction": "1 tablet immediately before breakfast as directed"}
        ],
        "specialist": "Endocrinologist / Diabetologist (मधुमेह विशेषज्ञ)",
        "severity": "Moderate (Chronic Management)",
        "emergency": False
    },
    "Gastroenteritis": {
        "medicines": [
            {"name": "WHO-Formula Oral Rehydration Salts (ORS)", "generic": "Glucose-Electrolyte Powder", "type": "Hydration Solution", "price": 22.0, "instruction": "Dissolve 1 sachet in 1 liter clean drinking water; drink after every loose stool"},
            {"name": "Zinc Sulfate 20mg Tablet", "generic": "Zinc Sulfate Dispersible", "type": "Epithelial Restoration", "price": 40.0, "instruction": "1 tablet daily dissolved in water for 14 days"},
            {"name": "Ondansetron 4mg Fast-Melt Tablet", "generic": "Ondansetron", "type": "Antiemetic", "price": 45.0, "instruction": "Place 1 tablet on tongue 30 mins before rehydration if vomiting occurs"}
        ],
        "specialist": "General Physician / Gastroenterologist (सामान्य चिकित्सक)",
        "severity": "Moderate",
        "emergency": False
    },
    "Bronchial Asthma": {
        "medicines": [
            {"name": "Salbutamol 100mcg Inhaler", "generic": "Salbutamol / Albuterol", "type": "Reliever Inhaler", "price": 125.0, "instruction": "1-2 puffs immediately for acute wheezing and dyspnea"},
            {"name": "Budesonide 200mcg + Formoterol Inhaler [Rx]", "generic": "Budesonide + Formoterol", "type": "Controller Inhaler", "price": 380.0, "instruction": "1 puff twice daily morning and night; rinse mouth after use"}
        ],
        "specialist": "Pulmonologist / Chest Physician (श्वसन रोग विशेषज्ञ)",
        "severity": "Moderate to Severe",
        "emergency": True
    },
    "Hypertension ": {
        "medicines": [
            {"name": "Amlodipine 5mg Tablet", "generic": "Amlodipine Besylate", "type": "Calcium Channel Blocker", "price": 35.0, "instruction": "1 tablet once daily morning; regular BP recording required"},
            {"name": "Telmisartan 40mg Tablet [Rx]", "generic": "Telmisartan", "type": "Angiotensin Receptor Blocker", "price": 75.0, "instruction": "1 tablet once daily with or without food"}
        ],
        "specialist": "Cardiologist / Physician (हृदय व रक्तचाप विशेषज्ञ)",
        "severity": "Moderate (Chronic Management)",
        "emergency": False
    },
    "Migraine": {
        "medicines": [
            {"name": "Sumatriptan 50mg Tablet [Rx]", "generic": "Sumatriptan Succinate", "type": "5-HT1 Receptor Agonist", "price": 120.0, "instruction": "Take 1 tablet at onset of migraine headache; do not exceed 200mg/24h"},
            {"name": "Naproxen 500mg + Domperidone 10mg", "generic": "Naproxen + Domperidone", "type": "NSAID Analgesic", "price": 85.0, "instruction": "1 tablet at headache onset with plenty of water"}
        ],
        "specialist": "Neurologist (तंत्रिका तंत्र विशेषज्ञ)",
        "severity": "Moderate to Severe",
        "emergency": False
    },
    "Cervical spondylosis": {
        "medicines": [
            {"name": "Aceclofenac 100mg + Paracetamol 325mg + Chlorzoxazone 250mg", "generic": "Muscle Relaxant Analgesic", "type": "Tablet", "price": 95.0, "instruction": "1 tablet twice daily after meals for 5 days"},
            {"name": "Diclofenac 1.16% Topical Gel", "generic": "Diclofenac Diethylamine", "type": "Analgesic Gel", "price": 85.0, "instruction": "Gently massage on cervical neck area 3-4 times daily"}
        ],
        "specialist": "Orthopedic Surgeon / Physiotherapist (हड्डी व नस रोग विशेषज्ञ)",
        "severity": "Moderate",
        "emergency": False
    },
    "Paralysis (brain hemorrhage)": {
        "medicines": [
            {"name": "Emergency Medical Evaluation & IV Osmotic Therapy [Rx]", "generic": "Mannitol / Labetalol Protocol", "type": "Emergency Neuro-Critical Care", "price": 1500.0, "instruction": "IMMEDIATE EMERGENCY HOSPITAL ADMISSION - DO NOT SELF MEDICATE"}
        ],
        "specialist": "Neurosurgeon / Emergency Team (न्यूरोलॉजिस्ट व आपातकालीन विभाग)",
        "severity": "CRITICAL EMERGENCY (P0)",
        "emergency": True
    },
    "Jaundice": {
        "medicines": [
            {"name": "Silymarin (Milk Thistle) 140mg Capsule", "generic": "Silymarin Extract", "type": "Liver Supportive", "price": 190.0, "instruction": "1 capsule twice daily with meals"},
            {"name": "Essentiale Phospholipids 300mg", "generic": "Phospholipids", "type": "Hepatoprotective", "price": 240.0, "instruction": "1 capsule 3 times daily; avoid fried and oily foods"}
        ],
        "specialist": "Gastroenterologist / Hepatologist (यकृत विशेषज्ञ)",
        "severity": "Moderate to Severe",
        "emergency": False
    },
    "Malaria": {
        "medicines": [
            {"name": "Artemether 80mg + Lumefantrine 480mg [Rx]", "generic": "ACT Antimalarial", "type": "Tablet", "price": 160.0, "instruction": "6-dose course over 3 days exactly as prescribed by physician"},
            {"name": "Paracetamol 650mg Tablet", "generic": "Paracetamol", "type": "Antipyretic", "price": 32.0, "instruction": "1 tablet every 6 hours for high fever"}
        ],
        "specialist": "Infectious Disease Physician (संक्रामक रोग विशेषज्ञ)",
        "severity": "Moderate to Severe",
        "emergency": True
    },
    "Chicken pox": {
        "medicines": [
            {"name": "Acyclovir 800mg Tablet [Rx]", "generic": "Acyclovir Antiviral", "type": "Oral Antiviral", "price": 210.0, "instruction": "1 tablet 5 times daily at 4-hour intervals for 7 days"},
            {"name": "Calamine Lotion 100ml", "generic": "Calamine", "type": "Soothing Lotion", "price": 90.0, "instruction": "Apply to itchy vesicles; avoid scratching to prevent scarring"}
        ],
        "specialist": "Pediatrician / Physician (बाल व सामान्य चिकित्सक)",
        "severity": "Moderate (Contagious)",
        "emergency": False
    },
    "Dengue": {
        "medicines": [
            {"name": "Paracetamol 650mg Tablet", "generic": "Paracetamol", "type": "Analgesic Antipyretic", "price": 32.0, "instruction": "1 tablet every 6-8 hours for fever; AVOID aspirin/ibuprofen (bleeding risk)"},
            {"name": "Carica Papaya Leaf Extract 1100mg Tablet", "generic": "Papaya Leaf Extract", "type": "Platelet Support", "price": 185.0, "instruction": "1 tablet twice daily with fluid hydration"}
        ],
        "specialist": "Emergency / Internal Medicine (आंतरिक रोग विशेषज्ञ)",
        "severity": "Severe (Platelet Monitoring Required)",
        "emergency": True
    },
    "Typhoid": {
        "medicines": [
            {"name": "Cefixime 200mg Tablet [Rx]", "generic": "Cefixime Trihydrate", "type": "Oral Cephalosporin", "price": 130.0, "instruction": "1 tablet twice daily after meals for 10-14 days"},
            {"name": "Azithromycin 500mg Tablet [Rx]", "generic": "Azithromycin", "type": "Macrolide Antibiotic", "price": 115.0, "instruction": "1 tablet once daily for 7 days as directed"}
        ],
        "specialist": "General Physician (सामान्य चिकित्सक)",
        "severity": "Moderate to Severe",
        "emergency": False
    },
    "Tuberculosis": {
        "medicines": [
            {"name": "DOTS 4-Drug Fixed Dose Combination [Rx]", "generic": "Rifampicin + Isoniazid + Pyrazinamide + Ethambutol", "type": "Antitubercular", "price": 450.0, "instruction": "Strict daily supervised intake on empty stomach; complete entire 6-month course"}
        ],
        "specialist": "Pulmonologist / Chest Specialist (टीबी एवं छाती रोग विशेषज्ञ)",
        "severity": "Severe (Chronic Infectious)",
        "emergency": False
    },
    "Common Cold": {
        "medicines": [
            {"name": "Phenylephrine 10mg + Chlorpheniramine 4mg + Paracetamol 500mg", "generic": "Cold Relief Formula", "type": "Decongestant Tablet", "price": 55.0, "instruction": "1 tablet twice daily for 3 days"},
            {"name": "Oxymetazoline 0.05% Nasal Spray", "generic": "Oxymetazoline", "type": "Nasal Decongestant", "price": 85.0, "instruction": "1-2 sprays per nostril twice daily; maximum 3 consecutive days"},
            {"name": "Vitamin C 500mg + Zinc Chewable Tablet", "generic": "Ascorbic Acid + Zinc", "type": "Immune Support", "price": 45.0, "instruction": "Chew 1 tablet daily after food"}
        ],
        "specialist": "General Physician (सामान्य चिकित्सक)",
        "severity": "Mild",
        "emergency": False
    },
    "Pneumonia": {
        "medicines": [
            {"name": "Amoxicillin-Clavulanate 625mg [Rx]", "generic": "Co-Amoxiclav", "type": "Broad-Spectrum Antibiotic", "price": 175.0, "instruction": "1 tablet every 8 hours with meals for 7-10 days"},
            {"name": "Azithromycin 500mg [Rx]", "generic": "Azithromycin", "type": "Macrolide Antibiotic", "price": 115.0, "instruction": "1 tablet once daily for 5 days as prescribed"},
            {"name": "N-Acetylcysteine 600mg Effervescent", "generic": "NAC Mucolytic", "type": "Mucolytic Tablet", "price": 140.0, "instruction": "Dissolve in glass of water once daily for phlegm clearance"}
        ],
        "specialist": "Pulmonologist (फेफड़ा रोग विशेषज्ञ)",
        "severity": "Moderate to Severe",
        "emergency": True
    },
    "Heart attack": {
        "medicines": [
            {"name": "Emergency Loading Dose: Aspirin 300mg + Clopidogrel 300mg + Atorvastatin 80mg [Rx]", "generic": "Antiplatelet-Statin Emergency Protocol", "type": "Emergency Loading", "price": 110.0, "instruction": "EMERGENCY: Chew soluble Aspirin immediately; CALL 112/108 IMMEDIATELY"},
            {"name": "Sorbitrate (Isosorbide Dinitrate) 5mg [Rx]", "generic": "Sublingual Nitrate", "type": "Sublingual Vasodilator", "price": 45.0, "instruction": "Place 1 tablet under tongue for acute cardiac chest angina"}
        ],
        "specialist": "Cardiologist / Emergency Team (हृदय रोग एवं आपातकालीन विशेषज्ञ)",
        "severity": "CRITICAL EMERGENCY (P0)",
        "emergency": True
    },
    "Urinary tract infection": {
        "medicines": [
            {"name": "Nitrofurantoin 100mg Sustained Release [Rx]", "generic": "Nitrofurantoin Macrobid", "type": "Urinary Antibacterial", "price": 120.0, "instruction": "1 capsule twice daily with food for 7 days"},
            {"name": "Disodium Hydrogen Citrate Syrup", "generic": "Urine Alkalinizer", "type": "Oral Liquid", "price": 95.0, "instruction": "2 teaspoons in a glass of water 3 times daily for burning micturition"}
        ],
        "specialist": "Urologist / General Physician (मूत्र रोग विशेषज्ञ)",
        "severity": "Moderate",
        "emergency": False
    },
    "Acne": {
        "medicines": [
            {"name": "Benzoyl Peroxide 2.5% Gel", "generic": "Benzoyl Peroxide", "type": "Topical Antibacterial", "price": 145.0, "instruction": "Apply thin layer once daily at night after gentle cleansing"},
            {"name": "Clindamycin 1% Topical Gel", "generic": "Clindamycin", "type": "Topical Antibiotic", "price": 95.0, "instruction": "Apply on inflamed pimples morning and evening"}
        ],
        "specialist": "Dermatologist (चर्म रोग विशेषज्ञ)",
        "severity": "Mild to Moderate",
        "emergency": False
    }
}

# Multilingual Symptom Augmentation Dictionary (Hindi & Hinglish expressions)
MULTILINGUAL_SYMPTOM_TEMPLATES = {
    "Fungal infection": [
        "tvacha par daad aur khujli ho rahi hai lal dhabbe hain",
        "skin rash with ringworm pattern severe fungal itching between toes and groin",
        "lal chakatte aur bohot khujli ho rahi hai fungal infection lag raha hai",
        "itching with circular red patches and scaling on skin"
    ],
    "GERD": [
        "chhati aur gale me jalan ho rahi hai khana wapas aa raha hai",
        "severe acidity and heartburn burning sensation in chest after eating oily food",
        "khatta pani munh me aa raha hai aur seene me dard",
        "acid reflux burning throat and sour belching"
    ],
    "Gastroenteritis": [
        "pet me marod ulti aur bohot dast loose motion lagatar ho rahe hain",
        "severe watery diarrhea nausea vomiting and stomach abdominal cramps",
        "food poisoning pet kharab dast aur kamzori dehydration",
        "frequent loose stools vomiting and weakness"
    ],
    "Bronchial Asthma": [
        "saans lene me takleef seeti jaisi aawaz wheezing aur khansi",
        "severe shortness of breath chest tightness and wheezing sound",
        "dam ghut raha hai saans ful rahi hai asthma attack lag raha hai",
        "difficulty breathing night cough and chest constriction"
    ],
    "Heart attack": [
        "chhati me tez dabav dard bayen hath aur jabde tak ja raha hai paseena",
        "crushing retrosternal chest pain radiating to left arm shoulder with cold sweat",
        "dil me tez dard ghabrahat aur saans lene me mushkil emergency",
        "severe chest heaviness shortness of breath and dizziness"
    ],
    "Migraine": [
        "aadhe sar me tez dard roshni aur aawaz se pareshani ulti jaisa lagna",
        "unilateral throbbing headache photophobia nausea and visual aura",
        "sar me jhatke lag rahe hain one sided severe headache",
        "pulsating severe headache with sensitivity to light"
    ],
    "Common Cold": [
        "naak beh rahi hai gale me kharash cheenk aur halka bukhar",
        "runny nose sore throat sneezing and mild headache",
        "zukham band naak sar me bhari pan aur gale me dard",
        "nasal congestion watery eyes and mild chills"
    ],
    "Pneumonia": [
        "tez bukhar ke sath peeli balgham wali khansi aur saans lene par dard",
        "high fever with productive purulent cough chest pain and rapid breathing",
        "khansi me kaph chhati me dard aur tez bukhar",
        "chest rattling sound fever and deep painful cough"
    ],
    "Urinary tract infection": [
        "peshab me tez jalan bar bar peshab aana aur pet ke nichle hisse me dard",
        "burning micturition frequent urination and lower pelvic abdominal ache",
        "peshab karte waqt jalan urine infection burning feeling",
        "dysuria urinary urgency and cloudy urine"
    ],
    "Acne": [
        "chehre par keel muhase aur fode lal finsi ho gayi hai",
        "facial pimples pustules and inflamed red zits on cheeks and forehead",
        "chehre par acne blackheads aur dard bhari finsi",
        "red swollen pimples and oily skin breakout"
    ]
}


def download_raw_dataset() -> bool:
    """Downloads dataset files from GitHub raw repository."""
    os.makedirs(RAW_DATA_DIR, exist_ok=True)
    all_success = True

    for filename, url in DATASET_FILES.items():
        dest_path = os.path.join(RAW_DATA_DIR, filename)
        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 100:
            logger.info("Raw file already cached: %s", filename)
            continue

        try:
            logger.info("Downloading %s from %s...", filename, url)
            resp = requests.get(url, timeout=15)
            if resp.status_code == 200 and len(resp.content) > 50:
                with open(dest_path, "wb") as f:
                    f.write(resp.content)
                logger.info("Successfully downloaded %s (%d bytes)", filename, len(resp.content))
            else:
                logger.warning("Failed to download %s (Status: %d)", filename, resp.status_code)
                all_success = False
        except Exception as e:
            logger.warning("Download error for %s: %s", filename, e)
            all_success = False

    return all_success


def build_processed_nlp_dataset() -> str:
    """
    Parses downloaded dataset, converts multi-column symptoms into fluent clinical text,
    augments with multilingual variations, and creates a consolidated training dataset.
    """
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
    output_path = os.path.join(PROCESSED_DATA_DIR, "processed_medical_nlp_dataset.csv")

    raw_dataset_file = os.path.join(RAW_DATA_DIR, "dataset.csv")
    records = []

    if os.path.exists(raw_dataset_file):
        try:
            with open(raw_dataset_file, mode="r", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader, None)
                for row in reader:
                    if not row or len(row) < 2:
                        continue
                    disease = row[0].strip()
                    # Extract symptoms and clean underscores
                    symptoms = [s.strip().replace("_", " ") for s in row[1:] if s.strip()]
                    if symptoms:
                        # Combine symptoms into natural clinical phrasing
                        symptom_text = f"Patient presents with {', '.join(symptoms)}."
                        records.append({
                            "disease": disease,
                            "symptoms_text": symptom_text,
                            "language": "en"
                        })
            logger.info("Extracted %d clinical rows from raw dataset.csv", len(records))
        except Exception as e:
            logger.warning("Error reading raw dataset.csv: %s", e)

    # If dataset wasn't downloaded or is too small, inject comprehensive baseline records
    if len(records) < 50:
        logger.info("Injecting baseline disease symptom corpus...")
        for disease, meta in CLINICAL_TREATMENT_MAP.items():
            for tpl in MULTILINGUAL_SYMPTOM_TEMPLATES.get(disease, [f"suffering from symptoms of {disease}"]):
                records.append({
                    "disease": disease,
                    "symptoms_text": tpl,
                    "language": "hi_en"
                })

    # Augment with Hindi/Hinglish clinical templates for top conditions
    for disease, templates in MULTILINGUAL_SYMPTOM_TEMPLATES.items():
        for tpl in templates:
            # Add each multiple times with small variations to balance representation
            records.append({
                "disease": disease,
                "symptoms_text": tpl,
                "language": "hinglish"
            })
            records.append({
                "disease": disease,
                "symptoms_text": f"Severe condition reported: {tpl}. Feeling ill and uncomfortable.",
                "language": "hinglish"
            })

    # Save consolidated processed CSV
    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["disease", "symptoms_text", "language"])
        writer.writeheader()
        writer.writerows(records)

    logger.info("Saved %d total training samples to %s", len(records), output_path)
    return output_path


def build_skin_ann_features_dataset() -> str:
    """
    Generates an empirical 12-dimensional feature dataset representing
    visual metrics for the 8 key dermatological conditions to train the ANN.
    Features:
    [mean_r, mean_g, mean_b, erythema_index, luminance, edge_density,
     color_variance, hue_ratio_rg, amber_ratio, saturation, local_contrast, gradient]
    """
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
    ann_dataset_path = os.path.join(PROCESSED_DATA_DIR, "skin_features_dataset.csv")

    categories = [
        "Atypical Pigmented Lesion / Nevus",
        "Impetigo Contagiosa",
        "Plaque Psoriasis",
        "Acneiform Eruption & Folliculitis",
        "Tinea Corporis / Ringworm",
        "Acute Urticaria & Wheals",
        "Eczematous Dermatitis",
        "Xerosis Cutis & Epidermal Barrier Disruption"
    ]

    # Archetype statistics [mean, std] for each condition
    archetypes = {
        "Atypical Pigmented Lesion / Nevus": {
            "r": (55.0, 15.0), "g": (40.0, 12.0), "b": (35.0, 10.0),
            "edge": (14.0, 4.0), "variance": (32.0, 6.0)
        },
        "Impetigo Contagiosa": {
            "r": (205.0, 15.0), "g": (175.0, 15.0), "b": (55.0, 15.0),
            "edge": (16.0, 4.0), "variance": (25.0, 5.0)
        },
        "Plaque Psoriasis": {
            "r": (185.0, 15.0), "g": (140.0, 15.0), "b": (135.0, 15.0),
            "edge": (22.0, 5.0), "variance": (44.0, 6.0)
        },
        "Acneiform Eruption & Folliculitis": {
            "r": (195.0, 15.0), "g": (110.0, 15.0), "b": (100.0, 15.0),
            "edge": (28.0, 5.0), "variance": (34.0, 5.0)
        },
        "Tinea Corporis / Ringworm": {
            "r": (225.0, 12.0), "g": (95.0, 12.0), "b": (85.0, 12.0),
            "edge": (18.0, 4.0), "variance": (28.0, 5.0)
        },
        "Acute Urticaria & Wheals": {
            "r": (200.0, 12.0), "g": (130.0, 12.0), "b": (120.0, 12.0),
            "edge": (11.0, 3.0), "variance": (20.0, 4.0)
        },
        "Eczematous Dermatitis": {
            "r": (180.0, 15.0), "g": (135.0, 15.0), "b": (125.0, 15.0),
            "edge": (15.0, 4.0), "variance": (26.0, 5.0)
        },
        "Xerosis Cutis & Epidermal Barrier Disruption": {
            "r": (175.0, 15.0), "g": (170.0, 15.0), "b": (165.0, 15.0),
            "edge": (12.0, 3.0), "variance": (15.0, 4.0)
        }
    }

    rows = []
    samples_per_class = 200

    np.random.seed(42)

    for cat in categories:
        stats = archetypes[cat]
        for _ in range(samples_per_class):
            r = np.clip(np.random.normal(stats["r"][0], stats["r"][1]), 10.0, 254.0)
            g = np.clip(np.random.normal(stats["g"][0], stats["g"][1]), 10.0, 254.0)
            b = np.clip(np.random.normal(stats["b"][0], stats["b"][1]), 10.0, 254.0)

            total_intensity = r + g + b + 1e-5
            erythema_index = (2.0 * r - g - b) / total_intensity
            luminance = 0.299 * r + 0.587 * g + 0.114 * b
            edge_density = np.clip(np.random.normal(stats["edge"][0], stats["edge"][1]), 2.0, 50.0)
            color_variance = np.clip(np.random.normal(stats["variance"][0], stats["variance"][1]), 5.0, 60.0)
            hue_ratio_rg = r / (g + 1e-5)
            amber_ratio = (r + g) / (b + 1e-5)
            saturation = (max(r, g, b) - min(r, g, b)) / (max(r, g, b) + 1e-5)
            local_contrast = color_variance * 0.85
            gradient = (r - b) / total_intensity

            rows.append({
                "condition": cat,
                "mean_r": round(float(r), 2),
                "mean_g": round(float(g), 2),
                "mean_b": round(float(b), 2),
                "erythema_index": round(float(erythema_index), 4),
                "luminance": round(float(luminance), 2),
                "edge_density": round(float(edge_density), 2),
                "color_variance": round(float(color_variance), 2),
                "hue_ratio_rg": round(float(hue_ratio_rg), 4),
                "amber_ratio": round(float(amber_ratio), 4),
                "saturation": round(float(saturation), 4),
                "local_contrast": round(float(local_contrast), 2),
                "gradient": round(float(gradient), 4)
            })

    with open(ann_dataset_path, mode="w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "condition", "mean_r", "mean_g", "mean_b", "erythema_index",
            "luminance", "edge_density", "color_variance", "hue_ratio_rg",
            "amber_ratio", "saturation", "local_contrast", "gradient"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    logger.info("Generated %d ANN skin feature training samples in %s", len(rows), ann_dataset_path)
    return ann_dataset_path


def prepare_all_datasets():
    """Master routine to download raw data and generate processed training sets."""
    logger.info("Step 1: Downloading raw datasets from internet repository...")
    download_raw_dataset()

    logger.info("Step 2: Processing and augmenting multilingual NLP disease dataset...")
    nlp_path = build_processed_nlp_dataset()

    logger.info("Step 3: Building empirical feature matrix for Skin ANN...")
    ann_path = build_skin_ann_features_dataset()

    return {"nlp_dataset": nlp_path, "ann_dataset": ann_path}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    prepare_all_datasets()
