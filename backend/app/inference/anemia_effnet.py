from __future__ import annotations

import importlib
import json
from io import BytesIO
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps

from app.inference.base import QualityReport, ScreeningPrediction
from app.schemas import Signal

MODEL_VERSION = "galihkjaya/anemia-palor-detection@5659a76e6d3d"


class EfficientNetAnemiaModel:
    """Pinned MIT research checkpoint for bilateral conjunctiva screening."""

    condition = "anemia"

    def __init__(self, checkpoint_path: Path, config_path: Path) -> None:
        torch: Any = importlib.import_module("torch")
        nn: Any = importlib.import_module("torch.nn")
        timm: Any = importlib.import_module("timm")
        transforms: Any = importlib.import_module("torchvision.transforms")
        with config_path.open(encoding="utf-8") as file:
            self._config: dict[str, Any] = json.load(file)

        class AnemiaModel(nn.Module):  # type: ignore[misc, valid-type]
            def __init__(self) -> None:
                super().__init__()
                self.backbone = timm.create_model("efficientnet_b0", pretrained=False, num_classes=0)
                self.head_cls = nn.Sequential(nn.Dropout(0.3), nn.Linear(1280, 1))
                self.head_reg = nn.Sequential(
                    nn.Linear(1280, 512), nn.ReLU(), nn.Dropout(0.3),
                    nn.Linear(512, 128), nn.ReLU(), nn.Dropout(0.2), nn.Linear(128, 1),
                )

            def forward(self, value: Any) -> tuple[Any, Any]:
                features = self.backbone(value)
                return self.head_cls(features).squeeze(1), self.head_reg(features).squeeze(1)

        self._torch = torch
        self._cv2: Any = importlib.import_module("cv2")
        self._numpy: Any = importlib.import_module("numpy")
        self._model = AnemiaModel().to("cpu")
        # weights_only prevents arbitrary application objects from being unpickled.
        state = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
        self._model.load_state_dict(state, strict=True)
        self._model.eval()
        self._transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(self._config["normalize_mean"], self._config["normalize_std"]),
        ])

    def _crop_conjunctiva(self, content: bytes) -> Image.Image | None:
        image = ImageOps.exif_transpose(Image.open(BytesIO(content))).convert("RGB")
        array = self._numpy.asarray(image)
        hsv = self._cv2.cvtColor(array, self._cv2.COLOR_RGB2HSV)
        lower_red = self._cv2.inRange(hsv, self._numpy.array([0, 50, 50]), self._numpy.array([10, 255, 255]))
        upper_red = self._cv2.inRange(hsv, self._numpy.array([160, 50, 50]), self._numpy.array([180, 255, 255]))
        mask = self._cv2.bitwise_or(lower_red, upper_red)
        kernel = self._cv2.getStructuringElement(self._cv2.MORPH_ELLIPSE, (15, 15))
        mask = self._cv2.morphologyEx(mask, self._cv2.MORPH_CLOSE, kernel)
        mask = self._cv2.morphologyEx(mask, self._cv2.MORPH_OPEN, kernel)
        coordinates = self._cv2.findNonZero(mask)
        if coordinates is None or self._cv2.countNonZero(mask) < image.width * image.height * 0.015:
            return None
        x, y, width, height = self._cv2.boundingRect(coordinates)
        pad = 10
        masked = self._numpy.zeros_like(array)
        masked[mask == 255] = array[mask == 255]
        crop = masked[max(0, y - pad):min(image.height, y + height + pad), max(0, x - pad):min(image.width, x + width + pad)]
        if crop.shape[0] < 40 or crop.shape[1] < 80:
            return None
        return Image.fromarray(crop)

    def _predict_one(self, content: bytes) -> tuple[float, float] | None:
        crop = self._crop_conjunctiva(content)
        if crop is None:
            return None
        tensor = self._transform(crop).unsqueeze(0).to("cpu")
        with self._torch.inference_mode():
            classification, regression = self._model(tensor)
        probability = float(self._torch.sigmoid(classification).item())
        hemoglobin = float(regression.item()) * float(self._config["hb_std"]) + float(self._config["hb_mean"])
        return probability, hemoglobin

    def predict(self, left_capture: bytes, right_capture: bytes) -> ScreeningPrediction:
        left = self._predict_one(left_capture)
        right = self._predict_one(right_capture)
        predictions = [value for value in (left, right) if value]
        if not predictions:
            return ScreeningPrediction(
                signal="unavailable",
                observations=("conjunctiva_region_not_detected",),
                quality=QualityReport(False, "unavailable", "unavailable", False),
                model_version=MODEL_VERSION,
            )
        probability = sum(value[0] for value in predictions) / len(predictions)
        hemoglobin = sum(value[1] for value in predictions) / len(predictions)
        signal: Signal = (
            "elevated" if probability >= 0.65 else "moderate" if probability >= 0.35 else "low"
        )
        return ScreeningPrediction(
            signal=signal,
            observations=("bilateral_conjunctiva_model_estimate",),
            # Exposure is measured at the API boundary; this model does not assess focus.
            quality=QualityReport(len(predictions) == 2, "unavailable", "unavailable", True),
            confidence=max(probability, 1 - probability),
            model_version=MODEL_VERSION,
            measurements={
                "anemiaProbability": probability,
                "estimatedHemoglobinGdl": hemoglobin,
                **({"leftHemoglobinGdl": left[1]} if left else {}),
                **({"rightHemoglobinGdl": right[1]} if right else {}),
            },
        )
