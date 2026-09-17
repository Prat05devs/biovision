from __future__ import annotations

import json
import re
from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.captures.image_validation import ImageValidationError, validate_jpeg
from app.captures.quality import assess_capture
from app.captures.store import CaptureStore
from app.care.directory import load_directory
from app.config import settings
from app.inference.registry import model_registry
from app.observations import engine as observations_engine
from app.rules.engine import (
    QUESTION_BANK_VERSION,
    next_question,
    questionnaire_assessment,
    urgent,
    validate_answers,
)
from app.rules.hemoglobin import ScreeningProfile, eyes_disagree, interpret_hemoglobin
from app.schemas import (
    Answer,
    CompleteAssessmentRequest,
    NextQuestionResponse,
    ObservationProfileRequest,
    QuestionRequest,
    ResearchQuestionnaireRequest,
    WellbeingNextQuestionResponse,
    WellbeingRequest,
)
from app.wellbeing import engine as wellbeing_engine
from app.wellbeing import resources as wellbeing_resources

router = APIRouter(prefix="/v1")
capture_store = CaptureStore(settings.capture_storage_root, settings.capture_db_path)
SAFE_IDENTIFIER = re.compile(r"^[A-Za-z0-9_-]{8,128}$")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


@router.post("/screenings/anemia")
async def analyze_anemia(
    left_image: Annotated[UploadFile, File(alias="leftImage")],
    right_image: Annotated[UploadFile, File(alias="rightImage")],
    session_id: Annotated[str, Form(alias="sessionId")],
    age_years: Annotated[int | None, Form(alias="ageYears", ge=1, le=120)] = None,
    sex: Annotated[Literal["female", "male"] | None, Form()] = None,
    pregnant: Annotated[bool, Form()] = False,
) -> dict[str, object]:
    if not SAFE_IDENTIFIER.fullmatch(session_id):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid session identifier.")
    if (age_years is None) != (sex is None):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "ageYears and sex must be sent together.")
    if pregnant and sex != "female":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Pregnancy requires sex=female.")
    captures: list[bytes] = []
    for upload in (left_image, right_image):
        if upload.content_type != "image/jpeg":
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "JPEG captures required.")
        content = await upload.read(settings.max_capture_bytes + 1)
        if not content:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "A capture is empty.")
        if len(content) > settings.max_capture_bytes:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "A capture is too large.")
        try:
            validate_jpeg(content)
        except ImageValidationError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        captures.append(content)

    exposures = [assess_capture(capture) for capture in captures]
    rejected = next((exposure for exposure in exposures if not exposure.acceptable), None)
    if rejected is not None:
        return {
            "success": False,
            "code": "IMAGE_QUALITY_LOW",
            "message": "An eye photo is too dark or too bright. Retake it in even, indirect light.",
            "quality": {
                "acceptable": False,
                "lighting": rejected.lighting,
                "sharpness": "unavailable",
                "regionDetected": False,
            },
            "modelVersion": None,
        }

    prediction = model_registry.get("anemia").predict(captures[0], captures[1])
    measurements = prediction.measurements or {}
    if eyes_disagree(measurements.get("leftHemoglobinGdl"), measurements.get("rightHemoglobinGdl")):
        return {
            "success": False,
            "code": "IMAGE_QUALITY_LOW",
            "message": "The two eye photos gave very different readings. Please retake both in even light.",
            "quality": {
                "acceptable": False,
                "lighting": "good",
                "sharpness": prediction.quality.sharpness,
                "regionDetected": prediction.quality.region_detected,
            },
            "modelVersion": prediction.model_version,
        }
    signal = prediction.signal
    observations = list(prediction.observations)
    hemoglobin = measurements.get("estimatedHemoglobinGdl")
    if age_years is not None and sex is not None and hemoglobin is not None and signal != "unavailable":
        interpretation = interpret_hemoglobin(
            hemoglobin, ScreeningProfile(age_years=age_years, sex=sex, pregnant=pregnant)
        )
        signal = interpretation.signal
        observations.extend(interpretation.observations)
        measurements = {**measurements, "hemoglobinThresholdGdl": interpretation.reference.threshold_gdl}
    elif signal != "unavailable":
        observations.append("profile_not_provided")
    screening: dict[str, object] = {
        "type": "anemia",
        "signal": signal,
        "observations": observations,
    }
    if prediction.confidence is not None:
        screening["confidence"] = prediction.confidence
    if prediction.measurements is not None:
        screening["measurements"] = measurements
    # The registered default deliberately abstains until an approved artifact replaces it.
    return {
        "success": True,
        "screening": screening,
        "quality": {
            "acceptable": prediction.quality.acceptable,
            "lighting": "good",
            "sharpness": prediction.quality.sharpness,
            "regionDetected": prediction.quality.region_detected,
        },
        "modelVersion": prediction.model_version,
        "configVersion": settings.clinical_config_version,
    }


