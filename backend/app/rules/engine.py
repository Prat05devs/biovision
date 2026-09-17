from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.config import settings
from app.schemas import Answer, Question, QuestionOption, Signal


@dataclass(frozen=True)
class DisplayCondition:
    question_id: str
    equals: Answer


@dataclass(frozen=True)
class BankItem:
    question: Question
    red_flag: bool = False
    show_if: DisplayCondition | None = None


@dataclass(frozen=True)
class QuestionnaireAssessment:
    level: str
    summary_key: str
    evidence_keys: tuple[str, ...]


def _load_question_bank(path: Path) -> tuple[str, tuple[BankItem, ...], int]:
    document: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    items: list[BankItem] = []
    known_ids: set[str] = set()
    for raw in document["questions"]:
        question_id = str(raw["id"])
        if question_id in known_ids:
            raise ValueError(f"Duplicate question id: {question_id}")
        condition_raw = raw.get("showIf")
        condition = None
        if condition_raw:
            parent_id = str(condition_raw["questionId"])
            if parent_id not in known_ids:
                raise ValueError(f"{question_id} must follow its parent question {parent_id}")
            condition = DisplayCondition(parent_id, condition_raw["equals"])
        options = raw.get("options")
        question = Question(
            id=question_id,
            type=raw["type"],
            text_key=raw["textKey"],
            required=True,
            options=[QuestionOption.model_validate(option) for option in options] if options else None,
            section_key=raw.get("sectionKey"),
            follow_up_of=condition.question_id if condition else None,
        )
        items.append(
            BankItem(
                question=question,
                red_flag=bool(raw.get("redFlag", False)),
                show_if=condition,
            )
        )
        known_ids.add(question_id)
    if not items or not items[0].red_flag:
        raise ValueError("The question bank must start with a red-flag question")
    maximum_answers = int(document["limits"]["maximumAnswers"])
    if maximum_answers < len(items):
        raise ValueError("maximumAnswers must cover every possible question branch")
    return str(document["version"]), tuple(items), maximum_answers


QUESTION_BANK_VERSION, QUESTION_BANK, MAXIMUM_ANSWERS = _load_question_bank(
    settings.config_root / "questions" / "anemia_assessment.v2.json"
)
QUESTION_BY_ID = {item.question.id: item for item in QUESTION_BANK}


def prior_probability(signal: Signal) -> float:
    """Retained for compatibility and never presented as a diagnosis."""

    return {"low": 0.15, "moderate": 0.45, "elevated": 0.75, "unavailable": 0.35}[signal]


def _eligible(item: BankItem, answers: Mapping[str, Answer]) -> bool:
    condition = item.show_if
    return condition is None or answers.get(condition.question_id) == condition.equals


def validate_answers(answers: Mapping[str, Answer]) -> None:
    if len(answers) > MAXIMUM_ANSWERS:
        raise ValueError("Too many questionnaire answers.")
    for question_id, answer in answers.items():
        item = QUESTION_BY_ID.get(question_id)
        if item is None:
            raise ValueError(f"Unknown question id: {question_id}")
        question = item.question
        if question.type == "yes_no":
            if not isinstance(answer, bool):
                raise ValueError(f"{question_id} requires a yes/no answer.")
        else:
            allowed = {option.value for option in question.options or []}
            if not isinstance(answer, str) or answer not in allowed:
                raise ValueError(f"{question_id} has an unsupported answer.")
        if item.show_if:
            parent_id = item.show_if.question_id
            if parent_id not in answers:
                raise ValueError(f"{question_id} was answered before {parent_id}.")
            if not _eligible(item, answers):
                raise ValueError(f"{question_id} is not applicable to these answers.")


def posterior_probability(signal: Signal, answers: Mapping[str, Answer]) -> float:
    """Compatibility value; no unvalidated symptom likelihood ratios are applied."""

    validate_answers(answers)
    return prior_probability(signal)


def urgent(answers: Mapping[str, Answer]) -> bool:
    return answers.get("urgent_symptoms") is True


def next_question(
    signal: Signal,
    answers: Mapping[str, Answer],
) -> tuple[Question | None, bool, bool]:
    del signal  # Branch selection remains useful when the image model abstains.
    validate_answers(answers)
    red_flag = QUESTION_BANK[0]
    if red_flag.question.id not in answers:
        return red_flag.question, False, False
    if urgent(answers):
        return None, True, True

    # Ordered depth-first branches characterize a reported symptom completely,
    # then move to the next symptom. A negative parent skips its follow-ups.
    for item in QUESTION_BANK[1:]:
        if item.question.id not in answers and _eligible(item, answers):
            return item.question, False, False
    return None, True, False


def questionnaire_assessment(answers: Mapping[str, Answer]) -> QuestionnaireAssessment:
    """Return care-oriented guidance, never a disease label."""

    validate_answers(answers)
    evidence: list[str] = []
    if answers.get("fatigue") is True:
        evidence.append("result.questionnaireEvidence.fatigue")
    if answers.get("breathlessness") is True:
        evidence.append("result.questionnaireEvidence.breathlessness")

    prompt_review = (
        answers.get("fatigue_impact") == "limits_activities"
        or answers.get("breathlessness_trigger") == "minimal_activity"
        or answers.get("breathlessness_onset") == "sudden"
    )
    follow_up = bool(evidence) and (
        answers.get("fatigue_duration") in {"two_to_six_weeks", "over_6_weeks"}
        or answers.get("breathlessness_duration") in {"two_to_six_weeks", "over_6_weeks"}
        or answers.get("fatigue_frequency") in {"most_days", "every_day"}
        or answers.get("breathlessness_trigger") == "usual_activity"
    )
    if prompt_review:
        return QuestionnaireAssessment(
            "prompt_medical_review",
            "result.questionnaireSummary.prompt",
            tuple(evidence),
        )
    if follow_up or evidence:
        return QuestionnaireAssessment(
            "follow_up_recommended",
            "result.questionnaireSummary.followUp",
            tuple(evidence),
        )
    return QuestionnaireAssessment(
        "no_specific_concern",
        "result.questionnaireSummary.noSpecificConcern",
        (),
    )
