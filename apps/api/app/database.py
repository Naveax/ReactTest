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


async def ensure_unique_index(collection: Any, field: str, index_name: str) -> None:
    """
    Ensure a unique ascending index exists for the given field regardless of index name.
    If a non-unique single-field index exists, replace it with a unique one.
    """
    index_info = await collection.index_information()
    target_key = [(field, 1)]
    existing_index_name: str | None = None
    existing_is_unique = False

    for name, spec in index_info.items():
        key = spec.get("key")
        if key == target_key:
            existing_index_name = name
            existing_is_unique = bool(spec.get("unique", False))
            break

    if existing_index_name and existing_is_unique:
        return

    if existing_index_name and not existing_is_unique:
        await collection.drop_index(existing_index_name)

    await collection.create_index(target_key, unique=True, name=index_name)


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
            await ensure_unique_index(certificates, "certificate_id", "certificate_id_unique")
            await ensure_unique_index(certificates, "verification_code", "verification_code_unique")
        except Exception as exc:
            db_error = (
                "MongoDB connection failed. Ensure MongoDB is running on "
                f"{settings.mongodb_url} and reachable from the API process. "
                f"Error: {exc}"
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
    app.state.mongodb_db_name = settings.mongodb_db
    app.state.mongodb_collection = settings.mongodb_collection

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