@router.post("/captures", status_code=status.HTTP_201_CREATED)
async def retain_research_capture(
    image: Annotated[UploadFile, File()],
    session_id: Annotated[str, Form(alias="sessionId")],
    modality: Annotated[str, Form()],
    captured_at: Annotated[str, Form(alias="capturedAt")],
    protocol_version: Annotated[str, Form(alias="protocolVersion")],
    source_platform: Annotated[str, Form(alias="sourcePlatform")],
    anatomical_side: Annotated[str, Form(alias="anatomicalSide")],
    width: Annotated[int, Form(gt=0, le=20_000)],
    height: Annotated[int, Form(gt=0, le=20_000)],
    research_consent: Annotated[bool, Form(alias="researchConsent")],
    consent_version: Annotated[str, Form(alias="consentVersion")],
    consent_granted_at: Annotated[str, Form(alias="consentGrantedAt")],
    quality_json: Annotated[str, Form(alias="qualityJson")],
) -> dict[str, object]:
    if not settings.research_collection_enabled:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Research collection is disabled until governance approval is recorded.",
        )
    if not research_consent:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Explicit research consent is required.")
    if not SAFE_IDENTIFIER.fullmatch(session_id):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid session identifier.")
    if modality not in {"face_neck", "eye_closeup"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unsupported capture modality.")
    expected_sides = {"face_neck": {"not_applicable"}, "eye_closeup": {"left", "right"}}
    if anatomical_side not in expected_sides[modality]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Anatomical side does not match the capture modality.",
        )
    if image.content_type != "image/jpeg":
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "JPEG capture required.")

    content = await image.read(settings.max_capture_bytes + 1)
    if not content or not content.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid JPEG capture.")
    if len(content) > settings.max_capture_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "The capture is too large.")

    try:
        decoded = validate_jpeg(
            content,
            declared_width=width,
            declared_height=height,
        )
    except ImageValidationError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error

    try:
        quality = json.loads(quality_json)
    except json.JSONDecodeError as error:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid quality metadata."
        ) from error
    if not isinstance(quality, dict):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Quality metadata must be an object.")
    quality.pop("serverValidation", None)
    quality["serverValidation"] = {
        "jpegDecoded": True,
        "encodedWidth": decoded.width,
        "encodedHeight": decoded.height,
        "colorMode": decoded.color_mode,
        "exifOrientation": decoded.exif_orientation,
    }

    stored = capture_store.save(
        image=content,
        session_id=session_id,
        modality=modality,
        anatomical_side=anatomical_side,
        mime_type=image.content_type,
        width=width,
        height=height,
        captured_at=captured_at,
        protocol_version=protocol_version,
        source_platform=source_platform,
        quality=quality,
        consent_version=consent_version,
        consent_granted_at=consent_granted_at,
    )
    return {
        "captureId": stored.capture_id,
        "sha256": stored.sha256,
        "byteCount": stored.byte_count,
        "duplicate": stored.duplicate,
        "retentionPurpose": "model_research",
    }


@router.post("/assessment/next-question", response_model=NextQuestionResponse)
async def assessment_next_question(payload: QuestionRequest) -> NextQuestionResponse:
    try:
        validate_answers(payload.answers)
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error
    question, done, is_urgent = next_question(
        payload.anemia_signal,
        payload.answers,
    )
    return NextQuestionResponse(
        question=question,
        done=done,
        urgent_action_required=is_urgent,
        config_version=settings.clinical_config_version,
    )


