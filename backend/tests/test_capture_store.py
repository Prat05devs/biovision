from pathlib import Path

from app.captures.store import CaptureStore


def test_capture_store_preserves_original_and_provenance(tmp_path: Path) -> None:
    store = CaptureStore(tmp_path / "objects", tmp_path / "captures.db")
    image = b"\xff\xd8\xff" + b"original-clinical-frame" + b"\xff\xd9"
    stored = store.save(
        image=image,
        session_id="session_test",
        modality="face_neck",
        anatomical_side="not_applicable",
        mime_type="image/jpeg",
        width=1920,
        height=1080,
        captured_at="2026-09-07T00:00:00Z",
        protocol_version="face-neck-v1",
        source_platform="web",
        quality={"lighting": "good", "positioning": "good", "landmarkCount": 478},
        consent_version="research-captures-and-responses-v2",
        consent_granted_at="2026-09-07T00:00:00Z",
    )

    assert (store.storage_root / stored.object_key).read_bytes() == image
    assert len(stored.sha256) == 64
    assert stored.byte_count == len(image)
    assert stored.duplicate is False

    duplicate = store.save(
        image=image,
        session_id="session_test",
        modality="face_neck",
        anatomical_side="not_applicable",
        mime_type="image/jpeg",
        width=1920,
        height=1080,
        captured_at="2026-09-07T00:00:00Z",
        protocol_version="face-neck-v1",
        source_platform="web",
        quality={"lighting": "good", "positioning": "good"},
        consent_version="research-captures-and-responses-v2",
        consent_granted_at="2026-09-07T00:00:00Z",
    )
    assert duplicate.capture_id == stored.capture_id
    assert duplicate.duplicate is True


def test_bilateral_eye_captures_keep_independent_laterality(tmp_path: Path) -> None:
    store = CaptureStore(tmp_path / "objects", tmp_path / "captures.db")
    image = b"\xff\xd8\xff" + b"same-test-frame" + b"\xff\xd9"

    def save(side: str) -> str:
        return store.save(
            image=image,
            session_id="session_bilateral",
            modality="eye_closeup",
            anatomical_side=side,
            mime_type="image/jpeg",
            width=1280,
            height=960,
            captured_at="2026-09-07T00:00:00Z",
            protocol_version="bilateral-eye-closeup-v1",
            source_platform="web",
            quality={"lighting": "unavailable", "positioning": "unavailable"},
            consent_version="research-captures-and-responses-v2",
            consent_granted_at="2026-09-07T00:00:00Z",
        ).capture_id

    assert save("left") != save("right")


def test_questionnaire_store_preserves_versioned_answer_events(tmp_path: Path) -> None:
    store = CaptureStore(tmp_path / "objects", tmp_path / "captures.db")
    events: list[dict[str, object]] = [
        {
            "questionId": "urgent_symptoms",
            "value": False,
            "answeredAt": "2026-09-07T00:00:01Z",
            "questionBankVersion": "assessment-branching-draft-v2",
        },
        {
            "questionId": "fatigue",
            "value": False,
            "answeredAt": "2026-09-07T00:00:02Z",
            "questionBankVersion": "assessment-branching-draft-v2",
        },
    ]
    stored = store.save_questionnaire(
        session_id="session_questionnaire",
        question_bank_version="assessment-branching-draft-v2",
        started_at="2026-09-07T00:00:00Z",
        completed_at="2026-09-07T00:01:00Z",
        answer_events=events,
        consent_version="research-captures-and-responses-v2",
        consent_granted_at="2026-09-07T00:00:00Z",
    )
    duplicate = store.save_questionnaire(
        session_id="session_questionnaire",
        question_bank_version="assessment-branching-draft-v2",
        started_at="2026-09-07T00:00:00Z",
        completed_at="2026-09-07T00:01:00Z",
        answer_events=events,
        consent_version="research-captures-and-responses-v2",
        consent_granted_at="2026-09-07T00:00:00Z",
    )
    assert len(stored.sha256) == 64
    assert duplicate.response_id == stored.response_id
    assert duplicate.duplicate is True
