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


def test_research_capture_is_closed_until_governance_enables_collection() -> None:
    response = client.post(
        "/v1/captures",
        files={"image": ("capture.jpg", b"\xff\xd8\xffimage\xff\xd9", "image/jpeg")},
        data={
            "sessionId": "session_test",
            "modality": "face_neck",
            "capturedAt": "2026-09-07T00:00:00Z",
            "protocolVersion": "face-neck-v1",
            "sourcePlatform": "web",
            "anatomicalSide": "not_applicable",
            "width": "1920",
            "height": "1080",
            "researchConsent": "true",
            "consentVersion": "research-captures-and-responses-v2",
            "consentGrantedAt": "2026-09-07T00:00:00Z",
            "qualityJson": '{"lighting":"good","positioning":"good"}',
        },
    )
    assert response.status_code == 503


def test_research_questionnaire_is_closed_until_governance_enables_collection() -> None:
    response = client.post(
        "/v1/research/questionnaire",
        json={
            "sessionId": "session_test",
            "researchConsent": True,
            "consentVersion": "research-captures-and-responses-v2",
            "consentGrantedAt": "2026-09-07T00:00:00Z",
            "questionBankVersion": "assessment-branching-draft-v2",
            "startedAt": "2026-09-07T00:00:00Z",
            "completedAt": "2026-09-07T00:01:00Z",
            "answerEvents": [
                {
                    "questionId": "urgent_symptoms",
                    "value": True,
                    "answeredAt": "2026-09-07T00:00:01Z",
                    "questionBankVersion": "assessment-branching-draft-v2",
                }
            ],
        },
    )
    assert response.status_code == 503


def test_adaptive_question_contract_and_urgent_stop() -> None:
    base = {
        "sessionId": "session_test",
        "anemiaSignal": "unavailable",
        "answers": {},
    }
    first = client.post("/v1/assessment/next-question", json=base)
    assert first.status_code == 200
    assert first.json()["question"]["id"] == "urgent_symptoms"

    urgent_payload = {**base, "answers": {"urgent_symptoms": True}}
    stopped = client.post("/v1/assessment/next-question", json=urgent_payload)
    assert stopped.status_code == 200
    assert stopped.json()["done"] is True
    assert stopped.json()["urgentActionRequired"] is True


def test_completion_keeps_unavailable_image_signal() -> None:
    response = client.post(
        "/v1/assessment/complete",
        json={
            "sessionId": "session_test",
            "screening": {"anemiaSignal": "unavailable"},
            "answers": {
                "urgent_symptoms": False,
                "fatigue": True,
                "fatigue_frequency": "most_days",
                "fatigue_duration": "over_6_weeks",
                "fatigue_impact": "slows_activities",
                "breathlessness": True,
                "breathlessness_trigger": "usual_activity",
                "breathlessness_onset": "gradual",
                "breathlessness_duration": "two_to_six_weeks",
                "recent_cbc": "never",
                "family_history": False,
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["screeningResult"]["signal"] == "unavailable"
    assert body["questionnaireAssessment"]["level"] == "follow_up_recommended"
    assert body["decisionSupport"]["clinicallyValidated"] is False
    assert body["explanation"]["whatWasObservedKey"] == "result.observedUnavailable"
    assert body["explanation"]["whyItMayMatterKey"] == "result.whyQuestionnaireOnly"


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
