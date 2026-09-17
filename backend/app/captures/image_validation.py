from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, UnidentifiedImageError

MAX_CAPTURE_EDGE = 12_000
MAX_CAPTURE_PIXELS = 60_000_000


class ImageValidationError(ValueError):
    """Raised when uploaded bytes are not a safe, decodable JPEG capture."""


@dataclass(frozen=True)
class DecodedImageMetadata:
    width: int
    height: int
    color_mode: str
    exif_orientation: int | None


def validate_jpeg(
    content: bytes,
    *,
    declared_width: int | None = None,
    declared_height: int | None = None,
) -> DecodedImageMetadata:
    """Decode and verify a JPEG before it reaches inference or durable storage.

    The dimensions parsed from the JPEG are authoritative. Research uploads are
    rejected when client metadata disagrees, preventing silently corrupted
    provenance from entering the training corpus.
    """

    try:
        with Image.open(BytesIO(content)) as image:
            if image.format != "JPEG":
                raise ImageValidationError("The uploaded file is not a JPEG image.")
            width, height = image.size
            color_mode = image.mode
            orientation_value = image.getexif().get(274)
            exif_orientation = (
                int(orientation_value) if isinstance(orientation_value, int) else None
            )

            if width <= 0 or height <= 0:
                raise ImageValidationError("The JPEG has invalid dimensions.")
            if width > MAX_CAPTURE_EDGE or height > MAX_CAPTURE_EDGE:
                raise ImageValidationError("The JPEG dimensions exceed the capture limit.")
            if width * height > MAX_CAPTURE_PIXELS:
                raise ImageValidationError("The JPEG pixel count exceeds the capture limit.")

            # verify() asks Pillow's JPEG decoder to validate the complete stream.
            image.verify()
    except ImageValidationError:
        raise
    except (OSError, SyntaxError, UnidentifiedImageError, ValueError) as error:
        raise ImageValidationError("The JPEG cannot be decoded safely.") from error

    if declared_width is not None and declared_width != width:
        raise ImageValidationError("Declared width does not match the JPEG.")
    if declared_height is not None and declared_height != height:
        raise ImageValidationError("Declared height does not match the JPEG.")

    return DecodedImageMetadata(
        width=width,
        height=height,
        color_mode=color_mode,
        exif_orientation=exif_orientation,
    )
