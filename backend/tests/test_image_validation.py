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


@pytest.mark.parametrize("missing_bytes", [2, 40, 100])
def test_validate_jpeg_rejects_truncated_pixels_after_valid_headers(missing_bytes: int) -> None:
    with pytest.raises(ImageValidationError, match="cannot be decoded"):
        validate_jpeg(make_jpeg()[:-missing_bytes])


def test_pixel_limit_is_checked_before_decode() -> None:
    content = bytearray(make_jpeg())
    frame = content.index(b"\xff\xc0")
    content[frame + 5:frame + 9] = (4000).to_bytes(2, "big") + (4001).to_bytes(2, "big")
    with pytest.raises(ImageValidationError, match="pixel count"):
        validate_jpeg(bytes(content))
