from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.schemas import Signal


@dataclass(frozen=True)
class QualityReport:
    acceptable: bool
    lighting: str
    sharpness: str
    region_detected: bool


@dataclass(frozen=True)
class ScreeningPrediction:
    signal: Signal
    observations: tuple[str, ...]
    quality: QualityReport
    confidence: float | None = None
    model_version: str | None = None
    measurements: dict[str, float] | None = None


class ScreeningModel(Protocol):
    condition: str

    def predict(self, left_capture: bytes, right_capture: bytes) -> ScreeningPrediction:
        """Return a calibrated prediction or explicitly abstain."""
        ...
