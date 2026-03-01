import secrets
import uuid


def generate_certificate_id() -> str:
    return f"cert_{uuid.uuid4().hex[:16]}"


def generate_verification_code() -> str:
    return secrets.token_urlsafe(18)
