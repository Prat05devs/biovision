from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Signal = Literal["low", "moderate", "elevated", "unavailable"]
Quality = Literal["good", "poor", "unavailable"]
Answer = str | bool | int | float


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=lambda value: _to_camel(value), populate_by_name=True)


def _to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class QuestionRequest(CamelModel):
    session_id: Annotated[str, Field(min_length=3, max_length=128)]
    anemia_signal: Signal
    answers: Annotated[dict[str, Answer], Field(max_length=24)] = Field(default_factory=dict)


class QuestionOption(CamelModel):
    value: str
    label_key: str


class Question(CamelModel):
    id: str
    type: Literal["yes_no", "single_choice"]
    text_key: str
    required: bool = True
    options: list[QuestionOption] | None = None
    section_key: str | None = None
    follow_up_of: str | None = None


class NextQuestionResponse(CamelModel):
    question: Question | None = None
    done: bool
    urgent_action_required: bool
    config_version: str


class ScreeningInput(CamelModel):
    anemia_signal: Signal


class CompleteAssessmentRequest(CamelModel):
    session_id: Annotated[str, Field(min_length=3, max_length=128)]
    screening: ScreeningInput
    answers: Annotated[dict[str, Answer], Field(max_length=24)]


class ResearchAnswerEvent(CamelModel):
    question_id: Annotated[str, Field(min_length=1, max_length=128)]
    value: Answer
    answered_at: datetime
    question_bank_version: Annotated[str, Field(min_length=1, max_length=128)]


class ResearchQuestionnaireRequest(CamelModel):
    session_id: Annotated[str, Field(min_length=8, max_length=128)]
    research_consent: bool
    consent_version: Annotated[str, Field(min_length=1, max_length=128)]
    consent_granted_at: datetime
    question_bank_version: Annotated[str, Field(min_length=1, max_length=128)]
    started_at: datetime
    completed_at: datetime
    answer_events: Annotated[list[ResearchAnswerEvent], Field(min_length=1, max_length=24)]


class WellbeingRequest(CamelModel):
    answers: Annotated[dict[str, Answer], Field(max_length=18)] = Field(default_factory=dict)


class WellbeingNextQuestionResponse(CamelModel):
    question: Question | None = None
    done: bool
    urgent_action_required: bool
    answered_count: int
    unlocked_count: int
    screen_version: str


class ObservationProfileRequest(CamelModel):
    confirmed_signs: Annotated[list[str], Field(max_length=16)] = Field(default_factory=list)
    answers: Annotated[dict[str, str], Field(max_length=32)] = Field(default_factory=dict)
