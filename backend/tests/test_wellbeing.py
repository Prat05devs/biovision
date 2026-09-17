from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.wellbeing import engine

client = TestClient(app)

NONE = "not_at_all"
DAILY = "nearly_every_day"
HALF = "more_than_half"

ALL_CLEAR = {
    "wellbeing_interest": NONE,
    "wellbeing_mood": NONE,
    "wellbeing_nervous": NONE,
    "wellbeing_worry_control": NONE,
}


def _answer_until_done(
    answers: dict[str, str],
    severity: int,
    overrides: dict[str, str] | None = None,
) -> dict[str, str]:
    """Drive the stepped screen the way the app does, one question at a time.

    `severity` is the option index, so items that use a different option set
    (the functional-impact question) still receive a valid answer.
    """

    current = dict(answers)
    for _ in range(len(engine.QUESTION_BANK) + 1):
        question, done, _ = engine.next_question(current)
        if done or question is None:
            return current
        assert question.options is not None
        current[question.id] = (overrides or {}).get(
            question.id, question.options[severity].value
        )
    raise AssertionError("The screen did not terminate.")


def test_baseline_screen_asks_only_the_ultra_brief_items() -> None:
    answers = _answer_until_done({}, 0)
    assert set(answers) == set(engine.BASELINE_ITEMS)
    assert len(answers) == 4


def test_negative_screen_reports_monitor_and_no_urgency() -> None:
    result = engine.assess(ALL_CLEAR)
    assert result.level == "monitor"
    assert result.urgent_action_required is False
    assert {scale.id for scale in result.scales} == {"phq2", "gad2"}
    assert all(scale.positive is False for scale in result.scales)


def test_positive_phq2_steps_up_to_phq9() -> None:
    answers = {"wellbeing_interest": HALF, "wellbeing_mood": HALF}
    question, done, urgent = engine.next_question(answers)
    assert done is False and urgent is False
    assert question is not None and question.id == "wellbeing_sleep"


def test_phq2_below_cutoff_does_not_step_up() -> None:
    answers = {"wellbeing_interest": "several_days", "wellbeing_mood": "several_days"}
    question, _, _ = engine.next_question(answers)
    assert question is not None and question.id == "wellbeing_nervous"


def test_positive_gad2_steps_up_to_gad7() -> None:
    answers = {
        "wellbeing_interest": NONE,
        "wellbeing_mood": NONE,
        "wellbeing_nervous": HALF,
        "wellbeing_worry_control": HALF,
    }
    question, _, _ = engine.next_question(answers)
    assert question is not None and question.id == "wellbeing_worry_excess"


def test_full_scale_supersedes_the_screen_it_stepped_up_from() -> None:
    # The risk item is answered "not at all" so the screen runs on to the
    # anxiety scale instead of stopping for crisis support.
    answers = _answer_until_done({}, 2, overrides={"wellbeing_self_harm": NONE})
    result = engine.assess(answers)
    reported = {scale.id for scale in result.scales}
    assert "phq9" in reported and "phq2" not in reported
    assert "gad7" in reported and "gad2" not in reported


def test_endorsed_risk_item_stops_the_screen_and_escalates() -> None:
    answers = {
        "wellbeing_interest": DAILY,
        "wellbeing_mood": DAILY,
        "wellbeing_sleep": NONE,
        "wellbeing_energy": NONE,
        "wellbeing_appetite": NONE,
        "wellbeing_self_worth": NONE,
        "wellbeing_concentration": NONE,
        "wellbeing_psychomotor": NONE,
        "wellbeing_self_harm": "several_days",
    }
    question, done, urgent = engine.next_question(answers)
    assert (question, done, urgent) == (None, True, True)

    result = engine.assess(answers)
    assert result.urgent_action_required is True
    assert result.risk_item_endorsed is True
    assert result.level == "urgent"
    assert result.recommended_care_category_key == "specialties.emergencyCare"


def test_unendorsed_risk_item_does_not_escalate() -> None:
    answers = _answer_until_done({"wellbeing_interest": DAILY, "wellbeing_mood": DAILY}, 0)
    assert answers["wellbeing_self_harm"] == NONE
    result = engine.assess(answers)
    assert result.urgent_action_required is False
    assert result.level in {"monitor", "support_recommended"}


def test_severe_totals_reach_prompt_review_without_risk_endorsement() -> None:
    answers = _answer_until_done({}, 3, overrides={"wellbeing_self_harm": NONE})
    result = engine.assess(answers)
    phq9 = next(scale for scale in result.scales if scale.id == "phq9")
    assert phq9.score == 24
    assert result.urgent_action_required is False
    assert result.level == "prompt_review"


@pytest.mark.parametrize(
    "answers",
    [
        {"unknown_question": NONE},
        {"wellbeing_interest": "maybe"},
        {"wellbeing_interest": True},
        # Gated behind a positive PHQ-2 that was never reached.
        {"wellbeing_interest": NONE, "wellbeing_mood": NONE, "wellbeing_sleep": DAILY},
    ],
)
def test_invalid_answers_are_rejected(answers: dict[str, object]) -> None:
    with pytest.raises(ValueError):
        engine.validate_answers(answers)  # type: ignore[arg-type]


def test_incomplete_screen_cannot_be_scored() -> None:
    with pytest.raises(ValueError):
        engine.assess({"wellbeing_interest": NONE})


def test_empty_screen_cannot_be_scored() -> None:
    """The previous implementation scored an empty submission as 'monitor'."""

    with pytest.raises(ValueError):
        engine.assess({})


def test_screen_endpoint_serves_verified_support_before_any_answer() -> None:
    response = client.get("/v1/wellbeing/screen")
    assert response.status_code == 200
    body = response.json()
    assert body["clinicallyValidated"] is False
    assert body["emergencyNumber"] == "112"
    assert body["riskQuestionId"] == "wellbeing_self_harm"
    telemanas = next(item for item in body["supportResources"] if item["id"] == "telemanas")
    assert telemanas["phone"] == "14416"
    assert telemanas["verified"] is True
    assert telemanas["sourceUrl"].startswith("https://telemanas.mohfw.gov.in")


def test_next_question_endpoint_starts_the_screen() -> None:
    response = client.post("/v1/wellbeing/next-question", json={"answers": {}})
    assert response.status_code == 200
    body = response.json()
    assert body["question"]["id"] == "wellbeing_interest"
    assert body["done"] is False
    assert body["screenVersion"] == engine.SCREEN_VERSION


def test_assessment_endpoint_rejects_an_incomplete_submission() -> None:
    response = client.post("/v1/wellbeing/assessment", json={"answers": {}})
    assert response.status_code == 422


def test_assessment_endpoint_returns_scales_and_support() -> None:
    response = client.post("/v1/wellbeing/assessment", json={"answers": ALL_CLEAR})
    assert response.status_code == 200
    body = response.json()
    assert body["level"] == "monitor"
    assert body["basis"] == "screening_not_diagnosis"
    assert [scale["id"] for scale in body["scales"]] == ["phq2", "gad2"]
    assert any(item["id"] == "telemanas" for item in body["supportResources"])


def test_risk_endorsement_takes_priority_over_finishing_the_screen() -> None:
    """Crisis support outranks completing the anxiety scale."""

    answers = _answer_until_done({}, 2)
    assert answers["wellbeing_self_harm"] == HALF
    assert "wellbeing_nervous" not in answers
    result = engine.assess(answers)
    assert result.level == "urgent"
    assert {scale.id for scale in result.scales} == {"phq9"}
