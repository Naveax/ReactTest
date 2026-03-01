from datetime import date, datetime, time, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
try:
    from pymongo.errors import DuplicateKeyError
except ModuleNotFoundError:
    class DuplicateKeyError(Exception):
        pass

from .database import get_certificate_collection
from .schemas import (
    CertificateCreate,
    CertificateCreateResponse,
    CertificatePublic,
    CertificateVerifyResponse,
)
from .utils import generate_certificate_id, generate_verification_code

router = APIRouter(prefix="/api/certificates", tags=["certificates"])


def _to_public(document: dict) -> CertificatePublic:
    issued_at_value = document.get("issued_at")

    if isinstance(issued_at_value, datetime):
        issued_at_date = issued_at_value.date()
    elif isinstance(issued_at_value, date):
        issued_at_date = issued_at_value
    else:
        raise HTTPException(status_code=500, detail="Invalid certificate date in database.")

    return CertificatePublic(
        certificate_id=document["certificate_id"],
        full_name=document["full_name"],
        course_name=document["course_name"],
        score=document["score"],
        issued_at=issued_at_date,
        language=document["language"],
        level=document["level"],
    )


@router.post("", response_model=CertificateCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_certificate(
    payload: CertificateCreate,
    collection: Any = Depends(get_certificate_collection),
) -> CertificateCreateResponse:
    for _ in range(5):
        certificate_id = generate_certificate_id()
        verification_code = generate_verification_code()

        document = payload.model_dump()
        document.update(
            {
                "certificate_id": certificate_id,
                "verification_code": verification_code,
                "issued_at": datetime.combine(payload.issued_at, time.min, tzinfo=timezone.utc),
                "created_at": datetime.now(timezone.utc),
            }
        )

        try:
            await collection.insert_one(document)
            return CertificateCreateResponse(
                certificate_id=certificate_id,
                verification_code=verification_code,
            )
        except DuplicateKeyError:
            continue

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not generate unique certificate identifiers.",
    )


@router.get("/verify", response_model=CertificateVerifyResponse)
async def verify_certificate(
    code: str = Query(..., min_length=6, max_length=160),
    collection: Any = Depends(get_certificate_collection),
) -> CertificateVerifyResponse:
    document = await collection.find_one({"verification_code": code})
    if not document:
        return CertificateVerifyResponse(valid=False, certificate=None)

    return CertificateVerifyResponse(valid=True, certificate=_to_public(document))


@router.get("/{certificate_id}", response_model=CertificatePublic)
async def get_certificate_by_id(
    certificate_id: str = Path(..., min_length=8, max_length=40),
    collection: Any = Depends(get_certificate_collection),
) -> CertificatePublic:
    document = await collection.find_one({"certificate_id": certificate_id})
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found.")

    return _to_public(document)
