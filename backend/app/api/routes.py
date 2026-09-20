from __future__ import annotations

import re
from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.captures.image_validation import ImageValidationError, validate_jpeg
from app.captures.quality import assess_capture
from app.config import settings
from app.inference.registry import model_registry
from app.rules.hemoglobin import ScreeningProfile, eyes_disagree, interpret_hemoglobin

router = APIRouter(prefix="/v1")
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
    }
