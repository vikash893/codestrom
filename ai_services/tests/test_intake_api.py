
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_intake_api_accepts_valid_request():
    response = client.post(
        "/api/v1/intake",
        json={
            "description": "I have had a headache since this morning.",
            "language": "en",
            "duration": "Since this morning",
            "severity": "moderate",
            "age_years": 19,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "received"
    assert "headache" in data["summary"]


def test_intake_api_rejects_short_description():
    response = client.post(
        "/api/v1/intake",
        json={
            "description": "Hi",
            "language": "en",
        },
    )

    assert response.status_code == 422


def test_intake_api_rejects_invalid_severity():
    response = client.post(
        "/api/v1/intake",
        json={
            "description": "I have a headache today.",
            "severity": "critical",
        },
    )

    assert response.status_code == 422


def test_intake_api_rejects_age_over_120():
    response = client.post(
        "/api/v1/intake",
        json={
            "description": "I have a headache today.",
            "age_years": 121,
        },
    )

    assert response.status_code == 422
