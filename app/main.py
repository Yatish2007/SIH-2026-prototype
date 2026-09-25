from contextlib import asynccontextmanager
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth, users, courses, personalization, monitoring, certificates, trainer, admin
from .storage import stream_file_with_range
from .migrations import run_migrations


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    yield


app = FastAPI(
    title="CAPACITY CONNECT API",
    description="Digital Capacity Building and AI Learning Personalization Portal",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup - explicit local dev origins (extra origins via env, comma-separated)
_allowed = os.getenv(
    "CAPACITY_CONNECT_CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
)
ALLOWED_ORIGINS = [o.strip() for o in _allowed.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(personalization.router)
app.include_router(monitoring.router)
app.include_router(certificates.router)
app.include_router(trainer.router)
app.include_router(admin.router)


# ==========================================
# File Storage Streaming Endpoint
# Serves uploaded files with HTTP Range support (needed for HTML5 video seeking)
# ==========================================

@app.get("/storage/{bucket}/{file_path:path}")
def serve_storage_file(bucket: str, file_path: str, request: Request):
    """
    Serves files from local uploads directory.
    Supports HTTP Range requests for HTML5 video seeking.
    """
    return stream_file_with_range(bucket, file_path, request)


@app.get("/")
def root():
    return {
        "message": "CAPACITY CONNECT Backend Running",
        "status": "online"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
