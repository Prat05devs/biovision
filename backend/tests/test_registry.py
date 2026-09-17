import pytest

from app.inference.registry import ModelRegistry, UnavailableAnemiaModel


def test_unavailable_model_abstains() -> None:
    prediction = UnavailableAnemiaModel().predict(b"left-capture", b"right-capture")
    assert prediction.signal == "unavailable"
    assert prediction.confidence is None
    assert not prediction.quality.acceptable


def test_registry_rejects_duplicate_conditions() -> None:
    registry = ModelRegistry()
    registry.register(UnavailableAnemiaModel())
    with pytest.raises(ValueError, match="already registered"):
        registry.register(UnavailableAnemiaModel())
