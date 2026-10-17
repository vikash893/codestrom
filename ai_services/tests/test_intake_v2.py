from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_intake_emergency_escalation():
    response = client.post(
        "/api/v1/intake",
        json={
            "description": "Patient experiencing crushing chest pain radiating to left arm and sweating.",
            "language": "en",
            "severity": "severe",
            "duration": "15 minutes",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "received"
    assert data["is_emergency"] is True
    assert "CARDIOVASCULAR_WARNING" in data["emergency_flags"]
    assert "112" in data["emergency_guidance"]
    assert "chest_pain" in data["extracted_symptoms"]
    assert data["detected_language"] == "en"


def test_intake_hindi_devanagari():
    response = client.post(
        "/api/v1/intake",
        json={
            "description": "मुझे पिछले तीन दिनों से बुखार और सिर में दर्द है।",
            "language": "hi",
            "duration": "3 days",
            "severity": "moderate",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "hi"
    assert data["is_emergency"] is False
    assert "headache" in data["extracted_symptoms"]
    assert "fever" in data["extracted_symptoms"]


def test_intake_hinglish_emergency():
    response = client.post(
        "/api/v1/intake",
        json={
            "description": "saans lene mein bahut problem ho rahi hai dam ghut raha hai",
            "language": "en",
            "severity": "severe",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "hinglish"
    assert data["is_emergency"] is True
    assert "RESPIRATORY_DISTRESS" in data["emergency_flags"]
    assert "shortness_of_breath" in data["extracted_symptoms"]
