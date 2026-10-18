"""
Artificial Neural Network (ANN) Trainer for Image Feature Classification.
Trains a Multi-Layer Perceptron (MLPClassifier) with dense layers (128, 64, 32)
on extracted 12-dimensional dermatological visual features to classify skin lesions,
outputting neural network softmax confidence, medicines, and home care.
"""

import os
import sys
import csv
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import joblib
import numpy as np
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from app.ml.dataset_downloader import PROCESSED_DATA_DIR, build_skin_ann_features_dataset

logger = logging.getLogger("mediresq.ai.ml.ann")

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
ANN_MODEL_PATH = os.path.join(MODEL_DIR, "skin_ann_model.joblib")

SKIN_CLINICAL_TREATMENT_MAP = {
    "Atypical Pigmented Lesion / Nevus": {
        "severity": "Attention Required (Specialist Review)",
        "specialist": "Dermato-Oncologist (त्वचा कैंसर एवं डर्मेटोस्कोपी विशेषज्ञ)",
        "medicines": [
            {
                "name": "Broad Spectrum Mineral Sunscreen SPF 50+",
                "generic_name": "Zinc Oxide + Titanium Dioxide",
                "dosage_form": "Sunscreen Lotion",
                "purpose": "UVA/UVB photoprotection preventing UV-induced melanocytic mutations",
                "instruction": "Apply liberally 20 minutes before outdoor sun exposure; reapply every 2 hours.",
                "price": 380.0
            },
            {
                "name": "Soothing Barrier Restorative Cream",
                "generic_name": "Centella Asiatica + Panthenol",
                "dosage_form": "Cream",
                "purpose": "Skin barrier repair and anti-irritation maintenance",
                "instruction": "Apply twice daily to surrounding skin.",
                "price": 175.0
            }
        ],
        "home_care": [
            "Perform regular ABCDE monthly self-checks: Asymmetry, Border, Color, Diameter (>6mm), Evolution.",
            "Strictly avoid sunburns and UV tanning beds.",
            "Photograph lesion monthly against a coin or ruler to track size progression."
        ],
        "warning_signs": [
            "Rapid change in size, color, or shape within 4 weeks",
            "Spontaneous bleeding, ulceration, or persistent itching/tenderness"
        ]
    },
    "Impetigo Contagiosa": {
        "severity": "Moderate (Contagious)",
        "specialist": "Pediatrician / Dermatologist (बाल एवं त्वचा रोग विशेषज्ञ)",
        "medicines": [
            {
                "name": "Mupirocin 2% Ointment",
                "generic_name": "Mupirocin Ointment",
                "dosage_form": "Topical Ointment",
                "purpose": "Topical antibiotic eradicating Staphylococcus aureus and Streptococcus pyogenes",
                "instruction": "Cleanse area gently with warm water, pat dry, and apply three times daily for 7 days.",
                "price": 125.0
            },
            {
                "name": "Chlorhexidine 0.5% Antiseptic Wash",
                "generic_name": "Chlorhexidine Gluconate",
                "dosage_form": "Antiseptic Solution",
                "purpose": "Broad-spectrum antimicrobial skin barrier decolonization",
                "instruction": "Dilute and gently cleanse crusts before ointment application.",
                "price": 90.0
            },
            {
                "name": "Cephalexin 500mg Capsule [Rx]",
                "generic_name": "Cephalexin",
                "dosage_form": "Capsule",
                "purpose": "Systemic antibiotic for widespread or bullous bacterial lesions",
                "instruction": "1 capsule every 8 hours with meals as prescribed by doctor.",
                "price": 85.0
            }
        ],
        "home_care": [
            "Wash hands thoroughly after touching affected skin to prevent autoinoculation.",
            "Use separate towels, bed linens, and clothing until crusts heal completely.",
            "Cover weeping lesions with sterile loose gauze."
        ],
        "warning_signs": [
            "Development of high body fever or chills",
            "Spreading cellulitis with heat, tenderness, and red streaking beyond lesion borders"
        ]
    },
    "Plaque Psoriasis": {
        "severity": "Moderate to Severe",
        "specialist": "Dermatologist & Rheumatologist (त्वचा एवं संधिवात विशेषज्ञ)",
        "medicines": [
            {
                "name": "Clobetasol 0.05% + Salicylic Acid 3% Ointment",
                "generic_name": "Clobetasol Propionate + Salicylic Acid",
                "dosage_form": "Ointment",
                "purpose": "Potent anti-inflammatory and keratolytic descaling of thick plaques",
                "instruction": "Apply sparingly to thick scaly plaques once daily for up to 14 days.",
                "price": 165.0
            },
            {
                "name": "Liquid Paraffin & White Soft Paraffin Emollient",
                "generic_name": "Liquid Paraffin Emollient",
                "dosage_form": "Emollient Cream",
                "purpose": "Intensive skin barrier hydration and crack prevention",
                "instruction": "Apply liberally 3 to 4 times daily immediately after bathing.",
                "price": 120.0
            },
            {
                "name": "Coal Tar 5% Topical Solution",
                "generic_name": "Coal Tar Solution",
                "dosage_form": "Topical Lotion",
                "purpose": "Anti-proliferative reduction of hyperkeratotic plaque growth",
                "instruction": "Apply as directed by physician on resistant plaques.",
                "price": 210.0
            }
        ],
        "home_care": [
            "Take lukewarm baths and moisturize immediately within 3 minutes of drying.",
            "Expose skin to modest natural sunlight for 10-15 minutes daily (phototherapy benefits).",
            "Avoid harsh chemical soaps and wool fabrics that trigger koebnerization."
        ],
        "warning_signs": [
            "Erythroderma involving >80% body surface area",
            "Joint swelling, stiffness, or morning arthritis symptoms (psoriatic arthritis)"
        ]
    },
    "Acneiform Eruption & Folliculitis": {
        "severity": "Moderate",
        "specialist": "Dermatologist (चर्म रोग विशेषज्ञ)",
        "medicines": [
            {
                "name": "Benzoyl Peroxide 2.5% Gel",
                "generic_name": "Benzoyl Peroxide",
                "dosage_form": "Topical Gel",
                "purpose": "Antibacterial eradication of Cutibacterium acnes and comedolytic action",
                "instruction": "Apply thin layer once daily at night to affected areas after gentle washing.",
                "price": 145.0
            },
            {
                "name": "Clindamycin 1% Topical Gel",
                "generic_name": "Clindamycin Phosphate",
                "dosage_form": "Gel",
                "purpose": "Topical antibiotic reducing inflammation and bacterial colonization",
                "instruction": "Apply twice daily on active red inflammatory lesions.",
                "price": 95.0
            },
            {
                "name": "Salicylic Acid 2% Cleanser",
                "generic_name": "Salicylic Acid",
                "dosage_form": "Cleansing Wash",
                "purpose": "Keratolytic unclogging of follicular pores and sebum control",
                "instruction": "Gently wash face or affected area morning and evening.",
                "price": 180.0
            }
        ],
        "home_care": [
            "Wash with oil-free, non-comedogenic foaming cleanser twice daily.",
            "Avoid squeezing, popping, or picking at lesions to prevent deep scarring.",
            "Use water-based, oil-free moisturizer and non-greasy sunscreen."
        ],
        "warning_signs": [
            "Deep, painful cystic nodules spreading rapidly",
            "Facial swelling or redness tracking towards the eyes/periorbital zone"
        ]
    },
    "Tinea Corporis / Ringworm": {
        "severity": "Mild to Moderate",
        "specialist": "Dermatologist (चर्म रोग विशेषज्ञ)",
        "medicines": [
            {
                "name": "Terbinafine 1% Cream",
                "generic_name": "Terbinafine Hydrochloride",
                "dosage_form": "Topical Cream",
                "purpose": "Fungicidal squalene epoxidase inhibitor clearing dermatophyte infections",
                "instruction": "Apply thin layer once or twice daily to lesion and 2cm surrounding skin for 2 weeks.",
                "price": 110.0
            },
            {
                "name": "Clotrimazole 1% Dusting Powder",
                "generic_name": "Clotrimazole",
                "dosage_form": "Dusting Powder",
                "purpose": "Antifungal moisture absorption in skin folds and friction zones",
                "instruction": "Dust lightly in body folds twice daily after showering.",
                "price": 85.0
            },
            {
                "name": "Fluconazole 150mg Tablet [Rx]",
                "generic_name": "Fluconazole",
                "dosage_form": "Tablet",
                "purpose": "Oral systemic antifungal for refractory or extensive tinea lesions",
                "instruction": "1 tablet weekly for 2 to 4 weeks under medical supervision.",
                "price": 35.0
            }
        ],
        "home_care": [
            "Keep skin clean, cool, and completely dry, especially after exercising.",
            "Wear loose-fitting, breathable pure cotton underwear and clothing.",
            "Do NOT apply steroid creams (like betamethasone), which worsen fungal spread."
        ],
        "warning_signs": [
            "Lesions spreading across groin, scalp, or nails",
            "Secondary bacterial pus exudation due to scratching"
        ]
    },
    "Acute Urticaria & Wheals": {
        "severity": "Moderate",
        "specialist": "Allergist / Dermatologist (एलर्जी एवं त्वचा विशेषज्ञ)",
        "medicines": [
            {
                "name": "Levocetirizine 5mg Tablet",
                "generic_name": "Levocetirizine Dihydrochloride",
                "dosage_form": "Tablet",
                "purpose": "Second-generation H1 antihistamine blocking peripheral histamine receptors",
                "instruction": "1 tablet at bedtime daily for 5 to 7 days.",
                "price": 42.0
            },
            {
                "name": "Calamine & Diphenhydramine Soothing Lotion",
                "generic_name": "Calamine + Pramoxine",
                "dosage_form": "Topical Lotion",
                "purpose": "Local cooling, anti-pruritic, and membrane stabilizing relief",
                "instruction": "Apply gently with cotton ball 3 to 4 times daily as needed.",
                "price": 95.0
            },
            {
                "name": "Hydroxyzine 25mg Tablet [Rx]",
                "generic_name": "Hydroxyzine HCl",
                "dosage_form": "Tablet",
                "purpose": "Potent anti-allergic relief for refractory nighttime pruritus",
                "instruction": "As prescribed by physician if daytime antihistamines are insufficient.",
                "price": 55.0
            }
        ],
        "home_care": [
            "Apply cool damp compresses for 15 minutes to reduce capillary dilation and itching.",
            "Avoid hot showers, vigorous friction, tight elastic bands, and NSAID painkillers.",
            "Maintain a food and allergen log to identify triggering substances."
        ],
        "warning_signs": [
            "Swelling of the lips, tongue, face, or throat (Angioedema)",
            "Wheezing, shortness of breath, or dizziness (Anaphylaxis - Call 112 Immediately)"
        ]
    },
    "Eczematous Dermatitis": {
        "severity": "Mild to Moderate",
        "specialist": "Dermatologist (चर्म रोग विशेषज्ञ)",
        "medicines": [
            {
                "name": "Hydrocortisone 1% Cream",
                "generic_name": "Hydrocortisone",
                "dosage_form": "Topical Cream",
                "purpose": "Mild anti-inflammatory relief of acute pruritus and erythema",
                "instruction": "Apply sparingly twice daily to affected area for maximum 7 days.",
                "price": 75.0
            },
            {
                "name": "Ceramide Intensive Skin Barrier Cream",
                "generic_name": "Ceramides + Hyaluronic Acid",
                "dosage_form": "Moisturizing Cream",
                "purpose": "Stratum corneum lipid barrier restoration and hydration lock",
                "instruction": "Apply generously 3 to 4 times daily, especially right after water exposure.",
                "price": 220.0
            },
            {
                "name": "Cetirizine 10mg Tablet",
                "generic_name": "Cetirizine Hydrochloride",
                "dosage_form": "Tablet",
                "purpose": "Oral anti-allergy antihistamine for nighttime itch control",
                "instruction": "1 tablet at bedtime if itching interferes with sleep.",
                "price": 25.0
            }
        ],
        "home_care": [
            "Eliminate suspected contact irritants (perfumed soaps, harsh detergents, synthetic dyes).",
            "Use lukewarm water rather than hot water for bathing; limit baths to 10 minutes.",
            "Apply ceramide-rich barrier cream liberally throughout the day."
        ],
        "warning_signs": [
            "Yellow weeping crusts indicating bacterial superinfection",
            "Cracking skin with deep bleeding fissures or severe pain"
        ]
    },
    "Xerosis Cutis & Epidermal Barrier Disruption": {
        "severity": "Mild",
        "specialist": "General Physician / Dermatologist (सामान्य चिकित्सक / त्वचा विशेषज्ञ)",
        "medicines": [
            {
                "name": "Ceramide & Hyaluronic Acid Barrier Restorative Cream",
                "generic_name": "Ceramides 1, 3, 6-II + Hyaluronic Acid",
                "dosage_form": "Topical Cream",
                "purpose": "Replenishes natural stratum corneum lipid barrier and retains moisture",
                "instruction": "Apply liberally twice daily within 3 minutes of bathing while skin is damp.",
                "price": 220.0
            },
            {
                "name": "Colloidal Oatmeal 2% Soothing Lotion",
                "generic_name": "Colloidal Oatmeal Emollient",
                "dosage_form": "Lotion",
                "purpose": "Relieves dry skin itching and reduces transepidermal water loss (TEWL)",
                "instruction": "Massage into pruritic, dry areas 3 times daily as needed.",
                "price": 160.0
            },
            {
                "name": "Urea 10% Keratolytic Hydrating Cream",
                "generic_name": "Urea Cream",
                "dosage_form": "Cream",
                "purpose": "Humectant softening of rough, calloused, or severely flaking skin",
                "instruction": "Apply once daily at bedtime to dry elbows, heels, or rough patches.",
                "price": 135.0
            }
        ],
        "home_care": [
            "Limit bathing time to 5-10 minutes using lukewarm (not hot) water.",
            "Use gentle soap-free syndet cleansing bars instead of harsh alkaline soaps.",
            "Use a bedroom humidifier during cold or arid winter months to keep air hydrated."
        ],
        "warning_signs": [
            "Deep, painful fissures or bleeding cracks on hands or feet",
            "Erythema, swelling, or warm tenderness developing around cracked skin"
        ]
    }
}

