from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Literal

from PIL import Image, ImageOps

Lighting = Literal["good", "too_dark", "too_bright"]

ANALYSIS_EDGE = 512
# Deliberately loose: these reject only photos no model could read (lens covered or
# blown out by light), not borderline captures.
MIN_MEAN_LUMINANCE = 45.0
MAX_MEAN_LUMINANCE = 225.0
MAX_CLIPPED_FRACTION = 0.25


@dataclass(frozen=True)
class CaptureQuality:
    """Exposure only. Focus is not gated: smooth eyelid tissue has so little edge
    detail that blur metrics cannot separate sharp from soft captures without
    calibration on real, labelled eye photos."""

    lighting: Lighting
    mean_luminance: float
    clipped_fraction: float

    @property
    def acceptable(self) -> bool:
        return self.lighting == "good"


def assess_capture(content: bytes) -> CaptureQuality:
    with Image.open(BytesIO(content)) as source:
        image = ImageOps.exif_transpose(source).convert("L")
    image.thumbnail((ANALYSIS_EDGE, ANALYSIS_EDGE))
    histogram = image.histogram()
    total = sum(histogram)
    mean = sum(value * count for value, count in enumerate(histogram)) / total
    clipped = sum(histogram[250:]) / total
    lighting: Lighting = (
        "too_dark" if mean < MIN_MEAN_LUMINANCE
        else "too_bright" if mean > MAX_MEAN_LUMINANCE or clipped > MAX_CLIPPED_FRACTION
        else "good"
    )
    return CaptureQuality(lighting, mean, clipped)
