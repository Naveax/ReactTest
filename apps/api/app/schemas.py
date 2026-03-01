from datetime import date
from pydantic import BaseModel, Field


class CertificateCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    course_name: str = Field(min_length=2, max_length=120)
    score: int = Field(ge=0, le=100)
    issued_at: date
    language: str = Field(min_length=2, max_length=50)
    level: str = Field(min_length=1, max_length=40)


class CertificatePublic(BaseModel):
    certificate_id: str
    full_name: str
    course_name: str
    score: int
    issued_at: date
    language: str
    level: str


class CertificateCreateResponse(BaseModel):
    certificate_id: str
    verification_code: str


class CertificateVerifyResponse(BaseModel):
    valid: bool
    certificate: CertificatePublic | None = None
