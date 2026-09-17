from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.observations import engine

client = TestClient(app)


def test_every_sign_records_both_a_traditional_and_a_clinical_association() -> None:
    for sign in engine.SIGNS:
        assert sign.traditional_systems, f"{sign.id} cites no traditional system"
        assert sign.traditional_concept.strip(), f"{sign.id} has no traditional concept"
        assert sign.clinical_citation.strip(), f"{sign.id} has no clinical correlate"
        assert sign.corroboration == "corroborated"


def test_every_sign_unlocks_at_least_one_question() -> None:
    for sign in engine.SIGNS:
        assert engine.follow_ups_for([sign.id]), f"{sign.id} unlocks nothing to ask"


def test_shared_questions_are_asked_once() -> None:
    # Both signs list sleep_duration and nasal_allergy.
    questions = [question.id for question in engine.follow_ups_for(
        ["periorbital_darkening", "eye_redness"]
    )]
    assert len(questions) == len(set(questions))
    assert "sleep_duration" in questions


def test_priority_signs_are_asked_about_first() -> None:
    questions = [question.id for question in engine.follow_ups_for(
        ["facial_acne", "scleral_yellowing"]
    )]
    assert questions[0] == "urine_colour"


def test_no_confirmed_signs_unlocks_no_questions() -> None:
    assert engine.follow_ups_for([]) == ()


@pytest.mark.parametrize(
    ("confirmed", "answers"),
    [
        (["not_a_sign"], {}),
        (["eye_redness", "eye_redness"], {}),
        # Answering a question that no confirmed sign unlocked.
        (["eye_redness"], {"urine_colour": "dark"}),
        (["eye_redness"], {"sleep_duration": "twelve_hours"}),
    ],
)
def test_invalid_input_is_rejected(confirmed: list[str], answers: dict[str, str]) -> None:
    with pytest.raises(ValueError):
        engine.profile(confirmed, answers)


def test_profile_is_incomplete_until_every_unlocked_question_is_answered() -> None:
    confirmed = ["conjunctival_pallor"]
    questions = engine.follow_ups_for(confirmed)
    partial = engine.profile(confirmed, {questions[0].id: questions[0].options[0]})
    assert partial.complete is False

    full = {question.id: question.options[0] for question in questions}
    assert engine.profile(confirmed, full).complete is True


def test_signs_endpoint_lists_the_catalogue_with_provenance() -> None:
    response = client.get("/v1/observations/signs")
    assert response.status_code == 200
    body = response.json()
    assert body["clinicallyValidated"] is False
    assert body["basis"] == "directional_not_diagnostic"
    pallor = next(sign for sign in body["signs"] if sign["id"] == "conjunctival_pallor")
    assert pallor["traditionalSystems"] == ["ayurveda"]
    assert "Pandu" in pallor["traditionalConcept"]


def test_profile_endpoint_returns_the_first_half_and_its_questions() -> None:
    response = client.post(
        "/v1/observations/profile",
        json={"confirmedSigns": ["periorbital_darkening"], "answers": {}},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["stage"] == "observation_only"
    assert body["complete"] is False
    assert body["questionCount"] == len(body["followUpQuestions"])
    assert body["observedSigns"][0]["id"] == "periorbital_darkening"


def test_profile_endpoint_rejects_an_unlocked_answer() -> None:
    response = client.post(
        "/v1/observations/profile",
        json={"confirmedSigns": ["eye_redness"], "answers": {"salt_intake": "low"}},
    )
    assert response.status_code == 422
