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


def test_skin_analysis_endpoint():
    # Valid small JPEG payload
    image_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    files = {"file": ("skin_rash.jpg", io.BytesIO(image_bytes), "image/jpeg")}

    response = client.post("/api/v1/media/analyze-skin", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["analysis_type"] == "skin_infection"
    assert "condition" in data
    assert len(data["recommended_medicines"]) > 0
    assert "visual_findings" in data
    assert "disclaimer" in data


def test_skin_analysis_diverse_images():
    from PIL import Image

    # 1. Red rash image (Tinea / fungal)
    red_img = Image.new("RGB", (60, 60), color=(220, 60, 60))
    red_buf = io.BytesIO()
    red_img.save(red_buf, format="JPEG")
    res_red = client.post(
        "/api/v1/media/analyze-skin",
        files={"file": ("red_rash.jpg", io.BytesIO(red_buf.getvalue()), "image/jpeg")},
    )
    assert res_red.status_code == 200
    assert "Tinea Corporis" in res_red.json()["condition"]

    # 2. Dark pigmented lesion (Nevus)
    dark_img = Image.new("RGB", (60, 60), color=(35, 25, 20))
    dark_buf = io.BytesIO()
    dark_img.save(dark_buf, format="JPEG")
    res_dark = client.post(
        "/api/v1/media/analyze-skin",
        files={"file": ("dark_mole.jpg", io.BytesIO(dark_buf.getvalue()), "image/jpeg")},
    )
    assert res_dark.status_code == 200
    assert "Pigmented Lesion" in res_dark.json()["condition"]

    # 3. Honey-yellow / amber crust image (Impetigo)
    yellow_img = Image.new("RGB", (60, 60), color=(210, 180, 40))
    yellow_buf = io.BytesIO()
    yellow_img.save(yellow_buf, format="JPEG")
    res_yellow = client.post(
        "/api/v1/media/analyze-skin",
        files={"file": ("crust.jpg", io.BytesIO(yellow_buf.getvalue()), "image/jpeg")},
    )
    assert res_yellow.status_code == 200
    assert "Impetigo" in res_yellow.json()["condition"]

    # 4. Pale / dry skin image (Xerosis Cutis)
    pale_img = Image.new("RGB", (60, 60), color=(210, 208, 205))
    pale_buf = io.BytesIO()
    pale_img.save(pale_buf, format="JPEG")
    res_pale = client.post(
        "/api/v1/media/analyze-skin",
        files={"file": ("dry_skin.jpg", io.BytesIO(pale_buf.getvalue()), "image/jpeg")},
    )
    assert res_pale.status_code == 200
    assert "Xerosis Cutis" in res_pale.json()["condition"]

