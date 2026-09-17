from io import BytesIO

from PIL import Image

from app.captures.quality import assess_capture


def jpeg(color: str) -> bytes:
    output = BytesIO()
    Image.new("RGB", (320, 240), color).save(output, format="JPEG", quality=95)
    return output.getvalue()


def test_normal_exposure_is_accepted() -> None:
    assert assess_capture(jpeg("#b0706a")).acceptable is True


def test_underexposed_capture_is_rejected() -> None:
    assert assess_capture(jpeg("#101010")).lighting == "too_dark"


def test_blown_out_capture_is_rejected() -> None:
    assert assess_capture(jpeg("#fdfdfd")).lighting == "too_bright"
