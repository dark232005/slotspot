import io
import base64
import json
import qrcode
from qrcode.image.pil import PilImage


def generate_qr_data_url(booking_id: str, raw_token: str, lookup_code: str) -> str:
    """
    Generates a high-contrast black-and-white QR code containing secure JSON payload.
    Encodes the generated image as a zero-cost local Base64 data URL (data:image/png;base64,...).
    """
    payload = json.dumps({
        "app": "slotspot",
        "booking_id": booking_id,
        "token": raw_token,
        "code": lookup_code
    })

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img: PilImage = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_data = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_data}"


def extract_token_from_qr_input(raw_input: str) -> str:
    """
    Safely parses scanner input which might be raw token, JSON string, or lookup code.
    """
    cleaned = raw_input.strip()
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            if "token" in data:
                return data["token"]
            if "code" in data:
                return data["code"]
    except Exception:
        pass
    return cleaned
