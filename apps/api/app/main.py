from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import lifespan
from .routes import router as certificate_router

app = FastAPI(
    title="Certificate Generator API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(certificate_router)


@app.get("/health")
async def health():
    storage_mode = getattr(app.state, "storage_mode", "unknown")
    db_error = getattr(app.state, "db_error", None)
    db_name = getattr(app.state, "mongodb_db_name", settings.mongodb_db)
    collection_name = getattr(app.state, "mongodb_collection", settings.mongodb_collection)

    if db_error:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "database": storage_mode,
                "db_name": db_name,
                "collection": collection_name,
                "detail": db_error,
            },
        )

    return {
        "status": "ok",
        "database": storage_mode,
        "db_name": db_name,
        "collection": collection_name,
    }
