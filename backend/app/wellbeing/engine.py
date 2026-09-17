"""Stepped mental-wellbeing symptom screen.

The screen administers PHQ-2 and GAD-2 to everyone and steps up to the full
PHQ-9 / GAD-7 only when the ultra-brief screen is positive, which is how those
instruments were validated. Scores are symptom severity, never a diagnosis, and
the self-harm item stops the screen and routes to crisis support.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.config import settings
from app.schemas import Answer, Question, QuestionOption


@dataclass(frozen=True)
class ScoreCondition:
    scale: str
    at_or_above: int


@dataclass(frozen=True)
class BankItem:
    question: Question
    option_scores: dict[str, int]
    show_if_any: tuple[ScoreCondition, ...]
    excluded_from_scales: bool


@dataclass(frozen=True)
class Band:
    minimum: int
    level: str
    label_key: str


@dataclass(frozen=True)
class Scale:
    id: str
    label_key: str
    items: tuple[str, ...]
    maximum_score: int
    positive_at_or_above: int
    bands: tuple[Band, ...]

    def band_for(self, score: int) -> Band:
        chosen = self.bands[0]
        for band in self.bands:
            if score >= band.minimum:
                chosen = band
        return chosen


@dataclass(frozen=True)
class RiskItem:
    question_id: str
    endorsed_at_or_above: int
    stops_questionnaire: bool


@dataclass(frozen=True)
class ScaleResult:
    id: str
    label_key: str
    score: int
    maximum_score: int
    band_label_key: str
    level: str
    positive: bool


@dataclass(frozen=True)
class WellbeingAssessment:
    urgent_action_required: bool
    risk_item_endorsed: bool
    level: str
    message_key: str
    recommended_care_category_key: str | None
    scales: tuple[ScaleResult, ...]


# Ordered least to most concerning; the overall level is the highest reached.
_LEVEL_ORDER = ("monitor", "support_recommended", "prompt_review", "urgent")

_LEVEL_MESSAGE_KEYS = {
    "monitor": "wellbeing.monitor",
    "support_recommended": "wellbeing.support",
    "prompt_review": "wellbeing.promptReview",
    "urgent": "wellbeing.urgent",
}

_LEVEL_CARE_KEYS: dict[str, str | None] = {
    "monitor": None,
    "support_recommended": "specialties.counsellor",
    "prompt_review": "specialties.mentalHealthProfessional",
    "urgent": "specialties.emergencyCare",
}


def _parse_conditions(raw: dict[str, Any], known_scales: set[str], question_id: str) -> tuple[ScoreCondition, ...]:
    single = raw.get("showIfScore")
    many = raw.get("showIfAnyScore")
    if single and many:
        raise ValueError(f"{question_id} may not set both showIfScore and showIfAnyScore")
    entries = [single] if single else list(many or [])
    conditions: list[ScoreCondition] = []
    for entry in entries:
        scale = str(entry["scale"])
        if scale not in known_scales:
            raise ValueError(f"{question_id} gates on an unknown scale: {scale}")
        conditions.append(ScoreCondition(scale, int(entry["atOrAbove"])))
    return tuple(conditions)


def _load_bank(
    path: Path,
) -> tuple[str, tuple[BankItem, ...], dict[str, Scale], RiskItem, int, int]:
    document: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    option_sets: dict[str, list[dict[str, Any]]] = document["optionSets"]

    scales: dict[str, Scale] = {}
    for scale_id, raw in document["scales"].items():
        bands = tuple(
            Band(int(band["minimum"]), str(band["level"]), str(band["labelKey"]))
            for band in raw["bands"]
        )
        if not bands or bands[0].minimum != 0:
            raise ValueError(f"Scale {scale_id} must define a band starting at 0")
        if any(band.level not in _LEVEL_ORDER for band in bands):
            raise ValueError(f"Scale {scale_id} uses an unknown guidance level")
        if list(bands) != sorted(bands, key=lambda band: band.minimum):
            raise ValueError(f"Scale {scale_id} bands must ascend by minimum")
        scales[scale_id] = Scale(
            id=scale_id,
            label_key=str(raw["labelKey"]),
            items=tuple(str(item) for item in raw["items"]),
            maximum_score=int(raw["maximumScore"]),
            positive_at_or_above=int(raw["positiveAtOrAbove"]),
            bands=bands,
        )

    items: list[BankItem] = []
    known_ids: set[str] = set()
    for raw in document["questions"]:
        question_id = str(raw["id"])
        if question_id in known_ids:
            raise ValueError(f"Duplicate question id: {question_id}")
        options = option_sets[str(raw["optionSet"])]
        question = Question(
            id=question_id,
            type=raw["type"],
            text_key=raw["textKey"],
            required=True,
            options=[
                QuestionOption(value=str(option["value"]), label_key=str(option["labelKey"]))
                for option in options
            ],
            section_key=raw.get("sectionKey"),
        )
        items.append(
            BankItem(
                question=question,
                option_scores={str(option["value"]): int(option["score"]) for option in options},
                show_if_any=_parse_conditions(raw, set(scales), question_id),
                excluded_from_scales=bool(raw.get("excludedFromScales", False)),
            )
        )
        known_ids.add(question_id)

    for scale in scales.values():
        missing = [item for item in scale.items if item not in known_ids]
        if missing:
            raise ValueError(f"Scale {scale.id} references unknown items: {missing}")

    risk_raw = document["riskItem"]
    risk = RiskItem(
        question_id=str(risk_raw["questionId"]),
        endorsed_at_or_above=int(risk_raw["endorsedWhenScoreAtOrAbove"]),
        stops_questionnaire=bool(risk_raw["stopsQuestionnaire"]),
    )
    if risk.question_id not in known_ids:
        raise ValueError("The configured risk item is not in the question bank")

    maximum_answers = int(document["limits"]["maximumAnswers"])
    if maximum_answers < len(items):
        raise ValueError("maximumAnswers must cover every possible question branch")
    return (
        str(document["version"]),
        tuple(items),
        scales,
        risk,
        maximum_answers,
        int(document["recallPeriodDays"]),
    )


(
    SCREEN_VERSION,
    QUESTION_BANK,
    SCALES,
    RISK_ITEM,
    MAXIMUM_ANSWERS,
    RECALL_PERIOD_DAYS,
) = _load_bank(settings.config_root / "wellbeing" / "wellbeing_screen.v1.json")

QUESTION_BY_ID = {item.question.id: item for item in QUESTION_BANK}

# Every scale's gating items precede the items it unlocks, so a step-up decision
# is always resolvable by the time the gated question is reached.
BASELINE_ITEMS = tuple(item.question.id for item in QUESTION_BANK if not item.show_if_any)


def _item_score(question_id: str, answers: Mapping[str, Answer]) -> int | None:
    answer = answers.get(question_id)
    if answer is None:
        return None
    return QUESTION_BY_ID[question_id].option_scores.get(str(answer))


def scale_score(scale_id: str, answers: Mapping[str, Answer]) -> int | None:
    """Total for a scale, or None until every one of its items is answered."""

    total = 0
    for question_id in SCALES[scale_id].items:
        score = _item_score(question_id, answers)
        if score is None:
            return None
        total += score
    return total


def _eligible(item: BankItem, answers: Mapping[str, Answer]) -> bool:
    if not item.show_if_any:
        return True
    for condition in item.show_if_any:
        score = scale_score(condition.scale, answers)
        if score is not None and score >= condition.at_or_above:
            return True
    return False


def risk_endorsed(answers: Mapping[str, Answer]) -> bool:
    score = _item_score(RISK_ITEM.question_id, answers)
    return score is not None and score >= RISK_ITEM.endorsed_at_or_above


def validate_answers(answers: Mapping[str, Answer]) -> None:
    if len(answers) > MAXIMUM_ANSWERS:
        raise ValueError("Too many wellbeing answers.")
    for question_id, answer in answers.items():
        item = QUESTION_BY_ID.get(question_id)
        if item is None:
            raise ValueError(f"Unknown question id: {question_id}")
        if not isinstance(answer, str) or answer not in item.option_scores:
            raise ValueError(f"{question_id} has an unsupported answer.")
    # Check applicability only after every value is known to be scoreable, so an
    # invalid answer cannot make a gated question look eligible.
    for question_id in answers:
        if not _eligible(QUESTION_BY_ID[question_id], answers):
            raise ValueError(f"{question_id} is not applicable to these answers.")


def next_question(answers: Mapping[str, Answer]) -> tuple[Question | None, bool, bool]:
    validate_answers(answers)
    if RISK_ITEM.stops_questionnaire and risk_endorsed(answers):
        return None, True, True
    for item in QUESTION_BANK:
        if item.question.id not in answers and _eligible(item, answers):
            return item.question, False, False
    return None, True, False


def assess(answers: Mapping[str, Answer]) -> WellbeingAssessment:
    """Return severity bands and care guidance. Never a diagnosis."""

    pending, done, _ = next_question(answers)
    if not done:
        raise ValueError(
            f"The wellbeing screen is incomplete; answer {pending.id if pending else 'the next question'}."
        )

    endorsed = risk_endorsed(answers)
    results: list[ScaleResult] = []
    for scale in SCALES.values():
        score = scale_score(scale.id, answers)
        if score is None:
            # The screen did not step up to this scale; reporting a partial
            # total would misrepresent an instrument that is scored whole.
            continue
        band = scale.band_for(score)
        results.append(
            ScaleResult(
                id=scale.id,
                label_key=scale.label_key,
                score=score,
                maximum_score=scale.maximum_score,
                band_label_key=band.label_key,
                level=band.level,
                positive=score >= scale.positive_at_or_above,
            )
        )

    # A full-scale total supersedes the ultra-brief screen it stepped up from.
    superseded = {"phq2": "phq9", "gad2": "gad7"}
    reported_ids = {result.id for result in results}
    results = [
        result
        for result in results
        if superseded.get(result.id) not in reported_ids
    ]
    level_rank = max(
        (_LEVEL_ORDER.index(result.level) for result in results),
        default=0,
    )

    if endorsed:
        level_rank = _LEVEL_ORDER.index("urgent")
    level = _LEVEL_ORDER[level_rank]

    return WellbeingAssessment(
        urgent_action_required=endorsed,
        risk_item_endorsed=endorsed,
        level=level,
        message_key=_LEVEL_MESSAGE_KEYS[level],
        recommended_care_category_key=_LEVEL_CARE_KEYS[level],
        scales=tuple(results),
    )
