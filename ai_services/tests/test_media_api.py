import io
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_audio_transcription_endpoint():
    audio_bytes = b"RIFF....WAVEfmt ...."
    files = {"file": ("recording.wav", io.BytesIO(audio_bytes), "audio/wav")}

    response = client.post("/api/v1/media/transcribe-audio", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "transcript" in data
    assert data["confidence_score"] > 0
    assert "headache" in data["extracted_symptoms"]
    assert data["detected_language"] == "en"


def test_image_ocr_endpoint():
    image_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF..."
    files = {"file": ("prescription.jpg", io.BytesIO(image_bytes), "image/jpeg")}

    response = client.post("/api/v1/media/ocr-image", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "extracted_text" in data
    assert "Dolo" in data["detected_medicines"]
    assert data["requires_user_confirmation"] is True
    assert "disclaimer" in data
