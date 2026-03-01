from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status

try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ModuleNotFoundError:
    AsyncIOMotorClient = None

from .config import settings


class InMemoryCertificateCollection:
    def __init__(self) -> None:
        self._documents: list[dict[str, Any]] = []

    async def create_index(self, *_args: Any, **_kwargs: Any) -> None:
        return None

    async def insert_one(self, document: dict[str, Any]) -> dict[str, Any]:
        self._documents.append(document.copy())
        return {"ok": 1}

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        for item in self._documents:
            if all(item.get(key) == value for key, value in query.items()):
                return item.copy()
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = None
    certificates: Any = None
    db_error: str | None = None
    storage_mode = "mongo"

    if AsyncIOMotorClient is None:
        db_error = "Python dependency 'motor' is missing. Run: cd apps/api && pdm install"
    else:
        client = AsyncIOMotorClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)

        try:
            await client.admin.command("ping")
            database = client[settings.mongodb_db]
            certificates = database[settings.mongodb_collection]
            await certificates.create_index("certificate_id", unique=True)
            await certificates.create_index("verification_code", unique=True)
        except Exception:
            db_error = (
                "MongoDB connection failed. Ensure MongoDB is running on "
                f"{settings.mongodb_url} and reachable from the API process."
            )

    if certificates is None and settings.enable_memory_fallback:
        certificates = InMemoryCertificateCollection()
        storage_mode = "memory"
        db_error = None

    if certificates is None:
        storage_mode = "unavailable"

    app.state.mongo_client = client
    app.state.certificates = certificates
    app.state.db_error = db_error
    app.state.storage_mode = storage_mode

    yield

    if client is not None:
        client.close()


def get_certificate_collection(request: Request) -> Any:
    collection = request.app.state.certificates
    if collection is None:
        db_error = request.app.state.db_error or "Database is unavailable."
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {db_error}",
        )
    return collection
