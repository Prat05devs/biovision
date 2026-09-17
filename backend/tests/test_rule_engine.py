import pytest

from app.rules.engine import next_question, questionnaire_assessment, urgent, validate_answers


def test_red_flag_is_always_first() -> None:
    question, done, is_urgent = next_question("low", {})
    assert question is not None and question.id == "urgent_symptoms"
    assert not done
    assert not is_urgent


def test_red_flag_stops_assessment() -> None:
    question, done, is_urgent = next_question("low", {"urgent_symptoms": True})
    assert question is None
    assert done
    assert is_urgent


def test_urgent_symptom_answer_is_urgent() -> None:
    assert urgent({"urgent_symptoms": True})
    assert not urgent({"urgent_symptoms": False})


def test_positive_parent_opens_follow_up_before_next_symptom() -> None:
    question, _, _ = next_question(
        "unavailable", {"urgent_symptoms": False, "fatigue": True}
    )
    assert question is not None and question.id == "fatigue_frequency"
    assert question.follow_up_of == "fatigue"


def test_negative_parent_skips_follow_up_branch() -> None:
    question, _, _ = next_question(
        "unavailable", {"urgent_symptoms": False, "fatigue": False}
    )
    assert question is not None and question.id == "breathlessness"


def test_impossible_branch_answer_is_rejected() -> None:
    with pytest.raises(ValueError, match="not applicable"):
        validate_answers(
            {
                "urgent_symptoms": False,
                "fatigue": False,
                "fatigue_frequency": "every_day",
            }
        )


def test_questionnaire_assessment_returns_guidance_not_disease_label() -> None:
    result = questionnaire_assessment(
        {
            "urgent_symptoms": False,
            "fatigue": True,
            "fatigue_frequency": "every_day",
            "fatigue_duration": "over_6_weeks",
            "fatigue_impact": "limits_activities",
        }
    )
    assert result.level == "prompt_medical_review"
    assert "disease" not in result.level