@router.post("/research/questionnaire", status_code=status.HTTP_201_CREATED)
async def retain_research_questionnaire(
    payload: ResearchQuestionnaireRequest,
) -> dict[str, object]:
    if not settings.research_collection_enabled:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Research collection is disabled until governance approval is recorded.",
        )
    if not payload.research_consent:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Explicit research consent is required.")
    if not SAFE_IDENTIFIER.fullmatch(payload.session_id):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid session identifier.")
    if payload.question_bank_version != QUESTION_BANK_VERSION:
        raise HTTPException(status.HTTP_409_CONFLICT, "Question bank version is not accepted.")

    timestamps = [
        payload.consent_granted_at,
        payload.started_at,
        payload.completed_at,
        *(event.answered_at for event in payload.answer_events),
    ]
    if any(value.tzinfo is None for value in timestamps):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Timestamps must include a timezone.")
    if payload.completed_at < payload.started_at:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid questionnaire time range.")

    replay: dict[str, Answer] = {}
    previous_answered_at = payload.started_at
    for event in payload.answer_events:
        if event.question_bank_version != QUESTION_BANK_VERSION:
            raise HTTPException(status.HTTP_409_CONFLICT, "Answer event version mismatch.")
        if not previous_answered_at <= event.answered_at <= payload.completed_at:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Answer timestamps are out of order.")
        expected, done, _ = next_question("unavailable", replay)
        if done or expected is None or expected.id != event.question_id:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Answer sequence does not match the question branch.",
            )
        replay[event.question_id] = event.value
        previous_answered_at = event.answered_at

    _, done, _ = next_question("unavailable", replay)
    if not done:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Questionnaire is incomplete.")

    stored = capture_store.save_questionnaire(
        session_id=payload.session_id,
        question_bank_version=payload.question_bank_version,
        started_at=payload.started_at.isoformat(),
        completed_at=payload.completed_at.isoformat(),
        answer_events=[
            event.model_dump(mode="json", by_alias=True) for event in payload.answer_events
        ],
        consent_version=payload.consent_version,
        consent_granted_at=payload.consent_granted_at.isoformat(),
    )
    return {
        "questionnaireResponseId": stored.response_id,
        "sha256": stored.sha256,
        "duplicate": stored.duplicate,
        "retentionPurpose": "model_research",
    }


@router.post("/assessment/complete")
async def complete_assessment(payload: CompleteAssessmentRequest) -> dict[str, object]:
    try:
        validate_answers(payload.answers)
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error
    is_urgent = urgent(payload.answers)
    pending_question, done, _ = next_question(
        payload.screening.anemia_signal,
        payload.answers,
    )
    if not done:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Assessment is incomplete; answer {pending_question.id if pending_question else 'the next question'}.",
        )
    questionnaire = questionnaire_assessment(payload.answers)
    signal = payload.screening.anemia_signal
    if signal == "unavailable":
        # Questionnaire context can guide care, but must not masquerade as an image result.
        result_signal = "unavailable"
    else:
        result_signal = signal
    image_signal_available = result_signal != "unavailable"
    return {
        "assessmentId": f"assessment_{payload.session_id}",
        "urgentActionRequired": is_urgent,
        "screeningResult": {
            "signal": result_signal,
            "labelKey": f"result.signal.{result_signal}",
        },
        "questionnaireAssessment": {
            "level": questionnaire.level,
            "summaryKey": questionnaire.summary_key,
            "evidenceKeys": list(questionnaire.evidence_keys),
        },
        "explanation": {
            "whatWasObservedKey": (
                "result.observed" if image_signal_available else "result.observedUnavailable"
            ),
            "whyItMayMatterKey": (
                "result.why" if image_signal_available else "result.whyQuestionnaireOnly"
            ),
        },
        "recommendedTest": {"nameKey": "result.test"},
        "recommendedCare": {"categoryKey": "result.physician"},
        "urgent": {"messageKey": "emergency.message", "phone": "112"} if is_urgent else None,
        "decisionSupport": {
            "questionBankVersion": QUESTION_BANK_VERSION,
            "basis": "care_guidance_not_diagnosis",
            "clinicallyValidated": False,
        },
        "configVersion": settings.clinical_config_version,
    }


