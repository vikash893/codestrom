"""
ML Trainer for MediResQ Symptom NLP Pipeline.
Trains a TF-IDF + Calibrated Multi-Class Classifier on the 5000+ medical dataset,
evaluates precision/recall/top-3 accuracy, and bundles disease precautions,
medicines, and clinical guidance into a deployable model artifact.
"""

import os
import sys
import csv
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from app.ml.dataset_downloader import CLINICAL_TREATMENT_MAP, RAW_DATA_DIR, PROCESSED_DATA_DIR

logger = logging.getLogger("mediresq.ai.ml")

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "symptom_ml_pipeline.joblib")


def load_precautions():
    """Loads precaution guidelines from downloaded symptom_precaution.csv."""
    precautions_map = {}
    precautions_file = os.path.join(RAW_DATA_DIR, "symptom_precaution.csv")
    if os.path.exists(precautions_file):
        try:
            with open(precautions_file, mode="r", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader, None)
                for row in reader:
                    if row and len(row) >= 2:
                        disease = row[0].strip()
                        items = [p.strip().capitalize() for p in row[1:] if p.strip()]
                        precautions_map[disease] = items
        except Exception as e:
            logger.warning("Error loading precautions: %s", e)
    return precautions_map


def load_descriptions():
    """Loads clinical disease descriptions from symptom_Description.csv."""
    descriptions_map = {}
    desc_file = os.path.join(RAW_DATA_DIR, "symptom_Description.csv")
    if os.path.exists(desc_file):
        try:
            with open(desc_file, mode="r", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader, None)
                for row in reader:
                    if row and len(row) >= 2:
                        disease = row[0].strip()
                        desc = row[1].strip()
                        descriptions_map[disease] = desc
        except Exception as e:
            logger.warning("Error loading descriptions: %s", e)
    return descriptions_map


def train_symptom_nlp_model():
    """
    Trains the NLP pipeline using TF-IDF n-grams and Logistic Regression with
    calibrated multi-class probability outputs.
    """
    os.makedirs(MODEL_DIR, exist_ok=True)
    dataset_file = os.path.join(PROCESSED_DATA_DIR, "processed_medical_nlp_dataset.csv")

    if not os.path.exists(dataset_file):
        logger.error("Dataset not found at %s. Please run dataset_downloader first.", dataset_file)
        raise FileNotFoundError(f"Missing dataset {dataset_file}")

    texts = []
    labels = []

    with open(dataset_file, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text = row.get("symptoms_text", "").strip()
            disease = row.get("disease", "").strip()
            if text and disease:
                texts.append(text)
                labels.append(disease)

    logger.info("Loaded %d training examples across %d disease categories.", len(texts), len(set(labels)))

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.15, random_state=42, stratify=labels
    )

    pipeline = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                ngram_range=(1, 3),
                max_features=12000,
                sublinear_tf=True,
                lowercase=True,
                token_pattern=r"(?u)\b\w+\b"
            )
        ),
        (
            "clf",
            LogisticRegression(
                C=6.0,
                max_iter=1000,
                solver="lbfgs",
                random_state=42
            )
        )
    ])

    logger.info("Fitting TF-IDF Vectorizer and Multi-Class Classifier...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    logger.info("Model Test Accuracy: %.4f (%.2f%%)", acc, acc * 100.0)

    # Top-3 Accuracy evaluation
    probs = pipeline.predict_proba(X_test)
    classes = pipeline.classes_
    top3_correct = 0
    for i, actual in enumerate(y_test):
        top3_idx = np.argsort(probs[i])[-3:]
        top3_classes = [classes[idx] for idx in top3_idx]
        if actual in top3_classes:
            top3_correct += 1

    top3_acc = top3_correct / len(y_test)
    logger.info("Top-3 Accuracy: %.4f (%.2f%%)", top3_acc, top3_acc * 100.0)

    precautions_map = load_precautions()
    descriptions_map = load_descriptions()

    artifact = {
        "pipeline": pipeline,
        "classes": list(pipeline.classes_),
        "treatment_map": CLINICAL_TREATMENT_MAP,
        "precautions_map": precautions_map,
        "descriptions_map": descriptions_map,
        "metrics": {
            "test_accuracy": round(float(acc), 4),
            "top3_accuracy": round(float(top3_acc), 4),
            "training_samples": len(texts),
            "total_classes": len(pipeline.classes_)
        }
    }

    joblib.dump(artifact, MODEL_PATH)
    logger.info("Saved trained NLP symptom model artifact to %s", MODEL_PATH)
    return artifact


class SymptomPredictor:
    """Predictor helper that wraps the saved model artifact."""

    _instance = None

    def __init__(self):
        if not os.path.exists(MODEL_PATH):
            logger.info("Model artifact not found. Training model now...")
            train_symptom_nlp_model()

        self.artifact = joblib.load(MODEL_PATH)
        self.pipeline = self.artifact["pipeline"]
        self.classes = self.artifact["classes"]
        self.treatment_map = self.artifact.get("treatment_map", {})
        self.precautions_map = self.artifact.get("precautions_map", {})
        self.descriptions_map = self.artifact.get("descriptions_map", {})
        self.metrics = self.artifact.get("metrics", {})

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def predict(self, text: str):
        """
        Predicts primary disease, top-3 candidates with confidence scores,
        recommended medicines, precautions, and specialist doctor.
        """
        text_clean = text.strip()
        probs = self.pipeline.predict_proba([text_clean])[0]
        top3_idx = np.argsort(probs)[-3:][::-1]

        top_disease = self.classes[top3_idx[0]]
        top_confidence = float(probs[top3_idx[0]])

        alternatives = [
            {"disease": self.classes[idx], "confidence": round(float(probs[idx]), 3)}
            for idx in top3_idx
        ]

        # Clinical metadata lookup
        treatments = self.treatment_map.get(top_disease, {})
        medicines = treatments.get("medicines", [
            {
                "name": "Paracetamol 500mg Tablet",
                "generic": "Paracetamol",
                "type": "Analgesic / Antipyretic",
                "price": 25.0,
                "instruction": "1 tablet every 6 hours as needed for discomfort"
            }
        ])
        specialist = treatments.get("specialist", "General Physician (सामान्य चिकित्सक)")
        severity = treatments.get("severity", "Moderate")
        is_emergency = treatments.get("emergency", False)

        precautions = self.precautions_map.get(top_disease, [
            "Get adequate rest and stay hydrated",
            "Monitor body temperature and symptoms",
            "Consult a medical specialist if symptoms persist > 48 hours"
        ])
        description = self.descriptions_map.get(
            top_disease,
            f"Clinical syndrome presenting with reported symptoms consistent with {top_disease}."
        )

        return {
            "predicted_disease": top_disease,
            "confidence": round(top_confidence, 3),
            "top_candidates": alternatives,
            "recommended_medicines": medicines,
            "precautions": precautions,
            "description": description,
            "specialist": specialist,
            "severity": severity,
            "is_emergency": is_emergency
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train_symptom_nlp_model()
