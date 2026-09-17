from __future__ import annotations

from dataclasses import dataclass, field

from app.config import settings
from app.inference.base import QualityReport, ScreeningModel, ScreeningPrediction


class UnavailableAnemiaModel:
    condition = "anemia"

    def predict(self, left_capture: bytes, right_capture: bytes) -> ScreeningPrediction:
        # Reading the bytes ensures the request body is consumed, but nothing is retained.
        if not left_capture or not right_capture:
            raise ValueError("bilateral captures must not be empty")
        return ScreeningPrediction(
            signal="unavailable",
            observations=("model_not_clinically_validated",),
            quality=QualityReport(
                acceptable=False,
                lighting="unavailable",
                sharpness="unavailable",
                region_detected=False,
            ),
        )


@dataclass
class ModelRegistry:
    _models: dict[str, ScreeningModel] = field(default_factory=dict)

    def register(self, model: ScreeningModel) -> None:
        if model.condition in self._models:
            raise ValueError(f"A model is already registered for {model.condition}")
        self._models[model.condition] = model

    def get(self, condition: str) -> ScreeningModel:
        try:
            return self._models[condition]
        except KeyError as error:
            raise LookupError(f"No model registered for {condition}") from error


model_registry = ModelRegistry()
if settings.model_version == "galihkjaya/anemia-palor-detection@5659a76e6d3d":
    from app.inference.anemia_effnet import EfficientNetAnemiaModel

    model_registry.register(EfficientNetAnemiaModel(settings.anemia_model_path, settings.anemia_model_config_path))
else:
    model_registry.register(UnavailableAnemiaModel())
