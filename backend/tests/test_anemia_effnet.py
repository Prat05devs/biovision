from app.inference.anemia_effnet import MODEL_VERSION, EfficientNetAnemiaModel


class StubAnemiaModel(EfficientNetAnemiaModel):
    def __init__(self, values: dict[bytes, tuple[float, float] | None]) -> None:
        self.values = values

    def _predict_one(self, content: bytes) -> tuple[float, float] | None:
        return self.values[content]


def test_bilateral_predictions_are_averaged() -> None:
    model = StubAnemiaModel({b"left": (0.8, 8.0), b"right": (0.6, 10.0)})
    result = model.predict(b"left", b"right")
    assert result.signal == "elevated"
    assert result.quality.acceptable is True
    assert result.measurements is not None
    assert result.measurements["anemiaProbability"] == 0.7
    assert result.measurements["estimatedHemoglobinGdl"] == 9.0
    assert result.model_version == MODEL_VERSION


def test_one_usable_eye_is_reported_as_lower_quality() -> None:
    model = StubAnemiaModel({b"left": (0.2, 12.0), b"right": None})
    result = model.predict(b"left", b"right")
    assert result.signal == "low"
    assert result.quality.acceptable is False
    assert result.quality.region_detected is True


def test_no_conjunctiva_region_abstains() -> None:
    model = StubAnemiaModel({b"left": None, b"right": None})
    result = model.predict(b"left", b"right")
    assert result.signal == "unavailable"
    assert result.confidence is None
    assert result.quality.region_detected is False


def test_per_eye_hemoglobin_is_reported_for_agreement_checks() -> None:
    model = StubAnemiaModel({b"left": (0.8, 8.0), b"right": (0.6, 10.0)})
    result = model.predict(b"left", b"right")
    assert result.measurements is not None
    assert result.measurements["leftHemoglobinGdl"] == 8.0
    assert result.measurements["rightHemoglobinGdl"] == 10.0
