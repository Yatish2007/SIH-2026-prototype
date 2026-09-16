from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth, users, courses, personalization, monitoring, certificates, trainer, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="CAPACITY CONNECT API",
    description="Digital Capacity Building and AI Learning Personalization Portal",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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