@router.get("/healthcare/facilities")
async def facilities(region: str | None = None) -> dict[str, object]:
    try:
        return load_directory(region)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


def _support_payload() -> dict[str, object]:
    region = wellbeing_resources.region()
    return {
        "region": region.code,
        "emergencyNumber": region.emergency_number,
        "directoryVersion": wellbeing_resources.DIRECTORY_VERSION,
        "supportResources": [item.as_payload() for item in region.resources],
    }


@router.get("/wellbeing/screen")
async def wellbeing_screen() -> dict[str, object]:
    """Screen metadata plus crisis support.

    Support contacts are served before any question is answered so that help is
    reachable from every screen without first producing a score.
    """

    return {
        "screenVersion": wellbeing_engine.SCREEN_VERSION,
        "recallPeriodDays": wellbeing_engine.RECALL_PERIOD_DAYS,
        "baselineQuestionCount": len(wellbeing_engine.BASELINE_ITEMS),
        "maximumQuestionCount": len(wellbeing_engine.QUESTION_BANK),
        "riskQuestionId": wellbeing_engine.RISK_ITEM.question_id,
        "basis": "screening_not_diagnosis",
        "clinicallyValidated": False,
        **_support_payload(),
    }


@router.post("/wellbeing/next-question", response_model=WellbeingNextQuestionResponse)
async def wellbeing_next_question(payload: WellbeingRequest) -> WellbeingNextQuestionResponse:
    try:
        question, done, is_urgent = wellbeing_engine.next_question(payload.answers)
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error
    answered = len(payload.answers)
    return WellbeingNextQuestionResponse(
        question=question,
        done=done,
        urgent_action_required=is_urgent,
        answered_count=answered,
        # A stepped screen cannot know its final length in advance, so progress is
        # reported against the questions actually unlocked so far.
        unlocked_count=answered if done else answered + 1,
        screen_version=wellbeing_engine.SCREEN_VERSION,
    )


@router.post("/wellbeing/assessment")
async def wellbeing_assessment(payload: WellbeingRequest) -> dict[str, object]:
    try:
        assessment = wellbeing_engine.assess(payload.answers)
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error
    return {
        "urgentActionRequired": assessment.urgent_action_required,
        "riskItemEndorsed": assessment.risk_item_endorsed,
        "level": assessment.level,
        "messageKey": assessment.message_key,
        "recommendedCareCategoryKey": assessment.recommended_care_category_key,
        "scales": [
            {
                "id": scale.id,
                "labelKey": scale.label_key,
                "score": scale.score,
                "maximumScore": scale.maximum_score,
                "bandLabelKey": scale.band_label_key,
                "level": scale.level,
                "positive": scale.positive,
            }
            for scale in assessment.scales
        ],
        "screenVersion": wellbeing_engine.SCREEN_VERSION,
        "basis": "screening_not_diagnosis",
        "clinicallyValidated": False,
        **_support_payload(),
    }


@router.get("/observations/signs")
async def observation_signs() -> dict[str, object]:
    """The catalogue of face signs a person can confirm on their own capture."""

    return {
        "signsVersion": observations_engine.SIGNS_VERSION,
        "basis": observations_engine.BASIS,
        "clinicallyValidated": False,
        "signs": [sign.as_payload() for sign in observations_engine.SIGNS],
    }


@router.post("/observations/profile")
async def observation_profile(payload: ObservationProfileRequest) -> dict[str, object]:
    """Confirmed signs plus the follow-up questions they unlock.

    The signs alone are explicitly the first half. `complete` stays false until
    the unlocked questions are answered, because a photo on its own is the part
    most easily thrown off by lighting or a poor camera.
    """

    try:
        result = observations_engine.profile(payload.confirmed_signs, payload.answers)
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error
    return {
        "signsVersion": observations_engine.SIGNS_VERSION,
        "basis": observations_engine.BASIS,
        "clinicallyValidated": False,
        "observedSigns": [sign.as_payload() for sign in result.signs],
        "followUpQuestions": [question.as_payload() for question in result.questions],
        "answeredCount": result.answered,
        "questionCount": len(result.questions),
        "complete": result.complete,
        "stage": "complete" if result.complete else "observation_only",
    }
