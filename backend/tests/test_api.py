from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def jpeg_bytes(width: int = 64, height: int = 48) -> bytes:
    output = BytesIO()
    Image.new("RGB", (width, height), "#8b5a49").save(output, format="JPEG", quality=100)
    return output.getvalue()


def test_health() -> None:
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_screening_abstains_without_validated_model() -> None:
    response = client.post(
        "/v1/screenings/anemia",
        files={
            "leftImage": ("left.jpg", jpeg_bytes(), "image/jpeg"),
            "rightImage": ("right.jpg", jpeg_bytes(), "image/jpeg"),
        },
        data={"sessionId": "session_test"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["screening"]["signal"] == "unavailable"
    assert "confidence" not in body["screening"]


def test_screening_rejects_bytes_that_only_claim_to_be_jpeg() -> None:
    response = client.post(
        "/v1/screenings/anemia",
        files={
            "leftImage": ("left.jpg", b"not-a-jpeg", "image/jpeg"),
            "rightImage": ("right.jpg", jpeg_bytes(), "image/jpeg"),
        },
        data={"sessionId": "session_test"},
    )
    assert response.status_code == 400


def test_screening_rejects_pregnancy_without_female_sex() -> None:
    response = client.post(
        "/v1/screenings/anemia",
        files={
            "leftImage": ("left.jpg", jpeg_bytes(), "image/jpeg"),
            "rightImage": ("right.jpg", jpeg_bytes(), "image/jpeg"),
        },
        data={"sessionId": "session_test", "ageYears": "30", "sex": "male", "pregnant": "true"},
    )
    assert response.status_code == 422


def test_screening_requires_age_and_sex_together() -> None:
    response = client.post(
        "/v1/screenings/anemia",
        files={
            "leftImage": ("left.jpg", jpeg_bytes(), "image/jpeg"),
            "rightImage": ("right.jpg", jpeg_bytes(), "image/jpeg"),
        },
        data={"sessionId": "session_test", "ageYears": "30"},
    )
    assert response.status_code == 422


def test_screening_asks_for_retake_when_an_eye_photo_is_too_dark() -> None:
    dark = BytesIO()
    Image.new("RGB", (64, 48), "#0a0605").save(dark, format="JPEG", quality=100)
    response = client.post(
        "/v1/screenings/anemia",
        files={
            "leftImage": ("left.jpg", dark.getvalue(), "image/jpeg"),
            "rightImage": ("right.jpg", jpeg_bytes(), "image/jpeg"),
        },
        data={"sessionId": "session_test", "ageYears": "30", "sex": "female"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is False
    assert body["code"] == "IMAGE_QUALITY_LOW"
    assert body["quality"]["lighting"] == "too_dark"