FEATURE_COLUMNS = [
    "mean_r", "mean_g", "mean_b", "erythema_index", "luminance",
    "edge_density", "color_variance", "hue_ratio_rg", "amber_ratio",
    "saturation", "local_contrast", "gradient"
]


def train_skin_ann_model():
    """
    Trains an Artificial Neural Network (ANN) using MLPClassifier with
    dense layers (128, 64, 32) on the 12-dimensional visual feature matrix.
    """
    os.makedirs(MODEL_DIR, exist_ok=True)
    features_csv = os.path.join(PROCESSED_DATA_DIR, "skin_features_dataset.csv")

    if not os.path.exists(features_csv):
        logger.info("Features CSV not found. Generating now...")
        build_skin_ann_features_dataset()

    X = []
    y = []

    with open(features_csv, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            feat_vec = [float(row[col]) for col in FEATURE_COLUMNS]
            label = row["condition"].strip()
            X.append(feat_vec)
            y.append(label)

    X = np.array(X, dtype=np.float32)
    y = np.array(y)

    logger.info("Loaded %d ANN feature vectors across %d classes.", len(X), len(set(y)))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    ann_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        (
            "mlp",
            MLPClassifier(
                hidden_layer_sizes=(128, 64, 32),
                activation="relu",
                solver="adam",
                alpha=0.0005,
                batch_size=32,
                learning_rate="adaptive",
                learning_rate_init=0.003,
                max_iter=600,
                early_stopping=True,
                n_iter_no_change=25,
                random_state=42
            )
        )
    ])

    logger.info("Training Artificial Neural Network (MLP: 12 -> 128 -> 64 -> 32 -> 8)...")
    ann_pipeline.fit(X_train, y_train)

    y_pred = ann_pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    logger.info("ANN Test Accuracy: %.4f (%.2f%%)", acc, acc * 100.0)

    artifact = {
        "pipeline": ann_pipeline,
        "classes": list(ann_pipeline.classes_),
        "feature_columns": FEATURE_COLUMNS,
        "clinical_map": SKIN_CLINICAL_TREATMENT_MAP,
        "architecture": {
            "type": "Artificial Neural Network (MLPClassifier)",
            "input_dimension": len(FEATURE_COLUMNS),
            "hidden_layers": [128, 64, 32],
            "activation": "relu",
            "output_classes": len(ann_pipeline.classes_),
            "test_accuracy": round(float(acc), 4)
        }
    }

    joblib.dump(artifact, ANN_MODEL_PATH)
    logger.info("Saved trained ANN model artifact to %s", ANN_MODEL_PATH)
    return artifact


