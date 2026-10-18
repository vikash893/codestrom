import io
from PIL import Image
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_consensus_intake_gerd_presentation():
    payload = {
        "symptoms": "severe burning sensation in chest after eating food acid reflux and throat irritation",
        "age": 35,
        "language": "en"
    }
    response = client.post("/api/v1/pipeline/consensus-intake", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert "GERD" in data["primary_condition"] or "reflux" in data["primary_condition"].lower()
    assert data["confidence_score"] > 0.5
    assert len(data["common_and_best_medicines"]) > 0
    assert "model_stream" in data
    assert "web_stream" in data
    assert "disclaimer" in data


def test_consensus_intake_cardiac_emergency():
    payload = {
        "symptoms": "severe crushing chest pain radiating to left arm shortness of breath cold sweating",
        "age": 55,
        "language": "en"
    }
    response = client.post("/api/v1/pipeline/consensus-intake", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["is_emergency"] is True
    assert "CRITICAL EMERGENCY" in data["severity"]
    assert len(data["emergency_flags"]) > 0


def test_consensus_intake_hinglish_presentation():
    payload = {
        "symptoms": "chhati aur gale me jalan ho rahi hai khana wapas aa raha hai acidity",
        "age": 28,
        "language": "hinglish"
    }
    response = client.post("/api/v1/pipeline/consensus-intake", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "GERD" in data["primary_condition"]


def test_ann_skin_analysis_endpoint():
    # Create red rash test image
    red_img = Image.new("RGB", (60, 60), color=(220, 70, 70))
    buf = io.BytesIO()
    red_img.save(buf, format="JPEG")

    files = {"file": ("skin_rash.jpg", io.BytesIO(buf.getvalue()), "image/jpeg")}
    response = client.post("/api/v1/pipeline/ann-skin-analysis", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["model_architecture"] == "Multi-Layer Perceptron (ANN)"
    assert "condition" in data
    assert data["confidence_score"] > 0
    assert len(data["recommended_medicines"]) > 0
    assert "image_metrics" in data
    assert len(data["neural_network_candidates"]) > 0


def test_pipeline_train_status_endpoint():
    response = client.get("/api/v1/pipeline/train-status")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ready"
    assert "symptom_ml_model" in data
    assert data["symptom_ml_model"]["metrics"]["test_accuracy"] >= 0.85
    assert data["symptom_ml_model"]["classes_count"] >= 30

    assert "skin_ann_model" in data
    assert data["skin_ann_model"]["architecture"]["type"] == "Artificial Neural Network (MLPClassifier)"
    assert data["skin_ann_model"]["architecture"]["test_accuracy"] >= 0.85
