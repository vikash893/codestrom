
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "mediresq-ai-services",
        "version": "0.1.0",
    }


def test_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()

    assert data["message"] == "Welcome to MediResQ AI Services"
    assert data["docs"] == "/docs"
    assert data["health"] == "/health"