class SkinANNPredictor:
    """Predictor helper that executes forward pass on the trained ANN model."""

    _instance = None

    def __init__(self):
        if not os.path.exists(ANN_MODEL_PATH):
            logger.info("ANN artifact not found. Training ANN now...")
            train_skin_ann_model()

        self.artifact = joblib.load(ANN_MODEL_PATH)
        self.pipeline = self.artifact["pipeline"]
        self.classes = self.artifact["classes"]
        self.clinical_map = self.artifact["clinical_map"]
        self.architecture = self.artifact["architecture"]

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def predict_features(self, feature_vector: list[float]):
        """Runs forward inference through the trained ANN."""
        feat_arr = np.array([feature_vector], dtype=np.float32)
        probs = self.pipeline.predict_proba(feat_arr)[0]
        top3_idx = np.argsort(probs)[-3:][::-1]

        top_class = self.classes[top3_idx[0]]
        confidence = float(probs[top3_idx[0]])

        alternatives = [
            {"condition": self.classes[idx], "probability": round(float(probs[idx]), 3)}
            for idx in top3_idx
        ]

        metadata = self.clinical_map.get(top_class, {})

        return {
            "predicted_condition": top_class,
            "neural_network_confidence": round(confidence, 3),
            "top_candidates": alternatives,
            "severity": metadata.get("severity", "Moderate"),
            "specialist": metadata.get("specialist", "Dermatologist (चर्म रोग विशेषज्ञ)"),
            "recommended_medicines": metadata.get("medicines", []),
            "home_care": metadata.get("home_care", []),
            "warning_signs": metadata.get("warning_signs", []),
            "ann_architecture": self.architecture
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train_skin_ann_model()
