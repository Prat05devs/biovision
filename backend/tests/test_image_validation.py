from io import BytesIO

import pytest
from PIL import Image

from app.captures.image_validation import ImageValidationError, validate_jpeg


def make_jpeg(width: int = 80, height: int = 60) -> bytes:
    output = BytesIO()
    Image.new("RGB", (width, height), "white").save(output, format="JPEG", quality=100)
    return output.getvalue()


def test_validate_jpeg_uses_encoded_dimensions() -> None:
    metadata = validate_jpeg(make_jpeg(), declared_width=80, declared_height=60)
    assert metadata.width == 80
    assert metadata.height == 60
    assert metadata.color_mode == "RGB"


def test_validate_jpeg_rejects_metadata_mismatch() -> None:
    with pytest.raises(ImageValidationError, match="Declared width"):
        validate_jpeg(make_jpeg(), declared_width=81, declared_height=60)


def test_validate_jpeg_rejects_truncated_stream() -> None:
    with pytest.raises(ImageValidationError):
        validate_jpeg(make_jpeg()[:100])
