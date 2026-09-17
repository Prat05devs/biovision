"""Face-observation signs and their follow-up questions.

A phone photo can show a handful of things that people have looked for on the
face for a very long time: pallor, yellowing of the eyes, darkening under the
eyes or on the lips, breakouts, redness, puffiness. This module records, for
each sign, what traditional systems associate it with and what modern clinical
sources associate it with, and turns confirmed signs into follow-up questions.

The output is a direction to look in, never a diagnosis. Lighting, camera
quality, skin tone and make-up all affect what a photo shows, so a sign is
offered to the person to confirm or reject rather than asserted.
"""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.config import settings


@dataclass(frozen=True)
class Sign:
    id: str
    region: str
    label_key: str
    prompt_key: str
    traditional_key: str
    clinical_key: str
    corroboration: str
    traditional_systems: tuple[str, ...]
    traditional_concept: str
    clinical_citation: str
    follow_ups: tuple[str, ...]
    priority: bool

    def as_payload(self) -> dict[str, object]:
        return {
            "id": self.id,
            "region": self.region,
            "labelKey": self.label_key,
            "promptKey": self.prompt_key,
            "traditionalKey": self.traditional_key,
            "clinicalKey": self.clinical_key,
            "corroboration": self.corroboration,
            "traditionalSystems": list(self.traditional_systems),
            "traditionalConcept": self.traditional_concept,
            "clinicalCitation": self.clinical_citation,
            "priority": self.priority,
        }


@dataclass(frozen=True)
class FollowUpQuestion:
    id: str
    text_key: str
    options: tuple[str, ...]

    def as_payload(self) -> dict[str, object]:
        return {
            "id": self.id,
            "type": "single_choice",
            "textKey": self.text_key,
            "required": True,
            "options": [
                {"value": value, "labelKey": f"observations.options.{value}"}
                for value in self.options
            ],
        }


def _load(path: Path) -> tuple[str, tuple[Sign, ...], dict[str, FollowUpQuestion], str]:
    document: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    questions = {
        str(raw["id"]): FollowUpQuestion(
            id=str(raw["id"]),
            text_key=str(raw["textKey"]),
            options=tuple(str(option) for option in raw["options"]),
        )
        for raw in document["followUpQuestions"]
    }
    levels = set(document["corroborationLevels"])
    systems = set(document["sourceSystems"])
    signs: list[Sign] = []
    seen: set[str] = set()
    for raw in document["signs"]:
        sign_id = str(raw["id"])
        if sign_id in seen:
            raise ValueError(f"Duplicate sign id: {sign_id}")
        if raw["corroboration"] not in levels:
            raise ValueError(f"{sign_id} declares an unknown corroboration level")
        for system in raw["traditionalSystems"]:
            if system not in systems:
                raise ValueError(f"{sign_id} cites an unknown source system: {system}")
        missing = [item for item in raw["followUps"] if item not in questions]
        if missing:
            raise ValueError(f"{sign_id} references unknown follow-up questions: {missing}")
        signs.append(
            Sign(
                id=sign_id,
                region=str(raw["region"]),
                label_key=str(raw["labelKey"]),
                prompt_key=str(raw["promptKey"]),
                traditional_key=str(raw["traditionalKey"]),
                clinical_key=str(raw["clinicalKey"]),
                corroboration=str(raw["corroboration"]),
                traditional_systems=tuple(str(item) for item in raw["traditionalSystems"]),
                traditional_concept=str(raw["traditionalConcept"]),
                clinical_citation=str(raw["clinicalCitation"]),
                follow_ups=tuple(str(item) for item in raw["followUps"]),
                priority=bool(raw.get("priority", False)),
            )
        )
        seen.add(sign_id)
    return str(document["version"]), tuple(signs), questions, str(document["basis"])


SIGNS_VERSION, SIGNS, FOLLOW_UP_QUESTIONS, BASIS = _load(
    settings.config_root / "observations" / "face_signs.v1.json"
)
SIGN_BY_ID = {sign.id: sign for sign in SIGNS}


def validate_signs(confirmed: Sequence[str]) -> None:
    if len(set(confirmed)) != len(confirmed):
        raise ValueError("A sign was confirmed more than once.")
    for sign_id in confirmed:
        if sign_id not in SIGN_BY_ID:
            raise ValueError(f"Unknown sign: {sign_id}")


def follow_ups_for(confirmed: Sequence[str]) -> tuple[FollowUpQuestion, ...]:
    """Questions unlocked by the confirmed signs, priority signs first.

    Signs share questions, so each one is asked at most once however many signs
    pointed at it.
    """

    validate_signs(confirmed)
    ordered = sorted(
        (SIGN_BY_ID[sign_id] for sign_id in confirmed),
        key=lambda sign: (not sign.priority, SIGNS.index(sign)),
    )
    seen: set[str] = set()
    questions: list[FollowUpQuestion] = []
    for sign in ordered:
        for question_id in sign.follow_ups:
            if question_id in seen:
                continue
            seen.add(question_id)
            questions.append(FOLLOW_UP_QUESTIONS[question_id])
    return tuple(questions)


def validate_answers(confirmed: Sequence[str], answers: Mapping[str, str]) -> None:
    unlocked = {question.id: question for question in follow_ups_for(confirmed)}
    for question_id, answer in answers.items():
        question = unlocked.get(question_id)
        if question is None:
            raise ValueError(f"{question_id} was not unlocked by the confirmed signs.")
        if answer not in question.options:
            raise ValueError(f"{question_id} has an unsupported answer.")


@dataclass(frozen=True)
class ObservationProfile:
    signs: tuple[Sign, ...]
    questions: tuple[FollowUpQuestion, ...]
    answered: int
    complete: bool


def profile(confirmed: Sequence[str], answers: Mapping[str, str]) -> ObservationProfile:
    validate_answers(confirmed, answers)
    questions = follow_ups_for(confirmed)
    answered = sum(1 for question in questions if question.id in answers)
    return ObservationProfile(
        signs=tuple(SIGN_BY_ID[sign_id] for sign_id in confirmed),
        questions=questions,
        answered=answered,
        # The observation half alone is never treated as a finished picture.
        complete=answered == len(questions) and bool(confirmed),
    )
